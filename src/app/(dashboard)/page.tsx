import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, ShoppingCart, Receipt } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const userName = session?.user?.name ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {userName}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your business today.
        </p>
      </div>

      {/* Quick Stats (HOME-002) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Active pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Deals
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">In negotiation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Invoices Due
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Pending payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹0</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Add New Lead</p>
              <p className="text-xs text-muted-foreground">Capture a new sales lead</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Create Invoice</p>
              <p className="text-xs text-muted-foreground">Generate a new invoice</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">View Reports</p>
              <p className="text-xs text-muted-foreground">Business analytics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
