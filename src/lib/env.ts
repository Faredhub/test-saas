export function stripEnvQuotes(value: string | undefined | null) {
  if (!value) return value ?? "";
  return value.replace(/^['"]|['"]$/g, "");
}

export function normalizeUrlEnv(value: string | undefined | null, fallback = "") {
  const cleaned = stripEnvQuotes(value).trim();
  return cleaned || fallback;
}
