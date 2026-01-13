import { Route, Link, useLocation } from 'wouter'
import Dashboard from './pages/dashboard'
import Configuration from './pages/configuration'

function App() {
  const [location] = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Configuration', href: '/configuration', icon: '⚙️' },
    { name: 'Decisions', href: '/decisions', icon: '🎯' },
    { name: 'Purchase Orders', href: '/purchase-orders', icon: '📦' },
    { name: 'Analytics', href: '/analytics', icon: '📈' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="text-2xl font-bold text-primary">StockSage AI</div>
              <div className="hidden md:flex space-x-4">
                {navigation.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        location === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      {item.icon} {item.name}
                    </a>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">All Systems Active</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Routes */}
      <main>
        <Route path="/" component={Dashboard} />
        <Route path="/configuration" component={Configuration} />
        <Route path="/decisions">
          <div className="container mx-auto p-6">
            <h1 className="text-4xl font-bold mb-4">Decisions</h1>
            <p className="text-muted-foreground">AI-generated inventory decisions will appear here</p>
          </div>
        </Route>
        <Route path="/purchase-orders">
          <div className="container mx-auto p-6">
            <h1 className="text-4xl font-bold mb-4">Purchase Orders</h1>
            <p className="text-muted-foreground">Purchase order management interface</p>
          </div>
        </Route>
        <Route path="/analytics">
          <div className="container mx-auto p-6">
            <h1 className="text-4xl font-bold mb-4">Analytics</h1>
            <p className="text-muted-foreground">Forecast accuracy and learning metrics</p>
          </div>
        </Route>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-6 py-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>StockSage AI - Multi-Agent Inventory Management System</p>
            <p className="mt-1">Powered by GPT-4o and Advanced AI Agents</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
