import { emailPattern } from '../data/showData'

export const normalize = (value) => value.trim().toLowerCase()

export const normalizePhone = (value) => value.replace(/[^\d]/g, '')

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
