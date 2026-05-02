import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGemini() {
    try {
        console.log('Checking API Key existence...');
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            console.error('ERROR: GEMINI_API_KEY not found in process.env');
            return;
        }
        
        console.log('API Key found (masked):', apiKey.substring(0, 8) + '...');
        
        console.log('Importing aiService...');
        const { getAIResponse } = await import('../lib/whatsapp/aiService');

        console.log('Calling getAIResponse...');
        const context = {
          menu_items: [],
          modifiers: [],
          announcements_active: [],
          promos_active: [],
          cart_state: [],
          customer_message: 'System check'
        };
        const result = await getAIResponse(context);
        
        console.log('Gemini Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Gemini Test Error:', error);
        process.exit(1);
    }
}

testGemini();
