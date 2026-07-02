# AMISTY POS System

A complete, modern Point of Sale system for agrovet shops and small businesses.

## 🚀 Features

### For Sellers
- **Quick POS Interface** - Fast product search and basket management
- **Category Filtering** - Easy product browsing by categories
- **Dual Unit Support** - Sell in different units (bags/kg, litres/barrows)
- **Split Payments** - Accept both Cash and M-Pesa payments
- **Customer Display** - Show basket to customers
- **Receipt Options** - Print, download as text or Word document
- **Discount Support** - Apply KSh discounts
- **Offline Mode** - Continue selling even without internet

### For Managers
- **Dashboard** - Sales overview with charts and statistics
- **Inventory Management** - Add, edit, delete products
- **Unit Pair System** - Define custom unit conversions
- **Stock Tracking** - Low stock alerts and batch tracking
- **Reports** - Sales reports, product performance, category breakdown
- **Export Options** - CSV and Word document exports
- **Settings** - Customize company info, passwords, thresholds
- **Activity Log** - Track all changes and adjustments
- **Bulk Import** - Import products via CSV
- **Data Management** - Export/Import full database backup

## 📦 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Firebase Firestore (Free Tier)
- **Hosting**: Vercel (Free Tier)
- **Version Control**: GitHub
- **Offline**: Service Worker & localStorage

## 🎨 Themes

The system includes 20+ themes that can be easily activated:
1. Sky Blue & Light Green (Default)
2. Gold & Purple
3. Deep Blue & Silver
4. Forest Green & Earth Brown
5. Coral & Teal
6. Monochrome Dark
7. Sunset Orange & Pink
8. Ocean Blue & Sand
9. Lavender & Mint
10. Cherry Red & Cream
...and more!

## 🛠️ Setup Instructions

### 1. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Firestore Database
4. Go to Project Settings > General > Your apps > Web app
5. Copy the Firebase configuration
6. Paste it in `js/firebase-config.js`

### 2. GitHub Setup
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/amisty-pos.git
git push -u origin main