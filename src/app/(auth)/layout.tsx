import { RecaptchaProvider } from "@/components/recaptcha-provider";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RecaptchaProvider>
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </RecaptchaProvider>
  );
}
