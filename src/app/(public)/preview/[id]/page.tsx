import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPreviewPageById } from "@/lib/actions/website";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const page = await getPreviewPageById(id);
  if (!page) return { title: "Preview Not Found" };
  return {
    title: page.metaTitle || page.title || "Preview",
    description: page.metaDesc || "",
  };
}

export default async function PreviewPage({ params }: Props) {
  const { id } = await params;
  const page = await getPreviewPageById(id);

  if (!page) {
    notFound();
  }

  const htmlContent =
    typeof page.content === "object" &&
    page.content !== null &&
    "html" in (page.content as Record<string, unknown>)
      ? ((page.content as Record<string, unknown>).html as string)
      : null;

  const cssContent =
    typeof page.content === "object" &&
    page.content !== null &&
    "css" in (page.content as Record<string, unknown>)
      ? ((page.content as Record<string, unknown>).css as string)
      : null;

  if (htmlContent) {
    return (
      <>
        {cssContent && <style dangerouslySetInnerHTML={{ __html: cssContent }} />}
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </>
    );
  }

  // Fallback for non-HTML content (legacy or structured JSON)
  const contentStr =
    typeof page.content === "string"
      ? page.content
      : JSON.stringify(page.content, null, 2);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4 bg-amber-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-amber-800">
            {page.title}
          </h1>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-200 text-amber-800">
            Preview Mode
          </span>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {page.metaDesc && (
          <p className="text-muted-foreground mb-4">{page.metaDesc}</p>
        )}
        <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
          {contentStr}
        </pre>
      </main>
      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        Preview &middot; Page ID: {page.id} &middot; Powered by Knnect360
      </footer>
    </div>
  );
}
