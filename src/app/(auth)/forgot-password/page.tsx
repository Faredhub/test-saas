"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    // Implement password reset API
    await new Promise((r) => setTimeout(r, 1000));
    setIsSent(true);
    setIsLoading(false);
  }

  return (
    <Card className="w-full max-w-[800px] bg-white/95 dark:bg-zinc-900/90 rounded-[2.5rem] p-8 md:p-12 shadow-[0_50px_100px_-20px_rgba(120,130,180,0.25)] dark:shadow-none border border-white/50 dark:border-white/5 flex flex-col items-center justify-center min-h-[580px] overflow-hidden animate-fade-in-up">
      
      {/* Top Header & Subtitle Accent */}
      <div className="text-center animate-fade-in-up [animation-delay:100ms] w-full">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase">
          Forgot Password
        </h1>
        <div className="w-12 h-1 bg-amber-400 mx-auto mt-2 rounded-full" />
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-4 max-w-[420px] mx-auto leading-relaxed font-semibold">
          {isSent 
            ? `No biggie! We've sent a secure password reset link to your email address: ${email}`
            : "No biggie! Enter your email address below, and we'll send you a link to reset your password."
          }
        </p>
      </div>

      {/* Center Flat Illustration Graphic */}
      <div className="relative w-full max-w-[280px] md:max-w-[340px] aspect-[4/3] my-6 flex items-center justify-center animate-float-slow select-none animate-fade-in-up [animation-delay:150ms]">
        <Image 
          src="/forgot_password_illustration.png" 
          alt="forgot password illustration" 
          fill
          sizes="(max-width: 768px) 280px, 340px"
          priority
          className="w-full h-full object-contain drop-shadow-[0_15px_30px_rgba(30,50,90,0.06)] dark:brightness-95"
        />
      </div>

      {/* Bottom Form Actions */}
      <CardContent className="w-full p-0 flex flex-col items-center">
        {isSent ? (
          <div className="w-full max-w-sm text-center animate-fade-in-up [animation-delay:200ms] flex flex-col items-center">
            <Link href="/login" className="w-full">
              <Button 
                className="w-full h-12 bg-[#62C05F] hover:bg-[#52B04F] text-white rounded-full font-extrabold shadow-lg shadow-green-100 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest text-xs transition-all duration-200"
              >
                <span>Back to sign in</span>
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 animate-fade-in-up [animation-delay:200ms] flex flex-col">
            <div className="space-y-1">
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-12 px-6 rounded-full border-none bg-[#F4F6FC] dark:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-950 focus:ring-2 focus:ring-[#62C05F]/20 text-slate-700 dark:text-zinc-200 text-sm placeholder-slate-400 dark:placeholder-zinc-500 text-center"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-[#62C05F] hover:bg-[#52B04F] text-white rounded-full font-extrabold shadow-lg shadow-green-100 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest text-xs transition-all duration-200" 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>RESET PASSWORD</span>
              )}
            </Button>
            
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#4E62F7] transition-all pt-2 select-none"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </form>
        )}
      </CardContent>

    </Card>
  );
}
