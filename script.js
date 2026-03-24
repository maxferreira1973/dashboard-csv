// SCRIPT DEFINITIVO COMPLETO - Gráficos originais + Insights funcionais
// Todas funcionalidades + insights acionáveis dinâmicos

(function() {
  'use strict';

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
    insightsSection: document.getElementById('insights-section'),
    insightsList: document.getElementById('insights-list'),
    canvases: {
      date: document.getElementById('revenueByDateChart'),
      product: document.getElementById('revenueByProductChart'),
      region: document.getElementById('revenueByRegionChart')
    }
  };

  let rawData = [];
  let charts = {};

  // Event listeners
  if (els.fileInput) els.fileInput.addEventListener('change', handleFile);
  if (els.exportPdfBtn) els.exportPdfBtn.addEventListener('click', () => window.print());
  if (els.clearFiltersBtn) els.clearFiltersBtn.addEventListener('click', clearFilters);
  ['startDateEl', 'endDateEl', 'productFilterEl', 'regionFilterEl'].forEach(key => {
    if (els[key]) els[key].addEventListener('change', renderAll);
  });

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
        if (els.fileNameSpan) els.fileNameSpan.textContent = 'Carregue manualmente';
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
    renderInsights(data);
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
    // Destroi gráficos antigos
    Object.values(charts).forEach(c => c?.destroy());
    charts = {};

    if (!data.length || !Chart) return;

    const byDate = aggregate(data, 'date');
    const byProduct = aggregate(data, 'product');
    const byRegion = aggregate(data, 'region');

    // Gráfico linha por data (ORIGINAL)
    if (els.canvases.date) {
      const sortedDates = Object.keys(byDate).sort();
      charts.date = new Chart(els.canvases.date, {
        type: 'line',
        data: { 
          labels: sortedDates, 
          datasets: [{ 
            label: 'Receita', 
            data: sortedDates.map(date => byDate[date]), 
            borderColor: '#38bdf8', 
            backgroundColor: 'rgba(56, 189, 248, 0.3)', 
            tension: 0.2 
          }] 
        },
        options: { responsive: true }
      });
    }

    // Gráfico barras por produto (ORIGINAL)
    if (els.canvases.product) {
      charts.product = new Chart(els.canvases.product, {
        type: 'bar',
        data: { 
          labels: Object.keys(byProduct), 
          datasets: [{ 
            label: 'Receita', 
            data: Object.values(byProduct), 
            backgroundColor: 'rgba(56, 189, 248, 0.6)' 
          }] 
        },
        options: { responsive: true }
      });
    }

    // Gráfico barras por região (ORIGINAL)
    if (els.canvases.region) {
      charts.region = new Chart(els.canvases.region, {
        type: 'bar',
        data: { 
          labels: Object.keys(byRegion), 
          datasets: [{ 
            label: 'Receita', 
            data: Object.values(byRegion), 
            backgroundColor: 'rgba(56, 189, 248, 0.6)' 
          }] 
        },
        options: { responsive: true }
      });
    }
  }

  function renderInsights(data) {
    if (!els.insightsList || !data.length) {
      if (els.insightsList) els.insightsList.innerHTML = '<p class="text-gray-500 italic">Aplique filtros para ver insights</p>';
      return;
    }

    const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
    const avgMargin = data.reduce((s, d) => s + d.margin, 0) / data.length;
    const byProduct = aggregate(data, 'product');
    const byRegion = aggregate(data, 'region');
    const lowMarginProducts = data.filter(d => d.margin < 0.15).slice(0, 3);
    const avgUnits = data.reduce((s, d) => s + d.units, 0) / data.length;

    const topProduct = Object.entries(byProduct).sort(([,a], [,b]) => b - a)[0];
    const topRegion = Object.entries(byRegion).sort(([,a], [,b]) => b - a)[0];

    els.insightsList.innerHTML = `
      <div class="bg-white p-4 rounded-xl shadow-md border-l-4 border-emerald-500">
        <h4 class="font-bold text-lg text-emerald-800 mb-2">🏆 TOP Performers</h4>
        <p><strong>${topProduct[0]}:</strong> R$${topProduct[1].toLocaleString('pt-BR')} (${((topProduct[1]/totalRevenue)*100).toFixed(1)}% receita)</p>
        <p><strong>${topRegion[0]}:</strong> R$${topRegion[1].toLocaleString('pt-BR')} (${((topRegion[1]/totalRevenue)*100).toFixed(1)}% vendas)</p>
      </div>

      <div class="bg-white p-4 rounded-xl shadow-md border-l-4 border-orange-500">
        <h4 class="font-bold text-lg text-orange-800 mb-2">⚠️ Alertas Críticos</h4>
        ${lowMarginProducts.length ? lowMarginProducts.map(p => `<p>• ${p.product}: ${(p.margin*100).toFixed(1)}% margem</p>`).join('') : '<p>Nenhum produto em risco</p>'}
        <p>Média unidades/dia: ${avgUnits.toFixed(1)} ${avgUnits < 4 ? '(abaixo meta)' : '(OK)'}</p>
      </div>

      <div class="bg-white p-4 rounded-xl shadow-md border-l-4 border-blue-500 md:col-span-2">
        <h4 class="font-bold text-lg text-blue-800 mb-2">🚀 Ações Imediatas</h4>
        <ul class="list-disc pl-5 space-y-1 text-sm">
          <li>Foco ${topRegion[0]}: ${((topRegion[1]/totalRevenue)*100).toFixed(0)}% receita</li>
          <li>${avgMargin < 0.2 ? 'Melhorar' : 'Manter'} margem média ${avgMargin.toFixed(1)}%</li>
          <li>${lowMarginProducts.length ? `Corrigir ${lowMarginProducts.length} produtos baixa margem` : 'Margens OK'}</li>
          <li>${data.length < 50 ? 'Expandir amostra dados' : 'Dashboard completo'}</li>
        </ul>
      </div>
    `;
  }

  function aggregate(data, key) {
    return data.reduce((acc, d) => {
      acc[d[key]] = (acc[d[key]] || 0) + d.revenue;
      return acc;
    }, {});
  }
})();
