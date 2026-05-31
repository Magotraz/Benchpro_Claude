import { supabase } from './supabase'

/**
 * Write an audit log entry.
 * Fire-and-forget — never throws.
 */
export async function logAudit({
  userId,
  userName,
  action,
  entityType,
  entityId,
  entityName,
  oldValue,
  newValue,
}) {
  try {
    await supabase.from('audit_log').insert({
      user_id:     userId,
      user_name:   userName,
      action,
      entity_type: entityType,
      entity_id:   entityId ?? null,
      entity_name: entityName ?? null,
      old_value:   oldValue ?? null,
      new_value:   newValue ?? null,
    })
  } catch (_) {
    // Silently ignore — audit failure should never break the app
  }
}
