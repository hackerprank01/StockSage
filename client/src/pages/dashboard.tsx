import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatCurrency, formatNumber, getRiskColor } from '@/lib/utils'

export default function Dashboard() {
  const [, setLocation] = useLocation()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [inventoryRes, poRes] = await Promise.all([
        api.getInventoryStatus(),
        api.getPurchaseOrderStats(),
      ])

      setStats({
        inventory: inventoryRes.data,
        purchaseOrders: poRes.data,
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const stockHealthScore = stats?.inventory 
    ? Math.round((stats.inventory.healthyStockCount / stats.inventory.totalProducts) * 100)
    : 0

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">StockSage Dashboard</h1>
          <p className="text-muted-foreground">AI-Powered Inventory Management</p>
        </div>
        <Button onClick={() => setLocation('/configuration')}>
          Run AI Analysis
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock Health Score</CardDescription>
            <CardTitle className="text-3xl">{stockHealthScore}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats?.inventory?.healthyStockCount || 0} healthy / {stats?.inventory?.totalProducts || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stockout Risks</CardDescription>
            <CardTitle className={`text-3xl ${getRiskColor((stats?.inventory?.outOfStockCount || 0) / Math.max(stats?.inventory?.totalProducts || 1, 1))}`}>
              {stats?.inventory?.outOfStockCount || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats?.inventory?.lowStockCount || 0} low stock items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Purchase Orders</CardDescription>
            <CardTitle className="text-3xl">{stats?.purchaseOrders?.total || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats?.purchaseOrders?.pending || 0} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency((stats?.inventory?.totalValue || 0) + (stats?.purchaseOrders?.totalValue || 0))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Inventory + Orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and workflows</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button onClick={() => setLocation('/configuration')} className="w-full">
            🤖 Run AI Analysis
          </Button>
          <Button onClick={() => setLocation('/decisions')} variant="outline" className="w-full">
            📊 View Decisions
          </Button>
          <Button onClick={() => setLocation('/purchase-orders')} variant="outline" className="w-full">
            📦 Purchase Orders
          </Button>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>AI Agents Status</CardTitle>
          <CardDescription>All systems operational</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {['Demand Forecasting', 'Inventory Optimization', 'Supplier Coordination', 'Risk Analysis'].map((agent) => (
            <div key={agent} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">{agent}</span>
              </div>
              <span className="text-sm text-green-600">Active</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
