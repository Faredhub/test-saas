"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ShieldOff, Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type MfaSetupProps = {
  mfaEnabled: boolean;
};

type SetupStep = "idle" | "qr" | "verify" | "recovery" | "disable";

export function MfaSetup({ mfaEnabled: initialMfaEnabled }: MfaSetupProps) {
  const [mfaEnabled, setMfaEnabled] = useState(initialMfaEnabled);
  const [step, setStep] = useState<SetupStep>("idle");
  const [loading, setLoading] = useState(false);

  // Setup state
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Disable state
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  async function handleStartSetup() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to start MFA setup");
        return;
      }

      setSecret(data.secret);

      // Generate QR code client-side
      const QRCode = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(data.uri, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
      setStep("qr");
    } catch {
      toast.error("Failed to start MFA setup");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (verifyCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        return;
      }

      setRecoveryCodes(data.recoveryCodes);
      setMfaEnabled(true);
      setStep("recovery");
      toast.success("MFA enabled successfully");
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisableMfa() {
    if (!disablePassword) {
      toast.error("Password is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to disable MFA");
        return;
      }

      setMfaEnabled(false);
      setShowDisableDialog(false);
      setDisablePassword("");
      toast.success("MFA has been disabled");
    } catch {
      toast.error("Failed to disable MFA");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyRecoveryCodes() {
    const text = recoveryCodes.join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Recovery codes copied to clipboard");
  }

  function handleDone() {
    setStep("idle");
    setSecret("");
    setQrDataUrl("");
    setVerifyCode("");
    setRecoveryCodes([]);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {mfaEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                )}
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account using a TOTP authenticator app
              </CardDescription>
            </div>
            <Badge variant={mfaEnabled ? "default" : "outline"}>
              {mfaEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {step === "idle" && (
            <div>
              {mfaEnabled ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your account is protected with two-factor authentication. You will be asked for a
                    verification code when signing in.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDisableDialog(true)}
                  >
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Disable MFA
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Two-factor authentication is not enabled. Enable it to add an extra layer of
                    security using an authenticator app like Google Authenticator or Authy.
                  </p>
                  <Button onClick={handleStartSetup} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Enable MFA
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "qr" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Step 1: Scan QR Code</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                {qrDataUrl && (
                  <div className="rounded-lg border bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="MFA QR Code" width={200} height={200} />
                  </div>
                )}

                <div className="w-full max-w-sm space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Or enter this secret manually:
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs font-mono break-all">
                      {secret}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(secret);
                        toast.success("Secret copied to clipboard");
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleDone}>
                  Cancel
                </Button>
                <Button onClick={() => setStep("verify")}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Step 2: Verify Code</h4>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to verify setup.
                </p>
              </div>

              <div className="max-w-xs space-y-2">
                <Label htmlFor="mfa-code">Verification Code</Label>
                <Input
                  id="mfa-code"
                  placeholder="000000"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  className="font-mono text-center text-lg tracking-widest"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyCode();
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("qr")}>
                  Back
                </Button>
                <Button onClick={handleVerifyCode} disabled={loading || verifyCode.length !== 6}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Enable
                </Button>
              </div>
            </div>
          )}

          {step === "recovery" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600 shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Save your recovery codes</p>
                  <p className="mt-1">
                    These codes can be used to access your account if you lose your authenticator device.
                    Each code can only be used once. Store them in a safe place.
                  </p>
                </div>
              </div>

              <div className="rounded-md border bg-muted p-4">
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map((code, i) => (
                    <code key={i} className="text-sm font-mono">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopyRecoveryCodes}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Codes
                </Button>
                <Button onClick={handleDone}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disable MFA Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your current password to confirm disabling MFA. This will remove the extra
              security layer from your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="disable-password">Current Password</Label>
            <Input
              id="disable-password"
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Enter your password"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDisableMfa();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDisableDialog(false);
                setDisablePassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableMfa}
              disabled={loading || !disablePassword}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable MFA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
