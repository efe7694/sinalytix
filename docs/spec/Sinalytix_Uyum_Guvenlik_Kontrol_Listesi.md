# Sinalytix — Uyum & Güvenlik Kontrol Listesi (Mühendislik Yüzü)

**Sürüm:** 0.1 · **Tarih:** 2026-07-22
**Not:** Bu, mühendislik ekibi için uygulama-karşılığı kontrol listesidir; **hukuki görüş değildir**. Lansman öncesi nihai inceleme hukuk müşaviri + gizlilik uzmanı (PIA) + klinik danışman tarafından yapılır (§5).

---

## 1. PHIPA (Ontario) — uygulama karşılıkları

| Yükümlülük | Uygulama karşılığı | Kanıt/test |
|---|---|---|
| Sağlık verisi erişiminde hasta kontrolü | `ConsentGrant` default-deny + lockbox (B5) + hasta/SDM-only grant | Test §2.1/2.3 |
| Erişim kayıtları | `AuditLogEntry` 7y, HMAC-zincir, WORM arşiv (s.13) | append-only testleri; gecelik zincir doğrulama |
| Kayıt saklama | Klinik 10y; consent/audit/AI 7y; Message 2y (Modül 1 §12) | retention işleri + purge onay akışı |
| Vekil karar verici | `SDMDeclaration` (ON HCCA); K6 full-yetki bağı | K4/K6 testleri |
| Lockbox (hasta kısıtlama hakkı) | B5 seti + `substance_use` her noktada; iptalde gizle-ama-sakla | lockbox matrisi |
| Breach bildirimi | §4 runbook + IPC bildirim şablonları | masa tatbikatı (yılda 1) |

## 2. PIPEDA — uygulama karşılıkları
Auth öncesi sıfır PII (Modül 1 §13; cihazda şifreli taslak) · amaç-sınırlı toplama (onboarding yalnız zorunlu minimum; "Bilmiyorum" geçerli) · açık rıza `ConsentRecord` (sürümlü, immutable) · erişim/düzeltme hakkı (hasta kendi verisini görür; düzeltme talebi HCP akışıyla) · silme: `AccountDeletionRequest` 30g grace; klinik kayıt yasal saklama istisnası kullanıcıya açıkça yazılır · veri ikametgâhı Kanada (ca-central-1 + Azure Canada; IAM sınır-ötesi engel — Modül 1 §1.6) · üçüncü taraf işleyiciler §6 listesi + DPA.

## 3. SaMD-Nötrlük (Health Canada) — sürekli kontrol
Ürün genelinde **yasak davranış listesi** (her PR kontrol maddesi; Modül 4 başlık kuralı):
teşhis/tanı önerisi · tedavi/ilaç/doz önerisi · semptom triage/aciliyet skoru · otomatik acil tespiti (düşme, anomali) · klinik karar desteği iddiası (pazarlama dahil) · "cevaplandı" türetimli otomatik arama kararı (B7).
Serbest alan: koordinasyon, kayıt, hatırlatma, iletişim kolaylaştırma, belgelendirme yardımı (Scribe = klinisyen-onaylı taslak), veri görüntüleme.
Kontrol noktaları: judge regresyon seti (Modül 4 §8) · SOS UX kabul kriteri 6 · pazarlama sitesi metin incelemesi (Tasarım Sistemi §5) · yeni AI skill eklerken sınıflandırma zorunluluğu (Modül 4 §2).

## 4. Güvenlik Operasyonları & Olay Müdahalesi
- **Runbook (özet):** şüpheli olay → triage (S1 güvenlik sınıfı) → kapsam tespiti (audit korelasyon, `request_id`) → kontrol altına alma (oturum/token toplu iptal, IP blok, gerekirse `ai.kill_switch`/feature flag) → etkilenen birey tespiti → bildirim kararı (hukuk + IPC eşikleri) → post-mortem + test-boşluğu kapatma.
- Yıllık pentest + üç ayda bir bağımlılık taraması (CI'da sürekli: npm audit/Snyk) + sır taraması (gitleaks).
- Yedekleme: RPO 15dk/RTO 4s (Modül 3 §10); üç ayda bir restore tatbikatı (yedeğin varlığı değil, dönebilirliği test edilir).
- Erişim yönetimi (bizim taraf): prod erişimi yalnız break-glass-op prosedürüyle (ayrı IAM rol + gerekçe + oturum kaydı); günlük işler admin panel üzerinden (K9 güvenlik modeli).

## 5. Lansman Öncesi ZORUNLU dış incelemeler (mühendislik-dışı; blok listesi)
1. **PIA (Privacy Impact Assessment)** — gizlilik uzmanı; veri akış envanteri bu setten çıkarılır (Modül 1 §12 + §2 haritası hazır girdi).
2. **Hukuk:** ToS/Privacy/consent metinleri (EN + **FR yasal eşdeğerlik**), PHIPA custodian/agent pozisyon analizi, DPA'lar.
3. **Klinik danışman:** K1, K2, K4, K6, K8 + B1/B7 teyidi (sözlük §0.1 tablosu imza listesi olarak kullanılır).
4. **Güvenlik:** bağımsız pentest raporu + bulgu kapanışı.
> Bu dördü kapanmadan halka açık lansman yapılmaz; **geliştirme ve kapalı pilot bloklanmaz.**

## 6. Üçüncü Taraf İşleyiciler (DPA gerekir)
AWS (ca-central-1: RDS/S3/SQS/KMS/ElastiCache) · Microsoft Azure (Canada Central: OpenAI, Speech) · Apple/Google (push — PHI taşınmaz, Tasarım Sistemi §4 maskeleme) · e-posta sağlayıcı (Kanada-host veya PHI'siz şablon) · e-fax sağlayıcı (HCP orders; PHIPA-uyumlu Kanada sağlayıcı seçimi ops görevi) · Grafana/izleme (self-host; metriklerde PHI yok).
Kural: yeni işleyici = bu listeye PR + DPA + veri-akış güncellemesi.

## 7. Sürekli Uyum Ritmi
Aylık: erişim gözden geçirme (admin rolleri), reveal raporu incelemesi. Üç aylık: restore tatbikatı, bağımlılık/pentest ara taraması, SaMD yasak-liste denetimi (yeni özellikler üzerinden). Yıllık: pentest, breach masa tatbikatı, retention/purge denetimi, bu dokümanın revizyonu.
