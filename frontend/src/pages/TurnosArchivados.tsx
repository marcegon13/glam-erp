import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'

interface Cliente {
  id: number
  nombre: string
  apellido: string
  telefono: string | null
}

interface Profesional {
  id: number
  nombre: string
  apellido: string
}

interface TurnoArchivado {
  id: number
  fecha: string
  hora: string
  servicios: string
  cliente: Cliente
  profesional: Profesional
}

const formatoFecha = (fecha: string) => fecha.slice(0, 10).split('-').reverse().join('/')

export default function TurnosArchivados() {
  const navigate = useNavigate()

  const [fecha, setFecha] = useState('')
  const [profesionalFiltro, setProfesionalFiltro] = useState('')
  const [profesionales, setProfesionales] = useState<Profesional[]>([])

  const [turnos, setTurnos] = useState<TurnoArchivado[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/profesionales')
      .then(({ data }) => setProfesionales(data))
      .catch(() => setProfesionales([]))
  }, [])

  useEffect(() => {
    setCargando(true)
    setError('')

    api
      .get('/turnos/archivados', {
        params: {
          ...(fecha ? { fecha } : {}),
          ...(profesionalFiltro ? { profesionalId: profesionalFiltro } : {}),
        },
      })
      .then(({ data }) => setTurnos(data))
      .catch(() => setError('No se pudieron cargar los turnos archivados'))
      .finally(() => setCargando(false))
  }, [fecha, profesionalFiltro])

  return (
    <Layout titulo="Turnos Archivados">
      <button
        onClick={() => navigate('/turnos')}
        className="text-sm text-text-muted hover:text-primary transition-colors mb-4"
      >
        ← Volver a Turnos
      </button>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-text mb-2">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-text mb-2">Profesional</label>
          <select
            value={profesionalFiltro}
            onChange={(e) => setProfesionalFiltro(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white min-w-[200px]"
          >
            <option value="">Todos</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </select>
        </div>

        {(fecha || profesionalFiltro) && (
          <button
            onClick={() => {
              setFecha('')
              setProfesionalFiltro('')
            }}
            className="text-sm text-text-muted hover:text-primary font-medium transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-5 py-3 font-medium">Hora</th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Teléfono</th>
              <th className="px-5 py-3 font-medium">Profesional</th>
              <th className="px-5 py-3 font-medium">Servicios</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-text-muted">
                  Cargando...
                </td>
              </tr>
            ) : turnos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-text-muted">
                  No hay turnos archivados
                </td>
              </tr>
            ) : (
              turnos.map((turno, i) => (
                <tr
                  key={turno.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}
                >
                  <td className="px-5 py-3 text-text-muted tabular-nums">{formatoFecha(turno.fecha)}</td>
                  <td className="px-5 py-3 text-text font-semibold tabular-nums">{turno.hora}</td>
                  <td className="px-5 py-3 text-text font-medium">
                    {turno.cliente.nombre} {turno.cliente.apellido}
                  </td>
                  <td className="px-5 py-3 text-text-muted">{turno.cliente.telefono ?? '—'}</td>
                  <td className="px-5 py-3 text-text">
                    {turno.profesional.nombre} {turno.profesional.apellido}
                  </td>
                  <td className="px-5 py-3 text-text-muted">{turno.servicios}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
