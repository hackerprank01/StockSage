// StockSage Dashboard JavaScript

let currentResults = null;

// Form submission handler
document.getElementById('simulationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading indicator
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'none';
    
    // Collect form data
    const formData = {
        product_name: document.getElementById('productName').value,
        current_stock: parseInt(document.getElementById('currentStock').value),
        sales_history: document.getElementById('salesHistory').value
            .split(',')
            .map(s => parseFloat(s.trim()))
            .filter(n => !isNaN(n)),
        supplier_name: document.getElementById('supplierName').value,
        lead_time_history: document.getElementById('leadTimeHistory').value
            .split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n)),
        unit_cost: parseFloat(document.getElementById('unitCost').value),
        order_cost: parseFloat(document.getElementById('orderCost').value),
        holding_cost_rate: parseFloat(document.getElementById('holdingCostRate').value) / 100,
        stockout_cost: parseFloat(document.getElementById('stockoutCost').value)
    };
    
    try {
        // Send request to API
        const response = await fetch('/api/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        
        const results = await response.json();
        currentResults = results;
        
        // Display results
        displayResults(results);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error running simulation: ' + error.message);
    } finally {
        document.getElementById('loadingIndicator').style.display = 'none';
    }
});

// Display results in the UI
function displayResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';
    
    // Display summary
    displaySummary(results.summary, results.input_data);
    
    // Display recommendations
    displayRecommendations(results.recommendations);
    
    // Display agent explanations
    displayAgentExplanations(results);
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Display summary section
function displaySummary(summary, inputData) {
    const summarySection = document.getElementById('summarySection');
    
    const actionClass = summary.action_required ? 'risk-high' : 'risk-low';
    const actionText = summary.action_required ? '⚠️ ACTION REQUIRED' : '✅ NO ACTION NEEDED';
    
    const riskClass = 
        summary.stockout_risk === 'HIGH' ? 'risk-high' :
        summary.stockout_risk === 'MEDIUM' ? 'risk-medium' : 'risk-low';
    
    summarySection.innerHTML = `
        <h3>${inputData.product_name}</h3>
        <div class="summary-item">
            <span class="summary-label">Status:</span>
            <span class="summary-value ${actionClass}">${actionText}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Current Stock:</span>
            <span class="summary-value">${inputData.current_stock} units</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Reorder Point:</span>
            <span class="summary-value">${summary.reorder_point} units</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Recommended Order Quantity:</span>
            <span class="summary-value">${summary.reorder_quantity} units</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Stockout Risk:</span>
            <span class="summary-value ${riskClass}">${summary.stockout_risk}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Estimated Annual Cost:</span>
            <span class="summary-value">$${summary.estimated_annual_cost.toFixed(2)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Forecast Confidence:</span>
            <span class="summary-value">${(summary.forecast_confidence * 100).toFixed(1)}%</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Supplier Reliability:</span>
            <span class="summary-value">${summary.supplier_reliability}</span>
        </div>
    `;
}

// Display recommendations
function displayRecommendations(recommendations) {
    const recommendationsSection = document.getElementById('recommendationsSection');
    
    recommendationsSection.innerHTML = '<h3>Key Recommendations</h3>' +
        recommendations.map(rec => `<div class="recommendation-item">${rec}</div>`).join('');
}

// Display agent explanations in tabs
function displayAgentExplanations(results) {
    // Demand Forecast Tab
    const demandTab = document.getElementById('demandTab');
    const demandAgent = results.agents.demand_forecast;
    const demandExplanations = results.explanations.demand_forecast;
    
    demandTab.innerHTML = `
        <h3>Demand Forecasting Analysis</h3>
        ${demandExplanations.map(exp => `<div class="explanation-item">${exp}</div>`).join('')}
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-label">Average Demand</div>
                <div class="metric-value">${demandAgent.average_demand.toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Trend</div>
                <div class="metric-value">${demandAgent.trend.toFixed(2)}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Confidence</div>
                <div class="metric-value">${(demandAgent.confidence * 100).toFixed(1)}%</div>
            </div>
        </div>
    `;
    
    // Inventory Optimizer Tab
    const inventoryTab = document.getElementById('inventoryTab');
    const inventoryAgent = results.agents.inventory_optimizer;
    const inventoryExplanations = results.explanations.inventory_optimizer;
    
    const riskClass = 
        inventoryAgent.stockout_risk === 'HIGH' ? 'risk-high' :
        inventoryAgent.stockout_risk === 'MEDIUM' ? 'risk-medium' : 'risk-low';
    
    inventoryTab.innerHTML = `
        <h3>Inventory Optimization Analysis</h3>
        ${inventoryExplanations.map(exp => `<div class="explanation-item">${exp}</div>`).join('')}
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-label">Reorder Point</div>
                <div class="metric-value">${inventoryAgent.reorder_point}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Reorder Quantity</div>
                <div class="metric-value">${inventoryAgent.reorder_quantity}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Safety Stock</div>
                <div class="metric-value">${inventoryAgent.safety_stock}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Stockout Risk</div>
                <div class="metric-value ${riskClass}">${inventoryAgent.stockout_risk}</div>
            </div>
        </div>
    `;
    
    // Supplier Lead Time Tab
    const supplierTab = document.getElementById('supplierTab');
    const supplierAgent = results.agents.supplier_lead_time;
    const supplierExplanations = results.explanations.supplier_lead_time;
    
    supplierTab.innerHTML = `
        <h3>Supplier Lead Time Analysis</h3>
        ${supplierExplanations.map(exp => `<div class="explanation-item">${exp}</div>`).join('')}
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-label">Recommended Lead Time</div>
                <div class="metric-value">${supplierAgent.recommended_lead_time} days</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Average Lead Time</div>
                <div class="metric-value">${supplierAgent.average_lead_time} days</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Reliability</div>
                <div class="metric-value">${supplierAgent.reliability}</div>
            </div>
        </div>
    `;
    
    // Cost Optimizer Tab
    const costTab = document.getElementById('costTab');
    const costAgent = results.agents.cost_optimizer;
    const costExplanations = results.explanations.cost_optimizer;
    
    costTab.innerHTML = `
        <h3>Cost Optimization Analysis</h3>
        ${costExplanations.map(exp => `<div class="explanation-item">${exp}</div>`).join('')}
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-label">Total Annual Cost</div>
                <div class="metric-value">$${costAgent.total_annual_cost}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Ordering Cost</div>
                <div class="metric-value">$${costAgent.ordering_cost}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Holding Cost</div>
                <div class="metric-value">$${costAgent.holding_cost}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">EOQ</div>
                <div class="metric-value">${costAgent.economic_order_quantity}</div>
            </div>
        </div>
    `;
}

// Tab switching function
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Activate corresponding button
    event.target.classList.add('active');
}
