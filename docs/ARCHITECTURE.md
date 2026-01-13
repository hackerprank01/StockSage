# StockSage Architecture

## System Overview

StockSage is a comprehensive multi-agent AI inventory management system that leverages OpenAI's GPT-4o model to optimize inventory decisions through coordinated AI agents.

## Architecture Layers

### 1. Client Layer (React + TypeScript)
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight routing)
- **State Management:** TanStack Query (React Query)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Real-time Updates:** WebSocket client

**Key Pages:**
- Dashboard: KPIs, system status, quick actions
- Configuration: AI analysis parameters and execution
- Decisions: View and approve AI recommendations
- Purchase Orders: PO management
- Analytics: Accuracy metrics and learning insights

### 2. Server Layer (Node.js + Express + TypeScript)
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Real-time:** WebSocket (ws library)
- **API:** RESTful endpoints

**Key Modules:**
- `server/routes.ts`: REST API endpoints (30+ routes)
- `server/websocket.ts`: Real-time bidirectional communication
- `server/index.ts`: Server initialization and graceful shutdown

### 3. AI Agents Layer
Four specialized AI agents orchestrated by a coordinator:

**Demand Forecasting Agent** (`server/agents/demand-agent.ts`)
- Analyzes historical sales with time-series patterns
- Considers seasonality, trends, promotions
- Generates 7/30/90-day forecasts with confidence scores
- Uses OpenAI GPT-4o for pattern recognition

**Inventory Optimization Agent** (`server/agents/inventory-agent.ts`)
- Monitors real-time stock levels
- Calculates optimal stock using EOQ formula
- Identifies high-risk stockout products
- Recommends reorder points based on lead time

**Supplier Coordination Agent** (`server/agents/supplier-agent.ts`)
- Tracks supplier reliability and performance
- Optimizes order quantities
- Manages lead time variability
- Simulates supplier negotiation

**Risk Analysis Agent** (`server/agents/risk-agent.ts`)
- Calculates multi-factor risk scores (0-1)
- Evaluates: stockout, cost, supplier, demand volatility
- Recommends mitigation strategies
- Prioritizes alerts by severity

**Agent Orchestrator** (`server/agents/orchestrator.ts`)
- Coordinates communication between agents
- Facilitates multi-agent negotiation
- Reaches consensus through weighted voting
- Logs complete reasoning process

### 4. Decision Engine Layer
Implements inventory management formulas:

**Order Calculator** (`server/decision-engine/order-calculator.ts`)
- Economic Order Quantity (EOQ) calculation
- Considers constraints: min order qty, budget, storage
- Bulk discount analysis

**Timing Optimizer** (`server/decision-engine/timing-optimizer.ts`)
- Reorder Point (ROP) calculation
- Lead time variability handling
- Event-based timing optimization

**Safety Stock Calculator** (`server/decision-engine/safety-stock-calculator.ts`)
- Service level-based calculations
- Demand and lead time variability
- Seasonal adjustments

**Risk Scorer** (`server/decision-engine/risk-scorer.ts`)
- Weighted risk scoring
- Component risk calculations
- Criticality adjustments

### 5. Business Actions Layer

**Purchase Order Generator** (`server/actions/purchase-order.ts`)
- Auto-generates POs with unique numbers
- Creates PDFs with professional layout
- Manages PO lifecycle (pending → approved → sent → received)

**Inventory Updater** (`server/actions/inventory-updater.ts`)
- Updates stock levels with audit trail
- Triggers alerts at reorder points
- Predicts inventory curves

**Notification Dispatcher** (`server/actions/notification-dispatcher.ts`)
- Email notifications (Nodemailer)
- SMS notifications (Twilio)
- Template-based messaging

### 6. Integration Services Layer

**Email Service** (`server/integrations/email-service.ts`)
- HTML email templates
- PDF attachments
- Development mode fallback

**SMS Service** (`server/integrations/sms-service.ts`)
- Twilio integration
- Character limit handling
- Cost tracking

**PDF Generator** (`server/integrations/pdf-generator.ts`)
- Professional PO documents
- Inventory reports
- Performance reports

### 7. Learning System Layer

**Accuracy Tracker** (`server/learning/accuracy-tracker.ts`)
- MAPE, RMSE, Hit Rate calculation
- Category-wise accuracy breakdown
- Trend analysis

**Model Evaluator** (`server/learning/model-evaluator.ts`)
- A/B testing framework
- Model comparison
- Auto-promotion of better models

**Feedback Processor** (`server/learning/feedback-processor.ts`)
- User feedback collection
- Pattern analysis
- Model weight adjustments
- Retraining triggers

### 8. Data Layer

**Database:** SQLite (via better-sqlite3)
**ORM:** Drizzle ORM
**Schema Validation:** Zod

**Key Tables:**
- products, locations, suppliers
- sales_history, inventory_levels
- purchase_orders, decisions
- agent_reasoning_logs
- notifications, feedback

## Data Flow

### 1. Analysis Request Flow
```
User → Dashboard → API POST /analysis/run
  → Orchestrator starts session
  → Demand Agent forecasts demand
  → Inventory Agent calculates optimal stock
  → Supplier Agent recommends order
  → Risk Agent evaluates risks
  → Orchestrator reaches consensus
  → WebSocket broadcasts updates
  → Decision stored in database
  → Response sent to client
```

### 2. Purchase Order Flow
```
User approves decision → API POST /purchase-orders
  → PO generated with unique number
  → PDF created with PDFKit
  → Stored in database
  → Email sent to supplier (Nodemailer)
  → SMS notification (Twilio)
  → WebSocket alert sent
  → Inventory levels updated
```

### 3. Learning Loop
```
Decision made → Time passes → Actual outcome occurs
  → User provides feedback
  → Accuracy tracked (MAPE, RMSE)
  → Patterns analyzed
  → Model weights adjusted
  → Retraining triggered if needed
  → Improved predictions
```

## Technology Stack

### Backend
- Node.js 20+
- Express.js
- TypeScript 5.6
- OpenAI SDK 4.x
- Drizzle ORM
- better-sqlite3
- WebSocket (ws)
- Nodemailer
- Twilio
- PDFKit

### Frontend
- React 18
- TypeScript 5.6
- Wouter (routing)
- TanStack Query
- Tailwind CSS
- Radix UI
- Recharts

### Development
- Vite (build tool)
- TSX (TypeScript runner)
- ESBuild (bundler)

## Deployment

### Development
```bash
npm run dev        # Start development server
```

### Production
```bash
npm run build      # Build client and server
npm start          # Start production server
```

### Docker
```bash
docker-compose up  # Start containerized app
```

## Security Considerations

1. **Input Validation:** All inputs validated with Zod schemas
2. **SQL Injection:** Prevented by Drizzle ORM parameterized queries
3. **API Keys:** Stored in environment variables, never committed
4. **CORS:** Configurable origin restrictions
5. **Rate Limiting:** Recommended for production
6. **Error Handling:** Graceful degradation, no sensitive data in errors

## Scalability

1. **Horizontal Scaling:** Stateless API servers
2. **Database:** Can migrate to PostgreSQL for production
3. **Caching:** Redis recommended for high-traffic scenarios
4. **Queue System:** Bull/BullMQ for async agent processing
5. **Load Balancing:** NGINX recommended

## Monitoring

1. **Logging:** Console logs with timestamps
2. **Health Checks:** `/api/health` endpoint
3. **WebSocket Clients:** Real-time client count
4. **Error Tracking:** Sentry recommended for production
5. **Performance:** APM tools recommended (e.g., New Relic)
