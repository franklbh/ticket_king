import { emailPattern } from '../data/showData'

export const normalize = (value) => value.trim().toLowerCase()

export const normalizePhone = (value) => value.replace(/[^\d]/g, '')

export const formatNorthAmericanPhone = (value) => {
  const digits = normalizePhone(value)
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

export const isReasonableName = (value) => {
  const trimmed = value.trim()
  return /^[\p{L}][\p{L}' -]{1,49}$/u.test(trimmed) && !/[' -]{2,}/.test(trimmed)
}

export const isReasonablePhone = (value) => {
  if (!value.trim()) return true
  const digits = normalizePhone(value)
  return digits.length >= 10 && digits.length <= 15 && !/^(\d)\1+$/.test(digits)
}

export const isStrictEmail = (email) => {
  const value = email.trim()
  if (!emailPattern.test(value)) return false
  const [local, domain] = value.split('@')
  if (!local || !domain) return false
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false
  return domain.split('.').every((part) => part && !part.startsWith('-') && !part.endsWith('-'))
}
