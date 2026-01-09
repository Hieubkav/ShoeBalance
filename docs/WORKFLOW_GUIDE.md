# Hướng Dẫn Workflow Nhập Hàng Trung Quốc

## Bảng Đối Chiếu Thuật Ngữ

| Thuật ngữ kỹ thuật | Giải thích Feynman (dễ hiểu) |
|-------------------|------------------------------|
| **SKU** | Mã riêng của từng đôi giày (VD: ABC123-42 = mẫu ABC123, size 42) |
| **Tồn kho hiện tại** | Số đôi đang có trong kho ngay bây giờ. Hiện đang dùng từ sheet báo cáo tồn kho dưới định mức . Sau này dùng sheet mới là "Báo cáo tồn kho chi tiết" (hiện tại cho toàn bộ sp) | 
| **Hàng đang về** | Số đôi đã đặt mua, đang ship về. Sau này cũng dùng sheet "Báo cáo tồn kho chi tiết" |
| **Tồn kho tối thiểu** | Số đôi "không được để dưới mức này" để tránh hết hàng.  |
| **Xuất kho** | Số đôi đã bán ra trong tháng vừa qua. Hiện xét 30 ngày nhưng do admin điều tiết set cứng lên 40 |
| **Tỉ suất bán (Sell Rate)** | Trung bình mỗi ngày bán được bao nhiêu đôi (xuất kho ÷ 30)==> tỉ suất (xuất kho lên 40) |
| **Cần nhập** | Số đôi phải mua thêm = Tồn kho tối thiểu - Tồn hiện tại - Hàng đang về |
| **Lead time** | Thời gian chờ hàng từ TQ về VN (khoảng 14 ngày) |
| **Threshold (Ngưỡng)** | Số tối thiểu để đáng nhập (VD: > 12 đôi mới nhập) |
| **Size nữ** | Size 36-39 |
| **Size nam** | Size 40-45 |
| **Unisex** | Mẫu có cả size nữ và size nam |

---=

## Flowchart Tổng Quan: 3 File Đầu Vào

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BƯỚC 1: TẢI 3 FILE DỮ LIỆU                              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  📋 FILE 1       │     │  📊 FILE 2        │     │  📒 FILE 3        │
│  DANH SÁCH        │     │  BÁO CÁO          │     │  SỔ KHO           │
│  SẢN PHẨM         │     │  TỒN KHO          │     │                   │
├───────────────────┤     ├───────────────────┤     ├───────────────────┤
│ • Mã SKU          │     │ • Mã SKU          │     │ • Mã SKU          │
│ • Ảnh sản phẩm    │     │ • Tồn kho hiện tại│     │ • Số lượng xuất   │
│ • Tồn kho tối     │     │ • Hàng đang về    │     │   kho (đã bán)    │
│   thiểu           │     │                   │     │                   │
│ • Giá nhập        │     │                   │     │                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
          │                           │                           │
          │    "Đôi giày này         │    "Trong kho còn         │   "Tháng vừa rồi
          │     giá bao nhiêu,       │     bao nhiêu đôi,        │    bán được bao
          │     cần giữ tối          │     đang ship về          │    nhiêu đôi?"
          │     thiểu bao nhiêu?"    │     bao nhiêu?"           │
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │  🔗 GHÉP NỐI THEO MÃ SKU        │
                    │  (Tìm đôi giày có cùng mã)      │
                    └─────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │  🧮 BƯỚC 2: TÍNH TOÁN NHẬP HÀNG │
                    └─────────────────────────────────┘
```

---

## Giải Thích Feynman: Tại Sao Cần 3 File?

> **Hãy tưởng tượng bạn là chủ tiệm giày:**
>
> Bạn muốn biết "Cần đặt thêm bao nhiêu đôi giày từ Trung Quốc?"
>
> Để trả lời, bạn cần 3 sổ sách:
>
> 📋 **Sổ 1 - Danh sách hàng:** "Đôi này giá bao nhiêu? Cần giữ ít nhất mấy đôi?"
>
> 📊 **Sổ 2 - Kiểm kê kho:** "Hôm nay trong kho còn bao nhiêu đôi?"
>
> 📒 **Sổ 3 - Sổ bán hàng:** "Tháng rồi bán được bao nhiêu đôi?"
>
> Ghép 3 sổ lại → Biết cần nhập thêm bao nhiêu!

---

## Flowchart Chi Tiết: Thuật Toán Tính Toán

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BẮT ĐẦU TÍNH TOÁN                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │  Đã tải đủ 3 file chưa?         │
                    └─────────────────────────────────┘
                              │           │
                            CHƯA          RỒI
                              │           │
                              ▼           ▼
              ┌─────────────────┐   ┌─────────────────────────┐
              │ ⚠️ Báo lỗi:     │   │ Duyệt từng sản phẩm     │
              │ "Vui lòng tải   │   │ trong danh sách         │
              │ đủ 3 file"      │   └─────────────────────────┘
              └─────────────────┘               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │  ĐIỀU KIỆN 1:                   │
                              │  Tồn kho tối thiểu > 0?         │
                              │  (Có cần giữ hàng không?)       │
                              └─────────────────────────────────┘
                                        │           │
                                      KHÔNG         CÓ
                                        │           │
                                        ▼           ▼
                          ┌─────────────────┐   ┌─────────────────┐
                          │ ⏭️ Bỏ qua       │   │ Tiếp tục kiểm   │
                          │ (không cần      │   │ tra size        │
                          │ nhập hàng)      │   └─────────────────┘
                          └─────────────────┘           │
                                                        ▼
                              ┌─────────────────────────────────┐
                              │  PHÂN LOẠI THEO SIZE            │
                              └─────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
      ┌─────────────────────────┐           ┌─────────────────────────┐
      │  SIZE NỮ (36-39)        │           │  SIZE NAM (40-45)       │
      │  👠 Áp dụng logic       │           │  👞 Áp dụng logic       │
      │  "Sales Velocity"       │           │  "Tỉ suất bán"          │
      └─────────────────────────┘           └─────────────────────────┘
                    │                                       │
                    ▼                                       ▼
         [XEM FLOWCHART A]                      [XEM FLOWCHART B]
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        │
                                        ▼
                    ┌─────────────────────────────────────────┐
                    │  BƯỚC CUỐI: KIỂM TRA NGƯỠNG             │
                    │  Tổng cần nhập của 1 mã > Ngưỡng?       │
                    │  • Mẫu nam/unisex: > 12 đôi             │
                    │  • Mẫu nữ thuần: > 8 đôi                │
                    └─────────────────────────────────────────┘
                                        │
                              ┌─────────┴─────────┐
                              │                   │
                            KHÔNG                 CÓ
                              │                   │
                              ▼                   ▼
              ┌─────────────────────┐   ┌─────────────────────┐
              │ ❌ Không nhập       │   │ ✅ Thêm vào danh    │
              │ (số lượng quá ít,   │   │ sách cần nhập hàng  │
              │ không đáng ship)    │   └─────────────────────┘
              └─────────────────────┘
```

---

## [FLOWCHART A] Logic Size Nữ (36-39): Sales Velocity

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SIZE NỮ (36-39) - SALES VELOCITY                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │  Lấy số lượng xuất kho của      │
                    │  SIZE CỤ THỂ này (không phải    │
                    │  tổng cả mã sản phẩm)           │
                    └─────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │  Tháng vừa rồi có bán được      │
                    │  đôi nào không? (xuất kho = 0?) │
                    └─────────────────────────────────┘
                              │           │
                        KHÔNG BÁN      CÓ BÁN
                        (= 0)          (> 0)
                              │           │
                              ▼           ▼
              ┌─────────────────┐   ┌─────────────────────────┐
              │ Tồn kho TT = 1  │   │ Tồn kho TT =            │
              │ (Giữ 1 đôi làm  │   │ MIN(số đã bán, 8)       │
              │ hàng mẫu)       │   │ (Tối đa 8 đôi)          │
              └─────────────────┘   └─────────────────────────┘
                              │           │
                              └─────┬─────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │  Cần nhập = Tồn kho TT          │
                    │           - Tồn hiện tại        │
                    │           - Hàng đang về        │
                    └─────────────────────────────────┘
```

### Giải Thích Feynman: Logic Size Nữ

> **Hãy tưởng tượng bạn bán nước:**
>
> 🌧️ **Ngày mưa:** Bán được 0 chai → Để 1 chai cho có (hàng mẫu)
>
> ☀️ **Ngày nắng:** Bán được 5 chai → Để 5 chai
>
> 🔥 **Ngày lễ:** Bán được 20 chai → Để tối đa 8 chai (không để quá nhiều)
>
> **Công thức đơn giản:**
> - Không bán → Giữ 1
> - Có bán → Giữ bằng số bán (tối đa 8)

---

## [FLOWCHART B] Logic Size Nam (40-45): Tỉ Suất Bán

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SIZE NAM (40-45) - TỈ SUẤT BÁN                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │  Tính tỉ suất bán:              │
                    │  sellRate = Tổng xuất kho ÷ 30  │
                    │  (trung bình bán/ngày)          │
                    └─────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │  Tỉ suất bán < 0.4?             │
                    │  (Bán chậm: < 12 đôi/tháng?)    │
                    └─────────────────────────────────┘
                              │           │
                        BÁN CHẬM      BÁN NHANH
                        (< 0.4)       (>= 0.4)
                              │           │
                              ▼           ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────────┐
│  🐢 TRƯỜNG HỢP 1: BÁN CHẬM     │   │  🚀 TRƯỜNG HỢP 2: BÁN NHANH        │
│                                 │   │                                     │
│  Tồn kho TT theo size:          │   │  Tồn kho TT = (24 + 10×sellRate)   │
│  • Size 40: 3 đôi               │   │              × hệ số phân bổ       │
│  • Size 41: 5 đôi               │   │                                     │
│  • Size 42: 5 đôi               │   │  Ưu tiên size chính (41,42,43)     │
│  • Size 43: 5 đôi               │   │  Giới hạn size biên (40,44,45)     │
│  • Size 44: 3 đôi               │   │  tối đa 4 đôi                      │
│  • Size 45: 2 đôi               │   │                                     │
│                                 │   │  Chỉ tính nếu:                     │
│  Chỉ tính nếu:                  │   │  Tồn hiện tại < (12 + 10×sellRate) │
│  Tồn hiện tại < 13              │   │                                     │
└─────────────────────────────────┘   └─────────────────────────────────────┘
                              │           │
                              └─────┬─────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │  Cần nhập = Tồn kho TT          │
                    │           - Tồn hiện tại        │
                    │           - Hàng đang về        │
                    └─────────────────────────────────┘
```

### Giải Thích Feynman: Logic Size Nam

> **Hãy tưởng tượng bạn xếp giày trên kệ:**
>
> 🐢 **Mẫu bán chậm:** Như kệ sách ít người đọc
> - Size phổ biến (41,42,43): để 5 cuốn mỗi loại
> - Size hiếm (40,44,45): để ít hơn (2-3 cuốn)
>
> 🚀 **Mẫu bán nhanh:** Như kệ best-seller
> - Càng bán nhanh → càng để nhiều
> - Nhưng size hiếm vẫn giới hạn tối đa 4 cuốn
> - Phần thừa chuyển sang size chính

---

## Flowchart Xuất Kết Quả

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BƯỚC 3: XUẤT KẾT QUẢ                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │  📊 HIỂN THỊ BẢNG KẾT QUẢ       │
                    │  • Mã SKU, Ảnh, Size            │
                    │  • Tồn hiện tại, Hàng đang về   │
                    │  • Tồn kho tối thiểu (mới)      │
                    │  • Số lượng cần nhập            │
                    │  • Giá nhập, Thành tiền         │
                    └─────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
      ┌─────────────────────────┐       ┌─────────────────────────┐
      │  📥 XUẤT EXCEL          │       │  📤 XUẤT FILE SAPO      │
      │  File báo cáo chi tiết  │       │  Import vào hệ thống    │
      │  để review              │       │  quản lý kho            │
      └─────────────────────────┘       └─────────────────────────┘
```

---

## Tóm Tắt: Công Thức Cốt Lõi

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CÔNG THỨC CHUNG                                    │
│                                                                                 │
│     CẦN NHẬP = TỒN KHO TỐI THIỂU - TỒN HIỆN TẠI - HÀNG ĐANG VỀ                │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  📌 SIZE NỮ (36-39):                                                           │
│     Tồn kho TT = MIN(số đã bán tháng trước, 8) hoặc 1 nếu không bán            │
│                                                                                 │
│  📌 SIZE NAM (40-45):                                                           │
│     • Bán chậm: Tồn kho TT theo bảng cố định (40:3, 41:5, 42:5, 43:5, 44:3, 45:2)│
│     • Bán nhanh: Tồn kho TT = (24 + 10×sellRate) × hệ số size                  │
│                                                                                 │
│  📌 NGƯỠNG ĐỂ NHẬP:                                                            │
│     • Mẫu nam/unisex: Tổng cần nhập > 12 đôi                                   │
│     • Mẫu nữ thuần: Tổng cần nhập > 8 đôi                                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Ví Dụ Minh Họa

### Ví dụ 1: Size Nữ - Mẫu ABC123-37

| Thông tin | Giá trị |
|-----------|---------|
| Tồn hiện tại | 2 đôi |
| Hàng đang về | 0 đôi |
| Tháng rồi bán | 6 đôi |

**Tính toán:**
```
Tồn kho TT = MIN(6, 8) = 6 đôi
Cần nhập = 6 - 2 - 0 = 4 đôi
```

### Ví dụ 2: Size Nam - Mẫu XYZ789-42 (Bán chậm)

| Thông tin | Giá trị |
|-----------|---------|
| Tồn hiện tại | 2 đôi |
| Hàng đang về | 0 đôi |
| Tổng xuất kho (cả mã) | 9 đôi |
| Tỉ suất bán | 9 ÷ 30 = 0.3 |

**Tính toán:**
```
sellRate = 0.3 < 0.4 → Bán chậm
Size 42 → Tồn kho TT = 5 đôi
Cần nhập = 5 - 2 - 0 = 3 đôi
```

### Ví dụ 3: Size Nam - Mẫu HOT456-41 (Bán nhanh)

| Thông tin | Giá trị |
|-----------|---------|
| Tồn hiện tại | 3 đôi |
| Hàng đang về | 2 đôi |
| Tổng xuất kho (cả mã) | 45 đôi |
| Tỉ suất bán | 45 ÷ 30 = 1.5 |

**Tính toán:**
```
sellRate = 1.5 >= 0.4 → Bán nhanh
Tổng lý tưởng = 24 + 10×1.5 = 39 đôi
Size 41 (size chính) → Tồn kho TT ≈ 8 đôi
Cần nhập = 8 - 3 - 2 = 3 đôi
```

---

*Tài liệu cập nhật: 2026-01-09*
