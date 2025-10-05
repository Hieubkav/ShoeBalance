# Hệ Thống Tính Toán Nhập Hàng

Hệ thống tự động tính toán số lượng cần nhập hàng dựa trên dữ liệu tồn kho, sổ kho và danh sách sản phẩm.

## Tính Năng

- 📊 Tải lên 3 file dữ liệu (Danh sách sản phẩm, Báo cáo tồn kho, Sổ kho)
- 🧮 Tự động tính toán số lượng cần nhập hàng theo các điều kiện kinh doanh
- 📈 Phân tích tỉ suất bán hàng và tối ưu tồn kho
- 📋 Xuất kết quả ra file CSV
- 🎯 Giao diện thân thiện, dễ sử dụng

## Điều Kiện Tính Toán

### Điều Kiện Chung
- **Tồn kho tối thiểu > 0** mới bắt đầu xem xét nhập hàng
- **Tổng số lượng cần nhập của 1 mã sản phẩm phải > 12** mới được đưa vào danh sách

### Size Nữ (36-39)
```
Cần nhập = Tồn kho tối thiểu - Tồn kho hiện tại - Hàng đang về
```

### Size Nam (40-45)

#### Trường hợp 1: Tỉ suất bán hàng thấp
- Điều kiện: `số lượng xuất kho / 30 < 0.4` VÀ `tồn kho hiện tại < 10`
- Tồn kho tối thiểu mới:
  - Size 40: 3 đôi
  - Size 41: 4 đôi
  - Size 42: 4 đôi
  - Size 43: 4 đôi
  - Size 44: 3 đôi
  - Size 45: 3 đôi

#### Trường hợp 2: Tỉ suất bán hàng cao
- Điều kiện: `số lượng xuất kho / 30 >= 0.4` VÀ `tồn kho hiện tại < 12 + 10 * tỉ suất bán hàng`
- Tổng tồn kho lý tưởng = `12 + 12 + 10 * tỉ suất bán hàng`
- Phân bổ theo size:
  - Size 41, 42, 43: Mỗi size chiếm 20.58% tổng tồn kho lý tưởng
  - Size 40, 44, 45: Mỗi size ít hơn size 41 là 2 đôi

## Cấu Trúc File Dữ Liệu

### File 1: Danh Sách Sản Phẩm
- **Vị trí N2 trở xuống**: Mã SKU
- **Vị trí R2 trở xuống**: Ảnh sản phẩm
- **Vị trí AC2 trở xuống**: Tồn kho tối thiểu (rỗng = 0)
- **Vị trí AG2 trở xuống**: Giá nhập

### File 2: Báo Cáo Tồn Kho
- **Vị trí B6 trở xuống**: Mã SKU
- **Vị trí E6 trở xuống**: Tồn kho hiện tại
- **Vị trí H6 trở xuống**: Hàng đang về

### File 3: Sổ Kho
- **Vị trí H6 trở xuống**: Mã SKU
- **Vị trí L6 trở xuống**: Số lượng xuất kho

## Cách Sử Dụng

1. **Tải Dữ Liệu**:
   - Chọn tab "Tải Dữ Liệu"
   - Tải lên 3 file theo đúng thứ tự
   - Kiểm tra số lượng bản ghi đã tải

2. **Tính Toán**:
   - Chuyển sang tab "Tính Toán"
   - Nhấn nút "Tính Toán Nhập Hàng"
   - Chờ hệ thống xử lý

3. **Xem Kết Quả**:
   - Chuyển sang tab "Kết Quả"
   - Xem danh sách sản phẩm cần nhập
   - Nhấn "Xuất CSV" để tải file kết quả

## Cài Đặt

```bash
npm install
npm run dev
```

Ứng dụng sẽ chạy tại http://localhost:3000

## Công Nghệ

- **Next.js 15** với App Router
- **TypeScript** cho type safety
- **Tailwind CSS** cho styling
- **Shadcn/ui** cho components
- **Lucide React** cho icons

## Ghi Chú

- Hệ thống xử lý tự động việc trích xuất 2 ký tự cuối của SKU để lấy size
- Mã sản phẩm được xác định bằng cách bỏ 3 ký tự cuối của SKU
- File hỗ trợ định dạng CSV và TXT
- Tất cả tính toán được thực hiện phía client để đảm bảo bảo mật dữ liệu