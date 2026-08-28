import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

type Rol = 'ADMINISTRADOR' | 'CAJERA' | 'OFICINA' | 'ESTILISTA' | 'MANICURA'

interface Usuario {
  id: number
  nombre: string
  email: string
  rol: Rol
  activo: boolean
}

const ROLES_ASIGNABLES: Rol[] = ['CAJERA', 'OFICINA', 'ESTILISTA', 'MANICURA']

const ROL_BADGE: Record<Rol, string> = {
  ADMINISTRADOR: 'bg-[#EDE9FE] text-primary',
  CAJERA: 'bg-blue-50 text-blue-600',
  OFICINA: 'bg-amber-50 text-amber-600',
  ESTILISTA: 'bg-pink-50 text-pink-600',
  MANICURA: 'bg-teal-50 text-teal-600',
}

const ROL_LABEL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  CAJERA: 'Cajera',
  OFICINA: 'Oficina',
  ESTILISTA: 'Estilista',
  MANICURA: 'Manicura',
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<Rol>('CAJERA')
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  const fetchUsuarios = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/usuarios')
      setUsuarios(data)
    } catch {
      setError('No se pudieron cargar los usuarios')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setNombre('')
    setEmail('')
    setPassword('')
    setRol('CAJERA')
    setErrorModal('')
    setModalAbierto(true)
  }

  const abrirEditar = (u: Usuario) => {
    setEditando(u)
    setNombre(u.nombre)
    setEmail(u.email)
    setPassword('')
    setRol(ROLES_ASIGNABLES.includes(u.rol) ? u.rol : 'CAJERA')
    setErrorModal('')
    setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorModal('')
    setGuardando(true)

    try {
      if (editando) {
        const body: Record<string, string> = { nombre, email, rol }
        if (password.trim()) body.password = password.trim()
        await api.put(`/usuarios/${editando.id}`, body)
      } else {
        await api.post('/usuarios', { nombre, email, password, rol })
      }
      setModalAbierto(false)
      await fetchUsuarios()
    } catch (err: any) {
      setErrorModal(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleDesactivar = async (u: Usuario) => {
    if (!window.confirm(`¿Desactivar el usuario "${u.nombre}"?`)) return
    try {
      await api.put(`/usuarios/${u.id}/estado`, { activo: false })
      await fetchUsuarios()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'No se pudo desactivar el usuario')
    }
  }

  const handleActivar = async (u: Usuario) => {
    try {
      await api.put(`/usuarios/${u.id}/estado`, { activo: true })
      await fetchUsuarios()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'No se pudo activar el usuario')
    }
  }

  return (
    <Layout titulo="Gestión de Usuarios">
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirNuevo}
          className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors"
        >
          Nuevo Usuario
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-text-muted">
                  Cargando...
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-text-muted">
                  No hay usuarios cargados
                </td>
              </tr>
            ) : (
              usuarios.map((u, i) => (
                <tr
                  key={u.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}
                >
                  <td className="px-5 py-3 text-text font-medium">{u.nombre}</td>
                  <td className="px-5 py-3 text-text">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROL_BADGE[u.rol]}`}>
                      {ROL_LABEL[u.rol]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        u.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.rol === 'ADMINISTRADOR' ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      <>
                        <button
                          onClick={() => abrirEditar(u)}
                          className="text-primary hover:text-primary-dark font-medium mr-4 transition-colors"
                        >
                          Editar
                        </button>
                        {u.activo ? (
                          <button
                            onClick={() => handleDesactivar(u)}
                            className="text-red-600 hover:text-red-700 font-medium transition-colors"
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivar(u)}
                            className="text-green-700 hover:text-green-800 font-medium transition-colors"
                          >
                            Activar
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm py-8 px-8">
            <h2 className="text-lg font-bold text-text mb-6">
              {editando ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>

            <form onSubmit={handleGuardar} className="flex flex-col">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-text mb-2">Nombre</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">
                  {editando ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editando}
                  placeholder={editando ? 'Dejar en blanco para no cambiar' : ''}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Rol</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as Rol)}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
                >
                  {ROLES_ASIGNABLES.map((r) => (
                    <option key={r} value={r}>
                      {ROL_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>

              {errorModal && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
                  {errorModal}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 border border-border text-text-muted font-medium rounded-lg py-2 transition-colors hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
