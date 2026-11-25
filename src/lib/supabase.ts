import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  buffer_minutes: number;
  active: boolean;
};

export type Professional = {
  id: string;
  name: string;
  avatar_url?: string;
  active: boolean;
};

export type Appointment = {
  id: string;
  service_id: string;
  professional_id: string;
  client_name: string;
  client_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  origin: 'online' | 'walk_in';
  total_price: number;
};

export type TelegramConfig = {
  bot_token: string;
  owner_chat_id: string;
  channel_id: string;
  enabled: boolean;
};