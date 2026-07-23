> **[RECONCILED 2026-06-28 — Canonical Data Dictionary v0.1 ile hizalandı]** Uygulanan kararlar B1–B10. Değişiklikler [RECONCILED: ...] ile işaretli.

# Sinalytix — Birleşik Çekirdek Altyapı PRD
## Modül 1 / 4 — Veri Modeli & Veritabanı

**Sürüm:** 0.1 (taslak)
**Tarih:** 2026-06-02
**Kapsam:** Hasta, Aile, Bakıcı ve Sağlık Profesyoneli (HCP) uygulamalarının üzerinde çalıştığı **tek ortak veri katmanı**.
**Bu modülün yeri:** Çekirdek altyapı PRD'si dört modülden oluşur — (1) **Veri Modeli & DB** ← *bu doküman*, (2) API Tasarımı, (3) Backend Mimarisi, (4) Agent Orkestrasyon. Bu modül diğer üçünün dayandığı zemini tanımlar; PolicyEngine, AuditWriter, real-time ve agent runtime'ının *davranışı* sonraki modüllerde, *dokunduğu tablolar* burada belirtilir.

---

## 0. Yönetici Özeti

Dört uygulama tek bir mantıksal PostgreSQL veritabanı üzerinde, **Row-Level Security (RLS)** ile izole edilmiş şekilde çalışır. Kimlik **tek kanonik kişi kaydı + rol uzantıları** olarak modellenir; bir kişi aynı anda hasta, aile üyesi, bakıcı ve/veya klinisyen olabilir, fakat giriş/oturum şimdilik uygulama başına ayrıdır (uygulamalar arası tek-giriş/SSO V2).

Veri **ilişkisel çekirdek + FHIR cephe** stratejisiyle saklanır: tablolar normal ilişkisel şemadır, FHIR R4 + CA Core+'a yalnızca dış entegrasyon ve uygulamalar-arası API sınırında çevrilir. Klinik tablolar, sonradan FHIR'a kayıpsız map edilebilecek şekilde tasarlanır (FHIR-uyumlu ama FHIR-native değil).

İki ayrı **consent (onam)** kavramı netleştirilmiştir: değiştirilemez yasal/ToS onam kaydı (`ConsentRecord`) ve iptal edilebilir, kapsam-bazlı veri paylaşım yetkisi (`ConsentGrant`). İkincisi PolicyEngine'in canlı erişim kararını besler.

Tüm yazma/okuma işlemleri **değiştirilemez bir denetim omurgasına** (`AuditLogEntry`) ve AI etkileşimleri ayrıca **`ai_interaction_log`'a** kaydedilir. Hiçbir PII/PHI, auth tamamlanmadan sunucuya gönderilmez.

---

## 1. Veri Katmanı Mimari İlkeleri

### 1.1 Tek mantıksal veritabanı, RLS ile izolasyon
- Dört uygulamanın tamamı tek bir PostgreSQL kümesini paylaşır (HCP ve tüketici PRD'lerinde "ortak DB" varsayımı). Mantıksal izolasyon **şema + RLS** ile sağlanır; fiziksel olarak ayrı veritabanı kullanılmaz (operasyonel basitlik, uygulamalar-arası referans bütünlüğü).
- İki tenancy ekseni bir arada yaşar:
  - **Org-tabanlı tenancy (klinik veri):** HCP tarafı çok-kiracılıdır; klinik kayıtlar `org_id` ile etiketlenir, RLS predikatı `org_id = current_setting('app.acting_org_id')`.
  - **Hasta-sahipliği (tüketici veri):** Hasta/Aile/Bakıcı tarafında erişim hastanın verdiği `ConsentGrant` ve link tablolarıyla belirlenir; "kayıt sahibi hasta" egemendir (PHIPA).
- Detaylı RLS stratejisi §11'de.

### 1.2 İlişkisel çekirdek + FHIR cephe *(Karar: 2-a)*
- Birincil saklama biçimi normalize edilmiş ilişkisel tablolardır. Geliştirme hızı ve erken aşama maliyeti için tercih edilmiştir.
- FHIR R4 + CA Core+ profilleri **API/entegrasyon sınırında** üretilir (serializer katmanı). Her klinik tablo, en az bir FHIR kaynağına kayıpsız map edilebilir (alan eşlemeleri §5'te kaynak bazında belirtilir).
- Dış sistemlerden gelen FHIR/CCD-A verisi parse edilip ilişkisel tablolara yazılır; orijinal belge `DocumentReference` + S3 ile saklanır (kanıt/iz).
- Bu karar geri dönülebilir bırakılmıştır: FHIR-native bir depo (Medplum/HAPI) ileride entegrasyon ihtiyacı artarsa ek bir okuma cephesi olarak eklenebilir; tablo tasarımı buna engel olmayacak şekilde FHIR-uyumlu tutulur.

### 1.3 Kimlik birleşik, oturum uygulama-başına *(Karar: 1-a)*
- Bir gerçek kişi = bir `User` satırı. Roller `*_profile` uzantı tablolarıyla eklenir.
- Oturum/giriş şimdilik uygulama (ve dolayısıyla rol) bazında ayrıdır; `Session` tablosu `app_context` ile parametrelenir [RECONCILED: A2 — eski `user_type` parametresi kaldırıldı]. Uygulamalar-arası SSO (tek girişle tüm roller) **V2**.

### 1.4 Değiştirilemezlik (immutability) nerede
Aşağıdaki tablolar **append-only**'dur (DB trigger UPDATE/DELETE'i reddeder):
`ConsentRecord`, `AuditLogEntry`, `ai_interaction_log`, `ActivityLog`, imzalanmış klinik notlar (`ClinicalNote` `status=final` snapshot'ı), `Message` (gönderildikten sonra içerik). Diğer her şeyde **soft-delete + audit** (fiziksel silme yok; `deleted_at` + denetim kaydı). Fiziksel silme yalnızca yasal "right-to-be-forgotten" iş akışıyla (V1+) yapılır.

### 1.5 Provenance her klinik veri noktasında
Her ingest edilen klinik veri noktası bir `Provenance` kaydıyla ilişkilendirilir (kaynak sistem, tier 1–4, güven skoru, doğrulayan rol, orijinal belge). Patient 360 birleştirme ve "doğrulanmadı" rozetleri buna dayanır (§5.9).

### 1.6 Veri ikametgâhı, şifreleme, denetlenebilirlik
- Tüm PII/PHI Kanada'da (AWS Canada Central). Sınır-ötesi veri çıkışı IAM ile engellenir; LLM uç noktaları Kanada-host'lu.
- At-rest AES-256 (KMS), in-transit TLS 1.2+. Hassas kolonlar (TOTP secret, bağlı-hesap OAuth token'ları, AI sorgu/yanıt) kolon-bazında ek şifrelenir.
- IP / user-agent / cihaz parmak izi **hash'lenir** (SHA-256), düz metin saklanmaz.
- Şifreleme/retention/residency özet tablosu §12'de.

### 1.7 Zaman, yerelleştirme, eşzamanlılık
- Tüm zaman damgaları UTC `timestamptz`; kullanıcıya gösterim ve zamanlanmış işler hastanın `timezone_iana`'sına göre.
- Yerel diller: EN / FR (Ontario yasal) / TR. `User.locale`. (TR, HCP tarafında dahili; tüketici tarafında tam destek.)
- V0 eşzamanlılık politikası: **last-write-wins + ActivityLog**; klinik düzenleme (not/care plan) için **optimistic lock** (versiyon + 5dk idle TTL). Offline yazma kuyruğu tüketici tarafında V1+.

---

## 2. Domain Sahiplik Haritası

| Domain | Birincil sahip | Yazan uygulamalar | Okuyan uygulamalar |
|---|---|---|---|
| Identity & Access (User, roller, org, oturum, kredensiyel) | Çekirdek | Hepsi | Hepsi |
| Consent (Record + Grant) | Çekirdek | Hasta/HCP (grant), Hepsi (record) | PolicyEngine + Hepsi |
| Klinik kayıt (Patient, Condition, Med, Observation, vb.) | HCP / Ingestion | HCP, Ingestion | Hasta (kendi), HCP, (Aile/Bakıcı filtreli) |
| Care Plan & Goal (master + subplan) | HCP | HCP | Bakıcı, Aile (sadeleştirilmiş), Hasta (sadeleştirilmiş) |
| Care Task & Occurrence (günlük görev) | Çekirdek (care) | Hasta, Bakıcı, Aile, HCP, **Agent** | Hepsi |
| Shift (vardiya) | Bakıcı | Bakıcı | Hasta, Aile |
| Messaging / Communication | Çekirdek | Hepsi + Agent | Hepsi |
| Notification | Çekirdek | Hepsi (sistem) | Hepsi |
| Orders / Rx / Referral | HCP | HCP | Hasta (durum), HCP |
| Documents / Repository | Çekirdek / Ingestion | HCP, Hasta (upload), Ingestion | İzin dahilinde hepsi |
| Audit & AI logs | Çekirdek | Sistem (yalnızca yazılır) | Yalnızca denetim/admin |
| Approvals & governance | Çekirdek | Hasta, Aile, HCP | İlgili taraflar |
| Ingestion (jobs, extraction) | Ingestion | Sistem | HCP (kuyruk), admin |

---

## 3. Kimlik & Erişim (Identity & Access)

### 3.1 `User` — kanonik kişi kaydı
Tek satır = tek gerçek kişi. Rol bilgisi uzantı tablolarındadır; bir kişi birden çok uzantıya sahip olabilir.

| Alan | Tip | Not |
|---|---|---|
| `user_id` | uuid (PK) | Sistem-genelinde tekil kimlik |
| `email` | citext | Tekil; null olabilir (yalnız-telefon hesabı için) |
| `email_verified` | bool | |
| `phone_e164` | text | E.164 normalize; OTP için |
| `phone_verified` | bool | |
| `auth_methods` | text[] | `apple_sso`, `google_sso`, `phone_otp`, `email_password` |
| `password_hash` | text | Argon2id (mem 64MB, iter 3, par 4); yalnız HCP/email-password |
| `locale` | text | `en` / `fr` / `tr` |
| `status` | enum | `incomplete`, `active`, `suspended_soft`, `suspended_hard`, `dormant`, `deactivated` |
| `roles` | text[] | Hızlı filtre için denormalize: `patient`, `family`, `caregiver`, `clinician`, `nurse`, `coordinator`, `admin` [RECONCILED: B8 — coordinator/nurse roller eklendi] |
| `created_at` / `updated_at` | timestamptz | |
| `deleted_at` | timestamptz | soft-delete |

> **Reconciliation notu:** Tüketici PRD'lerindeki `user_type` ayrımcısı ve HCP'deki `User` tablosu burada birleşir. `user_type` artık tek değer değil, `roles[]` çok-değerli. Mevcut app tablolarındaki profil alanları aşağıdaki uzantılara taşınır.

### 3.2 Rol uzantı tabloları (her biri `user_id` FK, 1:1)
- **`PatientProfile`** — `mrn/identifier_set` (OHIP/PHN/AHCIP/RAMQ), `date_of_birth`, `conditions_declared[]`, `allergies_declared[]`, `declared_confidence` (professionally_diagnosed/self_declared/prefer_not_to_say), `dnr_status`, `sensitive_categories_present[]`, `org_id_primary` (varsa), `timezone_iana`.
- **`PractitionerRole`** — *N kayıt* (org × disiplin × eyalet). `org_id`, `discipline_code`, `specialty[]`, `province_code`, `license_record_id`, `active`, `period`. (FHIR `PractitionerRole`.)
- **`FamilyProfile`** — `dnd` (rahatsız etmeyin), tercih bayrakları.
- **`CaregiverProfile`** — `agency_id` (FK, opsiyonel), `certifications[]`, `shift_active` (denormalize), tercihler.
- **`AdminUser`** — iç araç rolleri (kredensiyel inceleme, kurtarma, uyumluluk); `admin_role` **text[]** {support|credentialing|compliance|ops|superadmin} [RECONCILED: K10 — enum→text[], çok-rollü admin; detay Admin Panel PRD §1].

### 3.3 `Organization`
| Alan | Tip | Not |
|---|---|---|
| `org_id` | uuid (PK) | RLS anahtarı |
| `type` | enum | `self`, `home_care_agency`, `clinic`, `hospital`, `community_health`, `other` |
| `name` | text | |
| `invisible_to_users` | bool | Tek-kişilik gizli "self" org'lar için |
| `parent_org_id` | uuid | Hiyerarşi (opsiyonel) |

> Solo klinisyen bile bir (gizli) `Organization`'a bağlıdır; bu, RLS'in tek tip çalışmasını sağlar.

### 3.4 Kredensiyel (HCP) — özet
`LicenseRecord` (province, regulatory_college_code, license_number [province+college+number tekil], status_self_reported, status_admin_verified, expiry_date, superseded_by), `VerificationDocument` (document_type, files[]→S3, status, version), `CredentialingReview` (status, reject_reason, target_sla_at, hard_sla_at, reviewed_by_admin_user_id), `AdminQueueItem`. Eyalet meslek kurullarının (CPSO/CNO vb.) API'si yok → admin manuel doğrulama.

### 3.5 Oturum & güvenlik primitifleri
- **`Session`** — `session_id`, `user_id`, `app_context` (`patient`/`family`/`caregiver`/`hcp`/`admin` [RECONCILED: K9]), `platform` (`mobile_ios`/`mobile_android`/`web`), `max_at`, `idle_at` (rolling), `device_fp_hash`, `ip_hash`, `ua_hash`, `country_code`, `revoked_at`, `revoke_reason`. **Uygulama başına ayrı oturum** (SSO V2). Eşzamanlı oturum üst sınırı 5 (admin: 2 — Admin Panel PRD §2).
- **`RefreshToken`** — `token_hash` (SHA-256), `used_at`, `rotated_to_token_id`, `revoked_at`. Her kullanımda rotasyon; replay → tüm zincir iptal + e-posta uyarı.
- **`TOTPSecret`** (AES-256+KMS), **`BackupCode`** (Argon2id, tek kullanım), **`RecoveryToken/Ticket`**, **`DeviceFingerprint`** (`fingerprint_hash`, `trusted` [V1], `device_label`), **`LoginAttempt`**, **`IPBlock`**.
- MFA: TOTP (önerilen) veya SMS OTP (V0 fallback). Tüketici tarafı SSO/OTP ağırlıklı; HCP email+şifre+MFA.

### 3.6 İlişki & bağlantı tabloları (cross-app dikiş noktaları)
| Tablo | Amaç | Önemli alanlar |
|---|---|---|
| `PatientFamilyLink` | Hasta ↔ aile üyesi | `permission_level` (view/edit/full), `link_source`, `granted_by/at`, `revoked_by/at` |
| `CaregiverLink` | Hasta ↔ bakıcı | `link_code` (6 hane), `qr_payload`, `expires_at` (+15dk), `status` |
| `EmergencyContact` | Hasta acil kişileri | `relationship`, `phone`, `phone_verified`, `sort_order` (1–3), `invite_status`, `linked_family_user_id` |
| `CareTeam` / `CareTeamMembership` | Klinik bakım ekibi (FHIR CareTeam) | `participant role`, `active`, `period`, `current_mrp`, `mrp_history[]`, `pending_mrp_transfer` |
| `RelatedPerson` | Aile/SDM klinik bağ (FHIR) | hasta ile ilişki, SDM bayrağı |

> `CareTeam` (klinik, HCP) ile `PatientFamilyLink`/`CaregiverLink` (tüketici, hasta-kontrollü) ayrı katmanlardır; ikisi de PolicyEngine girdisidir. "Bakım ekibim" otomatik mesaj grubu (§7) `CareTeamMembership` + linklerden türetilir.

---

## 4. Consent (Onam) — İki Katman

### 4.1 `ConsentRecord` — yasal / ToS (değiştirilemez)
Append-only. Sürüm değişiminde yeni satır. 7 yıl saklanır; ayrı audit DB'ye replikasyon önerilir.

| Alan | Tip | Not |
|---|---|---|
| `consent_id` | uuid (PK) | |
| `user_id` | uuid | |
| `app_context` | enum | Hangi uygulama akışında verildi |
| `version` | text | ToS/Privacy sürümü |
| `flags` | jsonb | Rol bazlı bayrak seti (aşağıda) |
| `consented_at` | timestamptz | İstemci zamanı |
| `server_recorded_at` | timestamptz | Sunucu zamanı |
| `ip_hash` | text | SHA-256 |

Bayrak setleri (genelleştirilmiş, polimorfik):
- Ortak: `accept_tos`, `accept_privacy`, `ack_not_emergency`
- Tüketici ek: `ack_no_clinical_decision`
- Klinisyen ek: `ack_clinical_responsibility`, `ack_scope_of_practice`, `ack_phipa_esp`
- AI: `ack_ai_processing` (sesli/AI özelliği kullananlar için; tek tip — Hasta wakeword, Bakıcı/Aile AI, HCP Scribe)

### 4.2 `ConsentGrant` — runtime veri paylaşım yetkisi (iptal edilebilir)
PolicyEngine'in canlı erişim kararını besler. Default-deny: grant yoksa erişim yok.

| Alan | Tip | Not |
|---|---|---|
| `grant_id` | uuid (PK) | |
| `patient_id` | uuid | Veri sahibi |
| `granted_to_kind` | enum | `practitioner_role`, `org`, `family_member`, `caregiver` |
| `granted_to_id` | uuid | |
| `scope` | jsonb | Kategori bazlı: `medications`, `labs`, `imaging`, `mental_health`, `hiv_sti`, `gender_identity`, `substance_use`, `demographic` (`genetic` V2) |
| `permission` | enum | `permit` / `deny` |
| `period_start` / `period_end` | timestamptz | Zaman-sınırlı (cross-org default 30g) |
| `granted_by` | uuid | Hasta veya SDM |
| `revoked_at` / `revoked_by` | | İptal → ≤5sn cascade (real-time, Modül 3) |

- **Hassas kategoriler / lockbox seti** [RECONCILED: B5] tam olarak {`mental_health`, `hiv_sti`, `gender_identity`, `substance_use`}; dördü de default gizli ("lockbox"), ayrı grant gerektirir. `substance_use` her ingest/enforcement noktasında zorunlu kilitli (atlanamaz). `genetic` lockbox üyesi **değildir**; "sensitive, non-lockbox (V2)" olarak etiketlidir (yukarıdaki `scope`'ta `genetic` V2).
- İptal: veri **gizlenir ama değiştirilemez şekilde saklanır**; yeniden grant geri açar.
- **Yalnız hasta veya SDM** grant verir/iptal eder; org admin override edemez.
- Aile/Bakıcı AI erişimi bu grant'ların **rol-filtreli** görünümüdür (ör. Aile: ilaç adı+saat, doz yok).

### 4.3 `SDMDeclaration` — vekil karar verici (provincial-aware)
`patient_id`, `sdm_user_id`/`related_person_id`, `province_rule` (ON HCCA hiyerarşisi MVP; BC/QC/AB V2), `poa_document_id`, `active`, `activated_by` (MRP kapasite değerlendirmesi). SDM, hasta adına `ConsentGrant` yapabilir.

---

## 5. Klinik Domain (FHIR-uyumlu, ilişkisel)

Her tablo bir FHIR kaynağına map edilir (cephe katmanı). Aşağıda yük taşıyan alanlar verilmiştir; tam FHIR profil eşlemesi Modül 2'de (API).

### 5.1 `Patient`
FHIR `Patient`. `patient_id` = `PatientProfile.user_id` (tüketici hastalar) **veya** yalnız-klinik hasta için bağımsız (henüz uygulaması olmayan, HCP'nin oluşturduğu hasta). `identifier_set`, `insurance`, `dnr_status`, `sensitive_categories_present[]`, `org_id_primary`, `general_practitioner` (MRP).

> **Önemli:** Sistemde uygulama kullanıcısı olmayan hasta da olabilir (HCP bir hasta oluşturur, hasta daha sonra Hasta uygulamasına davet edilir). `Patient.user_id` nullable; davet kabul edilince `User`'a bağlanır.

### 5.2 `Condition`, `AllergyIntolerance`
FHIR `Condition` / `AllergyIntolerance`. `code` (ICD-10/SNOMED), `clinical_status`, `sensitive_category` (mental_health/hiv/gender_identity/genetic), `provenance_id`, `verification_status`.

### 5.3 `MedicationStatement` / `MedicationRequest`
İlaç. `code` (DIN/RxNorm), `dose`, `frequency`, `adherence_status`, `adherence_reported_by`, `data_source` (manual/ocr_extracted/integrated_portal), `provenance_id`. (Tüketici tarafındaki serbest-metin ilaç kaydı buraya `data_source=manual` olarak akar; doz doğrulaması yok — yalnız HCP onaylı kayıt "verified".)

### 5.4 `Observation` (vital + lab)
FHIR `Observation`. `code` (LOINC), `value`, `unit`, `reference_range`, `abnormal_flag`, `effective_at`, `source` (device/lab/self_report), `provenance_id`. Wearable/Apple Health/Health Connect verisi (Tier 1) buraya yazılır. Hasta/Bakıcı self-report (adherence) de `Observation` üretir.

### 5.5 `CarePlan` (master + subplan) & `Goal`
- `CarePlan`: `category` (`master` / `subplan`+disiplin), `part_of` (subplan→master), `version_id`, `status`, `ownership` (`owner_practitioner_role_id`, `status: owned/orphan`, `orphan_since`, `orphan_transfer_deadline`), `lifecycle_history`, `collision_flags[]`, `milestone_snapshot`.
- `Goal`: `care_plan_id`, `lifecycle_status`, `achievement_status`, `target`, `progress_notes[]` (inline MVP).
- **Care plan'in günlük aksiyona dönüşmesi:** master/subplan → `CareTask` üretir (§6). Agent'ın "alt-göreve bölme" işi tam olarak burada devreye girer (care plan goal → CareTask + alt CareTask'lar).

### 5.6 `Encounter` / Visit
FHIR `Encounter`. `class` (home_health vb.), `check_in_at`, `check_out_at`, `linked_note_id`, `linked_ai_scribe_session_id`, EVV (GPS+attestation) **V2**. Bakıcı `CaregiverShift` (§6.6) operasyonel vardiyadır; klinik ziyaret `Encounter`'dır — ayrı tutulur, gerektiğinde ilişkilendirilir.

### 5.7 `ServiceRequest` (lab/imaging/referral) & Rx
- `ServiceRequest`: `intent`, `code`, `category` (lab/imaging/referral), `status`, `based_on` (care plan/note), `e_fax_job_id`, sonuç bağı (`DiagnosticReport.based_on`).
- Rx `MedicationRequest`: kontrollü madde **V0 dışı** (V1 web-only + T4 + Narcotic Monitoring). MVP gönderim: e-fax; e-prescribing (PrescribeIT) V2; eReferral (Ocean) V1+.
- Yönlendirme/eczane/lab/uzman **dizinleri**: `Directory*` tabloları (Sinalytix-curated + org_custom, PostGIS geo).

### 5.8 `DocumentReference` / `Binary`
FHIR `DocumentReference`. `type` (govt_id/license/lab_report/imaging/clinical_doc...), `s3_url`, `sha256_hash`, `tier`, `lockbox_tag`, `verification_status`. Orijinaller S3 Object Lock (compliance) ile değiştirilemez. OCR'lı belge + ham belge saklanır.

### 5.9 `Provenance`
FHIR `Provenance`. `target` (hangi kayıt), `tier` (1–4), `source_system`, `confidence_score`, `verified_by_role_id`, `verified_at`, `original_document_id`, `chain_of_custody`, `consent_status` (mutable). Patient 360 cross-source merge ve rozet mantığının kaynağı.

### 5.10 `interRAIAssessment`
İç tablo + FHIR `Observation` (CA Core+). `maple_estimate`, `cap_triggers[]`. MVP manuel form + görüntüleme; algoritmik MAPLe/CAP V1 (lisans gerektirir).

---

## 6. Bakım & Görev Domaini (Care & Tasks)

Burası, üç farklı "Task" kavramının çakışmasının **çözüldüğü** yerdir. Net ayrım:

| Kavram | Tablo | Ne işe yarar | Kim |
|---|---|---|---|
| **CareTask** | `CareTask` + `CareTaskOccurrence` | Hastanın günlük/ tekrarlı bakım görevleri (ilaç al, yürü, ölç). **Agent'ın alt-göreve böldüğü ve günlük listeye eklediği nesne.** | Hasta, Bakıcı, Aile, HCP, Agent |
| **ClinicalWorkItem** | sanal/`work_item` görünümü | HCP worklist'i (imzalanacak not, onaylanacak order, gelen lab). Tablo değil, sorgu-tabanlı türetilen iş listesi. | HCP |
| **VerificationTask** | `tier4_extraction_entities` üstünde FHIR `Task` | Ingestion doğrulama kuyruğu öğesi (§10). | Sistem/HCP |

### 6.1 `CareTask` (tanım)
| Alan | Tip | Not |
|---|---|---|
| `task_id` | uuid (PK) | |
| `patient_id` | uuid | |
| `parent_task_id` | uuid (null) | **Alt-görev hiyerarşisi** (decomposition). Kök görev null. |
| `care_plan_id` / `goal_id` | uuid (null) | Care plan'dan türediyse bağ |
| `title` | text | |
| `type` | enum | `one_time`, `recurring`, `counter` |
| `subtype` | enum | `standard`, `medication` |
| `schedule` | jsonb | days_of_week, time(s), daily_target |
| `created_by` + `created_by_actor_type` | uuid, enum | actor: `patient`/`caregiver`/`family`/`clinician`/`system`/**`agent`** |
| `source_provenance` | enum | `manual`/`caregiver`/`family`/`integrated`/**`agent`** |
| `status` | enum | `active`/`paused`/`completed`/`cancelled` |
| `deleted_at` | timestamptz | soft-delete |

> `parent_task_id` mevcut PRD'lerde **yoktu**; agent'ın görev-ayrıştırma yeteneği için eklendi. Bir kök görev (ör. "Sabah ilaç rutini") agent tarafından alt-görevlere (her ilaç için ayrı) bölünebilir.

### 6.2 `CareTaskOccurrence` (örnek/gün)
| Alan | Tip | Not |
|---|---|---|
| `occurrence_id` | uuid (PK) | |
| `task_id` | uuid | |
| `patient_id` | uuid | denormalize (RLS/perf) |
| `date_local` / `time_local` | | Hasta timezone'unda |
| `status` | enum | `todo`/`done`/`skipped` |
| `completed_by` + `completed_by_actor_type` | | actor `agent` dahil |
| `counter_value` | int | counter tipi için |
| `carry_over_from` | uuid (null) | Ertesi güne taşıma (yeni occurrence; orijinal değişmez) |

> **Tamamlama izni (V0):** Hasta ve Bakıcı tamamlayabilir; **Aile tamamlayamaz** (sadece ekler/görür). "Bakıcı yokken aile ilaç verdi" senaryosu açık klinik/legal konu (§14).

### 6.3 `ActivityLog` (görev/domain aktivite izi)
Append-only. `entity_type`, `entity_id`, `action` (created/edited/deleted/completed/undone/skipped/carried_over/...), `actor_type` (`system`/`agent` dahil), `actor_role`, `timestamp`, `diff` (jsonb). Denetim omurgası `AuditLogEntry`'den (§8) daha hafif, domain-içi iz; yüksek-riskli olaylar ayrıca `AuditLogEntry`'ye de yazılır.

### 6.4 `AdherenceReport`
Hasta/Bakıcı self-report (ilaç alındı / vital / mood / uyku / semptom) → `Observation` üretir + Patient 360 widget'ını besler. `patient_id`, `kind`, `value`, `reported_by`, `reported_at`. Kaçırılan doz pattern → bakım ekibi uyarısı (V1).

### 6.5 `SymptomReport` (Hasta AI → Aile/Bakıcı)
`report_id`, `session_id` (AI), `patient_id`, `raw_complaint`, `clarification_q/a` (max 2 nötr soru), `sent_to_family`, `sent_to_caregiver`, `sent_at`, `source_interaction_id` (`ai_interaction_log` FK). AI yalnız rapor zenginleştirir; klinik değerlendirme yok (guardrail Modül 4).

### 6.6 `CaregiverShift` (vardiya)
`shift_id`, `caregiver_id`, `patient_id`, `shift_active`, `checked_in_at`, `checked_out_at`, `check_out_reason` (manual/auto_switch/system_timeout), `shift_note`, `shift_note_structured` (jsonb, SBAR), `duration_minutes`, `timezone_iana`, `location_checkin` (V2 EVV), `alert_24h_sent`. Partial unique index: bir bakıcının aynı anda tek aktif vardiyası. Real-time broadcast ≤2sn (hasta+aile). Vardiya verisi silinmez.

### 6.7 SOS & Acil (yeni) — B7
[RECONCILED: B7 — SOS şeması Core'a eklendi; SaMD-nötr]

Bu şema Canonical Data Dictionary §6'dan birebir alınmıştır. Çekirdek önceden SOS şeması tanımlamıyordu.

**`SOSEvent`** (sahip: Patient app; okuma: Family) — `sos_event_id` · `patient_id` · `triggered_at` · `status` {active|cancelled|resolved|escalated_911} · `current_phase` {phase1_family|phase2_911|done} · `resolved_at`/`resolved_by` · `freshness_window_minutes` (default 240, config).

**`CallAttemptLog`** — `call_id` · `sos_event_id?` · `patient_id` · `call_type` {sos|regular} · `target_type` {family|caregiver|emergency_services} · `target_id?` · `status` {initiated|cancelled|completed} · `cancel_stage` {pre_family_10s|pre_911_30s|regular_modal_timeout|regular_user_cancelled|null} · `initiated_at`/`ended_at`.

**Güvenli 911 akış kuralı (SaMD-nötr — app yalnız aramayı kolaylaştırır, klinik karar vermez):**
- Faz-1 (aile) ve Faz-2 (911) arasında her adımda **net iptal penceresi** (10sn / 30sn) gösterilir.
- Native dialer "cevaplandı mı" bilgisini **varsaymaz**; "biri açtıysa durdur" mantığı **kaldırıldı**.
- Faz-2, kullanıcı uygulamaya dönmese de **timeout zinciriyle** ilerleyebilir (kullanıcı kararsız/erişilemez kalırsa acil yardım tıkanmasın) — ama her ilerleme öncesi görünür geri sayım + iptal.
- Hiçbir adımda **klinik değerlendirmeye dayalı otomatik karar yok**; tetik tamamen kullanıcı aksiyonu/timeout.

---

## 7. İletişim & Bildirim (Ortak Servisler)

### 7.1 Mesajlaşma (`Conversation` / `Message`)
FHIR `Communication` + Sinalytix threading. AES-256, Kanada. Gönderildikten sonra mesaj içeriği değiştirilemez (edit 5dk penceresi + soft-delete V1).

| Tablo | Önemli alanlar |
|---|---|
| `Conversation` | `conversation_id`, `kind` (`hcp_hcp`/`hcp_patient`/`care_team`/`broadcast`/`conflict_thread`), `patient_context_id` |
| `ConversationMember` | `conversation_id`, `user_id`, `role_in_convo` |
| `Message` | `sender_user_id`, `sender_actor_type` (`...`/`system`/**`agent`**), `content`, `source` (`manual`/**`agent`**), `sent_at`, `expires_at` (=sent_at+2y), `sensitive_flag`, `attachment_ref` (S3, ingestion gate'inden geçer) |
| `MessageReadStatus` | `message_id`, `user_id`, `read_at` |

- Otomatik "Bakım Ekibim" grubu `CareTeamMembership` + hasta linklerinden türetilir.
- Agent-kaynaklı mesaj "Sina ile gönderildi" etiketiyle aynı thread'e yazılır.
- Cross-org HCP↔HCP mesajlaşma V1 (consent-gated). HCP↔Hasta/Aile MVP.

### 7.2 `Notification` (birleşik primitif)
Tek kaynak → çok-kanal fan-out. Cross-app paylaşılabilir (dört uygulamada aynı primitif).

| Alan | Tip | Not |
|---|---|---|
| `notification_id` | uuid (PK) | |
| `user_id` | uuid | Alıcı |
| `app_context` | enum | hcp/patient/caregiver/family |
| `event_type` | text | Birleşik taksonomi (new_message, result_available, plan_published, cosign_request, mrp_transfer, consent_revoke, ai_scribe_complete, orphan_subplan, caregiver_connected, symptom_report_sent, approval_pending, ...) |
| `title` / `body` | text | |
| `deep_link` | text | Yönlendirme (redirect-only mimari) |
| `channels` | text[] | `push`(APNs/FCM) / `in_app` / `email` / `sms`(V1) |
| `is_read` / `read_at` | | |
| `push_sent` | bool | |
| `created_at` | timestamptz | UI retention 30g, DB retention 1y |

- **`NotificationPreference`** (user-level): event-type × kanal × quiet-hours. Acil tipler quiet-hours'ı geçersiz kılar; in-app badge her zaman real-time.
- Her push aynı zamanda in-app yazılır (kayıp olmaması için).

> **Reconciliation notu:** Tüketici uygulamalarında farklılaşan bildirim enum'ları (Hasta 7, Aile 10 tip) tek taksonomide birleştirildi; uygulama başına filtreleme `app_context` + `NotificationPreference` ile.
> [RECONCILED: A3] Bu birleşik `event_type` taksonomisi **otoriterdir (authoritative)**; tüketici/HCP uygulamaları kendi enum'larını tanımlamaz, bu taksonomiye **uymak zorundadır**.

---

## 8. Denetim Omurgası & AI Günlükleri

### 8.1 `AuditLogEntry` (değiştirilemez, partition'lı)
Append-only (DB trigger UPDATE/DELETE reddeder). Aylık partition. Gecelik HMAC-zincirli batch → S3 Glacier WORM (Kanada). 7 yıl (PHIPA s.13).

| Alan | Tip | Not |
|---|---|---|
| `audit_log_id` | uuid (PK) | |
| `event_type` | text | Modül bazlı taksonomi (auth.*, consent.*, careplan.*, note.*, scribe.*, order.*, message.*, careteam.*, task.*, ingestion.*, agent.*, ...) |
| `event_category` | enum | auth/session/clinical/consent/admin/security/integration/ingestion |
| `event_severity` | enum | info/warning/critical |
| `user_id` / `acting_user_id` | uuid | |
| `acting_practitioner_role_id` / `acting_org_id` | uuid | CPSO #4-12: kim + ne zaman |
| `resource_type` / `resource_id` | | |
| `session_id`, `device_fp_hash`, `ip_hash`, `ua_hash` | | |
| `event_data` | jsonb | event_type başına şema-sınırlı; **PHI sızdırmaz** |
| `acted_at` / `inserted_at` | timestamptz | |
| `batch_hmac` / `archived_at` | | yalnız `job_runner` rolü yazar |

- **`PolicyDecision`** (authz denetimi alt-kümesi): `subject_practitioner_role_id`, `action`, `resource`, `context_snapshot` (PHI yok), `decision`, `reasons[]`, `obligations`, `policy_engine_version`.

### 8.2 `ai_interaction_log` (değiştirilemez, AI'ya özel)
Tüm AI etkileşimleri (Sina, RAG, Scribe, çeviri, agent). Append-only, 7 yıl. `interaction_id`, `app_context`, `user_id`, `patient_id`, `skill` (scribe/briefing/qa/command/translate/decompose...), `model_id`, `input_encrypted`, `output_encrypted`, `judge_verdict` (MEDICAL_ADVICE/IN_SCOPE_ACTION/...), `risk_tier` (green/yellow/red), `action_taken`, `human_approved_by`, `tokens`, `cost`, `created_at`. (Davranış Modül 4.)

> `ActivityLog` (domain), `AuditLogEntry` (güvenlik/uyumluluk omurgası) ve `ai_interaction_log` (AI) üç ayrı izdir; yüksek-riskli bir AI aksiyonu üçüne birden yazabilir.

---

## 9. Onay & Yönetişim Akış Nesneleri

| Tablo | Amaç | Önemli alanlar |
|---|---|---|
| `ApprovalRequest` | Aile onay kuyruğu (kritik hasta aksiyonları) | `action_type` (caregiver_link_change/ec_change/profile_edit/account_delete), `action_payload` jsonb, `requested_by_role`, `status`, `expires_at` (+48s), `reminder_sent_at` (24s) |
| `PatientApprovalConfig` | Hangi aksiyon onay gerektirir | hasta başına toggle |
| `AccountDeletionRequest` | 30 gün grace (PIPEDA) | `scheduled_deletion_at`, `status` |
| `MRPTransfer` | MRP devri (HCP, T4) | `from/to_practitioner_role_id`, `status`, milestone snapshot tetikler |
| `ConflictThread` | Care plan çakışma çözümü (HCP) | `resolution_outcome` enum (V1) |
| `BreakGlassOverride` | Acil erişim (V1) | T4 + çok-aktör onay + her-okuma audit + College bildirimi |

---

## 10. Veri Ingestion & Belge Deposu (İç Tablolar)

4-Tier ingestion (davranış Modül 3). İç PG tabloları:

| Tablo | Amaç | Önemli alanlar |
|---|---|---|
| `ingestion_jobs` | İş kuyruğu | `tier` (1–4), `source`, `status`, `cost_estimate_usd`, `batch_id`, `org_id` (RLS) |
| `tier4_extraction_entities` | OCR+LLM aday FHIR varlıkları | candidate FHIR json, `confidence`, `source_citation` (transcript/bbox), `is_safety_critical`, `is_sensitive`, `verification_status` |
| `document_hash_index` | Dedup | `sha256`, cross-org izole |
| `connected_sources` | Org OAuth kimlikleri | AES-256/KMS, `provider`, `token_expiry` |

- **Güvenlik-kritik varlıklar** (allergy, ilaç, code-status/DNR) ve **hassas varlıklar** (psikiyatri F-kodları, HIV/HBV/HCV, gender) → güven skoru ne olursa olsun **insan kuyruğu zorunlu**, auto-accept yok. Yüksek-güvenli güvenlik-dışı → "doğrulanmadı" rozetiyle otomatik akar.

---

## 11. Çok-Kiracılılık & RLS Stratejisi

- **Oturum bağlamı:** Her istek, kimlik doğrulama sonrası `app.acting_user_id`, `app.acting_org_id`, `app.app_context`, `app.acting_roles` session değişkenlerini set eder. RLS politikaları bunlara dayanır.
- **Klinik veri (org-tabanlı):** `org_id = current_setting('app.acting_org_id')::uuid`. Klinisyen yalnız kendi org'unun + erişim grant'ı olan hastaların verisini görür.
- **Tüketici veri (hasta-sahipliği):** Erişim, `patient_id` üzerinden `ConsentGrant` + link tabloları (`PatientFamilyLink`/`CaregiverLink`) ile. Hasta kendi verisinin tamamını görür; aile/bakıcı yalnız grant kapsamında.
- **Cross-app görünürlük:** PolicyEngine, hem RLS hem `ConsentGrant` hem CareTeam üyeliğini birlikte değerlendirir (varlık-sızdırmaz: yetkisiz kayıt "yok" gibi davranır, 404/boş).
- **Arama:** MVP PostgreSQL Full-Text Search (GIN); her zaman RLS+consent+careteam ile filtreli. Elasticsearch (tenant başına index) V1.
- **Karar caching:** PolicyEngine kararları kısa TTL (≈5sn) cache'lenir; consent iptalinde cache invalidasyonu (Modül 3).

---

## 12. Şifreleme · Retention · Residency Özeti

| Veri sınıfı | Şifreleme | Retention | İkamet |
|---|---|---|---|
| PII/PHI (genel) | AES-256 at-rest + TLS | Aktif + soft-delete; PHIPA 10y klinik | Kanada |
| `ConsentRecord` | AES-256, append-only | 7 yıl | Kanada |
| `AuditLogEntry` | AES-256 + HMAC zincir, WORM | 7 yıl (s.13) | Kanada (Glacier) |
| `ai_interaction_log` | AES-256, input/output kolon-şifreli | 7 yıl | Kanada |
| `Message` | AES-256 | 2 yıl | Kanada |
| `Notification` | AES-256 | UI 30g / DB 1y | Kanada |
| Klinik kayıt/not (imzalı) | AES-256, immutable | 10 yıl (consent iptali silmez) | Kanada |
| Belge orijinalleri | S3 SSE-KMS + Object Lock | 10y hot→Glacier | Kanada |
| Ses kaydı (Scribe/Sina) | AES-256 | Transkript sonrası min.; opt-in ≤7g | Kanada |
| TOTP secret / OAuth token | Kolon-bazlı ek şifreleme (KMS) | Hesap ömrü | Kanada |
| IP / UA / cihaz | SHA-256 hash (düz metin yok) | Audit ile | — |

---

## 13. Kimlik Doğrulama → Veri Akışı (No PII Before Auth)
- Onboarding adımlarında auth tamamlanmadan **hiçbir PII/PHI sunucuya gönderilmez** (PIPEDA). Pre-auth taslak yalnız cihazda şifreli saklanır (iOS Keychain / Android Keystore), auth sonrası atomik transfer (silent retry, exp backoff, max 5).
- Consent (`ConsentRecord`) ve hesap oluşturma, herhangi bir klinik veri yazılmadan önce gerçekleşir.

---

## 14. Açık Konular / Bekleyen Kararlar
1. **Tamamlama izni** [RECONCILED: B1]**:** Karar verildi — **Aile görevi tamamlayamaz (V0)**; yalnız Hasta + Bakıcı (+agent/system) tamamlar. Açık kalan tek alt-konu: **"bakıcı yokken aile ilaç verdi" istisnası (V1 açık-konu)** — klinik/legal görüş gerekli.
2. **Hassas kategori taksonomisi:** `genetic` MVP dışı; tam liste klinik danışman onayı bekliyor.
3. **CA Core+ hizalaması (tüketici Patient):** Hasta uygulamasının `Patient`/`Observation` kayıtları hangi ölçüde CA Core+ profiline çekilecek (cephe katmanında mı, tabloda mı).
4. **Provenance granülerliği:** Veri-noktası başına (MVP) vs batch başına (V1 perf).
5. **Agency/coordinator (B2B):** Bakıcı `agency_id` + coordinator rolü, çok-kiracılı org modeline ne kadar gün-1'de dahil olacak.
6. **Multi-region HA:** MVP tek bölge (Kanada Central); Toronto+Montreal active-active V2.
7. **7 yıl sonrası audit purge:** otomatik mi manuel mi.

---

## 15. Sonraki Modüllere Köprüler
- **Modül 2 (API):** Bu tabloların FHIR profil eşlemeleri, servis sınırları, cross-app render kontratları (hasta-bakan care plan görünümü, hasta not okuma, bildirim feed'i), idempotency, pagination, WebSocket kanalları.
- **Modül 3 (Backend mimarisi):** PolicyEngine (RBAC→Cedar), AuditWriter, consent-revoke cascade, ingestion pipeline, real-time, deployment, NFR/performans hedefleri.
- **Modül 4 (Agent orkestrasyon):** `CareTask.parent_task_id` üstünde görev-ayrıştırma; `ai_interaction_log`; ortak guardrail + risk-katmanlı onay (green/yellow/red); per-app skill setleri (Scribe, RAG, Sina-komut, çeviri, decompose).
