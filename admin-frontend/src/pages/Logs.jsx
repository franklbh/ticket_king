import { useState, useMemo } from 'react'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { LOGS_DATA, ADMINS_DATA } from '../data/mockData'

const ACTION_TYPES = ['Login', 'Create', 'Update', 'Batch Update', 'Check In', 'Restock', 'Void', 'Activate', 'Deactivate', 'Export', 'Other']
const ACTION_COLORS = {
  Login: 'badge-blue', Create: 'badge-green', Update: 'badge-orange', 'Batch Update': 'badge-purple',
  'Check In': 'badge-teal', Restock: 'badge-orange', Void: 'badge-gray', Activate: 'badge-green',
  Deactivate: 'badge-red', Export: 'badge-gray', Other: 'badge-gray'
}
const TARGET_TYPES = ['Order', 'Ticket', 'Ticket Type', 'Slot', 'Event', 'Coupon', 'Admin', 'User']
const TARGET_ICONS = { Order: 'fa-shopping-cart', Ticket: 'fa-ticket', 'Ticket Type': 'fa-tags', Slot: 'fa-calendar', Event: 'fa-star', Coupon: 'fa-tag', Admin: 'fa-user-shield', User: 'fa-user' }

const PAGE_SIZE = 10

function IPModal({ ip, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>IP Location Lookup</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <div><strong>IP Address:</strong> {ip}</div>
          <div><strong>Location:</strong> Surrey, British Columbia, Canada</div>
          <div><strong>ISP:</strong> TELUS Communications</div>
          <div style={{ marginTop: 8 }}><strong>User Agent:</strong></div>
          <div style={{ color: '#6b7280' }}>
            <i className="fa fa-desktop" /> <i className="fa fa-globe" /> macOS · Chrome 147
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Logs() {
  const { lang } = useLang()
  const t = useT(lang)
  const adminNames = ['all', ...Array.from(new Set(ADMINS_DATA.map(a => a.username)))]

  const [filters, setFilters] = useState({
    admin: 'all',
    search: '',
    dateFrom: '2026-04-13',
    dateTo: '2026-05-13',
    actionTypes: ACTION_TYPES.slice(),
    targetTypes: TARGET_TYPES.slice(),
  })
  const [page, setPage] = useState(1)
  const [ipModal, setIpModal] = useState(null)
  const [detailLog, setDetailLog] = useState(null)

  function toggleActionType(at) {
    setFilters(f => ({
      ...f,
      actionTypes: f.actionTypes.includes(at) ? f.actionTypes.filter(x => x !== at) : [...f.actionTypes, at]
    }))
    setPage(1)
  }

  function toggleTargetType(tt) {
    setFilters(f => ({
      ...f,
      targetTypes: f.targetTypes.includes(tt) ? f.targetTypes.filter(x => x !== tt) : [...f.targetTypes, tt]
    }))
    setPage(1)
  }

  const filtered = useMemo(() => {
    return LOGS_DATA.filter(log => {
      if (filters.admin !== 'all' && log.admin !== filters.admin) return false
      if (filters.search && !log.actionDetails.toLowerCase().includes(filters.search.toLowerCase())) return false
      if (filters.actionTypes.length > 0 && !filters.actionTypes.includes(log.actionType)) return false
      if (filters.targetTypes.length > 0 && !filters.targetTypes.includes(log.targetType)) return false
      return true
    })
  }, [filters])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div>
      {ipModal && <IPModal ip={ipModal} onClose={() => setIpModal(null)} />}
      {detailLog && (
        <div className="modal-overlay" onClick={() => setDetailLog(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Log #{detailLog.id} Details</h3>
              <button onClick={() => setDetailLog(null)} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <pre style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, fontSize: 12, overflow: 'auto', maxHeight: 300 }}>
              {JSON.stringify(JSON.parse(detailLog.actionDetails.replace(/\.\.\./g, '"..."').replace(/"..."/g, '"(truncated)"') || '{}'), null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827', marginBottom: 4 }}>
          <i className="fa fa-history" style={{ color: '#7b2020' }} />
          {t.activityLogs}
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>View all administrator operation records</p>
      </div>

      {/* Filters */}
      <div className="filter-card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.admin}</label>
            <select className="form-select" value={filters.admin} onChange={e => setFilters(f => ({ ...f, admin: e.target.value }))} style={{ width: '100%' }}>
              {adminNames.map(a => <option key={a} value={a}>{a === 'all' ? t.allAdmins : a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Search Action Details</label>
            <input className="form-input" placeholder="Search action details..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Date From</label>
            <input className="form-input" type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Date To</label>
            <input className="form-input" type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn-secondary btn-sm" onClick={() => { setFilters({ admin: 'all', search: '', dateFrom: '2026-04-13', dateTo: '2026-05-13', actionTypes: ACTION_TYPES.slice(), targetTypes: TARGET_TYPES.slice() }); setPage(1) }}>
              <i className="fa fa-redo" /> {t.reset}
            </button>
          </div>
        </div>

        {/* Action Type filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', minWidth: 90 }}>Action Type:</span>
          {ACTION_TYPES.map(at => (
            <label key={at} style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={filters.actionTypes.includes(at)} onChange={() => toggleActionType(at)} style={{ width: 13, height: 13 }} />
              <span className={`badge ${ACTION_COLORS[at] || 'badge-gray'}`} style={{ fontSize: 11 }}>{at}</span>
            </label>
          ))}
        </div>

        {/* Target Type filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', minWidth: 90 }}>Target Type:</span>
          {TARGET_TYPES.map(tt => (
            <label key={tt} style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={filters.targetTypes.includes(tt)} onChange={() => toggleTargetType(tt)} style={{ width: 13, height: 13 }} />
              <span className="badge badge-gray" style={{ fontSize: 11 }}>
                <i className={`fa ${TARGET_ICONS[tt] || 'fa-circle'}`} style={{ marginRight: 3 }} />{tt}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Admin</th>
                <th>Action Type</th>
                <th>Target Type</th>
                <th>Target ID</th>
                <th>Action Details</th>
                <th>Login Info</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>No logs found</td></tr>
              ) : paged.map(log => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 600, color: '#7b2020', fontFamily: 'monospace', fontSize: 13 }}>#{log.id}</td>
                  <td style={{ fontWeight: 500, fontSize: 14 }}>{log.admin}</td>
                  <td>
                    <span className={`badge ${ACTION_COLORS[log.actionType] || 'badge-gray'}`}>{log.actionType}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                      <i className={`fa ${TARGET_ICONS[log.targetType] || 'fa-circle'}`} style={{ color: '#6b7280' }} />
                      {log.targetType}
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: '#6b7280' }}>{log.targetId ?? '-'}</td>
                  <td>
                    <button
                      onClick={() => setDetailLog(log)}
                      style={{
                        background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4,
                        padding: '3px 8px', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace',
                        maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'block', textAlign: 'left',
                      }}
                      title="Click to view full details"
                    >
                      {log.actionDetails.slice(0, 40)}...
                    </button>
                  </td>
                  <td>
                    {log.loginInfo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.loginInfo}
                        </span>
                        <button
                          onClick={() => setIpModal(log.loginInfo)}
                          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 3, padding: '1px 5px', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                        >
                          <i className="fa fa-search" />
                        </button>
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#374151' }}>{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => (
              <button key={i + 1} className={`page-btn ${i + 1 === page ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button className="page-btn" disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>
    </div>
  )
}
