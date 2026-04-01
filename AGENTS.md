# Core Operating Principles
- Trả lời bằng Tiếng Việt có dấu.
- Tuân thủ KISS, YAGNI, DRY.
- Tuân thủ Rails Convention Over Configuration.
- Không mở rộng scope ngoài yêu cầu.
- Ưu tiên thay đổi nhỏ, dễ rollback.

# Clean-by-construction
- Ưu tiên đọc code kỹ, bám pattern sẵn có để giảm lỗi ngay từ lúc viết.
- Cấm tuyệt đối tự chạy lint/unit test.
- Verification runtime/integration do tester phụ trách.
- Tự review tĩnh trước khi bàn giao: typing, null-safety, edge cases, tương thích dữ liệu cũ.

# Sub-agent Delegation (Speed-first)
- Với task từ mức trung bình trở lên, ưu tiên dùng sub-agent (Task) trước khi tự xử lý tuần tự.
- Mục tiêu tối ưu wall-clock time hơn token cost; chấp nhận “tốn thêm ~80 để nhanh thêm ~20”.
- Luôn kiểm tra custom droids sẵn có; nếu có droid phù hợp thì ưu tiên dùng ngay.
- Khi có thể tách discovery/research/review song song hoặc cần rà nhiều khu vực code, phải cân nhắc Task.
- Ngoại lệ tối thiểu: việc cực nhỏ, một bước, hoặc chỉ sửa vài file đã biết rõ và không lợi từ song song.

# UI/UX Design Guardrails (2026, practical)
- Clarity > Decoration: ưu tiên dễ hiểu, dễ thao tác; nếu đẹp hơn nhưng khó dùng hơn thì chọn dễ dùng.
- Text economy (UI text/microcopy only): nếu rút gọn ~50% số chữ mà người dùng vẫn hiểu đúng ý thì rút; nếu vẫn rút tiếp mà không mất nghĩa thì rút tiếp.
- Responsive-first: thiết kế mobile trước, scale lên desktop; giữ hierarchy và CTA rõ ở breakpoint chính.
- Accessibility-first (WCAG 2.2 AA practical): focus-visible rõ, keyboard navigation OK, contrast đủ đọc, touch target khuyến nghị 44x44px.
- Clean & Premium by system: spacing scale nhất quán, typography rõ cấp bậc, tránh lạm dụng màu/gradient/shadow/animation.
- Micro-checklist trước khi chốt UI: hiểu trong 5 giây? dùng 1 tay được? focus/contrast ổn? có trang trí thừa không?
- Repo note: ưu tiên pattern sẵn có trong Shadcn + Tailwind để giữ đồng bộ.

# Evidence over Opinion
- Tách bạch Observation / Inference / Decision.
- Mọi kết luận phải có evidence: log, file path, line, command output, repro, history.
- Thiếu evidence: nêu rõ gap + cách lấy evidence.
- Khi có nhiều hướng hợp lý: nêu Confidence High/Medium/Low + reason ngắn.

# Audit & Root Cause Protocol
- Trigger Audit khi gặp: fix, bug, lỗi, root cause, spec, optimize, refactor.
- Quy trình bắt buộc: Audit → Root Cause → Fix/Proposal → Verify ( tuyệt đối cấm tự chạy npm run lint hoặc npm run build).
- Trước khi kết luận Root Cause, trả lời tối thiểu 5/8 câu (bắt buộc #1 #3 #6 #8):
  1. Triệu chứng quan sát được là gì (expected vs actual)?
  2. Phạm vi ảnh hưởng (user, module, môi trường)?
  3. Có tái hiện ổn định không? điều kiện tái hiện tối thiểu?
  4. Mốc thay đổi gần nhất (commit/config/dependency/data)?
  5. Dữ liệu nào đang thiếu để kết luận chắc chắn?
  6. Có giả thuyết thay thế hợp lý nào chưa bị loại trừ?
  7. Rủi ro nếu fix sai nguyên nhân là gì?
  8. Tiêu chí pass/fail sau khi sửa?
- DARE (chỉ dùng khi vấn đề phức tạp): Audit → Decompose → Analyze → Reflect → Execute.
- Khi cần phân tích sâu, dùng format:
  ## Problem Graph
  1. [Main] <- depends on 1.1, 1.2
     1.1 [Sub] <- depends on 1.1.1
        1.1.1 [ROOT CAUSE] <- Solve first
     1.2 [Sub]

  ## Execution (with reflection)
  1. Solving 1.1.1...
     - Thought: ...
     - Action: ...
     - Reflection: ✓ Valid / ✗ Retry
  2. ...

# Decision & AskUser Quality Rules
- Chỉ dùng AskUser khi decision ảnh hưởng behavior/API/UX/scope/cost/risk.
- Không đưa option vô nghĩa hoặc dominated (kém hơn + đắt/rủi ro hơn mà không có upside).
- Nếu chỉ có 1 hướng hợp lý, không hỏi; tự quyết và nêu rõ lý do.
- Mỗi option phải theo format:
  - Option X (Recommend) — Confidence 85% (lý do ngắn, gắn evidence/tradeoff).
  - Option Y — Confidence 60% (phù hợp khi ..., tradeoff ...).
- Recommend phải giải thích: vì sao tốt nhất trong ngữ cảnh, tradeoff, evidence.
- Nếu option không recommend vẫn đưa ra, phải nói rõ khi nào phù hợp.
- Giữ 2–4 option thật sự khác nhau về tradeoff.

# Spec Mode Rules
- Pre-Audit → Root Cause → Counter-Hypothesis → Proposal → Post-Audit.
- Plan phải actionable, step-by-step, nêu file nào đổi gì, logic cụ thể.
- Lưu spec ở `.factory/docs`.
- Output spec bắt buộc có 3 block: Audit Summary, Root Cause Confidence (High/Medium/Low + reason), Verification Plan (typecheck/test/repro).
- Quy tắc AskUser tham chiếu ở section Decision & AskUser Quality Rules, không lặp.
- Spec output bắt buộc có `TL;DR kiểu Feynman` (3–6 bullet, nói như cho người mới vào dự án).
- `Files Impacted`: mỗi file có 1 câu mô tả vai trò hiện tại + 1 câu nêu thay đổi; ghi rõ `Sửa:`/`Thêm:`; nếu >5 file thì nhóm theo UI / server / schema / shared.
- `Execution Preview`: liệt kê thứ tự thay đổi chính (đọc/chỉnh, cập nhật logic, nối wiring, review tĩnh).
- `Acceptance Criteria`: điều kiện pass/fail quan sát được.
- `Out of Scope` và `Risk / Rollback` phải có nếu thay đổi ảnh hưởng rộng; `Open Questions` chỉ xuất hiện khi thật sự còn ambiguity.

# Execution & Verification Rules
- Khi user đưa URL localhost, đọc route Next.js tương ứng, không hỏi lại.
- Mọi thay đổi code khi hoàn thành đều phải commit, không push.
- Khi commit luôn add kèm `.factory/docs` (nếu có).
- Trước commit chỉ chạy `bunx tsc --noEmit` khi có thay đổi code/TS; không chạy khi chỉ sửa docs/cấu hình không liên quan.

# Sync Rule
- Nếu sửa guideline cốt lõi ở AGENTS.md thì mirror sang CLAUDE.md trong cùng task.

# 7 Nguyên tắc DB Bandwidth Optimization
- Filter ở DB, không ở JS; không fetch ALL rồi filter/count.
- Không N+1; batch load + Map O(1).
- Luôn có index phù hợp filter/sort.
- Luôn có limit + pagination (default 20, max 100–500).
- Chỉ lấy data cần thiết (projection, no select *).
- Load song song bằng Promise.all cho query độc lập.
- Monitor trước deploy: budget alerts + ước lượng Records × Size × Requests/day; track slow queries >1s.