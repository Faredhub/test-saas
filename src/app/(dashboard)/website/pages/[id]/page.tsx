import { notFound } from "next/navigation";
import { getPageById } from "@/lib/actions/website";
import { VisualEditor } from "./visual-editor";

export const metadata = { title: "Visual Page Editor" };

export default async function VisualEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await getPageById(id);
  if (!page) notFound();

  return (
    <VisualEditor
      pageId={page.id}
      pageTitle={page.title}
      initialContent={page.content as string}
    />
  );
}
