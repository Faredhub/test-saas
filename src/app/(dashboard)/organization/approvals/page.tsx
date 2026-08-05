import { getApprovalWorkflows, getDesignations } from "@/lib/actions/organization";
import { getEmployees } from "@/lib/actions/hrm";
import { ApprovalsClient } from "./approvals-client";

export const metadata = { title: "Approval Workflows" };

export default async function ApprovalsPage() {
  const [workflows, employeesResult, designationsResult] = await Promise.all([
    getApprovalWorkflows(),
    getEmployees({ pageSize: 100 }).catch(() => ({ data: [] as any[] })),
    getDesignations().catch(() => []),
  ]);

  return (
    <ApprovalsClient
      initialData={workflows}
      employees={employeesResult.data}
      designations={designationsResult}
    />
  );
}
