import 'dotenv/config';
import { getSupabaseAdmin } from '@/lib/server/supabaseServer';
import { reviewConversations } from '../scripts/reviewConversations';

async function testLearning() {
  try {
    console.log('🧪 Starting AI Learning Test...');
    
    const supabase = getSupabaseAdmin();
    const conversationId = `test_conv_${Date.now()}`;
    console.log(`Inserting fake conversation: ${conversationId}`);
    
    const { error: insertError } = await supabase
      .from('conversations')
      .insert({
        id: conversationId,
        user_message: 'Hola, me gustaría pedir unos boneless BBQ, ¿tienen alguna promo?',
        bot_response: 'Hola, sí tenemos boneless BBQ. Cuestan $130.',
        created_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;

    console.log('Running reviewer...');
    await reviewConversations();

    const { data: suggestions, error: fetchError } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (fetchError) throw fetchError;

    console.log('✨ AI Suggestion generated:');
    console.log(JSON.stringify(suggestions, null, 2));

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testLearning();
