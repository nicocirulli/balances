/**
 * Export utilities — shared by TransactionsPage and ReportePage.
 *
 * exportCSV  — downloads a .csv file with a summary header + transaction rows
 * exportPDF  — generates a professional PDF with jsPDF + jspdf-autotable
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMoney, formatUSD } from '../constants';

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
  const incomeMap = {};
  const expenseMap = {};
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((t) => {
    const key = t.category;
    const amount = Number(t.amount_usd) || 0;
    const target = t.type === 'Ingreso' ? incomeMap : expenseMap;
    if (!target[key]) {
      target[key] = { name: key, type: t.type, count: 0, total: 0, color: t.category_color };
    }
    target[key].count++;
    target[key].total += amount;
    if (t.type === 'Ingreso') totalIncome += amount;
    else                       totalExpense += amount;
  });

  const incomeRows = Object.values(incomeMap)
    .sort((a, b) => b.total - a.total)
    .map((r) => ({
      ...r,
      pct: totalIncome > 0 ? Math.round((r.total / totalIncome) * 100) : 0,
    }));

  const expenseRows = Object.values(expenseMap)
    .sort((a, b) => b.total - a.total)
    .map((r) => ({
      ...r,
      pct: totalExpense > 0 ? Math.round((r.total / totalExpense) * 100) : 0,
    }));

  return {
    incomeRows,
    expenseRows,
    totalIncome,
    totalExpense,
  };
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function exportCSV({ transactions, summary, dateFrom, dateTo, filename }) {
  const { incomeRows, expenseRows } = buildCategoryBreakdown(transactions);

  const lines = [
    // ── Report header
    csvCell('REPORTE FINANCIERO — PADEL BALANCES'),
    [csvCell('Período:'), csvCell(`${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`)].join(','),
    [csvCell('Generado:'), csvCell(new Date().toLocaleDateString('es-AR'))].join(','),
    '',

    // ── Summary
    csvCell('RESUMEN EJECUTIVO'),
    [csvCell('Ingresos Totales'),    csvCell(formatUSD(summary.income))].join(','),
    [csvCell('Egresos Totales'),     csvCell(formatUSD(summary.expense))].join(','),
    [csvCell('Balance Neto'),        csvCell(formatUSD(summary.balance))].join(','),
    [csvCell('Total movimientos'),   csvCell(transactions.length)].join(','),
    '',

    // ── Category breakdown - Ingresos
    csvCell('DESGLOSE POR CATEGORÍA - INGRESOS'),
    ['Categoría', 'Movimientos', 'Total', '% sobre ingresos'].map(csvCell).join(','),
    ...incomeRows.map((r) =>
      [r.name, r.count, formatUSD(r.total), `${r.pct}%`].map(csvCell).join(',')
    ),
    ['', '', csvCell('TOTAL INGRESOS'), formatUSD(summary.income)].join(','),
    '',

    // ── Category breakdown - Egresos
    csvCell('DESGLOSE POR CATEGORÍA - EGRESOS'),
    ['Categoría', 'Movimientos', 'Total', '% sobre egresos'].map(csvCell).join(','),
    ...expenseRows.map((r) =>
      [r.name, r.count, formatUSD(r.total), `${r.pct}%`].map(csvCell).join(',')
    ),
    ['', '', csvCell('TOTAL EGRESOS'), formatUSD(summary.expense)].join(','),
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
    ['', '', '', 'TOTAL INGRESOS', formatUSD(summary.income), '', '', ''].map(csvCell).join(','),
    ['', '', '', 'TOTAL EGRESOS',  formatUSD(summary.expense), '', '', ''].map(csvCell).join(','),
    ['', '', '', 'BALANCE NETO',   formatUSD(summary.balance), '', '', ''].map(csvCell).join(','),
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

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function generatePieChartDataURL(items, { width = 320, height = 220 } = {}) {
  const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const centerX = width * 0.35;
  const centerY = height * 0.54;
  const radius = Math.min(width, height) * 0.26;
  let startAngle = -Math.PI / 2;

  items.forEach((item) => {
    const sliceAngle = total > 0 ? ((item.total || 0) / total) * Math.PI * 2 : 0;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();
    startAngle += sliceAngle;
  });

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 12px Helvetica';
  ctx.fillText('Total', centerX - 14, centerY - 4);
  ctx.font = 'bold 14px Helvetica';
  ctx.fillText(total > 0 ? `${Math.round(total)}` : '0', centerX - 16, centerY + 14);

  const legendX = width * 0.6;
  let legendY = height * 0.14;
  ctx.font = '10px Helvetica';
  if (total === 0) {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px Helvetica';
    ctx.fillText('Sin datos', width * 0.45, height * 0.5);
  } else {
    items.slice(0, 6).forEach((item) => {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, legendY - 8, 8, 8);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`${item.name} (${item.pct}%)`, legendX + 12, legendY);
      legendY += 16;
    });
  }

  return canvas.toDataURL('image/png');
}

function generateBarChartDataURL(income, expense, { width = 360, height = 220 } = {}) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const chartLeft = 36;
  const chartRight = width - 16;
  const chartTop = 24;
  const chartBottom = height - 28;
  const chartHeight = chartBottom - chartTop;
  const maxValue = Math.max(income, expense, 1);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(chartLeft, chartTop);
  ctx.lineTo(chartLeft, chartBottom);
  ctx.lineTo(chartRight, chartBottom);
  ctx.stroke();

  const barWidth = 50;
  const gap = 40;
  const xIncome = chartLeft + gap;
  const xExpense = xIncome + barWidth + gap;

  const incomeHeight = (income / maxValue) * chartHeight;
  const expenseHeight = (expense / maxValue) * chartHeight;

  ctx.fillStyle = '#10b981';
  ctx.fillRect(xIncome, chartBottom - incomeHeight, barWidth, incomeHeight);
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(xExpense, chartBottom - expenseHeight, barWidth, expenseHeight);

  ctx.fillStyle = '#0f172a';
  ctx.font = '10px Helvetica';
  ctx.fillText('Ingresos', xIncome - 4, chartBottom + 14);
  ctx.fillText('Egresos', xExpense - 6, chartBottom + 14);

  ctx.font = 'bold 12px Helvetica';
  ctx.fillText(formatUSD(income), xIncome - 2, chartBottom - incomeHeight - 8);
  ctx.fillText(formatUSD(expense), xExpense - 2, chartBottom - expenseHeight - 8);

  return canvas.toDataURL('image/png');
}

function formatDateLabel(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function computeDashboardMetrics(transactions, dateFrom, dateTo, incomeRows, expenseRows, summary, txCount) {
  const incomeByDate = {};
  const expenseByDate = {};

  transactions.forEach((t) => {
    const amount = Number(t.amount_usd) || 0;
    if (t.type === 'Ingreso') {
      incomeByDate[t.date] = (incomeByDate[t.date] || 0) + amount;
    } else {
      expenseByDate[t.date] = (expenseByDate[t.date] || 0) + amount;
    }
  });

  const start = new Date(dateFrom + 'T12:00:00');
  const end = new Date(dateTo + 'T12:00:00');
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);

  const bestIncomeEntry = Object.entries(incomeByDate).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const bestExpenseEntry = Object.entries(expenseByDate).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];

  return {
    topIncomeCategory: incomeRows[0] ?? null,
    topExpenseCategory: expenseRows[0] ?? null,
    bestIncomeDay: bestIncomeEntry[0],
    bestIncomeAmount: bestIncomeEntry[1],
    bestExpenseDay: bestExpenseEntry[0],
    bestExpenseAmount: bestExpenseEntry[1],
    avgDailyIncome: summary.income / days,
    avgDailyExpense: summary.expense / days,
    periodDays: days,
    transactionCount: txCount,
  };
}

function buildInsights(metrics) {
  const lines = [];
  if (metrics.topIncomeCategory) {
    lines.push(`La principal fuente de ingresos fue ${metrics.topIncomeCategory.name} con el ${metrics.topIncomeCategory.pct}% del total.`);
  }
  if (metrics.topExpenseCategory) {
    lines.push(`La categoría de gasto más importante fue ${metrics.topExpenseCategory.name} con el ${metrics.topExpenseCategory.pct}% del total.`);
  }
  if (metrics.bestIncomeDay) {
    lines.push(`El día con mayor facturación fue ${formatDateLabel(metrics.bestIncomeDay)}.`);
  }
  if (metrics.bestExpenseDay) {
    lines.push(`El día con más egresos fue ${formatDateLabel(metrics.bestExpenseDay)}.`);
  }
  lines.push(`Se registraron ${metrics.periodDays} días de análisis y ${metrics.transactionCount} movimientos totales.`);
  return lines;
}

export function exportPDF({ transactions, summary, dateFrom, dateTo, filename }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const MARGIN = 14;
  const contentWidth = PAGE_W - MARGIN * 2;

  const { incomeRows, expenseRows, totalIncome, totalExpense } = buildCategoryBreakdown(transactions);
  const metrics = computeDashboardMetrics(transactions, dateFrom, dateTo, incomeRows, expenseRows, summary, transactions.length);

  // ── Portada
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PAGE_W, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CATAN PADEL CLUB', MARGIN, 12);
  doc.setFontSize(12);
  doc.text('Reporte Financiero', MARGIN, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`, MARGIN, 28);
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-AR')}`, MARGIN + 100, 28);

  let y = 42;

  // ── Resumen ejecutivo
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Resumen Ejecutivo', MARGIN, y);
  y += 6;

  const rowHeight = 20;
  const summaryBoxes = [
    { label: 'Total ingresos', value: formatUSD(summary.income), color: [16, 185, 129] },
    { label: 'Total egresos', value: formatUSD(summary.expense), color: [244, 63, 94] },
    { label: 'Balance neto', value: formatUSD(summary.balance), color: summary.balance >= 0 ? [16, 185, 129] : [249, 115, 22] },
    { label: 'Movimientos', value: String(transactions.length), color: [79, 70, 229] },
  ];
  const boxW = (contentWidth - 12) / 4;
  summaryBoxes.forEach((item, index) => {
    const x = MARGIN + index * (boxW + 4);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, boxW, rowHeight, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), x + 3, y + 6);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...item.color);
    doc.text(item.value, x + 3, y + 15);
  });

  y += rowHeight + 10;

  // ── Nuevos KPIs
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('KPIs del Período', MARGIN, y);
  y += 6;

  const kpiBoxes = [
    { label: 'Mayor ingreso', value: metrics.topIncomeCategory?.name ?? 'Sin datos', sub: metrics.topIncomeCategory ? formatUSD(metrics.topIncomeCategory.total) : '' },
    { label: 'Mayor egreso', value: metrics.topExpenseCategory?.name ?? 'Sin datos', sub: metrics.topExpenseCategory ? formatUSD(metrics.topExpenseCategory.total) : '' },
    { label: 'Día con más ingresos', value: metrics.bestIncomeDay ? fmtDate(metrics.bestIncomeDay) : 'Sin datos', sub: metrics.bestIncomeAmount ? formatUSD(metrics.bestIncomeAmount) : '' },
    { label: 'Día con más egresos', value: metrics.bestExpenseDay ? fmtDate(metrics.bestExpenseDay) : 'Sin datos', sub: metrics.bestExpenseAmount ? formatUSD(metrics.bestExpenseAmount) : '' },
    { label: 'Promedio diario ingresos', value: formatUSD(metrics.avgDailyIncome), sub: `${metrics.periodDays} días` },
    { label: 'Promedio diario egresos', value: formatUSD(metrics.avgDailyExpense), sub: `${metrics.periodDays} días` },
  ];
  const kpiBoxW = (contentWidth - 8) / 3;
  kpiBoxes.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = MARGIN + col * (kpiBoxW + 4);
    const boxY = y + row * 28;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, boxY, kpiBoxW, 24, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + 3, boxY + 6);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, x + 3, boxY + 15);
    if (item.sub) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(item.sub, x + 3, boxY + 21);
    }
  });

  y += 56;
  doc.addPage();

  // ── Gráficos y top categorías
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Gráficos', MARGIN, 14);

  const pieIncomeImage = generatePieChartDataURL(incomeRows, { width: 260, height: 220 });
  const pieExpenseImage = generatePieChartDataURL(expenseRows, { width: 260, height: 220 });
  const comparisonImage = generateBarChartDataURL(summary.income, summary.expense, { width: 340, height: 220 });

  doc.addImage(pieIncomeImage, 'PNG', MARGIN, 18, 92, 92);
  doc.text('Ingresos', MARGIN, 112);
  doc.addImage(pieExpenseImage, 'PNG', MARGIN + 98, 18, 92, 92);
  doc.text('Egresos', MARGIN + 98, 112);
  doc.addImage(comparisonImage, 'PNG', MARGIN, 124, contentWidth, 60);
  doc.text('Ingresos vs Egresos', MARGIN, 121);

  let sectionY = 190;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Top Categorías', MARGIN, sectionY);
  sectionY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const renderTopRows = (rows, startX) => {
    rows.slice(0, 3).forEach((row, index) => {
      const yPos = sectionY + 8 + index * 10;
      doc.setFillColor(row.color ? hexToRgb(row.color) : [148, 163, 184]);
      doc.rect(startX, yPos - 6, 4, 4, 'F');
      doc.setTextColor(15, 23, 42);
      doc.text(`${index + 1}. ${row.name}`, startX + 8, yPos - 1);
      doc.setTextColor(100, 116, 139);
      doc.text(`${formatUSD(row.total)} · ${row.pct}%`, startX + 8, yPos + 5);
    });
  };

  doc.setFont('helvetica', 'bold');
  doc.text('Top ingresos', MARGIN, sectionY + 3);
  doc.text('Top egresos', MARGIN + contentWidth / 2 + 4, sectionY + 3);
  doc.setFont('helvetica', 'normal');
  renderTopRows(incomeRows, MARGIN);
  renderTopRows(expenseRows, MARGIN + contentWidth / 2 + 4);

  sectionY += 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Análisis del Período', MARGIN, sectionY);
  sectionY += 6;
  const insightLines = buildInsights(metrics);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  insightLines.forEach((line, index) => {
    doc.text(`• ${line}`, MARGIN, sectionY + index * 6);
  });

  doc.addPage();

  // ── Desglose por categoría (ingresos y egresos)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Ingresos por categoría', MARGIN, 14);
  autoTable(doc, {
    startY: 18,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Categoría', 'Movimientos', 'Total', '% sobre ingresos']],
    body: incomeRows.map((r) => [r.name, r.count, formatUSD(r.total), `${r.pct}%`]),
    foot: [['TOTAL INGRESOS', '', formatUSD(totalIncome), '']],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 70 }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  let currentY = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Egresos por categoría', MARGIN, currentY);
  autoTable(doc, {
    startY: currentY + 4,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Categoría', 'Movimientos', 'Total', '% sobre egresos']],
    body: expenseRows.map((r) => [r.name, r.count, formatUSD(r.total), `${r.pct}%`]),
    foot: [['TOTAL EGRESOS', '', formatUSD(totalExpense), '']],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 70 }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  // ── Movimientos
  currentY = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Movimientos', MARGIN, currentY);

  autoTable(doc, {
    startY: currentY + 4,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Monto (USD)', 'Por']],
    body: transactions.map((t) => [
      fmtDate(t.date),
      t.concept,
      t.category,
      t.type,
      formatUSD(Number(t.amount_usd) || Number(t.amount) || 0),
      t.registered_by,
    ]),
    foot: [['', '', '', 'TOTAL INGRESOS', formatUSD(summary.income), ''], ['', '', '', 'TOTAL EGRESOS', formatUSD(summary.expense), ''], ['', '', '', 'BALANCE NETO', formatUSD(summary.balance), '']],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: { 0: { cellWidth: 22 }, 3: { cellWidth: 18 }, 4: { halign: 'right', cellWidth: 32 }, 5: { cellWidth: 18 } },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    showHead: 'everyPage',
    showFoot: 'lastPage',
  });

  // ── Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - MARGIN, 290, { align: 'right' });
    doc.text('CATAN PADEL CLUB — Reporte ejecutivo', MARGIN, 290);
  }

  doc.save(filename ?? `Catán_Padel_Reporte_${dateFrom}_${dateTo}.pdf`);
}
