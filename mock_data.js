import fs from 'fs';
import path from 'path';

const CACHE_DIR = './data/cache';

const mockUsers = {
  "U01": { id: "U01", name: "minh.nguyen", real_name: "Nguyễn Văn Minh", display_name: "Minh Nguyễn", avatar: null, is_bot: false },
  "U02": { id: "U02", name: "lan.anh", real_name: "Trần Lan Anh", display_name: "Lan Anh", avatar: null, is_bot: false },
  "U03": { id: "U03", name: "hoang.pham", real_name: "Phạm Minh Hoàng", display_name: "Hoàng Phạm", avatar: null, is_bot: false },
  "U04": { id: "U04", name: "gemini_bot", real_name: "Gemini Summarizer", display_name: "Gemini Bot", avatar: null, is_bot: true }
};

const mockChannels = [
  {
    id: "C01",
    name: "du-an-website",
    creator: "U01",
    topic: "Thảo luận về phát triển website bán hàng mới",
    purpose: "Kênh làm việc của team Dev và Design dự án website thương mại điện tử.",
    member_count: 3,
    is_private: false
  },
  {
    id: "C02",
    name: "marketing-chiendich",
    creator: "U02",
    topic: "Lên kế hoạch ra mắt sản phẩm quý 3",
    purpose: "Thảo luận các hoạt động truyền thông và ngân sách quảng cáo.",
    member_count: 3,
    is_private: false
  },
  {
    id: "C03",
    name: "general",
    creator: "U01",
    topic: "Trò chuyện chung",
    purpose: "Kênh tán gẫu, thảo luận ăn trưa và hoạt động tập thể.",
    member_count: 3,
    is_private: false
  }
];

// 5 days ago to today helper
const getPastDateStr = (daysAgo, hour, minute) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const getPastTimestamp = (daysAgo, hour, minute) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return (d.getTime() / 1000).toString();
};

const mockMessages = {
  "C01": [
    {
      ts: getPastTimestamp(2, 9, 30),
      user: mockUsers["U01"],
      text: "Chào mọi người, hôm nay chúng ta bắt đầu bàn về UI/UX cho website nhé. @Lan Anh đã hoàn thành wireframe cho trang chủ chưa?",
      datetime: getPastDateStr(2, 9, 30),
      reactions: [{ name: "+1", count: 2, users: ["U02", "U03"] }],
      replies: [
        {
          ts: getPastTimestamp(2, 9, 35),
          user: mockUsers["U02"],
          text: "Mình làm xong bản phác thảo thô rồi nhé. Để mình gửi link Figma lên đây cho mọi người xem.",
          datetime: getPastDateStr(2, 9, 35)
        },
        {
          ts: getPastTimestamp(2, 9, 40),
          user: mockUsers["U02"],
          text: "Đây là link thiết kế Figma: https://figma.com/file/mock-website-design. Mọi người xem thử phần Header và Hero section có cần chỉnh gì không nhé.",
          datetime: getPastDateStr(2, 9, 40)
        }
      ]
    },
    {
      ts: getPastTimestamp(2, 10, 15),
      user: mockUsers["U03"],
      text: "Mình đã xem qua Figma. Phần Hero Section nhìn rất hiện đại, nhưng nút Call-to-Action (CTA) nên làm to hơn chút và đổi sang màu cam để tăng chuyển đổi. Hiện tại màu xanh hơi chìm.",
      datetime: getPastDateStr(2, 10, 15),
      reactions: [{ name: "eyes", count: 1, users: ["U02"] }],
      replies: []
    },
    {
      ts: getPastTimestamp(2, 10, 30),
      user: mockUsers["U02"],
      text: "Đồng ý với @Hoàng Phạm. Để mình đổi màu nút CTA sang màu cam neon `#FF5733` và tăng font-size lên 18px.",
      datetime: getPastDateStr(2, 10, 30),
      replies: []
    },
    {
      ts: getPastTimestamp(1, 14, 0),
      user: mockUsers["U01"],
      text: "Về phần Backend, mình đề xuất sử dụng Node.js Express cho gọn nhẹ và dễ mở rộng. Cơ sở dữ liệu thì dùng PostgreSQL. Mọi người thấy sao?",
      datetime: getPastDateStr(1, 14, 0),
      replies: [
        {
          ts: getPastTimestamp(1, 14, 15),
          user: mockUsers["U03"],
          text: "Ủng hộ nhé! Node.js + PostgreSQL là combo chuẩn rồi. Mình sẽ đảm nhiệm thiết kế Database Schema.",
          datetime: getPastDateStr(1, 14, 15)
        },
        {
          ts: getPastTimestamp(1, 14, 25),
          user: mockUsers["U01"],
          text: "Ok, chốt vậy nhé. @Hoàng Phạm làm Schema DB xong gửi mình duyệt trước ngày thứ Sáu tuần này nhé.",
          datetime: getPastDateStr(1, 14, 25)
        }
      ]
    },
    {
      ts: getPastTimestamp(0, 8, 45),
      user: mockUsers["U01"],
      text: "Hôm nay chúng ta cần họp sync 15 phút đầu giờ để cập nhật tiến độ. 9:00 mọi người vào Google Meet nhé: https://meet.google.com/abc-xyz",
      datetime: getPastDateStr(0, 8, 45),
      replies: []
    }
  ],
  "C02": [
    {
      ts: getPastTimestamp(4, 10, 0),
      user: mockUsers["U02"],
      text: "Chào mọi người, chúng ta cần chuẩn bị kế hoạch Marketing cho buổi launch sản phẩm mới vào tháng 8. Dự kiến ngân sách tối đa là 150 triệu.",
      datetime: getPastDateStr(4, 10, 0),
      replies: [
        {
          ts: getPastTimestamp(4, 10, 10),
          user: mockUsers["U01"],
          text: "Ngân sách này bao gồm cả chi phí chạy Ads và thuê KOL chưa @Lan Anh?",
          datetime: getPastDateStr(4, 10, 10)
        },
        {
          ts: getPastTimestamp(4, 10, 20),
          user: mockUsers["U02"],
          text: "Đã bao gồm hết rồi nhé. Mình định chia ra: 70 triệu chạy Facebook/Google Ads, 50 triệu thuê 3 bạn KOLs phân khúc micro, và 30 triệu làm minigame/quà tặng.",
          datetime: getPastDateStr(4, 10, 20)
        }
      ]
    },
    {
      ts: getPastTimestamp(3, 11, 0),
      user: mockUsers["U03"],
      text: "Mình nghĩ nên đầu tư thêm vào mảng Tiktok nữa. Kênh đó đang viral rất tốt cho sản phẩm công nghệ. Ta có thể bớt 10 triệu từ Ads truyền thống sang Book thêm 2 Tiktoker nhỏ.",
      datetime: getPastDateStr(3, 11, 0),
      replies: []
    },
    {
      ts: getPastTimestamp(3, 11, 30),
      user: mockUsers["U02"],
      text: "Ý kiến hay! Vậy kế hoạch ngân sách chốt như sau: Ads (60tr), KOLs + Tiktok (60tr), Minigame (30tr). @Nguyễn Văn Minh chuẩn bị giúp mình bộ ảnh và video demo sản phẩm nhé.",
      datetime: getPastDateStr(3, 11, 30),
      replies: [
        {
          ts: getPastTimestamp(3, 11, 45),
          user: mockUsers["U01"],
          text: "Ok, mình sẽ phụ trách phần design banner và edit video demo. Dự kiến hoàn thành trước ngày 20/06.",
          datetime: getPastDateStr(3, 11, 45)
        }
      ]
    }
  ],
  "C03": [
    {
      ts: getPastTimestamp(1, 11, 45),
      user: mockUsers["U03"],
      text: "Trưa nay ăn gì đây mọi người ơi? Cơm tấm hay bún chả?",
      datetime: getPastDateStr(1, 11, 45),
      replies: [
        {
          ts: getPastTimestamp(1, 11, 50),
          user: mockUsers["U01"],
          text: "Cơm tấm đi, lâu rồi chưa ăn sườn bì chả.",
          datetime: getPastDateStr(1, 11, 50)
        },
        {
          ts: getPastTimestamp(1, 11, 52),
          user: mockUsers["U02"],
          text: "Em vote bún chả nhé, trời hôm nay hơi nóng ăn bún chả cho mát.",
          datetime: getPastDateStr(1, 11, 52)
        }
      ]
    },
    {
      ts: getPastTimestamp(1, 12, 0),
      user: mockUsers["U03"],
      text: "Ok vậy chốt bún chả Sinh Từ nhé. Em đặt trên ShopeeFood đây.",
      datetime: getPastDateStr(1, 12, 0),
      replies: []
    }
  ]
};

export function generateMockData() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  // Check if cache already contains data
  const usersPath = path.join(CACHE_DIR, 'users.json');
  if (fs.existsSync(usersPath)) {
    console.log('Mock data generation skipped: cache already populated.');
    return;
  }

  console.log('Generating realistic mock Slack data in cache...');
  fs.writeFileSync(path.join(CACHE_DIR, 'users.json'), JSON.stringify(mockUsers, null, 2), 'utf8');
  fs.writeFileSync(path.join(CACHE_DIR, 'channels.json'), JSON.stringify(mockChannels, null, 2), 'utf8');

  Object.entries(mockMessages).forEach(([channelId, messages]) => {
    fs.writeFileSync(
      path.join(CACHE_DIR, `messages_${channelId}.json`),
      JSON.stringify(messages, null, 2),
      'utf8'
    );
  });
  console.log('Mock data generation completed!');
}
