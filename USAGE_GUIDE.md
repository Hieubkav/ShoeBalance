# Hướng Dẫn Sử Dụng Hệ Thống Tính Toán Nhập Hàng

## Tổng Quan

Hệ thống này được phát triển để tự động tính toán số lượng cần nhập hàng dựa trên 3 file dữ liệu đầu vào:
1. **Danh sách sản phẩm** - Chứa thông tin SKU, tồn kho tối thiểu, giá nhập
2. **Báo cáo tồn kho** - Chứa thông tin tồn kho hiện tại và hàng đang về
3. **Sổ kho** - Chứa thông tin số lượng xuất kho

## Truy Cập Ứng Dụng

Mở trình duyệt và truy cập: http://localhost:3000

## Các Bước Thực Hiện

### Bước 1: Tải Dữ Liệu

1. Chọn tab **"Tải Dữ Liệu"**
2. Tải lên 3 file theo thứ tự:

   **File 1: Danh sách sản phẩm**
   - Chọn nút "Chọn file sản phẩm"
   - File phải có định dạng CSV hoặc TXT
   - Hệ thống sẽ tự động đọc:
     - Cột N (vị trí 14): Mã SKU
     - Cột R (vị trí 25): Ảnh sản phẩm
     - Cột AC (vị trí 28): Tồn kho tối thiểu
     - Cột AG (vị trí 32): Giá nhập

   **File 2: Báo cáo tồn kho**
   - Chọn nút "Chọn file báo cáo tồn kho"
   - Hệ thống sẽ tự động đọc:
     - Cột B (vị trí 1): Mã SKU
     - Cột E (vị trí 4): Tồn kho hiện tại
     - Cột H (vị trí 7): Hàng đang về

   **File 3: Sổ kho**
   - Chọn nút "Chọn file sổ kho"
   - Hệ thống sẽ tự động đọc:
     - Cột H (vị trí 7): Mã SKU
     - Cột L (vị trí 11): Số lượng xuất kho

3. Kiểm tra các badge hiển thị số lượng bản ghi đã tải thành công

### Bước 2: Tính Toán

1. Chuyển sang tab **"Tính Toán"**
2. Đọc kỹ các điều kiện tính toán được hiển thị
3. Nhấn nút **"Tính Toán Nhập Hàng"**
4. Chờ hệ thống xử lý (thường mất vài giây)

### Bước 3: Xem Kết Quả

1. Chuyển sang tab **"Kết Quả"**
2. Xem bảng kết quả với các thông tin:
   - Mã SKU
   - Mã sản phẩm
   - Size
   - Tồn kho hiện tại
   - Hàng đang về
   - Tồn kho tối thiểu (đã điều chỉnh)
   - Số lượng đã xuất
   - Tỉ suất bán hàng
   - **Số lượng cần nhập** (đánh dấu màu xanh)
   - Giá nhập

3. Nhấn nút **"Xuất CSV"** để tải file kết quả về máy

## Quy Tắc Tính Toán Chi Tiết

### Phân Tích SKU
- **Size**: 2 ký tự cuối của SKU
- **Mã sản phẩm**: SKU bỏ 3 ký tự cuối

### Điều Kiện Lọc
1. **Tồn kho tối thiểu > 0** - Bỏ qua các sản phẩm không có ngưỡng tồn kho
2. **Tổng cần nhập > 12 đôi** - Chỉ lấy các mã sản phẩm có tổng số lượng cần nhập lớn hơn 12

### Công Thức Tính Toán

#### Size Nữ (36-39)
```
Cần nhập = Tồn kho tối thiểu - Tồn kho hiện tại - Hàng đang về
```

#### Size Nam (40-45)

**Trường hợp 1: Tỉ suất bán hàng thấp**
- Điều kiện: `Xuất kho/30 < 0.4` VÀ `Tồn hiện tại < 10`
- Tồn kho tối thiểu mới:
  - Size 40: 3 đôi
  - Size 41, 42, 43: 4 đôi mỗi size
  - Size 44, 45: 3 đôi mỗi size

**Trường hợp 2: Tỉ suất bán hàng cao**
- Điều kiện: `Xuất kho/30 >= 0.4` VÀ `Tồn hiện tại < 12 + 10 * tỉ suất bán`
- Tổng tồn kho lý tưởng = `12 + 12 + 10 * tỉ suất bán`
- Phân bổ:
  - Size 41, 42, 43: 20.58% tổng tồn kho lý tưởng
  - Size 40, 44, 45: (20.58% tổng tồn kho lý tưởng) - 2

## Lưu Ý Quan Trọng

1. **Định dạng file**: Đảm bảo các file có cấu trúc cột đúng như mô tả
2. **Mã SKU**: Phải nhất quán giữa 3 file
3. **Số liệu**: Các số liệu phải là số nguyên hợp lệ
4. **Kết quả**: Chỉ các sản phẩm thỏa mãn tất cả điều kiện mới xuất hiện trong kết quả cuối cùng

## Ví Dụ Minh Họa

Sử dụng file test trong thư mục `test-data/` để thử nghiệm:
- `sample-products.txt` - Danh sách sản phẩm mẫu
- `sample-stock.txt` - Báo cáo tồn kho mẫu
- `sample-ledger.txt` - Sổ kho mẫu

## Xử Lý Lỗi

Nếu gặp lỗi:
1. Kiểm tra lại định dạng file có đúng không
2. Đảm bảo tất cả 3 file đã được tải lên
3. Kiểm tra các mã SKU có khớp nhau không
4. Xem console browser để biết chi tiết lỗi

## Hỗ Trợ

Nếu cần hỗ trợ thêm, vui lòng kiểm tra:
1. Log hệ thống trong terminal
2. Console browser (F12)
3. File README.md để hiểu thêm về kỹ thuật