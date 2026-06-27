import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { docs } from './docs'
import Layout from './components/Layout'

export default function App() {
  const first = docs[0]?.slug ?? ''
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={`/${first}`} replace />} />
        <Route path="/:slug" element={<Layout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
