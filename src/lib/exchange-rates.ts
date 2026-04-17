export async function getExchangeRates(
  baseCurrency: string = "INR"
): Promise<Record<string, number> | null> {
  const apiKey = process.env.EXCHANGERATE_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.conversion_rates;
}

export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<number | null> {
  const rates = await getExchangeRates(from);
  if (!rates || !rates[to]) return null;
  return amount * rates[to];
}
