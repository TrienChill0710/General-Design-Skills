// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
const state = {
  channels: [],
  selectedChannelId: null,
  messages: [],
  config: null,
  chatHistory: []
};

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const DOM = {
  // Sidebar
  channelsList: document.getElementById('channels-list'),
  channelsCount: document.getElementById('channels-count'),
  channelSearch: document.getElementById('channel-search'),
  zipInput: document.getElementById('zip-input'),
  btnSyncApi: document.getElementById('btn-sync-api'),
  uploadStatus: document.getElementById('upload-status'),
  uploadBox: document.getElementById('upload-box'),
  
  // Views
  welcomeView: document.getElementById('welcome-view'),
  dashboardView: document.getElementById('dashboard-view'),
  
  // Header
  currentChannelName: document.getElementById('current-channel-name'),
  currentChannelPurpose: document.getElementById('current-channel-purpose'),
  filterStartDate: document.getElementById('filter-start-date'),
  filterEndDate: document.getElementById('filter-end-date'),
  btnGenerateSummary: document.getElementById('btn-generate-summary'),
  
  // Summary Section
  summaryLoader: document.getElementById('summary-loader'),
  summaryContent: document.getElementById('summary-content'),
  summaryPlaceholder: document.getElementById('summary-placeholder'),
  summaryRealContent: document.getElementById('summary-real-content'),
  summaryOverviewText: document.getElementById('summary-overview-text'),
  summaryActionList: document.getElementById('summary-action-list'),
  summaryDecisionList: document.getElementById('summary-decision-list'),
  summaryTopicsAccordion: document.getElementById('summary-topics-accordion'),
  
  // Interaction Pane
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  messagesList: document.getElementById('messages-list'),
  chatMessages: document.getElementById('chat-messages'),
  chatInput: document.getElementById('chat-input'),
  btnChatSend: document.getElementById('btn-chat-send'),
  
  // Config Modal
  configModal: document.getElementById('config-modal'),
  btnOpenConfig: document.getElementById('btn-open-config'),
  btnCloseConfig: document.getElementById('btn-close-config'),
  btnCancelConfig: document.getElementById('btn-cancel-config'),
  configForm: document.getElementById('config-form'),
  configGeminiKey: document.getElementById('config-gemini-key'),
  configSlackToken: document.getElementById('config-slack-token'),
  
  // Toasts
  toastContainer: document.getElementById('toast-container')
};

// ==========================================================================
// INITIALIZATION & CONFIG
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  registerEvents();
});

async function initApp() {
  await fetchConfig();
  await fetchChannels();
}

function registerEvents() {
  // Modal Events
  DOM.btnOpenConfig.addEventListener('click', openConfigModal);
  DOM.btnCloseConfig.addEventListener('click', closeConfigModal);
  DOM.btnCancelConfig.addEventListener('click', closeConfigModal);
  DOM.configForm.addEventListener('submit', saveConfig);
  
  // Search Channel
  DOM.channelSearch.addEventListener('input', filterChannels);
  
  // Upload ZIP
  DOM.zipInput.addEventListener('change', uploadSlackZip);
  
  // Sync API
  DOM.btnSyncApi.addEventListener('click', syncSlackAPI);
  
  // Generate Summary
  DOM.btnGenerateSummary.addEventListener('click', () => generateSummary(true));
  
  // Tab Switching
  DOM.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.tabButtons.forEach(b => b.classList.remove('active'));
      DOM.tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Chat Events
  DOM.btnChatSend.addEventListener('click', sendChatMessage);
  DOM.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-circle';
  if (type === 'warning') icon = 'fa-exclamation-triangle';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;
  
  DOM.toastContainer.appendChild(toast);
  
  // Auto remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================================================
// CONFIGURATION MODAL LOGIC
// ==========================================================================
async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    state.config = await res.json();
    
    // Check if configuration is set
    if (!state.config.hasGeminiKey) {
      showToast('Vui lòng thiết lập Gemini API Key để bắt đầu sử dụng tính năng tóm tắt AI!', 'warning');
    }
  } catch (error) {
    showToast('Lỗi khi đọc cấu hình hệ thống', 'error');
  }
}

function openConfigModal() {
  if (state.config) {
    DOM.configGeminiKey.value = state.config.hasGeminiKey ? '••••••••••••••••••••' : '';
    DOM.configSlackToken.value = state.config.hasSlackToken ? '••••••••••••••••••••' : '';
  }
  DOM.configModal.classList.remove('hidden');
}

function closeConfigModal() {
  DOM.configModal.classList.add('hidden');
}

async function saveConfig(e) {
  e.preventDefault();
  
  const payload = {};
  const geminiVal = DOM.configGeminiKey.value.trim();
  const slackVal = DOM.configSlackToken.value.trim();
  
  // Only update if edited (not the placeholder dots)
  if (geminiVal && geminiVal !== '••••••••••••••••••••') {
    payload.geminiApiKey = geminiVal;
  }
  if (slackVal && slackVal !== '••••••••••••••••••••') {
    payload.slackToken = slackVal;
  }
  
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    
    if (result.success) {
      showToast('Cấu hình đã được lưu thành công!', 'success');
      closeConfigModal();
      await fetchConfig();
    } else {
      showToast('Lỗi: ' + result.error, 'error');
    }
  } catch (error) {
    showToast('Không thể kết nối máy chủ', 'error');
  }
}

// ==========================================================================
// DATA INGESTION LOGIC
// ==========================================================================
async function uploadSlackZip(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('slackZip', file);
  
  DOM.uploadStatus.classList.remove('hidden');
  DOM.uploadStatus.textContent = 'Đang tải lên và phân tích file ZIP...';
  
  try {
    const res = await fetch('/api/upload-zip', {
      method: 'POST',
      body: formData
    });
    
    const result = await res.json();
    if (result.success) {
      showToast(`Đã nạp thành công: ${result.channelsCount} kênh và ${result.usersCount} thành viên!`, 'success');
      DOM.uploadStatus.textContent = 'Đã hoàn tất nạp dữ liệu ZIP.';
      await fetchChannels();
    } else {
      showToast('Lỗi: ' + result.error, 'error');
      DOM.uploadStatus.textContent = 'Lỗi nạp dữ liệu ZIP.';
    }
  } catch (error) {
    showToast('Lỗi đường truyền dữ liệu', 'error');
    DOM.uploadStatus.textContent = 'Lỗi kết nối máy chủ.';
  } finally {
    DOM.zipInput.value = ''; // clear input
    setTimeout(() => DOM.uploadStatus.classList.add('hidden'), 5000);
  }
}

async function syncSlackAPI() {
  if (!state.config || !state.config.hasSlackToken) {
    showToast('Vui lòng cấu hình Slack Token trước khi thực hiện đồng bộ!', 'warning');
    openConfigModal();
    return;
  }
  
  DOM.btnSyncApi.disabled = true;
  DOM.btnSyncApi.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đồng bộ...';
  showToast('Đang kết nối Slack API để đồng bộ tin nhắn...', 'info');
  
  try {
    const res = await fetch('/api/sync', { method: 'POST' });
    const result = await res.json();
    
    if (result.success) {
      showToast(`Đồng bộ hoàn tất! Tải về ${result.channelsCount} kênh và ${result.usersCount} thành viên.`, 'success');
      await fetchChannels();
    } else {
      showToast('Lỗi đồng bộ: ' + result.error, 'error');
    }
  } catch (error) {
    showToast('Lỗi kết nối API máy chủ', 'error');
  } finally {
    DOM.btnSyncApi.disabled = false;
    DOM.btnSyncApi.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Đồng bộ qua Slack API';
  }
}

// ==========================================================================
// CHANNELS LIST LOGIC
// ==========================================================================
async function fetchChannels() {
  try {
    const res = await fetch('/api/channels');
    state.channels = await res.json();
    
    DOM.channelsCount.textContent = state.channels.length;
    renderChannelsList();
  } catch (error) {
    showToast('Không thể kết nối danh sách kênh', 'error');
  }
}

function renderChannelsList() {
  DOM.channelsList.innerHTML = '';
  
  if (state.channels.length === 0) {
    DOM.channelsList.innerHTML = `
      <div class="empty-state-list">
        Chưa có kênh nào. Hãy nạp file ZIP hoặc đồng bộ API ở trên!
      </div>
    `;
    return;
  }
  
  state.channels.forEach(channel => {
    const li = document.createElement('li');
    li.className = `channel-item ${state.selectedChannelId === channel.id ? 'active' : ''}`;
    li.dataset.id = channel.id;
    
    const isPrivateIcon = channel.is_private ? 'fa-lock' : 'fa-hashtag';
    
    li.innerHTML = `
      <div class="channel-item-name">
        <i class="fa-solid ${isPrivateIcon}"></i>
        <span>${channel.name}</span>
      </div>
      ${channel.member_count > 0 ? `<span class="channel-item-badge"><i class="fa-solid fa-users"></i> ${channel.member_count}</span>` : ''}
    `;
    
    li.addEventListener('click', () => selectChannel(channel.id));
    DOM.channelsList.appendChild(li);
  });
}

function filterChannels(e) {
  const query = e.target.value.toLowerCase();
  const items = DOM.channelsList.querySelectorAll('.channel-item');
  
  items.forEach(item => {
    const name = item.querySelector('.channel-item-name span').textContent.toLowerCase();
    if (name.includes(query)) {
      item.classList.remove('hidden');
    } else {
      item.classList.add('hidden');
    }
  });
}

// ==========================================================================
// CHANNEL SELECTION & MESSAGE VIEWER
// ==========================================================================
async function selectChannel(channelId) {
  state.selectedChannelId = channelId;
  
  // Highlight active channel in sidebar
  const items = DOM.channelsList.querySelectorAll('.channel-item');
  items.forEach(item => {
    if (item.dataset.id === channelId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  const channel = state.channels.find(c => c.id === channelId);
  if (!channel) return;
  
  // Show dashboard view & hide welcome
  DOM.welcomeView.classList.add('hidden');
  DOM.dashboardView.classList.remove('hidden');
  
  // Update Header
  DOM.currentChannelName.innerHTML = `<i class="fa-solid ${channel.is_private ? 'fa-lock' : 'fa-hashtag'}"></i> ${channel.name}`;
  DOM.currentChannelPurpose.textContent = channel.purpose || channel.topic || 'Không có mô tả cho kênh này.';
  
  // Reset date filters and chat history
  DOM.filterStartDate.value = '';
  DOM.filterEndDate.value = '';
  state.chatHistory = [];
  resetChatInterface();
  
  // Reset Summary interface
  DOM.summaryPlaceholder.classList.remove('hidden');
  DOM.summaryRealContent.classList.add('hidden');
  DOM.summaryLoader.classList.add('hidden');
  
  // Fetch messages
  await fetchMessages();
}

async function fetchMessages() {
  if (!state.selectedChannelId) return;
  
  const startDate = DOM.filterStartDate.value;
  const endDate = DOM.filterEndDate.value;
  
  let url = `/api/channels/${state.selectedChannelId}/messages`;
  const params = [];
  if (startDate) params.push(`startDate=${startDate}`);
  if (endDate) params.push(`endDate=${endDate}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  
  try {
    const res = await fetch(url);
    state.messages = await res.json();
    renderOriginalMessages();
  } catch (error) {
    showToast('Lỗi khi tải lịch sử tin nhắn', 'error');
  }
}

function renderOriginalMessages() {
  DOM.messagesList.innerHTML = '';
  
  if (state.messages.length === 0) {
    DOM.messagesList.innerHTML = `
      <div class="empty-state-messages">
        Không tìm thấy tin nhắn nào trong kênh này trong thời gian được chọn.
      </div>
    `;
    return;
  }
  
  state.messages.forEach(msg => {
    const msgEl = document.createElement('div');
    msgEl.className = 'message-item';
    
    // Avatar
    const avatarHtml = msg.user.avatar 
      ? `<img src="${msg.user.avatar}" class="avatar-img" alt="${msg.user.display_name}">`
      : `<div class="avatar-fallback">${msg.user.display_name.slice(0, 2).toUpperCase()}</div>`;
      
    // Format timestamp
    const date = new Date(msg.datetime);
    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    
    // Replies HTML if thread replies exist
    let repliesHtml = '';
    if (msg.replies && msg.replies.length > 0) {
      repliesHtml = `
        <div class="thread-replies-container">
          ${msg.replies.map(reply => {
            const rAvatar = reply.user.avatar
              ? `<img src="${reply.user.avatar}" class="avatar-img" alt="${reply.user.display_name}">`
              : `<div class="avatar-fallback">${reply.user.display_name.slice(0, 2).toUpperCase()}</div>`;
            const rDate = new Date(reply.datetime);
            const rTimeStr = rDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + rDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            return `
              <div class="reply-item">
                <div class="avatar-wrapper reply-avatar">${rAvatar}</div>
                <div class="message-bubble reply-bubble">
                  <div class="message-header">
                    <span class="sender-name">${reply.user.display_name}</span>
                    <span class="message-time">${rTimeStr}</span>
                  </div>
                  <div class="message-text">${formatMessageText(reply.text)}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    msgEl.innerHTML = `
      <div class="avatar-wrapper">${avatarHtml}</div>
      <div style="flex-grow: 1;">
        <div class="message-bubble">
          <div class="message-header">
            <span class="sender-name">${msg.user.display_name}</span>
            <span class="message-time">${timeStr}</span>
          </div>
          <div class="message-text">${formatMessageText(msg.text)}</div>
        </div>
        ${repliesHtml}
      </div>
    `;
    
    DOM.messagesList.appendChild(msgEl);
  });
}

function formatMessageText(text) {
  if (!text) return '';
  // Convert newlines to breaks
  let formatted = text.replace(/\n/g, '<br>');
  // Bold markup *bold* -> <strong>bold</strong>
  formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  return formatted;
}

// ==========================================================================
// AI SUMMARY GENERATION & RENDERING
// ==========================================================================
async function generateSummary(forceRefresh = false) {
  if (!state.selectedChannelId) return;
  
  if (!state.config || !state.config.hasGeminiKey) {
    showToast('Chưa tìm thấy Gemini API Key. Vui lòng mở "Cấu hình hệ thống" để nhập key!', 'warning');
    openConfigModal();
    return;
  }
  
  // Set UI to loading state
  DOM.summaryPlaceholder.classList.add('hidden');
  DOM.summaryRealContent.classList.add('hidden');
  DOM.summaryLoader.classList.remove('hidden');
  
  const startDate = DOM.filterStartDate.value;
  const endDate = DOM.filterEndDate.value;
  
  try {
    const res = await fetch(`/api/channels/${state.selectedChannelId}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        endDate,
        forceRefresh
      })
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Lỗi không xác định khi gọi AI tóm tắt.');
    }
    
    const summary = await res.json();
    renderSummary(summary);
  } catch (error) {
    showToast(error.message, 'error');
    DOM.summaryPlaceholder.classList.remove('hidden');
    DOM.summaryLoader.classList.add('hidden');
  }
}

function renderSummary(summary) {
  DOM.summaryLoader.classList.add('hidden');
  DOM.summaryRealContent.classList.remove('hidden');
  
  // 1. Render Overview
  DOM.summaryOverviewText.textContent = summary.overview;
  
  // 2. Render Action Items
  DOM.summaryActionList.innerHTML = '';
  if (!summary.action_items || summary.action_items.length === 0) {
    DOM.summaryActionList.innerHTML = '<li class="empty-card-item">Không có việc cần làm nào được nhắc đến.</li>';
  } else {
    summary.action_items.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'action-item';
      li.innerHTML = `
        <label class="action-checkbox-wrapper">
          <input type="checkbox" id="action-chk-${index}">
          <span class="custom-checkbox"></span>
        </label>
        <div class="action-item-text">
          <span>${item.task}</span>
          ${item.assignee !== 'Chưa phân công' ? `<span class="action-assignee"><i class="fa-solid fa-user"></i> ${item.assignee}</span>` : ''}
        </div>
      `;
      DOM.summaryActionList.appendChild(li);
    });
  }
  
  // 3. Render Key Decisions
  DOM.summaryDecisionList.innerHTML = '';
  if (!summary.key_decisions || summary.key_decisions.length === 0) {
    DOM.summaryDecisionList.innerHTML = '<li class="empty-card-item">Không có quyết định nào được đưa ra.</li>';
  } else {
    summary.key_decisions.forEach(decision => {
      const li = document.createElement('li');
      li.className = 'decision-list-item';
      li.innerHTML = `
        <i class="fa-solid fa-circle-check"></i>
        <span>${decision}</span>
      `;
      DOM.summaryDecisionList.appendChild(li);
    });
  }
  
  // 4. Render Topics Accordion
  DOM.summaryTopicsAccordion.innerHTML = '';
  if (!summary.topics || summary.topics.length === 0) {
    DOM.summaryTopicsAccordion.innerHTML = '<div class="empty-card-item">Không ghi nhận chủ đề thảo luận lớn nào.</div>';
  } else {
    summary.topics.forEach((topic, idx) => {
      const accItem = document.createElement('div');
      accItem.className = 'accordion-item';
      accItem.innerHTML = `
        <div class="accordion-header">
          <span class="accordion-title">${topic.topic}</span>
          <i class="fa-solid fa-chevron-down accordion-icon"></i>
        </div>
        <div class="accordion-content">
          <p>${topic.summary}</p>
        </div>
      `;
      
      // Accordion toggle click event
      accItem.querySelector('.accordion-header').addEventListener('click', () => {
        accItem.classList.toggle('active');
      });
      
      DOM.summaryTopicsAccordion.appendChild(accItem);
    });
  }
}

// ==========================================================================
// CHAT Q&A INTERACTION LOGIC
// ==========================================================================
function resetChatInterface() {
  DOM.chatMessages.innerHTML = `
    <div class="chat-bubble assistant">
      Chào bạn! Tôi có thể trả lời mọi câu hỏi của bạn xoay quanh nội dung cuộc hội thoại trong kênh này. Hãy hỏi tôi bất cứ điều gì! (Ví dụ: "Ai là người chịu trách nhiệm sửa lỗi?", "Đã quyết định họp lúc mấy giờ?")
    </div>
  `;
}

async function sendChatMessage() {
  const queryText = DOM.chatInput.value.trim();
  if (!queryText || !state.selectedChannelId) return;
  
  if (!state.config || !state.config.hasGeminiKey) {
    showToast('Vui lòng thiết lập Gemini API Key để trò chuyện!', 'warning');
    openConfigModal();
    return;
  }

  // 1. Render User Message
  appendChatBubble(queryText, 'user');
  DOM.chatInput.value = '';
  
  // 2. Render Typing Indicator
  const typingEl = appendTypingIndicator();
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
  
  const startDate = DOM.filterStartDate.value;
  const endDate = DOM.filterEndDate.value;
  
  try {
    const res = await fetch(`/api/channels/${state.selectedChannelId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: queryText,
        chatHistory: state.chatHistory,
        startDate,
        endDate
      })
    });
    
    typingEl.remove();
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Lỗi không xác định khi chat.');
    }
    
    const result = await res.json();
    
    // 3. Render Assistant Response
    appendChatBubble(result.answer, 'assistant');
    
    // 4. Update local state history
    state.chatHistory.push({ role: 'user', content: queryText });
    state.chatHistory.push({ role: 'model', content: result.answer });
    
  } catch (error) {
    typingEl.remove();
    appendChatBubble(`Không thể hoàn tất trả lời câu hỏi do lỗi: ${error.message}`, 'assistant');
    showToast('Lỗi gửi tin nhắn', 'error');
  } finally {
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
  }
}

function appendChatBubble(text, sender) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;
  bubble.innerHTML = renderMarkdownToHTML(text);
  DOM.chatMessages.appendChild(bubble);
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

function appendTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'chat-bubble assistant typing-indicator';
  div.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;
  DOM.chatMessages.appendChild(div);
  return div;
}

/**
 * Super lightweight Markdown-to-HTML parser for bot replies
 */
function renderMarkdownToHTML(mdText) {
  if (!mdText) return '';
  let html = mdText;
  
  // Escape HTML tags slightly (avoid breaking style, but let chatbot response render clean text)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Bold **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Code block ```code```
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bullet points
  const lines = html.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const content = line.trim().slice(2);
      let listOpen = '';
      if (!inList) {
        inList = true;
        listOpen = '<ul>';
      }
      return `${listOpen}<li>${content}</li>`;
    } else {
      let listClose = '';
      if (inList) {
        inList = false;
        listClose = '</ul>';
      }
      return `${listClose}${line}`;
    }
  });
  
  if (inList) {
    processedLines[processedLines.length - 1] += '</ul>';
  }
  
  return processedLines.join('<br>').replace(/<\/ul><br>/g, '</ul>').replace(/<\/li><br>/g, '</li>');
}
