"""
Flask API for StockSage Inventory Management System.
"""

from flask import Flask, render_template, request, jsonify
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from agents.multi_agent_coordinator import MultiAgentCoordinator

# Get the base directory (StockSage root)
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))

app = Flask(__name__, 
            template_folder=os.path.join(base_dir, 'templates'),
            static_folder=os.path.join(base_dir, 'static'))

# Initialize the multi-agent coordinator
coordinator = MultiAgentCoordinator()


@app.route('/')
def index():
    """Render the main dashboard."""
    return render_template('dashboard.html')


@app.route('/api/simulate', methods=['POST'])
def simulate():
    """
    Run a simulation with the provided data.
    
    Expected JSON payload:
    {
        "product_name": "Product A",
        "sales_history": [10, 12, 15, ...],
        "current_stock": 50,
        "lead_time_history": [7, 8, 6, ...],
        "supplier_name": "Supplier XYZ",
        "unit_cost": 10.00,
        "holding_cost_rate": 0.20,
        "order_cost": 50.00,
        "stockout_cost": 50.00
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['sales_history', 'current_stock']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Run simulation
        results = coordinator.run_simulation(data)
        
        # Add input data to results for reference
        results['input_data'] = {
            'product_name': data.get('product_name', 'Unknown Product'),
            'current_stock': data.get('current_stock'),
            'supplier_name': data.get('supplier_name', 'Unknown Supplier')
        }
        
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'service': 'StockSage API'}), 200


if __name__ == '__main__':
    # Debug mode should be disabled in production
    # Set debug=False or use environment variable for configuration
    import os
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
