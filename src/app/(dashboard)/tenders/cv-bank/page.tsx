import { getCVRecords } from "@/lib/actions/cv-bank";
import { CVBankClient } from "./cv-bank-client";

export const metadata = { title: "CV Bank" };

export default async function CVBankPage() {
  const cvData = await getCVRecords({ pageSize: 100 });

  return <CVBankClient initialData={cvData} />;
}
