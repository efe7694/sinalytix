# Sinalytix — Birleşik Çekirdek Altyapı PRD
## Modül 2 / 4 — API Tasarımı & Cross-App Kontratlar

**Sürüm:** 0.1 · **Tarih:** 2026-07-22 · **Statü:** Taslak (Modül 1 v0.1 + Kanonik Sözlük v0.2 üzerine)
**Bu modülün yeri:** (1) Veri Modeli & DB → (2) **API Tasarımı** ← *bu doküman* → (3) Backend Mimarisi → (4) Agent Orkestrasyon.
**Kural:** Bu doküman hiçbir tabloyu yeniden tanımlamaz; tüm tablo/enum referansları **Kanonik Sözlük v0.2**'ye ve Modül 1'e gider. Çelişkide sözlük kazanır.

---

## 0. Yönetici Özeti

Dört uygulama (Hasta, Aile, Bakıcı, HCP) **tek bir API yüzeyine** karşı kodlanır: `api.sinalytix.ca/v1`. Uygulama farklılaşması ayrı API'lerle değil, **`app_context` + rol + ConsentGrant filtreli görünümlerle** sağlanır. REST + JSON birincildir; FHIR R4 yalnızca `/fhir/*` cephe yolunda üretilir (Modül 1 §1.2). Real-time gereksinimleri (vardiya ≤2sn, SOS, mesaj) WebSocket kanallarıyla; push (APNs/FCM) tamamlayıcıdır, taşıyıcı değildir. Tüm mutasyonlar idempotency anahtarı taşır; tüm listeler cursor-pagination kullanır; tüm hatalar tek zarf şemasındadır.

---

## 1. Genel Sözleşme (tüm endpoint'ler)

### 1.1 Taban & sürümleme
- Taban: `https://api.sinalytix.ca/v1` (REST) · `https://api.sinalytix.ca/fhir/r4` (FHIR cephe, yalnız entegrasyon) · `wss://rt.sinalytix.ca/v1` (WebSocket).
- Sürümleme path'te (`/v1`). Kırıcı değişiklik = yeni major; alan **ekleme** kırıcı sayılmaz (istemciler bilinmeyen alanı yok sayar).
- Tarihler ISO-8601 UTC; istemci gösterimi hastanın/kullanıcının `timezone_iana`'sı ile.

### 1.2 Kimlik başlıkları (her istekte)
| Başlık | Zorunlu | Not |
|---|---|---|
| `Authorization: Bearer <access_token>` | ✔ | JWT, 15dk TTL; refresh rotasyonu Modül 1 §3.5 |
| `X-App-Context` | ✔ | `patient` \| `family` \| `caregiver` \| `hcp` \| `admin` (K9) — `Session.app_context` ile eşleşmek zorunda; eşleşmezse `403 APP_CONTEXT_MISMATCH` |
| `X-Idempotency-Key` | mutasyonlarda ✔ | UUID; 24s pencerede aynı anahtar+body → önbellenmiş yanıt, yeniden yürütme yok |
| `Accept-Language` | — | `en`/`fr`/`tr`; yanıt metinleri (hata mesajı, bildirim şablonu) için |

Backend her istekte RLS oturum değişkenlerini set eder: `app.acting_user_id`, `app.acting_org_id`, `app.app_context`, `app.acting_roles` (Modül 1 §11). İstemci org seçimi `X-Acting-Org` başlığı ile (yalnız HCP, çok-org kullanıcı); sunucu üyeliği doğrular.

### 1.3 Hata zarfı (tek şema)
```json
{
  "error": {
    "code": "CONSENT_REQUIRED",
    "message": "insan-okur, Accept-Language'a göre",
    "details": [{"field": "scope.mental_health", "issue": "no_active_grant"}],
    "request_id": "uuid"
  }
}
```
Kanonik kodlar (alt-küme): `VALIDATION_FAILED` 422 · `UNAUTHENTICATED` 401 · `PERMISSION_DENIED` 403 · `APP_CONTEXT_MISMATCH` 403 · `CONSENT_REQUIRED` 403 · `NOT_FOUND` 404 (**varlık-sızdırmaz**: yetkisiz kayıt da 404, 403 değil — Modül 1 §11) · `CONFLICT_VERSION` 409 (optimistic lock) · `IDEMPOTENCY_REPLAY` 200 (önbellek yanıtı, `X-Idempotent-Replayed: true`) · `RATE_LIMITED` 429 · `REAUTH_REQUIRED` 401 (+`details.tier: t3|t4`).

### 1.4 Pagination, sıralama, filtre
- Cursor tabanlı: `?limit=25&cursor=<opaque>`; yanıt `{"data": [...], "next_cursor": "..." | null}`. Offset pagination **yok** (RLS + canlı veri altında tutarsız).
- Sıralama endpoint-başına sabit whitelist (`?sort=-created_at`).

### 1.5 Rate limit (varsayılan, kullanıcı-başına)
Okuma 300/dk · yazma 60/dk · auth uçları 10/dk · SOS uçları **muaf** (asla 429 dönmez; kötüye kullanım analizi asenkron). Aşımda `Retry-After`.

---

## 2. Servis Sınırları (bounded contexts)

API tek yüzeydir ama backend 8 servis sınırına ayrılır; endpoint önekleri bu sınırlara birebir gider. Bir sınırın tablosuna başka sınır **doğrudan yazamaz** (Modül 3 §2).

| # | Servis | Önek | Sahip olduğu tablolar (Sözlük ref.) |
|---|---|---|---|
| S1 | Identity & Access | `/auth`, `/users`, `/sessions` | `User`, `*Profile`, `Session`, `RefreshToken`, MFA, `Organization`, kredensiyel |
| S2 | Consent & Policy | `/consents`, `/grants`, `/sdm` | `ConsentRecord`, `ConsentGrant`, `SDMDeclaration`, `PolicyDecision` |
| S3 | Care & Tasks | `/care-tasks`, `/occurrences`, `/adherence`, `/symptom-reports` | `CareTask`, `CareTaskOccurrence`, `AdherenceReport`, `SymptomReport`, `ActivityLog` |
| S4 | Shift & Links | `/shifts`, `/caregiver-links`, `/family-links`, `/emergency-contacts` | `CaregiverShift`, `CaregiverLink`, `PatientFamilyLink`, `EmergencyContact` |
| S5 | Clinical | `/patients`, `/conditions`, `/medications`, `/observations`, `/care-plans`, `/encounters`, `/service-requests`, `/documents` | Modül 1 §5 klinik tablolar + `Provenance` |
| S6 | Comms | `/conversations`, `/messages`, `/notifications`, `/notification-preferences` | `Conversation`, `Message`, `Notification`, `NotificationPreference` |
| S7 | Emergency | `/sos-events`, `/call-attempts` | `SOSEvent`, `CallAttemptLog` |
| S8 | Governance & AI | `/approvals`, `/ai/interactions`, `/ai/*` skill uçları | `ApprovalRequest`, `ai_interaction_log` (+Modül 4 uçları) |
| S9 | Admin (K9/K10) | `/admin/*` | `AdminUser`, `AdminQueueItem`, `SystemConfig`, `FeatureFlag` (+admin projeksiyonları) — kontrat: Admin Panel PRD §5 |

---

## 3. Endpoint Kataloğu (yük taşıyanlar)

Format: `METHOD path` — davranış · yetki (kim) · notlar. CRUD'un bariz kısımları (GET by id vb.) tekrarlanmaz; farklılaşan kurallar yazılır.

### 3.1 S1 — Identity & Access
- `POST /auth/register` — kanal: `apple_sso`/`google_sso`/`phone_otp`/`email_password`(yalnız hcp). PII, auth tamamlanmadan gönderilmez (Modül 1 §13): kayıt yalnız kimlik çekirdeği alır; profil sonradan.
- `POST /auth/otp/request` + `POST /auth/otp/verify` — telefon OTP; 6 hane, 5dk TTL, 5 deneme.
- `POST /auth/login` · `POST /auth/refresh` (rotasyon; replay → zincir iptal) · `POST /auth/logout` (session revoke).
- `POST /auth/reauth` — T3 (şifre/biyometrik onay) ve T4 (tam 2FA) yükseltmeleri; yanıtı 5dk'lık `elevation_token`. T3/T4 gerektiren uçlar `REAUTH_REQUIRED` döner.
- `GET/PATCH /users/me` — profil uzantıları rol bazlı iç içe döner (`patient_profile`, `family_profile`, ...).
- `GET /users/me/roles` — `roles[]`; UI rol anahtarlama buradan.
- `POST /users/me/profiles/{role}` — rol uzantısı ekleme (örn. hasta hesabına `family` rolü eklenmesi).

### 3.2 S2 — Consent & Policy
- `POST /consents` — `ConsentRecord` yazımı (append-only; PATCH/DELETE **yok**, 405). Body: `app_context`, `version`, `flags`. Sunucu `server_recorded_at`+`ip_hash` ekler.
- `GET /consents?user_id=me` — geçmiş (immutable).
- `POST /grants` — `ConsentGrant` oluşturma; yalnız hasta veya aktif SDM (`403 PERMISSION_DENIED` aksi halde). Lockbox kategorileri (`mental_health`, `hiv_sti`, `gender_identity`, `substance_use`) **scope'ta açıkça** listelenmedikçe verilmez (B5; örtük "all" scope lockbox'ı kapsamaz).
- `POST /grants/{id}/revoke` — iptal; ≤5sn cascade (Modül 3 §4). Yanıt hemen 202; cascade asenkron.
- `GET /grants?patient_id=` — hasta kendi grant'larını tam görür; diğer roller yalnız kendilerine verilenleri.
- `POST /sdm` / `PATCH /sdm/{id}` — `SDMDeclaration`; `activated_by` zorunlu.
- **V0 notu (B2):** Bu uçlar V0'da tam çalışır (yazım+okuma); canlı erişim *enforcement*'ı PolicyEngine V1'dir — V0'da enforcement, RLS + link tabloları + uygulama-katmanı kontrolleriyle sınırlıdır ve bu fark istemciye `grant.enforcement: "declarative_v0"` alanıyla açıkça bildirilir.

### 3.3 S3 — Care & Tasks
- `POST /care-tasks` — oluşturan: hasta, bakıcı, aile, klinisyen, agent (B1: aile **oluşturabilir**). `created_by_actor_type` sunucuda `app_context`+rol'den türetilir, istemciden alınmaz.
- `PATCH /care-tasks/{id}` — düzenleme; `If-Match: <version>` başlığıyla optimistic lock (medication subtype zorunlu; diğerlerinde önerilir). Uyuşmazlık → `409 CONFLICT_VERSION` + güncel kaynak.
- `POST /care-tasks/{id}/decompose` — **yalnız agent/system** (Modül 4); `parent_task_id`'li alt görevler üretir.
- `GET /occurrences?patient_id=&date=today` — günlük liste; dört uygulamanın "bugün" görünümünün tek kaynağı.
- `POST /occurrences/{id}/complete` — **B1 enforcement noktası:** `app_context=family` → `403 PERMISSION_DENIED` (`details.rule: "B1_family_cannot_complete"`). Hasta/bakıcı/agent/system geçer. `completed_by_actor_type` sunucuda set edilir.
- `POST /occurrences/{id}/skip` · `POST /occurrences/{id}/undo` (yalnız tamamlayan aktör veya hasta; ActivityLog'a yazar) · `POST /occurrences/{id}/carry-over` (yeni occurrence; orijinal immutable).
- `POST /adherence` — self-report → `Observation` türetimi (S5'e event ile, doğrudan yazım değil).
- `POST /symptom-reports` — Hasta-AI akışından; `sent_to_family`/`sent_to_caregiver` bayrakları grant-filtreli.

### 3.4 S4 — Shift & Links
- `POST /shifts/check-in` — bakıcı; aktif vardiya varsa `auto_switch` (eskisi kapanır, `check_out_reason=auto_switch`). Yanıtta her iki shift. Partial-unique ihlali imkânsız (tek uçtan geçer).
- `POST /shifts/{id}/check-out` — `shift_note` (V0 serbest metin, K2 placeholder) birlikte gönderilebilir.
- `GET /shifts?patient_id=&active=true` — Hasta/Aile okuma görünümü: **sahibin şeması** (`shift_active`, `checked_in_at`, `checked_out_at`, `shift_note`) + join alanı `caregiver: {display_name, phone}` (`CaregiverProfile`'dan; A5 — shift'te telefon yok).
- `POST /caregiver-links` — hasta üretir: `{link_code (6 hane numerik), qr_payload, expires_at(+15dk)}` (B4).
- `POST /caregiver-links/claim` — bakıcı `link_code` veya QR ile; 5 yanlış deneme → kod iptal.
- `DELETE /caregiver-links/{id}` — unlink; K4/FAM-12 kapsamında `PatientApprovalConfig` açıksa önce `ApprovalRequest` üretir (S8), direkt silmez.
- `POST /family-links/invite` + `/family-links/accept` — davet akışı; kabul sonrası `permission_level=view` default. `PATCH /family-links/{id}` (yetki değişimi) yalnız Patient app'ten (FAM-13); `full` için K6 kuralı sunucuda doğrulanır (`SDMDeclaration.active` şart).
- `POST /emergency-contacts` — max 3, `sort_order` 1–3; A11 tek şema.

### 3.5 S5 — Clinical (özet; HCP PRD detayları geçerli)
- Standart CRUD: `/patients`, `/conditions`, `/medications`, `/observations`, `/care-plans`, `/goals`, `/encounters`, `/service-requests`, `/documents`.
- Yazım: yalnız HCP + Ingestion (tüketici `medications` serbest-metin girişi `data_source=manual` ile ayrı uç: `POST /medications/self-declared`).
- Okuma: hasta kendi verisinin tamamı; aile/bakıcı **kategori-filtreli** (`ConsentGrant.scope`; lockbox default gizli, B5); HCP org-RLS + grant.
- Klinik not/imza, cosign, order/Rx davranışı HCP PRD Doc'larında; bu modül yalnız sınırı sabitler: imzalı not `status=final` sonrası immutable, düzeltme `amendment` kaydıyla.
- `GET /patients/{id}/360` — Patient-360 birleşik görünüm (provenance rozetli); render kontratı §5.3.

### 3.6 S6 — Comms
- `POST /conversations` — `kind` enum Modül 1 §7.1; "Bakım Ekibim" grubu sistem-türetilidir, bu uçtan oluşturulamaz.
- `POST /conversations/{id}/messages` — gönderim; 5dk edit penceresi `PATCH /messages/{id}` (sonrası 409). `sender_actor_type=agent` yalnız Modül 4 servis kimliğinden.
- `GET /notifications?unread=true` — feed; `POST /notifications/{id}/read`.
- `PATCH /notification-preferences` — event_type × kanal × quiet-hours; `sos` tipi kapatılamaz (`422`).
- Bildirim **üretimi** API'den değil, domain olaylarından (Modül 3 §6); istemciler yalnız okur/işaretler.

### 3.7 S7 — Emergency (SOS)
Ayrıntılı ekran akışı: `Sinalytix_SOS_UX_Akis_Spec.md`. API kontratı:
- `POST /sos-events` — tetik (hasta). Yanıt: event + Faz-1 çağrı planı (EC `sort_order` sırası). **Auth dışında hiçbir ön-koşul yok**; rate-limit muaf.
- `POST /sos-events/{id}/advance` — faz ilerletme; body `{from_phase, elapsed_ms, cancel_window_shown: true}` — istemci iptal penceresini gösterdiğini beyan eder (audit).
- `POST /sos-events/{id}/cancel` — `cancel_stage` zorunlu (Sözlük §6 enum).
- `POST /sos-events/{id}/resolve` — hasta veya aranan aile üyesi; `resolved_by` set edilir.
- `POST /call-attempts` — her arama girişimi (sos + regular) loglanır; native dialer sonucu **bilinmediği için** `status` yalnız {initiated, cancelled, completed=kullanıcı-uygulamaya-döndü} — "answered" alanı **yoktur** (B7).
- `GET /sos-events?patient_id=&fresh=true` — Aile banner'ı; `fresh` = `status=active` VEYA `triggered_at > now()-freshness_window_minutes` (240 default; A13).
- Sunucu-taraflı güvence: Faz-2 zamanlayıcısı **sunucuda da** koşar (istemci ölürse bile event `escalated_911`'e işaretlenir ve aileye bildirim düşer — arama yapılamaz ama görünürlük kaybolmaz). Klinik değerlendirme yok (SaMD-nötr).

### 3.8 S8 — Governance & AI
- `POST /approvals` — sistem-içi üretim (bkz. 3.4 unlink örneği); `GET /approvals?status=pending` — aile kuyruğu; `POST /approvals/{id}/approve|reject` — yalnız `edit`/`full` (+K6). 48s expiry sunucu cron'u (K4).
- `GET /ai/interactions?patient_id=` — yalnız admin/denetim rolü (append-only log görünümü).
- AI skill uçları (`/ai/chat`, `/ai/scribe/*`, `/ai/briefing`, `/ai/decompose`) Modül 4'te tanımlıdır; hepsi zorunlu `ack_ai_processing` consent kontrolünden (B9) ve guardrail pipeline'ından geçer.

---

## 4. Real-time Kanalları (WebSocket)

Bağlantı: `wss://rt.sinalytix.ca/v1?token=<access_token>` → sunucu `Session` doğrular, RLS bağlamı kurar. Protokol: JSON çerçeve `{channel, event, payload, ts}`. İstemci `subscribe`/`unsubscribe` gönderir; sunucu yetkisiz kanalı sessizce reddetmez, `error` çerçevesi döner (kanal adı varlık sızdırmayacak şekilde patient-id bazlıdır ve zaten yetki kontrollüdür).

| Kanal | Olaylar | Abone olabilen | SLA |
|---|---|---|---|
| `patient:{id}:shift` | `shift.checked_in`, `shift.checked_out`, `shift.auto_switch` | hasta, linkli aile | **≤2sn** |
| `patient:{id}:sos` | `sos.triggered`, `sos.phase_advanced`, `sos.cancelled`, `sos.resolved`, `sos.escalated_911` | linkli aile (+hasta kendi cihazları) | ≤2sn |
| `patient:{id}:tasks` | `occurrence.completed`, `occurrence.skipped`, `task.created/updated`, `occurrence.carried_over` | hasta, bakıcı(aktif link), aile | ≤2sn |
| `user:{id}:inbox` | `message.new`, `message.read`, `notification.new`, `approval.pending/decided` | kullanıcının kendisi | ≤2sn |
| `org:{id}:worklist` | `note.cosign_requested`, `result.available`, `mrp.transfer`, `verification.queued` | org üyesi HCP | ≤5sn |
| `user:{id}:consent` | `grant.revoked`, `grant.created`, `permission.changed` | ilgili taraflar | **≤5sn** (revoke cascade, Modül 3 §4) |

Kopukluk stratejisi: istemci `last_event_id` ile reconnect → sunucu boşluğu replay eder (24s tampon); daha eskisi için REST'e düş. Push (APNs/FCM) her kritik olayda **paralel** gider (uygulama kapalıysa tek taşıyıcı push'tur); push, veri taşımaz, yalnız uyandırır + deep_link taşır (redirect-only, Modül 1 §7.2).

---

## 5. Cross-App Render Kontratları

Aynı verinin farklı uygulamalarda **ne kadar** görüneceği API'de sabitlenir (istemci keyfine bırakılmaz). Sunucu, `X-App-Context` + rol + grant'a göre **daraltılmış DTO** döner:

### 5.1 İlaç görünümü (örnek daraltma)
| Alan | Hasta | Bakıcı | Aile | HCP |
|---|---|---|---|---|
| ad + saat | ✔ | ✔ | ✔ (grant: `medications`) | ✔ |
| doz | ✔ | ✔ | **✗** (Modül 1 §4.2) | ✔ |
| adherence geçmişi | ✔ | ✔ (aktif link) | özet (✔/✗ oranı) | ✔ |
| lockbox-kategorili ilaç | ✔ | yalnız açık grant | yalnız açık grant | grant/RLS |

### 5.2 Care plan hasta-bakan görünümü
`GET /care-plans/{id}?view=patient_facing` → sadeleştirilmiş DTO: hedefler + görevler + sorumlu ekip; klinik gerekçe/notlar hariç. Aile `view=family` aynı DTO'nun grant-filtreli hali. HCP `view=clinical` tam kaynak.

### 5.3 Patient-360
`GET /patients/{id}/360` → widget listesi; her veri noktası `{value, provenance: {tier, verified, source}, sensitive: bool}` taşır. "Doğrulanmadı" rozeti `provenance.verified=false` ile istemcide çizilir; sunucu asla doğrulanmamış veriyi doğrulanmış gibi işaretlemez.

### 5.4 Vardiya görünümü
§3.4'teki gibi: sahibin şeması + `caregiver` join nesnesi. Aile ve Hasta aynı DTO'yu alır (A5 tek şema).

---

## 6. FHIR Cephe (`/fhir/r4`)

- Yalnız **dış entegrasyon** ve ileride cross-org değişim için; dört uygulama iç REST kullanır.
- Üretilen kaynaklar: `Patient`, `Condition`, `AllergyIntolerance`, `MedicationStatement/Request`, `Observation`, `CarePlan`, `Goal`, `Encounter`, `ServiceRequest`, `DocumentReference`, `Provenance`, `CareTeam`, `RelatedPerson`, `Communication`, `Consent` (ConsentGrant projeksiyonu), `Task` (VerificationTask projeksiyonu).
- Serializer katmanı tablo→FHIR eşlemesini uygular (alan eşleme tabloları HCP Doc 5 + Modül 1 §5); **kayıpsızlık testi** CI'da: her klinik tablo satırı FHIR'a çevrilip geri parse edildiğinde yük taşıyan alanlar birebir dönmeli.
- CA Core+ profilleri: `Patient`, `Observation` (interRAI dahil) V0'da; kalanlar V1.
- Auth: SMART-on-FHIR **V2**; V0'da FHIR cephe yalnız sunucu-sunucu API anahtarıyla (Ingestion ortakları).

---

## 7. İdempotency, Eşzamanlılık, Çevrimdışı

- **İdempotency:** §1.2. Çevrimdışı kuyruklanan mutasyonlar (bakıcı check-in, occurrence complete) cihazda üretilen `X-Idempotency-Key` ile güvenle tekrar oynatılır; `occurred_at` alanı cihaz zamanını taşır, sunucu `recorded_at`'i ayrı yazar (K3/vardiya cihaz-saat riski audit'te görünür kalır).
- **Optimistic lock:** klinik düzenleme + medication CareTask'ta `If-Match` zorunlu (Modül 1 §1.7); diğer tüketici mutasyonları last-write-wins + `ActivityLog`.
- **Çevrimdışı okuma:** istemciler son başarılı yanıtı max 24s gösterir ("çevrimdışı" rozetiyle — Aile PRD §çevrimdışı kuralına uyumlu).

---

## 8. Güvenlik Kontratları

- TLS 1.2+ zorunlu; sertifika pinleme mobil istemcilerde.
- T3/T4 re-auth gerektiren uçlar: HCP imza/order (T3), MRP transfer/grant-revoke-by-clinician/hesap silme/rol değişimi (T4) — `REAUTH_REQUIRED` akışı §3.1.
- Tüm yanıtlarda `request_id`; `AuditLogEntry` korelasyonu bu id ile.
- PHI, URL'de **asla** taşınmaz (query'de patient_id yalnız opak uuid; isim/doğum tarihi query-string'de yasak). Loglama katmanı query-string'i maskeleyerek yazar.
- CORS: yalnız birinci-parti origin'ler; FHIR cephe hariç üçüncü-parti browser erişimi yok.

---

## 9. Açık Konular (Modül 2) — KAPANDI [KARAR K11 — 2026-07-22]
1. WebSocket: **self-host Node.js + uWebSockets.js (ECS)** — yönetilen servis (API GW WS) reddedildi (kanal-yetki yeniden-değerlendirme gereksinimi §4 için esneklik).
2. FHIR `$everything`: **V1** (V0'da kaynak-bazlı uçlar yeterli; ortak talebi netleşince).
3. HCP worklist: tek uç **`GET /worklist?kind=cosign|order|result|verification&status=&sort=`** — sorgu-tabanlı türetilmiş görünüm (Modül 1 §6 ClinicalWorkItem); yanıt öğeleri `{kind, resource_type, resource_id, due_at, priority}`.
4. Rate-limit: §1.5 değerleri başlangıç sabiti; yük testi sonrası `SystemConfig` üzerinden kalibre edilir (K10).
