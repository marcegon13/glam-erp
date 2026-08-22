import { useState } from 'react'
import api from '../api/axios'

interface Cliente {
  id: number
  nombre: string
  apellido: string
  telefono: string | null
  email: string | null
}

interface Props {
  cliente?: Cliente | null
  onClose: () => void
  onSaved: (cliente: Cliente) => void
}

export default function ModalCliente({ cliente, onClose, onSaved }: Props) {
  const editando = !!cliente

  const [nombre, setNombre] = useState(cliente?.nombre ?? '')
  const [apellido, setApellido] = useState(cliente?.apellido ?? '')
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '')
  const [email, setEmail] = useState(cliente?.email ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setGuardando(true)

    const body = {
      nombre,
      apellido,
      telefono: telefono || undefined,
      email: email || undefined,
    }

    try {
      if (editando) {
        await api.put(`/clientes/${cliente.id}`, body)
        onSaved({ id: cliente.id, nombre, apellido, telefono: telefono || null, email: email || null })
      } else {
        const { data } = await api.post('/clientes', body)
        onSaved(data)
      }
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm py-8 px-8">
        <h2 className="text-lg font-bold text-text mb-6">
          {editando ? 'Editar cliente' : 'Nuevo cliente'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col">
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
            <label className="text-sm font-medium text-text mb-2">Apellido</label>
            <input
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              required
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col mt-4">
            <label className="text-sm font-medium text-text mb-2">Teléfono</label>
            <input
              value={telefono ?? ''}
              onChange={(e) => setTelefono(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col mt-4">
            <label className="text-sm font-medium text-text mb-2">
              Email <span className="text-text-muted font-normal">(opcional)</span>
            </label>
            <input
              type="email"
              value={email ?? ''}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
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
  )
}
