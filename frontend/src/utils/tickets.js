export function ticketKeyFromLabel(label = '') {
  const normalized = String(label).toLowerCase()
  if (normalized.includes('family')) return 'family'
  if (normalized.includes('group')) return 'group'
  if (normalized.includes('senior')) return 'senior'
  if (normalized.includes('child') || normalized.includes('youth')) return 'child'
  return 'adult'
}

export function minQtyForTicket(ticketOrId) {
  if (typeof ticketOrId === 'object' && ticketOrId) {
    if (Number.isFinite(Number(ticketOrId.minQty))) return Number(ticketOrId.minQty)
    if (Number.isFinite(Number(ticketOrId.min_qty))) return Number(ticketOrId.min_qty)
    return minQtyForTicket(ticketOrId.label || ticketOrId.name || ticketOrId.ticket_type_label || ticketOrId.id)
  }
  const key = ticketKeyFromLabel(ticketOrId)
  if (key === 'group') return 6
  if (key === 'family') return 3
  return 1
}

const _tKeyMap = { adult: 'ticketTypeRegular', child: 'ticketTypeChild', senior: 'ticketTypeSenior', family: 'ticketTypeFamily', group: 'ticketTypeGroup' }

export function formatSlotTicketTypes(ticketTypes = [], { fallback = [], currency, perEach = '/each', t } = {}) {
  const liveTypes = Array.isArray(ticketTypes) ? ticketTypes : []
  const source = liveTypes.length ? liveTypes : fallback
  const keyCounts = source.reduce((counts, ticket) => {
    const key = ticketKeyFromLabel(ticket.label || ticket.name || 'Ticket')
    counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
  return source
    .map((ticket) => {
      const rawLabel = ticket.label || ticket.name || 'Ticket'
      const key = ticketKeyFromLabel(rawLabel)
      const label = t && keyCounts[key] === 1 ? (t(_tKeyMap[key]) || rawLabel) : rawLabel
      const price = Number(ticket.price ?? ticket.basePrice ?? ticket.base_price ?? 0)
      const minQty = minQtyForTicket(ticket)
      const infoKey = key === 'child' ? 'childInfo' : key === 'family' ? 'familyInfo' : key === 'group' ? 'groupInfo' : null
      return {
        ...ticket,
        id: String(ticket.id),
        key,
        label,
        price,
        minQty,
        description: currency ? `${currency(price)} ${perEach}` : undefined,
        info: infoKey && t ? t(infoKey) : ticket.info,
      }
    })
    .filter((ticket) => ticket.id && Number.isFinite(ticket.price))
}
