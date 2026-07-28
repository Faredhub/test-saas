"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Mail, 
  MessageSquare, 
  Send, 
  Megaphone, 
  TrendingUp, 
  Phone 
} from "lucide-react";
import { useRecaptcha } from "@/components/recaptcha-provider";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const workspaceParam = searchParams.get("workspace")?.trim().toLowerCase() ?? "";
  const { executeRecaptcha } = useRecaptcha();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState(workspaceParam);
  const [showWorkspaceField, setShowWorkspaceField] = useState(workspaceParam !== "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceChoices, setWorkspaceChoices] = useState<{ slug: string; name: string }[] | null>(null);

  // Active Device Logout Prompt state
  const [activeDeviceSessions, setActiveDeviceSessions] = useState<{ id: string; deviceName: string; ipAddress: string; lastActive: string }[] | null>(null);

  async function finalizeSignIn(workspaceSlug: string | undefined, forceLogoutOtherDevices = false) {
    const result = await signIn("credentials", {
      email,
      password,
      workspace: workspaceSlug,
      forceLogoutOtherDevices: forceLogoutOtherDevices ? "true" : "false",
      redirect: false,
      callbackUrl,
    });
    if (result?.error) {
      if (result.error.toLowerCase().includes("workspace")) {
        setError(result.error);
        setShowWorkspaceField(true);
      } else {
        setError("Invalid email or password. Please try again.");
      }
      return false;
    }
    router.push(callbackUrl);
    router.refresh();
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Execute reCAPTCHA before login (no-op if not configured)
      await executeRecaptcha("login");

      // Skip discovery when the user has already supplied a workspace (either
      // via the ?workspace=<slug> deep-link or by typing it manually after a
      // prior collision). authorize() will validate it directly.
      if (workspace) {
        await finalizeSignIn(workspace);
        return;
      }

      // Otherwise ask the server which workspace(s) this email belongs to.
      const res = await fetch("/api/auth/discover-workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 429) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        setError(j.message || "Too many login attempts. Please try again later.");
        return;
      }
      if (!res.ok) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      const data = (await res.json()) as
        | { tenant: { slug: string; name: string } }
        | { workspaces: { slug: string; name: string }[] };

      if ("tenant" in data) {
        await finalizeSignIn(data.tenant.slug);
        return;
      }
      // 2+ workspaces — let the user pick.
      setWorkspaceChoices(data.workspaces);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function pickWorkspace(slug: string) {
    setIsLoading(true);
    setError("");
    setWorkspaceChoices(null);
    try {
      await finalizeSignIn(slug);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
    <Dialog open={workspaceChoices !== null} onOpenChange={(open) => { if (!open) setWorkspaceChoices(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your workspace</DialogTitle>
          <DialogDescription>
            This email is registered in more than one workspace. Pick the one you want to sign in to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {workspaceChoices?.map((w) => (
            <button
              key={w.slug}
              type="button"
              onClick={() => pickWorkspace(w.slug)}
              disabled={isLoading}
              className="w-full flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-left hover:bg-muted/60 disabled:opacity-60 transition-colors"
            >
              <div>
                <div className="font-medium text-sm text-foreground">{w.name}</div>
                <div className="text-xs text-muted-foreground">{w.slug}</div>
              </div>
              <span className="text-xs text-indigo-600">Sign in →</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
    <div className="w-full max-w-[940px] bg-white/95 dark:bg-zinc-900/90 rounded-[2.5rem] p-0 shadow-[0_50px_100px_-20px_rgba(120,130,180,0.25)] dark:shadow-none border border-white/50 dark:border-white/5 flex flex-col md:flex-row min-h-[580px] overflow-hidden animate-fade-in-up">
      
      {/* Left Column: Premium Form Panel (Desktop: first, Mobile: second) */}
      <div className="flex-1 w-full p-8 md:p-12 lg:p-16 order-2 md:order-1 flex flex-col justify-center">
        
        {/* Title Block */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Sign In to your Account
          </h1>
        </div>

        {error && (
          <div className="rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-6 animate-fade-in-up">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email Input Field */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-0.5">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full h-11 px-4 rounded-xl border-none bg-[#F4F6FC] dark:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-zinc-200 text-sm placeholder-slate-400 dark:placeholder-zinc-500"
            />
          </div>

          {/* Workspace Input Field (optional, shown when ?workspace= is present or after a collision error) */}
          {showWorkspaceField ? (
            <div className="space-y-1.5">
              <Label htmlFor="workspace" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Workspace
              </Label>
              <Input
                id="workspace"
                type="text"
                placeholder="e.g. knnect360"
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                autoComplete="organization"
                className="w-full h-11 px-4 rounded-xl border-none bg-[#F4F6FC] dark:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-zinc-200 text-sm placeholder-slate-400 dark:placeholder-zinc-500"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowWorkspaceField(true)}
              className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition-colors duration-150"
            >
              Sign in to a specific workspace?
            </button>
          )}

          {/* Password Input Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-slate-400 dark:text-zinc-500 hover:text-[#4E62F7] transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-11 pl-4 pr-11 rounded-xl border-none bg-[#F4F6FC] dark:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-zinc-200 text-sm placeholder-slate-400 dark:placeholder-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center space-x-2 py-1">
            <input
              type="checkbox"
              id="rememberMe"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 accent-[#4E62F7] cursor-pointer"
            />
            <label
              htmlFor="rememberMe"
              className="text-xs font-semibold text-slate-500 dark:text-zinc-400 cursor-pointer select-none"
            >
              Remember me
            </label>
          </div>

          {/* Submit Sign In Button */}
          <Button 
            type="submit" 
            className="w-full h-11 bg-[#4E62F7] hover:bg-[#3E52E7] text-white rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider text-xs transition-all duration-200" 
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span>SIGN IN</span>
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <Separator className="bg-zinc-100 dark:bg-zinc-800" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 px-3 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
            or
          </span>
        </div>

        {/* Third-Party SSO Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-10 border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-950/60 font-semibold text-xs transition-all duration-200 cursor-pointer"
            onClick={() => signIn("google", { callbackUrl })}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>

          <Button
            variant="outline"
            className="h-10 border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-950/60 font-semibold text-xs transition-all duration-200 cursor-pointer"
            onClick={() => signIn("microsoft-entra-id", { callbackUrl })}
          >
            <svg className="h-4 w-4" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Microsoft
          </Button>
        </div>

        {/* Footer Link */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
            Not registered yet?{" "}
            <Link 
              href="/register" 
              className="text-[#4E62F7] font-bold hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>

      </div>

      {/* Right Column: Premium Curved Visual Panel (Desktop: second, Mobile: first) */}
      <div className="w-full md:w-[46%] min-h-[280px] md:min-h-[580px] bg-gradient-to-br from-[#1E3EB3] via-[#121B66] to-[#0A0D36] relative overflow-hidden login-visual-clip order-1 md:order-2 flex flex-col items-center justify-center p-6 md:p-12">
        
        {/* Soft Ambient Light Glows */}
        <div className="absolute top-[-10%] left-[-15%] w-60 h-60 rounded-full bg-white/10 blur-[40px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-15%] w-60 h-60 rounded-full bg-indigo-500/20 blur-[50px] pointer-events-none" />

        {/* Constellation Network Connecting Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="50" y1="50" x2="50" y2="12" stroke="white" strokeWidth="0.3" strokeDasharray="2,2" />
          <line x1="50" y1="50" x2="15" y2="35" stroke="white" strokeWidth="0.3" strokeDasharray="2,2" />
          <line x1="50" y1="50" x2="85" y2="30" stroke="white" strokeWidth="0.3" strokeDasharray="2,2" />
          <line x1="50" y1="50" x2="16" y2="72" stroke="white" strokeWidth="0.3" strokeDasharray="2,2" />
          <line x1="50" y1="50" x2="88" y2="65" stroke="white" strokeWidth="0.3" strokeDasharray="2,2" />
          <line x1="50" y1="50" x2="50" y2="88" stroke="white" strokeWidth="0.3" strokeDasharray="2,2" />
        </svg>

        {/* Organic Tropical Leaf Silhouettes */}
        <div className="absolute bottom-[-5%] right-[-5%] w-48 h-48 text-[#0a0d36]/50 rotate-12 pointer-events-none transform select-none">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
            <path d="M10 90 Q 30 50 90 10 Q 50 30 10 90 Z" />
            <path d="M20 80 Q 50 60 70 15 Q 40 40 20 80 Z" />
          </svg>
        </div>
        <div className="absolute top-[-5%] left-[-5%] w-36 h-36 text-[#0a0d36]/40 -rotate-45 pointer-events-none transform select-none">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
            <path d="M10 90 Q 30 50 90 10 Q 50 30 10 90 Z" />
          </svg>
        </div>

        {/* Floating Constellation Orb Badges */}
        {/* Top Badge: Compass/Overview */}
        <div className="absolute top-[8%] left-[45%] md:left-[47%] w-10 h-10 rounded-full bg-[#121b66]/80 backdrop-blur-md border border-cyan-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)] animate-pulse select-none">
          <MessageSquare className="w-4 h-4 text-cyan-300" />
        </div>

        {/* Top Left Badge: Send/Paperplane */}
        <div className="absolute top-[32%] left-[10%] md:left-[12%] w-10 h-10 rounded-full bg-[#121b66]/80 backdrop-blur-md border border-sky-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.4)] select-none">
          <Send className="w-4 h-4 text-sky-300" />
        </div>

        {/* Top Right Badge: Mail */}
        <div className="absolute top-[28%] right-[10%] md:right-[12%] w-10 h-10 rounded-full bg-[#121b66]/80 backdrop-blur-md border border-amber-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.4)] animate-bounce [animation-duration:4s] select-none">
          <Mail className="w-4 h-4 text-amber-300" />
        </div>

        {/* Bottom Left Badge: Megaphone */}
        <div className="absolute bottom-[20%] left-[12%] md:left-[14%] w-10 h-10 rounded-full bg-[#121b66]/80 backdrop-blur-md border border-purple-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(192,132,252,0.4)] select-none">
          <Megaphone className="w-4 h-4 text-purple-300" />
        </div>

        {/* Bottom Right Badge: Financial Progress */}
        <div className="absolute bottom-[30%] right-[8%] md:right-[10%] w-10 h-10 rounded-full bg-[#121b66]/80 backdrop-blur-md border border-emerald-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.4)] animate-bounce [animation-duration:3s] select-none">
          <TrendingUp className="w-4 h-4 text-emerald-300" />
        </div>

        {/* Bottom Badge: Phone */}
        <div className="absolute bottom-[8%] left-[45%] md:left-[47%] w-10 h-10 rounded-full bg-[#121b66]/80 backdrop-blur-md border border-rose-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(251,113,133,0.4)] animate-pulse select-none">
          <Phone className="w-4 h-4 text-rose-300" />
        </div>

        {/* Central Floating 3D Character Illustration */}
        <div className="relative w-full max-w-[190px] md:max-w-[240px] aspect-square flex items-center justify-center animate-float-slow z-10 select-none">
          <Image 
            src="/charater.webp" 
            alt="3D developer character" 
            fill
            sizes="(max-width: 768px) 190px, 240px"
            priority
            className="w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(10,20,60,0.35)] hover:scale-[1.03] transition-transform duration-500"
          />
        </div>

      </div>

      {/* Multi-Device Logout Prompt Dialog */}
      <Dialog open={Boolean(activeDeviceSessions)} onOpenChange={(open) => !open && setActiveDeviceSessions(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-600">
              Active Sessions Detected
            </DialogTitle>
            <DialogDescription>
              A single user can login through Web App & Mobile App simultaneously. You have active sessions on other devices:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {activeDeviceSessions?.map((s) => (
              <div key={s.id} className="rounded-lg border p-3 bg-muted/20 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-foreground">{s.deviceName}</p>
                  <p className="text-muted-foreground">IP: {s.ipAddress}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{s.lastActive}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setActiveDeviceSessions(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setActiveDeviceSessions(null);
                await finalizeSignIn(workspace, true);
              }}
            >
              Logout Other Devices & Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
