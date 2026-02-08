/**
 * Export utility functions for CSV generation
 */

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: any[], headers: string[]): string {
  const csvRows = []
  
  // Add headers
  csvRows.push(headers.join(','))
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        return ''
      }
      
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      
      return stringValue
    })
    
    csvRows.push(values.join(','))
  }
  
  return csvRows.join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Calculate duration between two dates
 */
export function calculateDurationForExport(startTime: string, endTime: string | null): string {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const diffMs = end.getTime() - start.getTime()
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  
  return `${hours}h ${minutes}m`
}
