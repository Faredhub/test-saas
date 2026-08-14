// Client-side print helper. Opens a clean, self-contained document in a new
// window so report printouts don't inherit the app's layout/styles.

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  h2 { font-size: 14px; margin: 18px 0 6px; }
  .meta { color: #555; font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
  th, td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f2f2f2; font-weight: 600; }
  td.num, th.num { text-align: right; }
  .total-row td { font-weight: 700; background: #fafafa; }
  .grand td { font-weight: 700; background: #eef7ee; }
  .muted { color: #666; }
  .right { text-align: right; }
  @media print {
    body { margin: 12mm; }
    @page { size: A4; margin: 10mm; }
  }
`;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printHTML(title: string, bodyHtml: string): void {
  const win = window.open("", "_blank", "width=920,height=680");
  if (!win) return;
  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body>${bodyHtml}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

// Build a print-ready HTML table from headers + rows.
export function htmlTable(
  headers: string[],
  rows: (string | number)[][],
  opts: { numericColumns?: number[]; extraClass?: string } = {},
): string {
  const numeric = new Set(opts.numericColumns ?? []);
  const head = headers
    .map((h, i) => `<th class="${numeric.has(i) ? "num" : ""}">${escapeHtml(h)}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, i) => `<td class="${numeric.has(i) ? "num" : ""}">${escapeHtml(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `<table class="${opts.extraClass ?? ""}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export { escapeHtml };
