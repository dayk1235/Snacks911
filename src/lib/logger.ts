import { getSupabaseAdmin } from "@/lib/db.server";

export async function logConversation({
  phone,
  user_message,
  bot_response,
  intent,
  tenant_id,
}: {
  phone?: string;
  user_message: string;
  bot_response: string;
  intent?: string | null;
  tenant_id?: string;
}) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    await supabaseAdmin.from("ai_logs").insert({
      phone: phone || null,
      user_message,
      bot_response,
      intent: intent ?? null,
      tenant_id: tenant_id || 'snacks911',
      created_at: new Date().toISOString(),
    });

  } catch (e) {
    console.warn("[logConversation] failed");
  }
}
