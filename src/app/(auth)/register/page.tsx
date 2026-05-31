"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative w-full max-w-[550px] min-h-[580px] flex items-center justify-center">
      
      {/* Crisp Full-Viewport Mockup Background Image */}
      <div className="fixed inset-0 w-screen h-screen pointer-events-none select-none z-0 hidden lg:block opacity-100 dark:opacity-20 animate-fade-in duration-500">
        <Image
          src="/signup_bg.jpg"
          alt="Signup Background Layout"
          fill
          sizes="100vw"
          priority
          className="w-full h-full object-cover [object-position:center_center]"
        />
      </div>

      {/* Central Glassmorphic Signup Card */}
      <Card className="w-full bg-white/95 dark:bg-zinc-900/90 rounded-[2.5rem] p-8 md:p-12 shadow-[0_50px_100px_-20px_rgba(120,130,180,0.23)] dark:shadow-none border border-white/50 dark:border-white/5 relative overflow-hidden animate-fade-in-up">
        
        {/* Soft Fluid Background Blob */}
        <div className="absolute bottom-[-15%] left-[-15%] w-72 h-44 bg-[#D2E0FB]/30 dark:bg-indigo-950/15 blur-[60px] rounded-full pointer-events-none -z-10" />

        {/* Card Title Block */}
        <div className="text-center animate-fade-in-up [animation-delay:100ms] w-full mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase">
            Finish Account Setup
          </h1>
          <div className="w-12 h-1 bg-amber-400 mx-auto mt-2 rounded-full" />
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-4 max-w-[420px] mx-auto leading-relaxed font-semibold">
            Complete your account setup by providing your proper business credentials.
          </p>
        </div>

        {/* Card Form Content */}
        <CardContent className="w-full p-0 animate-fade-in-up [animation-delay:150ms]">
          <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive w-full">
                {error}
              </div>
            )}

            {/* Row 1: Company Name */}
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Company Name
              </Label>
              <Input
                id="companyName"
                placeholder="Enter Company Name"
                value={formData.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl border-none bg-[#F4F6FC] dark:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-zinc-200 text-sm placeholder-slate-400 dark:placeholder-zinc-500"
              />
            </div>

            {/* Row 2: Full Name & Work Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter Full Name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                  autoComplete="name"
                  className="w-full h-11 px-4 rounded-xl border-none bg-[#F4F6FC] dark:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-zinc-200 text-sm placeholder-slate-400 dark:placeholder-zinc-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Work Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full h-11 px-4 rounded-xl border-none bg-[#F4F6FC] dark:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-zinc-200 text-sm placeholder-slate-400 dark:placeholder-zinc-500"
                />
              </div>
            </div>

            {/* Row 3: Password & Confirm Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    required
                    autoComplete="new-password"
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

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full h-11 pl-4 pr-11 rounded-xl border-none bg-[#F4F6FC] dark:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-zinc-200 text-sm placeholder-slate-400 dark:placeholder-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Centered Pill-Shaped Create Account Button */}
            <Button 
              type="submit" 
              className="mt-6 px-8 h-12 bg-[#4E62F7] hover:bg-[#3E52E7] text-white rounded-full font-extrabold shadow-lg shadow-indigo-100 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0 w-full max-w-[220px] mx-auto flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest text-xs transition-all duration-200" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>CREATE ACCOUNT</span>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center animate-fade-in-up [animation-delay:200ms] pt-6 pb-0">
          <p className="text-xs text-slate-400 dark:text-zinc-500 font-semibold select-none">
            Already have an account?{" "}
            <Link href="/login" className="text-[#4E62F7] font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>

      </Card>
      
    </div>
  );
}
