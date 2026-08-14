"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/rbac";
import type { StockMovementType, MfgStatus, DeliveryStatus } from "@/generated/prisma/enums";

// ============================================================================
// Helpers
// ============================================================================

async function getSessionOrThrow() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  return { userId: user.id as string, tenantId: user.tenantId as string };
}

// ============================================================================
// PRODUCTS (SCM-A-003)
// ============================================================================

export async function getProducts(filters?: {
  search?: string;
  category?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { sku: { contains: filters.search, mode: "insensitive" as const } },
            { barcode: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        warehouseStock: {
          include: { warehouse: { select: { id: true, name: true, code: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  const plainData = data.map((item) => ({
    ...item,
    costPrice: item.costPrice ? Number(item.costPrice) : 0,
    sellingPrice: item.sellingPrice ? Number(item.sellingPrice) : 0,
    taxRate: item.taxRate ? Number(item.taxRate) : 0,
  }));

  return { data: plainData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getProduct(id: string) {
  const { tenantId } = await getSessionOrThrow();
  return prisma.product.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      warehouseStock: {
        include: { warehouse: { select: { id: true, name: true, code: true } } },
      },
      stockMovements: {
        orderBy: { date: "desc" },
        take: 20,
        include: { warehouse: { select: { name: true } } },
      },
    },
  });
}

export async function createProduct(data: {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  hsnCode?: string;
  costPrice?: number;
  sellingPrice?: number;
  taxRate?: number;
  barcode?: string;
  minStock?: number;
  maxStock?: number;
  imageUrl?: string;
}) {
  await requirePermission({ module: "inventory", action: "create", resource: "stock" });
  const { userId, tenantId } = await getSessionOrThrow();

  const product = await prisma.product.create({
    data: {
      tenantId,
      sku: data.sku,
      name: data.name,
      description: data.description,
      category: data.category,
      unit: data.unit ?? "PCS",
      hsnCode: data.hsnCode,
      costPrice: data.costPrice ?? 0,
      sellingPrice: data.sellingPrice ?? 0,
      taxRate: data.taxRate ?? 0,
      barcode: data.barcode,
      minStock: data.minStock ?? 0,
      maxStock: data.maxStock,
      imageUrl: data.imageUrl,
    },
  });

  await logAudit({ tenantId, userId, action: "product.create", entity: "Product", entityId: product.id });
  revalidatePath("/inventory/stock");
  return product;
}

export async function updateProduct(id: string, data: {
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  hsnCode?: string;
  costPrice?: number;
  sellingPrice?: number;
  taxRate?: number;
  barcode?: string;
  minStock?: number;
  maxStock?: number;
  isActive?: boolean;
  imageUrl?: string;
}) {
  await requirePermission({ module: "inventory", action: "update", resource: "stock" });
  const { userId, tenantId } = await getSessionOrThrow();

  const product = await prisma.product.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data,
  });

  await logAudit({ tenantId, userId, action: "product.update", entity: "Product", entityId: id });
  revalidatePath("/inventory/stock");
  return product;
}

export async function deleteProduct(id: string) {
  await requirePermission({ module: "inventory", action: "delete", resource: "stock" });
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.product.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({ tenantId, userId, action: "product.delete", entity: "Product", entityId: id });
  revalidatePath("/inventory/stock");
}

export async function getProductCategories() {
  const { tenantId } = await getSessionOrThrow();
  const products = await prisma.product.findMany({
    where: { ...tenantScope(tenantId), category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  return products.map((p) => p.category).filter(Boolean) as string[];
}

// ============================================================================
// WAREHOUSES (SCM-A-002)
// ============================================================================

export async function getWarehouses() {
  const { tenantId } = await getSessionOrThrow();
  return prisma.warehouse.findMany({
    where: tenantScope(tenantId),
    include: {
      _count: { select: { stock: true, movements: true } },
      manager: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      branch: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      stock: {
        include: {
          product: { select: { id: true, name: true, sku: true } }
        }
      }
    },
    orderBy: { name: "asc" },
  });
}

export async function createWarehouse(data: {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  managerId?: string;
  contactPhone?: string;
  contactEmail?: string;
  branchId?: string;
  departmentId?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const warehouse = await prisma.warehouse.create({
    data: {
      tenantId,
      name: data.name,
      code: data.code,
      address: data.address,
      city: data.city,
      state: data.state,
      managerId: data.managerId || null,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      branchId: data.branchId || null,
      departmentId: data.departmentId || null,
    },
  });

  await logAudit({ tenantId, userId, action: "warehouse.create", entity: "Warehouse", entityId: warehouse.id });
  revalidatePath("/inventory/warehouses");
  return warehouse;
}

export async function updateWarehouse(id: string, data: {
  name?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  isActive?: boolean;
  managerId?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.warehouse.update({
    where: { id },
    data,
  });

  await logAudit({ tenantId, userId, action: "warehouse.update", entity: "Warehouse", entityId: id });
  revalidatePath("/inventory/warehouses");
}

export async function deleteWarehouse(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.stockMovement.updateMany({
    where: { warehouseId: id, tenantId },
    data: { warehouseId: null },
  });

  await prisma.warehouse.delete({
    where: { id },
  });

  await logAudit({ tenantId, userId, action: "warehouse.delete", entity: "Warehouse", entityId: id });
  revalidatePath("/inventory/warehouses");
}


// ============================================================================
// STOCK (SCM-A-001-002)
// ============================================================================

export async function getWarehouseStock(warehouseId?: string) {
  const { tenantId } = await getSessionOrThrow();

  const stock = await prisma.warehouseStock.findMany({
    where: {
      ...tenantScope(tenantId),
      ...(warehouseId ? { warehouseId } : {}),
    },
    include: {
      product: { select: { id: true, sku: true, name: true, category: true, unit: true, minStock: true, costPrice: true } },
      warehouse: { select: { id: true, name: true, code: true } },
    },
    orderBy: { product: { name: "asc" } },
  });

  return stock.map((item) => ({
    ...item,
    product: {
      ...item.product,
      costPrice: item.product.costPrice ? Number(item.product.costPrice) : 0,
    },
  }));
}

export async function recordStockMovement(data: {
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number;
  reference?: string;
  notes?: string;
  targetWarehouseId?: string; // for TRANSFER type
}) {
  await requirePermission({ module: "inventory", action: "create", resource: "stock" });
  const { userId, tenantId } = await getSessionOrThrow();

  if (data.quantity <= 0) throw new Error("Quantity must be positive");

  // Create the stock movement record
  const movement = await prisma.stockMovement.create({
    data: {
      tenantId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      type: data.type,
      quantity: data.quantity,
      reference: data.reference,
      notes: data.notes,
      createdById: userId,
    },
  });

  // Update warehouse stock based on movement type
  if (data.type === "IN" || data.type === "RETURN") {
    await prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId: data.warehouseId, productId: data.productId } },
      create: { tenantId, warehouseId: data.warehouseId, productId: data.productId, quantity: data.quantity },
      update: { quantity: { increment: data.quantity } },
    });
  } else if (data.type === "OUT") {
    await prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId: data.warehouseId, productId: data.productId } },
      create: { tenantId, warehouseId: data.warehouseId, productId: data.productId, quantity: 0 },
      update: { quantity: { decrement: data.quantity } },
    });
  } else if (data.type === "ADJUSTMENT") {
    // For adjustment, quantity can be the new absolute value
    await prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId: data.warehouseId, productId: data.productId } },
      create: { tenantId, warehouseId: data.warehouseId, productId: data.productId, quantity: data.quantity },
      update: { quantity: data.quantity },
    });
  } else if (data.type === "TRANSFER" && data.targetWarehouseId) {
    // Decrement source
    await prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId: data.warehouseId, productId: data.productId } },
      create: { tenantId, warehouseId: data.warehouseId, productId: data.productId, quantity: 0 },
      update: { quantity: { decrement: data.quantity } },
    });
    // Increment target
    await prisma.warehouseStock.upsert({
      where: { warehouseId_productId: { warehouseId: data.targetWarehouseId, productId: data.productId } },
      create: { tenantId, warehouseId: data.targetWarehouseId, productId: data.productId, quantity: data.quantity },
      update: { quantity: { increment: data.quantity } },
    });
    // Create a second movement for the target
    await prisma.stockMovement.create({
      data: {
        tenantId,
        productId: data.productId,
        warehouseId: data.targetWarehouseId,
        type: "IN",
        quantity: data.quantity,
        reference: `Transfer from ${data.warehouseId}`,
        notes: data.notes,
        createdById: userId,
      },
    });
  }

  await logAudit({
    tenantId, userId,
    action: `stock.${data.type.toLowerCase()}`,
    entity: "StockMovement",
    entityId: movement.id,
    metadata: { productId: data.productId, warehouseId: data.warehouseId, quantity: data.quantity },
  });
  revalidatePath("/inventory/stock");
  revalidatePath("/inventory");
  return movement;
}

export async function getStockMovements(filters?: {
  productId?: string;
  warehouseId?: string;
  type?: StockMovementType;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.productId ? { productId: filters.productId } : {}),
    ...(filters?.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters?.type ? { type: filters.type } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true, code: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getLowStockAlerts() {
  const { tenantId } = await getSessionOrThrow();

  // Get all products with their total stock across warehouses
  const products = await prisma.product.findMany({
    where: { ...tenantScope(tenantId), isActive: true, minStock: { gt: 0 } },
    include: {
      warehouseStock: {
        select: { quantity: true, warehouse: { select: { name: true } } },
      },
    },
  });

  return products
    .map((p) => {
      const totalStock = p.warehouseStock.reduce((sum, ws) => sum + ws.quantity, 0);
      return {
        ...p,
        costPrice: p.costPrice ? Number(p.costPrice) : 0,
        sellingPrice: p.sellingPrice ? Number(p.sellingPrice) : 0,
        taxRate: p.taxRate ? Number(p.taxRate) : 0,
        totalStock,
      };
    })
    .filter((p) => p.totalStock < p.minStock)
    .sort((a, b) => (a.totalStock / a.minStock) - (b.totalStock / b.minStock));
}

export async function getInventoryValuation() {
  const { tenantId } = await getSessionOrThrow();

  const stock = await prisma.warehouseStock.findMany({
    where: tenantScope(tenantId),
    include: {
      product: { select: { name: true, sku: true, costPrice: true, sellingPrice: true, category: true } },
      warehouse: { select: { name: true } },
    },
  });

  let totalCostValue = 0;
  let totalRetailValue = 0;
  let totalItems = 0;

  const items = stock.map((s) => {
    const costPrice = Number(s.product.costPrice);
    const sellingPrice = Number(s.product.sellingPrice);
    const costValue = costPrice * s.quantity;
    const retailValue = sellingPrice * s.quantity;
    totalCostValue += costValue;
    totalRetailValue += retailValue;
    totalItems += s.quantity;
    return {
      ...s,
      costValue,
      retailValue,
    };
  });

  return { items, totalCostValue, totalRetailValue, totalItems };
}

// ============================================================================
// MANUFACTURING (SCM-B)
// ============================================================================

export async function getManufacturingOrders(filters?: {
  status?: MfgStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
          OR: [
            { orderNo: { contains: filters.search, mode: "insensitive" as const } },
            { productName: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.manufacturingOrder.findMany({
      where,
      include: { bomItems: { include: { product: { select: { name: true, sku: true } } } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.manufacturingOrder.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createManufacturingOrder(data: {
  orderNo: string;
  productName: string;
  productId?: string;
  quantity: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const order = await prisma.manufacturingOrder.create({
    data: {
      tenantId,
      orderNo: data.orderNo,
      productId: data.productId || null,
      productName: data.productName,
      quantity: data.quantity,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes,
      createdById: userId,
    },
  });

  // Automatically register product in Product catalog if not already present
  if (data.productName && data.productName.trim()) {
    const existingProduct = await prisma.product.findFirst({
      where: { name: { equals: data.productName.trim(), mode: "insensitive" }, ...tenantScope(tenantId) },
    });

    if (!existingProduct) {
      const skuClean = data.productName.trim().toUpperCase().replace(/\s+/g, "-");
      const sku = `MFG-${skuClean}-${Date.now().toString().slice(-4)}`;
      try {
        await prisma.product.create({
          data: {
            tenantId,
            sku,
            name: data.productName.trim(),
            category: "Manufacturing",
            sellingPrice: 0,
            costPrice: 0,
            minStock: 0,
            isActive: true,
          },
        });
      } catch (_e) {
        // Ignore duplicate SKU if race condition
      }
    }
  }

  await logAudit({ tenantId, userId, action: "mfg_order.create", entity: "ManufacturingOrder", entityId: order.id });
  revalidatePath("/inventory/manufacturing");
  revalidatePath("/inventory/deliveries");
  revalidatePath("/inventory/stock");
  revalidatePath("/website/store");
  return order;
}

export async function updateManufacturingOrder(id: string, data: {
  productName?: string;
  productId?: string;
  quantity?: number;
  completedQty?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.manufacturingOrder.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.productName !== undefined ? { productName: data.productName } : {}),
      ...(data.productId !== undefined ? { productId: data.productId || null } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.completedQty !== undefined ? { completedQty: data.completedQty } : {}),
      ...(data.startDate !== undefined ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate !== undefined ? { endDate: new Date(data.endDate) } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });

  await logAudit({ tenantId, userId, action: "mfg_order.update", entity: "ManufacturingOrder", entityId: id });
  revalidatePath("/inventory/manufacturing");
}

export async function updateMfgOrderStatus(id: string, status: MfgStatus) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.manufacturingOrder.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: { status },
  });

  await logAudit({
    tenantId, userId,
    action: "mfg_order.status_change",
    entity: "ManufacturingOrder",
    entityId: id,
    metadata: { newStatus: status },
  });
  revalidatePath("/inventory/manufacturing");
}

export async function deleteManufacturingOrder(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.manufacturingOrder.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });
  await logAudit({ tenantId, userId, action: "mfg_order.delete", entity: "ManufacturingOrder", entityId: id });
  revalidatePath("/inventory/manufacturing");
  revalidatePath("/website/store");
}

export async function addBOMItem(orderId: string, data: {
  productId?: string;
  itemName: string;
  quantity: number;
  unit?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Verify the order belongs to this tenant
  const order = await prisma.manufacturingOrder.findFirst({
    where: { id: orderId, ...tenantScope(tenantId) },
  });
  if (!order) throw new Error("Manufacturing order not found");

  const item = await prisma.bOMItem.create({
    data: {
      orderId,
      productId: data.productId || null,
      itemName: data.itemName,
      quantity: data.quantity,
      unit: data.unit ?? "PCS",
      notes: data.notes,
    },
  });

  await logAudit({ tenantId, userId, action: "bom_item.create", entity: "BOMItem", entityId: item.id });
  revalidatePath("/inventory/manufacturing");
  return item;
}

export async function removeBOMItem(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  // Verify ownership through the order
  const item = await prisma.bOMItem.findUnique({
    where: { id },
    include: { order: { select: { tenantId: true } } },
  });
  if (!item || item.order.tenantId !== tenantId) throw new Error("BOM item not found");

  await prisma.bOMItem.delete({ where: { id } });

  await logAudit({ tenantId, userId, action: "bom_item.delete", entity: "BOMItem", entityId: id });
  revalidatePath("/inventory/manufacturing");
}

// ============================================================================
// ASSETS (SCM-D)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeAsset(asset: any) {
  if (!asset) return asset;
  return {
    ...asset,
    purchaseCost: asset.purchaseCost ? Number(asset.purchaseCost) : null,
    currentValue: asset.currentValue ? Number(asset.currentValue) : null,
  };
}

export async function getAssets(filters?: {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { assetTag: { contains: filters.search, mode: "insensitive" as const } },
            { serialNumber: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: { _count: { select: { maintenanceRequests: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
  ]);

  return { data: data.map(serializeAsset), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createAsset(data: {
  assetTag: string;
  name: string;
  category?: string;
  location?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  warrantyExpiry?: string;
  assignedTo?: string;
  assignedToId?: string;
  serialNumber?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const asset = await prisma.asset.create({
    data: {
      tenantId,
      assetTag: data.assetTag,
      name: data.name,
      category: data.category,
      location: data.location,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchaseCost: data.purchaseCost,
      currentValue: data.currentValue,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
      assignedTo: data.assignedTo,
      assignedToId: data.assignedToId || null,
      serialNumber: data.serialNumber,
      notes: data.notes,
    },
  });

  await logAudit({ tenantId, userId, action: "asset.create", entity: "Asset", entityId: asset.id });
  revalidatePath("/inventory/assets");
  return asset;
}

export async function updateAsset(id: string, data: {
  name?: string;
  category?: string;
  location?: string;
  status?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  warrantyExpiry?: string;
  assignedTo?: string;
  assignedToId?: string;
  serialNumber?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.asset.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.purchaseDate !== undefined ? { purchaseDate: new Date(data.purchaseDate) } : {}),
      ...(data.purchaseCost !== undefined ? { purchaseCost: data.purchaseCost } : {}),
      ...(data.currentValue !== undefined ? { currentValue: data.currentValue } : {}),
      ...(data.warrantyExpiry !== undefined ? { warrantyExpiry: new Date(data.warrantyExpiry) } : {}),
      ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
      ...(data.assignedToId !== undefined ? { assignedToId: data.assignedToId || null } : {}),
      ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });

  await logAudit({ tenantId, userId, action: "asset.update", entity: "Asset", entityId: id });
  revalidatePath("/inventory/assets");
}

export async function deleteAsset(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.asset.deleteMany({
    where: { id, tenantId },
  });
  await logAudit({ tenantId, userId, action: "asset.delete", entity: "Asset", entityId: id });
  revalidatePath("/inventory/assets");
}

// ============================================================================
// MAINTENANCE REQUESTS (SCM-D)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeMaintenanceRequest(req: any) {
  if (!req) return req;
  return {
    ...req,
    cost: req.cost ? Number(req.cost) : null,
  };
}

export async function getMaintenanceRequests(filters?: {
  assetId?: string;
  status?: string;
  priority?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.assetId ? { assetId: filters.assetId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.priority ? { priority: filters.priority } : {}),
    ...(filters?.type ? { type: filters.type } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.maintenanceRequest.findMany({
      where,
      include: { asset: { select: { id: true, name: true, assetTag: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.maintenanceRequest.count({ where }),
  ]);

  return { data: data.map(serializeMaintenanceRequest), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createMaintenanceRequest(data: {
  assetId?: string;
  title: string;
  description?: string;
  priority?: string;
  type?: string;
  scheduledDate?: string;
  assignedTo?: string;
  assignedToId?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const request = await prisma.maintenanceRequest.create({
    data: {
      tenantId,
      assetId: data.assetId || null,
      title: data.title,
      description: data.description,
      priority: data.priority ?? "MEDIUM",
      type: data.type ?? "CORRECTIVE",
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      assignedTo: data.assignedTo,
      assignedToId: data.assignedToId || null,
      reportedById: userId,
    },
  });

  await logAudit({ tenantId, userId, action: "maintenance.create", entity: "MaintenanceRequest", entityId: request.id });
  revalidatePath("/inventory/assets");
  return request;
}

export async function createMaintenanceRequestWithAssetTag(data: {
  assetTag?: string;
  title: string;
  description?: string;
  priority?: string;
  type?: string;
  scheduledDate?: string;
  assignedTo?: string;
  assignedToId?: string;
}) {
  const { tenantId } = await getSessionOrThrow();
  let assetId: string | undefined = undefined;

  if (data.assetTag) {
    const asset = await prisma.asset.findFirst({
      where: {
        assetTag: data.assetTag,
        ...tenantScope(tenantId),
      },
    });
    if (asset) {
      assetId = asset.id;
    }
  }

  return createMaintenanceRequest({
    assetId,
    title: data.title,
    description: data.description,
    priority: data.priority,
    type: data.type,
    scheduledDate: data.scheduledDate,
    assignedTo: data.assignedTo,
    assignedToId: data.assignedToId,
  });
}


export async function updateMaintenanceRequest(id: string, data: {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  type?: string;
  scheduledDate?: string;
  completedDate?: string;
  cost?: number;
  assignedTo?: string;
  assignedToId?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.maintenanceRequest.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.scheduledDate !== undefined ? { scheduledDate: new Date(data.scheduledDate) } : {}),
      ...(data.completedDate !== undefined ? { completedDate: new Date(data.completedDate) } : {}),
      ...(data.cost !== undefined ? { cost: data.cost } : {}),
      ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
      ...(data.assignedToId !== undefined ? { assignedToId: data.assignedToId || null } : {}),
    },
  });

  await logAudit({ tenantId, userId, action: "maintenance.update", entity: "MaintenanceRequest", entityId: id });
  revalidatePath("/inventory/assets");
}

export async function deleteMaintenanceRequest(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.maintenanceRequest.deleteMany({
    where: { id, tenantId },
  });
  await logAudit({ tenantId, userId, action: "maintenance.delete", entity: "MaintenanceRequest", entityId: id });
  revalidatePath("/inventory/assets");
}

// ============================================================================
// QUALITY CONTROL (SCM-E)
// ============================================================================

export async function getQualityChecks(filters?: {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
          OR: [
            { checkNo: { contains: filters.search, mode: "insensitive" as const } },
            { productName: { contains: filters.search, mode: "insensitive" as const } },
            { reference: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.qualityCheck.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.qualityCheck.count({ where }),
  ]);

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createQualityCheck(data: {
  checkNo: string;
  type?: string;
  reference?: string;
  productName?: string;
  productId?: string;
  inspector?: string;
  inspectorId?: string;
  notes?: string;
  defects?: Array<{ description: string; severity: string; action: string }>;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const check = await prisma.qualityCheck.create({
    data: {
      tenantId,
      checkNo: data.checkNo,
      type: data.type ?? "INCOMING",
      reference: data.reference,
      productName: data.productName,
      productId: data.productId || null,
      inspector: data.inspector,
      inspectorId: data.inspectorId || null,
      notes: data.notes,
      defects: data.defects ? JSON.parse(JSON.stringify(data.defects)) : undefined,
      createdById: userId,
    },
  });

  await logAudit({ tenantId, userId, action: "quality_check.create", entity: "QualityCheck", entityId: check.id });
  revalidatePath("/inventory/quality");
  return check;
}

export async function updateQualityCheck(id: string, data: {
  status?: string;
  inspector?: string;
  inspectorId?: string;
  notes?: string;
  checkedAt?: string;
  defects?: Array<{ description: string; severity: string; action: string }>;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.qualityCheck.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.inspector !== undefined ? { inspector: data.inspector } : {}),
      ...(data.inspectorId !== undefined ? { inspectorId: data.inspectorId || null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.checkedAt !== undefined ? { checkedAt: new Date(data.checkedAt) } : {}),
      ...(data.defects !== undefined ? { defects: JSON.parse(JSON.stringify(data.defects)) } : {}),
    },
  });

  await logAudit({ tenantId, userId, action: "quality_check.update", entity: "QualityCheck", entityId: id });
  revalidatePath("/inventory/quality");
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export async function getInventoryStats() {
  const { tenantId } = await getSessionOrThrow();

  const [productCount, warehouseCount, lowStockAlerts, valuation, vendorCount] = await Promise.all([
    prisma.product.count({ where: { ...tenantScope(tenantId), isActive: true } }),
    prisma.warehouse.count({ where: { ...tenantScope(tenantId), isActive: true } }),
    getLowStockAlerts().then((a) => a.length).catch(() => 0),
    getInventoryValuation().then((v) => v.totalCostValue).catch(() => 0),
    prisma.vendor.count({ where: { ...tenantScope(tenantId), isActive: true } }),
  ]);

  return { productCount, warehouseCount, lowStockAlerts, stockValue: valuation, vendorCount };
}

// ============================================================================
// VENDORS MANAGEMENT (SCM-F-001-006)
// ============================================================================

function toNum(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "object" && val !== null && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val);
}

export async function getVendors(filters?: {
  search?: string;
  category?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const { tenantId } = await getSessionOrThrow();
  const page = filters?.page ?? 1;
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 50, 1), 100);

  const where = {
    ...tenantScope(tenantId),
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    ...(filters?.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { code: { contains: filters.search, mode: "insensitive" as const } },
            { email: { contains: filters.search, mode: "insensitive" as const } },
            { phone: { contains: filters.search, mode: "insensitive" as const } },
            { gstNo: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      include: {
        _count: {
          select: { products: true, purchaseOrders: true, vendorBills: true },
        },
        vendorBills: {
          select: { total: true, paidAmount: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vendor.count({ where }),
  ]);

  const plainData = data.map((v) => {
    const totalBilled = v.vendorBills.reduce((acc, b) => acc + toNum(b.total), 0);
    const totalPaid = v.vendorBills.reduce((acc, b) => acc + toNum(b.paidAmount), 0);
    const pendingBillsCount = v.vendorBills.filter((b) => b.status === "PENDING" || b.status === "APPROVED").length;

    return {
      ...v,
      rating: v.rating ? toNum(v.rating) : 5.0,
      totalBilled,
      totalPaid,
      pendingBillsCount,
    };
  });

  return { data: plainData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getVendor(id: string) {
  const { tenantId } = await getSessionOrThrow();
  const v = await prisma.vendor.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: {
      products: { include: { product: true }, orderBy: { createdAt: "desc" } },
      purchaseOrders: { orderBy: { createdAt: "desc" }, take: 20 },
      vendorBills: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!v) return null;

  return {
    ...v,
    rating: v.rating ? toNum(v.rating) : 5.0,
    products: v.products.map((p) => ({ ...p, price: toNum(p.price) })),
    purchaseOrders: v.purchaseOrders.map((po) => ({
      ...po,
      totalAmount: toNum(po.totalAmount),
      taxAmount: toNum(po.taxAmount),
      grandTotal: toNum(po.grandTotal),
    })),
    vendorBills: v.vendorBills.map((b) => ({
      ...b,
      amount: toNum(b.amount),
      taxAmount: toNum(b.taxAmount),
      total: toNum(b.total),
      paidAmount: toNum(b.paidAmount),
    })),
  };
}

export async function createVendor(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstNo?: string;
  panNo?: string;
  category?: string;
  paymentTerms?: string;
  rating?: number;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const count = await prisma.vendor.count({ where: tenantScope(tenantId) });
  const code = `VND-${String(count + 1).padStart(5, "0")}`;

  const vendor = await prisma.vendor.create({
    data: {
      tenantId,
      code,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || "India",
      pincode: data.pincode || null,
      gstNo: data.gstNo || null,
      panNo: data.panNo || null,
      category: data.category || "GENERAL",
      paymentTerms: data.paymentTerms || "NET30",
      rating: data.rating !== undefined ? data.rating : 5.0,
      bankName: data.bankName || null,
      accountNo: data.accountNo || null,
      ifscCode: data.ifscCode || null,
      notes: data.notes || null,
    },
  });

  await logAudit({ tenantId, userId, action: "vendor.create", entity: "Vendor", entityId: vendor.id });
  revalidatePath("/inventory/vendors");
  return { ...vendor, rating: toNum(vendor.rating) };
}

export async function updateVendor(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    gstNo: string;
    panNo: string;
    category: string;
    paymentTerms: string;
    rating: number;
    isActive: boolean;
    bankName: string;
    accountNo: string;
    ifscCode: string;
    notes: string;
  }>
) {
  const { userId, tenantId } = await getSessionOrThrow();

  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.address !== undefined ? { address: data.address || null } : {}),
      ...(data.city !== undefined ? { city: data.city || null } : {}),
      ...(data.state !== undefined ? { state: data.state || null } : {}),
      ...(data.country !== undefined ? { country: data.country || null } : {}),
      ...(data.pincode !== undefined ? { pincode: data.pincode || null } : {}),
      ...(data.gstNo !== undefined ? { gstNo: data.gstNo || null } : {}),
      ...(data.panNo !== undefined ? { panNo: data.panNo || null } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.paymentTerms ? { paymentTerms: data.paymentTerms } : {}),
      ...(data.rating !== undefined ? { rating: data.rating } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.bankName !== undefined ? { bankName: data.bankName || null } : {}),
      ...(data.accountNo !== undefined ? { accountNo: data.accountNo || null } : {}),
      ...(data.ifscCode !== undefined ? { ifscCode: data.ifscCode || null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
    },
  });

  await logAudit({ tenantId, userId, action: "vendor.update", entity: "Vendor", entityId: id });
  revalidatePath("/inventory/vendors");
  return { ...vendor, rating: toNum(vendor.rating) };
}

export async function deleteVendor(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.vendor.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({ tenantId, userId, action: "vendor.delete", entity: "Vendor", entityId: id });
  revalidatePath("/inventory/vendors");
}

export async function getVendorProducts(filters?: { vendorId?: string; search?: string }) {
  const { tenantId } = await getSessionOrThrow();
  const where = {
    ...tenantScope(tenantId),
    ...(filters?.vendorId ? { vendorId: filters.vendorId } : {}),
    ...(filters?.search
      ? {
          OR: [
            { productName: { contains: filters.search, mode: "insensitive" as const } },
            { supplierSku: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const list = await prisma.vendorProduct.findMany({
    where,
    include: {
      vendor: { select: { id: true, name: true, code: true } },
      product: { select: { id: true, name: true, sku: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return list.map((item) => ({ ...item, price: toNum(item.price) }));
}

export async function createVendorProduct(data: {
  vendorId: string;
  productId?: string;
  productName: string;
  supplierSku?: string;
  unit?: string;
  price: number;
  minOrderQty?: number;
  leadTimeDays?: number;
  isPreferred?: boolean;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const item = await prisma.vendorProduct.create({
    data: {
      tenantId,
      vendorId: data.vendorId,
      productId: data.productId || null,
      productName: data.productName,
      supplierSku: data.supplierSku || null,
      unit: data.unit || "PCS",
      price: data.price,
      minOrderQty: data.minOrderQty ?? 1,
      leadTimeDays: data.leadTimeDays ?? 3,
      isPreferred: data.isPreferred ?? false,
      notes: data.notes || null,
    },
  });

  await logAudit({ tenantId, userId, action: "vendor_product.create", entity: "VendorProduct", entityId: item.id });
  revalidatePath("/inventory/vendors");
  return { ...item, price: toNum(item.price) };
}

export async function deleteVendorProduct(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.vendorProduct.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });
  await logAudit({ tenantId, userId, action: "vendor_product.delete", entity: "VendorProduct", entityId: id });
  revalidatePath("/inventory/vendors");
}

export async function getPurchaseOrders(filters?: { vendorId?: string; status?: string; search?: string }) {
  const { tenantId } = await getSessionOrThrow();
  const where = {
    ...tenantScope(tenantId),
    ...(filters?.vendorId ? { vendorId: filters.vendorId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.search
      ? {
          OR: [
            { poNo: { contains: filters.search, mode: "insensitive" as const } },
            { vendor: { name: { contains: filters.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const list = await prisma.purchaseOrder.findMany({
    where,
    include: {
      vendor: { select: { id: true, name: true, code: true, gstNo: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return list.map((po) => ({
    ...po,
    totalAmount: toNum(po.totalAmount),
    taxAmount: toNum(po.taxAmount),
    grandTotal: toNum(po.grandTotal),
  }));
}

export async function createPurchaseOrder(data: {
  vendorId: string;
  expectedDelivery?: string;
  notes?: string;
  items: Array<{ productId?: string; productName: string; qty: number; unitPrice: number }>;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const count = await prisma.purchaseOrder.count({ where: tenantScope(tenantId) });
  const poNo = `PO-${String(count + 1).padStart(5, "0")}`;

  const totalAmount = data.items.reduce((acc, item) => acc + item.qty * item.unitPrice, 0);
  const taxAmount = totalAmount * 0.18; // 18% GST default estimate
  const grandTotal = totalAmount + taxAmount;

  const po = await prisma.purchaseOrder.create({
    data: {
      tenantId,
      poNo,
      vendorId: data.vendorId,
      status: "DRAFT",
      totalAmount,
      taxAmount,
      grandTotal,
      expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
      items: JSON.parse(JSON.stringify(data.items)),
      lineItems: {
        create: data.items.map((item) => ({
          productId: item.productId || null,
          description: item.productName,
          quantity: item.qty,
          unitPrice: item.unitPrice,
          amount: item.qty * item.unitPrice,
        })),
      },
      notes: data.notes || null,
      createdById: userId,
    },
  });

  await logAudit({ tenantId, userId, action: "purchase_order.create", entity: "PurchaseOrder", entityId: po.id });
  revalidatePath("/inventory/vendors");
  return {
    ...po,
    totalAmount: toNum(po.totalAmount),
    taxAmount: toNum(po.taxAmount),
    grandTotal: toNum(po.grandTotal),
  };
}

export async function updatePurchaseOrderStatus(id: string, status: string, qualityStatus?: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const po = await prisma.purchaseOrder.findFirst({ where: { id, ...tenantScope(tenantId) } });
  if (!po) throw new Error("Purchase order not found");

  await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status,
      ...(qualityStatus ? { qualityStatus } : {}),
      ...(status === "COMPLETED" || status === "PARTIAL_RECEIVED" ? { receivedDate: new Date() } : {}),
    },
  });

  await logAudit({ tenantId, userId, action: "purchase_order.update_status", entity: "PurchaseOrder", entityId: id });
  revalidatePath("/inventory/vendors");
}

export async function postVendorBillFromPO(poId: string, dueDate?: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, ...tenantScope(tenantId) },
    include: { vendor: true },
  });
  if (!po) throw new Error("Purchase order not found");

  const count = await prisma.vendorBill.count({ where: tenantScope(tenantId) });
  const billNo = `BILL-${String(count + 1).padStart(5, "0")}`;

  const bill = await prisma.vendorBill.create({
    data: {
      tenantId,
      billNo,
      vendorId: po.vendorId,
      vendorName: po.vendor.name,
      vendorGst: po.vendor.gstNo || null,
      description: `Vendor Bill against ${po.poNo}`,
      amount: po.totalAmount,
      taxAmount: po.taxAmount,
      total: po.grandTotal,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: `Generated from PO ${po.poNo}. 3-Way Match Verified.`,
      status: "PENDING",
    },
  });

  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { status: "BILLED" },
  });

  await logAudit({ tenantId, userId, action: "vendor_bill.create_from_po", entity: "VendorBill", entityId: bill.id });
  revalidatePath("/inventory/vendors");
  revalidatePath("/finance/bills");

  return {
    ...bill,
    amount: toNum(bill.amount),
    taxAmount: toNum(bill.taxAmount),
    total: toNum(bill.total),
    paidAmount: toNum(bill.paidAmount),
  };
}

// ============================================================================
// DELIVERIES & SHIPPING (SCM-C)
// ============================================================================

export async function getDeliveryOrders(filters?: { status?: DeliveryStatus; search?: string }) {
  try {
    const { tenantId } = await getSessionOrThrow();
    const where = {
      ...tenantScope(tenantId),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { deliveryNo: { contains: filters.search, mode: "insensitive" as const } },
              { contactName: { contains: filters.search, mode: "insensitive" as const } },
              { sourceDocument: { contains: filters.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    return await prisma.deliveryOrder.findMany({
      where,
      include: {
        items: { include: { product: true } },
      },
      orderBy: { scheduledDate: "desc" },
    });
  } catch (error) {
    console.error("Error in getDeliveryOrders:", error);
    return [];
  }
}

export async function createDeliveryOrder(data: {
  sourceDocument?: string;
  contactName: string;
  contactId?: string;
  contactPhone?: string;
  scheduledDate?: Date | string;
  notes?: string;
  items: Array<{ productId?: string; productName: string; demandQty: number }>;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  const count = await prisma.deliveryOrder.count({ where: tenantScope(tenantId) });
  const deliveryNo = `DEL-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const delivery = await prisma.deliveryOrder.create({
    data: {
      tenantId,
      deliveryNo,
      sourceDocument: data.sourceDocument || null,
      contactName: data.contactName,
      contactId: data.contactId || null,
      contactPhone: data.contactPhone || null,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
      status: "WAITING",
      notes: data.notes || null,
      createdById: userId,
      items: {
        create: data.items.map((it) => ({
          productId: it.productId || null,
          productName: it.productName,
          demandQty: it.demandQty,
          doneQty: 0,
        })),
      },
    },
    include: { items: true },
  });

  await logAudit({
    tenantId,
    userId,
    action: "create",
    entity: "DeliveryOrder",
    entityId: delivery.id,
    metadata: { description: `Created delivery order ${deliveryNo}` },
  });

  revalidatePath("/inventory/deliveries");
  revalidatePath("/website/store");
  return delivery;
}

export async function validateDeliveryOrder(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const delivery = await prisma.deliveryOrder.findFirst({
    where: { id, ...tenantScope(tenantId) },
    include: { items: true },
  });

  if (!delivery) throw new Error("Delivery order not found");
  if (delivery.status === "DONE") throw new Error("Delivery already validated");

  // Update items doneQty and record stock movements
  for (const item of delivery.items) {
    await prisma.deliveryItem.update({
      where: { id: item.id },
      data: { doneQty: item.demandQty },
    });

    if (item.productId) {
      // Record Stock Movement OUT
      await prisma.stockMovement.create({
        data: {
          tenantId,
          productId: item.productId,
          type: "OUT",
          quantity: item.demandQty,
          reference: delivery.deliveryNo,
          notes: `Delivery order confirmed for ${delivery.contactName}`,
          createdById: userId,
        },
      });
    }
  }

  const updated = await prisma.deliveryOrder.update({
    where: { id },
    data: { status: "DONE" },
    include: { items: true },
  });

  await logAudit({
    tenantId,
    userId,
    action: "validate",
    entity: "DeliveryOrder",
    entityId: id,
    metadata: { description: `Validated delivery order ${delivery.deliveryNo}` },
  });

  revalidatePath("/inventory/deliveries");
  revalidatePath("/inventory/stock");
  revalidatePath("/website/store");
  return updated;
}

// Supply Raw Materials & Receive Finished Goods for Manufacturing
export async function supplyRawMaterials(mfgOrderId: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  const mfg = await prisma.manufacturingOrder.findFirst({
    where: { id: mfgOrderId, ...tenantScope(tenantId) },
    include: { bomItems: true },
  });
  if (!mfg) throw new Error("Manufacturing order not found");

  for (const item of mfg.bomItems) {
    if (item.productId) {
      await prisma.stockMovement.create({
        data: {
          tenantId,
          productId: item.productId,
          type: "TRANSFER",
          quantity: Math.ceil(Number(item.quantity)),
          reference: mfg.orderNo,
          notes: `Raw material issued for production: ${item.itemName}`,
          createdById: userId,
        },
      });
    }
  }

  const updated = await prisma.manufacturingOrder.update({
    where: { id: mfgOrderId },
    data: { status: "IN_PROGRESS" },
  });

  revalidatePath("/inventory/manufacturing");
  revalidatePath("/inventory/stock");
  return updated;
}

export async function receiveFinishedGoods(mfgOrderId: string, completedQty?: number) {
  const { userId, tenantId } = await getSessionOrThrow();
  const mfg = await prisma.manufacturingOrder.findFirst({
    where: { id: mfgOrderId, ...tenantScope(tenantId) },
  });
  if (!mfg) throw new Error("Manufacturing order not found");

  const finalQty = completedQty ?? mfg.quantity;

  const updated = await prisma.manufacturingOrder.update({
    where: { id: mfgOrderId },
    data: {
      status: "COMPLETED",
      completedQty: finalQty,
      endDate: new Date(),
    },
  });

  revalidatePath("/inventory/manufacturing");
  revalidatePath("/inventory/stock");
  return updated;
}

export async function updateDeliveryOrder(id: string, data: {
  contactName?: string;
  contactId?: string;
  contactPhone?: string;
  sourceDocument?: string;
  scheduledDate?: Date | string;
  notes?: string;
  status?: DeliveryStatus;
}) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.deliveryOrder.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data: {
      ...(data.contactName !== undefined ? { contactName: data.contactName } : {}),
      ...(data.contactId !== undefined ? { contactId: data.contactId || null } : {}),
      ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone } : {}),
      ...(data.sourceDocument !== undefined ? { sourceDocument: data.sourceDocument } : {}),
      ...(data.scheduledDate !== undefined ? { scheduledDate: new Date(data.scheduledDate) } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });

  await logAudit({ tenantId, userId, action: "delivery_order.update", entity: "DeliveryOrder", entityId: id });
  revalidatePath("/inventory/deliveries");
  revalidatePath("/website/store");
}

export async function deleteDeliveryOrder(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.deliveryOrder.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });
  await logAudit({ tenantId, userId, action: "delivery_order.delete", entity: "DeliveryOrder", entityId: id });
  revalidatePath("/inventory/deliveries");
  revalidatePath("/website/store");
}

// ============================================================================
// PRODUCT VARIANTS & LOTS/SERIAL NUMBERS
// ============================================================================

export async function getProductVariants(productId?: string) {
  try {
    const { tenantId } = await getSessionOrThrow();
    return await prisma.productVariant.findMany({
      where: {
        tenantId,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error in getProductVariants:", error);
    return [];
  }
}

export async function createProductVariant(data: {
  productId: string;
  sku: string;
  name: string;
  attribute1?: string;
  attribute2?: string;
  attribute3?: string;
  priceOffset?: number;
  stockQuantity?: number;
  barcode?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const variant = await prisma.productVariant.create({
    data: {
      tenantId,
      productId: data.productId,
      sku: data.sku,
      name: data.name,
      attribute1: data.attribute1,
      attribute2: data.attribute2,
      attribute3: data.attribute3,
      priceOffset: data.priceOffset ?? 0,
      stockQuantity: data.stockQuantity ?? 0,
      barcode: data.barcode,
    },
  });

  await logAudit({ tenantId, userId, action: "product_variant.create", entity: "ProductVariant", entityId: variant.id });
  revalidatePath("/inventory/variants");
  revalidatePath("/inventory/products");
  return variant;
}

export async function deleteProductVariant(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.productVariant.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });
  await logAudit({ tenantId, userId, action: "product_variant.delete", entity: "ProductVariant", entityId: id });
  revalidatePath("/inventory/variants");
  revalidatePath("/inventory/products");
}

export async function getLotSerialNumbers(productId?: string) {
  try {
    const { tenantId } = await getSessionOrThrow();
    return await prisma.lotSerialNumber.findMany({
      where: {
        tenantId,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        variant: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error in getLotSerialNumbers:", error);
    return [];
  }
}

export async function createLotSerialNumber(data: {
  number: string;
  type?: "LOT" | "SERIAL";
  productId: string;
  variantId?: string;
  onHandQty?: number;
  mfgDate?: string;
  expiryDate?: string;
  activities?: string;
  notes?: string;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  const lot = await prisma.lotSerialNumber.create({
    data: {
      tenantId,
      number: data.number,
      type: data.type || "LOT",
      productId: data.productId,
      variantId: data.variantId || null,
      onHandQty: data.onHandQty ?? 1,
      mfgDate: data.mfgDate ? new Date(data.mfgDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      activities: data.activities || "Created in inventory system",
      status: "AVAILABLE",
      notes: data.notes,
    },
  });

  await logAudit({ tenantId, userId, action: "lot_serial.create", entity: "LotSerialNumber", entityId: lot.id });
  revalidatePath("/inventory/lots");
  revalidatePath("/inventory/products");
  return lot;
}

export async function deleteLotSerialNumber(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();
  await prisma.lotSerialNumber.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });
  await logAudit({ tenantId, userId, action: "lot_serial.delete", entity: "LotSerialNumber", entityId: id });
  revalidatePath("/inventory/lots");
  revalidatePath("/inventory/products");
}
