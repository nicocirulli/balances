/**
 * Export utilities — shared by TransactionsPage and ReportePage.
 *
 * exportCSV  — downloads a .csv file with a summary header + transaction rows
 * exportPDF  — generates a professional PDF with jsPDF + jspdf-autotable
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMoney } from '../constants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function csvCell(val) {
  const str = String(val ?? '').replace(/"/g, '""');
  return `"${str}"`;
}

function buildCategoryBreakdown(transactions) {
  const map = {};
  let totalIncome  = 0;
  let totalExpense = 0;

  transactions.forEach((t) => {
    const key = t.category;
    if (!map[key]) map[key] = { category: key, type: t.type, count: 0, total: 0, color: t.category_color };
    map[key].count++;
    map[key].total += Number(t.amount);
    if (t.type === 'Ingreso') totalIncome  += Number(t.amount);
    else                       totalExpense += Number(t.amount);
  });

  const grand = totalIncome + totalExpense;
  return {
    rows: Object.values(map).sort((a, b) => b.total - a.total).map((r) => ({
      ...r,
      pct: grand > 0 ? Math.round((r.total / grand) * 100) : 0,
    })),
    totalIncome,
    totalExpense,
  };
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function exportCSV({ transactions, summary, dateFrom, dateTo, filename }) {
  const { rows: catRows } = buildCategoryBreakdown(transactions);

  const lines = [
    // ── Report header
    csvCell('REPORTE FINANCIERO — PADEL BALANCES'),
    [csvCell('Período:'), csvCell(`${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`)].join(','),
    [csvCell('Generado:'), csvCell(new Date().toLocaleDateString('es-AR'))].join(','),
    '',

    // ── Summary
    csvCell('RESUMEN EJECUTIVO'),
    [csvCell('Ingresos Totales'),    csvCell(formatMoney(summary.income))].join(','),
    [csvCell('Egresos Totales'),     csvCell(formatMoney(summary.expense))].join(','),
    [csvCell('Balance Neto'),        csvCell(formatMoney(summary.balance))].join(','),
    [csvCell('Total movimientos'),   csvCell(transactions.length)].join(','),
    '',

    // ── Category breakdown
    csvCell('DESGLOSE POR CATEGORÍA'),
    ['Categoría', 'Tipo', 'Movimientos', 'Total', '% del total'].map(csvCell).join(','),
    ...catRows.map((r) =>
      [r.category, r.type, r.count, formatMoney(r.total), `${r.pct}%`].map(csvCell).join(',')
    ),
    '',

    // ── Transactions
    csvCell('LISTADO DE MOVIMIENTOS'),
    ['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Monto', 'Medio de pago', 'Registrado por', 'Notas']
      .map(csvCell).join(','),
    ...transactions.map((t) =>
      [fmtDate(t.date), t.concept, t.category, t.type, t.amount, t.payment_method, t.registered_by, t.notes ?? '']
        .map(csvCell).join(',')
    ),

    // ── Totals row
    '',
    ['', '', '', 'TOTAL INGRESOS', formatMoney(summary.income), '', '', ''].map(csvCell).join(','),
    ['', '', '', 'TOTAL EGRESOS',  formatMoney(summary.expense), '', '', ''].map(csvCell).join(','),
    ['', '', '', 'BALANCE NETO',   formatMoney(summary.balance), '', '', ''].map(csvCell).join(','),
  ];

  const csv  = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename ?? `Padel_Reporte_${dateFrom}_${dateTo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF export ───────────────────────────────────────────────────────────────

// Convert hex "#rrggbb" → [r, g, b]
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function exportPDF({ transactions, summary, dateFrom, dateTo, filename }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const MARGIN = 14;
  const { rows: catRows, totalIncome, totalExpense } = buildCategoryBreakdown(transactions);

  // ── Cover header bar
  doc.setFillColor(79, 70, 229);   // indigo-600
  doc.rect(0, 0, PAGE_W, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE FINANCIERO', MARGIN, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PADEL BALANCES', MARGIN, 19);

  doc.setFontSize(9);
  doc.text(
    `Período: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}   ·   Generado: ${new Date().toLocaleDateString('es-AR')}`,
    MARGIN, 25,
  );

  doc.setTextColor(30, 41, 59);   // slate-800

  let y = 38;

  // ── Summary boxes (4 cells in a row)
  const BOX_W = (PAGE_W - MARGIN * 2 - 6) / 4;
  const summaryItems = [
    { label: 'Ingresos Totales', value: formatMoney(summary.income),  color: [5, 150, 105]  },
    { label: 'Egresos Totales',  value: formatMoney(summary.expense), color: [225, 29, 72]  },
    { label: 'Balance Neto',     value: formatMoney(summary.balance), color: summary.balance >= 0 ? [5, 150, 105] : [225, 29, 72] },
    { label: 'N° Movimientos',   value: String(transactions.length),  color: [99, 102, 241] },
  ];

  summaryItems.forEach((item, i) => {
    const x = MARGIN + i * (BOX_W + 2);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, BOX_W, 18, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + 3, y + 6);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...item.color);
    doc.text(item.value, x + 3, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
  });

  y += 26;

  // ── Category breakdown table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DESGLOSE POR CATEGORÍA', MARGIN, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Categoría', 'Tipo', 'Mov.', 'Total', '% del total']],
    body: catRows.map((r) => [r.category, r.type, r.count, formatMoney(r.total), `${r.pct}%`]),
    foot: [
      ['TOTAL INGRESOS', '', '', formatMoney(totalIncome),  ''],
      ['TOTAL EGRESOS',  '', '', formatMoney(totalExpense), ''],
    ],
    headStyles:  { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    footStyles:  { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontSize: 8, fontStyle: 'bold' },
    bodyStyles:  { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 55 },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    didDrawCell(data) {
      // Coloured left border per row based on category colour
      if (data.section === 'body' && data.column.index === 0) {
        const color = hexToRgb(catRows[data.row.index]?.color ?? '#6b7280');
        doc.setFillColor(...color);
        doc.rect(data.cell.x, data.cell.y, 1.5, data.cell.height, 'F');
      }
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Transaction list (may span multiple pages)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('LISTADO DE MOVIMIENTOS', MARGIN, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Monto', 'Por']],
    body: transactions.map((t) => [
      fmtDate(t.date),
      t.concept,
      t.category,
      t.type,
      formatMoney(Number(t.amount)),
      t.registered_by,
    ]),
    foot: [
      ['', '', '', 'TOTAL INGRESOS', formatMoney(summary.income),  ''],
      ['', '', '', 'TOTAL EGRESOS',  formatMoney(summary.expense), ''],
      ['', '', '', 'BALANCE NETO',   formatMoney(summary.balance), ''],
    ],
    headStyles:  { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    footStyles:  { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontSize: 8, fontStyle: 'bold' },
    bodyStyles:  { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 20 },
      3: { cellWidth: 18 },
      4: { halign: 'right', cellWidth: 28 },
      5: { cellWidth: 14 },
    },
    didDrawCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        const t = transactions[data.row.index];
        if (!t) return;
        const color = t.type === 'Ingreso' ? [5, 150, 105] : [225, 29, 72];
        doc.setTextColor(...color);
        doc.setFontSize(7.5);
        doc.text(t.type, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1);
        doc.setTextColor(30, 41, 59);
      }
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    showHead: 'everyPage',
    showFoot: 'lastPage',
  });

  // ── Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - MARGIN, 290, { align: 'right' });
    doc.text('Padel Balances — Confidencial', MARGIN, 290);
  }

  doc.save(filename ?? `Padel_Reporte_${dateFrom}_${dateTo}.pdf`);
}
