import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import content from '../data/content.json'

// ── Fade-in hook ──────────────────────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    const targets = el.querySelectorAll ? el.querySelectorAll('.fade-in') : []
    if (el.classList && el.classList.contains('fade-in')) {
      observer.observe(el)
    }
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])
  return ref
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleNavLink = (e, href) => {
    setMobileOpen(false)
    if (href.startsWith('#')) {
      e.preventDefault()
      const el = document.querySelector(href)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <a href="/" className="nav-logo">{content.nav.logo}</a>
        <ul className="nav-links">
          {content.nav.links.map((link) => (
            <li key={link.href}>
              <a href={link.href} onClick={(e) => handleNavLink(e, link.href)}>
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a href="#contact" onClick={(e) => handleNavLink(e, '#contact')}>Contact</a>
          </li>
          {content.cv.enabled && content.cv.fileUrl && (
            <li>
              <a href={content.cv.fileUrl} target="_blank" rel="noopener noreferrer" className="nav-cv-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {content.cv.label}
              </a>
            </li>
          )}
        </ul>
        <button
          className="nav-hamburger"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile nav overlay */}
      <div className={`nav-mobile${mobileOpen ? ' open' : ''}`}>
        <button className="nav-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">✕</button>
        {content.nav.links.map((link) => (
          <a key={link.href} href={link.href} onClick={(e) => handleNavLink(e, link.href)}>
            {link.label}
          </a>
        ))}
        <a href="#contact" onClick={(e) => handleNavLink(e, '#contact')}>Contact</a>
        {content.cv.enabled && content.cv.fileUrl && (
          <a href={content.cv.fileUrl} target="_blank" rel="noopener noreferrer">
            {content.cv.label}
          </a>
        )}
      </div>
    </>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  const ref = useFadeIn()

  const scrollTo = (id) => {
    const el = document.querySelector(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="hero" id="hero" ref={ref}>
      <div className="hero-inner">
        <div>
          <p className="hero-eyebrow fade-in">{content.hero.eyebrow}</p>
          <h1 className="hero-name fade-in fade-in-delay-1">{content.hero.name}</h1>
          <p className="hero-bio fade-in fade-in-delay-2">{content.hero.bio}</p>
          <div className="hero-ctas fade-in fade-in-delay-3">
            <button className="btn-primary" onClick={() => scrollTo('#work')}>
              {content.hero.ctaPrimary}
            </button>
            <button className="btn-secondary" onClick={() => scrollTo('#contact')}>
              {content.hero.ctaSecondary}
            </button>
          </div>
        </div>
        <div className="hero-photo-wrap fade-in fade-in-delay-2">
          {content.hero.photoUrl ? (
            <img src={content.hero.photoUrl} alt={content.hero.name} className="hero-photo" />
          ) : (
            <div className="hero-photo-placeholder">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <p>Photo coming soon</p>
            </div>
          )}
          <div className="hero-photo-glow" />
        </div>
      </div>
    </section>
  )
}

// ── About ─────────────────────────────────────────────────────────────────────
function About() {
  const ref = useFadeIn()

  return (
    <section className="about" id="about" ref={ref}>
      <div className="about-inner">
        <span className="section-label fade-in">{content.about.label}</span>
        <h2 className="section-title fade-in fade-in-delay-1">{content.about.title}</h2>
        <div className="about-grid">
          <div className="about-paragraphs fade-in fade-in-delay-2">
            {content.about.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="about-skills-wrap fade-in fade-in-delay-3">
            <p className="about-skills-title">Specialisms</p>
            <div className="about-skills">
              {content.about.skills.map((skill) => (
                <span key={skill} className="skill-tag">{skill}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Case Card ─────────────────────────────────────────────────────────────────
function CaseCard({ c }) {
  return (
    <div className="case-card">
      <div className="case-image-wrap">
        {c.imageUrl ? (
          <img src={c.imageUrl} alt={c.imageAlt} className="case-image" loading="lazy" />
        ) : (
          <div className="case-image-placeholder">
            <span className="case-image-placeholder-number">{c.number}</span>
          </div>
        )}
      </div>
      <div className="case-body">
        <div className="case-number-tags">
          <span className="case-number">{c.number}</span>
          {c.tags.map((tag) => (
            <span key={tag} className="case-tag">{tag}</span>
          ))}
        </div>
        <h3 className="case-title">{c.title}</h3>
        <p className="case-desc">{c.description}</p>
        {c.metrics && c.metrics.length > 0 && (
          <div className="case-metrics">
            {c.metrics.map((m, i) => (
              <div key={i} className="metric">
                <span className="metric-value">{m.value}</span>
                <span className="metric-label">{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Work ──────────────────────────────────────────────────────────────────────
function Work() {
  const ref = useFadeIn()
  const [carouselIdx, setCarouselIdx] = useState(0)
  const cases = content.work.cases

  const prev = () => setCarouselIdx((i) => Math.max(0, i - 1))
  const next = () => setCarouselIdx((i) => Math.min(cases.length - 1, i + 1))

  return (
    <section className="work" id="work" ref={ref}>
      <div className="work-inner">
        <span className="section-label fade-in">{content.work.label}</span>
        <h2 className="section-title fade-in fade-in-delay-1">{content.work.title}</h2>

        {/* Desktop grid */}
        <div className="work-grid">
          {cases.map((c, i) => (
            <div key={c.id} className={`fade-in fade-in-delay-${Math.min(i + 1, 4)}`}>
              <CaseCard c={c} />
            </div>
          ))}
        </div>

        {/* Mobile carousel */}
        <div className="work-carousel carousel-wrap">
          <div className="carousel-track-outer">
            <div
              className="carousel-track"
              style={{ transform: `translateX(calc(-${carouselIdx * 85}vw - ${carouselIdx * 16}px))` }}
            >
              {cases.map((c) => (
                <CaseCard key={c.id} c={c} />
              ))}
            </div>
          </div>
          <div className="carousel-dots">
            {cases.map((_, i) => (
              <button
                key={i}
                className={`carousel-dot${carouselIdx === i ? ' active' : ''}`}
                onClick={() => setCarouselIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <div className="carousel-arrows">
            <button className="carousel-arrow" onClick={prev} disabled={carouselIdx === 0} aria-label="Previous">←</button>
            <button className="carousel-arrow" onClick={next} disabled={carouselIdx === cases.length - 1} aria-label="Next">→</button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Testimonials ──────────────────────────────────────────────────────────────
function Testimonials() {
  const ref = useFadeIn()
  const [carouselIdx, setCarouselIdx] = useState(0)
  const items = content.testimonials.items

  const prev = () => setCarouselIdx((i) => Math.max(0, i - 1))
  const next = () => setCarouselIdx((i) => Math.min(items.length - 1, i + 1))

  return (
    <section className="testimonials" id="testimonials" ref={ref}>
      <div className="testimonials-inner">
        <span className="section-label fade-in">{content.testimonials.label}</span>
        <h2 className="section-title fade-in fade-in-delay-1">{content.testimonials.title}</h2>

        {/* Desktop grid */}
        <div className="testimonials-grid">
          {items.map((item, i) => (
            <div key={item.id} className={`fade-in fade-in-delay-${Math.min(i + 1, 4)}`}>
              <div className="testimonial-card">
                <div className="testimonial-quote">"</div>
                <p className="testimonial-text">{item.text}</p>
                <div className="testimonial-author">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="testimonial-avatar" />
                  )}
                  <div className="testimonial-author-text">
                    <span className="testimonial-name">{item.name}</span>
                    <span className="testimonial-role">{item.role}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile carousel */}
        <div className="testimonials-carousel carousel-wrap">
          <div className="carousel-track-outer">
            <div
              className="carousel-track"
              style={{ transform: `translateX(calc(-${carouselIdx * 85}vw - ${carouselIdx * 16}px))` }}
            >
              {items.map((item) => (
                <div key={item.id} className="testimonial-card">
                  <div className="testimonial-quote">"</div>
                  <p className="testimonial-text">{item.text}</p>
                  <div className="testimonial-author">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="testimonial-avatar" />
                    )}
                    <div className="testimonial-author-text">
                      <span className="testimonial-name">{item.name}</span>
                      <span className="testimonial-role">{item.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="carousel-dots">
            {items.map((_, i) => (
              <button
                key={i}
                className={`carousel-dot${carouselIdx === i ? ' active' : ''}`}
                onClick={() => setCarouselIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <div className="carousel-arrows">
            <button className="carousel-arrow" onClick={prev} disabled={carouselIdx === 0} aria-label="Previous">←</button>
            <button className="carousel-arrow" onClick={next} disabled={carouselIdx === items.length - 1} aria-label="Next">→</button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Brands ────────────────────────────────────────────────────────────────────
function Brands() {
  const items = content.brands.items
  // duplicate for seamless loop
  const doubled = [...items, ...items]

  return (
    <section className="brands" id="brands">
      <p className="brands-label">{content.brands.label}</p>
      <div className="brands-track-wrap">
        <div className="brands-track">
          {doubled.map((brand, i) => (
            <div key={i} className="brand-item">
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt={brand.name} className="brand-logo" />
              ) : (
                <span className="brand-name-text">{brand.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Contact ───────────────────────────────────────────────────────────────────
function Contact() {
  const ref = useFadeIn()
  const c = content.contact
  const cv = content.cv

  return (
    <section className="contact" id="contact" ref={ref}>
      <div className="contact-inner">
        <div className="fade-in">
          <span className="section-label">{c.label}</span>
          <h2 className="contact-title">
            {c.title}<br />
            <em>{c.titleEm}</em> {c.titleEnd}
          </h2>
        </div>
        <div className="fade-in fade-in-delay-1">
          <div className="contact-actions">
            {c.email && (
              <a href={`mailto:${c.email}`} className="contact-link">
                <div className="contact-link-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <div>
                  <div className="contact-link-label">Email</div>
                  <div className="contact-link-value">{c.email}</div>
                </div>
              </a>
            )}

            {c.showLinkedin && c.linkedin && (
              <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="contact-link">
                <div className="contact-link-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                    <rect width="4" height="12" x="2" y="9"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                </div>
                <div>
                  <div className="contact-link-label">LinkedIn</div>
                  <div className="contact-link-value">marketingwithgatee</div>
                </div>
              </a>
            )}

            {c.showPhone && c.phone && (
              <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="contact-link">
                <div className="contact-link-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16v.92z"/>
                  </svg>
                </div>
                <div>
                  <div className="contact-link-label">Phone</div>
                  <div className="contact-link-value">{c.phone}</div>
                </div>
              </a>
            )}

            {cv.enabled && (
              <div className="contact-cv-row">
                {cv.fileUrl ? (
                  <>
                    <a href={cv.fileUrl} download className="contact-cv-btn primary">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      {cv.label}
                    </a>
                    <a href={cv.fileUrl} target="_blank" rel="noopener noreferrer" className="contact-cv-btn secondary">
                      {cv.viewLabel}
                    </a>
                  </>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--silver)', opacity: 0.5 }}>
                    CV available on request
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="footer">
      <div>
        <div className="footer-name">{content.footer.name}</div>
        <div className="footer-location">{content.footer.location}</div>
      </div>
      <Link to="/admin" className="footer-admin-link">Admin</Link>
    </footer>
  )
}

// ── Portfolio (main export) ───────────────────────────────────────────────────
export default function Portfolio() {
  // Run IntersectionObserver globally for all fade-in elements
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    // Observe all fade-in elements after paint
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el))
    })

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Work />
        <Testimonials />
        <Brands />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
