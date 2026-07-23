# Sinalytix — Birleşik Çekirdek Altyapı PRD
## Modül 3 / 4 — Backend Mimarisi, PolicyEngine & Real-time

**Sürüm:** 0.1 · **Tarih:** 2026-07-22 · **Statü:** Taslak (Modül 1–2 + Kanonik Sözlük v0.2 üzerine)
**Kural:** Tablolar Sözlük/Modül 1'de, kontratlar Modül 2'de; bu modül **davranışı** tanımlar. Çelişkide sözlük kazanır.

---

## 0. Yönetici Özeti

Backend, **modüler monolit** olarak başlar (tek deploy, Modül 2 §2'deki 8 servis sınırı iç modül olarak), olay omurgası üzerinden konuşur ve üç kritik davranış garantisi verir: (1) **PolicyEngine** her erişimi RLS + ConsentGrant + CareTeam/link üçlüsüyle değerlendirir ve kararını `PolicyDecision`'a yazar; (2) **consent-revoke ≤5sn** içinde tüm canlı yüzeylerden veriyi düşürür; (3) **real-time ≤2sn** vardiya/SOS/görev/mesaj yayını. Deployment tek bölge AWS Canada Central (ca-central-1), tüm PII/PHI Kanada'da.

---

## 1. Çalışma Zamanı Mimarisi

- **Modüler monolit + iki yardımcı süreç:** `api` (REST+FHIR), `rt-gateway` (WebSocket), `worker` (kuyruk tüketicisi: bildirim fan-out, occurrence üretimi, cron zincirleri, ingestion, AI çağrıları). V0'da mikroservis **yok**; sınırlar modül-içi paket sınırıdır (bir modül diğerinin tablosuna yalnız kendi public arayüzünden erişir — derleme-zamanı lint kuralı).
- **Olay omurgası:** transactional outbox → kuyruk (SQS/PG-tabanlı; §7). Her domain mutasyonu aynı DB transaction'ında `outbox` satırı yazar; worker yayınlar. Kayıp olay = olamaz (outbox), çift olay = olabilir → tüm tüketiciler idempotent.
- **Zamanlayıcı:** tek merkezi cron tablosu (`scheduled_jobs`); saatlik/dakikalık işler: vardiya 24s/36s/48s zinciri (K3), ApprovalRequest 48s expiry (K4), occurrence üretimi (K7), SOS sunucu-taraflı faz işaretleme (Modül 2 §3.7), retention/purge işleri.

## 2. Servis Sınırı Kuralları
- Sınırlar Modül 2 §2 tablosundaki S1–S8. Çapraz yazım yalnız olayla (örn. `adherence.reported` → S5 `Observation` üretir).
- Okuma tarafında çapraz join'e izin var (tek DB) ama yalnız **read-model** katmanında; iş kuralı başka modülün tablosuna gömülmez.
- Bu kural, ileride sınır başına servis ayrıştırmayı (V2+) migration'sız mümkün kılar.

## 3. PolicyEngine

### 3.1 Karar modeli
Her istek için girdi: `subject` (user_id, roles[], practitioner_role_id?, acting_org_id), `action`, `resource` (type, id, patient_id?, kategori/lockbox etiketi), `context` (app_context, link durumları, CareTeam üyeliği, aktif grant seti, SDM). Çıktı: `{allow, reasons[], obligations{}}` + `PolicyDecision` kaydı (PHI'siz snapshot).

### 3.2 Değerlendirme sırası (kısa devre)
1. **RLS ön-filtre** (DB katmanı; org_id / patient-sahipliği) — geçemeyen satır uygulamaya hiç gelmez.
2. **Rol + app_context kapıları** (örn. B1: `family` + `occurrence.complete` → deny, kural id `B1_family_cannot_complete`).
3. **Link/CareTeam**: tüketici erişimi `PatientFamilyLink`/`CaregiverLink`(aktif) ister; HCP erişimi CareTeam üyeliği veya grant ister.
4. **ConsentGrant scope**: kategori bazlı; lockbox kategorileri (B5) açık grant ister; `substance_use` her noktada zorunlu kilitli. **V0 enforcement kapsamı:** kategori filtreleri S5 okuma DTO'larında uygulanır (Modül 2 §5); tam Cedar-tabanlı motor V1 — V0 kararları aynı arayüz imzasıyla kod-içi kural setinden döner (motor değişince çağıran değişmez).
5. **Obligations**: `audit_required` (hep true), `reauth_required{t3|t4}`, `mask_fields[]`, `badge_unverified`. K5: `break_glass` obligation'ı V0'da üretilmez.
6. Sonuç **varlık-sızdırmaz**: deny → 404/boş liste (Modül 1 §11).

### 3.3 Cache & invalidasyon
Karar cache TTL ≈5sn (Modül 1 §11). İnvalidasyon anahtarları: grant değişimi, link değişimi, CareTeam değişimi, rol değişimi → ilgili `(subject, patient)` anahtar uzayı anında düşürülür (revoke cascade'in ilk adımı).

## 4. Consent-Revoke Cascade (≤5sn)
`grants.revoked` olayı sırasıyla: (1) PolicyEngine cache purge (≤1sn); (2) `rt-gateway`: ilgili kanal aboneliklerinden etkilenen abonelere `grant.revoked` çerçevesi + sunucu-taraflı kanal yetki yeniden-değerlendirmesi (yetkisi düşen abonelik kapatılır) (≤2sn); (3) istemcilere `user:{id}:consent` üzerinden görünüm-düşürme sinyali — istemci ekrandaki veriyi anında maskeler ve cache'ini temizler (≤5sn); (4) `AuditLogEntry` (`consent.revoked`, cascade süreleri ölçümlü). Veri **gizlenir, silinmez** (Modül 1 §4.2). SLO: p95 uçtan uca ≤5sn; ihlal alarmı.

## 5. Görev Motoru Davranışı (K7)
- **Üretim:** her gece hastanın yerel 00:05'inde (timezone_iana) `CareTask.schedule`'dan **D+7 penceresi eager** üretilir; `unique(task_id, date_local)` ile idempotent (tekrar koşum zararsız).
- **Lazy backfill:** okuma anında pencere dışı bir gün istenirse (örn. istemci 10 gün ilerisine bakar) o gün on-demand üretilir, aynı unique kuralla.
- **Değişiklik semantiği:** `CareTask` düzenlenirse gelecekteki `todo` occurrence'lar yeniden üretilir; `done/skipped` geçmiş **asla** değiştirilmez. Pause → gelecek occurrence'lar silinmez, `status` korunur ama üretim durur (mevcutlar `todo` kalır ve UI "duraklatıldı" gösterir).
- **Tamamlama:** B1 kuralı PolicyEngine §3.2-2'de; `completed_by(_actor_type)` sunucu set eder; olay `occurrence.completed` → realtime + Notification + ActivityLog.
- **Carry-over:** yeni satır, `carry_over_from` bağıyla; zincir max 7 gün (sonra otomatik `skipped` + bildirim; sonsuz sarkma yok).

## 6. Bildirim Fan-out
`Notification` üretimi yalnız worker'da, olaylardan: taksonomi eşleme tablosu (event → event_type, alıcı kümesi kuralı) tek dosyada tutulur (kod-üreten ekipler için tek bakım noktası). Sıra: alıcı çözümü (link/grant filtreli) → `NotificationPreference` + quiet-hours (acil `sos` bypass) + `FamilyProfile.dnd` (B6; yalnız standart-çağrı/bakım-dışı tipleri susturur, `sos` daima geçer) → in-app satırı **her zaman** yazılır → kanal gönderimi (push→APNs/FCM; email V0, sms V1). Push payload'ı PHI taşımaz; başlık şablonu + `deep_link` (redirect-only).

## 7. Real-time Altyapı Seçimi
- **Mekanizma (4.6 kararı): WebSocket birincil** — `rt-gateway` (Node/uWS veya Elixir/Phoenix; ekip yetkinliğine göre, dış davranış Modül 2 §4 kontratıdır), Redis pub/sub fan-out, sticky-session'sız (bağlantı-anahtarlı abonelik durumu Redis'te).
- Push tamamlayıcı; polling yalnız istemci fallback'i (30sn, yalnız WS kurulamazsa).
- SLO: yayın gecikmesi p95 ≤2sn (vardiya/SOS/görev/mesaj), ≤5sn (worklist/consent). Ölçüm: olay `outbox.created_at` → istemci ack.

## 8. Ingestion Pipeline Davranışı (özet — tablolar Modül 1 §10)
Tier 1 (cihaz/wearable) → doğrudan `Observation` + Provenance(tier1). Tier 2 (yapılandırılmış FHIR/portal) → parse → tablolar + orijinal `DocumentReference`. Tier 3 (yapılandırılmış olmayan belge) → OCR → tier4 kuyruğu. Tier 4 (LLM ekstraksiyon) → `tier4_extraction_entities` → **insan doğrulama kuralı**: güvenlik-kritik (allergy/ilaç/DNR) ve hassas (B5 kategorileri; `substance_use` dahil, atlanamaz) her zaman insan kuyruğu; diğer yüksek-güven → "doğrulanmadı" rozetiyle otomatik akış. Maliyet korumaları: `cost_estimate_usd` üst sınırı org-başına günlük; aşımda kuyruk bekletilir + admin uyarısı.

## 9. Deployment, Ortamlar, Gözlemlenebilirlik
- **AWS ca-central-1**; multi-AZ RDS PostgreSQL (tek yazar + okuma replikası), S3 (Object Lock — belge/orijinal + audit arşiv), ElastiCache Redis, SQS, KMS. Multi-region V2 (Modül 1 §14.6).
- Ortamlar: dev → staging (senetik veri; **gerçek PHI staging'de yasak**) → prod. IaC (Terraform) + tek-tık geri alma (blue/green).
- LLM/AI uç noktaları yalnız Kanada-host (Modül 4 §7); IAM ile sınır-ötesi çıkış engeli (Modül 1 §1.6).
- Gözlemlenebilirlik: yapılandırılmış log (PHI-maskeli), metrik (SLO panoları: revoke-cascade, realtime gecikme, occurrence-üretim başarımı, SOS uç gecikmesi), izleme (request_id korelasyonu). Alarm: SLO ihlali, audit-yazım hatası (kritik — audit yazılamıyorsa mutasyon **reddedilir**: audit-first ilkesi yüksek-riskli uçlarda senkron, diğerlerinde outbox-garantili asenkron).

## 10. NFR Hedefleri (V0)
| Alan | Hedef |
|---|---|
| API gecikme | p95 < 400ms (okuma), < 800ms (yazma) |
| Real-time | §7 SLO'ları |
| Uptime | %99.5 V0 → %99.9 V1 |
| RPO / RTO | 15dk / 4s (V0) |
| Eşzamanlı kullanıcı | 10k V0 tasarım noktası |
| Audit bütünlüğü | %100 (audit-first); gecelik HMAC zincir doğrulama işi |

## 11. Güvenlik Operasyonları
Kısa liste (detay Modül 1 §3.5/§12): refresh-replay zincir iptali, IP/deneme blokları, oturum üst sınırı 5, anomali bildirimi (yeni cihaz e-postası), yıllık penetrasyon testi, PHIPA/PIPEDA veri-akış envanteri, tedarikçi işleme sözleşmeleri (LLM dahil). K5: V0'da break-glass yok — acil erişim süreci uygulama-dışı, playbook'u operasyon el kitabında.

## 12. Açık Konular (Modül 3) — KAPANDI [KARAR K11 — 2026-07-22]
1. `rt-gateway`: **Node.js + uWebSockets.js** (tek dil TypeScript yığını, Mühendislik El Kitabı §1; Elixir alternatifi kayda geçti, kontrat değişmediği için ileride ikame edilebilir).
2. Kuyruk: **SQS** gün-1 (yönetilen, outbox→SQS publisher; pgmq reddedildi — vacuum/ops yükü).
3. Okuma replikası: **V1** (V0 tek yazar yeterli; 10k eşzamanlı tasarım noktası altında).
4. Tier-4 LLM: Azure OpenAI Canada Central (Bakıcı PRD AI SLA kararıyla aynı); maliyet tavanları `SystemConfig` `ai.daily_cost_cap_*` (K10), org default günlük 50 USD, aşımda kuyruk beklet + ops uyarısı.
