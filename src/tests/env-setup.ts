import dotenv from 'dotenv'
import path from 'path'

(process.env as any).NODE_ENV = process.env.NODE_ENV || 'test';
dotenv.config({
  path: path.resolve(process.cwd(), '.env.local')
})

console.log('ENV LOADED OK (NODE_ENV:', process.env.NODE_ENV, ')')
