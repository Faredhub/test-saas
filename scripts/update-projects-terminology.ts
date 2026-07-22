import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    console.log("Tenant:", tenant.id, tenant.name);
    const settings = (tenant.settings as any) || {};
    if (settings.terminology) {
      console.log("Current terminology projects:", settings.terminology.projects);
      const projTerm = settings.terminology.projects;
      if (typeof projTerm === "string" && projTerm === "Property Renovations") {
        settings.terminology.projects = "Projects";
        
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { settings },
        });
        console.log(`Successfully updated '${projTerm}' -> 'Projects' for tenant:`, tenant.name);
      } else {
        console.log("No update needed or projects is already:", settings.terminology.projects);
      }
    } else {
      console.log("No terminology setting found for this tenant.");
    }
  }
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
