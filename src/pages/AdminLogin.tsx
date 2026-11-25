import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldAlert } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    // Simulação segura de login administrativo
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('smart_admin_auth', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('Credenciais inválidas. Use admin / admin123');
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f9fafb] flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#27272a] rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-red-600/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-red-600/30">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <p className="text-sm text-[#9ca3af] mt-1">SmartAgenda Secure Auth</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-600/10 border border-red-600/30 text-red-400 p-3 rounded-xl text-sm flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase text-[#9ca3af] font-semibold mb-2">Usuário</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-[#9ca3af] font-semibold mb-2">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-600/20 mt-2"
          >
            Acessar Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}