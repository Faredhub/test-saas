import { NextResponse } from "next/server";
import { authenticateRequest, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma, tenantScope } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const authResult = await authenticateRequest(req);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;
    const { tenantId } = user;

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return apiError("code is required and must be a string.", 400);
    }

    const trimmedCode = code.trim();

    // Search by barcode first, then by SKU
    const product = await prisma.product.findFirst({
      where: {
        ...tenantScope(tenantId),
        isActive: true,
        OR: [
          { barcode: trimmedCode },
          { sku: trimmedCode },
        ],
      },
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
        imageUrl: true,
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
    });

    if (!product) {
      return apiError("No product found matching the provided code.", 404);
    }

    const totalStock = product.warehouseStock.reduce((sum, ws) => sum + ws.quantity, 0);

    return apiSuccess({
      ...product,
      totalStock,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("[api/v1/inventory/scan] Error:", error);
    return apiError("Internal server error.", 500);
  }
}
