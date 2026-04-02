## Audit Summary
- Observation:
  - Route Next.js production nằm ở `src/app/api/tq-update/route.ts`, nhận 2 file rồi gọi `processTqUpdate(...)`.
  - `processTqUpdate` hiện dùng thư viện `xlsx` (`src/lib/tq-update/process-tq-update.ts`) để đọc cả input và ghi output.
  - Dự án Laravel `ThanShoes` xử lý route tương đương bằng PhpSpreadsheet, có fallback chọn sheet và nhận diện 2 format report khá giống logic Next.js.
  - UI ở `src/app/tq-update/page.tsx` chỉ hiển thị lỗi chung `Không thể xử lý file.` khi API trả non-200, nên production đang fail ở server-side chứ không phải client-side.
  - Repo Next.js đã cài cả `xlsx` lẫn `exceljs`; các flow export khác trong repo đang dùng `exceljs` (`src/lib/sapo-export.ts`, `src/lib/trungquoc-export.ts`).
- Inference:
  - Lỗi production nhiều khả năng không phải do thiếu route hay sai form-data, mà do parser/writer server-side với `xlsx` bị vấp trên môi trường Vercel hoặc trên đúng file Excel thực tế.
  - Vì local “không giống” Laravel và production còn fail hẳn, có khả năng tồn tại 2 lớp vấn đề: (1) sai khác logic parse/normalize, (2) lỗi runtime khi đọc/ghi workbook bằng `xlsx` trên production.

## Root Cause Confidence
- Medium — đã có evidence mạnh rằng điểm fail nằm trong server-side parsing/writing của route Next.js, nhưng chưa có log production cụ thể nên chưa chốt 100% lỗi ở bước `read`, `parse`, hay `write`.

## TL;DR kiểu Feynman
- Trang `/tq-update` trên prod không hỏng ở nút bấm, mà hỏng ở đoạn server đọc/xử lý file Excel.
- Bản Next.js đang dùng `xlsx`, trong khi repo đã có sẵn `exceljs` và dự án Laravel tương đương đang dùng thư viện khác ổn định hơn cho file thực tế.
- Có thể cùng lúc có 2 vấn đề: code parse chưa giống Laravel hoàn toàn, và `xlsx` fail với một số file khi chạy production.
- Hướng an toàn nhất là audit lại parser theo flow Laravel, đồng thời đổi phần đọc/ghi workbook của route này sang `exceljs` để đồng bộ với pattern sẵn có trong repo.
- Sau đó chỉ cần typecheck và review tĩnh; không chạy lint/build theo guideline repo.

## Problem Graph
1. `/tq-update` production trả `Không thể xử lý file`
   1.1 Route API fail trong `try/catch`
      1.1.1 [ROOT CAUSE - giả thuyết mạnh] `xlsx.read(...)` hoặc `XLSX.write(...)` fail trên file thực tế / môi trường production
      1.1.2 Parser gặp cell/sheet format lệch và throw ở bước xử lý
   1.2 Kết quả local lệch Laravel
      1.2.1 Logic parse/normalize sheet chưa bám sát hoàn toàn flow Laravel
      1.2.2 Cách lấy raw/display value giữa thư viện khác nhau làm lệch SKU/size/quantity

## Files Impacted
### server
- `Sửa: src/app/api/tq-update/route.ts`
  - Vai trò hiện tại: nhận upload và trả file Excel download.
  - Thay đổi: tăng quality của error handling để phân biệt lỗi validate / parse / build, đồng thời giữ response an toàn cho client.

- `Sửa: src/lib/tq-update/process-tq-update.ts`
  - Vai trò hiện tại: orchestration đọc workbook bằng `xlsx`, parse data, build output và ghi buffer.
  - Thay đổi: chuyển phần read/write workbook sang `exceljs` hoặc adapter tương đương ổn định hơn với production; giữ contract đầu ra không đổi.

- `Sửa: src/lib/tq-update/parse-report.ts`
  - Vai trò hiện tại: chọn sheet, detect warehouse format, parse report data.
  - Thay đổi: audit kỹ lại cách đọc cell/header để khớp Laravel hơn, thêm guard cho sheet/cột/header thiếu hoặc cell format bất thường.

- `Sửa: src/lib/tq-update/parse-sapo.ts`
  - Vai trò hiện tại: đọc sheet đầu và lấy row từ dòng 8.
  - Thay đổi: tăng normalize/guard để tránh break vì cell rỗng / rich text / numeric formatting.

- `Sửa: src/lib/tq-update/build-output.ts`
  - Vai trò hiện tại: dựng workbook output.
  - Thay đổi: nếu đổi sang `exceljs`, file này sẽ dùng builder cùng thư viện để xuất file ổn định hơn.

### shared
- `Sửa: src/lib/tq-update/types.ts`
  - Vai trò hiện tại: kiểu dữ liệu cho flow `/tq-update`.
  - Thay đổi: bổ sung type cho lỗi parse hoặc metadata debug tối thiểu nếu cần.

## Execution Preview
1. Đọc các file `build-output.ts` và `types.ts` để chốt contract hiện tại trước khi đổi implementation.
2. So sánh từng bước parse với flow Laravel: sheet selection, warehouse detection, row/column mapping, quantity normalization.
3. Đề xuất thay lớp đọc/ghi workbook của route này từ `xlsx` sang `exceljs` để bám pattern đã dùng trong repo.
4. Gia cố parser với guard/fail-fast message rõ hơn cho trường hợp sheet thiếu, header lệch, cell không parse được.
5. Giữ nguyên UI page, chỉ tinh chỉnh thông điệp lỗi nếu thật sự cần để phân biệt lỗi validate với lỗi xử lý file.
6. Tự review tĩnh null-safety, edge cases, backward compatibility.
7. Chạy `bunx tsc --noEmit` trước commit theo guideline repo nếu có thay đổi TS/code.
8. Commit local, không push.

## Proposal
### Option A (Recommend) — Confidence 85%
- Audit logic rồi chuyển read/write của `/tq-update` sang `exceljs`, đồng thời giữ parser khớp Laravel hơn.
- Vì sao recommend: repo đã dùng `exceljs` ở các flow export khác; giảm rủi ro runtime của `xlsx` trên production; thay đổi scope vừa đủ, rollback dễ.

### Option B — Confidence 65%
- Giữ `xlsx`, chỉ vá parser/guard và tăng logging lỗi.
- Phù hợp khi muốn patch nhỏ nhất có thể; tradeoff là vẫn giữ nguyên điểm nghi ngờ lớn nhất ở production runtime.

## Acceptance Criteria
- Upload đúng 2 file trên production không còn trả `Không thể xử lý file.` với bộ file đang lỗi hiện tại.
- Output khớp logic Laravel cho cùng input ở mức SKU-size được giữ lại.
- Trường hợp file sai định dạng hoặc sheet thiếu dữ liệu trả lỗi rõ hơn, không fail mơ hồ.
- Không mở rộng scope sang route khác, auth, hay debug endpoint.

## Verification Plan
- Typecheck: `bunx tsc --noEmit`.
- Repro logic: đối chiếu cùng một cặp file với flow Laravel và Next.js sau sửa, kiểm tra số dòng output / SKU-size match.
- Post-audit: đọc lại diff để xác nhận chỉ chạm đúng flow `/tq-update`, không làm ảnh hưởng các tool import/export khác.

## Risk / Rollback
- Risk: đổi thư viện xử lý workbook có thể làm thay đổi nhẹ format output.
- Mitigation: giữ nguyên header/cột và contract filename/response.
- Rollback: revert commit route `/tq-update` vì thay đổi cô lập trong thư mục `src/lib/tq-update` và API route tương ứng.

## Out of Scope
- Thêm auth cho `/tq-update`.
- Tạo debug endpoint riêng.
- Sửa các route import/export khác.

Nếu bạn duyệt, tôi sẽ triển khai theo Option A.