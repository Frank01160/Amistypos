// Inventory Management Logic
let products = [];
let editingProductId = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth('manager')) return;
    
    await loadInventory();
    loadCategories();
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

async function loadInventory() {
    try {
        products = await dataService.getProducts();
        populateCategoryFilter();
        filterInventory();
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('Error loading inventory data', 'error');
    }
}

function populateCategoryFilter() {
    const categories = [...new Set(products.map(p => p.category))].sort();
    const categoryFilter = document.getElementById('categoryFilter');
    const productCategory = document.getElementById('productCategory');
    
    const options = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="all">All Categories</option>' + options;
    }
    
    if (productCategory) {
        productCategory.innerHTML = '<option value="">Select category</option>' + options;
    }
}

function filterInventory() {
    const searchQuery = document.getElementById('inventorySearch')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';
    const stockFilter = document.getElementById('stockFilter')?.value || 'all';
    
    let filtered = [...products];
    
    // Apply search filter
    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchQuery) ||
            (p.code && p.code.toLowerCase().includes(searchQuery)) ||
            p.category.toLowerCase().includes(searchQuery)
        );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    // Apply stock filter
    if (stockFilter !== 'all') {
        const settings = JSON.parse(localStorage.getItem('amisty_pos_settings') || '{}');
        const threshold = settings.lowStockThreshold || 10;
        
        filtered = filtered.filter(p => {
            const stockInfo = getStockInfo(p);
            if (stockFilter === 'low') return stockInfo.available > 0 && stockInfo.available <= threshold;
            if (stockFilter === 'out') return stockInfo.available <= 0;
            if (stockFilter === 'available') return stockInfo.available > 0;
            return true;
        });
    }
    
    displayInventory(filtered);
}

function getStockInfo(product) {
    if (product.unitPairs && product.unitPairs.length > 0) {
        const primary = product.unitPairs[0];
        const primaryAmount = product.stock?.primaryAmount || 0;
        const secondaryAmount = product.stock?.secondaryAmount || 0;
        
        return {
            available: primaryAmount,
            primaryDisplay: `${primaryAmount} ${primary.unit}`,
            secondaryDisplay: `${secondaryAmount} ${primary.secondaryUnit}`,
            hasUnits: true
        };
    } else {
        const stock = product.stock || 0;
        return {
            available: stock,
            primaryDisplay: `${stock} units`,
            secondaryDisplay: '',
            hasUnits: false
        };
    }
}

function displayInventory(productList) {
    const tbody = document.getElementById('inventoryTableBody');
    document.getElementById('productCount').textContent = `${productList.length} products`;
    
    if (productList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center;padding:2rem;color:#636E72;">
                    No products found
                </td>
            </tr>
        `;
        return;
    }
    
    const settings = JSON.parse(localStorage.getItem('amisty_pos_settings') || '{}');
    const threshold = settings.lowStockThreshold || 10;
    
    tbody.innerHTML = productList.map(product => {
        const stockInfo = getStockInfo(product);
        const profitMargin = product.sellingPrice - product.buyingPrice;
        const marginPercentage = product.buyingPrice > 0 
            ? ((profitMargin / product.sellingPrice) * 100).toFixed(1) 
            : 0;
        
        let statusClass = 'status-in-stock';
        let statusText = 'In Stock';
        
        if (stockInfo.available <= 0) {
            statusClass = 'status-out-of-stock';
            statusText = 'Out of Stock';
        } else if (stockInfo.available <= threshold) {
            statusClass = 'status-low-stock';
            statusText = 'Low Stock';
        }
        
        const unitPairsDisplay = product.unitPairs && product.unitPairs.length > 0
            ? product.unitPairs.map(pair => 
                `1 ${pair.unit} = ${pair.conversionRate} ${pair.secondaryUnit}`
              ).join('<br>')
            : 'None';
        
        const stockDisplay = stockInfo.hasUnits
            ? `<div class="stock-primary ${stockInfo.available <= threshold ? 'stock-low' : ''} ${stockInfo.available <= 0 ? 'stock-out' : ''}">${stockInfo.primaryDisplay}</div>
               <div class="stock-secondary">${stockInfo.secondaryDisplay}</div>`
            : `<div class="stock-primary ${stockInfo.available <= threshold ? 'stock-low' : ''} ${stockInfo.available <= 0 ? 'stock-out' : ''}">${stockInfo.primaryDisplay}</div>`;
        
        return `
            <tr>
                <td><strong>${product.code || 'N/A'}</strong></td>
                <td>${product.name}</td>
                <td><span class="badge">${product.category}</span></td>
                <td class="stock-cell">${stockDisplay}</td>
                <td>${formatCurrency(product.buyingPrice)}</td>
                <td>${formatCurrency(product.sellingPrice)}</td>
                <td class="profit-margin ${profitMargin >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${formatCurrency(profitMargin)} (${marginPercentage}%)
                </td>
                <td class="unit-pairs-cell">${unitPairsDisplay}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action edit" onclick="editProduct('${product.id}')" title="Edit">✏️</button>
                        <button class="btn-action adjust" onclick="showStockAdjust('${product.id}')" title="Adjust Stock">📊</button>
                        <button class="btn-action delete" onclick="deleteProduct('${product.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function showAddProductModal() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('unitPairsList').innerHTML = '';
    document.getElementById('productModal').style.display = 'flex';
    document.getElementById('newCategory').style.display = 'none';
    document.getElementById('productCategory').style.display = 'block';
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    editingProductId = productId;
    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('buyingPrice').value = product.buyingPrice;
    document.getElementById('sellingPrice').value = product.sellingPrice;
    document.getElementById('expiryDate').value = product.expiryDate || '';
    
    // Set current stock
    const stockInfo = getStockInfo(product);
    document.getElementById('initialStock').value = stockInfo.available;
    
    // Load unit pairs
    const unitPairsList = document.getElementById('unitPairsList');
    unitPairsList.innerHTML = '';
    
    if (product.unitPairs && product.unitPairs.length > 0) {
        product.unitPairs.forEach((pair, index) => {
            addUnitPair(pair);
        });
    }
    
    document.getElementById('productModal').style.display = 'flex';
}

async function saveProduct(event) {
    event.preventDefault();
    
    const productData = {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value || document.getElementById('newCategory').value.trim(),
        buyingPrice: parseFloat(document.getElementById('buyingPrice').value),
        sellingPrice: parseFloat(document.getElementById('sellingPrice').value),
        expiryDate: document.getElementById('expiryDate').value || null,
        unitPairs: collectUnitPairs()
    };
    
    // Validate
    if (!productData.name || !productData.category) {
        showToast('Product name and category are required', 'error');
        return;
    }
    
    if (productData.sellingPrice < productData.buyingPrice) {
        showToast('Selling price cannot be less than buying price', 'error');
        return;
    }
    
    // Set initial stock
    const initialStock = parseInt(document.getElementById('initialStock').value) || 0;
    
    if (productData.unitPairs && productData.unitPairs.length > 0) {
        const primaryUnit = productData.unitPairs[0];
        productData.stock = {
            primaryAmount: initialStock,
            secondaryAmount: initialStock * primaryUnit.conversionRate
        };
    } else {
        productData.stock = initialStock;
    }
    
    try {
        if (editingProductId) {
            // Update existing product
            const oldProduct = products.find(p => p.id === editingProductId);
            await dataService.updateProduct(editingProductId, productData);
            
            // Log changes
            if (oldProduct) {
                if (oldProduct.stock !== productData.stock) {
                    await dataService.logInventoryChange(
                        'adjust',
                        editingProductId,
                        productData.name,
                        typeof oldProduct.stock === 'object' ? oldProduct.stock.primaryAmount : oldProduct.stock,
                        typeof productData.stock === 'object' ? productData.stock.primaryAmount : productData.stock,
                        'Manual adjustment'
                    );
                }
                if (oldProduct.sellingPrice !== productData.sellingPrice) {
                    await dataService.logInventoryChange(
                        'price',
                        editingProductId,
                        productData.name,
                        oldProduct.sellingPrice,
                        productData.sellingPrice,
                        'Price update'
                    );
                }
            }
            
            showToast('Product updated successfully!', 'success');
        } else {
            // Add new product
            productData.code = generateProductCode(productData.category, products.length + 1);
            await dataService.addProduct(productData);
            showToast('Product added successfully!', 'success');
        }
        
        closeProductModal();
        await loadInventory();
    } catch (error) {
        console.error('Error saving product:', error);
        showToast('Error saving product: ' + error.message, 'error');
    }
}

function collectUnitPairs() {
    const unitPairRows = document.querySelectorAll('.unit-pair-row');
    const pairs = [];
    
    unitPairRows.forEach(row => {
        const unit = row.querySelector('.unit-name')?.value;
        const conversionRate = row.querySelector('.conversion-rate')?.value;
        const secondaryUnit = row.querySelector('.secondary-unit')?.value;
        
        if (unit && conversionRate && secondaryUnit) {
            pairs.push({
                unit: unit.trim(),
                conversionRate: parseFloat(conversionRate),
                secondaryUnit: secondaryUnit.trim()
            });
        }
    });
    
    return pairs;
}

function addUnitPair(existingPair = null) {
    const unitPairsList = document.getElementById('unitPairsList');
    const pairIndex = Date.now();
    
    const row = document.createElement('div');
    row.className = 'unit-pair-row';
    row.innerHTML = `
        <div class="form-group">
            <label>Primary Unit (e.g., bag)</label>
            <input type="text" class="unit-name" placeholder="e.g., bag" value="${existingPair?.unit || ''}">
        </div>
        <div class="form-group">
            <label>Equals</label>
            <input type="number" class="conversion-rate" placeholder="e.g., 100" step="0.01" min="0.01" value="${existingPair?.conversionRate || ''}">
        </div>
        <div class="form-group">
            <label>Secondary Unit (e.g., kg)</label>
            <input type="text" class="secondary-unit" placeholder="e.g., kg" value="${existingPair?.secondaryUnit || ''}">
        </div>
        <button type="button" class="btn-remove-unit" onclick="this.closest('.unit-pair-row').remove()">🗑️</button>
    `;
    
    unitPairsList.appendChild(row);
}

function showStockAdjust(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const stockInfo = getStockInfo(product);
    
    document.getElementById('adjustProductId').value = productId;
    document.getElementById('currentStock').textContent = stockInfo.primaryDisplay;
    document.getElementById('newStockValue').value = stockInfo.available;
    document.getElementById('stockAdjustModal').style.display = 'flex';
}

async function adjustStock(event) {
    event.preventDefault();
    
    const productId = document.getElementById('adjustProductId').value;
    const newStock = parseInt(document.getElementById('newStockValue').value);
    const reason = document.getElementById('adjustReason').value;
    
    if (!reason) {
        showToast('Please select a reason for adjustment', 'error');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const stockInfo = getStockInfo(product);
    const oldStock = stockInfo.available;
    
    // Update stock
    const updateData = {};
    if (product.unitPairs && product.unitPairs.length > 0) {
        const primaryUnit = product.unitPairs[0];
        updateData.stock = {
            primaryAmount: newStock,
            secondaryAmount: newStock * primaryUnit.conversionRate
        };
    } else {
        updateData.stock = newStock;
    }
    
    try {
        await dataService.updateProduct(productId, updateData);
        await dataService.logInventoryChange(
            'adjust',
            productId,
            product.name,
            oldStock,
            newStock,
            reason
        );
        
        showToast('Stock adjusted successfully!', 'success');
        closeStockAdjustModal();
        await loadInventory();
    } catch (error) {
        console.error('Error adjusting stock:', error);
        showToast('Error adjusting stock', 'error');
    }
}

async function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const confirmed = await confirmDialog(`Delete ${product.name}? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
        await dataService.deleteProduct(productId);
        await dataService.logInventoryChange(
            'remove',
            productId,
            product.name,
            getStockInfo(product).available,
            0,
            'Product deleted'
        );
        
        showToast('Product deleted successfully!', 'success');
        await loadInventory();
    } catch (error) {
        console.error('Error deleting product:', error);
        showToast('Error deleting product', 'error');
    }
}

function handleCategoryChange() {
    const select = document.getElementById('productCategory');
    const newCategoryInput = document.getElementById('newCategory');
    
    if (select.value === '__new__') {
        select.style.display = 'none';
        newCategoryInput.style.display = 'block';
        newCategoryInput.focus();
    }
}

function toggleNewCategory() {
    const select = document.getElementById('productCategory');
    const newCategoryInput = document.getElementById('newCategory');
    
    if (newCategoryInput.style.display === 'none') {
        select.value = '';
        select.style.display = 'none';
        newCategoryInput.style.display = 'block';
        newCategoryInput.focus();
    } else {
        newCategoryInput.style.display = 'none';
        select.style.display = 'block';
    }
}

function showBulkImportModal() {
    document.getElementById('bulkImportModal').style.display = 'flex';
}

function closeBulkImportModal() {
    document.getElementById('bulkImportModal').style.display = 'none';
}

async function handleCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            showToast('CSV file is empty or invalid', 'error');
            return;
        }
        
        // Skip header
        const products = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= 5) {
                const product = {
                    name: values[0].trim(),
                    category: values[1].trim(),
                    buyingPrice: parseFloat(values[2]),
                    sellingPrice: parseFloat(values[3]),
                    stock: parseInt(values[4]),
                    code: generateProductCode(values[1].trim(), i)
                };
                
                // Parse unit pairs if exists
                if (values[5] && values[5].trim()) {
                    const pairMatch = values[5].trim().match(/(\d+)\s*(\w+)\s*=\s*(\d+)\s*(\w+)/);
                    if (pairMatch) {
                        product.unitPairs = [{
                            unit: pairMatch[2],
                            conversionRate: parseFloat(pairMatch[1]),
                            secondaryUnit: pairMatch[4]
                        }];
                    }
                }
                
                products.push(product);
            }
        }
        
        try {
            let imported = 0;
            for (const product of products) {
                await dataService.addProduct(product);
                imported++;
            }
            
            showToast(`Successfully imported ${imported} products!`, 'success');
            closeBulkImportModal();
            await loadInventory();
        } catch (error) {
            console.error('Error importing products:', error);
            showToast('Error importing products', 'error');
        }
    };
    
    reader.readAsText(file);
}

async function exportInventory() {
    try {
        const products = await dataService.getProducts();
        const exportData = products.map(p => ({
            Code: p.code || '',
            Name: p.name,
            Category: p.category,
            Stock: typeof p.stock === 'object' ? p.stock.primaryAmount : p.stock,
            'Buying Price': p.buyingPrice,
            'Selling Price': p.sellingPrice,
            'Profit Margin': p.sellingPrice - p.buyingPrice,
            'Unit Pairs': p.unitPairs?.map(pair => 
                `1 ${pair.unit} = ${pair.conversionRate} ${pair.secondaryUnit}`
            ).join('; ') || ''
        }));
        
        const format = await new Promise(resolve => {
            const content = document.createElement('div');
            content.innerHTML = `
                <p>Choose export format:</p>
                <button class="btn-primary" id="exportCSV">CSV</button>
                <button class="btn-secondary" id="exportWord">Word Document</button>
            `;
            const modal = showModal(content, { title: 'Export Inventory' });
            
            document.getElementById('exportCSV').onclick = () => {
                modal.close();
                resolve('csv');
            };
            document.getElementById('exportWord').onclick = () => {
                modal.close();
                resolve('word');
            };
        });
        
        if (format === 'csv') {
            exportToCSV(exportData, 'inventory_export');
        } else {
            exportToWord(exportData, 'Inventory Export');
        }
        
        showToast('Inventory exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting inventory:', error);
        showToast('Error exporting inventory', 'error');
    }
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    editingProductId = null;
}

function closeStockAdjustModal() {
    document.getElementById('stockAdjustModal').style.display = 'none';
}