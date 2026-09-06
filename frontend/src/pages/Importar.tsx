import { useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'
import Layout from '../components/Layout'
import api from '../api/axios'

type Fila = Record<string, string>

interface ResultadoImport {
  total: number
  creados: number
  omitidos: number
  detalleOmitidos: { fila: number; motivo: string }[]
}

interface SeccionConfig {
  titulo: string
  columnas: string[]
  ejemplo: string[]
  nombreArchivo: string
  endpoint: string
  mapear: (fila: Fila) => Record<string, string>
  etiquetaRegistro: string
}

const SECCIONES: Record<'clientes' | 'trabajos', SeccionConfig> = {
  clientes: {
    titulo: 'Importar Clientes',
    columnas: ['nombre', 'apellido', 'telefono', 'email', 'tipo_cliente', 'recomendado_por'],
    ejemplo: ['Ana', 'Pérez', '1145678900', 'ana.perez@mail.com', 'RECOMENDADO', 'María López'],
    nombreArchivo: 'plantilla_clientes.csv',
    endpoint: '/clientes/importar',
    etiquetaRegistro: 'clientes',
    mapear: (f) => ({
      nombre: f.nombre ?? '',
      apellido: f.apellido ?? '',
      telefono: f.telefono ?? '',
      email: f.email ?? '',
      tipoCliente: f.tipo_cliente ?? '',
      recomendadoPor: f.recomendado_por ?? '',
    }),
  },
  trabajos: {
    titulo: 'Importar Trabajos',
    columnas: ['apellido_cliente', 'nombre_cliente', 'trabajo_realizado', 'estilista', 'fecha'],
    ejemplo: ['Pérez', 'Ana', 'Corte y color', 'Sofía', '2026-09-01'],
    nombreArchivo: 'plantilla_trabajos.csv',
    endpoint: '/ficha/importar',
    etiquetaRegistro: 'trabajos',
    mapear: (f) => ({
      apellidoCliente: f.apellido_cliente ?? '',
      nombreCliente: f.nombre_cliente ?? '',
      trabajoRealizado: f.trabajo_realizado ?? '',
      estilista: f.estilista ?? '',
      fecha: f.fecha ?? '',
    }),
  },
}

function descargarCSV(nombre: string, columnas: string[], ejemplo: string[]) {
  const escapar = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const csv = `${columnas.join(',')}\n${ejemplo.map(escapar).join(',')}\n`
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function Seccion({ config }: { config: SeccionConfig }) {
  const [filas, setFilas] = useState<Fila[]>([])
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [errorParse, setErrorParse] = useState('')
  const [importando, setImportando] = useState(false)
  const [errorImport, setErrorImport] = useState('')
  const [resultado, setResultado] = useState<ResultadoImport | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filasValidas = useMemo(
    () => filas.filter((f) => Object.values(f).some((v) => (v ?? '').trim() !== '')),
    [filas]
  )

  const procesarArchivo = (file: File) => {
    setErrorParse('')
    setErrorImport('')
    setResultado(null)
    setNombreArchivo(file.name)
    Papa.parse<Fila>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        if (res.errors.length > 0) {
          setErrorParse(`Error al leer el CSV: ${res.errors[0].message}`)
          setFilas([])
          return
        }
        setFilas(res.data)
      },
      error: () => {
        setErrorParse('No se pudo leer el archivo')
        setFilas([])
      },
    })
  }

  const handleImportar = async () => {
    setImportando(true)
    setErrorImport('')
    setResultado(null)
    try {
      const payload = filasValidas.map(config.mapear)
      const { data } = await api.post<ResultadoImport>(config.endpoint, payload)
      setResultado(data)
      setFilas([])
      setNombreArchivo('')
      if (inputRef.current) inputRef.current.value = ''
    } catch (err: any) {
      setErrorImport(err.response?.data?.error ?? 'Error al importar')
    } finally {
      setImportando(false)
    }
  }

  const preview = filasValidas.slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      {/* Plantilla */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <h3 className="font-semibold text-text mb-1">1. Descargá la plantilla</h3>
        <p className="text-sm text-text-muted mb-4">
          Columnas esperadas: <span className="font-mono text-xs">{config.columnas.join(', ')}</span>
        </p>
        <button
          onClick={() => descargarCSV(config.nombreArchivo, config.columnas, config.ejemplo)}
          className="border border-border text-text font-medium rounded-lg px-4 py-2 transition-colors hover:bg-surface"
        >
          ⬇ Descargar plantilla CSV
        </button>
      </div>

      {/* Subir archivo */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
        <h3 className="font-semibold text-text mb-4">2. Subí el archivo completo</h3>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setArrastrando(true)
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastrando(false)
            const file = e.dataTransfer.files?.[0]
            if (file) procesarArchivo(file)
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            arrastrando ? 'border-primary bg-[#EDE9FE]' : 'border-border bg-surface'
          }`}
        >
          <span className="text-3xl">📄</span>
          <p className="text-sm text-text-muted">
            {nombreArchivo ? (
              <span className="text-text font-medium">{nombreArchivo}</span>
            ) : (
              'Arrastrá el CSV acá o'
            )}
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Elegir archivo
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) procesarArchivo(file)
            }}
          />
        </div>

        {errorParse && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
            {errorParse}
          </p>
        )}
      </div>

      {/* Preview */}
      {filasValidas.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h3 className="font-semibold text-text mb-4">
            3. Vista previa <span className="text-text-muted font-normal">(primeras 5 de {filasValidas.length})</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  {config.columnas.map((c) => (
                    <th key={c} className="px-3 py-2 font-medium whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((fila, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}>
                    {config.columnas.map((c) => (
                      <td key={c} className="px-3 py-2 text-text whitespace-nowrap">
                        {fila[c] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {errorImport && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
              {errorImport}
            </p>
          )}

          <button
            onClick={handleImportar}
            disabled={importando}
            className="mt-6 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg px-6 py-2.5 transition-colors disabled:opacity-60"
          >
            {importando ? 'Importando...' : `Importar ${filasValidas.length} ${config.etiquetaRegistro}`}
          </button>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <h3 className="font-semibold text-text mb-4">Resultado</h3>
          <div className="flex gap-6 text-sm mb-4">
            <span className="text-text-muted">
              Total: <span className="font-medium text-text">{resultado.total}</span>
            </span>
            <span className="text-green-700 font-medium">Creados: {resultado.creados}</span>
            <span className="text-amber-600 font-medium">Omitidos: {resultado.omitidos}</span>
          </div>
          {resultado.detalleOmitidos.length > 0 && (
            <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-y-auto">
              {resultado.detalleOmitidos.map((o) => (
                <p key={o.fila} className="px-3 py-2 text-sm text-text-muted">
                  Fila {o.fila}: {o.motivo}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Importar() {
  const [tab, setTab] = useState<'clientes' | 'trabajos'>('clientes')

  return (
    <Layout titulo="Importar Datos">
      <div className="flex gap-2 mb-6">
        {(['clientes', 'trabajos'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === k ? 'bg-primary text-white' : 'bg-surface text-text hover:bg-[#EDE9FE]'
            }`}
          >
            {SECCIONES[k].titulo}
          </button>
        ))}
      </div>

      <Seccion key={tab} config={SECCIONES[tab]} />
    </Layout>
  )
}
