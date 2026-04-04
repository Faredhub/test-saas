"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma, tenantScope } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { StockMovementType, MfgStatus } from "@/generated/prisma/enums";

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

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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
  revalidatePath("/inventory/products");
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
  const { userId, tenantId } = await getSessionOrThrow();

  const product = await prisma.product.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data,
  });

  await logAudit({ tenantId, userId, action: "product.update", entity: "Product", entityId: id });
  revalidatePath("/inventory/products");
  return product;
}

export async function deleteProduct(id: string) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.product.deleteMany({
    where: { id, ...tenantScope(tenantId) },
  });

  await logAudit({ tenantId, userId, action: "product.delete", entity: "Product", entityId: id });
  revalidatePath("/inventory/products");
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
    },
  });

  await logAudit({ tenantId, userId, action: "warehouse.create", entity: "Warehouse", entityId: warehouse.id });
  revalidatePath("/inventory/warehouses");
  return warehouse;
}

export async function updateWarehouse(id: string, data: {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  isActive?: boolean;
}) {
  const { userId, tenantId } = await getSessionOrThrow();

  await prisma.warehouse.updateMany({
    where: { id, ...tenantScope(tenantId) },
    data,
  });

  await logAudit({ tenantId, userId, action: "warehouse.update", entity: "Warehouse", entityId: id });
  revalidatePath("/inventory/warehouses");
}

// ============================================================================
// STOCK (SCM-A-001-002)
// ============================================================================

export async function getWarehouseStock(warehouseId?: string) {
  const { tenantId } = await getSessionOrThrow();

  return prisma.warehouseStock.findMany({
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
      return { ...p, totalStock };
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
      productName: data.productName,
      quantity: data.quantity,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes,
      createdById: userId,
    },
  });

  await logAudit({ tenantId, userId, action: "mfg_order.create", entity: "ManufacturingOrder", entityId: order.id });
  revalidatePath("/inventory/manufacturing");
  return order;
}

export async function updateManufacturingOrder(id: string, data: {
  productName?: string;
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

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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
      ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });

  await logAudit({ tenantId, userId, action: "asset.update", entity: "Asset", entityId: id });
  revalidatePath("/inventory/assets");
}

// ============================================================================
// MAINTENANCE REQUESTS (SCM-D)
// ============================================================================

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

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function createMaintenanceRequest(data: {
  assetId?: string;
  title: string;
  description?: string;
  priority?: string;
  type?: string;
  scheduledDate?: string;
  assignedTo?: string;
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
      reportedById: userId,
    },
  });

  await logAudit({ tenantId, userId, action: "maintenance.create", entity: "MaintenanceRequest", entityId: request.id });
  revalidatePath("/inventory/assets");
  return request;
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
    },
  });

  await logAudit({ tenantId, userId, action: "maintenance.update", entity: "MaintenanceRequest", entityId: id });
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
  inspector?: string;
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
      inspector: data.inspector,
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

  const [productCount, warehouseCount, lowStockAlerts, valuation] = await Promise.all([
    prisma.product.count({ where: { ...tenantScope(tenantId), isActive: true } }),
    prisma.warehouse.count({ where: { ...tenantScope(tenantId), isActive: true } }),
    getLowStockAlerts().then((a) => a.length).catch(() => 0),
    getInventoryValuation().then((v) => v.totalCostValue).catch(() => 0),
  ]);

  return { productCount, warehouseCount, lowStockAlerts, stockValue: valuation };
}
