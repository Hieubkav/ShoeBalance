# Route /test - Workflow Tính Toán Nhập Hàng

> **Ngày cập nhật:** 15/01/2026  
> **Mục đích:** Trang thử nghiệm - Tính toán dựa trên số lượng xuất kho thực tế

---

## 1. Tổng Quan (Feynman Style)

**Ý tưởng cốt lõi:** Tháng trước bán bao nhiêu thì tháng sau chuẩn bị bấy nhiêu.

Giống như bạn bán nước chanh:
- Tuần trước bán được 10 ly → Tuần này chuẩn bị 10 ly
- Size nữ (36-39): Giới hạn max 8 đôi vì ít người mua
- Size nam (40-45): Không giới hạn vì bán chạy hơn

**Ngoại lệ:** Nếu hàng bán chậm (ế) → giữ nguyên công thức cũ để không nhập quá nhiều.

---

## 2. Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│                    BẮT ĐẦU TÍNH TOÁN                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ minStock > 0 ?  │
                    └─────────────────┘
                      │           │
                     NO          YES
                      │           │
                      ▼           ▼
                   [BỎ QUA]   ┌─────────────────┐
                              │  Xác định SIZE  │
                              └─────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
          ┌─────────────────┐                 ┌─────────────────┐
          │  SIZE NỮ 36-39  │                 │  SIZE NAM 40-45 │
          └─────────────────┘                 └─────────────────┘
                    │                                   │
                    ▼                                   ▼
          ┌─────────────────┐                 ┌─────────────────┐
          │ skuSellRate     │                 │ sellRate        │
          │ >= 0.27 ?       │                 │ >= 0.4 ?        │
          │ (>=8 đôi/tháng) │                 │ (>=12 đôi/tháng)│
          └─────────────────┘                 └─────────────────┘
            │           │                       │           │
           YES         NO                      YES         NO
            │           │                       │           │
            ▼           ▼                       ▼           ▼
     ┌───────────┐ ┌───────────┐        ┌───────────┐ ┌───────────┐
     │ BÁN NHANH │ │ BÁN CHẬM  │        │ BÁN NHANH │ │ BÁN CHẬM  │
     │           │ │           │        │           │ │           │
     │ TồnKhoTT  │ │ Giữ hàng  │        │ TồnKhoTT  │ │ Theo bảng │
     │ = MIN(    │ │ mẫu (1-8) │        │ = xuất kho│ │ size cố   │
     │ xuất kho, │ │           │        │ 30 ngày   │ │ định      │
     │ 8)        │ │           │        │ (KHÔNG    │ │           │
     │           │ │           │        │ giới hạn) │ │           │
     └───────────┘ └───────────┘        └───────────┘ └───────────┘
            │           │                       │           │
            └─────┬─────┘                       └─────┬─────┘
                  │                                   │
                  └─────────────────┬─────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ needImport = TồnKhoTT         │
                    │            - currentStock     │
                    │            - incomingStock    │
                    └───────────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │ needImport > 0 ?│
                          └─────────────────┘
                            │           │
                           YES         NO
                            │           │
                            ▼           ▼
                    ┌─────────────┐  [BỎ QUA]
                    │ THÊM VÀO   │
                    │ KẾT QUẢ    │
                    └─────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │ Gộp theo mã SP, kiểm tra    │
              │ ngưỡng (>12 nam, >8 nữ)     │
              └─────────────────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │    KẾT THÚC     │
                    └─────────────────┘
```

---

## 3. Công Thức Tính Toán

### 3.1. Điều kiện tiên quyết
- Tồn kho tối thiểu (minStock) > 0

### 3.2. Size Nữ (36-39)

```javascript
skuExport = số xuất kho 30 ngày của SKU cụ thể
skuSellRate = skuExport / 30

// BÁN NHANH (>= 8 đôi/tháng, tức skuSellRate >= 0.27)
if (skuSellRate >= 0.27) {
  newMinStock = Math.min(skuExport, 8)  // Giới hạn tối đa 8 đôi
}

// BÁN CHẬM (< 8 đôi/tháng)
else {
  if (skuExport === 0) {
    newMinStock = 1  // Giữ hàng mẫu
  } else {
    newMinStock = Math.min(skuExport, 8)
  }
}

needImport = newMinStock - currentStock - incomingStock
```

### 3.3. Size Nam (40-45)

```javascript
totalExport = tổng xuất kho 30 ngày của MÃ SẢN PHẨM (tất cả size)
sellRate = totalExport / 30
skuExport = số xuất kho 30 ngày của SKU cụ thể

// BÁN CHẬM (sellRate < 0.4) VÀ tồn kho < 13
if (sellRate < 0.4 && currentStock < 13) {
  sizeMinStocks = { '40': 3, '41': 5, '42': 5, '43': 5, '44': 3, '45': 2 }
  newMinStock = sizeMinStocks[size]
}

// BÁN NHANH (sellRate >= 0.4)
else if (sellRate >= 0.4) {
  newMinStock = skuExport  // Tồn kho TT = số xuất kho 30 ngày (KHÔNG giới hạn)
}

needImport = newMinStock - currentStock - incomingStock
```

---

## 4. So Sánh Với Trang Chủ

| Tiêu chí | Trang chủ `/` | Trang test `/test` |
|----------|---------------|-------------------|
| Size nữ bán nhanh | MIN(xuất kho, 8) | MIN(xuất kho, 8) |
| Size nam bán nhanh | Công thức phức tạp (ưu tiên size) | = Số xuất kho 30 ngày |
| Giới hạn size nam | Có (max 4 cho size biên) | Không giới hạn |

---

## 5. Ngưỡng Nhập Hàng

| Loại sản phẩm | Ngưỡng |
|---------------|--------|
| Nam thuần (chỉ có size 40-45) | > 12 đôi |
| Nữ thuần (chỉ có size 36-39) | > 8 đôi |
| Unisex (có cả size nam và nữ) | > 12 đôi |

---

## 6. File Liên Quan

- **Page:** `src/app/test/page.tsx`

---

## 7. Ví Dụ Tính Toán

### Size nam bán nhanh:
- SKU: ABC-42, xuất kho 30 ngày = 15 đôi
- Tồn kho hiện tại = 5, Hàng đang về = 2
- **Tồn kho TT = 15 đôi**
- Cần nhập = 15 - 5 - 2 = **8 đôi**

### Size nữ bán nhanh:
- SKU: DEF-38, xuất kho 30 ngày = 12 đôi
- Tồn kho hiện tại = 3, Hàng đang về = 1
- **Tồn kho TT = MIN(12, 8) = 8 đôi**
- Cần nhập = 8 - 3 - 1 = **4 đôi**
