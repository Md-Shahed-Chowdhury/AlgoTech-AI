import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import AILabBackground from './components/AILabBackground/AILabBackground'
import LearnPage from './pages/LearnPage'
import TestPage from './pages/TestPage'
import GridPage from './pages/GridPage'

import LearnModePage from './features/graph/components/LearnModePage/LearnModePage.jsx'
import ExamModePage from './features/graph/components/ExamModePage/ExamModePage.jsx'
import ComparePage from './features/compare/components/ComparePage/ComparePage.jsx'

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
      {/* Optional Three.js AI Laboratory ambient background overlay */}
      <AILabBackground />

      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          {/* Redirect root → /learn */}
          <Route path="/" element={<Navigate to="/learn" replace />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/test"  element={<TestPage />} />
          <Route path="/grid"  element={<GridPage />} />

          {/* Graph Search Routes */}
          <Route path="/graph/learn" element={<LearnModePage />} />
          <Route path="/graph/learn/:algorithmId" element={<LearnModePage />} />
          <Route path="/graph/exam" element={<ExamModePage />} />
          <Route path="/graph/exam/:algorithmId" element={<ExamModePage />} />

          {/* Algorithm Comparison */}
          <Route path="/compare" element={<ComparePage />} />

          <Route path="*"      element={<NotFound />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
