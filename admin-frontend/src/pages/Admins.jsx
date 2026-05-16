import { useState, useMemo } from 'react'
import { useLang } from '../context/AuthContext'
import { useT } from '../i18n/translations'
import { useUsersQuery } from '../hooks/queries'
import LoadingIndicator from '../components/LoadingIndicator'
import { AdminAlert, EmptyTableRow, FilterCard, PageHeader, TableShell } from '../components/AdminUI'

const ROLES = ['SuperAdmin', 'SDirector', 'Director', 'Operator', 'Front']
const ROLE_COLORS = { SuperAdmin: 'badge-red', SDirector: 'badge-purple', Director: 'badge-blue', Operator: 'badge-teal', Front: 'badge-orange' }

function AdminModal({ admin, onClose, onSave, t }) {
  const [form, setForm] = useState(admin || {
    username: '', email: '', role: 'Front', department: '', position: '', status: 'active'
  })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>{admin ? `${t.edit} Admin` : t.createAdmin}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>{t.username}</label>
              <input className="form-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder={t.username} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>{t.email}</label>
              <input className="form-input" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value || null }))} placeholder="Optional" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>{t.role}</label>
              <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ width: '100%' }}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>{t.department}</label>
              <input className="form-input" value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value || null }))} placeholder="Optional" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>{t.position}</label>
              <input className="form-input" value={form.position || ''} onChange={e => setForm(f => ({ ...f, position: e.target.value || null }))} placeholder="Optional" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>{t.password}</label>
              <input className="form-input" type="password" placeholder={admin ? t.leaveBlankPassword : t.setPassword} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose}>{t.cancel}</button>
          <button className="btn-primary" onClick={() => onSave(form)}>{t.save}</button>
        </div>
      </div>
    </div>
  )
}

function IPModal({ ip, onClose, t }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>{t.ipLocationLookup}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <div><strong>IP Address:</strong> {ip}</div>
        </div>
      </div>
    </div>
  )
}

export default function Admins() {
  const { lang } = useLang()
  const t = useT(lang)
  const { data: loadedAdmins, error: loadError, loading: loadingAdmins, setData: setLoadedAdmins } = useUsersQuery(
    {},
    { initialData: [] }
  )
  const admins = loadedAdmins || []
  const [filters, setFilters] = useState({ role: 'all', status: 'all' })
  const [modal, setModal] = useState(null)
  const [ipModal, setIpModal] = useState(null)

  const filtered = useMemo(() => {
    return admins.filter(a => {
      if (filters.role !== 'all' && (a.staffRole || a.role) !== filters.role) return false
      if (filters.status !== 'all' && a.status !== filters.status) return false
      return true
    })
  }, [admins, filters])

  function handleSave(form) {
    if (modal === 'create') {
      setLoadedAdmins(prev => [...(prev || []), { ...form, id: (prev || []).length + 1, lastLogin: null, lastLoginRelative: '-', ip: null, canDisable: true }])
    } else {
      setLoadedAdmins(prev => (prev || []).map(a => a.id === modal.id ? { ...a, ...form } : a))
    }
    setModal(null)
  }

  function toggleAdminStatus(id) {
    setLoadedAdmins(prev => (prev || []).map(a => a.id === id ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' } : a))
  }

  if (loadingAdmins) {
    return <LoadingIndicator label="Loading live admin users..." />
  }

  return (
    <div>
      {modal && <AdminModal admin={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} t={t} />}
      {ipModal && <IPModal ip={ipModal} onClose={() => setIpModal(null)} t={t} />}
      {loadError && (
        <AdminAlert tone="warning">
          Backend admin users could not be loaded: {loadError.message}
        </AdminAlert>
      )}
      <PageHeader
        icon="fa-users"
        title={t.administratorsManagement}
        subtitle={t.manageAdmins}
        actions={
        <button className="btn-primary" onClick={() => setModal('create')}>{t.createAdmin}</button>
        }
      />

      {/* Filters */}
      <FilterCard>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.role}</label>
            <select className="form-select" value={filters.role} onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}>
              <option value="all">{t.allRoles}</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.status}</label>
            <select className="form-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="all">{t.allStatus}</option>
              <option value="active">{t.active}</option>
              <option value="inactive">{t.inactive}</option>
            </select>
          </div>
          <button className="btn-secondary btn-sm" onClick={() => setFilters({ role: 'all', status: 'all' })}>
            <i className="fa fa-redo" /> {t.reset}
          </button>
        </div>
      </FilterCard>

      {/* Table */}
      <TableShell>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{t.username}</th>
                <th>{t.email}</th>
                <th>{t.role}</th>
                <th>{t.department}</th>
                <th>{t.position}</th>
                <th>{t.lastLogin}</th>
                <th>{t.status}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <EmptyTableRow colSpan={9}>{t.noAdminsFound}</EmptyTableRow>
              ) : filtered.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600, color: '#6b7280' }}>{a.id}</td>
                  <td style={{ fontWeight: 600, fontSize: 14 }}>{a.username || a.name || a.email || '-'}</td>
                  <td style={{ fontSize: 13, color: '#6b7280' }}>{a.email || '-'}</td>
                  <td>
                    <span className={`badge ${ROLE_COLORS[a.staffRole || a.role] || 'badge-gray'}`}>{a.staffRole || a.role}</span>
                  </td>
                  <td style={{ fontSize: 13, color: '#6b7280' }}>{a.department || '-'}</td>
                  <td style={{ fontSize: 13, color: '#6b7280' }}>{a.position || '-'}</td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                      <div>
                        <div style={{ fontSize: 13 }}>{a.lastLoginRelative || a.lastLoginAt || '-'}</div>
                        {(a.ip || a.lastLoginIp) && <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{a.ip || a.lastLoginIp}</div>}
                      </div>
                      {(a.ip || a.lastLoginIp) && (
                        <button
                          onClick={() => setIpModal(a.ip || a.lastLoginIp)}
                          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 3, padding: '2px 6px', fontSize: 11, cursor: 'pointer' }}
                        >
                          <i className="fa fa-search" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${a.status === 'active' ? 'badge-green' : 'badge-disabled'}`} style={{ gap: 5, whiteSpace: 'nowrap' }}>
                      {a.status !== 'active' && <i className="fa fa-ban" style={{ fontSize: 10 }} />}
                      {a.status === 'active' ? t.active : t.inactive}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-primary btn-sm" onClick={() => setModal(a)}>
                        <i className="fa fa-edit" /> {t.edit}
                      </button>
                      {a.canDisable && (
                        <button
                          onClick={() => toggleAdminStatus(a.id)}
                          className="btn-sm"
                          style={{
                            background: a.status === 'active' ? '#f59e0b' : '#10b981',
                            color: '#fff', border: 'none', borderRadius: 4, padding: '5px 10px', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, whiteSpace: 'nowrap',
                          }}
                        >
                          <i className={`fa fa-${a.status === 'active' ? 'ban' : 'check'}`} />
                          {a.status === 'active' ? t.disable : t.enable}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableShell>
    </div>
  )
}
