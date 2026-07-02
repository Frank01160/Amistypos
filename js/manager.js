// Manager Dashboard Logic
let allProducts = [];
let allSales = [];
let inventoryLogs = [];

// Check authentication on load
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth('manager')) return;
    
    await loadDashboardData();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupSidebarToggle();
    
    // Load inventory logs
    loadInventoryLogs();
});

function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-KE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

function setupSidebarToggle() {
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const toggleBtn = document.querySelector('.btn-menu-toggle');
        
        if (window.innerWidth <= 1024 && 
            !sidebar.contains(e.target) && 
            !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

async function loadDashboardData() {
    try {
        // Load all data
        allProducts = await dataService.getProducts();
        allSales = await dataService.getSales();
        inventoryLogs = await dataService.getInventoryLogs();
        
        // Update stats
        updateStatsCards();
        
        // Load recent transactions
        loadRecentTransactions();
        
        // Draw sales chart
        drawSalesChart();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

function updateStatsCards() {
    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Yesterday's date range
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Filter today's sales
    const todaySales = allSales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= today && saleDate < tomorrow;
    });
    
    // Filter yesterday's sales
    const yesterdaySales = allSales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= yesterday && saleDate < today;
    });
    
    // Calculate today's total
    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const yesterdayTotal = yesterdaySales.reduce((sum, sale) => sum + sale.total, 0);
    
    // Calculate percentage change
    let salesChange = 0;
    if (yesterdayTotal > 0) {
        salesChange = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
    }
    
    // Update DOM
    document.getElementById('todaySales').textContent = formatCurrency(todayTotal);
    document.getElementById('todayTransactions').textContent = todaySales.length;
    document.getElementById('totalProducts').textContent = allProducts.length;
    
    // Count low stock items
    const settings = JSON.parse(localStorage.getItem('amisty_pos_settings') || '{}');
    const threshold = settings.lowStockThreshold || 10;
    const lowStockItems = allProducts.filter(product => {
        const stockDisplay = getStockDisplayFromManager(product);
        return stockDisplay.available <= threshold;
    });
    
    document.getElementById('lowStockCount').textContent = lowStockItems.length;
    
    // Update change indicators
    const changeSign = salesChange >= 0 ? '+' : '';
    const changeClass = salesChange >= 0 ? 'positive' : 'negative';
    document.getElementById('salesChange').textContent = 
        `${changeSign}${salesChange.toFixed(1)}% from yesterday`;
    document.getElementById('salesChange').style.color = salesChange >= 0 ? '#2E7D32' : '#C62828';
    
    document.getElementById('transactionsChange').textContent = 
        `${todaySales.length} transactions today`;
    
    // Categories count
    const categories = new Set(allProducts.map(p => p.category));
    document.getElementById('productsChange').textContent = 
        `Across ${categories.size} categories`;
    
    // Low stock alert
    if (lowStockItems.length > 0) {
        document.getElementById('lowStockAlert').textContent = 
            `${lowStockItems.length} items need restocking`;
        document.getElementById('lowStockAlert').style.color = '#FF6B6B';
    } else {
        document.getElementById('lowStockAlert').textContent = 'All stock levels good';
        document.getElementById('lowStockAlert').style.color = '#2E7D32';
    }
}

function getStockDisplayFromManager(product) {
    if (product.unitPairs && product.unitPairs.length > 0) {
        const primary = product.unitPairs[0];
        const primaryAmount = product.stock?.primaryAmount || 0;
        return {
            text: `${primaryAmount} ${primary.unit}`,
            available: primaryAmount
        };
    } else {
        const stock = product.stock || 0;
        return {
            text: `${stock} units`,
            available: stock
        };
    }
}

function loadRecentTransactions() {
    const tbody = document.getElementById('recentTransactionsBody');
    
    // Get last 10 transactions
    const recentSales = allSales
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    
    if (recentSales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:2rem;color:#636E72;">
                    No transactions yet
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = recentSales.map(sale => {
        const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        const paymentBadge = sale.paymentMethod === 'cash' ? 'badge-cash' : 'badge-mobile';
        
        return `
            <tr>
                <td><strong>${sale.receiptNumber}</strong></td>
                <td>${sale.customerName || 'Walk-in'}</td>
                <td>${itemCount} items</td>
                <td><strong>${formatCurrency(sale.total)}</strong></td>
                <td><span class="badge ${paymentBadge}">${sale.paymentMethod}</span></td>
                <td>${formatDateShort(sale.timestamp)}</td>
            </tr>
        `;
    }).join('');
}

async function loadInventoryLogs() {
    const tbody = document.getElementById('inventoryLogsBody');
    const filter = document.getElementById('logFilter')?.value || 'all';
    
    try {
        let logs = await dataService.getInventoryLogs();
        
        // Apply filter
        if (filter !== 'all') {
            logs = logs.filter(log => log.action === filter);
        }
        
        // Get last 50 logs
        logs = logs.slice(0, 50);
        
        if (logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;padding:2rem;color:#636E72;">
                        No inventory changes recorded
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = logs.map(log => {
            let actionBadge = '';
            switch(log.action) {
                case 'add':
                    actionBadge = 'badge-add';
                    break;
                case 'remove':
                    actionBadge = 'badge-remove';
                    break;
                case 'adjust':
                    actionBadge = 'badge-adjust';
                    break;
                case 'price':
                    actionBadge = 'badge-price';
                    break;
            }
            
            return `
                <tr>
                    <td>${formatDate(log.timestamp)}</td>
                    <td><span class="badge ${actionBadge}">${log.action}</span></td>
                    <td>${log.productName || 'N/A'}</td>
                    <td>${log.oldValue || '-'}</td>
                    <td>${log.newValue || '-'}</td>
                    <td>${log.reason || '-'}</td>
                    <td>${log.user || 'System'}</td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading inventory logs:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:2rem;color:#FF6B6B;">
                    Error loading logs
                </td>
            </tr>
        `;
    }
}

function drawSalesChart() {
    const canvas = document.getElementById('salesChartCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get last 7 days
    const days = [];
    const salesData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const daySales = allSales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= date && saleDate < nextDate;
        });
        
        const total = daySales.reduce((sum, sale) => sum + sale.total, 0);
        
        days.push(date.toLocaleDateString('en-KE', { weekday: 'short' }));
        salesData.push(total);
    }
    
    // Chart dimensions
    const chartPadding = 60;
    const chartWidth = width - (chartPadding * 2);
    const chartHeight = height - (chartPadding * 2);
    const maxSale = Math.max(...salesData, 1);
    
    // Draw axes
    ctx.strokeStyle = '#E1E8ED';
    ctx.lineWidth = 1;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(chartPadding, chartPadding);
    ctx.lineTo(chartPadding, height - chartPadding);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(chartPadding, height - chartPadding);
    ctx.lineTo(width - chartPadding, height - chartPadding);
    ctx.stroke();
    
    // Draw Y-axis labels
    ctx.fillStyle = '#636E72';
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 4; i++) {
        const value = (maxSale / 4) * i;
        const y = height - chartPadding - (chartHeight / 4) * i;
        
        ctx.fillText(formatCurrency(value), chartPadding - 10, y + 3);
        
        // Grid line
        ctx.strokeStyle = '#F5F7FA';
        ctx.beginPath();
        ctx.moveTo(chartPadding, y);
        ctx.lineTo(width - chartPadding, y);
        ctx.stroke();
    }
    
    // Draw bars
    const barWidth = chartWidth / days.length * 0.6;
    const barSpacing = chartWidth / days.length;
    
    salesData.forEach((value, index) => {
        const x = chartPadding + (barSpacing * index) + (barSpacing - barWidth) / 2;
        const barHeight = (value / maxSale) * chartHeight;
        const y = height - chartPadding - barHeight;
        
        // Bar gradient
        const gradient = ctx.createLinearGradient(x, y, x, height - chartPadding);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#5BA3D9');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Bar value on top
        if (value > 0) {
            ctx.fillStyle = '#2D3436';
            ctx.textAlign = 'center';
            ctx.font = 'bold 10px Segoe UI';
            ctx.fillText(formatCurrency(value), x + barWidth / 2, y - 5);
        }
        
        // Day label
        ctx.fillStyle = '#636E72';
        ctx.textAlign = 'center';
        ctx.font = '10px Segoe UI';
        ctx.fillText(days[index], x + barWidth / 2, height - chartPadding + 15);
    });
}

// Refresh dashboard data periodically
setInterval(async () => {
    if (window.location.pathname.includes('manager.html')) {
        await loadDashboardData();
        loadInventoryLogs();
    }
}, 60000); // Refresh every minute