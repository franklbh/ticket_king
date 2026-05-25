export function formatNorthAmericanPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  const national = digits.startsWith('1') ? digits.slice(1, 11) : digits.slice(0, 10)
  if (!national) return '+1 '
  const area = national.slice(0, 3)
  const prefix = national.slice(3, 6)
  const line = national.slice(6, 10)
  if (national.length <= 3) return `+1 (${area}`
  if (national.length <= 6) return `+1 (${area}) ${prefix}`
  return `+1 (${area}) ${prefix}-${line}`
}
