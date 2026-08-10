# 🏠 Smart Home Maintenance & Service Tracker

A comprehensive full-stack web application that I built to help homeowners manage their home maintenance, track appliances, schedule services, and get AI-powered maintenance insights — all in one place.

## 📌 Project Overview

Managing home maintenance can be overwhelming — tracking warranties, scheduling services, monitoring costs, and finding reliable vendors. I built this application to solve all these problems by providing a centralized platform where homeowners can manage everything related to their home maintenance.

The app supports **three user roles** (Homeowner, Service Provider, Admin), each with dedicated dashboards and features tailored to their needs.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6 |
| **Backend** | Node.js 20, Express.js |
| **Database** | PostgreSQL via `DATABASE_URL` |
| **Authentication** | JWT (jsonwebtoken) + bcryptjs |
| **Payments** | Stripe (test mode integration) |
| **File Handling** | Multer (buffer uploads stored in PostgreSQL) |
| **AI Features** | Anthropic Claude Opus 4.6 API with intelligent fallback responses |
| **Email** | Nodemailer with Gmail SMTP |
| **Charts** | Recharts |
| **PDF Generation** | PDFKit |
| **Task Scheduling** | node-cron |
| **State Management** | React Context + useReducer |

## ✨ Key Features

### For Homeowners
- 🏡 **Property Management** — Add and manage multiple properties
- 📱 **Appliance Tracking** — Track all appliances with purchase dates, warranty expiry, and lifecycle stages
- 📅 **Service Scheduling** — Book maintenance services with preferred vendors
- 🤖 **AI-Powered Insights** — Get predictive maintenance alerts, cost forecasts, anomaly detection, vendor recommendations, and appliance lifespan optimization tips
- 📄 **Document Management** — Upload and organize maintenance receipts and documents
- 🔔 **Smart Notifications** — Receive alerts for upcoming maintenance, warranty expiry, and service updates
- 📊 **Expense Tracking** — Visualize maintenance spending with interactive charts

### For Service Providers
- 📋 **Job Management** — View and manage assigned service requests
- ✅ **Status Updates** — Update job progress and completion status
- ⭐ **Rating System** — Build reputation through customer feedback

### For Admins
- 📈 **Platform Analytics** — Monitor user growth, revenue, and service metrics
- 👥 **User Management** — Manage homeowners and service providers
- 📥 **PDF Reports** — Download comprehensive platform reports
- 🏢 **Vendor Management** — Oversee vendor directory

### General Features
- 💳 **Subscription Plans** — Free & Premium (₹499/month) tiers with clear feature distinction
- 🔐 **Secure Authentication** — JWT-based auth with HTTP-only cookies
- 📱 **Responsive Design** — Works seamlessly on desktop and mobile
- 🌙 **Modern UI** — Clean, professional interface with Tailwind CSS

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/ayushkumar-046/Smart-Home-Maintenance-and-Service-Tracker.git
cd Smart-Home-Maintenance-and-Service-Tracker

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
cd ..
```

### Configuration

```bash
# Create environment file
cp .env.example .env
```

Edit `.env` and configure your keys:
- `JWT_SECRET` — Required for authentication
- `ANTHROPIC_API_KEY` — Optional (app works with smart fallback responses without it)
- `STRIPE_SECRET_KEY` — Optional (for payment processing)
- `EMAIL_USER` / `EMAIL_PASS` — Optional (for email notifications)

For deployment, also set:
- `CLIENT_URL` — Your deployed frontend URL
- `VITE_API_BASE_URL` — Your deployed backend API URL
- `DATABASE_URL` — Hosted database connection string if you switch to a managed SQL database
- `NODE_ENV=production`

### Running the Application

```bash
npm run dev
```

This starts both the backend (http://localhost:5000) and frontend (http://localhost:5173) concurrently.

### Deployment Notes

- Build the client with `npm run build` from the repo root.
- Deploy the backend with the same `server/index.js` entrypoint.
- Set `CLIENT_URL` and `VITE_API_BASE_URL` to your live domains so cookies and API calls work cross-origin.
- Set `DATABASE_URL` to your hosted PostgreSQL instance. The app bootstraps its schema and seeds automatically when the users table is empty.
- Documents, receipts, and invoices are stored in PostgreSQL as file blobs, so they persist across restarts and redeploys.

### Default Credentials

| Role | User ID | Email | Password |
|------|---------|-------|----------|
| Admin | ADM-0001 | admin@smarthome.com | Admin@123 |
| Homeowner | HOM-0001 | homeowner1@smarthome.com | Homeowner1@123 |
| Homeowner | HOM-0002 | homeowner2@smarthome.com | Homeowner2@123 |
| Homeowner | HOM-0003 | homeowner3@smarthome.com | Homeowner3@123 |
| Homeowner | HOM-0004 | homeowner4@smarthome.com | Homeowner4@123 |
| Homeowner | HOM-0005 | homeowner5@smarthome.com | Homeowner5@123 |
| Homeowner | HOM-0006 | homeowner6@smarthome.com | Homeowner6@123 |
| Homeowner | HOM-0007 | homeowner7@smarthome.com | Homeowner7@123 |
| Homeowner | HOM-0008 | homeowner8@smarthome.com | Homeowner8@123 |
| Homeowner | HOM-0009 | homeowner9@smarthome.com | Homeowner9@123 |
| Homeowner | HOM-0010 | homeowner10@smarthome.com | Homeowner10@123 |
| Service Provider | PRV-0001 | provider1@smarthome.com | Provider1@123 |
| Service Provider | PRV-0002 | provider2@smarthome.com | Provider2@123 |
| Service Provider | PRV-0003 | provider3@smarthome.com | Provider3@123 |
| Service Provider | PRV-0004 | provider4@smarthome.com | Provider4@123 |
| Service Provider | PRV-0005 | provider5@smarthome.com | Provider5@123 |
| Service Provider | PRV-0006 | provider6@smarthome.com | Provider6@123 |
| Service Provider | PRV-0007 | provider7@smarthome.com | Provider7@123 |
| Service Provider | PRV-0008 | provider8@smarthome.com | Provider8@123 |
| Service Provider | PRV-0009 | provider9@smarthome.com | Provider9@123 |
| Service Provider | PRV-0010 | provider10@smarthome.com | Provider10@123 |

## 📁 Project Structure

```
Smart-Home-Maintenance-and-Service-Tracker/
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ExpenseChart.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── ServiceCard.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── WarrantyAlert.jsx
│   │   ├── context/            # React Context providers
│   │   │   └── AuthContext.jsx
│   │   ├── pages/              # Page components
│   │   │   ├── AIInsights.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── Appliances.jsx
│   │   │   ├── Documents.jsx
│   │   │   ├── HomeownerDashboard.jsx
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Notifications.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Properties.jsx
│   │   │   ├── ProviderDashboard.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Schedules.jsx
│   │   │   ├── ServiceLog.jsx
│   │   │   └── Subscription.jsx
│   │   ├── App.jsx             # Main app with routing
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Global styles & Tailwind
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── server/                     # Express Backend
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication middleware
│   │   └── roleCheck.js        # Role-based access control
│   ├── routes/
│   │   ├── admin.js            # Admin API endpoints
│   │   ├── ai.js               # AI insights endpoints
│   │   ├── appliances.js       # Appliance CRUD
│   │   ├── auth.js             # Authentication (login/register)
│   │   ├── documents.js        # Document upload/management
│   │   ├── notifications.js    # Notification system
│   │   ├── properties.js       # Property management
│   │   ├── schedules.js        # Service scheduling
│   │   ├── services.js         # Service log management
│   │   ├── subscriptions.js    # Subscription & payments
│   │   └── vendors.js          # Vendor directory
│   ├── services/
│   │   ├── aiService.js        # AI predictions & recommendations
│   │   ├── cronService.js      # Scheduled background tasks
│   │   ├── emailService.js     # Email notification service
│   │   ├── pdfService.js       # PDF report generation
│   │   └── stripeService.js    # Stripe payment processing
│   ├── uploads/                # User uploaded files
│   ├── config/
│   │   └── database.js         # Database schema
│   ├── db.js                   # Database entrypoint
│   ├── index.js                # Server entry point
│   └── .env.example            # Environment variable template
├── .gitignore
├── package.json                # Root package with dev scripts
└── README.md
```

## 🧠 AI Features Deep Dive

The AI module provides five intelligent capabilities:

1. **Predictive Maintenance** — Analyzes appliance age, service history, and category to predict when the next service is needed, with risk factor assessment
2. **Cost Forecasting** — Projects future maintenance costs based on historical data, with cost breakdowns (labor/parts/tax) and seasonal tips
3. **Anomaly Detection** — Identifies unusual service patterns — flags if an appliance needs too many repairs or costs are abnormally high
4. **Vendor Recommendations** — Scores and ranks vendors based on rating (50%), experience (30%), and category expertise (20%)
5. **Lifespan Optimization** — Provides age-specific maintenance tips to extend appliance life, with health scores and efficiency estimates

> The AI features work with Anthropic Claude Opus 4.6 when an API key is configured. Without it, the app uses intelligent category-aware fallback responses that still provide useful insights.

## 🔐 Production Data Model

The database seeds a realistic production dataset on first boot:

- 1 admin account
- 10 homeowner accounts
- 10 service provider accounts
- Multiple properties per homeowner profile
- Appliances with installation dates, condition, and lifecycle stage
- Schedules, completed service logs, notifications, feedback, and database-backed documents

All user-facing IDs are stored as public IDs in the database and surfaced in the admin and profile views.

## 🔮 Future Enhancements

- [ ] Real-time chat between homeowners and service providers
- [ ] Mobile app (React Native)
- [ ] IoT device integration for automated maintenance alerts
- [ ] Multi-language support
- [ ] Advanced analytics dashboard with trend analysis

## 📝 License

This project is developed for educational and portfolio purposes.

---

**Developed by Ayush Kumar** | [GitHub](https://github.com/ayushkumar-046)
