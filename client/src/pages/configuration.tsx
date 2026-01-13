import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

export default function Configuration() {
  const [, setLocation] = useLocation()
  const [products, setProducts] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [timeHorizon, setTimeHorizon] = useState(30)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [productsRes, locationsRes] = await Promise.all([
      api.getProducts(),
      api.getLocations(),
    ])

    if (productsRes.data) setProducts(productsRes.data)
    if (locationsRes.data) setLocations(locationsRes.data)
  }

  const runAnalysis = async () => {
    if (!selectedProduct || !selectedLocation) {
      alert('Please select both product and location')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await api.runAnalysis(selectedProduct, selectedLocation, timeHorizon)
      if (response.data) {
        setResult(response.data)
      } else {
        alert('Analysis failed: ' + response.error)
      }
    } catch (error) {
      console.error('Analysis error:', error)
      alert('Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold">AI Analysis Configuration</h1>
        <p className="text-muted-foreground">Configure parameters and run multi-agent analysis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Parameters</CardTitle>
          <CardDescription>Select product, location, and forecast horizon</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Product</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedProduct || ''}
              onChange={(e) => setSelectedProduct(parseInt(e.target.value))}
            >
              <option value="">Select a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedLocation || ''}
              onChange={(e) => setSelectedLocation(parseInt(e.target.value))}
            >
              <option value="">Select a location...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Forecast Horizon: {timeHorizon} days
            </label>
            <input
              type="range"
              min="7"
              max="90"
              step="1"
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>7 days</span>
              <span>30 days</span>
              <span>90 days</span>
            </div>
          </div>

          <Button
            onClick={runAnalysis}
            disabled={!selectedProduct || !selectedLocation || loading}
            className="w-full"
          >
            {loading ? 'Running Analysis...' : '🚀 Run AI Analysis'}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
              <h3 className="text-lg font-medium">AI Agents Working...</h3>
              <p className="text-sm text-muted-foreground">
                Running demand forecasting, inventory optimization, supplier coordination, and risk analysis
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Complete ✅</CardTitle>
              <CardDescription>Session ID: {result.sessionId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">📈 Demand Forecast</h4>
                  <p className="text-2xl font-bold">{result.demandForecast.predictedDemand} units</p>
                  <p className="text-sm text-muted-foreground">
                    Confidence: {(result.demandForecast.confidence * 100).toFixed(0)}%
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">📦 Recommended Order</h4>
                  <p className="text-2xl font-bold">{result.finalDecision.orderQuantity} units</p>
                  <p className="text-sm text-muted-foreground">
                    Estimated Cost: ${result.finalDecision.estimatedCost.toFixed(2)}
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">⚠️ Risk Level</h4>
                  <p className="text-2xl font-bold">{result.riskAnalysis.alertLevel.toUpperCase()}</p>
                  <p className="text-sm text-muted-foreground">
                    Score: {(result.riskAnalysis.overallRisk * 100).toFixed(0)}%
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">🏭 Supplier</h4>
                  <p className="text-lg font-medium">{result.supplierRecommendation.recommendedSupplier.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Lead Time: {result.supplierRecommendation.expectedLeadTime} days
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setLocation('/decisions')}>
                  View Decisions
                </Button>
                <Button variant="outline" onClick={() => setResult(null)}>
                  Run Another Analysis
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Reasoning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border-l-4 border-blue-500 bg-blue-50 rounded">
                <h5 className="font-medium mb-1">Demand Agent</h5>
                <p className="text-sm">{result.demandForecast.reasoning}</p>
              </div>
              <div className="p-3 border-l-4 border-green-500 bg-green-50 rounded">
                <h5 className="font-medium mb-1">Inventory Agent</h5>
                <p className="text-sm">{result.inventoryAnalysis.reasoning}</p>
              </div>
              <div className="p-3 border-l-4 border-purple-500 bg-purple-50 rounded">
                <h5 className="font-medium mb-1">Supplier Agent</h5>
                <p className="text-sm">{result.supplierRecommendation.reasoning}</p>
              </div>
              <div className="p-3 border-l-4 border-orange-500 bg-orange-50 rounded">
                <h5 className="font-medium mb-1">Risk Agent</h5>
                <p className="text-sm">{result.riskAnalysis.reasoning}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
