-- SmartAgenda Database Schema

CREATE TABLE IF NOT EXISTS establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INT NOT NULL,
  buffer_minutes INT NOT NULL,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  service_id TEXT REFERENCES services(id),
  professional_id TEXT REFERENCES professionals(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'confirmed',
  origin TEXT CHECK (origin IN ('online', 'walk_in')) DEFAULT 'online',
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_configs (
  id INT PRIMARY KEY DEFAULT 1,
  bot_token TEXT,
  owner_chat_id TEXT,
  channel_id TEXT,
  enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);