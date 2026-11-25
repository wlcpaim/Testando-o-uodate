import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Users,
  Scissors,
  DollarSign,
  Settings,
  LogOut,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  TrendingUp,
  Shield,
  UserCheck,
  Menu,
  X
} from 'lucide-react';
import { supabase, Appointment, Service, Professional, TelegramConfig } from '../lib/supabase';
import { startAppointment, finishAppointment, createAppointment, getAvailableSlots } from '../services/agendaEngine';
import { sendTelegramNotification } from '../lib/telegram';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'agenda' | 'services' | 'professionals' | 'walkin' | 'financial' | 'telegram'>('agenda');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    bot_token: '',
    owner_chat_id: '',
    channel_id: '',
    enabled: false
  });
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Walk-in form state
  const [walkInClientName, setWalkInClientName] = useState('');
  const [walkInClientPhone, setWalkInClientPhone] = useState('');
  const [walkInServiceId, setWalkInServiceId] = useState('');
  const [walkInProfId, setWalkInProfId] = useState('');
  const [walkInTime, setWalkInTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Service modal state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');
  const [newServiceBuffer, setNewServiceBuffer] = useState('10');

  // Professional modal state
  const [newProfName, setNewProfName] = useState('');

  useEffect(() => {
    const adminAuth = localStorage.getItem('smart_agenda_admin');
    if (!adminAuth) {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    if (walkInServiceId && walkInProfId && selectedDate) {
      getAvailableSlots(selectedDate, walkInServiceId, walkInProfId).then(setAvailableSlots);
    }
  }, [walkInServiceId, walkInProfId, selectedDate]);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: servData } = await supabase.from('services').select('*').order('name');
      if (servData) setServices(servData);

      const { data: profData } = await supabase.from('professionals').select('*').order('name');
      if (profData) setProfessionals(profData);

      const { data: appData } = await supabase.from('appointments').select('*').order('start_time');
      if (appData) setAppointments(appData);

      const { data: tgData } = await supabase.from('telegram_config').select('*').single();
      if (tgData) setTelegramConfig(tgData);
    } catch (err: any) {
      console.error(err);
      // Fallback local
      const localApps = JSON.parse(localStorage.getItem('smart_agenda_appointments') || '[]');
      setAppointments(localApps);
      const localServ = JSON.parse(localStorage.getItem('smart_agenda_services') || '[]');
      setServices(localServ);
      const localProf = JSON.parse(localStorage.getItem('smart_agenda_professionals') || '[]');
      setProfessionals(localProf);
      const localTg = JSON.parse(localStorage.getItem('smart_agenda_telegram') || '{"bot_token":"","owner_chat_id":"","channel_id":"","enabled":false}');
      setTelegramConfig(localTg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('smart_agenda_admin');
    navigate('/admin/login');
  };

  const handleStart = async (id: string) => {
    try {
      await startAppointment(id);
      setSuccessMsg('Atendimento iniciado com sucesso!');
      loadData();
      const app = appointments.find(a => a.id === id);
      if (app) {
        sendTelegramNotification(telegramConfig, `▶️ *Atendimento Iniciado*\nCliente: ${app.client_name}\nOrigem: ${app.origin.toUpperCase()}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleFinish = async (id: string) => {
    try {
      await finishAppointment(id);
      setSuccessMsg('Atendimento finalizado com sucesso!');
      loadData();
      const app = appointments.find(a => a.id === id);
      if (app) {
        sendTelegramNotification(telegramConfig, `✅ *Atendimento Finalizado*\nCliente: ${app.client_name}\nValor: R$ ${app.total_price.toFixed(2)}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;
    try {
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
      const apps = JSON.parse(localStorage.getItem('smart_agenda_appointments') || '[]');
      const updated = apps.map((a: any) => a.id === id ? { ...a, status: 'cancelled' } : a);
      localStorage.setItem('smart_agenda_appointments', JSON.stringify(updated));
      setSuccessMsg('Agendamento cancelado.');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInClientName || !walkInServiceId || !walkInProfId || !walkInTime) {
      setErrorMsg('Preencha todos os campos do atendimento presencial.');
      return;
    }

    const serv = services.find(s => s.id === walkInServiceId);
    if (!serv) return;

    try {
      await createAppointment({
        service_id: walkInServiceId,
        professional_id: walkInProfId,
        client_name: walkInClientName,
        client_phone: walkInClientPhone || '(00) 00000-0000',
        date: selectedDate,
        start_time: walkInTime,
        end_time: '',
        origin: 'walk_in',
        total_price: serv.price
      });

      setSuccessMsg('Atendimento presencial cadastrado com sucesso!');
      setWalkInClientName('');
      setWalkInClientPhone('');
      setActiveTab('agenda');
      loadData();
      sendTelegramNotification(telegramConfig, `👤 *Novo Cliente Presencial (Walk-in)*\nCliente: ${walkInClientName}\nServiço: ${serv.name}\nHora: ${walkInTime}`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleQuickCut = () => {
    if (services.length === 0 || professionals.length === 0) {
      setErrorMsg('Cadastre ao menos um serviço e um profissional primeiro.');
      return;
    }
    setWalkInServiceId(services[0].id);
    setWalkInProfId(professionals[0].id);
    setWalkInClientName('Cliente Presencial Rápido');
    setWalkInClientPhone('(11) 99999-9999');
    setActiveTab('walkin');
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServicePrice) return;
    const newServ = {
      id: 'srv_' + Date.now(),
      name: newServiceName,
      price: parseFloat(newServicePrice),
      duration_minutes: parseInt(newServiceDuration) || 30,
      buffer_minutes: parseInt(newServiceBuffer) || 10,
      active: true
    };
    const updated = [...services, newServ];
    setServices(updated);
    localStorage.setItem('smart_agenda_services', JSON.stringify(updated));
    setNewServiceName('');
    setNewServicePrice('');
    setSuccessMsg('Serviço adicionado com sucesso!');
  };

  const handleAddProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfName) return;
    const newProf = {
      id: 'prof_' + Date.now(),
      name: newProfName,
      active: true
    };
    const updated = [...professionals, newProf];
    setProfessionals(updated);
    localStorage.setItem('smart_agenda_professionals', JSON.stringify(updated));
    setNewProfName('');
    setSuccessMsg('Profissional cadastrado com sucesso!');
  };

  const handleSaveTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('smart_agenda_telegram', JSON.stringify(telegramConfig));
    setSuccessMsg('Configurações do Telegram salvas com sucesso!');
  };

  const handleTestTelegram = async () => {
    const res = await sendTelegramNotification(telegramConfig, '🧪 *Teste de Conexão SmartAgenda*\nIntegração Telegram funcionando perfeitamente!');
    if (res) {
      setSuccessMsg('Mensagem de teste enviada com sucesso no Telegram!');
    } else {
      setErrorMsg('Falha ao enviar mensagem. Verifique o Token e o Chat ID.');
    }
  };

  // Calculations
  const filteredAppointments = appointments.filter(a => a.date === selectedDate && a.status !== 'cancelled');
  const completedAppointments = appointments.filter(a => a.status === 'completed');
  const totalRevenue = completedAppointments.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f9fafb] flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#141414] border-r border-[#27272a] p-6 justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-red-600 p-2 rounded-xl text-white shadow-lg shadow-red-600/30">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wider">SMARTAGENDA</h1>
              <p className="text-xs text-zinc-400">Painel Administrativo</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('agenda')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'agenda' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
            >
              <CalendarIcon className="w-5 h-5" /> Agenda
            </button>
            <button
              onClick={() => setActiveTab('walkin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'walkin' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
            >
              <UserCheck className="w-5 h-5" /> Atendimento Presencial
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'services' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
            >
              <Scissors className="w-5 h-5" /> Serviços
            </button>
            <button
              onClick={() => setActiveTab('professionals')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'professionals' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
            >
              <Users className="w-5 h-5" /> Profissionais
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'financial' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
            >
              <DollarSign className="w-5 h-5" /> Financeiro
            </button>
            <button
              onClick={() => setActiveTab('telegram')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${activeTab === 'telegram' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}
            >
              <Send className="w-5 h-5" /> Telegram Bot
            </button>
          </nav>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleQuickCut}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition"
          >
            <Zap className="w-5 h-5" /> Corte Rápido
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-zinc-400 hover:text-red-500 hover:bg-zinc-900 transition"
          >
            <LogOut className="w-5 h-5" /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-20 bg-[#141414] border-b border-[#27272a] px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h2 className="text-xl font-bold capitalize">
              {activeTab === 'agenda' && 'Agenda Diária'}
              {activeTab === 'walkin' && 'Novo Atendimento Presencial'}
              {activeTab === 'services' && 'Gestão de Serviços'}
              {activeTab === 'professionals' && 'Equipe de Profissionais'}
              {activeTab === 'financial' && 'Relatório Financeiro'}
              {activeTab === 'telegram' && 'Integração Telegram'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'agenda' && (
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-2 text-sm text-white focus:border-red-600 focus:outline-none"
              />
            )}
            <button
              onClick={handleQuickCut}
              className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-xl text-sm shadow-md shadow-red-600/20 transition hidden sm:flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Atendimento
            </button>
          </div>
        </header>

        {/* Mobile Sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex md:hidden">
            <div className="w-64 bg-[#141414] h-full p-6 flex flex-col justify-between border-r border-[#27272a]">
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="font-bold tracking-wider">SMARTAGENDA</h1>
                  <button onClick={() => setMobileMenuOpen(false)}><X className="w-6 h-6" /></button>
                </div>
                <nav className="space-y-2">
                  <button onClick={() => { setActiveTab('agenda'); setMobileMenuOpen(false); }} className="w-full text-left py-2 px-3 rounded text-zinc-300 hover:bg-zinc-900">Agenda</button>
                  <button onClick={() => { setActiveTab('walkin'); setMobileMenuOpen(false); }} className="w-full text-left py-2 px-3 rounded text-zinc-300 hover:bg-zinc-900">Atendimento Presencial</button>
                  <button onClick={() => { setActiveTab('services'); setMobileMenuOpen(false); }} className="w-full text-left py-2 px-3 rounded text-zinc-300 hover:bg-zinc-900">Serviços</button>
                  <button onClick={() => { setActiveTab('professionals'); setMobileMenuOpen(false); }} className="w-full text-left py-2 px-3 rounded text-zinc-300 hover:bg-zinc-900">Profissionais</button>
                  <button onClick={() => { setActiveTab('financial'); setMobileMenuOpen(false); }} className="w-full text-left py-2 px-3 rounded text-zinc-300 hover:bg-zinc-900">Financeiro</button>
                  <button onClick={() => { setActiveTab('telegram'); setMobileMenuOpen(false); }} className="w-full text-left py-2 px-3 rounded text-zinc-300 hover:bg-zinc-900">Telegram</button>
                </nav>
              </div>
              <button onClick={handleLogout} className="text-red-500 py-2 text-left">Sair</button>
            </div>
          </div>
        )}

        {/* Feedback Alerts */}
        <div className="p-6 pb-0">
          {errorMsg && (
            <div className="bg-red-950/50 border border-red-600 text-red-200 px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-950/50 border border-emerald-600 text-emerald-200 px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-zinc-500">
              <Clock className="w-6 h-6 animate-spin mr-2" /> Carregando dados...
            </div>
          ) : (
            <>
              {/* AGENDA TAB */}
              {activeTab === 'agenda' && (
                <div className="space-y-6">
                  {/* Quick Metrics Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#141414] border border-[#27272a] p-5 rounded-2xl">
                      <p className="text-xs text-zinc-400">Agendamentos do Dia</p>
                      <h3 className="text-2xl font-bold mt-1">{filteredAppointments.length}</h3>
                    </div>
                    <div className="bg-[#141414] border border-[#27272a] p-5 rounded-2xl">
                      <p className="text-xs text-zinc-400">Em Andamento</p>
                      <h3 className="text-2xl font-bold mt-1 text-amber-500">
                        {filteredAppointments.filter(a => a.status === 'in_progress').length}
                      </h3>
                    </div>
                    <div className="bg-[#141414] border border-[#27272a] p-5 rounded-2xl">
                      <p className="text-xs text-zinc-400">Faturamento do Dia</p>
                      <h3 className="text-2xl font-bold mt-1 text-emerald-500">
                        R$ {filteredAppointments.filter(a => a.status === 'completed').reduce((acc, c) => acc + c.total_price, 0).toFixed(2)}
                      </h3>
                    </div>
                  </div>

                  {/* Appointments List */}
                  <div className="bg-[#141414] border border-[#27272a] rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-[#27272a] flex justify-between items-center">
                      <h3 className="font-bold">Lista de Horários ({selectedDate})</h3>
                      <span className="text-xs text-zinc-400">Mesma agenda online e presencial</span>
                    </div>

                    {filteredAppointments.length === 0 ? (
                      <div className="p-12 text-center text-zinc-500">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Nenhum agendamento para esta data.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#27272a]">
                        {filteredAppointments.map(app => {
                          const serv = services.find(s => s.id === app.service_id);
                          const prof = professionals.find(p => p.id === app.professional_id);
                          return (
                            <div key={app.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-900/50 transition">
                              <div className="flex items-start gap-4">
                                <div className="bg-zinc-900 border border-[#27272a] px-3 py-2 rounded-xl text-center min-w-[76px]">
                                  <span className="block text-xs text-zinc-400">Início</span>
                                  <span className="font-bold text-red-500">{app.start_time}</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-white">{app.client_name}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                                      app.origin === 'online' ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-purple-950 text-purple-400 border border-purple-800'
                                    }`}>
                                      {app.origin}
                                    </span>
                                  </div>
                                  <p className="text-sm text-zinc-300 mt-0.5">
                                    {serv?.name || 'Serviço'} • <span className="text-zinc-400">Prof. {prof?.name || 'Geral'}</span>
                                  </p>
                                  <p className="text-xs text-zinc-500 mt-1">
                                    Tel: {app.client_phone} • R$ {app.total_price.toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 justify-end">
                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                  app.status === 'confirmed' ? 'bg-blue-950 text-blue-300' :
                                  app.status === 'in_progress' ? 'bg-amber-950 text-amber-300 animate-pulse' :
                                  app.status === 'completed' ? 'bg-emerald-950 text-emerald-300' :
                                  'bg-zinc-800 text-zinc-300'
                                }`}>
                                  {app.status === 'confirmed' && 'Confirmado'}
                                  {app.status === 'in_progress' && 'Em Andamento ⏱️'}
                                  {app.status === 'completed' && 'Finalizado'}
                                  {app.status === 'pending' && 'Pendente'}
                                </span>

                                {app.status === 'confirmed' && (
                                  <button
                                    onClick={() => handleStart(app.id)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                                    title="Iniciar Atendimento"
                                  >
                                    <Play className="w-4 h-4" /> Iniciar
                                  </button>
                                )}

                                {app.status === 'in_progress' && (
                                  <button
                                    onClick={() => handleFinish(app.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                                    title="Finalizar Atendimento"
                                  >
                                    <CheckCircle2 className="w-4 h-4" /> Finalizar
                                  </button>
                                )}

                                <button
                                  onClick={() => handleCancel(app.id)}
                                  className="bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 p-2 rounded-xl text-xs transition"
                                  title="Cancelar"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* WALK-IN TAB */}
              {activeTab === 'walkin' && (
                <div className="max-w-xl mx-auto bg-[#141414] border border-[#27272a] rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-4">Registrar Cliente Presencial</h3>
                  <form onSubmit={handleCreateWalkIn} className="space-y-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Nome do Cliente</label>
                      <input
                        type="text"
                        required
                        value={walkInClientName}
                        onChange={e => setWalkInClientName(e.target.value)}
                        placeholder="Ex: Carlos Silva"
                        className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:border-red-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={walkInClientPhone}
                        onChange={e => setWalkInClientPhone(e.target.value)}
                        placeholder="Ex: (11) 98888-7777"
                        className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:border-red-600 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Serviço</label>
                        <select
                          value={walkInServiceId}
                          onChange={e => setWalkInServiceId(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:border-red-600 focus:outline-none"
                        >
                          <option value="">Selecione...</option>
                          {services.map(s => (
                            <option key={s.id} value={s.id}>{s.name} (R$ {s.price})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Profissional</label>
                        <select
                          value={walkInProfId}
                          onChange={e => setWalkInProfId(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:border-red-600 focus:outline-none"
                        >
                          <option value="">Selecione...</option>
                          {professionals.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Horário Disponível</label>
                      <select
                        value={walkInTime}
                        onChange={e => setWalkInTime(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white focus:border-red-600 focus:outline-none"
                      >
                        <option value="">Selecione o horário...</option>
                        {availableSlots.map(slot => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-600/20 transition"
                    >
                      Confirmar Atendimento Presencial
                    </button>
                  </form>
                </div>
              )}

              {/* SERVICES TAB */}
              {activeTab === 'services' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-[#141414] border border-[#27272a] rounded-2xl p-6 h-fit">
                    <h3 className="text-lg font-bold mb-4">Adicionar Serviço</h3>
                    <form onSubmit={handleAddService} className="space-y-4">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Nome do Serviço</label>
                        <input
                          type="text"
                          required
                          value={newServiceName}
                          onChange={e => setNewServiceName(e.target.value)}
                          placeholder="Ex: Corte Degradê"
                          className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Preço (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={newServicePrice}
                          onChange={e => setNewServicePrice(e.target.value)}
                          placeholder="45.00"
                          className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Duração (min)</label>
                          <input
                            type="number"
                            value={newServiceDuration}
                            onChange={e => setNewServiceDuration(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-400 mb-1">Buffer (min)</label>
                          <input
                            type="number"
                            value={newServiceBuffer}
                            onChange={e => setNewServiceBuffer(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white"
                          />
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl">
                        Salvar Serviço
                      </button>
                    </form>
                  </div>

                  <div className="lg:col-span-2 bg-[#141414] border border-[#27272a] rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4">Serviços Cadastrados</h3>
                    <div className="space-y-3">
                      {services.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-4 bg-zinc-900 border border-[#27272a] rounded-xl">
                          <div>
                            <h4 className="font-bold">{s.name}</h4>
                            <p className="text-xs text-zinc-400">Duração: {s.duration_minutes} min • Intervalo: {s.buffer_minutes} min</p>
                          </div>
                          <span className="font-bold text-emerald-500">R$ {s.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PROFESSIONALS TAB */}
              {activeTab === 'professionals' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-[#141414] border border-[#27272a] rounded-2xl p-6 h-fit">
                    <h3 className="text-lg font-bold mb-4">Cadastrar Profissional</h3>
                    <form onSubmit={handleAddProfessional} className="space-y-4">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Nome do Profissional</label>
                        <input
                          type="text"
                          required
                          value={newProfName}
                          onChange={e => setNewProfName(e.target.value)}
                          placeholder="Ex: João Barbeiro"
                          className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white"
                        />
                      </div>
                      <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl">
                        Adicionar Profissional
                      </button>
                    </form>
                  </div>

                  <div className="lg:col-span-2 bg-[#141414] border border-[#27272a] rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4">Equipe</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {professionals.map(p => (
                        <div key={p.id} className="p-4 bg-zinc-900 border border-[#27272a] rounded-xl flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-bold text-white">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold">{p.name}</h4>
                            <span className="text-xs text-emerald-400">Ativo na Agenda</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* FINANCIAL TAB */}
              {activeTab === 'financial' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-[#141414] border border-[#27272a] p-6 rounded-2xl">
                      <p className="text-xs text-zinc-400">Faturamento Total Acumulado</p>
                      <h3 className="text-3xl font-bold mt-2 text-emerald-500">R$ {totalRevenue.toFixed(2)}</h3>
                    </div>
                    <div className="bg-[#141414] border border-[#27272a] p-6 rounded-2xl">
                      <p className="text-xs text-zinc-400">Total de Cortes Concluídos</p>
                      <h3 className="text-3xl font-bold mt-2">{completedAppointments.length}</h3>
                    </div>
                    <div className="bg-[#141414] border border-[#27272a] p-6 rounded-2xl">
                      <p className="text-xs text-zinc-400">Ticket Médio</p>
                      <h3 className="text-3xl font-bold mt-2 text-blue-400">
                        R$ {completedAppointments.length ? (totalRevenue / completedAppointments.length).toFixed(2) : '0.00'}
                      </h3>
                    </div>
                  </div>

                  <div className="bg-[#141414] border border-[#27272a] rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4">Histórico de Atendimentos Concluídos</h3>
                    <div className="divide-y divide-[#27272a]">
                      {completedAppointments.length === 0 ? (
                        <p className="text-zinc-500 py-6 text-center">Nenhum atendimento finalizado ainda.</p>
                      ) : (
                        completedAppointments.map(app => (
                          <div key={app.id} className="py-4 flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-white">{app.client_name}</h4>
                              <p className="text-xs text-zinc-400">Data: {app.date} • Horário: {app.start_time} • Origem: <span className="uppercase">{app.origin}</span></p>
                            </div>
                            <span className="font-bold text-emerald-500">+ R$ {app.total_price.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TELEGRAM TAB */}
              {activeTab === 'telegram' && (
                <div className="max-w-xl mx-auto bg-[#141414] border border-[#27272a] rounded-2xl p-6">
                  <h3 className="text-lg font-bold mb-2">Configuração da Integração Telegram</h3>
                  <p className="text-xs text-zinc-400 mb-6">Receba notificações em tempo real de agendamentos e caixa no seu Telegram.</p>

                  <form onSubmit={handleSaveTelegram} className="space-y-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Bot Token (Telegram BotFather)</label>
                      <input
                        type="password"
                        value={telegramConfig.bot_token}
                        onChange={e => setTelegramConfig({ ...telegramConfig, bot_token: e.target.value })}
                        placeholder="Ex: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                        className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Owner Chat ID (Proprietário)</label>
                      <input
                        type="text"
                        value={telegramConfig.owner_chat_id}
                        onChange={e => setTelegramConfig({ ...telegramConfig, owner_chat_id: e.target.value })}
                        placeholder="Ex: 987654321"
                        className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Channel ID (Canal de Notificações - Opcional)</label>
                      <input
                        type="text"
                        value={telegramConfig.channel_id}
                        onChange={e => setTelegramConfig({ ...telegramConfig, channel_id: e.target.value })}
                        placeholder="Ex: -100123456789"
                        className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="tgEnabled"
                        checked={telegramConfig.enabled}
                        onChange={e => setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })}
                        className="w-4 h-4 rounded accent-red-600"
                      />
                      <label htmlFor="tgEnabled" className="text-sm text-zinc-300">Ativar Notificações Automáticas</label>
                    </div>

                    <div className="flex gap-4 pt-2">
                      <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl">
                        Salvar Configurações
                      </button>
                      <button
                        type="button"
                        onClick={handleTestTelegram}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-xl"
                      >
                        Testar Conexão
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
