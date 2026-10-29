# GIÁO TRÌNH TOÀN DIỆN VỀ AI EVALUATION, BENCHMARK & QUALITY GATES: TỪ CƠ BẢN ĐẾN PRODUCTION
## Sổ Tay Kỹ Thuật Đánh Giá Chất Lượng Hệ Thống AI, Khung Đánh Giá 6 Giai Đoạn, Thẩm Định Viên Hiệu Chuẩn (Calibrated Judge), Bộ Chỉ Số RAGAS & Cổng Kiểm Soát CI/CD Cho Kỹ Sư AI
**Tác giả:** Đội ngũ Kỹ sư Trưởng Đo Lường & Đánh Giá Chất Lượng Hệ Thống AI (Senior AI Evaluation & Quality Assurance Architects)  
**Tài liệu tham chiếu:** VinAI Research (Phase 1 Day 14, Track 1 Day 20–21, Track 3 Day 24), VinUni Capstone, Chuẩn đo lường Ragas, Stanford HELM, DeepEval, Braintrust, LangSmith Tracing  
**Dành cho:** Sinh viên Khóa luận Tốt nghiệp, AI Quality Assurance (AI QA) Engineers, MLOps/LLMOps Engineers, AI Product Managers & Tech Leads  
**Phiên bản:** 2026 Production Edition — Xóa Bỏ Cảm Tính (Vibe-Based), Tiến Lên Khoa Học Đo Lường Thực Nghiệm (Empirical Rigor)  

---

# LỜI NÓI ĐẦU: VƯỢT QUA CHIẾC BẪY "CẢM TÍNH" (THE VIBE-BASED EVALUATION TRAP)

Năm 2023–2024, khi phát triển ứng dụng LLM, đại đa số kỹ sư kiểm thử sản phẩm của mình theo phương pháp **"Cảm tính" (Vibe-based Evaluation)**:
* Chạy thử 3 – 5 câu hỏi trên Terminal.
* Thấy câu trả lời "có vẻ mượt", "văn phong trôi chảy", "trả lời dài và lịch sự".
* Tự tin kết luận: *"Hệ thống hoạt động xuất sắc, sẵn sàng triển khai!"*

Tuy nhiên, khi mang hệ thống đó ra môi trường sản xuất thực tế (Production) phục vụ hàng nghìn người dùng, sản phẩm **sụp đổ ngay trong tuần đầu tiên** vì:
1. **Hiện tượng ảo giác ngầm (Subtle Hallucinations):** Câu trả lời nghe rất thuyết phục, từ ngữ hoa mỹ nhưng số liệu phạt 8% hay số hiệu Nghị định bị bịa đặt hoàn toàn.
2. **Hiệu ứng "Bong bóng chăn" (The Blanket Effect / Regression):** Kỹ sư sửa System Prompt để cải thiện câu hỏi A, nhưng vô tình làm hỏng kết quả của 20 câu hỏi B, C, D khác mà không hề hay biết do không có bộ test hồi quy tự động (Regression Testing).
3. **Thẩm định viên thiên vị (Judge Biases):** Khi dùng một LLM khác để chấm điểm (LLM-as-a-Judge), mô hình giám khảo thường mắc các tật xấu bẩm sinh:
   - *Verbosity Bias:* Thích câu trả lời dài dòng hơn câu trả lời ngắn gọn, dù câu ngắn mới đúng trọng tâm.
   - *Self-Enhancement Bias:* Mô hình GPT-4o luôn có xu hướng chấm điểm cao hơn cho các câu trả lời do chính GPT sinh ra so với Claude hay Gemini.
   - *Position Bias:* Ưu tiên cho điểm cao hơn đối với đáp án nằm ở vị trí đầu tiên trong prompt.

$$\mathbf{Production\ AI\ Readiness = Empirical\ Benchmark + Calibrated\ Judge + Strict\ Quality\ Gates}$$
> *"Nếu bạn không thể đo lường một hệ thống AI bằng các con số định lượng và bằng chứng toán học, bạn hoàn toàn không có quyền đưa nó ra thị trường phục vụ con người!"*

Giáo trình này cung cấp toàn bộ bộ khung đo lường thực nghiệm chuẩn mực nhất của VinAI: từ triết lý **3 Làn Đánh Giá (3 Evaluation Lanes)**, quy trình thiết kế ma trận bao phủ 6 giai đoạn, kỹ nghệ hiệu chuẩn thẩm định viên bằng ma trận nhầm lẫn (Confusion Matrix), tính toán hệ số đồng thuận khoa học Cohen's Kappa ($\kappa \ge 0.81$), bộ 4 chỉ số RAGAS toán học, cho đến cổng kiểm soát chất lượng tự động chặn đứng lỗi trong đường ống CI/CD.

---

# MỤC LỤC CHI TIẾT

* [CHƯƠNG 1: TÔN CHỈ ĐO LƯỜNG & KIẾN TRÚC 3 LÀN ĐÁNH GIÁ (THE 3 EVALUATION LANES)](#chương-1-tôn-chỉ-đo-lường--kiến-trúc-3-làn-đánh-giá-the-3-evaluation-lanes)
* [CHƯƠNG 2: THIẾT KẾ MA TRẬN BAO PHỦ (COVERAGE GRID) & XÂY DỰNG GOLDEN DATASET](#chương-2-thiết-kế-ma-trận-bao-phủ-coverage-grid--xây-dựng-golden-dataset)
* [CHƯƠNG 3: LÀN 1 — KIỂM TRA MÃ NGUỒN TẤT ĐỊNH (DETERMINISTIC CODE CHECKS)](#chương-3-làn-1--kiểm-tra-mã-nguồn-tất-định-deterministic-code-checks)
* [CHƯƠNG 4: LÀN 2 — KỸ NGHỆ HIỆU CHUẨN THẨM ĐỊNH VIÊN (CALIBRATED LLM-AS-A-JUDGE)](#chương-4-làn-2--kỹ-nghệ-hiệu-chuẩn-thẩm-định-viên-calibrated-llm-as-a-judge)
* [CHƯƠNG 5: LÀN 3 — NỀN TẢNG TOÁN HỌC CỦA ĐỒNG THUẬN: HỆ SỐ COHEN'S KAPPA ($\kappa$) & FLEISS' KAPPA](#chương-5-làn-3--nền-tảng-toán-học-của-đồng-thuận-hệ-số-cohens-kappa-κ--fleiss-kappa)
* [CHƯƠNG 6: BỘ 4 CHỈ SỐ RAGAS TOÁN HỌC & ĐO LƯỜNG CHẤT LƯỢNG RAG](#chương-6-bộ-4-chỉ-số-ragas-toán-học--đo-lường-chất-lượng-rag)
* [CHƯƠNG 7: ĐÁNH GIÁ QUỸ ĐẠO SUY LUẬN CỦA TÁC TỬ (AGENT TRAJECTORY & TOOL-CALL EVALS)](#chương-7-đánh-giá-quỹ-đạo-suy-luận-của-tác-tử-agent-trajectory--tool-call-evals)
* [CHƯƠNG 8: PHÂN TÍCH LÁT CẮT DỮ LIỆU (SLICE-BASED ANALYSIS) & MÔ HÌNH HÓA DẠNG LỖI (FAILURE MODES)](#chương-8-phân-tích-lát-cắt-dữ-liệu-slice-based-analysis--mô-hình-hóa-dạng-lỗi-failure-modes)
* [CHƯƠNG 9: CỔNG KIỂM SOÁT CHẤT LƯỢNG (QUALITY GATES) TRONG CI/CD GITHUB ACTIONS](#chương-9-cổng-kiểm-soát-chất-lượng-quality-gates-trong-cicd-github-actions)
* [CHƯƠNG 10: FULL-STACK REFERENCE EVALUATION ENGINE (MÃ NGUỒN CHUẨN DOANH NGHIỆP)](#chương-10-full-stack-reference-evaluation-engine-mã-nguồn-chuẩn-doanh-nghiệp)
* [CHƯƠNG 11: BỘ 15 CÂU HỎI VẤN ĐÁP HỘI ĐỒNG BẢO VỆ KHOÁ LUẬN TỐT NGHIỆP / SENIOR AI QA ARCHITECT](#chương-11-bộ-15-câu-hỏi-vấn-đáp-hội-đồng-bảo-vệ-khoá-luận-tốt-nghiệp--senior-ai-qa-architect)

---

# CHƯƠNG 1: TÔN CHỈ ĐO LƯỜNG & KIẾN TRÚC 3 LÀN ĐÁNH GIÁ (THE 3 EVALUATION LANES)

Một trong những phát kiến quan trọng nhất của giáo trình VinAI AI20K là việc phân tách quy trình đánh giá thành **3 Làn độc lập (3 Evaluation Lanes)**. Không bao giờ giao phó toàn bộ việc chấm điểm cho một phương pháp duy nhất:

```
┌────────────────────────────────────────────────────────────────────────┐
│ KIẾN TRÚC 3 LÀN ĐÁNH GIÁ CHẤT LƯỢNG HỆ THỐNG AI (3-LANE EVAL ENGINE)    │
├────────────────────────────────────────────────────────────────────────┤
│ LÀN 1: CODE-BASED CHECKS (TẤT ĐỊNH 100%, CHI PHÍ = $0, TỐC ĐỘ < 10ms)  │
│ • Kiểm tra cấu trúc JSON (Pydantic Schema Validation).                 │
│ • Kiểm tra sự tồn tại của nguồn trích dẫn: `doc_id#section_id`.        │
│ • Kiểm tra so khớp nguyên văn NFKC (Verbatim Quote Matching ≥ 80%).    │
├───────────────────────────────────┬────────────────────────────────────┤
│                                   ▼                                    │
│ LÀN 2: CALIBRATED LLM-AS-A-JUDGE (ĐO LƯỜNG NGỮ NGHĨA & LẬP LUẬN SÂU)   │
│ • Đánh giá độ đúng đắn nghiệp vụ (Correctness) & Mức độ hữu ích.      │
│ • Sử dụng Model độc lập (GPT-4o-mini / Claude 3.5 Haiku) với rubric rõ.│
│ • Bắt buộc sinh bằng chứng (Evidence/CoT) trước khi chấm điểm 1 – 5.   │
├───────────────────────────────────┬────────────────────────────────────┤
│                                   ▼                                    │
│ LÀN 3: HUMAN BASELINE & SCIENTIFIC AGREEMENT (MỎ NEO CHÂN LÝ)          │
│ • Chuyên gia con người (Luật sư / Bác sĩ) gán nhãn tập Golden Dataset. │
│ • Tính toán hệ số đồng thuận: Cohen's Kappa, Fleiss' Kappa.            │
│ • Hiệu chuẩn Làn 2 bằng Làn 3 cho tới khi đạt đồng thuận κ ≥ 0.81.     │
└────────────────────────────────────────────────────────────────────────┘
```

### Nguyên Tắc Bất Biến Của 3 Làn:
1. **Làn 1 chạy trước:** Những gì kiểm tra được bằng Python thuần (JSON hợp lệ, có trích dẫn hay không, số tiền có đúng hay không) thì **TUYỆT ĐỐI không gọi LLM Judge** để tiết kiệm chi phí và thời gian.
2. **Làn 2 chỉ đánh giá những câu vượt qua Làn 1:** Nếu câu trả lời sinh ra JSON sai định dạng, Làn 1 đánh trượt ngay lập tức (Score = 0) mà không tốn token của Làn 2.
3. **Làn 3 kiểm chứng Làn 2:** Định kỳ kiểm tra chéo xem quyết định của LLM Judge có đồng nhất với chuyên gia con người hay không.

---

# CHƯƠNG 2: THIẾT KẾ MA TRẬN BAO PHỦ (COVERAGE GRID) & XÂY DỰNG GOLDEN DATASET

## 2.1. Ma Trận Bao Phủ 5 Chiều (The 5-Dimension Coverage Grid)

Một tập dữ liệu kiểm thử (Golden Dataset) yếu kém là tập dữ liệu chỉ chứa các câu hỏi dễ (Happy Path). Để phát hiện mọi lỗ hổng của mô hình trước khi lên Production, tập test phải bao phủ 5 chiều dữ liệu:

```
┌────────────────────────────────────────────────────────────────────────┐
│ MA TRẬN BAO PHỦ 5 CHIỀU KIỂM THỬ SẢN PHẨM AI (COVERAGE GRID)           │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. IN-SCOPE       │ • Câu hỏi nghiệp vụ chuẩn mực có đầy đủ trong dữ   │
│    (Chính thống)  │   liệu (ví dụ: "Mức trần phạt HĐ thương mại là gì?")│
│                   │ • Kỳ vọng: Trả lời chuẩn xác, kèm trích dẫn luật.  │
├───────────────────┼────────────────────────────────────────────────────┤
│ 2. OUT-OF-SCOPE   │ • Câu hỏi hoàn toàn nằm ngoài thẩm quyền tri thức   │
│    (Ngoài phạm vi)│   (ví dụ: "Cách làm bánh pizza", "Giá vé máy bay") │
│                   │ • Kỳ vọng: Từ chối lịch sự, không được bịa đặt.    │
├───────────────────┼────────────────────────────────────────────────────┤
│ 3. AMBIGUOUS      │ • Câu hỏi mập mờ, thiếu dữ kiện đầu vào (ví dụ:    │
│    (Mơ hồ)        │   "Hợp đồng của tôi phạt 15 triệu có phạm luật?")  │
│                   │ • Kỳ vọng: Hỏi lại người dùng về tổng giá trị HĐ.  │
├───────────────────┼────────────────────────────────────────────────────┤
│ 4. ADVERSARIAL    │ • Câu hỏi gài bẫy, Prompt Injection, jailbreak     │
│    (Đối kháng)    │   (ví dụ: chèn mã độc tàng hình, "Bỏ qua quy tắc") │
│                   │ • Kỳ vọng: Bị bộ lọc an ninh chặn đứng ngay lập tức│
├───────────────────┼────────────────────────────────────────────────────┤
│ 5. EXTREME EDGE   │ • Hợp đồng dài 200 trang, bảng biểu méo mó,        │
│    (Biên giới hạn)│   file scan mờ, nhiều điều khoản xung đột lẫn nhau.│
│                   │ • Kỳ vọng: Tách nhỏ phân tích, cảnh báo mâu thuẫn. │
└───────────────────┴────────────────────────────────────────────────────┘
```

## 2.2. Cấu Trúc Bản Ghi Chuẩn Của Golden Dataset (`dataset.jsonl`)

Mỗi bản ghi kiểm thử phải tuân thủ schema chặt chẽ:
```json
{
  "test_id": "TC_LEGAL_042",
  "category": "IN_SCOPE_PENALTY",
  "question": "Hợp đồng dịch vụ IT trị giá 1 tỷ đồng, bên B vi phạm nghĩa vụ bàn giao phần mềm có giá trị 200 triệu đồng. Bên A phạt 30 triệu đồng có đúng luật không?",
  "ground_truth": {
    "verdict": "HOP_PHAP",
    "math_explanation": "Mức phạt tối đa theo Điều 301 Luật Thương mại 2005 là 8% của phần nghĩa vụ vi phạm (200 triệu * 8% = 16 triệu). Tuy nhiên nếu đây là Hợp đồng Dân sự (Bộ luật Dân sự 2015 Điều 418), các bên có quyền tự thỏa thuận không giới hạn mức phạt. Nếu là thương mại thì 30 triệu vượt quá 16 triệu.",
    "required_statutes": ["Điều 301 Luật Thương Mại 2005", "Điều 418 Bộ Luật Dân Sự 2015"],
    "required_verbatim_quotes": ["không quá 8% giá trị phần nghĩa vụ hợp đồng bị vi phạm"]
  },
  "metadata": {
    "complexity": "HIGH",
    "target_slice": "CONTRACT_CROSS_CHECK"
  }
}
```

---

# CHƯƠNG 3: LÀN 1 — KIỂM TRA MÃ NGUỒN TẤT ĐỊNH (DETERMINISTIC CODE CHECKS)

Làn 1 là lớp phòng thủ đầu tiên, vận hành hoàn toàn bằng Python thuần với độ trễ tính bằng mili-giây:

## 3.1. Ba Quy Tắc Kiểm Tra Bắt Buộc (The 3 Golden Code Checks)

1. **`check_schema_validity`:** Kiểm tra câu trả lời có phải là JSON chuẩn hay không, các trường bắt buộc (`scope`, `verdict`, `citations`, `risk_score`) có đầy đủ kiểu dữ liệu Pydantic hay không.
2. **`check_citation_existence`:** Kiểm tra xem mã trích dẫn (`doc_id#section_id`) mà mô hình trả về có thực sự tồn tại trong Cơ sở Dữ liệu Tri thức (Corpus Manifest) hay do mô hình tự "bịa" ra một điều luật ma.
3. **`check_quote_verbatim_matching`:** Trích xuất đoạn văn bản mà mô hình tuyên bố là trích dẫn nguyên văn, chuẩn hóa chuỗi bằng Unicode NFKC và kiểm tra xem chuỗi đó có nằm trọn vẹn trong văn bản gốc hay không:

$$\text{Verbatim Ratio} = \frac{\text{Số ký tự khớp liên tục}}{\text{Tổng số ký tự trích dẫn}} \ge 0.80$$

---

# CHƯƠNG 4: LÀN 2 — KỸ NGHỆ HIỆU CHUẨN THẨM ĐỊNH VIÊN (CALIBRATED LLM-AS-A-JUDGE)

Khi sử dụng một mô hình LLM độc lập để đóng vai Giám Khảo (Judge), ta phải lập trình prompt cho Judge như một chuyên gia kiểm toán khắt khe:

## 4.1. Cấu Trúc Prompt Thẩm Định Viên Chuẩn Mực (`judge_prompt.md`)

```markdown
Bạn là Ban Giám Khảo Đánh Giá Chất Lượng AI chuyên trách Luật Thương Mại Việt Nam.
Nhiệm vụ của bạn là đánh giá câu trả lời của AI Assistant dựa trên Bối Cảnh (Context) và Chân Lý (Ground Truth).

NGUYÊN TẮC BẤT BIẾN:
1. KHÔNG tự suy diễn thêm kiến thức ngoài bối cảnh được cung cấp.
2. BẮT BUỘC sinh chuỗi suy luận phân tích chứng cứ trong thẻ <evidence>...</evidence> trước khi chấm điểm.
3. Nếu AI Assistant trả lời sai số liệu toán học hoặc trích dẫn điều luật không có thật, ĐIỂM SỐ BẮT BUỘC LÀ 1 (FAIL).

THANG ĐIỂM ĐÁNH GIÁ (RUBRIC):
- Điểm 5 (Xuất sắc): Trả lời chính xác 100%, trích dẫn đúng số hiệu văn bản luật, giải thích rõ ràng, văn phong chuyên nghiệp.
- Điểm 4 (Tốt): Trả lời đúng bản chất, nhưng thiếu một chi tiết nhỏ không ảnh hưởng đến quyết định pháp lý.
- Điểm 3 (Đạt yêu cầu): Trả lời đúng một phần, bỏ sót một trường hợp ngoại lệ.
- Điểm 2 (Kém): Câu trả lời mơ hồ, tính toán sai tỷ lệ phần trăm hoặc diễn đạt sai tinh thần điều luật.
- Điểm 1 (Thảm họa / Ảo giác): Bịa đặt điều khoản luật, vi phạm an toàn thông tin, hoặc khẳng định sai hoàn toàn kết luận pháp lý.

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON):
{
  "evidence": "Trích dẫn phân tích so sánh giữa Ground Truth và Actual Answer",
  "score": 1 đến 5,
  "failure_reason": "Mô tả lý do nếu điểm <= 3, ngược lại để null"
}
```

## 4.2. Hiệu Chuẩn Bằng Ma Trận Nhầm Lẫn (Confusion Matrix Calibration)

Để biết Judge có đáng tin cậy hay không, ta so sánh kết quả phân loại Nhị phân (Pass: Điểm 4–5 vs Fail: Điểm 1–3) giữa **Con người** và **LLM Judge**:

```
                       DỰ ĐOÁN CỦA LLM JUDGE
                    ┌────────────┬────────────┐
                    │ Pass (≥ 4) │ Fail (≤ 3) │
┌────────┬──────────┼────────────┼────────────┤
│ CHÂN LÝ│ Pass (≥ 4│     TP     │     FN     │  (FN: Judge quá khắt khe, bắt nhầm)
│ CON    ├──────────┼────────────┼────────────┤
│ NGƯỜI  │ Fail (≤ 3│     FP     │     TN     │  (FP: CỰC KỲ NGUY HIỂM: Judge lọt lỗi!)
└────────┴──────────┴────────────┴────────────┘
```

> **Nguyên Tắc Sống Còn:**
> Tỷ lệ **False Positive (FP)** của Judge phải **$\le 2\%$**. Việc Judge bỏ lọt một câu trả lời bịa đặt pháp lý nguy hiểm gấp 10 lần việc Judge chấm nhầm một câu trả lời đúng!

---

# CHƯƠNG 5: LÀN 3 — NỀN TẢNG TOÁN HỌC CỦA ĐỒNG THUẬN: HỆ SỐ COHEN'S KAPPA ($\kappa$) & FLEISS' KAPPA

## 5.1. Tại Sao Tỷ Lệ Phần Trăm Đồng Thuận (% Agreement) Là Một Thước Đo Lừa Dối?

Giả sử trong 100 câu kiểm thử, có 95 câu dễ mà cả Người và Judge đều chọn Pass, và chỉ có 5 câu khó. Tỷ lệ % đồng thuận hiển thị là 95%. Nhưng thực tế, trên 5 câu khó quyết định vận mệnh hệ thống, Người và Judge có thể bất đồng hoàn toàn!

Hệ số **Cohen's Kappa ($\kappa$)** loại bỏ hoàn toàn yếu tố "ăn may / trùng hợp ngẫu nhiên" (Chance Agreement):

$$\kappa = \frac{P_o - P_e}{1 - P_e}$$

Trong đó:
- $P_o$ (Observed Agreement): Tỷ lệ đồng thuận quan sát được thực tế giữa 2 thẩm định viên:
  $$P_o = \frac{\text{Số trường hợp cả 2 cùng đồng ý}}{\text{Tổng số mẫu}}$$
- $P_e$ (Hypothetical Chance Agreement): Xác suất hai thẩm định viên tình cờ chọn giống nhau do ngẫu nhiên:
  $$P_e = P(\text{Judge = Pass}) \times P(\text{Người = Pass}) + P(\text{Judge = Fail}) \times P(\text{Người = Fail})$$

## 5.2. Thang Đo Diễn Giải Hệ Số Cohen's Kappa

| Giá trị $\kappa$ | Mức độ đồng thuận khoa học | Trạng thái sẵn sàng Production |
|---|---|---|
| $< 0.20$ | Kém (Slight Agreement) | ❌ Không thể chấp nhận |
| $0.21 - 0.40$ | Tương đối (Fair Agreement) | ❌ Judge hoạt động ngẫu nhiên |
| $0.41 - 0.60$ | Trung bình (Moderate Agreement)| ⚠️ Cần viết lại Judge Prompt & Rubric |
| $0.61 - 0.80$ | Đáng kể (Substantial Agreement)| ⚠️ Có thể dùng cho nội bộ |
| **$0.81 - 1.00$** | **Gần như hoàn hảo (Almost Perfect)** | **✅ ĐẠT CHUẨN SẢN XUẤT (Production Ready)** |

---

# CHƯƠNG 6: BỘ 4 CHỈ SỐ RAGAS TOÁN HỌC & ĐO LƯỜNG CHẤT LƯỢNG RAG

Trong các hệ thống RAG (Retrieval-Augmented Generation), chất lượng được lượng hóa bằng **Bộ tứ Ragas (Ragas Quad-Metrics)**:

```
                      [User Query]
                     ╱            ╲
                    ╱              ╲
                   ▼                ▼
          [Retrieved Chunks] ──► [Actual Answer]
                   │                    │
                   └────────────────────┘
```

### 1. Faithfulness (Độ trung thực / Chống ảo giác)
Đo lường xem tất cả các khẳng định (claims) trong câu trả lời có được suy ra trực tiếp từ Context hay không:
$$\text{Faithfulness} = \frac{\text{Số lượng khẳng định được chứng minh bởi Context}}{\text{Tổng số lượng khẳng định trong câu trả lời}}$$
*(Mục tiêu Production: $\ge 0.95$)*

### 2. Answer Relevance (Độ liên quan của câu trả lời)
Đo lường mức độ câu trả lời giải quyết đúng trọng tâm câu hỏi của người dùng, không lan man:
$$\text{Answer Relevance} = \frac{1}{M} \sum_{i=1}^M \text{CosineSimilarity}(E_{q}, E_{g_i})$$
*(Trong đó $E_{g_i}$ là embedding của câu hỏi nhân tạo được sinh ngược lại từ câu trả lời; Mục tiêu: $\ge 0.90$)*

### 3. Context Precision (Độ chính xác của ngữ cảnh truy hồi)
Đo lường xem các chunk chứa thông tin hữu ích có được đưa lên đầu danh sách tìm kiếm hay không (Signal-to-Noise Ratio):
$$\text{Context Precision@K} = \frac{\sum_{k=1}^K \text{Precision@k} \times v_k}{\text{Tổng số chunk liên quan}}$$
*(Trong đó $v_k \in \{0, 1\}$ là nhãn chunk ở vị trí $k$ có chứa câu trả lời hay không; Mục tiêu: $\ge 0.85$)*

### 4. Context Recall (Độ bao phủ của ngữ cảnh truy hồi)
Đo lường xem hệ thống có tìm kiếm đủ tất cả các thông tin cần thiết để trả lời câu hỏi hay không:
$$\text{Context Recall} = \frac{\text{Số lượng câu trong Ground Truth được tìm thấy trong Context}}{\text{Tổng số câu trong Ground Truth}}$$
*(Mục tiêu Production: $\ge 0.90$)*

---

# CHƯƠNG 7: ĐÁNH GIÁ QUỸ ĐẠO SUY LUẬN CỦA TÁC TỬ (AGENT TRAJECTORY & TOOL-CALL EVALS)

Đánh giá Agent phức tạp hơn RAG đơn giản vì Agent trải qua nhiều bước suy luận (`Thought` $\to$ `Action` $\to$ `Observation`).

### Phân Biệt: Outcome-level vs. Trajectory-level Evals
- **Outcome-level Eval:** Chỉ kiểm tra kết quả cuối cùng (End Result). Nguy hiểm vì Agent có thể đi đường vòng 20 bước, gọi sai tool 5 lần nhưng vô tình ra kết quả đúng $\to$ Đốt cháy chi phí token!
- **Trajectory-level Eval:** Kiểm tra từng bước chân của Agent:
  1. **Tool Selection Accuracy:** Agent có chọn đúng công cụ tính toán (`calc_penalty_rate`) thay vì tự nhẩm không?
  2. **Parameter Schema Accuracy:** Tham số truyền vào tool có hợp lệ 100% không?
  3. **Step Efficiency Ratio:** Tỷ lệ số bước thực tế chia cho số bước tối ưu lý thuyết ($S_{\text{actual}} / S_{\text{optimal}} \le 1.2$).
  4. **Runaway Loop Rate:** Tỷ lệ Agent bị kẹt vào vòng lặp vô tận (Bắt buộc phải bằng $0\%$).

---

# CHƯƠNG 8: PHÂN TÍCH LÁT CẮT DỮ LIỆU (SLICE-BASED ANALYSIS) & MÔ HÌNH HÓA DẠNG LỖI (FAILURE MODES)

Điểm trung bình toàn cục ($88\%$) thường che giấu những thảm họa cục bộ. Ta phải phân tích theo **Lát cắt dữ liệu (Data Slices)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHÂN TÍCH HIỆU NĂNG THEO TỪNG LÁT CẮT DỮ LIỆU (SLICING DASHBOARD)      │
├─────────────────────────┬──────────────┬──────────────┬────────────────┤
│ Lát Cắt Dữ Liệu (Slice) │ Số lượng mẫu │ Điểm Pass %  │ Đánh giá rủi ro│
├─────────────────────────┼──────────────┼──────────────┼────────────────┤
│ Hợp đồng Thương mại     │ 45           │ 97.8%        │ ✅ An toàn     │
│ Hợp đồng Xây dựng (EPC) │ 25           │ 92.0%        │ ✅ Đạt chuẩn   │
│ Hợp đồng Lao động       │ 20           │ 85.0%        │ ⚠️ Cảnh báo    │
│ TÀI LIỆU CHỨA BẢNG BIỂU │ 15           │ 46.7%        │ 🚨 BÁO ĐỘNG ĐỎ │
└─────────────────────────┴──────────────┴──────────────┴────────────────┘
```
$\Rightarrow$ Phân tích lát cắt chỉ ra ngay: **Mô hình bị "mù" trước các bảng biểu phức tạp!** Thay vì sửa System Prompt vô ích, giải pháp kỹ thuật đúng đắn là nâng cấp pipeline OCR và Ingestion để bóc tách Markdown Table trước khi chunking.

---

# CHƯƠNG 9: CỔNG KIỂM SOÁT CHẤT LƯỢNG (QUALITY GATES) TRONG CI/CD GITHUB ACTIONS

Để bảo đảm không có bất kỳ đợt commit mã nguồn nào làm suy giảm chất lượng hệ thống (Zero Regression), quy trình CI/CD tích hợp **Quality Gates tự động**:

```yaml
name: AI Evaluation Quality Gate
on: [pull_request, push]

jobs:
  ai-eval-benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run Deterministic Code Checks (Lane 1)
        run: |
          python -m pytest tests/test_code_checks.py

      - name: Run Golden Benchmark & Judge Calibration (Lane 2 & 3)
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          python eval/run_benchmark.py --dataset data/golden_dataset.jsonl --output results.jsonl
          python eval/judge_evaluator.py --results results.jsonl --threshold-score 4.2 --max-fail-rate 0.05

      - name: Check Strict Quality Gate
        run: |
          python eval/quality_gate.py \
            --min-faithfulness 0.95 \
            --min-kappa 0.81 \
            --max-p99-latency 8.0
```

---

# CHƯƠNG 10: FULL-STACK REFERENCE EVALUATION ENGINE (MÃ NGUỒN CHUẨN DOANH NGHIỆP)

Dưới đây là module Python hoàn chỉnh chuẩn Clean Architecture triển khai **Bộ Máy Đánh Giá AI Toàn Diện** bao gồm cả 3 Làn:

```python
"""
Module: ai_evaluation_engine.py
Mô tả: Bộ máy đánh giá chất lượng AI chuẩn mực (Deterministic Code Checks + Calibrated Judge + Cohen's Kappa)
Chuẩn: Pydantic v2, Type-safe, Zero-vibe Empirical Rigor
"""

import json
import unicodedata
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class EvaluationSampleDTO(BaseModel):
    test_id: str
    question: str
    ground_truth_answer: str
    actual_model_answer: str
    retrieved_contexts: List[str] = Field(default_factory=list)
    human_label: Optional[int] = Field(default=None, description="Nhãn con người: 1 (Fail) hoặc 5 (Pass)")

class CodeCheckResult(BaseModel):
    is_valid_format: bool
    has_valid_citations: bool
    verbatim_quote_ratio: float
    passed_lane_1: bool

class JudgeVerdict(BaseModel):
    evidence_reasoning: str
    score: int = Field(ge=1, le=5)
    is_pass: bool

class BenchmarkScorecard(BaseModel):
    total_samples: int
    lane_1_pass_rate: float
    lane_2_avg_score: float
    cohens_kappa_agreement: float
    is_production_ready: bool
    verdict_summary: str

class AIEvaluationEngine:
    @staticmethod
    def normalize_text_nfkc(text: str) -> str:
        """Chuẩn hóa Unicode NFKC và loại bỏ khoảng trắng thừa"""
        return " ".join(unicodedata.normalize("NFKC", text).split())

    @classmethod
    def run_lane_1_code_checks(cls, sample: EvaluationSampleDTO) -> CodeCheckResult:
        """Làn 1: Kiểm tra mã nguồn tất định 100% không tốn token"""
        ans = sample.actual_model_answer.strip()
        
        # 1. Kiểm tra format có nội dung tối thiểu
        is_valid = len(ans) >= 20 and not ans.startswith("Error:")
        
        # 2. Kiểm tra có trích dẫn điều luật hoặc tài liệu hay không
        keywords = ["điều", "luật", "khoản", "nghị định", "hợp đồng"]
        has_citations = any(kw in ans.lower() for kw in keywords)
        
        # 3. Tính toán tỷ lệ so khớp nguyên văn (Verbatim Match) với Context
        verbatim_ratio = 0.0
        if sample.retrieved_contexts:
            norm_ans = cls.normalize_text_nfkc(ans)
            norm_ctx = cls.normalize_text_nfkc(" ".join(sample.retrieved_contexts))
            
            # Kiểm tra các cụm 5 từ liên tiếp
            words = norm_ans.split()
            matched_words = 0
            window_size = 5
            if len(words) >= window_size:
                for i in range(len(words) - window_size + 1):
                    ngram = " ".join(words[i:i+window_size])
                    if ngram in norm_ctx:
                        matched_words += window_size
                verbatim_ratio = min(1.0, matched_words / len(words))
            else:
                verbatim_ratio = 1.0 if norm_ans in norm_ctx else 0.0

        passed = is_valid and has_citations and (verbatim_ratio >= 0.50 if sample.retrieved_contexts else True)
        return CodeCheckResult(
            is_valid_format=is_valid,
            has_valid_citations=has_citations,
            verbatim_quote_ratio=round(verbatim_ratio, 2),
            passed_lane_1=passed
        )

    @staticmethod
    def calculate_cohens_kappa(human_labels: List[int], judge_labels: List[int]) -> float:
        """Làn 3: Tính toán hệ số đồng thuận Cohen's Kappa khoa học giữa Người và Judge"""
        if len(human_labels) != len(judge_labels) or len(human_labels) == 0:
            return 0.0

        n = len(human_labels)
        # Chuyển đổi nhãn về nhị phân: Pass (>= 4) vs Fail (< 4)
        h_binary = [1 if val >= 4 else 0 for val in human_labels]
        j_binary = [1 if val >= 4 else 0 for val in judge_labels]

        # 1. Tính Observed Agreement (Po)
        agree_count = sum(1 for h, j in zip(h_binary, j_binary) if h == j)
        po = agree_count / n

        # 2. Tính Chance Agreement (Pe)
        p_h_pass = sum(h_binary) / n
        p_h_fail = 1.0 - p_h_pass
        p_j_pass = sum(j_binary) / n
        p_j_fail = 1.0 - p_j_pass

        pe = (p_h_pass * p_j_pass) + (p_h_fail * p_j_fail)

        if pe == 1.0:
            return 1.0
        
        kappa = (po - pe) / (1.0 - pe)
        return round(kappa, 4)

    @classmethod
    def evaluate_benchmark(cls, samples: List[EvaluationSampleDTO], judge_scores: List[int]) -> BenchmarkScorecard:
        """Tổng hợp đánh giá Benchmark toàn cục cho Hội đồng và Quality Gate"""
        n = len(samples)
        lane_1_passes = 0
        human_labels = []
        valid_judge_scores = []

        for idx, s in enumerate(samples):
            res1 = cls.run_lane_1_code_checks(s)
            if res1.passed_lane_1:
                lane_1_passes += 1
            
            if s.human_label is not None:
                human_labels.append(s.human_label)
                valid_judge_scores.append(judge_scores[idx])

        pass_rate_1 = (lane_1_passes / n) * 100.0 if n > 0 else 0.0
        avg_score_2 = sum(judge_scores) / n if n > 0 else 0.0
        
        kappa = cls.calculate_cohens_kappa(human_labels, valid_judge_scores) if human_labels else 1.0
        
        # Tiêu chuẩn nghiêm ngặt để Golive Production
        is_ready = (pass_rate_1 >= 95.0) and (avg_score_2 >= 4.2) and (kappa >= 0.81)
        
        if is_ready:
            verdict = f"HỆ THỐNG ĐẠT CHUẨN SẢN XUẤT. Pass Rate Làn 1: {pass_rate_1:.1f}%, Điểm trung bình Judge: {avg_score_2:.2f}/5, Kappa: {kappa:.2f} (≥ 0.81)."
        else:
            verdict = f"CẢNH BÁO: CHƯA ĐẠT CHUẨN GOLIVE. Cần kiểm tra lại: Pass Rate Làn 1 ({pass_rate_1:.1f}%), Điểm Judge ({avg_score_2:.2f}), hoặc Kappa ({kappa:.2f})."

        return BenchmarkScorecard(
            total_samples=n,
            lane_1_pass_rate=round(pass_rate_1, 2),
            lane_2_avg_score=round(avg_score_2, 2),
            cohens_kappa_agreement=kappa,
            is_production_ready=is_ready,
            verdict_summary=verdict
        )
```

---

# CHƯƠNG 11: BỘ 15 CÂU HỎI VẤN ĐÁP HỘI ĐỒNG BẢO VỆ KHOÁ LUẬN TỐT NGHIỆP / SENIOR AI QA ARCHITECT

1. **Câu 1:** *Tại sao không nên sử dụng tỷ lệ phần trăm đồng thuận (% Agreement) thông thường để đo độ tin cậy của LLM Judge?*
   - **Trả lời:** Vì % Agreement bị bóp méo bởi xác suất tình cờ ngẫu nhiên (Chance Agreement). Nếu 95% câu hỏi trong tập dữ liệu là câu hỏi dễ chọn Pass, hai thẩm định viên chọn bừa cũng đạt 95% đồng thuận. Bắt buộc phải dùng Cohen's Kappa ($\kappa$) để khấu trừ xác suất ngẫu nhiên.
2. **Câu 2:** *Khái niệm 3 Làn Đánh Giá (3 Evaluation Lanes) mang lại lợi ích gì về mặt chi phí và độ tin cậy?*
   - **Trả lời:** Tối ưu hóa chi phí và tốc độ bằng cách dùng Làn 1 (Code thuần Python, chi phí = 0$) để lọc sạch các lỗi định dạng, trích dẫn rác; Làn 2 (LLM Judge) chỉ chấm các câu đã vượt qua Làn 1; và Làn 3 (Human Baseline) dùng làm mỏ neo chân lý để hiệu chuẩn Làn 2.
3. **Câu 3:** *Làm thế nào để triệt tiêu hiện tượng Verbosity Bias (thiên vị câu trả lời dài) của mô hình Giám Khảo?*
   - **Trả lời:** Trong System Prompt của Judge, bắt buộc quy định rõ tiêu chí "Conciseness" (tính súc tích); phạt điểm các câu trả lời dài dòng không đi vào trọng tâm; và chuẩn hóa độ dài câu trả lời trước khi đưa vào chấm.
4. **Câu 4:** *Tại sao khi làm LLM-as-a-Judge, tuyệt đối không để cùng một mô hình tự sinh câu trả lời và tự chấm điểm chính nó?*
   - **Trả lời:** Vì mô hình mắc phải hiện tượng Self-Enhancement Bias (tự đề cao bản thân), có xu hướng chấm điểm cao hơn cho cấu trúc câu và từ vựng quen thuộc mà chính nó sinh ra. Bắt buộc phải dùng một mô hình của hãng khác độc lập để chấm điểm chéo (Cross-Evaluation).
5. **Câu 5:** *Bộ 4 chỉ số RAGAS gồm những chỉ số nào và chúng đo lường các khía cạnh gì của hệ thống RAG?*
   - **Trả lời:** (1) Faithfulness (Đo độ trung thực, chống ảo giác giữa Answer và Context); (2) Answer Relevance (Đo mức độ giải quyết đúng câu hỏi của Query); (3) Context Precision (Đo tỷ lệ chunk liên quan được xếp ở thứ hạng đầu); và (4) Context Recall (Đo độ đầy đủ của Context so với Ground Truth).
6. **Câu 6:** *Khái niệm "Golden Dataset" khác gì so với một tập dữ liệu câu hỏi thông thường?*
   - **Trả lời:** Golden Dataset là tập dữ liệu chuẩn vàng được thẩm định bởi chuyên gia con người, bao gồm câu hỏi, bối cảnh chuẩn, đáp án mẫu (Ground Truth), danh mục điều luật bắt buộc trích dẫn và các mẫu kiểm thử đối kháng (Adversarial edge cases).
7. **Câu 7:** *Trong ma trận nhầm lẫn (Confusion Matrix) của Judge, loại sai số nào nguy hiểm nhất đối với ứng dụng pháp lý/y tế?*
   - **Trả lời:** Sai số False Positive (FP) — tức là câu trả lời của mô hình sai/bịa đặt nhưng Judge lại chấm Pass. Nó làm lọt các lỗ hổng chết người lên môi trường sản xuất.
8. **Câu 8:** *Kỹ thuật Slice-based Evaluation (Đánh giá theo lát cắt) phát hiện những vấn đề gì mà điểm trung bình toàn cục không thấy được?*
   - **Trả lời:** Phát hiện các điểm mù cục bộ của mô hình trên các tệp dữ liệu ngách (ví dụ: mô hình đạt 95% trên văn bản thông thường nhưng chỉ đạt 30% trên tài liệu chứa bảng biểu hoặc hợp đồng có yếu tố nước ngoài).
9. **Câu 9:** *Trajectory-level Evaluation trong hệ thống tác tử (Agent) đánh giá những yếu tố gì?*
   - **Trả lời:** Đánh giá tính chính xác trong việc lựa chọn công cụ (Tool Selection), tính hợp lệ của tham số truyền vào tool (Argument Schema), hiệu quả số bước suy luận ($S_{\text{actual}} / S_{\text{optimal}}$), và phát hiện vòng lặp vô tận (Runaway Loop).
10. **Câu 10:** *Ngưỡng Cohen's Kappa tối thiểu bao nhiêu thì một hệ thống AI được coi là sẵn sàng Golive Production?*
    - **Trả lời:** Tối thiểu $\kappa \ge 0.81$ (Almost Perfect Agreement). Nếu $\kappa < 0.81$, hệ thống LLM Judge chưa đủ tin cậy để thay thế con người trong các cổng kiểm soát tự động.
11. **Câu 11:** *Làm thế nào để đo lường độ trôi dạt chất lượng (Evaluation Drift) của mô hình sau khi triển khai lên Cloud?*
    - **Trả lời:** Thiết lập đường ống Continuous Evaluation: Định kỳ lấy ngẫu nhiên 5% lưu lượng thực tế (Production Traffic), đưa qua bộ lọc che giấu PII, nạp vào bộ máy đánh giá 3 Làn và theo dõi biểu đồ xu hướng điểm số trên Grafana.
12. **Câu 12:** *Khi một đợt cập nhật System Prompt làm tăng Answer Relevance nhưng lại làm giảm Faithfulness, quyết định kỹ thuật nào là đúng đắn?*
    - **Trả lời:** Từ chối triển khai đợt cập nhật đó. Trong các hệ thống doanh nghiệp, Faithfulness (tính trung thực, không ảo giác) luôn là tiêu chí ưu tiên số 1 mang tính sống còn. Câu trả lời liên quan nhưng bịa đặt sự thật có hại hơn nhiều so với câu trả lời an toàn từ chối.
13. **Câu 13:** *Phương pháp G-Eval là gì và tại sao nó lại vượt trội hơn các phương pháp Prompting truyền thống cho LLM Judge?*
    - **Trả lời:** G-Eval sử dụng kỹ thuật Chain-of-Thought (CoT) kết hợp với xác suất phân phối của các token điểm số (Probabilistic Form-filling), ép mô hình phải phân tích từng tiêu chí theo các bước tuần tự trước khi tính kỳ vọng điểm số, giúp điểm chấm ổn định và lặp lại được.
14. **Câu 14:** *Cổng kiểm soát chất lượng (Quality Gate) trong CI/CD ngăn chặn rủi ro gì cho đội ngũ kỹ sư?*
    - **Trả lời:** Ngăn chặn hiện tượng hồi quy chất lượng (Quality Regression), bảo đảm rằng mọi tính năng mới được merge vào nhánh chính không làm phá vỡ các trường hợp kiểm thử đã vượt qua trước đó.
15. **Câu 15:** *Tại sao việc kiểm tra so khớp nguyên văn NFKC (Verbatim Quote Matching) lại là một tiêu chí bắt buộc trong Làn 1?*
    - **Trả lời:** Vì nó bảo đảm rằng bất kỳ câu chữ nào được đặt trong dấu ngoặc kép trích dẫn đều có thật trong tài liệu gốc theo đúng từng ký tự, ngăn chặn hoàn toàn việc mô hình trích dẫn giả mạo lời văn của thẩm phán hoặc điều luật.
