// Settings Management Logic
let settingsLog = [];
let presetUnitPairs = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth('manager')) return;
    
    await loadSettings();
    loadPresetUnitPairs();
    loadSettingsLog();
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

async function loadSettings() {
    try {
        let settings;
        
        if (isFirebaseInitialized && db) {
            const doc = await db.collection('settings').doc('app_settings').get();
            settings = doc.exists ? doc.data() : getDefaultSettings();
        } else {
            const stored = localStorage.getItem('amisty_pos_settings');
            settings = stored ? JSON.parse(stored) : getDefaultSettings();
        }
        
        // Populate form fields
        document.getElementById('companyName').value = settings.companyName || 'AMISTY COMPANY';
        document.getElementById('companyAddress').value = settings.companyAddress || 'Nairobi, Kenya';
        document.getElementById('companyPhone').value = settings.companyPhone || '';
        document.getElementById('receiptFooter').value = settings.receiptFooter || 'Thank you for shopping with us!';
        document.getElementById('managerPassword').value = settings.managerPassword || 'admin123';
        document.getElementById('sellerPassword').value = settings.sellerPassword || 'seller123';
        document.getElementById('sessionTimeout').value = settings.sessionTimeout || 15;
        document.getElementById('maxLoginAttempts').value = settings.maxLoginAttempts || 5;
        document.getElementById('lockoutDuration').value = settings.lockoutDuration || 30;
        document.getElementById('lowStockThreshold').value = settings.lowStockThreshold || 10;
        document.getElementById('productCodePrefix').value = settings.productCodePrefix || 'AMY-';
        document.getElementById('currency').value = settings.currency || 'KSh';
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast('Error loading settings', 'error');
    }
}

function getDefaultSettings() {
    return {
        companyName: 'AMISTY COMPANY',
        companyAddress: 'Nairobi, Kenya',
        companyPhone: '0700-000000',
        receiptFooter: 'Thank you for shopping with us!',
        managerPassword: 'admin123',
        sellerPassword: 'seller123',
        sessionTimeout: 15,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        lowStockThreshold: 10,
        productCodePrefix: 'AMY-',
        currency: 'KSh'
    };
}

function loadPresetUnitPairs() {
    try {
        const stored = localStorage.getItem('amisty_preset_units');
        presetUnitPairs = stored ? JSON.parse(stored) : getDefaultPresetUnits();
        displayPresetUnitPairs();
    } catch (error) {
        presetUnitPairs = getDefaultPresetUnits();
        displayPresetUnitPairs();
    }
}

function getDefaultPresetUnits() {
    return [
        { unit: 'bag', conversionRate: 100, secondaryUnit: 'kg' },
        { unit: 'barrow', conversionRate: 100, secondaryUnit: 'litres' },
        { unit: 'carton', conversionRate: 24, secondaryUnit: 'pieces' },
        { unit: 'sack', conversionRate: 50, secondaryUnit: 'kg' },
        { unit: 'drum', conversionRate: 200, secondaryUnit: 'litres' }
    ];
}

function displayPresetUnitPairs() {
    const container = document.getElementById('presetUnitPairs');
    
    if (presetUnitPairs.length === 0) {
        container.innerHTML = '<p style="color:#636E72;">No preset unit pairs defined</p>';
        return;
    }
    
    container.innerHTML = presetUnitPairs.map((pair, index) => `
        <div class="preset-unit-row">
            <input type="text" value="${pair.unit}" placeholder="Unit (e.g., bag)" 
                   onchange="updatePresetUnit(${index}, 'unit', this.value)">
            <span>=</span>
            <input type="number" value="${pair.conversionRate}" placeholder="Rate" step="0.01" min="0.01"
                   onchange="updatePresetUnit(${index}, 'conversionRate', this.value)">
            <input type="text" value="${pair.secondaryUnit}" placeholder="Secondary unit (e.g., kg)"
                   onchange="updatePresetUnit(${index}, 'secondaryUnit', this.value)">
            <button class="btn-remove-preset" onclick="removePresetUnit(${index})">🗑️</button>
        </div>
    `).join('');
}

function addPresetUnitPair() {
    presetUnitPairs.push({
        unit: '',
        conversionRate: 1,
        secondaryUnit: ''
    });
    displayPresetUnitPairs();
    
    // Save automatically
    savePresetUnitPairs();
}

function updatePresetUnit(index, field, value) {
    if (field === 'conversionRate') {
        presetUnitPairs[index][field] = parseFloat(value) || 1;
    } else {
        presetUnitPairs[index][field] = value;
    }
    savePresetUnitPairs();
}

function removePresetUnit(index) {
    presetUnitPairs.splice(index, 1);
    displayPresetUnitPairs();
    savePresetUnitPairs();
}

function savePresetUnitPairs() {
    localStorage.setItem('amisty_preset_units', JSON.stringify(presetUnitPairs));
}

async function saveAllSettings() {
    const oldSettings = await getCurrentSettings();
    
    const newSettings = {
        companyName: document.getElementById('companyName').value.trim(),
        companyAddress: document.getElementById('companyAddress').value.trim(),
        companyPhone: document.getElementById('companyPhone').value.trim(),
        receiptFooter: document.getElementById('receiptFooter').value.trim(),
        managerPassword: document.getElementById('managerPassword').value,
        sellerPassword: document.getElementById('sellerPassword').value,
        sessionTimeout: parseInt(document.getElementById('sessionTimeout').value) || 15,
        maxLoginAttempts: parseInt(document.getElementById('maxLoginAttempts').value) || 5,
        lockoutDuration: parseInt(document.getElementById('lockoutDuration').value) || 30,
        lowStockThreshold: parseInt(document.getElementById('lowStockThreshold').value) || 10,
        productCodePrefix: document.getElementById('productCodePrefix').value.trim(),
        currency: document.getElementById('currency').value.trim()
    };
    
    // Validate
    if (!newSettings.companyName) {
        showToast('Company name is required', 'error');
        return;
    }
    
    if (!newSettings.managerPassword || !newSettings.sellerPassword) {
        showToast('Both passwords are required', 'error');
        return;
    }
    
    try {
        if (isFirebaseInitialized && db) {
            await db.collection('settings').doc('app_settings').set(newSettings);
        } else {
            localStorage.setItem('amisty_pos_settings', JSON.stringify(newSettings));
        }
        
        // Log changes
        await logSettingsChanges(oldSettings, newSettings);
        
        showToast('Settings saved successfully!', 'success');
        loadSettingsLog();
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error saving settings', 'error');
    }
}

async function getCurrentSettings() {
    if (isFirebaseInitialized && db) {
        const doc = await db.collection('settings').doc('app_settings').get();
        return doc.exists ? doc.data() : getDefaultSettings();
    } else {
        const stored = localStorage.getItem('amisty_pos_settings');
        return stored ? JSON.parse(stored) : getDefaultSettings();
    }
}

async function logSettingsChanges(oldSettings, newSettings) {
    const changes = [];
    const user = JSON.parse(sessionStorage.getItem('currentUser'))?.role || 'manager';
    const timestamp = new Date().toISOString();
    
    Object.keys(newSettings).forEach(key => {
        if (key === 'managerPassword' || key === 'sellerPassword') {
            // Don't log actual password changes, just that they were changed
            if (oldSettings[key] !== newSettings[key]) {
                changes.push({
                    setting: key === 'managerPassword' ? 'Manager Password' : 'Seller Password',
                    oldValue: '********',
                    newValue: '********',
                    changedBy: user,
                    timestamp: timestamp
                });
            }
        } else if (JSON.stringify(oldSettings[key]) !== JSON.stringify(newSettings[key])) {
            changes.push({
                setting: key,
                oldValue: String(oldSettings[key] || ''),
                newValue: String(newSettings[key]),
                changedBy: user,
                timestamp: timestamp
            });
        }
    });
    
    if (changes.length > 0) {
        try {
            const existingLog = JSON.parse(localStorage.getItem('amisty_settings_log') || '[]');
            const updatedLog = [...changes, ...existingLog].slice(0, 50); // Keep last 50 changes
            localStorage.setItem('amisty_settings_log', JSON.stringify(updatedLog));
            
            if (isFirebaseInitialized && db) {
                for (const change of changes) {
                    await db.collection('settings_log').add(change);
                }
            }
        } catch (error) {
            console.error('Error logging settings changes:', error);
        }
    }
}

function loadSettingsLog() {
    const tbody = document.getElementById('settingsLogBody');
    
    try {
        const logs = JSON.parse(localStorage.getItem('amisty_settings_log') || '[]');
        
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No changes recorded</td></tr>';
            return;
        }
        
        tbody.innerHTML = logs.slice(0, 20).map(log => `
            <tr>
                <td>${formatDate(log.timestamp)}</td>
                <td><strong>${log.setting}</strong></td>
                <td>${log.oldValue || '-'}</td>
                <td>${log.newValue}</td>
                <td>${log.changedBy}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading settings log:', error);
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function exportAllData() {
    try {
        const products = await dataService.getProducts();
        const sales = await dataService.getSales();
        const settings = await getCurrentSettings();
        const logs = await dataService.getInventoryLogs();
        
        const allData = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            settings: settings,
            products: products,
            sales: sales,
            inventoryLogs: logs,
            settingsLog: JSON.parse(localStorage.getItem('amisty_settings_log') || '[]'),
            presetUnits: presetUnitPairs
        };
        
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `amisty_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showToast('Data exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Error exporting data', 'error');
    }
}

function importAllData() {
    document.getElementById('importFile').click();
}

async function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const confirmed = await confirmDialog(
            'Import data will replace existing products, sales, and settings. Continue?'
        );
        
        if (!confirmed) return;
        
        // Import settings
        if (data.settings) {
            if (isFirebaseInitialized && db) {
                await db.collection('settings').doc('app_settings').set(data.settings);
            }
            localStorage.setItem('amisty_pos_settings', JSON.stringify(data.settings));
        }
        
        // Import products
        if (data.products && Array.isArray(data.products)) {
            for (const product of data.products) {
                await dataService.addProduct(product);
            }
        }
        
        // Import sales
        if (data.sales && Array.isArray(data.sales)) {
            for (const sale of data.sales) {
                await dataService.addSale(sale);
            }
        }
        
        // Import preset units
        if (data.presetUnits) {
            presetUnitPairs = data.presetUnits;
            savePresetUnitPairs();
            displayPresetUnitPairs();
        }
        
        showToast('Data imported successfully! Please reload the page.', 'success');
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error importing data:', error);
        showToast('Error importing data. Check file format.', 'error');
    }
}

async function clearAllData() {
    const confirmed = await confirmDialog(
        'WARNING: This will delete ALL data including products, sales, and logs. This cannot be undone. Continue?'
    );
    
    if (!confirmed) return;
    
    const doubleConfirmed = await confirmDialog(
        'Are you absolutely sure? Type DELETE to confirm.'
    );
    
    if (!doubleConfirmed) return;
    
    try {
        // Clear Firebase collections
        if (isFirebaseInitialized && db) {
            const collections = ['products', 'sales', 'inventory_logs', 'settings_log'];
            for (const collection of collections) {
                const snapshot = await db.collection(collection).get();
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        }
        
        // Clear localStorage
        localStorage.removeItem('amisty_pos_products');
        localStorage.removeItem('amisty_pos_sales');
        localStorage.removeItem('amisty_pos_inventory_log');
        localStorage.removeItem('amisty_settings_log');
        localStorage.setItem('amisty_pos_settings', JSON.stringify(getDefaultSettings()));
        
        showToast('All data cleared. Reloading...', 'success');
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Error clearing data:', error);
        showToast('Error clearing data', 'error');
    }
}