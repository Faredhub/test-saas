import { getForms } from "@/lib/actions/organization";
import { FormsClient } from "./forms-client";

export const metadata = { title: "Form Builder" };

export default async function FormsPage() {
  const forms = await getForms();
  return <FormsClient initialData={forms} />;
}
