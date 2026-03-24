// Script.js COMPLETO - Dashboard CSV com auto-load
// Funcionalidades: 
// - Carrega sales_data_example.csv automaticamente
// - Upload manual opcional
// - Filtros de data/produto/região
// - KPIs, gráficos Chart.js, export PDF
// - Protegido contra elementos HTML ausentes

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
const exportPdfBtn = document.getElementById('exportPdfBtn');

// Estado em memória
let rawData = [];
let charts = {};

// Nome do CSV padrão (deve estar na raiz junto com index.html)
const DEFAULT_CSV_PATH = 'sales_data_example.csv';

// -------------------- Event Listeners (protegidos) --------------------

// Upload manual
if (fileInput) {
  fileInput.addEventListener('change', handleFileUpload);
}

// Export PDF
if (exportPdfBtn) {
  exportPdfBtn.addEventListener('click', () => {
    window.print();
  });
}

// Filtros
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', clearFilters);
}
if (startDateEl) startDateEl.addEventListener('change', renderAll);
if (endDateEl) endDateEl.addEventListener('change', renderAll);
if (productFilterEl) productFilterEl.addEventListener('change', renderAll);
if (regionFilterEl) regionFilterEl.addEventListener('change', renderAll);

// Auto-load CSV
window.addEventListener('load', loadDefaultCsv);

// -------------------- Carregamento CSV --------------------

function loadDefaultCsv() {
  fetch(DEFAULT_CSV_PATH)
    .then(response => {
      if (!response.ok) {
        throw new Error(`CSV não encontrado: ${response.status}`);
      }
      return response.text();
    })
    .then(text => {
      rawData = parseCSV(text);
      if (fileNameSpan) {
        fileNameSpan.textContent = DEFAULT_CSV_PATH + ' (auto)';
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

    return { date, product, region, units, revenue, cost, profit, margin };
  });
}

// -------------------- Filtros --------------------

function populateFilters(data) {
  if (!productFilterEl || !regionFilterEl) return;

  const products = Array.from(new Set(data.map(d => d.product))).sort();
  const regions = Array.from(new Set(data.map(d => d.region))).sort();

  productFilterEl.innerHTML = '<option value="">Todos</option>' +
    products.map(p => `<option value="${p}">${p}</option>`).join('');

  regionFilterEl.innerHTML = '<option value="">Todas</option>' +
    regions.map(r => `<option value="${r}">${r}</option>`).join('');
}

function clearFilters() {
  if (startDateEl) startDateEl.value = '';
  if (endDateEl) endDateEl.value = '';
  if (productFilterEl) productFilterEl.value = '';
  if (regionFilterEl) regionFilterEl.value = '';
  renderAll();
}

function getFilteredData() {
  if (!rawData.length) return [];

  const start = startDateEl && startDateEl.value ? new Date(startDateEl.value) : null;
  const end = endDateEl && endDateEl.value ? new Date(endDateEl.value) : null;
  const product = productFilterEl ? productFilterEl.value : '';
  const region = regionFilterEl ? regionFilterEl.value : '';

  return rawData.filter(d => {
    const dDate = new Date(d.date);
    if (start && dDate < start) return false;
    if (end && dDate > end) return false;
    if (product && d.product !== product) return false;
    if (region && d.region !== region) return false;
    return true;
  });
}

// -------------------- Renderização --------------------

function renderAll() {
  const data = getFilteredData();
  renderKPIs(data);
  renderTable(data);
  renderCharts(data);
}

function renderKPIs(data) {
  if (!totalRevenueEl || !totalProfitEl || !avgMarginEl) return;

  const totalRevenue = data.reduce((acc, d) => acc + d.revenue, 0);
  const totalProfit = data.reduce((acc, d) => acc + d.profit, 0);
  const avgMargin = data.length ? data.reduce((acc, d) => acc + d.margin, 0) / data.length : 0;

  totalRevenueEl.textContent = totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  totalProfitEl.textContent = totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  avgMarginEl.textContent = (avgMargin * 100).toFixed(1) + ' %';
}

function renderTable(data) {
  if (!tableBody) return;

  tableBody.innerHTML = data.map(d => `
    <tr>
      <td>${d.date}</td>
      <td>${d.product}</td>
      <td>${d.region}</td>
      <td>${d.units.toLocaleString('pt-BR')}</td>
      <td>${d.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      <td>${d.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      <td>${d.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      <td>${(d.margin * 100).toFixed(1)} %</td>
    </tr>
  `).join('');
}

function renderCharts(data) {
  if (!data.length) {
    Object.values(charts).forEach(c => c && c.destroy());
    charts = {};
    return;
  }

  const byDate = aggregate(data, 'date');
  const byProduct = aggregate(data, 'product');
  const byRegion = aggregate(data, 'region');

  const dateCanvas = document.getElementById('revenueByDateChart');
  const productCanvas = document.getElementById('revenueByProductChart');
  const regionCanvas = document.getElementById('revenueByRegionChart');

  if (dateCanvas) {
    charts.revenueByDate = createOrUpdateChart(charts.revenueByDate, dateCanvas, 'line', Object.keys(byDate), Object.values(byDate), 'Receita');
  }
  if (productCanvas) {
    charts.revenueByProduct = createOrUpdateChart(charts.revenueByProduct, productCanvas, 'bar', Object.keys(byProduct), Object.values(byProduct), 'Receita');
  }
  if (regionCanvas) {
    charts.revenueByRegion = createOrUpdateChart(charts.revenueByRegion, regionCanvas, 'bar', Object.keys(byRegion), Object.values(byRegion), 'Receita');
  }
}

function aggregate(data, key) {
  return data.reduce((acc, d) => {
    const k = d[key];
    acc[k] = (acc[k] || 0) + d.revenue;
    return acc;
  }, {});
}

function createOrUpdateChart(chart, canvas, type, labels, values, label) {
  const ctx = canvas.getContext('2d');

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
    return chart;
  }

  return new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: '#38bdf8',
        backgroundColor: type === 'line' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.6)',
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: '#e5e7eb' }
        }
      },
      scales: {
        x: { ticks: { color: '#9ca3af' }, grid: { color: '#111827' } },
        y: { ticks: { color: '#9ca3af' }, grid: { color: '#111827' } }
      }
    }
  });
}
```
