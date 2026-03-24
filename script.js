// Script.js FINAL - versão limpa sem duplicatas
// Auto-load CSV + funcionalidade original completa

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
    exportPdfBtn: document.getElementById('exportPdfBtn')
  };

  let rawData = [];
  let charts = {};

  // Event listeners seguros
  if (els.fileInput) els.fileInput.addEventListener('change', handleFile);
  if (els.exportPdfBtn) els.exportPdfBtn.addEventListener('click', () => window.print());
  if (els.clearFiltersBtn) els.clearFiltersBtn.addEventListener('click', clearFilters);
  ['startDateEl', 'endDateEl', 'productFilterEl', 'regionFilterEl'].forEach(key => {
    if (els[key]) els[key].addEventListener('change', renderAll);
  });

  // Auto-load CSV
  window.addEventListener('load', loadCsv);

  function loadCsv() {
    fetch('sales_data_example.csv')
      .then(r => r.text())
      .then(parseCSV)
      .then(data => {
        rawData = data;
        if (els.fileNameSpan) els.fileNameSpan.textContent = 'sales_data_example.csv (auto)';
        populateFilters(data);
        renderAll();
      })
      .catch(() => {
        if (els.fileNameSpan) els.fileNameSpan.textContent = 'Carregue CSV manualmente';
      });
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (els.fileNameSpan) els.fileNameSpan.textContent = file.name;

    const reader = new FileReader();
    reader.onload = evt => {
      rawData = parseCSV(evt.target.result);
      populateFilters(rawData);
      renderAll();
    };
    reader.readAsText(file);
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length <= 1) return [];

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const idx = {
      date: header.indexOf('date'),
      product: header.indexOf('product'),
      region: header.indexOf('region'),
      units: header.indexOf('units_sold'),
      revenue: header.indexOf('revenue'),
      cost: header.indexOf('cost')
    };

    return lines.slice(1).map(line => {
      const cols = line.split(',');
      const revenue = parseFloat(cols[idx.revenue] || 0);
      const cost = parseFloat(cols[idx.cost] || 0);
      const profit = revenue - cost;
      const margin = revenue ? profit / revenue : 0;

      return {
        date: cols[idx.date]?.trim(),
        product: cols[idx.product]?.trim(),
        region: cols[idx.region]?.trim(),
        units: parseFloat(cols[idx.units] || 0),
        revenue, cost, profit, margin
      };
    });
  }

  function populateFilters(data) {
    if (!els.productFilterEl || !els.regionFilterEl) return;

    const products = [...new Set(data.map(d => d.product))].sort();
    const regions = [...new Set(data.map(d => d.region))].sort();

    els.productFilterEl.innerHTML = '<option value="">Todos</option>' + products.map(p => `<option value="${p}">${p}</option>`).join('');
    els.regionFilterEl.innerHTML = '<option value="">Todas</option>' + regions.map(r => `<option value="${r}">${r}</option>`).join('');
  }

  function clearFilters() {
    Object.values(els).forEach(el => {
      if (el && el.tagName === 'INPUT' && el.type === 'date') el.value = '';
      if (el && el.tagName === 'SELECT') el.value = '';
    });
    renderAll();
  }

  function getFilteredData() {
    if (!rawData.length) return [];

    const start = els.startDateEl?.value ? new Date(els.startDateEl.value) : null;
    const end = els.endDateEl?.value ? new Date(els.endDateEl.value) : null;
    const product = els.productFilterEl?.value || '';
    const region = els.regionFilterEl?.value || '';

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
    if (!els.totalRevenueEl || !els.totalProfitEl || !els.avgMarginEl) return;

    const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
    const totalProfit = data.reduce((s, d) => s + d.profit, 0);
    const avgMargin = data.length ? data.reduce((s, d) => s + d.margin, 0) / data.length : 0;

    els.totalRevenueEl.textContent = totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    els.totalProfitEl.textContent = totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    els.avgMarginEl.textContent = (avgMargin * 100).toFixed(1) + '%';
  }

  function renderTable(data) {
    if (!els.tableBody) return;

    els.tableBody.innerHTML = data.map(d => `
      <tr>
        <td>${d.date}</td>
        <td>${d.product}</td>
        <td>${d.region}</td>
        <td>${d.units.toLocaleString('pt-BR')}</td>
        <td>${d.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td>${d.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td>${d.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        <td>${(d.margin * 100).toFixed(1)}%</td>
      </tr>
    `).join('');
  }

  function renderCharts(data) {
    if (!data.length) return;

    const canvases = {
      revenueByDateChart: document.getElementById('revenueByDateChart'),
      revenueByProductChart: document.getElementById('revenueByProductChart'),
      revenueByRegionChart: document.getElementById('revenueByRegionChart')
    };

    const byDate = aggregate(data, 'date');
    const byProduct = aggregate(data, 'product');
    const byRegion = aggregate(data, 'region');

    if (canvases.revenueByDateChart) {
      new Chart(canvases.revenueByDateChart, {
        type: 'line',
        data: { labels: Object.keys(byDate), datasets: [{ label: 'Receita', data: Object.values(byDate), borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.3)', tension: 0.2 }] },
        options: { responsive: true }
      });
    }

    if (canvases.revenueByProductChart) {
      new Chart(canvases.revenueByProductChart, {
        type: 'bar',
        data: { labels: Object.keys(byProduct), datasets: [{ label: 'Receita', data: Object.values(byProduct), backgroundColor: 'rgba(56, 189, 248, 0.6)' }] },
        options: { responsive: true }
      });
    }

    if (canvases.revenueByRegionChart) {
      new Chart(canvases.revenueByRegionChart, {
        type: 'bar',
        data: { labels: Object.keys(byRegion), datasets: [{ label: 'Receita', data: Object.values(byRegion), backgroundColor: 'rgba(56, 189, 248, 0.6)' }] },
        options: { responsive: true }
      });
    }
  }

  function aggregate(data, key) {
    return data.reduce((acc, d) => {
      acc[d[key]] = (acc[d[key]] || 0) + d.revenue;
      return acc;
    }, {});
  }
})();
