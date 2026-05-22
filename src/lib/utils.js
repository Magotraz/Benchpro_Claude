export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDate(dateStr) {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateStr))
}

export function truncate(str, maxLen = 40) {
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str
}
