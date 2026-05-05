import path from "path";
import dotenv from "dotenv";
import { createClient } from '@supabase/supabase-js';
import { getAIResponse } from '@/lib/whatsapp/aiService';
import { buildContextPayload } from '@/lib/whatsapp/aiService';
import { dbGetProductsServer } from '@/lib/dbServer';

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local")
});

console.log("ENV PATH:", path.resolve(process.cwd(), ".env.local"));

console.log("ENV VALUES:", {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY ? "OK" : "MISSING"
});

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env variables");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function reviewConversations() {
  try {
    console.log('🚀 Starting conversation review...');

    // 1. Fetch last 50 conversations
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('id,user_message,bot_response')
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) throw fetchError;
    if (!conversations || conversations.length === 0) {
      console.log('No conversations found to review.');
      return;
    }

    // 2. Skip those already converted
    // Check if conversation_id exists in conversation_outcomes
    const { data: outcomes, error: outcomeError } = await supabase
      .from('conversation_outcomes')
      .select('conversation_id');

    if (outcomeError) throw outcomeError;
    const convertedIds = new Set(outcomes?.map(o => o.conversation_id));

    const products = await dbGetProductsServer();
    const menuItems = products.map(p => ({
      name: p.name,
      price: p.price,
      category: p.category,
      description: p.description,
    }));

    let processedCount = 0;

    for (const conv of conversations) {
      if (convertedIds.has(conv.id)) continue;

      const context = buildContextPayload(
        menuItems,
        [], [], [], [],
        conv.user_message
      );

      // AI Prompt: Short and cost-efficient
      // We wrap the request to get a specifically improved version
      const aiResult = await getAIResponse({
        ...context,
        customer_message: `Review this interaction. Original bot response: "${conv.bot_response}". Provide a more empathetic and effective response to increase conversion. Keep it short.`
      });

      if (aiResult?.message_to_user) {
        await supabase.from('ai_suggestions').insert({
          conversation_id: conv.id,
          original_response: conv.bot_response,
          suggested_response: aiResult.message_to_user,
          status: 'pending'
        });
        processedCount++;
      }
    }

    console.log(`✅ Review complete. ${processedCount} suggestions generated.`);
  } catch (err) {
    console.error('❌ Review process failed:', err);
    process.exit(1);
  }
}

reviewConversations();
