import dotenv from 'dotenv'
import path from 'path'

(process.env as any).NODE_ENV = process.env.NODE_ENV || 'test';
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
})

process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-key';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';

console.log('ENV LOADED OK (NODE_ENV:', process.env.NODE_ENV, ')')
