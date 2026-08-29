import { redirect } from "next/navigation";

export default function LeadsPage() {
  redirect("/sales/leads-deals?tab=leads");
}
