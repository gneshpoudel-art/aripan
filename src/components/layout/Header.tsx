import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '@/hooks/useStore'
import { Dialog, SearchForm } from '@/components/ui/Dialog'
import { IconBag, IconClose, IconHeart, IconMenu, IconSearch } from '@/components/ui/Icons'

const links = [
  { to: '/gallery', label: 'Gallery' },
  { to: '/collections', label: 'Collections' },
  { to: '/shop', label: 'Shop' },
  { to: '/journal', label: 'Journal' },
  { to: '/about', label: 'About' },
  { to: '/commissions', label: 'Commissions' },
  { to: '/contact', label: 'Contact' },
]

export function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme, cartCount, wishlistCount } = useStore()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handleScroll = () => {
      const top = window.scrollY || document.documentElement.scrollTop || window.pageYOffset || 0
      setScrolled(top > 30)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const [menu, setMenu] = useState(false)
  const [menuFor, setMenuFor] = useState(pathname)
  const [search, setSearch] = useState(false)
  const menuOpen = menu && menuFor === pathname
  const solid = pathname !== '/' || scrolled || menuOpen
  const isHero = pathname === '/' && !solid

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Close menu on navigation
  useEffect(() => {
    setMenu(false)
  }, [pathname])

  return (
    <>
      <header className={`site-header ${isHero ? 'is-hero' : 'is-solid'} ${menuOpen ? 'menu-open' : ''}`}>
        <div className="header-inner">
          <Link className="logo" to="/" aria-label="ARIPAN home" onClick={() => setMenu(false)}>
            <img src="/logo.png" alt="ARIPAN" style={{ height: '32px', display: 'block' }} />
          </Link>
          <nav className="primary-nav" aria-label="Primary">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className="nav-link">
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <button type="button" className="icon-btn" onClick={() => setSearch(true)} aria-label="Search">
              <IconSearch title="Search" />
            </button>
            <Link className="icon-btn" to="/wishlist" aria-label="Wishlist" style={{ position: 'relative' }}>
              <IconHeart title="Wishlist" />
              {wishlistCount > 0 && <span className="header-badge" aria-hidden="true" />}
            </Link>
            <Link className="icon-btn" to="/cart" aria-label="Cart" style={{ position: 'relative' }}>
              <IconBag title="Cart" />
              {cartCount > 0 && <span className="header-badge" aria-hidden="true" />}
            </Link>
            <button
              type="button"
              className="icon-btn"
              aria-pressed={theme === 'vintage'}
              aria-label="Vintage monochrome mode"
              onClick={toggleTheme}
            >
              <span aria-hidden="true" style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem' }}>
                {theme === 'vintage' ? '◎' : '○'}
              </span>
            </button>
            <button
              type="button"
              className="icon-btn menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => {
                if (menuOpen) setMenu(false)
                else {
                  setMenu(true)
                  setMenuFor(pathname)
                }
              }}
            >
              {menuOpen ? <IconClose title="Close menu" /> : <IconMenu title="Menu" />}
              <span className="sr-only">{menuOpen ? 'Close' : 'Menu'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation (rendered outside header to avoid backdrop-filter stacking trap) */}
      <div className={`mobile-nav-backdrop ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenu(false)} aria-hidden="true" />
      <nav id="mobile-nav" className={`mobile-nav ${menuOpen ? 'is-open' : ''}`} hidden={!menuOpen} aria-label="Mobile">
        <div className="mobile-nav-inner">
          <div className="mobile-nav-links">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className="mobile-nav-link"
                onClick={() => setMenu(false)}
              >
                <span>{l.label}</span>
                <span className="mobile-nav-arrow" aria-hidden="true">→</span>
              </NavLink>
            ))}
          </div>
          <div className="mobile-nav-footer">
            <div className="mobile-nav-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setMenu(false)
                  setSearch(true)
                }}
                style={{ flex: 1, padding: '0.6rem 0.8rem', fontSize: '0.75rem' }}
              >
                Search
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={toggleTheme}
                style={{ flex: 1, padding: '0.6rem 0.8rem', fontSize: '0.75rem' }}
              >
                {theme === 'vintage' ? 'Standard' : 'Vintage'} Mode
              </button>
            </div>
            <p className="mobile-nav-caption">
              ARIPAN · Mithila Art Studio · Nepal
            </p>
          </div>
        </div>
      </nav>
      <Dialog open={search} title="Search" onClose={() => setSearch(false)}>
        <SearchForm
          onSearch={(q) => {
            setSearch(false)
            navigate(`/search?q=${encodeURIComponent(q)}`)
          }}
        />
      </Dialog>
    </>
  )
}
