import { supabaseAdmin } from "@/lib/server/supabaseServer";

export async function logConversation({
  phone,
  user_message,
  bot_response,
  intent,
}: {
  phone?: string;
  user_message: string;
  bot_response: string;
  intent?: string | null;
}) {
  try {
    if (!supabaseAdmin) return;

    await supabaseAdmin.from("conversations").insert({
      phone: phone || null,
      user_message,
      bot_response,
      intent: intent ?? null,
      created_at: new Date().toISOString(),
    });

  } catch (e) {
    console.warn("[logConversation] failed");
  }
}
