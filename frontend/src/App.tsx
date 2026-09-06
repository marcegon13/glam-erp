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
import Vales from './pages/Vales'
import Liquidaciones from './pages/Liquidaciones'
import LegajoProfesional from './pages/LegajoProfesional'
import CierreTurno from './pages/CierreTurno'
import ProduccionDiaria from './pages/ProduccionDiaria'
import GastosAdmin from './pages/GastosAdmin'
import Usuarios from './pages/Usuarios'
import Importar from './pages/Importar'
import { authStore } from './store/auth'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!authStore.getToken()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function RequireRol({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const rol = authStore.getUser()?.rol
  if (rol && !roles.includes(rol)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

const ADMIN_CAJERA = ['ADMINISTRADOR', 'CAJERA']
const ADMIN_CAJERA_OFICINA = ['ADMINISTRADOR', 'CAJERA', 'OFICINA']
const ADMIN_OFICINA = ['ADMINISTRADOR', 'OFICINA']
const SOLO_ADMIN = ['ADMINISTRADOR']

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
              <RequireRol roles={ADMIN_CAJERA}>
                <Recepcion />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/turnos"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_CAJERA}>
                <Turnos />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/turnos/archivados"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_CAJERA}>
                <TurnosArchivados />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/ausencias"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_CAJERA}>
                <Ausencias />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/ordenes/:id"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_CAJERA}>
                <OrdenDetalle />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/profesionales"
          element={
            <RequireAuth>
              <RequireRol roles={SOLO_ADMIN}>
                <Profesionales />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/servicios"
          element={
            <RequireAuth>
              <RequireRol roles={SOLO_ADMIN}>
                <Servicios />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/clientes"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_CAJERA_OFICINA}>
                <Clientes />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/clientes/:id"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_CAJERA_OFICINA}>
                <ClienteFicha />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/caja"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_CAJERA_OFICINA}>
                <Caja />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/cierre-turno"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_CAJERA}>
                <CierreTurno />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/vales"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_OFICINA}>
                <Vales />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/liquidaciones"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_OFICINA}>
                <Liquidaciones />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/liquidaciones/:profesionalId/:periodo"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_OFICINA}>
                <LegajoProfesional />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/produccion-diaria"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_OFICINA}>
                <ProduccionDiaria />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/gastos-admin"
          element={
            <RequireAuth>
              <RequireRol roles={ADMIN_OFICINA}>
                <GastosAdmin />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RequireAuth>
              <RequireRol roles={SOLO_ADMIN}>
                <Usuarios />
              </RequireRol>
            </RequireAuth>
          }
        />
        <Route
          path="/importar"
          element={
            <RequireAuth>
              <RequireRol roles={SOLO_ADMIN}>
                <Importar />
              </RequireRol>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
