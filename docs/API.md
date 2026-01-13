# StockSage API Reference

Base URL: `http://localhost:5000/api`

## Authentication
Currently no authentication required. Add API keys or JWT in production.

## Response Format
All endpoints return JSON:
```json
{
  "data": { ... },      // On success
  "error": "message",   // On error
  "success": true/false
}
```

## Endpoints

### Health Check
```http
GET /health
```
Returns server health status and WebSocket client count.

### Admin

#### Initialize Database
```http
POST /admin/init-db
```
Initializes database tables and seeds with sample data.

### Products

#### List Products
```http
GET /products
```
Returns all products with details.

#### Get Product
```http
GET /products/:id
```
Returns specific product by ID.

### Locations

#### List Locations
```http
GET /locations
```
Returns all active locations.

### Suppliers

#### List Suppliers
```http
GET /suppliers
```
Returns all active suppliers.

### Inventory

#### Get Inventory Level
```http
GET /inventory/:productId/:locationId
```
Returns current inventory level for product at location.

#### Get Inventory Status
```http
GET /inventory/status?locationId=1
```
Returns inventory status summary. Optional locationId filter.

**Response:**
```json
{
  "totalProducts": 5,
  "lowStockCount": 2,
  "outOfStockCount": 1,
  "healthyStockCount": 2,
  "totalValue": 15234.50
}
```

#### Update Inventory
```http
POST /inventory/update
```
**Body:**
```json
{
  "productId": 1,
  "locationId": 1,
  "quantityChange": -10,
  "reason": "sale",
  "notes": "Bulk order"
}
```

### Analysis

#### Run Multi-Agent Analysis
```http
POST /analysis/run
```
**Body:**
```json
{
  "productId": 1,
  "locationId": 1,
  "timeHorizonDays": 30
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "finalDecision": {
    "productId": 1,
    "locationId": 1,
    "orderQuantity": 150,
    "supplierId": 1,
    "estimatedCost": 2397.50,
    "urgency": "medium",
    "riskLevel": "low"
  },
  "demandForecast": { ... },
  "inventoryAnalysis": { ... },
  "supplierRecommendation": { ... },
  "riskAnalysis": { ... },
  "agentVotes": [ ... ],
  "sessionLog": [ ... ],
  "confidence": 0.87
}
```

### Decisions

#### List Decisions
```http
GET /decisions?limit=50
```
Returns recent AI decisions.

#### Create Decision
```http
POST /decisions
```
**Body:**
```json
{
  "sessionId": "uuid",
  "productId": 1,
  "locationId": 1,
  "recommendedOrderQuantity": 150,
  "safetyStock": 30,
  "riskScore": 0.25,
  "totalCost": 2397.50,
  "confidence": 0.87,
  "reasoning": "..."
}
```

#### Approve Decision
```http
POST /decisions/:id/approve
```
**Body:**
```json
{
  "approvedBy": "admin@example.com"
}
```

### Purchase Orders

#### List Purchase Orders
```http
GET /purchase-orders?limit=50
```

#### Create Purchase Order
```http
POST /purchase-orders
```
**Body:**
```json
{
  "productId": 1,
  "supplierId": 1,
  "locationId": 1,
  "quantity": 150,
  "unitCost": 15.99,
  "expectedLeadTimeDays": 7,
  "notes": "Rush order",
  "autoSend": true
}
```

#### Approve Purchase Order
```http
POST /purchase-orders/:id/approve
```
**Body:**
```json
{
  "approvedBy": "manager@example.com",
  "sendEmail": true
}
```

#### Mark as Received
```http
POST /purchase-orders/:id/receive
```
**Body:**
```json
{
  "actualQuantity": 148
}
```

#### Get PO Statistics
```http
GET /purchase-orders/stats
```

### Agent Logs

#### Get Session Logs
```http
GET /agent-logs/:sessionId
```
Returns all agent reasoning logs for a session.

### Notifications

#### Send Notification
```http
POST /notifications/send
```
**Body:**
```json
{
  "type": "email",
  "recipient": "user@example.com",
  "subject": "Test",
  "message": "Hello",
  "priority": "normal"
}
```

#### Send Stockout Alert
```http
POST /notifications/stockout-alert
```
**Body:**
```json
{
  "productName": "Wireless Mouse",
  "locationName": "NY Warehouse",
  "currentStock": 0,
  "recipients": [
    { "email": "manager@example.com", "phone": "+1234567890" }
  ]
}
```

### Analytics

#### Get Accuracy Metrics
```http
GET /analytics/accuracy?days=30
```
Returns MAPE, RMSE, hit rate for specified period.

#### Get Accuracy by Category
```http
GET /analytics/accuracy/by-category
```
Returns accuracy breakdown by product category.

#### Get Accuracy Report
```http
GET /analytics/accuracy/report?days=30
```
Returns comprehensive accuracy report with trends and recommendations.

### Feedback

#### Submit Feedback
```http
POST /feedback
```
**Body:**
```json
{
  "decisionId": 123,
  "wasAccurate": true,
  "actualOutcome": "Demand matched forecast",
  "notes": "Great prediction"
}
```

#### Process Feedback
```http
POST /feedback/process
```
Processes accumulated feedback and returns insights.

#### Get Feedback Report
```http
GET /feedback/report?days=30
```

### Models

#### Get Active Model
```http
GET /models/active
```
Returns currently active AI model configuration.

### Sales History

#### Get Sales History
```http
GET /sales-history/:productId/:locationId?days=90
```

### Events

#### Get Upcoming Events
```http
GET /events/upcoming?days=30
```
Returns upcoming events that may affect demand.

## WebSocket Events

Connect to: `ws://localhost:5000/ws`

### Events from Server:
```json
{
  "type": "agent_update",
  "data": { "agentType": "demand", "action": "complete", ... },
  "timestamp": "2024-01-13T..."
}

{
  "type": "inventory_update",
  "data": { "productId": 1, "locationId": 1, "newStock": 95, ... },
  "timestamp": "2024-01-13T..."
}

{
  "type": "decision_update",
  "data": { "decisionId": 123, "status": "approved", ... },
  "timestamp": "2024-01-13T..."
}

{
  "type": "alert",
  "data": { "severity": "warning", "message": "...", ... },
  "timestamp": "2024-01-13T..."
}
```

### Events to Server:
```json
{
  "type": "ping"
}
```

## Error Codes

- `400` - Bad Request (invalid input)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Rate Limiting

Not currently implemented. Recommended for production:
- 100 requests per minute per IP
- 10 analysis runs per hour per user

## Best Practices

1. **Always check response.success** before using data
2. **Use WebSocket** for real-time updates
3. **Handle errors gracefully** - the API will continue running
4. **Batch operations** when possible
5. **Cache product/location data** - it changes infrequently
