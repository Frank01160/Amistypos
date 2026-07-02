// Firebase Configuration for AMISTY POS
const firebaseConfig = {
  apiKey: "AIzaSyAaKjx0lkxmGdR79CF_Fd9Gpu8bWYtzcQA",
  authDomain: "amisty-pos-2e82f.firebaseapp.com",
  projectId: "amisty-pos-2e82f",
  storageBucket: "amisty-pos-2e82f.appspot.com",
  messagingSenderId: "315339727631",
  appId: "1:315339727631:web:0702ed1e9d03740262947a"
};

// Initialize Firebase
let db = null;
let isFirebaseInitialized = false;

// Initialize Firebase using compat SDK
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        isFirebaseInitialized = true;
        console.log('✅ Firebase initialized successfully');
        console.log('📦 Project ID:', firebaseConfig.projectId);
        
        // Enable offline persistence
        db.enablePersistence()
            .then(() => {
                console.log('✅ Offline persistence enabled');
            })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('⚠️ Multiple tabs open, persistence disabled');
                } else if (err.code === 'unimplemented') {
                    console.warn('⚠️ Browser doesn\'t support persistence');
                }
            });
    } else {
        console.error('❌ Firebase SDK not loaded! Check if Firebase scripts are in HTML');
        setupLocalFallback();
    }
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
    setupLocalFallback();
}

// Setup localStorage as fallback
function setupLocalFallback() {
    console.log('📦 Using localStorage as fallback');
    
    // Set default settings if not exist
    if (!localStorage.getItem('amisty_pos_settings')) {
        const defaultSettings = {
            companyName: 'AMISTY COMPANY',
            companyAddress: 'Nairobi, Kenya',
            companyPhone: '0700-000000',
            receiptFooter: 'Thank you for shopping with us!',
            managerPassword: 'admin123',
            sellerPassword: 'seller123',
            currency: 'KSh',
            lowStockThreshold: 10,
            productCodePrefix: 'AMY-',
            sessionTimeout: 15,
            maxLoginAttempts: 5,
            lockoutDuration: 30
        };
        localStorage.setItem('amisty_pos_settings', JSON.stringify(defaultSettings));
    }
    
    // Initialize empty collections if not exist
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

// Test Firebase connection
async function testFirebaseConnection() {
    if (!isFirebaseInitialized || !db) {
        console.warn('⚠️ Firebase not initialized');
        return false;
    }
    
    try {
        const testDoc = await db.collection('_test_').doc('connection_test').get();
        console.log('✅ Firebase connection successful');
        return true;
    } catch (error) {
        console.error('❌ Firebase connection failed:', error);
        return false;
    }
}

// Run test when loaded
document.addEventListener('DOMContentLoaded', () => {
    if (isFirebaseInitialized) {
        testFirebaseConnection();
    }
});
