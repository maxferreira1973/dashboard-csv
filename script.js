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

let rawData = [];
let charts = {};

fileInput.addEventListener('change', handleFile);
clearFiltersBtn.addEventListener('click', () => {
  startDateEl.value = '';
  endDateEl.value = '';
  productFilterEl.value = '';
  regionFilterEl.value = '';
  renderAll();
});

[startDateEl, endDateEl, productFilterEl, regionFilterEl].forEach(el =>
  el.addEventListener('change', renderAll)
);

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  fileNameSpan.textContent = file.name;

  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    rawData = parseCSV(text);
    populateFilters(rawData);
    renderAll();
  };
  reader.readAsText(file, 'utf-8');
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());

  const dateIdx = header.indexOf('date');
  const productIdx = header.indexOf('product');
  const regionIdx = header.indexOf('region');
  const unitsIdx = header.indexOf('units_sold'); // nome correto do CSV
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

function populateFilters(data) {
  const products = Array.from(new Set(data.map(d => d.product))).sort();
  const regions = Array.from(new Set(data.map(d => d.region))).sort();

  productFilterEl.innerHTML = '<option value="">Todos</option>' +
    products.map(p => `<option value="${p}">${p}</option>`).join('');

  regionFilterEl.innerHTML = '<option value="">Todas</option>' +
    regions.map(r => `<option value="${r}">${r}</option>`).join('');
}

function getFilteredData() {
  if (!rawData.length) return [];

  const start = startDateEl.value ? new Date(startDateEl.value) : null;
  const end = endDateEl.value ? new Date(endDateEl.value) : null;
  const product = productFilterEl.value;
  const region = regionFilterEl.value;

  return rawData.filter(d => {
    const dDate = new Date(d.date);
    if (start && dDate < start) return false;
    if (end && dDate > end) return false;
    if (product && d.product !== product) return false;
    if (region && d.region !== region) return false;
    return true;
  });
}

function renderAll() {
  const data = getFilteredData();
  renderKPIs(data);
  renderTable(data);
  renderCharts(data);
}

function renderKPIs(data) {
  const totalRevenue = data.reduce((acc, d) => acc + d.revenue, 0);
  const totalProfit = data.reduce((acc, d) => acc + d.profit, 0);
  const avgMargin = data.length
    ? data.reduce((acc, d) => acc + d.margin, 0) / data.length
    : 0;

  totalRevenueEl.textContent = totalRevenue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  totalProfitEl.textContent = totalProfit.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
  avgMarginEl.textContent = (avgMargin * 100).toFixed(1) + ' %';
}

function renderTable(data) {
  tableBody.innerHTML = data
    .map(d => `
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
    `)
    .join('');
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

  charts.revenueByDate = createOrUpdateChart(
    charts.revenueByDate,
    document.getElementById('revenueByDateChart'),
    'line',
    Object.keys(byDate),
    Object.values(byDate),
    'Receita'
  );

  charts.revenueByProduct = createOrUpdateChart(
    charts.revenueByProduct,
    document.getElementById('revenueByProductChart'),
    'bar',
    Object.keys(byProduct),
    Object.values(byProduct),
    'Receita'
  );

  charts.revenueByRegion = createOrUpdateChart(
    charts.revenueByRegion,
    document.getElementById('revenueByRegionChart'),
    'bar',
    Object.keys(byRegion),
    Object.values(byRegion),
    'Receita'
  );
}

function aggregate(data, key) {
  return data.reduce((acc, d) => {
    const k = d[key];
    acc[k] = (acc[k] || 0) + d.revenue;
    return acc
