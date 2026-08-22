import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Recepcion from './pages/Recepcion'
import Turnos from './pages/Turnos'
import TurnosArchivados from './pages/TurnosArchivados'
import Ausencias from './pages/Ausencias'
import OrdenDetalle from './pages/OrdenDetalle'
import Profesionales from './pages/Profesionales'
import Servicios from './pages/Servicios'
import Clientes from './pages/Clientes'
import ClienteFicha from './pages/ClienteFicha'
import Caja from './pages/Caja'
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
          path="/turnos"
          element={
            <RequireAuth>
              <Turnos />
            </RequireAuth>
          }
        />
        <Route
          path="/turnos/archivados"
          element={
            <RequireAuth>
              <TurnosArchivados />
            </RequireAuth>
          }
        />
        <Route
          path="/ausencias"
          element={
            <RequireAuth>
              <Ausencias />
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
        <Route
          path="/profesionales"
          element={
            <RequireAuth>
              <Profesionales />
            </RequireAuth>
          }
        />
        <Route
          path="/servicios"
          element={
            <RequireAuth>
              <Servicios />
            </RequireAuth>
          }
        />
        <Route
          path="/clientes"
          element={
            <RequireAuth>
              <Clientes />
            </RequireAuth>
          }
        />
        <Route
          path="/clientes/:id"
          element={
            <RequireAuth>
              <ClienteFicha />
            </RequireAuth>
          }
        />
        <Route
          path="/caja"
          element={
            <RequireAuth>
              <Caja />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
