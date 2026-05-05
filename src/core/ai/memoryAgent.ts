import { getSupabaseAdmin, getCustomerProfileFromDB } from '@/lib/server/supabaseServer';

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

function normalizeInsight(text: string): string {
  return text
    .toLowerCase()
    .replace(/^la\s+|^el\s+|^los\s+|^las\s+/gi, '')
    .replace(/(soy|tengo|sufro de)/gi, '')
    .replace(/(alergia a|alergico a|alérgico a)/gi, '')
    .replace(/(no me gusta|no consumo)/gi, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();
}

function isValidRestriction(text: string): boolean {
  if (!text) return false;

  const invalidPatterns = [
    'no especificada',
    'desconocida',
    'ninguna',
    'no sé',
    'nada',
    'general',
  ];

  const clean = text.toLowerCase().trim();

  return !invalidPatterns.some(p => clean.includes(p));
}

export async function extractAndSaveInsights(phone: string, userMessage: string, botResponse: string) {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Fetch last 3 conversations for context
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('user_message, bot_response')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(3);

    if (convError) throw convError;

    const context = conversations
      ?.map(c => `User: ${c.user_message}\nBot: ${c.bot_response}`)
      .join('\n---\n');

    // 2. Build prompt for Gemini
    const prompt = `
      Analyze the following conversation history and the latest message to extract customer insights.
      
      History:
      ${context || 'No previous history.'}
      
      Latest:
      User: ${userMessage}
      Bot: ${botResponse}
      
      Extract the following information into a JSON object:
      - preferences: array of strings (e.g., ["prefiere picante", "le gustan los combos"])
      - restrictions: array of strings (e.g., ["alergia al maní", "no come cebolla"])
      - favorite_product: string or null
      - name: string or null (only if explicitly mentioned)
      
      If no new information is found for a field, return null or empty array.
      Return ONLY the JSON object.
    `;

    const insights = await callGemini(prompt);
    console.log('[memoryAgent] Gemini insights:', JSON.stringify(insights));

    if (!insights) return;

    // 3. Merge with existing profile
    const currentProfile = await getCustomerProfileFromDB(phone);
    const updateData: any = {};

    if (insights.preferences || currentProfile?.preferences) {
      updateData.preferences = Array.from(new Set([
        ...(currentProfile?.preferences || []).map(normalizeInsight),
        ...(insights.preferences || []).map(normalizeInsight)
      ]));
    }

    if (insights.restrictions && insights.restrictions.length > 0) {
      updateData.restrictions = Array.from(new Set([
        ...(currentProfile?.restrictions || []).map(normalizeInsight).filter(isValidRestriction),
        ...insights.restrictions.map(normalizeInsight).filter(isValidRestriction)
      ]));
    }

    if (insights.favorite_product) {
      updateData.favorite_product = insights.favorite_product;
    }

    if (insights.name) {
      updateData.name = insights.name;
    }

    if (Object.keys(updateData).length === 0) return;

    const { error: updateError } = await supabase
      .from('customers')
      .upsert({ phone_number: phone, ...updateData }, { onConflict: 'phone_number' });

    if (updateError) throw updateError;

  } catch (error) {
    console.error('[memoryAgent] Error extracting insights:', error);
  }
}
