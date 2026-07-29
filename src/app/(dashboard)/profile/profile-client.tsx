"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Shield, Building2, PanelLeft, PanelLeftClose, LayoutGrid, Upload } from "lucide-react";
import { updateUserProfile, changePassword } from "@/lib/actions/user";
import { toast } from "sonner";
import { format } from "date-fns";
import { MfaSetup } from "./mfa-setup";
import { useSidebarStore, type SidebarStyle } from "@/stores/sidebar-store";
import { PasswordInputWithStrength } from "@/components/ui/password-input-with-strength";

type Profile = NonNullable<Awaited<ReturnType<typeof import("@/lib/actions/user").getUserProfile>>>;

export function ProfileClient({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition();

  // Profile form
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [timezone, setTimezone] = useState(profile.timezone ?? "Asia/Kolkata");
  const [avatar, setAvatar] = useState<string | null>(profile.avatar ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size exceeds 10MB.");
      return;
    }

    try {
      const resizedBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxDim = 400;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.85));
            } else {
              resolve(evt.target?.result as string);
            }
          };
          img.onerror = reject;
          img.src = evt.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setAvatar(resizedBase64);
      startTransition(async () => {
        try {
          await updateUserProfile({ name, phone, timezone, avatar: resizedBase64 });
          toast.success("Profile photo updated");
          window.dispatchEvent(new Event("avatar-updated"));
        } catch {
          toast.error("Failed to update profile photo");
        }
      });
    } catch {
      toast.error("Failed to process profile image");
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    startTransition(async () => {
      try {
        await updateUserProfile({ name, phone, timezone, avatar: null });
        toast.success("Profile photo removed");
        window.dispatchEvent(new Event("avatar-updated"));
      } catch {
        toast.error("Failed to remove profile photo");
      }
    });
  };

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const initials = profile.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateUserProfile({ name, phone, timezone, avatar });
        toast.success("Profile updated");
      } catch {
        toast.error("Failed to update profile");
      }
    });
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    startTransition(async () => {
      try {
        await changePassword(currentPassword, newPassword);
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to change password");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Overview */}
      <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()} title="Change profile picture">
              <Avatar className="h-20 w-20 border-2 border-primary/10 hover:opacity-85 transition-opacity duration-200">
                {avatar && <AvatarImage src={avatar} alt={profile.name ?? "User"} />}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{profile.name}</h2>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
                {avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    onClick={handleRemoveAvatar}
                  >
                    Remove Photo
                  </Button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {profile.roleAssignments.map((ra) => (
                  <Badge key={ra.role.name} variant="outline" className="text-xs hover:shadow-sm transition-all duration-150">
                    <Shield className="mr-1 h-3 w-3" />
                    {ra.role.name}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs hover:shadow-sm transition-all duration-150">
                  <Building2 className="mr-1 h-3 w-3" />
                  {profile.tenant.name}
                </Badge>
              </div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="hover:bg-muted/30 p-2 rounded-md transition-colors duration-150">
              <p className="text-muted-foreground">Plan</p>
              <p className="font-medium">{profile.tenant.plan}</p>
            </div>
            <div className="hover:bg-muted/30 p-2 rounded-md transition-colors duration-150">
              <p className="text-muted-foreground">Last Login</p>
              <p className="font-medium">{profile.lastLoginAt ? format(new Date(profile.lastLoginAt), "dd MMM yyyy, HH:mm") : "—"}</p>
            </div>
            <div className="hover:bg-muted/30 p-2 rounded-md transition-colors duration-150">
              <p className="text-muted-foreground">Member Since</p>
              <p className="font-medium">{format(new Date(profile.createdAt), "dd MMM yyyy")}</p>
            </div>
            <div className="hover:bg-muted/30 p-2 rounded-md transition-colors duration-150">
              <p className="text-muted-foreground">MFA Status</p>
              <p className="font-medium">{profile.mfaEnabled ? "Enabled" : "Disabled"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile */}
      <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.email} disabled className="bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  className="hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm hover:shadow-sm transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
              </div>
            </div>
            <Button type="submit" disabled={isPending} className="hover:shadow-md transition-all duration-200">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password (min 8 characters, 1 uppercase, 1 number / special char)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <PasswordInputWithStrength
                id="currentPassword" 
                name="currentPassword" 
                placeholder="Enter current password"
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                required 
                showStrengthMeter={false}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <PasswordInputWithStrength 
                  id="newPassword" 
                  name="newPassword" 
                  placeholder="Enter new password"
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  showStrengthMeter={true}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInputWithStrength 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  placeholder="Confirm new password"
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  showStrengthMeter={false}
                />
                {confirmPassword.length > 0 && (
                  <p className={`text-[11px] font-semibold ${
                    newPassword === confirmPassword ? "text-emerald-600" : "text-red-500"
                  }`}>
                    {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
              </div>
            </div>
            <Button type="submit" variant="outline" disabled={isPending || (newPassword !== confirmPassword && confirmPassword.length > 0)} className="hover:shadow-md hover:bg-primary/10 transition-all duration-200">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sidebar Style Preference */}
      <SidebarStyleCard />

      {/* Two-Factor Authentication (AUTH-004) */}
      <MfaSetup mfaEnabled={profile.mfaEnabled} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar Style preference card                                     */
/* ------------------------------------------------------------------ */

function SidebarStyleCard() {
  const { sidebarStyle, setSidebarStyle } = useSidebarStore();

  const options: { value: SidebarStyle; label: string; description: string; icon: typeof PanelLeft }[] = [
    {
      value: "modern",
      label: "Dock",
      description: "Icon dock grouped by category with a slide-out sub-panel for details",
      icon: PanelLeftClose,
    },
    {
      value: "classic",
      label: "Classic",
      description: "Traditional fixed-width sidebar with all menu items always visible",
      icon: PanelLeft,
    },
    {
      value: "windows",
      label: "Modern",
      description: "A gorgeous start menu layout with quick launch grid tiles",
      icon: LayoutGrid,
    },
  ];

  return (
    <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/20">
      <CardHeader>
        <CardTitle>Sidebar Style</CardTitle>
        <CardDescription>Choose how the navigation sidebar behaves</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((opt) => {
            const selected = sidebarStyle === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSidebarStyle(opt.value)}
                className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all duration-200 cursor-pointer ${
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary hover:bg-primary/10"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/50 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2">
                  <opt.icon className={`h-5 w-5 transition-all duration-200 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium transition-colors duration-200 ${selected ? "text-primary" : ""}`}>{opt.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}