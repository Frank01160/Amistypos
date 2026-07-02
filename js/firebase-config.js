// Firebase Configuration
// Replace these with your actual Firebase config when setting up
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
let db;
let isFirebaseInitialized = false;

function initializeFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            
            // Enable offline persistence
            db.enablePersistence()
                .then(() => {
                    console.log('Offline persistence enabled');
                    isFirebaseInitialized = true;
                })
                .catch((err) => {
                    if (err.code == 'failed-precondition') {
                        console.warn('Multiple tabs open, persistence disabled');
                    } else if (err.code == 'unimplemented') {
                        console.warn('Browser doesn\'t support persistence');
                    }
                    isFirebaseInitialized = true; // Still usable online
                });
        } else {
            console.warn('Firebase SDK not loaded, using localStorage fallback');
            initializeLocalFallback();
        }
    } catch (error) {
        console.error('Firebase initialization error:', error);
        initializeLocalFallback();
    }
}

// Local fallback when Firebase is not available
function initializeLocalFallback() {
    console.log('Using localStorage for data storage');
    if (!localStorage.getItem('amisty_pos_products')) {
        localStorage.setItem('amisty_pos_products', JSON.stringify([]));
    }
    if (!localStorage.getItem('amisty_pos_sales')) {
        localStorage.setItem('amisty_pos_sales', JSON.stringify([]));
    }
    if (!localStorage.getItem('amisty_pos_inventory_log')) {
        localStorage.setItem('amisty_pos_inventory_log', JSON.stringify([]));
    }
    if (!localStorage.getItem('amisty_pos_settings')) {
        const defaultSettings = {
            companyName: 'AMISTY COMPANY',
            companyAddress: 'Nairobi, Kenya',
            companyPhone: '0700-000000',
            receiptFooter: 'Thank you for shopping with us!',
            currency: 'KSh',
            lowStockThreshold: 10,
            productCodePrefix: 'AMY-',
            productCodeStart: 1,
            sessionTimeout: 15,
            maxLoginAttempts: 5,
            lockoutDuration: 30
        };
        localStorage.setItem('amisty_pos_settings', JSON.stringify(defaultSettings));
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
});