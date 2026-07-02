import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    console.log("Tenant:", tenant.id, tenant.name);
    const settings = (tenant.settings as any) || {};
    if (settings.terminology) {
      console.log("Current terminology invoices:", settings.terminology.invoices);
      const invTerm = settings.terminology.invoices;
      if (typeof invTerm === "string" && invTerm.toLowerCase().includes("running")) {
        settings.terminology.invoices = "Invoices";
        
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { settings },
        });
        console.log(`Successfully updated '${invTerm}' -> 'Invoices' for tenant:`, tenant.name);
      } else {
        console.log("No update needed or invoices is already:", settings.terminology.invoices);
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
