# 🤖 StockSage - Multi-Agent AI Inventory Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-purple)](https://openai.com/)

StockSage is an advanced AI-powered inventory management system that uses multiple specialized AI agents to optimize stock levels, reduce costs, prevent stockouts, and automate purchase decisions.

## ✨ Features

### 🤖 Multi-Agent AI System
- **Demand Forecasting Agent**: Predicts future demand using time-series analysis and ML
- **Inventory Optimization Agent**: Calculates optimal stock levels using EOQ formulas
- **Supplier Coordination Agent**: Recommends best suppliers and order quantities
- **Risk Analysis Agent**: Identifies and quantifies inventory risks
- **Agent Orchestrator**: Coordinates all agents through multi-agent negotiation

### 📊 Decision Engine
- **Economic Order Quantity (EOQ)** calculations
- **Reorder Point (ROP)** optimization
- **Safety Stock** calculations with service levels
- **Risk Scoring** with weighted factors

### 🔄 Business Automation
- Automatic purchase order generation with PDF exports
- Email notifications to suppliers (Nodemailer)
- SMS alerts for critical stockouts (Twilio)
- Real-time inventory updates via WebSocket

### 📈 Learning System
- Forecast accuracy tracking (MAPE, RMSE, Hit Rate)
- A/B testing for model comparison
- Feedback loop for continuous improvement
- Model auto-promotion based on performance

### 🎨 Modern UI
- Beautiful dashboard with KPIs
- Interactive configuration interface
- Real-time agent activity feed
- Responsive design with Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- Node.js 20 or higher
- OpenAI API key
- (Optional) Gmail SMTP credentials for email
- (Optional) Twilio credentials for SMS

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/hackerprank01/StockSage.git
cd StockSage
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env and add your API keys
```

Required environment variables:
```env
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o

# Optional but recommended:
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

4. **Initialize database**
```bash
npm run dev
# Database will be initialized automatically on first run
# Or call POST /api/admin/init-db to reinitialize
```

5. **Start development server**
```bash
npm run dev
```

The application will start:
- **Backend API**: http://localhost:5000
- **Frontend UI**: http://localhost:5173 (Vite dev server)

### Production Build

```bash
# Build both client and server
npm run build

# Start production server
npm start
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture and design
- [API Reference](docs/API.md) - REST API endpoints
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment

## 🏗️ Project Structure

```
StockSage/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities
│   │   └── hooks/         # Custom hooks
│   └── index.html
├── server/                # Node.js backend
│   ├── agents/           # AI agents
│   ├── decision-engine/  # Calculators
│   ├── actions/          # Business logic
│   ├── integrations/     # External services
│   ├── learning/         # ML system
│   ├── routes.ts         # API routes
│   ├── websocket.ts      # WebSocket server
│   └── index.ts          # Entry point
├── shared/               # Shared types
│   └── schema.ts         # Database schema
├── docs/                 # Documentation
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🎯 Usage Guide

### 1. Run AI Analysis

1. Navigate to **Configuration** page
2. Select a product and location
3. Choose forecast horizon (7-90 days)
4. Click **Run AI Analysis**
5. View detailed results from all agents

### 2. Review Decisions

1. Go to **Decisions** page
2. Review AI recommendations
3. Approve or reject decisions
4. View detailed reasoning

### 3. Manage Purchase Orders

1. Visit **Purchase Orders** page
2. View all POs with status
3. Approve pending orders
4. Mark as received when delivered

### 4. Monitor Analytics

1. Check **Analytics** page
2. View forecast accuracy metrics
3. Review model performance
4. Submit feedback for improvements

## 🔧 API Endpoints

### Analysis
- `POST /api/analysis/run` - Run multi-agent analysis
- `GET /api/agent-logs/:sessionId` - Get reasoning logs

### Inventory
- `GET /api/inventory/:productId/:locationId` - Get inventory level
- `GET /api/inventory/status` - Get overall status
- `POST /api/inventory/update` - Update inventory

### Purchase Orders
- `GET /api/purchase-orders` - List all POs
- `POST /api/purchase-orders` - Create new PO
- `POST /api/purchase-orders/:id/approve` - Approve PO
- `POST /api/purchase-orders/:id/receive` - Mark received

### Analytics
- `GET /api/analytics/accuracy` - Get accuracy metrics
- `GET /api/analytics/accuracy/by-category` - Category breakdown
- `GET /api/analytics/accuracy/report` - Full report

### Data
- `GET /api/products` - List products
- `GET /api/locations` - List locations
- `GET /api/suppliers` - List suppliers

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4o model
- Drizzle ORM for database management
- shadcn/ui for UI components
- All open-source contributors

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the [documentation](docs/)

## 🚀 Roadmap

- [ ] Advanced forecasting with ARIMA/Prophet
- [ ] Multi-currency support
- [ ] Mobile app (React Native)
- [ ] Advanced visualizations
- [ ] Integration with ERP systems
- [ ] Multi-language support

---

**Built with ❤️ using TypeScript, React, Node.js, and OpenAI GPT-4o**
