"use client";

import { useState } from "react";
import { saveJobPortalCredentials, testJobPortalConnection } from "@/lib/actions/job-syndication";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Globe, Settings, Play, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Props = {
  initialPortals: any[];
};

export function PortalsClient({ initialPortals }: Props) {
  const [portals, setPortals] = useState(initialPortals);
  const [selectedPortal, setSelectedPortal] = useState<any | null>(null);
  const [credentials, setCredentials] = useState("");
  const [isSandbox, setIsSandbox] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openConfigure = (portal: any) => {
    setSelectedPortal(portal);
    setIsSandbox(portal.isSandbox ?? true);
    setCredentials("");
  };

  const handleSave = async () => {
    if (!selectedPortal) return;
    setSaving(true);
    try {
      await saveJobPortalCredentials({
        portalId: selectedPortal.id,
        credentials,
        isSandbox,
      });
      toast.success(`Configured ${selectedPortal.name}`);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to save portal configuration");
    } finally {
      setSaving(false);
      setSelectedPortal(null);
    }
  };

  const handleTest = async (portalId: string) => {
    setTestingId(portalId);
    try {
      const res = await testJobPortalConnection(portalId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Test failed");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {portals.map((portal) => {
          const isConnected = portal.connections?.length > 0 && portal.status === "ACTIVE";

          return (
            <Card key={portal.id} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{portal.name}</CardTitle>
                    <CardDescription className="text-xs">Provider: {portal.provider}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={portal.isSandbox ? "outline" : "default"}>
                    {portal.isSandbox ? "Sandbox" : "Production"}
                  </Badge>
                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {portal.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 border-t mt-2 space-y-4">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Base URL: {portal.baseUrl || "Internal Feed"}</div>
                  <div>Capabilities: Publish, Update, Unpublish</div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={testingId === portal.id}
                    onClick={() => handleTest(portal.id)}
                  >
                    <Play className={`h-3.5 w-3.5 mr-1 ${testingId === portal.id ? "animate-spin" : ""}`} />
                    Test Connection
                  </Button>
                  <Button size="sm" onClick={() => openConfigure(portal)}>
                    <Settings className="h-3.5 w-3.5 mr-1" /> Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configure Modal */}
      {selectedPortal && (
        <Dialog open={!!selectedPortal} onOpenChange={() => setSelectedPortal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure {selectedPortal.name}</DialogTitle>
              <DialogDescription>Set API credentials and environment mode for this job portal.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-semibold">Sandbox Environment Mode</Label>
                  <p className="text-xs text-muted-foreground">Prevent production syndication during testing</p>
                </div>
                <Switch checked={isSandbox} onCheckedChange={(val) => setIsSandbox(val)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creds">Encrypted API Key / Secret</Label>
                <Input
                  id="creds"
                  type="password"
                  placeholder="Enter partner API key or credentials..."
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> Credentials stored encrypted with AES-256-GCM.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPortal(null)}>Cancel</Button>
              <Button disabled={saving} onClick={handleSave}>{saving ? "Saving..." : "Save Configuration"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
