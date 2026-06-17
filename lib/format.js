export const fmt     = n => isNaN(n) || n == null ? 'Rs.0' : `Rs.${Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
export const fmtPct  = n => isNaN(n) || n == null ? '0%'  : `${Number(n).toFixed(1)}%`
export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : ''

export const csvDownload = (rows, filename) => {
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename })
  a.click()
}
