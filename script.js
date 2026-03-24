// Referências aos elementos da página
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

// Nome do CSV padrão hospedado junto com index.html
const DEFAULT_CSV_PATH = 'sales_data_example.csv';

// -------------------- Inicialização --------------------

// Substituição manual via input (se existir)
if (fileInput) {
  fileInput.addEventListener('change', handleFileUpload);
}

// Botão de exportar PDF (usa o diálogo nativo do navegador)
if (exportPdfBtn) {
  exportPdfBtn.addEventListener('click', () => {
    window.print();
  });
}

// Carrega automaticamente o CSV padrão quando a página abre
window.addEventListener('load', () => {
  loadDefaultCsv();
});

// Filtros
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener('click', () => {
    if (startDateEl) startDateEl.value = '';
    if (endDateEl) endDateEl.value = '';
    if (productFilterEl) productFilterEl.value = '';
    if (regionFilterEl) regionFilterEl.value = '';
    renderAll();
  });
}

[startDateEl, endDateEl, productFilterEl, regionFilterEl].forEach(el => {
  if (el) {
    el.addEventListener('change', renderAll);
  }
});

// -------------------- Carregamento de CSV --------------------

function loadDefaultCsv() {
  fetch(DEFAULT_CSV_PATH)
    .then(response => {
      if (!response.ok) {
        throw new Error('Erro ao carregar CSV padrão: ' + response.status);
      }
      return response.text();
    })
    .then(text => {
      rawData = parseCSV(text);
      if (fileNameSpan) {
        fileNameSpan.textContent = DEFAULT_CSV_PATH + ' (carregado automaticamente)';
      }
      populateFilters(rawData);
      renderAll();
    })
    .catch(err => {
      console.error(err);
      if (fileNameSpan) {
        fileNameSpan.textContent = 'Erro ao carregar ' + DEFAULT_CSV_PATH;
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
  reader.onload = function (e) {
    const text = e.target.result;
    rawData = parseCSV(text);
    populateFilters(rawData);
    renderAll();
  };
  reader.readAsText(file, 'utf-8');
}

// -------------------- Parsing do CSV --------------------

// CSV no formato: date,product,region,units_sold,revenue,cost
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

// -------------------- Filtros e renderização --------------------

function populateFilters(data) {
  if (!productFilterEl || !regionFilterEl) return;

  const products = Array.from(new Set(data.map(d => d.product))).sort();
  const regions = Array.from(new Set(data.map(d => d.region))).sort();

  productFilterEl.innerHTML =
    '<option value="">Todos</option>' +
    products.map(p => `<option value="${p}">${p}</option>`).join('');

  regionFilterEl.innerHTML =
    '<option value="">Todas</option>' +
    regions.map(r => `<option value="${r}">${r}</option>`).join('');
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

function renderAll() {
  const data = getFilteredData();
  renderKPIs(data);
  renderTable(data);
  renderCharts(data);
}

// -------------------- KPIs --------------------

function renderKPIs(data) {
  if (!totalRevenueEl || !totalProfitEl || !avgMarginEl) return;

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

// -------------------- Tabela --------------------

function renderTable(data) {
  if (!tableBody) return;

  tableBody.innerHTML = data
    .map(
      d => `
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
    `
    )
    .join('');
}

// -------------------- Gráficos (Chart.js) --------------------

function renderCharts(data) {
  if (!data.length) {
    Object.values(charts).forEach(c => c && c.destroy && c.destroy());
    charts = {};
    return;
  }

  const byDate = aggregateByKey(data, 'date');
  const byProduct = aggregateByKey(data, 'product');
  const byRegion = aggregateByKey(data, 'region');

  const revenueByDateCanvas = document.getElementById('revenueByDateChart');
  const revenueByProductCanvas = document.getElementById('revenueByProductChart');
  const revenueByRegionCanvas = document.getElementById('revenueByRegionChart');

  if (revenueByDateCanvas) {
    charts.revenueByDate = createOrUpdateChart(
      charts.revenueByDate,
      revenueByDateCanvas,
      'line',
      Object.keys(byDate),
      Object.values(byDate),
      'Receita por data'
    );
  }

  if (revenueByProductCanvas) {
    charts.revenueByProduct = createOrUpdateChart(
      charts.revenueByProduct,
      revenueByProductCanvas,
      'bar',
      Object.keys(byProduct),
      Object.values(byProduct),
      'Receita por produto'
    );
  }

  if (revenueByRegionCanvas) {
    charts.revenueByRegion = createOrUpdateChart(
      charts.revenueByRegion,
      revenueByRegionCanvas,
      'bar',
      Object.keys(byRegion),
      Object.values(byRegion),
      'Receita por região'
    );
  }
}

function aggregateByKey(data, key) {
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
      datasets: [
        {
          label,
          data: values,
          borderColor: '#38bdf8',
          backgroundColor:
            type === 'line'
              ? 'rgba(56, 189, 248, 0.3)'
              : 'rgba(56, 189, 248, 0.6)',
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#e5e7eb'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#9ca3af' },
          grid: { color: '#111827' }
        },
        y: {
          ticks: { color: '#9ca3af' },
          grid: { color: '#111827' }
        }
      }
    }
  });
}
