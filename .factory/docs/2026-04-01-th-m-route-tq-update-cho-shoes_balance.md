## Audit Summary
- Observation:
  - Dự án Laravel `ThanShoes` có 3 route liên quan: `GET /tq-update`, `POST /tq-update`, `POST /tq-update/debug` trong `routes/web.php`, nằm sau `auth`.
  - Luồng chính của `/tq-update` là: upload 2 file Excel (`sapo_file`, `report_file`) → parse report theo 2 format → lọc các dòng Sapo theo cặp `sku-size` → sinh file Excel SAPO để tải xuống.
  - Dự án Next.js hiện đã có pattern phù hợp để xử lý file Excel bằng `xlsx`/`exceljs` và có trang upload dữ liệu tại `src/app/test/page.tsx`; dependencies `xlsx` và `exceljs` đã cài sẵn trong `package.json`.
- Inference:
  - Không cần port nguyên xi Laravel. Best practice trong bối cảnh hiện tại là tách logic parse/lọc ra lib dùng chung ở server, expose một route tải file trực tiếp, và có page `/tq-update` tối giản để upload 2 file và nhận file `.xlsx` trả về.
  - Vì user muốn “dùng bình thường khỏi login”, route nên public như các route tool nội bộ hiện có, nhưng giữ logic thuần server để dễ siết quyền sau này.

## Root Cause Confidence
- High — vì đã lần đủ flow end-to-end từ route → controller → action → view ở Laravel, đồng thời đã đọc route/page pattern hiện có ở Next.js và xác nhận sẵn thư viện xử lý Excel.

## TL;DR kiểu Feynman
- Route cũ `/tq-update` chỉ là một công cụ lọc file SAPO bằng danh sách SKU-size đọc từ file báo cáo Trung Quốc.
- User tải lên 2 file, hệ thống đọc dữ liệu, giữ lại đúng các dòng cần nhập hàng, rồi xuất 1 file Excel mới để tải về.
- Ở Next.js, cách gọn nhất là làm 1 trang `/tq-update` để chọn file và 1 endpoint server nhận form-data.
- Endpoint sẽ parse Excel, lọc dữ liệu, tạo workbook mới trong memory và trả file download luôn.
- Không cần debug endpoint, không cần login, không cần lưu file tạm lên disk.

## Proposal
### Option A (Recommend) — Confidence 90%
Page `/tq-update` + server route xử lý upload/download trực tiếp.

Vì sao recommend:
- Khớp UX Laravel nhất nhưng implementation sạch hơn.
- Không ghi file tạm ra `public/`, tránh race condition khi nhiều người dùng cùng lúc.
- Dễ tách logic dùng chung và dễ test tĩnh.
- Phù hợp yêu cầu của bạn: public route, không login, không debug endpoint, download trực tiếp.

### Luồng dự kiến
1. User mở `/tq-update`.
2. Page hiển thị 2 input file: `sapo_file`, `report_file`.
3. Submit `multipart/form-data` đến API/route handler server.
4. Server:
   - validate có đủ 2 file và đúng extension Excel,
   - parse file báo cáo TQ,
   - sinh set `sku-size`,
   - parse file Sapo,
   - lọc các dòng khớp,
   - tạo workbook output trong memory,
   - trả về response với headers download `.xlsx`.
5. Client nhận blob và tải file ngay.

## Files Impacted
### UI
- `Sửa: src/app/test/page.tsx`
  - Vai trò hiện tại: trang tool test import hàng, có pattern upload file Excel và export.
  - Thay đổi: không sửa file này để tránh mở rộng scope; chỉ tham chiếu pattern UI/parse đang có.

- `Thêm: src/app/tq-update/page.tsx`
  - Vai trò hiện tại: chưa có.
  - Thay đổi: tạo trang upload 2 file theo pattern Shadcn hiện có, submit lên server và trigger download file kết quả.

### server
- `Thêm: src/app/api/tq-update/route.ts`
  - Vai trò hiện tại: chưa có.
  - Thay đổi: nhận `formData`, validate input, gọi logic xử lý, trả file Excel download trực tiếp.

- `Thêm: src/lib/tq-update/types.ts`
  - Vai trò hiện tại: chưa có.
  - Thay đổi: định nghĩa các kiểu dữ liệu cho row Sapo, report rows, key `sku-size`, metadata output.

- `Thêm: src/lib/tq-update/parse-report.ts`
  - Vai trò hiện tại: chưa có.
  - Thay đổi: parse report TQ theo 2 format đang có ở Laravel:
    - Warehouse format: nhận diện bằng cột `L = Pairs` và `O = SKU`.
    - Report nhập hàng format: SKU ở cột D, size ở E–N.

- `Thêm: src/lib/tq-update/parse-sapo.ts`
  - Vai trò hiện tại: chưa có.
  - Thay đổi: đọc workbook Sapo từ sheet đầu, lấy dữ liệu từ dòng 8 và các cột A–J như logic Laravel.

- `Thêm: src/lib/tq-update/build-output.ts`
  - Vai trò hiện tại: chưa có.
  - Thay đổi: dựng workbook kết quả từ các dòng Sapo đã lọc, giữ cấu trúc cột tương thích file đầu ra.

- `Thêm: src/lib/tq-update/process-tq-update.ts`
  - Vai trò hiện tại: chưa có.
  - Thay đổi: orchestration toàn bộ flow parse → filter → build workbook; trả về `Buffer` + filename.

## Logic chi tiết sẽ port
### 1) Parse report file
- Nếu là warehouse format:
  - Duyệt từ dòng 2 trở đi.
  - SKU lấy từ cột O.
  - Các size có quantity > 0 lấy từ vùng size columns, tạo key `SKU-SIZE`.
- Nếu là report nhập hàng format:
  - SKU ở cột D.
  - Size ở cột E–N.
  - Quantity > 0 thì thêm vào set `SKU-SIZE`.

### 2) Parse Sapo file
- Đọc sheet đầu.
- Bỏ qua 7 dòng đầu; bắt đầu từ dòng 8.
- Mỗi dòng lấy tối thiểu các cột A–J để giữ cấu trúc export tương thích.
- Từ SKU/size của dòng Sapo tạo key để match với set từ report.

### 3) Filter
- Chỉ giữ row Sapo có key `sku-size` xuất hiện trong set từ report.
- Loại duplicate bằng set để tránh ghi lặp.

### 4) Build output
- Tạo workbook mới trong memory.
- Ghi header/cấu trúc cột cần thiết theo output thực tế của route Laravel.
- Đặt tên file kiểu `nhap_hang_sapo.xlsx` hoặc biến thể an toàn theo timestamp.

## Execution Preview
1. Đọc pattern UI hiện có để bám style Shadcn/Tailwind.
2. Tạo lib xử lý server-side cho parse report và parse Sapo.
3. Tạo hàm orchestration build file output trong memory.
4. Tạo route handler `src/app/api/tq-update/route.ts` để nhận upload và trả file download.
5. Tạo page `src/app/tq-update/page.tsx` để upload 2 file và tải kết quả.
6. Static review: types, null-safety, edge cases, compatibility với 2 format report.
7. Nếu có thay đổi code/TS, trước commit chỉ chạy `bunx tsc --noEmit` theo guideline repo.
8. Commit local, không push.

## Acceptance Criteria
- Truy cập được `/tq-update` và thấy form upload 2 file.
- Submit thiếu file hoặc sai định dạng nhận lỗi rõ ràng.
- Submit đúng 2 file hợp lệ trả về file `.xlsx` tải trực tiếp.
- File output chỉ chứa các dòng Sapo có `sku-size` nằm trong report TQ.
- Không tạo endpoint debug riêng.
- Không yêu cầu đăng nhập để dùng route.
- Không ghi file tạm vào `public/` để tránh ghi đè chéo user.

## Verification Plan
- Typecheck: `bunx tsc --noEmit` nếu có thay đổi code TypeScript.
- Repro thủ công: mở `/tq-update`, upload 2 file mẫu, xác nhận browser tải file về.
- Kiểm tra pass/fail bằng cách đối chiếu số dòng output với số key match mong đợi từ report.
- Review tĩnh các edge cases: file rỗng, sheet thiếu cột, quantity không hợp lệ, SKU trống, size không parse được.

## Risk / Rollback
- Risk chính: format Excel thực tế có thể lệch nhẹ so với assumption về cột/row.
- Giảm rủi ro: giữ parser tách module, fail-fast với lỗi mô tả rõ sheet/cột thiếu.
- Rollback đơn giản: revert commit thêm route mới, không ảnh hưởng route hiện hữu vì không sửa flow cũ.

## Out of Scope
- Thêm auth/permission cho `/tq-update`.
- Thêm debug endpoint `/tq-update/debug`.
- Tích hợp lưu lịch sử xử lý hoặc lưu file lên disk/cloud.
- Refactor trang `/test` hoặc các route import hiện có.

Nếu bạn đồng ý, tôi sẽ triển khai theo Option A.