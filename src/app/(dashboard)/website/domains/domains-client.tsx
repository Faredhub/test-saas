"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  addCustomDomain,
  verifyDomain,
  deleteCustomDomain,
  setPrimaryDomain,
  enableSSL,
} from "@/lib/actions/website";
import { toast } from "sonner";
import {
  Globe,
  Plus,
  Trash2,
  ShieldCheck,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Star,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react";

type DnsRecord = {
  id: string;
  domainId: string;
  type: string;
  name: string;
  value: string;
  ttl: number;
  isRequired: boolean;
};

type CustomDomain = {
  id: string;
  domain: string;
  status: string;
  verificationCode: string;
  verifiedAt: Date | null;
  sslEnabled: boolean;
  sslExpiresAt: Date | null;
  sslProvider: string | null;
  primaryDomain: boolean;
  dnsRecords: DnsRecord[];
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING_VERIFICATION: { label: "Pending Verification", variant: "secondary" },
  VERIFIED: { label: "Verified", variant: "outline" },
  SSL_ACTIVE: { label: "SSL Active", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
  SUSPENDED: { label: "Suspended", variant: "destructive" },
};

export function DomainsClient({
  initialDomains,
}: {
  initialDomains: CustomDomain[];
}) {
  const [domains, setDomains] = useState<CustomDomain[]>(initialDomains);
  const [newDomain, setNewDomain] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomDomain | null>(null);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [enablingSSL, setEnablingSSL] = useState<string | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<CustomDomain | null>(null);

  async function handleAdd() {
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      const result = await addCustomDomain(newDomain.trim().toLowerCase());
      setDomains((prev) => [...prev, result as unknown as CustomDomain]);
      setNewDomain("");
      setAddDialogOpen(false);
      toast.success("Domain added successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add domain");
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(domainId: string) {
    setVerifying(domainId);
    try {
      const updated = await verifyDomain(domainId);
      setDomains((prev) => prev.map((d) => (d.id === domainId ? updated as unknown as CustomDomain : d)));
      if (selectedDomain?.id === domainId) setSelectedDomain(updated as unknown as CustomDomain);
      toast.success("Domain verified successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(null);
    }
  }

  async function handleEnableSSL(domainId: string) {
    setEnablingSSL(domainId);
    try {
      const updated = await enableSSL(domainId);
      setDomains((prev) => prev.map((d) => (d.id === domainId ? updated as unknown as CustomDomain : d)));
      if (selectedDomain?.id === domainId) setSelectedDomain(updated as unknown as CustomDomain);
      toast.success("SSL enabled");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to enable SSL");
    } finally {
      setEnablingSSL(null);
    }
  }

  async function handleSetPrimary(domainId: string, current: boolean) {
    if (current) return;
    setSettingPrimary(domainId);
    try {
      await setPrimaryDomain(domainId);
      setDomains((prev) =>
        prev.map((d) => ({
          ...d,
          primaryDomain: d.id === domainId,
        }))
      );
      setSelectedDomain((prev) => prev ? { ...prev, primaryDomain: prev.id === domainId } : null);
      toast.success("Primary domain updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to set primary");
    } finally {
      setSettingPrimary(null);
    }
  }

  function confirmDelete(domain: CustomDomain) {
    setDeleteTarget(domain);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCustomDomain(deleteTarget.id);
      setDomains((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      if (selectedDomain?.id === deleteTarget.id) setSelectedDomain(null);
      toast.success("Domain deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
  }

  function formatDate(d: Date | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Domains</h1>
          <p className="text-muted-foreground">
            Manage custom domains and SSL certificates for your public website
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Domain
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Domain</DialogTitle>
              <DialogDescription>
                Enter the domain name you want to connect to your website.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Input
                  id="domain"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </DialogClose>
              <Button onClick={handleAdd} disabled={adding || !newDomain.trim()}>
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Domain
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Domain</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {deleteTarget?.domain}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
                Cancel
              </DialogClose>
              <Button onClick={handleDelete} variant="destructive">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Domains</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SSL</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No custom domains added yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    domains.map((d) => (
                      <TableRow
                        key={d.id}
                        className={
                          selectedDomain?.id === d.id ? "bg-muted/50" : "cursor-pointer hover:bg-muted/30"
                        }
                        onClick={() => setSelectedDomain(d)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            {d.domain}
                            {d.primaryDomain && (
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[d.status]?.variant || "secondary"}>
                            <span className="flex items-center gap-1">
                              {statusConfig[d.status]?.label || d.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {d.sslEnabled ? (
                            <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not enabled</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={d.primaryDomain}
                            onCheckedChange={() => handleSetPrimary(d.id, d.primaryDomain)}
                            disabled={
                              d.primaryDomain ||
                              (d.status !== "VERIFIED" && d.status !== "SSL_ACTIVE") ||
                              settingPrimary === d.id
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDelete(d);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          {selectedDomain ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {selectedDomain.domain}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Status</p>
                  <Badge variant={statusConfig[selectedDomain.status]?.variant || "secondary"}>
                    <span className="flex items-center gap-1">
                      {selectedDomain.status === "VERIFIED" && <CheckCircle className="h-3.5 w-3.5" />}
                      {selectedDomain.status === "SSL_ACTIVE" && <ShieldCheck className="h-3.5 w-3.5" />}
                      {statusConfig[selectedDomain.status]?.label || selectedDomain.status}
                    </span>
                  </Badge>
                </div>

                {selectedDomain.status === "PENDING_VERIFICATION" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Verification TXT Record</p>
                    <p className="text-xs text-muted-foreground">
                      Add this record to your DNS provider to verify domain ownership:
                    </p>
                    <div className="bg-muted rounded-md p-3 space-y-1 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="flex items-center gap-1">
                          _knnect360-verify.{selectedDomain.domain}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() =>
                              copyToClipboard(`_knnect360-verify.${selectedDomain.domain}`)
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span>TXT</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Value:</span>
                        <span className="flex items-center gap-1">
                          {selectedDomain.verificationCode}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copyToClipboard(selectedDomain.verificationCode)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </span>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleVerify(selectedDomain.id)}
                      disabled={verifying === selectedDomain.id}
                    >
                      {verifying === selectedDomain.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Verify Domain
                    </Button>
                  </div>
                )}

                {selectedDomain.status === "VERIFIED" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Domain verified
                      {selectedDomain.verifiedAt && (
                        <span className="text-xs text-muted-foreground">
                          on {formatDate(selectedDomain.verifiedAt)}
                        </span>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleEnableSSL(selectedDomain.id)}
                      disabled={enablingSSL === selectedDomain.id}
                    >
                      {enablingSSL === selectedDomain.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="mr-2 h-4 w-4" />
                      )}
                      Enable SSL
                    </Button>
                  </div>
                )}

                {selectedDomain.sslEnabled && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    SSL Active via {selectedDomain.sslProvider || "Let's Encrypt"}
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Required DNS Records</p>
                  <div className="bg-muted rounded-md p-3 space-y-2 text-xs font-mono">
                    {selectedDomain.dnsRecords.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {rec.type}
                          </Badge>
                          <span>{rec.name}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          {rec.value}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copyToClipboard(rec.value)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedDomain.primaryDomain && (
                  <div className="flex items-center gap-2 text-amber-500 text-sm">
                    <Star className="h-4 w-4 fill-amber-500" />
                    Primary Domain
                  </div>
                )}

                <div className="pt-2 border-t">
                  <a
                    href={`https://${selectedDomain.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Visit Site
                  </a>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Globe className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Select a domain to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
