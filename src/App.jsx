import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import LearnPage from './pages/LearnPage'
import TestPage from './pages/TestPage'
import GridPage from './pages/GridPage'

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
      <h1 style={{ fontSize: '5rem', fontWeight: 900, opacity: 0.1 }}>404</h1>
      <p style={{ color: 'var(--text-2)', marginBottom: '1.5rem' }}>Page not found.</p>
      <a href="/learn" className="btn btn-primary" style={{ textDecoration: 'none' }}>
        Go to Learn
      </a>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          {/* Redirect root → /learn */}
          <Route path="/" element={<Navigate to="/learn" replace />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/test"  element={<TestPage />} />
          <Route path="/grid"  element={<GridPage />} />
          <Route path="*"      element={<NotFound />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
