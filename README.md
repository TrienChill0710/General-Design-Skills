# Slack Summarizer & Thread Helper

Dự án này cung cấp bộ công cụ thông minh giúp bạn đọc và tóm tắt lịch sử hội thoại Slack bằng Gemini AI. Dự án hỗ trợ hai phương thức hoạt động chính:

1. **Slack Thread Helper (Chạy qua Terminal cho AI Assistant)**: Giúp AI đọc trực tiếp link Slack thread bạn gửi vào khung chat và tạo bản tóm tắt ngay lập tức.
2. **Web Dashboard Premium**: Giao diện Web Dark Mode cục bộ giúp bạn duyệt danh sách kênh, xem luồng tin nhắn và hỏi đáp Q&A về hội thoại.

---

## 1. Hướng dẫn sử dụng Slack Thread Helper (Trong khung chat)

Khi bạn muốn tôi tóm tắt một cuộc hội thoại dài trên Slack ngay tại phiên chat này:

1. **Chuẩn bị Token**: 
   - Lấy một Slack OAuth Token (Bot Token `xoxb-` hoặc User Token `xoxp-`).
   - Cấu hình token này vào biến `SLACK_TOKEN` trong file `.env` nằm tại thư mục dự án `/Users/nguyenvantoan/.gemini/antigravity/scratch/slack-summarizer/.env`.
2. **Gửi link thread**: Bạn chỉ cần gửi link của Slack thread đó vào chat (Ví dụ: `https://myworkspace.slack.com/archives/C12345/p1623748200000200`).
3. **AI xử lý**: Tôi sẽ tự động gọi script `fetch_thread.js` để đọc nội dung cuộc trò chuyện đó qua API của Slack và đưa ra câu trả lời tóm tắt/phân tích nhanh ngay lập tức cho bạn.

Để chạy thử nghiệm thủ công qua dòng lệnh:
```bash
node fetch_thread.js "URL_SLACK_THREAD_CỦA_BẠN"
```

---

## 2. Hướng dẫn chạy Web Dashboard cục bộ

Để sử dụng giao diện đồ họa trực quan và tương tác trực tiếp:

### Bước 1: Khởi chạy máy chủ
Tại thư mục dự án, chạy lệnh:
```bash
npm run dev
```

### Bước 2: Truy cập trình duyệt
Mở trình duyệt của bạn và truy cập: [http://localhost:3000](http://localhost:3000)
- Thiết lập **Gemini API Key** tại nút **Cấu hình hệ thống** (biểu tượng bánh răng ở sidebar).
- Đồng bộ dữ liệu hoặc tải lên file ZIP export để trải nghiệm giao diện tóm tắt và chatbot Q&A.

---

## Cấu trúc thư mục dự án

```text
slack-summarizer/
├── fetch_thread.js     # Script helper đọc nội dung từ Slack URL thread
├── server.js           # API Server phục vụ Web Dashboard
├── slack_parser.js     # Xử lý phân tích Slack ZIP & sync API
├── summary_engine.js   # Tích hợp AI Gemini
├── mock_data.js        # Sinh dữ liệu mẫu khi khởi động Web lần đầu
├── .env                # File cấu hình chứa SLACK_TOKEN và GEMINI_API_KEY
├── package.json        # Thư viện và kịch bản khởi chạy
└── public/             # Mã nguồn Frontend Web Dashboard
```
