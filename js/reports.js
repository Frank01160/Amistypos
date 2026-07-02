// Reports Logic
let allSales = [];
let allProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth('manager')) return;
    
    await loadReportData();
    setDefaultDates();
    generateReport();
    setupToggleSidebar();
});

function setupToggleSidebar() {
    const toggleBtn = document.querySelector('.btn-menu-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }
}

async function loadReportData() {
    try {
        allSales = await dataService.getSales();
        allProducts = await dataService.getProducts();
        populateCategoryFilter();
    } catch (error) {
        console.error('Error loading report data:', error);
        showToast('Error loading report data', 'error');
    }
}

function populateCategoryFilter() {
    const categories = [...new Set(allProducts.map(p => p.category))].sort();
    const filter = document.getElementById('reportCategory');
    
    if (filter) {
        filter.innerHTML = '<option value="all">All Categories</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }
}

function setDefaultDates() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('startDate').value = formatDateForInput(startOfMonth);
    document.getElementById('endDate').value = formatDateForInput(today);
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function setToday() {
    const today = new Date();
    document.getElementById('startDate').value = formatDateForInput(today);
    document.getElementById('endDate').value = formatDateForInput(today);
    generateReport();
}

function setThisWeek() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    document.getElementById('startDate').value = formatDateForInput(startOfWeek);
    document.getElementById('endDate').value = formatDateForInput(today);
    generateReport();
}

function setThisMonth() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('startDate').value = formatDateForInput(startOfMonth);
    document.getElementById('endDate').value = formatDateForInput(today);
    generateReport();
}

function generateReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const category = document.getElementById('reportCategory').value;
    const paymentMethod = document.getElementById('reportPayment').value;
    const reportType = document.getElementById('reportType').value;
    
    // Filter sales
    let filteredSales = [...allSales];
    
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filteredSales = filteredSales.filter(sale => new Date(sale.timestamp) >= start);
    }
    
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filteredSales = filteredSales.filter(sale => new Date(sale.timestamp) <= end);
    }
    
    if (category !== 'all') {
        filteredSales = filteredSales.filter(sale => 
            sale.items.some(item => item.category === category)
        );
    }
    
    if (paymentMethod !== 'all') {
        filteredSales = filteredSales.filter(sale => sale.paymentMethod === paymentMethod);
    }
    
    // Update summary
    updateReportSummary(filteredSales);
    
    // Generate table based on report type
    switch(reportType) {
        case 'summary':
            generateSummaryTable(filteredSales);
            break;
        case 'detailed':
            generateDetailedTable(filteredSales);
            break;
        case 'products':
            generateProductSalesTable(filteredSales);
            break;
        case 'categories':
            generateCategoryTable(filteredSales);
            break;
    }
}

function updateReportSummary(filteredSales) {
    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalTransactions = filteredSales.length;
    
    const cashSales = filteredSales
        .filter(sale => sale.paymentMethod === 'cash')
        .reduce((sum, sale) => sum + sale.total, 0);
    
    const mobileSales = filteredSales
        .filter(sale => sale.paymentMethod === 'mobile')
        .reduce((sum, sale) => sum + sale.total, 0);
    
    // Calculate profit
    let totalProfit = 0;
    filteredSales.forEach(sale => {
        sale.items.forEach(item => {
            const product = allProducts.find(p => p.id === item.productId);
            if (product) {
                const profit = (item.price - product.buyingPrice) * item.quantity;
                totalProfit += profit;
            }
        });
    });
    
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('totalTransactions').textContent = totalTransactions;
    document.getElementById('cashPayments').textContent = formatCurrency(cashSales);
    document.getElementById('mobilePayments').textContent = formatCurrency(mobileSales);
    document.getElementById('totalProfit').textContent = formatCurrency(totalProfit);
}

function generateSummaryTable(sales) {
    document.getElementById('reportTableTitle').textContent = 'Sales Summary';
    
    const thead = document.getElementById('reportTableHead');
    thead.innerHTML = `
        <tr>
            <th>Date</th>
            <th>Transactions</th>
            <th>Items Sold</th>
            <th class="amount-cell">Total Sales</th>
            <th class="amount-cell">Cash</th>
            <th class="amount-cell">M-Pesa</th>
            <th class="amount-cell">Profit</th>
        </tr>
    `;
    
    // Group by date
    const salesByDate = {};
    sales.forEach(sale => {
        const dateKey = formatDateShort(sale.timestamp);
        if (!salesByDate[dateKey]) {
            salesByDate[dateKey] = [];
        }
        salesByDate[dateKey].push(sale);
    });
    
    const tbody = document.getElementById('reportTableBody');
    
    if (Object.keys(salesByDate).length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No sales data for selected period</td></tr>';
        return;
    }
    
    let grandTotal = 0;
    let grandCash = 0;
    let grandMobile = 0;
    let grandProfit = 0;
    let grandTransactions = 0;
    
    tbody.innerHTML = Object.entries(salesByDate).map(([date, dateSales]) => {
        const total = dateSales.reduce((sum, s) => sum + s.total, 0);
        const cash = dateSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
        const mobile = dateSales.filter(s => s.paymentMethod === 'mobile').reduce((sum, s) => sum + s.total, 0);
        const itemsCount = dateSales.reduce((sum, s) => sum + s.items.reduce((si, item) => si + item.quantity, 0), 0);
        
        let profit = 0;
        dateSales.forEach(sale => {
            sale.items.forEach(item => {
                const product = allProducts.find(p => p.id === item.productId);
                if (product) {
                    profit += (item.price - product.buyingPrice) * item.quantity;
                }
            });
        });
        
        grandTotal += total;
        grandCash += cash;
        grandMobile += mobile;
        grandProfit += profit;
        grandTransactions += dateSales.length;
        
        return `
            <tr>
                <td>${date}</td>
                <td class="text-center">${dateSales.length}</td>
                <td class="text-center">${itemsCount}</td>
                <td class="amount-cell">${formatCurrency(total)}</td>
                <td class="amount-cell">${formatCurrency(cash)}</td>
                <td class="amount-cell">${formatCurrency(mobile)}</td>
                <td class="amount-cell">${formatCurrency(profit)}</td>
            </tr>
        `;
    }).join('') + `
        <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td class="text-center"><strong>${grandTransactions}</strong></td>
            <td></td>
            <td class="amount-cell"><strong>${formatCurrency(grandTotal)}</strong></td>
            <td class="amount-cell"><strong>${formatCurrency(grandCash)}</strong></td>
            <td class="amount-cell"><strong>${formatCurrency(grandMobile)}</strong></td>
            <td class="amount-cell"><strong>${formatCurrency(grandProfit)}</strong></td>
        </tr>
    `;
}

function generateDetailedTable(sales) {
    document.getElementById('reportTableTitle').textContent = 'Detailed Transactions';
    
    const thead = document.getElementById('reportTableHead');
    thead.innerHTML = `
        <tr>
            <th>Receipt No.</th>
            <th>Date/Time</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Payment</th>
            <th class="amount-cell">Total</th>
            <th class="amount-cell">Profit</th>
        </tr>
    `;
    
    const tbody = document.getElementById('reportTableBody');
    
    if (sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No transactions found</td></tr>';
        return;
    }
    
    let grandTotal = 0;
    let grandProfit = 0;
    
    tbody.innerHTML = sales
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(sale => {
            const itemList = sale.items.map(item => 
                `${item.productName} × ${item.quantity}`
            ).join(', ');
            
            let profit = 0;
            sale.items.forEach(item => {
                const product = allProducts.find(p => p.id === item.productId);
                if (product) {
                    profit += (item.price - product.buyingPrice) * item.quantity;
                }
            });
            
            grandTotal += sale.total;
            grandProfit += profit;
            
            const paymentBadge = sale.paymentMethod === 'cash' ? 'badge-cash' : 'badge-mobile';
            
            return `
                <tr>
                    <td><strong>${sale.receiptNumber}</strong></td>
                    <td>${formatDate(sale.timestamp)}</td>
                    <td>${sale.customerName || 'Walk-in'}</td>
                    <td>${itemList}</td>
                    <td><span class="badge ${paymentBadge}">${sale.paymentMethod}</span></td>
                    <td class="amount-cell">${formatCurrency(sale.total)}</td>
                    <td class="amount-cell">${formatCurrency(profit)}</td>
                </tr>
            `;
        }).join('') + `
        <tr class="total-row">
            <td colspan="5"><strong>TOTAL</strong></td>
            <td class="amount-cell"><strong>${formatCurrency(grandTotal)}</strong></td>
            <td class="amount-cell"><strong>${formatCurrency(grandProfit)}</strong></td>
        </tr>
    `;
}

function generateProductSalesTable(sales) {
    document.getElementById('reportTableTitle').textContent = 'Sales by Product';
    
    const thead = document.getElementById('reportTableHead');
    thead.innerHTML = `
        <tr>
            <th>Product</th>
            <th>Category</th>
            <th class="text-center">Quantity Sold</th>
            <th class="amount-cell">Revenue</th>
            <th class="amount-cell">Profit</th>
            <th>% of Total</th>
        </tr>
    `;
    
    // Aggregate by product
    const productSales = {};
    let totalRevenue = 0;
    
    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = {
                    name: item.productName,
                    category: item.category,
                    quantity: 0,
                    revenue: 0,
                    profit: 0
                };
            }
            
            const product = allProducts.find(p => p.id === item.productId);
            const profit = product ? (item.price - product.buyingPrice) * item.quantity : 0;
            
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].revenue += item.quantity * item.price;
            productSales[item.productId].profit += profit;
            totalRevenue += item.quantity * item.price;
        });
    });
    
    const tbody = document.getElementById('reportTableBody');
    
    if (Object.keys(productSales).length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No product sales data</td></tr>';
        return;
    }
    
    const sortedProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue);
    
    let grandQuantity = 0;
    let grandRevenue = 0;
    let grandProfit = 0;
    
    tbody.innerHTML = sortedProducts.map(product => {
        const percentage = totalRevenue > 0 ? ((product.revenue / totalRevenue) * 100).toFixed(1) : 0;
        
        grandQuantity += product.quantity;
        grandRevenue += product.revenue;
        grandProfit += product.profit;
        
        return `
            <tr>
                <td><strong>${product.name}</strong></td>
                <td>${product.category}</td>
                <td class="text-center">${product.quantity}</td>
                <td class="amount-cell">${formatCurrency(product.revenue)}</td>
                <td class="amount-cell">${formatCurrency(product.profit)}</td>
                <td>${percentage}%</td>
            </tr>
        `;
    }).join('') + `
        <tr class="total-row">
            <td colspan="2"><strong>TOTAL</strong></td>
            <td class="text-center"><strong>${grandQuantity}</strong></td>
            <td class="amount-cell"><strong>${formatCurrency(grandRevenue)}</strong></td>
            <td class="amount-cell"><strong>${formatCurrency(grandProfit)}</strong></td>
            <td>100%</td>
        </tr>
    `;
}

function generateCategoryTable(sales) {
    document.getElementById('reportTableTitle').textContent = 'Sales by Category';
    
    const thead = document.getElementById('reportTableHead');
    thead.innerHTML = `
        <tr>
            <th>Category</th>
            <th class="text-center">Products Sold</th>
            <th class="text-center">Transactions</th>
            <th class="amount-cell">Revenue</th>
            <th class="amount-cell">Profit</th>
            <th>% of Total</th>
        </tr>
    `;
    
    // Aggregate by category
    const categorySales = {};
    let totalRevenue = 0;
    
    sales.forEach(sale => {
        const categoriesInSale = new Set();
        
        sale.items.forEach(item => {
            const category = item.category || 'Uncategorized';
            categoriesInSale.add(category);
            
            if (!categorySales[category]) {
                categorySales[category] = {
                    productsCount: new Set(),
                    transactions: new Set(),
                    revenue: 0,
                    profit: 0
                };
            }
            
            const product = allProducts.find(p => p.id === item.productId);
            const profit = product ? (item.price - product.buyingPrice) * item.quantity : 0;
            
            categorySales[category].productsCount.add(item.productId);
            categorySales[category].revenue += item.quantity * item.price;
            categorySales[category].profit += profit;
            totalRevenue += item.quantity * item.price;
        });
        
        categoriesInSale.forEach(cat => {
            categorySales[cat].transactions.add(sale.id || sale.receiptNumber);
        });
    });
    
    const tbody = document.getElementById('reportTableBody');
    
    if (Object.keys(categorySales).length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No category data</td></tr>';
        return;
    }
    
    const sortedCategories = Object.entries(categorySales)
        .sort((a, b) => b[1].revenue - a[1].revenue);
    
    let grandRevenue = 0;
    let grandProfit = 0;
    
    tbody.innerHTML = sortedCategories.map(([category, data]) => {
        const percentage = totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) : 0;
        
        grandRevenue += data.revenue;
        grandProfit += data.profit;
        
        return `
            <tr>
                <td><strong>${category}</strong></td>
                <td class="text-center">${data.productsCount.size}</td>
                <td class="text-center">${data.transactions.size}</td>
                <td class="amount-cell">${formatCurrency(data.revenue)}</td>
                <td class="amount-cell">${formatCurrency(data.profit)}</td>
                <td>${percentage}%</td>
            </tr>
        `;
    }).join('') + `
        <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td></td>
            <td></td>
            <td class="amount-cell"><strong>${formatCurrency(grandRevenue)}</strong></td>
            <td class="amount-cell"><strong>${formatCurrency(grandProfit)}</strong></td>
            <td>100%</td>
        </tr>
    `;
}

async function exportReport() {
    const reportType = document.getElementById('reportType').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    // Get current table data
    const table = document.getElementById('reportTable');
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
    );
    
    // Convert to export format
    const exportData = rows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '';
        });
        return obj;
    });
    
    const format = await new Promise(resolve => {
        const content = document.createElement('div');
        content.innerHTML = `
            <p>Choose export format:</p>
            <button class="btn-primary" id="exportCSVBtn">CSV</button>
            <button class="btn-secondary" id="exportWordBtn">Word Document</button>
        `;
        const modal = showModal(content, { title: 'Export Report' });
        
        document.getElementById('exportCSVBtn').onclick = () => {
            modal.close();
            resolve('csv');
        };
        document.getElementById('exportWordBtn').onclick = () => {
            modal.close();
            resolve('word');
        };
    });
    
    const filename = `report_${reportType}_${startDate}_to_${endDate}`;
    
    if (format === 'csv') {
        exportToCSV(exportData, filename);
    } else {
        exportToWord(exportData, filename);
    }
    
    showToast('Report exported successfully!', 'success');
}