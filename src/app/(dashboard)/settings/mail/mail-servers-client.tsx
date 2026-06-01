"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Mail, Server, Send, Loader2, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteTenantMailServer,
  upsertTenantMailServer,
} from "@/lib/actions/mail-servers";

type MailServerRow = {
  id: string;
  name: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  fromDomain: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type Props = {
  initial: MailServerRow | null;
  initialError?: string | null;
};

export function MailServersClient({ initial, initialError }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [imapHost, setImapHost] = useState(initial?.imapHost ?? "");
  const [imapPort, setImapPort] = useState(String(initial?.imapPort ?? 993));
  const [imapSecure, setImapSecure] = useState(initial?.imapSecure ?? true);
  const [smtpHost, setSmtpHost] = useState(initial?.smtpHost ?? "");
  const [smtpPort, setSmtpPort] = useState(String(initial?.smtpPort ?? 587));
  const [smtpSecure, setSmtpSecure] = useState(initial?.smtpSecure ?? false);
  const [fromDomain, setFromDomain] = useState(initial?.fromDomain ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isPending, startTransition] = useTransition();
  const [hasRow, setHasRow] = useState(initial !== null);

  if (initialError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {initialError}
        </div>
      </div>
    );
  }

  function handleSave() {
    if (!name.trim() || !imapHost.trim() || !smtpHost.trim()) {
      toast.error("Name, IMAP host, and SMTP host are required");
      return;
    }
    startTransition(async () => {
      try {
        await upsertTenantMailServer({
          name: name.trim(),
          imapHost: imapHost.trim(),
          imapPort: Number(imapPort) || 993,
          imapSecure,
          smtpHost: smtpHost.trim(),
          smtpPort: Number(smtpPort) || 587,
          smtpSecure,
          fromDomain: fromDomain.trim() || null,
          isActive,
        });
        setHasRow(true);
        toast.success("Mail server saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete the mail server config? Users will lose mailbox access until you reconfigure.")) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteTenantMailServer();
        setHasRow(false);
        setName("");
        setImapHost("");
        setSmtpHost("");
        setFromDomain("");
        toast.success("Mail server removed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete");
      }
    });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" /> Mail Server
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure the IMAP and SMTP servers this workspace uses for email. Point this at any standard mail server
          (Mail-in-a-Box, Postfix + Dovecot, hosted IMAP, etc.). Individual users will connect their own mailbox
          credentials in the Email module once this is set.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-4 w-4" /> Server details
          </CardTitle>
          <CardDescription>
            Hostnames and ports for inbound (IMAP) and outbound (SMTP). Most Mail-in-a-Box installs use IMAPS on 993
            and Submission on 587 with STARTTLS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mail-in-a-Box (subhadraconsultant.com)"
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Inbound (IMAP)</h3>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
              <div className="space-y-2">
                <Label htmlFor="imapHost">IMAP host</Label>
                <Input
                  id="imapHost"
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  placeholder="mail.subhadraconsultant.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imapPort">Port</Label>
                <Input
                  id="imapPort"
                  inputMode="numeric"
                  value={imapPort}
                  onChange={(e) => setImapPort(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer">
              <div>
                <div className="text-sm font-medium">Implicit TLS (recommended for port 993)</div>
                <div className="text-xs text-muted-foreground">
                  Off = STARTTLS upgrade after PLAIN connect (typically port 143).
                </div>
              </div>
              <Switch checked={imapSecure} onCheckedChange={setImapSecure} />
            </label>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Send className="h-3.5 w-3.5" /> Outbound (SMTP)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP host</Label>
                <Input
                  id="smtpHost"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="mail.subhadraconsultant.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port</Label>
                <Input
                  id="smtpPort"
                  inputMode="numeric"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer">
              <div>
                <div className="text-sm font-medium">Implicit TLS (SMTPS, typically port 465)</div>
                <div className="text-xs text-muted-foreground">
                  Off = STARTTLS upgrade on the Submission port (typically 587). Most Mail-in-a-Box installs use STARTTLS on 587.
                </div>
              </div>
              <Switch checked={smtpSecure} onCheckedChange={setSmtpSecure} />
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromDomain">Default sender domain (optional)</Label>
            <Input
              id="fromDomain"
              value={fromDomain}
              onChange={(e) => setFromDomain(e.target.value)}
              placeholder="subhadraconsultant.com"
            />
            <p className="text-xs text-muted-foreground">
              Pre-fills the new-mailbox connection form for your users so they only need to type the local part.
            </p>
          </div>

          <label className="flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer">
            <div>
              <div className="text-sm font-medium">Active</div>
              <div className="text-xs text-muted-foreground">
                When off, users see &quot;mail is paused&quot; and sync stops.
              </div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>

          <div className="flex items-center justify-between pt-2">
            {hasRow ? (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={isPending}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            ) : <div />}
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mail-in-a-Box quick reference</CardTitle>
          <CardDescription>Typical values for a standard Mail-in-a-Box install:</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-[120px_1fr] gap-y-1">
            <div className="text-muted-foreground">IMAP</div>
            <div><code>mail.&lt;your-domain&gt; : 993 (TLS)</code></div>
            <div className="text-muted-foreground">SMTP</div>
            <div><code>mail.&lt;your-domain&gt; : 587 (STARTTLS)</code></div>
            <div className="text-muted-foreground">User</div>
            <div>Full email address (e.g. <code>name@subhadraconsultant.com</code>)</div>
            <div className="text-muted-foreground">Password</div>
            <div>The mailbox password set in the Mail-in-a-Box admin panel.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
