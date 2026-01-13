import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getRiskColor(risk: number): string {
  if (risk >= 0.75) return 'text-red-600'
  if (risk >= 0.5) return 'text-orange-600'
  if (risk >= 0.3) return 'text-yellow-600'
  return 'text-green-600'
}

export function getRiskBgColor(risk: number): string {
  if (risk >= 0.75) return 'bg-red-100'
  if (risk >= 0.5) return 'bg-orange-100'
  if (risk >= 0.3) return 'bg-yellow-100'
  return 'bg-green-100'
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'sent':
    case 'received':
    case 'healthy':
      return 'text-green-600'
    case 'pending':
    case 'low':
      return 'text-yellow-600'
    case 'cancelled':
    case 'critical':
    case 'out of stock':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.substring(0, length) + '...'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
