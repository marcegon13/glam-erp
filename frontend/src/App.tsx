import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Recepcion from './pages/Recepcion'
import OrdenDetalle from './pages/OrdenDetalle'
import { authStore } from './store/auth'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!authStore.getToken()) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/recepcion"
          element={
            <RequireAuth>
              <Recepcion />
            </RequireAuth>
          }
        />
        <Route
          path="/ordenes/:id"
          element={
            <RequireAuth>
              <OrdenDetalle />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
