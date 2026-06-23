import { useState } from 'react'
import {
  Users, Mail, Phone, MapPin, ShieldCheck, Pencil, KeyRound, Copy, Check, Building2,
} from 'lucide-react'
import { Avatar, Badge, Button, Input, Toggle, Modal, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import {
  partnersService,
  type PartnerUser,
  type UpdatePartnerUserInput,
} from '@/services/partners.service'
import { errorMessage } from '@/services/errors'
import s from './PartnerUsers.module.scss'

/** Platform-staff panel: view + manage a partner's users (edit, reset password). */
export function PartnerUsers({ partnerId }: { partnerId: string }) {
  const toast = useToast()
  const { data: users, loading, reload } = useResource(
    () => partnersService.listUsers(partnerId),
    [partnerId],
  )

  const [editing, setEditing] = useState<PartnerUser | null>(null)
  const [resetting, setResetting] = useState<PartnerUser | null>(null)

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}><Users size={15} className={s.titleIcon} /> Users</h2>

      {loading && <p className={s.muted}>Loading users…</p>}
      {!loading && (!users || users.length === 0) && <p className={s.muted}>No users yet.</p>}

      {users && users.length > 0 && (
        <div className={s.list}>
          {users.map((u) => (
            <div key={u.id} className={[s.row, !u.active ? s.rowInactive : ''].filter(Boolean).join(' ')}>
              <Avatar name={u.name} size="sm" />
              <div className={s.info}>
                <div className={s.nameRow}>
                  <span className={s.name}>{u.name}</span>
                  <span className={[s.role, u.role === 'admin' ? s.roleAdmin : ''].filter(Boolean).join(' ')}>
                    {u.role === 'admin' ? 'Admin' : 'Manager'}
                  </span>
                  {!u.active && <Badge variant="inactive" label="Disabled" />}
                </div>
                <div className={s.contact}><Mail size={11} /> {u.email}</div>
                <div className={s.contact}><Phone size={11} /> {u.phone}</div>
                {u.location && <div className={s.contact}><MapPin size={11} /> {u.location.name}</div>}
                {u.mustChangePassword && (
                  <div className={s.flag}><ShieldCheck size={11} /> Must change password on next login</div>
                )}
              </div>
              <div className={s.actions}>
                <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                  <Pencil size={13} /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setResetting(u)}>
                  <KeyRound size={13} /> Reset password
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditUserModal
          partnerId={partnerId}
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); toast('User updated') }}
        />
      )}
      {resetting && (
        <ResetPasswordModal
          partnerId={partnerId}
          user={resetting}
          onClose={() => setResetting(null)}
          onDone={() => reload()}
        />
      )}
    </section>
  )
}

// ── Edit user modal ──
function EditUserModal({
  partnerId, user, onClose, onSaved,
}: { partnerId: string; user: PartnerUser; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState<UpdatePartnerUserInput>({
    name: user.name, phone: user.phone, active: user.active,
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await partnersService.updateUser(partnerId, user.id, form)
      onSaved()
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit user"
      subtitle={`${user.email} · ${user.role}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="accent" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className={s.fields}>
        <Input label="Name" value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Input label="Phone" value={form.phone ?? ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+374 …" />
        <div className={s.toggleRow}>
          <div>
            <div className={s.toggleLabel}>Active</div>
            <div className={s.toggleHint}>Disabled users can’t log in.</div>
          </div>
          <Toggle checked={form.active ?? true} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
        </div>
      </div>
    </Modal>
  )
}

// ── Reset password modal ──
function ResetPasswordModal({
  partnerId, user, onClose, onDone,
}: { partnerId: string; user: PartnerUser; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [mode, setMode] = useState<'generate' | 'manual'>('generate')
  const [manual, setManual] = useState('')
  const [working, setWorking] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const manualValid = manual.trim().length >= 8
  const canSubmit = mode === 'generate' || manualValid

  const submit = async () => {
    setWorking(true)
    try {
      const res = await partnersService.resetUserPassword(
        partnerId, user.id, mode === 'manual' ? manual.trim() : undefined,
      )
      setResult(res.password)
      onDone()
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setWorking(false)
    }
  }

  const copy = () => {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Reset password"
      subtitle={`${user.name} · ${user.email}`}
      footer={
        result ? (
          <Button variant="accent" onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="accent" disabled={!canSubmit || working} onClick={submit}>
              {working ? 'Resetting…' : 'Reset password'}
            </Button>
          </>
        )
      }
    >
      {result ? (
        // Success: show the new password once, with copy.
        <div className={s.resultBox}>
          <p className={s.resultLead}>New password set. Share it securely — it won’t be shown again.</p>
          <div className={s.passwordRow}>
            <code className={s.password}>{result}</code>
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </Button>
          </div>
          <p className={s.resultNote}>
            <ShieldCheck size={12} /> The user must change it on next login; existing sessions were signed out.
          </p>
        </div>
      ) : (
        <div className={s.fields}>
          <div className={s.modeRow}>
            <button
              type="button"
              className={[s.modeBtn, mode === 'generate' ? s.modeOn : ''].filter(Boolean).join(' ')}
              onClick={() => setMode('generate')}
            >
              <KeyRound size={14} /> Auto-generate
            </button>
            <button
              type="button"
              className={[s.modeBtn, mode === 'manual' ? s.modeOn : ''].filter(Boolean).join(' ')}
              onClick={() => setMode('manual')}
            >
              <Building2 size={14} /> Set manually
            </button>
          </div>
          {mode === 'generate' ? (
            <p className={s.muted}>A secure one-time password will be generated and shown once.</p>
          ) : (
            <Input
              label="New password"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="At least 8 characters"
              error={manual.length > 0 && !manualValid ? 'Minimum 8 characters' : undefined}
            />
          )}
        </div>
      )}
    </Modal>
  )
}
