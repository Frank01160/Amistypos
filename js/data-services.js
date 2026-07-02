// Data Service - CRUD Operations
class DataService {
    constructor() {
        this.offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
        this.isOnline = navigator.onLine;
        
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processOfflineQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Products CRUD
    async getProducts() {
        try {
            if (this.isOnline && isFirebaseInitialized && db) {
                const snapshot = await db.collection('products').orderBy('name').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                return JSON.parse(localStorage.getItem('amisty_pos_products') || '[]');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            return JSON.parse(localStorage.getItem('amisty_pos_products') || '[]');
        }
    }

    async addProduct(product) {
        product.createdAt = new Date().toISOString();
        product.updatedAt = new Date().toISOString();
        
        try {
            if (this.isOnline && isFirebaseInitialized && db) {
                const docRef = await db.collection('products').add(product);
                product.id = docRef.id;
            } else {
                const products = await this.getProducts();
                product.id = 'prod_' + Date.now();
                products.push(product);
                localStorage.setItem('amisty_pos_products', JSON.stringify(products));
                this.addToOfflineQueue({ type: 'addProduct', data: product });
            }
            await this.logInventoryChange('add', product.id, product.name, 0, product.stock, 'New product added');
            return product;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    async updateProduct(productId, updates) {
        updates.updatedAt = new Date().toISOString();
        
        try {
            if (this.isOnline && isFirebaseInitialized && db) {
                await db.collection('products').doc(productId).update(updates);
            } else {
                const products = await this.getProducts();
                const index = products.findIndex(p => p.id === productId);
                if (index !== -1) {
                    products[index] = { ...products[index], ...updates };
                    localStorage.setItem('amisty_pos_products', JSON.stringify(products));
                }
                this.addToOfflineQueue({ type: 'updateProduct', data: { id: productId, updates } });
            }
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    async deleteProduct(productId) {
        try {
            if (this.isOnline && isFirebaseInitialized && db) {
                await db.collection('products').doc(productId).delete();
            } else {
                const products = await this.getProducts();
                const filtered = products.filter(p => p.id !== productId);
                localStorage.setItem('amisty_pos_products', JSON.stringify(filtered));
                this.addToOfflineQueue({ type: 'deleteProduct', data: { id: productId } });
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    // Sales CRUD
    async addSale(sale) {
        sale.timestamp = new Date().toISOString();
        sale.receiptNumber = await this.generateReceiptNumber();
        
        try {
            if (this.isOnline && isFirebaseInitialized && db) {
                const docRef = await db.collection('sales').add(sale);
                sale.id = docRef.id;
            } else {
                const sales = JSON.parse(localStorage.getItem('amisty_pos_sales') || '[]');
                sale.id = 'sale_' + Date.now();
                sales.push(sale);
                localStorage.setItem('amisty_pos_sales', JSON.stringify(sales));
                this.addToOfflineQueue({ type: 'addSale', data: sale });
            }
            
            // Update stock
            for (const item of sale.items) {
                const product = await this.getProductById(item.productId);
                if (product) {
                    const newStock = this.calculateNewStock(product, item);
                    await this.updateProduct(item.productId, { stock: newStock });
                }
            }
            
            return sale;
        } catch (error) {
            console.error('Error adding sale:', error);
            throw error;
        }
    }

    calculateNewStock(product, saleItem) {
        if (product.unitPairs && product.unitPairs.length > 0) {
            const primaryUnit = product.unitPairs[0];
            if (saleItem.unit === primaryUnit.unit) {
                // Sold in primary unit, reduce directly
                return {
                    primaryAmount: product.stock.primaryAmount - saleItem.quantity,
                    secondaryAmount: product.stock.secondaryAmount - saleItem.quantity
                };
            } else {
                // Sold in secondary unit, convert
                const reductionInPrimary = saleItem.quantity / primaryUnit.conversionRate;
                const newPrimary = product.stock.primaryAmount - reductionInPrimary;
                const newSecondary = newPrimary * primaryUnit.conversionRate;
                return {
                    primaryAmount: newPrimary,
                    secondaryAmount: newSecondary
                };
            }
        } else {
            return product.stock - saleItem.quantity;
        }
    }

    async getSales(filters = {}) {
        try {
            let sales;
            if (this.isOnline && isFirebaseInitialized && db) {
                let query = db.collection('sales');
                
                if (filters.startDate) {
                    query = query.where('timestamp', '>=', filters.startDate);
                }
                if (filters.endDate) {
                    query = query.where('timestamp', '<=', filters.endDate);
                }
                if (filters.paymentMethod) {
                    query = query.where('paymentMethod', '==', filters.paymentMethod);
                }
                
                const snapshot = await query.orderBy('timestamp', 'desc').get();
                sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                sales = JSON.parse(localStorage.getItem('amisty_pos_sales') || '[]');
            }
            
            // Apply additional filters
            if (filters.category) {
                sales = sales.filter(sale => 
                    sale.items.some(item => item.category === filters.category)
                );
            }
            
            return sales;
        } catch (error) {
            console.error('Error fetching sales:', error);
            return [];
        }
    }

    async generateReceiptNumber() {
        const settings = await getSettings();
        const prefix = settings?.productCodePrefix || 'AMY-';
        
        try {
            let lastNumber = 0;
            if (this.isOnline && isFirebaseInitialized && db) {
                const snapshot = await db.collection('sales')
                    .orderBy('receiptNumber', 'desc')
                    .limit(1)
                    .get();
                
                if (!snapshot.empty) {
                    const lastReceipt = snapshot.docs[0].data().receiptNumber;
                    const match = lastReceipt.match(/\d+/);
                    if (match) lastNumber = parseInt(match[0]);
                }
            } else {
                const sales = JSON.parse(localStorage.getItem('amisty_pos_sales') || '[]');
                if (sales.length > 0) {
                    const lastReceipt = sales[sales.length - 1].receiptNumber;
                    const match = lastReceipt.match(/\d+/);
                    if (match) lastNumber = parseInt(match[0]);
                }
            }
            
            return `${prefix}${String(lastNumber + 1).padStart(6, '0')}`;
        } catch (error) {
            return `${prefix}${String(Date.now()).slice(-6)}`;
        }
    }

    // Inventory Log
    async logInventoryChange(action, productId, productName, oldValue, newValue, reason = '') {
        const log = {
            action,
            productId,
            productName,
            oldValue,
            newValue,
            reason,
            timestamp: new Date().toISOString(),
            user: JSON.parse(sessionStorage.getItem('currentUser'))?.role || 'unknown'
        };
        
        try {
            if (this.isOnline && isFirebaseInitialized && db) {
                await db.collection('inventory_logs').add(log);
            } else {
                const logs = JSON.parse(localStorage.getItem('amisty_pos_inventory_log') || '[]');
                logs.push(log);
                localStorage.setItem('amisty_pos_inventory_log', JSON.stringify(logs));
            }
        } catch (error) {
            console.error('Error logging inventory change:', error);
        }
    }

    async getInventoryLogs() {
        try {
            if (this.isOnline && isFirebaseInitialized && db) {
                const snapshot = await db.collection('inventory_logs')
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                return JSON.parse(localStorage.getItem('amisty_pos_inventory_log') || '[]');
            }
        } catch (error) {
            console.error('Error fetching inventory logs:', error);
            return [];
        }
    }

    // Offline Queue Management
    addToOfflineQueue(operation) {
        this.offlineQueue.push({
            ...operation,
            queuedAt: new Date().toISOString()
        });
        localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
        this.updateOfflineBadge();
    }

    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) return;
        
        showToast(`Syncing ${this.offlineQueue.length} offline transactions...`, 'info');
        
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];
        localStorage.setItem('offlineQueue', JSON.stringify([]));
        this.updateOfflineBadge();
        
        for (const operation of queue) {
            try {
                switch (operation.type) {
                    case 'addProduct':
                        await this.addProduct(operation.data);
                        break;
                    case 'updateProduct':
                        await this.updateProduct(operation.data.id, operation.data.updates);
                        break;
                    case 'addSale':
                        await this.addSale(operation.data);
                        break;
                    // Add other cases as needed
                }
            } catch (error) {
                console.error('Sync error:', error);
                this.offlineQueue.push(operation);
                localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
            }
        }
        
        if (this.offlineQueue.length === 0) {
            showToast('All transactions synced successfully!', 'success');
        } else {
            showToast(`${this.offlineQueue.length} transactions failed to sync`, 'error');
        }
        this.updateOfflineBadge();
    }

    updateOfflineBadge() {
        const badge = document.getElementById('offlineBadge');
        if (badge) {
            if (this.offlineQueue.length > 0) {
                badge.textContent = this.offlineQueue.length;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Categories
    async getCategories() {
        const products = await this.getProducts();
        const categories = [...new Set(products.map(p => p.category))];
        return categories.sort();
    }

    // Product by ID
    async getProductById(id) {
        const products = await this.getProducts();
        return products.find(p => p.id === id) || null;
    }
}

// Global instance
const dataService = new DataService();