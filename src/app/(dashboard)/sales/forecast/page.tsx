import { getSalesForecast } from "@/lib/actions/sales";
import { ForecastClient } from "./forecast-client";

export const metadata = { title: "Sales Forecast" };

export default async function ForecastPage() {
  const data = await getSalesForecast();
  return <ForecastClient data={data} />;
}
