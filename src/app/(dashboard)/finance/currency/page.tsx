import { getExchangeRatesList } from "@/lib/actions/finance";
import { CurrencyClient } from "./currency-client";

export default async function CurrencyPage() {
  const { rates, baseCurrency, lastUpdated } = await getExchangeRatesList();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Currency Exchange</h1>
        <p className="text-muted-foreground">
          View live exchange rates and convert between currencies
        </p>
      </div>

      <CurrencyClient
        rates={rates}
        baseCurrency={baseCurrency}
        lastUpdated={lastUpdated}
      />
    </div>
  );
}
