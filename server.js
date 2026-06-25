import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { 
  parseSlackZip, 
  syncFromSlackAPI, 
  loadChannelsCache, 
  loadUsersCache, 
  loadMessagesCache 
} from './slack_parser.js';
import { 
  summarizeConversation, 
  chatWithConversationContext 
} from './summary_engine.js';
import { generateMockData } from './mock_data.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sinh dữ liệu mẫu khi khởi chạy nếu cache chưa có gì
generateMockData();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for zip uploads
const upload = multer({ dest: './data/uploads/' });

// Ensure uploads folder exists
if (!fs.existsSync('./data/uploads/')) {
  fs.mkdirSync('./data/uploads/', { recursive: true });
}

// -------------------------------------------------------------
// CONFIG API
// -------------------------------------------------------------

// Get configuration status (sensitive values are hidden)
app.get('/api/config', (req, res) => {
  res.json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasSlackToken: !!process.env.SLACK_TOKEN,
    geminiKeyPreview: process.env.GEMINI_API_KEY ? `***${process.env.GEMINI_API_KEY.slice(-4)}` : '',
    slackTokenPreview: process.env.SLACK_TOKEN ? `***${process.env.SLACK_TOKEN.slice(-4)}` : ''
  });
});

// Update configuration
app.post('/api/config', (req, res) => {
  const { geminiApiKey, slackToken } = req.body;
  
  try {
    let envContent = '';
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    }

    const config = {};
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts[0]) {
        config[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });

    if (geminiApiKey !== undefined) config['GEMINI_API_KEY'] = geminiApiKey;
    if (slackToken !== undefined) config['SLACK_TOKEN'] = slackToken;

    const newEnvContent = Object.entries(config)
      .map(([key, val]) => `${key}=${val}`)
      .join('\n');

    fs.writeFileSync('.env', newEnvContent, 'utf8');
    
    // Reload process.env
    if (geminiApiKey !== undefined) process.env.GEMINI_API_KEY = geminiApiKey;
    if (slackToken !== undefined) process.env.SLACK_TOKEN = slackToken;

    res.json({ success: true, message: 'Cấu hình đã được lưu thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -------------------------------------------------------------
// CHANNELS & MESSAGES API
// -------------------------------------------------------------

// Get all channels
app.get('/api/channels', (req, res) => {
  try {
    const channels = loadChannelsCache();
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a channel (optionally filtered by date)
app.get('/api/channels/:channelId/messages', (req, res) => {
  const { channelId } = req.params;
  const { startDate, endDate } = req.query;
  
  try {
    let messages = loadMessagesCache(channelId);
    
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      messages = messages.filter(m => new Date(m.datetime).getTime() >= startMs);
    }
    
    if (endDate) {
      // Add one day to end date to include it fully
      const endMs = new Date(endDate).getTime() + 86400000;
      messages = messages.filter(m => new Date(m.datetime).getTime() <= endMs);
    }
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// AI SUMMARIZER & CHAT API
// -------------------------------------------------------------

// Generate AI summary for channel messages
app.post('/api/channels/:channelId/summarize', async (req, res) => {
  const { channelId } = req.params;
  const { startDate, endDate, forceRefresh } = req.body;
  const cacheKey = `summary_${channelId}_${startDate || 'all'}_${endDate || 'all'}.json`;
  const summaryCachePath = path.join('./data/cache', cacheKey);

  try {
    // 1. Check local cache first if not forcing refresh
    if (!forceRefresh && fs.existsSync(summaryCachePath)) {
      const cachedSummary = JSON.parse(fs.readFileSync(summaryCachePath, 'utf8'));
      return res.json(cachedSummary);
    }

    // 2. Fetch messages for calculation
    let messages = loadMessagesCache(channelId);
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      messages = messages.filter(m => new Date(m.datetime).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime() + 86400000;
      messages = messages.filter(m => new Date(m.datetime).getTime() <= endMs);
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: 'Không có cuộc trò chuyện nào trong khoảng thời gian này để tóm tắt.' });
    }

    // 3. Generate summary
    console.log(`Generating AI summary for channel ${channelId} (${messages.length} messages)`);
    const summary = await summarizeConversation(messages);

    // 4. Save to cache
    fs.writeFileSync(summaryCachePath, JSON.stringify(summary, null, 2), 'utf8');

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat Q&A with channel context
app.post('/api/channels/:channelId/chat', async (req, res) => {
  const { channelId } = req.params;
  const { message, chatHistory, startDate, endDate } = req.body;

  try {
    let messages = loadMessagesCache(channelId);
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      messages = messages.filter(m => new Date(m.datetime).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime() + 86400000;
      messages = messages.filter(m => new Date(m.datetime).getTime() <= endMs);
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: 'Không có ngữ cảnh tin nhắn nào để chat.' });
    }

    const answer = await chatWithConversationContext(messages, chatHistory || [], message);
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// DATA INGESTION API
// -------------------------------------------------------------

// Upload Slack export ZIP file
app.post('/api/upload-zip', upload.single('slackZip'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không tìm thấy file tải lên.' });
  }

  try {
    const result = await parseSlackZip(req.file.path);
    // Delete temp file after parsing
    fs.unlinkSync(req.file.path);
    res.json({ success: true, ...result });
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync data from Slack Web API
app.post('/api/sync', async (req, res) => {
  const token = process.env.SLACK_TOKEN;
  if (!token) {
    return res.status(400).json({ error: 'Chưa cấu hình SLACK_TOKEN trong file .env. Vui lòng nhập token tại trang cấu hình.' });
  }

  try {
    const result = await syncFromSlackAPI(token);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handle SPA route fallback (serve index.html for any other requests)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
