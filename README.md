# 🏠 Smart Home Maintenance & Service Tracker

A full-stack web application for managing home maintenance, tracking appliances, scheduling services, and getting AI-powered maintenance insights.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + Tailwind CSS + React Router v6 |
| **Backend** | Node.js 20 + Express.js |
| **Database** | SQLite (via better-sqlite3) |
| **Auth** | JWT + bcryptjs |
| **Payments** | Stripe (test mode) |
| **File Upload** | Multer (local /uploads folder) |
| **AI** | OpenAI GPT-4o API (with smart fallbacks) |
| **Email** | Nodemailer (Gmail SMTP) |
| **Charts** | Recharts |
| **PDF** | PDFKit |
| **Scheduler** | node-cron |
| **State** | React Context + useReducer |

## Features

- **Multi-role Support**: Homeowner, Service Provider, Admin dashboards
- **Property & Appliance Management**: Track all your home appliances with warranty info
- **Service Scheduling**: Book and manage maintenance services
- **AI Insights**: Predictive maintenance, cost forecasting, anomaly detection, vendor recommendations, lifespan optimization
- **Vendor Directory**: Browse and rate service providers
- **Document Management**: Upload and organize maintenance documents
- **Subscription Plans**: Free & Premium (₹499/month) tiers
- **PDF Reports**: Download service reports and payment receipts
- **Notifications**: Real-time alerts for upcoming maintenance
- **Admin Dashboard**: Platform analytics with user and vendor management

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd smart-home-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` with your keys (JWT_SECRET is required, others are optional).

4. **Start the application**
   ```bash
   npm run dev
   ```
   This starts both the backend (port 5000) and frontend (port 5173) concurrently.

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smarthome.com | Admin@123 |
| Homeowner | homeowner@smarthome.com | Home@123 |
| Provider | provider@smarthome.com | Provider@123 |

## Project Structure

```
smart-home-tracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth context provider
│   │   ├── pages/          # Page components
│   │   ├── App.jsx         # Main app with routing
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Global styles
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                 # Express backend
│   ├── middleware/          # Auth & role-check middleware
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic (AI, PDF, Stripe, etc.)
│   ├── uploads/            # File upload directory
│   ├── db.js               # Database schema & seed data
│   ├── index.js            # Server entry point
│   └── .env.example        # Environment variable template
├── .gitignore
├── package.json            # Root package with dev scripts
└── README.md
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Secret key for JWT tokens |
| `OPENAI_API_KEY` | ❌ | OpenAI API key (smart fallbacks work without it) |
| `STRIPE_SECRET_KEY` | ❌ | Stripe secret key for payments |
| `SMTP_USER` | ❌ | Gmail address for email notifications |
| `SMTP_PASS` | ❌ | Gmail app password |

## License

This project is for educational purposes.
