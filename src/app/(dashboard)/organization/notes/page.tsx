import { getNotes } from "@/lib/actions/organization";
import { NotesClient } from "./notes-client";

export const metadata = { title: "Notes & To-Do" };

export default async function NotesPage() {
  const notes = await getNotes();
  return <NotesClient initialData={notes} />;
}
