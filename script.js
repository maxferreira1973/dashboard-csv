
(function() {
  'use strict';
  console.log('🚀 Dashboard PRO com Insights - Iniciando...');

  const els = {
    csvFile: document.getElementById('csvFile'),
    fileName: document.getElementById('fileName'),
    totalRevenue: document.getElementById('totalRevenue'),
    totalProfit: document.getElementById('totalProfit'),
    avgMargin: document.getElementById('avgMargin'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    productFilter: document.getElementById('productFilter'),
    regionFilter: document.getElementById('regionFilter'),
    clearFilters: document.getElementById('clearFilters'),
    tableBody: document.querySelector('#salesTable tbody'),
    insightsSection: document.getElementById('insights-section'),
    insightsList: document.getElementById('insights-list'),
    charts: {
      dateChart: document.getElementById('revenueByDateChart'),
      productChart: document.getElementById('revenueByProductChart'),
      regionChart: document.getElementById('revenueByRegionChart')
    }
  };

  let data = [];
  let chartInstances = {};

  // Event Listeners
  if (els.csvFile) els.csvFile.addEventListener('change', loadFile);
  if (els.clearFilters) els.clearFilters.addEventListener('click', resetFilters);
  ['startDate', 'endDate', 'productFilter', 'regionFilter'].forEach(id => {
    if (els[id]) els[id].addEventListener('change', updateDashboard);
  });

  // Auto load CSV
  window.addEventListener('load', autoLoadCSV);

  function autoLoadCSV() {
    fetch('sales_data_example.csv')
      .then(res => res.text())
      .then(parseCSV)
      .then(loadedData => {
        data = loadedData;
        if (els.fileName) els.fileName.textContent = 'sales_data_example.csv';
        initFilters();
        updateDashboard();
      })
      .catch(() => {
        if (els.fileName) els.fileName.textContent = 'Carregue arquivo CSV';
      });
  }

  function loadFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (els.fileName) els.fileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = e => {
      data = parseCSV(e.target.result);
      initFilters();
      updateDashboard();
    };
    reader.readAsText(file);
  }

  function parseCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const colIndex = {
      date: headers.indexOf('date'),
      product: headers.indexOf('product'),
      region: headers.indexOf('region'),
      units: headers.findIndex(h => h.includes('units')),
      revenue: headers.findIndex(h => h.includes('revenue')),
      cost: headers.findIndex(h => h.includes('cost'))
    };

    return lines.slice(1).map(line => {
      const values = line.split(',');
      const revenue = parseFloat(values[colIndex.revenue] || 0);
      const cost = parseFloat(values[colIndex.cost] || 0);

      return {
        date: values[colIndex.date]?.trim() || '',
        product: values[colIndex.product]?.trim() || 'N/A',
        region: values[colIndex.region]?.trim() || 'N/A',
        units: parseFloat(values[colIndex.units] || 0),
        revenue,
        cost,
        profit: revenue - cost,
        margin: revenue ? (revenue - cost) / revenue : 0
      };
    }).filter(row => row.revenue > 0);
  }

  function initFilters() {
    if (!els.productFilter || !els.regionFilter) return;

    const products = [...new Set(data.map(d => d.product))].sort();
    const regions = [...new Set(data.map(d => d.region))].sort();

    els.productFilter.innerHTML = '<option value="">Todos Produtos</option>' + 
      products.map(p => `<option value="${p}">${p}</option>`).join('');

    els.regionFilter.innerHTML = '<option value="">Todas Regiões</option>' + 
      regions.map(r => `<option value="${r}">${r}</option>`).join('');
  }

  function resetFilters() {
    if (els.startDate) els.startDate.value = '';
    if (els.endDate) els.endDate.value = '';
    if (els.productFilter) els.productFilter.value = '';
    if (els.regionFilter) els.regionFilter.value = '';
    updateDashboard();
  }

  function getFilteredData() {
    return data.filter(row => {
      const rowDate = new Date(row.date);
      const startDate = els.startDate?.value ? new Date(els.startDate.value) : null;
      const endDate = els.endDate?.value ? new Date(els.endDate.value) : null;
      const selectedProduct = els.productFilter?.value || '';
      const selectedRegion = els.regionFilter?.value || '';

      if (startDate && rowDate < startDate) return false;
      if (endDate && rowDate > endDate) return false;
      if (selectedProduct && row.product !== selectedProduct) return false;
      if (selectedRegion && row.region !== selectedRegion) return false;

      return true;
    });
  }

  function updateDashboard() {
    const filteredData = getFilteredData();
    console.log(`📊 Atualizando dashboard: ${filteredData.length} registros`);

    updateKPIs(filteredData);
    updateTable(filteredData);
    updateCharts(filteredData);
    updateInsights(filteredData);
  }

  function updateKPIs(data) {
    if (!els.totalRevenue || !els.totalProfit || !els.avgMargin) return;

    const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);
    const totalProfit = data.reduce((sum, row) => sum + row.profit, 0);
    const avgMargin = data.length ? data.reduce((sum, row) => sum + row.margin, 0) / data.length : 0;

    els.totalRevenue.textContent = `R$ ${totalRevenue.toLocaleString('pt-BR')}`;
    els.totalProfit.textContent = `R$ ${totalProfit.toLocaleString('pt-BR')}`;
    els.avgMargin.textContent = `${(avgMargin * 100).toFixed(1)}%`;
  }

  function updateTable(data) {
    if (!els.tableBody) return;

    if (data.length === 0) {
      els.tableBody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-500">Nenhum resultado para estes filtros</td></tr>';
      return;
    }

    els.tableBody.innerHTML = data.map(row => `
      <tr>
        <td>${row.date}</td>
        <td>${row.product}</td>
        <td>${row.region}</td>
        <td>${row.units}</td>
        <td>R$ ${row.revenue.toLocaleString('pt-BR')}</td>
        <td>R$ ${row.cost.toLocaleString('pt-BR')}</td>
        <td class="${row.profit > 0 ? 'text-green-600' : 'text-red-600'}">R$ ${row.profit.toLocaleString('pt-BR')}</td>
        <td class="${row.margin > 0.2 ? 'text-green-600 font-bold' : 'text-red-600'}">${(row.margin * 100).toFixed(1)}%</td>
      </tr>
    `).join('');
  }

  function updateCharts(data) {
    // Destroy existing charts
    Object.values(chartInstances).forEach(chart => chart?.destroy());
    chartInstances = {};

    if (data.length === 0 || typeof Chart === 'undefined') return;

    const revenueByDate = aggregateData(data, 'date');
    const revenueByProduct = aggregateData(data, 'product');
    const revenueByRegion = aggregateData(data, 'region');

    // Line chart - Revenue by Date
    if (els.charts.dateChart) {
      const sortedDates = Object.keys(revenueByDate).sort();
      chartInstances.date = new Chart(els.charts.dateChart.getContext('2d'), {
        type: 'line',
        data: {
          labels: sortedDates,
          datasets: [{
            label: 'Receita',
            data: sortedDates.map(date => revenueByDate[date]),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // Bar chart - Revenue by Product
    if (els.charts.productChart) {
      chartInstances.product = new Chart(els.charts.productChart.getContext('2d'), {
        type: 'bar',
        data: {
          labels: Object.keys(revenueByProduct),
          datasets: [{
            label: 'Receita por Produto',
            data: Object.values(revenueByProduct),
            backgroundColor: '#10b981'
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // Bar chart - Revenue by Region
    if (els.charts.regionChart) {
      chartInstances.region = new Chart(els.charts.regionChart.getContext('2d'), {
        type: 'bar',
        data: {
          labels: Object.keys(revenueByRegion),
          datasets: [{
            label: 'Receita por Região',
            data: Object.values(revenueByRegion),
            backgroundColor: '#3b82f6'
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }

  function updateInsights(data) {
    console.log('🎯 Gerando insights para', data.length, 'registros');

    if (!els.insightsList) {
      console.error('❌ Elemento #insights-list não encontrado!');
      return;
    }

    if (data.length === 0) {
      els.insightsList.innerHTML = '<div class="col-span-full p-8 text-center text-gray-500 rounded-lg bg-gray-50">🔍 Aplique filtros para ver insights acionáveis</div>';
      return;
    }

    const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);
    const avgMargin = data.reduce((sum, row) => sum + row.margin, 0) / data.length;
    const revenueByProduct = aggregateData(data, 'product');
    const revenueByRegion = aggregateData(data, 'region');
    const lowMarginProducts = data.filter(row => row.margin < 0.15).slice(0, 3);
    const avgDailyUnits = data.reduce((sum, row) => sum + row.units, 0) / data.length;

    // Top performers
    const topProduct = Object.entries(revenueByProduct).sort((a, b) => b[1] - a[1])[0];
    const topRegion = Object.entries(revenueByRegion).sort((a, b) => b[1] - a[1])[0];

    const insightsHTML = `
      <div class="bg-gradient-to-br from-green-400/10 to-emerald-400/10 backdrop-blur-sm p-6 rounded-2xl border border-green-200 shadow-xl">
        <h4 class="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
          🏆 TOP Performers
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="font-semibold text-lg">${topProduct[0]}</span><br>
            <span class="text-2xl font-bold text-green-600">R$ ${Math.round(topProduct[1]).toLocaleString('pt-BR')}</span><br>
            <span class="text-xs text-green-700">${((topProduct[1]/totalRevenue)*100).toFixed(1)}% da receita</span>
          </div>
          <div>
            <span class="font-semibold text-lg">${topRegion[0]}</span><br>
            <span class="text-2xl font-bold text-green-600">R$ ${Math.round(topRegion[1]).toLocaleString('pt-BR')}</span><br>
            <span class="text-xs text-green-700">${((topRegion[1]/totalRevenue)*100).toFixed(1)}% das vendas</span>
          </div>
        </div>
      </div>

      <div class="bg-gradient-to-br from-orange-400/10 to-red-400/10 backdrop-blur-sm p-6 rounded-2xl border border-orange-200 shadow-xl">
        <h4 class="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
          ⚠️ Alertas Críticos (${lowMarginProducts.length})
        </h4>
        <div class="space-y-2">
          ${lowMarginProducts.map(p => `
            <div class="flex justify-between items-center p-2 bg-red-50 rounded-lg">
              <span>${p.product}</span>
              <span class="font-bold text-red-600">${(p.margin*100).toFixed(1)}% margem</span>
            </div>
          `).join('') || '<p class="text-green-600 font-medium">✅ Todas margens saudáveis</p>'}
          <div class="flex justify-between p-2 bg-yellow-50 rounded-lg mt-2">
            <span>Unidades/dia:</span>
            <span class="font-bold ${avgDailyUnits < 4 ? 'text-red-600' : 'text-green-600'}">${avgDailyUnits.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div class="md:col-span-2 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 backdrop-blur-sm p-6 rounded-2xl border border-blue-200 shadow-xl">
        <h4 class="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
          🚀 Ações Prioritárias
        </h4>
        <div class="grid grid-cols-1 gap-3 text-sm">
          <div class="flex items-center p-3 bg-blue-50 rounded-xl">
            <span class="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            <span><strong>1.</strong> Focar ${topRegion[0]}: <strong>${((topRegion[1]/totalRevenue)*100).toFixed(0)}%</strong> da receita</span>
          </div>
          <div class="flex items-center p-3 bg-indigo-50 rounded-xl">
            <span class="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
            <span><strong>2.</strong> Margem média <strong>${(avgMargin*100).toFixed(1)}%</strong> ${avgMargin < 0.2 ? '(otimizar custos)' : '(excelente)'}</span>
          </div>
          <div class="flex items-center p-3 bg-purple-50 rounded-xl">
            <span class="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
            <span><strong>3.</strong> ${lowMarginProducts.length ? `Corrigir ${lowMarginProducts.length} produtos baixa margem` : 'Margens OK'}</span>
          </div>
          <div class="flex items-center p-3 bg-teal-50 rounded-xl">
            <span class="w-2 h-2 bg-teal-500 rounded-full mr-3"></span>
            <span><strong>4.</strong> Meta unidades: <strong>${avgDailyUnits.toFixed(1)}/dia</strong> ${avgDailyUnits < 4 ? '(aumentar estoque)' : '(alcançada)'}</span>
          </div>
        </div>
      </div>
    `;

    els.insightsList.innerHTML = insightsHTML;
    console.log('✅ Insights atualizados:', data.length, 'registros analisados');
  }

  function aggregateData(data, groupBy) {
    return data.reduce((acc, row) => {
      acc[row[groupBy]] = (acc[row[groupBy]] || 0) + row.revenue;
      return acc;
    }, {});
  }

  console.log('✅ Dashboard PRO carregado com sucesso!');
  console.log('💡 Abra F12 > Console para debug em tempo real');
})();
