import { useState, useMemo } from 'react'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useLang } from '../context/authHooks'
import { useT } from '../i18n/translations'
import { createAdminAccount, deactivateUser, deleteUser, getUser, getUserLoginHistory, requestUserPasswordReset, updateStaffProfile, updateUserPassword } from '../api/adminApi'
import { adminQueryKeys, useUsersQuery } from '../hooks/queries'
import { useAdminMutation } from '../hooks/useAdminApi'
import LoadingIndicator from '../components/LoadingIndicator'
import { AdminAlert, EmptyTableRow, FilterCard, PageHeader, TableShell } from '../components/AdminUI'
import { ResetFiltersButton, SelectFilter } from '../components/FilterControls'

const ROLE_FILTERS = ['owner', 'admin', 'partner']
const ROLE_COLORS = { owner: 'badge-red', admin: 'badge-blue', partner: 'badge-orange' }

function accountRole(admin) {
  return admin?.role === 'administrator' ? 'admin' : admin?.role || 'admin'
}

function AdminModal({ admin, onClose, onSave, t }) {
  const [form, setForm] = useState(admin || {
    username: '', email: '', department: '', position: '', password: '', status: 'active', role: 'administrator'
  })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontWeight: 700 }}>{admin ? `${t.edit} ${t.admin}` : t.createAdmin}</h3>
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
              <input className="form-input" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value || null }))} placeholder={t.optional} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>{t.department}</label>
              <input className="form-input" value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value || null }))} placeholder={t.optional} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>{t.position}</label>
              <input className="form-input" value={form.position || ''} onChange={e => setForm(f => ({ ...f, position: e.target.value || null }))} placeholder={t.optional} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>{t.role}</label>
              {admin ? (
                <input className="form-input" value={accountRole(admin)} disabled />
              ) : (
                <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="administrator">administrator</option>
                  <option value="partner">partner</option>
                </select>
              )}
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 5 }}>{t.password}</label>
              <input
                className="form-input"
                type="password"
                value={form.password || ''}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={admin ? t.leaveBlankPassword : t.setPassword}
                autoComplete="new-password"
              />
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
          <div><strong>{t.ipAddress}:</strong> {ip}</div>
        </div>
      </div>
    </div>
  )
}

export default function Admins() {
  const { lang } = useLang()
  const t = useT(lang)
  const { data: loadedAdmins, error: loadError, loading: loadingAdmins, reload } = useUsersQuery(
    {},
    { initialData: [] }
  )
  const admins = loadedAdmins || []

  const saveAdmin = useAdminMutation(
    async (form, existing) => {
      if (existing?.id) {
        const updated = await updateStaffProfile(existing.id, {
          name: form.username || null,
          department: form.department || null,
          position: form.position || null,
          status: form.status || 'active',
        })
        if (form.password) {
          await updateUserPassword(existing.id, form.password)
        }
        return updated
      }
      return createAdminAccount({
        name: form.username || form.name,
        email: form.email,
        password: form.password,
        department: form.department || null,
        position: form.position || null,
        role: form.role || 'administrator',
      })
    },
    { invalidateQueries: adminQueryKeys.users, successMessage: 'Admin saved.' }
  )
  const userAction = useAdminMutation(
    action => action(),
    { invalidateQueries: adminQueryKeys.users, successMessage: 'Admin action completed.' }
  )
  const [filters, setFilters] = useState({ role: 'all', status: 'all' })
  const [modal, setModal] = useState(null)
  const [ipModal, setIpModal] = useState(null)

  const filtered = useMemo(() => {
    return admins.filter(a => {
      if (filters.role !== 'all' && accountRole(a) !== filters.role) return false
      if (filters.status !== 'all' && a.status !== filters.status) return false
      return true
    })
  }, [admins, filters])

  async function handleSave(form) {
    const existing = modal === 'create' ? null : modal
    await saveAdmin.mutate(form, existing)
    setModal(null)
    reload()
  }

  async function toggleAdminStatus(admin) {
    const nextStatus = admin.status === 'active' ? 'inactive' : 'active'
    if (nextStatus === 'inactive') {
      await userAction.mutate(() => deactivateUser(admin.id))
    } else {
      await updateStaffProfile(admin.id, {
        department: admin.department || null,
        position: admin.position || null,
        status: nextStatus,
      })
    }
    reload()
  }

  async function showAdminDetail(admin) {
    const detail = await userAction.mutate(() => getUser(admin.id))
    alert(JSON.stringify(detail, null, 2))
  }

  async function handleDeleteAdmin(admin) {
    if (!window.confirm(t.confirmDeleteAdmin)) return
    await userAction.mutate(() => deleteUser(admin.id))
    reload()
  }

  async function sendPasswordReset(admin) {
    if (!window.confirm(`Send password reset for ${admin.email || admin.username}?`)) return
    await userAction.mutate(() => requestUserPasswordReset(admin.id))
  }

  async function showLoginHistory(admin) {
    const result = await userAction.mutate(() => getUserLoginHistory(admin.id, { page: 1, pageSize: 5 }))
    const lines = (result.items || []).map(item => `${item.timestamp || item.time}: ${item.loginInfo || '-'}`)
    alert(lines.length ? lines.join('\n') : 'No login history found.')
  }

  if (loadingAdmins) {
    return <LoadingIndicator label={t.loadingAdmins} />
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
        <Button variant="contained" size="small" onClick={() => setModal('create')}>{t.createAdmin}</Button>
        }
      />

      {/* Filters */}
      <FilterCard>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_220px_auto]">
          <SelectFilter label={t.role} value={filters.role} onChange={value => setFilters(f => ({ ...f, role: value }))} options={[{ value: 'all', label: t.allRoles }, ...ROLE_FILTERS.map(role => ({ value: role, label: role }))]} />
          <SelectFilter label={t.status} value={filters.status} onChange={value => setFilters(f => ({ ...f, status: value }))} options={[{ value: 'all', label: t.allStatus }, { value: 'active', label: t.active }, { value: 'inactive', label: t.inactive }]} />
          <div className="flex items-end">
            <ResetFiltersButton onClick={() => setFilters({ role: 'all', status: 'all' })} label={t.reset} />
          </div>
        </div>
      </FilterCard>

      {/* Table */}
      <TableShell>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t.username}</th>
                <th>{t.role}</th>
                <th>{t.department} / {t.position}</th>
                <th>{t.lastLogin}</th>
                <th>{t.status}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <EmptyTableRow colSpan={6}>{t.noAdminsFound}</EmptyTableRow>
              ) : filtered.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.username || a.name || a.email || '-'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{a.email || '-'}</div>
                    <div style={{ fontSize: 11, color: '#d1d5db', fontFamily: 'monospace', marginTop: 1 }}>
                      {String(a.id).slice(0, 8)}…
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${ROLE_COLORS[accountRole(a)] || 'badge-gray'}`}>{accountRole(a)}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13 }}>{a.department || '-'}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{a.position || '-'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                      <div>
                        <div style={{ fontSize: 13 }}>{a.lastLoginRelative || a.lastLoginAt || '-'}</div>
                        {(a.ip || a.lastLoginIp) && <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{a.ip || a.lastLoginIp}</div>}
                      </div>
                      {(a.ip || a.lastLoginIp) && (
                        <Tooltip title="IP Lookup">
                          <IconButton size="small" onClick={() => setIpModal(a.ip || a.lastLoginIp)} sx={{ p: 0.5 }}>
                            <i className="fa fa-search" style={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
                      <Tooltip title={t.detail}>
                        <IconButton size="small" onClick={() => showAdminDetail(a)} sx={{ p: 0.75 }}>
                          <i className="fa fa-info-circle" style={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t.logins}>
                        <IconButton size="small" onClick={() => showLoginHistory(a)} sx={{ p: 0.75 }}>
                          <i className="fa fa-history" style={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t.resetBtn}>
                        <IconButton size="small" onClick={() => sendPasswordReset(a)} sx={{ p: 0.75 }}>
                          <i className="fa fa-key" style={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                      <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 2px', flexShrink: 0 }} />
                      <Button variant="contained" size="small" onClick={() => setModal(a)} startIcon={<i className="fa fa-edit" />}>{t.edit}</Button>
                      {a.role !== 'owner' && (
                        <Button
                          onClick={() => toggleAdminStatus(a)}
                          variant="contained"
                          color={a.status === 'active' ? 'warning' : 'success'}
                          size="small"
                          startIcon={<i className={`fa fa-${a.status === 'active' ? 'ban' : 'check'}`} />}
                        >
                          {a.status === 'active' ? t.disable : t.enable}
                        </Button>
                      )}
                      {a.role !== 'owner' && (
                        <Tooltip title={t.deleteAdmin}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteAdmin(a)}
                            sx={{ p: 0.75, color: 'error.main', '&:hover': { bgcolor: 'error.50' } }}
                          >
                            <i className="fa fa-trash" style={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
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
