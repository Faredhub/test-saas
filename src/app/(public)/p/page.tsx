import { headers } from "next/headers";
import { getPublicPage } from "@/lib/actions/website";
import { notFound } from "next/navigation";

export default async function PublicHomePage() {
  const headersList = await headers();
  const hostname = headersList.get("x-custom-domain") || "";

  if (!hostname) notFound();

  const page = await getPublicPage(hostname, "home");

  if (!page) {
    const fallback = await getPublicPage(hostname, "/");
    if (!fallback) notFound();
    return (
      <div
        dangerouslySetInnerHTML={{
          __html: `
            <style>${(fallback.content as any)?.css || ""}</style>
            ${(fallback.content as any)?.html || "<h1>Welcome</h1>"}
          `,
        }}
      />
    );
  }

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `
          <style>${(page.content as any)?.css || ""}</style>
          ${(page.content as any)?.html || "<h1>Welcome</h1>"}
        `,
      }}
    />
  );
}
