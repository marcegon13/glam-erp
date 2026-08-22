import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'

interface Profesional {
  id: number
  nombre: string
  apellido: string
}

interface AusenciaApi {
  id: number
  fecha: string
  motivo: string | null
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function hoyPartes() {
  const hoy = new Date()
  return { anio: hoy.getFullYear(), mes: hoy.getMonth(), dia: hoy.getDate() }
}

function fechaISO(anio: number, mes: number, dia: number) {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export default function Ausencias() {
  const navigate = useNavigate()
  const hoy = hoyPartes()

  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [profesionalId, setProfesionalId] = useState('')
  const [anio, setAnio] = useState(hoy.anio)
  const [mes, setMes] = useState(hoy.mes)

  const [ausencias, setAusencias] = useState<AusenciaApi[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    api
      .get('/profesionales')
      .then(({ data }) => {
        setProfesionales(data)
        if (data.length > 0) setProfesionalId(String(data[0].id))
      })
      .catch(() => setProfesionales([]))
  }, [])

  const fetchAusencias = async () => {
    if (!profesionalId) {
      setAusencias([])
      return
    }
    setCargando(true)
    setError('')
    try {
      const mesParam = `${anio}-${String(mes + 1).padStart(2, '0')}`
      const { data } = await api.get('/ausencias', { params: { profesionalId, mes: mesParam } })
      setAusencias(data)
    } catch {
      setError('No se pudieron cargar las ausencias')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchAusencias()
  }, [profesionalId, anio, mes])

  const ausenciasPorDia = useMemo(() => {
    const mapa = new Map<string, AusenciaApi>()
    ausencias.forEach((a) => mapa.set(a.fecha.slice(0, 10), a))
    return mapa
  }, [ausencias])

  const celdas = useMemo(() => {
    const primerDiaSemana = new Date(anio, mes, 1).getDay()
    const diasEnMes = new Date(anio, mes + 1, 0).getDate()
    const arr: (number | null)[] = []
    for (let i = 0; i < primerDiaSemana; i++) arr.push(null)
    for (let d = 1; d <= diasEnMes; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [anio, mes])

  const irMesAnterior = () => {
    if (mes === 0) {
      setMes(11)
      setAnio((a) => a - 1)
    } else {
      setMes((m) => m - 1)
    }
  }

  const irMesSiguiente = () => {
    if (mes === 11) {
      setMes(0)
      setAnio((a) => a + 1)
    } else {
      setMes((m) => m + 1)
    }
  }

  const handleToggleDia = async (dia: number) => {
    if (!profesionalId) return
    setError('')
    try {
      await api.post('/ausencias/toggle', {
        profesionalId: Number(profesionalId),
        fecha: fechaISO(anio, mes, dia),
        motivo: motivo || undefined,
      })
      await fetchAusencias()
    } catch {
      setError('No se pudo actualizar la ausencia')
    }
  }

  const handleEliminar = async (id: number) => {
    setError('')
    try {
      await api.delete(`/ausencias/${id}`)
      await fetchAusencias()
    } catch {
      setError('No se pudo eliminar la ausencia')
    }
  }

  const formatoFechaLista = (fecha: string) => fecha.slice(0, 10).split('-').reverse().join('/')

  return (
    <Layout titulo="Gestión de Ausencias">
      <button
        onClick={() => navigate('/turnos')}
        className="text-sm text-text-muted hover:text-primary transition-colors mb-4"
      >
        ← Volver a Turnos
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-text mb-2">Profesional</label>
          <select
            value={profesionalId}
            onChange={(e) => setProfesionalId(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white min-w-[220px]"
          >
            {profesionales.length === 0 && <option value="">Sin profesionales</option>}
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={irMesAnterior}
            className="border border-border rounded-lg px-3 py-2 text-text hover:bg-surface transition-colors"
          >
            ← Anterior
          </button>
          <p className="font-semibold text-text min-w-[160px] text-center">
            {MESES[mes]} {anio}
          </p>
          <button
            onClick={irMesSiguiente}
            className="border border-border rounded-lg px-3 py-2 text-text hover:bg-surface transition-colors"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-text-muted py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {celdas.map((dia, i) => {
                if (dia === null) return <div key={`vacio-${i}`} />

                const fecha = fechaISO(anio, mes, dia)
                const ausente = ausenciasPorDia.has(fecha)
                const esHoy = anio === hoy.anio && mes === hoy.mes && dia === hoy.dia

                return (
                  <button
                    key={fecha}
                    onClick={() => handleToggleDia(dia)}
                    disabled={!profesionalId || cargando}
                    className={`relative aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                      ausente
                        ? 'bg-[#EDE9FE] text-primary'
                        : 'text-text hover:bg-surface'
                    } ${esHoy ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  >
                    {dia}
                    {ausente && <span className="absolute top-0.5 right-1 text-red-500 text-xs">✕</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <label className="text-sm font-medium text-text mb-2 block">
              Motivo <span className="text-text-muted font-normal">(opcional)</span>
            </label>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Vacaciones, licencia médica..."
              className="w-full border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
            />
            <p className="text-xs text-text-muted mt-2">
              Se usa como motivo al marcar un nuevo día como ausente.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6 h-fit">
          <h3 className="font-semibold text-text mb-4">
            Ausencias de {MESES[mes]}
          </h3>

          {ausencias.length === 0 ? (
            <p className="text-sm text-text-muted">Sin ausencias registradas este mes</p>
          ) : (
            <div className="flex flex-col gap-2">
              {ausencias.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface"
                >
                  <div>
                    <p className="text-sm font-medium text-text">{formatoFechaLista(a.fecha)}</p>
                    <p className="text-xs text-text-muted">{a.motivo || 'Sin motivo'}</p>
                  </div>
                  <button
                    onClick={() => handleEliminar(a.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
