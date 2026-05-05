import { getSupabaseAdmin } from '@/lib/server/supabaseServer';

/**
 * Marks a conversation as converted into a successful order.
 * Inserts a record into the 'conversation_outcomes' table.
 */
export async function markConverted(conversationId: string, orderId: string) {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('conversation_outcomes')
      .insert({
        conversation_id: conversationId,
        order_id: orderId,
        converted_at: new Date().toISOString(),
        status: 'converted'
      });

    if (error) {
      console.error('[ConversionTracker] Error marking conversion:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error('[ConversionTracker] Unexpected error during conversion:', err);
    return { success: false, error: err };
  }
}
