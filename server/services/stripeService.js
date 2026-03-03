const stripe = require('stripe');
const db = require('../db');
const { generateReceipt } = require('./pdfService');
const fs = require('fs');
const path = require('path');

function getStripeClient() {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_your_stripe_key') {
        return null;
    }
    return stripe(process.env.STRIPE_SECRET_KEY);
}

async function createCheckoutSession(userId, userEmail) {
    const stripeClient = getStripeClient();
    if (!stripeClient) {
        // Mock checkout for development without Stripe keys
        const mockSessionId = `mock_session_${Date.now()}`;
        db.prepare(`
      INSERT INTO subscriptions (user_id, plan, stripe_session_id, status, start_date, end_date)
      VALUES (?, 'premium', ?, 'active', date('now'), date('now', '+30 days'))
    `).run(userId, mockSessionId);

        db.prepare("UPDATE users SET plan = 'premium' WHERE id = ?").run(userId);

        return {
            url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/subscription?success=true&mock=true`,
            sessionId: mockSessionId,
            mock: true
        };
    }

    const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        customer_email: userEmail,
        line_items: [{
            price: process.env.STRIPE_PREMIUM_PRICE_ID,
            quantity: 1
        }],
        success_url: `${process.env.CLIENT_URL}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/subscription?cancelled=true`,
        metadata: { userId: String(userId) }
    });

    return { url: session.url, sessionId: session.id, mock: false };
}

async function handleWebhook(payload, sig) {
    const stripeClient = getStripeClient();
    if (!stripeClient) {
        return { received: true, mock: true };
    }

    let event;
    try {
        event = stripeClient.webhooks.constructEvent(
            payload,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = parseInt(session.metadata.userId);

            db.prepare(`
        INSERT INTO subscriptions (user_id, plan, stripe_session_id, status, start_date, end_date)
        VALUES (?, 'premium', ?, 'active', date('now'), date('now', '+30 days'))
      `).run(userId, session.id);

            db.prepare("UPDATE users SET plan = 'premium' WHERE id = ?").run(userId);

            db.prepare(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, ?)
      `).run(userId, 'Welcome to Premium!', 'Your premium subscription is now active. Enjoy unlimited features!', 'success');

            // Generate receipt PDF
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            if (user) {
                try {
                    const receiptBuffer = await generateReceipt({
                        receiptNumber: `RCP-${Date.now()}`,
                        date: new Date().toLocaleDateString(),
                        customerName: user.name,
                        customerEmail: user.email,
                        planName: 'Premium Plan Subscription',
                        period: 'Monthly',
                        amount: '₹499'
                    });

                    const receiptsDir = path.join(__dirname, '..', 'uploads', 'receipts');
                    if (!fs.existsSync(receiptsDir)) {
                        fs.mkdirSync(receiptsDir, { recursive: true });
                    }
                    const filename = `receipt_${userId}_${Date.now()}.pdf`;
                    fs.writeFileSync(path.join(receiptsDir, filename), receiptBuffer);
                } catch (err) {
                    console.error('Receipt generation failed:', err.message);
                }
            }
            break;
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            const customerEmail = invoice.customer_email;
            const user = db.prepare('SELECT id FROM users WHERE email = ?').get(customerEmail);

            if (user) {
                db.prepare(`
          UPDATE subscriptions SET status = 'payment_failed'
          WHERE user_id = ? AND status = 'active'
        `).run(user.id);

                db.prepare(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, ?)
        `).run(user.id, 'Payment Failed', 'Your subscription payment failed. Please update your payment method.', 'error');
            }
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            const customerEmail = subscription.customer_email || '';
            const user = db.prepare('SELECT id FROM users WHERE email = ?').get(customerEmail);

            if (user) {
                db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(user.id);
                db.prepare(`
          UPDATE subscriptions SET status = 'cancelled'
          WHERE user_id = ? AND status = 'active'
        `).run(user.id);
            }
            break;
        }
    }

    return { received: true };
}

module.exports = { createCheckoutSession, handleWebhook, getStripeClient };
