# Sinalytix Doküman Seti — Kullanım Talimatı (v2.0)

**Tarih:** 2026-07-22 · Bu klasördeki 19 dosya, ürünün (4 uygulama + admin panel + ortak çekirdek + site) **eksiksiz ve kendi kendine yeterli** dokümantasyon setidir. Bu metni Claude Project instructions alanına da aynen yapıştırın.

## Öncelik sırası (çelişki durumunda üstteki kazanır)

1. **`Sinalytix_Canonical_Data_Dictionary.md` (v0.2)** — TEK doğruluk kaynağı; B1–B10 + K1–K11 kararları.
2. Çekirdek modüller 1–4 (`Core_Infra_PRD_Module1..4`).
3. `Sinalytix_SOS_UX_Akis_Spec.md`, `Admin_Panel_PRD.md`.
4. Uygulama PRD'leri (`Hasta/Family/Caregiver/HCP __RECONCILED.md`).
5. Destek dokümanları: Tasarım Sistemi, Mühendislik El Kitabı, Test & QA, Uyum Listesi, Kapsam Matrisi, Sözlükçe, Developer Teslim Notu.

## Okuma kuralları (kod/tasarım üretirken uy)

- "Eski metin + `[RECONCILED: ...]` / `[KARAR Kx]` notu" deseninde **her zaman notun hâli esastır**.
- `ÖNERİLEN DEFAULT — teyit bekliyor` etiketli kararlar (K1, K2, K4, K6, K8) aynen kodlanır; değiştirme yetkisi yalnız ürün sahibindedir.
- HCP Doc 8/9/10 "Q&A pas geçildi" dipnotludur — bu bölümlere dayanan büyük kararlarda ürün sahibine sor.
- V1/V2 etiketli özellikler (Kapsam Matrisi) kodlanmaz; yalnız şema-hazırlığı yapılır.
- interRAI MAPLe kuralları ve not/order klinik şablon **içerikleri** bilerek yoktur (lisans + klinik danışman) — uydurma; şema/placeholder kullan.
- Runtime sabitleri (süreler, limitler) koda gömme; `SystemConfig` anahtarlarından oku (K10, Admin PRD A7).
- SaMD yasak-listesi (Uyum Listesi §3) her özellikte geçerlidir — teşhis/triage/doz/otomatik-acil davranışı EKLEME, pazarlama metninde bile.
- Hasta PRD'sindeki mimari görsel bu kopyadan çıkarılmıştır (yer tutucu not var); içerik kaybı yoktur.

## Bu sete DAHİL EDİLMEMESİ gerekenler (arşiv — projeye yükleme)

`HCP_combined.md` (reconciliation öncesi orijinal), `HCP_check_patient.md` (adı yanıltıcı: eski/iptal Hasta PRD'si), denetim/plan/özet metadokümanları — bunlar çözülmüş sorunları güncel gibi anlatır, modeli yanıltır.
