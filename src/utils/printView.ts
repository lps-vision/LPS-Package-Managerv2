import { CustomerSummary, GrandTotals } from '../types';

export interface PrintViewOptions {
  customers: CustomerSummary[];
  totals: GrandTotals;
  franchiseeName?: string | null;
  fileName?: string | null;
  customTotalDeposit?: number | null;
  title?: string;
}

export function generatePrintViewHtml(options: PrintViewOptions): string {
  const {
    customers,
    totals,
    franchiseeName,
    fileName,
    customTotalDeposit,
    title = 'LPS Cable TV - Subscriber Bill & Rate List',
  } = options;

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const totalBillCalculated = customers.reduce((sum, c) => {
    const bill = c.customBillAmount !== undefined && c.customBillAmount > 0 ? c.customBillAmount : c.channelPrice;
    return sum + bill;
  }, 0);

  const effectiveTotalBill = customTotalDeposit !== null && customTotalDeposit !== undefined
    ? customTotalDeposit
    : totalBillCalculated;

  const totalMsoCut = totals.totalLcoSen || customers.reduce((sum, c) => sum + (c.lcoSen || 0), 0);
  const totalLcoShare = Number((effectiveTotalBill - totalMsoCut).toFixed(2));

  const tableRowsHtml = customers
    .map((c, index) => {
      const isLocalActive = c.hasLocalAddon !== false;
      const basePkgName = c.basePackage || 'PACK-1 (BST)';
      const pkgLabel = isLocalActive ? `${basePkgName} + Local` : `${basePkgName} chauh`;
      
      const channelList = c.selectedChannels && c.selectedChannels.length > 0
        ? c.selectedChannels.join(', ')
        : '';

      const packageAndChannels = channelList
        ? `<strong>${escapeHtml(pkgLabel)}</strong><div class="channel-text">${escapeHtml(channelList)}</div>`
        : `<strong>${escapeHtml(pkgLabel)}</strong>`;

      const billAmount = c.customBillAmount !== undefined && c.customBillAmount > 0
        ? c.customBillAmount
        : c.channelPrice;

      const msoCut = c.lcoSen || 0;
      const lcoShare = Number((billAmount - msoCut).toFixed(2));

      return `
        <tr>
          <td class="col-num">${index + 1}</td>
          <td class="col-name">
            <span class="cust-name">${escapeHtml(c.name || 'Unknown')}</span>
            ${c.userEdited ? '<span class="edited-tag">(Edited)</span>' : ''}
          </td>
          <td class="col-code font-mono">${escapeHtml(c.subscriberCode || '-')}</td>
          <td class="col-stb font-mono">${escapeHtml(c.stbNo || c.vcNo || '-')}</td>
          <td class="col-pkg">${packageAndChannels}</td>
          <td class="col-amount font-mono text-right">₹ ${billAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="col-cut font-mono text-right">₹ ${msoCut.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="col-hlawh font-mono text-right">₹ ${lcoShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - ${formattedDate}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 15mm 10mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
      padding: 16px 20px;
    }

    /* Interactive top bar - hidden on print */
    .no-print {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    .no-print .bar-title {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .no-print .actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-primary {
      background: #059669;
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #047857;
    }

    .btn-secondary {
      background: #334155;
      color: #ffffff;
    }

    .btn-secondary:hover {
      background: #475569;
    }

    .print-tip {
      font-size: 11px;
      color: #cbd5e1;
      margin-right: 8px;
    }

    /* Document Header */
    .doc-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .brand-title {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.2px;
      text-transform: uppercase;
    }

    .brand-sub {
      font-size: 12px;
      color: #475569;
      font-weight: 600;
      margin-top: 2px;
    }

    .header-meta {
      text-align: right;
      font-size: 10.5px;
      color: #475569;
      line-height: 1.5;
    }

    .header-meta strong {
      color: #0f172a;
    }

    /* Summary Metrics Bar */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }

    .summary-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
    }

    .summary-card .label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }

    .summary-card .value {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .summary-card.highlight {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }

    .summary-card.highlight .label {
      color: #047857;
    }

    .summary-card.highlight .value {
      color: #065f46;
    }

    /* Main Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10.5px;
    }

    thead {
      display: table-header-group;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 7px 8px;
      border-top: 1.5px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .col-num {
      width: 32px;
      text-align: center;
      color: #64748b;
      font-weight: 600;
    }

    .col-name {
      font-weight: 600;
      color: #0f172a;
    }

    .cust-name {
      display: inline-block;
    }

    .edited-tag {
      font-size: 9px;
      color: #0284c7;
      font-weight: 700;
      margin-left: 4px;
    }

    .col-code {
      color: #334155;
      white-space: nowrap;
    }

    .col-stb {
      color: #475569;
      white-space: nowrap;
    }

    .col-pkg {
      max-width: 260px;
    }

    .channel-text {
      font-size: 9.5px;
      color: #475569;
      margin-top: 1px;
    }

    .col-amount {
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
    }

    .col-cut {
      color: #475569;
      white-space: nowrap;
    }

    .col-hlawh {
      font-weight: 700;
      color: #047857;
      white-space: nowrap;
    }

    .text-right {
      text-align: right;
    }

    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Table Footer */
    tfoot td {
      background: #f1f5f9;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      font-weight: 800;
      padding: 9px 8px;
      font-size: 11px;
    }

    tfoot .col-total-label {
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
    }

    /* Signature & Note Section */
    .doc-footer {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .sig-block {
      text-align: center;
      width: 180px;
    }

    .sig-line {
      border-top: 1px solid #64748b;
      margin-bottom: 4px;
    }

    .sig-label {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
    }

    .doc-timestamp {
      font-size: 9.5px;
      color: #94a3b8;
    }

    /* Print media query */
    @media print {
      body {
        padding: 0;
        font-size: 10px;
      }

      .no-print {
        display: none !important;
      }

      table {
        font-size: 9.5px;
      }

      th {
        background: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      tbody tr:nth-child(even) {
        background-color: #f8fafc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .summary-card {
        border-color: #94a3b8 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .summary-card.highlight {
        background-color: #ecfdf5 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      tfoot td {
        background-color: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Floating Action Bar for Web View -->
  <div class="no-print">
    <div class="bar-title">
      <span>🖨️</span>
      <span>Print Preview - ${escapeHtml(title)}</span>
    </div>
    <div class="actions">
      <span class="print-tip">💡 Printer / PDF-a save nan Print button hmet rawh</span>
      <button type="button" class="btn btn-primary" onclick="window.print()">
        <span>Print / Save as PDF</span>
      </button>
      <button type="button" class="btn btn-secondary" onclick="window.close()">
        <span>Close Tab</span>
      </button>
    </div>
  </div>

  <!-- Document Header -->
  <header class="doc-header">
    <div>
      <h1 class="brand-title">${escapeHtml(title)}</h1>
      <p class="brand-sub">
        ${franchiseeName ? `Franchisee: <strong>${escapeHtml(franchiseeName)}</strong>` : 'LPS Cable TV Subscriber Accounts'}
        ${fileName ? ` &bull; Source: ${escapeHtml(fileName)}` : ''}
      </p>
    </div>
    <div class="header-meta">
      <div>Date: <strong>${formattedDate}</strong></div>
      <div>Time: <strong>${formattedTime}</strong></div>
      <div>Total Subscribers: <strong>${customers.length}</strong></div>
    </div>
  </header>

  <!-- Summary Cards -->
  <section class="summary-grid">
    <div class="summary-card">
      <div class="label">Total Subscribers</div>
      <div class="value">${customers.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Bill Amount</div>
      <div class="value">₹ ${effectiveTotalBill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
    <div class="summary-card">
      <div class="label">MSO Portal Cut</div>
      <div class="value">₹ ${totalMsoCut.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
    <div class="summary-card highlight">
      <div class="label">LCO Net Share (Hlawh)</div>
      <div class="value">₹ ${totalLcoShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
  </section>

  <!-- Main Customer List Table -->
  <table>
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-name">Customer Name</th>
        <th class="col-code">Sub Code</th>
        <th class="col-stb">STB / VC No</th>
        <th class="col-pkg">Package & Channels</th>
        <th class="col-amount text-right">Bill (₹)</th>
        <th class="col-cut text-right">MSO Cut (₹)</th>
        <th class="col-hlawh text-right">LCO Share (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" class="col-total-label text-right">GRAND TOTAL (${customers.length} Subscribers):</td>
        <td class="col-amount font-mono text-right">₹ ${effectiveTotalBill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="col-cut font-mono text-right">₹ ${totalMsoCut.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="col-hlawh font-mono text-right">₹ ${totalLcoShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Document Footer -->
  <footer class="doc-footer">
    <div class="doc-timestamp">
      Generated automatically on ${formattedDate} at ${formattedTime} &bull; LPS Subscriber Manager
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Operator Signature</div>
    </div>
  </footer>

  <script>
    // Prompt print dialog shortly after loading, but allow user to interact
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print was blocked or cancelled', e);
        }
      }, 500);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Opens a new tab with a clean, printer-friendly version of the customer list and totals.
 */
export function openPrintView(options: PrintViewOptions): void {
  const html = generatePrintViewHtml(options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  // Attempt window.open
  const printWindow = window.open(blobUrl, '_blank');

  if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
    // If blocked by iframe or browser popup blocker, trigger anchor click as fallback
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
