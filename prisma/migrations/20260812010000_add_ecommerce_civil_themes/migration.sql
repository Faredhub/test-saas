-- CreateTable: website_themes
CREATE TABLE "website_themes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "primaryColor" TEXT NOT NULL DEFAULT '#4F46E5',
    "secondaryColor" TEXT NOT NULL DEFAULT '#7C3AED',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "headingFont" TEXT,
    "borderRadius" TEXT NOT NULL DEFAULT '0.5rem',
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "customCSS" TEXT,
    "previewThumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: boreholes
CREATE TABLE "boreholes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "boreholeNo" TEXT NOT NULL,
    "location" TEXT,
    "coordinates" TEXT,
    "groundLevel" DECIMAL(10,3),
    "depth" DECIMAL(10,3) NOT NULL,
    "diameter" TEXT,
    "waterLevel" DECIMAL(10,3),
    "method" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boreholes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: borehole_layers
CREATE TABLE "borehole_layers" (
    "id" TEXT NOT NULL,
    "boreholeId" TEXT NOT NULL,
    "depthFrom" DECIMAL(10,3) NOT NULL,
    "depthTo" DECIMAL(10,3) NOT NULL,
    "soilType" TEXT NOT NULL,
    "soilColor" TEXT,
    "consistency" TEXT,
    "nValue" INTEGER,
    "description" TEXT,

    CONSTRAINT "borehole_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: borehole_tests
CREATE TABLE "borehole_tests" (
    "id" TEXT NOT NULL,
    "boreholeId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "depth" DECIMAL(10,3) NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "notes" TEXT,
    "performedAt" TIMESTAMP(3),

    CONSTRAINT "borehole_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: soil_samples
CREATE TABLE "soil_samples" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "boreholeId" TEXT,
    "sampleNo" TEXT NOT NULL,
    "depth" DECIMAL(10,3) NOT NULL,
    "sampleType" TEXT NOT NULL,
    "moistureContent" DECIMAL(6,2),
    "liquidLimit" DECIMAL(6,2),
    "plasticLimit" DECIMAL(6,2),
    "plasticityIndex" DECIMAL(6,2),
    "specificGravity" DECIMAL(6,3),
    "classification" TEXT,
    "labTestResults" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId_fkey" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "soil_samples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "website_themes_tenantId_name_key" ON "website_themes"("tenantId", "name");

-- CreateIndex
CREATE INDEX "website_themes_tenantId_idx" ON "website_themes"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "boreholes_tenantId_projectId_boreholeNo_key" ON "boreholes"("tenantId", "projectId", "boreholeNo");

-- CreateIndex
CREATE INDEX "boreholes_tenantId_projectId_idx" ON "boreholes"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "borehole_layers_boreholeId_idx" ON "borehole_layers"("boreholeId");

-- CreateIndex
CREATE INDEX "borehole_tests_boreholeId_idx" ON "borehole_tests"("boreholeId");

-- CreateIndex
CREATE INDEX "soil_samples_tenantId_projectId_idx" ON "soil_samples"("tenantId", "projectId");

-- AddForeignKey
ALTER TABLE "website_themes" ADD CONSTRAINT "website_themes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boreholes" ADD CONSTRAINT "boreholes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boreholes" ADD CONSTRAINT "boreholes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borehole_layers" ADD CONSTRAINT "borehole_layers_boreholeId_fkey" FOREIGN KEY ("boreholeId") REFERENCES "boreholes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borehole_tests" ADD CONSTRAINT "borehole_tests_boreholeId_fkey" FOREIGN KEY ("boreholeId") REFERENCES "boreholes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soil_samples" ADD CONSTRAINT "soil_samples_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soil_samples" ADD CONSTRAINT "soil_samples_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soil_samples" ADD CONSTRAINT "soil_samples_boreholeId_fkey" FOREIGN KEY ("boreholeId") REFERENCES "boreholes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
