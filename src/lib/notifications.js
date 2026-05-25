import { supabase } from './supabase'

export async function createNotification(userId, type, title, body, link = null) {
  if (!userId) return
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, title, body, link })
  if (error) console.warn('[notification]', error.message)
}
