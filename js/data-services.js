// Data Service for AMISTY POS
class DataService {
    constructor() {
        this.ready = false;
        this.init();
    }

    init() {
        // Wait for Firebase to initialize
        setTimeout(() => {
            if (typeof db !== 'undefined' && db !== null) {
                this.ready = true;
                console.log('✅ DataService ready - Using Firebase');
            } else {
                console.log('⚠️ DataService using localStorage fallback');
                this.initLocalStorage();
                this.ready = true;
            }
        }, 1000);
    }

    initLocalStorage() {
        if (!localStorage.getItem('amisty_pos_products')) {
            localStorage.setItem('amisty_pos_products', JSON.stringify([]));
        }
        if (!localStorage.getItem('amisty_pos_sales')) {
            localStorage.setItem('amisty_pos_sales', JSON.stringify([]));
        }
        if (!localStorage.getItem('amisty_pos_inventory_log')) {
            localStorage.setItem('amisty_pos_inventory_log', JSON.stringify([]));
        }
    }

    // ===== PRODUCTS =====
    async getProducts() {
        try {
            if (db && isFirebaseInitialized) {
                console.log('📦 Fetching products from Firebase...');
                const snapshot = await db.collection('products').orderBy('name').get();
                const products = [];
                snapshot.forEach(doc => {
                    products.push({ id: doc.id, ...doc.data() });
                });
                console.log(`✅ Found ${products.length} products`);
                return products;
            } else {
                console.log('📦 Fetching products from localStorage...');
                const data = localStorage.getItem('amisty_pos_products');
                return data ? JSON.parse(data) : [];
            }
        } catch (error) {
            console.error('❌ Error getting products:', error);
            const data = localStorage.getItem('amisty_pos_products');
            return data ? JSON.parse(data) : [];
        }
    }

    async addProduct(product) {
        try {
            product.createdAt = new Date().toISOString();
            product.updatedAt = new Date().toISOString();

            console.log('➕ Adding product:', product.name);

            if (db && isFirebaseInitialized) {
                const docRef = await db.collection('products').add(product);
                product.id = docRef.id;
                console.log('✅ Product added to Firebase with ID:', product.id);
            } else {
                product.id = 'prod_' + Date.now();
                const products = await this.getProducts();
                products.push(product);
                localStorage.setItem('amisty_pos_products', JSON.stringify(products));
                console.log('✅ Product added to localStorage');
            }

            // Log the addition
            await this.logInventoryChange(
                'add', 
                product.id, 
                product.name, 
                0, 
                typeof product.stock === 'object' ? product.stock.primaryAmount : product.stock, 
                'New product added'
            );

            return product;
        } catch (error) {
            console.error('❌ Error adding product:', error);
            throw error;
        }
    }

    async updateProduct(productId, updates) {
        try {
            updates.updatedAt = new Date().toISOString();
            console.log('🔄 Updating product:', productId);

            if (db && isFirebaseInitialized) {
                await db.collection('products').doc(productId).update(updates);
                console.log('✅ Product updated in Firebase');
            } else {
                const products = await this.getProducts();
                const index = products.findIndex(p => p.id === productId);
                if (index !== -1) {
                    products[index] = { ...products[index], ...updates };
                    localStorage.setItem('amisty_pos_products', JSON.stringify(products));
                    console.log('✅ Product updated in localStorage');
                }
            }
        } catch (error) {
            console.error('❌ Error updating product:', error);
            throw error;
        }
    }

    async deleteProduct(productId) {
        try {
            console.log('🗑️ Deleting product:', productId);

            if (db && isFirebaseInitialized) {
                await db.collection('products').doc(productId).delete();
                console.log('✅ Product deleted from Firebase');
            } else {
                const products = await this.getProducts();
                const filtered = products.filter(p => p.id !== productId);
                localStorage.setItem('amisty_pos_products', JSON.stringify(filtered));
                console.log('✅ Product deleted from localStorage');
            }
        } catch (error) {
            console.error('❌ Error deleting product:', error);
            throw error;
        }
    }

    async getProductById(productId) {
        const products = await this.getProducts();
        return products.find(p => p.id === productId) || null;
    }

    // ===== SALES =====
    async addSale(sale) {
        try {
            sale.timestamp = new Date().toISOString();
            sale.receiptNumber = await this.generateReceiptNumber();

            console.log('💰 Adding sale:', sale.receiptNumber);

            if (db && isFirebaseInitialized) {
                const docRef = await db.collection('sales').add(sale);
                sale.id = docRef.id;
                console.log('✅ Sale added to Firebase');
            } else {
                sale.id = 'sale_' + Date.now();
                const sales = JSON.parse(localStorage.getItem('amisty_pos_sales') || '[]');
                sales.push(sale);
                localStorage.setItem('amisty_pos_sales', JSON.stringify(sales));
                console.log('✅ Sale added to localStorage');
            }

            // Update stock for each item
            for (const item of sale.items) {
                const product = await this.getProductById(item.productId);
                if (product) {
                    const newStock = this.calculateNewStock(product, item);
                    await this.updateProduct(item.productId, { stock: newStock });
                }
            }

            return sale;
        } catch (error) {
            console.error('❌ Error adding sale:', error);
            throw error;
        }
    }

    async getSales() {
        try {
            if (db && isFirebaseInitialized) {
                console.log('📊 Fetching sales from Firebase...');
                const snapshot = await db.collection('sales')
                    .orderBy('timestamp', 'desc')
                    .get();
                const sales = [];
                snapshot.forEach(doc => {
                    sales.push({ id: doc.id, ...doc.data() });
                });
                console.log(`✅ Found ${sales.length} sales`);
                return sales;
            } else {
                const data = localStorage.getItem('amisty_pos_sales');
                return data ? JSON.parse(data) : [];
            }
        } catch (error) {
            console.error('❌ Error getting sales:', error);
            return [];
        }
    }

    calculateNewStock(product, saleItem) {
        if (product.unitPairs && product.unitPairs.length > 0 && 
            product.stock && typeof product.stock === 'object') {
            
            const primaryUnit = product.unitPairs[0];
            
            if (saleItem.unit === primaryUnit.primaryUnit) {
                // Sold in primary unit (e.g., bags)
                const newPrimary = (product.stock.primaryAmount || 0) - saleItem.quantity;
                const newSecondary = newPrimary * primaryUnit.conversionRate;
                return {
                    primaryAmount: Math.max(0, newPrimary),
                    secondaryAmount: Math.max(0, newSecondary)
                };
            } else {
                // Sold in secondary unit (e.g., kg)
                const reductionInPrimary = saleItem.quantity / primaryUnit.conversionRate;
                const newPrimary = (product.stock.primaryAmount || 0) - reductionInPrimary;
                const newSecondary = (product.stock.secondaryAmount || 0) - saleItem.quantity;
                return {
                    primaryAmount: Math.max(0, newPrimary),
                    secondaryAmount: Math.max(0, newSecondary)
                };
            }
        } else {
            // Simple stock
            const currentStock = typeof product.stock === 'object' ? 
                (product.stock.primaryAmount || 0) : (product.stock || 0);
            return Math.max(0, currentStock - saleItem.quantity);
        }
    }

    async generateReceiptNumber() {
        try {
            const sales = await this.getSales();
            const settings = JSON.parse(localStorage.getItem('amisty_pos_settings') || '{}');
            const prefix = settings.productCodePrefix || 'AMY-';
            
            // Get the last receipt number
            let lastNumber = 0;
            if (sales.length > 0) {
                const lastReceipt = sales[0].receiptNumber;
                const match = lastReceipt.match(/\d+/);
                if (match) {
                    lastNumber = parseInt(match[0]);
                }
            }
            
            return `${prefix}${String(lastNumber + 1).padStart(6, '0')}`;
        } catch (error) {
            return `AMY-${String(Date.now()).slice(-6)}`;
        }
    }

    // ===== INVENTORY LOGS =====
    async logInventoryChange(action, productId, productName, oldValue, newValue, reason = '') {
        try {
            const log = {
                action,
                productId,
                productName,
                oldValue,
                newValue,
                reason,
                timestamp: new Date().toISOString(),
                user: 'manager'
            };

            if (db && isFirebaseInitialized) {
                await db.collection('inventory_logs').add(log);
                console.log('✅ Log saved to Firebase');
            } else {
                const logs = JSON.parse(localStorage.getItem('amisty_pos_inventory_log') || '[]');
                logs.unshift(log);
                if (logs.length > 100) logs.pop();
                localStorage.setItem('amisty_pos_inventory_log', JSON.stringify(logs));
                console.log('✅ Log saved to localStorage');
            }
        } catch (error) {
            console.error('❌ Error logging:', error);
        }
    }

    async getInventoryLogs() {
        try {
            if (db && isFirebaseInitialized) {
                const snapshot = await db.collection('inventory_logs')
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .get();
                const logs = [];
                snapshot.forEach(doc => {
                    logs.push({ id: doc.id, ...doc.data() });
                });
                return logs;
            } else {
                const data = localStorage.getItem('amisty_pos_inventory_log');
                return data ? JSON.parse(data) : [];
            }
        } catch (error) {
            console.error('❌ Error getting logs:', error);
            return [];
        }
    }

    // ===== SETTINGS =====
    async getSettings() {
        try {
            if (db && isFirebaseInitialized) {
                const doc = await db.collection('settings').doc('app_settings').get();
                if (doc.exists) {
                    return doc.data();
                }
            }
            
            const data = localStorage.getItem('amisty_pos_settings');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('❌ Error getting settings:', error);
            const data = localStorage.getItem('amisty_pos_settings');
            return data ? JSON.parse(data) : null;
        }
    }

    async saveSettings(settings) {
        try {
            if (db && isFirebaseInitialized) {
                await db.collection('settings').doc('app_settings').set(settings);
                console.log('✅ Settings saved to Firebase');
            }
            
            localStorage.setItem('amisty_pos_settings', JSON.stringify(settings));
            console.log('✅ Settings saved to localStorage');
        } catch (error) {
            console.error('❌ Error saving settings:', error);
            throw error;
        }
    }
}

// Create global instance
const dataService = new DataService();
