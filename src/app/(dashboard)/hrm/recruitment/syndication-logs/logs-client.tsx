"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, FileText } from "lucide-react";

type Props = {
  logs: any[];
};

export function LogsClient({ logs }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution & Sync Audit Logs</CardTitle>
        <CardDescription>Sanitized API interaction history with partner portals</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No syndication logs recorded yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Portal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Error / Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.job?.title || "Job Posting"}</TableCell>
                  <TableCell>{log.portal?.name || "Portal"}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "PUBLISHED" ? "default" : "destructive"}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.externalJobId || "N/A"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="max-w-xs text-xs truncate">
                    {log.errorMessage ? (
                      <span className="text-red-600 dark:text-red-400">{log.errorMessage}</span>
                    ) : log.responseData ? (
                      <span className="text-green-600 dark:text-green-400">
                        {JSON.stringify(log.responseData)}
                      </span>
                    ) : (
                      "Success"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
