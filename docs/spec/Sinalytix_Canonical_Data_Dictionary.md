# Sinalytix — Canonical Data Dictionary (v0.2)

**Tarih:** 2026-06-28 (v0.1, B1–B10) · **Güncelleme:** 2026-07-22 (v0.2, K1–K8 + Modül 2–4 yayımı) · **Statü:** Onaylı · **Rol:** Dört uygulama PRD'si + Çekirdek Modül 1–4'ün **tek doğruluk kaynağı**.
Bir tablo/enum bu dosyada nasıl tanımlıysa öyledir; uygulama PRD'leri tabloyu **yeniden tanımlamaz, buraya referans verir**.

> **SaMD notu (B7):** Bu sözlükteki hiçbir tanım uygulamayı "teşhis koyan / tedavi öneren / klinik değerlendirme yapan" konuma getirmez. Tüm AI ve SOS tanımları **koordinasyon + kayıt + aramayı kolaylaştırma** sınırındadır. Health Canada SaMD seviye atlatacak hiçbir davranış eklenmemiştir.

---

## 0. Karar Kaydı (onaylı)

| # | Karar |
|---|---|
| B1 | **Aile görevi tamamlayamaz (V0).** Yalnız Hasta + Bakıcı tamamlar. "Bakıcı yokken aile ilaç verdi" istisnası V1 açık-konu. |
| B2 | İki katmanlı consent **şimdi tanımlanır** (`ConsentRecord` + `ConsentGrant` + `SDMDeclaration`); canlı erişim *enforcement*'ı PolicyEngine/Modül 3 (V1). |
| B3 | Tek kanonik AI günlüğü `ai_interaction_log` + `judge_verdict` + `risk_tier`{green/yellow/red}, immutable, 7y. |
| B4 | `CaregiverLink.link_code` = **6 hane numerik**. Tabloyu Patient app sahiplenir; Caregiver referans verir. |
| B5 | Lockbox = {`mental_health`, `hiv_sti`, `gender_identity`, `substance_use`}. `substance_use` her yerde zorunlu kilitli. `genetic` = "sensitive, non-lockbox (V2)". |
| B6 | DND = `FamilyProfile.dnd` (kişi başına). `FamilyAvailability` emekli. Per-hasta override V1. |
| B7 | `SOSEvent` + `CallAttemptLog` kanonik şema + güvenli 911 akış kuralı (aşağıda). SaMD-nötr. |
| B8 | `coordinator` / `nurse` / `admin` = `User.roles[]` değerleri (ayrı tablo değil). |
| B9 | AI onamı tek yerde: `ConsentRecord.flags.ack_ai_processing` + revoke için `ConsentGrant`. |
| B10 | Yükleme limiti bağlama göre: kredensiyel 10MB (HCP Doc 1), klinik 25MB (HCP Doc 5); çapraz-referanslı. |

### 0.1 Karar Kaydı Ek — K1–K8 (2026-07-22 · ÖNERİLEN DEFAULT'lar; klinik/legal teyit bekleyenler işaretli)

| # | Karar | Nerede işlendi | Teyit |
|---|---|---|---|
| K1 | Lone-worker: V0 = K3 zinciri + `system_timeout` kapanışında koordinatöre bildirim; V1 = kaçırılan-checkout eskalasyonu + panik akışı (**PRD 08** rezervasyonu) | Bakıcı §4.4 + PRD 08 | Klinik + İş Hukuku |
| K2 | SBAR: V0 serbest metin + SBAR-ipuçlu placeholder; V1 `shift_note_structured` 4-alan form | Bakıcı §1.2 | Klinik |
| K3 | Vardiya kapanışı V0: 24s uyarı → 36s ikinci uyarı → 48s `system_timeout` otomatik kapanış (`duration_minutes=NULL`) | Bakıcı §2.x | — |
| K4 | Onay kuyruğu: `PatientApprovalConfig` V0'da canlı (hasta toggle); toggle açıkken 48s→otomatik red korunur; onaylayıcı yoksa deadlock-override; SDM aktifse kontrol SDM'de | Aile FAM-12 | Klinik/Legal |
| K5 | Break-glass V0'da YOK; `context.breakGlass` daima false; "break-glass available" mesajı V0'da gösterilmez; acil yol = uygulama-dışı sözlü onay → sonradan `ConsentGrant`; `BreakGlassOverride` V1 | HCP Doc 4 + Modül 3 | Legal |
| K6 | `permission_level=full` yalnız `SDMDeclaration.active=true` üyeye atanabilir; aksi halde max `edit` | Aile FAM-13 | Klinik/Legal |
| K7 | Occurrence üretimi: **eager D+7** (gece, hasta TZ, idempotent `unique(task_id, date_local)`) + okuma anında lazy backfill | Modül 3 §5 | — |
| K8 | GENERAL_LIFE klinik sızıntı: nicel sağlık/beslenme/egzersiz tavsiyesi (su miktarı, kalori, doz, tempo) GENERAL_LIFE **sayılmaz** → `IN_SCOPE_ACTION` dışı sapma = sarı katman, jenerik "bakım ekibine danışın" yanıtı | Modül 4 §4 | Klinik |
| K9 | **Admin Panel = 5. yüzey.** `Session.app_context` enum'una **`admin`** eklendi; admin web-only, zorunlu TOTP, PHI-maskeli varsayılan + gerekçeli "reveal", iki-kişi kuralı; lockbox verisi admin'de asla görünmez | Admin Panel PRD | — |
| K10 | Admin veri ekleri: **`SystemConfig`** (key, value jsonb, value_schema, requires_second_approval) + **`FeatureFlag`** (key, enabled, scope{global\|org\|user_pct}, app_context[]); `AdminUser.admin_role` → **text[]** {support, credentialing, compliance, ops, superadmin}; runtime sabitler (SOS pencereleri, K3 saatleri, 48s onay, carry-over 7g, yükleme limitleri) `SystemConfig`'ten okunur | Admin PRD §6/A7, Modül 2 §2 (S9) | — |
| K11 | Modül 2–4 açık soruları kapandı: rt-gateway = **Node.js + uWebSockets.js (self-host, ECS)** · kuyruk = **SQS** (outbox→SQS) · okuma replikası = **V1** · FHIR `$everything` = **V1** · HCP worklist = `GET /worklist` sorgu-parametreli tek uç · judge = küçük CA-host model + deterministik ön-filtre (kalibrasyon değerlendirme setinin ilk koşumunda) · aile brifing metni **cache'lenmez** (her istekte üretim; revoke ≤5sn garantisine dahil) · rate-limit değerleri yük testinde kalibre, başlangıç Modül 2 §1.5 | Modül 2 §9, Modül 3 §12, Modül 4 §9 | — |

---

## 1. Kimlik & Erişim

**`User`** — tek gerçek kişi = tek satır.
`user_id` (uuid PK) · `email` (citext) · `email_verified` · `phone_e164` · `phone_verified` · `auth_methods` text[] · `password_hash` (Argon2id; yalnız HCP) · `locale` {en|fr|tr} · `status` {incomplete|active|suspended_soft|suspended_hard|dormant|deactivated} · **`roles[]`** text[] {`patient`|`family`|`caregiver`|`clinician`|`nurse`|`coordinator`|`admin`} · `created_at`/`updated_at`/`deleted_at`.

> **KALDIRILAN:** tekil `user_type` ayrımcısı. Her yerde `roles[]` çok-değerli. Ayrı `FamilyMember`/`Caregiver(s)` kimlik tabloları → `User` + `*Profile`.

**Profil uzantıları (1:1, `user_id` FK):** `PatientProfile`, `PractitionerRole` (N kayıt), `FamilyProfile` (**`dnd` bool burada**), `CaregiverProfile` (`agency_id?`, `certifications[]`, `role` {psw|rpn|rn|hca|other}, `availability_status` {available|unavailable|on_shift}), `AdminUser`. `Organization` (her klinisyen birine bağlı; solo = gizli self-org).

**Session:** per-app; `app_context` {patient|family|caregiver|hcp|**admin** (K9)} **zorunlu kolon**; max 5 eşzamanlı (admin: max 2, 8s mutlak/15dk idle); SSO V2.

---

## 2. Consent (İki Katman) — B2/B9

**`ConsentRecord`** (immutable yasal/ToS, append-only, 7y) — `consent_id` · `user_id` · `app_context` · `version` · `flags` (jsonb) · `consented_at` · `server_recorded_at` · `ip_hash`.
Flag seti (polimorfik): ortak `accept_tos`, `accept_privacy`, `ack_not_emergency`; tüketici `ack_no_clinical_decision` **yalnız caregiver/clinician**; **`ack_ai_processing`** (AI/sesli özellik kullanan herkes — Hasta wakeword, Bakıcı/Aile AI, HCP Scribe).

**`ConsentGrant`** (iptal edilebilir runtime veri-paylaşımı, default-deny) — `grant_id` · `patient_id` · `granted_to_kind` {practitioner_role|org|family_member|caregiver|system} · `granted_to_id` · `scope` (jsonb, kategori bazlı) · `permission` {permit|deny} · `period_start/end` · `granted_by` · `revoked_at/by`.
*V0: tablo + yazım var; canlı erişim enforcement V1 (PolicyEngine).* Aile/Bakıcı AI erişimi bu grant'ın rol-filtreli görünümü.

**`SDMDeclaration`** — `patient_id` · `sdm_user_id`/`related_person_id` · `province_rule` (ON HCCA MVP) · `poa_document_id` · `active` · `activated_by`.

---

## 3. Görev (Care & Tasks) — B1

**`CareTask`** — `task_id` · `patient_id` · **`parent_task_id`** (uuid null; agent alt-görev hiyerarşisi) · `care_plan_id?`/`goal_id?` · `title` · `type` {one_time|recurring|counter} · `subtype` {standard|medication} · `schedule` (jsonb: days_of_week, time(s), daily_target) · `created_by` + `created_by_actor_type` {patient|caregiver|family|clinician|system|**agent**} · `source_provenance` {manual|caregiver|family|integrated|agent} · `status` {active|paused|completed|cancelled} · `deleted_at`.

**`CareTaskOccurrence`** — `occurrence_id` · `task_id` · `patient_id` · `date_local`/`time_local` · `status` {todo|done|skipped} · **`completed_by_actor_type`** {patient|caregiver|system|**agent**} *(NOT `family` — B1)* · `completed_by` · `counter_value` · `carry_over_from`.

> **İzin (B1):** tamamlama = Hasta + Bakıcı (+agent/system). **Aile tamamlayamaz**; yalnız ekler/görür.
> **KALDIRILAN:** `TaskDefinition`/`TaskSchedule`/`TaskOccurrence` adları → `CareTask`/`CareTaskOccurrence`.

---

## 4. Vardiya & Link

**`CaregiverShift`** (sahip: Caregiver app; okuma: Patient + Family) — `shift_id` · `caregiver_id` · `patient_id` · **`shift_active`** (bool) · **`checked_in_at`** · **`checked_out_at`** · `check_out_reason` {manual|auto_switch|system_timeout} · `shift_note` (text) · `shift_note_structured` (jsonb, SBAR; V1) · `duration_minutes` · `timezone_iana` · `location_checkin` (point; V2 EVV) · `alert_24h_sent` · `created_at`.
Partial unique index: tek aktif vardiya/bakıcı. Realtime broadcast ≤2sn. Silinmez.

> **Aile PRD'si buna hizalanır:** `status`→`shift_active`(bool), `check_in_at`→`checked_in_at`, `check_out_at`→`checked_out_at`, `shift_notes`→`shift_note(_structured)`. `caregiver_phone` shift'te DEĞİL; `CaregiverProfile.phone`'dan join.

**`CaregiverLink`** (sahip: Patient app) — `link_id` · `patient_id` · `caregiver_id` · **`link_code` (6 hane numerik)** · `qr_payload` · `expires_at` (+15dk) · `status` {pending|linked|expired|unlinked} · `linked_at`/`unlinked_at`.

---

## 5. AI Etkileşim Günlüğü — B3 (tüm uygulamalar)

**`ai_interaction_log`** (immutable, append-only, 7y) — `interaction_id` · `app_context` · `user_id` · `patient_id?` · `skill` {scribe|briefing|qa|command|translate|decompose|symptom|...} · `model_id` · `input_encrypted` · `output_encrypted` · **`judge_verdict`** {MEDICAL_ADVICE|IN_SCOPE_ACTION|GENERAL_LIFE|IRRELEVANT|REFUSED|...} · **`risk_tier`** {green|yellow|red} · `action_taken` · `human_approved_by?` · `tokens` · `cost` · `created_at`.

**Eşleme (mevcut → kanonik):**
- Hasta `risk_level` {low|medium|high} → `risk_tier` {green|yellow|red}; `judge_category` → `judge_verdict`. (`VoiceSession`/`ProposedAction`/`ActionExecutionLog` operasyonel kalır ama özet `ai_interaction_log`'a yazılır.)
- Bakıcı `safety_filter_triggered`/`safety_filter_reason` → `judge_verdict`/`risk_tier` altında alt-alan olarak korunur.
- HCP `ai_scribe_sessions` → ikiye: immutable `ai_interaction_log` (verdict/tier) + mutable `ai_scribe_drafts` (taslak içerik).

---

## 6. SOS & Acil — B7 (yeni; SaMD-nötr)

**`SOSEvent`** (sahip: Patient app; okuma: Family) — `sos_event_id` · `patient_id` · `triggered_at` · `status` {active|cancelled|resolved|escalated_911} · `current_phase` {phase1_family|phase2_911|done} · `resolved_at`/`resolved_by` · `freshness_window_minutes` (default 240, config).

**`CallAttemptLog`** — `call_id` · `sos_event_id?` · `patient_id` · `call_type` {sos|regular} · `target_type` {family|caregiver|emergency_services} · `target_id?` · `status` {initiated|cancelled|completed} · `cancel_stage` {pre_family_10s|pre_911_30s|regular_modal_timeout|regular_user_cancelled|null} · `initiated_at`/`ended_at`.

**Güvenli 911 akış kuralı (SaMD-nötr — app yalnız aramayı kolaylaştırır, klinik karar vermez):**
- Faz-1 (aile) ve Faz-2 (911) arasında her adımda **net iptal penceresi** (10sn / 30sn) gösterilir.
- Native dialer "cevaplandı mı" bilgisini **varsaymaz**; "biri açtıysa durdur" mantığı **kaldırıldı**.
- Faz-2, kullanıcı uygulamaya dönmese de **timeout zinciriyle** ilerleyebilir (kullanıcı kararsız/erişilemez kalırsa acil yardım tıkanmasın) — ama her ilerleme öncesi görünür geri sayım + iptal.
- Hiçbir adımda **klinik değerlendirmeye dayalı otomatik karar yok**; tetik tamamen kullanıcı aksiyonu/timeout.

---

## 7. Bildirim & DND — B6

**`Notification`** (tek birleşik primitif, tüm apps) — `notification_id` · `user_id` · `app_context` · `event_type` (birleşik taksonomi) · `title`/`body` · `deep_link` · `channels` text[] {push|in_app|email|sms} · `is_read`/`read_at` · `push_sent` · `created_at`.
**Birleşik `event_type` taksonomisi** (üst-küme; app filtreleme `app_context`+tercih ile): `new_message`, `daily_report`, `task_reminder`, `task_change`, `result_available`, `plan_published`, `caregiver_checkin`, `caregiver_checkout`, `caregiver_connected`, `symptom_report_sent`, `sos`, `approval_pending`, `permission_change`, `caregiver_link_change`, `cosign_request`, `mrp_transfer`, `consent_revoke`, `ai_scribe_complete`, `orphan_subplan`, `ec_verification_reminder`.

> **KALDIRILAN:** `InAppNotification` + per-app enum'lar (Hasta 7, Aile 10, Bakıcı `category`/`priority`) → tek `Notification` + üstteki taksonomi.

**`NotificationPreference`** — `user_id` × `event_type` × kanal × quiet-hours. Acil tipler (`sos`) quiet-hours'ı geçersiz kılar.
**DND:** `FamilyProfile.dnd` (bool). V0 mesaj bildirimlerini etkileme kuralı tek yerde tanımlanır (öneri: DND yalnız standart çağrı + bakım-dışı; `sos` her zaman geçer).

---

## 8. Hassas / Lockbox Kategoriler — B5

Kanonik lockbox seti (her app, her Doc aynı): **`mental_health`**, **`hiv_sti`**, **`gender_identity`**, **`substance_use`**.
- Dördü de default gizli; ayrı `ConsentGrant` gerektirir.
- `substance_use` **her ingest/enforcement noktasında** kilitli (atlanamaz).
- `genetic` = "sensitive, non-lockbox **V2**" etiketi (V0 lockbox setine girmez).
> HCP Doc 4 (`hiv`→`hiv_sti`, `substance_use` ekle), Doc 5 auto-detect (substance_use ekle), Doc 10 (genetic'i lockbox'tan çıkar, etiketle) buna hizalanır.

---

## 9. RLS, Provenance, CareTeam, Audit

- **RLS oturum değişkeni (tek):** `app.acting_org_id`. (HCP Doc 5/6/8'deki `sinalytix.current_org_id` → bu.)
- **`Provenance`:** tek ilişkisel tablo (tier 1–4); FHIR `Provenance` yalnız API sınırında üretilir (tabloda değil).
- **`CareTeamMembership`:** tek tanım sahibi HCP Doc 9; Doc 3 referans verir.
- **Audit:** `AuditLogEntry` (immutable, partition, HMAC, 7y) + `PolicyDecision` + `ai_interaction_log` (§5). Üç ayrı iz.

---

## 10. Paylaşılan Tablo — Oku/Yaz Matrisi

| Tablo | Yazan | Okuyan | Sahip |
|---|---|---|---|
| `CareTask`/`CareTaskOccurrence` | Hasta, Bakıcı, Aile(ekle), HCP, Agent | Hepsi | Çekirdek (care) |
| `CaregiverShift` | Bakıcı | Hasta, Aile | Caregiver app |
| `CaregiverLink` | Hasta | Bakıcı | Patient app |
| `SOSEvent`/`CallAttemptLog` | Hasta | Aile | Patient app |
| `SymptomReport` | Hasta-AI | Aile, Bakıcı | Çekirdek |
| `ConsentGrant` | Hasta/SDM | PolicyEngine, Hepsi (filtreli) | Çekirdek |
| `Notification` | Sistem (hepsi) | Alıcı | Çekirdek |
| `ai_interaction_log` | Tüm AI yüzeyleri | Denetim/admin | Çekirdek |
| `SystemConfig`/`FeatureFlag` | Admin (ops) | Tüm servisler | Admin Panel (K10) |

---

## 11. Global İsim Normalizasyonu (tüm dokümanlara)

| Eski (çeşitli) | Kanonik |
|---|---|
| `user_type` (tek) / ayrı `FamilyMember`,`Caregiver(s)` tablosu | `User` + `roles[]` + `*Profile` |
| `TaskDefinition`/`TaskSchedule`/`TaskOccurrence` | `CareTask`/`CareTaskOccurrence` (+`parent_task_id`) |
| `InAppNotification`, per-app bildirim enum | `Notification` + birleşik taksonomi |
| `FamilyAvailability` | `FamilyProfile.dnd` |
| `sinalytix.current_org_id` | `app.acting_org_id` |
| `ai_scribe_sessions` (mutable, tek) | `ai_interaction_log` (immutable) + `ai_scribe_drafts` (mutable) |
| `911_called` | `emergency_services_called` |
| risk `low/medium/high` | `green/yellow/red` |
| "6 haneli alfanumerik" (link) | "6 haneli numerik" |
| FK `patients`/`caregivers`/`users` (çoğul) | `User (Patient)`/`User (Caregiver)` (tekil) |
