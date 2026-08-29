import { redirect } from "next/navigation";

export default function DealsPage() {
  redirect("/sales/leads-deals?tab=deals");
}
