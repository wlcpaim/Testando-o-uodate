import { supabase, Appointment, Service, Professional } from '../lib/supabase';
import { sendTelegramNotification } from '../lib/telegram';

export async function getAvailableSlots(date: string, serviceId: string, professionalId: string): Promise<string[]> {
  // Buscar duração do serviço
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single();

  if (!service) return [];

  const duration = service.duration_minutes + (service.buffer_minutes || 0);
  
  // Horários padrão de funcionamento das 09:00 às 19:00
  const slots: string[] = [];
  let currentHour = 9;
  let currentMinute = 0;

  while (currentHour < 19 || (currentHour === 19 && currentMinute === 0)) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    slots.push(timeStr);

    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour += 1;
    }
  }

  // Buscar agendamentos existentes no dia para o profissional
  const { data: existingAppts } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('professional_id', professionalId)
    .eq('date', date)
    .neq('status', 'cancelled');

  if (!existingAppts || existingAppts.length === 0) {
    return slots;
  }

  // Filtrar horários ocupados
  return slots.filter(slot => {
    const [sHour, sMin] = slot.split(':').map(Number);
    const slotStartMins = sHour * 60 + sMin;
    const slotEndMins = slotStartMins + duration;

    for (const appt of existingAppts) {
      const [aStartH, aStartM] = appt.start_time.split(':').map(Number);
      const [aEndH, aEndM] = appt.end_time.split(':').map(Number);
      const apptStartMins = aStartH * 60 + aStartM;
      const apptEndMins = aEndH * 60 + aEndM;

      if (slotStartMins < apptEndMins && slotEndMins > apptStartMins) {
        return false;
      }
    }
    return true;
  });
}

export async function createAppointment(data: Omit<Appointment, 'id' | 'status'>): Promise<Appointment> {
  // Calcular end_time
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', data.service_id)
    .single();

  const duration = service ? service.duration_minutes : 30;
  const [hour, min] = data.start_time.split(':').map(Number);
  const endTotalMins = hour * 60 + min + duration;
  const endHour = Math.floor(endTotalMins / 60);
  const endMin = endTotalMins % 60;
  const end_time = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

  const newAppt = {
    ...data,
    end_time,
    status: 'confirmed'
  };

  const { data: inserted, error } = await supabase
    .from('appointments')
    .insert([newAppt])
    .select()
    .single();

  if (error) throw error;

  // Notificação Telegram
  await sendTelegramNotification(
    `🚨 <b>Novo Agendamento ${data.origin === 'walk_in' ? 'Presencial (Walk-in)' : 'Online'}</b>\n\
👤 Cliente: ${data.client_name} (${data.client_phone})\n\
📅 Data: ${data.date} às ${data.start_time}\n\
💰 Valor: R$ ${data.total_price.toFixed(2)}`
  );

  return inserted;
}

export async function startAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'in_progress' })
    .eq('id', id);

  if (error) throw error;
  await sendTelegramNotification(`⏱️ <b>Atendimento Iniciado!</b>\nAgendamento ID: ${id}`);
}

export async function finishAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', id);

  if (error) throw error;
  await sendTelegramNotification(`✅ <b>Atendimento Finalizado com Sucesso!</b>\nAgendamento ID: ${id}`);
}