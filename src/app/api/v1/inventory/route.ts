import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma, tenantScope } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || undefined;
    const lowStock = url.searchParams.get("lowStock") === "true";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...tenantScope(tenantId),
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    // For low stock, we need to join with warehouse stock
    // and filter products where total quantity is below minStock
    if (lowStock) {
      where.warehouseStock = {
        none: {},
      };
      // We handle low stock with a two-step approach:
      // first get products, then check their stock levels.
      // For a simpler approach, get all products with stock included.
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where: lowStock
          ? { ...tenantScope(tenantId), isActive: true, ...(search ? { OR: (where as Record<string, unknown>).OR } : {}) }
          : where,
        orderBy: { name: "asc" },
        skip: lowStock ? undefined : skip,
        take: lowStock ? undefined : limit,
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          category: true,
          unit: true,
          hsnCode: true,
          costPrice: true,
          sellingPrice: true,
          taxRate: true,
          barcode: true,
          minStock: true,
          maxStock: true,
          imageUrl: true,
          createdAt: true,
          warehouseStock: {
            select: {
              quantity: true,
              reservedQty: true,
              warehouse: {
                select: { id: true, name: true, code: true },
              },
            },
          },
        },
      }),
      prisma.product.count({ where: lowStock
        ? { ...tenantScope(tenantId), isActive: true, ...(search ? { OR: (where as Record<string, unknown>).OR } : {}) }
        : where }),
    ]);

    // Compute total stock per product and filter for low stock if needed
    const enriched = data.map((p) => {
      const totalQty = p.warehouseStock.reduce((sum, ws) => sum + ws.quantity, 0);
      return {
        ...p,
        totalStock: totalQty,
      };
    });

    if (lowStock) {
      const filtered = enriched.filter((p) => p.totalStock <= p.minStock);
      const paginated = filtered.slice(skip, skip + limit);
      return apiSuccess({
        data: paginated,
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      });
    }

    return apiSuccess({
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/inventory] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
