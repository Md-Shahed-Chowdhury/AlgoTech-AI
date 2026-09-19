import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, ClipboardList, Grid3x3, Brain, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import styles from './Navbar.module.css'

const NAV_ITEMS = [
  {
    to: '/learn',
    label: 'Learn Algorithm',
    icon: BookOpen,
    accent: '#6366f1',
    desc: 'Study & visualize',
  },
  {
    to: '/test',
    label: 'Give Test',
    icon: ClipboardList,
    accent: '#10b981',
    desc: 'Quiz yourself',
  },
  {
    to: '/grid',
    label: 'Grid Visualizer',
    icon: Grid3x3,
    accent: '#f59e0b',
    desc: 'Pathfinding on grid',
  },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => setMenuOpen(false), [location])

  // Add shadow when scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`${styles.navbar} glass ${scrolled ? styles.scrolled : ''}`}>
      {/* Brand */}
      <NavLink to="/" className={styles.brand}>
        <div className={styles.brandIcon}>
          <Brain size={20} />
        </div>
        <span className={styles.brandName}>
          Algo<span className="gradient-text">Teach</span>
        </span>
        <span className={styles.brandBadge}>AI</span>
      </NavLink>

      {/* Desktop Nav */}
      <nav className={styles.nav} aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, label, icon: Icon, accent }) => (
          <NavLink
            key={to}
            to={to}
            id={`nav-${to.slice(1)}`}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
            style={({ isActive }) => isActive ? { '--link-accent': accent } : {}}
          >
            <Icon size={16} className={styles.navIcon} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Hamburger (mobile) */}
      <button
        id="nav-menu-toggle"
        className={styles.hamburger}
        onClick={() => setMenuOpen(o => !o)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className={styles.drawer}>
          {NAV_ITEMS.map(({ to, label, icon: Icon, accent, desc }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.drawerLink} ${isActive ? styles.drawerActive : ''}`
              }
              style={{ '--link-accent': accent }}
            >
              <div className={styles.drawerIcon} style={{ background: `${accent}22`, color: accent }}>
                <Icon size={18} />
              </div>
              <div>
                <div className={styles.drawerLabel}>{label}</div>
                <div className={styles.drawerDesc}>{desc}</div>
              </div>
            </NavLink>
          ))}
        </div>
      )}
    </header>
  )
}
