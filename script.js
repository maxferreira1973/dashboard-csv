let rawData = [];
let filteredData = [];
let charts = {};

const fileInput = document.getElementById('fileInput');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const filterProduct = document.getElementById('filterProduct');
const filterRegion = document.getElementById('filterRegion');
const applyFiltersBtn = document.getElementById('applyFilters');

const exportPdfBtn = document.getElementById('exportPdfBtn');
if (exportPdfBtn) {
  exportPdfBtn.addEventListener('click', () => {
    window.print(); // abre o diálogo de impressão do Chrome
  });
}


fileInput.addEventListener('change', handleFileUpload);
applyFiltersBtn.addEventListener('click', applyFilters);

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    rawData = parseCSV(text);
    filteredData = [...rawData];
    populateFilters(rawData);
    updateAll();
  };

  reader.readAsText(file, 'utf-8');
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  // seu CSV usa vírgula como separador
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());

  const dateIdx = header.indexOf('date');
  const productIdx = header.indexOf('product');
  const regionIdx = header.indexOf('region');
  const unitsIdx = header.indexOf('units_sold'); // nome exato do CSV
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

  filterProduct.innerHTML = '<option value="">Todos</option>' +
    products.map(p => `<option value="${p}">${p}</option>`).join('');

  filterRegion.innerHTML = '<option value="">Todas</option>' +
    regions.map(r => `<option value="${r}">${r}</option>`).join('');

  // datas mín e máx
  const dates = data.map(d => d.date).sort();
  if (dates.length > 0) {
    startDateInput.value = dates[0];
    endDateInput.value = dates[dates.length - 1];
  }
}

function applyFilters() {
  if (!rawData || rawData.length === 0) return;

  const start = startDateInput.value ? new Date(startDateInput.value) : null;
  const end = endDateInput.value ? new Date(endDateInput.value) : null;
  const prod = filterProduct.value;
  const reg = filterRegion.value;

  filteredData = rawData.filter(d => {
    const dDate = new Date(d.date);
    if (start && dDate < start) return false;
    if (end && dDate > end) return false;
    if (prod && d.product !== prod) return false;
    if (reg && d.region !== reg) return false;
    return true;
  });

  updateAll();
}

function updateAll() {
  updateKpis();
  updateCharts();
  updateTable();
}

function updateKpis() {
  const totalRevenue = filteredData.reduce((sum, d) => sum + d.revenue, 0);
  const totalProfit = filteredData.reduce((sum, d) => sum + d.profit, 0);
  const avgMargin = filteredData.length > 0
    ? filteredData.reduce((sum, d) => sum + d.margin, 0) / filteredData.length
    : 0;

  document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
  document.getElementById('totalProfit').textContent = formatCurrency(totalProfit);
  document.getElementById('avgMargin').textContent = avgMargin.toFixed(2) + '%';
}

function updateCharts() {
  updateRevenueByMonthChart();
  updateRevenueByProductChart();
  updateRevenueByRegionChart();
}

function groupByMonth(data) {
  const map = new Map();
  data.forEach(d => {
    const month = d.date.slice(0, 7); // YYYY-MM
    map.set(month, (map.get(month) || 0) + d.revenue);
  });
  const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return {
    labels: entries.map(e => e[0]),
    values: entries.map(e => e[1])
  };
}

function groupByKey(data, key) {
  const map = new Map();
  data.forEach(d => {
    const k = d[key];
    map.set(k, (map.get(k) || 0) + d.revenue);
  });
  const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return {
    labels: entries.map(e => e[0]),
    values: entries.map(e => e[1])
  };
}

function updateRevenueByMonthChart() {
  const ctx = document.getElementById('revenueByMonth').getContext('2d');
  const grouped = groupByMonth(filteredData);

  if (charts.revenueByMonth) {
    charts.revenueByMonth.destroy();
  }

  charts.revenueByMonth = new Chart(ctx, {
    type: 'line',
    data: {
      labels: grouped.labels,
      datasets: [{
        label: 'Receita',
        data: grouped.values,
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.15)',
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => formatCurrency(value)
          }
        }
      }
    }
  });
}

function updateRevenueByProductChart() {
  const ctx = document.getElementById('revenueByProduct').getContext('2d');
  const grouped = groupByKey(filteredData, 'product');

  if (charts.revenueByProduct) {
    charts.revenueByProduct.destroy();
  }

  charts.revenueByProduct = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: grouped.labels,
      datasets: [{
        label: 'Receita',
        data: grouped.values,
        backgroundColor: 'rgba(46, 125, 50, 0.7)'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => formatCurrency(value)
          }
        }
      }
    }
  });
}

function updateRevenueByRegionChart() {
  const ctx = document.getElementById('revenueByRegion').getContext('2d');
  const grouped = groupByKey(filteredData, 'region');

  if (charts.revenueByRegion) {
    charts.revenueByRegion.destroy();
  }

  charts.revenueByRegion = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: grouped.labels,
      datasets: [{
        label: 'Receita',
        data: grouped.values,
        backgroundColor: 'rgba(255, 143, 0, 0.8)'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => formatCurrency(value)
          }
        }
      }
    }
  });
}

function updateTable() {
  const tbody = document.querySelector('#salesTable tbody');
  tbody.innerHTML = '';

  filteredData.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.date}</td>
      <td>${row.product}</td>
      <td>${row.region}</td>
      <td>${row.units}</td>
      <td>${formatCurrency(row.revenue)}</td>
      <td>${formatCurrency(row.cost)}</td>
      <td>${formatCurrency(row.profit)}</td>
      <td>${row.margin.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2
  });
}
