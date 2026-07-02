// POS System Logic
let basket = [];
let selectedPayment = 'cash';
let selectedCategory = 'all';
let products = [];
let categories = [];

// Initialize POS
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth('seller')) return;
    
    await loadProducts();
    loadCategories();
    setupKeyboardShortcuts();
    loadBasketFromStorage();
    startOfflineMonitoring();
});

async function loadProducts() {
    try {
        products = await dataService.getProducts();
        displayProducts(products);
    } catch (error) {
        showToast('Error loading products', 'error');
        products = [];
    }
}

function loadCategories() {
    categories = [...new Set(products.map(p => p.category))].sort();
    
    const categoriesList = document.getElementById('categoriesList');
    categoriesList.innerHTML = categories.map(cat => `
        <button class="category-btn" onclick="filterByCategory('${cat}')">
            ${cat}
        </button>
    `).join('');
}

function filterByCategory(category) {
    selectedCategory = category;
    
    // Update active states
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.trim() === category) {
            btn.classList.add('active');
        }
    });
    
    const btnShowAll = document.querySelector('.btn-show-all');
    if (category === 'all') {
        btnShowAll.classList.add('active');
    } else {
        btnShowAll.classList.remove('active');
    }
    
    const filtered = category === 'all' 
        ? products 
        : products.filter(p => p.category === category);
    
    displayProducts(filtered);
    document.getElementById('currentCategory').textContent = 
        category === 'all' ? 'All Products' : category;
}

function displayProducts(productList) {
    const grid = document.getElementById('productsGrid');
    document.getElementById('productCount').textContent = `${productList.length} items`;
    
    if (productList.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#636E72;">No products found</p>';
        return;
    }
    
    grid.innerHTML = productList.map(product => {
        const stockDisplay = getStockDisplay(product);
        const isLowStock = checkLowStock(product);
        const isOutOfStock = stockDisplay.available <= 0;
        
        return `
            <div class="product-card ${isLowStock ? 'low-stock' : ''} ${isOutOfStock ? 'out-of-stock' : ''}"
                 onclick="${isOutOfStock ? '' : `addToBasket('${product.id}')`}">
                <div class="product-code">${product.code || 'N/A'}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-stock">${stockDisplay.text}</div>
                ${isLowStock ? '<div class="stock-alert">⚠️ Low Stock</div>' : ''}
                <div class="product-price">${formatCurrency(product.sellingPrice)}</div>
            </div>
        `;
    }).join('');
}

function getStockDisplay(product) {
    if (product.unitPairs && product.unitPairs.length > 0) {
        const primary = product.unitPairs[0];
        const primaryUnit = primary.unit;
        const secondaryUnit = primary.secondaryUnit;
        const primaryAmount = product.stock?.primaryAmount || 0;
        const secondaryAmount = product.stock?.secondaryAmount || 0;
        
        return {
            text: `${primaryAmount} ${primaryUnit} (${secondaryAmount} ${secondaryUnit})`,
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

function checkLowStock(product) {
    const settings = JSON.parse(localStorage.getItem('amisty_pos_settings') || '{}');
    const threshold = settings.lowStockThreshold || 10;
    const stockDisplay = getStockDisplay(product);
    return stockDisplay.available <= threshold;
}

function searchProducts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    
    const filtered = products.filter(p => {
        const matchesSearch = 
            p.name.toLowerCase().includes(query) ||
            (p.code && p.code.toLowerCase().includes(query)) ||
            p.category.toLowerCase().includes(query);
        
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });
    
    displayProducts(filtered);
}

async function addToBasket(productId, quantity = 1, unit = null) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const stockDisplay = getStockDisplay(product);
    if (stockDisplay.available <= 0) {
        showToast('Product out of stock!', 'error');
        return;
    }
    
    // Check if already in basket
    const existingIndex = basket.findIndex(item => 
        item.productId === productId && item.unit === unit
    );
    
    if (existingIndex !== -1) {
        // Update quantity
        const newQty = basket[existingIndex].quantity + quantity;
        if (newQty > stockDisplay.available) {
            showToast('Not enough stock!', 'warning');
            return;
        }
        basket[existingIndex].quantity = newQty;
    } else {
        // If product has unit pairs, show unit selection
        if (product.unitPairs && product.unitPairs.length > 0 && !unit) {
            showUnitSelection(productId, quantity);
            return;
        }
        
        const selectedUnit = unit || (product.unitPairs?.[0]?.unit) || 'unit';
        
        basket.push({
            productId,
            productName: product.name,
            productCode: product.code,
            category: product.category,
            quantity,
            unit: selectedUnit,
            price: product.sellingPrice,
            unitPairs: product.unitPairs || []
        });
    }
    
    updateBasketDisplay();
    saveBasketToStorage();
}

function showUnitSelection(productId, quantity) {
    const product = products.find(p => p.id === productId);
    if (!product?.unitPairs) return;
    
    const content = document.createElement('div');
    content.innerHTML = `
        <h4>Select Unit for ${product.name}</h4>
        ${product.unitPairs.map(pair => `
            <button class="btn-primary" style="margin:0.5rem;width:100%;" 
                    onclick="addToBasket('${productId}', ${quantity}, '${pair.unit}'); this.closest('.modal-overlay').remove();">
                ${pair.unit} (1 ${pair.unit} = ${pair.conversionRate} ${pair.secondaryUnit})
            </button>
        `).join('')}
    `;
    
    showModal(content, { title: 'Choose Unit' });
}

function updateBasketDisplay() {
    const basketItems = document.getElementById('basketItems');
    const customerDisplayItems = document.getElementById('customerDisplayItems');
    
    if (basket.length === 0) {
        basketItems.innerHTML = `
            <div class="empty-basket">
                <p>No items in basket</p>
                <span>Select products to begin</span>
            </div>
        `;
        customerDisplayItems.innerHTML = '<p style="text-align:center;">Empty Basket</p>';
    } else {
        basketItems.innerHTML = basket.map((item, index) => `
            <div class="basket-item">
                <div class="basket-item-info">
                    <div class="basket-item-name">${item.productName}</div>
                    <div class="basket-item-unit">${item.quantity} ${item.unit} × ${formatCurrency(item.price)}</div>
                </div>
                <div class="basket-item-controls">
                    <button class="qty-btn" onclick="updateBasketItem(${index}, -1)">-</button>
                    <input class="qty-input" type="number" value="${item.quantity}" 
                           onchange="updateBasketItem(${index}, 0, this.value)" min="1">
                    <button class="qty-btn" onclick="updateBasketItem(${index}, 1)">+</button>
                </div>
                <div class="basket-item-total">
                    ${formatCurrency(item.quantity * item.price)}
                </div>
                <button onclick="removeFromBasket(${index})" style="background:none;border:none;cursor:pointer;">🗑️</button>
            </div>
        `).join('');
        
        // Update customer display
        customerDisplayItems.innerHTML = basket.map(item => `
            <div style="display:flex;justify-content:space-between;padding:0.3rem 0;font-size:0.85rem;">
                <span>${item.productName} × ${item.quantity}</span>
                <span>${formatCurrency(item.quantity * item.price)}</span>
            </div>
        `).join('');
    }
    
    updateTotals();
}

function updateBasketItem(index, delta, newValue = null) {
    const product = products.find(p => p.id === basket[index].productId);
    const stockDisplay = getStockDisplay(product);
    
    let newQty;
    if (newValue !== null) {
        newQty = parseInt(newValue);
    } else {
        newQty = basket[index].quantity + delta;
    }
    
    if (newQty < 1) {
        removeFromBasket(index);
        return;
    }
    
    if (newQty > stockDisplay.available) {
        showToast(`Only ${stockDisplay.available} available!`, 'warning');
        return;
    }
    
    basket[index].quantity = newQty;
    updateBasketDisplay();
    saveBasketToStorage();
}

function removeFromBasket(index) {
    basket.splice(index, 1);
    updateBasketDisplay();
    saveBasketToStorage();
}

function clearBasket() {
    if (basket.length === 0) return;
    
    confirmDialog('Clear all items from basket?').then(confirmed => {
        if (confirmed) {
            basket = [];
            updateBasketDisplay();
            saveBasketToStorage();
            document.getElementById('amountReceived').value = '';
            document.getElementById('changeDue').style.display = 'none';
        }
    });
}

function updateTotals() {
    const subtotal = basket.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;
    const total = Math.max(0, subtotal - discount);
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('total').textContent = formatCurrency(total);
    document.getElementById('customerDisplayTotal').textContent = formatCurrency(total);
    
    calculateChange();
}

function selectPayment(method) {
    selectedPayment = method;
    
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(method)) {
            btn.classList.add('active');
        }
    });
    
    const cashInput = document.getElementById('cashInput');
    const changeDue = document.getElementById('changeDue');
    
    if (method === 'cash') {
        cashInput.style.display = 'block';
        changeDue.style.display = 'none';
    } else {
        cashInput.style.display = 'none';
        changeDue.style.display = 'none';
    }
}

function calculateChange() {
    if (selectedPayment !== 'cash') return;
    
    const total = parseFloat(document.getElementById('total').textContent.replace(/[^0-9.]/g, '')) || 0;
    const received = parseFloat(document.getElementById('amountReceived').value) || 0;
    const change = received - total;
    
    const changeDue = document.getElementById('changeDue');
    const changeAmount = document.getElementById('changeAmount');
    
    if (received > 0) {
        changeDue.style.display = 'flex';
        if (change >= 0) {
            changeAmount.textContent = formatCurrency(change);
            changeAmount.style.color = '#2D3436';
        } else {
            changeAmount.textContent = `Insufficient: ${formatCurrency(Math.abs(change))}`;
            changeAmount.style.color = '#FF6B6B';
        }
    } else {
        changeDue.style.display = 'none';
    }
}

async function confirmPayment() {
    if (basket.length === 0) {
        showToast('Basket is empty!', 'error');
        return;
    }
    
    const total = parseFloat(document.getElementById('total').textContent.replace(/[^0-9.]/g, '')) || 0;
    
    if (selectedPayment === 'cash') {
        const received = parseFloat(document.getElementById('amountReceived').value) || 0;
        if (received < total) {
            showToast('Insufficient amount received!', 'error');
            return;
        }
    }
    
    const confirmed = await confirmDialog(`Confirm sale of ${formatCurrency(total)}?`);
    if (!confirmed) return;
    
    const sale = {
        items: [...basket],
        subtotal: parseFloat(document.getElementById('subtotal').textContent.replace(/[^0-9.]/g, '')),
        discount: parseFloat(document.getElementById('discountInput').value) || 0,
        total: total,
        paymentMethod: selectedPayment,
        customerName: document.getElementById('customerName').value || 'Walk-in Customer',
        customerPhone: document.getElementById('customerPhone').value || '',
        seller: 'seller'
    };
    
    if (selectedPayment === 'cash') {
        sale.amountReceived = parseFloat(document.getElementById('amountReceived').value);
        sale.change = sale.amountReceived - total;
    }
    
    try {
        const savedSale = await dataService.addSale(sale);
        showToast('Sale completed successfully!', 'success');
        
        // Play sound
        playSound('sale-complete');
        
        // Show receipt
        showReceipt(savedSale);
        
        // Reset basket
        basket = [];
        updateBasketDisplay();
        saveBasketToStorage();
        document.getElementById('amountReceived').value = '';
        document.getElementById('discountInput').value = '0';
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('changeDue').style.display = 'none';
        
        // Reload products to update stock
        await loadProducts();
        
    } catch (error) {
        showToast('Error completing sale: ' + error.message, 'error');
    }
}

function showReceipt(sale) {
    const receiptContent = document.getElementById('receiptContent');
    receiptContent.innerHTML = generateReceiptHTML(sale);
    
    document.getElementById('receiptModal').style.display = 'flex';
}

function closeReceipt() {
    document.getElementById('receiptModal').style.display = 'none';
}

function printReceipt() {
    const receiptContent = document.getElementById('receiptContent').innerHTML;
    const printWindow = window.open('', '', 'width=300,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <style>
                body { font-family: 'Courier New', monospace; font-size: 10px; width: 80mm; margin: 0; padding: 5px; }
                @media print { body { width: 80mm; } }
            </style>
        </head>
        <body>${receiptContent}</body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
}

function downloadReceipt() {
    const sale = basket; // You might want to store the last sale
    const receiptText = document.getElementById('receiptContent').innerText;
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // F1: Focus search
        if (e.key === 'F1') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
        
        // F2: Select cash payment
        if (e.key === 'F2') {
            e.preventDefault();
            selectPayment('cash');
        }
        
        // F3: Select mobile payment
        if (e.key === 'F3') {
            e.preventDefault();
            selectPayment('mobile');
        }
        
        // F4: Confirm payment
        if (e.key === 'F4') {
            e.preventDefault();
            confirmPayment();
        }
        
        // Escape: Clear search or close modals
        if (e.key === 'Escape') {
            document.getElementById('searchInput').value = '';
            searchProducts();
            closeReceipt();
        }
    });
}

function saveBasketToStorage() {
    localStorage.setItem('currentBasket', JSON.stringify(basket));
}

function loadBasketFromStorage() {
    const saved = localStorage.getItem('currentBasket');
    if (saved) {
        basket = JSON.parse(saved);
        updateBasketDisplay();
    }
}

function startOfflineMonitoring() {
    window.addEventListener('online', () => {
        showToast('Back online! Syncing data...', 'info');
        dataService.processOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
        showToast('You are offline. Changes will sync when connected.', 'warning');
    });
}

function playSound(soundName) {
    try {
        const audio = new Audio(`../sounds/${soundName}.mp3`);
        audio.play().catch(() => {}); // Ignore if sound file doesn't exist
    } catch (e) {
        // Sound not critical
    }
}