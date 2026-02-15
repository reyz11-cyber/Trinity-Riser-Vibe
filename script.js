let originalData = [];
const monthsNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const RISER_COLORS = {
    primary: '#1100ff', 
    secondary: '#0f0f0f', 
    success: '#28a745',
    pending: '#ffc107',
    cancelled: '#b91c1c'
};

document.addEventListener('DOMContentLoaded', fetchData);

async function fetchData() {
    try {
        const res = await fetch('data.json');
        const data = await res.json();
        
        originalData = data.transactions;
        
        calculateAndRenderMetrics(originalData);
        renderTable(originalData);
        initCharts(originalData);

        document.getElementById('globalSearch').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const filtered = originalData.filter(t => 
                t.product.toLowerCase().includes(term) || 
                t.id.toLowerCase().includes(term) ||
                t.brand.toLowerCase().includes(term)
            );
            renderTable(filtered);
        });
    } catch (error) { 
        console.error("Error cargando datos", error); 
    }
}

function calculateAndRenderMetrics(txs) {
    let totalRevenue = 0;
    let totalCost = 0;

    txs.forEach(t => {
        const price = parseFloat(t.amount.replace(/[$,]/g, '')) || 0;
        const cost = t.cost ? parseFloat(t.cost.replace(/[$,]/g, '')) : (price * 0.5);
        
        totalRevenue += (price * t.quantity);
        totalCost += (cost * t.quantity);
    });

    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    const dynamicMetrics = [
        { 
            name: "Ventas Totales", 
            value: `$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}` 
        },
        { 
            name: "Modelos Disponibles", 
            value: txs.length.toString() 
        },
        { 
            name: "Margen de Reventa Promedio", 
            value: `${profitMargin.toFixed(0)}%` 
        }
    ];

    const container = document.getElementById('metricsContainer');
    container.innerHTML = dynamicMetrics.map(m => `
        <div class="card">
            <div class="card-icon" style="background: ${RISER_COLORS.secondary}">${m.name[0]}</div>
            <div>
                <small style="color:#64748b; font-weight:600; text-transform:uppercase; font-size:10px">${m.name}</small>
                <div style="font-size:1.4rem; font-weight:800; color: ${RISER_COLORS.secondary}">${m.value}</div>
            </div>
        </div>
    `).join('');
}

function renderTable(txs) {
    const body = document.getElementById('tableBody');
    body.innerHTML = txs.map(t => `
        <tr>
            <td style="font-weight:700; color:#64748b">${t.id}</td>
            <td style="font-weight:600">${t.product}</td>
            <td><span class="brand-badge">${t.brand}</span></td>
            <td>${t.date}</td>
            <td style="font-weight:700">${t.amount}</td>
            <td>${t.quantity}</td>
            <td><span class="status-badge status-${t.status.toLowerCase()}">${t.status}</span></td>
        </tr>
    `).join('');
}

function initCharts(txs) {
    const existingChartSales = Chart.getChart("chart-transactions");
    const existingChartStatus = Chart.getChart("chart-status");
    if (existingChartSales) existingChartSales.destroy();
    if (existingChartStatus) existingChartStatus.destroy();

    const salesByMonth = {};
    txs.forEach(t => {
        const dateObj = new Date(t.date);
        const monthName = monthsNames[dateObj.getMonth()];
        const val = (parseFloat(t.amount.replace(/[$,]/g, '')) || 0) * t.quantity;
        salesByMonth[monthName] = (salesByMonth[monthName] || 0) + val;
    });

    new Chart(document.getElementById('chart-transactions'), {
        type: 'bar',
        data: {
            labels: Object.keys(salesByMonth),
            datasets: [{
                label: 'Ventas ($)',
                data: Object.values(salesByMonth),
                backgroundColor: RISER_COLORS.primary,
                borderRadius: 6
            }]
        },
        options: { 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }
        }
    });

    const statusCounts = txs.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
    }, {});

    new Chart(document.getElementById('chart-status'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [RISER_COLORS.success, RISER_COLORS.pending, RISER_COLORS.cancelled],
                borderWidth: 0
            }]
        },
        options: { 
            maintainAspectRatio: false,
            cutout: '70%'
        }
    });
}