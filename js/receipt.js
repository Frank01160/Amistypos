// Receipt Generation and Printing System
function generateReceiptHTML(sale) {
    const settings = JSON.parse(localStorage.getItem('amisty_pos_settings') || '{}');
    const companyName = settings.companyName || 'AMISTY COMPANY';
    const companyAddress = settings.companyAddress || 'Nairobi, Kenya';
    const companyPhone = settings.companyPhone || '';
    const receiptFooter = settings.receiptFooter || 'Thank you for shopping with us!';
    const currency = settings.currency || 'KSh';
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-KE', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-KE', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    let html = `
        <div style="text-align:center;margin-bottom:10px;padding-bottom:10px;border-bottom:1px dashed #000;">
            <h2 style="margin:0;font-size:1.2em;font-weight:bold;color:#2D3436;">${companyName}</h2>
            <p style="margin:3px 0;font-size:0.8em;color:#636E72;">${companyAddress}</p>
            ${companyPhone ? `<p style="margin:3px 0;font-size:0.8em;color:#636E72;">Tel: ${companyPhone}</p>` : ''}
        </div>
        
        <div style="margin:10px 0;font-size:0.8em;">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <span><strong>Receipt No:</strong> ${sale.receiptNumber}</span>
                <span>${dateStr}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <span><strong>Time:</strong> ${timeStr}</span>
                <span><strong>Seller:</strong> ${sale.seller || 'Staff'}</span>
            </div>
            <div style="margin-top:5px;">
                <strong>Customer:</strong> ${sale.customerName || 'Walk-in Customer'}
            </div>
            ${sale.customerPhone ? `<div><strong>Phone:</strong> ${sale.customerPhone}</div>` : ''}
        </div>
        
        <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:8px 0;margin:10px 0;">
            <table style="width:100%;border-collapse:collapse;font-size:0.8em;">
                <thead>
                    <tr style="border-bottom:1px solid #000;">
                        <th style="text-align:left;padding:3px;">Item</th>
                        <th style="text-align:center;padding:3px;">Qty</th>
                        <th style="text-align:right;padding:3px;">Price</th>
                        <th style="text-align:right;padding:3px;">Total</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    sale.items.forEach(item => {
        const itemTotal = item.quantity * item.price;
        html += `
            <tr>
                <td style="padding:3px;">
                    <div>${item.productName}</div>
                    <div style="font-size:0.75em;color:#636E72;">${item.unit}</div>
                </td>
                <td style="text-align:center;padding:3px;">${item.quantity}</td>
                <td style="text-align:right;padding:3px;">${currency} ${item.price.toLocaleString()}</td>
                <td style="text-align:right;padding:3px;font-weight:bold;">${currency} ${itemTotal.toLocaleString()}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        <div style="margin:10px 0;font-size:0.85em;">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                <span>Subtotal:</span>
                <span>${currency} ${(sale.subtotal || sale.total).toLocaleString()}</span>
            </div>
    `;
    
    if (sale.discount > 0) {
        html += `
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;color:#FF6B6B;">
                <span>Discount:</span>
                <span>- ${currency} ${sale.discount.toLocaleString()}</span>
            </div>
        `;
    }
    
    html += `
            <div style="display:flex;justify-content:space-between;font-size:1.1em;font-weight:bold;border-top:2px solid #000;padding-top:5px;margin-top:5px;">
                <span>TOTAL:</span>
                <span>${currency} ${sale.total.toLocaleString()}</span>
            </div>
    `;
    
    if (sale.paymentMethod === 'cash' && sale.amountReceived) {
        html += `
            <div style="display:flex;justify-content:space-between;margin-top:5px;">
                <span>Amount Received:</span>
                <span>${currency} ${sale.amountReceived.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:bold;">
                <span>Change:</span>
                <span>${currency} ${sale.change.toLocaleString()}</span>
            </div>
        `;
    }
    
    html += `
            <div style="display:flex;justify-content:space-between;margin-top:5px;">
                <span>Payment Method:</span>
                <span><strong>${sale.paymentMethod === 'cash' ? 'CASH' : 'M-PESA'}</strong></span>
            </div>
        </div>
        
        <div style="text-align:center;margin-top:15px;padding-top:10px;border-top:1px dashed #000;font-size:0.75em;">
            <p style="margin:5px 0;">${receiptFooter}</p>
            <p style="margin:5px 0;">Served by: ${sale.seller || 'Staff'}</p>
            <p style="margin:5px 0;color:#636E72;">${dateStr} ${timeStr}</p>
        </div>
    `;
    
    return html;
}

function generateReceiptText(sale) {
    const settings = JSON.parse(localStorage.getItem('amisty_pos_settings') || '{}');
    const companyName = settings.companyName || 'AMISTY COMPANY';
    const companyAddress = settings.companyAddress || 'Nairobi, Kenya';
    const companyPhone = settings.companyPhone || '';
    const receiptFooter = settings.receiptFooter || 'Thank you for shopping with us!';
    const currency = settings.currency || 'KSh';
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-KE', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-KE', { 
        hour: '2-digit', 
        minute: '2-digit'
    });
    
    // Create line separator
    const line = '----------------------------------------';
    const thinLine = '--------------------------------';
    
    let text = '';
    
    // Header
    text += line + '\n';
    text += centerText(companyName, 40) + '\n';
    text += centerText(companyAddress, 40) + '\n';
    if (companyPhone) {
        text += centerText('Tel: ' + companyPhone, 40) + '\n';
    }
    text += line + '\n';
    
    // Receipt Info
    text += 'Receipt: ' + sale.receiptNumber + '\n';
    text += 'Date: ' + dateStr + '  ' + timeStr + '\n';
    text += 'Customer: ' + (sale.customerName || 'Walk-in') + '\n';
    if (sale.customerPhone) {
        text += 'Phone: ' + sale.customerPhone + '\n';
    }
    text += thinLine + '\n';
    
    // Items Header
    text += 'Item'.padEnd(20) + 'Qty'.padEnd(6) + 'Price'.padStart(7) + 'Total'.padStart(7) + '\n';
    text += thinLine + '\n';
    
    // Items
    sale.items.forEach(item => {
        const itemTotal = item.quantity * item.price;
        const itemName = item.productName.substring(0, 18);
        text += itemName.padEnd(20);
        text += String(item.quantity).padEnd(6);
        text += String(item.price).padStart(7);
        text += String(itemTotal).padStart(7) + '\n';
        
        if (item.unit) {
            text += '  (' + item.unit + ')\n';
        }
    });
    
    text += thinLine + '\n';
    
    // Totals
    text += 'SUBTOTAL:'.padEnd(28) + (sale.subtotal || sale.total).toLocaleString().padStart(12) + '\n';
    
    if (sale.discount > 0) {
        text += 'DISCOUNT:'.padEnd(28) + ('-' + sale.discount.toLocaleString()).padStart(12) + '\n';
    }
    
    text += line + '\n';
    text += 'TOTAL:'.padEnd(28) + sale.total.toLocaleString().padStart(12) + '\n';
    text += line + '\n';
    
    if (sale.paymentMethod === 'cash' && sale.amountReceived) {
        text += 'RECEIVED:'.padEnd(28) + sale.amountReceived.toLocaleString().padStart(12) + '\n';
        text += 'CHANGE:'.padEnd(28) + sale.change.toLocaleString().padStart(12) + '\n';
    }
    
    text += 'PAYMENT: ' + sale.paymentMethod.toUpperCase() + '\n';
    text += line + '\n';
    
    // Footer
    text += centerText(receiptFooter, 40) + '\n';
    text += centerText('Thank you!', 40) + '\n';
    text += line + '\n';
    
    return text;
}

function centerText(text, width) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
}

function printReceiptHTML(receiptHTML) {
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Receipt</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    width: 80mm;
                    margin: 0 auto;
                    padding: 5mm;
                }
                @media print {
                    body {
                        width: 80mm;
                        padding: 2mm;
                    }
                    @page {
                        margin: 0;
                        size: 80mm auto;
                    }
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td {
                    padding: 2px;
                }
                .no-print {
                    display: none;
                }
            </style>
        </head>
        <body>
            ${receiptHTML}
            <div style="text-align:center;margin-top:10px;" class="no-print">
                <button onclick="window.print()" style="padding:10px 20px;background:#87CEEB;color:white;border:none;border-radius:5px;cursor:pointer;font-size:14px;">
                    🖨️ Print Receipt
                </button>
            </div>
            <script>
                // Auto-print after load
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

function downloadReceiptText(receiptText, receiptNumber) {
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${receiptNumber.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function downloadReceiptWord(receiptHTML, receiptNumber) {
    const fullHTML = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" 
              xmlns:w="urn:schemas-microsoft-com:office:word" 
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <!--[if gte mso 9]><xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                </w:WordDocument>
            </xml><![endif]-->
            <style>
                @page {
                    size: 80mm auto;
                    margin: 5mm;
                }
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 10px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td {
                    padding: 2px;
                }
            </style>
        </head>
        <body>
            ${receiptHTML}
        </body>
        </html>
    `;
    
    const blob = new Blob(['\ufeff' + fullHTML], { 
        type: 'application/msword' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${receiptNumber.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Function to show receipt options after sale
function showReceiptOptions(sale) {
    const receiptHTML = generateReceiptHTML(sale);
    const receiptText = generateReceiptText(sale);
    
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
        <div style="text-align:center;">
            <h3>Sale Complete!</h3>
            <div style="background:#F5F7FA;padding:1rem;border-radius:10px;margin:1rem 0;text-align:left;max-height:400px;overflow-y:auto;">
                ${receiptHTML}
            </div>
            <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                <button class="btn-primary" id="btnPrintReceipt">
                    🖨️ Print Receipt
                </button>
                <button class="btn-secondary" id="btnDownloadText">
                    📥 Download (.txt)
                </button>
                <button class="btn-secondary" id="btnDownloadWord">
                    📄 Download (.doc)
                </button>
                <button class="btn-secondary" id="btnCloseReceipt">
                    ✖️ Close
                </button>
            </div>
        </div>
    `;
    
    const modal = showModal(modalContent, { 
        title: '',
        showClose: false,
        closeOnOverlay: false 
    });
    
    // Add event listeners
    modal.element.querySelector('#btnPrintReceipt').onclick = () => {
        printReceiptHTML(receiptHTML);
    };
    
    modal.element.querySelector('#btnDownloadText').onclick = () => {
        downloadReceiptText(receiptText, sale.receiptNumber);
        showToast('Receipt downloaded as text file', 'success');
    };
    
    modal.element.querySelector('#btnDownloadWord').onclick = () => {
        downloadReceiptWord(receiptHTML, sale.receiptNumber);
        showToast('Receipt downloaded as Word document', 'success');
    };
    
    modal.element.querySelector('#btnCloseReceipt').onclick = () => {
        modal.close();
    };
    
    return modal;
}