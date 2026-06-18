import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import initialContent from '../data/content.json'

// ── GitHub API helpers ─────────────────────────────────────────────────────────
const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const GH_OWNER = import.meta.env.VITE_GITHUB_OWNER
const GH_REPO  = import.meta.env.VITE_GITHUB_REPO
const GH_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main'
const CONTENT_PATH = 'src/data/content.json'

const isGitHubConfigured = Boolean(GH_TOKEN && GH_OWNER && GH_REPO)

async function fetchFileSha() {
  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${CONTENT_PATH}?ref=${GH_BRANCH}`,
    { headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json' } }
  )
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.sha
}

async function pushContentToGitHub(newContent) {
  const sha = await fetchFileSha()
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(newContent, null, 2))))
  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${CONTENT_PATH}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update site content via admin panel',
        content: encoded,
        sha,
        branch: GH_BRANCH,
      }),
    }
  )
  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status} ${await res.text()}`)
  return res.json()
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, type, show }) {
  return (
    <div className={`toast ${type} ${show ? 'show' : ''}`}>
      {message}
    </div>
  )
}

function useToast() {
  const [toast, setToast] = useState({ message: '', type: 'success', show: false })

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, show: true })
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000)
  }, [])

  return { toast, showToast }
}

// ── Deep merge utility ─────────────────────────────────────────────────────────
function mergeContent(base, patch) {
  return { ...base, ...patch }
}

// ── Reusable form components ──────────────────────────────────────────────────
function FormField({ label, id, type = 'text', value, onChange, hint, placeholder }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        className="form-input"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  )
}

function FormTextarea({ label, id, value, onChange, hint, placeholder, rows = 4 }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <textarea
        id={id}
        className="form-textarea"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  )
}

function FormToggle({ label, checked, onChange, hint }) {
  return (
    <div className="form-group">
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--purple-glow)', cursor: 'pointer' }}
        />
        {label}
      </label>
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  )
}

function StringArrayEditor({ items, onChange, placeholder = 'Enter value' }) {
  const update = (i, val) => {
    const next = [...items]
    next[i] = val
    onChange(next)
  }
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => onChange([...items, ''])

  return (
    <div className="array-editor">
      {items.map((item, i) => (
        <div key={i} className="array-item">
          <input
            className="form-input"
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
          />
          <button className="array-remove-btn" onClick={() => remove(i)} type="button">×</button>
        </div>
      ))}
      <button className="array-add-btn" onClick={add} type="button">+ Add item</button>
    </div>
  )
}

// ── Section Editors ───────────────────────────────────────────────────────────

function GeneralEditor({ data, onChange }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val })
  return (
    <div className="admin-card">
      <div className="admin-card-title">General / Meta</div>
      <FormField label="Site Title" id="siteTitle" value={data.siteTitle} onChange={set('siteTitle')} hint="Shown in browser tab" />
      <FormField label="Google Analytics ID" id="gaId" value={data.googleAnalyticsId} onChange={set('googleAnalyticsId')} hint="e.g. G-XXXXXXXXXX" placeholder="G-XXXXXXXXXX" />
    </div>
  )
}

function HeroEditor({ data, onChange }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val })
  return (
    <div className="admin-card">
      <div className="admin-card-title">Hero Section</div>
      <FormField label="Eyebrow Text" id="heroEyebrow" value={data.eyebrow} onChange={set('eyebrow')} />
      <FormField label="Name" id="heroName" value={data.name} onChange={set('name')} />
      <FormTextarea label="Bio" id="heroBio" value={data.bio} onChange={set('bio')} rows={5} />
      <FormField label="Photo URL" id="heroPhoto" value={data.photoUrl} onChange={set('photoUrl')} hint="Direct link to your photo. Leave empty to show placeholder." placeholder="https://..." />
      <div className="form-row">
        <FormField label="Primary CTA Label" id="ctaPrimary" value={data.ctaPrimary} onChange={set('ctaPrimary')} />
        <FormField label="Secondary CTA Label" id="ctaSecondary" value={data.ctaSecondary} onChange={set('ctaSecondary')} />
      </div>
    </div>
  )
}

function AboutEditor({ data, onChange }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val })
  return (
    <>
      <div className="admin-card">
        <div className="admin-card-title">About — Header</div>
        <div className="form-row">
          <FormField label="Section Label" id="aboutLabel" value={data.label} onChange={set('label')} />
          <FormField label="Section Title" id="aboutTitle" value={data.title} onChange={set('title')} />
        </div>
      </div>
      <div className="admin-card">
        <div className="admin-card-title">About — Paragraphs</div>
        <StringArrayEditor
          items={data.paragraphs || []}
          onChange={set('paragraphs')}
          placeholder="Enter paragraph text"
        />
      </div>
      <div className="admin-card">
        <div className="admin-card-title">About — Skills</div>
        <StringArrayEditor
          items={data.skills || []}
          onChange={set('skills')}
          placeholder="e.g. Campaign strategy"
        />
      </div>
    </>
  )
}

function MetricEditor({ metrics, onChange }) {
  const update = (i, key, val) => {
    const next = metrics.map((m, idx) => idx === i ? { ...m, [key]: val } : m)
    onChange(next)
  }
  const remove = (i) => onChange(metrics.filter((_, idx) => idx !== i))
  const add = () => onChange([...metrics, { value: '', label: '' }])

  return (
    <div className="array-editor">
      {metrics.map((m, i) => (
        <div key={i} className="array-item">
          <div className="sub-card">
            <div className="form-row">
              <FormField label="Value" id={`mv-${i}`} value={m.value} onChange={(v) => update(i, 'value', v)} placeholder="e.g. 250%" />
              <FormField label="Label" id={`ml-${i}`} value={m.label} onChange={(v) => update(i, 'label', v)} placeholder="e.g. Sponsorship target" />
            </div>
          </div>
          <button className="array-remove-btn" onClick={() => remove(i)} type="button">×</button>
        </div>
      ))}
      <button className="array-add-btn" onClick={add} type="button">+ Add metric</button>
    </div>
  )
}

function WorkEditor({ data, onChange }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val })

  const updateCase = (i, key, val) => {
    const next = data.cases.map((c, idx) => idx === i ? { ...c, [key]: val } : c)
    onChange({ ...data, cases: next })
  }

  const removeCase = (i) => {
    onChange({ ...data, cases: data.cases.filter((_, idx) => idx !== i) })
  }

  const addCase = () => {
    const nextId = (data.cases.length > 0 ? Math.max(...data.cases.map((c) => c.id)) + 1 : 1)
    onChange({
      ...data,
      cases: [...data.cases, {
        id: nextId,
        number: String(nextId).padStart(2, '0'),
        title: '',
        tags: [],
        imageUrl: '',
        imageAlt: '',
        description: '',
        metrics: [],
      }],
    })
  }

  return (
    <>
      <div className="admin-card">
        <div className="admin-card-title">Work — Header</div>
        <div className="form-row">
          <FormField label="Section Label" id="workLabel" value={data.label} onChange={set('label')} />
          <FormField label="Section Title" id="workTitle" value={data.title} onChange={set('title')} />
        </div>
      </div>

      {data.cases.map((c, i) => (
        <div key={c.id} className="admin-card">
          <div className="sub-card-header">
            <div className="admin-card-title">Case Study {c.number || i + 1}</div>
            <button className="array-remove-btn" onClick={() => removeCase(i)} type="button" style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem' }}>
              Remove
            </button>
          </div>
          <div className="form-row">
            <FormField label="Number" id={`cn-${i}`} value={c.number} onChange={(v) => updateCase(i, 'number', v)} placeholder="01" />
            <FormField label="Title" id={`ct-${i}`} value={c.title} onChange={(v) => updateCase(i, 'title', v)} />
          </div>
          <FormField label="Image URL" id={`ci-${i}`} value={c.imageUrl} onChange={(v) => updateCase(i, 'imageUrl', v)} placeholder="https://..." hint="Leave empty for placeholder" />
          <FormField label="Image Alt Text" id={`cia-${i}`} value={c.imageAlt} onChange={(v) => updateCase(i, 'imageAlt', v)} />
          <FormTextarea label="Description" id={`cd-${i}`} value={c.description} onChange={(v) => updateCase(i, 'description', v)} rows={4} />
          <div className="form-group">
            <label className="form-label">Tags (comma-separated)</label>
            <input
              className="form-input"
              value={(c.tags || []).join(', ')}
              onChange={(e) => updateCase(i, 'tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
              placeholder="e.g. Partnerships, Events, Commercial"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Metrics</label>
            <MetricEditor
              metrics={c.metrics || []}
              onChange={(v) => updateCase(i, 'metrics', v)}
            />
          </div>
        </div>
      ))}

      <button className="array-add-btn" onClick={addCase} type="button" style={{ marginBottom: 24 }}>
        + Add case study
      </button>
    </>
  )
}

function TestimonialsEditor({ data, onChange }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val })

  const updateItem = (i, key, val) => {
    const next = data.items.map((item, idx) => idx === i ? { ...item, [key]: val } : item)
    onChange({ ...data, items: next })
  }

  const removeItem = (i) => onChange({ ...data, items: data.items.filter((_, idx) => idx !== i) })

  const addItem = () => {
    const nextId = data.items.length > 0 ? Math.max(...data.items.map((t) => t.id)) + 1 : 1
    onChange({ ...data, items: [...data.items, { id: nextId, text: '', name: '', role: '' }] })
  }

  return (
    <>
      <div className="admin-card">
        <div className="admin-card-title">Testimonials — Header</div>
        <div className="form-row">
          <FormField label="Section Label" id="testLabel" value={data.label} onChange={set('label')} />
          <FormField label="Section Title" id="testTitle" value={data.title} onChange={set('title')} />
        </div>
      </div>

      {data.items.map((item, i) => (
        <div key={item.id} className="admin-card">
          <div className="sub-card-header">
            <div className="admin-card-title">Testimonial {i + 1}</div>
            <button className="array-remove-btn" onClick={() => removeItem(i)} type="button" style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem' }}>
              Remove
            </button>
          </div>
          <FormTextarea label="Quote" id={`tt-${i}`} value={item.text} onChange={(v) => updateItem(i, 'text', v)} rows={4} />
          <div className="form-row">
            <FormField label="Name" id={`tn-${i}`} value={item.name} onChange={(v) => updateItem(i, 'name', v)} />
            <FormField label="Role / Company" id={`tr-${i}`} value={item.role} onChange={(v) => updateItem(i, 'role', v)} />
          </div>
        </div>
      ))}

      <button className="array-add-btn" onClick={addItem} type="button" style={{ marginBottom: 24 }}>
        + Add testimonial
      </button>
    </>
  )
}

function BrandsEditor({ data, onChange }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val })

  const updateItem = (i, key, val) => {
    const next = data.items.map((item, idx) => idx === i ? { ...item, [key]: val } : item)
    onChange({ ...data, items: next })
  }

  const removeItem = (i) => onChange({ ...data, items: data.items.filter((_, idx) => idx !== i) })

  const addItem = () => {
    onChange({ ...data, items: [...data.items, { name: '', logoUrl: '', isLight: false }] })
  }

  return (
    <>
      <div className="admin-card">
        <div className="admin-card-title">Brands — Header</div>
        <FormField label="Section Label" id="brandsLabel" value={data.label} onChange={set('label')} />
      </div>

      {data.items.map((item, i) => (
        <div key={i} className="admin-card">
          <div className="sub-card-header">
            <div className="admin-card-title">Brand {i + 1}{item.name ? ` — ${item.name}` : ''}</div>
            <button className="array-remove-btn" onClick={() => removeItem(i)} type="button" style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem' }}>
              Remove
            </button>
          </div>
          <div className="form-row">
            <FormField label="Brand Name" id={`bn-${i}`} value={item.name} onChange={(v) => updateItem(i, 'name', v)} placeholder="e.g. TuneCore" />
            <FormField label="Logo URL" id={`bl-${i}`} value={item.logoUrl} onChange={(v) => updateItem(i, 'logoUrl', v)} placeholder="https://... (leave empty to show name as text)" />
          </div>
          <FormToggle label="Light logo (invert on dark bg)" checked={item.isLight} onChange={(v) => updateItem(i, 'isLight', v)} />
        </div>
      ))}

      <button className="array-add-btn" onClick={addItem} type="button" style={{ marginBottom: 24 }}>
        + Add brand
      </button>
    </>
  )
}

function ContactEditor({ data, onChange }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val })
  return (
    <div className="admin-card">
      <div className="admin-card-title">Contact Section</div>
      <div className="form-row">
        <FormField label="Section Label" id="contactLabel" value={data.label} onChange={set('label')} />
        <FormField label="Title Line 1" id="contactTitle" value={data.title} onChange={set('title')} />
      </div>
      <div className="form-row">
        <FormField label="Title Italic Part" id="contactTitleEm" value={data.titleEm} onChange={set('titleEm')} />
        <FormField label="Title End" id="contactTitleEnd" value={data.titleEnd} onChange={set('titleEnd')} />
      </div>
      <FormField label="Email Address" id="contactEmail" type="email" value={data.email} onChange={set('email')} />
      <FormField label="LinkedIn URL" id="contactLinkedin" value={data.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/in/..." />
      <div className="form-row">
        <FormField label="Phone Number" id="contactPhone" value={data.phone} onChange={set('phone')} placeholder="+44 7000 000000" />
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 18 }}>
          <FormToggle label="Show phone" checked={data.showPhone} onChange={set('showPhone')} />
        </div>
      </div>
      <FormToggle label="Show LinkedIn" checked={data.showLinkedin} onChange={set('showLinkedin')} />
    </div>
  )
}

function CvEditor({ data, onChange }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val })
  return (
    <div className="admin-card">
      <div className="admin-card-title">CV / Resume</div>
      <FormToggle label="Enable CV section" checked={data.enabled} onChange={set('enabled')} />
      <FormField label="CV File URL" id="cvUrl" value={data.fileUrl} onChange={set('fileUrl')} hint="Direct link to your CV (e.g. Google Drive, Dropbox, PDF host)" placeholder="https://..." />
      <div className="form-row">
        <FormField label="Download Button Label" id="cvLabel" value={data.label} onChange={set('label')} />
        <FormField label="View Button Label" id="cvViewLabel" value={data.viewLabel} onChange={set('viewLabel')} />
      </div>
    </div>
  )
}

function NavEditor({ data, onChange }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val })

  const updateLink = (i, key, val) => {
    const next = data.links.map((l, idx) => idx === i ? { ...l, [key]: val } : l)
    onChange({ ...data, links: next })
  }
  const removeLink = (i) => onChange({ ...data, links: data.links.filter((_, idx) => idx !== i) })
  const addLink = () => onChange({ ...data, links: [...data.links, { label: '', href: '#' }] })

  return (
    <div className="admin-card">
      <div className="admin-card-title">Navigation</div>
      <FormField label="Logo Text" id="navLogo" value={data.logo} onChange={set('logo')} />
      <div className="form-group">
        <label className="form-label">Nav Links</label>
        <div className="array-editor" style={{ marginTop: 8 }}>
          {data.links.map((link, i) => (
            <div key={i} className="array-item">
              <div className="sub-card" style={{ flexDirection: 'row', gap: 10 }}>
                <input
                  className="form-input"
                  value={link.label}
                  onChange={(e) => updateLink(i, 'label', e.target.value)}
                  placeholder="Label"
                  style={{ flex: 1 }}
                />
                <input
                  className="form-input"
                  value={link.href}
                  onChange={(e) => updateLink(i, 'href', e.target.value)}
                  placeholder="#section or /path"
                  style={{ flex: 1 }}
                />
              </div>
              <button className="array-remove-btn" onClick={() => removeLink(i)} type="button">×</button>
            </div>
          ))}
          <button className="array-add-btn" onClick={addLink} type="button">+ Add link</button>
        </div>
      </div>
    </div>
  )
}

function FooterEditor({ data, onChange }) {
  const set = (key) => (val) => onChange({ ...data, [key]: val })
  return (
    <div className="admin-card">
      <div className="admin-card-title">Footer</div>
      <FormField label="Footer Name" id="footerName" value={data.name} onChange={set('name')} />
      <FormField label="Location Text" id="footerLocation" value={data.location} onChange={set('location')} placeholder="e.g. Bristol, UK · Open to relocation" />
    </div>
  )
}

function AdminSecurityEditor({ data, onSave, saving }) {
  const [current, setCurrent] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')

  const handleChange = () => {
    setErr('')
    if (current !== import.meta.env.VITE_ADMIN_PASSWORD) {
      setErr('Current password is incorrect.')
      return
    }
    if (newPwd.length < 8) {
      setErr('New password must be at least 8 characters.')
      return
    }
    if (newPwd !== confirm) {
      setErr('Passwords do not match.')
      return
    }
    setErr('')
    alert('Password changes require updating the VITE_ADMIN_PASSWORD environment variable in Netlify → Site settings → Environment variables. The new password cannot be saved through this form directly as it is stored in your hosting environment, not in content.json.')
  }

  return (
    <div className="admin-card">
      <div className="admin-card-title">Admin Security</div>
      <div className="admin-banner">
        <span className="admin-banner-icon">ℹ️</span>
        <span>
          The admin password is set via the <strong>VITE_ADMIN_PASSWORD</strong> environment variable in Netlify.
          To change it, go to <strong>Netlify → Site settings → Environment variables</strong> and update the value, then trigger a new deploy.
        </span>
      </div>
      <FormField label="Current Password" id="secCurrent" type="password" value={current} onChange={setCurrent} />
      <FormField label="New Password" id="secNew" type="password" value={newPwd} onChange={setNewPwd} hint="Minimum 8 characters" />
      <FormField label="Confirm New Password" id="secConfirm" type="password" value={confirm} onChange={setConfirm} />
      {err && <div className="admin-login-error" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="admin-save-row" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
        <button className="admin-save-btn" onClick={handleChange} type="button">
          View instructions
        </button>
      </div>
    </div>
  )
}

// ── Sidebar nav config ────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'general',   icon: '⚙️',  label: 'General' },
  { id: 'hero',      icon: '🏠',  label: 'Hero' },
  { id: 'about',     icon: '👤',  label: 'About' },
  { id: 'work',      icon: '💼',  label: 'Work' },
  { id: 'testimonials', icon: '💬', label: 'Testimonials' },
  { id: 'brands',    icon: '🏷️', label: 'Brands' },
  { id: 'contact',   icon: '✉️',  label: 'Contact' },
  { id: 'cv',        icon: '📄',  label: 'CV' },
  { id: 'nav',       icon: '🔗',  label: 'Navigation' },
  { id: 'footer',    icon: '📌',  label: 'Footer' },
  { id: 'security',  icon: '🔒',  label: 'Admin Security' },
]

// ── Main Admin component ──────────────────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('general')
  const [saving, setSaving] = useState(false)
  const { toast, showToast } = useToast()

  // Local copy of all content — we edit this and push on save
  const [content, setContent] = useState(() => JSON.parse(JSON.stringify(initialContent)))

  const updateSection = (section) => (val) => {
    setContent((prev) => ({ ...prev, [section]: val }))
  }

  const handleSave = async (section) => {
    if (!isGitHubConfigured) {
      showToast('GitHub not configured. Set VITE_GITHUB_TOKEN, VITE_GITHUB_OWNER, VITE_GITHUB_REPO in environment variables.', 'error')
      return
    }
    setSaving(true)
    try {
      await pushContentToGitHub(content)
      showToast('Changes saved! Site will redeploy in ~1 minute.', 'success')
    } catch (err) {
      console.error(err)
      showToast(`Save failed: ${err.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth')
    navigate('/')
    window.location.reload()
  }

  const SaveRow = ({ section }) => (
    <div className="admin-save-row">
      <button
        className="admin-save-btn"
        onClick={() => handleSave(section)}
        disabled={saving}
        type="button"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <>
            <div className="admin-section-title">General Settings</div>
            <div className="admin-section-desc">Site metadata and analytics configuration.</div>
            {!isGitHubConfigured && (
              <div className="admin-banner">
                <span className="admin-banner-icon">⚠️</span>
                <span>
                  Configure GitHub settings in Netlify environment variables to enable auto-deploy.
                  See <strong>.env.example</strong> for required variables:
                  VITE_GITHUB_TOKEN, VITE_GITHUB_OWNER, VITE_GITHUB_REPO, VITE_GITHUB_BRANCH.
                </span>
              </div>
            )}
            <GeneralEditor data={content.meta} onChange={updateSection('meta')} />
            <SaveRow section="general" />
          </>
        )
      case 'hero':
        return (
          <>
            <div className="admin-section-title">Hero Section</div>
            <div className="admin-section-desc">The first thing visitors see — your name, bio, and photo.</div>
            <HeroEditor data={content.hero} onChange={updateSection('hero')} />
            <SaveRow section="hero" />
          </>
        )
      case 'about':
        return (
          <>
            <div className="admin-section-title">About Section</div>
            <div className="admin-section-desc">Your story and areas of expertise.</div>
            <AboutEditor data={content.about} onChange={updateSection('about')} />
            <SaveRow section="about" />
          </>
        )
      case 'work':
        return (
          <>
            <div className="admin-section-title">Work / Case Studies</div>
            <div className="admin-section-desc">Showcase your most impactful projects.</div>
            <WorkEditor data={content.work} onChange={updateSection('work')} />
            <SaveRow section="work" />
          </>
        )
      case 'testimonials':
        return (
          <>
            <div className="admin-section-title">Testimonials</div>
            <div className="admin-section-desc">Social proof from people you've worked with.</div>
            <TestimonialsEditor data={content.testimonials} onChange={updateSection('testimonials')} />
            <SaveRow section="testimonials" />
          </>
        )
      case 'brands':
        return (
          <>
            <div className="admin-section-title">Brands</div>
            <div className="admin-section-desc">Logos or names of brands you've worked with.</div>
            <BrandsEditor data={content.brands} onChange={updateSection('brands')} />
            <SaveRow section="brands" />
          </>
        )
      case 'contact':
        return (
          <>
            <div className="admin-section-title">Contact Section</div>
            <div className="admin-section-desc">How people can reach you.</div>
            <ContactEditor data={content.contact} onChange={updateSection('contact')} />
            <SaveRow section="contact" />
          </>
        )
      case 'cv':
        return (
          <>
            <div className="admin-section-title">CV / Resume</div>
            <div className="admin-section-desc">Upload your CV to a file host and paste the link here.</div>
            <CvEditor data={content.cv} onChange={updateSection('cv')} />
            <SaveRow section="cv" />
          </>
        )
      case 'nav':
        return (
          <>
            <div className="admin-section-title">Navigation</div>
            <div className="admin-section-desc">Logo text and nav links shown in the header.</div>
            <NavEditor data={content.nav} onChange={updateSection('nav')} />
            <SaveRow section="nav" />
          </>
        )
      case 'footer':
        return (
          <>
            <div className="admin-section-title">Footer</div>
            <div className="admin-section-desc">Footer name and location text.</div>
            <FooterEditor data={content.footer} onChange={updateSection('footer')} />
            <SaveRow section="footer" />
          </>
        )
      case 'security':
        return (
          <>
            <div className="admin-section-title">Admin Security</div>
            <div className="admin-section-desc">Manage your admin password.</div>
            <AdminSecurityEditor data={content.meta} onSave={handleSave} saving={saving} />
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-title">Admin Panel</div>
          <div className="admin-sidebar-sub">marketingwithgatee.com</div>
        </div>
        <nav className="admin-sidebar-nav">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`admin-nav-btn${activeSection === s.id ? ' active' : ''}`}
              onClick={() => setActiveSection(s.id)}
              type="button"
            >
              <span className="admin-nav-icon">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button
            className="admin-preview-btn"
            onClick={() => window.open('/', '_blank')}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Preview Site
          </button>
          <button className="admin-logout-btn" onClick={handleLogout} type="button">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        {renderSection()}
      </main>

      {/* Toast notification */}
      <Toast message={toast.message} type={toast.type} show={toast.show} />
    </div>
  )
}
