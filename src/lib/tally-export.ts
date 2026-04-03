/**
 * Tally Prime XML Export Generator (SALES-C006)
 *
 * Generates Tally Prime-compatible XML for importing sales vouchers.
 * Export-only — no live Tally connection required.
 */

/** Escape XML special characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Format a Date into Tally's YYYYMMDD format */
function tallyDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Format a number to 2 decimal places */
function amt(value: unknown): string {
  return Number(value).toFixed(2);
}

export interface TallyInvoiceItem {
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  taxRate: number | string;
  total: number | string;
}

export interface TallyInvoice {
  id: string;
  invoiceNo: string;
  createdAt: Date;
  dueDate?: Date | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subtotal: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  taxAmount: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  total: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cgst: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sgst: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  igst: any;
  partyName: string;
  items: TallyInvoiceItem[];
}

/**
 * Generate a single VOUCHER element for a sales invoice.
 */
function generateVoucher(invoice: TallyInvoice): string {
  const date = tallyDate(invoice.createdAt);
  const party = escapeXml(invoice.partyName || "Cash");
  const voucherNo = escapeXml(invoice.invoiceNo);
  const totalAmt = Number(invoice.total);
  const subtotalAmt = Number(invoice.subtotal);
  const cgstAmt = Number(invoice.cgst);
  const sgstAmt = Number(invoice.sgst);
  const igstAmt = Number(invoice.igst);

  // Build inventory entries for each line item
  const inventoryEntries = invoice.items
    .map((item) => {
      const qty = Number(item.quantity);
      const rate = Number(item.unitPrice);
      const lineTotal = Number(item.total);
      const desc = escapeXml(item.description);
      return `
        <ALLINVENTORYENTRIES.LIST>
          <STOCKITEMNAME>${desc}</STOCKITEMNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <RATE>${amt(rate)}/Nos</RATE>
          <AMOUNT>-${amt(lineTotal)}</AMOUNT>
          <ACTUALQTY>${qty} Nos</ACTUALQTY>
          <BILLEDQTY>${qty} Nos</BILLEDQTY>
          <BATCHALLOCATIONS.LIST>
            <GODOWNNAME>Main Location</GODOWNNAME>
            <BATCHNAME>Primary Batch</BATCHNAME>
            <AMOUNT>-${amt(lineTotal)}</AMOUNT>
            <ACTUALQTY>${qty} Nos</ACTUALQTY>
            <BILLEDQTY>${qty} Nos</BILLEDQTY>
          </BATCHALLOCATIONS.LIST>
          <ACCOUNTINGALLOCATIONS.LIST>
            <LEDGERNAME>Sales Account</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>-${amt(lineTotal)}</AMOUNT>
          </ACCOUNTINGALLOCATIONS.LIST>
        </ALLINVENTORYENTRIES.LIST>`;
    })
    .join("");

  // Build GST ledger entries
  const gstEntries: string[] = [];

  if (cgstAmt > 0) {
    gstEntries.push(`
        <LEDGERENTRIES.LIST>
          <LEDGERNAME>CGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${amt(cgstAmt)}</AMOUNT>
        </LEDGERENTRIES.LIST>`);
  }

  if (sgstAmt > 0) {
    gstEntries.push(`
        <LEDGERENTRIES.LIST>
          <LEDGERNAME>SGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${amt(sgstAmt)}</AMOUNT>
        </LEDGERENTRIES.LIST>`);
  }

  if (igstAmt > 0) {
    gstEntries.push(`
        <LEDGERENTRIES.LIST>
          <LEDGERNAME>IGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${amt(igstAmt)}</AMOUNT>
        </LEDGERENTRIES.LIST>`);
  }

  // If no explicit GST breakdown, split taxAmount as CGST+SGST (intra-state default)
  if (cgstAmt === 0 && sgstAmt === 0 && igstAmt === 0) {
    const taxAmt = Number(invoice.taxAmount);
    if (taxAmt > 0) {
      const half = taxAmt / 2;
      gstEntries.push(`
        <LEDGERENTRIES.LIST>
          <LEDGERNAME>CGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${amt(half)}</AMOUNT>
        </LEDGERENTRIES.LIST>
        <LEDGERENTRIES.LIST>
          <LEDGERNAME>SGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${amt(half)}</AMOUNT>
        </LEDGERENTRIES.LIST>`);
    }
  }

  return `
      <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJCLS="VoucherType">
        <DATE>${date}</DATE>
        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${voucherNo}</VOUCHERNUMBER>
        <PARTYLEDGERNAME>${party}</PARTYLEDGERNAME>
        <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
        <ISINVOICE>Yes</ISINVOICE>
        <EFFECTIVEDATE>${date}</EFFECTIVEDATE>
        <NARRATION>Sales Invoice ${voucherNo}</NARRATION>
        <LEDGERENTRIES.LIST>
          <LEDGERNAME>${party}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>${amt(totalAmt)}</AMOUNT>
        </LEDGERENTRIES.LIST>
        <LEDGERENTRIES.LIST>
          <LEDGERNAME>Sales Account</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${amt(subtotalAmt)}</AMOUNT>
        </LEDGERENTRIES.LIST>${gstEntries.join("")}${inventoryEntries}
      </VOUCHER>`;
}

/**
 * Generate complete Tally Prime-compatible XML for an array of invoices.
 *
 * The XML uses the standard ENVELOPE > HEADER > BODY > IMPORTDATA > REQUESTDATA
 * structure with TALLYMESSAGE containing VOUCHER entries.
 */
export function generateTallyXML(invoices: TallyInvoice[]): string {
  if (invoices.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>##SVCURRENTCOMPANY</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }

  const vouchers = invoices.map(generateVoucher).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>##SVCURRENTCOMPANY</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">${vouchers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}
