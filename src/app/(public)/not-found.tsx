import { headers } from "next/headers";
import { getThemeForDomain } from "@/lib/actions/website";

export default async function PublicNotFound() {
  const headersList = await headers();
  const hostname = headersList.get("x-custom-domain") || "";
  const result = hostname ? await getThemeForDomain(hostname) : null;

  const primaryColor = result?.theme?.primaryColor || "#4F46E5";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-6xl font-bold" style={{ color: primaryColor }}>
        404
      </h1>
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground text-center max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <a
        href="/"
        className="inline-flex items-center px-4 py-2 rounded-lg text-white font-medium text-sm"
        style={{ backgroundColor: primaryColor }}
      >
        Go to Home
      </a>
    </div>
  );
}
