# Quy chuẩn Thiết kế & Tỷ lệ Logo AGENORIX
*Tài liệu hướng dẫn kỹ thuật đồ lại (vectorize), in ấn và thi công thực tế thương hiệu AGENORIX.*

---

## 1. Hệ lưới & Tính đối xứng hình học (Grid & Geometry)

Để logo giữ được sự cân đối tối đa khi phóng to ở các định dạng lớn (như bảng hiệu tòa nhà, tạp chí khổ lớn), quá trình đồ lại phải tuyệt đối tuân thủ hệ thống lưới hình học:

*   **Trục đối xứng (Central Axis):** Biểu tượng chữ A và lõi kim cương ở giữa đối xứng hoàn hảo qua trục dọc. Trục dọc này phải đi qua:
    *   Đỉnh chữ **A**.
    *   Tâm hình **Kim Cương**.
    *   Chính giữa chữ **O** trong từ "AGENORIX".
    *   Dấu chấm xanh căn giữa dòng Tagline *"AI • TECHNOLOGY • FUTURE"*.
*   **Góc nghiêng:** Hai chân chữ A có góc nghiêng đồng nhất với nhau và đồng nhất với độ vát của các ký tự chữ cái trong từ khóa "AGENORIX" (như nét chéo chữ A, R, X).

---

## 2. Quy chuẩn Tỷ lệ Phân bổ (Proportions Guide)

Để thiết kế đạt độ cân bằng thị giác hoàn hảo nhất, chúng ta lấy **chiều cao của dòng chữ thương hiệu chính "AGENORIX" làm đơn vị cơ sở chuẩn (Kí hiệu là H)**.

| Thành phần | Tỷ lệ chuẩn | Mô tả chi tiết |
| :--- | :--- | :--- |
| **Chiều cao chữ AGENORIX** | **$1H$** | Đơn vị quy chuẩn cốt lõi |
| **Chiều cao Biểu tượng chữ A** | **$2.5H$** | Chiều cao tổng thể tính từ đế đến đỉnh chữ A |
| **Khoảng cách Symbol - Wordmark** | **$1H$** | Khoảng cách từ đế biểu tượng đến đỉnh chữ "AGENORIX" |
| **Chiều cao chữ Tagline phụ** | **$0.25H$** | Chiều cao dòng chữ *"AI • TECHNOLOGY • FUTURE"* |
| **Khoảng cách Wordmark - Divider** | **$0.6H$** | Khoảng cách từ đế chữ chính đến đường kẻ ngang mảnh |
| **Khoảng cách Divider - Tagline** | **$0.6H$** | Khoảng cách từ đường kẻ ngang mảnh đến đỉnh chữ dòng Tagline |

### Tỷ lệ chiều ngang (Width Ratio):
*   **Độ rộng chân biểu tượng chữ A:** Chiếm khoảng **40% - 45%** tổng chiều rộng dòng chữ "AGENORIX".
*   **Đường kẻ ngang mảnh:** Có chiều rộng bằng đúng **100%** chiều rộng của chữ "AGENORIX".
*   **Dòng Tagline:** Căn lề thụt vào hai bên, bằng khoảng **85% - 90%** chiều rộng dòng chữ "AGENORIX".

---

## 3. Quy chuẩn Khoảng trống An toàn (Safe Zone)

Khoảng trống an toàn đảm bảo logo không bị lấn át bởi các yếu tố thiết kế khác (chữ, hình ảnh, lề trang).

*   **Đơn vị đo X:** Được tính bằng **chiều cao của lõi kim cương** ở giữa biểu tượng chữ A.
*   **Quy tắc:** Khoảng trống tối thiểu xung quanh 4 phía của cụm logo phải bằng **$1X$** (Khuyến khích sử dụng **$1.5X$** trên các thiết kế thoáng như Poster, Tạp chí).

---

## 4. Quy tắc Kích thước tối thiểu & Lược bỏ chi tiết (Minimum Size Rules)

Khi in ấn trên các chất liệu siêu nhỏ, hoặc thi công chữ nổi, dòng tagline phụ sẽ bị mất nét hoặc không thể sản xuất vật lý. Ta chia logo thành các phiên bản:

```
[Kích thước lớn]   ==> Phiên bản Đầy đủ (Icon + Wordmark + Tagline)
[Kích thước trung] ==> Phiên bản Rút gọn (Chỉ giữ Icon + Wordmark)
[Kích thước nhỏ]   ==> Phiên bản Tối giản (Chỉ giữ duy nhất Icon)
```

*   **Phiên bản Đầy đủ:** Chiều rộng tối thiểu là **45mm** (khi in) hoặc **180px** (khi hiển thị màn hình).
*   **Phiên bản Rút gọn (Ẩn tagline & đường kẻ):** Dùng khi chiều rộng logo từ **25mm - 45mm**.
*   **Phiên bản Tối giản (Chỉ dùng biểu tượng chữ A):** Dùng cho avatar mạng xã hội, icon ứng dụng, in dập trên bút, kẹp giấy. Chiều rộng tối thiểu **5mm** hoặc **16px**.

---

## 5. Quy tắc Áp dụng trên các Chất liệu Thực tế (Fabrication & Print Rules)

> [!IMPORTANT]
> Luôn xuất file thiết kế dưới định dạng Vector hoàn toàn (`.ai`, `.eps`, `.pdf`) và **Create Outlines** toàn bộ font chữ trước khi chuyển giao.

### A. Đối với thiết kế in ấn & Tạp chí:
*   Tránh sử dụng phiên bản có hiệu ứng phát sáng (glow) 3D vì mực in offset/laser thông thường không thể tái hiện được, dễ gây loang mực hoặc xỉn màu.
*   Sử dụng phiên bản **2D phẳng (Flat Gradient)** hoặc **Đơn sắc (Monochrome - Black/White)** để đảm bảo độ sắc nét cao nhất.

### B. Đối với logo nổi gắn tường (Signage 3D):
*   **Sử dụng phiên bản nổi 3D hỗn hợp:**
    1.  Biểu tượng chữ A và chữ AGENORIX làm nổi khối 3D (bằng mica uốn chân nổi hoặc inox màu xanh).
    2.  Đường kẻ mảnh và dòng chữ phụ *"AI • TECHNOLOGY • FUTURE"* thi công bằng cách **in UV phẳng/sơn trực tiếp lên tường** hoặc **dán decal sữa siêu phẳng**. Không làm nổi 3D các chi tiết này vì sẽ dễ bị rơi rụng và độ thẩm mỹ thấp.
