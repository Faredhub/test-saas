"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  QrCode,
  Download,
  Loader2,
  Link2,
  CreditCard,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { generateMenuQR } from "@/lib/actions/sales";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Preset types
// ---------------------------------------------------------------------------

type QRPreset = {
  id: string;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  description: string;
};

const presets: QRPreset[] = [
  {
    id: "menu",
    label: "Menu Link",
    icon: <ExternalLink className="h-5 w-5" />,
    placeholder: "https://your-restaurant.com/menu",
    description: "Generate a QR code linking to your digital menu",
  },
  {
    id: "payment",
    label: "Payment Link",
    icon: <CreditCard className="h-5 w-5" />,
    placeholder: "https://pay.example.com/your-store",
    description: "Generate a QR code for payment page or UPI link",
  },
  {
    id: "feedback",
    label: "Feedback Form",
    icon: <MessageSquare className="h-5 w-5" />,
    placeholder: "https://forms.google.com/your-feedback-form",
    description: "Generate a QR code linking to your feedback form",
  },
  {
    id: "custom",
    label: "Custom URL",
    icon: <Link2 className="h-5 w-5" />,
    placeholder: "https://example.com",
    description: "Generate a QR code for any URL",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QRCodesClient() {
  const [activePreset, setActivePreset] = useState("menu");
  const [url, setUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const imgRef = useRef<HTMLImageElement>(null);

  const currentPreset = presets.find((p) => p.id === activePreset)!;

  // ---------------------------------------------------------------------------
  // Generate QR
  // ---------------------------------------------------------------------------

  function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault();

    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    startTransition(async () => {
      try {
        const dataUrl = await generateMenuQR(url.trim());
        setQrDataUrl(dataUrl);
        toast.success("QR code generated");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to generate QR code"
        );
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Download QR
  // ---------------------------------------------------------------------------

  function handleDownload() {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.download = `qr-${activePreset}-${Date.now()}.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success("QR code downloaded");
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <QrCode className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">QR Code Generator</h1>
          <p className="text-xs text-muted-foreground">
            Generate QR codes for menus, payments, and more
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Input */}
        <div className="space-y-6">
          {/* Preset selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">QR Code Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setActivePreset(preset.id);
                      setUrl("");
                      setQrDataUrl(null);
                    }}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                      activePreset === preset.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        activePreset === preset.id
                          ? "bg-primary/10 text-primary"
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      {preset.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{preset.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* URL input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enter URL</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <Label htmlFor="qr-url" className="mb-1.5 text-xs">
                    {currentPreset.label} URL
                  </Label>
                  <Input
                    id="qr-url"
                    type="url"
                    placeholder={currentPreset.placeholder}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full text-base"
                  disabled={isPending || !url.trim()}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-5 w-5" />
                      Generate QR Code
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: QR Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {qrDataUrl ? (
              <div className="flex flex-col items-center gap-6">
                <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-white p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={qrDataUrl}
                    alt="Generated QR Code"
                    className="h-64 w-64"
                  />
                </div>
                <div className="w-full space-y-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Encoded URL
                    </p>
                    <p className="mt-1 break-all text-sm font-mono">{url}</p>
                  </div>
                  <Button
                    className="h-12 w-full text-base"
                    onClick={handleDownload}
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Download PNG
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <QrCode className="mb-4 h-16 w-16 opacity-15" />
                <p className="text-sm">No QR code generated yet</p>
                <p className="text-xs">
                  Enter a URL and click generate to see your QR code
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
