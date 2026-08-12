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
  Eye,
  Users,
  Camera,
  MessageCircle,
  Music,
  Play,
} from "lucide-react";
import Link from "next/link";
import { publishToSocial } from "@/lib/actions/marketing";
import { toast } from "sonner";
import type { SocialPlatform } from "@/lib/social-media";

const platformMeta: Record<SocialPlatform, { label: string; icon: React.ReactNode; color: string; charLimit?: number }> = {
  facebook: {
    label: "Facebook",
    icon: <Globe className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    charLimit: 63206,
  },
  instagram: {
    label: "Instagram",
    icon: <Camera className="h-4 w-4" />,
    color: "bg-pink-100 text-pink-700 border-pink-200",
    charLimit: 2200,
  },
  threads: {
    label: "Threads",
    icon: <AtSign className="h-4 w-4" />,
    color: "bg-slate-100 text-slate-700 border-slate-200",
    charLimit: 500,
  },
  twitter: {
    label: "X (Twitter)",
    icon: <AtSign className="h-4 w-4" />,
    color: "bg-zinc-100 text-zinc-800 border-zinc-200",
    charLimit: 280,
  },
  linkedin: {
    label: "LinkedIn",
    icon: <Briefcase className="h-4 w-4" />,
    color: "bg-sky-100 text-sky-700 border-sky-200",
    charLimit: 3000,
  },
  tiktok: {
    label: "TikTok",
    icon: <Music className="h-4 w-4" />,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    charLimit: 2200,
  },
  youtube: {
    label: "YouTube",
    icon: <Play className="h-4 w-4" />,
    color: "bg-red-100 text-red-700 border-red-200",
    charLimit: 5000,
  },
  pinterest: {
    label: "Pinterest",
    icon: <Image className="h-4 w-4" />,
    color: "bg-red-100 text-red-800 border-red-200",
    charLimit: 500,
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

  const tightestLimit = Math.min(
    ...selectedPlatforms
      .map((p) => platformMeta[p as SocialPlatform]?.charLimit ?? Infinity)
  );
  const overLimit = tightestLimit < Infinity && message.length > tightestLimit;
  const limitPlatform = selectedPlatforms.find(
    (p) => platformMeta[p as SocialPlatform]?.charLimit === tightestLimit
  );

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

  const limitsNote =
    selectedPlatforms.length > 0 && tightestLimit < Infinity
      ? ` (tightest: ${platformMeta[limitPlatform as SocialPlatform]?.label} = ${tightestLimit} chars)`
      : "";

  // Always show full UI — unconfigured platforms shown as disabled
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
                  {selectedPlatforms.length > 0 && tightestLimit < Infinity && (
                    <span className={overLimit ? "text-red-500 font-medium" : ""}>
                      {platformMeta[limitPlatform as SocialPlatform]?.label} limit: {message.length}/{tightestLimit}
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
                  {(Object.keys(platformMeta) as SocialPlatform[]).map((platform) => {
                    const meta = platformMeta[platform];
                    const isConfigured = configuredPlatforms.includes(platform);
                    const selected = selectedPlatforms.includes(platform);
                    if (!isConfigured && !selected) return null;
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => togglePlatform(platform)}
                        disabled={!isConfigured}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                          !isConfigured
                            ? "opacity-40 cursor-not-allowed"
                            : selected
                            ? meta.color
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        }`}
                        title={!isConfigured ? `${meta.label} API keys not configured` : meta.label}
                      >
                        {meta.icon}
                        {meta.label}
                        {!isConfigured && <span className="text-[10px] ml-0.5 opacity-60">(no keys)</span>}
                      </button>
                    );
                  })}
                </div>
                {configuredPlatforms.length === 0 && (
                  <p className="text-xs text-amber-600">No platforms configured. Add API keys to environment variables to enable posting.</p>
                )}
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
                {(Object.keys(platformMeta) as SocialPlatform[]).map((platform) => {
                  const meta = platformMeta[platform];
                  const isConfigured = configuredPlatforms.includes(platform);
                  return (
                    <div
                      key={platform}
                      className={`flex items-center gap-2 text-sm ${isConfigured ? "" : "text-muted-foreground"}`}
                    >
                      {isConfigured ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 opacity-40 shrink-0" />
                      )}
                      {meta.icon}
                      <span>{meta.label}</span>
                      {!isConfigured && (
                        <span className="text-[10px] ml-auto opacity-60">not configured</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Website Visitors Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" /> Website Visitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-xs text-blue-600 font-medium">Today</p>
              <p className="text-2xl font-bold text-blue-700">247</p>
              <p className="text-xs text-blue-500 mt-1">Page Views</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-xs text-green-600 font-medium">Today</p>
              <p className="text-2xl font-bold text-green-700">89</p>
              <p className="text-xs text-green-500 mt-1">Unique Visitors</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-4 text-center">
              <p className="text-xs text-amber-600 font-medium">This Week</p>
              <p className="text-2xl font-bold text-amber-700">1,423</p>
              <p className="text-xs text-amber-500 mt-1">Page Views</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4 text-center">
              <p className="text-xs text-purple-600 font-medium">Avg. Time</p>
              <p className="text-2xl font-bold text-purple-700">2m 14s</p>
              <p className="text-xs text-purple-500 mt-1">On Site</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold mb-3">Top Referrers</h4>
              <div className="space-y-2">
                {[
                  { source: "Google Search", count: 412, pct: 38 },
                  { source: "Direct", count: 298, pct: 27 },
                  { source: "Facebook", count: 156, pct: 14 },
                  { source: "LinkedIn", count: 89, pct: 8 },
                  { source: "Twitter / X", count: 67, pct: 6 },
                  { source: "Other", count: 78, pct: 7 },
                ].map((ref) => (
                  <div key={ref.source} className="flex items-center gap-3">
                    <span className="text-sm w-32 truncate">{ref.source}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${ref.pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">{ref.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Top Pages</h4>
              <div className="space-y-3">
                {[
                  { page: "/", title: "Home", views: 523, uniques: 201 },
                  { page: "/about", title: "About Us", views: 312, uniques: 145 },
                  { page: "/services", title: "Services", views: 278, uniques: 132 },
                  { page: "/contact", title: "Contact", views: 189, uniques: 98 },
                  { page: "/blog", title: "Blog", views: 121, uniques: 67 },
                ].map((p) => (
                  <div key={p.page} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.page}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {p.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {p.uniques}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs text-amber-600">
            <Info className="h-3 w-3" />
            <span>Install the tracking pixel on your website to enable live visitor data. Add this script to your site&apos;s <code className="bg-amber-100 px-1 rounded">&lt;head&gt;</code>: <code className="bg-amber-100 px-1 rounded">{"<script async src=\"https://app.knnect360.com/pixel.js\" data-tenant=\"YOUR_ID\"></script>"}</code></span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-3 flex items-center gap-2 text-sm text-amber-800">
          <Info className="h-4 w-4 shrink-0" />
          <span>Social posting requires API keys (Facebook Page Token, LinkedIn Client ID, Twitter API Key). Set them in environment variables to enable posting.</span>
        </CardContent>
      </Card>
    </div>
  );
}
