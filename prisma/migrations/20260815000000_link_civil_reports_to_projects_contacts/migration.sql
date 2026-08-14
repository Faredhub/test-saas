-- AlterTable: link civil reports to Projects & Contacts
ALTER TABLE "civil_geotechnical_reports" ADD COLUMN "projectId" TEXT;
ALTER TABLE "civil_geotechnical_reports" ADD COLUMN "clientId" TEXT;
ALTER TABLE "civil_survey_reports" ADD COLUMN "projectId" TEXT;
ALTER TABLE "civil_survey_reports" ADD COLUMN "clientId" TEXT;
ALTER TABLE "civil_design_reports" ADD COLUMN "projectId" TEXT;
ALTER TABLE "civil_design_reports" ADD COLUMN "clientId" TEXT;
ALTER TABLE "civil_estimations" ADD COLUMN "projectId" TEXT;
ALTER TABLE "civil_estimations" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE INDEX "civil_geotechnical_reports_projectId_idx" ON "civil_geotechnical_reports"("projectId");
CREATE INDEX "civil_geotechnical_reports_clientId_idx" ON "civil_geotechnical_reports"("clientId");
CREATE INDEX "civil_survey_reports_projectId_idx" ON "civil_survey_reports"("projectId");
CREATE INDEX "civil_survey_reports_clientId_idx" ON "civil_survey_reports"("clientId");
CREATE INDEX "civil_design_reports_projectId_idx" ON "civil_design_reports"("projectId");
CREATE INDEX "civil_design_reports_clientId_idx" ON "civil_design_reports"("clientId");
CREATE INDEX "civil_estimations_projectId_idx" ON "civil_estimations"("projectId");
CREATE INDEX "civil_estimations_clientId_idx" ON "civil_estimations"("clientId");

-- AddForeignKey
ALTER TABLE "civil_geotechnical_reports" ADD CONSTRAINT "civil_geotechnical_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_geotechnical_reports" ADD CONSTRAINT "civil_geotechnical_reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_survey_reports" ADD CONSTRAINT "civil_survey_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_survey_reports" ADD CONSTRAINT "civil_survey_reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_design_reports" ADD CONSTRAINT "civil_design_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_design_reports" ADD CONSTRAINT "civil_design_reports_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_estimations" ADD CONSTRAINT "civil_estimations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "civil_estimations" ADD CONSTRAINT "civil_estimations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
