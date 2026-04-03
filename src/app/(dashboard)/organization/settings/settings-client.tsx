"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Building, FileText, CreditCard } from "lucide-react";
import { updateOrgSettings } from "@/lib/actions/organization";
import { toast } from "sonner";

type OrgSettings = Awaited<ReturnType<typeof import("@/lib/actions/organization").getOrgSettings>>;

type SettingsClientProps = {
  initialData: OrgSettings;
};

export function SettingsClient({ initialData }: SettingsClientProps) {
  const [isPending, startTransition] = useTransition();

  async function handleCompanyInfo(formData: FormData) {
    startTransition(async () => {
      try {
        await updateOrgSettings({
          name: formData.get("name") as string,
          email: formData.get("email") as string || undefined,
          phone: formData.get("phone") as string || undefined,
          website: formData.get("website") as string || undefined,
          address: formData.get("address") as string || undefined,
          city: formData.get("city") as string || undefined,
          state: formData.get("state") as string || undefined,
          pincode: formData.get("pincode") as string || undefined,
        });
        toast.success("Company info updated");
      } catch {
        toast.error("Failed to update company info");
      }
    });
  }

  async function handleTaxInfo(formData: FormData) {
    startTransition(async () => {
      try {
        await updateOrgSettings({
          pan: formData.get("pan") as string || undefined,
          gst: formData.get("gst") as string || undefined,
          cin: formData.get("cin") as string || undefined,
        });
        toast.success("Tax info updated");
      } catch {
        toast.error("Failed to update tax info");
      }
    });
  }

  if (!initialData) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Organization not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your company information and compliance details</p>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic details about your organization</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={handleCompanyInfo} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input id="name" name="name" defaultValue={initialData.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={initialData.email ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={initialData.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" defaultValue={initialData.website ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={initialData.address ?? ""} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={initialData.city ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" defaultValue={initialData.state ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" name="pincode" defaultValue={initialData.pincode ?? ""} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Company Info
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tax & Compliance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Tax & Compliance</CardTitle>
              <CardDescription>Tax registration and compliance details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={handleTaxInfo} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input id="pan" name="pan" defaultValue={initialData.pan ?? ""} placeholder="AAAAA0000A" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst">GST Number</Label>
                <Input id="gst" name="gst" defaultValue={initialData.gst ?? ""} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cin">CIN</Label>
                <Input id="cin" name="cin" defaultValue={initialData.cin ?? ""} placeholder="U00000AA0000AAA000000" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Tax Info
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Your current plan and usage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-lg font-semibold capitalize">{initialData.plan?.toLowerCase() ?? "Free"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <p className="text-lg font-semibold">{initialData.storageUsed ?? 0} MB</p>
              <div className="mt-2 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(((initialData.storageUsed ?? 0) / (initialData.storageLimit ?? 1000)) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {initialData.storageUsed ?? 0} / {initialData.storageLimit ?? 1000} MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
