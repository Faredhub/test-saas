import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    console.log("Tenant:", tenant.id, tenant.name);
    const settings = (tenant.settings as any) || {};
    if (settings.terminology) {
      console.log("Current terminology leads:", settings.terminology.leads);
      if (settings.terminology.leads === "Tender Enquiries") {
        settings.terminology.leads = "Overview";
        
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { settings },
        });
        console.log("Successfully updated 'Tender Enquiries' -> 'Overview' for tenant:", tenant.name);
      } else {
        console.log("No update needed or leads is already:", settings.terminology.leads);
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
