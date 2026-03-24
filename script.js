// Limpa variáveis anteriores se existirem
if (typeof rawData !== 'undefined') {
  delete window.rawData;
}
if (typeof charts !== 'undefined') {
  delete window.charts;
}

let rawData = [];
let charts = {};

// Elementos da página (com proteção contra null)
const fileInput = document.getElementById('csvFile');
const fileNameSpan = document.getElementById('fileName');
const totalRevenueEl = document.getElementById('totalRevenue');
const totalProfitEl = document.getElementById('totalProfit');
const avgMarginEl = document.getElementById('avgMargin');
const startDateEl = document.getElementById('startDate');
const endDateEl = document.getElementById('endDate');
const productFilterEl = document.getElementById('productFilter');
const regionFilterEl = document.getElementById('regionFilter');
const clearFiltersBtn = document.getElementById('clearFilters');
const tableBody = document.querySelector('#salesTable tbody');

// Upload manual (se o input existir)
if (fileInput) {
  fileInput.addEventListener('change', handleFileUpload);
}

// Filtros (se existirem)
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', clearFilters);
}
if (startDateEl) startDateEl.addEventListener('change', renderAll);
if (endDateEl) endDateEl.addEventListener('change', renderAll);
if (productFilterEl) productFilterEl.addEventListener('change', renderAll);
if (regionFilterEl) regionFilterEl.addEventListener('change', renderAll);

// Carrega CSV padrão automaticamente
window.addEventListener('load', loadDefaultCsv);

// -------------------- Carregamento automático do CSV --------------------

function loadDefaultCsv() {
  const csvPath = 'sales_data_example.csv';
  
  fetch(csvPath)
    .then(response => {
      if (!response.ok) {
        throw new Error(`CSV não encontrado: ${response.status}`);
      }
      return response.text();
    })
    .then(text => {
      rawData = parseCSV(text);
      if (fileNameSpan) {
        fileNameSpan.textContent = csvPath + ' (auto)';
      }
      populateFilters(rawData);
      renderAll();
    })
    .catch(err => {
      console.error('Erro CSV:', err);
      if (fileNameSpan) {
        fileNameSpan.textContent = 'Carregue CSV manualmente';
      }
    });
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (fileNameSpan) {
    fileNameSpan.textContent = file.name;
  }

  const reader = new FileReader();
  reader.onload = e => {
    rawData = parseCSV(e.target.result);
    populateFilters(rawData);
    renderAll();
  };
  reader.readAsText(file, 'utf-8');
}

// -------------------- Parsing CSV --------------------

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const dateIdx = header.indexOf('date');
  const productIdx = header.indexOf('product');
  const regionIdx = header.indexOf('region');
  const unitsIdx = header.indexOf('units_sold');
  const revenueIdx = header.indexOf('revenue');
  const costIdx = header.indexOf('cost');

  return lines.slice(1).map(line => {
    const cols = line.split(',');
    const date = cols[dateIdx]?.trim();
    const product = cols[productIdx]?.trim();
    const region = cols[regionIdx]?.trim();
    const units = parseFloat(cols[unitsIdx] || 0);
    const revenue = parseFloat(cols[revenueIdx] || 0);
    const cost = parseFloat(cols[costIdx] || 0);
    const profit = revenue - cost;
    const margin = revenue ? profit / revenue : 0;

    return { date, product, region, units, revenue, cost
