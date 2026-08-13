-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER');

-- CreateEnum
CREATE TYPE "SocialConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SocialPublishStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobSyndicationStatus" AS ENUM ('PENDING', 'QUEUED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "social_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "status" "SocialConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SocialPostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_post_targets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "status" "SocialPublishStatus" NOT NULL DEFAULT 'PENDING',
    "externalPostId" TEXT,
    "errorMessage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_post_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_portals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isSandbox" BOOLEAN NOT NULL DEFAULT true,
    "fieldMapping" JSONB,
    "capabilities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_portals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_portal_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "encryptedCredentials" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_portal_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_syndications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "externalJobId" TEXT,
    "status" "JobSyndicationStatus" NOT NULL DEFAULT 'PENDING',
    "publishedAt" TIMESTAMP(3),
    "unpublishedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "responseData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_syndications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryNo" TEXT NOT NULL,
    "sourceDocument" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'WAITING',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "demandQty" INTEGER NOT NULL DEFAULT 1,
    "doneQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "delivery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attribute1" TEXT,
    "attribute2" TEXT,
    "attribute3" TEXT,
    "priceOffset" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "barcode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_serial_numbers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LOT',
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "onHandQty" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "mfgDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "activities" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lot_serial_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_connections_tenantId_idx" ON "social_connections"("tenantId");

-- CreateIndex
CREATE INDEX "social_connections_tenantId_provider_idx" ON "social_connections"("tenantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "social_connections_tenantId_provider_accountId_key" ON "social_connections"("tenantId", "provider", "accountId");

-- CreateIndex
CREATE INDEX "social_posts_tenantId_idx" ON "social_posts"("tenantId");

-- CreateIndex
CREATE INDEX "social_posts_tenantId_status_idx" ON "social_posts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "social_post_targets_tenantId_idx" ON "social_post_targets"("tenantId");

-- CreateIndex
CREATE INDEX "social_post_targets_tenantId_postId_idx" ON "social_post_targets"("tenantId", "postId");

-- CreateIndex
CREATE INDEX "social_post_targets_tenantId_connectionId_idx" ON "social_post_targets"("tenantId", "connectionId");

-- CreateIndex
CREATE INDEX "job_portals_tenantId_idx" ON "job_portals"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "job_portals_tenantId_name_key" ON "job_portals"("tenantId", "name");

-- CreateIndex
CREATE INDEX "job_portal_connections_tenantId_idx" ON "job_portal_connections"("tenantId");

-- CreateIndex
CREATE INDEX "job_portal_connections_tenantId_portalId_idx" ON "job_portal_connections"("tenantId", "portalId");

-- CreateIndex
CREATE INDEX "job_syndications_tenantId_idx" ON "job_syndications"("tenantId");

-- CreateIndex
CREATE INDEX "job_syndications_tenantId_jobId_idx" ON "job_syndications"("tenantId", "jobId");

-- CreateIndex
CREATE INDEX "job_syndications_tenantId_portalId_idx" ON "job_syndications"("tenantId", "portalId");

-- CreateIndex
CREATE INDEX "delivery_orders_tenantId_idx" ON "delivery_orders"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_orders_tenantId_deliveryNo_key" ON "delivery_orders"("tenantId", "deliveryNo");

-- CreateIndex
CREATE INDEX "delivery_items_orderId_idx" ON "delivery_items"("orderId");

-- CreateIndex
CREATE INDEX "product_variants_tenantId_productId_idx" ON "product_variants"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenantId_sku_key" ON "product_variants"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "lot_serial_numbers_tenantId_productId_idx" ON "lot_serial_numbers"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "lot_serial_numbers_tenantId_number_key" ON "lot_serial_numbers"("tenantId", "number");

-- AddForeignKey
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post_targets" ADD CONSTRAINT "social_post_targets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post_targets" ADD CONSTRAINT "social_post_targets_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post_targets" ADD CONSTRAINT "social_post_targets_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "social_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_portals" ADD CONSTRAINT "job_portals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_portal_connections" ADD CONSTRAINT "job_portal_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_portal_connections" ADD CONSTRAINT "job_portal_connections_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "job_portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_syndications" ADD CONSTRAINT "job_syndications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_syndications" ADD CONSTRAINT "job_syndications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_syndications" ADD CONSTRAINT "job_syndications_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "job_portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_serial_numbers" ADD CONSTRAINT "lot_serial_numbers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_serial_numbers" ADD CONSTRAINT "lot_serial_numbers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_serial_numbers" ADD CONSTRAINT "lot_serial_numbers_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
