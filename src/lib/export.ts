/**
 * CSV Export/Import utilities (SALES-A008 + CORE-005)
 * No external libraries — uses built-in string manipulation.
 */

/** Escape a single CSV cell value (handles quotes, commas, newlines) */
function escapeCSVCell(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Generate a CSV string from headers and rows */
export function generateCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSVCell).join(",");
  const bodyLines = rows.map((row) => row.map(escapeCSVCell).join(","));
  return [headerLine, ...bodyLines].join("\n");
}

/** Client-side helper that triggers a CSV file download in the browser */
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse a CSV string into headers + rows.
 * Handles quoted fields (with escaped quotes, commas, newlines inside).
 */
export function parseCSV(csv: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(cell);
        cell = "";
      } else if (ch === "\r" && next === "\n") {
        current.push(cell);
        cell = "";
        lines.push(current);
        current = [];
        i++; // skip \n
      } else if (ch === "\n") {
        current.push(cell);
        cell = "";
        lines.push(current);
        current = [];
      } else {
        cell += ch;
      }
    }
  }

  // Push last cell / line
  if (cell || current.length > 0) {
    current.push(cell);
    lines.push(current);
  }

  // Filter out empty trailing lines
  const filtered = lines.filter((row) => row.some((c) => c.trim() !== ""));

  if (filtered.length === 0) {
    return { headers: [], rows: [] };
  }

  return { headers: filtered[0], rows: filtered.slice(1) };
}
