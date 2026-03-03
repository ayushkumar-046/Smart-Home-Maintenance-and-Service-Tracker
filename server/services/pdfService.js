const PDFDocument = require('pdfkit');

function generateReceipt(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];

            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Header with gradient-like effect
            doc.rect(0, 0, doc.page.width, 120).fill('#0f172a');
            doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff')
                .text('Smart Home Tracker', 50, 35);
            doc.fontSize(12).font('Helvetica').fillColor('#7dd3fc')
                .text('Payment Receipt', 50, 70);

            // Receipt details
            doc.moveDown(4);
            doc.fillColor('#0f172a');

            // Receipt info box
            const y = 150;
            doc.roundedRect(50, y, doc.page.width - 100, 80, 5).stroke('#e2e8f0');
            doc.fontSize(10).font('Helvetica')
                .fillColor('#64748b')
                .text('Receipt Number', 70, y + 15)
                .text('Date', 250, y + 15)
                .text('Status', 400, y + 15);
            doc.fontSize(12).font('Helvetica-Bold')
                .fillColor('#0f172a')
                .text(data.receiptNumber || `RCP-${Date.now()}`, 70, y + 35)
                .text(data.date || new Date().toLocaleDateString(), 250, y + 35)
                .text('PAID', 400, y + 35);

            // Customer info
            doc.moveDown(3);
            const custY = y + 110;
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a')
                .text('Bill To:', 50, custY);
            doc.fontSize(11).font('Helvetica').fillColor('#475569')
                .text(data.customerName || 'Customer', 50, custY + 20)
                .text(data.customerEmail || '', 50, custY + 35);

            // Line items table
            const tableY = custY + 70;
            doc.rect(50, tableY, doc.page.width - 100, 30).fill('#f1f5f9');
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a')
                .text('Description', 70, tableY + 9)
                .text('Period', 300, tableY + 9)
                .text('Amount', 450, tableY + 9);

            const itemY = tableY + 40;
            doc.fontSize(11).font('Helvetica').fillColor('#334155')
                .text(data.planName || 'Premium Plan Subscription', 70, itemY)
                .text(data.period || 'Monthly', 300, itemY)
                .text(data.amount || '₹499', 450, itemY);

            // Divider
            doc.moveTo(50, itemY + 30).lineTo(doc.page.width - 50, itemY + 30).stroke('#e2e8f0');

            // Total
            const totalY = itemY + 45;
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a')
                .text('Total Paid:', 350, totalY)
                .text(data.amount || '₹499', 450, totalY);

            // Footer
            doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
                .text('Thank you for choosing Smart Home Tracker!', 50, doc.page.height - 80, { align: 'center' })
                .text('This is a computer-generated receipt and does not require a signature.', 50, doc.page.height - 65, { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

function generateServiceReport(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];

            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // Header
            doc.rect(0, 0, doc.page.width, 120).fill('#0f172a');
            doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff')
                .text('Smart Home Tracker', 50, 35);
            doc.fontSize(12).font('Helvetica').fillColor('#7dd3fc')
                .text('Service Report', 50, 70);

            doc.moveDown(4);
            doc.fillColor('#0f172a');

            // Report info
            const y = 150;
            doc.fontSize(14).font('Helvetica-Bold')
                .text(`Report for: ${data.propertyName || 'Property'}`, 50, y);
            doc.fontSize(10).font('Helvetica').fillColor('#64748b')
                .text(`Generated: ${new Date().toLocaleDateString()}`, 50, y + 20)
                .text(`Report Period: ${data.period || 'All Time'}`, 50, y + 35);

            // Summary stats
            const statsY = y + 65;
            doc.roundedRect(50, statsY, 150, 70, 5).stroke('#e2e8f0');
            doc.roundedRect(220, statsY, 150, 70, 5).stroke('#e2e8f0');
            doc.roundedRect(390, statsY, 150, 70, 5).stroke('#e2e8f0');

            doc.fontSize(10).font('Helvetica').fillColor('#64748b')
                .text('Total Services', 60, statsY + 10)
                .text('Total Cost', 230, statsY + 10)
                .text('Appliances', 400, statsY + 10);
            doc.fontSize(20).font('Helvetica-Bold').fillColor('#0ea5e9')
                .text(String(data.totalServices || 0), 60, statsY + 35)
                .text(`₹${data.totalCost || '0'}`, 230, statsY + 35)
                .text(String(data.totalAppliances || 0), 400, statsY + 35);

            // Service log table
            const tableY = statsY + 95;
            doc.rect(50, tableY, doc.page.width - 100, 25).fill('#f1f5f9');
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a')
                .text('Date', 60, tableY + 7)
                .text('Appliance', 140, tableY + 7)
                .text('Vendor', 280, tableY + 7)
                .text('Status', 390, tableY + 7)
                .text('Cost', 470, tableY + 7);

            let rowY = tableY + 30;
            const services = data.services || [];
            for (let i = 0; i < Math.min(services.length, 15); i++) {
                const svc = services[i];
                if (i % 2 === 0) {
                    doc.rect(50, rowY - 5, doc.page.width - 100, 20).fill('#fafafa');
                }
                doc.fontSize(8).font('Helvetica').fillColor('#334155')
                    .text(svc.date || '', 60, rowY)
                    .text((svc.appliance || '').substring(0, 20), 140, rowY)
                    .text((svc.vendor || '').substring(0, 18), 280, rowY)
                    .text(svc.status || '', 390, rowY)
                    .text(`₹${svc.cost || '0'}`, 470, rowY);
                rowY += 20;
            }

            // Footer
            doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
                .text('Generated by Smart Home Tracker', 50, doc.page.height - 50, { align: 'center' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { generateReceipt, generateServiceReport };
