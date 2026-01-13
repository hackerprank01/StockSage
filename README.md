# 🤖 StockSage

**AI-Powered Multi-Agent Inventory Management System**

StockSage is an intelligent inventory management system that helps businesses forecast demand and optimize stock levels. It uses a multi-agent AI model to analyze sales data, inventory levels, supplier lead times, and costs to recommend optimal reorder quantities and timing.

## ✨ Features

- **Multi-Agent AI System**: Four specialized agents work together to provide comprehensive recommendations:
  - 🔮 **Demand Forecasting Agent**: Predicts future demand using historical sales data
  - 📦 **Inventory Optimizer Agent**: Calculates optimal reorder points and quantities
  - 🚚 **Supplier Lead Time Agent**: Analyzes supplier reliability and lead times
  - 💰 **Cost Optimizer Agent**: Optimizes ordering decisions to minimize total costs

- **Explainable AI**: Every recommendation comes with clear explanations of how decisions were made
- **Interactive Dashboard**: User-friendly web interface for running simulations
- **Real-time Analysis**: Instant recommendations based on your input data
- **Risk Assessment**: Identifies stockout risks and provides actionable insights

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/hackerprank01/StockSage.git
cd StockSage
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

### Running the Application

1. Start the Flask server:
```bash
python src/api/app.py
```

2. Open your web browser and navigate to:
```
http://localhost:5000
```

3. Use the dashboard to input your inventory data and run simulations

## 📊 How It Works

### Input Data

The system requires the following information:

- **Product Name**: Identifier for the product
- **Sales History**: Historical daily sales data (comma-separated)
- **Current Stock**: Current inventory level
- **Supplier Information**: Name and historical lead times
- **Cost Parameters**:
  - Unit cost
  - Order cost (fixed cost per order)
  - Holding cost rate (annual %)
  - Stockout cost (cost per unit when out of stock)

### Multi-Agent Analysis

1. **Demand Forecasting**: Analyzes sales trends and patterns to predict future demand
2. **Supplier Analysis**: Evaluates supplier reliability based on historical lead times
3. **Inventory Optimization**: Calculates reorder points and quantities using safety stock principles
4. **Cost Optimization**: Evaluates total costs and recommends Economic Order Quantity (EOQ)

### Output

The system provides:
- **Action Items**: Whether to order now and how much
- **Key Metrics**: Reorder point, safety stock, stockout risk
- **Cost Analysis**: Estimated annual costs broken down by category
- **Explanations**: Clear reasoning behind each recommendation

## 💡 Example Usage

### Example Input

```json
{
    "product_name": "Widget A",
    "sales_history": [12, 15, 13, 18, 14, 16, 12, 19, 15, 17],
    "current_stock": 45,
    "lead_time_history": [7, 8, 6, 7, 9],
    "supplier_name": "GlobalTech Supplies",
    "unit_cost": 25.00,
    "holding_cost_rate": 0.20,
    "order_cost": 100.00,
    "stockout_cost": 75.00
}
```

### API Usage

You can also use the API directly:

```bash
curl -X POST http://localhost:5000/api/simulate \
  -H "Content-Type: application/json" \
  -d @data/example_input.json
```

## 🏗️ Project Structure

```
StockSage/
├── src/
│   ├── agents/              # Multi-agent AI system
│   │   ├── base_agent.py
│   │   ├── demand_forecast_agent.py
│   │   ├── inventory_optimizer_agent.py
│   │   ├── supplier_lead_time_agent.py
│   │   ├── cost_optimizer_agent.py
│   │   └── multi_agent_coordinator.py
│   └── api/
│       └── app.py           # Flask API
├── templates/
│   └── dashboard.html       # Web dashboard
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── data/
│   └── example_input.json   # Example data
├── requirements.txt
└── README.md
```

## 🔬 Technical Details

### Algorithms Used

- **Moving Average with Trend**: For demand forecasting
- **Safety Stock Calculation**: Buffer against demand variability
- **Economic Order Quantity (EOQ)**: Cost optimization
- **Reorder Point (ROP)**: Inventory level triggering reorder

### Key Formulas

- **Reorder Point**: `(Average Daily Demand × Lead Time) + Safety Stock`
- **Safety Stock**: `Average Demand × Lead Time × (Safety Factor - 1)`
- **EOQ**: `√(2 × Annual Demand × Order Cost / Holding Cost per Unit)`
- **Total Cost**: `Ordering Cost + Holding Cost + Stockout Cost`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Prathamesh Gawali**

## 🙏 Acknowledgments

- Built with Flask, NumPy, and scikit-learn
- Inspired by modern inventory management and AI principles
