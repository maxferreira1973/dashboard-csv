// SCRIPT COMPLETO - Filtros + Gráficos funcionando perfeitamente
// Gráficos destroem/recuperam a cada filtro - sem erros 404 ou duplicatas

(function() {
  'use strict';

  // Elementos DOM
  const els = {
    fileInput: document.getElementById('csvFile'),
    fileNameSpan: document.getElementById('fileName'),
    totalRevenueEl: document.getElementById('totalRevenue'),
    totalProfitEl: document.getElementById('totalProfit'),
    avgMarginEl: document.getElementById('avgMargin'),
    startDateEl: document.getElementById('startDate'),
    endDateEl: document.getElementById('endDate'),
    productFilterEl: document.getElementById('productFilter'),
    regionFilterEl: document.getElementById('regionFilter'),
    clearFiltersBtn: document.getElementById('clearFilters'),
    tableBody: document.querySelector('#salesTable tbody'),
    exportPdfBtn: document.getElementById('exportPdfBtn'),
    canvases: {
      date: document.getElementById('revenueByDateChart'),
      product: document.getElementById('revenueByProductChart'),
      region: document.getElementById('revenueByRegionChart')
    }
  };

  let rawData = [];
  let charts = {}; // Armazena instâncias dos gráficos

  // Event listeners seguros
  if (els.fileInput) els.fileInput.addEventListener('change', handleFile);
  if (els.exportPdfBtn) els.exportPdfBtn.addEventListener('click', () => window.print());
  if (els.clearFiltersBtn) els.clearFiltersBtn.addEventListener('click', clearFilters);

  ['startDateEl', 'endDateEl', 'productFilterEl', 'regionFilterEl'].forEach(key => {
    if (els[key]) els[key].addEventListener('change', renderAll);
  });

  // Auto-load CSV ao carregar página
  window.addEventListener('load', loadCsv);

  function loadCsv() {
    fetch('sales_data_example.csv')
      .then(r => r.text())
      .then(parseCSV)
      .then(data => {
        rawData = data;
        if (els.fileNameSpan) els.fileNameSpan.textContent = 'sales_data_example.csv (auto-carregado)';
        populateFilters(data);
        renderAll();
      })
      .catch(err => {
        console.warn('CSV não encontrado:', err);
        if (els.fileNameSpan) els.fileNameSpan.textContent = 'Carregue CSV manualmente';
      });
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (els.fileNameSpan) els.fileNameSpan.textContent = `Carregado: ${file.name}`;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        rawData = parseCSV(evt.target.result);
        populateFilters(rawData);
        renderAll();
      } catch (err) {
        console.error('Erro ao parsear CSV:', err);
      }
    };
    reader.readAsText(file);
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error('CSV inválido');

    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const idx = {
      date: header.indexOf('date'),
      product: header.indexOf('product'),
      region: header.indexOf('region'),
      units: header.findIndex(h => h.includes('units')),
      revenue: header.findIndex(h => h.includes('revenue')),
      cost: header.findIndex(h => h.includes('cost'))
    };

    return lines.slice(1).map(line => {
      const cols = line.split(',');
      const revenue = parseFloat(cols[idx.revenue] || 0);
      const cost = parseFloat(cols[idx.cost] || 0);
      const profit = revenue - cost;
      const margin = revenue ? (profit / revenue) : 0;

      return {
        date: cols[idx.date]?.trim() || '',
        product: cols[idx.product]?.trim() || 'Desconhecido',
        region: cols[idx.region]?.trim() || 'Desconhecida',
        units: parseFloat(cols[idx.units] || 0),
        revenue, cost, profit, margin
      };
    }).filter(d => d.revenue > 0);
  }

  function populateFilters(data) {
    if (!els.productFilterEl || !els.regionFilterEl) return;

    const products = [...new Set(data.map(d => d.product))].sort();
    const regions = [...new Set(data.map(d => d.region))].sort();

    els.productFilterEl.innerHTML = '<option value="">Todos os produtos</option>' + 
      products.map(p => `<option value="${p}">${p}</option>`).join('');

    els.regionFilterEl.innerHTML = '<option value="">Todas as regiões</option>' + 
      regions.map(r => `<option value="${r}">${r}</option>`).join('');
  }

  function clearFilters() {
    if (els.startDateEl) els.startDateEl.value = '';
    if (els.endDateEl) els.endDateEl.value = '';
    if (els.productFilterEl) els.productFilterEl.value = '';
    if (els.regionFilterEl) els.regionFilterEl.value = '';
    renderAll();
  }

  function getFilteredData() {
    if (!rawData.length) return [];

    const startDate = els.startDateEl?.value ? new Date(els.startDateEl.value) : null;
    const endDate = els.endDateEl?.value ? new Date(els.endDateEl.value) : null;
    const selectedProduct = els.productFilterEl?.value || '';
    const selectedRegion = els.regionFilterEl?.value || '';

    return rawData.filter(row => {
      const rowDate = new Date(row.date);

      // Filtro data inicial
      if (startDate && rowDate < startDate) return false;

      // Filtro data final
      if (endDate && rowDate > endDate) return false;

      // Filtro produto
      if (selectedProduct && row.product !== selectedProduct) return false;

      // Filtro região
      if (selectedRegion && row.region !== selectedRegion) return false;

      return true;
    });
  }

  function renderAll() {
    const filteredData = getFilteredData();
    renderKPIs(filteredData);
    renderTable(filteredData);
    renderCharts(filteredData);
  }

  function renderKPIs(data) {
    if (!els.totalRevenueEl || !els.totalProfitEl || !els.avgMarginEl) return;

    const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);
    const totalProfit = data.reduce((sum, row) => sum + row.profit, 0);
    const avgMargin = data.length ? data.reduce((sum, row) => sum + row.margin, 0) / data.length : 0;

    els.totalRevenueEl.textContent = totalRevenue.toLocaleString('pt-BR', { 
      style: 'currency', currency: 'BRL' 
    });
    els.totalProfitEl.textContent = totalProfit.toLocaleString('pt-BR', { 
      style: 'currency', currency: 'BRL' 
    });
    els.avgMarginEl.textContent = (avgMargin * 100).toFixed(1) + '%';
  }

  function renderTable(data) {
    if (!els.tableBody) return;

    if (!data.length) {
      els.tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px">Nenhum dado encontrado com os filtros aplicados</td></tr>';
      return;
    }

    els.tableBody.innerHTML = data.map(row => `
      <tr>
        <td>${row.date}</td>
        <td>${row.product}</td>
        <td>${row.region}</td>
        <td>${row.units.toLocaleString('pt-BR')}</td>
        <td>${row.revenue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
        <td>${row.cost.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
        <td>${row.profit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
        <td style="color: ${row.margin > 0 ? '#10b981' : '#ef4444'}">${(row.margin * 100).toFixed(1)}%</td>
      </tr>
    `).join('');
  }

  function renderCharts(data) {
    // DESTRÓI TODOS OS GRÁFICOS ANTERIORES
    Object.values(charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    charts = {};

    if (!data.length) return;

    // Dados agregados para gráficos
    const dataByDate = aggregate(data, 'date');
    const dataByProduct = aggregate(data, 'product');
    const dataByRegion = aggregate(data, 'region');

    // Gráfico por data (linha)
    if (els.canvases.date) {
      const sortedDates = Object.keys(dataByDate).sort();
      charts.date = new Chart(els.canvases.date, {
        type: 'line',
        data: {
          labels: sortedDates,
          datasets: [{
            label: 'Receita',
            data: sortedDates.map(date => dataByDate[date]),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // Gráfico por produto (barra)
    if (els.canvases.product) {
      charts.product = new Chart(els.canvases.product, {
        type: 'bar',
        data: {
          labels: Object.keys(dataByProduct),
          datasets: [{
            label: 'Receita por Produto',
            data: Object.values(dataByProduct),
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
            borderColor: '#22c55e',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // Gráfico por região (doughnut)
    if (els.canvases.region) {
      charts.region = new Chart(els.canvases.region, {
        type: 'doughnut',
        data: {
          labels: Object.keys(dataByRegion),
          datasets: [{
            data: Object.values(dataByRegion),
            backgroundColor: [
              '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  }

  function aggregate(data, groupBy) {
    return data.reduce((acc, row) => {
      const key = row[groupBy];
      acc[key] = (acc[key] || 0) + row.revenue;
      return acc;
    }, {});
  }

  // Inicialização
  console.log('Dashboard inicializado - filtros e gráficos prontos!');
})();
