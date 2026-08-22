import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ModalCliente from '../components/ModalCliente'
import api from '../api/axios'

interface Cliente {
  id: number
  nombre: string
  apellido: string
  telefono: string | null
  email: string | null
}

interface Profesional {
  id: number
  nombre: string
  apellido: string
  tipo: string
}

type TipoOrden = 'ESTILISTA' | 'MANICURA'

export default function Recepcion() {
  const navigate = useNavigate()

  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Cliente[]>([])
  const [buscando, setBuscando] = useState(false)
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null)

  const [modalCliente, setModalCliente] = useState(false)

  const [modalOrden, setModalOrden] = useState(false)
  const [ordenCliente, setOrdenCliente] = useState<Cliente | null>(null)
  const [ordenTipo, setOrdenTipo] = useState<TipoOrden>('ESTILISTA')
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [profesionalId, setProfesionalId] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [creandoOrden, setCreandoOrden] = useState(false)
  const [errorOrden, setErrorOrden] = useState('')

  useEffect(() => {
    if (!busqueda.trim()) {
      setResultados([])
      return
    }

    setBuscando(true)
    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.get('/clientes', { params: { busqueda } })
        setResultados(data)
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [busqueda])

  const abrirModalCliente = () => {
    setModalCliente(true)
  }

  const handleClienteCreado = (cliente: Cliente) => {
    setResultados((prev) => [cliente, ...prev])
    setSeleccionadoId(cliente.id)
  }

  const abrirModalOrden = async (cliente: Cliente, tipo: TipoOrden) => {
    setOrdenCliente(cliente)
    setOrdenTipo(tipo)
    setProfesionalId('')
    setObservaciones('')
    setErrorOrden('')
    setModalOrden(true)

    try {
      const { data } = await api.get('/profesionales', { params: { tipo } })
      setProfesionales(data)
    } catch {
      setProfesionales([])
    }
  }

  const handleCrearOrden = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ordenCliente || !profesionalId) return

    setErrorOrden('')
    setCreandoOrden(true)

    try {
      const { data } = await api.post('/ordenes', {
        clienteId: ordenCliente.id,
        profesionalId: Number(profesionalId),
        observaciones: observaciones || undefined,
      })
      navigate(`/ordenes/${data.id}`)
    } catch (err: any) {
      setErrorOrden(err.response?.data?.error ?? 'Error al crear orden')
    } finally {
      setCreandoOrden(false)
    }
  }

  const sinResultados = busqueda.trim() !== '' && !buscando && resultados.length === 0

  return (
    <Layout titulo="Recepción">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar cliente por nombre, apellido o teléfono..."
        className="w-full bg-white border border-[#DDDDE8] rounded-xl px-4 py-3 text-base outline-none focus:border-[#7C3AED] transition-colors shadow-sm"
      />

      <div className="mt-6 flex flex-col gap-3">
        {resultados.map((cliente) => (
          <div
            key={cliente.id}
            className={`bg-white rounded-2xl shadow-sm border p-4 flex items-center justify-between ${
              seleccionadoId === cliente.id ? 'border-[#7C3AED]' : 'border-[#DDDDE8]'
            }`}
          >
            <div>
              <p className="font-semibold text-[#1A1A2E]">
                {cliente.nombre} {cliente.apellido}
              </p>
              <p className="text-sm text-[#6B6B80]">{cliente.telefono ?? 'Sin teléfono'}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => abrirModalOrden(cliente, 'ESTILISTA')}
                className="bg-[#7C3AED] hover:bg-[#5B21B6] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                ✂ Estilista
              </button>
              <button
                onClick={() => abrirModalOrden(cliente, 'MANICURA')}
                className="bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#7C3AED] text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                💅 Manicura
              </button>
            </div>
          </div>
        ))}

        {sinResultados && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#DDDDE8] p-8 flex flex-col items-center gap-4">
            <p className="text-[#6B6B80]">No se encontró el cliente</p>
            <button
              onClick={abrirModalCliente}
              className="bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Nuevo cliente
            </button>
          </div>
        )}
      </div>

      {modalCliente && (
        <ModalCliente onClose={() => setModalCliente(false)} onSaved={handleClienteCreado} />
      )}

      {modalOrden && ordenCliente && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-sm border border-[#DDDDE8] w-full max-w-sm py-8 px-8">
            <h2 className="text-lg font-bold text-[#1A1A2E]">Nueva orden</h2>
            <p className="text-sm text-[#6B6B80] mt-1">
              {ordenCliente.nombre} {ordenCliente.apellido} · {ordenTipo === 'ESTILISTA' ? '✂ Estilista' : '💅 Manicura'}
            </p>

            <form onSubmit={handleCrearOrden} className="flex flex-col mt-6">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-[#1A1A2E] mb-2">Profesional</label>
                <select
                  value={profesionalId}
                  onChange={(e) => setProfesionalId(e.target.value)}
                  required
                  className="border border-[#DDDDE8] rounded-lg px-3 py-2 outline-none focus:border-[#7C3AED] transition-colors bg-white"
                >
                  <option value="" disabled>
                    Seleccioná un profesional
                  </option>
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.apellido}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-[#1A1A2E] mb-2">
                  Observaciones <span className="text-[#6B6B80] font-normal">(opcional)</span>
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  className="border border-[#DDDDE8] rounded-lg px-3 py-2 outline-none focus:border-[#7C3AED] transition-colors resize-none"
                />
              </div>

              {errorOrden && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
                  {errorOrden}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOrden(false)}
                  className="flex-1 border border-[#DDDDE8] text-[#6B6B80] font-medium rounded-lg py-2 transition-colors hover:bg-[#F8F8FC]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoOrden || !profesionalId}
                  className="flex-1 bg-[#7C3AED] hover:bg-[#5B21B6] text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {creandoOrden ? 'Creando...' : 'Crear Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
