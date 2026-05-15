export const badge = (type) => (type === 'peak' ? 'peak' : type === 'normal' ? 'normal' : 'muted')

export const currency = (value) => `$${value.toFixed(2)}`
