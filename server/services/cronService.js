const cron = require('node-cron');
const db = require('../db');
const { sendServiceReminder, sendWarrantyExpiryAlert } = require('./emailService');

function startCronJobs() {
    // Run daily at 8:00 AM - check for upcoming service reminders
    cron.schedule('0 8 * * *', () => {
        console.log('🔄 Running daily service reminder check...');
        checkServiceReminders();
        checkWarrantyExpiry();
    });

    console.log('✅ Cron jobs scheduled (daily at 8:00 AM)');
}

function checkServiceReminders() {
    try {
        const today = new Date();
        const schedules = db.prepare(`
      SELECT s.*, a.name as appliance_name, p.user_id, u.email, u.name as user_name
      FROM schedules s
      JOIN appliances a ON s.appliance_id = a.id
      JOIN properties p ON a.property_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE s.next_due IS NOT NULL
    `).all();

        for (const schedule of schedules) {
            if (!schedule.next_due) continue;

            const dueDate = new Date(schedule.next_due);
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Send reminder at configured days before AND 1 day before
            if (diffDays === schedule.reminder_days_before || diffDays === 1) {
                sendServiceReminder(
                    schedule.email,
                    schedule.user_name,
                    schedule.appliance_name,
                    schedule.next_due,
                    diffDays
                ).then(result => {
                    if (result.success) {
                        // Create in-app notification
                        db.prepare(`
              INSERT INTO notifications (user_id, title, message, type)
              VALUES (?, ?, ?, ?)
            `).run(
                            schedule.user_id,
                            'Service Reminder',
                            `Your ${schedule.appliance_name} has a service due in ${diffDays} day(s) on ${schedule.next_due}.`,
                            'reminder'
                        );
                    }
                }).catch(err => console.error('Reminder email failed:', err.message));
            }
        }
    } catch (error) {
        console.error('Service reminder check failed:', error.message);
    }
}

function checkWarrantyExpiry() {
    try {
        const today = new Date();
        const appliances = db.prepare(`
      SELECT a.*, p.user_id, u.email, u.name as user_name
      FROM appliances a
      JOIN properties p ON a.property_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE a.warranty_expiry IS NOT NULL
    `).all();

        for (const appliance of appliances) {
            if (!appliance.warranty_expiry) continue;

            const expiryDate = new Date(appliance.warranty_expiry);
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Alert at 30 days and 7 days before expiry
            if (diffDays === 30 || diffDays === 7) {
                sendWarrantyExpiryAlert(
                    appliance.email,
                    appliance.user_name,
                    appliance.name,
                    appliance.warranty_expiry,
                    diffDays
                ).then(result => {
                    if (result.success) {
                        db.prepare(`
              INSERT INTO notifications (user_id, title, message, type)
              VALUES (?, ?, ?, ?)
            `).run(
                            appliance.user_id,
                            'Warranty Expiring Soon',
                            `Your ${appliance.name} (${appliance.brand} ${appliance.model}) warranty expires in ${diffDays} days on ${appliance.warranty_expiry}.`,
                            'warning'
                        );
                    }
                }).catch(err => console.error('Warranty email failed:', err.message));
            }
        }
    } catch (error) {
        console.error('Warranty check failed:', error.message);
    }
}

module.exports = { startCronJobs, checkServiceReminders, checkWarrantyExpiry };
