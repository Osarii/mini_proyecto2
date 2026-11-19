const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
require('dotenv').config({ path: path.resolve(projectRoot, '.env') });
const configuredPoliciesDir = process.env.DRIVE_POLICIES_DIR || './politicas_drive';
const drivePoliciesDir = path.isAbsolute(configuredPoliciesDir)
  ? configuredPoliciesDir
  : path.resolve(projectRoot, configuredPoliciesDir);

const configuredDbPath = process.env.DB_PATH || './backend/rrhh_portal.db';
const dbPath = path.isAbsolute(configuredDbPath)
  ? configuredDbPath
  : path.resolve(projectRoot, configuredDbPath);

module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),
  // DeepSeek configuration (OpenAI-compatible API)
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  // OpenAI configuration
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  // Gemini configuration
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  // Active provider: 'deepseek', 'openai' or 'gemini'
  llmProvider: process.env.LLM_PROVIDER || (process.env.DEEPSEEK_API_KEY ? 'deepseek' : (process.env.OPENAI_API_KEY ? 'openai' : 'gemini')),
  dbPath,
  drivePoliciesDir,
  googleServiceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '',
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.35'),
  cronSchedule: process.env.REPORT_CRON_SCHEDULE || '0 7 * * *', // Daily at 7:00 AM
};
