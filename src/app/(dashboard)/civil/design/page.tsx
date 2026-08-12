import { getDesignReports, getDesignTemplates } from "@/lib/actions/civil";
import { DesignClient } from "./design-client";

export const metadata = { title: "Design Report" };

export default async function DesignPage() {
  const [reports, templates] = await Promise.all([
    getDesignReports(),
    getDesignTemplates(),
  ]);
  return <DesignClient initialReports={reports} templates={templates} />;
}
