"use client";

import { useState, useRef, ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SocialConnectionDTO, createSocialPost } from "@/lib/actions/social";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Send, Clock, Save, Image as ImageIcon, AlertCircle, X, Upload } from "lucide-react";

type Props = {
  connections: SocialConnectionDTO[];
};

export function CreatePostClient({ connections }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(connections.map((c) => c.id));
  const [publishMode, setPublishMode] = useState<"now" | "schedule" | "draft">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleConnection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePhotoButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageUrl(dataUrl);
      toast.success("Image attached successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter post content");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Please select at least one connected account");
      return;
    }
    if (publishMode === "schedule" && !scheduledAt) {
      toast.error("Please specify date and time for scheduling");
      return;
    }

    setSubmitting(true);
    try {
      await createSocialPost({
        content,
        mediaUrls: imageUrl ? [imageUrl] : [],
        connectionIds: selectedIds,
        scheduledAt: publishMode === "schedule" ? scheduledAt : undefined,
        publishNow: publishMode === "now",
      });

      toast.success(
        publishMode === "now"
          ? "Post published to selected networks!"
          : publishMode === "schedule"
          ? "Post scheduled successfully!"
          : "Draft saved!"
      );
      router.push(publishMode === "schedule" ? "/marketing/social/scheduled" : "/marketing/social/published");
    } catch (err: any) {
      toast.error(err.message || "Failed to process post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Post Editor */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Post Content</CardTitle>
            <CardDescription>Compose your post text and attach an image via URL or file upload</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                rows={6}
                placeholder="What would you like to share across your social networks?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Supports Facebook, Instagram, LinkedIn, X</span>
                <span>{content.length} characters</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="media">Media Image (URL or File Upload)</Label>
              
              {/* Hidden Native File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              <div className="flex gap-2">
                <Input
                  id="media"
                  placeholder="https://example.com/image.jpg or click icon to upload"
                  value={imageUrl.startsWith("data:") ? "[Local Image File Attached]" : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Upload image from computer"
                  onClick={handlePhotoButtonClick}
                >
                  <ImageIcon className="h-4 w-4 text-primary" />
                </Button>
              </div>

              {/* Live Image Preview */}
              {imageUrl && (
                <div className="relative mt-3 inline-block border rounded-lg overflow-hidden bg-muted/30 p-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={imageUrl}
                      alt="Uploaded media preview"
                      className="h-20 w-20 object-cover rounded-md border"
                    />
                    <div className="flex flex-col gap-1 pr-6">
                      <span className="text-xs font-medium text-foreground">
                        {imageUrl.startsWith("data:") ? "Image Attached from File" : "Image URL Attached"}
                      </span>
                      <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[200px]">
                        {imageUrl}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-white transition-colors border"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Publishing Options */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing Options</CardTitle>
            <CardDescription>Choose when your post should be published</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setPublishMode("now")}
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 transition-colors ${
                  publishMode === "now"
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-popover hover:bg-accent"
                }`}
              >
                <Send className="mb-2 h-5 w-5 text-blue-500" />
                <span className="text-sm font-semibold">Publish Now</span>
              </button>

              <button
                type="button"
                onClick={() => setPublishMode("schedule")}
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 transition-colors ${
                  publishMode === "schedule"
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-popover hover:bg-accent"
                }`}
              >
                <Clock className="mb-2 h-5 w-5 text-amber-500" />
                <span className="text-sm font-semibold">Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => setPublishMode("draft")}
                className={`flex flex-col items-center justify-between rounded-md border-2 p-4 transition-colors ${
                  publishMode === "draft"
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-popover hover:bg-accent"
                }`}
              >
                <Save className="mb-2 h-5 w-5 text-slate-500" />
                <span className="text-sm font-semibold">Save Draft</span>
              </button>
            </div>

            {publishMode === "schedule" && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="scheduledAt">Scheduled Date & Time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button disabled={submitting} onClick={handleSubmit}>
                {submitting
                  ? "Processing..."
                  : publishMode === "now"
                  ? "Publish Now"
                  : publishMode === "schedule"
                  ? "Schedule Post"
                  : "Save Draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Networks Selector */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Target Networks</CardTitle>
            <CardDescription>Choose which connected accounts will receive this post</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connections.length === 0 ? (
              <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="h-4 w-4" /> No Social Accounts Connected
                </div>
                <p>Connect your Facebook Page, Instagram, LinkedIn, or X accounts first.</p>
                <Link href="/marketing/social/accounts">
                  <Button size="sm" variant="outline" className="w-full mt-2">
                    Go to Connected Accounts
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`conn-${conn.id}`}
                      checked={selectedIds.includes(conn.id)}
                      onCheckedChange={() => toggleConnection(conn.id)}
                    />
                    <Label
                      htmlFor={`conn-${conn.id}`}
                      className="flex-1 text-sm font-medium leading-none cursor-pointer"
                    >
                      <div className="font-semibold">{conn.provider}</div>
                      <div className="text-xs text-muted-foreground">{conn.accountName}</div>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
