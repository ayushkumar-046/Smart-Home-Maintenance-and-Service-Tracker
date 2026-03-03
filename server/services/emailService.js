const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_gmail@gmail.com') {
        console.log('⚠️  Email service not configured. Set EMAIL_USER and EMAIL_PASS in .env');
        return null;
    }

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    return transporter;
}

async function sendReminderEmail(to, subject, body) {
    const transport = getTransporter();
    if (!transport) {
        console.log(`📧 [Email Mock] To: ${to} | Subject: ${subject}`);
        return { success: true, mock: true };
    }

    try {
        const info = await transport.sendMail({
            from: `"Smart Home Tracker" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0f172a, #0ea5e9); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏠 Smart Home Tracker</h1>
          </div>
          <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
            <h2 style="color: #0f172a;">${subject}</h2>
            <div style="color: #475569; line-height: 1.6;">${body}</div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 12px;">This is an automated reminder from Smart Home Tracker.</p>
          </div>
        </div>
      `
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email send failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function sendServiceReminder(userEmail, userName, applianceName, scheduledDate, daysUntil) {
    const subject = `⏰ Service Reminder: ${applianceName} in ${daysUntil} day(s)`;
    const body = `
    <p>Hi ${userName},</p>
    <p>This is a friendly reminder that your <strong>${applianceName}</strong> has a scheduled service coming up.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr>
        <td style="padding: 8px; background: #e0f2fe; font-weight: bold;">Appliance</td>
        <td style="padding: 8px; background: #e0f2fe;">${applianceName}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">Scheduled Date</td>
        <td style="padding: 8px;">${scheduledDate}</td>
      </tr>
      <tr>
        <td style="padding: 8px; background: #e0f2fe; font-weight: bold;">Days Until Service</td>
        <td style="padding: 8px; background: #e0f2fe;">${daysUntil} day(s)</td>
      </tr>
    </table>
    <p>Please ensure you're prepared for the service visit.</p>
    <p>Best regards,<br>Smart Home Tracker Team</p>
  `;
    return sendReminderEmail(userEmail, subject, body);
}

async function sendWarrantyExpiryAlert(userEmail, userName, applianceName, expiryDate, daysUntil) {
    const subject = `⚠️ Warranty Expiring: ${applianceName}`;
    const body = `
    <p>Hi ${userName},</p>
    <p>Your <strong>${applianceName}</strong> warranty is expiring soon.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr>
        <td style="padding: 8px; background: #fef3c7; font-weight: bold;">Appliance</td>
        <td style="padding: 8px; background: #fef3c7;">${applianceName}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">Warranty Expiry</td>
        <td style="padding: 8px;">${expiryDate}</td>
      </tr>
      <tr>
        <td style="padding: 8px; background: #fef3c7; font-weight: bold;">Days Remaining</td>
        <td style="padding: 8px; background: #fef3c7;">${daysUntil} day(s)</td>
      </tr>
    </table>
    <p>Consider scheduling any pending warranty claims before expiry.</p>
    <p>Best regards,<br>Smart Home Tracker Team</p>
  `;
    return sendReminderEmail(userEmail, subject, body);
}

module.exports = {
    sendReminderEmail,
    sendServiceReminder,
    sendWarrantyExpiryAlert
};
