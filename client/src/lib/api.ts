const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success?: boolean
  message?: string
}

async function fetchAPI<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return {
        error: error.error || `HTTP ${response.status}: ${response.statusText}`,
        success: false,
      }
    }

    const data = await response.json()
    return { data, success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
      success: false,
    }
  }
}

export const api = {
  // Products
  getProducts: () => fetchAPI('/products'),
  getProduct: (id: number) => fetchAPI(`/products/${id}`),

  // Locations
  getLocations: () => fetchAPI('/locations'),

  // Suppliers
  getSuppliers: () => fetchAPI('/suppliers'),

  // Inventory
  getInventory: (productId: number, locationId: number) =>
    fetchAPI(`/inventory/${productId}/${locationId}`),
  getInventoryStatus: (locationId?: number) =>
    fetchAPI(`/inventory/status${locationId ? `?locationId=${locationId}` : ''}`),
  updateInventory: (data: any) =>
    fetchAPI('/inventory/update', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Analysis
  runAnalysis: (productId: number, locationId: number, timeHorizonDays: number = 30) =>
    fetchAPI('/analysis/run', {
      method: 'POST',
      body: JSON.stringify({ productId, locationId, timeHorizonDays }),
    }),

  // Decisions
  getDecisions: (limit: number = 50) =>
    fetchAPI(`/decisions?limit=${limit}`),
  createDecision: (data: any) =>
    fetchAPI('/decisions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  approveDecision: (id: number, approvedBy: string) =>
    fetchAPI(`/decisions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvedBy }),
    }),

  // Purchase Orders
  getPurchaseOrders: (limit: number = 50) =>
    fetchAPI(`/purchase-orders?limit=${limit}`),
  createPurchaseOrder: (data: any) =>
    fetchAPI('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  approvePurchaseOrder: (id: number, approvedBy: string, sendEmail: boolean = true) =>
    fetchAPI(`/purchase-orders/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvedBy, sendEmail }),
    }),
  receivePurchaseOrder: (id: number, actualQuantity?: number) =>
    fetchAPI(`/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ actualQuantity }),
    }),
  getPurchaseOrderStats: () => fetchAPI('/purchase-orders/stats'),

  // Agent Logs
  getAgentLogs: (sessionId: string) => fetchAPI(`/agent-logs/${sessionId}`),

  // Notifications
  sendNotification: (data: any) =>
    fetchAPI('/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Analytics
  getAccuracyMetrics: (days: number = 30) =>
    fetchAPI(`/analytics/accuracy?days=${days}`),
  getAccuracyByCategory: () =>
    fetchAPI('/analytics/accuracy/by-category'),
  getAccuracyReport: (days: number = 30) =>
    fetchAPI(`/analytics/accuracy/report?days=${days}`),

  // Feedback
  submitFeedback: (data: any) =>
    fetchAPI('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  processFeedback: () =>
    fetchAPI('/feedback/process', {
      method: 'POST',
    }),
  getFeedbackReport: (days: number = 30) =>
    fetchAPI(`/feedback/report?days=${days}`),

  // Models
  getActiveModel: () => fetchAPI('/models/active'),

  // Sales History
  getSalesHistory: (productId: number, locationId: number, days: number = 90) =>
    fetchAPI(`/sales-history/${productId}/${locationId}?days=${days}`),

  // Events
  getUpcomingEvents: (days: number = 30) =>
    fetchAPI(`/events/upcoming?days=${days}`),

  // Admin
  initDatabase: () =>
    fetchAPI('/admin/init-db', {
      method: 'POST',
    }),

  // Health Check
  health: () => fetchAPI('/health'),
}
