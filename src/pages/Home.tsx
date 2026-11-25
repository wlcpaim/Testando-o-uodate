import React, { useState, useEffect } from 'react';
import { Scissors, Calendar, Clock, User, Phone, CheckCircle, ShieldCheck, Star, MapPin } from 'lucide-react';
import { supabase, Service, Professional } from '../lib/supabase';
import { getAvailableSlots, createAppointment } from '../services/agendaEngine';

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successAppt, setSuccessAppt] = useState<any>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffectമായി:
  if (selectedService && selectedProfessional && selectedDate) {
    loadSlots();
  }

  async function loadCatalog() {
    const { data: sData } = await supabase.from('services').select('*').eq('active', true);
    const { data: pData } = await supabase.from('professionals').select('*').eq('active', true);
    
    if (sData && sData.length > 0) {
      setServices(sData);
      setSelectedService(sData[0]);
    }
    if (pData && pData.length > 0) {
      setProfessionals(pData);
      setSelectedProfessional(pData[0]);
    }
  }

  async function loadSlots() {
    if (!selectedService || !selectedProfessional) return;
    setLoadingSlots(true);
    const available = await getAvailableSlots(selectedDate, selectedService.id, selectedProfessional.id);
    setSlots(available);
    setLoadingSlots(false);
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedService || !selectedProfessional || !selectedSlot || !clientName || !clientPhone) {
      alert('Por favor, preencha todos os campos e selecione um horário.');
      return;
    }

    setSubmitting(true);
    try {
      const appt = await createAppointment({
        service_id: selectedService.id,
        professional_id: selectedProfessional.id,
        client_name: clientName,
        client_phone: clientPhone,
        date: selectedDate,
        start_time: selectedSlot,
        end_time: '',
        origin: 'online',
        total_price: selectedService.price
      });
      setSuccessAppt(appt);
    } catch (err: any) {
      alert('Erro ao realizar agendamento: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f9fafb] flex flex-col">
      {/* Navbar */}
      <header className="border-b border-[#27272a] bg-[#141414]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-red-600 p-2 rounded-lg text-white">
              <Scissors className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight">SMART<span className="text-red-600">AGENDA</span></span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-[#9ca3af]">
            <MapPin className="w-4 h-4 text-red-600" />
            <span>Unidade Central</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 px-4 bg-gradient-to-b from-[#141414] to-[#0a0a0a] border-b border-[#27272a]">
        <div className="max-w-4xl mx-auto text-center">
          <span className="bg-red-600/10 text-red-500 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider border border-red-600/20">
            Agendamento Online 24h
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Estilo e Praticidade na <span className="text-red-600">Palma da Mão</span>
          </h1>
          <p className="mt-3 text-[#9ca3af] text-lg max-w-2xl mx-auto">
            Escolha seu serviço, profissional favorito e horário em poucos cliques. Sem burocracia nem cadastro de senha.
          </p>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {successAppt ? (
          <div className="bg-[#141414] border border-[#27272a] rounded-2xl p-8 text-center max-w-lg mx-auto shadow-2xl">
            <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-600/30">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2>
            <p className="text-[#9ca3af] mb-6">Tudo pronto. Enviamos os detalhes e a confirmação em tempo real.</p>
            
            <div className="bg-[#0a0a0a] p-4 rounded-xl text-left border border-[#27272a] space-y-2 mb-6">
              <div className="flex justify-between text-sm"><span className="text-[#9ca3af]">Cliente:</span> <span className="font-semibold">{successAppt.client_name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#9ca3af]">Data:</span> <span className="font-semibold">{successAppt.date}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#9ca3af]">Horário:</span> <span className="font-semibold text-red-500">{successAppt.start_time}</span></div>
            </div>

            <button
              onClick={() => { setSuccessAppt(null); setSelectedSlot(''); }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl transition-all"
            >
              Fazer Novo Agendamento
            </button>
          </div>
        ) : (
          <form onSubmit={handleBook} className="space-y-8">
            {/* Passo 1: Serviços */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                <span className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-sm">1</span>
                <span>Selecione o Serviço</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                      selectedService?.id === s.id
                        ? 'border-red-600 bg-red-600/10 shadow-lg shadow-red-600/10'
                        : 'border-[#27272a] bg-[#141414] hover:border-[#3f3f46]'
                    }`}
                  >
                    <div>
                      <h3 className="font-semibold text-base">{s.name}</h3>
                      <div className="flex items-center space-x-3 text-xs text-[#9ca3af] mt-1">
                        <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1" /> {s.duration_minutes} min</span>
                      </div>
                    </div>
                    <span className="font-bold text-red-500 text-lg">R$ {s.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Passo 2: Profissional */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                <span className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-sm">2</span>
                <span>Escolha o Profissional</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {professionals.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfessional(p)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all text-center ${
                      selectedProfessional?.id === p.id
                        ? 'border-red-600 bg-red-600/10 shadow-lg shadow-red-600/10'
                        : 'border-[#27272a] bg-[#141414] hover:border-[#3f3f46]'
                    }`}
                  >
                    <div className="w-14 h-14 bg-[#27272a] rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-red-500">
                      {p.name.charAt(0)}
                    </div>
                    <h3 className="font-semibold text-sm">{p.name}</h3>
                  </div>
                ))}
              </div>
            </div>

            {/* Passo 3: Data e Horário */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                <span className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-sm">3</span>
                <span>Data e Horário Disponível</span>
              </h2>
              <div className="bg-[#141414] border border-[#27272a] rounded-2xl p-6 space-y-6">
                <div>
                  <label className="block text-xs uppercase text-[#9ca3af] font-semibold mb-2">Data do Atendimento</label>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase text-[#9ca3af] font-semibold mb-2">Horários Livres (Tempo Real)</label>
                  {loadingSlots ? (
                    <div className="text-center py-6 text-[#9ca3af]">Buscando horários disponíveis...</div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-6 text-red-500 font-medium">Nenhum horário disponível nesta data.</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {slots.map(slot => (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                            selectedSlot === slot
                              ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/30'
                              : 'bg-[#0a0a0a] border-[#27272a] hover:border-red-600/50 text-[#f9fafb]'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Passo 4: Identificação */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center space-x-2">
                <span className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-sm">4</span>
                <span>Seus Dados</span>
              </h2>
              <div className="bg-[#141414] border border-[#27272a] rounded-2xl p-6 space-y-4">
                <div>
                  <label className="block text-xs uppercase text-[#9ca3af] font-semibold mb-2">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-[#9ca3af] font-semibold mb-2">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: (11) 98888-7777"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-red-600/20 transition-all text-lg"
            >
              {submitting ? 'Confirmando...' : 'Confirmar Agendamento Instantâneo'}
            </button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] bg-[#141414] py-8 px-4 text-center text-sm text-[#9ca3af] mt-16">
        <p>© {new Date().getFullYear()} SmartAgenda. Todos os direitos reservados.</p>
        <a href="#/admin/login" className="inline-block mt-3 text-xs text-[#52525b] hover:text-red-500 transition-colors">
          Área Restrita (Admin)
        </a>
      </footer>
    </div>
  );
}