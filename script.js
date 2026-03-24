
<!--- SCRIPT.JS COMPLETO DEFINITIVO --->
<!--- COLE TODO no seu arquivo script.js --->
<!--- Funciona 100% com insights dinâmicos --->

(function() {
  'use strict';

  // DEBUG MODE
  console.log('%c🚀 DASHBOARD PRO INICIANDO...', 'color: #6366f1; font-size: 16px; font-weight: bold');

  // Cache DOM elements
  const elements = {
    csvUpload: document.getElementById('csvFile'),
    filenameDisplay: document.getElementById('fileName'),
    revenueTotal: document.getElementById('totalRevenue'),
    profitTotal: document.getElementById('totalProfit'),
    marginAvg: document.getElementById('avgMargin'),
    dateStart: document.getElementById('startDate'),
    dateEnd: document.getElementById('endDate'),
    filterProduct: document.getElementById('productFilter'),
    filterRegion: document.getElementById('regionFilter'),
    btnClearFilters: document.getElementById('clearFilters'),
    tableResults: document.querySelector('#salesTable tbody'),
    btnExportPDF: document.getElementById('exportPdfBtn'),

    // INSIGHTS - NOVO
    insightsContainer: document.getElementById('insights-section'),
    insightsContent: document.getElementById('insights-list'),

    // Charts
    chartDate: document.getElementById('revenueByDateChart'),
    chartProduct: document.getElementById('revenueByProductChart'),
    chartRegion: document.getElementById('revenueByRegionChart')
  };

  let rawDataset = [];
  let activeCharts = {};

  // Bind events
  Object.entries({
    csvUpload: 'change',
    btnClearFilters: 'click',
    btnExportPDF: 'click'
  }).forEach(([elKey, event]) => {
    if (elements[elKey]) {
      elements[elKey].addEventListener(event, handleEvent.bind(null, elKey));
    }
  });

  ['dateStart', 'dateEnd', 'filterProduct', 'filterRegion'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('change', refreshDashboard);
    }
  });

  // Auto-init
  window.addEventListener('load', initDashboard);

  function initDashboard() {
    console.log('📋 Verificando elementos DOM...', Object.values(elements).filter(Boolean).length, 'encontrados');

    loadDatasetAuto();
  }

  function loadDatasetAuto() {
    fetch('./sales_data_example.csv')
      .then(res => {
        if (!res.ok) throw new Error('CSV 404');
        return res.text();
      })
      .then(csv => {
        rawDataset = parseCSV(csv);
        if (elements.filenameDisplay) elements.filenameDisplay.textContent = 'sales_data_example.csv ✓';
        setupFilters(rawDataset);
        refreshDashboard();
      })
      .catch(err => {
        console.warn('📁 CSV auto-fail:', err.message);
        if (elements.filenameDisplay) elements.filenameDisplay.textContent = 'Clique para carregar CSV';
      });
  }

  function handleEvent(eventKey, e) {
    switch(eventKey) {
      case 'csvUpload':
        loadCSVFile(e.target.files[0]);
        break;
      case 'btnClearFilters':
        resetAllFilters();
        break;
      case 'btnExportPDF':
        window.print();
        break;
    }
  }

  function loadCSVFile(file) {
    if (!file) return;

    if (elements.filenameDisplay) elements.filenameDisplay.textContent = file.name;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        rawDataset = parseCSV(evt.target.result);
        setupFilters(rawDataset);
        refreshDashboard();
      } catch (ex) {
        console.error('CSV parse error:', ex);
      }
    };
    reader.readAsText(file);
  }

  function parseCSV(text) {
    const rows = text.split(/\r?\n/).filter(Boolean);
    if (rows.length < 2) throw new Error('CSV inválido');

    const headers = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
    const indexes = {
      date: headers.findIndex(h => h.includes('date')),
      product: headers.findIndex(h => h.includes('product')),
      region: headers.findIndex(h => h.includes('region')),
      units: headers.findIndex(h => h.includes('unit')),
      revenue: headers.findIndex(h => h.includes('revenue')),
      cost: headers.findIndex(h => h.includes('cost'))
    };

    return rows.slice(1).map((row, i) => {
      try {
        const cols = row.split(',');
        const revenue = parseFloat(cols[indexes.revenue]) || 0;
        const cost = parseFloat(cols[indexes.cost]) || 0;

        return {
          date: cols[indexes.date]?.trim() || `2024-01-0${i % 30 + 1}`,
          product: cols[indexes.product]?.trim() || 'Desconhecido',
          region: cols[indexes.region]?.trim() || 'N/A',
          units: parseFloat(cols[indexes.units]) || 0,
          revenue,
          cost,
          profit: revenue - cost,
          margin: revenue ? (revenue - cost) / revenue : 0
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  function setupFilters(dataset) {
    if (!elements.filterProduct || !elements.filterRegion) return;

    const products = [...new Set(dataset.map(d => d.product))].sort();
    const regions = [...new Set(dataset.map(d => d.region))].sort();

    elements.filterProduct.innerHTML = '<option value="">👑 Todos Produtos</option>' + 
      products.map(p => `<option value="${p}">${p}</option>`).join('');

    elements.filterRegion.innerHTML = '<option value="">🌍 Todas Regiões</option>' + 
      regions.map(r => `<option value="${r}">${r}</option>`).join('');

    console.log('✅ Filtros populados:', products.length, 'produtos,', regions.length, 'regiões');
  }

  function resetAllFilters() {
    [elements.dateStart, elements.dateEnd, elements.filterProduct, elements.filterRegion]
      .forEach(el => el && (el.value = ''));
    refreshDashboard();
  }

  function refreshDashboard() {
    const filtered = applyFilters(rawDataset);
    console.log('🔄 Refresh dashboard:', filtered.length, 'registros filtrados');

    updateMetrics(filtered);
    updateTable(filtered);
    updateVisuals(filtered);
    updateInsights(filtered);
  }

  function applyFilters(allData) {
    return allData.filter(row => {
      const rowDate = new Date(row.date);

      // Date filters
      const start = elements.dateStart?.value ? new Date(elements.dateStart.value) : null;
      const end = elements.dateEnd?.value ? new Date(elements.dateEnd.value) : null;
      if (start && rowDate < start) return false;
      if (end && rowDate > end) return false;

      // Category filters
      const prodFilter = elements.filterProduct?.value || '';
      const regFilter = elements.filterRegion?.value || '';
      if (prodFilter && row.product !== prodFilter) return false;
      if (regFilter && row.region !== regFilter) return false;

      return true;
    });
  }

  function updateMetrics(data) {
    if (!elements.revenueTotal || !elements.profitTotal || !elements.marginAvg) return;

    const totalRev = data.reduce((sum, r) => sum + r.revenue, 0);
    const totalProf = data.reduce((sum, r) => sum + r.profit, 0);
    const avgMarg = data.length ? data.reduce((sum, r) => sum + r.margin, 0) / data.length : 0;

    elements.revenueTotal.textContent = `R$ ${totalRev.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    elements.profitTotal.textContent = `R$ ${totalProf.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    elements.marginAvg.textContent = `${(avgMarg * 100).toFixed(1)}%`;
  }

  function updateTable(data) {
    if (!elements.tableResults) return;

    if (!data.length) {
      elements.tableResults.innerHTML = '<tr><td colspan="8" style="padding: 3rem; text-align: center; color: #6b7280; font-style: italic;">🔍 Nenhum resultado encontrado. Ajuste os filtros.</td></tr>';
      return;
    }

    elements.tableResults.innerHTML = data.slice(-50).map(row => `
      <tr class="hover:bg-gray-50">
        <td class="p-3">${row.date}</td>
        <td class="p-3 font-medium">${row.product}</td>
        <td class="p-3">${row.region}</td>
        <td class="p-3">${row.units}</td>
        <td class="p-3 font-mono">R$ ${row.revenue.toLocaleString('pt-BR')}</td>
        <td class="p-3 font-mono">R$ ${row.cost.toLocaleString('pt-BR')}</td>
        <td class="p-3 ${row.profit > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}">R$ ${row.profit.toLocaleString('pt-BR')}</td>
        <td class="p-3 ${row.margin > 0.25 ? 'text-green-600' : row.margin > 0.15 ? 'text-amber-600' : 'text-red-600'} font-bold">${(row.margin * 100).toFixed(1)}%</td>
      </tr>
    `).join('');
  }

  function updateVisuals(data) {
    // Cleanup charts
    Object.values(activeCharts).forEach(chart => chart?.destroy());
    activeCharts = {};

    if (!data.length) return;

    const dataByDate = groupByRevenue(data, 'date');
    const dataByProduct = groupByRevenue(data, 'product');
    const dataByRegion = groupByRevenue(data, 'region');

    // Chart 1: Revenue Trend
    if (elements.chartDate && Chart) {
      const sortedDates = Object.keys(dataByDate).sort();
      activeCharts.date = new Chart(elements.chartDate, {
        type: 'line',
        data: {
          labels: sortedDates,
          datasets: [{
            label: 'Receita (R$)',
            data: sortedDates.map(d => dataByDate[d]),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'top' } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // Chart 2: Product Breakdown
    if (elements.chartProduct && Chart) {
      activeCharts.product = new Chart(elements.chartProduct, {
        type: 'bar',
        data: {
          labels: Object.keys(dataByProduct),
          datasets: [{
            label: 'Receita por Produto (R$)',
            data: Object.values(dataByProduct),
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // Chart 3: Region Breakdown
    if (elements.chartRegion && Chart) {
      activeCharts.region = new Chart(elements.chartRegion, {
        type: 'doughnut',
        data: {
          labels: Object.keys(dataByRegion),
          datasets: [{
            data: Object.values(dataByRegion),
            backgroundColor: ['#8b5cf6', '#ec4899', '#f97316', '#eab308']
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  function updateInsights(data) {
    console.log('%c📊 INSIGHTS: Analisando', 'color: #10b981', data.length, 'registros');

    if (!elements.insightsContent) {
      console.error('%c❌ #insights-list NÃO encontrado', 'color: #ef4444; font-weight: bold');
      return;
    }

    if (!data.length) {
      elements.insightsContent.innerHTML = `
        <div class="col-span-full p-16 text-center rounded-3xl bg-gradient-to-r from-gray-50 to-gray-100 border-4 border-dashed border-gray-300">
          <div class="text-6xl mb-4">🔍</div>
          <h3 class="text-2xl font-bold text-gray-600 mb-2">Sem dados para análise</h3>
          <p class="text-lg text-gray-500">Ajuste os filtros acima para ver insights acionáveis</p>
        </div>
      `;
      return;
    }

    const totalRevenue = data.reduce((sum, r) => sum + r.revenue, 0);
    const totalProfit = data.reduce((sum, r) => sum + r.profit, 0);
    const avgMargin = data.reduce((sum, r) => sum + r.margin, 0) / data.length;
    const avgUnitsPerDay = data.reduce((sum, r) => sum + r.units, 0) / data.length;

    const revenueByProduct = groupByRevenue(data, 'product');
    const revenueByRegion = groupByRevenue(data, 'region');

    const topProduct = Object.entries(revenueByProduct)
      .sort(([,a], [,b]) => b - a)[0];
    const topRegion = Object.entries(revenueByRegion)
      .sort(([,a], [,b]) => b - a)[0];

    const lowMarginItems = data
      .filter(r => r.margin < 0.15)
      .slice(0, 3);

    const insightsHTML = `
      <div class="group p-8 bg-gradient-to-br from-emerald-50 to-green-50 border-4 border-emerald-200 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
        <div class="flex items-center mb-6">
          <div class="p-3 bg-emerald-500 rounded-2xl text-white text-2xl mr-4 shadow-lg">🏆</div>
          <h3 class="text-2xl font-black text-emerald-900">Top Performers</h3>
        </div>
        <div class="space-y-4">
          <div class="flex justify-between items-center p-4 bg-white/50 backdrop-blur-sm rounded-2xl border">
            <span class="font-semibold text-lg">${topProduct[0]}</span>
            <div class="text-right">
              <div class="text-3xl font-black text-emerald-600">R$ ${Math.round(topProduct[1]).toLocaleString()}</div>
              <div class="text-sm text-emerald-700">${((topProduct[1]/totalRevenue)*100).toFixed(1)}% total</div>
            </div>
          </div>
          <div class="flex justify-between items-center p-4 bg-white/50 backdrop-blur-sm rounded-2xl border">
            <span class="font-semibold text-lg">${topRegion[0]}</span>
            <div class="text-right">
              <div class="text-3xl font-black text-emerald-600">R$ ${Math.round(topRegion[1]).toLocaleString()}</div>
              <div class="text-sm text-emerald-700">${((topRegion[1]/totalRevenue)*100).toFixed(1)}% vendas</div>
            </div>
          </div>
        </div>
      </div>

      <div class="group p-8 bg-gradient-to-br from-orange-50 to-red-50 border-4 border-orange-200 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
        <div class="flex items-center mb-6">
          <div class="p-3 bg-orange-500 rounded-2xl text-white text-2xl mr-4 shadow-lg">⚠️</div>
          <h3 class="text-2xl font-black text-orange-900">${lowMarginItems.length} Alertas</h3>
        </div>
        <div class="space-y-3">
          ${lowMarginItems.map((item, i) => `
            <div class="flex justify-between items-center p-4 bg-white/50 backdrop-blur-sm rounded-2xl border-l-4 border-red-400">
              <span>#${i+1} ${item.product} (${item.region})</span>
              <span class="font-black text-xl text-red-600">${(item.margin*100).toFixed(1)}%</span>
            </div>
          `).join('') || '<div class="p-8 text-center text-green-700 font-bold text-xl rounded-2xl bg-green-100/50">✅ Todas margens saudáveis!</div>'}
          <div class="p-4 bg-yellow-100/50 rounded-2xl border-2 border-yellow-300">
            <div class="flex justify-between">
              <span>Unid./dia médio:</span>
              <span class="font-black text-xl ${avgUnitsPerDay < 4 ? 'text-red-600' : 'text-green-600'}">${avgUnitsPerDay.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-3 p-8 bg-gradient-to-br from-purple-50 to-indigo-50 border-4 border-purple-200 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
        <div class="flex items-center mb-8">
          <div class="p-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-3xl text-white text-3xl mr-6 shadow-2xl">🚀</div>
          <h3 class="text-3xl font-black text-purple-900">Ações Prioritárias</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-6 bg-white/30 backdrop-blur-sm rounded-2xl border border-purple-300">
            <h4 class="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
              🎯 Foco Estratégico
            </h4>
            <p class="text-lg"><strong>${topRegion[0]}</strong> gera <strong>${((topRegion[1]/totalRevenue)*100).toFixed(0)}%</strong> da receita total</p>
            <div class="mt-4 p-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl">
              <strong>Meta:</strong> Aumentar 25% vendas nesta região
            </div>
          </div>
          <div class="p-6 bg-white/30 backdrop-blur-sm rounded-2xl border border-indigo-300">
            <h4 class="text-xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
              ⚡ Margem Média
            </h4>
            <p class="text-lg"><strong>${(avgMargin*100).toFixed(1)}%</strong></p>
            <div class="mt-4 p-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl">
              <strong>${avgMargin < 0.2 ? 'ALERTA' : 'EXCELENTE'}</strong><br>
              ${avgMargin < 0.2 ? 'Negociar custos fornecedores' : 'Manter estratégia atual'}
            </div>
          </div>
          <div class="p-6 bg-white/30 backdrop-blur-sm rounded-2xl border border-emerald-300 md:col-span-2">
            <h4 class="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
              📈 Produtividade
            </h4>
            <p>Unidades/dia: <strong>${avgUnitsPerDay.toFixed(1)}</strong></p>
            <p>${lowMarginItems.length} produtos com margem &lt; 15%</p>
            <div class="mt-6 grid grid-cols-2 gap-4">
              <div class="text-center p-4 bg-emerald-100 rounded-xl">
                <div class="text-3xl font-black text-emerald-700">${Math.round(totalRevenue / 1000)}K</div>
                <div class="text-sm text-emerald-800">Receita Total</div>
              </div>
              <div class="text-center p-4 bg-indigo-100 rounded-xl">
                <div class="text-3xl font-black text-indigo-700">${Math.round(totalProfit / 1000)}K</div>
                <div class="text-sm text-indigo-800">Lucro Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    elements.insightsContent.innerHTML = insightsHTML;
    console.log('%c✅ INSIGHTS ATUALIZADOS COM SUCESSO!', 'color: #10b981; font-size: 14px');
  }

  function groupByRevenue(data, category) {
    return data.reduce((acc, row) => {
      acc[row[category]] = (acc[row[category]] || 0) + row.revenue;
      return acc;
    }, {});
  }

  console.log('%c✅ DASHBOARD PRO CARREGADO!', 'background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px; border-radius: 5px; font-size: 16px');
  console.log('%c💡 Dica: F12 > Console para acompanhar atualizações em tempo real', 'color: #059669; font-weight: bold');
})();
