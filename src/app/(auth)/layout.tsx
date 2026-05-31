import { RecaptchaProvider } from "@/components/recaptcha-provider";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RecaptchaProvider>
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950 px-4 py-8 relative overflow-hidden">
        {/* Soft fluid background blob at the bottom left of the screen, matching the mockup background style */}
        <div className="fixed bottom-[-10%] left-[-10%] w-[420px] h-[280px] bg-[#D2E0FB]/40 dark:bg-indigo-950/15 blur-[80px] rounded-full pointer-events-none z-0 select-none" />
        
        {/* Soft purple glow at the top right of the screen for modern glassmorphism */}
        <div className="fixed top-[-10%] right-[-10%] w-[380px] h-[260px] bg-purple-100/30 dark:bg-purple-950/5 blur-[80px] rounded-full pointer-events-none z-0 select-none" />

        <div className="w-full max-w-5xl flex justify-center z-10">{children}</div>
      </div>
    </RecaptchaProvider>
  );
}
