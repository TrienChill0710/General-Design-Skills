import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const DATA_DIR = './data';
const CACHE_DIR = path.join(DATA_DIR, 'cache');
const EXTRACT_DIR = path.join(DATA_DIR, 'extracted');

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR);
  if (!fs.existsSync(EXTRACT_DIR)) fs.mkdirSync(EXTRACT_DIR, { recursive: true });
}

/**
 * Normalizes user data for UI display
 */
export function loadUsersCache() {
  ensureDirs();
  const filePath = path.join(CACHE_DIR, 'users.json');
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error('Error reading users cache:', e);
    }
  }
  return {};
}

/**
 * Normalizes channels data for UI display
 */
export function loadChannelsCache() {
  ensureDirs();
  const filePath = path.join(CACHE_DIR, 'channels.json');
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error('Error reading channels cache:', e);
    }
  }
  return [];
}

/**
 * Normalizes messages data for a specific channel
 */
export function loadMessagesCache(channelId) {
  ensureDirs();
  const filePath = path.join(CACHE_DIR, `messages_${channelId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error(`Error reading messages cache for channel ${channelId}:`, e);
    }
  }
  return [];
}

/**
 * Save data to cache
 */
function saveCache(filename, data) {
  ensureDirs();
  fs.writeFileSync(path.join(CACHE_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Parsers Slack Export ZIP
 */
export async function parseSlackZip(zipFilePath) {
  ensureDirs();
  console.log(`Parsing Slack Export ZIP: ${zipFilePath}`);

  // Clear previous extraction directory to avoid mixing exports
  if (fs.existsSync(EXTRACT_DIR)) {
    fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(EXTRACT_DIR, { recursive: true });

  // Extract ZIP
  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(EXTRACT_DIR, true);

  // Parse users.json
  let users = {};
  const usersPath = path.join(EXTRACT_DIR, 'users.json');
  if (fs.existsSync(usersPath)) {
    const rawUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    rawUsers.forEach(u => {
      users[u.id] = {
        id: u.id,
        name: u.name,
        real_name: u.real_name || u.profile?.real_name || u.name,
        display_name: u.profile?.display_name || u.real_name || u.name,
        avatar: u.profile?.image_72 || u.profile?.image_48 || null,
        is_bot: u.is_bot || false
      };
    });
  }
  saveCache('users.json', users);

  // Parse channels.json (or groups.json, mpims.json, dms.json if present)
  let channels = [];
  const channelsPath = path.join(EXTRACT_DIR, 'channels.json');
  if (fs.existsSync(channelsPath)) {
    const rawChannels = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));
    channels = rawChannels.map(c => ({
      id: c.id,
      name: c.name,
      creator: c.creator,
      topic: c.topic?.value || '',
      purpose: c.purpose?.value || '',
      member_count: c.members?.length || 0,
      is_private: c.is_private || false
    }));
  }
  saveCache('channels.json', channels);

  // Load message files from folders
  for (const channel of channels) {
    // Check folder by channel name or ID (Slack exports usually use channel name)
    let channelDir = path.join(EXTRACT_DIR, channel.name);
    if (!fs.existsSync(channelDir)) {
      // Fallback to checking by channel ID
      channelDir = path.join(EXTRACT_DIR, channel.id);
    }

    if (!fs.existsSync(channelDir)) {
      console.warn(`No directory found for channel: ${channel.name} (${channel.id})`);
      saveCache(`messages_${channel.id}.json`, []);
      continue;
    }

    const files = fs.readdirSync(channelDir).filter(f => f.endsWith('.json'));
    let rawMessages = [];
    files.forEach(file => {
      try {
        const fileContent = JSON.parse(fs.readFileSync(path.join(channelDir, file), 'utf8'));
        if (Array.isArray(fileContent)) {
          rawMessages.push(...fileContent);
        }
      } catch (err) {
        console.error(`Error reading message file ${file} in ${channel.name}:`, err);
      }
    });

    // Sort by timestamp
    rawMessages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

    // Normalize messages and link threads
    const normalizedMessages = processMessages(rawMessages, users);
    saveCache(`messages_${channel.id}.json`, normalizedMessages);
  }

  console.log('Slack Export ZIP parsing completed successfully!');
  return { channelsCount: channels.length, usersCount: Object.keys(users).length };
}

/**
 * Normalize and group messages (parent messages and their thread replies)
 */
function processMessages(messages, users) {
  const messageMap = {};
  const rootMessages = [];

  // Step 1: Normalize all messages
  const normalizedList = messages.map(msg => {
    // Resolve user details
    const userId = msg.user || msg.bot_id || 'unknown';
    const userDetail = users[userId] || {
      id: userId,
      name: msg.username || 'Unknown User',
      real_name: msg.username || 'Unknown User',
      display_name: msg.username || 'Unknown User',
      avatar: null,
      is_bot: !!msg.bot_id
    };

    // Format text - replace user mentions <@U12345> with display names
    let formattedText = msg.text || '';
    const mentionRegex = /<@([A-Z0-9]+)>/g;
    let match;
    while ((match = mentionRegex.exec(msg.text || '')) !== null) {
      const mentionedId = match[1];
      const mentionedUser = users[mentionedId];
      if (mentionedUser) {
        formattedText = formattedText.replace(`<@${mentionedId}>`, `@${mentionedUser.display_name}`);
      }
    }

    return {
      ts: msg.ts,
      thread_ts: msg.thread_ts,
      user: userDetail,
      text: formattedText,
      datetime: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      reactions: msg.reactions || [],
      attachments: msg.attachments || [],
      files: msg.files || [],
      replies: [] // will hold thread replies
    };
  });

  // Step 2: Separate threads
  normalizedList.forEach(msg => {
    messageMap[msg.ts] = msg;
  });

  normalizedList.forEach(msg => {
    // If it is a reply to another message (thread_ts exists and is different from ts)
    if (msg.thread_ts && msg.thread_ts !== msg.ts) {
      const parent = messageMap[msg.thread_ts];
      if (parent) {
        parent.replies.push(msg);
      } else {
        // Parent not found in this dataset (could be archived or split), treat as root
        rootMessages.push(msg);
      }
    } else {
      // It's a root message
      rootMessages.push(msg);
    }
  });

  // Sort root messages by ts
  rootMessages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
  // Sort replies within each root message by ts
  rootMessages.forEach(root => {
    if (root.replies.length > 0) {
      root.replies.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
    }
  });

  return rootMessages;
}

/**
 * Fetch data from Slack Web API
 */
export async function syncFromSlackAPI(token) {
  ensureDirs();
  console.log('Syncing data from Slack API...');

  const fetchSlack = async (method, params = {}) => {
    const urlParams = new URLSearchParams(params).toString();
    const url = `https://slack.com/api/${method}${urlParams ? '?' + urlParams : ''}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error (${method}): ${data.error}`);
    }
    return data;
  };

  // 1. Fetch Users
  console.log('Fetching users from Slack...');
  const usersData = await fetchSlack('users.list');
  const users = {};
  usersData.members.forEach(u => {
    users[u.id] = {
      id: u.id,
      name: u.name,
      real_name: u.real_name || u.profile?.real_name || u.name,
      display_name: u.profile?.display_name || u.real_name || u.name,
      avatar: u.profile?.image_72 || u.profile?.image_48 || null,
      is_bot: u.is_bot || false
    };
  });
  saveCache('users.json', users);

  // 2. Fetch Channels (public channels)
  console.log('Fetching channels from Slack...');
  const channelsData = await fetchSlack('conversations.list', { types: 'public_channel,private_channel' });
  const channels = channelsData.channels.map(c => ({
    id: c.id,
    name: c.name,
    creator: c.creator,
    topic: c.topic?.value || '',
    purpose: c.purpose?.value || '',
    member_count: c.num_members || 0,
    is_private: c.is_private || false
  }));
  saveCache('channels.json', channels);

  // 3. For each channel, fetch history (only for active channels to save API rate limits, e.g. limit to last 200 messages)
  // Let's fetch history for all found channels, capped at 200 messages each.
  for (const channel of channels) {
    try {
      console.log(`Fetching history for channel: ${channel.name} (${channel.id})...`);
      const historyData = await fetchSlack('conversations.history', {
        channel: channel.id,
        limit: 200
      });

      let rawMessages = historyData.messages || [];

      // We need to fetch replies for any message that has replies
      const messagesWithReplies = rawMessages.filter(msg => msg.reply_count > 0);
      const threadReplies = [];

      for (const parentMsg of messagesWithReplies) {
        try {
          console.log(`Fetching thread replies for message ${parentMsg.ts} in ${channel.name}...`);
          const repliesData = await fetchSlack('conversations.replies', {
            channel: channel.id,
            ts: parentMsg.ts
          });
          // repliesData.messages contains both the parent message (first) and replies
          if (repliesData.messages && repliesData.messages.length > 1) {
            threadReplies.push(...repliesData.messages.slice(1));
          }
        } catch (threadErr) {
          console.error(`Failed to fetch thread replies for ${parentMsg.ts}:`, threadErr.message);
        }
      }

      // Merge and sort
      const allMessages = [...rawMessages, ...threadReplies];
      allMessages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

      const normalizedMessages = processMessages(allMessages, users);
      saveCache(`messages_${channel.id}.json`, normalizedMessages);
    } catch (chanErr) {
      console.error(`Failed to fetch history for channel ${channel.name}:`, chanErr.message);
      saveCache(`messages_${channel.id}.json`, []);
    }
  }

  console.log('Slack API synchronization completed successfully!');
  return { channelsCount: channels.length, usersCount: Object.keys(users).length };
}
