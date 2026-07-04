import { redirect } from "next/navigation";

export default function ProductsPage() {
  redirect("/inventory/stock?tab=inventory");
}
