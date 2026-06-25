import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Runtime user info cache to avoid rate limit
const userCache = {};
const USER_CACHE_FILE = path.join(__dirname, 'data', 'cache', 'users.json');

// Load user cache from files if available
function loadUserCache() {
  if (fs.existsSync(USER_CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(USER_CACHE_FILE, 'utf8'));
      Object.assign(userCache, cached);
    } catch (e) {
      // ignore
    }
  }
}

// Save user cache back to file
function saveUserCache() {
  const cacheDir = path.dirname(USER_CACHE_FILE);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  fs.writeFileSync(USER_CACHE_FILE, JSON.stringify(userCache, null, 2), 'utf8');
}

/**
 * Parses a Slack thread URL to extract Channel ID and Thread Timestamp (thread_ts)
 */
function parseSlackUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    if (pathParts[0] !== 'archives' || pathParts.length < 3) {
      throw new Error('Định dạng URL Slack phải chứa /archives/CHANNEL_ID/pTIMESTAMP');
    }
    
    const channelId = pathParts[1];
    const pTs = pathParts[2];
    
    // Check for thread_ts parameter
    let threadTs = url.searchParams.get('thread_ts');
    
    if (!threadTs) {
      // Fallback: Parse timestamp from p1234567890123456 -> 1234567890.123456
      if (pTs.startsWith('p')) {
        const rawTs = pTs.substring(1);
        if (rawTs.length === 16) {
          threadTs = rawTs.substring(0, 10) + '.' + rawTs.substring(10);
        } else {
          threadTs = (parseFloat(rawTs) / 1000000).toString();
        }
      } else {
        threadTs = pTs;
      }
    }
    
    return { channelId, threadTs };
  } catch (err) {
    throw new Error(`Không thể parse URL Slack: ${err.message}`);
  }
}

/**
 * Resolves Slack User ID to Display Name
 */
async function resolveUser(userId, token) {
  if (userCache[userId]) return userCache[userId];
  
  if (!token) {
    return { id: userId, display_name: userId, real_name: userId };
  }
  
  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.ok && data.user) {
      const u = data.user;
      userCache[userId] = {
        id: userId,
        name: u.name,
        real_name: u.real_name || u.profile?.real_name || u.name,
        display_name: u.profile?.display_name || u.real_name || u.name,
        is_bot: u.is_bot || false
      };
      saveUserCache();
      return userCache[userId];
    }
  } catch (e) {
    // console.error(`Failed to resolve user ${userId}:`, e.message);
  }
  
  return { id: userId, display_name: userId, real_name: userId };
}

/**
 * Fetch thread replies from Slack API
 */
async function fetchThreadReplies(channelId, threadTs, token) {
  const params = new URLSearchParams({
    channel: channelId,
    ts: threadTs,
    limit: '100' // Get up to 100 replies in thread
  }).toString();
  
  const res = await fetch(`https://slack.com/api/conversations.replies?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
  
  return data.messages || [];
}

// ==========================================================================
// MAIN RUNNER
// ==========================================================================
async function main() {
  const args = process.argv.slice(2);
  const threadUrl = args[0];
  
  if (!threadUrl) {
    console.error('Lỗi: Vui lòng cung cấp link URL của Slack thread làm đối số.');
    console.error('Ví dụ: node fetch_thread.js "https://workspace.slack.com/archives/C12345/p1623748200000200"');
    process.exit(1);
  }
  
  const token = process.env.SLACK_TOKEN;
  if (!token) {
    console.error('Lỗi: Chưa cấu hình SLACK_TOKEN trong file .env hoặc môi trường.');
    process.exit(1);
  }
  
  try {
    loadUserCache();
    
    // 1. Parse Slack URL
    const { channelId, threadTs } = parseSlackUrl(threadUrl);
    
    // 2. Fetch Thread Messages
    const rawMessages = await fetchThreadReplies(channelId, threadTs, token);
    
    if (rawMessages.length === 0) {
      console.log('Không tìm thấy tin nhắn nào trong thread này.');
      return;
    }
    
    // 3. Resolve Display Names for Users
    const resolvedMessages = [];
    for (const msg of rawMessages) {
      const userId = msg.user || msg.bot_id || 'unknown';
      const user = await resolveUser(userId, token);
      
      resolvedMessages.push({
        ts: msg.ts,
        userId: userId,
        username: user.display_name,
        text: msg.text || '',
        datetime: new Date(parseFloat(msg.ts) * 1000).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      });
    }
    
    // 4. Output Formatted Transcript
    console.log('=== SLACK THREAD TRANSCRIPT ===');
    console.log(`Channel ID: ${channelId}`);
    console.log(`Thread TS: ${threadTs}`);
    console.log(`Total Messages: ${resolvedMessages.length}`);
    console.log('--------------------------------------------------------------------------------');
    
    resolvedMessages.forEach((msg, idx) => {
      // Replace mentions <@U12345> with display name in text
      let formattedText = msg.text;
      const mentionRegex = /<@([A-Z0-9]+)>/g;
      let match;
      // Note: we can't do async replaces easily, but we've already cached all users in this thread
      // For external users not in thread, we display ID or fetch if needed
      
      if (idx === 0) {
        // Parent message
        console.log(`[Parent] [${msg.datetime}] ${msg.username} (${msg.userId}):`);
        console.log(`> ${formattedText}`);
        console.log('--------------------------------------------------------------------------------');
      } else {
        // Reply
        console.log(`  ↳ [Reply] [${msg.datetime}] ${msg.username} (${msg.userId}):`);
        console.log(`    ${formattedText}`);
      }
    });
    console.log('=== END TRANSCRIPT ===');
    
  } catch (error) {
    console.error('Lỗi thực thi:', error.message);
    process.exit(1);
  }
}

main();
