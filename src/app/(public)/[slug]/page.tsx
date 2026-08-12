import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { getPublicPage } from "@/lib/actions/website";

export default async function PublicSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const headersList = await headers();
  const hostname = headersList.get("x-custom-domain");

  if (!hostname) {
    redirect("/login");
  }

  const page = await getPublicPage(hostname, slug);
  if (!page) {
    notFound();
  }

  const htmlContent =
    typeof page.content === "object" &&
    page.content !== null &&
    "html" in (page.content as Record<string, unknown>)
      ? (page.content as Record<string, unknown>).html as string
      : null;

  if (htmlContent) {
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4">
        <h1 className="text-2xl font-bold" style={{ color: "var(--theme-primary, #4F46E5)" }}>
          {page.title}
        </h1>
      </header>
      <main className="flex-1 p-6">
        {page.metaDesc && (
          <p className="text-muted-foreground mb-4">{page.metaDesc}</p>
        )}
        <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
          {JSON.stringify(page.content, null, 2)}
        </pre>
      </main>
      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        Powered by Knnect360
      </footer>
    </div>
  );
}
