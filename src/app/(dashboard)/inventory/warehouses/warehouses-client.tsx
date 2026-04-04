"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Pencil, Warehouse } from "lucide-react";
import { createWarehouse, updateWarehouse, getWarehouses } from "@/lib/actions/inventory";
import { toast } from "sonner";

type WarehouseData = Awaited<ReturnType<typeof getWarehouses>>;

type Props = {
  initialData: WarehouseData;
};

export function WarehousesClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refreshData() {
    startTransition(async () => {
      try {
        const result = await getWarehouses();
        setData(result);
      } catch {
        // ignore
      }
    });
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (editId) {
          await updateWarehouse(editId, {
            name: formData.get("name") as string,
            address: (formData.get("address") as string) || undefined,
            city: (formData.get("city") as string) || undefined,
            state: (formData.get("state") as string) || undefined,
          });
          toast.success("Warehouse updated");
        } else {
          await createWarehouse({
            name: formData.get("name") as string,
            code: formData.get("code") as string,
            address: (formData.get("address") as string) || undefined,
            city: (formData.get("city") as string) || undefined,
            state: (formData.get("state") as string) || undefined,
          });
          toast.success("Warehouse created");
        }
        setIsOpen(false);
        setEditId(null);
        refreshData();
      } catch {
        toast.error(editId ? "Failed to update warehouse" : "Failed to create warehouse");
      }
    });
  }

  function handleToggleActive(wh: WarehouseData[0]) {
    startTransition(async () => {
      try {
        await updateWarehouse(wh.id, { isActive: !wh.isActive });
        toast.success(wh.isActive ? "Warehouse deactivated" : "Warehouse activated");
        refreshData();
      } catch {
        toast.error("Failed to update warehouse");
      }
    });
  }

  function openEdit(wh: WarehouseData[0]) {
    setEditId(wh.id);
    setIsOpen(true);
  }

  const editWarehouse = editId ? data.find((w) => w.id === editId) : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Warehouses</h1>
          <p className="text-muted-foreground mt-1">Manage warehouse locations and storage</p>
        </div>
        <Button onClick={() => { setEditId(null); setIsOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Warehouse
        </Button>
      </div>

      {/* Warehouse Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((wh) => (
          <Card key={wh.id} className={!wh.isActive ? "opacity-60" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Warehouse className="h-8 w-8 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-lg">{wh.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{wh.code}</p>
                    {wh.address && <p className="text-sm text-muted-foreground mt-1">{wh.address}</p>}
                    {(wh.city || wh.state) && (
                      <p className="text-sm text-muted-foreground">
                        {[wh.city, wh.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={wh.isActive ? "bg-green-100 text-green-800" : ""}
                  variant={wh.isActive ? "secondary" : "secondary"}>
                  {wh.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span>{wh._count.stock} products</span>
                <span>{wh._count.movements} movements</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(wh)}>
                  <Pencil className="mr-1 h-3 w-3" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(wh)}
                  disabled={isPending}
                >
                  {wh.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {data.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No warehouses found. Add your first warehouse to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required defaultValue={editWarehouse?.name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input id="code" name="code" required defaultValue={editWarehouse?.code ?? ""} readOnly={!!editId} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={editWarehouse?.address ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={editWarehouse?.city ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" defaultValue={editWarehouse?.state ?? ""} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
