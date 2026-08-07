import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { authStore } from '../store/auth'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const { data } = await api.post('/auth/login', { email, password })
      authStore.setToken(data.token)
      authStore.setUser(data.usuario)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al iniciar sesión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-border py-10 px-8">
        <div className="flex flex-col items-center mb-8">
          <span className="text-4xl mb-2">✂</span>
          <h1 className="text-2xl font-bold text-primary">Glam ERP</h1>
          <p className="text-sm text-text-muted mt-1">
            Sistema de gestión para peluquerías
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex flex-col">
            <label htmlFor="email" className="text-sm font-medium text-text mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          <div className="flex flex-col mt-5">
            <label htmlFor="password" className="text-sm font-medium text-text mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="mt-8 w-2/3 mx-auto block bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
