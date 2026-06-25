import dotenv from 'dotenv';
dotenv.config();

const MODEL_NAME = 'gemini-1.5-flash'; // Or 'gemini-2.0-flash' or 'gemini-1.5-flash'

/**
 * Formats a message tree into a clean text transcript for the LLM
 */
function formatMessagesToTranscript(messages) {
  let transcript = '';
  
  messages.forEach(msg => {
    const time = new Date(msg.datetime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const sender = msg.user?.display_name || msg.user?.real_name || 'Unknown';
    transcript += `[${time}] ${sender}: ${msg.text}\n`;
    
    // Add replies if any
    if (msg.replies && msg.replies.length > 0) {
      msg.replies.forEach(reply => {
        const rTime = new Date(reply.datetime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const rSender = reply.user?.display_name || reply.user?.real_name || 'Unknown';
        transcript += `    ↳ [${rTime}] ${rSender}: ${reply.text}\n`;
      });
    }
  });
  
  return transcript;
}

/**
 * Call Gemini API with safety fallback and parsing
 */
async function callGemini(prompt, systemInstruction = '', responseSchema = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa tìm thấy GEMINI_API_KEY trong cấu hình hệ thống (.env)');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2, // Low temperature for factual summarization
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (responseSchema) {
    payload.generationConfig.responseMimeType = 'application/json';
    payload.generationConfig.responseSchema = responseSchema;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini API error: ${response.statusText}`);
  }

  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) {
    throw new Error('Gemini API returned an empty response.');
  }

  return resultText;
}

/**
 * Generates a structured JSON summary of a Slack conversation
 */
export async function summarizeConversation(messages) {
  if (!messages || messages.length === 0) {
    return {
      overview: 'Không có tin nhắn nào trong khoảng thời gian này để tóm tắt.',
      key_decisions: [],
      action_items: [],
      topics: []
    };
  }

  const transcript = formatMessagesToTranscript(messages);

  const systemInstruction = `Bạn là một trợ lý AI chuyên nghiệp có nhiệm vụ đọc và phân tích lịch sử hội thoại Slack.
Hãy phân tích đoạn hội thoại được cung cấp và xuất ra kết quả định dạng JSON. Tất cả nội dung văn bản (tóm tắt, nhiệm vụ, chủ đề) phải viết bằng tiếng Việt tự nhiên, ngắn gọn và chính xác.

Yêu cầu tóm tắt:
1. "overview": Tóm tắt tổng quan ngắn gọn (2-4 câu) về nội dung toàn bộ cuộc trò chuyện.
2. "key_decisions": Danh sách các quyết định quan trọng đã được thống nhất hoặc thông qua. Nếu không có quyết định nào, trả về mảng rỗng [].
3. "action_items": Danh sách các đầu việc cần làm (action items). Với mỗi đầu việc:
   - "task": Mô tả nhiệm vụ cần thực hiện.
   - "assignee": Tên người chịu trách nhiệm thực hiện (phải lấy chính xác từ Display Name hoặc Real Name của người nói). Nếu không rõ hoặc chưa phân công, ghi "Chưa phân công".
   - "status": Trạng thái mặc định là "pending".
4. "topics": Danh sách các chủ đề chính được thảo luận. Với mỗi chủ đề:
   - "topic": Tên chủ đề ngắn gọn (ví dụ: "Sửa lỗi login", "Lịch họp tuần tới").
   - "summary": Tóm tắt chi tiết diễn biến thảo luận của chủ đề này (1-3 câu).`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      overview: { type: 'STRING' },
      key_decisions: {
        type: 'ARRAY',
        items: { type: 'STRING' }
      },
      action_items: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            task: { type: 'STRING' },
            assignee: { type: 'STRING' },
            status: { type: 'STRING' }
          },
          required: ['task', 'assignee', 'status']
        }
      },
      topics: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            topic: { type: 'STRING' },
            summary: { type: 'STRING' }
          },
          required: ['topic', 'summary']
        }
      }
    },
    required: ['overview', 'key_decisions', 'action_items', 'topics']
  };

  const prompt = `Dưới đây là lịch sử hội thoại Slack:
  
\`\`\`
${transcript}
\`\`\`

Hãy phân tích và tóm tắt theo cấu trúc JSON được yêu cầu.`;

  try {
    const jsonString = await callGemini(prompt, systemInstruction, responseSchema);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error generating AI summary:', error);
    throw error;
  }
}

/**
 * Conduct Q&A chat on the conversation context
 */
export async function chatWithConversationContext(messages, chatHistory, userMessage) {
  const transcript = formatMessagesToTranscript(messages);

  const systemInstruction = `Bạn là trợ lý AI thông minh tích hợp trong ứng dụng Slack Summarizer.
Bạn được cung cấp lịch sử hội thoại Slack dưới đây. Hãy trả lời câu hỏi của người dùng dựa TRÊN nội dung cuộc trò chuyện này.
Nếu câu hỏi nằm ngoài phạm vi cuộc trò chuyện hoặc không có thông tin, hãy lịch sự thông báo là "Thông tin này không xuất hiện trong hội thoại".
Hãy trả lời trực tiếp, rõ ràng, sử dụng định dạng Markdown nếu cần thiết (đặc biệt là in đậm tên người dùng hoặc các mốc thời gian). Trả lời bằng tiếng Việt.`;

  // Format history for the context prompt
  let historyStr = '';
  chatHistory.forEach(item => {
    const roleName = item.role === 'user' ? 'Người dùng' : 'Trợ lý';
    historyStr += `${roleName}: ${item.content}\n`;
  });

  const prompt = `Lịch sử hội thoại Slack làm ngữ cảnh:
\`\`\`
${transcript}
\`\`\`

Lịch sử trò chuyện trước đó giữa bạn và người dùng:
${historyStr}

Câu hỏi mới của người dùng:
${userMessage}

Trả lời:`;

  try {
    return await callGemini(prompt, systemInstruction);
  } catch (error) {
    console.error('Error in chat integration:', error);
    throw error;
  }
}
