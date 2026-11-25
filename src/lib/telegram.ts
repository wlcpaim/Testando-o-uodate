import { supabase } from './supabase';

export async function sendTelegramNotification(message: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('telegram_configs')
      .select('*')
      .single();

    if (error || !data || !data.enabled || !data.bot_token) {
      console.log('Telegram desativado ou não configurado.');
      return false;
    }

    const token = data.bot_token;
    const chatId = data.channel_id || data.owner_chat_id;

    if (!chatId) return false;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    return result.ok;
  } catch (err) {
    console.error('Erro ao enviar notificação Telegram:', err);
    return false;
  }
}