"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Inbox,
  Send,
  FileEdit,
  Trash2,
  Archive,
  AlertTriangle,
  Star,
  StarOff,
  MailOpen,
  MailPlus,
  Loader2,
  Plus,
  Settings,
  X,
  Search,
  ChevronLeft,
} from "lucide-react";
import {
  createEmailAccount,
  deleteEmailAccount,
  getEmails,
  createEmail,
  sendEmail,
  deleteEmail,
  toggleStar,
  toggleRead,
} from "@/lib/actions/office";
import {
  connectMailbox,
  testMailbox,
  syncCurrentUserMailbox,
  disconnectMailbox,
  sendMailViaSmtp,
} from "@/lib/actions/mailbox";
import { toast } from "sonner";
import { RefreshCw, Paperclip } from "lucide-react";
import { RichEditor } from "@/components/email/rich-editor";
import DOMPurify from "isomorphic-dompurify";

type EmailFolder = "INBOX" | "SENT" | "DRAFTS" | "TRASH" | "ARCHIVE" | "SPAM";

type EmailAccount = {
  id: string;
  email: string;
  displayName: string | null;
  provider: string;
  isDefault: boolean;
};

type EmailMsg = {
  id: string;
  accountId: string;
  subject: string;
  body: string;
  fromEmail: string;
  toEmails: unknown;
  ccEmails: unknown;
  bccEmails: unknown;
  folder: EmailFolder;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  attachments: unknown;
  sentAt: Date | null;
  receivedAt: Date | null;
  createdAt: Date;
};

type MailServer = {
  id: string;
  name: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  fromDomain: string | null;
  isActive: boolean;
} | null;

type Props = {
  initialAccounts: EmailAccount[];
  mailServer: MailServer;
};

// Email bodies arrive as either plaintext or HTML. We use a heuristic rather
// than a sniffed MIME type because mailparser already collapses that to a
// string; if there are no tags it's plaintext.
function looksLikeHtml(body: string | null | undefined): boolean {
  if (!body) return false;
  return /<\/?[a-z][\s\S]*?>/i.test(body);
}

// One-line preview used in the inbox list. Drops tags + collapses whitespace.
function plainTextPreview(body: string | null | undefined, max: number): string {
  if (!body) return "";
  const stripped = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  const compact = stripped.replace(/\s+/g, " ").trim();
  return compact.length > max ? compact.slice(0, max) + "..." : compact;
}

// DOMPurify config for inbox bodies. We block `style` (mail tracking pixels +
// CSS-based phishing) and external resource loading by stripping `img` src
// to `cid:`/`data:` only via the hook below.
const SANITIZE_OPTIONS = {
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "style", "link", "meta"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "style"],
  ALLOW_DATA_ATTR: false,
};

const folders: { key: EmailFolder; label: string; icon: React.ReactNode }[] = [
  { key: "INBOX", label: "Inbox", icon: <Inbox className="h-4 w-4" /> },
  { key: "SENT", label: "Sent", icon: <Send className="h-4 w-4" /> },
  { key: "DRAFTS", label: "Drafts", icon: <FileEdit className="h-4 w-4" /> },
  { key: "TRASH", label: "Trash", icon: <Trash2 className="h-4 w-4" /> },
  { key: "ARCHIVE", label: "Archive", icon: <Archive className="h-4 w-4" /> },
  { key: "SPAM", label: "Spam", icon: <AlertTriangle className="h-4 w-4" /> },
];

export function EmailClient({ initialAccounts, mailServer }: Props) {
  const [accounts, setAccounts] = useState(initialAccounts);
  // Only treat IMAP-provider accounts as "live" — old stub rows with
  // provider="smtp" have no password and can't actually fetch or send.
  const liveAccounts = accounts.filter((a) => a.provider === "imap");
  const [activeAccount, setActiveAccount] = useState<EmailAccount | null>(
    liveAccounts.find((a) => a.isDefault) ?? liveAccounts[0] ?? null
  );
  // Mailbox connect flow state
  const [connectEmail, setConnectEmail] = useState("");
  const [connectPassword, setConnectPassword] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleTest() {
    if (!connectEmail || !connectPassword) {
      toast.error("Email and password required");
      return;
    }
    setIsConnecting(true);
    try {
      const res = await testMailbox({ email: connectEmail, password: connectPassword });
      if (res.ok) toast.success("Login OK — credentials work");
      else toast.error(`Login failed: ${res.reason}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleConnect() {
    if (!connectEmail || !connectPassword) {
      toast.error("Email and password required");
      return;
    }
    setIsConnecting(true);
    try {
      const acc = await connectMailbox({ email: connectEmail, password: connectPassword });
      const newAcc: EmailAccount = {
        id: acc.id,
        email: acc.email,
        displayName: acc.email,
        provider: "imap",
        isDefault: true,
      };
      setAccounts((prev) => [newAcc, ...prev.filter((a) => a.id !== acc.id)]);
      setActiveAccount(newAcc);
      setConnectEmail("");
      setConnectPassword("");
      toast.success("Mailbox connected. Syncing...");
      // Kick off first sync now.
      handleSync(acc.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not connect");
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleSync(_accountId?: string) {
    setIsSyncing(true);
    try {
      const r = await syncCurrentUserMailbox();
      if (!r.ok) {
        toast.error(r.reason);
      } else {
        toast.success(`Synced ${r.inserted} new message${r.inserted === 1 ? "" : "s"}`);
        // Force the folder content refetch by toggling activeFolder (cheap).
        setActiveFolder((f) => f);
        if (activeAccount) {
          const data = await getEmails(activeAccount.id, activeFolder);
          setEmails(data as unknown as EmailMsg[]);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDisconnect(accountId: string) {
    if (!confirm("Disconnect this mailbox? Stored messages will be removed from this workspace.")) return;
    try {
      await disconnectMailbox(accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      if (activeAccount?.id === accountId) {
        setActiveAccount(null);
        setEmails([]);
      }
      toast.success("Mailbox disconnected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disconnect");
    }
  }
  const [activeFolder, setActiveFolder] = useState<EmailFolder>("INBOX");
  const [emails, setEmails] = useState<EmailMsg[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMsg | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  type ComposeAttachment = { filename: string; contentType: string; size: number; base64: string };
  const [composeAttachments, setComposeAttachments] = useState<ComposeAttachment[]>([]);

  async function handleAttachFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const next: ComposeAttachment[] = [];
    let totalNew = 0;
    for (const file of Array.from(fileList)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 10 MB per-file limit`);
        continue;
      }
      totalNew += file.size;
      const buf = await file.arrayBuffer();
      next.push({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        base64: bufferToBase64(buf),
      });
    }
    const totalAfter = composeAttachments.reduce((s, a) => s + a.size, 0) + totalNew;
    if (totalAfter > 10 * 1024 * 1024) {
      toast.error("Total attachment size exceeds 10 MB. Remove some files and retry.");
      return;
    }
    setComposeAttachments((prev) => [...prev, ...next]);
  }

  function removeAttachment(index: number) {
    setComposeAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function bufferToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function formatBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  // Account settings
  const [tab, setTab] = useState<"mail" | "settings">("mail");
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountProvider, setNewAccountProvider] = useState("smtp");

  // Fetch emails when folder or account changes
  useEffect(() => {
    if (!activeAccount) return;
    setIsLoading(true);
    setSelectedEmail(null);
    getEmails(activeAccount.id, activeFolder)
      .then((data) => setEmails(data as EmailMsg[]))
      .catch(() => setEmails([]))
      .finally(() => setIsLoading(false));
  }, [activeAccount, activeFolder]);

  function handleComposeSend(isDraft = false) {
    if (!activeAccount) return;
    const toList = composeTo
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (!isDraft && toList.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    startTransition(async () => {
      try {
        if (isDraft || activeAccount.provider !== "imap") {
          // Drafts (and any legacy non-IMAP accounts) stay local — no SMTP.
          await createEmail({
            accountId: activeAccount.id,
            subject: composeSubject,
            body: composeBody,
            fromEmail: activeAccount.email,
            toEmails: toList,
            ccEmails: composeCc.split(",").map((e) => e.trim()).filter(Boolean),
            bccEmails: composeBcc.split(",").map((e) => e.trim()).filter(Boolean),
            isDraft,
          });
          toast.success(isDraft ? "Saved as draft" : "Saved locally");
        } else {
          // Connected mailbox: actually send via SMTP and APPEND to Sent.
          const res = await sendMailViaSmtp({
            to: composeTo,
            cc: composeCc,
            bcc: composeBcc,
            subject: composeSubject,
            body: composeBody,
            isHtml: true,
            attachments: composeAttachments.map((a) => ({
              filename: a.filename,
              contentType: a.contentType,
              contentBase64: a.base64,
            })),
          });
          toast.success(
            res.appendedToSent
              ? "Sent ✓ (also stored in your IMAP Sent folder)"
              : "Sent ✓ (could not append to IMAP Sent folder)",
          );
        }
        setComposeOpen(false);
        resetCompose();
        if (activeFolder === (isDraft ? "DRAFTS" : "SENT")) {
          const data = await getEmails(activeAccount.id, activeFolder);
          setEmails(data as EmailMsg[]);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to send email");
      }
    });
  }

  function resetCompose() {
    setComposeTo("");
    setComposeCc("");
    setComposeBcc("");
    setComposeSubject("");
    setComposeBody("");
    setComposeAttachments([]);
  }

  function handleToggleStar(emailId: string) {
    startTransition(async () => {
      try {
        await toggleStar(emailId);
        setEmails((prev) =>
          prev.map((e) => (e.id === emailId ? { ...e, isStarred: !e.isStarred } : e))
        );
        if (selectedEmail?.id === emailId) {
          setSelectedEmail((prev) => (prev ? { ...prev, isStarred: !prev.isStarred } : null));
        }
      } catch {
        toast.error("Failed to toggle star");
      }
    });
  }

  function handleToggleRead(emailId: string) {
    startTransition(async () => {
      try {
        await toggleRead(emailId);
        setEmails((prev) =>
          prev.map((e) => (e.id === emailId ? { ...e, isRead: !e.isRead } : e))
        );
      } catch {
        toast.error("Failed to toggle read status");
      }
    });
  }

  function handleDeleteEmail(emailId: string) {
    startTransition(async () => {
      try {
        await deleteEmail(emailId);
        setEmails((prev) => prev.filter((e) => e.id !== emailId));
        if (selectedEmail?.id === emailId) setSelectedEmail(null);
        toast.success("Email deleted");
      } catch {
        toast.error("Failed to delete email");
      }
    });
  }

  function handleAddAccount() {
    if (!newAccountEmail.trim()) return;
    startTransition(async () => {
      try {
        const account = await createEmailAccount({
          email: newAccountEmail,
          displayName: newAccountName || undefined,
          provider: newAccountProvider,
          isDefault: accounts.length === 0,
        });
        setAccounts((prev) => [...prev, account as EmailAccount]);
        if (!activeAccount) setActiveAccount(account as EmailAccount);
        setNewAccountEmail("");
        setNewAccountName("");
        toast.success("Account added");
      } catch {
        toast.error("Failed to add account");
      }
    });
  }

  function handleDeleteAccount(id: string) {
    startTransition(async () => {
      try {
        await deleteEmailAccount(id);
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        if (activeAccount?.id === id) {
          setActiveAccount(accounts.find((a) => a.id !== id) ?? null);
        }
        toast.success("Account removed");
      } catch {
        toast.error("Failed to remove account");
      }
    });
  }

  function selectEmail(email: EmailMsg) {
    setSelectedEmail(email);
    if (!email.isRead) {
      handleToggleRead(email.id);
    }
  }

  if (tab === "settings") {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setTab("mail")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Mail
          </Button>
          <h1 className="text-2xl font-bold">Email Accounts</h1>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-medium">Add Account</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Email</Label>
                <Input
                  value={newAccountEmail}
                  onChange={(e) => setNewAccountEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label>Display Name</Label>
                <Input
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddAccount} disabled={isPending || !newAccountEmail.trim()}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Account
                </Button>
              </div>
            </div>

            <Separator />

            <h3 className="font-medium">Your Accounts</h3>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No email accounts configured yet.</p>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{account.displayName ?? account.email}</p>
                      <p className="text-sm text-muted-foreground">{account.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{account.provider}</Badge>
                        {account.isDefault && <Badge variant="outline">Default</Badge>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // No accounts setup
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-6">
        <Mail className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">No Email Accounts</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Add an email account to start sending and receiving messages.
        </p>
        <Button className="mt-4" onClick={() => setTab("settings")}>
          <Settings className="h-4 w-4 mr-2" /> Set Up Account
        </Button>
      </div>
    );
  }

  // First-run: no mailbox yet. Show the connect panel.
  if (!activeAccount) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" /> Email
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect your mailbox to read and send mail without leaving the ERP.
          </p>
        </div>
        {!mailServer || !mailServer.isActive ? (
          <Card>
            <CardContent className="p-6 text-sm">
              No mail server has been configured for this workspace yet. Ask a Super Admin to set one up at <code>Settings → Mail Server</code>.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-xs text-muted-foreground">
                Server: <code>{mailServer.imapHost}:{mailServer.imapPort}</code> (IMAP) &middot; <code>{mailServer.smtpHost}:{mailServer.smtpPort}</code> (SMTP)
              </div>
              <div className="space-y-2">
                <Label htmlFor="mb-email">Email address</Label>
                <Input
                  id="mb-email"
                  type="email"
                  value={connectEmail}
                  onChange={(e) => setConnectEmail(e.target.value)}
                  placeholder={mailServer.fromDomain ? `you@${mailServer.fromDomain}` : "you@example.com"}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mb-pass">Mailbox password</Label>
                <Input
                  id="mb-pass"
                  type="password"
                  value={connectPassword}
                  onChange={(e) => setConnectPassword(e.target.value)}
                  placeholder="Mailbox password (not your ERP password)"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Stored encrypted at rest with AES-256-GCM. Used only to fetch your mail.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleTest} disabled={isConnecting}>
                  {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Test connection
                </Button>
                <Button onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Connect & sync
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left sidebar - folders */}
      <div className="w-56 border-r bg-muted/30 flex flex-col shrink-0">
        <div className="p-3 space-y-2">
          <Button className="w-full" onClick={() => setComposeOpen(true)}>
            <MailPlus className="h-4 w-4 mr-2" /> Compose
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleSync()}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
        <Separator />
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {folders.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFolder(f.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                  activeFolder === f.key
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="p-2">
          <button
            onClick={() => setTab("settings")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-4 w-4" /> Account Settings
          </button>
        </div>
      </div>

      {/* Middle - email list */}
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">{folders.find((f) => f.key === activeFolder)?.label}</h2>
            <Badge variant="secondary">{emails.length}</Badge>
          </div>
          {accounts.length > 1 && (
            <select
              className="w-full text-sm border rounded px-2 py-1"
              value={activeAccount?.id ?? ""}
              onChange={(e) => {
                const acc = accounts.find((a) => a.id === e.target.value);
                if (acc) setActiveAccount(acc);
              }}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.displayName ?? acc.email}
                </option>
              ))}
            </select>
          )}
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Mail className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No emails in this folder</p>
            </div>
          ) : (
            <div className="divide-y">
              {emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => selectEmail(email)}
                  className={`w-full text-left p-3 transition-colors ${
                    selectedEmail?.id === email.id ? "bg-blue-50" : "hover:bg-muted/50"
                  } ${!email.isRead ? "bg-blue-50/50" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${!email.isRead ? "bg-blue-500" : "bg-transparent"}`} />
                    <span className={`text-sm truncate flex-1 ${!email.isRead ? "font-semibold" : ""}`}>
                      {email.fromEmail}
                    </span>
                    {email.isStarred && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                  </div>
                  <p className={`text-sm mt-1 truncate ${!email.isRead ? "font-medium" : ""}`}>
                    {email.subject || "(No subject)"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {plainTextPreview(email.body, 80)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(email.sentAt ?? email.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right - email detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedEmail ? (
          <>
            <div className="p-4 border-b flex items-center gap-2">
              <h2 className="text-lg font-semibold flex-1 truncate">
                {selectedEmail.subject || "(No subject)"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleStar(selectedEmail.id)}
              >
                {selectedEmail.isStarred ? (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleRead(selectedEmail.id)}
                title={selectedEmail.isRead ? "Mark unread" : "Mark read"}
              >
                <MailOpen className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={() => handleDeleteEmail(selectedEmail.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 border-b text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">From:</span> {selectedEmail.fromEmail}
              </p>
              <p>
                <span className="text-muted-foreground">To:</span>{" "}
                {(selectedEmail.toEmails as string[])?.join(", ")}
              </p>
              {(selectedEmail.ccEmails as string[])?.length > 0 && (
                <p>
                  <span className="text-muted-foreground">CC:</span>{" "}
                  {(selectedEmail.ccEmails as string[]).join(", ")}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Date:</span>{" "}
                {new Date(selectedEmail.sentAt ?? selectedEmail.createdAt).toLocaleString()}
              </p>
            </div>
            <ScrollArea className="flex-1 p-6">
              {looksLikeHtml(selectedEmail.body) ? (
                // Sanitize before injecting. DOMPurify strips <script>, on*
                // handlers, javascript: URLs, etc. and only allows safe tags.
                <div
                  className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEmail.body, SANITIZE_OPTIONS) }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{selectedEmail.body}</div>
              )}
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Select an email to read</p>
          </div>
        )}
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>To</Label>
              <Input
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="recipient@example.com (comma-separated for multiple)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CC</Label>
                <Input
                  value={composeCc}
                  onChange={(e) => setComposeCc(e.target.value)}
                  placeholder="CC recipients"
                />
              </div>
              <div>
                <Label>BCC</Label>
                <Input
                  value={composeBcc}
                  onChange={(e) => setComposeBcc(e.target.value)}
                  placeholder="BCC recipients"
                />
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label>Body</Label>
              <RichEditor
                value={composeBody}
                onChange={setComposeBody}
                placeholder="Write your message..."
              />
            </div>
            {composeAttachments.length > 0 && (
              <div className="space-y-1">
                <Label>Attachments ({composeAttachments.length})</Label>
                <div className="space-y-1">
                  {composeAttachments.map((a, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-1.5 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{a.filename}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatBytes(a.size)}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeAttachment(i)}
                        aria-label={`Remove ${a.filename}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                <Paperclip className="h-4 w-4" />
                <span>Attach files</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleAttachFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleComposeSend(true)} disabled={isPending}>
                  Save Draft
                </Button>
                <Button onClick={() => handleComposeSend(false)} disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Send className="h-4 w-4 mr-2" /> Send
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
