"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Send,
  Globe,
  Briefcase,
  AtSign,
  Image,
  Info,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { publishToSocial } from "@/lib/actions/marketing";
import { toast } from "sonner";
import type { SocialPlatform } from "@/lib/social-media";

const platformMeta: Record<
  SocialPlatform,
  { label: string; icon: React.ReactNode; color: string }
> = {
  facebook: {
    label: "Facebook",
    icon: <Globe className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  linkedin: {
    label: "LinkedIn",
    icon: <Briefcase className="h-4 w-4" />,
    color: "bg-sky-100 text-sky-700 border-sky-200",
  },
  twitter: {
    label: "Twitter / X",
    icon: <AtSign className="h-4 w-4" />,
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

type PostResults = Record<string, { success: boolean; postId?: string; error?: string }>;

type Props = {
  configuredPlatforms: SocialPlatform[];
};

export function SocialClient({ configuredPlatforms }: Props) {
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [results, setResults] = useState<PostResults | null>(null);
  const [isPending, startTransition] = useTransition();

  const TWITTER_LIMIT = 280;
  const twitterSelected = selectedPlatforms.includes("twitter");
  const overLimit = twitterSelected && message.length > TWITTER_LIMIT;

  function togglePlatform(platform: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  function handlePost() {
    if (!message.trim() || selectedPlatforms.length === 0) return;
    startTransition(async () => {
      try {
        const res = await publishToSocial({
          message: message.trim(),
          platforms: selectedPlatforms,
          imageUrl: imageUrl.trim() || undefined,
        });
        setResults(res);
        const successCount = Object.values(res).filter((r) => r.success).length;
        if (successCount === selectedPlatforms.length) {
          toast.success("Posted to all platforms");
        } else if (successCount > 0) {
          toast.warning(`Posted to ${successCount} of ${selectedPlatforms.length} platforms`);
        } else {
          toast.error("Failed to post to any platform");
        }
      } catch {
        toast.error("Failed to publish");
      }
    });
  }

  // No platforms configured at all
  if (configuredPlatforms.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/marketing">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Overview
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Social Media</h1>
            <p className="text-sm text-muted-foreground">Post to social media platforms</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Info className="mx-auto h-8 w-8 mb-3 text-muted-foreground opacity-60" />
            <p className="font-medium mb-1">No social media platforms configured</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Configure social media API keys in your environment variables to enable posting.
              Supported platforms: Facebook, LinkedIn, Twitter/X.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/marketing">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Overview
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Social Media</h1>
          <p className="text-sm text-muted-foreground">Post to social media platforms</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Compose area */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compose Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Write your social media post..."
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{message.length} characters</span>
                  {twitterSelected && (
                    <span className={overLimit ? "text-red-500 font-medium" : ""}>
                      Twitter limit: {message.length}/{TWITTER_LIMIT}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Image className="h-3.5 w-3.5" /> Image URL (optional)
                </Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {configuredPlatforms.map((platform) => {
                    const meta = platformMeta[platform];
                    const selected = selectedPlatforms.includes(platform);
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => togglePlatform(platform)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                          selected
                            ? meta.color
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {meta.icon}
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={handlePost}
                disabled={
                  isPending ||
                  !message.trim() ||
                  selectedPlatforms.length === 0 ||
                  overLimit
                }
                className="w-full"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Post Now
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Post Results</CardTitle>
            </CardHeader>
            <CardContent>
              {!results ? (
                <p className="text-sm text-muted-foreground">
                  Results will appear here after posting.
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(results).map(([platform, result]) => {
                    const meta = platformMeta[platform as SocialPlatform];
                    return (
                      <div
                        key={platform}
                        className="flex items-start gap-3 rounded-md border p-3"
                      >
                        <div className="mt-0.5">
                          {result.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {meta?.icon}
                            <span className="text-sm font-medium">
                              {meta?.label ?? platform}
                            </span>
                            <Badge
                              variant={result.success ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {result.success ? "Sent" : "Failed"}
                            </Badge>
                          </div>
                          {result.postId && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              Post ID: {result.postId}
                            </p>
                          )}
                          {result.error && (
                            <p className="text-xs text-red-500 mt-1">{result.error}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connected Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {configuredPlatforms.map((platform) => {
                  const meta = platformMeta[platform];
                  return (
                    <div
                      key={platform}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      {meta.icon}
                      <span>{meta.label}</span>
                    </div>
                  );
                })}
                {(["facebook", "linkedin", "twitter"] as SocialPlatform[])
                  .filter((p) => !configuredPlatforms.includes(p))
                  .map((platform) => {
                    const meta = platformMeta[platform];
                    return (
                      <div
                        key={platform}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <XCircle className="h-3.5 w-3.5 opacity-40" />
                        {meta.icon}
                        <span>{meta.label} (not configured)</span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
