import dotenv from 'dotenv';
import fs from 'fs';
import bot from './bot.js';

// Load environment variables
dotenv.config();

// Log to file
const logFile = 'bot-logs.txt';
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const message = args.join(' ');
  fs.appendFileSync(logFile, `[LOG] ${new Date().toISOString()} - ${message}\n`);
  originalLog(...args);
};

console.error = (...args) => {
  const message = args.join(' ');
  fs.appendFileSync(logFile, `[ERROR] ${new Date().toISOString()} - ${message}\n`);
  originalError(...args);
};

console.log('🚀 Starting Telegram Bot...');
console.log('📱 Bot Token:', process.env.BOT_TOKEN ? 'Configured' : 'Using default');
console.log('🌐 API URL:', process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:5001/api/v1');
console.log('📝 Logs are being saved to:', logFile);
console.log('');
console.log('✅ Bot is running and listening for messages...');
console.log('💡 Press Ctrl+C to stop');
