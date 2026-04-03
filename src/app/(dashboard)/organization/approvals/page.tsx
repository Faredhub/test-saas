import { getApprovalWorkflows } from "@/lib/actions/organization";
import { ApprovalsClient } from "./approvals-client";

export const metadata = { title: "Approval Workflows" };

export default async function ApprovalsPage() {
  const workflows = await getApprovalWorkflows();
  return <ApprovalsClient initialData={workflows} />;
}
