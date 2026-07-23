> **[RECONCILED 2026-06-28 — Canonical Data Dictionary v0.1]** Kararlar B1–B10. Bu dosya `Sinalytix_Canonical_Data_Dictionary.md` ile hizalandı; tablo/enum tanımları için tek doğruluk kaynağı odur. Yapısal değişiklikler satır içi `> [RECONCILED: ...]` notlarıyla işaretlenmiştir.

Table of Contents {#table-of-contents .TOC-Heading}
=================

SINALYTIX --- HEALTHCARE PROFESSIONAL APP
=========================================

Doc 1 --- Identity, Onboarding & Credentialing
----------------------------------------------

  Versiyon   Uygulama                                 Hedef Pazar               Platform                             Durum                              Tarih
  ---------- ---------------------------------------- ------------------------- ------------------------------------ ---------------------------------- ---------------
  V0 (MVP)   Healthcare Professional (Mobile + Web)   Kanada (Ontario odaklı)   React Native + React shared kernel   Taslak --- Geliştirici Referansı   29 Mayıs 2026

*Sinalytix --- Gizli ve Özel. Bu doküman geliştirici ve klinik danışman
referansı içindir.*

1. Bağlam ve Amaç
=================

1.1 Özelliğin Tanımı
--------------------

Healthcare Professional (HCP) App\'in **Identity, Onboarding &
Credentialing** katmanı, Sinalytix ekosistemine giren her klinisyenin
kimliğini, yetki sınırlarını ve organizasyon bağlamını sistematik olarak
çerçeveler. Bu doküman dört ana yetenek alanını birleştirir:

-   **Identity**: Klinisyenin kim olduğunu (legal name, government photo
    ID, primary credential identifier) toplama ve doğrulama.
-   **Onboarding**: Klinisyenin ekosisteme alınma akışı --- quick-start
    (\~5 dk) + post-verification (Settings\'te async).
-   **Credentialing**: Provincial license entry, license certificate
    upload, malpractice insurance upload, admin review queue, soft-gate
    verification status.
-   **Multi-Org Foundation**: Solo + organizasyon hybrid yapı, active
    organization context picker, multi-tenant Row-Level Security (RLS)
    için `acting_org_id` audit baseline.

Diğer üç Sinalytix uygulamasından (Patient/Caregiver/Family) farklı
olarak HCP App\'te onboarding **klinik liability**, **regülasyon uyumu**
ve **scope of practice** belirleme süreçlerinin başlangıcıdır. Bu
nedenle consumer-facing onboarding pattern\'larından (Caregiver PRD §4)
iki kritik noktada ayrışır: (1) ek \"clinical responsibility\" consent
katmanı, (2) credentialing & verification süreci.

1.2 Giriş Noktaları
-------------------

HCP App onboarding üç ayrı giriş noktasını destekler. Ekran sırası
ortak; davranış farkları onboarding sonu \"Solo / Join Org / Skip\"
adımında belirginleşir.

  Giriş Noktası                             Tetikleyici                                                    Affiliation Davranışı
  ----------------------------------------- -------------------------------------------------------------- ------------------------------------------------------------------------------
  **Akış A --- Self-Registration**          App Store / Google Play / web register sayfası                 Onboarding sonu choice ekranı: Solo / Join Org / Skip for now
  **Akış B --- Organization Invite (V1)**   Org admin clinician\'ı davet eder (email link + invite code)   Onboarding sonunda org affiliation pre-filled; clinician sadece confirm eder
  **Akış C --- Bulk Org Import (V2+)**      Org admin CSV ile clinician listesi upload eder                Clinician ilk login\'inde \"Welcome to \[Org\]\" akışı; minimal onboarding

V0 (MVP) yalnızca **Akış A** desteklenir. Akış B kapsamı Doc 1 V1
sürümünde tanımlanacaktır; veri modeli ve UI hooks MVP\'de yapısal
olarak hazır (invite\_code field, OrganizationInvite resource).

1.3 Hedef Kitle ve Rol Matrisi
------------------------------

HCP App\'in hedef kitlesi tek tip değildir. Üç disiplin grubu ve
içlerinde alt-roller barındırır.

  Discipline Grubu     Roller (MVP\'de Toplanır)                                                                                                                                                  Specialty/Sub-Specialty (MVP: free-text/dropdown; V1: taxonomy)                       Tipik Çalışma Modeli
  -------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------- ----------------------------------------------------------------
  **Physician**        Physician (MD/DO), Nurse Practitioner (NP)                                                                                                                                 Family Medicine, PM&R, Cardiology, Geriatrics, Internal Medicine, Psychiatry, Other   Solo private practice + multi-org community
  **Nursing**          Registered Nurse (RN), Registered Practical Nurse (RPN)                                                                                                                    Community Nursing, Acute Care, Mental Health, Wound Care, Other                       Genellikle org-affiliated (Bayshore/SE Health/VHA/CCS) + locum
  **Allied Health**    Physiotherapist (PT), Occupational Therapist (OT), Speech-Language Pathologist (SLP), Registered Dietitian (RD), Medical Social Worker (MSW), Respiratory Therapist (RT)   Discipline-specific specialties (örn. Pediatric PT, Vestibular Rehab, Geriatric OT)   Solo private practice ağırlıklı + hospital-affiliated
  **Other / Future**   Care Coordinator (CC role tag --- discipline\'a ek capability), Org Admin (V1)                                                                                             ---                                                                                   Org-affiliated only

> *Hedef kitle nüansı: Klinisyenler teknoloji okuryazarlığı bakımından
> PSW/caregiver\'lardan yüksek; ancak older physician kohortunda (60+)
> UI hız ve sadelik beklentisi düşmez. PMR uzmanları (Türkiye\'den gelen
> mental referans kohortu) **özellikle krediyalama ve scope of practice
> tanımının netliğine** dikkat eder. Bu kitle için ConsentRecord\'da
> \"clinical responsibility acknowledgement\" maddesinin metin kalitesi
> onboarding success\'in en kritik göstergesidir.*

1.4 Ekosistem İçindeki Konum
----------------------------

HCP App, Sinalytix dört-yüzlü ekosisteminin **klinik karar destek +
workflow + audit** katmanını oluşturur. Doc 1, bu yapının kimlik/yetki
temelini koyar.

  Uygulama            Doc 1 ile İlişki                                                                                                                                     Paylaşılan Resource\'lar
  ------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Patient App**     Hasta klinisyeni \"Grant access\" ile çağırır; HCP\'nin verified profili (display name, photo, discipline, specialty, org context) hastaya görünür   `Practitioner` (read-only summary view), `PractitionerRole.active=true` filter
  **Caregiver App**   Caregiver clinician\'ı consultation thread\'inde görür; HCP profile bilgisi ortak                                                                    `Practitioner` (read-only summary)
  **Family App**      Family üyesi hasta\'nın care team\'ini browse eder; HCP\'nin discipline + specialty + display photo görünür                                          `Practitioner` (read-only summary)
  **HCP App (bu)**    Klinisyenin tüm Sinalytix interaksiyonunun authoritative identity kaynağı                                                                            `Practitioner`, `PractitionerRole`, `Organization`, `User (roles[] ⊇ clinician)` \[RECONCILED: A2\], `ConsentRecord (clinician)`, `VerificationDocument`, `LicenseRecord`, `CredentialingReview`

**Cross-app primitive uyum noktaları** (Cross-app reconciliation
pass\'inde uzlaştırılacak --- Doc 1\'de aşağıda not olarak tutulur):

-   **User table**: Patient/Caregiver/Family PRD\'lerinde
    `User.user_type` enum\'una `clinician` değeri eklenir.
    `user_type=clinician` ise zorunlu FK: `Practitioner.user_id`.
    > \[RECONCILED: A2\] Kanonik model tekil `user_type` değil, çok-değerli
    > `User.roles[]`; `clinician` artık bir `roles[]` üyeliğidir. "`clinician`
    > rolü varsa zorunlu FK `Practitioner.user_id`" kuralı aynen geçerli.
    > Dictionary §1.
-   **ConsentRecord**: Clinician\'a özel iki ek flag eklenir
    (`ack_clinical_responsibility`, `ack_scope_of_practice`). Mevcut 4
    ConsentRecord flag (`accept_tos`, `accept_privacy`,
    `ack_not_emergency`, `ack_no_clinical_decision`) varlığını korur.
    Caregiver\'daki `ack_no_clinical_decision` clinician için ANLAMSIZ
    olduğundan clinician sürümünde **bu flag yer almaz** --- yerine
    `ack_clinical_responsibility` koyulur.
-   **Notification primitive**: HCP-side notification channels
    (push/email/SMS/in-app banner) Patient/Caregiver\'la aynı
    `Notification` resource\'unu kullanır; `notification_type` enum\'una
    clinician-specific değerler eklenir (`verification_status_change`,
    `license_expiry_warning`, `admin_queue_assignment`).

1.5 Regülasyon Çerçevesi
------------------------

Doc 1 akışında dört regülasyon katmanı aktiftir:

**1. PHIPA / PIPEDA --- Personal Information Protection (Federal +
Provincial)**

-   Sinalytix = PHIPA s.10 **Electronic Service Provider**. Klinisyen
    veya organizasyon HIC (Health Information Custodian) kalır.
-   Onboarding sırasında toplanan kişisel bilgi (legal name, DOB,
    government photo ID) **PHI değil, PII\'dir** ama PIPEDA kapsamında
    benzer korumalar gerektirir.
-   Auth öncesi (Step 0--3) hiçbir veri sunucuya iletilmez (Caregiver
    PRD §4.3 pattern\'ı korunur). iOS Keychain / Android Keystore
    şifreli yerel depolama.
-   ConsentRecord immutable --- UPDATE/DELETE backend seviyesinde
    engellenir.

**2. Provincial Health Acts --- License Validation**

-   Ontario: `Regulated Health Professions Act, 1991` (RHPA) --- College
    of Physicians and Surgeons of Ontario (CPSO), College of Nurses of
    Ontario (CNO), College of Physiotherapists of Ontario (CPO), College
    of Occupational Therapists of Ontario (COTO), College of
    Audiologists and Speech-Language Pathologists of Ontario (CASLPO),
    College of Dietitians of Ontario (CDO), Ontario College of Social
    Workers and Social Service Workers (OCSWSSW), College of Respiratory
    Therapists of Ontario (CRTO).
-   BC: `Health Professions Act` --- College of Physicians and Surgeons
    of British Columbia (CPSBC), British Columbia College of Nurses and
    Midwives (BCCNM), vb. (V2+ scope).
-   Public registry\'ler mevcut **ancak API yok** → manuel verification
    flow zorunlu (Sinalytix-internal admin).

**3. College Documentation Standards**

-   CPSO Policy \#4-12 \"Medical Records Documentation\": Klinisyen
    kimliğinin her klinik kayıt girdisinde açıkça ilişkilendirilmesi
    şart. Bu Doc 1\'i etkiler --- her audit log entry\'sinde
    `acting_practitioner_role_id` ve `acting_org_id` zorunlu.
-   CPSO Policy \"Closing a Medical Practice\": License inactive
    olduğunda hasta kayıtlarına erişim devam eder ama write privileges
    blocked. Doc 1 §4.4 license expiry akışı bu policy\'ye uygun.

**4. Health Canada SaMD**

-   Onboarding akışı SaMD scope\'unda değil (workflow only, klinik karar
    değil). Class I sınırında. AI scribe / CDS gibi V1+ feature\'lar
    SaMD eşik kontrolü için ayrı değerlendirilir (Doc 7, Doc 10 konusu).

> *Doktor liderin notu: Türkiye\'de e-İmza ile klinisyenin her aksiyonu
> PKI-imzalanır; Kanada\'da bu yok. Doc 1 bunun yerine
> \"context-specific authentication + immutable audit trail\"
> pattern\'ını koyar (Master Doc §4.6). Bu Doc 1\'i ilgilendiren kısım:
> onboarding\'in sonunda kullanılacak password + 2FA (TOTP/SMS)
> audit\'lenir; gelecekteki her clinical action\'da re-auth challenge
> mümkün (Doc 2 scope).*

2. Endüstri ve Klinik Bağlam
============================

2.1 Kanada\'da Clinician Onboarding ve Credentialing Realite
------------------------------------------------------------

Kanada\'da klinisyen kredilenmesi üç katmanlı bir sistem üzerinden işler
ve hiçbiri federal düzeyde değildir:

  Katman                                 Sorumlu                                                                                       Sinalytix\'in Erişimi
  -------------------------------------- --------------------------------------------------------------------------------------------- -------------------------------------------------------------------------------------------------------------------------------------
  **Provincial College Registration**    Her provincial regulatory college (CPSO, CNO, CPO, vb.)                                       Public registry web\'de var; **API yok**. Find-a-Doctor (CPSO), Find a Nurse (CNO) tarz lookup\'lar manuel scrape ile mümkün (V1+).
  **Organization-level Credentialing**   Her health authority (Ontario Health, Bayshore vb.) kendi internal credentialing process\'i   Sinalytix bu süreçleri replike etmez; org bazlı verification org admin\'in sorumluluğunda (V1+).
  **Hospital Privileges**                Her hastane Medical Advisory Committee                                                        Sinalytix scope dışı (MVP\'de).

**Sinalytix MVP\'nin yaklaşımı**:

-   Klinisyen self-registers → provincial license no + license
    certificate PDF + government photo ID upload.
-   **Sinalytix-internal admin** (insan reviewer) bu üçlüyü cross-check
    eder:
    -   Photo ID üzerindeki ad ↔ license cert üzerindeki ad ↔ provincial
        college public registry üzerindeki ad eşleşiyor mu?
    -   License no provincial college\'da aktif görünüyor mu?
    -   License expiry tarihi license cert ile eşleşiyor mu?
-   Hedef SLA: 48 business hours; hard SLA: 5 business days.
-   V1\'de **org admin role** eklenince org-affiliated clinician\'lar
    için org admin review eder; Sinalytix sadece org\'un ilk admin\'ini
    onaylar.

2.2 Endüstri Yazılımlarından Öğrenilen Nuanslar
-----------------------------------------------

AlayaCare, PointClickCare, Epic, Cerner, TELUS CHR ve OSCAR Pro gibi
platform liderlerinin clinician onboarding pattern\'ları incelendiğinde
şu örüntüler öne çıkar:

  Pattern                                          Kanıt / Endüstri                                                                                 Sinalytix Uyumu
  ------------------------------------------------ ------------------------------------------------------------------------------------------------ ---------------------------------------------------------------------------------------------------------------------
  **Quick-start + async credentialing**            AlayaCare Mobile, PointClickCare HR module, Epic Hyperspace user creation                        Doc 1 §4.1 --- Onboarding tamamlandığında hesap oluşur, soft-gate aktif; license + credentialing Settings\'te async
  **Manual identity verification ile başlangıç**   OSCAR Pro (open source) admin manuel approve; AlayaCare provincial license verification manuel   Doc 1 §4.3 --- Sinalytix-internal admin manuel review MVP\'de standart
  **Multi-org clinician native**                   TELUS CHR multi-clinic, AlayaCare multi-agency                                                   Doc 1 §6 --- Practitioner 1:N PractitionerRole; active org picker
  **Provincial license expiry automation**         CPSO renewal reminders manuel; PointClickCare expiry alerts dahili                               Doc 1 §4.4 --- 60/30/7 day proactive notifications + post-expiry auto-inactivation
  **Org admin role hierarchy**                     Epic OrgRole, PointClickCare Facility Admin                                                      V1 scope (MVP\'de yok); Doc 1 §3.2 V1 sürümünde detaylanacak

> *Önemli: AlayaCare Mobile\'ın Kanada home care liderliği MVP\'de
> Sinalytix\'in **referans pattern\'ı**\'dır, çünkü kullanım modeli
> (saha + offline + multi-org) en yakın. Ancak partnership Master Doc §6
> revision (29 Mayıs 2026) gereği V2+\'ya atılmıştır; bu Doc 1\'i
> etkilemez --- Doc 1 yalnızca clinician identity\'ye odaklıdır,
> AlayaCare entegrasyonu Doc 5 (Health Data Ingestion) konusudur.*

2.3 Solo + Multi-Org Hybrid Kanada Realitesi
--------------------------------------------

Kanada community health workforce\'unun yapısal özellikleri:

-   **Family Physicians**: %60+ solo private practice veya 2-3 hekimlik
    küçük klinik. EMR seçimleri (OSCAR Pro, TELUS CHR, Accuro) bireysel
    pratiğin tasarrufuyla yapılır.
-   **NP\'ler**: %40+ NP-Led Clinic veya community health center, kalan
    %60 hospital outpatient veya home care org.
-   **PT/OT/SLP/RD**: %70+ Health Profession Corporation (solo private
    practice) + part-time hospital/community contracts. Genellikle **2-4
    farklı çalışma yerinin clinician\'ı**.
-   **RN/RPN**: Public home care\'de ağırlıklı (Bayshore/SE
    Health/VHA/CCS), ek olarak private practice locum.
-   **MSW**: Mixed --- community agency + private practice + hospital.

**Implikasyon**: Solo onboarding **first-class pattern** olmalı (Master
Doc §3.6); multi-org clinician için sürtüşmesiz org switch (Doc 1 §4.6
context picker akışı) MVP zorunluluğu.

3. Kapsam ve Kısıtlar
=====================

3.1 Kapsam (In Scope)
---------------------

### V0 --- MVP

**Onboarding Quick-Start (\~5 dk):**

-   Intro slide carousel (2-3 ekran, atlayabilir)
-   Dil seçimi (en, fr, tr --- `tr` internal sürüm için, prod\'da en/fr)
-   Clinical Consent (6 zorunlu checkbox --- bkz. §5)
-   Identity entry (legal first name, last name, date of birth,
    professional display name preference)
-   Auth method seçimi (Email+Password+2FA setup --- 2FA detayı Doc 2)
-   Profile basic (discipline zorunlu; specialty optional
    free-text/dropdown; profile photo optional)
-   Affiliation choice (Solo practice / Join organization with invite
    code / Skip for now)
-   Done ekranı --- soft-gate aktif, persistent CTA \"Complete
    verification\"

**Verification (Settings\'te async):**

-   Government photo ID upload (driver\'s license / passport / health
    card)
-   Provincial license entry: province + college + license number +
    expiry date + (multi-province MVP\'de structural support, Ontario
    active scope)
-   License certificate PDF upload
-   Malpractice insurance PDF upload (optional MVP, badge ile değerli)
-   Submit for review → Sinalytix-internal admin queue
-   Verification status: in\_review / approved / rejected
-   Reject → tek belge re-upload + re-review

**Identity & Practitioner Modeling:**

-   1 Practitioner per kişi (FHIR R4 + CA Core+)
-   N PractitionerRole per (org × discipline × province), N≥1
-   Solo clinician → backend gizli self-Organization (RLS tutarlılığı
    için)
-   Internal UUID primary key + provincial license number per
    role/province

**Multi-Org Context:**

-   Active org context picker --- login modal + persistent header
    dropdown
-   Audit log baseline: `acting_practitioner_role_id`, `acting_org_id`
    her event\'te

**License Lifecycle:**

-   Expiry tracking: 60/30/7 günlük proactive reminder (email + push +
    in-app banner)
-   Expiry sonrası: immediate `PractitionerRole.active=false`, Patient
    360 read-only, draft preserve

**Account Lifecycle:**

-   Account suspension (admin tarafından): configurable soft vs hard +
    reason + appeal flow
-   Onboarding abandonment lifecycle (3 state: pre-auth / post-auth
    incomplete / completed pending verification)

### V1 --- Sonraki Sürüm

-   **Organization Invite Flow** (Akış B aktif)
-   **Org Admin Role** --- org bazlı reviewer; Sinalytix sadece ilk org
    admin\'i onaylar
-   **Specialty/Sub-Specialty Taxonomy** --- CMA/CNO/Provincial College
    codeset binding
-   **Multi-role per org** --- bir clinician aynı org\'da N
    PractitionerRole
-   **SSO Federation** --- ONE ID (Ontario) SAML integration
-   **License Renewal Workflow** --- pro-active renewal flow +
    auto-update license expiry post-admin review
-   **Credential Renewal Reminders** + workflow (insurance, board
    certification, CPR/BLS for relevant disciplines)
-   **College Find-a-Doctor lookup** integration (manuel scrape veya
    partnership)
-   **Hospital Privileges Documentation** (optional upload, MRP
    capability flag için)
-   **Specialty Board Certification** (optional upload)
-   **Continuing Education Hours** tracking (optional)

### V2 --- İleride

-   **BC Services Card App** authentication integration
-   **FIDO2 hardware key** support (Doc 2)
-   **Automated credential verification** (provincial college API\'ları
    açılırsa)
-   **Multi-province active scope** --- ON dışındaki provinces\'te
    clinical actions aktif
-   **Bulk Org Import** (Akış C --- CSV upload)

### V3 --- Eyalet Rollout

-   **SécurSanté PKI** (Quebec) integration
-   **Indigenous provider credentialing** specific flow (Indigenous
    Services Canada partnership)

3.2 Kısıtlar (Constraints)
--------------------------

-   **Auth öncesi (Step 0--3) hiçbir veri sunucuya gönderilmez**. iOS
    Keychain / Android Keystore (mobile) veya Web Crypto API IndexedDB
    (web) şifreli yerel depolama. PIPEDA ihlal riski.
-   **License + credentialing belgeleri auth sonrası yüklenir**.
    Settings\'te async; onboarding\'i bloke etmez.
-   **Sinalytix-internal admin review zorunlu MVP\'de**. Org admin role
    V1\'de. Auto-approval yok.
-   **Provincial College public registry\'leri API yok**. Manuel
    cross-check zorunlu.
-   **Identity document + License cert ad eşleşmesi zorunlu**. Eşleşmeme
    → reject reason.
-   **Soft-gate verification model**. Verified olmadan:
    profile/browse/settings OK; clinical actions blocked.
-   **Multi-org clinician için active org context\'inin her audit
    entry\'de zorunlu olması**. RLS pattern.
-   **Onboarding tamamlandıktan sonra otomatik tekrar tetiklenmez**.
    Reset yalnızca admin/debug işlemidir.
-   **Re-consent**: ToS/Privacy versiyon değişikliğinde mevcut
    clinician\'a re-consent zorunlu (V1).
-   **ConsentRecord immutable** --- UPDATE yok, version değişikliğinde
    yeni satır.
-   **Account suspension state\'i admin-only**. Clinician self-suspend
    yapamaz (önce account deactivation flow gerekir --- Doc 10).
-   **Discipline değişikliği (örn. RPN→RN)** --- eski PractitionerRole
    inactive, yeni PractitionerRole yaratılır. In-place update YAPMAZ.

3.3 Non-goals (Kapsam Dışı)
---------------------------

-   **Hospital privileges verification** (MVP\'de scope dışı)
-   **Continuing education hours tracking** (MVP\'de scope dışı)
-   **Background check integration** (örn. RCMP record check) --- V2+
-   **Direct provincial college API integration** (yok)
-   **OAuth-based federated identity for clinician** (V1+)
-   **Bulk org clinician import via CSV** (V2+)
-   **Credentialing for non-regulated professions** (örn. Personal
    Support Worker --- bu Caregiver App scope\'undadır)
-   **Clinician-to-clinician peer review/endorsement** (V2+)
-   **Subscription/billing/payment management** (Doc 10 konusu)
-   **Clinical actions, patient access, note writing, ordering** --- Doc
    3-9 scope; Doc 1 yalnızca **identity + onboarding + credentialing**
    çerçevesini kurar

4. Kullanıcı Akışı
==================

4.1 Self-Registration Sequence (Akış A --- MVP Tek Akış)
--------------------------------------------------------

  Adım   Ekran ID                            Açıklama                                                                     Depolama
  ------ ----------------------------------- ---------------------------------------------------------------------------- ----------------------
  0      HCP\_ONB\_00\_INTRO                 Intro slide carousel (2-3 ekran)                                             ---
  1      HCP\_ONB\_01\_LANGUAGE              Dil seçimi (zorunlu)                                                         LOCAL
  2      HCP\_ONB\_02\_CONSENT               Clinical Consent (6 checkbox zorunlu)                                        LOCAL
  3      HCP\_ONB\_03\_IDENTITY              Legal name + DOB                                                             LOCAL
  4      HCP\_ONB\_04\_AUTH\_EMAIL           Email entry (verification link gönderilir)                                   LOCAL → semi-BACKEND
  5      HCP\_ONB\_04A\_VERIFY               Email verification confirm                                                   BACKEND
  6      HCP\_ONB\_04B\_PASSWORD             Strong password creation                                                     BACKEND
  7      HCP\_ONB\_04C\_2FA\_SETUP           2FA setup (TOTP authenticator recommended; SMS OTP backup) --- detay Doc 2   BACKEND
  8      HCP\_ONB\_05\_PROFILE               Professional display name, discipline, specialty, photo (optional)           BACKEND
  9      HCP\_ONB\_06\_AFFILIATION\_CHOICE   Solo / Join Org / Skip for now                                               BACKEND
  9a     HCP\_ONB\_06A\_ORG\_INVITE          (Sadece Join Org seçilirse --- V0\'da disabled; V1)                          BACKEND
  10     HCP\_ONB\_07\_DONE                  Tamamlandı + Soft-gate aktif + Persistent \"Complete verification\" CTA      ---

> *Kritik fark: Caregiver onboarding\'inde auth Step 4-5 idi (5b OTP).
> HCP\'de auth Step 4-7 (4 alt-adım: email, verify, password, 2FA).
> Sebep: clinician access\'in güvenlik eşiği consumer\'dan çok daha
> yüksek; clinical context\'te SIM-swap saldırılarına karşı TOTP
> authenticator zorunlu (Doc 2\'de detaylı). SMS OTP yalnızca backup
> recovery method.*

4.2 Verification Flow (Settings\'te Async)
------------------------------------------

  Adım   Ekran ID                        Açıklama                                                                              Backend Etkisi
  ------ ------------------------------- ------------------------------------------------------------------------------------- ----------------------------------------------------------------------------
  V0     HCP\_SET\_VER\_ENTRY            Settings → Verification card (persistent badge: \"Verification pending\")             ---
  V1     HCP\_VER\_01\_GOVT\_ID          Government photo ID upload (driver\'s license / passport / health card)               VerificationDocument(type=govt\_id)
  V2     HCP\_VER\_02\_LICENSE\_ENTRY    Province + College + License number + Expiry date                                     LicenseRecord (status=pending\_review)
  V3     HCP\_VER\_03\_LICENSE\_CERT     License certificate PDF upload                                                        VerificationDocument(type=license\_cert) + link to LicenseRecord
  V4     HCP\_VER\_04\_MALPRACTICE       Malpractice insurance PDF upload (optional)                                           VerificationDocument(type=malpractice\_insurance) (nullable)
  V5     HCP\_VER\_05\_SUBMIT            \"Submit for Review\" CTA --- gerekli tüm zorunlu belgeler yüklendikten sonra aktif   CredentialingReview created (status=in\_review) + admin queue notification
  V6     HCP\_VER\_06\_REVIEW\_STATUS    Review status display: in\_review / approved / rejected (with reason + admin note)    Real-time updates via notification
  V7     HCP\_VER\_07\_REJECT\_RESPOND   (Rejected ise) tek belge re-upload + tekrar submit                                    VerificationDocument new version + CredentialingReview status=in\_review

4.3 Admin Review Flow (Sinalytix-Internal)
------------------------------------------

  Adım   Sistem Davranışı
  ------ ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  1      Klinisyen \"Submit for Review\" → CredentialingReview oluşturulur (status=in\_review, queue\_entered\_at timestamp)
  2      Admin Queue Web App (internal Sinalytix tool) --- pending reviews listesi (SLA tracking: 48h target, 5d hard)
  3      Admin: queue item açar → 3 belge yan yana viewer (Govt ID + License Cert + Malpractice \[varsa\])
  4      Admin cross-check: name match (govt ID ↔ license cert ↔ entered legal name), license no provincial college public registry\'de aktif mi, expiry uyumu
  5      Decision: Approve → CredentialingReview(status=approved), PractitionerRole(active=true), email+push+in-app banner clinician\'a \"Verification approved\"
  5b     Decision: Reject → CredentialingReview(status=rejected, reject\_reason=enum, admin\_note=text), clinician\'a \"Verification failed: \[reason\]\" notification
  6      License renewal monitor: provincial license expiry yaklaştığında (60/30/7 gün) proactive reminder
  7      License expiry: PractitionerRole(active=false, period.end=expiry\_date), Patient 360 read-only flag clinician\'da

**Admin Queue Internal Tool Schema** (MVP\'de basit, V1\'de
zenginleşir):

-   Pending items list (sorted by SLA: oldest first)
-   Filter: discipline, province, document type completeness
-   Detail view: side-by-side documents + entered data
-   Actions: Approve / Reject (with reason + note) / Request additional
    info (V1)
-   Audit log: every admin action timestamped + admin\_user\_id

4.4 License Expiry & Renewal Flow
---------------------------------

    T-60 days: Email + push notification + in-app banner — "License expires in 60 days. Renew with your College and update Sinalytix."
    T-30 days: Same channels, more prominent banner (yellow → amber)
    T-7 days:  Same channels, urgent banner (red), email subject "URGENT: License expires in 7 days"
    T-0 (expiry day): 
      - PractitionerRole.active = false
      - PractitionerRole.period.end = now
      - All Patient 360 views → read-only mode for this PractitionerRole
      - Audit log: "license_expired_auto_inactive"
      - Clinician notification: "Your license has expired. Patient charts are read-only. Upload renewed license to reactivate."
      - In-flight drafts: preserved in DRAFT state, NOT auto-submitted/signed
    T+0 → T+90: Clinician can re-upload renewed license certificate via Verification flow
    T+90+: Account moves to 'dormant' state (Master Lifecycle - §4.7); manual reactivation required

**Renewal Re-Verification (MVP):**

-   Klinisyen Settings → Verification → \"Renew License\" CTA
-   Yeni license certificate upload (new expiry date)
-   Admin review queue (initial onboarding ile aynı flow)
-   Approved → PractitionerRole.active=true,
    period.end=new\_expiry\_date, in-flight drafts user\'a görünür,
    finalize edilebilir

V1\'de **license renewal proactive workflow** eklenecek: clinician\'ın
\"Renew now\" CTA\'sı, license renewal form pre-filled, sadece yeni
expiry date + certificate upload.

4.5 Account Suspension & Appeal Flow
------------------------------------

**Suspension Tetikleyicileri** (MVP):

-   Sinalytix internal admin manuel suspend (örn. complaint, license
    revocation provincial college\'dan, security incident)
-   Provincial College registry\'de license status değişikliği (V1+
    otomatik --- manual MVP\'de)

**Suspension Türleri** (Configurable):

  Tür                Login     Clinical Actions   Patient 360   Etki
  ------------------ --------- ------------------ ------------- -------------------------------------------------------------------------------------
  **Soft Suspend**   Açık      Blocked            Read-only     Banner: \"Account suspended: \[reason\]. Contact support to appeal.\"
  **Hard Suspend**   Blocked   Blocked            Blocked       Login attempt → \"Your account has been suspended. Email: <support@sinalytix.com>\"

**Appeal Flow:**

1.  Suspended klinisyen \"Appeal\" CTA (soft suspend\'de in-app; hard
    suspend\'de support email)
2.  Appeal form: clinician statement (text), supporting documents
    (optional)
3.  Sinalytix admin review queue (appeals subqueue)
4.  Decision: Uphold suspension / Lift suspension / Convert hard↔soft
5.  Audit log: every suspension action + reason + admin\_user\_id
    timestamped (PHIPA s.10 compliance)

4.6 Active Organization Context Switching
-----------------------------------------

**İlk Login:**

    Successful auth (email + password + 2FA) →
      Practitioner.practitioner_roles count check:
        if count = 1 (solo or single org):
          → auto-set active context, header dropdown gizli, direct to Worklist
        if count > 1:
          → MODAL: "Select organization for this session"
          → list: [Org A: Bayshore Inc., Solo Practice, Org C: Toronto Community Health]
          → last-used context pre-selected, "Remember selection" checkbox (saves preference)
          → Confirm → set acting_org_id session state

**Persistent Header Dropdown** (web + mobile):

    [Header bar]
      [Sinalytix Logo] [Org Context: "Bayshore Inc. ▾"] [Notifications] [Profile]
                           ^ click → dropdown menu:
                             - Bayshore Inc. ✓ (current)
                             - Solo Practice
                             - Toronto Community Health
                             - "Manage organizations" → Settings
                           ^ select → context switch (see Critical Rules below)

**Critical Switching Rules:**

-   Switch sırasında **in-flight unsaved drafts** kaybedilmez ---
    current context\'te DRAFT olarak persist edilir, switch sonrası
    \"Drafts in \[previous org\]\" notification.
-   Switch tamamlandığında audit log:
    `org_context_switched { from_org_id, to_org_id, switched_at }`.
-   Tüm subsequent actions yeni `acting_org_id` ile audit\'lenir.
-   Multi-tab/multi-window (web): her tab kendi `acting_org_id`\'sini
    taşır (URL veya session-scoped). MVP\'de basitlik için **tek active
    context per session** (tüm tablar aynı org) --- V2\'de tab-scoped
    context.

4.7 Onboarding Abandonment & Account Lifecycle States
-----------------------------------------------------

  State                              Tanım                                                                                             Storage                                                             Auto-Action
  ---------------------------------- ------------------------------------------------------------------------------------------------- ------------------------------------------------------------------- -----------------------------------------------------------------------------------------------------------
  `abandoned_pre_auth`               Klinisyen Step 0-3 (intro/lang/consent/identity) arasında abandon; auth henüz yok                 iOS Keychain / Android Keystore / Web IndexedDB encrypted (LOCAL)   30 gün sonra local draft purge
  `abandoned_post_auth`              Klinisyen auth tamamladı (User + Practitioner var) ama verification başlamadı veya yarıda kaldı   Backend `User.status=incomplete`                                    90 gün inactive → email reminder; 180 gün → `status=dormant`, login disabled, manuel reactivation gerekir
  `completed_pending_verification`   Onboarding tamamlandı, verification başlatıldı ama review henüz approve değil                     Backend `User.status=active`, `PractitionerRole.active=false`       Süresiz; klinisyen istediği zaman complete edebilir
  `verified_active`                  Verification approved                                                                             Backend `User.status=active`, `PractitionerRole.active=true`        ---
  `suspended_soft`                   Admin tarafından soft suspend                                                                     Backend `User.status=suspended_soft`                                Appeal review
  `suspended_hard`                   Admin tarafından hard suspend                                                                     Backend `User.status=suspended_hard`                                Appeal review
  `dormant`                          180+ gün inactive `abandoned_post_auth` veya inactive `completed_pending_verification`            Backend `User.status=dormant`                                       Manual reactivation gerekir
  `deactivated`                      Self-deactivated veya admin-deactivated (license revoked, retirement)                             Backend `User.status=deactivated`                                   Soft-delete; PHI retention policy (Doc 10)

4.8 Mermaid Akış Diyagramı (Developer Reference)
------------------------------------------------

    flowchart TD
      A[App First Launch / Web Register] --> B[HCP_ONB_00_INTRO]
      B --> C[HCP_ONB_01_LANGUAGE: Dil Seçimi - ZORUNLU - LOCAL]
      C --> D[HCP_ONB_02_CONSENT: 6-Checkbox Clinical Consent - LOCAL]
      D --> D1{6 checkbox tam?}
      D1 -->|Hayır| D
      D1 -->|Evet| E[HCP_ONB_03_IDENTITY: Legal Name + DOB - LOCAL]
      E --> F[HCP_ONB_04_AUTH_EMAIL: Email Entry]
      F --> F1[Email Verification Link Send]
      F1 --> G[HCP_ONB_04A_VERIFY: Click Link / Enter Code]
      G --> G1{Verified?}
      G1 -->|Hayır| F
      G1 -->|Evet| H[HCP_ONB_04B_PASSWORD: Strong Password]
      H --> I[HCP_ONB_04C_2FA_SETUP: TOTP Authenticator]
      I --> I1{2FA Setup OK?}
      I1 -->|Hayır| I
      I1 -->|Evet| J[LOCAL → BACKEND TRANSFER: User + Practitioner + ConsentRecord]
      J --> K[HCP_ONB_05_PROFILE: Display Name, Discipline, Specialty, Photo]
      K --> L[HCP_ONB_06_AFFILIATION: Solo / Join Org / Skip]
      L -->|Solo| L1[Backend: Create Self-Organization + PractitionerRole inactive]
      L -->|Join Org V1+| L2[HCP_ONB_06A_INVITE: Invite Code Entry]
      L -->|Skip| L3[Backend: No Organization yet]
      L1 --> M[HCP_ONB_07_DONE]
      L2 --> M
      L3 --> M
      M --> N[Main App: Soft-Gate Active, Persistent 'Complete Verification' CTA]
      N --> O[Settings → Verification]
      O --> P[HCP_VER_01_GOVT_ID Upload]
      P --> Q[HCP_VER_02_LICENSE_ENTRY: Province, College, License No, Expiry]
      Q --> R[HCP_VER_03_LICENSE_CERT Upload]
      R --> S[HCP_VER_04_MALPRACTICE Upload Optional]
      S --> T[HCP_VER_05_SUBMIT]
      T --> U[Admin Queue: CredentialingReview status=in_review]
      U --> V{Admin Decision}
      V -->|Approve| W[PractitionerRole.active=true, Soft-Gate Lifted, Clinician Notified]
      V -->|Reject| X[CredentialingReview.status=rejected, Reason+Note, Clinician Notified]
      X --> Y[HCP_VER_07_REJECT_RESPOND: Single Document Re-Upload]
      Y --> U
      W --> Z[Verified Active: Full Clinical Workflow Access]

4.9 Kritik Akış Kuralları
-------------------------

-   **Step 0-3 verisi backend\'e gönderilmez**. Caregiver PRD §4.3 ile
    aynı PIPEDA pattern\'ı.
-   **Email verification zorunlu** --- verification link 24h valid;
    expire olursa yeni link request.
-   **Password complexity**: min 12 karakter, upper+lower+digit+special
    (Master Doc §4.6).
-   **2FA TOTP setup başarısız olursa SMS OTP fallback aktif** (V0);
    ancak banner: \"TOTP recommended for clinical security.\"
-   **Backend transfer (LOCAL → BACKEND)** Step J anında: User +
    Practitioner + ConsentRecord transactional. Hata → silent retry
    (exponential backoff, max 5).
-   **Solo seçimi → backend gizli Self-Organization yaratılır**:
    `Organization.type='self'`,
    `Organization.name='Solo Practice (Practitioner Display Name)'`.
    UI\'da görünmez (header dropdown\'da \"Solo Practice\" olarak
    görünür). RLS tutarlılığı için zorunlu.
-   **Skip seçimi → PractitionerRole henüz yok**. Klinisyen Worklist\'te
    boş state görür (\"Add organization or start solo to begin\").
    Soft-gate ek olarak: verification de PractitionerRole olmadan submit
    edilemez.
-   **Onboarding tamamlandığında otomatik tekrar tetiklenmez**. Resume
    edilebilir state\'ten tamamlanır.
-   **Verification submit edilebilmesi için**: en az 1 PractitionerRole
    olmalı (solo veya org). Skip seçtiyse Settings → Affiliation flow.
-   **Reject sonrası re-submit**: tek belge re-upload yeterli; review
    tüm dosyalara tekrar bakar (yeni queue entry) ama clinician\'a
    sadece eksik belge gösterilir.

5. Ekran/Yüzey Spesifikasyonları
================================

> *Platform notu: Her ekran Mobile + Web parity\'sinde tasarlanır (RBV
> pattern --- Master Doc §4.2). Aşağıda her ekranın **Mobile** (saha +
> günlük) ve **Web** (chart review + admin + multi-panel) için davranışı
> belirtilir. Solo bir yüzeyi olan ekranlarda not düşülür.*

HCP\_ONB\_00\_INTRO --- Tanıtım Slaytları
-----------------------------------------

Sinalytix HCP App\'in ilk izlenimini oluşturan 3 slaytlık carousel. V0
placeholder içerikle; V1\'de A/B test edilmiş final kopya.

  HCP\_ONB\_00\_INTRO --- Tanıtım Slaytları
  --------------------------------------------------------------------------------------------------------------
  **UI Pattern:** Swipe carousel (Mobile) / Click-through (Web)
  **Slayt Sayısı:** 3 (V0 placeholder)
  **Slayt 1:** \"Closed-loop care orchestration for Canadian home care.\"
  **Slayt 2:** \"Patient-controlled. Multi-clinician. Built for solo practice and organizations alike.\"
  **Slayt 3:** \"Sinalytix is not an emergency service. For emergencies, call 911.\" (ZORUNLU güvenlik mesajı)
  **Primary CTA:** Continue (son slaytta: Get Started)
  **Secondary CTA:** Skip (tüm intro\'yu atlar, Step 1\'e gider)
  **Geri navigasyon:** Yok --- ilk adım
  **Platform farkı:** Mobile = swipe; Web = click-through + progress dots
  **Analytics:** `intro_slide_viewed { slide_index, platform }`, `intro_skipped { at_slide_index }`

HCP\_ONB\_01\_LANGUAGE --- Dil Seçimi
-------------------------------------

  HCP\_ONB\_01\_LANGUAGE --- Dil Seçimi
  ------------------------------------------------------------------------------------------------------------
  **Input:** `selected_language` (enum: en \| fr; tr internal only --- prod\'da gizli)
  **Prefill:** Cihaz locale + IP-based province detection --- kullanıcı değiştirebilir
  **Validasyon:** `selected_language` boş geçilemez; CTA boşken disabled
  **Yerel depolama:** `onboarding_draft.language`
  **Primary CTA:** Continue
  **Secondary CTA:** Back (intro\'ya)
  **Platform farkı:** Mobile = single-column list; Web = horizontal cards
  **Analytics:** `language_selected { selected_language, suggested_language, changed_from_suggested: bool }`

> *Quebec klinisyenleri için Fransızca zorunluluğu V1\'de kapsanır
> (Carnet santé Québec integration ile birlikte). MVP\'de Fransızca UI
> strings hazır olduğundan Quebec klinisyeni V0\'da onboard olabilir ama
> provincial scope (active clinical actions) yalnızca Ontario.*

HCP\_ONB\_02\_CONSENT --- Clinical Consent ve Güvenlik Uyarıları
----------------------------------------------------------------

Bu ekran PHIPA/PIPEDA uyumunun ve klinisyen sorumluluk çerçevesinin
temel noktasıdır. **Altı zorunlu checkbox**. Hiçbiri önceden işaretli
değildir.

  HCP\_ONB\_02\_CONSENT --- Clinical Consent
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Görünür uyarı başlığı:** \"Sinalytix is a clinical workflow and audit platform. It does not provide diagnostic, therapeutic, or dosing recommendations. As a healthcare professional, all clinical decisions and responsibility remain with you within your scope of practice.\"
  **Checkbox 1 --- accept\_tos (ZORUNLU):** \"I have read and accept the Terms of Service\" \[linked text\]
  **Checkbox 2 --- accept\_privacy (ZORUNLU):** \"I have read and accept the Privacy Policy\" \[linked text\]
  **Checkbox 3 --- ack\_not\_emergency (ZORUNLU):** \"I understand Sinalytix is not an emergency service. In emergencies, I will follow standard emergency protocols (e.g., dial 911).\"
  **Checkbox 4 --- ack\_clinical\_responsibility (ZORUNLU):** \"I acknowledge that clinical decisions, diagnoses, and treatment recommendations are my responsibility within my regulated scope of practice. Sinalytix provides workflow and documentation tools, not clinical advice.\"
  **Checkbox 5 --- ack\_scope\_of\_practice (ZORUNLU):** \"I will operate within the scope of practice defined by my provincial regulatory college (e.g., CPSO, CNO, CPO) and my organization\'s policies.\"
  **Checkbox 6 --- ack\_phipa\_esp (ZORUNLU):** \"I understand that Sinalytix acts as an Electronic Service Provider under PHIPA s.10. I (or my organization) remain the Health Information Custodian (HIC) for patient health information I create or access in the platform.\"
  **CTA durumu:** 6 checkbox tam işaretlenmeden \'Accept and Continue\' disabled
  **Primary CTA:** Accept and Continue
  **Secondary CTA:** Back
  **Yerel depolama:** `onboarding_draft.consent { accept_tos, accept_privacy, ack_not_emergency, ack_clinical_responsibility, ack_scope_of_practice, ack_phipa_esp, consented_at }`
  **Backend yazımı:** ConsentRecord --- immutable, auth sonrası
  **Analytics:** `consent_completed { all_accepted: bool, time_on_screen_ms }`

> *Cross-app reconciliation notu: Caregiver/Patient/Family\'de **4
> checkbox** vardı (*`ack_no_clinical_decision` *dahil). HCP\'de bu flag
> YOK --- yerine* `ack_clinical_responsibility` *koyuldu (klinisyen için
> anlamı tersine). ConsentRecord schema\'sı cross-app reconcile
> pass\'inde generic flag set ile genişletilecek (flags JSON column veya
> polymorphic table). MVP\'de HCP-specific subset.*
>
> *Dil notu: Klinisyen düzeyi okuryazarlık için checkbox metinleri
> **B2-C1 İngilizce/Fransızca**. Caregiver\'daki \"ESL basit dil\"
> pattern\'ı burada uygulanmaz; klinisyenler profesyonel kohort.*

ToS / Privacy Policy bağlantıları uygulama içi WebView/Modal\'da açılır;
checkbox state preserved.

### Re-consent Akışı (V1)

ToS veya Privacy Policy version değişikliğinde mevcut klinisyen
uygulamayı açtığında yeni sürümü kabul etmek zorundadır. Reddederse:
hesap soft-suspend (clinical actions blocked, view-only Patient 360
preserves continuity until manuel re-onboarding veya hesap kapatma).

-   Tetikleyici: `ConsentRecord.version < current_tos_version`
-   ConsentRecord\'a yeni satır eklenir (önceki silinmez --- audit trail
    bütünlüğü)
-   Bildirim: push + email + in-app full-screen interstitial

HCP\_ONB\_03\_IDENTITY --- Legal Identity
-----------------------------------------

  HCP\_ONB\_03\_IDENTITY --- Legal Identity
  -----------------------------------------------------------------------------------------------------------------------------------------------------
  **Input 1 --- legal\_first\_name:** string, zorunlu, min 1 karakter (initial-only OK), max 50, harf+boşluk+tire+apostrof
  **Input 2 --- legal\_middle\_name:** string, optional, max 50
  **Input 3 --- legal\_last\_name:** string, zorunlu, min 2 karakter, max 50
  **Input 4 --- date\_of\_birth:** date, zorunlu, age ≥ 18 (clinician licensing minimum)
  **Yardımcı metin:** \"Enter your legal name as it appears on your government-issued ID. You can choose a different display name in the next step.\"
  **Validasyon:** Tüm zorunlu alanlar dolu; DOB age ≥ 18; CTA aktif/disable
  **Yerel depolama:** `onboarding_draft.identity { legal_first_name, legal_middle_name, legal_last_name, date_of_birth }`
  **Primary CTA:** Continue
  **Secondary CTA:** Back
  **Platform farkı:** Mobile = stack form; Web = 2-column layout (first+middle in row, last in row, DOB in row)
  **Analytics:** `identity_entered { has_middle_name: bool, time_on_screen_ms }`

> *Bu adımda legal name verification document\'inde göründüğü şekildedir
> (driver\'s license / passport / health card). Sonraki Verification
> flow\'unda govt ID upload bu name ile cross-check edilir.*

HCP\_ONB\_04\_AUTH\_EMAIL --- Email Entry
-----------------------------------------

  HCP\_ONB\_04\_AUTH\_EMAIL --- Email Entry
  ------------------------------------------------------------------------------------------------------------------------------
  **Input:** `email_address` --- RFC 5322 format validation
  **Prefill:** Yok (clinical context\'te zorunlu manuel entry; SSO V1+)
  **Validasyon:** RFC 5322 + DNS MX record check + disposable email domain blocklist
  **Rate limit:** 5 email verification request / hour / IP
  **Primary CTA:** Send Verification Link
  **Secondary CTA:** Back
  **Backend etkisi:** Pending user record (status=email\_pending) + verification token (UUID, 24h TTL)
  **Notification:** Email gönderilir --- subject \"Verify your Sinalytix Healthcare Professional account\" + verification link
  **Analytics:** `auth_email_submitted { email_domain (hashed), is_disposable_blocked: bool }`

HCP\_ONB\_04A\_VERIFY --- Email Verification
--------------------------------------------

  HCP\_ONB\_04A\_VERIFY --- Email Verification
  ----------------------------------------------------------------------------------------------------------------
  **UI Pattern:** Mobile/Web --- link tıklama ile direkt verify; alternatif 6-haneli code entry (link açılmazsa)
  **Verification token TTL:** 24 saat
  **Resend:** \"Did not receive email?\" CTA → yeni link gönderilir (rate limit: 3 / 30 dk)
  **Hata: token expired:** \"Verification link expired. Request a new one.\"
  **Hata: token used:** \"This link has already been used. Please log in.\"
  **Hata: email not found:** \"Account not found. Please re-enter your email.\"
  **Backend etkisi:** Verified ise pending user record → confirmed (status=email\_verified)
  **Analytics:** `email_verified { method: link | code, time_to_verify_ms, retry_count }`

HCP\_ONB\_04B\_PASSWORD --- Strong Password Creation
----------------------------------------------------

  HCP\_ONB\_04B\_PASSWORD --- Strong Password
  --------------------------------------------------------------------------------------------------------------
  **Input:** `password` (min 12 chars, upper+lower+digit+special) + confirmation field
  **UI:** Show/hide toggle, password strength meter (weak/fair/good/strong), real-time requirements checklist
  **Validasyon:** All requirements + match + not-in-pwned-passwords list (HIBP API or local bloom filter, V1+)
  **Backend storage:** Argon2id hash (memory 64MB, iterations 3, parallelism 4) --- never plain
  **Primary CTA:** Continue
  **Secondary CTA:** Back
  **Backend etkisi:** User.password\_hash set + status=password\_set
  **Analytics:** `password_set { strength_score, retry_count }`

HCP\_ONB\_04C\_2FA\_SETUP --- 2FA Authenticator Setup
-----------------------------------------------------

> *Detay Doc 2 (Authentication, Session, MFA & Audit Spine) konusudur.
> Doc 1\'de yalnızca onboarding context\'inde minimum spec.*

  HCP\_ONB\_04C\_2FA\_SETUP --- 2FA Setup
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Default (Recommended):** TOTP authenticator (Google Authenticator, Authy, 1Password, vb.) --- QR code scan
  **Backup:** SMS OTP (phone number entry + verify) --- V0\'da kabul, V1\'de TOTP zorunlu, SMS sadece recovery
  **Setup steps:** Choose method → Configure (QR scan / phone enter) → Verify with 6-digit code → Save backup codes (8 single-use codes generated, downloadable / copy-to-clipboard)
  **Validasyon:** Setup verification code başarılı + backup codes acknowledged saved
  **Backend storage:** TOTP secret (encrypted at rest, AES-256), SMS phone (E.164), backup codes (Argon2id hashed)
  **Primary CTA:** Continue
  **Secondary CTA:** Choose different method
  **Hata: TOTP setup failed:** \"Code did not match. Please try again.\"
  **Backend etkisi:** User.two\_factor\_method enum (totp \| sms), User.two\_factor\_enabled=true
  **Analytics:** `two_factor_setup { method, backup_codes_saved: bool, retry_count }`

> *Açık konu: SMS OTP V0\'da kabul edilse de Master Doc §4.6 SIM-swap
> riskini \"klinik aksiyonda re-auth challenge\" pattern\'ıyla mitigate
> eder. Doc 2\'de bu detay açılır. Doc 1 sadece initial setup.*

AUTH SONRASI --- LOCAL → BACKEND Transfer
-----------------------------------------

Auth tamamlandıktan sonra (HCP\_ONB\_04C\_2FA\_SETUP confirmation),
background transfer tetiklenir.

  Adım   İşlem
  ------ -----------------------------------------------------------------------------------------------------------------------------------------------------------
  1      User record finalize: status=active, locale, auth\_method, 2FA settings
  2      `onboarding_draft` okunur: language → user.locale, consent → ConsentRecord, identity → Practitioner (legal name, DOB)
  3      Practitioner FHIR R4 resource yaratılır: `Practitioner.identifier` (Sinalytix UUID), `Practitioner.name` (official: legal name), `Practitioner.birthDate`
  4      ConsentRecord backend\'e immutable: version, all 6 flags, consented\_at, server\_recorded\_at, ip\_hash (SHA-256)
  5      Local draft temizlenir (Keychain/Keystore/IndexedDB\'den silinir)
  6      onboarding\_step\_progress = \"profile\" (sonraki ekran HCP\_ONB\_05\_PROFILE)
  7      Audit log: `clinician_account_created { user_id, practitioner_id, ip_hash, user_agent_hash }`

> *Hata yönetimi: Transfer başarısız olursa silent retry (exponential
> backoff, max 5). Tüm retry başarısız → user \"We\'re saving your
> information. This may take a moment.\" spinner; her uygulama
> açılışında resume. Kullanıcıya onboarding tekrar gösterilmez
> (Caregiver PRD §4.3 ile aynı pattern).*

HCP\_ONB\_05\_PROFILE --- Professional Profile
----------------------------------------------

Auth sonrası backend-resident profile completion adımı.

  HCP\_ONB\_05\_PROFILE --- Professional Profile
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Input 1 --- display\_name:** string, default \"Dr. \[Legal Last Name\]\" physician için; \"\[Legal First Last\], \[Discipline acronym\]\" diğerleri için. Configurable. Max 80.
  **Input 2 --- discipline:** enum (zorunlu): physician \| nurse\_practitioner \| registered\_nurse \| registered\_practical\_nurse \| physiotherapist \| occupational\_therapist \| speech\_language\_pathologist \| registered\_dietitian \| medical\_social\_worker \| respiratory\_therapist \| other (free-text follow-up)
  **Input 3 --- specialty:** Free-text + autosuggest dropdown (common values: Family Medicine, Cardiology, Geriatrics, PM&R, Internal Medicine, Psychiatry, Community Nursing, Acute Care, Wound Care, Pediatric PT, Vestibular Rehab, Geriatric OT, vb.). Optional MVP. V1: CMA/CNO/college taxonomy binding.
  **Input 4 --- profile\_photo:** Image upload (max 5MB, JPG/PNG, square crop). Optional. Default: initials avatar (legal first + last initial) on colored background (deterministic from user\_id).
  **Yardımcı metin:** \"Your display name and photo appear in Patient 360 charts, messaging, and care team visibility. Choose what represents you professionally.\"
  **Validasyon:** display\_name min 2; discipline zorunlu; specialty optional
  **Yerel depolama:** Yok (auth sonrası backend)
  **Backend etkisi:** Practitioner.name.alias (display\_name), Practitioner.qualification.code (discipline pre-binding), PractitionerRole.specialty (free-text optional), Practitioner.photo (URL after upload)
  **Primary CTA:** Continue
  **Secondary CTA:** Back (uyarı modal: \"Going back will not delete your progress. Continue?\")
  **Platform farkı:** Mobile = stack form, image picker; Web = 2-column (form + preview card)
  **Analytics:** `profile_completed { discipline, specialty_provided: bool, photo_uploaded: bool, display_name_default_used: bool }`

> *Photo display rules across the ecosystem: Patient/Caregiver/Family
> Apps\'te clinician profile photo görünür (consent check yok ---
> public-display professional identity). Klinisyen photo upload
> etmediyse default initials avatar tüm yüzeylerde tutarlı.*

HCP\_ONB\_06\_AFFILIATION\_CHOICE --- Organization Affiliation
--------------------------------------------------------------

Onboarding\'in son substantive adımı. Üç path:

  HCP\_ONB\_06\_AFFILIATION\_CHOICE
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **UI Pattern:** 3 büyük card (mobile: stack; web: row)
  **Card 1 --- Solo Practice:** \"I practice independently. Sinalytix will set up a Solo Practice context for me.\" Subtitle: \"You can join an organization later.\"
  **Card 2 --- Join Organization (V1):** \"I have an invite code from my organization (e.g., Bayshore, SE Health, NP-Led Clinic).\" MVP\'de **disabled** + tooltip \"Coming in V1. Use \'Skip for now\' and add later.\"
  **Card 3 --- Skip for Now:** \"I\'ll add my organization later.\" Subtitle: \"You can verify your license now and add organization in Settings.\"
  **Validasyon:** Bir card seçimi zorunlu
  **Backend etkisi (Solo seçilirse):** Self-Organization resource yaratılır (Organization.type=\'self\', name=\'Solo Practice --- \[Display Name\]\'); PractitionerRole yaratılır (org=Self-Organization, active=false, period.start=now); active\_org\_id session state set
  **Backend etkisi (Skip seçilirse):** Hiçbir PractitionerRole yaratılmaz; klinisyen Worklist\'te empty state görür; Settings → Affiliation flow daha sonra Solo/Join Org seçimi sunar
  **Primary CTA:** Continue
  **Secondary CTA:** Back
  **Analytics:** `affiliation_choice { choice: solo | skip | join_org (V1+) }`

HCP\_ONB\_07\_DONE --- Tamamlandı + Soft-Gate Active
----------------------------------------------------

  HCP\_ONB\_07\_DONE --- Tamamlandı
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Başlık:** \"Welcome to Sinalytix, \[Display Name\].\"
  **Alt metin (Solo):** \"Your Solo Practice is ready. Complete verification to start working with patients.\"
  **Alt metin (Skip):** \"Your account is ready. To start working with patients, complete verification and choose your practice setting.\"
  **Primary CTA:** Complete Verification → HCP\_VER\_01
  **Secondary CTA:** Go to Dashboard → Main App (Soft-Gate banner persistent)
  **Banner persistente (Main App\'te):** Yellow banner --- \"Verification pending. Clinical actions are unavailable until your license is verified. \[Complete now\]\"
  **Soft-gate behavior:**

-   Patient 360: hidden (no patients yet)
-   Worklist: empty state with verification CTA
-   Settings: full access
-   Messaging: read-only (cannot initiate clinical messages with
    patients)
-   Notes/Orders/Documentation: disabled with tooltip \"Available after
    verification\" \| \| **Analytics:**
    `onboarding_completed { completion_time_ms, affiliation_choice, immediately_started_verification: bool }`
    \|

HCP\_VER\_01\_GOVT\_ID --- Government Photo ID Upload
-----------------------------------------------------

Settings → Verification flow\'unun ilk adımı.

  HCP\_VER\_01\_GOVT\_ID --- Government Photo ID
  -------------------------------------------------------------------------------------------------------------------------------------------
  **Accepted documents:** Driver\'s license (front+back), Passport (photo page), Provincial health card (front; some provinces show photo).
  **Upload:** Mobile = native camera + photo library; Web = drag-and-drop + file picker
  **File requirements:** JPG/PNG/PDF, max 10MB per file, max 2 files (front+back for license)
  **\[RECONCILED: B10\]** Bu 10MB limiti **kredensiyel (credentialing) bağlamıdır** (Doc 1). Klinik döküman ingest limiti ayrıdır: 25MB/file (Doc 5). İkisi farklı bağlam; **çelişki değil** (Dictionary B10).
  **Quality checks (client-side):** min resolution 1024x768, brightness/blur heuristic; warning if poor quality
  **Quality checks (server-side, V1+):** OCR-based face detection + name extraction for pre-validation
  **Backend etkisi:** VerificationDocument(type=govt\_id, files=\[\...\], status=pending\_review)
  **Primary CTA:** Continue
  **Secondary CTA:** Save and Exit (Settings\'te resume)
  **Hata: file too large:** \"File exceeds 10MB. Please compress or rescan.\"
  **Hata: invalid format:** \"Only JPG, PNG, or PDF accepted.\"
  **Analytics:** `govt_id_uploaded { document_type, file_count, quality_warning_shown: bool }`

> *PHIPA storage note: Government ID documents Canadian PHI data
> residency\'sinde tutulur (AWS Canada Central). Encryption at rest
> (AES-256) + access log + 7-year retention post-account-deactivation
> (PHIPA s.13).*

HCP\_VER\_02\_LICENSE\_ENTRY --- Provincial License Entry
---------------------------------------------------------

  HCP\_VER\_02\_LICENSE\_ENTRY --- Provincial License Entry
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Input 1 --- province:** dropdown (ON, BC, AB, QC, MB, SK, NS, NB, NL, PEI, YT, NT, NU) --- MVP\'de yalnızca **ON** active scope; diğerleri \"Collected, active in V2\" badge
  **Input 2 --- regulatory\_college:** dropdown (filtered by province + discipline) --- örn. ON + Physician → CPSO; ON + RN → CNO; ON + PT → CPO
  **Input 3 --- license\_number:** string, zorunlu, regex per college (örn. CPSO: 5-6 digits; CNO: 7 digits)
  **Input 4 --- license\_status\_on\_registry:** dropdown (\'Active\', \'Active with restrictions\', \'Provisional\', \'Inactive\', \'Other\') --- clinician self-report; admin cross-check ile teyit
  **Input 5 --- expiry\_date:** date, zorunlu, future date
  **Input 6 --- registration\_date:** date, optional, past date
  **\"Add another license\"** CTA: multi-license support (multi-province veya multi-discipline) --- MVP\'de structural; ON dışı `period.end` ile inactive marked
  **Validasyon:** All required + regex match per college + future expiry
  **Backend etkisi:** LicenseRecord(province, college, license\_no, expiry\_date, status=pending\_review) linked to PractitionerRole
  **Primary CTA:** Continue
  **Secondary CTA:** Save and Exit
  **Platform farkı:** Mobile = stack form, dropdowns mobile-optimized; Web = 2-column form
  **Analytics:** `license_entered { province, college, license_count, multi_province: bool }`

HCP\_VER\_03\_LICENSE\_CERT --- License Certificate Upload
----------------------------------------------------------

  HCP\_VER\_03\_LICENSE\_CERT --- License Certificate Upload
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Accepted:** PDF, JPG, PNG (max 10MB, max 5 files for multi-page or multi-license)
  **Description:** \"Upload your current license certificate(s) from your provincial regulatory college. This document must show your name, license number, and expiry date.\"
  **Upload:** Mobile camera + photo library + Files app; Web drag-and-drop + file picker
  **Linked to:** Each LicenseRecord can have multiple cert files (multi-page)
  **Backend etkisi:** VerificationDocument(type=license\_cert, files=\[\...\], linked\_license\_record\_id, status=pending\_review)
  **Primary CTA:** Continue
  **Secondary CTA:** Save and Exit
  **Analytics:** `license_cert_uploaded { file_count, total_size_mb }`

HCP\_VER\_04\_MALPRACTICE --- Malpractice Insurance (Optional)
--------------------------------------------------------------

  HCP\_VER\_04\_MALPRACTICE --- Malpractice Insurance
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Optional:** Klinisyen \"Skip\" diyebilir; ancak \"Add insurance\" CTA Settings\'te kalıcı görünür
  **Accepted:** PDF (max 10MB) --- Certificate of Insurance veya equivalent
  **Description:** \"Optional. Adding your malpractice insurance enables an \'Insurance verified\' badge on your profile. Solo practitioners are strongly encouraged to add this. Organization-employed clinicians: your organization may cover this.\"
  **Backend etkisi:** VerificationDocument(type=malpractice\_insurance, files=\[\...\], expiry\_date, status=pending\_review) --- nullable
  **Primary CTA:** Submit / Skip
  **Secondary CTA:** Save and Exit
  **Analytics:** `malpractice_step { action: submitted | skipped }`

> *Settings\'te (post-verification) \"Insurance verified\" badge
> kullanıcı profile card\'ında görünür. Patient 360\'ta clinician
> profile preview\'da bu badge \"Member: \[verified\]\" tarzı görünür
> (V1+ UI detayı).*

HCP\_VER\_05\_SUBMIT --- Submit for Review
------------------------------------------

  HCP\_VER\_05\_SUBMIT --- Submit for Review
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **UI Pattern:** Summary card: tüm uploaded documents + license entries listelenir; clinician confirm eder
  **Pre-submit validation:** Government ID present + License entry present + License cert present + Affiliation present (Solo or Org PractitionerRole). Malpractice optional.
  **Submit Confirmation Modal:** \"Once submitted, you cannot modify your documents until review is complete. Estimated review time: 48 business hours.\"
  **Backend etkisi:** CredentialingReview(status=in\_review, queue\_entered\_at, target\_sla\_at = queue\_entered\_at + 48h business, hard\_sla\_at = queue\_entered\_at + 5d business); All VerificationDocument and LicenseRecord status → in\_review (locked from edit)
  **Notification to admin queue:** Internal admin tool gets new queue item
  **Notification to clinician:** Email + push + in-app banner --- \"Verification submitted. We\'ll review within 48 business hours.\"
  **Primary CTA:** Submit for Review (with confirmation)
  **Secondary CTA:** Back to add Malpractice Insurance
  **Analytics:** `verification_submitted { has_malpractice: bool, affiliation_type, total_documents_count }`

HCP\_VER\_06\_REVIEW\_STATUS --- Review Status Display
------------------------------------------------------

  HCP\_VER\_06\_REVIEW\_STATUS --- Review Status
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **State: in\_review:** \"Your documents are being reviewed. Estimated completion: \[date\].\" Spinner. Banner: \"Verification in progress\"
  **State: approved:** \"Verification approved! You can now access full clinical workflow.\" Green confirmation. PractitionerRole.active=true. Soft-gate lifted.
  **State: rejected:** \"Verification needs attention.\" Reject reason displayed + admin note. CTA: \"Re-upload \[missing/incorrect document\].\" Link to HCP\_VER\_07.
  **State: requires\_more\_info (V1):** \"Additional information requested.\" Admin note + CTA to provide.
  **Notification on state change:** Email + push + in-app banner
  **Platform farkı:** Mobile = full-screen state; Web = Settings panel + sidebar status
  **Analytics:** `verification_state_viewed { state, time_in_state_ms }`

HCP\_VER\_07\_REJECT\_RESPOND --- Re-Upload Single Document
-----------------------------------------------------------

  HCP\_VER\_07\_REJECT\_RESPOND --- Reject Response
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **UI:** Single document upload flow specifically for the rejected document type (govt\_id / license\_cert / license\_entry / malpractice).
  **Reject reasons (enum):** `documents_unclear`, `name_mismatch`, `license_expired`, `license_not_found_in_registry`, `document_missing`, `other`
  **Admin note:** Free-text from admin (max 1000 chars) --- actionable guidance
  **Re-upload behavior:** Yeni VerificationDocument version created; previous version marked as `superseded`. CredentialingReview.status → in\_review (new SLA: 24h target, 3d hard --- faster than initial since only single document re-review)
  **Primary CTA:** Resubmit
  **Secondary CTA:** Contact Support
  **Analytics:** `reject_responded { reject_reason, time_to_respond_ms, retry_count }`

HCP\_LOGIN\_CONTEXT\_PICKER --- Active Organization Modal
---------------------------------------------------------

  HCP\_LOGIN\_CONTEXT\_PICKER --- First Login Modal
  ----------------------------------------------------------------------------------------------------------------------------------------------
  **Trigger:** Successful auth (email + password + 2FA) AND clinician has \>1 PractitionerRole (multi-org)
  **UI Pattern:** Full-screen modal (mobile) / Centered modal (web), dismissable only by selecting
  **Title:** \"Select your organization for this session\"
  **Subtitle:** \"You can switch later using the header dropdown.\"
  **List:** All active PractitionerRoles with org context --- Org name + Role/Discipline + Last accessed date. Last-used pre-selected (radio).
  **Optional checkbox:** \"Remember this selection on next login\" (default unchecked)
  **Primary CTA:** Continue
  **Backend etkisi:** session.acting\_practitioner\_role\_id + session.acting\_org\_id set; audit log entry `context_selected_at_login`
  **Analytics:** `context_picker_first_login { num_orgs, selected_org_id (hashed), used_last_remembered: bool, time_on_modal_ms }`

HCP\_HEADER\_CONTEXT\_DROPDOWN --- Persistent Org Switcher
----------------------------------------------------------

  HCP\_HEADER\_CONTEXT\_DROPDOWN --- Header Dropdown
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Trigger:** Visible if clinician has \>1 PractitionerRole. Hidden if solo (single context).
  **UI Pattern:** Header bar element --- current org name + chevron; click → dropdown
  **Dropdown items:** All active PractitionerRoles + \"Manage organizations\" → Settings
  **Switch behavior:** Click another org → confirmation modal if unsaved drafts present (\"Switching will leave drafts in current org. Continue?\"); else immediate switch
  **Audit log on switch:** `org_context_switched { from_org_id, to_org_id, switched_at, had_drafts: bool }`
  **Platform farkı:** Mobile = bottom sheet (more screen-friendly); Web = top header dropdown
  **Analytics:** `org_switched { from_org_id (hashed), to_org_id (hashed), num_total_orgs }`

6. Veri Modeli
==============

6.1 Yerel Depolama (Auth Öncesi)
--------------------------------

    interface OnboardingDraft {
      step_progress: "intro" | "language" | "consent" | "identity" | "email" | "verify" | "password" | "2fa" | "transfer" | "profile" | "affiliation" | "done";
      language: "en" | "fr" | "tr"; // tr internal only
      consent: {
        accept_tos: boolean;
        accept_privacy: boolean;
        ack_not_emergency: boolean;
        ack_clinical_responsibility: boolean;
        ack_scope_of_practice: boolean;
        ack_phipa_esp: boolean;
        consented_at: string; // ISO8601
      };
      identity: {
        legal_first_name: string;
        legal_middle_name?: string;
        legal_last_name: string;
        date_of_birth: string; // ISO8601 date
      };
      // Auth fields are NOT stored in draft (they go directly to backend after each step)
    }

Storage: iOS Keychain (kSecAttrAccessibleAfterFirstUnlock), Android
Keystore (KeyProperties.PURPOSE\_ENCRYPT), Web IndexedDB encrypted via
Web Crypto API (AES-GCM derived from random key, key stored in
sessionStorage post-auth and discarded).

6.2 Backend Veri Modeli
-----------------------

### User (Extended for Clinician)

  Alan                             Tip          Notlar
  -------------------------------- ------------ ------------------------------------------------------------------------------------------------
  user\_id                         uuid         Primary key
  roles\[\] (was `user_type`)       text\[\]       `patient` \| `caregiver` \| `family` \| `clinician` (NEW). \[RECONCILED: A2 --- canonical is multi-value `roles[]`, NOT a single `user_type`; same enum values now expressed as `roles[]` membership. One real person = one `User` row. Dictionary §1.\]
  email                            string       Unique, indexed
  email\_verified                  boolean      ---
  password\_hash                   string       Argon2id
  two\_factor\_method              enum         `totp` \| `sms`
  two\_factor\_secret\_encrypted   string       TOTP secret (AES-256)
  two\_factor\_phone               string       E.164 (SMS method)
  backup\_codes\_hash              string\[\]   8 codes, Argon2id
  locale                           string       en/fr/tr
  status                           enum         `incomplete` \| `active` \| `suspended_soft` \| `suspended_hard` \| `dormant` \| `deactivated`
  created\_at                      timestamp    ---
  onboarding\_completed\_at        timestamp    ---
  last\_login\_at                  timestamp    ---
  failed\_login\_count             int          Brute-force protection

> *Cross-app reconciliation: Mevcut Patient/Caregiver/Family
> PRD\'lerinde User table\'ı bu fields\'in subset\'ine sahip.
> Reconciliation pass\'inde User base table + UserExtension (per type)
> pattern\'ına refactor edilebilir. MVP\'de denormalize OK; doc 1 sadece
> clinician-specific fields\'i ekler.*

### Practitioner (FHIR R4 + CA Core+)

  Alan               Tip         FHIR Mapping                                           Notlar
  ------------------ ----------- ------------------------------------------------------ ---------------------------------------------------------------
  practitioner\_id   uuid        Practitioner.id                                        Primary key (= internal UUID)
  user\_id           uuid        (none --- internal link)                               FK → User (1:1)
  identifier\_set    jsonb       Practitioner.identifier\[\]                            Sinalytix UUID + provincial license slice
  name\_official     jsonb       Practitioner.name (use=official)                       { family, given, suffix } from legal name
  name\_display      string      Practitioner.name (use=usual)                          Display name (configurable)
  photo\_url         string      Practitioner.photo                                     Nullable (default initials avatar generated client-side)
  birth\_date        date        Practitioner.birthDate                                 From identity step
  discipline\_code   enum        Practitioner.qualification\[0\].code                   physician \| nurse\_practitioner \| registered\_nurse \| etc.
  specialty\_text    string      Practitioner.qualification\[1\].code.text (V1: code)   Free-text MVP
  created\_at        timestamp   ---                                                    ---
  updated\_at        timestamp   ---                                                    ---

### PractitionerRole (FHIR R4)

  Alan                     Tip         FHIR Mapping                     Notlar
  ------------------------ ----------- -------------------------------- -------------------------------------------------------------------------------------------------------
  practitioner\_role\_id   uuid        PractitionerRole.id              Primary key
  practitioner\_id         uuid        PractitionerRole.practitioner    FK → Practitioner
  organization\_id         uuid        PractitionerRole.organization    FK → Organization (Self-Organization for solo)
  code                     jsonb       PractitionerRole.code\[\]        Discipline + role tags (e.g., \[physician, primary\_care\], \[registered\_nurse, care\_coordinator\])
  specialty                jsonb       PractitionerRole.specialty\[\]   Specialty array
  province\_code           enum        (extension)                      ON \| BC \| AB \| QC \| etc.
  license\_record\_id      uuid        (internal link)                  FK → LicenseRecord
  active                   boolean     PractitionerRole.active          true if verified + license active
  period\_start            timestamp   PractitionerRole.period.start    ---
  period\_end              timestamp   PractitionerRole.period.end      Set on license expiry, role change, or org leave
  created\_at              timestamp   ---                              ---

### Organization (FHIR R4)

  Alan                   Tip         FHIR Mapping                  Notlar
  ---------------------- ----------- ----------------------------- ------------------------------------------------------------------------------------------------------
  organization\_id       uuid        Organization.id               Primary key
  type                   enum        Organization.type             `self` (gizli solo) \| `home_care_agency` \| `clinic` \| `hospital` \| `community_health` \| `other`
  name                   string      Organization.name             \"Solo Practice --- \[Display Name\]\" for self
  identifier             jsonb       Organization.identifier\[\]   OrgID set (CRA business no., OntarioMD ID, etc.)
  address                jsonb       Organization.address\[\]      ---
  active                 boolean     Organization.active           ---
  invisible\_to\_users   boolean     (extension)                   true for self orgs (hidden in UI dropdowns when single context)
  created\_at            timestamp   ---                           ---

### LicenseRecord

  Alan                          Tip         Notlar
  ----------------------------- ----------- ----------------------------------------------------------------------------------------------------
  license\_record\_id           uuid        Primary key
  practitioner\_role\_id        uuid        FK → PractitionerRole
  province\_code                enum        ON \| BC \| etc.
  regulatory\_college\_code     enum        CPSO \| CNO \| CPO \| COTO \| CASLPO \| CDO \| OCSWSSW \| CRTO \| CPSBC \| etc.
  license\_number               string      Per-college regex validated
  status\_self\_reported        enum        `active` \| `active_with_restrictions` \| `provisional` \| `inactive`
  status\_admin\_verified       enum        `pending` \| `verified_active` \| `verified_restrictions` \| `not_found` \| `expired` \| `revoked`
  issued\_date                  date        Optional
  expiry\_date                  date        Required
  created\_at                   timestamp   ---
  verified\_at                  timestamp   When admin approved
  superseded\_by\_license\_id   uuid        If renewed, FK to new license

### VerificationDocument

  Alan                          Tip         Notlar
  ----------------------------- ----------- ------------------------------------------------------------------------------------------------------------------------------------
  verification\_document\_id    uuid        Primary key
  user\_id                      uuid        FK → User
  document\_type                enum        `govt_id` \| `license_cert` \| `malpractice_insurance` \| `cv` (V1+) \| `hospital_privileges` (V1+) \| `board_certification` (V1+)
  linked\_license\_record\_id   uuid        Nullable; FK → LicenseRecord (for license\_cert)
  files                         jsonb       Array of file refs: { storage\_url, original\_filename, mime\_type, size\_bytes, uploaded\_at }
  status                        enum        `pending_review` \| `in_review` \| `approved` \| `rejected` \| `superseded`
  version                       int         Increments on re-upload
  superseded\_by                uuid        If replaced, FK to new version
  uploaded\_at                  timestamp   ---
  reviewed\_at                  timestamp   ---

### CredentialingReview

  Alan                            Tip         Notlar
  ------------------------------- ----------- --------------------------------------------------------------------------------------------------------------------------------------------
  credentialing\_review\_id       uuid        Primary key
  user\_id                        uuid        FK → User
  practitioner\_role\_id          uuid        FK → PractitionerRole (the role being credentialed)
  status                          enum        `in_review` \| `approved` \| `rejected` \| `requires_more_info` (V1)
  reject\_reason                  enum        `documents_unclear` \| `name_mismatch` \| `license_expired` \| `license_not_found_in_registry` \| `document_missing` \| `other` (nullable)
  admin\_note                     text        Free-text from admin (max 1000)
  queue\_entered\_at              timestamp   ---
  target\_sla\_at                 timestamp   queue\_entered\_at + 48 business hours
  hard\_sla\_at                   timestamp   queue\_entered\_at + 5 business days
  reviewed\_by\_admin\_user\_id   uuid        FK → AdminUser
  reviewed\_at                    timestamp   ---
  version                         int         Increments on each new review cycle (initial + rejects)

### AdminQueueItem (Internal Admin Tool)

  Alan                        Tip         Notlar
  --------------------------- ----------- -----------------------------------------------
  admin\_queue\_item\_id      uuid        Primary key
  credentialing\_review\_id   uuid        FK → CredentialingReview
  assigned\_admin\_user\_id   uuid        Nullable; FK → AdminUser (claimed for review)
  claimed\_at                 timestamp   ---
  released\_at                timestamp   If claim released without decision
  priority                    enum        `normal` \| `escalated` (V1+)

### AdminAuditLog (Subset of universal audit log)

  Alan                             Tip         Notlar
  -------------------------------- ----------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  audit\_log\_id                   uuid        Primary key
  event\_type                      string      `verification_submitted`, `verification_approved`, `verification_rejected`, `license_expired_auto_inactive`, `context_selected_at_login`, `org_context_switched`, `account_suspended_soft`, `account_suspended_hard`, `appeal_submitted`, `appeal_resolved`, etc.
  user\_id                         uuid        Subject user
  acting\_user\_id                 uuid        Who triggered (clinician self, admin)
  acting\_practitioner\_role\_id   uuid        If clinician self-action
  acting\_org\_id                  uuid        If clinician self-action
  acting\_admin\_user\_id          uuid        If admin
  event\_data                      jsonb       Event-specific payload
  event\_at                        timestamp   ---
  ip\_hash                         string      SHA-256
  user\_agent\_hash                string      SHA-256
  **IMMUTABLE**                    ---         UPDATE / DELETE not permitted at app level. PHIPA s.13 7-year retention.

6.3 FHIR Profile Mapping (CA Core+ Alignment)
---------------------------------------------

  Sinalytix Resource   FHIR R4 Resource                                                            CA Core+ Profile             Required Slices
  -------------------- --------------------------------------------------------------------------- ---------------------------- --------------------------------------------------------------------------
  Practitioner         Practitioner                                                                `ca-core-practitioner`       identifier (Sinalytix UUID), name.official, birthDate, qualification
  PractitionerRole     PractitionerRole                                                            `ca-core-practitionerrole`   practitioner, organization, code (discipline), specialty, period, active
  Organization         Organization                                                                `ca-core-organization`       identifier, name, type
  LicenseRecord        (Custom --- maps to Practitioner.qualification + PractitionerRole.period)   ---                          ---

> *Cross-app FHIR alignment: Patient/Caregiver/Family PRD\'leri henüz
> FHIR-strict değil (Caregiver schema custom relational). HCP Doc 1 ile
> birlikte FHIR R4 + CA Core+ baseline introducing edilir. Cross-app
> reconciliation pass\'inde Patient app\'in Patient resource\'unun da CA
> Core+ profile\'a align edilmesi gerek.*

6.4 Storage & Residency
-----------------------

-   **PostgreSQL multi-tenant**: Row-Level Security (RLS) policies on
    tenant tables (Organization, PractitionerRole, LicenseRecord,
    VerificationDocument, CredentialingReview). RLS predicate:
    `org_id = current_setting('app.acting_org_id')::uuid`.
-   **Object storage**: Government ID, License cert, Malpractice
    insurance documents → AWS S3 Canada Central (Toronto/Montreal
    region). Encryption: SSE-KMS with Sinalytix-managed CMK.
-   **Audit log**: Append-only Postgres table + nightly replication to
    immutable S3 Glacier Canada Central (7-year retention).
-   **Backup**: Daily snapshots, encrypted, Canada residency.

6.5 Audit Log Event Inventory (Doc 1 Scope)
-------------------------------------------

  Event Type                           Trigger                               Captured Data
  ------------------------------------ ------------------------------------- ---------------------------------------------------------------------
  `clinician_account_created`          User + Practitioner first persisted   user\_id, practitioner\_id, ip\_hash, user\_agent\_hash, locale
  `clinician_consent_recorded`         ConsentRecord written                 user\_id, consent\_version, flags, server\_recorded\_at
  `clinician_2fa_enabled`              2FA setup completed                   user\_id, method (totp/sms), backup\_codes\_saved: bool
  `affiliation_chosen`                 HCP\_ONB\_06 decision                 user\_id, choice (solo/skip/join\_org)
  `self_org_created`                   Solo path → Self-Organization         user\_id, organization\_id
  `verification_document_uploaded`     VerificationDocument created          user\_id, document\_type, file\_count, version
  `verification_submitted`             CredentialingReview created           user\_id, credentialing\_review\_id, target\_sla\_at, hard\_sla\_at
  `verification_approved`              Admin approves                        user\_id, admin\_user\_id, license\_record\_id, decision\_time\_ms
  `verification_rejected`              Admin rejects                         user\_id, admin\_user\_id, reject\_reason, admin\_note
  `practitioner_role_activated`        PractitionerRole.active=true          practitioner\_role\_id, triggering\_event
  `license_expiry_warning_sent`        60/30/7 day reminder                  user\_id, license\_record\_id, days\_until\_expiry, channel
  `license_expired_auto_inactive`      Expiry day auto-action                user\_id, license\_record\_id, practitioner\_role\_id
  `context_selected_at_login`          Modal selection                       user\_id, practitioner\_role\_id, org\_id
  `org_context_switched`               Header dropdown switch                user\_id, from\_org\_id, to\_org\_id, had\_drafts: bool
  `account_suspended_soft`             Admin soft suspend                    user\_id, admin\_user\_id, reason
  `account_suspended_hard`             Admin hard suspend                    user\_id, admin\_user\_id, reason
  `appeal_submitted`                   Clinician appeal                      user\_id, appeal\_text, supporting\_doc\_count
  `appeal_resolved`                    Admin appeal decision                 user\_id, admin\_user\_id, decision (uphold/lift/convert)
  `account_state_transition_dormant`   180-day inactivity trigger            user\_id, last\_active\_at
  `account_reactivated`                Manual reactivation                   user\_id, admin\_user\_id, reason

7. Hata Durumları ve Edge Case\'ler
===================================

  Senaryo                                                                    Kullanıcıya Gösterilen                                                                                       Sistem Davranışı
  -------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------ ----------------------------------------------------------------------------------
  Email verification link expired (24h)                                      \"Verification link expired. Request a new one.\"                                                            New token; rate limit 3/30 dk
  Email verification link clicked twice                                      \"This link has already been used. Please log in.\"                                                          Existing User; redirect to login
  2FA TOTP setup verification failed                                         \"Code did not match. Please try again.\"                                                                    Retry; max 5 attempts then setup reset required
  2FA SMS OTP timeout (5 min)                                                \"Code expired. Request a new one.\"                                                                         New code; rate limit 3/10 dk
  Backend transfer failure post-2FA                                          (User sees spinner; no error shown unless network down \>5s)                                                 Silent retry (exponential backoff, max 5); next launch resume
  Email already registered                                                   \"An account already exists with this email. \[Log in\] or \[Reset password\].\"                             Block new registration; provide recovery
  License number regex failure                                               \"License number format does not match \[College\] requirements. Example: 12345\"                            Inline validation; CTA disabled
  Province + College mismatch                                                \"This college is not registered in the selected province.\"                                                 Filtered dropdown; impossible UI state
  Duplicate license entry (same province + college + license\_no)            \"This license is already registered with another account. Contact support.\"                                Block; refer to support
  Document upload size exceeded                                              \"File exceeds 10MB. Please compress or split into multiple files.\"                                         Inline error
  Document upload format invalid                                             \"Only JPG, PNG, or PDF accepted.\"                                                                          Inline error
  Document upload network failure                                            \"Upload failed. \[Retry\]\"                                                                                 Manual retry CTA
  Verification submitted but no PractitionerRole                             \"Please select Solo Practice or skip to Settings → Affiliation before submitting.\"                         Block submit; redirect
  Verification approval delayed beyond hard SLA                              (Internal alert to Sinalytix ops; clinician unaffected unless contacted)                                     Banner: \"Verification taking longer than expected. We\'ll notify you shortly.\"
  License expiry on weekend                                                  T-0 = midnight expiry day; auto-inactivate at 00:01 local time (province TZ)                                 Notifications still sent on schedule
  License renewal certificate uploaded but new expiry equals or before old   \"The new expiry date must be after the current expiry.\"                                                    Inline error
  Multi-org clinician deletes one PractitionerRole (V1)                      \"Are you sure? Patients assigned to this role will be reassigned to org admin or other team members.\"      Confirmation modal + reassignment flow
  Solo clinician tries to invite another clinician (V1+)                     \"Solo Practice does not support team members. Upgrade to a multi-clinician organization to invite team.\"   Block; offer org upgrade
  2FA recovery code used                                                     \"Recovery code accepted. Please configure a new 2FA method immediately.\"                                   Force 2FA reset on next action
  Account locked due to brute-force                                          \"Too many failed login attempts. Account locked for 30 minutes.\"                                           Cooldown + email notification
  Suspended clinician tries clinical action                                  \"Your account is suspended: \[reason\]. \[Submit appeal\]\"                                                 Hard block; appeal CTA
  Org context switch with unsaved draft                                      \"You have unsaved drafts in \[current org\]. Continue switching?\"                                          Modal; drafts persist in DRAFT state in previous org
  Practitioner with no PractitionerRole tries to access Patient 360          \"Add an organization or start solo to access patients.\"                                                    Empty state with CTAs
  Photo upload corrupt file                                                  \"Image file is corrupt or unsupported. Please try another.\"                                                Inline error
  Photo upload face detection (V1, optional)                                 \"We couldn\'t detect a clear photo. Please try another.\"                                                   Warning, not block

8. Kabul Kriterleri
===================

8.1 Fonksiyonel
---------------

-   Self-registration tüm 8 adımdan başarıyla geçer ve kullanıcı
    `User.status=active`, `Practitioner` resource, ConsentRecord ile
    sistemde oluşur.
-   6 zorunlu consent checkbox işaretlenmeden \'Accept and Continue\'
    CTA disabled.
-   Email verification link 24h içinde click edilmezse expired olur;
    yeni link request edilebilir.
-   TOTP 2FA setup verification başarılı olmadan onboarding ilerleyemez.
-   Onboarding sonu Solo / Join Org / Skip choice\'a göre backend doğru
    state oluşturur:
    -   Solo → Self-Organization + PractitionerRole(active=false)
    -   Skip → no PractitionerRole; Worklist empty state
    -   Join Org (V1) → PractitionerRole pending org admin acceptance
-   Verification flow tamamlandığında CredentialingReview yaratılır;
    admin queue item görünür.
-   Admin \"Approve\" sonrası PractitionerRole.active=true ve soft-gate
    kalkar; klinisyen tam erişim alır.
-   Admin \"Reject\" sonrası clinician\'a notification gönderilir + tek
    belge re-upload mümkün.
-   Multi-org clinician\'da login modal görünür; last-used pre-selected;
    header dropdown persistent.
-   Solo clinician\'da context picker modal görünmez; header dropdown
    gizli.
-   Org switch sırasında unsaved drafts persist edilir; switch sonrası
    önceki org\'da DRAFT olarak görünür.
-   License expiry 60/30/7 gün öncesinde proactive notification (email +
    push + in-app banner) gönderilir.
-   License expiry günü 00:01 local TZ\'de
    PractitionerRole.active=false; Patient 360 read-only.
-   Suspension (soft/hard) admin tarafından configurable + appeal flow
    çalışır.
-   Onboarding yarıda bırakılırsa step\_progress\'e göre resume edilir
    (3 state lifecycle).
-   180 gün inactive `abandoned_post_auth` account dormant\'a geçer;
    login disabled.

8.2 Regülasyon / Güvenlik
-------------------------

-   Hiçbir ekran kopyası diagnostic, therapeutic, dosing önermez.
-   \"Sinalytix is not an emergency service. Call 911.\" mesajı intro
    slayt 3 + consent ekranı header\'da görünür.
-   6 ConsentRecord flag\'i (`accept_tos`, `accept_privacy`,
    `ack_not_emergency`, `ack_clinical_responsibility`,
    `ack_scope_of_practice`, `ack_phipa_esp`) ayrı alanlar olarak
    immutable saklanır.
-   ConsentRecord UPDATE/DELETE backend seviyesinde engellenir; sadece
    INSERT.
-   Auth öncesi (Step 0-3) hiçbir PII/PHI sunucuya iletilmez.
-   Local draft iOS Keychain / Android Keystore / Web IndexedDB
    encrypted ile saklanır.
-   Password Argon2id (mem 64MB, iter 3, parallelism 4) hashed; never
    plain.
-   2FA TOTP secret AES-256 encrypted at rest.
-   Government ID, License cert, Malpractice insurance documents AWS
    Canada Central (S3 + SSE-KMS).
-   All audit log entries include `ip_hash` (SHA-256), `user_agent_hash`
    (SHA-256); plain IP not stored.
-   Audit log append-only; UPDATE/DELETE engelli; 7-year retention
    (PHIPA s.13).
-   PHIPA Electronic Service Provider declaration kullanıcıya consent
    ekranında explicit gösterilir (Checkbox 6).
-   License number duplicate check sistemwide unique (same province +
    college + license\_no) --- preventing identity duplication.
-   All admin actions audit\'lenir (`acting_admin_user_id` zorunlu); SLA
    tracking internal dashboard.

8.3 Teknik / Performans
-----------------------

-   Auth sonrası LOCAL → BACKEND transfer: ≤ 3 saniye (normal bağlantı).
-   Document upload: 10MB file ≤ 30 saniye (normal bağlantı).
-   Admin queue tool: pending items list load ≤ 2 saniye.
-   License expiry batch job (gece çalışır): tüm expiring licenses (T-0)
    ≤ 30 dakika.
-   Account context switch: ≤ 500ms server-side; ≤ 1s perceived latency.
-   step\_progress resume success rate: ≥ %95.
-   Onboarding crash/force-close oranı: ≤ %1.
-   TOTP 2FA setup success rate (first attempt): ≥ %70.
-   Backend transfer silent retry success rate (within 5 attempts): ≥
    %99.
-   Government ID + License cert files Canada residency compliance:
    100%.

9. Başarı Metrikleri
====================

9.1 Funnel / Drop-off Hedefleri
-------------------------------

  Adım Geçişi                        Hedef Oran   Neden bu hedef?
  ---------------------------------- ------------ -------------------------------------------------------
  Intro → Language                   ≥ %92        Intro \'Skip\' ile atlanabilir; minimum kayıp
  Language → Consent                 ≥ %97        Zorunlu adım; kayıp = teknik hata göstergesi
  Consent → Identity                 ≥ %93        6-checkbox yoğunluğu; bazıları cesaretsizleşebilir
  Identity → Email Auth              ≥ %95        Standart entry
  Email Auth → Verified              ≥ %85        Email delivery + verification adımı; spam/junk drop
  Verified → Password                ≥ %98        Eşik aşan kullanıcı genelde tamamlar
  Password → 2FA Setup               ≥ %92        TOTP authenticator install gerek; bazılarına engeller
  2FA Setup → Profile                ≥ %95        Backend transfer success
  Profile → Affiliation              ≥ %97        Standart adım
  Affiliation → Done                 ≥ %98        Tek choice
  **TOPLAM Onboarding Completion**   **≥ %65**    Endüstri benchmark (clinician onboarding, çoklu adım)

9.2 Verification Funnel
-----------------------

  Adım                                                    Hedef Oran
  ------------------------------------------------------- ------------------------------
  Onboarding Done → Verification Start (within 7 days)    ≥ %75
  Verification Start → Submit                             ≥ %80
  Submit → Approved (first review)                        ≥ %85
  Submit → Rejected first review → Re-submit → Approved   ≥ %95 cumulative
  Time from Submit to Decision (median)                   ≤ 36 business hours
  Time from Submit to Decision (P95)                      ≤ 5 business days (hard SLA)

9.3 Zaman Metrikleri
--------------------

-   Medyan onboarding completion (Quick-start, 8 adım, no errors): ≤ **5
    dakika**
-   Medyan verification completion (Settings → Submit): ≤ **8 dakika**
-   Time-to-first-clinical-action (post-verification): ≤ 24 saat after
    approval

9.4 Hata Metrikleri
-------------------

-   Email verification first-attempt success: ≥ %85
-   2FA TOTP setup first-attempt success: ≥ %70
-   Document upload first-attempt success (no retry): ≥ %90
-   Verification rejection rate (first review): ≤ %15
-   Re-submit success rate (second review): ≥ %95
-   Onboarding crash rate: ≤ %1
-   Account suspension appeals success rate: ≥ %40 (proxy for suspension
    accuracy)

10. UX ve Tasarım Notları
=========================

10.1 RBV Pattern (Role-Based Visibility)
----------------------------------------

Doc 1 onboarding\'in çoğu single-role view (clinician self-onboarding).
RBV pattern primer aktif olduğunda (post-verification): role-specific
features menu\'de görünür, hidden olduğunda da CTA grayed-out değil
HİDDEN. Doc 1\'de tek RBV uygulaması: solo clinician\'da context picker
dropdown gizli (single org context).

10.2 Mobile + Web Parity
------------------------

  Konu                           Mobile                                  Web
  ------------------------------ --------------------------------------- -------------------------------------------------------
  Onboarding genel               Full-screen stepper; bottom CTA fixed   Centered card layout; CTA bottom-right
  Consent ekranı                 Stack checkbox; full text visible       2-column (checkbox list + collapsed legal text panel)
  Identity entry                 Stack form; keyboard-aware              2-column; tab order optimized
  Auth method                    Vertical card list                      Horizontal cards
  Profile photo upload           Camera + library                        Drag-drop + file picker
  Affiliation choice             Stack 3 cards                           Row 3 cards
  Verification document upload   Camera + library + Files app            Drag-drop + file picker
  Admin queue (V1)               Read-only mobile view                   Full editing web tool (web-primary)
  Context picker modal           Full-screen modal                       Centered modal
  Header context dropdown        Bottom sheet on tap                     Top header dropdown

10.3 Cognitive Load Reduction
-----------------------------

-   Her ekranda maksimum **1 primary CTA + 1 secondary CTA**.
-   Geri navigasyonda form içerikleri korunur (yerel draft veya backend
    state).
-   SSO prefill olduğunda (V1+) açıklama: \"Pre-filled from your
    account. You can edit.\"
-   Hata mesajları: tek satır + ne yapması gerektiği (örn. \"License
    number format: 12345 (5 digits for CPSO).\" değil sadece \"Invalid
    format.\").
-   Klinisyen kohort için font boyutu standart (Caregiver pattern);
    Patient app\'teki büyütülmüş accessibility burada gerekmez ama WCAG
    2.1 AA compliance zorunlu (Sec 10.4).

10.4 Accessibility (WCAG 2.1 AA)
--------------------------------

-   Color contrast 4.5:1 minimum (text); 3:1 (large text + UI elements).
-   All form fields have visible labels (placeholder yetmez).
-   Focus indicators visible (custom outline, browser default OK).
-   Keyboard navigation full coverage (tab order, escape modal, enter
    submit).
-   Screen reader: ARIA labels on icons; live regions for status
    updates.
-   Touch target min 44x44 (mobile) / 24x24 (web).
-   No information conveyed solely by color (badges + text).

10.5 Internationalization
-------------------------

-   All strings extracted to translation files (en.json, fr.json
    baseline; tr.json internal).
-   RTL not supported MVP (no RTL clinician language pre-launch).
-   Date formats locale-aware (Mar 15, 2026 vs 15 mars 2026 vs
    15/03/2026).
-   Province names localized (Ontario / Ontario; British Columbia /
    Colombie-Britannique).

10.6 Performance & Offline
--------------------------

-   Onboarding works fully offline up to Step 4 (Email entry requires
    network).
-   After Step 4, partial offline: local draft preserved; transfer
    retries on reconnect.
-   Document upload requires network; failed uploads queued with offline
    retry indicator (V1).
-   Header context switch: cached org list; switch UI instant; backend
    audit log async.

11. Kullanıcı Senaryoları
=========================

Senaryo 1 --- Solo PMR Uzmanı, Ontario, Kendi Başına Onboard
------------------------------------------------------------

Dr. Ayşe Yılmaz, Toronto\'da private practice fizyatri uzmanı. Mevcut
EMR\'ı (TELUS CHR) ve hasta yönlendirme akışı dışında, evde bakım
hastalarının ailesi ve allied health team ile koordinasyonu için
Sinalytix\'i denemek istiyor.

-   App Store\'dan Sinalytix HCP App\'i indirir.
-   Intro 3 slaytı geçer (\"Skip\" yapmaz, hepsini görür).
-   Dil: English seçer.
-   Consent 6 checkbox\'ı işaretler --- `ack_clinical_responsibility` ve
    `ack_scope_of_practice` ifadeleri ilgisini çeker, link\'leri
    tıklamadan kabul eder.
-   Identity: \"Ayşe\", \"Yılmaz\", DOB girer.
-   Email: <ayse.yilmaz@torontofiziyatri.ca> → verification link 30
    saniye içinde gelir, tıklar.
-   Password: güçlü password oluşturur (autosave password manager).
-   2FA: Authy app\'i kullanır, QR code scan, code verify, backup codes
    kaydeder (iCloud notes\'a kopyalar).
-   Profile: \"Dr. A. Yılmaz\" display name (default\'tan kısaltır),
    Discipline=Physician, Specialty=\"Physical Medicine and
    Rehabilitation\", profile photo upload (klinik web sitesinden).
-   Affiliation: **Solo Practice** seçer.
-   Done ekranı: \"Welcome to Sinalytix, Dr. A. Yılmaz\" --- banner
    \"Verification pending\". \"Complete Verification\" CTA\'ya tıklar.
-   Verification flow\'da: Driver\'s license front+back upload, License
    entry (ON, CPSO, license no, expiry 2027-04-15), license cert PDF
    upload, Malpractice (özel sigortası var, optional ama yükler),
    Submit for Review.
-   Submit confirmation: \"We\'ll review within 48 business hours.\"
    Ekran \"Verification in progress.\"
-   32 saat sonra email + push notification: \"Verification approved!\"
    Login → Patient 360 erişimi açık, Worklist empty (no patients yet
    --- sonraki adım hasta consent\'i bekleme).
-   **Hedef süre:** Onboarding 4 dk, Verification 8 dk, Admin review 32
    saat. Total time-to-active: \~33 saat.

Senaryo 2 --- RN, Bayshore Ajansı (Org Affiliation V1 --- MVP\'de Skip)
-----------------------------------------------------------------------

Sarah Thompson, Bayshore Home Healthcare\'de RN, community wound care.
Bayshore Sinalytix ile B2B partnership pre-MVP\'de değil (V2+), ama
Sarah personal kullanım için Sinalytix kullanmak istiyor (kendi PHI
not\'larını tutmak, kendi referans karty).

-   Onboarding standart akış; **Skip for Now** seçer affiliation\'da.
-   Done ekranı\'nda \"Add organization or start solo to access
    patients\" mesajı.
-   Verification standart akış (Driver\'s license + CNO license + cert +
    no malpractice --- Bayshore org-cover ediyor).
-   Verification approved.
-   Settings → Affiliation\'a gider → Solo Practice seçer (V1\'de
    Bayshore org invite çıkacak).
-   Self-Organization yaratılır; PractitionerRole(active=true) ---
    verification daha önce approved.

Senaryo 3 --- PT, Multi-Province (ON+BC) Onboarding
---------------------------------------------------

Marcus Chen, Vancouver-based physiotherapist + Toronto satellite office
(locum). Hem CPO (Ontario) hem CPTBC (BC) license\'ı var.

-   Onboarding standart; Solo Practice seçer.
-   Verification: Driver\'s license, **First license entry**: ON, CPO,
    license no, expiry. License cert upload. \"Add another license\"
    CTA. **Second license entry**: BC, CPTBC, license no, expiry.
    License cert upload. Malpractice skip.
-   Submit for Review.
-   Admin review: ON license verified active, BC license verified
    active. **MVP\'de yalnızca ON PractitionerRole.active=true**; BC
    PractitionerRole \"collected, V2\'de active\" badge.
-   Approved. Marcus Toronto hastalarıyla başlar; BC hastalarına henüz
    erişim yok (V2 expansion).

Senaryo 4 --- NP, License Expiry Renewal
----------------------------------------

Jennifer Park, NP, ON, Sinalytix\'i 8 aydır kullanıyor. License Nov 15
expire ediyor.

-   T-60 (Sep 16): Email + push + in-app yellow banner --- \"Your
    license expires in 60 days. Renew with CNO and update Sinalytix.\"
-   T-30 (Oct 16): Aynı channels, amber banner.
-   T-7 (Nov 8): Red banner, urgent email.
-   Nov 9: Jennifer CNO\'da renewal complete (license renewed to 2027).
    Sinalytix Settings → Verification → \"Renew License\" CTA → Yeni
    cert upload (new expiry: Nov 15, 2027). Submit.
-   Admin review (24h SLA for renewal --- faster than initial).
    Approved. PractitionerRole.period.end = 2027-11-15.
-   Nov 15: Eski expiry günü ama renewal earlier approved →
    PractitionerRole stays active. Audit log: `license_renewed`.

Senaryo 5 --- Soft Suspend + Appeal
-----------------------------------

David Brown, MSW, ON. Patient complaint filed via Sinalytix support →
Sinalytix admin reviews → decides to soft-suspend pending investigation.

-   David\'in login açık ama clinical actions blocked. In-app banner:
    \"Account suspended: Pending complaint investigation. \[Submit
    appeal\]\"
-   David Appeal CTA → form: statement (David\'in açıklaması) +
    supporting docs (komunkasyon screenshot\'ları).
-   Appeal queue\'ya düşer; Sinalytix admin review.
-   5 gün sonra: Admin decides lift suspension (complaint baseless).
    David notified. Account fully restored. Audit log:
    `appeal_resolved { decision: lift, reason }`.

Senaryo 6 --- Multi-Org Clinician, Org Context Switch
-----------------------------------------------------

Dr. Lisa Kim, family physician. PractitionerRoles:

-   Solo Practice (own private practice)
-   Toronto Community Health (community physician role, part-time)
-   Bayshore RN-led team consultant (V1+ scenario)

İlk login: Modal --- \"Select organization for this session\" --- list
of 3. Lisa \"Toronto Community Health\" seçer (last-used cached).
\"Remember selection\" checkbox işaretler.

-   Header dropdown her zaman görünür. Mid-day, Lisa solo bir hastasıyla
    ilgili çalışmak isteyince dropdown\'dan \"Solo Practice\" switch
    eder. Modal confirmation (unsaved drafts? --- Lisa \"Yes I have
    unsaved drafts\" görür) → \"Continue switching\" → switch
    tamamlanır. Audit log: `org_context_switched`. Önceki Toronto
    Community Health context\'inde DRAFT durumunda note, switch sonrası
    \"You have 1 draft in Toronto Community Health\" notification.

12. Açık Konular
================

  Konu                                                                                                Durum           Sorumlu / Hedef
  --------------------------------------------------------------------------------------------------- --------------- -----------------------------------------
  V1 Organization Invite Flow detayı (token TTL, accept/decline, expire)                              Açık            V1 Doc 1 sürümünde
  Org Admin Role permissions matrix (V1)                                                              Açık            V1 Doc 1 + Doc 2 (RBAC katmanı)
  Specialty taxonomy V1 source --- CMA, CNO, Provincial colleges\'ın birleşik liste?                  Açık            V1 öncesi codeset research
  License renewal proactive workflow UX (V1)                                                          Açık            V1 UX süreci
  Provincial license public registry scraping legal/policy review                                     Araştırılıyor   Legal counsel + V1 partner exploration
  Multi-tab/multi-window web context handling (V2)                                                    Açık            V2 spec
  SSO federation (ONE ID Ontario) V1 spec                                                             Açık            V1 Doc 2 entegrasyonu
  BC Services Card App integration (V2)                                                               Beklemede       V2 Doc 2 entegrasyonu
  Profile photo face detection quality check (V1)                                                     Açık            V1 UX + ML decision
  2FA SMS OTP V0\'da sürüm vs zorunlu TOTP\'a geçiş V1 timeline                                       Açık            Doc 2\'de detaylanacak; security review
  Solo clinician\'ın Self-Organization name görünürlüğü Patient/Family App\'te                        Açık            Cross-app reconciliation pass
  Provincial-aware ConsentRecord --- Quebec civil law sürüm farkı                                     Açık            V2 Quebec rollout araştırması
  Document upload virus scanning (server-side)                                                        Açık            V0 launch öncesi infra review
  Admin queue prioritization (V1: escalation algorithm)                                               Açık            V1
  License renewal grace period (T+0 to T+90) --- re-upload UX kolaylığı                               Açık            V1 UX
  Account dormancy reactivation (180+ days) --- admin manual mı, self-service \"I\'m back\" CTA mı?   Açık            V1 lifecycle policy
  Solo clinician → multi-clinician org upgrade (V1) --- transition flow                               Açık            V1 lifecycle
  Cross-app User table refactor (base + extension pattern)                                            Beklemede       Cross-app reconciliation pass
  ConsentRecord schema generic flag set\'e refactor (Patient/Caregiver/Family/HCP polymorphism)       Beklemede       Cross-app reconciliation pass
  Notification primitive cross-app unification                                                        Beklemede       Cross-app reconciliation pass + Doc 10
  Photo upload storage policy (S3 lifecycle, archival)                                                Açık            V0 launch öncesi infra review
  Internal admin tool architecture (separate app? same monorepo?)                                     Açık            V0 launch öncesi engineering decision
  Multi-language re-consent UX (ToS update)                                                           Açık            V1
  Onboarding analytics events catalog finalization                                                    Açık            V0 launch öncesi analytics review

*Sinalytix --- Gizli ve Özel. Doc 1 / 10 --- Healthcare Professional PRD
Serisi. Geliştirici ve klinik danışman referansı içindir.*

**Sonraki Doc**: Doc 2 --- Authentication, Session, MFA & Audit Spine
(cross-cutting infrastructure spec).

Table of Contents {#table-of-contents-1 .TOC-Heading}
=================

SINALYTIX --- HEALTHCARE PROFESSIONAL APP
=========================================

Doc 2 --- Authentication, Session, MFA & Audit Spine
----------------------------------------------------

  Versiyon   Uygulama                                 Hedef Pazar               Platform                             Durum                              Tarih
  ---------- ---------------------------------------- ------------------------- ------------------------------------ ---------------------------------- ---------------
  V0 (MVP)   Healthcare Professional (Mobile + Web)   Kanada (Ontario odaklı)   React Native + React shared kernel   Taslak --- Geliştirici Referansı   29 Mayıs 2026

*Sinalytix --- Gizli ve Özel. Bu doküman geliştirici, güvenlik ve klinik
danışman referansı içindir.*

1. Bağlam ve Amaç
=================

1.1 Özelliğin Tanımı
--------------------

Doc 2, Sinalytix HCP App\'in **cross-cutting security spine\'ı**dır.
Diğer dokümanların hiçbiri kendi başına auth, session, MFA, re-auth,
recovery, brute-force protection veya audit log spec\'ini tekrar
tanımlamaz --- hepsi bu doc\'a referans verir. Beş ana yetenek katmanını
birleştirir:

-   **Authentication**: Login flow (email + password + 2FA), token
    issuance, session creation.
-   **Session Management**: Asymmetric session policy (mobile 24h + 60
    dk idle / web 12h + 30 dk idle), session lifecycle, concurrent
    session governance.
-   **Multi-Factor Authentication (MFA)**: TOTP-recommended + SMS-backup
    MVP; TOTP zorunlu V1; FIDO2 V2; backup codes management.
-   **Tiered Re-Authentication**: 3-tier clinical action challenge model
    (no-reauth / biometric+PIN / full 2FA).
-   **Device Trust & Brute-Force Protection**: Jailbreak/root detection,
    device fingerprinting, login attempt rate limiting, anomaly
    detection.
-   **Immutable Audit Log Spine**: Canonical event schema, append-only
    PostgreSQL + nightly S3 Glacier replication, 7-year retention,
    RLS-aware tenant isolation, PHIPA s.13 compliance.
-   **PolicyEngine Interface**: Vendor-agnostic authorization
    abstraction (MVP RBAC over PostgreSQL; V1 Cedar swap), context-rich
    decision API (`subject`, `action`, `resource`, `context` →
    `AllowDecision`).

> *Bu doc\'un yazım disipliniyle ilgili kritik bir prensip: Doc 2
> **infrastructure spec**\'tir, \"ekran-merkezli\" değildir. Standart
> 12-bölüm canonical yapı korunur, ancak §5 (Ekran/Yüzey Spec) yalnızca
> cross-cutting auth ekranları (login, 2FA prompt, re-auth modal,
> recovery, lockout) içerir; bunlar diğer 8 doc\'tan referans alınır.*

1.2 Giriş Noktaları
-------------------

Doc 2\'nin koyduğu altyapı **tüm clinician interaksiyon noktalarına**
uygulanır. Beş kategori:

  Giriş Noktası          Tetikleyici                            Ana Yetenek
  ---------------------- -------------------------------------- ---------------------------------------------------------
  **Login**              Kullanıcı app\'i açar, oturum yok      Authentication (email + password + 2FA) → Session yarat
  **Re-auth (Tiered)**   Klinik aksiyon (T3 sign/T4 elevated)   Biometric+PIN (T3) veya full 2FA (T4)
  **Session Renewal**    Mobile 24h / Web 12h dolar             Hard logout; yeniden login zorunlu
  **Idle Lock**          Mobile 60dk / Web 30dk no activity     Soft lock (re-auth ile unlock)
  **Recovery**           Forgot password / Lost 2FA / Locked    Email reset / backup codes / support ticket

1.3 Hedef Kitle
---------------

Doc 2\'nin doğrudan kullanıcı kitlesi yoktur (Doc 1\'in clinician\'ı
hedeflediği gibi); **dolaylı hedefi tüm clinician\'lar**\'dır. Doc
2\'nin **birincil okuyucuları**:

  Okuyucu                                         Doc 2\'den Beklediği
  ----------------------------------------------- ----------------------------------------------------------------------------------------------------------------
  **Backend Developer**                           API spec\'ler, token formatı, session storage, RLS policies, audit log schema, PolicyEngine interface
  **Frontend Developer (React Native / React)**   Login UI, 2FA UI, re-auth modal patterns, secure local storage, biometric API
  **Security Engineer / Reviewer**                Threat model coverage, encryption standards, secret management, audit immutability
  **Compliance Officer / PHIPA Auditor**          Audit log completeness, retention policy, breach notification triggers, ESP role enforcement
  **Klinik Danışman (CXO PMR Uzmanı)**            Klinisyen UX --- re-auth tier\'larının pratiklik açısından makullüğü, lockout UX\'in iş akışını bozma derecesi

1.4 Ekosistem İçindeki Konum
----------------------------

Doc 2 **Doc 1\'in extension\'ıdır** (User table, Practitioner,
PractitionerRole, ConsentRecord, audit baseline). Doc 3-10 ise Doc
2\'nin **consumer\'ıdır** (her doc\'un permission check\'i, audit event
yazımı, re-auth challenge tetikleyicisi).

  İlişki            Doc                                           Doc 2\'nin Sağladığı
  ----------------- --------------------------------------------- -------------------------------------------------------------------------------------------------
  **Extends**       Doc 1                                         User schema\'ya session + auth event + recovery fields; Practitioner\'a auth-related extensions
  **Consumed by**   Doc 3 (Worklist)                              Permission check her worklist load\'da; org context audit
  **Consumed by**   Doc 4 (Patient 360)                           Patient access permission (consent-aware); view event audit
  **Consumed by**   Doc 5 (Health Data Ingestion)                 Document upload audit; OCR/LLM extraction provenance audit; verification queue admin audit
  **Consumed by**   Doc 6 (Care Plan)                             Care plan write/sign audit; elevated action T4 re-auth
  **Consumed by**   Doc 7 (Clinical Documentation)                Note signing T3 re-auth; addendum audit
  **Consumed by**   Doc 8 (Orders & Rx)                           Order signing T3; controlled substance T4 (V1)
  **Consumed by**   Doc 9 (Communication & Visit)                 Message audit; visit start/end audit (EVV --- V2)
  **Consumed by**   Doc 10 (Consent + Settings + Cross-cutting)   Consent grant audit (extends ConsentRecord pattern); settings change audit

**Cross-app primitive olarak Doc 2\'nin paylaşılan kavramları**
(Patient/Caregiver/Family PRD\'leriyle reconciliation pass):

-   **Session schema**: Patient/Caregiver/Family\'de session yapısı
    henüz spec\'lenmemiş (Caregiver sadece email/SSO + OTP). Doc 2\'nin
    Session schema\'sı **cross-app canonical** olarak adapte edilir;
    user\_type\'a göre policy farkları parametrize.
-   **Audit log**: Caregiver/Patient\'ta consent değişiklikleri ve ToS
    acceptance audit\'leniyor; Doc 2\'nin canonical AuditLogEntry
    schema\'sı bunları subsume eder. Cross-app reconciliation pass\'inde
    tek tablo + polymorphic event\_type.
-   **PolicyEngine**: Sadece HCP\'ye özel değil --- Patient\'ın \"kim
    PHI\'sini görebilir\" kararı da PolicyEngine\'i kullanır
    (consent-aware). MVP\'de HCP-side, V1\'de Patient app extension.
-   **2FA recovery codes**: Cross-app consistent format (8 codes,
    single-use, Argon2id hash).

1.5 Regülasyon Çerçevesi
------------------------

Doc 2\'nin altyapısı dört regülasyon katmanına hizmet eder:

**1. PHIPA s.10 --- Electronic Service Provider Obligations**

-   Sinalytix = ESP. HIC (klinisyen veya org) adına işler.
-   s.10(1): Information practices must comply with HIC\'s policies →
    her klinik aksiyon audit\'lenmeli ve klinisyen/org tarafından query
    edilebilmeli.
-   s.10(2): ESP cannot use PHI for own purposes → audit log analytics
    dahil sadece operational ve security amaçlı.
-   s.10(3): ESP must implement reasonable safeguards → device trust,
    brute force, MFA, encryption Doc 2 scope.

**2. PHIPA s.13 --- Records Retention**

-   7-year minimum retention for PHI access logs.
-   Doc 2 audit log: 7-year hot tier (PostgreSQL) + 7-year archival tier
    (S3 Glacier Canada Central). Total: 7-year hard requirement.
-   Recommendation: Lifetime retention for high-stakes audit events
    (consent changes, license actions, account deletion).

**3. PIPEDA --- Federal Personal Information Protection**

-   Klinisyen\'in own PII (email, phone, government ID) PIPEDA Schedule
    1 principles altında korunur.
-   Klinisyen erişim hakkı (Principle 9): klinisyen kendi auth
    eventleri + session history + audit log\'unu görebilmeli (Settings →
    Activity Log, V1).

**4. Provincial College Documentation Standards**

-   CPSO Policy \#4-12, CNO Practice Standard \"Documentation\": her
    klinik kayıt entry\'sinde klinisyen kimliği + timestamp zorunlu. Doc
    2 audit log her klinik aksiyon için `acting_practitioner_role_id`,
    `acting_org_id`, `acted_at`, `device_fingerprint_hash` capture eder.
-   Imzalı not\'lar (signed clinical record) immutable; addendum-only
    modifiable. Doc 2\'nin imza re-auth (T3) ve audit immutability
    spec\'i bu standardı destekler.

> *Klinik danışman notu: Türkiye\'deki e-İmza modeli (her klinik aksiyon
> PKI-signed) Kanada\'da yok --- yerine \"context-specific
> authentication + audit trail\" pattern\'ı kullanılır. Doc 2 bu
> pattern\'ı implement eder. CPSO inspector audit talep ederse: kim, ne
> zaman, hangi cihazdan, hangi session içinde, hangi org context\'inde,
> hangi aksiyon yapıldı --- hepsi audit log\'tan reconstruct edilebilir.
> Bu PKI imza muadili compliance evidence\'tır.*

2. Endüstri ve Klinik Bağlam
============================

2.1 Kanada Healthcare Auth Realitesi
------------------------------------

  Boyut                                   Realite                                                                                 Sinalytix Yaklaşımı
  --------------------------------------- --------------------------------------------------------------------------------------- --------------------------------------------------------------
  **Ulusal PKI**                          Yok (sadece Quebec RAMQ SécurSanté)                                                     Context-specific auth + audit trail (Master Doc §4.6 anchor)
  **ONE ID (Ontario)**                    eHealth Ontario federation; opt-in SAML                                                 V1 SSO integration; MVP\'de yok
  **BC Services Card App**                BC eyalet kimlik doğrulama; mobile-first                                                V2 hedef
  **Healthcare-specific MFA standards**   Provincial colleges genel terms (CPSO \"appropriate security\"); spesifik mandate yok   NIST SP 800-63B AAL2 baseline (TOTP + something-you-know)
  **Password policy standards**           NIST SP 800-63B revised (12+ char, no forced rotation)                                  Kabul edilen modern best practice
  **Audit log standards**                 CPSO Policy \#4-12; CIHI guidance                                                       Per-event capture, immutable, queryable

2.2 Endüstri Pattern\'ları
--------------------------

  Pattern                                   Kanıt                                                                                  Sinalytix Uyumu
  ----------------------------------------- -------------------------------------------------------------------------------------- -----------------------------------------------------------
  **Tiered re-auth for clinical actions**   Epic Hyperspace \"Read-only mode + sign-out modal\"; Cerner PowerChart re-auth on Rx   Doc 2 §4.3 --- 3-tier model
  **Session 8-12h healthcare baseline**     Epic default 10h; AlayaCare 12h; PointClickCare 8h                                     Mobile 24h saha pratiklik için extended; web 12h baseline
  **Biometric for re-auth**                 Apple Watch + iPhone Touch ID common; healthcare apps yaygın                           T3 re-auth biometric primary
  **Backup codes for 2FA recovery**         GitHub/Google standardı                                                                8 single-use codes Argon2id hash
  **Append-only audit log**                 OSCAR Pro audit\_log table immutable trigger; Epic Audit Trail                         PG append-only trigger + S3 Glacier replication
  **Jailbreak/root warn-not-block**         Banking apps healthcare context\'te genelde aynı; UX trade-off                         Warn + clinical actions blocked (read-only OK)
  **RBAC + ABAC layered**                   Epic Security Class (RBAC) + chart-by-chart consent (ABAC)                             MVP RBAC + V1 Cedar ABAC swap

2.3 Healthcare-Specific Threat Model
------------------------------------

  Tehdit                                           Etki                          Doc 2 Karşı Tedbir
  ------------------------------------------------ ----------------------------- ---------------------------------------------------------------------------------------------------
  **SIM-swap attack**                              SMS OTP bypass → PHI access   TOTP recommended MVP; TOTP zorunlu V1; SMS V0\'da legitimate ama recovery code uyarısı
  **Lost/stolen device with active session**       PHI exposure                  Idle timeout (60dk mobile / 30dk web); biometric required for re-unlock; remote logout (Settings)
  **Shoulder surfing in patient home**             Visible PHI                   Session-level screen blur on background (mobile); web session timer indicator
  **Phishing for credentials**                     Account takeover              TOTP/SMS prevent pure password takeover; suspicious activity alert (new country)
  **Brute force login attempts**                   Account compromise            5-fail account lockout 30 min; 20-fail/IP/hr IP block
  **Insider threat (admin with broad access)**     PHI misuse                    All admin actions audit\'lenir; admin audit log immutable; separation of duties V1+
  **Compromised insurance/family member device**   Cross-app session hijack      Cross-app session isolation (separate session DB per user\_type); audit cross-correlation
  **Screen capture (PHI on screen)**               PHI leakage                   iOS/Android screen capture detection → audit event; FLAG\_SECURE Android (V1)
  **Audit log tampering**                          Forensic evasion              Append-only PG trigger + nightly S3 Glacier WORM bucket replication
  **Session hijack via stolen JWT**                Active session takeover       Short access token TTL (15 min) + refresh token rotation; device fingerprint mismatch detection

3. Kapsam ve Kısıtlar
=====================

3.1 Kapsam (In Scope)
---------------------

### V0 --- MVP

**Authentication:**

-   Email + password (Argon2id hash, min 12 chars, NIST SP 800-63B
    compliant)
-   MFA: TOTP authenticator (recommended badge) **veya** SMS OTP
    (klinisyen seçer)
-   8 backup codes (single-use, Argon2id hashed)
-   Email verification on registration (24h token TTL)
-   JWT access token (15 min TTL) + refresh token (per session lifetime,
    opaque token in DB)
-   Token storage: secure HTTP-only cookies (web), iOS Keychain
    (mobile), Android Keystore (mobile)

**Session Management:**

-   **Mobile**: 24h max session + 60 dk idle timeout
-   **Web**: 12h max session + 30 dk idle timeout
-   Idle lock → re-auth required (password or biometric/PIN)
-   Hard logout at max session
-   Concurrent sessions allowed: max 5 active sessions per user (oldest
    evicted on 6th)
-   Manual logout (Settings → Sign out of this device / Sign out of all
    devices)
-   Active session list visible in Settings

**Tiered Re-Authentication (3-Tier):**

-   **No re-auth**: View, browse, draft (T1+T2 combined per user
    direction)
-   **Biometric/PIN**: Note signing, lab/imaging order, regular Rx, care
    plan finalize (T3)
-   **Full 2FA re-prompt**: Controlled substance Rx (V1+), MRP transfer,
    hasta erişim sharing, account deletion, role change submission (T4)

**Device Trust:**

-   Jailbreak/root detection (iOS: dyld bypass, suspicious file paths;
    Android: SafetyNet/Play Integrity attestation V1, basic check V0)
-   Detected → warn + clinical actions blocked (Patient 360 read-only
    OK)
-   Device fingerprinting: per-session anonymized hash (model, OS
    version, app version, locale, screen resolution)
-   New device login → email notification + first-action re-auth

**Brute Force & Anomaly Detection:**

-   5 failed login attempts → 30 min account lockout
-   20 failed attempts per IP per hour → 1h IP block
-   Suspicious activity (new country, rapid 2FA fail) → email alert +
    next login force full re-auth
-   Failed attempts logged with IP hash, user agent hash

**Audit Log Spine:**

-   Canonical AuditLogEntry schema (cross-Doc 1-10)
-   PG append-only table (database trigger blocks UPDATE/DELETE)
-   Nightly S3 Glacier replication (Canada Central, WORM bucket)
-   7-year retention enforced
-   Per-event capture: who, when, what, from-where, on-which-resource,
    with-what-context
-   RLS-aware queries (per-org tenant isolation)
-   Audit log query API (admin + clinician self-audit V1)

**PolicyEngine Interface:**

-   Generic interface:
    `evaluate(subject, action, resource, context) → AllowDecision`
-   MVP implementation: Postgres RBAC join (role → permission map)
-   V1 swap: AWS Cedar (interface stays stable)
-   Context object: consent, careTeamMembership, encounterWindow,
    breakGlass, orgContext, sessionDeviceTrust
-   Decision logging (subset of audit log)

**Account Recovery:**

-   Forgot password: email reset link 24h TTL
-   Lost 2FA: backup codes (any unused)
-   All backup codes used: support ticket → manual verification (photo
    ID + license re-upload, video call optional V1)
-   Account locked: 30 min auto-unlock; manual unlock via password reset

### V1 --- Sonraki

-   **TOTP zorunlu** (SMS only for recovery backup)
-   **FIDO2 hardware key** support (security key add as additional 2FA
    method)
-   **ONE ID SAML federation** (Ontario clinician\'lar için)
-   **Trusted device management** (V1 --- user marks device as trusted,
    less frequent 2FA)
-   **MDM integration hooks** (Intune/Jamf attestation API)
-   **Audit log query UI for clinician** (Settings → Activity Log)
-   **Audit log query UI for admin** (Sinalytix internal tool)
-   **AWS Cedar swap** (PolicyEngine implementation behind same
    interface)
-   **PolicyEngine ABAC rules** (consent-aware, encounter-window-aware)
-   **Suspicious activity ML** (anomaly detection baseline → V1
    enhanced)
-   **Video-call account recovery** (lost everything scenario)
-   **SafetyNet/Play Integrity** (Android attestation V0 basic → V1
    full)

### V2

-   **BC Services Card App** integration
-   **Passkeys / WebAuthn** primary auth (passwordless)
-   **Cross-app session orchestration** (Patient app → HCP referral
    context handoff)
-   **Tab-scoped org context (web)**
-   **Audit log analytics dashboards** (privacy-respecting)
-   **Tier-5 re-auth** for hardware-attested elevated actions (V2
    enterprise)

### V3

-   **SécurSanté PKI** (Quebec) signed actions
-   **Federated audit log** (cross-province regulator queries)
-   **Zero-trust device posture** (continuous attestation)

3.2 Kısıtlar (Constraints)
--------------------------

-   **Mobile session asymmetry**: Mobile 24h + 60dk idle, Web 12h + 30dk
    idle. **Master Doc §4.6 sapması** --- 12h universal anchor revize
    edilmiştir. Clinical re-auth tier\'ı compensating control.
-   **Token security**: Access token JWT (15 min TTL, asymmetric signing
    --- Ed25519); refresh token opaque (DB-backed, rotated on each use).
-   **Refresh token rotation**: Her refresh kullanımında yeni refresh
    token; eski revoke. Replay detection: aynı refresh token 2 kez
    kullanılırsa **tüm session zincirini revoke + email alert**.
-   **No password reset without email access**: Email account
    compromised ise account recovery support ticket\'a düşer.
-   **No SSO V0**: Tüm clinician self-registered. ONE ID V1.
-   **No federated identity V0**: Sinalytix internal IDP.
-   **Audit log immutable**: Database trigger düzeyinde enforcement;
    superuser-only bypass (production\'da superuser yok --- operasyonel
    role\'ler kısıtlı).
-   **PolicyEngine decision logging**: Performance trade-off ---
    high-throughput actions (Patient 360 view) decision\'ları aggregated
    logged, low-throughput high-stakes (sign, order) decision\'ları
    immediately logged.
-   **Backup codes regenerable**: Settings → Security → \"Regenerate
    backup codes\" eski 8 code invalidate + 8 yeni; clinician confirm
    modal.
-   **TOTP secret QR code**: Yalnızca initial setup\'ta gösterilir; bir
    daha gösterilmez (kaybedilirse 2FA reset gerekir).
-   **PIN length**: 6 hane (numerik), Argon2id hashed; brute-force
    protection (5 fail → 30 min lockout).
-   **Biometric enrollment**: Cihaz-level (Face ID / Touch ID / Android
    biometric). Sinalytix biometric template saklamaz; sadece cihazın
    success/fail callback\'i.
-   **Device fingerprint privacy**: Hashed anonymized; reverse-lookup
    mümkün değil; PIPEDA-safe.
-   **Cross-app session isolation**: Patient/Caregiver/Family/HCP
    session table\'ları ayrı; cross-app shared kullanıcı (örn. PMR
    uzmanı doktor aile bakıcılığı yapıyorsa) iki ayrı login.

3.3 Non-goals (Kapsam Dışı)
---------------------------

-   **Federated identity provider integration MVP\'de** (V1 ONE ID)
-   **Biometric template storage** (cihaz-level only)
-   **Audit log Splunk/Datadog SIEM integration** (V2)
-   **Real-time threat hunting** (V3)
-   **Custom CAPTCHA implementation** (Cloudflare Turnstile V1 hooks
    ile)
-   **Password complexity rotation enforcement** (NIST\'e karşı best
    practice)
-   **Federated audit log across organizations** (V2)
-   **Decentralized identity (DID, Verifiable Credentials)** (V3 PCTF)
-   **Hardware security module (HSM) per clinician** (V3+)
-   **Clinical action audit content (note text, Rx detail)** --- Doc
    6/7/8\'in domain content audit\'i; Doc 2 sadece **event metadata**
    (who/when/where/what-action) audit\'ler

4. Akışlar
==========

4.1 Login Flow
--------------

    Step 1: User opens app / web URL
       ├─ Active session detected? → Skip to home (Patient 360 / Worklist)
       └─ No session → Login screen

    Step 2: Email entry
       ├─ Email exists in User table?
       │   ├─ Yes → Continue
       │   └─ No → "Email not found. Sign up or check spelling."
       └─ Email valid format?
           ├─ Yes → Continue
           └─ No → Inline error

    Step 3: Password entry
       ├─ Password match?
       │   ├─ Yes → Continue to 2FA
       │   └─ No → "Incorrect password. X attempts remaining."
       └─ Failed attempts == 5? → Account lockout 30 min

    Step 4: 2FA prompt
       ├─ User method: TOTP → Show 6-digit code entry, validate against TOTP secret
       ├─ User method: SMS → Send OTP, show 6-digit entry, validate
       ├─ Option: "Use backup code" → 8-digit code entry, validate against unused backup codes
       ├─ Option: "Lost access?" → Account recovery flow
       └─ Success? → Continue
           Failure? → "Incorrect code. X attempts remaining."

    Step 5: Device check
       ├─ Jailbreak/root detected?
       │   ├─ Yes → Warning banner persistent; clinical actions blocked (read-only)
       │   └─ No → Continue
       └─ New device (unseen fingerprint)?
           ├─ Yes → Email notification + first-action re-auth required
           └─ No → Continue normally

    Step 6: Multi-org context picker (if PractitionerRole count > 1)
       └─ See Doc 1 §4.6

    Step 7: Session created
       ├─ JWT access token issued (15 min TTL)
       ├─ Refresh token issued (opaque, DB-backed)
       ├─ Session record created (start, max_at, idle_at, device_fp, ip_hash)
       ├─ Audit log: login_success { user_id, session_id, device_fp_hash, ip_hash }
       └─ Redirect to home

4.2 Session Lifecycle
---------------------

  Event                                Mobile                                                                                       Web
  ------------------------------------ -------------------------------------------------------------------------------------------- -------------------------------------------------------------
  **Session start**                    session.max\_at = now + 24h; session.idle\_at = now + 60min                                  session.max\_at = now + 12h; session.idle\_at = now + 30min
  **User interaction**                 session.idle\_at = now + 60min (refresh)                                                     session.idle\_at = now + 30min
  **Idle threshold reached**           Soft lock → re-auth required (password or biometric/PIN)                                     Soft lock → re-auth required (password)
  **Max threshold reached**            Hard logout → login screen                                                                   Hard logout → login screen
  **Token refresh**                    Refresh token used; new access token (15 min) + new refresh token (session lifetime - now)   Same
  **Manual logout (this device)**      Session revoked + tokens invalidated                                                         Same
  **Manual logout (all devices)**      All sessions revoked + tokens invalidated; clinician notified                                Same
  **Concurrent session limit (\>5)**   Oldest session evicted (forced logout on that device)                                        Same

**Token Refresh Mechanism:**

    Access token expires (15 min) →
      Frontend automatically sends refresh token to /auth/refresh →
        Backend:
          ├─ Refresh token valid + not revoked?
          │   ├─ Yes → Issue new access token + new refresh token; revoke old refresh
          │   └─ No (already used = replay attack)? → Revoke entire session chain; email alert
          └─ Refresh token belongs to active session?
              ├─ Yes (idle_at not exceeded, max_at not exceeded) → Success
              └─ No → Error: re-authentication required
      Frontend continues original request with new access token

4.3 Tiered Re-Authentication (3-Tier)
-------------------------------------

**Tier Definitions:**

  Tier                              Aksiyon Örnekleri                                                                                                                                                                     Re-auth Mekanizması                                                                                        UX Süre
  --------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------------------------------------------------------------------------------- ---------
  **No re-auth** (T1+T2 combined)   View Patient 360, browse documents, draft note (unsaved), edit care plan (unsaved), receive messages                                                                                  Session valid → action proceeds                                                                            0s
  **Biometric / PIN** (T3)          Sign clinical note, finalize care plan, place lab/imaging order, send regular Rx (V0), accept consultation, complete visit (EVV V2)                                                   Modal: Face ID / Touch ID / Android biometric (primary) → fallback PIN if biometric fail or not enrolled   \~3s
  **Full 2FA re-prompt** (T4)       Controlled substance Rx (V1+), MRP transfer, hasta-grant erişim sharing/revoking, account deletion, role change submission, break-glass override, malpractice insurance change (V1)   Full 2FA flow: enter TOTP or SMS code (depending on user method) + password optionally                     \~15s

**T3 Re-auth Modal Flow:**

    User triggers T3 action (e.g., "Sign Note") →
      Modal opens: "Confirm your identity to sign this note"
        ├─ Device biometric enrolled?
        │   ├─ Yes → Biometric prompt (Face ID / Touch ID / Android biometric)
        │   │   ├─ Success → Action proceeds; audit log re_auth_t3_biometric_success
        │   │   ├─ Cancel → Modal stays; "Use PIN instead" option
        │   │   └─ Fail (3 attempts) → "Use PIN" forced
        │   └─ No → PIN prompt
        │       ├─ Success → Action proceeds; audit log re_auth_t3_pin_success
        │       ├─ Fail (5 attempts) → PIN locked 30 min; password re-auth required
        │       └─ Cancel → Action canceled
        └─ Audit log every attempt + outcome

**T4 Re-auth Modal Flow:**

    User triggers T4 action (e.g., "Transfer MRP") →
      Modal opens: "High-stakes action: Confirm with two-factor authentication"
        ├─ User method = TOTP → Show 6-digit code entry from authenticator app
        │   ├─ Success → Action proceeds; audit log re_auth_t4_totp_success
        │   └─ Fail (3 attempts) → Modal closes; backup code option presented
        ├─ User method = SMS → Send OTP, show code entry
        │   ├─ Success → Action proceeds; audit log re_auth_t4_sms_success
        │   └─ Fail (3 attempts) → backup code option
        ├─ Backup code option → 8-digit backup code entry
        │   ├─ Success → Action proceeds; backup code marked used; audit log re_auth_t4_backup_code_used
        │   └─ Fail → Lost 2FA recovery flow option
        └─ All fail → Action canceled; suspicious activity audit event

**PIN Setup (one-time, prompted before first T3 action):**

    First T3 action attempt →
      PIN not yet set? →
        Modal: "Create a 6-digit PIN for fast clinical actions"
          ├─ User enters 6-digit PIN twice (confirm)
          ├─ Argon2id hashed + stored
          ├─ Backend audit log: pin_set
          └─ Continue to T3 action

    PIN reset → Settings → Security → "Reset PIN" → Password re-auth + new PIN

4.4 Account Recovery Flows
--------------------------

### 4.4.1 Forgot Password

    Step 1: User clicks "Forgot password?" on login screen
    Step 2: Email entry
    Step 3: System:
       ├─ Email exists? → Send reset link (no acknowledgement of existence to prevent enumeration: "If account exists, email sent")
       └─ Email not exists? → Same response (security)
    Step 4: User clicks email link (24h TTL)
    Step 5: New password entry (same strength rules) + confirm
    Step 6: Password reset; all active sessions revoked (security best practice)
    Step 7: User must log in fresh + complete 2FA
    Step 8: Audit log: password_reset_via_email

### 4.4.2 Lost 2FA Authenticator (or Phone)

    Step 1: At 2FA prompt, user clicks "Use backup code"
    Step 2: 8-digit backup code entry
    Step 3: System validates against unused backup codes (Argon2id verify)
       ├─ Valid → Code marked used; user logs in; banner: "Reconfigure 2FA in Settings as soon as possible"
       └─ Invalid → "Incorrect backup code. X attempts remaining."
    Step 4: User in Settings → Security → "Regenerate 2FA setup" → choose new method + setup
    Step 5: New 8 backup codes generated; old codes invalidated; clinician must save new codes
    Step 6: Audit log: backup_code_used + two_fa_reconfigured

### 4.4.3 All Backup Codes Used / Lost Everything

    Step 1: User clicks "Lost access?" at recovery option
    Step 2: Recovery form: email + reason + describe (free text)
    Step 3: Sinalytix support team receives ticket
    Step 4: Manual verification:
       ├─ V0: Email back-and-forth + clinician re-uploads photo ID + license cert (cross-referenced to onboarding documents)
       └─ V1: Video call verification (face match against onboarding govt ID)
    Step 5: Admin manually:
       ├─ Resets password (forces clinician to set new on first login)
       ├─ Resets 2FA (clinician sets up new TOTP/SMS)
       ├─ Issues new backup codes
       └─ Revokes all sessions
    Step 6: Email clinician with one-time recovery link
    Step 7: Audit log: account_recovery_via_support { admin_user_id, verification_method, ticket_id }

### 4.4.4 Account Locked (5 Failed Logins)

    Step 1: 5th failed password attempt
    Step 2: Account.locked_until = now + 30min
    Step 3: User sees: "Account temporarily locked due to failed attempts. Try again at HH:MM, or reset password."
    Step 4: Options:
       ├─ Wait 30 min → unlock automatically
       └─ "Reset password" → forgot password flow (immediate unlock on password reset)
    Step 5: Email sent to clinician: "Multiple failed login attempts. If this wasn't you, change your password."
    Step 6: Audit log: account_locked + login_attempt_failed (per attempt)

4.5 Device Trust Check
----------------------

    On every login + on app launch (cached check) →
      Device trust evaluation:
        ├─ iOS: Check for jailbreak indicators
        │   ├─ Suspicious file paths (/Applications/Cydia.app, /etc/apt, etc.)
        │   ├─ dyld bypass (sandbox escape)
        │   ├─ Can write outside sandbox?
        │   └─ Detection result: trusted | suspicious | jailbroken
        ├─ Android: Play Integrity API (V1) / Basic check V0
        │   ├─ Bootloader unlocked?
        │   ├─ Root binaries present (su, Magisk paths)?
        │   ├─ Debugger attached?
        │   └─ Detection result: trusted | suspicious | rooted
        └─ Web: User agent analysis + device fingerprint registration
            └─ No "untrusted" classification possible web-side; rely on session security

    Result:
       ├─ Trusted → Normal flow
       ├─ Suspicious → Warn banner + audit log; clinical actions allowed (V0); blocked V1
       └─ Jailbroken/Rooted → Hard warning banner persistent + clinical actions blocked (read-only OK)

    User can dismiss warning but banner stays persistent until app launched from trusted device.

4.6 Brute Force & Anomaly Detection
-----------------------------------

**Account-Based Rate Limiting:**

-   5 failed password attempts within 30 min → Account lockout 30 min
-   Lockout auto-unlock at threshold; or password reset immediate unlock
-   Email sent to clinician at lockout
-   Audit log: `account_locked { user_id, locked_until, trigger_count }`

**IP-Based Rate Limiting:**

-   20 failed login attempts per IP per hour → IP block 1 hour
-   50 failed attempts per IP per hour → IP block 24 hour + Sinalytix
    security team alert
-   IP block recorded in `ip_blocks` table
-   Cloudflare Turnstile CAPTCHA challenge (V1) on suspicious IPs

**2FA Rate Limiting:**

-   5 failed 2FA codes within 30 min on same session → Session
    terminated + account lockout 30 min
-   10 failed 2FA across all sessions in 1 hour → Account lockout 2
    hour + email alert

**Anomaly Detection (MVP --- Simple Rules):**

-   New country login (IP geolocation differs from last login) → Email
    alert + force re-auth on first sensitive action
-   New device fingerprint → Email alert (existing behavior) + audit
    event
-   2FA method change → Email alert + full 2FA re-confirm
-   Rapid permission requests (e.g., 5 grant accepts in 1 minute) →
    Audit flag; no automatic block (legit clinician onboarding might do
    this)
-   Login from Tor/known VPN → Audit flag (not blocked; legit clinician
    privacy use case)

**V1 ML-Based Anomaly Detection:**

-   Login time-of-day patterns
-   Geolocation movement velocity (impossible travel)
-   Behavioral pattern (typing speed, navigation pattern V2)

4.7 Audit Log Capture Pipeline
------------------------------

    Application-Level Event Trigger →
      Backend service emits audit event:
        {
          event_type: "note_signed",
          user_id, acting_practitioner_role_id, acting_org_id,
          resource_type: "ClinicalNote",
          resource_id: "uuid-xxx",
          session_id, device_fp_hash, ip_hash,
          event_data: { note_id, patient_id, signed_at },
          acted_at: now()
        }
        ↓
      AuditWriter service:
        1. Insert into PG audit_log_entries (append-only via trigger)
        2. Acknowledge to caller (synchronous for critical events; async for high-volume)
        ↓
      Nightly batch (3am Toronto TZ):
        1. Read previous day's audit_log_entries
        2. Sign batch with HMAC (chain to previous batch HMAC)
        3. Upload to S3 Glacier Canada Central WORM bucket
        4. Verify upload integrity
        5. Mark batch as archived
        ↓
      Monthly: integrity verification job re-reads archives + verifies HMAC chain

**Append-Only Enforcement (PostgreSQL):**

    CREATE TABLE audit_log_entries (
      audit_log_id UUID PRIMARY KEY,
      event_type TEXT NOT NULL,
      user_id UUID,
      acting_practitioner_role_id UUID,
      acting_org_id UUID,
      acting_admin_user_id UUID,
      resource_type TEXT,
      resource_id UUID,
      session_id UUID,
      device_fp_hash TEXT,
      ip_hash TEXT,
      user_agent_hash TEXT,
      event_data JSONB,
      acted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      batch_hmac TEXT,  -- Populated by nightly batch
      archived_at TIMESTAMPTZ
    );

    -- Append-only trigger
    CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Audit log entries are immutable';
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER no_update_audit_log
    BEFORE UPDATE OR DELETE ON audit_log_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

> *Exception:* `batch_hmac` *ve* `archived_at` *field\'ları nightly
> batch job tarafından set edilir. Bunlar trigger-bypass için ayrı bir
> service role (job\_runner) UPDATE yetkisi ile sınırlı operasyon.
> Production\'da bu role\'ün INSERT/SELECT erişimi yok, sadece nightly
> batch için scoped UPDATE. Audit log:
> meta\_audit\_log\_batch\_archived.*

4.8 Mermaid Akış Diyagramları
-----------------------------

### Login + 2FA Flow

    flowchart TD
      A[App Launch / Web Visit] --> B{Active Session?}
      B -->|Yes| Z[Home Screen]
      B -->|No| C[Login Screen]
      C --> D[Email + Password]
      D --> D1{Password Match?}
      D1 -->|No| D2{5 Fails?}
      D2 -->|No| D
      D2 -->|Yes| D3[Account Locked 30min + Email]
      D1 -->|Yes| E[2FA Prompt]
      E --> E1{Method}
      E1 -->|TOTP| F[Enter Code from Authenticator]
      E1 -->|SMS| G[Send OTP, Enter Code]
      E1 -->|Backup| H[Enter Backup Code]
      E1 -->|Lost| R[Recovery Flow]
      F --> F1{Valid?}
      G --> F1
      H --> F1
      F1 -->|No| F2{3 Fails?}
      F2 -->|No| E
      F2 -->|Yes| F3[Account Locked + Email]
      F1 -->|Yes| I[Device Trust Check]
      I --> I1{Trusted?}
      I1 -->|Yes| J[Multi-org Context Picker if N>1]
      I1 -->|Jailbroken/Rooted| I2[Warning Banner + Clinical Blocked]
      I2 --> J
      I1 -->|New Device| I3[Email Alert + First-Action Re-auth Pending]
      I3 --> J
      J --> K[Session Created + Tokens Issued]
      K --> L[Home Screen Worklist / Patient 360]

### Tiered Re-Auth Flow

    flowchart TD
      A[User Triggers Clinical Action] --> B{Tier?}
      B -->|T1+T2 view/draft| C[Session Valid? Action Proceeds]
      B -->|T3 sign/order/Rx| D[Biometric Prompt]
      D --> D1{Biometric Available?}
      D1 -->|Yes| D2[Face ID/Touch ID/Android Bio]
      D1 -->|No| E[PIN Prompt]
      D2 --> D3{Success?}
      D3 -->|Yes| F[Action Proceeds + Audit Log T3 Success]
      D3 -->|Fail 3x| E
      E --> E1[PIN Entry]
      E1 --> E2{Correct?}
      E2 -->|Yes| F
      E2 -->|Fail 5x| E3[PIN Locked 30min + Password Re-auth Required]
      B -->|T4 controlled/elevated| G[Full 2FA Re-prompt]
      G --> G1{Method}
      G1 -->|TOTP| G2[Authenticator Code]
      G1 -->|SMS| G3[SMS OTP]
      G2 --> G4{Success?}
      G3 --> G4
      G4 -->|Yes| H[Action Proceeds + Audit Log T4 Success]
      G4 -->|Fail 3x| G5[Backup Code Option]
      G5 --> G6{Success?}
      G6 -->|Yes| H
      G6 -->|All Fail| G7[Action Canceled + Suspicious Activity Audit]

4.9 Kritik Akış Kuralları
-------------------------

-   **Token TTL strict enforcement**: Access token 15 min, refresh
    rotation on every use. Replay = entire session chain revoke.
-   **Re-auth before action, not after**: T3/T4 challenge action
    başlamadan tetiklenir; başarısızlık actionı block eder.
-   **Audit log write critical path**: T3/T4 re-auth attempts (success +
    fail) synchronously written; non-critical events (view, browse)
    async batch.
-   **Idle timeout user-visible warning** at T-2 min: \"Session locking
    in 2 minutes due to inactivity. Move mouse or tap to keep active.\"
-   **Hard logout email confirmation**: 24h mobile / 12h web hard logout
    sonrası email \"Your session ended\" (audit transparency).
-   **Mobile background app**: App moved to background → 10 sn sonra
    screen blur overlay (PHI privacy); 5 dk sonra app-level lock
    (re-auth on resume).
-   **Web tab visibility**: Tab hidden → idle timer pause? **HAYIR** ---
    idle timer devam (visibility-aware idle yetersiz, PHI hostage
    olabilir).
-   **Concurrent sessions cap (5)**: 6. login → en eski session evict;
    clinician notified (\"Logged out from your iPhone --- 5 device
    limit\").
-   **Cross-device sign-out**: Settings → \"Sign out of all devices\" →
    tüm sessions revoked + tokens invalidated immediately.
-   **Audit log query authorization**: Klinisyen kendi audit\'ini
    görebilir (Settings → Activity Log V1); admin tüm org audit\'ini (V1
    admin tool); regulator query (subpoena) Sinalytix legal review +
    manual export (no direct access).

5. Ekran/Yüzey Spesifikasyonları
================================

HCP\_LOGIN --- Login Screen
---------------------------

  HCP\_LOGIN --- Login Screen
  ---------------------------------------------------------------------------------------------------------------------------------------------
  **UI Pattern:** Centered card (web) / Full-screen form (mobile)
  **Input 1 --- email:** RFC 5322 + display \"@\" hint
  **Input 2 --- password:** Show/hide toggle, \"Forgot password?\" link below
  **Validasyon:** Email format + password not empty; CTA disabled if empty
  **Primary CTA:** Sign In
  **Secondary:** \"Forgot password?\" / \"Don\'t have an account? Sign up\"
  **Loading state:** Spinner on Sign In click; \~500ms expected backend
  **Error: invalid credentials:** \"Incorrect email or password. X attempts remaining.\" (don\'t disclose which)
  **Error: account locked:** \"Account locked due to multiple failed attempts. Try again at HH:MM or reset password.\"
  **Platform farkı:** Mobile = biometric quick-login option below form (if previously enabled) --- Face ID/Touch ID to load saved credentials
  **Analytics:** `login_attempt { email_domain_hashed, attempt_count }`

HCP\_LOGIN\_2FA --- 2FA Prompt
------------------------------

  HCP\_LOGIN\_2FA --- 2FA Code Entry
  -----------------------------------------------------------------------------
  **Title:** \"Two-factor authentication\"
  **Subtitle (TOTP):** \"Enter the 6-digit code from your authenticator app\"
  **Subtitle (SMS):** \"Enter the 6-digit code sent to +1\*\*\*\*\*1234\"
  **Input:** 6-digit code entry (numeric keyboard on mobile, masked)
  **Auto-fill:** iOS/Android SMS OTP auto-fill (SMS method)
  **CTA:** Verify
  **Secondary CTA:** \"Use backup code\" / \"Lost access?\"
  **Error: invalid code:** \"Incorrect code. X attempts remaining.\"
  **Error: 3 fails:** \"Too many failed attempts. Account locked.\"
  **SMS resend:** \"Did not receive code?\" → resend (rate limit 3/10min)
  **Analytics:** `two_fa_attempt { method, attempt_count, success: bool }`

HCP\_LOGIN\_BACKUP\_CODE --- Backup Code Entry
----------------------------------------------

  HCP\_LOGIN\_BACKUP\_CODE --- Backup Code
  -----------------------------------------------------------------------------------------------------
  **Title:** \"Use a backup code\"
  **Subtitle:** \"Enter one of your 8 backup codes. Each code can only be used once.\"
  **Input:** 8-character backup code entry (uppercase, dashes formatted: XXXX-XXXX)
  **CTA:** Verify
  **Secondary:** Back to 2FA / Lost everything?
  **On success:** Banner persistent in Home: \"You used a backup code. Reconfigure 2FA in Settings.\"
  **Analytics:** `backup_code_used { used_codes_count_now, remaining_codes_count }`

HCP\_RECOVERY\_FORGOT\_PASSWORD --- Forgot Password
---------------------------------------------------

  HCP\_RECOVERY\_FORGOT\_PASSWORD --- Reset Password
  --------------------------------------------------------------------------------------------------------------------------
  **Input:** email
  **Description:** \"Enter your email to receive a password reset link. The link expires in 24 hours.\"
  **CTA:** Send Reset Link
  **Response (always same for security):** \"If an account exists with this email, you\'ll receive a reset link shortly.\"
  **Analytics:** `password_reset_requested { email_domain_hashed }`

HCP\_RECOVERY\_NEW\_PASSWORD --- New Password Entry (from email link)
---------------------------------------------------------------------

  HCP\_RECOVERY\_NEW\_PASSWORD --- New Password
  ---------------------------------------------------------------------------------------
  **Input 1:** New password (strength meter + requirements)
  **Input 2:** Confirm password
  **Validasyon:** Min 12 char, upper+lower+digit+special, match, not in pwned list (V1)
  **CTA:** Set New Password
  **On success:** \"Password reset. All sessions ended. Please log in.\"
  **Analytics:** `password_reset_completed { time_from_link_sent_ms }`

HCP\_RECOVERY\_LOST\_EVERYTHING --- Account Recovery Support Form
-----------------------------------------------------------------

  HCP\_RECOVERY\_LOST\_EVERYTHING --- Support Recovery
  -------------------------------------------------------------------------------------------------
  **Title:** \"Need help accessing your account?\"
  **Input 1:** email
  **Input 2:** Description (free text 500 chars)
  **Input 3 (optional):** Photo ID re-upload, License re-upload
  **CTA:** Submit Recovery Request
  **Response:** \"Recovery request submitted. Our team will contact you within 2 business days.\"
  **Backend etkisi:** RecoveryTicket created; support team queue
  **Analytics:** `recovery_ticket_submitted { has_documents_uploaded: bool }`

HCP\_REAUTH\_T3\_BIOMETRIC --- T3 Biometric/PIN Modal
-----------------------------------------------------

  HCP\_REAUTH\_T3\_BIOMETRIC --- T3 Re-Auth
  --------------------------------------------------------------------------------------------------
  **Trigger:** T3 action (e.g., \"Sign Note\")
  **Modal type:** Full-screen modal mobile / Centered modal web
  **Title:** \"Confirm to sign this note\"
  **Subtitle:** Action context (e.g., \"Sign note for \[Patient Display Name\]\")
  **Primary method (mobile):** Face ID / Touch ID / Android biometric --- auto-prompt
  **Primary method (web):** PIN entry directly
  **Fallback CTA:** \"Use PIN instead\"
  **PIN entry:** 6-digit numeric pad (masked or partial-show toggle)
  **Error: biometric fail:** \"Try again or use PIN\"
  **Error: PIN fail 5x:** \"PIN locked. Use password to unlock.\" → Password modal
  **Cancel CTA:** Cancel (action aborted)
  **Audit log on every attempt**
  **Analytics:** `t3_reauth_prompt { method_used: biometric | pin, success: bool, attempt_count }`

HCP\_REAUTH\_T4\_2FA --- T4 Full 2FA Modal
------------------------------------------

  HCP\_REAUTH\_T4\_2FA --- T4 Re-Auth
  ---------------------------------------------------------------------------------------------
  **Trigger:** T4 action (e.g., \"Transfer MRP\")
  **Modal type:** Full-screen modal
  **Title:** \"High-stakes action: Verify with 2FA\"
  **Subtitle:** \"This action requires two-factor authentication.\" Action description below.
  **Input:** TOTP/SMS code entry (6-digit)
  **Secondary option:** \"Use backup code\"
  **CTA:** Confirm
  **Cancel:** Cancel (action aborted, audit logged)
  **Audit log on every attempt**
  **Analytics:** `t4_reauth_prompt { method, success: bool, used_backup_code: bool }`

HCP\_PIN\_SETUP --- PIN Setup (One-Time)
----------------------------------------

  HCP\_PIN\_SETUP --- Create Clinical Action PIN
  ---------------------------------------------------------------------------------------------------------------------------------------------
  **Trigger:** First T3 action attempt (no PIN set yet)
  **Title:** \"Create your 6-digit PIN\"
  **Subtitle:** \"You\'ll use this PIN to quickly confirm sensitive clinical actions like signing notes. It\'s separate from your password.\"
  **Input 1:** Enter PIN (6 digits)
  **Input 2:** Confirm PIN
  **Validasyon:** Match + not sequential (123456 blocked) + not all same digit
  **CTA:** Create PIN
  **On success:** PIN created; return to T3 action prompt
  **Analytics:** `pin_setup_completed`

HCP\_SESSION\_IDLE\_WARNING --- Idle Timeout Warning
----------------------------------------------------

  HCP\_SESSION\_IDLE\_WARNING --- Idle Warning
  -----------------------------------------------------------------------------------
  **Trigger:** T - 2 min before idle timeout
  **UI:** Non-modal banner top-of-screen (web) / Snackbar (mobile)
  **Text:** \"Session locking in 2 minutes due to inactivity. Tap to keep active.\"
  **CTA:** Stay Signed In (resets idle timer)
  **On no action:** At T-0, soft lock
  **Analytics:** `idle_warning_shown`

HCP\_SESSION\_SOFT\_LOCK --- Soft Lock Re-auth Screen
-----------------------------------------------------

  HCP\_SESSION\_SOFT\_LOCK --- Soft Lock
  ---------------------------------------------------------------------
  **Trigger:** Idle timeout reached
  **UI:** Full-screen overlay (cannot dismiss without re-auth)
  **Title:** \"Welcome back, \[Display Name\]\"
  **Subtitle:** \"Please confirm your identity to continue.\"
  **Primary method (mobile):** Biometric prompt
  **Fallback:** \"Use password instead\" → password entry
  **Web only:** Password entry
  **CTA:** Unlock
  **Alternative:** \"Sign out\" link (exits to login screen)
  **Analytics:** `soft_lock_unlock_attempt { method, success: bool }`

HCP\_ACCOUNT\_LOCKED --- Account Lockout Screen
-----------------------------------------------

  HCP\_ACCOUNT\_LOCKED --- Account Locked
  ----------------------------------------------------------------------------------------------------------
  **Trigger:** 5 failed login attempts
  **UI:** Login screen replaced with lockout message
  **Title:** \"Account temporarily locked\"
  **Subtitle:** \"Due to multiple failed attempts, your account is locked until HH:MM (countdown timer).\"
  **Options:** \"Reset password\" (immediate unlock if successful) / \"Need help?\" (contact support)
  **Auto-unlock:** Page polls every 30s; auto-redirect to login at unlock
  **Analytics:** `account_locked_view { remaining_lock_time_ms }`

HCP\_DEVICE\_UNTRUSTED\_BANNER --- Jailbreak/Root Warning
---------------------------------------------------------

  HCP\_DEVICE\_UNTRUSTED\_BANNER --- Untrusted Device
  ---------------------------------------------------------------------------------------------------------------------------
  **Trigger:** Detection on login or app launch
  **UI:** Persistent red banner top of every screen
  **Text:** \"This device is jailbroken/rooted. Clinical actions are unavailable. Use a trusted device for clinical work.\"
  **Dismissible:** Yes (×) --- but reappears on next app launch
  **Action:** Tap for more info → modal explaining risk + recommendation
  **Clinical actions:** All T3+ actions blocked with tooltip \"Available on trusted device\"
  **Analytics:** `untrusted_device_banner_shown { detection_type, dismissed: bool }`

HCP\_NEW\_DEVICE\_EMAIL --- New Device Email Notification
---------------------------------------------------------

(Email content; not in-app UI)

  Field         Value
  ------------- -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Subject**   \"New device signed into your Sinalytix account\"
  **Body**      \"Hi \[Display Name\], a new device signed into your Sinalytix Healthcare Professional account on \[Date Time\]. Device: \[Device Model + OS\]. IP: \[General Location based on IP\]. If this was you, no action needed. If not, sign out all devices in Settings and change your password immediately.\"
  **CTA**       \"Manage devices\" → Settings → Security → Active Sessions

HCP\_SETTINGS\_SECURITY --- Settings Security Panel
---------------------------------------------------

  HCP\_SETTINGS\_SECURITY --- Security Settings
  -------------------------------------------------------------------------------------------------------------------------
  **Sections:**
  **1. Password** --- Last changed \[date\]; \"Change password\" CTA
  **2. 2FA** --- Current method (TOTP/SMS); \"Change method\"; \"Regenerate backup codes\"
  **3. PIN** --- Set/Reset PIN
  **4. Active Sessions** --- List: device + last activity + location; \"Sign out this device\" / \"Sign out all devices\"
  **5. Activity Log (V1)** --- Recent auth events: login success/fail, re-auth, device changes
  **6. Trusted Devices (V1)** --- Mark devices as trusted (less 2FA frequency)

6. Veri Modeli
==============

6.1 Yerel Depolama (Pre-auth + Session Cache)
---------------------------------------------

    interface LocalAuthState {
      // Pre-auth state (login form)
      email_draft?: string;  // Last-used email for autofill
      remember_email: boolean;
      
      // Session tokens (post-auth)
      access_token?: string;  // JWT, 15 min TTL
      refresh_token?: string;  // Opaque, session lifetime
      user_id?: string;
      session_id?: string;
      
      // Idle tracking
      last_activity_at: string;  // ISO8601
      idle_timeout_at: string;  // ISO8601 (idle_at)
      max_session_at: string;  // ISO8601 (max_at)
      
      // Device fingerprint
      device_fingerprint: {
        model: string,
        os_version: string,
        app_version: string,
        locale: string,
        screen_resolution: string,
        hash: string  // SHA-256 of above
      };
      
      // Biometric state
      biometric_enrolled: boolean;
      biometric_method?: "face_id" | "touch_id" | "android_biometric";
      
      // PIN state
      pin_set: boolean;
      pin_locked_until?: string;  // If PIN brute-force locked
    }

**Storage:**

-   iOS: Keychain `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` (no
    iCloud sync for security)
-   Android: Keystore with `KeyProperties.PURPOSE_ENCRYPT` +
    biometric-bound (V1)
-   Web: HTTP-only secure cookies for tokens; sessionStorage for
    non-sensitive UI state; encrypted IndexedDB for biometric/PIN cache
    (Web Crypto AES-GCM)

6.2 Backend Veri Modeli
-----------------------

### User (Extended from Doc 1 --- auth additions)

Doc 1\'de tanımlanan User table\'ına aşağıdaki field\'lar eklenir:

  Alan                           Tip         Notlar
  ------------------------------ ----------- ---------------------------------------------
  pin\_hash                      string      Argon2id, nullable (set on first T3 action)
  pin\_locked\_until             timestamp   Brute-force lockout
  pin\_failed\_count             int         Reset on success or password re-auth
  password\_changed\_at          timestamp   For security policy
  forced\_password\_change\_at   timestamp   Set if admin requires reset
  account\_locked\_until         timestamp   Brute-force account lockout
  failed\_login\_count           int         Resets on successful login or lockout
  trusted\_device\_ids           uuid\[\]    V1+

### Session

  Alan                Tip         Notlar
  ------------------- ----------- ------------------------------------------------------------------------------------------------------------
  session\_id         uuid        Primary key
  user\_id            uuid        FK → User
  app\_context        enum        \[RECONCILED: A14\] `patient` \| `family` \| `caregiver` \| `hcp` --- per-app session (zorunlu kolon; Dictionary §1)
  created\_at         timestamp   ---
  max\_at             timestamp   Hard logout time (24h mobile / 12h web)
  idle\_at            timestamp   Soft lock time (rolling, updated on activity)
  platform            enum        mobile\_ios \| mobile\_android \| web
  device\_fp\_hash    string      SHA-256
  ip\_hash            string      SHA-256
  user\_agent\_hash   string      SHA-256
  country\_code       string      From IP geo (for anomaly)
  revoked\_at         timestamp   Null if active; set on manual logout or admin revoke
  revoke\_reason      enum        manual\_logout \| all\_devices\_logout \| admin\_revoked \| concurrent\_limit\_exceeded \| security\_event

### RefreshToken

  Alan                     Tip         Notlar
  ------------------------ ----------- --------------------------------------------------------------------
  refresh\_token\_id       uuid        Primary key
  session\_id              uuid        FK → Session
  token\_hash              string      SHA-256 of token string (raw token sent to client)
  created\_at              timestamp   ---
  used\_at                 timestamp   Null if unused; set on each refresh use (then immediately rotated)
  rotated\_to\_token\_id   uuid        If rotated, FK to next token
  revoked\_at              timestamp   Null if active

### TOTPSecret

  Alan                Tip         Notlar
  ------------------- ----------- ------------------------------------
  user\_id            uuid        PK = FK → User
  secret\_encrypted   bytea       AES-256 encrypted; KMS-managed key
  algorithm           enum        TOTP\_SHA1 (RFC 6238)
  digits              int         6 (standard)
  period\_seconds     int         30 (standard)
  issuer              string      \"Sinalytix\"
  created\_at         timestamp   ---

### BackupCode

  Alan                      Tip         Notlar
  ------------------------- ----------- -----------------------------------
  backup\_code\_id          uuid        Primary key
  user\_id                  uuid        FK → User
  code\_hash                string      Argon2id
  created\_at               timestamp   Set of 8 created together
  used\_at                  timestamp   Null if unused; set when consumed
  superseded\_by\_set\_id   uuid        If regenerated, FK to new set

### RecoveryToken

  Alan                  Tip         Notlar
  --------------------- ----------- -------------------------------------------------------------
  recovery\_token\_id   uuid        Primary key
  user\_id              uuid        FK → User
  token\_hash           string      SHA-256
  token\_type           enum        email\_verification \| password\_reset \| account\_recovery
  created\_at           timestamp   ---
  expires\_at           timestamp   24h TTL
  used\_at              timestamp   Single-use; set on consumption

### RecoveryTicket (Support-Mediated)

  Alan                        Tip         Notlar
  --------------------------- ----------- -----------------------------------------------------------
  ticket\_id                  uuid        Primary key
  email                       string      User-provided
  user\_id                    uuid        Nullable; resolved post-verification
  description                 text        User-provided 500 chars
  photo\_id\_doc              jsonb       Re-uploaded photo ID (encrypted at rest)
  license\_doc                jsonb       Re-uploaded license cert
  status                      enum        pending \| in\_review \| verified \| rejected \| resolved
  assigned\_admin\_user\_id   uuid        Nullable
  resolution\_notes           text        Admin notes
  resolved\_at                timestamp   ---

### LoginAttempt (Rate Limiting + Audit)

  Alan                 Tip         Notlar
  -------------------- ----------- -------------------------------------------------------------------------------------------------
  login\_attempt\_id   uuid        Primary key
  email\_attempted     string      Email submitted (lowercased, hashed for privacy)
  ip\_hash             string      SHA-256
  user\_agent\_hash    string      SHA-256
  outcome              enum        success \| invalid\_password \| invalid\_2fa \| account\_locked \| ip\_blocked \| 2fa\_required
  attempted\_at        timestamp   ---

**Indexes:**

-   `(email_attempted, attempted_at DESC)` --- Account-based rate limit
-   `(ip_hash, attempted_at DESC)` --- IP-based rate limit

### IPBlock

  Alan                           Tip         Notlar
  ------------------------------ ----------- --------------------------------------------------
  ip\_block\_id                  uuid        Primary key
  ip\_hash                       string      SHA-256
  blocked\_until                 timestamp   Auto-expire
  reason                         enum        brute\_force \| security\_alert \| manual\_admin
  created\_by\_admin\_user\_id   uuid        If manual block
  created\_at                    timestamp   ---

### DeviceFingerprint

  Alan                  Tip         Notlar
  --------------------- ----------- ----------------------------------------------------------------------
  device\_fp\_id        uuid        Primary key
  user\_id              uuid        FK → User
  fingerprint\_hash     string      SHA-256
  first\_seen\_at       timestamp   ---
  last\_seen\_at        timestamp   ---
  trusted               boolean     V1 --- user-marked trusted
  trusted\_marked\_at   timestamp   ---
  device\_label         string      User-provided label (V1) --- \"Office MacBook\", \"Personal iPhone\"
  platform              enum        mobile\_ios \| mobile\_android \| web

### AuditLogEntry (Canonical Schema --- Doc 2 Spine)

  Alan                             Tip         Notlar
  -------------------------------- ----------- ------------------------------------------------------------------------------
  audit\_log\_id                   uuid        Primary key
  event\_type                      string      Event taxonomy --- see §6.3
  event\_category                  enum        auth \| session \| clinical \| consent \| admin \| security \| integration
  event\_severity                  enum        info \| warning \| critical
  user\_id                         uuid        Subject of event (can be self if clinician\'s own action)
  acting\_user\_id                 uuid        Who triggered (clinician self, admin, system)
  acting\_practitioner\_role\_id   uuid        If clinician self
  acting\_org\_id                  uuid        If clinician self
  acting\_admin\_user\_id          uuid        If admin
  resource\_type                   string      \"ClinicalNote\", \"CarePlan\", \"Order\", \"Patient\", \"PractitionerRole\"
  resource\_id                     uuid        ---
  session\_id                      uuid        If event in active session
  device\_fp\_hash                 string      SHA-256
  ip\_hash                         string      SHA-256
  user\_agent\_hash                string      SHA-256
  event\_data                      jsonb       Event-specific payload --- bounded schema per event\_type
  acted\_at                        timestamp   When event occurred (client-reported, validated server-side)
  inserted\_at                     timestamp   Server insertion time
  batch\_hmac                      string      Set by nightly batch --- HMAC chained to previous batch
  archived\_at                     timestamp   Set when replicated to S3 Glacier
  **IMMUTABLE**                    ---         UPDATE/DELETE blocked at trigger level

**Partitioning**: Monthly partition (audit\_log\_entries\_2026\_01,
etc.) for query performance + archival management.

**Indexes:**

-   `(user_id, acted_at DESC)` --- User self-audit
-   `(acting_admin_user_id, acted_at DESC)` --- Admin actions
-   `(event_type, acted_at DESC)` --- Event-type queries
-   `(resource_type, resource_id, acted_at DESC)` --- Resource history
-   `(session_id, acted_at)` --- Session reconstruction

### PolicyDecision (Audit subset)

  Alan                              Tip         Notlar
  --------------------------------- ----------- ------------------------------------------------------
  policy\_decision\_id              uuid        Primary key
  audit\_log\_id                    uuid        FK → AuditLogEntry (high-stakes decisions linked)
  subject\_practitioner\_role\_id   uuid        ---
  action                            string      \"read\", \"write\", \"sign\", etc.
  resource\_type                    string      ---
  resource\_id                      uuid        ---
  context\_snapshot                 jsonb       Truncated context (no PHI)
  decision                          enum        allow \| deny
  reasons                           text\[\]    Why allow/deny
  obligations                       jsonb       Additional constraints (e.g., audit\_required: true)
  evaluated\_at                     timestamp   ---
  policy\_engine\_version           string      \"rbac\_v1\" \| \"cedar\_v1\" (for V1 migration)

6.3 Audit Event Taxonomy (Canonical --- Doc 1-10)
-------------------------------------------------

**Auth Category:**

-   `login_attempt` (with outcome)
-   `login_success`
-   `login_failed_password`
-   `login_failed_2fa`
-   `two_fa_setup_completed`
-   `two_fa_method_changed`
-   `backup_code_used`
-   `backup_codes_regenerated`
-   `password_changed`
-   `password_reset_via_email`
-   `account_recovery_via_support`
-   `account_locked`
-   `account_unlocked`
-   `pin_set`
-   `pin_reset`
-   `pin_locked`

**Session Category:**

-   `session_created`
-   `session_revoked` (with reason)
-   `token_refreshed`
-   `token_replay_detected` (security alert)
-   `idle_timeout_soft_lock`
-   `max_session_hard_logout`
-   `concurrent_limit_eviction`
-   `manual_logout_this_device`
-   `manual_logout_all_devices`

**Re-Auth Category:**

-   `t3_reauth_attempted` (method, success)
-   `t4_reauth_attempted` (method, success)

**Security Category:**

-   `untrusted_device_detected`
-   `new_device_detected`
-   `new_country_login`
-   `suspicious_activity_flagged`
-   `ip_blocked`
-   `ip_unblocked`
-   `screen_capture_attempt_detected` (V1+)

**Clinical Category (Doc 6/7/8/9 emit, Doc 2 schema):**

-   `patient_record_viewed`
-   `note_drafted` (auto-save)
-   `note_signed` (T3)
-   `order_placed` (T3)
-   `rx_prescribed` (T3 regular; T4 controlled V1+)
-   `care_plan_finalized` (T3)
-   `mrp_transferred` (T4)
-   `consent_granted` (subject = patient; acting = clinician\_request)
-   `consent_revoked`

**Consent Category (Doc 1 + Doc 10):**

-   `consent_record_created` (initial)
-   `consent_record_versioned` (re-consent)

**Admin Category:**

-   `verification_approved`
-   `verification_rejected`
-   `account_suspended_soft` / `_hard`
-   `appeal_submitted` / `_resolved`
-   `manual_account_unlock`

**Integration Category (Doc 5):**

-   `external_data_ingested` (source, type)
-   `document_uploaded` (type, source)
-   `document_verified` (Tier 4)
-   `document_rejected`

**System Category:**

-   `audit_log_batch_archived` (nightly job)
-   `audit_log_integrity_verified` (monthly job)
-   `policy_engine_version_updated` (Cedar swap)
-   `regulator_audit_export` (subpoena response)

6.4 PolicyEngine Interface
--------------------------

    // MVP V0 — Stable interface, RBAC implementation behind it

    interface Subject {
      user_id: string;
      practitioner_role_id: string;
      org_id: string;
      discipline: Discipline;
      device_trust: "trusted" | "suspicious" | "untrusted";
    }

    interface Resource {
      type: ResourceType;  // "Patient" | "ClinicalNote" | "CarePlan" | "Order" | "PractitionerRole" | ...
      id: string;
      attributes?: Record<string, any>;  // resource-specific (e.g., patient_id for ClinicalNote)
    }

    type Action = 
      | "read" | "list" | "search"
      | "create" | "update" | "delete"
      | "sign" | "addendum"
      | "send" | "receive"
      | "grant_access" | "revoke_access"
      | "elevate" | "break_glass";

    interface PolicyContext {
      consent?: ConsentSnapshot;  // For patient resources — patient's current grants
      careTeamMembership?: boolean;  // Subject in patient's active care team
      encounterWindow?: boolean;  // Subject has active encounter with patient
      breakGlass?: boolean;  // Emergency override active
      orgContext: string;  // Current acting_org_id (RLS scoped)
      sessionDeviceTrust: "trusted" | "suspicious" | "untrusted";
      reauth?: {
        tier: "t3" | "t4";
        method: "biometric" | "pin" | "totp" | "sms" | "backup_code";
        completed_at: string;
      };
    }

    interface AllowDecision {
      allow: boolean;
      reasons: string[];  // Human-readable explanations for audit
      obligations?: {
        audit_required: boolean;
        audit_severity?: "info" | "warning" | "critical";
        reauth_required?: {
          tier: "t3" | "t4";
        };
        consent_check_required?: boolean;
        break_glass_notification?: boolean;
      };
    }

    interface PolicyEngine {
      evaluate(input: {
        subject: Subject;
        action: Action;
        resource: Resource;
        context: PolicyContext;
      }): Promise<AllowDecision>;
      
      // Batch evaluate (worklist filtering, etc.)
      evaluateBatch(inputs: Array<{
        subject: Subject;
        action: Action;
        resources: Resource[];
        context: PolicyContext;
      }>): Promise<AllowDecision[]>;
      
      // Engine info (for audit + V1 migration)
      getVersion(): string;
      getImplementation(): "rbac_postgres" | "cedar_aws_v1";
    }

**MVP RBAC Implementation Pattern:**

    class RBACPolicyEngine implements PolicyEngine {
      async evaluate({ subject, action, resource, context }) {
        // 1. Untrusted device hard-block for write actions
        if (context.sessionDeviceTrust === "untrusted" && action !== "read") {
          return { allow: false, reasons: ["Untrusted device. Read-only mode."] };
        }
        
        // 2. RBAC permission check (PG join)
        const hasPermission = await this.checkPermission(
          subject.practitioner_role_id, 
          action, 
          resource.type
        );
        if (!hasPermission) {
          return { allow: false, reasons: [`Role ${subject.discipline} lacks ${action} on ${resource.type}`] };
        }
        
        // 3. For Patient resources, check consent + care team
        if (resource.type === "Patient" || resource.attributes?.patient_id) {
          if (!context.careTeamMembership && !context.breakGlass) {
            return { allow: false, reasons: ["Not in patient's care team. Break-glass available."] };
          }
          if (context.consent?.granted_for_role === subject.practitioner_role_id) {
            // ok
          } else if (!context.breakGlass) {
            return { allow: false, reasons: ["Patient has not granted access to this clinician."] };
          }
        }
        
        // 4. Compute obligations
        const obligations: any = { audit_required: true };
        if (action === "sign" || action === "create" && resource.type === "Order") {
          obligations.reauth_required = { tier: "t3" };
        }
        if (action === "delete" || (action === "create" && resource.type === "ControlledSubstanceRx")) {
          obligations.reauth_required = { tier: "t4" };
          obligations.audit_severity = "critical";
        }
        if (context.breakGlass) {
          obligations.audit_severity = "critical";
          obligations.break_glass_notification = true;
        }
        
        return { allow: true, reasons: ["RBAC + consent + care team match"], obligations };
      }

> [KARAR K5 — 2026-07-22 · ÖNERİLEN DEFAULT] Break-glass **V0'da YOKTUR** (Doc 10 zaten V1+ der; bu pseudo-code'daki `context.breakGlass` dalları V0'da ölü koddur). V0 davranışı: `context.breakGlass` **her zaman `false`** derlenir; "Break-glass available." reason metni V0 yanıtlarında **gösterilmez** (var olmayan bir yolu vaat etmemek için "Access requires patient consent or care team membership." kullanılır). V0'da meşru acil erişim yolu uygulama-dışıdır: telefonla hasta/SDM sözlü onayı → sonradan `ConsentGrant` kaydı (audit'li). `BreakGlassOverride` tablosu ve tam akış V1 (Modül 3 §PolicyEngine ile koordineli).
      
      // ... other methods
    }

**V1 Cedar Implementation Pattern:**

    class CedarPolicyEngine implements PolicyEngine {
      async evaluate({ subject, action, resource, context }) {
        const cedarPolicies = await this.loadPolicies();
        const cedarEntities = this.serializeToCedar({ subject, resource, context });
        const result = cedar.isAuthorized({
          principal: cedarEntities.principal,
          action: cedarEntities.action,
          resource: cedarEntities.resource,
          context: cedarEntities.context,
          policies: cedarPolicies,
        });
        
        return {
          allow: result.decision === "Allow",
          reasons: result.diagnostics.reason.map(r => r.toString()),
          obligations: this.extractObligations(result),
        };
      }
    }

**RBAC Permission Matrix (MVP V0 --- Subset Example):**

  Discipline           Action   Resource                 Permission
  -------------------- -------- ------------------------ -------------------------------------------------
  Physician            read     Patient                  allow (consent-gated)
  Physician            sign     ClinicalNote             allow
  Physician            create   Order:Lab                allow
  Physician            create   Order:Imaging            allow
  Physician            create   Rx:Regular               allow
  Physician            create   Rx:ControlledSubstance   V1+ (T4)
  Nurse Practitioner   read     Patient                  allow (consent-gated)
  NP                   sign     ClinicalNote             allow
  NP                   create   Order:Lab                allow
  NP                   create   Rx:Regular               allow (provincial scope)
  Registered Nurse     read     Patient                  allow (consent-gated)
  RN                   sign     ClinicalNote             allow (RN scope)
  RN                   create   Order:Lab                deny (V0; V1 if delegated authority configured)
  RN                   create   Rx:Regular               deny
  Physiotherapist      read     Patient                  allow (consent-gated)
  PT                   sign     ClinicalNote             allow (PT scope subplan)
  PT                   create   Order                    deny (referral-based)
  MSW                  read     Patient                  allow (consent-gated)
  MSW                  sign     ClinicalNote             allow (psychosocial scope)
  MSW                  create   Order                    deny

(Full matrix Doc 6/7/8/9\'da role-by-role detaylanır; Doc 2 yalnızca
pattern.)

6.5 Storage & Residency Recap
-----------------------------

-   **PostgreSQL** (Canada Central RDS): User, Session, RefreshToken,
    TOTPSecret, BackupCode, RecoveryToken, RecoveryTicket, LoginAttempt,
    IPBlock, DeviceFingerprint, AuditLogEntry (partitioned monthly),
    PolicyDecision
-   **AWS KMS** (Canada Central): TOTP secrets encryption, audit log
    batch HMAC keys
-   **AWS S3 Glacier** (Canada Central WORM bucket): Nightly audit log
    batch archival, 7-year retention; transition policy → 365 days hot →
    glacier instant → glacier deep archive
-   **Redis** (Canada Central ElastiCache): Session cache, rate limiting
    counters (ephemeral)
-   **Cloudflare** (Toronto edge): WAF, Turnstile CAPTCHA (V1), edge
    rate limiting

7. Hata Durumları ve Edge Case\'ler
===================================

  Senaryo                                                     Kullanıcıya Gösterilen                                                                                Sistem Davranışı
  ----------------------------------------------------------- ----------------------------------------------------------------------------------------------------- -----------------------------------------------------------------------------------------------
  Email + password ok but 2FA code expired                    \"Code expired. Request a new one.\"                                                                  Token expiry standard; new SMS/TOTP code requested
  Multiple devices simultaneously trying same TOTP code       \"Code already used or invalid.\"                                                                     TOTP secret + window check; replay rejected
  Refresh token replay attack                                 \"Session expired. Please log in.\"                                                                   All sessions in chain revoked; user\_id email alert with security warning
  Network failure during token refresh                        (Silent retry; user unaware)                                                                          Exponential backoff max 3 attempts; if still failing, soft logout
  Email reset link clicked twice                              \"Link already used. Please request a new reset.\"                                                    Single-use enforcement
  Backup code used twice                                      \"Code already used.\"                                                                                Single-use enforcement
  User on plane → 24h+ no internet → re-open app              Login screen (max session likely expired)                                                             Local-cached read-only access disabled; must re-login when online
  Server time skew vs client (TOTP)                           \"Incorrect code.\"                                                                                   TOTP ±1 window tolerance; if outside, real failure
  Biometric not available (device lacks Face/Touch ID)        PIN prompt                                                                                            T3 fallback to PIN
  PIN locked 30 min + clinical action urgent                  \"PIN locked. Use password to unlock immediately.\"                                                   Password re-auth → PIN unlock + PIN reset prompt
  Concurrent session evicted (logged out remotely)            \"You were signed out from this device. Maximum 5 concurrent sessions reached.\"                      Hard logout on this device
  Country mismatch (legit travel)                             Email alert + force re-auth (no block)                                                                User confirms identity → no further action; if not them, \"Sign out all devices\"
  2FA setup QR code lost mid-setup                            \"Restart 2FA setup\"                                                                                 New secret generated; old discarded (atomicity)
  Refresh token expired (session max\_at reached)             (Frontend redirects to login)                                                                         Backend: token expired, 401
  Account locked + correct credentials entered                \"Account locked. Try at HH:MM or reset password.\"                                                   Lockout enforcement
  TOTP secret database corruption (catastrophic)              \"Unable to verify 2FA. Contact support.\"                                                            Disaster recovery; support manual reset
  Audit log write failure (DB outage)                         (User sees normal flow; backend alert)                                                                Backup write queue (in-memory + persisted to disk); replay when DB back; alert security team
  S3 Glacier upload failure                                   (Internal alert; user unaware)                                                                        Retry next batch; manual investigation
  Audit log HMAC chain broken (integrity failure)             (Internal alert; potential tampering)                                                                 Critical security alert to Sinalytix ops; investigation; potential forensic
  User on shared computer forgets logout                      (No automatic action MVP)                                                                             Idle timeout (30 min web) → soft lock; next user must re-auth (or unable to without password)
  Jailbroken device after 6 months of trusted use             Banner appears + clinical actions blocked retroactively                                               Audit event; clinician notified to switch device
  Backup codes exhausted while logged in                      \"You have no backup codes. Generate new ones in Settings → Security.\"                               Banner; no immediate block; on next 2FA challenge if codes needed, recovery flow
  Recovery ticket admin rejects (insufficient verification)   Email to user: \"Recovery rejected. Reason: \[admin note\]. Please resubmit with \[requirement\].\"   Audit log; user can submit new ticket
  User in dark mode + biometric prompt visibility             OS-native prompt (light/dark consistent)                                                              Standard OS UI

8. Kabul Kriterleri
===================

8.1 Fonksiyonel
---------------

-   Email + password + 2FA login akışı 95%+ success rate (legit
    credentials).
-   TOTP setup başarılı olduğunda authenticator app\'te 6-digit code
    generate edilir ve doğrulanır (RFC 6238 ±1 window).
-   SMS OTP setup başarılı olduğunda telefon doğrulanır ve OTP
    gönderilir.
-   8 backup codes oluşturulur ve clinician\'a one-time gösterilir;
    downloadable / copy-clipboard.
-   Backup code kullanımı tek-seferlik; ikinci kullanım reddedilir.
-   Forgot password flow email reset link (24h TTL) gönderir;
    tıklandığında password reset; tüm sessions revoke.
-   Lost 2FA flow backup code accept eder; backup code yoksa support
    ticket flow.
-   Mobile session 24h max + 60 dk idle; idle threshold\'ta soft lock;
    max\'ta hard logout.
-   Web session 12h max + 30 dk idle; idle/max davranışları aynı.
-   T3 action triggered olduğunda biometric prompt (mobile) veya PIN
    prompt (web/biometric not available); fallback PIN; success → action
    proceeds; fail 3x biometric → PIN forced; fail 5x PIN → PIN locked
    30 min.
-   T4 action triggered olduğunda full 2FA re-prompt; backup code
    fallback; success → action; fail → action canceled + suspicious
    activity audit.
-   Jailbreak/root detected → warn banner persistent + clinical actions
    blocked (read-only OK).
-   New device login → email notification.
-   New country login → email notification + force re-auth on first
    sensitive action.
-   5 failed password → account lockout 30 min + email.
-   20 failed/IP/hour → IP block 1h.
-   Audit log her event\'i capture eder (event\_type, user, acting,
    resource, session, device, ip, timestamp, data).
-   Audit log immutable: UPDATE/DELETE attempts trigger exception.
-   Nightly batch audit logs S3 Glacier\'a replicate edilir + HMAC
    chained.
-   PolicyEngine.evaluate() interface RBAC implementation ile MVP\'de
    çalışır; V1\'de Cedar swap interface değişmeden.
-   Concurrent session limit 5; 6. login en eski session evict +
    clinician notified.
-   Manual \"Sign out of all devices\" tüm sessions revoke + tokens
    invalidate.

8.2 Regülasyon / Güvenlik
-------------------------

-   TLS 1.2+ tüm network communication (web + mobile API).
-   AES-256 at-rest for all PHI + auth secrets.
-   Argon2id for password hash (mem 64MB, iter 3, parallelism 4).
-   Argon2id for PIN hash + backup codes.
-   TOTP secret AES-256 encrypted with KMS-managed key (Canada Central).
-   All tokens (access + refresh + recovery) secure HTTP-only cookies
    (web) or Keychain/Keystore (mobile).
-   JWT access token Ed25519 signed (asymmetric); private key in KMS.
-   Refresh token rotation on every use; replay detection enforces
    session chain revocation.
-   Audit log retention 7 years (PHIPA s.13).
-   Audit log immutability at DB trigger level.
-   Audit log HMAC chained (tamper detection).
-   IP hashed (SHA-256); plain IP not stored.
-   Device fingerprint hashed; reverse-lookup prevention.
-   All admin actions audit\'lenir (acting\_admin\_user\_id mandatory).
-   Brute force protection enforced (account-based + IP-based).
-   New device + new country alerts (email --- opt-out not available for
    security).
-   ConsentRecord immutable (Doc 1 referans).
-   PHIPA ESP declaration enforced (no unauthorized PHI use).
-   No password complexity rotation (NIST SP 800-63B compliant ---
    modern best practice).
-   2FA setup not bypassable (MVP requires either TOTP or SMS).
-   Backup codes can be regenerated only via authenticated session.
-   Account recovery requires re-verification of identity (photo ID +
    license re-upload).

8.3 Teknik / Performans
-----------------------

-   Login API response time ≤ 500ms (P95).
-   Token refresh response time ≤ 200ms (P95).
-   T3 re-auth modal open ≤ 100ms (P95).
-   T4 re-auth modal open ≤ 200ms (P95).
-   Biometric prompt response (success) ≤ 1.5s.
-   PIN entry validation ≤ 50ms.
-   2FA TOTP validation ≤ 50ms.
-   2FA SMS delivery ≤ 30s (P95).
-   Audit log write latency (synchronous critical events) ≤ 100ms.
-   Audit log write latency (async non-critical) ≤ 1s (eventually
    consistent).
-   Audit log query (recent events for user) ≤ 500ms.
-   PolicyEngine.evaluate() (RBAC) ≤ 20ms (P95).
-   PolicyEngine.evaluate() (Cedar V1) ≤ 50ms (P95).
-   Nightly audit log batch archive job ≤ 30 min for 1M events.
-   HMAC integrity verification job (monthly) ≤ 1 hour for 30M events.

9. Başarı Metrikleri
====================

9.1 Auth Funnel
---------------

  Metric                                                Hedef
  ----------------------------------------------------- -------------------
  Login first-attempt success                           ≥ %85
  2FA setup completion (within onboarding)              ≥ %92
  Backup codes saved (acknowledged)                     ≥ %95
  Recovery via email reset success rate                 ≥ %90
  Recovery via backup code success rate                 ≥ %85
  Recovery via support ticket (mean resolution time)    ≤ 2 business days
  Account lockout recovery (password reset within 1h)   ≥ %75

9.2 Session Metrics
-------------------

  Metric                                                Hedef
  ----------------------------------------------------- ---------------------------------------------
  Mean session length (mobile)                          4-6 hours
  Mean session length (web)                             3-5 hours
  Hard logouts (max session reached) per day per user   ≤ 0.3 (most users renew before hitting max)
  Idle soft locks per day per user                      ≤ 2
  Concurrent session evictions per week per user        ≤ 0.1

9.3 Re-Auth Metrics
-------------------

  Metric                                          Hedef
  ----------------------------------------------- -------
  T3 re-auth biometric success rate               ≥ %92
  T3 re-auth PIN success rate                     ≥ %95
  T3 mean prompt-to-success time                  ≤ 4s
  T4 re-auth TOTP success rate                    ≥ %88
  T4 re-auth SMS success rate                     ≥ %85
  T4 mean prompt-to-success time                  ≤ 18s
  T3 PIN setup completion (on first T3 attempt)   ≥ %98

9.4 Security Metrics
--------------------

  Metric                                                Hedef
  ----------------------------------------------------- ---------------------------
  Brute force lockouts per 1000 users per month         ≤ 8
  IP blocks per 1000 IPs per day                        ≤ 2
  Suspicious activity alerts per 1000 users per month   ≤ 25
  Confirmed unauthorized access incidents               0
  Untrusted device detection rate (jailbroken/rooted)   ≤ %2 of devices
  Audit log integrity verification success              100%
  Audit log archive success rate                        100%
  Token replay detection accuracy                       100% (no false negatives)

10. UX ve Tasarım Notları
=========================

10.1 Re-Auth UX Principles
--------------------------

-   **Minimize cognitive disruption**: T3 biometric \~3s; T4 2FA \~15s.
    Don\'t surprise --- show context: \"Sign note for \[Patient\]\".
-   **Tier explainability**: First time user encounters T4, brief
    tooltip \"Higher security required for this sensitive action.\"
-   **PIN fallback always available**: Biometric fail → PIN instantly;
    no awkward retry sequences.
-   **No nested modals**: Re-auth modal is full-screen; action modal
    beneath dismissed/paused.

10.2 Session Lock UX
--------------------

-   **Idle warning** at T-2 min visible, dismissable but respawns at
    T-30s.
-   **Hard logout** transition smooth: brief \"Session ended. Please log
    in.\" then login screen with email pre-filled.
-   **Soft lock** preserves context: after re-auth, user lands on same
    screen they were on.

10.3 Mobile-Specific
--------------------

-   **Biometric prompt** is OS-native (Face ID iOS / BiometricPrompt
    Android); follow OS conventions.
-   **Background blur**: When app backgrounded, screen blurred (PHI
    privacy in app switcher).
-   **App lock on background return after 5 min**: Re-auth required.

10.4 Web-Specific
-----------------

-   **Tab visibility doesn\'t pause idle timer**: PHI may be on screen
    even if tab not focused.
-   **Browser autofill**: Email + password autofill supported
    (1Password, Bitwarden, etc.); TOTP 1Password integration documented.
-   **No \"Remember me forever\"**: Maximum 24h mobile / 12h web; no
    perpetual remember.

10.5 Accessibility
------------------

-   Screen reader announces all auth states (\"Account locked. Try at
    5:30 PM.\")
-   2FA code entry numeric keyboard mobile + autofocus
-   Biometric prompt accessibility hooks (VoiceOver compatibility)
-   High contrast support for security warnings (red banners 7:1
    contrast minimum)
-   Keyboard-only navigation for all auth flows

10.6 Internationalization
-------------------------

-   Auth strings + recovery emails localized (en, fr V1)
-   Phone number format E.164 internationally
-   TOTP issuer name \"Sinalytix\" universally
-   Date/time formats locale-aware
-   Country code in IP geolocation messages localized

11. Kullanıcı Senaryoları
=========================

Senaryo 1 --- Normal Login + Note Signing
-----------------------------------------

Dr. Park, family physician, ON. Mobile app.

-   Sabah 8:00 --- App açar. Face ID hızlı login (sessionn
    cache\'lendiğinden) → Email + password (1Password autofill) + Face
    ID approves password → TOTP code from Authy app.
-   Session: max 32h, idle 9:00 next.
-   9:30 --- Patient visit notes draft eder. Session valid; re-auth yok.
-   10:00 --- Note signing T3 → Face ID prompt 2s → \"Signed by Dr. J.
    Park at 10:00:32\"; audit log capture.
-   10:15 --- Lab order T3 → Face ID prompt → order placed; audit log.
-   13:00 --- App backgrounded 3 saat (lunch + drive). 16:00\'da resume
    → screen blur visible → tap → Face ID re-unlock (5 min background
    lock).
-   18:00 --- Last note signing T3 + Face ID. Workday over.
-   20:00 --- App\'i 5 dk açıyor, son care plan update. Idle timer\'ı
    21:00\'da.

Senaryo 2 --- T4 Controlled Substance Rx (V1+)
----------------------------------------------

Dr. Park aynı clinic, V1 zamanı. Opioid prescription for chronic pain
patient.

-   Patient 360 → Rx → \"Controlled Substance\" type select → opioid
    drug + dosage entry.
-   T4 trigger: Modal \"High-stakes action. Confirm with 2FA.\" Authy
    code entry → submitted.
-   Audit log:
    `rx_prescribed { type: controlled, drug_din, patient_id, t4_method: totp, t4_completed_at }`.
    Severity: critical.
-   Rx PDF generated + sent to pharmacy via Infoway national
    e-prescribing (V2+) or e-fax (V1).

Senaryo 3 --- Lost 2FA Phone, Backup Code Recovery
--------------------------------------------------

Nurse Sarah RN, lost her iPhone. Backup codes saved in 1Password.

-   New iPhone obtained. Login flow → email + password OK → 2FA SMS code
    prompt → no phone access.
-   \"Use backup code\" → 8-character code from 1Password vault →
    success.
-   Banner: \"You used a backup code. Reconfigure 2FA in Settings now.\"
-   Settings → Security → 2FA → \"Change method\" → New phone TOTP setup
    (Authy on new iPhone) + verify.
-   New 8 backup codes generated; old set invalidated. Saved to
    1Password.

Senaryo 4 --- Account Locked (Phishing Suspected)
-------------------------------------------------

David MSW, attempted login on coffee shop wifi by someone else (laptop
unattended momentarily). 5 wrong passwords entered.

-   5th attempt → Account.locked\_until = now + 30min. Email to David:
    \"Multiple failed login attempts on your account at 14:32. If this
    wasn\'t you, change your password immediately.\"
-   David panic + clicks \"Reset password\" → email reset → new
    password.
-   All sessions revoked (security). David must re-login on his trusted
    devices.
-   Audit log entries: 5x `login_failed_password`, `account_locked`,
    `password_reset_via_email`, all sessions
    `session_revoked { reason: security_event }`.

Senaryo 5 --- Multi-Org Clinician Cross-Context Audit Query
-----------------------------------------------------------

Lisa Kim, physician, 3 orgs. Toronto Community Health admin (V1+) wants
to query Lisa\'s activity in TCH org only (privacy from other orgs).

-   TCH admin opens admin tool → Audit Log Query → user: Lisa Kim → org:
    Toronto Community Health → date range.
-   RLS policy: `acting_org_id = 'TCH-uuid'` filter.
-   Lisa\'s solo + Bayshore activity NOT visible (RLS enforcement).
-   TCH admin sees only TCH-context audit events: patient access, notes
    signed, orders placed within TCH context.
-   Audit log entry:
    `audit_log_queried { queried_user_id: Lisa, queried_org_id: TCH, queried_by_admin_user_id, queried_at }`
    --- meta-audit.

Senaryo 6 --- Audit Log Subpoena (PHIPA Compliance)
---------------------------------------------------

Regulator (CPSO) audits Dr. Park\'s prescribing patterns for a specific
patient (complaint filed).

-   Legal subpoena to Sinalytix.
-   Sinalytix legal review → manual export job.
-   All `rx_prescribed`, `note_signed`, `patient_record_viewed` events
    for Dr. Park + Patient ID, dated range.
-   Export includes acting\_practitioner\_role\_id, session\_id,
    device\_fp\_hash, ip\_hash, timestamps, action details.
-   Cross-referenced with S3 Glacier archive for integrity verification
    (HMAC chain).
-   Audit log meta-event:
    `regulator_audit_export { subject_user_id, requested_by, exported_event_count, exported_at }`.
-   Provided to CPSO with chain-of-custody documentation.

12. Açık Konular
================

  Konu                                                                            Durum                                   Sorumlu / Hedef
  ------------------------------------------------------------------------------- --------------------------------------- ----------------------------------
  **Master Doc §4.6 session 12h universal anchor revize**                         Karar verildi (asymmetric mobile/web)   Master Doc next revision
  ONE ID SAML federation V1 detailed spec                                         Açık                                    V1 Doc 2 sürümünde
  BC Services Card App V2 entegrasyon detayı                                      Beklemede                               V2 Doc 2
  FIDO2 / WebAuthn V1 detayı                                                      Açık                                    V1 Doc 2
  Passkeys (passwordless) V2 spec                                                 Açık                                    V2 Doc 2
  Cedar V1 migration plan (policy authoring tooling)                              Açık                                    V1 öncesi engineering
  Cedar policy versioning + rollback strategy                                     Açık                                    V1 ops process
  Trusted device management V1 UX                                                 Açık                                    V1 UX süreci
  Audit log query UI for clinician (Settings → Activity Log) V1                   Açık                                    V1 Doc 2
  Audit log query UI for admin tool V1                                            Açık                                    V1 admin tool spec
  Audit log analytics dashboards V2                                               Beklemede                               V2
  Screen capture detection iOS/Android implementation detail                      Açık                                    V1 mobile engineering
  Cross-app session orchestration (Patient → HCP referral context)                Açık                                    V2 cross-app reconciliation
  Suspicious activity ML model selection                                          Açık                                    V1 ML research
  MDM (Intune/Jamf) integration handshake protocol                                Açık                                    V1 enterprise sales partnership
  TOTP backup secret recovery in catastrophic DB failure scenario                 Açık                                    DR planning
  Audit log Glacier deep archive vs instant retrieval cost-benefit                Açık                                    Ops infra cost analysis
  Recovery ticket video verification (V1) implementation                          Açık                                    V1 support team workflow
  PIN brute-force lockout vs UX trade-off final tuning (5 attempts current)       Açık                                    Pilot feedback
  Concurrent session limit (5) tuning                                             Açık                                    Pilot feedback
  Audit log event\_data PHI-leakage prevention (schema validation)                Açık                                    V0 launch öncesi data review
  Cross-app User table refactor (base + auth\_extension)                          Beklemede                               Cross-app reconciliation pass
  Cross-app AuditLogEntry generic schema vs per-app polymorphism                  Beklemede                               Cross-app reconciliation pass
  PolicyEngine ABAC rule authoring tool (CMS pattern?)                            Açık                                    V1 Cedar swap
  Token refresh CSRF protection for web (double-submit pattern)                   Açık                                    V0 launch öncesi security review
  Audit log purge after 7-year retention --- automated or manual?                 Açık                                    V2 lifecycle ops
  Multi-region failover for AWS Canada Central (Toronto+Montreal active-active)   Açık                                    V2 HA architecture
  Audit log encryption at rest beyond AES-256 (post-quantum?)                     Açık                                    V3+ roadmap
  Quebec SécurSanté PKI integration (V3)                                          Beklemede                               V3

*Sinalytix --- Gizli ve Özel. Doc 2 / 10 --- Healthcare Professional PRD
Serisi. Cross-cutting infrastructure spec; Doc 1 extension + Doc 3-10
baseline. Geliştirici, güvenlik ve klinik danışman referansı içindir.*

**Sonraki Doc**: Doc 3 --- Worklist & Patient Roster (mobile-primary
günlük view + web multi-patient sort/filter).

Table of Contents {#table-of-contents-2 .TOC-Heading}
=================

SINALYTIX --- HEALTHCARE PROFESSIONAL APP
=========================================

Doc 3 --- Worklist & Patient Roster
-----------------------------------

  Versiyon   Uygulama                                 Hedef Pazar               Platform                             Durum                              Tarih
  ---------- ---------------------------------------- ------------------------- ------------------------------------ ---------------------------------- ---------------
  V0 (MVP)   Healthcare Professional (Mobile + Web)   Kanada (Ontario odaklı)   React Native + React shared kernel   Taslak --- Geliştirici Referansı   29 Mayıs 2026

*Sinalytix --- Gizli ve Özel. Bu doküman geliştirici ve klinik danışman
referansı içindir.*

1. Bağlam ve Amaç
=================

1.1 Özelliğin Tanımı
--------------------

Doc 3, klinisyenin **günlük \"ne yapmalıyım\" sayfası** + **panel
görünümü**\'dür. İki ayrı yetenek alanını birleştirir:

-   **Worklist** --- Bugün için actionable items: yapılacak ziyaretler,
    imzalanmamış notlar, place edilmemiş order\'lar, yanıtlanmamış
    mesajlar, overdue task\'lar. Mobile-primary (saha günlük); web\'de
    multi-patient sort/filter view.
-   **Patient Roster** --- Klinisyenin tüm aktif paneli: geçmiş +
    bugün + planlanmış. Filter, search, sort. Web-primary (multi-panel
    görünüm); mobile özet view.

Worklist = zaman-merkezli (bugün); Roster = patient-merkezli (panelim).

**Doc 3\'ün kapsam dışı tuttuğu** (diğer doc\'lara ait):

-   **Patient 360 detail** (Doc 4) --- Doc 3 sadece quick-card
    seviyesinde \"patient özeti\" gösterir
-   **Care plan authoring** (Doc 6) --- Doc 3 worklist\'te \"açılmamış
    care plan\" gibi reference verir; içerik düzenleme Doc 6
-   **Clinical documentation** (Doc 7) --- Doc 3 \"sign pending notes\"
    quick action sunar; not yazımı Doc 7
-   **Orders & Rx** (Doc 8) --- quick action referans; içerik Doc 8
-   **Care team management** (Doc 9) --- Doc 3 read-only care team
    display; atama/transfer Doc 9
-   **Patient consent grants** (Doc 10) --- Doc 3 read-only consent
    state\'i kullanır; grant management Doc 10

1.2 Giriş Noktaları
-------------------

Worklist + Roster, klinisyenin Sinalytix\'le karşılaştığı **birincil
home screen**\'dir. Üç giriş noktası:

  Giriş Noktası                            Tetikleyici                                                                     Default View
  ---------------------------------------- ------------------------------------------------------------------------------- ------------------------------------------------------------------------
  **Login Home**                           Login sonrası (Doc 1/2 → soft-gate kalkmış aktif clinician)                     Mobile: Worklist (today); Web: Worklist (today) panel + Roster sidebar
  **Push/Email Notification Drill-down**   Klinisyen push notification\'a tıklar (örn. \"New lab result for Patient X\")   Worklist\'te patient highlighted + notification source açık
  **Manual Navigation**                    Bottom nav \"Worklist\" tab (mobile) / Top nav \"Worklist\" link (web)          Default scope (today + overdue)

Empty state (verification pending, no patients granted yet, no tasks
today) Doc 1/Doc 4/Doc 9\'a yönlendiren CTA\'larla yapılandırılır.

1.3 Hedef Rol Matrisi
---------------------

Worklist her klinisyen rolüne özelleşir. RBV pattern (Doc 2 PolicyEngine
+ Doc 1 PractitionerRole) ile role-specific item tipleri filtreli
görünür.

  Discipline                                       Worklist Tipik İçerik                                                                                Mobile Use Pattern                  Web Use Pattern
  ------------------------------------------------ ---------------------------------------------------------------------------------------------------- ----------------------------------- --------------------------------------------------
  **Care Coordinator (CC, RN/RPN/NP/OT/PT/MSW)**   Master care plan review/update, team task assignment, patient intake/discharge, MDT meeting prep     Saha visit + team koordinasyon      Multi-patient panel review + care plan authoring
  **MRP (Family Physician / NP)**                  Sign pending notes, address consults, approve elevated actions, review labs, prescription renewal    Quick T3 actions (sign + Rx)        Multi-panel chart review + MDT
  **Consulting Specialist**                        Pending consultation requests, consultation note finalization, specialist follow-up                  Visit at clinic                     Web-primary referral workflow
  **Allied Health (PT/OT/SLP/RD/RT)**              Discipline subplan tasks, visit documentation, goal progress tracking                                Home visit saha                     Subplan authoring + outcome tracking
  **RN/RPN (Direct Care)**                         Visit list (medication admin, wound care, vital signs), task checklist, escalation alerts            Heavy saha use --- primary screen   Lighter; chart review for assessment
  **MSW**                                          Patient psychosocial assessment tasks, family/caregiver coordination, community referral follow-up   Home visit + family meeting         Documentation + community referral form

> *Hedef kitle nüansı: Mobile worklist \"deskless\" clinician için
> primary tool; tüm gün açık. Web worklist genelde \"chart day\" ya da
> admin workflow için açılır. UX optimization mobile-first prensibine
> sahip.*

1.4 Ekosistem İçindeki Konum
----------------------------

  İlişki                 Doc                                        Doc 3\'ün Sağladığı / Kullandığı
  ---------------------- ------------------------------------------ ----------------------------------------------------------------------------------------------------------------------
  **Extends Doc 1**      Identity & Onboarding                      PractitionerRole, active org context, soft-gate state
  **Extends Doc 2**      Auth/Session/Audit/PolicyEngine            Session continuity, audit log writes (every view + action), PolicyEngine.evaluate for every patient visibility check
  **Drives to Doc 4**    Patient 360 Dashboard                      Worklist\'ten patient quick-card → \"Open Chart\" → Patient 360 derin view
  **Drives to Doc 6**    Care Plan Authoring                        Worklist\'te \"Review care plan\" item → care plan authoring (Doc 6)
  **Drives to Doc 7**    Clinical Documentation                     \"Sign pending notes\" quick action → Doc 7 note signing T3
  **Drives to Doc 8**    Orders & Rx                                \"Place pending order\" quick action → Doc 8 ordering workflow
  **Drives to Doc 9**    Communication, Visit, Care Team            \"Message patient\" → Doc 9; \"Add to care team\" → Doc 9; visit start (V2 EVV) → Doc 9
  **Drives to Doc 10**   Patient Consent, Notifications, Settings   \"Notification badge drill-down\" → Doc 10 Notification Center

**Cross-app primitive uyum noktaları**:

-   **Worklist concept Patient/Caregiver/Family\'de yok** --- HCP\'ye
    özel. Reconciliation pass\'inde cross-app shared değil.
-   **Patient quick-card data** Patient app\'in own profile
    bilgisinden + clinician\'ın görme yetkisi olduğu fields\'tan
    derlenir (RLS + consent enforce).
-   **Notification badge counts** Doc 10 NotificationCenter
    resource\'undan agregat. Cross-app shared.

1.5 Regülasyon Çerçevesi
------------------------

**1. PHIPA s.10 --- Consent Enforcement on Every View**

-   Klinisyenin worklist\'inde gözüken her hasta için
    PolicyEngine.evaluate() çağrısı (consent + care team kontrolü).
-   Worklist render = batch evaluate (performance kritik).
-   Audit log: her patient view\'da `patient_record_viewed` event\'i
    (Doc 2 schema). Worklist load\'unda toplu N adet event.

**2. PHIPA s.13 --- Audit Log Retention**

-   Worklist view event\'leri = audit log entry; 7-year retention.
-   Toplu view\'lerin schema tasarımı: `event_data` minimal (patient\_id
    list), event\_severity = info; high-volume olduğu için aggregated
    logged.

**3. CPSO Documentation Policy + RNAO Practice Standard**

-   Klinisyen hasta görüntülemesi = audit trail. Sinalytix bu kaydı
    tutar; klinisyenin \"Why did I view this patient?\" justification\'ı
    V1+ optional metadata field.

**4. Patient Autonomy (Sinalytix Moat --- Master Doc §4.8)**

-   Hasta consent\'i çekerse → worklist\'inde o hasta anında kaybolur
    (real-time refresh).
-   Patient grant revoke = klinisyenin in-flight aksiyonlarını da
    etkiler (draft notlar görünür, ama yeni write blocked).
-   Audit log: `patient_panel_removed_due_to_consent_revoke`.

> *Önemli klinik nüans: Bir hasta consent çekerse Türkiye\'deki \"hasta
> benim sorumluluğum altında\" doktorluk refleksi devreye girer ve \"ama
> ben onun MRP\'siyim, görmem lazım\" itirazı olabilir. Doc 3\'ün UX\'i
> bu refleksi sakinleştirmek için: hasta consent çektiğinde clinician
> \"Patient revoked your access. To restore, request renewed consent
> through the Patient app or family caregiver.\" mesajı görür ---
> break-glass override Doc 10\'da emergency use için.*

2. Endüstri ve Klinik Bağlam
============================

2.1 Endüstri Pattern\'ları
--------------------------

  Platform                                         Worklist Pattern                                                                    Sinalytix İlhamı
  ------------------------------------------------ ----------------------------------------------------------------------------------- --------------------------------------------------------------
  **Epic Hyperspace (In Basket)**                  Çok kategorili inbox: notes to sign, orders to verify, messages, results, refills   MVP\'de \"today\'s tasks\" baseline; multi-category V1 inbox
  **AlayaCare Mobile (Today\'s Schedule)**         GPS-aware visit list, route optimization, offline-first                             Saha visit pattern referansı; GPS V2
  **PointClickCare (Resident Task Queue)**         Resident-by-resident task checklist                                                 Discipline-specific task taxonomy
  **OSCAR Pro (Inbox)**                            Simple list of unsigned notes, messages, lab results                                MVP simplicity benchmark
  **Cerner PowerChart (Multipatient Task List)**   Multi-patient unified worklist, color-coded acuity                                  Web multi-patient view referansı
  **TELUS CHR (Provider Dashboard)**               Daily appointments + tasks + messages combined                                      Hybrid clinic/community pattern

**Genel pattern bulgusu**: Hiçbir Kanada-uyumlu platform **multi-org
consent-aware worklist** kombinasyonunu yapmıyor. Sinalytix\'in
worklist\'i = endüstri pattern + Kanada moat (patient autonomy +
multi-org native).

2.2 Kanada Home Care Worklist Realitesi
---------------------------------------

-   **Saha-merkezli**: %80+ saha çalışan klinisyen mobile\'i primary UI
    olarak kullanır.
-   **Internet kesintileri yaygın**: Offline-first design zorunlu (lokal
    cache + sync queue). MVP\'de read-only offline cache; V1 offline
    write.
-   **EVV (Electronic Visit Verification) Kanada\'da federal mandate
    yok** ama Ontario Health atHome ve büyük private ajanslar EVV
    bekliyor. Foundation \#2 kararı: GPS check-in/out V2\'ye ertelendi.
    MVP\'de basic visit timestamp (manual) + planned visit list.
-   **Multi-org clinician = pazarın gerçekliği** (Master Doc §3.6,
    §4.4). Worklist active org context aware (Foundation Doc 2 + Doc 3
    B1.4).
-   **Patient panel size dağılımı**:
    -   PSW/HCA (Caregiver app, not HCP): 3-8 hasta günlük
    -   Community RN: 8-15 hasta günlük visit
    -   PT/OT/SLP solo private: 8-12 hasta günlük
    -   Family physician panel: 1500-2500 toplam roster, günlük 15-25
        visit
    -   Specialist: 5-12 ziyaret/gün
-   **Worklist daily item count**: çoğunlukla 5-30 item; max 50 item
    (specialist heavy day).

2.3 Multi-Clinician Worklist Coordination
-----------------------------------------

Patient\'ın N klinisyeni varsa (CC + MRP + Specialist + Allied Health),
her birinin kendi worklist\'i ama bazı task\'lar paylaşılır:

-   **Patient-level task** (örn. \"Patient missed appointment, follow
    up\") → kim assigned? → CC default, MRP read-only awareness
-   **Discipline-specific task** (örn. \"Update PT subplan\") → PT
    assigned
-   **Care team coordination task** (örn. \"MDT meeting prep\") → CC
    organizes, herkes view

Doc 3\'ün worklist data model\'i task ownership + observers ayrımı yapar
(Doc 9\'la birlikte).

3. Kapsam ve Kısıtlar
=====================

3.1 Kapsam (In Scope)
---------------------

### V0 --- MVP

**Worklist (Mobile + Web):**

-   Default scope: Today + Overdue
-   Toggle: This Week / Custom date range
-   Multi-factor smart sort: overdue → due time → acuity → patient last
    name alpha
-   Explicit sort dropdown override: Due Time / Acuity / Patient Name /
    Last Visit / Org (multi-org)
-   Active org context only (header dropdown switch --- Doc 1/2
    referans)
-   Patient quick-card: name + age + primary condition + last visit
    date + acuity tag + notification badges + quick actions
-   Quick actions (Mobile): Open Chart, Call Patient, Message Patient,
    Quick Note Draft, Mark Task Complete
-   Quick actions (Web): Open Chart, Open Care Plan, Sign Pending Notes,
    Place Pending Order, Reassign Task, Reschedule
-   Infinite scroll (server-side cursor pagination)
-   Real-time notification badge updates (WebSocket)
-   Empty state with appropriate CTAs (verification pending / no
    patients granted / no tasks today)

**Patient Roster (Mobile + Web):**

-   Aggregated panel: tüm aktif patients (consent + care team
    intersection)
-   Search: name, health card number (OHIP / BC PHN), date of birth,
    phone --- server-side full-text search (PG FTS MVP; Elasticsearch
    V1)
-   Filters: discipline-relevant, acuity, last visit (last 30/60/90
    days), open tasks (\>0), conditions tag, insurance type
-   Sort: name / next visit / last visit / acuity / care plan progress
-   Infinite scroll + zorunlu filter prompt when panel size \> 100
-   Web-primary; Mobile özet view (collapsible filters)

**Search (Aggressive MVP --- Cross-Cutting):**

-   Worklist-view search: name, condition tag, acuity
-   Roster-page search: name, health card \#, DOB, phone, condition
    codes (ICD-10/SNOMED CT)
-   Care plan goal text search (intra-clinician\'s panel)
-   Document content search (Tier 4 OCR text + Tier 1-3 structured) ---
    backend infra dependent
-   Org-wide patient search (clinician\'s panel + org admin patients)
    --- \"Add to my panel\" requires care team + consent path (Doc 9/10)
-   Privacy enforcement: all search results filtered by RLS + consent +
    care team (klinisyen sadece görme yetkisi olan patient\'ları görür)
-   Search scope toggle: My Panel / Current Org Patients (V1)
-   Search history (last 10 --- local cache)

**Filter + Sort Customization:**

-   Filter combinations saved as \"Saved Views\" (V1)
-   Default sort preference per user (Worklist preference)

**Multi-Org Context:**

-   Active org context only (Foundation Doc 1/2 + Doc 3 B1.4)
-   Org switch via header dropdown → worklist + roster refresh to new
    context
-   \"All Orgs Combined\" pseudo-view V1+

**Notification Badge Integration:**

-   Per-patient badge on quick-card: unread message count, new lab
    result, new family question, new care team alert
-   Top-level badge: total unread + actionable count
-   Real-time WebSocket updates (with polling fallback for unstable
    connections)
-   Badge click → Notification Center (Doc 10) filtered by patient +
    source

**Performance:**

-   Worklist load ≤ 1.5s (P95) for typical 5-30 items
-   Roster load ≤ 2.5s (P95) for typical 50-200 items
-   Search results ≤ 500ms (P95)
-   WebSocket badge update ≤ 500ms

### V1 --- Sonraki

-   **\"All Orgs Combined\" view** with per-item org badge
-   **Saved Views** (filter + sort preset library)
-   **Smart sort algorithms** (ML-driven prioritization based on user
    behavior)
-   **Acuity scoring** integration (interRAI MAPLe scores when V1
    interRAI integration)
-   **Worklist route optimization** (multi-patient saha day route,
    Google Maps integration)
-   **Risk flag dashboard** (using outcome data + scoring)
-   **Search Elasticsearch upgrade** (PG FTS MVP → Elasticsearch full)
-   **Cross-discipline task delegation** (Doc 9 with Doc 3 surfacing)
-   **Worklist quick-add task** (clinician adds standalone task not from
    care plan)
-   **Patient-level \"Watch List\"** (clinician marks specific patients
    for prominence)

### V2 --- İleride

-   **EVV (Electronic Visit Verification)** with GPS check-in/out
    (Master Doc §5.9, deferred from MVP per Foundation \#2)
-   **Cross-patient analytics** (clinician\'s panel quality metrics ---
    readmission rate, goal achievement)
-   **AI-generated patient summary** (Patient 360 referans + worklist
    quick-card enhancement)
-   **Predictive risk indicators** (fall risk, deterioration --- based
    on outcome data)
-   **Multi-tab/multi-window org context** (web tab-scoped --- Doc 2 V2
    dependency)
-   **Voice command worklist navigation** (Apple Watch / mobile
    dictation)

### V3

-   **Cross-province multi-context worklist** (BC/AB rollout)
-   **Federated worklist** (cross-organization shared patient with
    consent --- Doc 9 V3)

3.2 Kısıtlar (Constraints)
--------------------------

-   **Worklist consent-gated every render**: PolicyEngine batch
    evaluate\'i her worklist refresh\'inde çağrılır. Performance
    critical --- caching (5 saniye TTL).
-   **Active org context single**: Klinisyen aynı session içinde tek org
    context\'inde çalışır (Doc 2 V0 constraint). Multi-tab same context
    (V2 değişir).
-   **Real-time WebSocket connection**: Mobile network kesintilerinde
    polling fallback (15s). Reconnect strategy: exponential backoff.
-   **Offline cache size**: Mobile lokal cache ≤ 50MB (worklist data +
    last 30 day Patient 360 summary cache).
-   **Search privacy**: Search results her zaman RLS + consent filter
    geçer. Klinisyenin görme yetkisi olmadığı hasta search\'te de
    gözükmez.
-   **Aggressive search scope MVP**: Backend infra (PG FTS vs
    Elasticsearch) kararına bağlı (§12). MVP\'de PG FTS minimum; V1\'de
    Elasticsearch için planlı migration.
-   **Task ownership**: Worklist\'te gözüken her item bir owner\'a
    (assignee) sahip. CC org-default owner; explicit reassign Doc 9.
-   **Multi-clinician same task**: Aynı task birden fazla worklist\'te
    görünmez (single owner); ancak observer/awareness model V1.
-   **EVV V2**: Doc 3 worklist\'te \"visit start\" basic timestamp
    logging yapar (manual entry) --- GPS check-in/EVV format V2.
-   **Patient quick-card data sensitivity**: Quick-card sadece minimum
    identifiable data (name + age + primary condition); sensitive data
    (mental health diagnosis, HIV status) **gizli** --- Patient 360 deep
    view\'da consent-aware reveal.
-   **Notification badge cap**: 99+ display (per-patient veya
    total); \>99 detail Notification Center\'da.

3.3 Non-goals (Kapsam Dışı)
---------------------------

-   **Patient 360 detail rendering** (Doc 4)
-   **Care plan editing** (Doc 6)
-   **Note authoring/signing UI** (Doc 7 --- quick action only
    initiates)
-   **Order creation UI** (Doc 8 --- quick action only initiates)
-   **Care team assignment UI** (Doc 9 --- read-only display)
-   **Patient consent grant management** (Doc 10 --- read-only state
    usage)
-   **Notification settings/preferences** (Doc 10)
-   **Calendar integration** (Doc 9 V1+ scheduling)
-   **Care plan template browsing** (Doc 6)
-   **Org admin tools** (Doc 10 + V1 admin tool)
-   **Cross-app search (Patient/Caregiver/Family side)** (Cross-app
    reconciliation pass)
-   **Worklist export/print** (V1+)
-   **Worklist email digest** (V1+ Notification Center)
-   **Bulk task operations** (V1+ --- \"Mark 5 tasks complete\")

4. Akışlar
==========

4.1 Worklist Render Flow (Login Home)
-------------------------------------

    1. User authenticated + active org context set (Doc 1/2)
    2. Frontend requests: GET /api/v1/worklist?org_id=X&scope=today+overdue&sort=smart
    3. Backend:
       a. Auth + session validate (Doc 2)
       b. Active PractitionerRole resolved
       c. Query: 
          - All Tasks (Doc 9) where assigned_to = practitioner_role_id 
            AND status IN ('pending', 'in_progress')
            AND (due_at <= today_end OR due_at < now AND status != 'completed')
          - PLUS pending notes to sign (Doc 7) where signing_required_by = practitioner_role_id
          - PLUS pending orders to verify (Doc 8) where verifier_role_id = practitioner_role_id
          - PLUS new lab results requiring acknowledgement (Doc 5) where notify_role_id = practitioner_role_id
          - PLUS unanswered consultation requests (Doc 9) where consulted_role_id = practitioner_role_id
       d. For each item: fetch patient_id + minimal patient summary
       e. PolicyEngine batch evaluate: for each (practitioner_role, action=read, resource=Patient, context)
          - If allow=false (consent revoked, care team removed) → item filtered out + audit log entry
       f. Apply smart sort: overdue → due_time → acuity → alpha
       g. Apply pagination (cursor-based, default first 50)
       h. Return: { items[], next_cursor, total_count_estimate, summary_counts }
    4. Frontend renders:
       a. Worklist list view (Mobile: full-screen; Web: panel + Roster sidebar)
       b. WebSocket subscribe: worklist_updates channel + per-patient notification channels
       c. Audit log: worklist_loaded { practitioner_role_id, org_id, item_count, scope }

4.2 Roster Render Flow
----------------------

    1. User navigates to Roster (mobile bottom nav / web side nav)
    2. Frontend: GET /api/v1/roster?org_id=X&filters=...&sort=...&cursor=...
    3. Backend:
       a. Auth + session validate
       b. Query: All Patient where Patient.id IN (
          SELECT patient_id FROM CareTeamMembership 
          WHERE practitioner_role_id = X 
            AND active = true
          INTERSECT
          SELECT patient_id FROM ConsentGrant
          WHERE granted_to_practitioner_role_id = X 
            AND active = true 
            AND scope INCLUDES 'patient_record_read'
       )
       c. Apply filters (acuity, last visit, conditions, etc.)
       d. PolicyEngine batch evaluate (defense in depth)
       e. Apply sort
       f. Apply pagination
       g. Return: { patients[], next_cursor, total_count }
    4. Frontend renders:
       a. Patient list with quick-card (name + age + primary condition + last visit + acuity)
       b. Filter sidebar (web) / Filter modal (mobile)
       c. Search bar prominent
       d. Audit log: roster_loaded { practitioner_role_id, org_id, filter_state, patient_count_returned }

4.3 Search Flow
---------------

    1. User types in search bar (worklist or roster)
    2. Frontend debounce 300ms → GET /api/v1/search?q=...&scope=my_panel&org_id=X
    3. Backend:
       a. Auth + session validate
       b. PG FTS (MVP) / Elasticsearch (V1) query across:
          - Patient.name (prefix + fuzzy)
          - Patient.health_card_number (exact)
          - Patient.date_of_birth (exact)
          - Patient.phone (E.164 normalized)
          - Patient.conditions[*].code (ICD-10/SNOMED match)
          - Patient.conditions[*].display (text match)
          - CarePlan.goal[*].description (text match, panel-scoped)
          - Document.ocr_text (Tier 4, panel-scoped)
       c. Scope filter:
          - "my_panel" → Only patients in CareTeam ∩ ConsentGrant
          - "current_org" (V1) → All org patients (klinisyen "add to my panel" path için)
       d. PolicyEngine filter (defense in depth)
       e. Return ranked results (max 25 per request, "Load more" CTA)
    4. Frontend:
       a. Render results with match-highlight
       b. Click result → patient quick-card preview modal → "Open Chart" CTA
       c. Audit log: patient_searched { query_hash, scope, result_count }
       d. Save to search history (local cache, last 10)

4.4 Quick Action Flows
----------------------

### 4.4.1 Mobile Quick Action --- \"Call Patient\"

    1. User taps "Call" on patient quick-card
    2. Modal: "Call [Patient Display Name] at +1-XXX-XXX-1234?"
    3. Confirm → tel: URI launch → OS native phone app
    4. Audit log: patient_called { practitioner_role_id, patient_id, initiated_from: worklist }

### 4.4.2 Mobile Quick Action --- \"Quick Note Draft\"

    1. User taps "Quick Note" on patient quick-card
    2. Modal: minimal note entry (text area, optional attach)
    3. "Save Draft" → Note created with status=draft, owner_role_id
    4. Drift Doc 7'ye (signing requires T3 re-auth in Doc 7 flow)
    5. Audit log: note_drafted { practitioner_role_id, patient_id, note_id, initiated_from: worklist }

### 4.4.3 Web Quick Action --- \"Sign Pending Notes\"

    1. User clicks "Sign Pending Notes (3)" badge on patient quick-card
    2. Drift to Doc 7 batch signing flow
    3. T3 re-auth challenge (Doc 2 §4.3) → biometric/PIN
    4. Each note signed; audit log per note

### 4.4.4 Mobile Quick Action --- \"Mark Task Complete\"

    1. User swipes-left on task row (mobile) / clicks checkmark (web)
    2. Optional: brief completion note modal (free-text 200 chars)
    3. Confirm → Task.status = completed, completed_at = now
    4. Audit log: task_completed { practitioner_role_id, patient_id, task_id, with_note: bool }
    5. Worklist refresh (item removed from "today" view, archived in Patient 360 history)

4.5 Real-Time Notification Badge Flow
-------------------------------------

    1. Klinisyen worklist loaded → WebSocket connection established to /ws/worklist/{practitioner_role_id}
    2. Backend events relevant to this practitioner_role_id push to socket:
       - new_message_from_patient { patient_id, message_id, sent_at }
       - new_lab_result_available { patient_id, lab_id }
       - new_family_question { patient_id, question_id }
       - care_team_alert { patient_id, alert_type, severity }
       - task_reassigned_to_me { task_id, from_role_id }
    3. Frontend updates per-patient badge + top-level badge
    4. Smooth animation (no jarring reflow)
    5. Click badge → Notification Center (Doc 10) filtered by patient + source
    6. WebSocket disconnect (network failure) → polling fallback every 15s
    7. Reconnect: replay missed events via since_timestamp query

4.6 Org Context Switch Flow
---------------------------

(Doc 1/2 baseline; Doc 3 specific behavior)

    1. Klinisyen header dropdown'da farklı org seçer
    2. Confirmation modal if unsaved drafts in current context (Doc 1 §4.6)
    3. Frontend: invalidate current worklist + roster cache
    4. New context: refetch worklist + roster
    5. Active org context updated; audit log: org_context_switched (Doc 2)
    6. Worklist + roster render new org's patients only (RLS enforce)

4.7 Edge Case Flow --- Consent Revoke Mid-Session
-------------------------------------------------

    1. Klinisyen worklist'inde patient X görüyor (consent active)
    2. Patient (Patient App'te) Dr. X'in consent'ini revoke ediyor (Doc 10 patient-side action)
    3. Backend ConsentGrant.active = false; webhook fires
    4. WebSocket push to Dr. X's session: patient_consent_revoked { patient_id }
    5. Frontend:
       a. Worklist'te patient X soluk renkli (gri) + "Consent revoked" badge animasyonu
       b. 5 saniye sonra item kaybolur
       c. Eğer Dr. X şu an Patient X'in Patient 360'unda → "Access lost: Consent revoked" modal → exit to worklist
       d. In-flight drafts: preserved in DRAFT state, "View only" mode; no new write
    6. Audit log: patient_panel_removed_due_to_consent_revoke { practitioner_role_id, patient_id, revoked_at }

4.8 Mermaid Akış Diyagramı
--------------------------

### Worklist Load Flow

    flowchart TD
      A[Login Home / Manual Nav] --> B[Frontend: GET /worklist]
      B --> C[Backend: Auth + Session Validate]
      C --> D[Active PractitionerRole + Org Context]
      D --> E[Query Tasks + Notes + Orders + Labs + Consults]
      E --> F[For Each Item: Patient Fetch]
      F --> G[PolicyEngine Batch Evaluate]
      G --> G1{Consent + Care Team OK?}
      G1 -->|Yes| H[Include in Result]
      G1 -->|No| G2[Filter Out + Audit Log]
      H --> I[Smart Sort: Overdue→DueTime→Acuity→Alpha]
      I --> J[Cursor Pagination: First 50]
      J --> K[Return Result]
      K --> L[Frontend Render List + Quick-Cards]
      L --> M[WebSocket Subscribe Updates]
      M --> N[Audit Log: worklist_loaded]

### Search Flow

    flowchart TD
      A[User Types Query] --> B[Debounce 300ms]
      B --> C[Frontend: GET /search]
      C --> D[Backend: Auth + Session]
      D --> E[PG FTS / Elasticsearch Query]
      E --> F[Scope: my_panel ∩ Org Context]
      F --> G[PolicyEngine Filter Defense]
      G --> H[Ranked Results, Max 25]
      H --> I[Return]
      I --> J[Frontend: Highlighted Results]
      J --> K[User Clicks Result]
      K --> L[Quick-Card Preview Modal]
      L --> M{User Decision}
      M -->|Open Chart| N[Drift to Patient 360 - Doc 4]
      M -->|Cancel| O[Back to Search]
      J --> P[Save to Search History Local]

4.9 Kritik Akış Kuralları
-------------------------

-   **Worklist consent enforcement at render**: PolicyEngine.evaluate
    her item için; cache (5s TTL) ile performance optimization. Cache
    miss veya new patient → fresh evaluate.
-   **WebSocket connection persistence**: Mobile background → connection
    drop → reconnect on foreground; polling fallback at 15s if WebSocket
    fails.
-   **Search privacy strict**: Klinisyenin görme yetkisi olmadığı hasta
    search\'te de gözükmez (no \"this patient exists\" leak).
-   **Audit log batching for high-volume**: Worklist load = N adet
    `patient_record_viewed` event yerine 1 adet
    `worklist_loaded { patient_ids[] }` event (aggregated, info
    severity).
-   **Per-clinical-action audit**: T3+ actions (sign, order) detailed
    audit (Doc 2 schema).
-   **Quick action → drift**: Worklist tetikler ama actual action Doc
    6/7/8/9\'da gerçekleşir; Doc 3 yalnızca entry point.
-   **Multi-org context switch invalidates cache**: Current org\'s
    worklist + roster cache cleared; fresh fetch in new context.
-   **Real-time consent revoke handling**: Patient revoke → WebSocket
    push → frontend graceful removal with animation + drafts preserved
    read-only.
-   **Search history local-only**: PIPEDA privacy; search history NOT
    synced to backend or other devices.
-   **Empty state CTAs role-aware**: \"No patients\" CTA \"Wait for
    patient consent / contact org admin\" for RN; \"Add patient via
    referral\" for MRP; \"Verification pending\" for unverified
    clinician.

5. Ekran/Yüzey Spesifikasyonları
================================

HCP\_WORKLIST\_MOBILE --- Mobile Worklist
-----------------------------------------

  HCP\_WORKLIST\_MOBILE --- Mobile Worklist
  -----------------------------------------------------------------------------------------------------------------------------------------------------
  **UI Pattern:** Full-screen; bottom tab nav (Worklist active); top header with org context dropdown + search icon + filter icon + notification bell
  **Header:** Display name + acuity legend mini-icon
  **Sub-header:** Date label (e.g., \"Today, Friday, May 29, 2026\") + scope toggle pill (Today / This Week / Custom)
  **Sort dropdown:** Smart Sort (default) / Due Time / Acuity / Patient Name / Last Visit
  **Filter chip row:** Discipline-filter (e.g., \"Wound Care\" for RN), Acuity (High/Med/Low), Status filter chips
  **List item:** Patient quick-card (see HCP\_PATIENT\_QUICK\_CARD) --- swipe-left for quick actions
  **Empty state:** Icon + role-appropriate message + CTA
  **Pull-to-refresh:** Refresh worklist + WebSocket reconnect
  **Floating action button (V1):** \"+\" Add quick task
  **Analytics:** `worklist_view { item_count, scope, sort_method, filter_state }`

HCP\_WORKLIST\_WEB --- Web Worklist
-----------------------------------

  HCP\_WORKLIST\_WEB --- Web Worklist
  -----------------------------------------------------------------------------------------------------------------------------------------------
  **UI Pattern:** Multi-panel --- Left panel (Worklist), Right panel (Patient 360 preview when item selected)
  **Top nav:** Sinalytix logo + Worklist (active) / Roster / Settings + Org context dropdown + Search bar + Notification bell + Profile
  **Worklist panel header:** Date label + scope toggle + sort dropdown + filter sidebar toggle
  **Filter sidebar (collapsible):** All filters in one panel --- acuity, due-time range, conditions, insurance, custom date
  **List items:** Same quick-card content as mobile, more horizontal space --- multi-column (Patient / Task type / Due / Acuity / Quick action)
  **Selection:** Click row → right panel loads Patient 360 preview (Doc 4 reference)
  **Keyboard shortcuts:** J/K navigate, Enter open chart, S sign, O order, M message
  **Multi-select (V1):** Checkbox column for bulk actions
  **Analytics:** `worklist_view { ...same as mobile..., platform: web, layout: multi_panel }`

HCP\_PATIENT\_QUICK\_CARD --- Patient Quick-Card Component
----------------------------------------------------------

  HCP\_PATIENT\_QUICK\_CARD --- Quick-Card
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **UI Pattern:** Card with rows; horizontal layout web, vertical mobile
  **Row 1:** Patient avatar (photo or initials) + Name + Age + Gender + Primary condition tag
  **Row 2:** Last visit \"Last visit: \[Date\] (\[X days ago\])\" + Acuity tag (color-coded: red/amber/green/none)
  **Row 3:** Action item summary \"\[Task type\]: \[Description\]\" --- e.g., \"Visit due: 14:00 home care visit\"
  **Row 4 (notification badges):** Unread messages (X) + New labs (X) + Family questions (X) + Alerts (X)
  **Quick action area:**
  \- Mobile: swipe-left reveals 3 actions \[Call\] \[Message\] \[Note\]
  \- Web: hover reveals action icon row \[Open Chart\] \[Sign\] \[Order\] \[Message\] \[Reassign\]
  **Click behavior:** Tap card → drift to Patient 360 (Doc 4); on web also pre-loads in right panel
  **Sensitivity:** Mental health, HIV, gender identity diagnoses NOT shown in quick-card; \"Sensitive history present\" badge instead with consent-aware reveal in Patient 360
  **Accessibility:** Screen reader announces full content; action buttons individual labels

HCP\_WORKLIST\_FILTER\_MODAL --- Filter Modal (Mobile)
------------------------------------------------------

  HCP\_WORKLIST\_FILTER\_MODAL --- Filter Modal
  ---------------------------------------------------------------------------------------------------------------------
  **UI Pattern:** Bottom sheet (mobile) / Sidebar (web)
  **Sections:**
  1\. Time scope (radio): Today / This Week / Custom date range (date picker)
  2\. Acuity (multi-select chips): High / Medium / Low / None
  3\. Task type (multi-select chips): Visit / Note signing / Order verification / Lab review / Consultation / Message
  4\. Discipline-specific (RBV-aware): \"Wound care\" (RN), \"Mobility\" (PT), etc.
  5\. SLA: All / SLA met / SLA breach
  6\. Conditions (autosuggest input): SNOMED CT condition codes
  **CTAs:** Apply / Clear All
  **State preservation:** Filter state local cache between sessions
  **V1:** \"Save as View\" CTA at bottom

HCP\_ROSTER\_MOBILE --- Mobile Roster
-------------------------------------

  HCP\_ROSTER\_MOBILE --- Mobile Roster
  --------------------------------------------------------------------------------------------------------------------------------
  **UI Pattern:** Full-screen; bottom tab nav (Roster active)
  **Header:** Search bar prominent + filter icon
  **Sub-header:** Sort dropdown (Name / Next visit / Last visit / Acuity / Care plan progress) + Active filter chip count
  **List:** Patient cards (similar to quick-card but emphasizes panel context --- next visit date prominent)
  **Filter modal:** Same as Worklist filter modal + additional roster filters (Last visit \> N days, Open tasks \> 0)
  **Empty state:** \"No patients in your panel\" + role-aware CTA
  **Panel size warning:** If panel \> 100 patients + no filters applied: \"Showing 100 of N patients. Apply filters to narrow.\"
  **Analytics:** `roster_view { patient_count, filter_state, sort_method }`

HCP\_ROSTER\_WEB --- Web Roster
-------------------------------

  HCP\_ROSTER\_WEB --- Web Roster
  -----------------------------------------------------------------------------------------------------------------------------------
  **UI Pattern:** 3-column --- Left filter sidebar (collapsible), Center patient list, Right patient preview pane (Doc 4 reference)
  **List view:** Table-style (Name / Age / Conditions / Last visit / Next visit / Acuity / Open tasks) + sortable columns
  **Bulk actions (V1):** Multi-select → \"Export to CSV\" / \"Send broadcast message\"
  **Export (V1):** Roster CSV/PDF (audit-logged)
  **Analytics:** `roster_view { ...same..., platform: web, layout: 3_column }`

HCP\_SEARCH\_RESULTS --- Search Results
---------------------------------------

  HCP\_SEARCH\_RESULTS --- Search Results
  ------------------------------------------------------------------------------------------------------------------
  **Trigger:** Search bar query (worklist or roster)
  **UI Pattern:** Dropdown panel (mobile fullscreen, web overlay) below search input
  **Result groupings:**
  \- Patients (up to 10): name + age + DOB + primary condition
  \- Conditions (up to 5): SNOMED CT match + count of patients with this condition
  \- Care plan goals (up to 5): goal text + patient + relevance
  \- Documents (up to 5, V1+): document title + patient + date
  **Match highlighting:** Query terms bolded in results
  **\"No results\" state:** \"No patients in your panel match \'\[query\]\'. Try broader terms or check filters.\"
  **Search scope toggle (V1):** \"My Panel\" / \"Current Org\"
  **Recent searches:** Last 10 (local) --- shown when search bar empty
  **Analytics:** `search_performed { query_hash, scope, result_count, result_types }`

HCP\_WORKLIST\_EMPTY\_STATE --- Empty State Variants
----------------------------------------------------

  Variant                                    Trigger                                                          Message + CTA
  ------------------------------------------ ---------------------------------------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **No verified status**                     Clinician verification pending                                   \"Your account is being verified. Once approved, your worklist will appear here.\" → CTA \"Check verification status\" → Settings
  **No patients granted**                    Verified but no CareTeamMembership + ConsentGrant intersection   \"No patients in your panel yet. Once patients grant you access or your organization assigns you to a care team, they\'ll appear here.\" → CTA \"Learn more\" → Help docs
  **No tasks today**                         Patients in panel but no today\'s tasks                          \"All caught up! No tasks for today. Check Roster for patient panel or expand scope to This Week.\" → CTA \"View Roster\" / \"This Week\"
  **Org context switch --- empty new org**   Switched to org with no current items                            \"No items in \[Org Name\]. Try another organization or your panel.\" → CTA \"Switch org\"
  **Network/Backend down**                   Connection issue                                                 \"Can\'t load worklist. Check connection.\" → CTA \"Retry\" + cached offline view if available

6. Veri Modeli
==============

6.1 Worklist Schema (Virtual --- Query Driven)
----------------------------------------------

Worklist persistent table değildir; query-driven virtual view\'dur.
Backing tables:

### Task (Doc 9 owner --- Doc 3 read)

  Alan                                   Tip         Notlar
  -------------------------------------- ----------- -----------------------------------------------------------------------------------------------------------------------
  task\_id                               uuid        Primary key
  task\_type                             enum        visit \| note\_signing \| order\_verification \| lab\_review \| consultation\_response \| medication\_admin \| custom
  patient\_id                            uuid        FK → Patient
  assigned\_to\_practitioner\_role\_id   uuid        FK → PractitionerRole
  created\_by\_role\_id                  uuid        ---
  due\_at                                timestamp   ---
  acuity                                 enum        high \| medium \| low \| none
  status                                 enum        pending \| in\_progress \| completed \| canceled \| reassigned
  completion\_note                       text        Optional; on complete
  completed\_at                          timestamp   ---
  reassigned\_to\_role\_id               uuid        If reassigned
  sla\_target\_at                        timestamp   If SLA-bound
  sla\_breach\_at                        timestamp   Computed
  org\_id                                uuid        FK → Organization (RLS)
  created\_at                            timestamp   ---
  description                            text        Free-text

### PendingNote (Doc 7 reference)

Worklist\'te \"Sign Note\" item olarak görünür.

### PendingOrder (Doc 8 reference)

Worklist\'te \"Verify Order\" item olarak görünür.

### NewLabResult (Doc 5 reference)

Worklist\'te \"Review Lab Result\" item olarak görünür; notify\_role\_id
field\'i ile.

### PendingConsultation (Doc 9 reference)

Worklist\'te \"Respond to Consult\" item olarak görünür.

### CareTeamMembership (Doc 9 read-only reference)

> [RECONCILED: A7] `CareTeamMembership` has a **single definition owner: HCP Doc 9** (or it is derived from FHIR `CareTeam.participant`). Doc 3 only **references** it (e.g. the roster INTERSECT query above); the columns below are a read-only reference shape, not an independent definition.

  Alan                         Tip         Notlar
  ---------------------------- ----------- --------------------------------------------------------------------------------------
  care\_team\_membership\_id   uuid        Primary key
  patient\_id                  uuid        FK → Patient
  practitioner\_role\_id       uuid        FK → PractitionerRole
  role\_in\_team               enum        care\_coordinator \| mrp \| consulting\_specialist \| allied\_health \| direct\_care
  active                       boolean     ---
  period\_start                timestamp   ---
  period\_end                  timestamp   Null if active
  added\_by                    uuid        FK → PractitionerRole or AdminUser

### ConsentGrant (Doc 10 read-only reference)

> [RECONCILED: B2] Canonical consent shape = Doc 10 `consent_grants` (per-category rows: `data_category` + `target_type` + permit/deny, default-deny). The per-role boolean `scope` map shown here (Doc 3) is a **DERIVED read-only VIEW** over those rows, NOT a separate definition. Additionally, an immutable patient legal `ConsentRecord` (Dictionary §2 — ToS/privacy/`ack_ai_processing`, append-only 7y) exists alongside the FHIR `Consent` resource; the two layers are distinct.

  Alan                                  Tip         Notlar
  ------------------------------------- ----------- -----------------------------------------------------------------------------------------------------------
  consent\_grant\_id                    uuid        Primary key
  patient\_id                           uuid        FK → Patient
  granted\_to\_practitioner\_role\_id   uuid        FK → PractitionerRole
  scope                                 jsonb       { patient\_record\_read: bool, medications: bool, labs: bool, mental\_health: bool, genetic: bool, \... }
  active                                boolean     ---
  granted\_at                           timestamp   ---
  expires\_at                           timestamp   Null if ongoing
  revoked\_at                           timestamp   Null if active
  revoke\_reason                        text        Optional patient-provided

6.2 Patient Quick-Card Data Model
---------------------------------

Worklist + roster\'da görünür subset. PolicyEngine + consent scope ile
filtered.

    interface PatientQuickCard {
      patient_id: string;
      display_name: string;  // "[First initial]. [Last name]" or full per consent
      age: number;
      gender_display: string;  // patient-stated; locale-aware
      photo_url?: string;  // if patient uploaded + consent
      primary_condition_tag: string;  // Most prominent active Condition.code display
      last_visit_at?: string;  // ISO8601
      next_planned_visit_at?: string;  // From scheduled visits Doc 9
      acuity_tag?: "high" | "medium" | "low" | "none";  // V1: interRAI MAPLe-derived
      notification_badges: {
        unread_messages: number;
        new_labs: number;
        family_questions: number;
        care_team_alerts: number;
      };
      has_sensitive_history: boolean;  // Mental health / HIV / gender identity present but masked
      active_consents: {
        patient_record_read: boolean;
        medications: boolean;
        labs: boolean;
      };
      org_id: string;  // For multi-org clarity
    }

6.3 WorklistPreference (User Customization)
-------------------------------------------

  Alan                           Tip         Notlar
  ------------------------------ ----------- --------------------------------------------------------------
  user\_id                       uuid        PK = FK → User
  default\_scope                 enum        today\_plus\_overdue \| today\_only \| this\_week
  default\_sort                  enum        smart \| due\_time \| acuity \| patient\_name \| last\_visit
  filter\_presets                jsonb       { acuity: \[\...\], conditions: \[\...\], \... }
  saved\_views                   jsonb       V1 --- array of { name, filter\_state, sort }
  notification\_badge\_enabled   bool        Default true
  quick\_action\_order           jsonb       V1 --- customizable quick action order on quick-card
  updated\_at                    timestamp   ---

6.4 Search Index (PG FTS MVP / Elasticsearch V1)
------------------------------------------------

**MVP PostgreSQL Full-Text Search:**

    -- Indexed columns
    CREATE INDEX patient_fts_idx ON Patient USING GIN (
      to_tsvector('english',
        coalesce(display_name, '') || ' ' ||
        coalesce(health_card_number, '') || ' ' ||
        coalesce(phone, '')
      )
    );

    CREATE INDEX condition_fts_idx ON Condition USING GIN (
      to_tsvector('english',
        coalesce(code_display, '') || ' ' ||
        coalesce(notes, '')
      )
    );

    CREATE INDEX care_plan_goal_fts_idx ON CarePlanGoal USING GIN (
      to_tsvector('english', goal_description)
    );

    -- Query example:
    SELECT * FROM Patient
    WHERE to_tsvector('english', display_name || ' ' || health_card_number)
          @@ plainto_tsquery('english', $1)
      AND id IN (subquery: Care Team ∩ Consent)
    LIMIT 25;

**V1 Elasticsearch:**

-   Better ranking, fuzzy matching, synonym expansion
-   Patient index, Condition index, Document content index (Tier 4 OCR)
-   Tenant isolation via index pattern: `patients-{org_id}`
-   Reindex jobs nightly

6.5 Cache Layer
---------------

  Cache Item                                               TTL                                     Storage
  -------------------------------------------------------- --------------------------------------- ----------------------------------------------
  Worklist render (per practitioner\_role + org context)   30s                                     Redis
  PolicyEngine evaluate decisions                          5s                                      Redis
  Patient quick-card data                                  60s                                     Redis
  WorklistPreference                                       session                                 App memory + Redis fallback
  Search history (last 10)                                 session                                 Local (mobile Keychain / web sessionStorage)
  Notification badge counts                                Real-time push + 15s polling fallback   Redis + WebSocket

6.6 Audit Log Events (Doc 3 --- Subset of Canonical)
----------------------------------------------------

  Event Type                                      Category   Severity   Trigger
  ----------------------------------------------- ---------- ---------- -------------------------------
  `worklist_loaded`                               clinical   info       Worklist render
  `roster_loaded`                                 clinical   info       Roster render
  `patient_searched`                              clinical   info       Search query
  `worklist_item_clicked`                         clinical   info       Drift to Patient 360
  `task_completed`                                clinical   info       Quick action mark complete
  `task_reassigned`                               clinical   info       Reassign to another role
  `worklist_scope_changed`                        clinical   info       User changes scope toggle
  `worklist_sort_changed`                         clinical   info       User changes sort
  `worklist_filter_applied`                       clinical   info       User applies filter
  `roster_export`                                 clinical   warning    V1 --- Export to CSV/PDF
  `patient_panel_removed_due_to_consent_revoke`   consent    warning    Real-time revoke
  `quick_action_initiated`                        clinical   info       Mobile call/message/note/etc.

`patient_record_viewed` (Patient 360 entry) Doc 4 audit event\'idir ---
Doc 3 worklist click drift\'inden tetiklenir.

7. Hata Durumları ve Edge Case\'ler
===================================

  Senaryo                                                         Kullanıcıya Gösterilen                                                     Sistem Davranışı
  --------------------------------------------------------------- -------------------------------------------------------------------------- --------------------------------------------------------------------------------------
  Worklist load fails (backend down)                              \"Can\'t load worklist. Check connection.\" + Retry CTA                    Cached worklist offline read-only view shown if available; retry exponential backoff
  PolicyEngine evaluate returns deny mid-render                   (Item silently filtered)                                                   Audit log + item not shown; if all items filtered → empty state with explanation
  WebSocket disconnect                                            (No visible UI change)                                                     Polling fallback 15s; reconnect on network restore
  Consent revoke mid-session                                      \"Patient consent revoked\" badge → 5s animation → item removed            Doc 3 §4.7 flow
  Care team membership ended mid-session                          (Same as consent revoke)                                                   Item filtered next render
  Org context switch error                                        \"Couldn\'t switch organization. Try again.\"                              Revert to previous context; audit log
  Search query \>500 chars                                        \"Query too long. Try shorter search.\"                                    Inline validation
  Search no results                                               \"No patients in your panel match. Try broader terms or check filters.\"   Render no-results state
  Search rate limited (20+ queries/min)                           (No visible --- silent throttling)                                         Backend rate limits; results may be cached / delayed
  Quick action \"Call Patient\" --- no phone in record            \"No phone number on file for this patient.\"                              Block call; suggest \"Add phone\" → Doc 4 patient profile edit
  Quick action \"Message Patient\" --- no consent for messaging   \"Patient has not granted messaging consent.\"                             Block; show consent request CTA
  Mark Task Complete --- task already completed (concurrent)      \"Task already completed by \[Other Clinician\].\"                         Refresh worklist; no double-complete
  Reassign Task --- recipient not in care team                    \"Recipient must be in patient\'s care team to receive task.\"             Block; care team management flow
  Infinite scroll cursor pagination error                         \"Loading more failed. Pull to retry.\"                                    Pull-to-refresh retry
  Roster panel \>500 patients (no filter)                         Warning banner \"Showing 100 of 547. Apply filters to narrow.\"            Force filter prompt
  Notification badge count overflow (\>99)                        \"99+\" display                                                            UI truncation
  Multi-org clinician without active context                      \"Select an organization to view your worklist.\"                          Force context picker modal
  Worklist auto-refresh during user scroll                        (Smooth --- no scroll jump)                                                Insert new items at top; scroll position preserved
  Search on health card number with provincial format mismatch    \"Health card not found. Check format (10 digits for OHIP).\"              Format guidance
  Sensitive condition reveal attempt without consent scope        \"Additional consent required to view mental health details.\"             Block; consent request flow
  Patient deleted from system (admin action)                      \"Patient record no longer available.\"                                    Filter from worklist; audit log

8. Kabul Kriterleri
===================

8.1 Fonksiyonel
---------------

-   Login sonrası klinisyenin worklist\'i 1.5s içinde (P95) render olur.
-   Worklist sadece (Care Team ∩ Active Consent) patient\'larını içerir.
-   Default scope = Today + Overdue.
-   Sort default = smart multi-factor; explicit sort dropdown override.
-   Multi-org clinician active org context\'inin patient\'larını görür;
    switch ile re-render.
-   Patient quick-card name + age + primary condition + last visit +
    acuity + notification badges görünür.
-   Mobile quick actions: Open Chart, Call, Message, Note, Mark
    Complete.
-   Web quick actions: Open Chart, Open Care Plan, Sign Notes, Place
    Order, Reassign, Reschedule.
-   Worklist scope toggle: Today / This Week / Custom date range.
-   Worklist filter: acuity, due-time, discipline, SLA breach, task
    type, conditions.
-   Roster search: name, health card \#, DOB, phone, conditions.
-   Roster filters: acuity, last visit, open tasks, conditions,
    insurance.
-   Infinite scroll cursor pagination (50 items per load).
-   Real-time WebSocket notification badge updates.
-   Empty state CTAs role-aware.
-   Mobile pull-to-refresh.
-   Keyboard shortcuts web: J/K nav, Enter open, S sign, O order, M
    message.
-   Worklist preferences saved per user (default scope, default sort).
-   Consent revoke mid-session: graceful removal with 5s animation +
    audit log.
-   Search results filtered by PolicyEngine + consent (no leak).
-   Org context switch invalidates worklist/roster cache.

8.2 Regülasyon / Güvenlik
-------------------------

-   Her worklist load = audit log `worklist_loaded` event (aggregated
    patient\_ids).
-   Search query hash audit\'lenir (plain query NOT stored for privacy).
-   Sensitive conditions (mental health, HIV, gender identity)
    quick-card\'da gösterilmez; Patient 360\'ta consent-aware reveal.
-   Patient consent revoke immediate effect (≤ 5s WebSocket push →
    client render removal).
-   Patient quick-card data PolicyEngine + RLS + Consent layered filter.
-   All multi-org context switches audited.
-   Roster export (V1) high-severity audit event.
-   Search history local-only (no backend sync; PIPEDA).
-   WebSocket connection authentication with session token (re-auth on
    token refresh).
-   7-year audit log retention enforced (Doc 2 baseline).
-   Worklist data residency Canada (Doc 2 RDS region).

8.3 Teknik / Performans
-----------------------

-   Worklist load ≤ 1.5s (P95) for ≤30 items.
-   Roster load ≤ 2.5s (P95) for ≤200 items.
-   Search results ≤ 500ms (P95) for typical query.
-   WebSocket badge update ≤ 500ms (P95).
-   PolicyEngine batch evaluate ≤ 200ms for 50 items.
-   Cache hit rate (worklist render): ≥ 70%.
-   Cache hit rate (PolicyEngine decisions): ≥ 85%.
-   Mobile offline cache ≤ 50MB.
-   Mobile scroll FPS ≥ 55fps with 50 items rendered.
-   Web table sort responsiveness ≤ 100ms for 200 items.
-   Server-side cursor pagination scales to 10K+ panel size.

9. Başarı Metrikleri
====================

9.1 Engagement Funnel
---------------------

  Metric                                         Hedef
  ---------------------------------------------- -------------------------------
  Daily Active Clinicians visiting Worklist      ≥ %85 of verified clinicians
  Average Worklist views per clinician per day   6-15 (saha) / 3-8 (chart day)
  Worklist → Patient 360 click-through rate      ≥ %60 of items
  Search bar usage per day per clinician         ≥ 2 queries
  Filter usage per day per clinician             ≥ 30% of sessions

9.2 Productivity Metrics
------------------------

  Metric                                                  Hedef
  ------------------------------------------------------- --------------------------------------
  Worklist task completion rate (today\'s tasks)          ≥ %75 by day end
  Average time-from-worklist-open-to-first-action         ≤ 90s
  Quick action usage (mobile saha): Call, Message, Note   ≥ 3 per visit
  Sign pending notes batch (web) per session              ≥ 5 notes when present
  Overdue task average age                                ≤ 24h (catch-up within next workday)

9.3 Search Metrics
------------------

  Metric                                       Hedef
  -------------------------------------------- ------------------------------------
  Search query success rate (result clicked)   ≥ %75
  Search-to-Patient 360 conversion             ≥ %60
  Search median latency                        ≤ 300ms
  Search \"no results\" rate                   ≤ %10 (high rate signals UX issue)

9.4 Notification Engagement
---------------------------

  Metric                                  Hedef
  --------------------------------------- ---------------
  Notification badge click-through rate   ≥ %45
  Time-to-acknowledge notification        ≤ 4h median
  Notification fatigue (mute rate)        ≤ %5
  Real-time badge delivery latency        ≤ 500ms (P95)

10. UX ve Tasarım Notları
=========================

10.1 Mobile-First Saha UX
-------------------------

-   **Glanceable**: Klinisyen telefonu eline alır, 3 saniyede \"ne
    yapmalıyım\" anlar.
-   **One-thumb operable**: Sol elini hasta için kullanıyor; sağ
    başparmağı kullanıyor.
-   **Swipe gestures**: Swipe-left for quick actions, pull-to-refresh,
    scroll smooth.
-   **Offline graceful**: Network kesilse de last-cached worklist
    görünür (read-only).
-   **High contrast saha**: Outdoor visibility; acuity colors WCAG AA
    contrast.

10.2 Web Chart Day UX
---------------------

-   **Keyboard-first**: Power users (MRP, chart day) hızlı tab+enter ile
    worklist\'i tarayıp action alır.
-   **Multi-panel parallel**: Sol worklist, sağ patient preview
    (split-pane) --- bir paneli seçince sağda preview.
-   **Bulk action support (V1)**: Multi-select + batch sign notes /
    batch reassign.
-   **Print-friendly (V1)**: Worklist + roster print stylesheet.

10.3 Cognitive Load Reduction
-----------------------------

-   **Smart sort default**: Klinisyen düşünmek zorunda kalmaz; sistem
    önerir.
-   **Filter chips not nested menus**: Single-tap apply.
-   **No more than 50 items on screen**: Beyond → pagination forces
    focus.
-   **Acuity color-coded**: Quick visual triage.
-   **Sensitive data masked**: PHI privacy + cognitive simplicity
    (irrelevant detail hidden).
-   **Empty states honest**: \"Why is this empty?\" → action-oriented
    message.

10.4 Accessibility (WCAG 2.1 AA)
--------------------------------

-   All quick-cards screen-reader navigable
-   Color not sole conveyor (acuity = color + text label)
-   Touch targets 44×44 minimum
-   Keyboard nav full coverage (no mouse required)
-   Focus indicators visible
-   Live regions for real-time updates (announced to screen reader)

10.5 Internationalization
-------------------------

-   All strings i18n (en, fr V1)
-   Date/time locale-aware (\"Today, May 29\" vs \"Aujourd\'hui, 29
    mai\")
-   Conditional formatting (RTL not yet supported MVP)
-   Phone numbers E.164 (international format)
-   Health card formats locale-aware (OHIP 10 digits vs others)

10.6 Animation + Feedback
-------------------------

-   Smooth list insertions (consent revoke, new task) with 300ms ease
-   Pull-to-refresh haptic (mobile)
-   Quick action confirmation toast (200ms slide-up)
-   Loading skeleton screens (no spinner blank)

11. Kullanıcı Senaryoları
=========================

Senaryo 1 --- Community RN Saha Günü
------------------------------------

Sarah RN, Bayshore home care, Toronto. 12 hasta ziyareti planlı.

-   07:30 --- Sarah app açar, biometric login. Mobile worklist render:
    12 visit + 3 overdue note signing + 2 lab review = 17 item.
-   Smart sort: 3 overdue note signing tepede (gecikmiş), sonra 12 visit
    due time\'a göre, sonra labs.
-   İlk visit Mr. Chen (saat 08:00). Quick card: name, 72y,
    \"Post-stroke recovery\", \"Last visit yesterday 09:15\", acuity
    orange (medium-high), no notification badges.
-   Sarah \"Call\" quick action → Mr. Chen\'i confirm eder. Drive to
    home.
-   08:00 --- Sarah\'da Mr. Chen home. App: tap quick-card → Patient 360
    (Doc 4) → vital sign capture, wound assessment.
-   08:25 --- Note draft → save → drift to Doc 7 → biometric T3 sign.
    Audit log.
-   Worklist refresh: Mr. Chen item disappears (completed); 16 item
    remain.
-   Gün boyunca 12 visit + 3 sign + 2 lab → all complete by 16:30.
-   17:00 --- Sarah end of day. Worklist: 1 overdue task (yarın için MDT
    prep). Schedule for tomorrow.

Senaryo 2 --- Family Physician Chart Day
----------------------------------------

Dr. Park, family physician, Toronto + community contracts. Wednesday
office day --- chart heavy.

-   09:00 --- Web login. Multi-org context: 3 orgs available. Picks
    \"Solo Practice\".
-   Worklist: 8 pending notes to sign, 5 lab results to review, 3
    consultation requests, 2 family questions.
-   Sort: smart (acuity-aware). Sign batch CTA \"Sign 8 notes\" → drift
    Doc 7 batch sign → T3 biometric each → 12 min complete.
-   09:30 --- Lab review: 5 items. Open chart pre-loads in right panel.
    Each lab → ack + brief note → drift Doc 5/7.
-   10:30 --- Consultation requests: cardiology follow-up question,
    pediatric referral question, geriatric medication review. Reply via
    Doc 9.
-   11:00 --- Family questions: 2 from adult children of elderly
    patients. Reply via Doc 9.
-   11:30 --- Switch context to \"Toronto Community Health\" → fresh
    worklist: 4 community patient items. Continue.
-   13:00 --- Lunch. Worklist auto-pauses idle timer warning.
-   14:00 --- Resume. Settings → Activity Log → review morning audit
    (curiosity).
-   16:00 --- Day end. Quick recap via worklist.

Senaryo 3 --- PT Solo Private Practice
--------------------------------------

Marcus Chen PT, Vancouver (V2 BC active) + Toronto satellite (V0 Ontario
active). MVP\'de sadece Ontario\'da clinical actions.

-   08:00 --- Login. Active org = \"Solo Practice\". Worklist: 6 home
    visits today (all Ontario patients).
-   Open chart for each visit pre-visit (review last week\'s progress).
-   Saha visit: mobile-primary. Wound progress photo + range-of-motion
    measurement → Patient 360 → discipline subplan update (Doc 6).
-   Each visit \~45 min including documentation.
-   15:00 --- Roster page: scan all 22 active panel patients. Filter
    \"Last visit \> 14 days\" → 3 patients flagged for outreach. Quick
    message CTA → Doc 9.
-   16:00 --- Day end. Tomorrow\'s worklist already preview (toggle
    \"Tomorrow\").

Senaryo 4 --- Care Coordinator Multi-Org
----------------------------------------

CC Lisa Kim, RN, Toronto Community Health (TCH) + Bayshore (V1 dual
employment). MVP\'de sadece TCH.

-   08:00 --- Login. Active org = TCH (only active in MVP).
-   Worklist: 5 care plan reviews (CC responsibility), 3 team task
    assignments, 8 patient status checks, 2 MDT prep tasks.
-   Care plan reviews: drift Doc 6 → master care plan view + update.
-   Team assignments: drift Doc 9 → assign visit to RN/PT/MSW team
    members.
-   Status checks: each patient → Patient 360 (Doc 4) → review last
    week\'s notes, lab results.
-   14:00 --- MDT meeting prep: open patient summary for 2 complex
    cases.
-   16:00 --- Roster review: scan TCH panel (45 patients) → flag 3
    patients for next week\'s review.

Senaryo 5 --- Aggressive Search Use Case
----------------------------------------

Dr. Park, MRP for 1500-patient panel. Patient name forgot but knows
it\'s \"John something, type 2 diabetes, last visit \~3 months ago\".

-   Worklist not relevant --- go to Roster page.
-   Search bar: \"John type 2 diabetes\" → 4 results.
-   Top result: \"John Smith, 67, T2DM, last visit 2026-02-18\" →
    match-highlighted \"John\", \"type 2 diabetes\".
-   Click result → quick-card preview modal → \"Open Chart\".
-   Patient 360 (Doc 4) → review.
-   Audit log:
    `patient_searched { query_hash, scope: my_panel, result_count: 4 }` +
    `worklist_item_clicked`.

Senaryo 6 --- Consent Revoke Mid-Session
----------------------------------------

RN Sarah seeing 12 visits. Mid-day, Patient \#6 (Mrs. Park) family
decides to switch home care provider --- revokes Sinalytix consent for
current org.

-   14:30 --- Mrs. Park\'ın daughter Patient App\'te (Doc 10) consent
    revoke.
-   14:30:02 --- Backend ConsentGrant.active=false; WebSocket push to
    Sarah\'s session.
-   Sarah\'s mobile worklist: Mrs. Park quick-card animates gray +
    \"Consent revoked\" badge → 5s later removed from list.
-   Sarah surprised --- taps \"Why?\" toast → modal: \"Patient/family
    revoked your access for this organization. To restore, request
    renewed consent through the Patient App.\"
-   Sarah continues with remaining 6 visits.
-   Audit log:
    `patient_panel_removed_due_to_consent_revoke { practitioner_role_id: Sarah, patient_id: Mrs.Park, revoked_at }`.

12. Açık Konular
================

  Konu                                                                                                 Durum       Sorumlu / Hedef
  ---------------------------------------------------------------------------------------------------- ----------- ---------------------------------
  **Aggressive search infra**: PG FTS MVP vs Elasticsearch hemen?                                      Açık        V0 launch öncesi infra decision
  **Elasticsearch tenant isolation pattern** (index-per-org) --- V1 migration plan                     Açık        V1
  Smart sort algorithm tuning (ML vs rule-based MVP)                                                   Açık        Pilot feedback + V1 enhancement
  Acuity tag source: clinician-assigned vs computed (interRAI MAPLe)                                   Açık        V1 interRAI integration
  Saved Views (filter+sort presets) V1 UX                                                              Açık        V1
  Worklist export to CSV/PDF V1 --- admin audit considerations                                         Açık        V1
  \"All Orgs Combined\" pseudo-view V1 --- UI design                                                   Açık        V1
  Worklist quick task add (standalone, not from care plan) V1                                          Açık        V1 Doc 9 dependency
  Multi-select bulk actions UX V1                                                                      Açık        V1
  Worklist email digest V1                                                                             Açık        V1 Doc 10
  Notification badge per-source taxonomy ratify (current: message, lab, family Q, alert)               Açık        Doc 10 alignment
  WebSocket connection reliability + reconnect strategy edge cases                                     Açık        V0 launch öncesi infra review
  Polling fallback granularity (15s) tuning                                                            Açık        Pilot feedback
  Search history sync option (privacy preferences) V1                                                  Açık        V1 user preference
  Cross-org search V1 (\"Current Org\" toggle)                                                         Açık        V1
  Document content search Tier 4 OCR --- indexing latency tolerance                                    Açık        V1 with Elasticsearch
  Mobile offline cache sync conflict resolution                                                        Açık        V1 offline write support
  Patient quick-card sensitive data masking edge cases (e.g., HIV patient on PrEP)                     Açık        Clinical review with PMR uzmanı
  Acuity color-coding accessibility (color-blind support)                                              Açık        UX accessibility review
  Empty state copy localization quality                                                                Açık        i18n review
  Worklist preference roaming (across devices)                                                         Açık        V1 user prefs sync
  Family question integration UX (Doc 10 ↔ Doc 3)                                                      Açık        Cross-doc review
  Saved searches V1                                                                                    Açık        V1
  Calendar integration V1 (Google Calendar / Outlook sync for visits)                                  Açık        V1 Doc 9
  Visit start basic timestamp (MVP, non-EVV) UI                                                        Açık        Doc 9 alignment
  Multi-tab same context constraint (web) V2 evolution                                                 Beklemede   V2 Doc 2
  Patient roster panel size warning threshold tuning (100 currently)                                   Açık        Pilot feedback
  Cross-app reconciliation: Worklist concept Patient/Caregiver/Family\'de yok --- confirmed HCP-only   Notlandı    Cross-app reconciliation pass
  Quick action \"Reassign Task\" recipient validation UX                                               Açık        Doc 9 alignment
  Worklist scope \"Custom date range\" UX (date picker mobile-friendly)                                Açık        UX review
  Notification real-time push performance under 10K concurrent connections                             Açık        Load testing pre-launch

*Sinalytix --- Gizli ve Özel. Doc 3 / 10 --- Healthcare Professional PRD
Serisi. Doc 1 + Doc 2 extension; Patient 360 (Doc 4) referansı için
entry point. Geliştirici ve klinik danışman referansı içindir.*

**Sonraki Doc**: Doc 4 --- Patient 360 Dashboard (web-primary
multi-panel deep view + mobile özet view).

Table of Contents {#table-of-contents-3 .TOC-Heading}
=================

SINALYTIX --- HEALTHCARE PROFESSIONAL APP
=========================================

Doc 4 --- Patient 360 Dashboard
-------------------------------

  Versiyon   Uygulama                                 Hedef Pazar               Platform                             Durum                              Tarih
  ---------- ---------------------------------------- ------------------------- ------------------------------------ ---------------------------------- ---------------
  V0 (MVP)   Healthcare Professional (Mobile + Web)   Kanada (Ontario odaklı)   React Native + React shared kernel   Taslak --- Geliştirici Referansı   29 Mayıs 2026

*Sinalytix --- Gizli ve Özel. Bu doküman geliştirici ve klinik danışman
referansı içindir.*

1. Bağlam ve Amaç
=================

1.1 Özelliğin Tanımı
--------------------

Patient 360 = **Sinalytix\'in en yoğun klinik karar destek yüzeyi**. Bir
hastanın tüm available PHI\'sini (consent + care team intersection ile
authorize edilmiş) tek bir derin view\'da toplar. Web-primary
(multi-panel chart review için); mobile özet view (saha günlük ihtiyaç
için).

Patient 360\'ın **temel sözü**:

-   Klinisyen 5 saniyede kritik safety bilgisini görür (allergies, DNR,
    care team)
-   30 saniyede tam clinical context\'i kavrar (problems, current meds,
    vitals trend, recent activity)
-   2 dakikada hastanın \"neredeyiz?\" hikayesini reconstruct eder

**Doc 4\'ün kapsam dışı tuttuğu** (drift\'ler):

-   Care plan authoring (Doc 6)
-   Note writing (Doc 7)
-   Order placement (Doc 8)
-   Messaging (Doc 9)
-   Consent management (Doc 10)
-   Document upload/verification queue (Doc 5)
-   Care team modification (Doc 9)

Patient 360 = **read + drift entry point**, write değil.

1.2 Giriş Noktaları
-------------------

  Giriş Noktası                   Tetikleyici                              Default Tab/Section
  ------------------------------- ---------------------------------------- -------------------------------------------------------------------------------
  **Worklist quick-card click**   Doc 3 worklist item tap                  Overview (mobile) / Web full view
  **Roster row click**            Doc 3 roster patient select              Same
  **Search result drift**         Doc 3 search drift                       Same
  **Notification drill-down**     Doc 10 notification → \"View patient\"   Relevant section pre-scrolled (lab → labs section, message → message context)
  **Direct URL (web)**            Bookmark / shared link (audit-logged)    Web full view
  **Care Plan back-link**         Doc 6 → \"Back to Patient\"              Care Plan summary section focused

1.3 Hedef Rol Matrisi
---------------------

  Discipline                         Patient 360 Birincil Kullanım
  ---------------------------------- -----------------------------------------------------------------------------------------------------------
  **MRP (Family Physician/NP)**      Comprehensive review --- problem list, med reconciliation, lab trends, multi-source data merge resolution
  **Care Coordinator (CC)**          Care plan summary derin, care team koordinasyonu, multi-disciplinary timeline
  **Consulting Specialist**          Focused --- kendi alanına yönelik labs, prior consult notes, MRP context
  **Allied Health (PT/OT/SLP/RD)**   Discipline-specific subplan + relevant observations (PT için mobility/ROM, OT için ADL, etc.)
  **RN/RPN (Direct Care)**           Active orders to execute, recent vitals, medication list (MAR detayı Doc 8), wound progression
  **MSW**                            Psychosocial assessment timeline, family/SDM info, community referrals

1.4 Ekosistem İçindeki Konum
----------------------------

  İlişki                 Doc                                  Doc 4\'ün Sağladığı / Kullandığı
  ---------------------- ------------------------------------ -----------------------------------------------------------------------------------------------------
  **Entry from Doc 3**   Worklist & Roster                    Quick-card click → Patient 360 full view
  **Uses Doc 2**         Auth/Session/PolicyEngine/Audit      PolicyEngine.evaluate her view\'da; audit `patient_record_viewed`; T3+ re-auth obligations
  **Reads Doc 5**        Health Data Ingestion                Tier 1-4 provenance metadata, document repository entries
  **Reads Doc 6**        Care Plan                            CarePlan summary block (read); drift to Doc 6 authoring
  **Reads Doc 7**        Clinical Documentation               Timeline note entries (read); drift to Doc 7 note authoring/signing
  **Reads Doc 8**        Orders & Rx                          Active orders/medications (read); drift to Doc 8 ordering
  **Reads Doc 9**        Communication, Visit, Care Team      Care team display (read); drift to messaging/visit/team mgmt
  **Reads Doc 10**       Consent + Notifications + Settings   Consent scope check; adherence data (Patient/Caregiver self-report); break-glass override flow (V1)

**Cross-app primitive uyum noktaları**:

-   **Patient resource** Patient App\'in own profile data\'sıyla shared.
    Reconciliation pass: Patient FHIR R4 + CA Core+ alignment (HCP Doc 4
    standard\'ı set ediyor).
-   **AllergyIntolerance, Condition, Observation, MedicationStatement**
    Patient app\'in self-recorded subset\'iyle merge edilir; provenance
    ayırt eder.
-   **Adherence data** Patient app + Caregiver app self-report cross-app
    primitive.
-   **Care team** Caregiver/Family/Patient app\'lerin de gördüğü; rol
    bazlı subset.

1.5 Regülasyon Çerçevesi
------------------------

**1. PHIPA s.10 --- Consent Enforcement per Render**

-   Patient 360 her render\'da PolicyEngine.evaluate çağrılır
    (action=read, resource=Patient).
-   Granular consent scopes per resource type: `patient_record_read`,
    `medications`, `labs`, `mental_health`, `genetic`, vb.
-   Klinisyen `mental_health` scope\'una sahip değilse mental health
    diagnoses section locked.

**2. PHIPA s.13 --- Audit Log**

-   Patient 360 entry: `patient_record_viewed` event (info severity).
-   Sensitive section expand: `sensitive_section_revealed` event
    (warning severity).
-   Break-glass override (V1): `break_glass_override_invoked` event
    (critical severity) + Sinalytix admin alert.

**3. Provincial College Documentation Standards**

-   Klinisyenin \"I viewed this patient\" eylemi audit\'lenir; CPSO
    Documentation Policy compliance.

**4. CPSO + RNAO Cognitive Load Considerations**

-   \"Excessive data entry/review\" %86.9 clinician complaint (Master
    Doc §4.2 referans). Patient 360 cognitive load minimize edilir:
    sensitive masked default, smart sort, collapsed sections.

2. Endüstri ve Klinik Bağlam
============================

2.1 EMR Patient Summary Patterns
--------------------------------

  Platform                            Pattern                                                                         Sinalytix Adopts/Differs
  ----------------------------------- ------------------------------------------------------------------------------- ----------------------------------------------------------------
  **Epic Snapshot**                   Single-page summary; problem list, meds, allergies, recent labs, vitals         Patient 360 baseline benzer; ek olarak cross-source provenance
  **Cerner Storyboard**               Left sidebar persistent context (allergies, alerts), right scrollable content   Web layout ilhamı; pinned header pattern
  **OSCAR eChart**                    Note-history + summary tabs                                                     Sade community pattern
  **PointClickCare Resident Chart**   LTC-focused; vitals trends prominent                                            Vitals strip importance referansı
  **AlayaCare Patient Profile**       Home care; care plan summary prominent                                          Care plan block placement ilhamı

**Sinalytix\'in pattern farkları**:

-   **Multi-source provenance display** --- hiçbir EMR yapmıyor
    (single-source assumption)
-   **Patient autonomy moat reflection** --- sensitive lockbox +
    consent-scope reveal her sectionda
-   **Cross-app care team display** --- care team
    Patient/Caregiver/Family ile shared, Patient 360\'ta tek noktada

2.2 Kanada Multi-Source PHI Reality
-----------------------------------

Bir hastanın PHI\'si genelde **4-7 farklı kaynakta** dağılmış:

-   Family physician EMR (Accuro/OSCAR/TELUS)
-   Hospital EMR (Epic/Cerner)
-   Home care agency (AlayaCare/PointClickCare)
-   Provincial portal (Health Gateway BC, MyChart, vb.)
-   Lab provider (LifeLabs/Dynacare own portals)
-   Patient self-recorded (Apple Health, Google Health)
-   Family-uploaded documents

Patient 360 bunların hepsinin **klinisyenin tek view\'unda toplanması**
--- Sinalytix\'in defansiyel moat\'ı (Master Doc §4.7).

2.3 Cognitive Load + Cross-Source Resolution
--------------------------------------------

Klinisyen aynı veri tipinin (örn. HbA1c) farklı kaynaklardan gelen
değerlerini gördüğünde:

-   Aynı zaman + aynı değer → otomatik dedupe (merge)
-   Aynı zaman + farklı değer → \"Discrepancy\" flag + her ikisi
    görünür + klinisyen decide
-   Farklı zaman → ayrı timeline entries

Sinalytix bu pattern\'ı yapısallaştırıyor; klinisyene \"neden iki sonuç
görüyorum?\" sorusunu cevaplamasını kolaylaştırıyor (provenance modal).

3. Kapsam ve Kısıtlar
=====================

3.1 V0 (MVP)
------------

**Header (always-visible, sticky on web; collapsible on mobile):**

-   Patient photo (consent-aware; default initials avatar) + Display
    Name + Age + Sex + Health Card \# (masked: \*\*\*\*1234)
-   Allergies badge (red, count + first 2 items; tap → full allergy list
    modal)
-   DNR/Goals of Care badge (yellow if set; \"Goals of Care:
    Comfort/Full Code/MRP-specified\")
-   Active Care Team (avatars row: CC, MRP, Consulting Specialists,
    Allied Health --- Doc 9 reference)
-   Insurance/Payer (OHIP active, private if any)
-   Quick action menu: Message Patient (Doc 9), Call Patient

**Body sections (default order, collapsible, expand-state persists per
user):**

1.  **Active Problem List** (FHIR Condition where clinicalStatus=active)
    --- code + display + onset + provenance badge
2.  **Current Medications** (FHIR MedicationStatement +
    MedicationRequest active) --- name + dose + frequency + adherence
    indicator + provenance
3.  **Vitals Strip** (Latest BP, HR, RR, SpO2, Temp, Weight; sparkline
    last 5-10 readings; ICU-style mini-chart)
4.  **Recent Activity Timeline** (last 30 days default; visits, lab
    results, document uploads, care team changes, consent events; filter
    by event type; provenance badge per entry)
5.  **Care Plan Summary Block** (active goals count + per-goal progress
    bar + last update + \"Open Care Plan\" CTA → Doc 6)

**Cross-source data merge:**

-   Same clinical entity (lab, medication, condition) from multiple
    sources → merged single entry
-   Each entry shows multi-source provenance badges (tap → detail modal)
-   Discrepancy (same entity, conflicting value) → \"Discrepancy\"
    flag + both visible + klinisyen decides

**Sensitive data lockbox (PHIPA-compliant):**

-   Mental health diagnoses, HIV status, gender identity history,
    genetic data → default hidden
-   \"Sensitive history present --- additional consent required\" badge
    per section
-   Tap → PolicyEngine consent scope check:
    -   Scope granted → expand inline + audit
        `sensitive_section_revealed`
    -   Scope not granted → \"Request expanded consent\" CTA → drift Doc
        10

**Provenance display per data point:**

-   Tier 1 (API-Direct EMR): ✓ EMR badge (green)
-   Tier 2 (EMR-Mediated provincial): ✓ Authority badge (green)
-   Tier 3 (Patient portal export): ↑ Patient Upload badge (blue)
-   Tier 4 (OCR/LLM): 📷 Verified OCR badge (amber if verified, gray if
    pending)
-   Tap badge → Provenance Detail Modal (source, timestamp, confidence,
    who verified)

**Mobile özet view (stacked tabs):**

-   Pinned header: photo + name + age + allergies + DNR + care team
    avatars
-   Tabs: Overview / Meds / Vitals / Timeline
-   Menu icon (top-right): Care Plan / Documents / Care Team Detail /
    Sensitive sections
-   Overview tab: problems summary (top 3 active) + last visit summary +
    next planned visit

**Quick actions from Patient 360 (drift to other Docs):**

-   Sign pending note (Doc 7) → T3 re-auth
-   Place lab/imaging order (Doc 8) → T3 re-auth
-   Write Rx (Doc 8) → T3 re-auth (T4 if controlled V1+)
-   Message Patient/Family (Doc 9)
-   Update Care Plan (Doc 6)
-   Add to Care Team (Doc 9)
-   Upload Document (Doc 5)
-   Request expanded consent (Doc 10)
-   Start Visit (Doc 9; basic timestamp MVP, EVV V2)

3.2 V1
------

-   **Lab trend graphs** (HbA1c, INR, eGFR, lipids --- common chronic
    markers)
-   **Imaging report viewer** (basic; PocketHealth integration V2)
-   **Smart abnormal flagging** (LOINC reference range; visual
    indicator)
-   **Cross-source data deduplication enhancements** (ML-based duplicate
    detection beyond exact match)
-   **Break-glass override flow** (emergency PHI access; mandatory
    justification + Sinalytix admin notification)
-   **AI-generated patient summary** (with disclaimer + verification
    banner)
-   **Patient summary print/export** (PDF for legal/forensic;
    audit-logged)
-   **Saved view filters** per discipline (cross-patient; Doc 3 saved
    views extension)
-   **Adherence indicator V1 --- pharmacy refill data** (Tier 2
    EMR-mediated for BC PharmaNet etc.)
-   **Risk flag dashboard** (using interRAI MAPLe + outcome data)
-   **Comparative views** (this patient vs panel average ---
    discipline-specific)

3.3 V2
------

-   **AI-driven CDS** (drug-drug interaction alerts using Health Canada
    DPD)
-   **Predictive risk indicators** (fall risk, readmission,
    deterioration)
-   **Patient 360 collaborative review** (multi-clinician simultaneous
    view with cursor presence --- MDT meeting tool)
-   **Voice navigation** (mobile/wearable hands-free for saha
    clinicians)
-   **Multi-tab same-patient (web)** (compare two time periods
    side-by-side)

3.4 V3 {#v3}
------

-   Cross-province aggregated view (BC PharmaNet + Alberta PIN + Quebec
    DSQ integration)
-   Indigenous community PHR integration

3.5 Constraints
---------------

-   **Patient 360 render = PolicyEngine evaluate** (consent + care team
    intersection check; \<500ms target).
-   **Sensitive sections default locked** --- never inadvertently
    revealed.
-   **Cross-source merge logic explicit** --- no silent data omission;
    discrepancies always flagged.
-   **Adherence data Patient/Caregiver self-report only MVP** --- no
    inferred adherence (avoids false signal).
-   **Vitals strip last 5-10 readings only inline** --- full history
    Timeline drill-down.
-   **Care Plan inline summary only** --- full editing Doc 6.
-   **Mobile özet tabs depth 1** --- no nested tabs.
-   **Break-glass V1+** (MVP\'de yok; consent revoked = drift \"Request
    consent\" CTA only).
-   **Multi-tenant RLS enforced** --- patient data per org context;
    switch org refresh.

3.6 Non-goals
-------------

-   Care plan editing UI (Doc 6)
-   Note writing/signing UI (Doc 7)
-   Order/Rx creation UI (Doc 8)
-   Messaging UI (Doc 9)
-   Consent management UI (Doc 10)
-   Document upload (Doc 5)
-   Patient profile editing --- read-only display only
-   Cross-patient analytics MVP (V1+)
-   Print/export MVP (V1+)
-   Real-time collaborative cursor presence MVP (V2)

4. Akışlar
==========

4.1 Patient 360 Load Flow
-------------------------

    1. User drifts from Worklist/Roster/Search → GET /api/v1/patient/{patient_id}/360
    2. Backend:
       a. Auth + session validate (Doc 2)
       b. Active PractitionerRole + org context
       c. PolicyEngine.evaluate({
            subject: practitioner_role,
            action: "read",
            resource: { type: "Patient", id: patient_id },
            context: { careTeamMembership, consent, orgContext, sessionDeviceTrust }
          })
       d. allow=false → 403 + "Access denied: [reason]" + suggest consent request
       e. allow=true → fetch:
          - Patient demographics
          - AllergyIntolerance (active)
          - Condition (active; sensitive flagged but data not loaded if scope absent)
          - MedicationStatement + MedicationRequest (active)
          - Observation (vitals — last 10 readings per type; labs in timeline scope)
          - CarePlan (active summary)
          - CareTeam (active members)
          - DocumentReference (last 30 day default)
          - ConsentScopes for this clinician (what's revealable)
          - AdherenceReport (Doc 10 cross-app fetch)
       f. Cross-source merge logic:
          - For each entity (lab, med, condition): collect from all Provenance-linked sources
          - Merge by (entity_code, datetime within ±15min, value match) → single entry, multi-provenance
          - Discrepancy: flag + preserve both
       g. Sensitive data filter:
          -- [RECONCILED: B5] Lockbox set = {mental_health, hiv_sti, gender_identity, substance_use}; substance_use enforced. genetic = "sensitive, non-lockbox (V2)", excluded from V0 lockbox.
          - For each Condition with sensitive_category (mental_health, hiv_sti, gender_identity, substance_use):
            - If clinician has consent scope → include with data
            - Else → include placeholder { sensitive_category, locked: true, count }
       h. Return Patient360 payload + ConsentScopes summary
    3. Frontend renders:
       a. Header (pinned)
       b. Body sections per default order
       c. Provenance badges per data point
       d. Sensitive lockbox indicators
       e. Care plan summary block
    4. Audit log: patient_record_viewed { patient_id, practitioner_role_id, org_id, sensitive_revealed: [], viewed_at }

4.2 Sensitive Data Reveal Flow
------------------------------

    1. Klinisyen "Sensitive history present — additional consent required" badge'a tap
    2. Frontend modal: "View [sensitive category] history requires additional patient consent.
       Current consent scope: [list]
       Required: [sensitive_category scope]
       [Request consent] [Cancel]"
    3. "Request consent" → drift Doc 10 consent request flow
    4. Hasta/SDM consent verirse → backend ConsentGrant.scope expanded
    5. Klinisyen Patient 360'a dönerse → section now expandable inline
    6. Audit log: sensitive_section_revealed { patient_id, practitioner_role_id, sensitive_category, consent_scope_granted_at }

    V1 Break-glass alternative:
    2. Modal'da "Break-glass override (emergency)" CTA
    3. Modal: "This will reveal sensitive data without patient consent. Justification required.
       Reason (free text 500 chars): [...]
       I acknowledge this access will be:
       [ ] Audited at critical severity
       [ ] Notified to Sinalytix Compliance team
       [ ] Reviewed within 48h
       [Continue]"
    4. T4 re-auth (Doc 2 §4.3)
    5. Audit log: break_glass_override_invoked { critical severity }
    6. Sinalytix admin notified; review queue

4.3 Cross-Source Data Merge Flow (per entity type)
--------------------------------------------------

    For Labs (FHIR Observation, category=laboratory):
      1. Group by (loinc_code, effectiveDateTime within ±15 min window)
      2. Within group, all sources collected:
         - Tier 1 (EMR direct via FHIR sync)
         - Tier 2 (provincial portal via EMR-mediated)
         - Tier 3 (patient-uploaded portal export)
         - Tier 4 (OCR/LLM verified)
      3. Merge logic:
         - All values match → single entry, multi-source badges
         - Values differ (e.g., LifeLabs HbA1c=7.2, EMR shows 7.4 same day) → entry shows both, "Discrepancy" flag
         - Patient-uploaded with verification missing → "Pending verification" + Tier 4 badge gray
      4. Render: most-recent first; provenance badges row

    For Medications:
      1. Group by (rxnorm_code OR drug_name fuzzy match)
      2. Source-by-source state:
         - EMR-reported as active
         - Patient-reported as still taking
         - Caregiver-reported as discontinued
      3. Resolution:
         - Last reported source wins; conflict flag if discordant
         - "Adherence" indicator from Patient/Caregiver self-report (Doc 10)
      4. Render: alphabetical; active first

    For Conditions:
      1. Group by (snomed_code OR icd10_code OR display fuzzy)
      2. Source-by-source onset + resolution dates
      3. Active filter: any source reports active
      4. Sensitive flag: if any source tags sensitive_category

    For Vitals:
      1. No merge by source (each reading independent)
      2. Sort by datetime; render last 10 per vital
      3. Provenance per reading

4.4 Mermaid --- Patient 360 Load + Sensitive Reveal
---------------------------------------------------

    flowchart TD
      A[User Drifts to Patient 360] --> B[Backend: PolicyEngine.evaluate Patient READ]
      B --> B1{Allow?}
      B1 -->|No| B2[403 + Consent Request CTA Suggestion]
      B1 -->|Yes| C[Fetch: Allergies + Conditions + Meds + Vitals + Timeline + Care Team + Care Plan]
      C --> D[Cross-Source Merge Per Entity]
      D --> E[Sensitive Filter: Lockbox Placeholders if Scope Missing]
      E --> F[Return Payload + Consent Scopes]
      F --> G[Frontend Render: Header + Body Sections]
      G --> H[Audit Log: patient_record_viewed]
      G --> I[User Tap Sensitive Section Badge]
      I --> J{Has Scope?}
      J -->|Yes| K[Expand Inline + Audit sensitive_section_revealed]
      J -->|No| L[Modal: Request Consent CTA - Drift Doc 10]
      L -->|V1 Optional| M[Break-Glass Modal + T4 Re-Auth + Critical Audit]

4.5 Kritik Akış Kuralları
-------------------------

-   **Every Patient 360 render** = PolicyEngine evaluate (cached 5s TTL
    Doc 2 pattern).
-   **Sensitive scope check per category** --- granular: mental\_health
    scope ≠ genetic scope.
-   **Cross-source merge transparent** --- klinisyen her zaman görür
    \"kaç source bu veriyi raporladı\".
-   **Discrepancy never hidden** --- patient safety \> UI temizliği.
-   **Adherence indicator clear source attribution** --- \"Patient
    self-reported 2 days ago\" tooltip.
-   **Break-glass NEVER silent** --- modal + justification + T4 + admin
    notification.
-   **Timeline event filter persists per user** --- session-scoped
    preference.
-   **Mobile tab state persists per patient** --- last viewed tab opens
    next time.
-   **Org context switch invalidates Patient 360 cache** --- fresh
    policy evaluate.
-   **Quick action drift preserves context** --- return-to-360
    breadcrumb maintained.

5. Ekran/Yüzey Spesifikasyonları
================================

HCP\_PATIENT\_360\_WEB --- Web Patient 360 (Full View)
------------------------------------------------------

  HCP\_PATIENT\_360\_WEB --- Web Patient 360
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  **UI Pattern:** 3-zone --- Header pinned sticky top + Body scrollable + Right panel quick actions (V1)
  **Header (sticky):** Photo + Name/Age/Sex + Health Card \# masked + Allergies badge + DNR/Goals badge + Care Team avatars row + Insurance + Quick action menu
  **Body sections (default order, collapsible):**
  1\. Active Problem List
  2\. Current Medications
  3\. Vitals Strip
  4\. Recent Activity Timeline (30d default + filter)
  5\. Care Plan Summary Block
  **Right rail (V1):** Recent labs panel, contextual quick actions
  **Keyboard shortcuts:** P=problems, M=meds, V=vitals, T=timeline, C=care plan
  **Section expand/collapse state** persists per user (WorklistPreference V1)
  **Print/export (V1):** Print stylesheet + PDF export CTA top-right
  **Analytics:** `patient_360_viewed { patient_id, source: worklist/roster/search/notification, sections_expanded[] }`

HCP\_PATIENT\_360\_HEADER --- Header Component
----------------------------------------------

  HCP\_PATIENT\_360\_HEADER --- Header
  ---------------------------------------------------------------------------------------------------------------------------------
  **Layout:** Horizontal row (web) / Vertical stack (mobile)
  **Photo:** Avatar 64x64 (web) / 48x48 (mobile); patient consent-aware (if patient\_photo\_share scope yoksa initials avatar)
  **Name:** \"\[First\] \[Last\]\" or \"\[First initial\]. \[Last\]\" per consent privacy preference
  **Demographics:** \"67 y/o Female\" or locale-appropriate
  **Health Card:** \"OHIP \*\*\*\*1234\" --- masked; tap reveals (T3 re-auth)
  **Allergies Badge:** Red pill \"⚠ 3 allergies\" --- tap → modal with full list (drug + reaction + severity)
  **DNR/Goals Badge:** Yellow \"⚠ Goals: Comfort\" or \"Full Code\" or empty if not set
  **Care Team Row:** Avatar circles with role tooltip (\"CC: Sarah RN\", \"MRP: Dr. Park\"); click → drift Doc 9
  **Insurance:** \"OHIP active\" (green) / \"OHIP + Private Sun Life\"
  **Quick Action Menu (•••):** Message, Call, Start Visit (basic timestamp), Upload Document, Request Consent, Print Summary (V1)
  **Sensitive flags icon:** Lock icon if sensitive sections locked + click drift to consent request

HCP\_PROVENANCE\_BADGE --- Provenance Badge Component
-----------------------------------------------------

  HCP\_PROVENANCE\_BADGE --- Provenance Badge
  ----------------------------------------------------------------------------------------------------------
  **Visual:** Small pill icon + tooltip on hover
  **Tier 1 (EMR API-Direct):** ✓ EMR (green) --- e.g., \"Via OSCAR Pro, May 15, 2026\"
  **Tier 2 (EMR-Mediated):** ✓ Authority (green) --- \"Via partner EMR from OLIS, May 14\"
  **Tier 3 (Patient Upload):** ↑ Patient (blue) --- \"Uploaded by patient from Health Gateway BC, May 10\"
  **Tier 4 verified (OCR/LLM):** 📷 OCR ✓ (amber) --- \"OCR/LLM extracted, verified by \[CC name\] May 8\"
  **Tier 4 pending:** 📷 OCR Pending (gray) --- \"OCR/LLM extracted, awaiting verification\"
  **Patient self-attested:** ⓘ Patient stated (blue dashed) --- \"Patient self-reported, no verification\"
  **Tap on badge:** Open Provenance Detail Modal

HCP\_PROVENANCE\_DETAIL\_MODAL --- Provenance Detail
----------------------------------------------------

  HCP\_PROVENANCE\_DETAIL\_MODAL --- Provenance Modal
  ------------------------------------------------------------------------------------------------------
  **Trigger:** Tap any provenance badge
  **Content:**
  \- Data point: \"\[Lab name\]: \[Value\] \[Unit\] on \[Date\]\"
  \- Source: \"\[Tier label\] --- \[Source platform\]\" (e.g., \"Tier 2 --- Via TELUS CHR from OLIS\")
  \- Timestamp: Source-attested vs ingested
  \- Confidence: high / medium / low (OCR/LLM only)
  \- Verified by: clinician name + timestamp (Tier 4 only)
  \- Original document link: View raw PDF/image (Tier 3/4 only)
  \- Discrepancy: If conflicting alternate values exist → list them with each source
  \- Action: \"Mark as primary\" (V1 --- clinician override for which source is canonical)

HCP\_ALLERGY\_LIST --- Allergy Section Modal
--------------------------------------------

  HCP\_ALLERGY\_LIST --- Allergies Detail
  ------------------------------------------------------------------------------------
  **Trigger:** Tap Allergies badge in header
  **Content (per allergy --- FHIR AllergyIntolerance):**
  \- Substance/drug name + RxNorm code
  \- Reaction (rash, anaphylaxis, etc.)
  \- Severity (mild / moderate / severe / life-threatening)
  \- Onset date
  \- Last verified date + clinician
  \- Provenance badge
  \- \"Update\" CTA (drift Doc 8 if Rx-related context)
  **Special:** Anaphylaxis history → red border + \"EpiPen on record\" if applicable

HCP\_MEDICATION\_LIST --- Medications Section
---------------------------------------------

  HCP\_MEDICATION\_LIST --- Current Medications
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Display per medication (FHIR MedicationStatement+Request):**
  \- Drug name + dose + frequency (e.g., \"Metformin 500mg PO BID\")
  \- Indication (\"for diabetes management\")
  \- Prescriber + Rx date + last refill
  \- Provenance badge(s)
  \- **Adherence indicator:** Green dot (taking as prescribed) / Yellow (missed some) / Red (not taking / out of meds) / Gray (no report) --- last reported \[N days ago\]; source = Patient self-report / Caregiver report
  \- Hover/tap → Detail Modal: full history, side effects reported (V1), drug interactions (V2)
  **Section header CTAs:** \"Reconcile medications\" (drift Doc 8 V1), \"Print medication list\" (V1)
  **Discontinued meds:** Collapsed by default; toggle to show

HCP\_VITALS\_STRIP --- Vitals Strip
-----------------------------------

  HCP\_VITALS\_STRIP --- Vitals Strip
  --------------------------------------------------------------------------------------
  **Layout:** Horizontal scrollable row (mobile) / Grid (web)
  **Per vital (BP, HR, RR, SpO2, Temp, Weight, BMI, BG if diabetic):**
  \- Latest value + unit + timestamp
  \- Mini sparkline (last 5-10 readings)
  \- Trend indicator (▲ rising / ▼ falling / ► stable)
  \- Abnormal flag (red if outside reference range --- V1)
  \- Tap → full trend graph modal (V1)
  **Empty state:** \"No vitals recorded yet\" + \"Add vitals\" CTA (drift Doc 9 visit)
  **Provenance:** Source badge per reading

HCP\_RECENT\_ACTIVITY\_TIMELINE --- Timeline Section
----------------------------------------------------

  HCP\_RECENT\_ACTIVITY\_TIMELINE --- Timeline
  -------------------------------------------------------------------------------------------------------------------
  **Scope toggle:** Last 30 days (default) / 90 days / 1 year / Lifetime
  **Event type filter chips:** Visits / Labs / Med changes / Documents / Care team changes / Consent events / Notes
  **Per timeline entry:**
  \- Date + Time (relative: \"2 days ago\" + absolute)
  \- Event icon (visit/lab/med/etc.)
  \- Title + summary (e.g., \"RN visit by Sarah Thompson --- wound assessment completed\")
  \- Provenance badge
  \- \"View details\" → drift to Doc 5 (document repository) / Doc 7 (note) / Doc 8 (order)
  **Sort:** Reverse chronological default
  **Infinite scroll:** Lazy load older entries (cursor pagination)
  **Empty state:** \"No activity in selected timeframe\"

HCP\_CARE\_PLAN\_SUMMARY\_BLOCK --- Care Plan Block
---------------------------------------------------

  HCP\_CARE\_PLAN\_SUMMARY\_BLOCK --- Care Plan Summary
  -------------------------------------------------------------------------------------------------
  **Has active plan:**
  \- Title: \"Care Plan --- \[Last updated: 3 days ago by Sarah RN\]\"
  \- Goals: \"3 active goals\"
  \- Goal 1: \[Title\] + mini progress bar (V1) + \"On track\" / \"At risk\" / \"Achieved\" badge
  \- Goal 2: \...
  \- Active activities: \"5 ongoing activities\" + brief list
  \- Periodicity: \"Visit every 2 days; assessment monthly\"
  \- \"Open Care Plan\" CTA → drift Doc 6
  **No active plan:**
  \- \"No active care plan\"
  \- \"Create care plan\" CTA (CC role-gated; PolicyEngine) → drift Doc 6
  **Discipline subplans:** Collapsible --- list of subplans with author + last update + status

HCP\_DATA\_DISCREPANCY\_FLAG --- Discrepancy Indicator
------------------------------------------------------

  HCP\_DATA\_DISCREPANCY\_FLAG --- Discrepancy
  ------------------------------------------------------------------------------------------------------------------------------------
  **Visual:** Orange triangle icon + text \"Discrepancy\"
  **Trigger:** Cross-source merge detects conflict
  **Example:** Lab HbA1c --- LifeLabs: 7.2%, EMR: 7.4% (same day, ±2h)
  **Tap:** Modal showing all sources + values + timestamps + provenance
  **Resolution options:** Mark one as primary (V1), Send to clinical review (V1), Acknowledge (default --- both visible in timeline)
  **Audit:** `data_discrepancy_acknowledged { patient_id, entity_type, resolution }`

HCP\_SENSITIVE\_REVEAL\_MODAL --- Sensitive Section Modal
---------------------------------------------------------

  HCP\_SENSITIVE\_REVEAL\_MODAL --- Sensitive Reveal
  --------------------------------------------------------------------------------------
  **Trigger:** Tap \"Sensitive history present --- additional consent required\" badge
  **Title:** \"Mental Health History\" (or HIV/Genetic/Gender Identity per category)
  **Body:**
  \- \"Viewing this section requires additional patient consent.\"
  \- Current scope: list of granted scopes
  \- Required: this scope name
  \- Why: brief PHIPA explanation
  **CTAs:**
  \- \"Request Consent\" → drift Doc 10 consent request flow
  \- \"Break-Glass Override (Emergency)\" (V1 only) → T4 re-auth + justification form
  \- \"Cancel\"
  **Audit (if break-glass):** critical severity

HCP\_PATIENT\_360\_MOBILE\_OVERVIEW --- Mobile Overview Tab
-----------------------------------------------------------

  HCP\_PATIENT\_360\_MOBILE\_OVERVIEW --- Mobile Overview
  -----------------------------------------------------------------------------------
  **Pinned header** (collapsible on scroll)
  **Overview content:**
  \- Top 3 active problems (one-line each) + \"See all\"
  \- Last visit summary card
  \- Next planned visit (if any)
  \- Care plan: \"3 goals --- 2 on track\" + \"Open\"
  **Bottom tabs:** Overview (active) / Meds / Vitals / Timeline
  **Top-right menu:** Care Plan / Documents / Care Team Detail / Sensitive Sections
  **Floating action:** Quick action drawer (sign / order / message / etc.)

HCP\_PATIENT\_360\_MOBILE\_MEDS --- Mobile Meds Tab
---------------------------------------------------

  HCP\_PATIENT\_360\_MOBILE\_MEDS --- Mobile Meds
  -------------------------------------------------------------------------------
  **Active medications list** (full list, vertical scroll)
  **Per row:** Drug + dose + frequency + adherence indicator + provenance badge
  **Tap row:** Detail Modal
  **Section toggle:** Active / Discontinued
  **CTA (top-right):** \"Reconcile\" (V1)

HCP\_PATIENT\_360\_MOBILE\_VITALS --- Mobile Vitals Tab
-------------------------------------------------------

  HCP\_PATIENT\_360\_MOBILE\_VITALS --- Mobile Vitals
  -----------------------------------------------------------
  **Vitals strip prominent** (latest per vital + sparkline)
  **Below: Add vitals** CTA (drift Doc 9 visit if active)
  **Tap sparkline:** Full trend graph (V1)

HCP\_PATIENT\_360\_MOBILE\_TIMELINE --- Mobile Timeline Tab
-----------------------------------------------------------

  HCP\_PATIENT\_360\_MOBILE\_TIMELINE --- Mobile Timeline
  ---------------------------------------------------------
  **Scope toggle + event-type filter chips** (top)
  **Vertical timeline** events list
  **Infinite scroll**

6. Veri Modeli
==============

6.1 Patient (FHIR R4 + CA Core+)
--------------------------------

  Alan                             Tip        FHIR Mapping                                    Notlar
  -------------------------------- ---------- ----------------------------------------------- ----------------------------------------------------------------------------
  patient\_id                      uuid       Patient.id                                      Sinalytix internal
  identifier\_set                  jsonb      Patient.identifier\[\]                          Health Card slice (OHIP, BC PHN, AB AHCIP, QC RAMQ), internal UUID
  name                             jsonb      Patient.name                                    Legal + display
  birth\_date                      date       Patient.birthDate                               ---
  gender                           enum       Patient.gender                                  per FHIR
  photo\_url                       string     Patient.photo                                   Patient-uploaded, consent-aware display
  address                          jsonb      Patient.address\[\]                             Multi-address support
  telecom                          jsonb      Patient.telecom\[\]                             Phone + email
  insurance                        jsonb      (extension)                                     OHIP info + private insurance
  dnr\_status                      jsonb      (extension; FHIR Goal \"advance\_directive\")   DNR, Goals of Care, Full Code
  sensitive\_categories\_present   enum\[\]   (extension)                                     mental\_health, hiv\_sti, gender\_identity, substance\_use --- for UI lockbox decision \[RECONCILED: B5 --- hiv→hiv\_sti; substance\_use added (enforced); genetic moved out: "sensitive, non-lockbox (V2)"\]
  org\_id\_primary                 uuid       (extension)                                     Primary org caring (for RLS pattern)

6.2 AllergyIntolerance (FHIR)
-----------------------------

  Alan                 Tip         Notlar
  -------------------- ----------- -------------------------------------------------
  allergy\_id          uuid        ---
  patient\_id          uuid        FK
  substance\_code      string      RxNorm or SNOMED CT
  substance\_display   string      \"Penicillin\"
  reaction             jsonb       Manifestation + severity
  severity             enum        mild \| moderate \| severe \| life\_threatening
  onset\_date          date        ---
  last\_verified       timestamp   \+ clinician
  provenance\_id       uuid        FK → Provenance
  clinical\_status     enum        active \| inactive \| resolved

6.3 Condition (FHIR; with sensitive categorization)
---------------------------------------------------

  Alan                   Tip     Notlar
  ---------------------- ------- --------------------------------------------------------------------------------------
  condition\_id          uuid    ---
  patient\_id            uuid    FK
  code                   jsonb   ICD-10 + SNOMED CT + display
  onset\_date            date    ---
  abatement\_date        date    If resolved
  clinical\_status       enum    active \| recurrence \| relapse \| inactive \| remission \| resolved
  verification\_status   enum    unconfirmed \| provisional \| confirmed \| refuted
  severity               enum    mild \| moderate \| severe
  sensitive\_category    enum    none \| mental\_health \| hiv\_sti \| gender\_identity \| substance\_use (NULL if not sensitive). \[RECONCILED: B5 --- hiv→hiv\_sti; substance\_use added (enforced lockbox); `genetic` = "sensitive, non-lockbox (V2)", out of the V0 lockbox set\]
  provenance\_id         uuid    FK
  recorded\_by           uuid    FK → PractitionerRole or Patient (self)

6.4 MedicationStatement + MedicationRequest
-------------------------------------------

  Alan                      Tip         Notlar
  ------------------------- ----------- ---------------------------------------------------------------------
  medication\_id            uuid        ---
  patient\_id               uuid        FK
  drug\_code                jsonb       RxNorm + DIN (Health Canada)
  drug\_display             string      ---
  dosage                    jsonb       dose + route + frequency + duration
  status                    enum        active \| completed \| stopped \| on\_hold
  prescriber\_role\_id      uuid        If Rx; null if patient-reported only
  start\_date               date        ---
  end\_date                 date        ---
  last\_refill\_date        date        V1+ pharmacy data
  adherence\_status         enum        taking\_as\_prescribed \| missed\_some \| not\_taking \| no\_report
  adherence\_reported\_by   enum        patient\_self \| caregiver \| pharmacy\_inferred (V1)
  adherence\_reported\_at   timestamp   ---
  provenance\_id            uuid        FK

6.5 Observation (Labs + Vitals)
-------------------------------

  Alan                  Tip         Notlar
  --------------------- ----------- ---------------------------------------------------------------------------
  observation\_id       uuid        ---
  patient\_id           uuid        FK
  code                  jsonb       LOINC code + display
  category              enum        laboratory \| vital\_signs \| imaging \| social\_history
  value\_quantity       jsonb       { value, unit, comparator }
  value\_codeable       jsonb       If non-numeric (e.g., blood type)
  reference\_range      jsonb       LifeLabs/Dynacare-specific ranges (V1)
  effective\_at         timestamp   When measured/observed
  performer\_role\_id   uuid        If clinician-measured
  provenance\_id        uuid        FK
  abnormal\_flag        enum        normal \| low \| high \| critical\_low \| critical\_high (V1 computation)

6.6 Provenance (FHIR)
---------------------

> [RECONCILED: A6] Canonical representation = one **relational `Provenance` table** (tier 1–4), shown below. FHIR `Provenance` is **produced only at the API boundary** (not stored as a separate resource). Dictionary §9.

  Alan                     Tip         Notlar
  ------------------------ ----------- -----------------------------------------------------------------------------------------
  provenance\_id           uuid        ---
  target\_resource\_type   string      \"Observation\", \"Condition\", etc.
  target\_resource\_id     uuid        ---
  tier                     enum        tier\_1\_api \| tier\_2\_emr\_mediated \| tier\_3\_patient\_upload \| tier\_4\_ocr\_llm
  source\_system           string      \"OSCAR Pro\" / \"Health Gateway BC\" / \"AWS Textract Medical\"
  recorded\_at             timestamp   When ingested
  signed\_at               timestamp   When source attested
  confidence\_score        float       0-1 (Tier 4 OCR)
  verified\_by\_role\_id   uuid        Tier 4 verified
  verified\_at             timestamp   ---
  original\_document\_id   uuid        FK → Document if applicable
  chain\_of\_custody       jsonb       OCR pipeline / LLM model versions

6.7 Cross-Source Merge Algorithm (Pseudocode)
---------------------------------------------

    function mergeLabs(observations: Observation[]): MergedLab[] {
      // Group by loinc_code + effectiveDateTime within ±15min
      const groups = groupBy(observations, obs => ({
        code: obs.code.loinc,
        timeBucket: roundTo15Min(obs.effectiveDateTime)
      }));
      
      return Object.entries(groups).map(([key, obsList]) => {
        const values = obsList.map(o => o.value_quantity.value);
        const isConflict = !valuesMatch(values, tolerance=0.05);
        
        return {
          lab_code: obsList[0].code,
          effective_at: representativeTime(obsList),
          values: obsList.map(o => ({ value: o.value, provenance: o.provenance })),
          is_discrepancy: isConflict,
          primary_value: isConflict ? null : values[0],
        };
      });
    }

6.8 Audit Log Events (Doc 4)
----------------------------

  Event Type                                  Severity   Trigger
  ------------------------------------------- ---------- -------------------------------
  `patient_record_viewed`                     info       Patient 360 render
  `sensitive_section_revealed`                warning    Sensitive expand with consent
  `break_glass_override_invoked`              critical   V1 emergency override
  `data_discrepancy_acknowledged`             info       Klinisyen flag tap
  `provenance_detail_viewed`                  info       Provenance badge modal
  `patient_360_section_expanded`              info       Section collapse/expand
  `timeline_scope_changed`                    info       30/90/365/lifetime toggle
  `quick_action_initiated_from_patient_360`   info       Drift to Doc 5-10
  `health_card_revealed`                      warning    Tap masked health card → T3

6.9 Cache Layer
---------------

  Cache Item                  TTL    Notes
  --------------------------- ------ ----------------------------------------------------
  Patient 360 payload         30s    Per (patient\_id, practitioner\_role\_id, org\_id)
  PolicyEngine decision       5s     Doc 2 baseline
  Cross-source merge result   60s    Recomputed on new ingestion
  Care plan summary           60s    Doc 6 source data
  Adherence aggregated        5min   Doc 10 source

7. Hata Durumları ve Edge Case\'ler
===================================

  Senaryo                                                     Kullanıcıya Gösterilen                                                            Sistem Davranışı
  ----------------------------------------------------------- --------------------------------------------------------------------------------- -----------------------------------------------
  Patient consent revoked mid-view                            \"Access lost: Patient revoked consent.\"                                         Modal exit to worklist; audit log
  Care team membership removed mid-view                       \"You are no longer in this patient\'s care team.\"                               Same as consent revoke
  Network failure on Patient 360 load                         \"Couldn\'t load patient record. Retry?\"                                         Retry; offline cache if available (read-only)
  Sensitive section tap without scope                         Modal: \"Additional consent required\"                                            Drift Doc 10 request consent
  Break-glass invoke (V1) --- T4 fail                         Modal: \"Override canceled. Contact Sinalytix support if emergency continues.\"   No data revealed; critical audit
  Cross-source discrepancy on safety-critical (allergy)       Header warning: \"Conflicting allergy data --- verify with patient\"              Persistent banner until acknowledged
  Photo upload corrupt                                        Default initials avatar                                                           Fallback rendering
  Adherence data \>7 days old                                 \"Last reported 12 days ago\" gray indicator                                      Stale flag
  Vitals strip no data                                        \"No vitals on record\" empty state                                               \"Add vitals\" CTA
  Care plan summary load fails                                \"Care plan unavailable\" + retry                                                 Partial render of other sections
  Timeline \>100 events in scope                              Infinite scroll first 50, \"Load more\"                                           Cursor pagination
  Drug name fuzzy merge incorrect match                       \"Verify medications with patient\" warning                                       V1 manual override
  Allergy reaction \"Anaphylaxis\" without EpiPen on record   Red highlight + \"EpiPen recommended\" alert                                      Clinical advisory
  Multi-org patient (rare cross-org)                          \"This patient is also followed in \[Other Org\]\" info                           RLS: only current org context shown
  Patient deceased                                            Header banner \"Deceased \[Date\]\" --- read-only mode                            No write actions; audit retention extended
  Sensitive category present but ALL scopes locked            \"5 sensitive history items locked\" header summary                               Awareness without disclosure
  Multi-language patient (Quebec Francophone)                 UI language follows clinician locale; patient prefs separate                      V1 patient-locale aware

8. Kabul Kriterleri
===================

8.1 Fonksiyonel
---------------

-   Patient 360 load ≤ 1s (P95) standard load (≤50 active resources).
-   Header sticky on web scroll.
-   Allergies always-visible badge in header with count.
-   DNR/Goals always-visible header badge if set.
-   Active Care Team avatars row in header.
-   Body sections in priority order (problems → meds → vitals → timeline
    → care plan).
-   Cross-source data merge transparent (provenance badges per entry).
-   Discrepancies flagged with \"Discrepancy\" indicator.
-   Sensitive sections default locked with \"Sensitive history present\"
    badge.
-   Sensitive section reveal requires consent scope; consent request
    drift Doc 10.
-   Timeline default last 30 days; toggle 90/365/lifetime.
-   Timeline event-type filter chips.
-   Adherence indicator per medication (green/yellow/red/gray) with
    source.
-   Care plan summary block with goals count + last update + Open CTA.
-   Mobile özet 4 tabs (Overview/Meds/Vitals/Timeline) + menu (Care
    Plan/Documents/Care Team/Sensitive).
-   All quick actions drift correctly to Doc 5-10.
-   Org context switch invalidates Patient 360.
-   Multi-org patient shows current org context only (RLS).
-   Empty states actionable.

8.2 Regülasyon / Güvenlik
-------------------------

-   Every render = audit log `patient_record_viewed` (info severity).
-   Sensitive reveal = audit `sensitive_section_revealed` (warning
    severity).
-   Break-glass (V1) = critical severity + admin alert.
-   Health card masked default; reveal requires T3 re-auth + audit.
-   Sensitive categories never disclosed without consent scope (defense
    in depth: backend filter + frontend display logic).
-   All PHI in Patient 360 Canada data residency (Doc 2).
-   Photo display patient consent-aware.
-   Patient autonomy: revoke immediately effective (≤ 5s).
-   All cross-source data preserved with original (audit chain
    integrity).

8.3 Teknik / Performans
-----------------------

-   PolicyEngine evaluate ≤ 100ms (P95).
-   Patient 360 backend assembly ≤ 800ms (P95).
-   Frontend render ≤ 500ms (P95) initial.
-   Section expand state persists ≤ 50ms.
-   Mobile tab switch ≤ 100ms.
-   Cross-source merge for ≤100 entities ≤ 200ms.
-   Cache hit rate (Patient 360 payload) ≥ 60%.
-   Timeline infinite scroll ≥ 55fps mobile.

9. Başarı Metrikleri
====================

  Metric                                                               Hedef
  -------------------------------------------------------------------- -------------------------------------------------------------
  Patient 360 views per clinician per day                              8-25
  Mean time-on-Patient-360 per view                                    45s-3min
  Section expand rate (% of views)                                     ≥ %70 problems, ≥ %50 meds, ≥ %40 timeline, ≥ %30 care plan
  Sensitive section reveal rate (of patients with sensitive history)   ≤ %25 per render (most accesses don\'t need sensitive)
  Break-glass invocation rate (V1+)                                    \< 0.1% of views
  Cross-source discrepancy acknowledgement rate                        ≥ %85 within 24h of flag
  Adherence indicator engagement (tap for detail)                      ≥ %30 of medication views
  Provenance badge engagement (tap for detail)                         ≥ %20 of clinical data views (curiosity check)
  Mobile tab switch frequency per session                              2-4
  Quick action drift success rate (no error)                           ≥ %98

10. UX ve Tasarım Notları
=========================

10.1 Cognitive Load Reduction
-----------------------------

-   **Sticky header**: Critical safety info always visible during scroll
-   **Collapsible sections**: Hide what\'s not currently needed
-   **Smart defaults**: Most-relevant sections expanded; less-relevant
    collapsed
-   **Provenance badges discoverable but not intrusive**: Small icon +
    tooltip
-   **Sensitive masking**: Lockbox icon doesn\'t shame; communicates
    \"additional consent required\"

10.2 Cross-Source Trust Communication
-------------------------------------

-   Color coding: green = high trust (EMR / Authority), blue =
    patient-attributed, amber = OCR-verified, gray = OCR-pending
-   Multi-source = badges side-by-side (not stacked, visual parity)
-   Discrepancy = orange triangle (caution, not error)

10.3 Mobile Saha Optimization
-----------------------------

-   Tab switch fast (≤100ms)
-   Vertical scrolling for content within tab
-   Pinned header collapses on scroll (more content room)
-   Touch targets 44×44 minimum
-   Pull-to-refresh

10.4 Web Multi-Panel
--------------------

-   Multi-monitor support (open multiple Patient 360 tabs in separate
    browser windows V2)
-   Keyboard shortcuts power-user friendly
-   Print stylesheet (V1) --- patient summary report

10.5 Accessibility (WCAG 2.1 AA)
--------------------------------

-   Provenance badges have text labels (not icon-only)
-   Sensitive lockbox icon + text \"Additional consent required\"
-   Color discrepancy + text + icon (multi-modal indication)
-   Screen reader full announce of header on focus
-   Keyboard navigation for all interactive elements

11. Kullanıcı Senaryoları
=========================

Senaryo 1 --- MRP Family Physician Comprehensive Review
-------------------------------------------------------

Dr. Park, MRP for Mrs. Chen (75y, T2DM, CKD, post-stroke). Wednesday
office day.

-   Worklist click → Patient 360 web full view.
-   Header: photo, allergies (Penicillin --- moderate rash), DNR=Full
    Code, Care Team (Sarah RN CC, Dr. Park MRP, Marcus Chen PT, Lisa
    MSW).
-   Problems: T2DM (active, 12y), CKD Stage 3 (active, 5y), Post-CVA
    (active, 2y), Hypertension (active).
-   Meds: Metformin 500mg BID (green --- taking as prescribed, Patient
    reported yesterday), Lisinopril 10mg daily (yellow --- missed 2
    doses this week, Caregiver reported), Atorvastatin 40mg HS (green),
    ASA 81mg daily (green).
-   Vitals strip: BP 145/88 (high), HR 78, weight 72kg (▼ -1kg last
    month), eGFR 42 (CKD3).
-   Timeline last 30d: 4 RN visits, 2 PT visits, lab panel 12 days ago
    (HbA1c 7.4% from LifeLabs + 7.2% patient self-upload --- Discrepancy
    flag), discharge summary 18 days ago (Tier 4 OCR verified by Sarah).
-   Care Plan summary: 4 goals (BP \<140/85 at risk, HbA1c \<7 on track,
    ambulation 50m on track, depression PHQ-9 monitoring achieved).
-   Click \"Open Care Plan\" → drift Doc 6 → review.
-   Click HbA1c discrepancy flag → modal: LifeLabs 7.4 (May 17) vs
    patient-uploaded portal export 7.2 (May 17). Dr. Park clicks
    \"LifeLabs as primary\" → audit log.
-   Sign 1 pending note (T3 biometric).
-   Total time: 4 minutes.

Senaryo 2 --- Care Coordinator Complex Multi-Discipline Patient
---------------------------------------------------------------

CC Lisa RN, Toronto Community Health. Patient Mrs. Park (89y, multiple
comorbidities, frailty).

-   Patient 360 web view.
-   Care team: 7 members (CC Lisa, MRP Dr. Park, Cardiology Dr. Smith,
    Geriatric NP, PT Marcus, OT Jennifer, MSW David, dietitian Aisha).
-   Problems: 8 active conditions.
-   Meds: 12 active medications (polypharmacy alert V1).
-   Vitals strip + recent labs (CBC, BMP, BNP from cardiology).
-   Care Plan summary: 6 active goals across disciplines + 4 active
    subplans.
-   Lisa opens Care Plan (Doc 6) for MDT prep next Monday.

Senaryo 3 --- PT Discipline-Specific View
-----------------------------------------

Marcus Chen PT, sees Mr. Smith (post-knee replacement).

-   Mobile Patient 360 Overview tab.
-   Problems summary: TKA right (active), pre-op OA bilateral.
-   Last visit summary: 2 days ago PT session --- ROM 0-95°, 30m walk
    distance, no pain at rest.
-   Next visit: today 14:00.
-   Open Mobile Meds tab: post-op meds (Acetaminophen prn, no opioids).
-   Open Mobile Vitals: BP 132/78 normal.
-   Open Mobile Timeline: PT visits weekly + post-op orthopedic surgeon
    follow-up note.
-   Menu → Care Plan → his discipline subplan (PT-specific): goals (ROM
    120°, walk distance 100m).

Senaryo 4 --- Sensitive Reveal Scenario
---------------------------------------

Dr. Park sees Mrs. Smith (52y) for diabetes management. Mrs. Smith has
unrelated mental health history (depression, anxiety) from psychiatrist
consult 6 months ago.

-   Patient 360 web.
-   Mental Health section: \"Sensitive history present --- additional
    consent required\" badge.
-   Dr. Park taps → Modal: \"Viewing mental health history requires
    additional patient consent.\"
-   Dr. Park decides not needed (diabetes-focused visit) → Cancel.
-   No data revealed. Audit log: clinician viewed sensitive badge but
    did not request.

Alternative path: Dr. Park notices Mrs. Smith mentioned \"feeling
overwhelmed\" in visit; decides to review. → \"Request Consent\" → drift
Doc 10 → patient app push notification → Mrs. Smith consents in 10 min →
section expandable → Dr. Park reviews PHQ-9 history from psychiatrist.
Audit log: sensitive\_section\_revealed.

Senaryo 5 --- Cross-Source Discrepancy on Allergy (Safety Critical)
-------------------------------------------------------------------

Sarah RN visits new home care patient referred from hospital.

-   Patient 360 header: Allergies badge red \"⚠ 2 allergies\" +
    persistent banner \"Conflicting allergy data --- verify with
    patient\".
-   Tap badge → Modal: Allergy 1: Penicillin (severe --- hospital EMR
    Tier 2) vs Penicillin (mild rash --- patient self-report Tier 3
    patient app).
-   Sarah asks Mrs. Roberts in person: \"Have you had penicillin
    reactions? What happened?\"
-   Mrs. Roberts: \"Once as a kid, I broke out in hives. I\'m not sure
    if it was severe.\"
-   Sarah updates allergy: severity=moderate (RN scope allows),
    provenance=clinician-verified (Sarah).
-   Discrepancy resolved; banner cleared.
-   Audit: `data_discrepancy_acknowledged` + `allergy_updated`.

Senaryo 6 --- Break-Glass Emergency (V1 Future Scenario)
--------------------------------------------------------

Dr. Park weekend coverage for colleague. Patient Mr. Lee unconscious in
ER (called Sinalytix-using GP). Dr. Park not in Mr. Lee\'s care team (no
consent).

-   Dr. Park searches Mr. Lee → Patient 360 access denied: \"Not in care
    team and no consent.\"
-   \"Break-Glass Override (Emergency)\" CTA (V1) → T4 re-auth + Modal:
    \"This will reveal Mr. Lee\'s PHI without consent. Justification
    required.\"
-   Dr. Park writes: \"Patient unconscious in ER, need to know
    medications + allergies for treatment. Calling \[Hospital ED\] for
    handoff.\"
-   Acknowledges 3 attestations.
-   T4 TOTP → revealed Patient 360 (sensitive included).
-   Sinalytix compliance team notified within 5 minutes (admin alert +
    email).
-   Within 48h, compliance review.
-   Audit: `break_glass_override_invoked` critical severity.

12. Açık Konular
================

  Konu                                                                                               Durum       Sorumlu / Hedef
  -------------------------------------------------------------------------------------------------- ----------- ------------------------------------------------
  Discipline-aware body section reorder (RN vs MRP vs PT) --- pilot test                             Açık        V1 UX iteration
  Adherence calculation logic (when V1 pharmacy data integrated)                                     Açık        V1 Doc 10 + Doc 5
  Drug-drug interaction check trigger point (V2 SaMD considerations)                                 Açık        V2 --- Health Canada SaMD review
  Cross-source fuzzy merge algorithm tuning (drug name similarity)                                   Açık        V1 with pilot data
  Allergy severity discrepancy resolution UX                                                         Açık        Clinical safety review
  Patient 360 multi-tab same-patient (V2) --- comparison view                                        Açık        V2
  Print/export PHI privacy + watermarking                                                            Açık        V1 with legal review
  Patient 360 collaborative real-time (V2 MDT)                                                       Açık        V2
  Photo display rights --- patient + family consent matrix                                           Açık        Cross-app reconciliation (Patient/Family apps)
  DNR/Goals of Care data model (FHIR Goal vs custom)                                                 Açık        V1 detailed FHIR alignment
  Sensitive category taxonomy ratify (mental\_health/HIV/genetic/gender\_identity --- sufficient?)   Açık        Clinical advisor PMR review
  Break-glass V1 --- admin notification + 48h review workflow                                        Açık        V1 compliance workflow
  Provenance badge UI iconography review                                                             Açık        UX design iteration
  Discrepancy auto-resolution rules (when is \"close enough\"?)                                      Açık        V1 with pilot data
  Patient deceased state handling --- care team retention period                                     Açık        PHIPA legal review
  Multi-provincial patient (rare --- interprovincial transfer)                                       Açık        V2 cross-province
  Specialty-specific summary layouts (cardiology vs nephrology vs PT)                                Açık        V1+ specialty-aware UI
  Real-time Patient 360 update during clinician\'s view (new lab arrived)                            Açık        V1 WebSocket integration
  Audit log granularity for view-only sections (every collapse/expand?)                              Açık        Performance + audit balance
  Patient self-uploaded data validation prior to display                                             Açık        V1 with patient app feedback loop
  Care plan summary \"At risk\" computation methodology                                              Açık        V1 outcome tracking
  Family member view permission delta (Doc 10 cross-reference)                                       Açık        Cross-app reconciliation
  Cross-app Patient resource canonical schema (CA Core+ alignment for Patient app)                   Beklemede   Cross-app reconciliation pass
  Mobile tab state cross-device sync                                                                 Açık        V1 user preference sync
  Patient 360 offline mode (read-only cached)                                                        Açık        V1 offline capability
  Health card masking + reveal T3 --- clinical justification mandatory?                              Açık        Clinical workflow review
  Vitals reference range source attribution (LifeLabs vs Dynacare differences)                       Açık        V1 lab data normalization
  Adherence indicator displayed default vs opt-in (patient privacy preference)                       Açık        Patient app preference cross-reference

*Sinalytix --- Gizli ve Özel. Doc 4 / 10 --- Healthcare Professional PRD
Serisi. En yoğun klinik karar destek yüzeyi. Geliştirici ve klinik
danışman referansı içindir.*

**Sonraki Doc**: Doc 5 --- Health Data Ingestion & Document Repository
(4-Tier pipeline detayı + OCR/LLM verification queue + document
repository UI). Bu doc\'ta MVP\'nin Tier 4 OCR/LLM ağırlığı kritik
(Foundation \#6 stratejisi gereği --- vendor-bağımsız self-serve veri
akışı).

Table of Contents {#table-of-contents-4 .TOC-Heading}
=================

Sinalytix HCP PRD --- Doc 5: Health Data Ingestion & Document Repository (4-Tier)
=================================================================================

**Versiyon:** v1.0 **Tarih:** 31 Mayıs 2026 **Sahip:** Sinalytix Ürün &
Klinik Ekibi **Statü:** Locked (Session 2 Q&A --- 16 karar) **Bağlı
Dokümanlar:** Master Doc §4.7 + §5.3, Foundation \#6, Doc 1 (Identity),
Doc 2 (Auth/Audit Spine), Doc 3 (Worklist), Doc 4 (Patient 360)

§1 --- Bağlam ve Amaç
---------------------

### 1.1 Tanım

**Health Data Ingestion & Document Repository**, hastaya ait klinik veri
ve dokümanların Sinalytix Patient 360\'a girmesini sağlayan **4-katmanlı
(Tier 1-4) veri alma boru hattı** ile bu dokümanların legal-grade
saklanma, görüntülenme ve yönetimi sağlayan **document repository**
yüzeyidir. Sinalytix\'in stratejik moat\'larından biri: home care\'de
hasta verisi parçalı ve heterojen --- EMR (OSCAR Pro), wearable
(HealthKit/Health Connect), patient portal export (CCD-A/FHIR Bundle),
ve tarihsel kâğıt/PDF doküman arşivi (OCR+LLM). Doc 5, bu dört kaynak
akışını **tek bir denetlenebilir, FHIR-aligned, provenance-tagged
Patient 360\'a** dönüştürür.

Doc 5\'in mimari temeli Master Doc §4.7\'de tanımlanan **4-Tier
Ingestion Pipeline**:

-   **Tier 1 --- API-Direct:** Vendor API\'leri üzerinden
    yapılandırılmış veri (OSCAR Pro, Apple HealthKit, Google Health
    Connect)
-   **Tier 2 --- EMR-Mediated:** Üçüncü taraf entegrasyon ortağı
    (AlayaCare, PCC, TELUS) --- V2+ ertelendi (Foundation \#7)
-   **Tier 3 --- Patient Upload:** Hasta veya aile/SDM tarafından
    doğrudan yüklenen yapılandırılmış export (CCD-A, FHIR Bundle JSON)
-   **Tier 4 --- OCR + LLM Pipeline:** Tarihsel/yapılandırılmamış
    doküman (PDF/JPEG/PNG/HEIC) → AWS Textract Medical (OCR) → AWS
    Bedrock + Claude (Canada Central, structured extraction) → human
    verification queue → FHIR resource → Patient 360

Foundation \#6 gereği **MVP\'de Tier 1 (OSCAR + HealthKit + Health
Connect) garanti + Tier 4 güçlendirilmiş**; Tier 2 V2+ partnership
cycle\'ına bağlı; Tier 3 generic CCD-A + FHIR Bundle MVP\'de native
parse edilir, kalan format Tier 4\'e düşer.

### 1.2 Sinalytix\'teki Giriş Noktaları

  Giriş Noktası                              Tetikleyici                                                                     Tier
  ------------------------------------------ ------------------------------------------------------------------------------- -------------------------------------------------------
  Onboarding bulk backfill                   Hasta ilk kez care team\'e dahil olur, geçmiş PDF arşivi yüklenir               Tier 4 (LLM auto-classify + queue anomalies --- B1.4)
  Document Repository --- Upload             CC veya HCP doğrudan doküman yükler (yeni rapor, dış konsültasyon)              Tier 3 veya Tier 4
  Patient mobile app upload                  Hasta/aile lab raporu veya hastane özetini telefonla çeker/yükler               Tier 4
  HealthKit/Health Connect background sync   Patient app aktif iken günlük arka plan senkronizasyon                          Tier 1
  OSCAR Pro patient roster sync              Org-level OSCAR bağlantısı; HCP aktif hasta için günlük poll + on-demand pull   Tier 1
  Patient portal export (kullanıcı manuel)   Hasta MyChart/eHealth ON portal\'dan export indirir, Sinalytix\'e yükler        Tier 3 (CCD-A/FHIR native) → fallback Tier 4
  Worklist Inbox --- yeni doc alert          WebSocket bildirim: Patient 360 için Tier 4 verification beklemede              Tier 4 sonrası UI
  Settings → Connected Sources               HCP kendi org\'unun OSCAR/Health Connect bağlantı durumunu izler                Tier 1 yönetimi

### 1.3 Hedef Rol Matrisi

  Rol                                          Birincil Kullanım                                                                                            Yetki
  -------------------------------------------- ------------------------------------------------------------------------------------------------------------ --------------------------------------------------------------------------------------------------------------------------------
  Care Coordinator (CC)                        Tier 4 verification queue varsayılan reviewer; bulk backfill onboarding sahibi; family-upload review queue   Tüm Tier 4 reviewable doc\'lar; verification queue\'da accept/reject/edit; repository archive/restore (consent revoke sonrası)
  MRP (Most Responsible Provider)              Lab/Imaging sonuçları Tier 4 queue\'da MRP\'ye yönlendirilebilir (org config); upload yetkili                Verification routing config (org admin V1); upload + repository read
  Specialist / Allied Health                   Kendi discipline subplan\'i için doc upload; review queue\'da kendi disipline ait routed dokümanlar          Upload + review (routing config\'e göre); repository read; sensitive lockbox consent-scope
  Org Admin (V1)                               Verification queue routing rules; retention policy override; connected source mgmt                           Configuration only --- clinical content yok
  Patient / Caregiver / Family (Patient app)   Tier 3 portal export upload, Tier 1 wearable sync, kendi/aile dokümanı upload                                Kendi dokümanlarını yükle + chart\'taki Tier 3-4 doc\'ları gör (consent-scope)
  Sinalytix Operations                         Tier 4 pipeline observability, OCR/LLM cost monitor, audit log review                                        Patient-level data direct access yok (only metadata + cost telemetri)

### 1.4 Ekosistem Konumu

Doc 5, Sinalytix\'in **defansiyel moat**\'larından ikisini birden
somutlaştırır:

1.  **Patient-controlled data layer (Master Doc §4.8):** Tier 1-4 her
    veri parçası `Provenance` resource ile attribute edilir; consent
    revoke\'ta data hidden + retained (B4.1), restore on re-consent.
    Hasta hangi org/HCP\'nin neyi gördüğünü granular biliyor.
2.  **Tier 4 OCR/LLM güçlü pipeline (Foundation \#6):** Rakipler
    (AlayaCare/PCC/TELUS) Tier 1-2 ağırlıklı; Sinalytix evvelki yıllarda
    biriken Kanada home care hasta arşivini (taranmış discharge summary,
    faks gelmiş lab raporu, el yazısı bakım notu) yapılandırılmış FHIR
    resource\'lara dönüştürür. Yeni hasta onboarding\'inde 5 yıllık PDF
    arşivinden 24 saat içinde structured chart üretmek, defansiyel moat.

**Pazarda konum:** AlayaCare/PCC home-care vendor lock-in mağazaları;
Sinalytix open vendor-agnostic + patient-portable. EMR rakip değil
(OSCAR Pro entegre); patient longitudinal record agregatörü.

### 1.5 Regülasyon

Doc 5 doğrudan şu regülasyon ve standartlara tabidir:

-   **PHIPA (Ontario Personal Health Information Protection Act):**
    Electronic Service Provider yükümlülükleri (Master Doc §4.2);
    patient access right + retention obligation (10y minimum); data
    residency Canada (lock-in).
-   **PIPEDA + Provincial parallels:** Multi-province V2+ için. Quebec
    Law 25 ve BC PIPA özellikle data residency + consent granularity
    sıkı.
-   **FHIR R4 + CA Core+:** Veri modeli hizalama (Master Doc §4.3); Tier
    4 LLM çıktısı `DocumentReference`, `Provenance`, `Observation`,
    `MedicationStatement`, `Condition`, `AllergyIntolerance`
    resource\'larına serialize edilir.
-   **Health Canada SaMD Class I MVP, Class II V2+:** OCR+LLM çıktısının
    \"clinical decision support\" iddiası yok --- MVP \"data
    presentation\" kategorisinde, human-in-loop verification zorunlu.
    Class II yolculuğu V2+\'ya saklı (Master Doc §4.9).
-   **Bill S-5 (Federal, 4 Şubat 2026 re-introduced):** Önümüzdeki 2-3
    yıl içinde EMR vendor\'lara FHIR interop mandate getirebilir.
    Sinalytix\'in Tier 1-3 standart-uyumlu mimarisi bu dalgayı yakalar.
-   **AWS Canada Central data residency:** Tüm Tier 1-4 boru hattı (S3,
    Textract Medical, Bedrock Claude, GuardDuty) Canada Central\'da;
    cross-border egress yok.
-   **OntarioMD IEP (Integration Endpoint Program):** MVP\'de başvuru
    başlatıldı (Foundation \#8); OSCAR Pro Tier 1 integration bu
    programı kullanır.

§2 --- Endüstri ve Klinik Bağlam
--------------------------------

### 2.1 Kanada Home Care Veri Manzarası --- Mevcut Durum

Kanada home care\'de hasta verisi tarihsel olarak **kâğıt-baskın +
faks-bağımlı + EMR-parçalı**:

-   **OSCAR Pro:** Open-source ON ailesi hekimleri için baskın EMR;
    Sinalytix Tier 1 garanti integration (Foundation \#6). Patient
    roster + Observation + MedicationStatement + DocumentReference
    API\'leri mevcut.
-   **TELUS PSS / AlayaCare / PCC (PointClickCare):** Home care
    management platform\'ları; vendor lock-in. Rakip pozisyonu nedeniyle
    MVP\'de partnership değil --- V2+ (Foundation \#7).
-   **eHealth Ontario (ConnectingOntario):** Provincial health
    information network; OLIS (lab), DI-r (imaging), CHRIS-r
    (prescription). Provincial-mediated tier (V1+ Tier 2 candidate).
-   **MyChart Epic (hastane network):** GTA hastaneleri (UHN, SickKids,
    Trillium) yaygın; patient portal export indirilebilir (CCD-A veya
    FHIR Bundle). Tier 3 native parse.
-   **Apple HealthKit / Google Health Connect:** Wearable + manuel
    patient input; home care kronik takipte değerli sinyal (HR, BP,
    weight trend, glucose, SpO2, activity, sleep). Tier 1 garanti.
-   **Faks + el yazısı bakım notu:** Hala dominant communication.
    Sinalytix Tier 4 OCR+LLM bu mirası ele alır.

### 2.2 Tier 4\'ün Stratejik Önemi --- Neden Sinalytix\'in Kalbi

Foundation \#6\'da kilitlenen \"**Tier 4 OCR/LLM güçlendirilmiş MVP**\"
kararının arkasındaki klinik vaka:

1.  **Onboarding hızı:** Home care hastası ortalama 5-15 yıllık tıbbi
    geçmiş taşır (kronik koşullar, çoklu hastane episode\'u, multi-EMR
    fragmentation). Manuel chart oluşturmak 8-16 saat CC iş yükü. Tier 4
    hybrid pipeline (B1.4) bunu 1-2 saate çeker.
2.  **Continuity of care:** ON home care hastalarının %60+\'ı multiple
    EMR\'da kayıtlı (family physician + specialist + hospital network).
    Tier 4 cross-source merge (B2.2) tek bir Patient 360 üretir.
3.  **Rakip diferansiyasyonu:** Tier 1-2 ağırlıklı rakipler (AlayaCare)
    sadece kendi vendor partnership\'leri içindeki veriyi çekebilir;
    Sinalytix vendor-agnostic Tier 4 ile arşiv mirasını çözer.
4.  **Patient-controlled moat:** Tier 4 işlenen her veri parçası
    `Provenance.tier=4 + Provenance.uploadedBy + Provenance.verifiedBy`
    ile attribute edilir. Hasta consent revoke\'ta tam audit izi görür
    (B4.1).

### 2.3 Klinik Risk ve Safety Sınırları

Tier 4 LLM pipeline klinik karar verme aracı **değildir** --- Sinalytix
MVP\'de SaMD Class I \"data presentation\". Bu nedenle:

-   **Safety-critical entity whitelist (B3.1):** Allergy, medication,
    code-status (DNR), goals-of-care kategorilerinde **confidence ne
    olursa olsun human review zorunlu** --- auto-accept yok. Tier 4 LLM
    hallucination\'ı bu kategorilerde clinical risk yarattığı için.
-   **Provenance şeffaflığı:** Patient 360\'taki her data point\'in tier
    badge\'i var (Doc 4 kararı). Tier 4 \"pending verification\"
    badge\'i HCP\'ye veriyi unverified gördüğünü hatırlatır.
-   **Side-by-side viewer (B4.4):** Klinisyen Tier 4 LLM çıkarımını
    orijinal PDF/image ile yan yana görerek source-text doğrulayabilir.
-   **No diagnostic claim:** LLM çıkarımı \"Condition: Type 2 Diabetes\"
    yerine \"Patient document references Type 2 Diabetes diagnosis ---
    verify in source\" tonu; clinical reasoning UI yok.

### 2.4 Veri Hacmi ve Maliyet Beklentileri (V0 ölçek tahmini)

  Tier                                             Hacim/Hasta/Ay (V0 tahmin)                                                Cost Driver
  ------------------------------------------------ ------------------------------------------------------------------------- ---------------------------------------------------------------------------------------------------
  Tier 1 --- Wearable (HealthKit/Health Connect)   \~5,000 Observation (vitals + activity)                                   Database storage (negligible per-record)
  Tier 1 --- OSCAR Pro sync                        \~50 yeni Observation + \~5 MedicationStatement + \~2 DocumentReference   API call cost (free OSCAR), DB storage
  Tier 3 --- Patient portal export                 \~1 bulk upload (CCD-A) --- 50-200 record per import, irregular           Parser CPU (minimal)
  Tier 4 --- OCR + LLM                             \~3-8 doküman/hasta/ay (steady state); onboarding burst 50-200 doc        **Textract Medical \~\$0.05/page + Bedrock Claude \~\$0.015/1K input + \$0.075/1K output tokens**

Tahmini per-active-patient/ay Tier 4 cost: \~\$2-5 (steady state);
onboarding burst: \~\$20-50 one-time. Per-org operational guardrail:
monthly Tier 4 budget cap (org admin configurable, V1).

§3 --- Kapsam ve Kısıtlar
-------------------------

### 3.1 V0 (MVP) --- Q4 2026 Launch Hedefi

**Tier 1 --- API-Direct:**

-   OSCAR Pro integration (Foundation \#6 garanti): patient roster sync,
    Observation, MedicationStatement, DocumentReference,
    AllergyIntolerance pull. OAuth 2.0 + org-level credential.
-   Apple HealthKit (iOS Patient app side): Vitals + Activity scope (HR,
    BP, body weight, SpO2, blood glucose, steps, sleep) --- B3.2.
-   Google Health Connect (Android Patient app side): Aynı scope
    eşdeğeri.

**Tier 3 --- Patient Upload (native parse):**

-   Generic CCD-A (Consolidated CDA R2.1) parser
-   FHIR Bundle JSON parser (R4 + CA Core+ aligned)
-   Diğer format → Tier 4 OCR pipeline\'a fallback

**Tier 4 --- OCR + LLM Pipeline (B1.1, B1.2):**

-   **OCR:** AWS Textract Medical (Canada Central) --- entity-aware
    medical OCR (medications, conditions, allergies, lab values, dates).
-   **LLM Structured Extraction:** AWS Bedrock + Claude Sonnet (Canada
    Central) --- Textract output → FHIR resource (DocumentReference +
    Observation/MedicationStatement/Condition/AllergyIntolerance).
-   **Verification Queue (B1.3):** Default CC; configurable per org (V1
    full UI). Safety-critical whitelist (B3.1) zorla queue.
-   **Backfill Workflow (B1.4):** Hybrid auto-classify confident + queue
    anomalies + safety-critical entities.

**Document Repository (Tier 3-4 unified):**

-   Inbox (review queue + new uploads)
-   Repository (browse + filter + search)
-   Document Viewer (in-app PDF.js + side-by-side LLM entity panel ---
    B4.4)

**Storage & Retention:**

-   S3 Canada Central (Standard tier) --- 10y hot
-   S3 Glacier Deep Archive --- lifetime cold (B2.1)
-   Original immutable (legal preserve --- PHIPA + malpractice defense)
-   Audit log her ingestion event (Doc 2 canonical schema)

**Security & Safety:**

-   AWS GuardDuty Malware Protection for S3 (async, post-upload,
    quarantine bucket flagged) --- B4.3
-   SHA-256 hash dedup + LLM semantic warning (B3.4)
-   Provenance resource her data point için (Doc 4 cross-source merge
    feed)
-   Sensitive auto-detect (high-precision: psych Dx F-codes, HIV/STI
    serology positive, gender markers, substance-use markers) → Doc 4
    lockbox (B2.4). \[RECONCILED: B5 --- lockbox set =
    {mental\_health, hiv\_sti, gender\_identity, substance\_use};
    `substance_use` enforced; `genetic` = "sensitive, non-lockbox (V2)",
    out of V0 lockbox.\]
-   File format whitelist (B3.3): PDF + JPEG + PNG + HEIC; 25MB/file,
    100MB/upload batch. **\[RECONCILED: B10\]** Bu 25MB limiti **klinik
    döküman ingest bağlamıdır** (Doc 5). Kredensiyel upload limiti
    ayrıdır: 10MB/file (Doc 1). İkisi farklı bağlam; **çelişki değil**
    (Dictionary B10).

**Consent & Access:**

-   Tier 1-4 her ingestion event consent-scope kontrolünden geçer (Doc
    1 + Doc 10)
-   Consent revoke → data hidden + immutable retain + audit (B4.1);
    restore on re-consent
-   Family upload → CC review queue + patient notify (B2.3)

### 3.2 V1 (Post-MVP, 6-12 ay)

-   Verification queue routing rules UI (org admin) + document-type
    routing (lab→MRP, allied→discipline)
-   Sensitive auto-detect broader NLP (semantic concept network beyond
    keyword/code)
-   LLM cost budget cap per org (admin config) + alert
-   DICOM viewer (separate imaging module --- V1 ayrı project)
-   Tier 4 retry/fallback policy admin UI
-   Patient explicit consent per-document UX (granular)
-   Patient hard delete request workflow (right-to-be-forgotten flow +
    legal review)
-   In-app annotation/highlight on viewer
-   OSCAR DocumentReference deep-link reverse (back to OSCAR original)
-   Patient portal parsers: MyChart Epic specific, eHealth ON OLIS
    native (faster than generic CCD-A)
-   Multi-format support: DOCX, XLSX
-   Tier 2 --- EMR-Mediated foundation (vendor-agnostic abstraction
    layer, partnership-ready ama partnership değil)
-   Audit query UI for clinician (Settings → Activity Log) --- Doc 2 ile
    koordineli

### 3.3 V2 (12-24 ay)

-   Tier 2 partnership integrations: AlayaCare, PCC, TELUS PSS
    (Foundation \#7 --- partnership cycle ile)
-   Multi-province Tier 1 + Tier 3 (BC Health Gateway, Alberta MyHealth
    Records, QC Carnet santé)
-   HealthKit/Health Connect tam scope: Nutrition, Mindfulness,
    Reproductive (consent-aware lockbox)
-   Annotation collaboration (multi-clinician annotation thread)
-   LLM-assisted differential diagnosis hints (SaMD Class II yolculuğu
    başlar)
-   Visit recording (audio) --- Doc 9 visit mgmt ile koordineli
-   Patient hard delete legal workflow tam otomatize

### 3.4 V3 (24+ ay, vizyon)

-   Federal/provincial FHIR mandate sonrası direct provider FHIR API
    (Bill S-5 dalgası)
-   Real-time hospital ADT (Admit/Discharge/Transfer) feed
-   AI scribe entegre (Doc 7 ile)
-   Cross-national patient transfer (newcomer onboarding from
    non-Canadian EMR)

### 3.5 Constraints (Sabit Kısıtlar)

-   **Data residency:** Tier 1-4 tüm boru hattı Canada Central (AWS).
    Cross-border egress yasaklı.
-   **Original preserve:** Tier 3-4 yüklenen orijinal binary asla
    overwrite/delete edilmez; legal retention.
-   **No auto-accept safety-critical:** Allergy/meds/code-status/DNR LLM
    çıkarımları human review zorunlu (B3.1).
-   **Audit trace:** Her ingestion event Doc 2 canonical
    AuditLogEntry\'ye yazılır (8-category, \~50 event\_type taxonomy,
    partitioned monthly).
-   **PolicyEngine:** Tier 1-4 her read/write `PolicyEngine.evaluate()`
    üzerinden (Doc 2 generic interface; MVP PG RBAC, V1 Cedar swap).
-   **Provenance zorunlu:** Patient 360\'a giren her data point bir
    `Provenance` resource\'a bağlı; Doc 4 cross-source merge bu
    provenance\'i kullanır.
-   **Consent revoke = immediate hide:** Doc 3 5s gri animasyon
    pattern\'i ingestion\'a da uygulanır; chart access ânında kesilir,
    retain immutable.

### 3.6 Non-Goals

Aşağıdakiler MVP\'de **kapsam dışı** ve Doc 5\'in sorumluluğu değildir:

-   DICOM imaging viewing (V1 ayrı modül)
-   Genomic data ingestion (sequencing data, panel results) --- V2+ özel
    data type
-   Patient-recorded audio/video (Doc 9 visit mgmt scope)
-   Clinical decision support (SaMD Class II --- V2+)
-   Cross-org doküman paylaşım (Doc 10 consent + Doc 9 communication
    scope)
-   HCP-to-HCP doküman transfer (Doc 9 communication scope)
-   AI scribe note generation (Doc 7)
-   Pharmacy claims/refill history (V1 --- Doc 4 adherence v1 ile
    koordineli)

§4 --- Akışlar
--------------

### 4.1 Tier 1 --- OSCAR Pro API-Direct Sync Akışı

    sequenceDiagram
        participant CC as Care Coordinator
        participant Sinalytix as Sinalytix Backend
        participant OSCAR as OSCAR Pro API
        participant PE as PolicyEngine
        participant P360 as Patient 360

        Note over Sinalytix,OSCAR: Org-level OAuth 2.0 credential (one-time setup)
        Sinalytix->>OSCAR: GET /patients?modified_since=T-1 (nightly)
        OSCAR-->>Sinalytix: Updated patient list (delta)
        loop For each updated patient
            Sinalytix->>PE: evaluate(subject=org, action=read, resource=patient, context=consent)
            PE-->>Sinalytix: Allow / Deny (per consent scope)
            alt Allow
                Sinalytix->>OSCAR: GET /Observation, /MedicationStatement, /DocumentReference
                OSCAR-->>Sinalytix: FHIR resources
                Sinalytix->>Sinalytix: Create Provenance (tier=1, source=oscar_pro, agent=oauth_client)
                Sinalytix->>P360: Merge by entity + provenance badge
                Sinalytix->>Sinalytix: AuditLog (event_type=ingestion.tier1.success)
            else Deny
                Sinalytix->>Sinalytix: AuditLog (event_type=ingestion.tier1.consent_blocked)
            end
        end
        Note over CC,P360: On-demand pull also available — CC clicks "Sync from OSCAR" on Patient header

**Kritik kurallar:**

1.  OAuth 2.0 token org-level; her org kendi OSCAR instance\'ına bağlı.
    Token rotation 90 günde bir (Doc 2 audit feed).
2.  Nightly delta sync (modified\_since) + on-demand pull (CC trigger).
3.  Her resource\'a
    `Provenance.tier=1 + Provenance.source=oscar_pro + Provenance.recorded=<sync_ts>`
    eklenir.
4.  Consent block durumunda OSCAR\'dan fetch edilen ama Patient 360\'a
    yazılmaz; raw drop. Audit izi var.
5.  Cross-source merge per entity Doc 4 kararı uygulanır; same
    Observation analyte+date+source farkı → merge ve discrepancy flag.
6.  Connection failure: 3 retry (exponential backoff: 1s, 4s, 16s),
    sonra org admin notify + Sinalytix Operations alert.

### 4.2 Tier 1 --- HealthKit / Health Connect Sync Akışı (Patient app → HCP)

    sequenceDiagram
        participant P as Patient (mobile app)
        participant PSrv as Patient App Backend
        participant HCPSrv as HCP App Backend
        participant PE as PolicyEngine
        participant CC as Care Coordinator

        P->>PSrv: HealthKit/Health Connect background sync (vitals + activity)
        PSrv->>PSrv: Validate sample (range check, dedupe)
        PSrv->>HCPSrv: POST /ingestion/tier1 (patient_id, observation_bundle)
        HCPSrv->>PE: evaluate(subject=patient_app, action=write, resource=observation, context=consent_scope)
        PE-->>HCPSrv: Allow per care team grant
        HCPSrv->>HCPSrv: Create Provenance (tier=1, source=healthkit|health_connect, device=<wearable_id>)
        HCPSrv->>HCPSrv: AuditLog (event_type=ingestion.tier1.patient_app)
        HCPSrv-->>PSrv: 201 Created
        Note over HCPSrv,CC: Patient 360 Vitals Strip auto-updates (Doc 4 real-time)

**Kritik kurallar:**

1.  Scope MVP: HR, BP, body weight, SpO2, glucose, steps, sleep (B3.2).
    Diğer kategoriler MVP\'de Patient app\'in HCP\'ye push etmesi
    engelli.
2.  Patient app validate eder (range check: HR \< 250, BP systolic \<
    300, vb.) --- outlier flag eklenebilir ama gönderilir.
3.  Source device meta `Provenance.device.identifier` ile saklanır (örn.
    \"iPhone 15 / Apple Watch Series 9\").
4.  Patient consent revoke\'ta backend retroactive hide (B4.1); Patient
    app push attempt 403 alır + UI\'da consent durumu bildirilir.
5.  Bandwidth: batch send (\~24 saatlik birikim, 5 dakikalık active
    window\'da flush).
6.  Doc 4 Vitals Strip canlı update için WebSocket bildirim (Doc 3
    worklist badge pattern\'i).

### 4.3 Tier 3 --- Patient Portal Export Upload Akışı

    flowchart TD
        A[Hasta/Aile portal export indirir<br/>MyChart/eHealth ON/OSCAR portal] --> B[Sinalytix mobile/web upload]
        B --> C{Format detect}
        C -->|CCD-A R2.1| D[Native CCD-A parser]
        C -->|FHIR Bundle JSON| E[Native FHIR Bundle parser]
        C -->|PDF/Image/diğer| F[Tier 4 OCR pipeline]
        D --> G[FHIR resource extract]
        E --> G
        G --> H[PolicyEngine consent-scope check]
        H -->|Allow| I[Provenance tier=3 + source=patient_portal_export]
        H -->|Deny| J[Reject + audit + user notify]
        I --> K[Cross-source merge per entity Doc 4]
        K --> L[Patient 360 update + WebSocket notify]
        I --> M[AuditLog event_type=ingestion.tier3.parser_success]
        F --> N[Tier 4 flow §4.4]

**Kritik kurallar:**

1.  CCD-A R2.1 + FHIR Bundle JSON MVP native (B4.2). Diğer her şey Tier
    4\'e fallback.
2.  Parser eksik/malformed olursa → Tier 4 fallback (parser-detected
    reason audit).
3.  Patient kendi yüklerse `Provenance.agent.who=Patient/<patient_id>`;
    family yüklerse `Provenance.agent.who=RelatedPerson/<relation_id>` +
    B2.3 review queue (CC).
4.  Consent scope = \"patient-owned data, care team grant active\";
    reject çok nadir ama mümkün (örn. revoked org context).
5.  Bulk upload: 100MB max batch; sayfa içeren docs Tier 4\'e split.
6.  Patient app side: HEIC iOS native; PDF eşliğinde compress yok
    (original preserve).

### 4.4 Tier 4 --- OCR + LLM Pipeline + Verification Queue Akışı (Doc 5\'in Kalbi)

    flowchart TD
        A[Doküman upload<br/>CC/HCP/Patient/Family] --> B[GuardDuty Malware Scan async]
        B -->|Clean| C[SHA-256 hash dedup check]
        B -->|Infected| Z1[Quarantine bucket + uploader notify + CC audit]
        C -->|Duplicate exact| Z2[Auto-suppress + add alternate uploader provenance]
        C -->|Unique| D[S3 Standard Canada Central original store]
        D --> E[AWS Textract Medical async job]
        E --> F[OCR output: text + entities + bounding boxes]
        F --> G[AWS Bedrock Claude Sonnet structured extraction]
        G --> H[LLM output: candidate FHIR resources + confidence + source citations]
        H --> I{Entity classification}
        I -->|Safety-critical<br/>allergy/meds/code-status/DNR| J[FORCE verification queue]
        I -->|Sensitive<br/>psych Dx/HIV+/gender| K[Auto-lockbox + verification queue]
        I -->|High-confidence non-safety| L[Auto-flow Patient 360 'unverified' badge]
        I -->|Low-confidence| M[Verification queue]
        J --> N[Verification Queue UI<br/>Default CC, configurable]
        K --> N
        M --> N
        L --> O[Patient 360 with Tier 4 'pending' badge]
        N -->|Accept| P[Resource active + Provenance.verifiedBy=CC]
        N -->|Edit + Accept| P
        N -->|Reject| Q[Resource discarded + reason audit]
        P --> O
        O --> R[Doc 4 cross-source merge + provenance badge]
        P --> S[AuditLog event_type=ingestion.tier4.verified]
        Q --> S2[AuditLog event_type=ingestion.tier4.rejected]

**Kritik kurallar:**

1.  **Safety-critical whitelist (B3.1):** Allergy, MedicationStatement,
    MedicationRequest, code-status (DNR/Goals of Care) ve specific lab
    thresholds (örn. HIV antibody, hepatitis panel) **confidence ne
    olursa olsun verification queue zorunlu** --- auto-accept yok.
2.  **Sensitive auto-detect (B2.4 MVP high-precision):** ICD-10 F-codes
    (mental health), HIV/HBV/HCV serology positive, explicit gender
    identity markers → auto-lockbox + queue.
3.  **Verification queue routing default = CC** (B1.3); org admin V1\'de
    document-type rules tanımlayabilir.
4.  **Hybrid bulk backfill (B1.4):** Yeni hasta onboarding\'inde toplu
    upload → otomatik classify confident → repository \'unverified\'
    badge ile düşer; safety-critical + low-confidence + sensitive
    queue\'ya gider.
5.  **Bedrock Claude prompt strategy:** System prompt FHIR R4 + CA Core+
    schema\'ya constrain edilir; LLM çıktısı JSON Schema validate edilir
    (malformed → retry once + fallback queue).
6.  **Source-text citation:** LLM her entity için Textract bounding box
    veya line range döner; Document Viewer (B4.4) side-by-side highlight
    için kullanılır.
7.  **Provenance:** Her LLM-extracted resource
    `Provenance.tier=4 + Provenance.source=ocr_llm + Provenance.derivedFrom=DocumentReference/<id> + Provenance.confidence=<0-1>`.
    Verified ise `Provenance.verifiedBy=Practitioner/<cc_id>` +
    `Provenance.verifiedAt=<ts>`.
8.  **Cost guardrail:** Per-doc max retry 2; Bedrock token budget
    per-doc cap (\~10K input + 4K output); aşılırsa \"manual review
    only\" flag --- auto-extraction skip, doküman repository\'de raw
    kalır.
9.  **Retry policy:** Textract failure → 3 retry (exponential); Bedrock
    failure → 2 retry; sonra \"extraction failed, manual review\"
    status + CC notify.
10. **Audit:** Her stage event\_type ile (`ingestion.tier4.uploaded`,
    `.malware_clean`, `.dedup_match`, `.textract_complete`,
    `.llm_complete`, `.queued`, `.verified`, `.rejected`, `.auto_flow`).

### 4.5 Bulk Historical Backfill Onboarding Akışı

    flowchart TD
        A[CC: Yeni hasta onboarding<br/>'Upload historical records'] --> B[Multi-file picker max 100MB batch]
        B --> C[Her dosya parallel Tier 4 pipeline §4.4]
        C --> D[Progress UI: x/y doc processed]
        D --> E{Batch tamamı OK?}
        E -->|Yes| F[Onboarding Review Summary]
        E -->|Partial| G[Failed list + retry option]
        F --> H[Auto-flowed: x docs in Repository 'unverified']
        F --> I[Queued: y docs awaiting CC verification]
        F --> J[Sensitive lockboxed: z docs]
        F --> K[CC: 'Review later' veya 'Start review now']
        K -->|Review now| L[Verification Queue UI §5.3]
        K -->|Later| M[Worklist Inbox badge + WebSocket update]

**Kritik kurallar:**

1.  Onboarding sırasında CC dosyaları drag-drop veya batch picker ile
    yükler; iş kuyruğu arka planda paralel.
2.  Progress UI realtime (WebSocket); CC tab bırakabilir, dönüş
    bildirilir.
3.  Hybrid (B1.4): confident entities auto-flow to repository with
    badge; safety-critical + low-confidence + sensitive queue.
4.  CC review now/later kararı serbest; default later --- bulk upload
    ettikten sonra normal worklist akışına döner.
5.  Worklist inbox (Doc 3) Tier 4 verification badge ile günceller.

### 4.6 Verification Queue Review (CC veya routed reviewer)

    sequenceDiagram
        participant CC as CC (veya routed HCP)
        participant Q as Verification Queue UI
        participant V as Document Viewer
        participant P360 as Patient 360
        participant AL as Audit Log

        CC->>Q: Open Verification Queue (filter: patient, doc type, priority)
        Q->>CC: Pending items list (sorted: safety-critical first, then date)
        CC->>V: Open document
        V->>V: Side-by-side: original PDF (left) + LLM entities (right)
        V->>CC: Highlight source text per entity (citation)
        alt Accept as-is
            CC->>P360: Resource active, Provenance.verifiedBy=CC
            P360->>AL: event_type=ingestion.tier4.verified
        else Edit + Accept
            CC->>V: Inline edit entity (value/date/code)
            CC->>P360: Edited resource active, Provenance.verifiedBy=CC + .editorialNote
            P360->>AL: event_type=ingestion.tier4.verified_edited
        else Reject
            CC->>Q: Reject + reason (incorrect/duplicate/not-clinically-relevant)
            Q->>AL: event_type=ingestion.tier4.rejected (with reason)
            Note over Q,AL: Original document preserved; only LLM-extracted entity discarded
        else Defer
            CC->>Q: "Need MD review" → routes to MRP/Specialist queue
            Q->>AL: event_type=ingestion.tier4.deferred
        end

**Kritik kurallar:**

1.  Reviewer aksiyonları audit log\'da reason + actor + timestamp ile.
2.  Edit + Accept: hem original LLM çıkarımı hem CC edit version
    saklanır (Provenance trace).
3.  Reject: LLM-extracted entity discard ama original doc Repository\'de
    kalır (legal preserve, B2.1).
4.  Defer to MD: routing rule fallback path (org admin V1 ile
    yapılandırılabilir).
5.  Reviewer timeout: 7 gün queue\'da bekleyen item → escalate
    notification (CC olmadığında MRP).

### 4.7 Consent Revoke Mid-Stream Akışı

    flowchart TD
        A[Patient revokes consent for Org X / HCP Y] --> B[Doc 10 consent event broadcast]
        B --> C[Worklist patient panel grey 5s animation Doc 3]
        B --> D[Tier 1-4 ingestion ANY active job for this patient: abort + cleanup]
        B --> E[Patient 360 access blocked next request]
        B --> F[Repository: docs marked 'access blocked'<br/>original retained immutable]
        B --> G[Provenance.consentStatus=revoked + revokedAt]
        B --> H[AuditLog event_type=consent.revoked + downstream cascade]
        F --> I{Re-consent?}
        I -->|Yes| J[Restore: access unblocked, Provenance.consentStatus=active]
        I -->|No after retention period| K[V1+: Hard delete request workflow]

**Kritik kurallar:**

1.  Consent revoke immediate; ingestion in-flight jobs abort (next stage
    gate check).
2.  Original docs S3\'te kalır (legal); access blocked = API 403, UI
    hidden.
3.  Re-consent edildiğinde data otomatik restore (consentStatus toggle).
4.  Hard delete (right-to-be-forgotten) ayrı workflow V1+; PHIPA
    retention exception için legal review zorunlu.
5.  Audit cascade: parent consent event + cascading \'access\_blocked\'
    events her resource için (zaten audit log\'a yazılı).

### 4.8 Dedup Decision Akışı

    flowchart TD
        A[Yeni upload bytes] --> B[SHA-256 hash compute]
        B --> C{Hash match existing?}
        C -->|Yes exact| D[Auto-suppress duplicate]
        D --> E[Add alternate uploader to Provenance.agent]
        D --> F[Audit event_type=ingestion.dedup.exact_match]
        D --> G[User notify: 'Doküman zaten var, ek uploader kaydedildi']
        C -->|No| H[Store new doc]
        H --> I[Tier 4 LLM semantic dedup check post-extraction]
        I --> J{LLM detects: 'same content as existing doc'}
        J -->|Yes| K[Warn user: 'Bu doc içerik olarak X ile benzer. Birleştirilsin mi?']
        K -->|Merge| L[Provenance merge + alt agent]
        K -->|Keep both| M[Both retained + cross-reference]
        J -->|No| N[Normal flow §4.4]

**Kritik kurallar:**

1.  Hash check upload anında (S3 store\'dan önce); exact match → store
    etme, sadece Provenance update.
2.  Semantic dedup LLM-driven, post-Bedrock extraction; warn-only,
    action user\'a kalır.
3.  Audit her dedup decision için (exact/semantic/keep\_both/merge).
4.  Family + CC ayrı uploader exact match → her ikisi de
    Provenance.agent listesinde, single resource.

§5 --- Ekran/Yüzey Spec
-----------------------

### 5.1 Ekran Envanteri ve Platform Dağılımı

  Ekran ID             İsim                                           Mobile (RN)   Web (React)   Birincil Rol
  -------------------- ---------------------------------------------- ------------- ------------- ---------------------------------------
  INGEST-INBOX-01      Verification Inbox (worklist tab)              ✓             ✓             CC, MRP, routed HCP
  INGEST-QUEUE-01      Verification Queue (full)                      Lite          ✓             CC, routed HCP
  INGEST-REVIEW-01     Document Review (side-by-side viewer)          Lite          ✓             CC, MRP, routed HCP
  REPO-LIST-01         Document Repository (browse + filter)          ✓             ✓             Tüm HCP rolleri
  REPO-VIEW-01         Document Viewer (PDF.js + entities)            Read-only     ✓ Full        Tüm HCP rolleri
  INGEST-UPLOAD-01     Doküman Upload (modal/drawer)                  ✓             ✓             CC, HCP, Patient/Family (Patient app)
  INGEST-BACKFILL-01   Onboarding Bulk Backfill Wizard                Lite          ✓ Full        CC
  INGEST-SOURCE-01     Connected Sources (Settings)                   ✓             ✓             CC, Org Admin
  INGEST-HISTORY-01    Ingestion History (Patient timeline overlay)   ✓             ✓             Tüm HCP rolleri

**Tasarım prensipleri:**

-   Web Tier 4 review iş akışları full-feature; mobile reviewer light
    experience (sahada hızlı triage; complex edit web).
-   Document Viewer mobile read-only + entity tap-to-highlight; web tam
    edit + side-by-side.
-   Bulk backfill wizard web-only full UX (drag-drop multi-file CC
    desktop); mobile sadece progress monitor.

### 5.2 INGEST-INBOX-01 --- Verification Inbox (Worklist Tab)

**Konum:** Worklist screen\'inde tab/badge olarak (Doc 3 worklist
integration).

**Mobile (RN):**

-   Header: \"Verification\" tab + count badge (örn. \"7\")
-   Liste: Card per pending item (vertical scroll)
    -   Patient name + photo
    -   Doc type icon (lab, imaging, discharge summary, allergy update,
        etc.)
    -   Source badge (Tier 4 / Patient Upload / OSCAR)
    -   Priority badge (safety-critical: kırmızı; sensitive: mor;
        standard: gri)
    -   Age (örn. \"2h önce\", \"yesterday\")
    -   Sağ chevron → tap → INGEST-REVIEW-01
-   Sort: safety-critical → sensitive → age (oldest first)
-   Filter (top right gear): doc type, source, priority, patient
-   Pull-to-refresh + 15s polling fallback (Doc 3 pattern)

**Web (React):**

-   Sidebar nav: Worklist \> Verification (count badge)
-   Liste table:
    -   Columns: Priority \| Patient \| Doc Type \| Source \| Uploaded
        By \| Age \| Actions
    -   Bulk select checkbox column
    -   Row click → INGEST-REVIEW-01 sağ panel açılır (split view)
-   Bulk actions: Defer to MRP, Reject (only if uploader trust low),
    Mark as reviewed (specific tier confirms)
-   Filter chips header: priority, doc type, patient, date range
-   Real-time WebSocket badge update; 15s polling fallback

### 5.3 INGEST-QUEUE-01 --- Verification Queue (Full Page)

**Konum:** Worklist Verification tab\'ından \"Full Queue\" link veya
doğrudan nav.

**Web (React) --- Full UX:**

-   Top bar: filter chips (priority, doc type, patient, age,
    routed-to-me)
-   Left panel: queue list (50 items, infinite scroll cursor --- Doc 3
    pattern)
-   Right panel: selected item review (INGEST-REVIEW-01 embed)
-   Empty state: \"Tüm verification tamamlandı. Yeni dokümanlar burada
    görünecek.\"
-   Activity log accordion: \"Last 24h activity\" (audit overlay)

**Mobile (RN) --- Lite:**

-   Sadece liste; tap → INGEST-REVIEW-01 ayrı screen
-   Filter modal bottom sheet
-   Sahada hızlı triage; complex edit web\'e yönlendirme banner

### 5.4 INGEST-REVIEW-01 --- Document Review (Side-by-Side Viewer)

**Konum:** Verification queue\'dan açılır veya Repository\'den
\"Review\" CTA.

**Web (React) --- Birincil deneyim:**

-   Header sticky:
    -   Patient name + photo + age + allergies pill (Doc 4 header
        pattern)
    -   Doc metadata: type, source, uploaded by, upload date, page count
    -   Action bar: Accept All, Reject All, Save Draft, Close
-   Body split (50/50):
    -   **Sol:** PDF.js viewer + zoom controls + page nav +
        search-in-doc
    -   **Sağ:** LLM-extracted entities panel (collapsible groups by
        FHIR resource type)
        -   **Allergies** (safety-critical badge)
        -   **Medications** (safety-critical badge)
        -   **Conditions / Problems**
        -   **Observations / Lab Results**
        -   **Procedures**
        -   **Immunizations**
        -   **Documents/Notes** (free-text excerpt)
-   Her entity row:
    -   Confidence pill (high/medium/low)
    -   Source citation: tap → sol PDF\'te highlight + auto-scroll
    -   Edit pencil → inline edit (value, code, date, note)
    -   Accept (checkmark) / Reject (X) / Defer to MD (arrow)
-   Bulk select group: \"Accept all high-confidence non-safety\"
-   Footer: Verification summary (X accepted, Y queued, Z rejected) +
    \"Submit Verification\"
-   Cross-source diff warning: \"Bu allergy LifeLabs\'tan farklı geliyor
    --- fark var\" → Doc 4 discrepancy flag UI

**Mobile (RN) --- Lite:**

-   Tab navigator: Document (PDF preview) \| Entities (list)
-   Document tab: PDF.js read-only, zoom, page nav
-   Entities tab: collapsible groups; tap entity → modal entity detail +
    accept/reject/defer
-   Edit disabled mobile (web banner: \"Edit on web for full control\")
-   Bulk actions limited (accept all high-conf non-safety only)

**Erişilebilirlik:**

-   Keyboard nav: ↑↓ entity navigation, A=accept, R=reject, D=defer,
    E=edit
-   Screen reader: entity confidence + source citation + safety flag
    announcement
-   High contrast: confidence pills color + icon dual encode

### 5.5 REPO-LIST-01 --- Document Repository (Browse + Filter)

**Konum:** Patient 360 sayfasından \"Documents\" tab veya patient
context\'inde \"Repository\" nav.

**Mobile (RN):**

-   Header: patient name + count badge
-   Tab nav: All \| Active (verified) \| Pending Review \| Archived
-   Liste: card per doc (newest first)
    -   Doc type icon + title
    -   Source badge (Tier 1 EMR / Tier 3 Patient / Tier 4 OCR)
    -   Uploaded by + date
    -   Status badge (verified / pending / rejected / lockboxed)
-   Search field: full-text (title + LLM-extracted summary)
-   Filter chips: type, source, date range, status

**Web (React):**

-   Patient 360 right rail panel veya dedicated tab
-   Table:
    -   Columns: Title \| Type \| Source \| Uploaded By \| Date \|
        Status \| Size \| Actions
    -   Sort: date desc default
    -   Bulk select: download, archive, restore
-   Filter sidebar: type, source, date range, status, uploader role
-   Search: full-text + advanced (saved searches V1)
-   Empty state per tab

### 5.6 REPO-VIEW-01 --- Document Viewer

**Konum:** Repository\'den tap; Patient 360 timeline event\'inden tap;
Verification Queue\'dan \"View Source\".

**Web (React) --- PDF.js + side panel:**

-   Sol main: PDF.js full viewer (zoom, page nav, search, rotate,
    download)
-   Sağ panel (collapsible): Document metadata + LLM-extracted entities
    (read-only if verified, edit if pending)
-   Top bar: doc title + status badge + breadcrumb (Patient → Repository
    → Doc)
-   Action bar: Download Original, Re-trigger LLM (V1), Archive,
    Annotation (V1)

**Mobile (RN) --- Read-only:**

-   PDF.js full screen viewer; pinch-zoom, swipe page nav
-   Bottom drawer: metadata + entities (read-only)
-   Action button: Download to device (consent prompt --- endpoint risk
    warning)

### 5.7 INGEST-UPLOAD-01 --- Doküman Upload

**Konum:** Document Repository\'den FAB \"+\"; Patient 360\'tan
\"Upload\"; Worklist\'ten \"Quick upload\"; Patient mobile app\'ten ana
ekran upload.

**Mobile (RN):**

-   Modal bottom sheet:
    -   Patient selector (worklist\'ten geldiyse otomatik)
    -   Source selector: Camera (in-app) / Photo Library / Files (PDF)
    -   Doc type hint (optional dropdown: lab, imaging, discharge, note,
        other) --- LLM zaten classify edecek ama hint speed
    -   \"Sensitive --- flag as lockbox\" toggle (optional manual hint)
    -   Upload button
-   Progress: per-file progress bar + cancel
-   Success: \"Uploaded --- Tier 4 processing in background. Sonuçlar
    Verification Inbox\'ta.\"

**Web (React):**

-   Modal veya drawer:
    -   Drag-drop zone + file picker
    -   Multi-file support (up to batch limit 100MB)
    -   Per-file: type hint dropdown, sensitive toggle, remove
    -   Patient context fixed (URL\'den)
    -   Upload button + progress per-file

**Doğrulama:**

-   File format check: B3.3 whitelist (PDF, JPEG, PNG, HEIC); reject +
    user-friendly mesaj
-   Size check: per-file 25MB, batch 100MB
-   Virus scan async başlatılır (B4.3); upload UI bekletmez
-   Patient consent scope check: org context\'inde upload yetkisi var
    mı?

### 5.8 INGEST-BACKFILL-01 --- Onboarding Bulk Backfill Wizard

**Konum:** Yeni hasta onboarding flow\'unun son adımı (Doc 1 onboarding
ile bağlı) veya Patient 360\'tan \"Bulk Import History\".

**Web (React) --- Full UX (CC desktop primary):**

-   Step 1: \"Geçmiş dokümanları yükle\" intro
    -   Hatırlatma: \"Bu hasta için tarihsel klinik dokümanları toplu
        olarak yükleyebilirsiniz. Sistem otomatik kategorize edip
        Patient 360\'a aktaracak; safety-critical olanları size review
        için işaretleyecek.\"
    -   \"Devam et\" CTA
-   Step 2: Drag-drop multi-file (up to 100MB batch)
    -   File list with per-file thumbnail, name, size, type detect
    -   Estimated processing time (\~30s per doc tahmin)
-   Step 3: Processing
    -   Progress: X/Y docs processed
    -   Real-time WebSocket update
    -   \"Tab açık bırakabilirsiniz, tamamlandığında bildirim
        alacaksınız\"
-   Step 4: Summary
    -   Auto-flowed (high confidence non-safety): X items → Repository
        unverified
    -   Queued (safety-critical, sensitive, low-confidence): Y items →
        Verification Queue
    -   Sensitive lockboxed: Z items
    -   Failed (extraction error): N items (retry option)
    -   CTA: \"Review Queue Now\" veya \"Continue to Patient 360\"

**Mobile (RN) --- Lite:**

-   Step 1+2: file picker (limited multi-select per OS)
-   Step 3: Progress monitor (push notif on completion)
-   Step 4: Summary card → \"Open on web for review\" recommend

### 5.9 INGEST-SOURCE-01 --- Connected Sources (Settings)

**Konum:** Settings → Connected Sources (Org-level CC + Org Admin view;
patient-level read-only HCP view).

**Web + Mobile:**

-   Org-level (CC, Org Admin):
    -   OSCAR Pro: status (connected / disconnected / error), last sync,
        \"Disconnect\" / \"Reconnect\" CTA
    -   eHealth Ontario (V1+): placeholder \"Coming V1\"
    -   Tier 2 partners (V2+): \"AlayaCare / PCC / TELUS --- Coming
        V2+\"
-   Patient-level (HCP view):
    -   HealthKit/Health Connect status per patient (if patient app
        linked): last sync, scope summary
    -   Patient portal export count + last upload
-   Sync history per source (last 30 days)
-   Error log (org admin only)

### 5.10 INGEST-HISTORY-01 --- Ingestion History (Patient Timeline Overlay)

**Konum:** Patient 360 Timeline\'ında (Doc 4) \"Ingestion events\"
toggle.

**Mobile + Web:**

-   Timeline overlay events:
    -   \"Tier 1 sync: 12 Observations from OSCAR (May 28)\"
    -   \"Tier 4 upload: Discharge summary (Apr 15) --- verified by CC
        Anne\"
    -   \"Tier 3 upload: Patient portal export (Mar 22) --- 34 records
        imported\"
    -   \"Tier 4 rejected: Duplicate document (Feb 10) --- reason: dedup
        match\"
-   Tap event → ingestion job detail modal (audit trace)
-   Filter: tier, event type, date range
-   Privacy: sensitive doc\'lar lockbox kuralına uyar (Doc 4 + B2.4)

### 5.11 Ekran-Arası Etkileşim Notları

-   **Worklist (Doc 3) ↔ Verification Inbox:** Tab bağlı; WebSocket
    badge update aynı channel.
-   **Patient 360 (Doc 4) ↔ Repository:** Patient 360\'taki \"Tier 4
    pending\" badge\'i tıklanınca related doc Repository\'de açılır.
-   **Patient 360 Timeline ↔ Ingestion History:** Overlay toggle; aynı
    event bus.
-   **Onboarding (Doc 1) ↔ Bulk Backfill:** Onboarding son adımdan
    opsiyonel link; soft-gate verification beklerken bile backfill
    başlatılabilir (consent + care team grant active olduğunda).
-   **Settings → Audit Log (Doc 2 V1) ↔ Ingestion event types:** Tier
    1-4 event\'ler aynı audit query UI\'sında filtrelenebilir.

§6 --- Veri Modeli (FHIR R4 + CA Core+)
---------------------------------------

### 6.1 FHIR Resource Kullanımı --- Doc 5 Scope

Doc 5 yeni custom resource yaratmaz; tüm ingestion canonical FHIR R4 +
CA Core+ profile\'larına serialize edilir. Sinalytix-internal ingestion
jobs ve verification queue için ek PostgreSQL tabloları tanımlanır.

**Birincil FHIR Resources:**

  Resource                Kullanım
  ----------------------- ------------------------------------------------------------------------------------------------------------------------
  `DocumentReference`     Tier 3-4 uploaded original document metadata + S3 reference (binary content)
  `Binary`                Original PDF/image bytes (S3-backed, FHIR Binary resource opsiyonel wrapper)
  `Provenance`            Her ingested data point için attribute (tier, source, agent, confidence, verifiedBy) --- Doc 4 cross-source merge feed
  `Observation`           Tier 1 vitals + lab results + Tier 4 extracted lab values
  `MedicationStatement`   Patient-reported medication list (Tier 1 OSCAR + Tier 4 extracted)
  `MedicationRequest`     Active Rx (Tier 1 OSCAR)
  `Condition`             Active problem list (Tier 1 + Tier 4 extracted Dx)
  `AllergyIntolerance`    Allergies (safety-critical; B3.1 always verification queue)
  `Procedure`             Past procedures (Tier 4 extracted from discharge summaries)
  `Immunization`          Vaccine history (Tier 1 + Tier 4)
  `Consent`               Doc 10 patient consent layer (her ingestion event consent-scope check)
  `Patient`               Mevcut Patient resource (Doc 4 baseline); ingestion update etmez (sadece read)
  `Task`                  Verification queue item internal representation (FHIR Task with status: requested → in-progress → completed/rejected)

### 6.2 DocumentReference Profile (Sinalytix Tier 3-4)

    DocumentReference:
      id: <uuid>
      status: current | superseded | entered-in-error
      docStatus: preliminary | final | amended
      type: <LOINC document type> (e.g. 11506-3 "Progress note", 18842-5 "Discharge summary")
      category: clinical-note | lab-result | imaging | discharge-summary | patient-uploaded | other
      subject: Reference(Patient/<patient_id>)
      date: <upload_timestamp>
      author:
        - Reference(Practitioner/<uploader_id>) | Reference(Patient/<patient_id>) | Reference(RelatedPerson/<family_id>)
      custodian: Reference(Organization/<org_id>)
      content:
        - attachment:
            contentType: application/pdf | image/jpeg | image/png | image/heic
            url: s3://sinalytix-docs-ca-central/<org_id>/<patient_id>/<doc_id>.<ext>
            size: <bytes>
            hash: <SHA-256>
            title: <filename>
            creation: <original_doc_date_if_known>
      context:
        encounter: Reference(Encounter/<id>) | null
        period: { start: ..., end: ... }
        facilityType: <if known from doc>
        practiceSetting: home-care | hospital | clinic | lab
        related:
          - Reference(DocumentReference/<dedup_alt_id>) (if dedup'd)
      meta:
        tag:
          - { system: "https://sinalytix.ca/codes", code: "tier-3" | "tier-4" }
          - { system: "https://sinalytix.ca/codes", code: "lockbox" } (if sensitive)
        extension:
          - sinalytix-ingestion-job-id
          - sinalytix-llm-extraction-id (if tier 4)
          - sinalytix-verification-status: pending | verified | rejected

### 6.3 Provenance Profile (Sinalytix Tier 1-4)

    Provenance:
      id: <uuid>
      target:
        - Reference(<resource_type>/<resource_id>)  # Observation, MedicationStatement, etc.
      recorded: <ingestion_timestamp>
      occurred:
        period: { start: <doc_date>, end: <doc_date> } | dateTime: <single>
      policy:
        - "https://sinalytix.ca/policy/patient-consent/<consent_id>"
      agent:
        - type: { coding: [{ code: author }] }
          who: Reference(Patient/<id>) | Reference(Practitioner/<id>) | Reference(RelatedPerson/<id>) | Reference(Device/<id>)
          onBehalfOf: Reference(Organization/<id>) | null
        - type: { coding: [{ code: verifier }] }  # Tier 4 only, post-verification
          who: Reference(Practitioner/<cc_id>)
      entity:
        - role: source
          what: Reference(DocumentReference/<id>) | Reference(Device/<wearable_id>) | URL(<oscar_endpoint>)
      signature:
        - type: { code: "1.2.840.10065.1.12.1.1" }  # Author's Signature
          when: <ts>
          who: Reference(Practitioner/<cc_id>)  # Tier 4 verified by
      meta:
        tag:
          - { system: "https://sinalytix.ca/codes/tier", code: "1" | "2" | "3" | "4" }
          - { system: "https://sinalytix.ca/codes/source", code: "oscar_pro" | "healthkit" | "health_connect" | "patient_portal_export" | "ocr_llm" }
        extension:
          - sinalytix-confidence: 0.0-1.0  # Tier 4 LLM confidence
          - sinalytix-source-citation: { page: N, line_start: M, line_end: K }  # Tier 4
          - sinalytix-verification-status: pending | verified | rejected | edited_and_verified
          - sinalytix-editorial-note: <free-text if CC edited before accepting>
          - sinalytix-consent-status: active | revoked  # mutable; updates with Doc 10 consent events

**Provenance kuralları:**

1.  Her ingested clinical resource için **bir Provenance zorunlu**. Doc
    4 cross-source merge per-entity bu Provenance\'i kullanır.
2.  Provenance immutable history (audit trail): edit yapıldığında yeni
    Provenance oluşturulur, eski preserve (FHIR Provenance versioning).
3.  Tier 4 verified resource: Provenance ikinci agent (`verifier`)
    eklenir; `verification-status=verified` + signature.
4.  Consent revoke: Provenance.extension.consent-status=revoked olarak
    update; resource Patient 360\'da hidden ama Provenance trail tam.

### 6.4 Ingestion Job --- Internal PostgreSQL Schema

    -- Tier 1-4 ingestion job tracking
    CREATE TABLE ingestion_jobs (
      id UUID PRIMARY KEY,
      tier SMALLINT NOT NULL CHECK (tier IN (1,2,3,4)),
      source TEXT NOT NULL,  -- 'oscar_pro', 'healthkit', 'health_connect', 'patient_portal_export', 'ocr_llm'
      patient_id UUID NOT NULL,
      org_id UUID NOT NULL,
      initiated_by UUID,  -- user_id (NULL for system-scheduled syncs)
      initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      status TEXT NOT NULL CHECK (status IN ('queued', 'in_progress', 'extraction_complete', 'queued_for_review', 'completed', 'failed', 'aborted_consent_revoked')),
      document_reference_id UUID,  -- for Tier 3-4
      batch_id UUID,  -- bulk backfill grouping
      metadata JSONB,  -- tier-specific (e.g. OSCAR delta range, HealthKit sample count, Tier 4 LLM tokens used)
      cost_estimate_usd NUMERIC(10,4),  -- Tier 4 Textract + Bedrock cost
      error_detail JSONB,
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_ingestion_jobs_patient ON ingestion_jobs(patient_id, initiated_at DESC);
    CREATE INDEX idx_ingestion_jobs_status ON ingestion_jobs(status) WHERE status != 'completed';
    CREATE INDEX idx_ingestion_jobs_batch ON ingestion_jobs(batch_id) WHERE batch_id IS NOT NULL;
    CREATE INDEX idx_ingestion_jobs_org_month ON ingestion_jobs(org_id, date_trunc('month', initiated_at));  -- cost reporting

    -- RLS: org-level isolation
    ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY ingestion_jobs_org_isolation ON ingestion_jobs
      USING (org_id = current_setting('app.acting_org_id')::uuid);
    -- Tier 4 extracted entities (pre-verification)
    CREATE TABLE tier4_extraction_entities (
      id UUID PRIMARY KEY,
      ingestion_job_id UUID NOT NULL REFERENCES ingestion_jobs(id),
      document_reference_id UUID NOT NULL,
      fhir_resource_type TEXT NOT NULL,  -- 'Observation', 'MedicationStatement', etc.
      candidate_fhir_resource JSONB NOT NULL,  -- LLM output JSON, FHIR R4 + CA Core+ compliant
      confidence NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
      source_citation JSONB,  -- { page, line_start, line_end, bbox: {x,y,w,h} }
      is_safety_critical BOOLEAN NOT NULL DEFAULT false,
      is_sensitive BOOLEAN NOT NULL DEFAULT false,
      verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'auto_flowed', 'verified', 'verified_edited', 'rejected', 'deferred')),
      verified_by_user_id UUID,
      verified_at TIMESTAMPTZ,
      rejection_reason TEXT,
      editorial_note TEXT,
      routed_to_user_id UUID,  -- if routing rule applied
      resource_id_on_accept UUID,  -- FHIR resource id created when verified
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_tier4_entities_status ON tier4_extraction_entities(verification_status) WHERE verification_status IN ('pending', 'deferred');
    CREATE INDEX idx_tier4_entities_doc ON tier4_extraction_entities(document_reference_id);
    CREATE INDEX idx_tier4_entities_routing ON tier4_extraction_entities(routed_to_user_id) WHERE verification_status = 'pending';

    ALTER TABLE tier4_extraction_entities ENABLE ROW LEVEL SECURITY;
    -- Document hash index for dedup
    CREATE TABLE document_hash_index (
      hash_sha256 BYTEA PRIMARY KEY,
      patient_id UUID NOT NULL,
      primary_document_reference_id UUID NOT NULL,
      alternate_uploaders JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{user_id, uploaded_at, role}]
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_doc_hash_patient ON document_hash_index(patient_id);

    ALTER TABLE document_hash_index ENABLE ROW LEVEL SECURITY;
    -- Note: cross-org dedup not allowed (each org's docs isolated, even if same SHA-256)
    CREATE POLICY doc_hash_patient_consent ON document_hash_index
      USING (patient_id IN (SELECT patient_id FROM patient_consent_grant WHERE org_id = current_setting('app.acting_org_id')::uuid AND status = 'active'));
    -- Connected source credentials (org-level OAuth tokens, etc.)
    CREATE TABLE connected_sources (
      id UUID PRIMARY KEY,
      org_id UUID NOT NULL,
      source_type TEXT NOT NULL,  -- 'oscar_pro', 'ehealth_ontario_olis' (V1+)
      status TEXT NOT NULL CHECK (status IN ('active', 'error', 'disconnected', 'pending_oauth')),
      credentials_encrypted BYTEA NOT NULL,  -- AES-256, KMS-managed key
      credentials_metadata JSONB,  -- non-secret meta (endpoint, scope, expiry)
      last_sync_at TIMESTAMPTZ,
      last_error JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_connected_sources_org ON connected_sources(org_id);
    ALTER TABLE connected_sources ENABLE ROW LEVEL SECURITY;

### 6.5 Audit Log Event Type Genişlemesi (Doc 2 Canonical Schema\'ya Ek)

Doc 5\'in Doc 2 canonical AuditLogEntry\'ye eklediği event\_type
taxonomy:

**Category: ingestion**

  event\_type                               Tetikleyici                                  Tier
  ----------------------------------------- -------------------------------------------- ------
  `ingestion.tier1.success`                 Tier 1 sync başarılı (resource count meta)   1
  `ingestion.tier1.failure`                 Tier 1 sync hatası (retry meta)              1
  `ingestion.tier1.consent_blocked`         Consent check failed mid-sync                1
  `ingestion.tier1.patient_app`             Patient app HealthKit/Health Connect push    1
  `ingestion.tier3.parser_success`          CCD-A / FHIR Bundle native parse             3
  `ingestion.tier3.parser_fallback_tier4`   Parser failed, fallback Tier 4               3
  `ingestion.tier4.uploaded`                Doküman S3\'e yazıldı                        4
  `ingestion.tier4.malware_clean`           GuardDuty scan temiz                         4
  `ingestion.tier4.malware_flagged`         GuardDuty quarantine                         4
  `ingestion.tier4.dedup_match`             SHA-256 exact match                          4
  `ingestion.tier4.textract_complete`       Textract OCR tamam                           4
  `ingestion.tier4.textract_failed`         Textract hata                                4
  `ingestion.tier4.llm_complete`            Bedrock Claude extraction tamam              4
  `ingestion.tier4.llm_failed`              Bedrock hata (retry/skip)                    4
  `ingestion.tier4.queued`                  Verification queue\'ya alındı                4
  `ingestion.tier4.auto_flowed`             High-confidence non-safety, otomatik flow    4
  `ingestion.tier4.verified`                Reviewer accept                              4
  `ingestion.tier4.verified_edited`         Reviewer edit + accept                       4
  `ingestion.tier4.rejected`                Reviewer reject (reason meta)                4
  `ingestion.tier4.deferred`                Reviewer defer to MD                         4
  `ingestion.sensitive.auto_lockboxed`      LLM sensitive auto-detect → lockbox          4
  `ingestion.bulk_backfill.started`         Onboarding bulk backfill batch               3-4
  `ingestion.bulk_backfill.completed`       Batch tamamlandı                             3-4
  `ingestion.cost.budget_exceeded`          Per-doc veya per-org cost cap aşıldı         4
  `ingestion.dedup.exact_match`             Hash dedup eşleşti                           3-4
  `ingestion.dedup.semantic_warning`        LLM semantic dedup uyarısı                   4
  `ingestion.dedup.merge_decided`           User merge decision                          3-4

**Category: connected\_source**

  event\_type                          Tetikleyici
  ------------------------------------ -----------------------------
  `connected_source.connected`         OAuth flow tamam
  `connected_source.disconnected`      Org admin disconnect
  `connected_source.token_refreshed`   OAuth token rotation
  `connected_source.error_recurring`   3+ consecutive sync failure

**Category: consent** (Doc 10 ile koordineli, Doc 5\'in feed\'i)

  event\_type                            Tetikleyici
  -------------------------------------- -----------------------------------------------
  `consent.revoked.ingestion_cascade`    Consent revoke → tüm ingestion access blocked
  `consent.restored.ingestion_cascade`   Re-consent → access restored

### 6.6 PolicyEngine Integration (Doc 2 Generic Interface)

Doc 5\'in Tier 1-4 her ingestion ve read operasyonu PolicyEngine
üzerinden geçer:

    // Tier 1 OSCAR sync: org → patient resource pull
    PolicyEngine.evaluate({
      subject: { type: 'system', id: org.id, role: 'tier1_sync_agent' },
      action: 'read',
      resource: { type: 'Patient', id: patient.id },
      context: {
        org_id: org.id,
        consent_scope: 'care_team_active',
        source: 'oscar_pro_sync'
      }
    });

    // Tier 3 patient upload: patient → write own document
    PolicyEngine.evaluate({
      subject: { type: 'user', id: patient.id, role: 'patient' },
      action: 'write',
      resource: { type: 'DocumentReference', id: 'new' },
      context: { patient_id: patient.id, org_id: target_org.id, consent_scope: 'patient_owned_data' }
    });

    // Tier 4 verification queue review
    PolicyEngine.evaluate({
      subject: { type: 'user', id: cc.id, role: 'care_coordinator' },
      action: 'verify',
      resource: { type: 'tier4_extraction_entity', id: entity.id },
      context: { patient_id, org_id, sensitive: entity.is_sensitive }
    });

    // Document Viewer read (sensitive lockbox check)
    PolicyEngine.evaluate({
      subject: { type: 'user', id: hcp.id, role: hcp.role },
      action: 'read',
      resource: { type: 'DocumentReference', id: doc.id, tags: doc.meta.tag },
      context: { patient_id, sensitive_scope: hcp.consent_grants.sensitive }
    });

MVP impl: PG RBAC join + consent\_grant + sensitive\_scope table joins.
V1 swap: AWS Cedar policy as code.

### 6.7 Cross-Doc Data Model Bağlantıları

  Doc 5 Resource/Table                                             Bağlı Doc                                     İlişki
  ---------------------------------------------------------------- --------------------------------------------- -------------------------------------------------------------------
  `DocumentReference`                                              Doc 4 Patient 360 timeline                    Timeline event source for doc upload/verify events
  `Provenance`                                                     Doc 4 cross-source merge + provenance badge   Doc 4 her data point için provenance.tier badge gösterir
  `Provenance.consent-status`                                      Doc 10 consent layer                          Doc 10 consent event → cascade update Provenance
  `tier4_extraction_entities`                                      Doc 3 worklist verification badge             Pending count badge feed
  `Observation/MedicationStatement/Condition/AllergyIntolerance`   Doc 4 Patient 360 sections                    Auto-flowed (or verified) resources doğrudan Patient 360\'a girer
  `ingestion_jobs`                                                 Doc 2 audit log                               Her job state change → audit event
  `connected_sources`                                              Doc 1 org admin                               Org admin Settings\'ten yönetir
  `document_hash_index`                                            Doc 4 cross-source merge                      Dedup ile çakışmayı önler

§7 --- Hata ve Edge Cases
-------------------------

### 7.1 Tier 1 Hataları

  Senaryo                                                           Sistem Davranışı                                                                              UX
  ----------------------------------------------------------------- --------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------
  OSCAR API down (5xx)                                              3 retry exponential (1s, 4s, 16s); sonra job status=failed; nightly cron retry next window    Connected Sources\'ta \"Last sync failed\" badge; org admin alert email
  OSCAR OAuth token expired                                         Refresh attempt → fail → status=pending\_oauth; sync paused                                   Org admin: \"Reconnect OSCAR\" CTA + how-to
  OSCAR returns malformed FHIR                                      Job status=failed + error.detail kaydı; resource skip; Sinalytix Operations alert             UI\'da görünmez (background); ops investigate
  HealthKit/Health Connect permission revoked by patient            Patient app push attempt → 403 from Sinalytix backend → patient app local warning             Patient app: \"Wearable senkronizasyonu durduruldu\" --- patient kararı
  HealthKit sample range outlier (HR 300, BP 400/250)               Backend validate reject + audit `ingestion.tier1.outlier_rejected`; raw drop                  Patient app: silent (advanced user log\'da görür); HCP\'ye gelmez
  Patient app offline → catch-up batch                              Patient app queue local; reconnect → bulk push (max batch size); idempotency key per sample   Patient app: \"Senkronize ediliyor\...\" indicator
  Cross-source duplicate same Observation (OSCAR + HealthKit)       Doc 4 cross-source merge + provenance badge per source; both preserved                        Patient 360: tek Observation, \"2 source\" badge
  Multi-org patient: OSCAR sync from Org A, Org B aynı patient\'a   Her org kendi Provenance.onBehalfOf=org\_id ile; data shared via patient consent (Doc 10)     Patient 360: source badge \"Org A --- OSCAR\" / \"Org B --- OSCAR\" ayrımı

### 7.2 Tier 3 Hataları

  Senaryo                                                                         Sistem Davranışı                                                      UX
  ------------------------------------------------------------------------------- --------------------------------------------------------------------- -------------------------------------------------------------------------------------------------------------------------
  CCD-A malformed                                                                 Parser exception → Tier 4 fallback + audit reason                     \"Parser hata, OCR pipeline\'a aktarılıyor\" notice
  FHIR Bundle invalid schema                                                      Validate fail → Tier 4 fallback                                       Aynı yukarı
  Patient portal export çok büyük (\>100MB)                                       Upload UI reject + suggest split                                      \"Dosya 100MB\'tan büyük. Lütfen bölün veya küçültün.\"
  CCD-A patient mismatch (export\'taki demografi Sinalytix patient ile uyumsuz)   Upload reject + flag mismatch                                         \"Bu export farklı bir hastaya ait gibi görünüyor. Lütfen kontrol edin.\" (false-positive olabilir; manual override CC)
  Patient app upload bağlantı kopuşu (mobil zayıf 4G)                             Resumable upload (S3 multipart); auto-resume next reachable network   Patient app: \"Upload duraklatıldı, otomatik devam edecek\"
  Family upload patient revoke etti                                               PolicyEngine deny → upload reject + RelatedPerson notify              Family app: \"Bu hasta için artık doküman yükleyemezsiniz\"

### 7.3 Tier 4 Hataları (Critical Path)

  Senaryo                                                Sistem Davranışı                                                                                                         UX
  ------------------------------------------------------ ------------------------------------------------------------------------------------------------------------------------ -------------------------------------------------------------------------------------------------
  Textract Medical async job fail                        3 retry exponential; sonra `status=textract_failed` + queue manual review (raw doc in repo, no LLM)                      Inbox: \"Extraction failed --- manuel review gerek\" badge
  Bedrock Claude API rate limit                          Retry with backoff; per-org rate limit guard (job queue throttle)                                                        Background slowdown; tab notif \"Birden fazla doc işleniyor, sırayla\"
  Bedrock Claude returns invalid JSON (LLM malformed)    JSON Schema validate fail → 1 retry with stricter system prompt → 2nd fail → fallback \"manual review\"                  Inbox: \"LLM extraction error --- review manually\"
  LLM hallucination (entity yok, kuruyor)                Source citation check: LLM her entity için PDF source kanıtı vermek zorunda; cite missing → entity reject pre-queue      Internal: cite-missing entities silently dropped + audit `ingestion.tier4.cite_missing_dropped`
  Safety-critical entity low-confidence                  Yine queue\'ya (B3.1) --- confidence threshold yok                                                                       Reviewer queue\'da \"low conf + safety-critical\" composite badge
  GuardDuty flag (malware)                               Quarantine bucket move + uploader notify + CC alert + audit                                                              Uploader (HCP veya patient): \"Doküman güvenlik taramasında işaretlendi. CC bilgilendirildi.\"
  OCR\'a 100MB+ scanned PDF (1000 sayfa)                 Pre-check page count \>500 → user warn \"Bu dokümanın işlenmesi uzun sürebilir ve maliyetli olabilir. Split önerisi?\"   Onay dialog; cost estimate gösterilir
  Bulk backfill içinde 1 doc fail                        Batch tamamı bekler değil; per-doc independent; summary\'de \"Failed: N\" listesi retry CTA ile                          Summary screen\'de \"5 doc failed --- Retry\" CTA
  Tier 4 verification queue 100+ pending birikti         Worklist\'te urgent badge (kırmızı); CC notification \"Queue üzerinde dikkat\"                                           Inbox sıralama: oldest first; manager dashboard org-level metric
  Reviewer accept ettikten sonra \"bu yanlıştı\" demek   Doc 4 \'edit medical record\' workflow\'una düşer (V1) --- sliding edit + Provenance.previousVersion                     MVP\'de: Verification reject sonradan possible değil; sadece chart-level Doc 4 edit

### 7.4 Repository + Document Viewer Edge Cases

  Senaryo                                                   Sistem Davranışı                                                                                 UX
  --------------------------------------------------------- ------------------------------------------------------------------------------------------------ -------------------------------------------------------------------------------------------
  Klinisyen lockbox doc\'a tıklar (consent yok)             PolicyEngine deny                                                                                \"Bu doc sensitive lockbox\'ta. Erişim için ek consent grant gerek.\" Doc 4 lockbox UX\'i
  Doc viewer PDF.js render fail (corrupt PDF)               Fallback download button                                                                         \"PDF gösterilemiyor. Lütfen indirip yerel viewer\'da açın.\"
  Çok büyük PDF (25MB sınırı) viewer\'da scroll lag         PDF.js lazy page render; mobile için preview thumbnail + on-demand page                          UX: page jump input bar
  Document soft-archive (10y geçti, cold tier)              Repository\'de \"Archived\" badge + tıklandığında \"Cold storage retrieval \~minutes\" warning   \"Bu doc cold storage\'da. Retrieval \~5 dakika sürebilir. Devam?\"
  Hard delete request (V1+) --- PHIPA exception             Legal review queue (Sinalytix Operations) → CC + Org admin notify → resolved manual              V1+ flow; MVP\'de \"Talebiniz alındı, ekip değerlendirecek\" placeholder
  Original doc S3\'te yanlışlıkla CRUD (operations error)   Versioning + object lock (S3 Object Lock compliance mode); restore from version                  Hiç olmamalı; ops disaster recovery proc

### 7.5 Consent Revoke Edge Cases

  Senaryo                                                             Sistem Davranışı                                                                            UX
  ------------------------------------------------------------------- ------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------
  Consent revoke mid-Tier 4 extraction (LLM in-flight)                Job abort at next stage gate; partial results discarded; audit                              Reviewer queue\'dan otomatik kaybolur
  Consent revoke ama bir doc verification queue\'da pending           Pending entity\'ler discarded; original doc retained immutable                              Reviewer queue refresh: item kayboldu, queue\'da audit reason \"consent\_revoked\"
  Consent re-grant edildi ama doc retention süresi dolmuş             Restore: doc accessible olur ama metadata-only (cold storage retrieval cost user uyarısı)   \"Bu doc cold storage\'da. Açmak için retrieval ister misiniz?\"
  Patient hard delete request ama 10y PHIPA retention henüz dolmadı   Request reject + legal explanation; user\'a workflow                                        \"Yasal retention süresi (PHIPA 10y) dolmamış. Talep ekibimiz değerlendirecek.\"

### 7.6 Çoklu Reviewer Eşzamanlı Edit

  Senaryo                                               Sistem Davranışı                                                                             UX
  ----------------------------------------------------- -------------------------------------------------------------------------------------------- -------------------------------------------------------------
  İki CC aynı entity\'yi aynı anda accept eder          İlk commit kazanır; ikinci 409 Conflict                                                      İkinci CC: \"Bu entity zaten review edildi. Refresh edin.\"
  CC review başlattı, başka CC defer\'a aldı            İlk CC\'nin tab\'inde \"Bu item başka birine devredildi\" notice + refresh                   Quick notice; tab UX\'i kırmaz
  Family upload sırasında CC patient\'i transfer aldı   Yeni CC\'nin queue\'sına routed; eski CC notif \"Patient transferi sonrası queue boşaldı\"   Doc 9 transfer workflow\'u tetikler

### 7.7 Cost / Operational Guardrails

  Senaryo                                                   Sistem Davranışı                                                                                      UX
  --------------------------------------------------------- ----------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------
  Org monthly Tier 4 budget cap aşıldı (V1)                 Yeni Tier 4 upload kuyruğa alınır + org admin alert; verification queue ve LLM extraction skip        Org admin: \"Bu ay Tier 4 budget aşıldı. Manual review fallback.\"
  Per-doc LLM token budget aşıldı (10K input / 4K output)   LLM extraction skip; doc raw repository\'de + audit \"budget\_exceeded\" + manual review flag         Inbox: \"Bu doc çok uzun, manuel review gerek\" badge
  OCR/LLM cost beklenenden yüksek (anomaly)                 Sinalytix Operations alert (sentry/monitoring); per-doc cost log review                               Internal ops alert
  Sinalytix-wide AWS service outage (Canada Central)        Tier 4 queue ingestion durur; uploadlar accept ama processing pending; restored at service recovery   App-wide banner: \"AWS service issue --- yeni doc processing geçici durduruldu\"

### 7.8 Audit/Compliance Edge Cases

  Senaryo                                                      Sistem Davranışı                                                                     UX
  ------------------------------------------------------------ ------------------------------------------------------------------------------------ -------------------------------------------------------------------------------
  Sinalytix-internal admin patient data direct access denedi   PolicyEngine deny (no clinical role); audit `policy.unauthorized_access_attempt`     Sinalytix admin: \"Erişim engellendi. Audit kaydı oluşturuldu.\"
  PHIPA breach disclosure (data leak suspected)                Audit log retain + legal review workflow (V1)                                        Internal ops only
  Org leaves Sinalytix (data export request)                   Org-scoped doc export (FHIR Bundle + original binaries zip) --- 30 günlük workflow   Org admin Settings → \"Request data export\" --- Sinalytix ops manual proc V1

§8 --- Kabul Kriterleri
-----------------------

### 8.1 Fonksiyonel Kabul Kriterleri

**Tier 1 --- OSCAR Pro:**

-   AC-1.1: Org admin OAuth flow ile OSCAR Pro instance bağlanabilir;
    başarı status=connected, last\_sync\_at güncellenir.
-   AC-1.2: Nightly delta sync nominal patient set için 99%+ başarı
    oranı (production target).
-   AC-1.3: Her ingested resource\'a Provenance.tier=1 +
    source=oscar\_pro + onBehalfOf=org eklenir.
-   AC-1.4: Consent revoke edilmiş patient için sync attempt
    audit\'lenir ama Patient 360\'a yazmaz.
-   AC-1.5: On-demand sync (CC \"Sync from OSCAR\" CTA) \<5s response
    (sync başlatılır, async).

**Tier 1 --- HealthKit / Health Connect:**

-   AC-1.6: Patient app HealthKit/Health Connect permission grant
    sonrası backend ilk push 24h içinde alınır.
-   AC-1.7: Scope MVP (HR, BP, weight, SpO2, glucose, steps, sleep)
    sample\'lar Patient 360 Vitals Strip\'e gelir.
-   AC-1.8: Patient consent revoke sonrası patient app push attempt 403
    alır; UI patient\'i bilgilendirir.

**Tier 3 --- Patient Portal Export:**

-   AC-3.1: CCD-A R2.1 export upload edildiğinde resource\'lar Patient
    360\'a structured giriş yapar; provenance.tier=3.
-   AC-3.2: FHIR Bundle JSON (R4) upload edildiğinde aynı.
-   AC-3.3: Diğer format upload Tier 4 fallback\'a düşer; user
    kullanıcıya transparent açıklama.
-   AC-3.4: Patient/family upload her ikisi de mümkün; family upload CC
    review queue\'ya düşer (B2.3).

**Tier 4 --- OCR + LLM:**

-   AC-4.1: PDF/JPEG/PNG/HEIC, ≤25MB upload kabul; aşılırsa
    user-friendly reject mesajı.
-   AC-4.2: GuardDuty malware scan async post-upload (B4.3); flagged
    docs quarantine bucket + uploader notify + audit.
-   AC-4.3: SHA-256 hash dedup exact match → auto-suppress + alternate
    uploader provenance kaydı (B3.4).
-   AC-4.4: Textract Medical OCR job submit → entities + bounding boxes;
    95%+ success on legible docs.
-   AC-4.5: Bedrock Claude structured extraction → FHIR R4 + CA Core+
    schema validate; malformed → 1 retry + fallback manual review.
-   AC-4.6: Safety-critical whitelist (allergy/meds/code-status/DNR)
    auto-accept asla --- her zaman verification queue (B3.1).
-   AC-4.7: Sensitive auto-detect (psych F-codes, HIV+ serology, gender
    markers) → lockbox + queue (B2.4 MVP scope).
-   AC-4.8: High-confidence non-safety entity → auto-flow Patient 360
    \'unverified\' badge.
-   AC-4.9: Verification queue default routing CC; org admin V1\'de
    routing rules.
-   AC-4.10: Reviewer accept → resource active + Provenance.verifiedBy +
    signature; reject → entity discard ama original doc preserve.
-   AC-4.11: Bulk backfill hybrid: confident auto-flow, queue anomalies
    (B1.4); summary screen accept/queued/sensitive/failed breakdown.

**Document Repository:**

-   AC-5.1: Repository per-patient list; tab nav
    All/Active/Pending/Archived.
-   AC-5.2: Filter (type/source/date/status) ve search (title + LLM
    summary FTS); MVP PG FTS minimum.
-   AC-5.3: Document Viewer in-app PDF.js + side-by-side LLM entity
    panel (B4.4) web full; mobile read-only.
-   AC-5.4: Source citation: entity tap → PDF\'te highlight + scroll-to.
-   AC-5.5: Download original PDF/image button; downloads audit\'lenir.

**Connected Sources Settings:**

-   AC-6.1: Org admin OSCAR Pro bağla/kopart/reconnect; sync status
    real-time.
-   AC-6.2: HealthKit/Health Connect patient-level visibility (HCP
    read-only).

**Consent Revoke Cascade:**

-   AC-7.1: Patient consent revoke → 5s içinde Patient 360 access
    blocked (Doc 3 pattern).
-   AC-7.2: Repository docs metadata-only \"access blocked\" badge;
    original immutable retained.
-   AC-7.3: Provenance.consent-status=revoked + revokedAt; restore on
    re-consent active=true (B4.1).

### 8.2 Regülasyon ve Güvenlik Kabul Kriterleri

-   AC-S.1: Tüm Tier 1-4 boru hattı Canada Central\'da (AWS S3,
    Textract, Bedrock, GuardDuty); cross-border egress yok --- IAM
    policy enforce.
-   AC-S.2: S3 Object Lock (compliance mode) original docs için;
    modify/delete impossible.
-   AC-S.3: S3 Standard 10y + lifecycle policy → Glacier Deep Archive
    (B2.1).
-   AC-S.4: AES-256 at rest (KMS-managed), TLS 1.2+ in transit; her
    ingestion event\'te uygulanır.
-   AC-S.5: Audit log her ingestion event Doc 2 canonical schema\'ya
    yazılır; PG append-only + nightly Glacier replicate.
-   AC-S.6: PolicyEngine.evaluate her Tier 1-4 read/write için; deny
    audit\'lenir.
-   AC-S.7: PHIPA Electronic Service Provider obligations (Master Doc
    §4.2) --- Tier 1-4 verisi org-scoped (RLS), inter-org leakage yasak.
-   AC-S.8: Health Canada SaMD Class I MVP --- Tier 4 LLM çıktısı \"data
    presentation, not diagnosis\"; whitelist + provenance badges ile
    şeffaf.
-   AC-S.9: Sensitive lockbox: psych/HIV/gender auto-detect MVP
    high-precision; Doc 4 lockbox UX\'i ile tutarlı.
-   AC-S.10: Patient mobile app HealthKit/Health Connect scope sadece
    MVP allowlist (B3.2); diğer kategoriler push deny.
-   AC-S.11: Hash dedup cross-org leak yok (RLS); aynı SHA-256 farklı
    org\'larda ayrı record.

### 8.3 Teknik ve Performans Kabul Kriterleri

-   AC-T.1: Tier 1 OSCAR delta sync nominal 100 patient/org \< 5 dakika
    (background).
-   AC-T.2: Tier 4 single doc end-to-end (upload → LLM complete →
    queue): nominal 10-sayfa PDF için \< 60 saniye p95.
-   AC-T.3: Bulk backfill 50 doc batch \< 15 dakika p95; UI progress
    real-time WebSocket.
-   AC-T.4: Document Viewer PDF.js initial render \< 2s p95 for \<25MB
    doc.
-   AC-T.5: Verification queue list load \< 1.5s p95 (cursor pagination
    50 items).
-   AC-T.6: WebSocket badge update (yeni Tier 4 ingestion ready) \< 5s
    patient context\'inde.
-   AC-T.7: PolicyEngine.evaluate \< 50ms p95 (PG RBAC MVP).
-   AC-T.8: Per-doc LLM cost ≤ \$0.20 average; alarm \>\$1.00 single
    doc.
-   AC-T.9: GuardDuty scan async --- upload UI bekletmez (\<200ms upload
    acknowledge).
-   AC-T.10: S3 multipart upload mobile zayıf network resumable;
    checkpoint per 5MB.

§9 --- Başarı Metrikleri
------------------------

### 9.1 Adoption + Engagement

  Metrik                                                                         V0 Hedef (Pilot)   V1 Hedef (GA)   Ölçüm
  ------------------------------------------------------------------------------ ------------------ --------------- ---------------------------------------------------------------
  Aktif org\'larda OSCAR Pro bağlı oranı                                         %50+               %85+            `connected_sources` aktif sayım / total active orgs
  Patient app HealthKit/Health Connect grant oranı                               %30+               %60+            Patient consent metric
  Onboarding\'de bulk backfill kullanım oranı                                    %40+               %75+            `ingestion_jobs` batch\_id≠NULL / total new patients
  CC başına ortalama günlük verification queue review                            5-15               10-25           Audit `verified + verified_edited + rejected` count
  Patient 360\'taki Tier 4 verified resource oranı (vs auto-flowed unverified)   %50+               %80+            Patient 360 resource set\'inde Provenance.verifiedBy NOT NULL

### 9.2 Quality + Safety

  Metrik                                                      V0 Hedef               V1 Hedef      Ölçüm
  ----------------------------------------------------------- ---------------------- ------------- --------------------------------------------------
  Safety-critical entity yanlış accept (review missed)        \<%1                   \<%0.1        CC retrospective audit sample + escalation
  LLM extraction confidence ortalama (high+medium combined)   %75+                   %85+          `tier4_extraction_entities.confidence` avg
  Reviewer edit-before-accept oranı                           %20-40                 %15-25        `verified_edited / (verified + verified_edited)`
  Reviewer reject oranı (LLM hata)                            \<%10                  \<%5          `rejected / total reviewed`
  Sensitive auto-detect false-positive                        \<%15                  \<%5          CC override sample
  Sensitive auto-detect false-negative                        \<%5                   \<%1          Retrospective sample (operational only)
  Cross-source merge discrepancy flag rate                    %5-15 (org variance)   Org context   Doc 4 discrepancy events / source pairs

### 9.3 Operational + Cost

  Metrik                                            V0 Hedef        V1 Hedef   Ölçüm
  ------------------------------------------------- --------------- ---------- ----------------------------------------------
  Per-patient/ay Tier 4 cost (steady state)         \<\$5           \<\$3      `ingestion_jobs.cost_estimate_usd` aggregate
  Per-patient onboarding burst Tier 4 cost          \<\$50          \<\$30     Batch backfill cost aggregate
  Tier 4 end-to-end latency p95                     \<90s           \<60s      Job duration
  Tier 4 failure rate (extraction failed)           \<%5            \<%2       `status=failed` / total
  GuardDuty malware flag rate                       \<%0.1          aynı       Audit
  Reviewer queue dwell time p50 (yeni → reviewed)   \<24h           \<8h       Job event delta
  Verification queue overdue (\>7 day) count        \<%5 of queue   \<%1       Aged report

### 9.4 Clinical Outcome (V1+ longitudinal)

  Metrik                                                                                               Hedef                                            Ölçüm
  ---------------------------------------------------------------------------------------------------- ------------------------------------------------ -------------------------------------------------------
  Bulk backfill sonrası yeni hasta için \"Patient 360 hazır\" süresi                                   Average 2-4 saat (vs 8-16h manual)               Onboarding → first care-plan-action lag
  Cross-source merge ile saptanan klinik discrepancy → klinisyen aksiyon                               %30+\'ı klinik aksiyon (medication update vb.)   Provenance discrepancy → MedicationStatement edit lag
  Patient self-reported adherence accuracy (HealthKit vitals trend → MedicationStatement compliance)   V2+ correlation analiz                           Multi-resource time-series

### 9.5 Compliance + Audit

  Metrik                                                     Hedef                      Ölçüm
  ---------------------------------------------------------- -------------------------- ------------------------------
  Audit completeness (her ingestion event log\'da)           %100                       Audit/job count parity
  Consent revoke cascade SLA (revoke → all access blocked)   \<30s p99                  Event timestamp delta
  Cross-border egress events                                 0                          AWS VPC flow log + IAM audit
  Sinalytix-internal unauthorized access attempts            Log + investigate; trend   PolicyEngine deny audit

§10 --- UX ve Tasarım Notları
-----------------------------

### 10.1 Tier Şeffaflığı --- Provenance Badge\'leri

*Klinisyenin Patient 360\'ta veya Repository\'de gördüğü her data
point\'in kaynağı görünmelidir. Provenance badge\'leri Doc 4
cross-source merge UX\'inin temel sözleşmesidir. Tier badge sadece
görsel değil, klinik karar bağlamı: \"Bu vitals OSCAR\'dan mı yoksa
hastanın Apple Watch\'undan mı?\" sorusu doğal cevap alır.*

Badge tasarım:

-   **Tier 1 EMR (OSCAR Pro):** Yeşil yuvarlak, \"EMR\" iconu --- yüksek
    güven
-   **Tier 1 Wearable (HealthKit/Health Connect):** Mavi yuvarlak, cihaz
    iconu (Apple/Android)
-   **Tier 3 Patient/Family Upload:** Mor yuvarlak, kullanıcı iconu
-   **Tier 4 OCR Verified:** Turuncu yuvarlak, checkmark --- CC onaylı
-   **Tier 4 OCR Pending:** Gri yuvarlak, saat iconu --- review bekliyor
-   **Tier 4 OCR Auto-flowed (unverified high-conf):** Açık turuncu,
    \"info\" iconu

Tap: badge → Provenance detail modal (source doc, verifier, timestamp,
confidence). Mobile long-press = aynı modal.

### 10.2 Safety-Critical Görselleştirme

*Allergy, medication, code-status (DNR), goals-of-care alanlarında LLM
çıkarımı klinik güvenlik için her zaman insan onayı gerektirir. Bu durum
hem klinisyenin queue review akışında baskın olmalı hem de auto-flow
path\'inde asla bu kategorilere izin verilmemelidir.*

-   Verification Queue: safety-critical entity\'ler **kırmızı dikey
    çubuk** ile soldan işaretlenir; queue sıralama default\'unda en üst.
-   Document Review side-by-side panelde safety-critical entity grouplar
    pinned-top, expand defaults open.
-   \"Bulk accept all high-confidence\" CTA safety-critical entity\'leri
    **otomatik exclude** eder; checkbox başlangıçta kilitli.
-   Audit log\'da safety-critical verified event\'ler ayrı index\'lenir
    (V1 retrospective review).

### 10.3 Sensitive Lockbox UX

*Sensitive kategoriler (mental health, HIV/STI, gender identity,
genetic) MVP\'de high-precision auto-detect ile lockbox\'a alınır
(B2.4). Klinisyenin görmemesi default; consent-scope ile expand.*

-   Repository\'de sensitive doc\'lar **kilit iconu** ile gizli başlık
    (\"Sensitive document --- locked\"); tap → consent prompt + reason
    input → expand
-   Verification queue\'da sensitive entity\'ler **mor pill** ile
    işaretli; review aksiyonu ek consent gerektirir
-   Doc 4 Patient 360 lockbox alanlarına entry feed ediyor; tutarlı
    görsel dil

### 10.4 Onboarding Bulk Backfill Mikro-UX

*Yeni hasta onboarding\'inde CC\'nin 50-200 PDF yüklerken hisseti
\"hızlı + güvende\" olmalı. Hybrid auto-classify (B1.4) sayesinde CC
zaman ayırdığında review yapar, yoksa background\'da Patient 360 dolar.*

-   Wizard step 3 (processing) sırasında CC tab kapatabilir; push/email
    notif \"Backfill tamam\"
-   Summary screen \"Smart sort\" başlangıçta safety-critical/sensitive
    üstte
-   \"Review later\" tercih edilirse worklist Inbox\'a yumuşak
    entegrasyon --- agresif notification yok
-   Estimated time + estimated cost (org admin için) display\'i
    şeffaflık

### 10.5 Document Viewer (PDF.js + Side-by-Side)

*Klinik safety için klinisyen LLM çıkarımını PDF source ile doğrulamalı.
Side-by-side viewer (B4.4) tek tıklama citation highlight ile bu
doğrulamayı hızlı yapar.*

-   Sol-sağ split desktop default; mobile tab-switch (Document \|
    Entities)
-   Entity\'ye hover/tap → PDF\'te bounding box + page-jump animation
    (smooth scroll)
-   \"Tüm citation\'ları göster\" toggle (advanced) --- tüm entity
    bbox\'ları aynı anda overlay
-   Keyboard shortcut hint footer (A/R/D/E/↑↓)
-   Mobile read-only banner: \"Edit için web\'i kullanın\"

### 10.6 Latency Perception

*Tier 4 LLM extraction nominal \<60s p95 olabilir ama kullanıcı
\"anında\" beklemek isteyebilir. UX latency\'yi gizler veya açıkça
gösterir.*

-   Upload acknowledge \<200ms (S3 upload acknowledge); processing
    background
-   Inbox badge real-time WebSocket update
-   Onboarding bulk backfill progress bar her doc için ayrı, kümülatif
    değil
-   \"Şu an işleniyor: 5 doc / Tamamlandı: 23\" stil progress messaging
    --- abstract %X yerine somut count

### 10.7 Erişilebilirlik

-   WCAG 2.1 AA: badge\'ler color + icon dual encode (renk körü)
-   Keyboard nav: queue list ↑↓; review action shortcuts; viewer page
    nav PgUp/PgDn
-   Screen reader: entity confidence + safety flag + sensitive flag
    readable announce
-   High contrast theme: badge palette korunur (gri tonlarında ayırt
    edilir)
-   Mobile haptic feedback (iOS/Android): accept = light tap, reject =
    double tap

### 10.8 Soğuk Storage Retrieval UX

*PHIPA 10y hot retain ediliyor; cold tier sonrasında erişim biraz
gecikir. UX bunu açık ve kontrol altında tutmalı.*

-   Repository\'de \"Archived\" badge gri ile; tıklandığında \"Bu doc
    cold storage\'da. Retrieval \~5 dakika. Devam edilsin mi?\"
-   Retrieval başlatılırsa \"İşleniyor\...\" + push notif
    tamamlandığında
-   Bulk retrieval (5+ doc) cost warning + admin onay (V1)

### 10.9 Patient-side UX İmpactı (Cross-App Note)

*Doc 5 birincil olarak HCP-side; ama Tier 3 (patient upload) + Tier 1
(HealthKit/Health Connect) Patient app\'in kullanım deneyimini doğrudan
şekillendirir. Patient app PRD\'sinde mirror gerekli.*

-   Patient app\'te \"Upload to your care team\" CTA --- HCP-side
    tab\'leri ile aynı görsel dil
-   Wearable sync status patient app\'te transparent (last sync
    timestamp + scope)
-   Family upload yapan patient\'a Sinalytix push notif \"Family member
    X uploaded a document for you\" + review CTA

§11 --- Kullanıcı Senaryoları
-----------------------------

### 11.1 Senaryo: Yeni Onboarded Hasta --- Bulk Historical Backfill

**Aktör:** Care Coordinator Anne (org: Sinapse Home Care, Ontario)

**Bağlam:** 78 yaşında bayan hasta, COPD + Type 2 Diabetes + son 2 yılda
3 hastane episode\'u (UHN + St. Mike\'s), family physician OSCAR\'da,
ailesi 5 yıllık fizik tedavi notları PDF arşivini ve hastane discharge
summary\'lerini paylaşmış.

**Akış:**

1.  Anne, hasta onboarding\'i tamamlar (Doc 1). Soft-gate verification
    onaylı; care team grant aktif.
2.  Onboarding wizard son adımında \"Bulk Backfill\" CTA görür → tıklar.
3.  INGEST-BACKFILL-01 wizard\'ı açılır. Drag-drop alanına 47 PDF + 12
    image (HEIC) yükler. Toplam 78MB.
4.  Wizard \"Processing\" step\'i başlar. WebSocket progress: \"0/59 →
    12/59 → \... → 59/59\" --- yaklaşık 18 dakika.
5.  Summary screen:
    -   Auto-flowed (high-confidence non-safety): 31 resource →
        Repository unverified
    -   Queued (safety-critical + sensitive): 18 resource (12 medication
        updates, 4 allergies, 2 procedures)
    -   Sensitive lockboxed: 3 doc (mental health context --- eski
        psikiyatri konsültasyon raporu)
    -   Failed: 1 doc (corrupt PDF) --- retry CTA
6.  Anne \"Review Now\" → INGEST-QUEUE-01 açılır. Queue safety-critical
    önce.
7.  İlk item: \"Penicillin allergy (1998 hastane kaydından)\" --- LLM
    confidence high, source citation page 3 line 42. Anne PDF\'te
    highlight\'ı görür, tıklayıp orijinal metni okur: \"Pt has
    documented penicillin allergy with hives reaction.\" Accept.
8.  İkinci item: \"Metformin 500mg BID\" --- LLM medium confidence;
    source citation belirsiz. Anne PDF\'i scroll eder, manuel doğrular,
    dosage doğru. Accept.
9.  Üçüncü item: Sensitive lockboxed psikiyatri konsültasyon. Anne
    consent durumunu kontrol eder; aile onay vermiş ama Anne\'in
    sensitive scope grant\'i yok. \"Skip --- need additional consent
    grant\" deferred.
10. 15 dakika sonra Anne 13 verified, 2 deferred, 1 rejected (LLM
    hallucinated bir Dx).
11. Patient 360\'ı açar: cross-source merge ile UHN + St. Mike\'s +
    family physician verisi tek dashboard\'da. Tier badge\'leri renkli
    görünür. CC 5 yıllık geçmişi 35 dakikada yapılandırılmış chart\'a
    dönüştürmüş.

**Sonuç:** Hastaya ait kapsamlı longitudinal chart hazır; classical
workflow\'da 12-16 saat alacak iş, Tier 4 hybrid pipeline ile 35 dakika.

### 11.2 Senaryo: Family Caregiver Upload --- Hospital Discharge Summary

**Aktör:** Hasta kızı Sarah (RelatedPerson, formal caregiver)

**Bağlam:** Babası dün UHN\'den taburcu edildi. Discharge summary kâğıt
nüshası verildi. Sarah Sinalytix Patient app\'i kullanıyor (caregiver
mode).

**Akış:**

1.  Sarah Patient app\'ten babasının profili → \"Upload to care team\"
    CTA.
2.  Camera ile 4 sayfalık discharge summary\'yi fotoğraflar (HEIC).
    Upload başlar (\~10s).
3.  Sarah notif görür: \"Document uploaded. Care team review edecek.\"
4.  Backend: GuardDuty scan temiz. Hash dedup miss. S3\'e yazılır. Tier
    4 pipeline başlar.
5.  \~45 saniye sonra LLM extraction tamam: 7 entity (4 medications, 1
    condition update, 2 follow-up appointments).
6.  Family upload (RelatedPerson) → B2.3 → CC review queue\'ya
    yönlendirir (auto-flow değil).
7.  CC Anne worklist Inbox\'ta yeni badge görür → INGEST-INBOX-01 → 7
    entity review.
8.  Anne medications\'ı Patient 360\'taki mevcut
    MedicationStatement\'larla compare eder (cross-source merge): 2 yeni
    Rx, 1 dose change, 1 discontinued. Accept ve edit.
9.  Patient 360 günceller; Sarah\'ya push notif: \"Care team reviewed
    --- chart updated.\"

**Sonuç:** Family upload PHI flow\'a güvenli giriyor; CC her zaman
gateway; legal preserve + provenance şeffaf.

### 11.3 Senaryo: OSCAR Pro Nightly Sync

**Aktör:** Sistem (background job)

**Bağlam:** Sinapse Home Care org\'unda 320 aktif hasta, OSCAR Pro
bağlantısı 3 aydır aktif.

**Akış:**

1.  03:00 Canada Central, nightly cron Tier 1 OSCAR delta sync başlatır.
2.  Org-level OAuth token refresh (60 günde 1; bugün değil --- token
    aktif).
3.  OSCAR API GET /patients?modified\_since=T-24h → 47 patient
    güncelleme.
4.  Her patient için PolicyEngine.evaluate (consent active?) → 45 allow,
    2 deny (consent revoke).
5.  Allow olanlar için resource fetch (Observation, MedicationStatement,
    etc.) → \~620 resource ingested.
6.  Her resource\'a Provenance.tier=1 + source=oscar\_pro +
    onBehalfOf=Sinapse Home Care eklenir.
7.  Cross-source merge: 12 discrepancy flag oluşur (örn. weight
    measurement OSCAR 78kg, HealthKit 76kg --- Doc 4 discrepancy UI).
8.  Audit log: \~620 + 47 + 2 + 12 events written.
9.  03:18 sync tamamlanır. `last_sync_at` güncellenir. Org admin email
    gerek yok (success).
10. Sabah CC Anne worklist\'i açtığında WebSocket badge 12 discrepancy +
    15 yeni doc badge\'i. Inbox.

**Sonuç:** Background veri taze; klinik akış kesintisiz; cross-source
intelligence Patient 360\'ta görünür.

### 11.4 Senaryo: Tier 4 LLM Hallucination Yakalama

**Aktör:** Care Coordinator Marcus

**Bağlam:** Yeni hasta için bulk backfill yapıldı. Bir discharge
summary\'den LLM \"Patient allergic to penicillin\" çıkarmış ---
confidence high.

**Akış:**

1.  Marcus INGEST-REVIEW-01\'i açar. AllergyIntolerance grubunda
    \"Penicillin\" entry var, safety-critical badge.
2.  Source citation tıklar → PDF page 7 line 23 highlight. Marcus
    dikkatle okur: \"Pt has NO known drug allergies. Family history
    significant for penicillin allergy in mother.\"
3.  LLM \"penicillin allergy\" çıkarımı yanlış --- hasta değil, annesi.
    Marcus \"Reject\" + reason \"LLM hallucination --- source
    contradicts\".
4.  Audit log: `ingestion.tier4.rejected` + reason kayıt.
5.  Sinalytix Operations weekly LLM quality review dashboard\'unda bu
    reject pattern yakalar --- prompt tuning candidate.

**Sonuç:** Whitelist (B3.1) + side-by-side viewer (B4.4) sayesinde
safety-critical hallucination klinik karar verme yoluna ulaşmadan
yakalanır. PMR uzmanı tatmin: insan onayı son söz.

### 11.5 Senaryo: Consent Revoke Mid-Stream

**Aktör:** Patient Maria (kendi mobile app\'inden); CC Anne\'in akşam
shift\'i

**Bağlam:** Maria Sinapse Home Care\'e consent verdi 3 ay önce; bugün
kararı değiştirdi.

**Akış:**

1.  Akşam 19:42, Maria Patient app → Settings → Consent → \"Revoke
    access for Sinapse Home Care\" → Onay.
2.  Doc 10 consent event broadcast.
3.  CC Anne o anda Patient 360\'ta Maria\'nın chart\'ını açık. Doc 3
    pattern: 5s gri animasyon; chart kapanır; \"Hasta consent revoke
    etti\" toast.
4.  Tier 4 pipeline\'da Maria\'nın 2 doc\'u in-flight (Bedrock
    extraction): job abort at next stage gate; partial results
    discarded; audit `ingestion.tier4.aborted_consent_revoked`.
5.  Verification queue\'da Maria için pending 3 entity vardı: hepsi
    otomatik kaldırılır; queue refresh.
6.  Repository: Maria\'nın 47 doc\'u \"access blocked\" badge ile
    değişir; original\'lar S3\'te immutable, sadece HCP UI hidden.
7.  Provenance.consent-status=revoked + revokedAt = 19:42:08 her
    resource için.
8.  Audit cascade: parent consent.revoked event + cascading
    \"access\_blocked\" her resource için.
9.  CC Anne notif: \"Maria için care team grant revoke edildi.
    Repository\'ye erişim kapatıldı.\"
10. 3 hafta sonra Maria fikrini değiştirir, re-grant verir. Patient
    360 + Repository otomatik restore. Provenance.consent-status=active
    update.

**Sonuç:** Patient autonomy gerçek zamanlı; HCP iş akışı graceful
kesilir; legal retention preserved; restore mümkün.

### 11.6 Senaryo: Multi-Source Discrepancy --- Klinik Aksiyon Tetiği

**Aktör:** MRP Dr. Lee (Sinapse Home Care\'in supervisor MD\'si)

**Bağlam:** Hasta John\'un kan basıncı kayıtları üç kaynaktan geliyor:
OSCAR (family physician aylık ölçüm), HealthKit (Apple Watch günlük), CC
ev ziyareti manual giriş.

**Akış:**

1.  Dr. Lee Patient 360\'ı açar. Vitals Strip\'te BP 145/92 görür ---
    Tier 1 OSCAR badge.
2.  Aynı entry\'ye tıklar, expand. Cross-source merge: son 30 gün için
    28 ölçüm --- OSCAR 4, HealthKit 21, manual 3. Discrepancy flag:
    HealthKit ortalama 162/98, OSCAR 145/92.
3.  Dr. Lee Provenance detail modal: HealthKit device \"Apple Watch
    Series 8\". OSCAR device unknown (office cuff). Manual = CC home
    cuff.
4.  Klinik karar: home BP daha realist olabilir; office white-coat
    effect. MedicationStatement edit → antihipertansif dose increase.
    Doc 4 + Doc 8 workflow.
5.  Provenance trail her kararın bağlamını dökümante eder.

**Sonuç:** Cross-source merge sadece veri agregasyonu değil, klinik
intelligence; gerçek dünya home care\'de OSCAR ölçümleri yetersiz
olabiliyor, wearable + manual tamamlayıcı.

§12 --- Açık Konular
--------------------

### 12.1 V0 Launch Öncesi Karara Bağlanmalı

-   **LLM cost budget per org per month default cap:** \$500/ay? Org
    büyüklüğüne göre formula? Pilot data ile tune.
-   **OCR/LLM retry policy admin UI:** MVP\'de hardcoded (Textract 3
    retry, Bedrock 2 retry); admin override V1.
-   **Provenance resource granularity:** Per-data-point (her Observation
    ayrı Provenance) MVP locked; per-batch optimization
    (DocumentReference-level Provenance + child references) V1 perf
    optimization.
-   **OSCAR Pro vendor-specific FHIR profile farkları:** OSCAR FHIR
    mapping CA Core+ ile %100 hizalı mı? Edge case test gerek.
-   **Tier 4 manual review pathway UX (when LLM extraction fails):** Doc
    raw repository\'de düşer ama UI\'da CC için \"extract manually\" CTA
    mı yoksa free-text note mu? MVP scope karar.
-   **Bulk backfill rate limit:** Bir org\'un saatte yapabileceği max
    doc upload count guard?
-   **HealthKit/Health Connect background sync frequency:** Daily?
    Hourly? Patient battery impact vs data freshness trade-off.

### 12.2 V1 Spec Kararları

-   **Verification queue routing rules UI:** Org admin DSL veya
    graphical builder?
-   **Sensitive auto-detect broader NLP:** Hangi medical concept network
    (UMLS subset, SNOMED CT subset, custom Sinalytix curated)?
-   **DICOM viewer ayrı modül scoping:** PACS integration mı yoksa
    standalone viewer mı?
-   **Patient hard delete workflow:** Legal review queue UX + Sinalytix
    Operations runbook.
-   **Tier 2 vendor-agnostic abstraction:** Partnership-ready interface
    MVP\'de partnership olmadan inşa edilebilir mi yoksa V2\'ye konkre
    partner ile mi şekillenir?
-   **Patient portal parser MyChart Epic specific:** Hangi Epic
    version + hangi alanlar?
-   **Audit query UI ingestion event filter:** Klinisyen Settings →
    Activity Log\'da Tier 1-4 event\'leri görmeli mi yoksa internal
    only?
-   **Annotation/highlight viewer:** Multi-user collaboration model?
    Annotation persistence FHIR Provenance veya custom?
-   **LLM extraction re-trigger:** Verified doc için yeni LLM model
    release sonrası re-process opt-in?

### 12.3 V2+ Vizyon

-   **Tier 2 partnership integration ek (AlayaCare/PCC/TELUS):**
    Partnership cycle ile koordineli; partner-specific FHIR profile
    mapping.
-   **Multi-province Tier 1 + Tier 3:** BC Health Gateway, Alberta
    MyHealth Records, QC Carnet santé parsing + auth.
-   **HealthKit/Health Connect tam scope:** Nutrition + Mindfulness +
    Reproductive --- Doc 4 lockbox ile etkileşim spec.
-   **SaMD Class II yolculuğu:** LLM-assisted differential diagnosis
    hints; Health Canada submission timeline.
-   **Visit recording (audio) ingestion:** Doc 9 visit mgmt scope; Tier
    4 transcription pipeline (Whisper + Claude).
-   **Federal/provincial FHIR mandate direct provider API:** Bill S-5
    dalgası sonrası direct hospital ADT feed.

### 12.4 Cross-App Reconciliation (10 Doc Bittikten Sonra)

-   **DocumentReference cross-app:** Patient app kendi yüklerini
    Sinalytix-canonical DocumentReference\'a serialize ediyor mu yoksa
    Patient app side\'da farklı schema?
-   **Provenance cross-app:** Patient self-recorded data (HealthKit)
    Provenance.agent.who=Patient/ formu Patient app\'in kendi
    schema\'sıyla aligned mı?
-   **Consent cascade cross-app:** Patient app consent revoke event →
    HCP backend cascade event flow; Doc 10 generic mi yoksa per-app
    polymorphism mı?
-   **Verification queue cross-org:** Çok-org consultative scenario
    (specialist baktı, hasta primary care\'e döndü) → queue\'lar nasıl
    handoff edilir?
-   **Sensitive lockbox cross-app:** Patient app\'te patient kendi
    lockbox\'unu yönetiyor mu yoksa Doc 4 HCP-only UI mi?

### 12.5 Klinik Review (PMR Uzmanı + CXO)

-   **LLM hallucination risk tolerance:** Whitelist (B3.1) tam mı? Diğer
    kategoriler (örn. Procedure history, social history) klinik aksiyon
    tetikliyor mu? Genişletilsin mi?
-   **Confidence threshold (auto-flow vs queue):** %85? Pilot data ile
    tune.
-   **Sensitive kategori taxonomy:** psych F-codes + HIV serology +
    gender markers --- yeterli mi? Genetic markers V0\'da scope dışı;
    klinik aciliyet?
-   **Family upload trust model:** Formal SDM vs informal family ayrımı
    sistemde mevcut mu (Doc 1)? Permission matrix konkre vaka review.
-   **Bulk backfill review UX:** Onboarding sırasında CC\'nin \"Review
    later\" deferral\'ı klinik akışta yarat boşluğa yol açıyor mu? Pilot
    feedback ile tune.

### 12.6 Pilot Feedback Tuning

-   Per-doc LLM cost real-world dağılımı (1 sayfa vs 50 sayfa farkı)
-   Reviewer queue dwell time gerçek pilot data
-   Hash dedup hit rate (org context\'inde duplicate ne kadar yaygın)
-   HealthKit/Health Connect adoption + scope kullanım dağılımı (kaç
    patient nutrition\'a opt-in eder)
-   OSCAR Pro consent revoke recovery --- restore sonrası klinik
    kullanım ne kadar?

### 12.7 Backend Infra Detayları

-   **Bedrock Claude model versioning:** MVP Sonnet 3.5 mi 4 mi? Model
    upgrade strategy (forward compat).
-   **Textract Medical Canada Central availability:** GA Canada
    Central\'da mı yoksa US-only mi? (Fallback plan: AWS Textract base +
    post-process medical entity prompt.)
-   **S3 Object Lock compliance mode setup:** Per-org bucket mu, per-app
    shared mi?
-   **PG FTS Document repository search:** Index strategy (LLM-extracted
    summary + title + extracted entities); Elasticsearch swap V1.
-   **Tier 1 OSCAR token rotation automation:** Tam otomatik mi yoksa
    60-day window before expiry org admin notify mı?
-   **Connected Sources credentials encryption key rotation:** AWS KMS
    automatic rotation enable; per-key per-org isolation gerek mi?

*Sinalytix HCP PRD --- Doc 5: Health Data Ingestion & Document
Repository (4-Tier). v1.0 --- 31 Mayıs 2026. Foundation \#6 + Master Doc
§4.7 + §5.3 + Session 2 Q&A (B1.1-B4.4, 16 karar) ile uyumlu. Doc 1-4
baseline\'larına bağlı. Cross-app reconciliation 10 doc bittikten sonra
ayrı pass.*

Table of Contents {#table-of-contents-5 .TOC-Heading}
=================

Sinalytix HCP PRD --- Doc 6: Care Plan Authoring & Subplans
===========================================================

**Versiyon:** v1.0 **Tarih:** 31 Mayıs 2026 **Sahip:** Sinalytix Ürün &
Klinik Ekibi **Statü:** Locked (Session 2 Q&A --- 12 karar: B1.1-B3.4)
**Bağlı Dokümanlar:** Master Doc §3.1 (CC-led paradigm) + §3.2 (4-rol
katmanı) + §3.3 (çatışma çözümü) + §5.5, Doc 1 (Identity), Doc 2
(Auth/Audit Spine), Doc 3 (Worklist), Doc 4 (Patient 360), Doc 5
(Ingestion stack)

§1 --- Bağlam ve Amaç
---------------------

### 1.1 Tanım

**Care Plan Authoring & Subplans**, Sinalytix\'in klinik karar
koordinasyonunun kalbidir: Care Coordinator-led (CC) bir **Master Care
Plan** ile her disiplinin (PT, OT, SLP, RN, RD, vb.) kendi otonom
**Discipline Subplan**\'inden oluşan iki katmanlı plan mimarisi. Master
Doc §3.1\'de kilitlenen \"CC orkestrasyonu + discipline autonomy\"
paradigmasının somut UI ve veri modeli karşılığıdır.

Doc 6\'nın stratejik kararları (Session 2 Q&A):

-   **Parent-child CarePlan resource hierarchy (B1.1):** Master
    CarePlan (CC) + N child CarePlan (per discipline), FHIR `partOf`
    reference. Master Doc §3.2 4-rol katmanına native bridge.
-   **interRAI HC manual form MVP + MAPLe/CAP otomatize V1 (B1.2):**
    Kanada home care standart fonksiyonel assessment\'i; MVP\'de
    manuel + plan generation hint.
-   **Sinalytix-curated 10-15 template seed + boş + org custom save
    (B1.3):** Yaygın home care senaryo template\'leri.
-   **Auto-version per save + named milestone snapshots (B1.4):** FHIR
    `_history` + CC milestone\'lar.
-   **Curated baseline 8-10 T4 elevated aksiyon + org customize V1
    (B2.1):** Doc 2 T4 re-auth tier ile koordineli.
-   **Bedrock Claude translate + simplify, Doc 5 stack (B2.2):**
    Patient/Family-facing readable view.
-   **Per-subplan single-author + optimistic lock + conflict UI
    (B2.3):** Concurrent edit safety.
-   **FHIR Goal + manual progress notes + summary widget MVP (B2.4):**
    Doc 4 \"Care Plan Summary\" block feed.
-   **Activity hybrid: inline detail +
    Task/ServiceRequest/MedicationRequest reference (B3.1):** Doc 8
    native bridge.
-   **FHIR CarePlan.status + Sinalytix state machine + auto-transitions
    (B3.2):** Hospital → on-hold, license lapse → revoked.
-   **Subplan on-hold + orphan + CC notify + 14d transfer window
    (B3.3):** Care team change.
-   **Cross-org consent grant + specialist read-only + Doc 7
    consultation note (B3.4):** Multi-org çağrışım.

### 1.2 Sinalytix\'teki Giriş Noktaları

  Giriş Noktası                                                      Tetikleyici                                                                            Rol
  ------------------------------------------------------------------ -------------------------------------------------------------------------------------- --------------------------------------
  Yeni hasta onboarding (Doc 1) sonrası                              Soft-gate verification onaylı + care team grant aktif → CC ilk Master Plan oluşturur   CC
  Worklist (Doc 3) --- \"Create care plan\" CTA                      Aktif hasta panel\'inden yeni master plan başlat                                       CC
  Patient 360 (Doc 4) --- \"Care Plan Summary\" block \"Open\"       Mevcut plan\'a girer, edit veya milestone snapshot                                     CC, MRP, discipline HCP
  Verification queue (Doc 5) sonrası --- yeni doc plan update öner   Tier 4 LLM bulgu (örn. yeni Dx) plan revize candidate                                  CC
  Discipline subplan CTA (kendi worklist)                            PT/OT/SLP/RN/RD master plan altına subplan ekler veya kendi subplan\'inde çalışır      Discipline HCP
  Elevated action UI (örn. controlled substance order, DNR change)   T4 re-auth modal (Doc 2) zorla; plan\'a karar yazılır                                  MRP, CC (yetkili olan)
  Patient mobile app --- \"View my care plan\"                       Patient/Family readable view (Bedrock translate + CC publish)                          Patient, family
  Settings → Templates Library                                       Org admin/CC template kaydet/edit/share                                                CC, Org Admin V1
  Cross-org specialist consult (Doc 9) --- \"View care plan\"        Patient consent grant ile read-only + consultation note (Doc 7)                        Specialist (kendi org context\'inde)
  Care team change event (Doc 9) --- discipline çıkar                Orphan subplan dashboard alert + 14d transfer pencere                                  CC

### 1.3 Hedef Rol Matrisi

  Rol                                          Birincil Eylem                                                                                                                                              Yetki Kapsamı
  -------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------------------------------------------------------------------
  Care Coordinator (CC)                        Master Plan create/edit/sign; subplan oversight + veto (Master Doc §3.3); template instantiate; milestone snapshot; lifecycle transition; orphan transfer   Master + tüm subplan read; subplan edit yok (autonomy); elevated action T4 (subset)
  MRP (Most Responsible Provider)              Goals-of-care, DNR, code status set; elevated action authority; cross-discipline klinik karar                                                               Master read + comment; elevated T4 actions; conflict resolution final say (Master Doc §3.3)
  Specialist (kendi org context)               Discipline subplan create/edit (kendi disipline); konsultasyon notu                                                                                         Kendi subplan read/write; master read; cross-org context\'inde read-only
  Allied Health (PT/OT/SLP/RN/RD)              Discipline subplan create/edit autonomous; goal define; progress note                                                                                       Kendi subplan\'inde tek author; master read; cross-discipline read
  Org Admin (V1)                               Template publish/share; elevated action matrix customize; lifecycle state machine config                                                                    Configuration only; clinical content yok
  Patient / Caregiver / Family (Patient app)   Plan readable view; goal progress observability; comment (V1)                                                                                               Read-only (consent-scope); comment thread V1

### 1.4 Ekosistem Konumu

Doc 6, Sinalytix\'in **Master Doc §3.1 stratejik paradigmasını**
somutlaştırır: rakip home care platformları (AlayaCare, PCC, TELUS PSS)
tipik olarak \"manager assigns tasks\" model\'ini uygular --- discipline
HCP\'ler emir alır. Sinalytix paradigması farklı: **CC orchestrate eder
+ discipline autonomously plans**. Klinik açıdan:

-   PT kendi assessment\'ine göre ROM hedefini, frekansı, modaliteyi
    belirler --- manager\'a danışmadan.
-   CC ise patient\'in master care arc\'ını (overall goals, hospital
    discharge transition, palliative trajectory) yönetir.
-   Çatışma durumunda (örn. PT subplan\'i ile master plan goal arasında
    uyumsuzluk) Master Doc §3.3 çözümleme: CC + MRP + discipline
    diyaloğu; MRP klinik final say.

Bu paradigma defansiyel: home care\'de \"autonomy + coordination\"
dengesi sektörel ihtiyaç ve Kanada CMA/CNO scope-of-practice
regülasyonlarıyla uyumlu (her HCP kendi licensed scope\'unda autonomous,
hiyerarşik yapı yok).

### 1.5 Regülasyon ve Standartlar

-   **PHIPA + provincial parallels:** Care plan PHI; tüm CRUD
    audit\'lenir (Doc 2 canonical), tüm okuma PolicyEngine ile.
-   **FHIR R4 + CA Core+:** CarePlan, Goal, CareTeam, PlanDefinition,
    Task, ServiceRequest, MedicationRequest resource\'ları kullanılır;
    CA Core+ profile\'lara hizalı (Master Doc §4.3).
-   **CMA / CNO scope-of-practice:** Discipline autonomy bu regülatif
    scope\'a uyar; Sinalytix permission matrix discipline ↔ activity
    type validate eder (örn. PT can write PT goals but not prescribe
    Rx).
-   **interRAI HC license:** V1+ tam MAPLe/CAP integration için interRAI
    Canada licensing required.
-   **Health Canada SaMD Class I:** Care plan \"clinical workflow +
    documentation\"; clinical decision support iddiası yok MVP. AI
    translation (B2.2) \"presentation aid\"; CC publish-time approve
    gate.
-   **AWS Canada Central:** Bedrock Claude translate (B2.2) + tüm
    persistent storage Canada Central; cross-border yok.
-   **Bill S-5:** Plan FHIR R4 standardı interop için future-ready.

§2 --- Endüstri ve Klinik Bağlam
--------------------------------

### 2.1 Kanada Home Care Plan Practice --- Mevcut Durum

Kanada home care\'de care plan dokümanı parçalı:

-   **OSCAR Pro:** Care plan modülü minimal (free-text note);
    discipline-spesifik plan yok. Sinalytix bunu Tier 1 ingest etmez
    (Doc 5 OSCAR scope Observation/Med/Doc, plan değil).
-   **AlayaCare / PCC:** Care plan yapısal ama vendor-locked;
    multi-discipline modeling sınırlı; çoğu org \"single plan + activity
    tags by discipline\" yaklaşımı.
-   **Kâğıt/PDF:** Hâlâ baskın; özellikle small home care org\'larda
    care plan Word doc veya printed binder. Discipline autonomy zayıf
    --- CC tüm plan\'ı yazar, discipline HCP \"uygular\".
-   **interRAI HC:** Ontario LHIN/OHA fonlama için standart; ama
    assessment ile plan generation arasındaki köprü manuel/zayıf.

Sinalytix care plan paradigması bu manzaraya yeni: CC-orchestrated +
discipline-autonomous + structured FHIR + patient-readable +
version-history.

### 2.2 Klinik Justification --- Neden Parent-Child + Discipline Autonomy

**Klinik vaka (PMR uzmanı + CXO onayı temel):**

1.  **Discipline autonomy klinik standart:** PT, OT, SLP, RN, RD her
    biri kendi disiplinin \"plan of care\" yazma yetkisinde ve
    sorumluluğunda (CMA/CNO/CASLPO/CAOT scope-of-practice). CC bu işi
    delege ediyor değil --- discipline doğrudan owner.
2.  **CC orchestration koordinasyon değeri:** Multi-disciplinary home
    care\'de discipline\'lar arası çakışma yaygın (PT günde 3x
    egzersiz + OT günde 2x ADL training + RN günde 1x med check → hasta
    tükenir). CC overall trajectory\'yi yönetir, schedule conflicts\'ı
    çözer, goals-of-care\'i kurar.
3.  **Parent-child FHIR pattern:** Master plan = overall goals +
    cross-discipline coordination; child subplan = discipline-specific
    assessment + intervention + measurable goals. partOf reference ile
    traceable.
4.  **Conflict resolution explicit:** Master Doc §3.3 paradigması --- PT
    subplan\'i master plan goal ile çelişiyorsa (örn. master
    \"comfort-only palliative\", PT subplan \"aggressive ROM\"), CC +
    MRP + discipline diyaloğu; MRP klinik final say. Doc 6 UI bu
    konflikti surfaces.

### 2.3 interRAI HC\'nin Yer ve Önemi

**interRAI Home Care assessment** Ontario home care\'de standart:

-   LHIN-funded home care için zorunlu (most cases)
-   ADL/IADL, cognitive performance, mood/behavior, continence, social
    engagement, environment, informal support, medications, treatments
-   MAPLe (Method for Assigning Priority Levels) --- patient risk
    stratification
-   CAP (Clinical Assessment Protocols) --- auto-trigger care planning
    prompts (örn. \"Falls risk high → falls prevention CAP\")

MVP\'de manuel form + plan generation hint (B1.2): CC veya RN interRAI
HC ana bölümleri doldurabilir; sistem patient profile\'a kaydeder; plan
editor\'da \"interRAI summary\" widget gösterir (örn. \"ADL Hierarchy:
Limited; MAPLe: High; Falls CAP triggered\"). CC bunu plan oluştururken
referans alır ama otomatik aktivite üretmez. V1\'de MAPLe + CAP
auto-triggered template suggestions.

### 2.4 Template Strategy --- Klinik Workflow Hızlandırıcı

**Sinalytix MVP curated template list (PMR uzmanı + klinik danışman
onayı):**

1.  Post-stroke rehabilitation
2.  CHF (Congestive Heart Failure) home mgmt
3.  COPD home mgmt
4.  Dementia care + caregiver support
5.  Post-op orthopedic recovery
6.  Wound care (chronic)
7.  Palliative / end-of-life care
8.  Diabetes mgmt + foot care
9.  Frail elderly multi-comorbid
10. Post-MI cardiac rehab
11. Cancer chemo recovery support (V1 expand)
12. Post-discharge transitional care (general)

Her template: predefined goals + activity suggestions per discipline +
interRAI CAP linkage + patient education materials reference. CC
instantiate → patient-specific edit. Org-level \"Save as template\" →
org private (or share to Sinalytix-curated review V1 publish).

### 2.5 Patient/Family-Facing Plan View --- Stratejik Önem

*Sinalytix\'in \"patient-controlled platform\" konumlanması (Foundation
\#5) gereği patient ve family care plan\'ı **görmek + anlamak** zorunda.
Klinik dil (\"PRN furosemide 40mg PO QD hold for SBP \<100\") patient
için anlaşılmaz; family caregiver ev\'de uygularken kafası karışır.*

Bedrock Claude translate + simplify (B2.2):

-   Klinik plan resource\'ları → patient-readable summary
-   Multilingual MVP: English + French (Kanada bilingual mandate);
    Turkish + diğer V1+
-   Medical abbreviation expansion + plain-language explanation
-   CC publish-time approve gate (safety: LLM hallucination → patient
    miscommunication)
-   Patient app\'te readable view + version history (audit izi)
-   Family caregiver pratik aksiyon listesi (\"Tomorrow: 8am give
    Apixaban 5mg with food; 2pm PT visit; check weight before bed\")

Bu kapasite rakip platformlarda yok --- patient autonomy + caregiver
empowerment + adherence iyileşmesi triple-win.

§3 --- Kapsam ve Kısıtlar
-------------------------

### 3.1 V0 (MVP) --- Q4 2026 Launch Hedefi

**Master Care Plan + Discipline Subplan:**

-   Parent CarePlan (CC-authored) + child CarePlan per discipline
    (B1.1).
-   Discipline subplan: PT, OT, SLP, RN, RD (5 baseline). Diğer (Social
    Worker, RT, Pharmacist) V1.
-   CC master plan edit; discipline kendi subplan tek author edit
    (single-author lock B2.3).
-   Cross-discipline read-only.

**interRAI HC:**

-   MVP manuel entry form (ana bölümler) + plan editor\'da risk summary
    widget (B1.2).
-   MAPLe/CAP auto-trigger V1.
-   Form data Sinalytix-internal table + FHIR Observation alignment (CA
    Core+ profile).

**Templates:**

-   10-12 Sinalytix-curated template MVP.
-   Boş-from-scratch alternatifi her zaman.
-   Org-level \"save as custom template\" MVP (private to org); share to
    Sinalytix-curated V1.

**Versioning:**

-   FHIR `_history` her save (B1.4).
-   CC \"Save as milestone\" named snapshot.
-   Diff viewer (current vs previous, current vs milestone X).
-   Patient/Family-facing view default \"current published version\".

**Activity Modeling:**

-   CarePlan.activity.detail inline basit aktiviteler (B3.1).
-   Reference (Task/ServiceRequest/MedicationRequest) yapılandırılmış
    orderable (Doc 8 bridge).
-   Scheduled (daily/weekly/per-visit) + PRN + one-time.

**Goals + Outcome:**

-   FHIR Goal per master + per subplan (B2.4).
-   Manual progress note + status (in-progress / achieved / sustaining /
    cancelled).
-   Doc 4 \"Care Plan Summary\" widget feed.

**Lifecycle States:**

-   FHIR CarePlan.status: draft, active, on-hold, completed, revoked,
    entered-in-error (B3.2).
-   Auto-transitions: hospital admit (Tier 4 ingestion-detected) →
    on-hold; discharge → CC review; license expiry (Doc 1) → revoked.
-   Manual CC override (some transitions T4 elevated).

**Elevated Actions (T4 re-auth, Doc 2 ile koordineli):**

-   Curated baseline (B2.1):
    a.  Controlled substance order (Doc 8 cross-ref)
    b.  IV therapy initiation
    c.  Goals-of-care change (DNR add/remove)
    d.  Code status change
    e.  Master plan archive/revoke
    f.  Discipline subplan deletion
    g.  Multi-org plan share authorization
    h.  Plan-level patient consent override (break-glass V1)
-   Org admin V1 customize.

**Patient/Family-Facing Readable View:**

-   Bedrock Claude translate + simplify (B2.2) → patient-readable
    summary.
-   Multilingual: EN + FR MVP; diğer V1+.
-   CC publish-time approve gate.
-   Patient app rendering (cross-app coordination).

**Concurrency:**

-   Per-subplan single-author optimistic lock (B2.3).
-   \"X is editing\" indicator + conflict resolution UI on save.
-   5 dakika idle release lock.

**Care Team Change:**

-   Subplan owner discipline HCP leaves → on-hold + orphan + CC notify +
    14d transfer window (B3.3).
-   14d sonrası CC manual archive veya transfer to new HCP.

**Cross-Org:**

-   Patient consent grant ile specialist read-only Patient 360 + Care
    Plan (B3.4).
-   Specialist konsultasyon notu Doc 7 (clinical doc) ile.
-   Subplan add yetkisi cross-org MVP\'de yok.

**Audit & Policy:**

-   Her plan CRUD + state transition + elevated action audit (Doc 2
    canonical, expanded event\_type taxonomy).
-   PolicyEngine.evaluate her read/write (Doc 2 generic).

### 3.2 V1 (Post-MVP, 6-12 ay)

-   interRAI HC MAPLe + CAP auto-triggered care planning prompts
-   Template Library publish + share workflow (Sinalytix-curated review)
-   Allied Health expand: Social Worker, RT, Pharmacist subplan support
-   Org admin elevated action matrix UI
-   Patient comment thread on plan (read + react to specific
    goals/activities)
-   Patient-facing plan multilingual expand (Turkish, Mandarin, Punjabi,
    Arabic)
-   \"Plan vs Actual\" outcome dashboard (V1 outcome tracking expansion)
-   Goal target value structured input (numeric, range, qualitative) +
    progress chart
-   Conflict resolution V1: structured CC-MRP-Discipline diyalog thread
    (Master Doc §3.3 operationalize)
-   Discipline subplan template per discipline (org-level)
-   Hospitalization auto-trigger refinement (ADT feed integration V2;
    MVP Tier 4 detection)
-   Plan publish version diff for patient/family (changes since last
    view)

### 3.3 V2 (12-24 ay)

-   Real-time collaborative editing (Google Docs / CRDT)
-   AI-suggested goals/activities based on diagnoses + interRAI MAPLe
    (SaMD Class II yolculuğu)
-   Cross-org subplan add workflow (specialist authoring in consulted
    patient context)
-   Plan analytics: outcome correlation per template,
    time-to-goal-achievement, discipline contribution analysis
-   Real-time MDT collaborative care plan whiteboard (Master Doc §3.3
    real-time)
-   Plan-level patient consent break-glass V1 → audit + multi-step
    approval
-   interRAI HC reporting export (LHIN/OHA submission format)
-   Outcome → adherence + functional decline correlation (Doc 4 + Doc 5
    vitals trend)

### 3.4 V3 (24+ ay vizyon)

-   AI scribe direct → plan update (Doc 7 ile)
-   Voice/video MDT plan revize session recording + auto-summary
-   Cross-province plan portability (patient relocates ON → BC, plan
    migrate)
-   Population health plan analytics (anonymized, research)

### 3.5 Constraints (Sabit Kısıtlar)

-   **CarePlan resource zorunlu:** Tüm plan FHIR CarePlan\'a serialize;
    Sinalytix custom resource yaratmaz.
-   **Discipline autonomy floor:** CC discipline subplan\'i sessizce
    edit edemez; sadece veto + diyalog (Master Doc §3.3).
-   **Audit her CRUD:** Doc 2 canonical AuditLogEntry; her plan
    değişikliği event\'leşir.
-   **PolicyEngine her access:** Per role + per consent + per sensitive
    scope check.
-   **Patient publish gate:** Patient-facing readable view CC approve
    etmeden yayınlanmaz.
-   **T4 elevated re-auth:** B2.1 listesinde her aksiyon Doc 2 T4 tier
    (full 2FA) zorla.
-   **Versioning immutable:** FHIR \_history; eski versiyon edit/delete
    yok.
-   **Lock timeout:** 5 dakika idle → otomatik release; veri kaybı yok
    (draft autosave background).

### 3.6 Non-Goals

-   **AI clinical reasoning:** MVP\'de AI plan generation yok (Class I
    scope, B1.3 ve B2.2 sınırları).
-   **Real-time collaborative editing:** V2+.
-   **Patient direct plan edit:** Patient/Family read + comment (V1);
    plan content yazma yetkisi yok.
-   **Cross-org subplan write:** B3.4 MVP scope dışı.
-   **Provincial-aware plan template:** MVP Ontario-focused;
    multi-province V2.
-   **Outcome-based reimbursement integration:** Out of scope; billing
    ayrı.
-   **Visit scheduling within plan:** Visit mgmt Doc 9 scope; plan\'da
    activity reference, scheduling değil.
-   **EVV (Electronic Visit Verification):** Foundation \#2 V2\'ye
    ertelendi.

§4 --- Akışlar
--------------

### 4.1 Master Care Plan Oluşturma (CC, Yeni Hasta)

    sequenceDiagram
        participant CC as Care Coordinator
        participant PE as PolicyEngine
        participant T as Template Library
        participant iRAI as interRAI Form
        participant CP as CarePlan Service
        participant AL as Audit Log
        participant PV as Patient-facing View

        CC->>CC: Worklist/Patient 360 → "Create Care Plan"
        CC->>PE: evaluate(subject=CC, action=create, resource=CarePlan)
        PE-->>CC: Allow (role=CC + care team grant active)
        CC->>iRAI: Open interRAI HC quick form (optional but recommended)
        CC->>iRAI: Fill main sections (ADL, IADL, cognition, mood, etc.)
        iRAI-->>CC: Risk summary widget (MAPLe estimate, CAP triggers display only MVP)
        CC->>T: Browse templates
        T-->>CC: 10-12 curated + org-saved list
        CC->>CC: Select template "Post-stroke rehab" (or "Blank")
        CC->>CP: POST /CarePlan (status=draft, intent=plan, subject=Patient/X, template_ref)
        CP->>CP: Instantiate template → goals + activities (inline + reference)
        CP-->>CC: Plan editor opens, draft state
        CC->>CC: Edit goals, activities, schedule, narrative
        CC->>CP: PATCH /CarePlan (autosave every 10s)
        CP->>AL: event_type=careplan.draft.autosave
        CC->>CP: "Activate Plan" CTA
        CP->>PE: evaluate(activate, T2 tier — no re-auth)
        PE-->>CP: Allow
        CP->>CP: status=active, version_id=1
        CP->>AL: event_type=careplan.activated
        CC->>PV: "Publish patient-facing view" CTA
        PV->>PV: Bedrock Claude translate + simplify (EN+FR)
        PV-->>CC: Preview side-by-side
        CC->>CC: Edit/approve translation
        CC->>PV: Publish (patient app görür)
        PV->>AL: event_type=careplan.patient_view.published

**Kritik kurallar:**

1.  Draft state autosave 10s aralık + on-blur; aktivasyon explicit CTA.
2.  interRAI HC opsiyonel ama recommended; LHIN-funded org\'lar için
    workflow defaultu \"complete\".
3.  Template instantiation derin kopya (deep clone) --- sonraki template
    güncellemesi plan\'a yansımaz.
4.  Patient-facing view publish CC explicit aksiyon (LLM safety gate).
5.  Activate → status=active; Patient 360 (Doc 4) Care Plan Summary
    widget aktif.

### 4.2 Discipline Subplan Oluşturma (PT/OT/SLP/RN/RD)

    sequenceDiagram
        participant PT as Physiotherapist
        participant PE as PolicyEngine
        participant Master as Master CarePlan
        participant Sub as Subplan Service
        participant AL as Audit Log

        PT->>PT: Worklist → Patient → "Add my discipline subplan" CTA
        PT->>PE: evaluate(role=PT, action=create, resource=CarePlan child)
        PE-->>PT: Allow (CMA/CNO scope validation)
        PT->>Master: GET Master CarePlan (read context)
        Master-->>PT: Master goals + cross-discipline context
        PT->>Sub: POST /CarePlan (status=draft, partOf=Master/<id>, subject=Patient/X, category=PT)
        Sub-->>PT: Subplan editor opens
        PT->>PT: Define discipline-specific goals (e.g. "ROM right knee 0-90° in 6w")
        PT->>PT: Add activities (PT visit 3x/week, home exercise plan, family education)
        PT->>Sub: PATCH /CarePlan (autosave)
        Sub->>AL: event_type=subplan.draft.autosave
        PT->>Sub: "Activate Subplan" CTA
        Sub->>PE: evaluate (T2 tier)
        PE-->>Sub: Allow
        Sub->>Sub: status=active
        Sub->>Master: Reference acknowledged (partOf bidirectional)
        Sub->>AL: event_type=subplan.activated
        Note over Master,Sub: CC dashboard'unda yeni subplan badge görünür; conflict scan tetiklenir

**Kritik kurallar:**

1.  Discipline kendi subplan tek owner (Single-author lock B2.3).
2.  Scope validation: PT subplan\'inde Rx aktivite ekleyemez
    (role-activity matrix); UI engelleme + backend deny.
3.  partOf reference bidirectional resolve: master plan\'dan child
    listesi görülür, child\'dan master back-ref.
4.  Activate sonrası master plan\'a \"conflict scan\" tetiklenir (örn.
    master \"palliative comfort-only\", PT \"aggressive ROM\") → soft
    warning UI.

### 4.3 Concurrent Edit + Conflict Resolution

    flowchart TD
        A[PT Sarah opens subplan editor] --> B{Lock available?}
        B -->|Yes| C[Acquire lock 5min TTL]
        B -->|No| D{Lock holder same user?}
        D -->|Yes| C
        D -->|No| E[Display 'X is editing — read-only mode']
        C --> F[Edit subplan]
        F --> G[Autosave to draft branch]
        G --> H{Save commit?}
        H -->|Yes| I{Server version > local base?}
        I -->|No conflict| J[Commit + release lock + audit]
        I -->|Conflict| K[Conflict Resolution UI: side-by-side diff]
        K --> L{User decision}
        L -->|Keep mine| M[Force overwrite + audit reason]
        L -->|Take theirs| N[Discard local + reload server]
        L -->|Manual merge| O[Field-by-field merge + commit]
        M --> J
        N --> J
        O --> J
        F --> P{Idle 5min?}
        P -->|Yes| Q[Auto-release lock + draft preserved]
        P -->|No| F

**Kritik kurallar:**

1.  Lock subplan-level (CarePlan child); master plan da kendi locki.
2.  5dk idle release + draft autosaved; user dönüşte resume (lock
    yeniden acquire denenir).
3.  Conflict UI field-by-field diff (görsel highlight); keep mine / take
    theirs / manual merge.
4.  Force overwrite audit\'lenir (rare; user reason input zorunlu).

### 4.4 Elevated Action (T4 Re-Auth) Akışı

    sequenceDiagram
        participant MRP as MRP / Authorized HCP
        participant UI as Plan Editor
        participant Matrix as Elevated Action Matrix
        participant Auth as Doc 2 Auth Service (T4)
        participant CP as CarePlan Service
        participant AL as Audit Log

        MRP->>UI: "Add DNR / Change Goals of Care" action
        UI->>Matrix: Check action requires elevated tier
        Matrix-->>UI: T4 elevated (B2.1 list)
        UI->>MRP: T4 re-auth modal (Doc 2 spec: biometric + PIN + 2FA)
        MRP->>Auth: Submit 2FA token + PIN + biometric
        Auth-->>UI: Token valid 5min session boost
        UI->>UI: Action sheet active (DNR change form)
        MRP->>UI: Fill DNR status + attestation checkbox + signature
        UI->>CP: PATCH Master CarePlan (goals-of-care updated, new version)
        CP->>AL: event_type=careplan.elevated.dnr_change + actor=MRP + signed + reason
        CP-->>UI: Success; plan version bumped; milestone snapshot auto
        UI->>UI: Notify CC + care team + patient/family (sensitive notif)

**Kritik kurallar:**

1.  T4 elevated session boost 5dk; süre dolarsa re-auth tekrar.
2.  Eylem signing zorunlu (Practitioner.signature + reason text).
3.  DNR/Goals-of-care değişiklik otomatik milestone snapshot tetikler.
4.  Notify hassas: Doc 4 lockbox respect (patient gör; family scope
    grant\'ina göre).

### 4.5 Patient/Family-Facing Readable View Publish

    sequenceDiagram
        participant CC as Care Coordinator
        participant CP as CarePlan Service
        participant LLM as Bedrock Claude (Canada Central)
        participant Cache as Translation Cache
        participant Pub as Publish Service
        participant PA as Patient App
        participant AL as Audit Log

        CC->>CP: "Publish readable view" CTA
        CP->>LLM: Submit plan resource (master + subplans) + target_lang=[en, fr]
        LLM->>LLM: Translate + simplify + structure as readable summary
        LLM-->>CP: Patient-facing JSON (per language)
        CP->>Cache: Store with version_id + lang
        CP-->>CC: Preview side-by-side (clinical | patient-readable, per lang)
        CC->>CC: Edit/approve (override LLM if needed)
        CC->>Pub: Approve & Publish
        Pub->>Pub: Create PublishedView resource (current version)
        Pub->>PA: Notify Patient app + Family caregiver app (push notif)
        Pub->>AL: event_type=careplan.patient_view.published
        PA-->>P: "Your care plan has been updated"

**Kritik kurallar:**

1.  LLM çıktısı CC approval gate olmadan yayınlanmaz (safety).
2.  Multilingual default EN + FR; ek dil V1.
3.  Cache version\_id + lang ile; plan değişince invalidate.
4.  Push notif Doc 9 communication primitive ile (V1+ tam unified).
5.  PublishedView resource immutable per version; eski versiyonu
    patient/family görebilir (history).

### 4.6 Care Plan Lifecycle Transitions

    stateDiagram-v2
        [*] --> draft
        draft --> active: Activate (CC, T2)
        active --> on_hold: Hospitalization detected (Tier 4 ingest)<br/>or CC manual pause (T3)
        on_hold --> active: Discharge + CC review (T3)
        active --> completed: Goals achieved + CC completes (T3)
        active --> revoked: License lapse (Doc 1)<br/>Care team grant lost (Doc 10)<br/>CC manual (T4 elevated)
        on_hold --> revoked: Long pause + CC decides (T4)
        draft --> entered_in_error: Created in error (T3)
        active --> entered_in_error: Active in error (T4 elevated)
        completed --> [*]
        revoked --> [*]
        entered_in_error --> [*]

**Kritik kurallar:**

1.  Auto-transitions: hospitalization (Tier 4 ingestion\'da discharge
    summary detect), license expiry (Doc 1 cron) → trigger event bus.
2.  Manual transitions: CC explicit aksiyon; T3 (biometric+PIN) çoğu, T4
    (full 2FA) revoke/entered-in-error.
3.  Every transition audit + reason.
4.  on\_hold → patient-facing view \"Service temporarily paused\" badge.

### 4.7 Care Team Change --- Orphan Subplan Akışı

    flowchart TD
        A[PT Sarah leaves care team Doc 9] --> B[Care Team service emits event]
        B --> C[Find all subplans owned by Sarah for this patient]
        C --> D{Active subplans exist?}
        D -->|Yes| E[Set status=on-hold + ownership=orphan]
        D -->|No| Z[No action]
        E --> F[Audit event_type=subplan.orphaned]
        E --> G[Notify CC: 'Orphan PT subplan — transfer or archive']
        G --> H[CC Dashboard 'Orphan Subplans' widget]
        H --> I{CC action within 14d?}
        I -->|Yes Transfer to new PT| J[New PT accepts → ownership transferred]
        I -->|Yes Archive| K[status=revoked + reason='discipline_no_longer_engaged']
        I -->|No 14d elapsed| L[Escalate notification + 30d hard reminder]
        J --> M[Patient-facing view subplan re-published with new PT]
        K --> N[Patient-facing view subplan removed]

**Kritik kurallar:**

1.  Orphan state subplan immutable until transfer/archive (no edit
    possible).
2.  Transfer: new HCP accept → ownership change + audit; subplan history
    korunur.
3.  14d soft window + 30d hard escalation.
4.  Patient/Family notif yumuşak: \"Service temporarily paused, will
    resume soon\" (eskilateral hizmet kayb yaratmamak).

### 4.8 Cross-Org Specialist Consult Akışı

    sequenceDiagram
        participant P as Patient
        participant Consent as Doc 10 Consent Layer
        participant SP as Specialist (Other Org)
        participant CP as CarePlan Service
        participant Doc7 as Clinical Doc Service
        participant CC as Care Coordinator (Originating Org)

        P->>Consent: Grant temporary read access to Specialist Org
        Consent->>Consent: Create grant (scope=patient360+careplan, expiry=30d)
        Consent-->>SP: Notif "New patient consult access"
        SP->>CP: GET Master + Subplans (read-only via PolicyEngine)
        CP-->>SP: Plan rendered read-only
        SP->>Doc7: Create consultation note (Doc 7 scope)
        Doc7->>Doc7: Sign + attach to patient timeline (Provenance.tier=clinician)
        Doc7-->>CC: Notify "Specialist consult note added"
        CC->>CP: Review note, update master plan if needed
        Note over SP,CP: Specialist cannot create or edit subplan cross-org MVP

**Kritik kurallar:**

1.  Consent grant scope-limited (patient360+careplan; sensitive lockbox
    respect).
2.  Specialist Doc 7 ile not ekler; plan\'a doğrudan write değil.
3.  CC reviewer; plan update kararı CC\'de.
4.  V1\'de specialist \"consultation subplan\" opt-in (CC approval ile).

### 4.9 Plan Version Diff & Milestone Snapshot Akışı

    flowchart TD
        A[CC opens plan editor] --> B{View history?}
        B -->|Yes| C[Open Version History panel]
        C --> D[List: all versions (auto + milestones)]
        D --> E[Select version to compare]
        E --> F[Side-by-side diff: current vs selected]
        F --> G[Highlight added/removed/changed goals + activities]
        A --> H{Save as milestone?}
        H -->|Yes| I[Name + description input]
        I --> J[Create named snapshot ref to version]
        J --> K[Audit event_type=careplan.milestone.created]
        A --> L[Patient-facing view: published version chain]
        L --> M[Patient/Family see version history with diff highlights]

**Kritik kurallar:**

1.  Auto-version on every save (FHIR \_history); storage efficient via
    delta encoding (CarePlan small).
2.  Milestone snapshot CC manual; named + descriptioned; reference
    current version.
3.  Diff view structured: per goal, per activity, per status change.
4.  Patient-facing version history show only \"published\" version chain
    (draft autosaves hidden).

§5 --- Ekran/Yüzey Spec
-----------------------

### 5.1 Ekran Envanteri

  Ekran ID               İsim                                               Mobile (RN)   Web (React)   Birincil Rol
  ---------------------- -------------------------------------------------- ------------- ------------- -------------------------------------
  PLAN-EDITOR-01         Master Plan Editor                                 Lite          ✓ Full        CC
  PLAN-SUBPLAN-01        Discipline Subplan Editor                          Lite          ✓ Full        Discipline HCP
  PLAN-VIEW-01           Plan Read-Only Viewer                              ✓             ✓             Tüm HCP rolleri (read)
  PLAN-INTERRAI-01       interRAI HC Quick Form                             Lite          ✓ Full        CC, RN
  PLAN-TEMPLATE-01       Template Gallery                                   ✓             ✓             CC, Org Admin (V1 share)
  PLAN-HISTORY-01        Version History + Diff                             ✗             ✓             CC, MRP, discipline (kendi subplan)
  PLAN-MILESTONE-01      Milestone Snapshot Modal                           Lite          ✓             CC
  PLAN-ELEVATED-01       Elevated Action Modal (T4 re-auth)                 ✓             ✓             MRP, authorized HCP
  PLAN-CONFLICT-01       Conflict Resolution UI                             ✗             ✓             Editor (CC/HCP)
  PLAN-ORPHAN-01         Orphan Subplan Dashboard                           Lite          ✓ Full        CC
  PLAN-PATIENT-VIEW-01   Patient-facing Readable View (preview + publish)   ✓             ✓             CC
  PLAN-CROSS-ORG-01      Cross-Org Specialist Plan View                     ✓ Read        ✓ Read        Specialist (kendi org)

**Tasarım prensipleri:**

-   Web full editing (complex multi-resource state mgmt); mobile
    primarily read + light edit (saha visit).
-   Diff + version history web-only (visual complexity).
-   Patient-facing publish workflow web; preview both platforms.

### 5.2 PLAN-EDITOR-01 --- Master Plan Editor

**Konum:** Worklist → \"Create Plan\" CTA; Patient 360 → \"Care Plan
Summary\" → \"Open\"; Doc 4 sticky header → \"Plan\" link.

**Web (React) --- Full UX:**

-   Top sticky header: Patient mini-card (name + photo + allergies ---
    Doc 4 pattern) + Plan status badge + Lock indicator + Actions (Save
    Milestone \| Activate \| Publish to Patient)
-   Left rail: Plan Outline (collapsible sections)
    -   Overall Goals (master-level)
    -   Activities (Master CC adds cross-discipline)
    -   Subplans (per discipline list --- click to navigate to subplan
        editor)
    -   Narrative / Notes (free-text, formatted)
    -   interRAI Summary (read-only widget from PLAN-INTERRAI-01)
-   Body: Selected section editor
    -   **Goals editor:** add/edit/delete Goal (description, target
        value (V1 structured), due date, status, related Condition)
    -   **Activities editor:** add inline (CarePlan.activity.detail) OR
        add reference (browse Task/ServiceRequest/MedicationRequest ---
        Doc 8 picker; create new from picker)
    -   **Activity schedule:** daily/weekly/PRN + start/end date +
        frequency
    -   **Narrative:** rich text (bold/italic/list/link); no inline
        image MVP
-   Right rail: Live preview (patient-facing draft view --- light
    Bedrock translate; \"Publish\" CTA approves)
-   Footer: Version indicator + autosave status (\"Saved 5s ago\")

**Mobile (RN) --- Lite:**

-   Section list (collapsible)
-   Read-only by default; \"Edit on web for full control\" banner
-   Quick aksiyon: status update on goal, progress note add, activity
    status check
-   Patient-facing view preview (read-only)

### 5.3 PLAN-SUBPLAN-01 --- Discipline Subplan Editor

**Konum:** PLAN-EDITOR-01 left rail → Subplans → \"PT\" (or relevant);
Worklist → patient → \"My Discipline Subplan\"; Patient 360 Care Plan
Summary → discipline pill.

**Web (React) --- Full UX:**

-   Top sticky header: Patient mini-card + Subplan discipline badge
    (PT/OT/SLP/RN/RD) + Lock indicator + Master Plan link (read context)
-   Left rail: Master Plan Context (collapsible, read-only)
    -   Master Goals overview
    -   Master Activities (cross-discipline coordination context)
    -   \"Notes from CC\" (CC kommentleri subplan\'a)
-   Body: Subplan editor
    -   **Discipline Goals:** add/edit (e.g. PT goal \"ROM right knee
        0-90° in 6w\")
    -   **Discipline Activities:** add inline + reference Task; schedule
    -   **Assessment notes:** structured (e.g. PT Berg Balance Score) +
        free-text
    -   **Discipline-specific outcome tracking:** progress per goal
-   Right rail: Cross-discipline awareness (other subplans summary,
    read-only --- collision detect surfaces here)
-   Footer: Save/Activate + collision warning (\"Master plan goal X may
    conflict --- review\")

**Mobile (RN) --- Lite:**

-   Read-only default; quick progress note add allowed
-   Status update on activity (visit completed, etc.)
-   Edit full → web banner

### 5.4 PLAN-VIEW-01 --- Plan Read-Only Viewer

**Konum:** Any care team HCP can view; cross-discipline read access.

**Mobile + Web:**

-   Tab nav: Overview \| Goals \| Activities \| Subplans \| History
-   Overview: high-level summary + status + last updated
-   Goals: aggregate (master + all subplans); per goal: status,
    progress, owner discipline
-   Activities: timeline view (today, this week); status check
    (planned/done/missed)
-   Subplans: list per discipline with own summary
-   History: link to PLAN-HISTORY-01 (web full; mobile latest 5 changes)
-   Action buttons gated by role (edit if owner; read otherwise)

### 5.5 PLAN-INTERRAI-01 --- interRAI HC Quick Form

**Konum:** PLAN-EDITOR-01 → \"interRAI Assessment\" CTA; Patient 360 →
\"Assessments\" tab (V1 expanded).

**Web (React) --- Full UX:**

-   Multi-step wizard (or accordion expandable):
    a.  ADL Hierarchy (bathing, dressing, transfers, etc.)
    b.  IADL (meal prep, housework, telephone, etc.)
    c.  Cognitive Performance Scale (CPS)
    d.  Mood (DRS --- Depression Rating Scale)
    e.  Behavior
    f.  Continence
    g.  Social engagement
    h.  Environment + informal support
    i.  Medications summary (read-only from Patient 360)
    j.  Treatments
-   Save autosave; submit at end
-   Result widget: MAPLe estimate (manual rules MVP; V1 algorithmic) +
    CAP triggers display
-   Save and link to current plan version (Observation resource with CA
    Core+ profile)

**Mobile (RN) --- Lite:**

-   Read assessment summary (last completed)
-   Quick \"Update specific section\" mobile-friendly
-   Full assessment web banner

### 5.6 PLAN-TEMPLATE-01 --- Template Gallery

**Konum:** PLAN-EDITOR-01 → \"Apply Template\"; Settings → Templates (V1
admin).

**Web (React):**

-   Gallery grid: thumbnails per template (icon + title + description)
-   Filter: Sinalytix-curated \| Org-saved \| All
-   Search by title/condition/discipline
-   Template detail modal: full content preview + \"Instantiate\"
-   Save as template (CC org-level): from existing plan → name +
    description → save
-   Share (V1): submit to Sinalytix review

**Mobile (RN):**

-   Liste sayfa: thumbnails (vertical scroll)
-   Tap → preview → \"Instantiate\"
-   Save as template lite

### 5.7 PLAN-HISTORY-01 --- Version History + Diff

**Konum:** PLAN-EDITOR-01 → \"History\" sidebar/header link.

**Web (React) --- only:**

-   Left panel: version list (chronological)
    -   Auto versions (timestamp + editor)
    -   Milestone snapshots (named + colored badge)
-   Right panel: selected version → diff vs current OR vs another
    selected
-   Diff highlights:
    -   Goal added/removed/changed (description + target + status)
    -   Activity added/removed/changed (detail + schedule)
    -   Subplan added/removed (link to subplan history)
    -   Narrative inline diff (red/green markup)
-   Restore option: \"Restore this version as new draft\" (creates new
    version from old state; T3 re-auth recommended; T4 if elevated
    revert)

### 5.8 PLAN-MILESTONE-01 --- Milestone Snapshot Modal

**Konum:** PLAN-EDITOR-01 → \"Save Milestone\" CTA.

**Web + Mobile:**

-   Modal: Name (required, e.g. \"Discharge from UHN --- baseline\"),
    Description (optional), Tag (predefined: discharge, escalation,
    stabilization, etc.)
-   Confirm → snapshot ref to current version
-   Audit + notify care team

### 5.9 PLAN-ELEVATED-01 --- Elevated Action Modal (T4 Re-Auth)

**Konum:** Triggered by any T4 elevated action (B2.1 list).

**Web + Mobile:**

-   Modal: action title (e.g. \"Change DNR Status\")
-   T4 re-auth flow (Doc 2 spec):
    -   Biometric prompt (Touch/Face ID) OR Password
    -   2FA token (TOTP or SMS)
-   On success: action form revealed
-   Action form: structured input + attestation checkbox + signature pad
    (mouse/touch)
-   Confirm → execute + audit + version bump + milestone snapshot

### 5.10 PLAN-CONFLICT-01 --- Conflict Resolution UI

**Konum:** Triggered when save attempted with version conflict.

**Web (React) --- only:**

-   Modal full-screen: 3-column layout
    -   Left: Server current
    -   Middle: Base (when user started editing)
    -   Right: User local
-   Diff highlights per field
-   Action per row: Keep mine \| Take theirs \| Manual merge (text edit)
-   Bottom: \"Force overwrite (server)\" requires reason input → audit

### 5.11 PLAN-ORPHAN-01 --- Orphan Subplan Dashboard

**Konum:** CC home / dashboard widget; settings link.

**Web (React) --- Full UX:**

-   Liste table: orphan subplans across CC\'s patient panel
    -   Patient \| Discipline \| Original owner \| Orphaned date \| Days
        remaining (14d countdown) \| Actions (Transfer to new HCP \|
        Archive \| Extend window V1)
-   Bulk actions: transfer multiple to new HCP
-   Filter by patient, discipline, age

**Mobile (RN):**

-   Liste view + tap action
-   Push notif on orphan event (CC opt-in)

### 5.12 PLAN-PATIENT-VIEW-01 --- Patient-facing Readable View

**Konum:** PLAN-EDITOR-01 → \"Patient View\" preview + publish; Patient
app render endpoint.

**Web (React) --- Preview + Publish (HCP side):**

-   Split: Clinical plan (left) \| Patient-readable summary (right)
-   Language toggle: EN \| FR \| + (V1)
-   LLM-generated draft; CC can edit per section
-   Publish CTA: confirms version + locks; patient app fetches
-   Version history of published views

**Patient App (cross-app render --- referenced):**

-   Plain language: \"Today\'s care\", \"This week\", \"Your goals\",
    \"Your team\", \"What to call about\"
-   Family caregiver section (when applicable)
-   Version history list (\"Plan updated on May 28 by CC Anne\")

### 5.13 PLAN-CROSS-ORG-01 --- Cross-Org Specialist Plan View

**Konum:** Specialist\'s org context; patient consent grant active →
\"Patient Care Plan\" tab.

**Mobile + Web:**

-   Read-only Plan View (PLAN-VIEW-01 derived)
-   Watermark: \"Cross-org view --- read only\"
-   \"Add Consultation Note\" CTA → opens Doc 7 flow
-   No edit, no template, no version restore actions

### 5.14 Ekran-Arası Etkileşim Notları

-   **Worklist (Doc 3) ↔ Plan Editor:** Worklist\'ten \"Open Plan\"
    direct; Plan\'dan \"Back to Worklist\" breadcrumb.
-   **Patient 360 (Doc 4) ↔ Plan:** Care Plan Summary widget → Open
    Plan; goals progress reflect Doc 4\'da.
-   **Ingestion (Doc 5) ↔ Plan:** Yeni Tier 4 doc verified → plan update
    suggestion (e.g. new Dx → \"Add to plan?\" notif).
-   **Orders/Rx (Doc 8) ↔ Plan Activities:** Plan\'dan Order create →
    Task/ServiceRequest reference; reverse: Order list\'ten \"Linked
    Plan\" link.
-   **Clinical Doc (Doc 7) ↔ Plan:** Note ↔ Plan version reference (note
    hangi plan versiyonu için yazıldı).
-   **Care Team (Doc 9) ↔ Subplan ownership:** Care team change → orphan
    event → PLAN-ORPHAN-01.
-   **Consent (Doc 10) ↔ Cross-org view:** Consent grant active →
    PLAN-CROSS-ORG-01 görünürlük.

§6 --- Veri Modeli (FHIR R4 + CA Core+)
---------------------------------------

### 6.1 FHIR Resource Kullanımı

  Resource                              Kullanım
  ------------------------------------- ---------------------------------------------------------------------------------------
  `CarePlan` (parent)                   Master CarePlan, CC-authored
  `CarePlan` (child)                    Discipline subplan, partOf=Master/
  `Goal`                                Per master + per subplan; targets + status
  `CarePlan.activity.detail`            Inline activity (basic)
  `Task`                                Referenced from activity (workflow tasks, e.g. \"Family education on home exercise\")
  `ServiceRequest`                      Referenced from activity (lab order, imaging order, referral --- Doc 8 bridge)
  `MedicationRequest`                   Referenced from activity (Rx --- Doc 8 bridge)
  `CareTeam`                            Read-referenced; ownership = CareTeam.participant
  `PlanDefinition`                      Template definitions (Sinalytix-curated + org-saved)
  `Provenance`                          Per version + per state transition + per signed action
  `Observation`                         interRAI HC form data (CA Core+ assessment profile)
  `Patient`                             Subject reference
  `Practitioner` / `PractitionerRole`   Author + verifier + signer
  `Consent`                             Cross-org grant + patient publish view scope (Doc 10)
  `Condition`                           Related to Goals (relatedFactor)
  `Communication`                       Notify events (V1 unified primitive)

### 6.2 CarePlan Parent (Master) Profile

    CarePlan (master):
      id: <uuid>
      status: draft | active | on-hold | completed | revoked | entered-in-error
      intent: plan
      category:
        - { system: "https://sinalytix.ca/codes/careplan-category", code: "master" }
        - { system: "http://snomed.info/sct", code: "734163000", display: "Care plan" }
      title: <CC-authored short title, e.g. "Maria T. — Post-stroke home rehab + diabetes mgmt">
      description: <narrative>
      subject: Reference(Patient/<id>)
      period: { start: <activated_at>, end: <completed_at if any> }
      created: <ts>
      author: Reference(Practitioner/<cc_id>)
      contributor:
        - Reference(Practitioner/<other_hcp_id>)  # comment contributors
      careTeam: Reference(CareTeam/<id>)
      addresses: [Reference(Condition/<id>)]  # primary conditions
      supportingInfo: [Reference(Observation/<interRAI_id>), Reference(DocumentReference/<id>)]
      goal: [Reference(Goal/<id>)]  # master-level goals
      activity:
        - detail: { ... inline }
        - reference: Reference(Task/<id> | ServiceRequest/<id> | MedicationRequest/<id>)
      note: [Annotation]  # narrative + comments
      meta:
        tag:
          - { system: "https://sinalytix.ca/codes/template-source", code: "<template_id> | blank" }
        extension:
          - sinalytix-version-id: <int>
          - sinalytix-milestone-snapshot: { id, name, description, tag, created_at } (optional)
          - sinalytix-patient-view-published-version: <int> (last published)
          - sinalytix-lock: { holder_user_id, acquired_at, ttl_until }
          - sinalytix-lifecycle-history: [{ from_status, to_status, ts, actor, reason, auto: bool }]

### 6.3 CarePlan Child (Discipline Subplan) Profile

    CarePlan (subplan):
      id: <uuid>
      status: draft | active | on-hold | completed | revoked | entered-in-error
      intent: plan
      partOf: Reference(CarePlan/<master_id>)
      category:
        - { system: "https://sinalytix.ca/codes/careplan-category", code: "subplan" }
        - { system: "https://sinalytix.ca/codes/discipline", code: "physiotherapy | occupational-therapy | speech-language | nursing | nutrition | other" }
      title: <e.g. "PT subplan — Maria T.">
      subject: Reference(Patient/<id>)  # mirror master subject
      period: { start, end }
      author: Reference(Practitioner/<discipline_hcp_id>)
      contributor: []  # subplan single-author default
      careTeam: Reference(CareTeam/<id>)  # same as master
      addresses: [Reference(Condition/<id>)]  # discipline-relevant subset
      supportingInfo: [Reference(Observation/<discipline_assessment_id>)]
      goal: [Reference(Goal/<id>)]  # subplan-level goals
      activity:
        - detail: { ... }
        - reference: Reference(Task | ServiceRequest)
      note: [Annotation]
      meta:
        extension:
          - sinalytix-version-id: <int>
          - sinalytix-lock: { ... }
          - sinalytix-ownership: { owner_user_id, owner_role, status: "owned" | "orphan" }
          - sinalytix-orphan-since: <ts> (when ownership=orphan)
          - sinalytix-orphan-transfer-deadline: <ts> (14d from orphan_since)
          - sinalytix-collision-flags: [{ master_goal_ref, subplan_goal_ref, type: "conflict|overlap", ts }] (advisory)

### 6.4 Goal Profile

    Goal:
      id: <uuid>
      lifecycleStatus: proposed | planned | accepted | active | on-hold | completed | cancelled | entered-in-error | rejected
      achievementStatus: in-progress | improving | worsening | no-change | achieved | sustaining | not-achieved | no-progress | not-attainable
      category: [{ system: "..", code: "physiotherapy|nursing|nutrition|behavioral|...." }]
      description: { text: "ROM right knee 0-90° within 6 weeks" }
      subject: Reference(Patient/<id>)
      startDate: <date>
      target:
        - measure: { coding: [{ system: "http://loinc.org", code: "LOINC_for_ROM_measurement" }] }
          detailRange: { low: { value: 0, unit: "deg" }, high: { value: 90, unit: "deg" } }
          dueDate: <date>
      statusDate: <date>
      statusReason: <text>
      expressedBy: Reference(Practitioner/<id>)
      addresses: [Reference(Condition/<id>)]
      outcomeReference: [Reference(Observation/<id>)]  # V1+ measured outcomes
      note: [Annotation]  # progress notes (MVP — free-text)
      meta:
        extension:
          - sinalytix-careplan-ref: Reference(CarePlan/<master_or_subplan_id>)
          - sinalytix-progress-notes: [{ ts, actor, note }]  # MVP store inline; V1 fuller Communication

### 6.5 Internal PostgreSQL Schema

    -- Template library
    CREATE TABLE care_plan_templates (
      id UUID PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('sinalytix_curated', 'org_custom')),
      org_id UUID,  -- NULL for sinalytix_curated
      title TEXT NOT NULL,
      description TEXT,
      category TEXT[],  -- ["post-stroke", "rehab", "neuro"]
      plan_definition_json JSONB NOT NULL,  -- FHIR PlanDefinition serialized
      version SMALLINT NOT NULL DEFAULT 1,
      active BOOLEAN NOT NULL DEFAULT true,
      created_by UUID,  -- user_id
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_templates_org ON care_plan_templates(org_id) WHERE org_id IS NOT NULL;
    CREATE INDEX idx_templates_active ON care_plan_templates(active);
    ALTER TABLE care_plan_templates ENABLE ROW LEVEL SECURITY;
    CREATE POLICY templates_visibility ON care_plan_templates
      USING (source = 'sinalytix_curated' OR org_id = current_setting('app.acting_org_id')::uuid);

    -- CarePlan locks (concurrency)
    CREATE TABLE careplan_locks (
      careplan_id UUID PRIMARY KEY,
      holder_user_id UUID NOT NULL,
      acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ttl_until TIMESTAMPTZ NOT NULL,  -- 5 min default
      last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    -- Auto-release via cron: DELETE WHERE ttl_until < now()
    ALTER TABLE careplan_locks ENABLE ROW LEVEL SECURITY;

    -- Elevated action matrix (B2.1; org-customizable V1)
    CREATE TABLE elevated_action_policy (
      id UUID PRIMARY KEY,
      org_id UUID,  -- NULL = Sinalytix global default
      action_code TEXT NOT NULL,  -- 'controlled_rx_order', 'iv_therapy_init', 'dnr_change', 'code_status_change', 'master_archive', 'subplan_delete', 'multi_org_share', 'consent_break_glass'
      requires_tier TEXT NOT NULL CHECK (requires_tier IN ('T2', 'T3', 'T4')),
      required_role TEXT[] NOT NULL,  -- ['MRP', 'CC']
      attestation_required BOOLEAN NOT NULL DEFAULT true,
      signature_required BOOLEAN NOT NULL DEFAULT true,
      auto_milestone BOOLEAN NOT NULL DEFAULT false,
      notify_care_team BOOLEAN NOT NULL DEFAULT true,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX idx_elevated_policy_action_org ON elevated_action_policy(action_code, COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE active;
    ALTER TABLE elevated_action_policy ENABLE ROW LEVEL SECURITY;

    -- Patient-facing published view cache
    CREATE TABLE careplan_patient_view (
      id UUID PRIMARY KEY,
      careplan_id UUID NOT NULL,  -- master CarePlan id
      version_id INT NOT NULL,
      language TEXT NOT NULL,  -- 'en', 'fr', etc.
      content_json JSONB NOT NULL,  -- LLM-generated readable summary
      cc_edited BOOLEAN NOT NULL DEFAULT false,
      cc_approved_by UUID NOT NULL,
      cc_approved_at TIMESTAMPTZ NOT NULL,
      published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      published_to_patient BOOLEAN NOT NULL DEFAULT true,
      superseded_by UUID  -- next version reference
    );
    CREATE INDEX idx_patient_view_careplan ON careplan_patient_view(careplan_id, version_id);
    ALTER TABLE careplan_patient_view ENABLE ROW LEVEL SECURITY;

    -- interRAI HC assessment storage (also serialized to FHIR Observation, but PG cache for quick query)
    CREATE TABLE interrai_hc_assessments (
      id UUID PRIMARY KEY,
      patient_id UUID NOT NULL,
      org_id UUID NOT NULL,
      performed_by UUID NOT NULL,
      performed_at TIMESTAMPTZ NOT NULL,
      data JSONB NOT NULL,  -- full assessment per interRAI HC structure
      maple_estimate TEXT,  -- 'low' | 'moderate' | 'high' | 'very_high' (MVP manual; V1 algorithmic)
      cap_triggers TEXT[],  -- triggered CAP codes
      linked_careplan_version_id INT,
      observation_resource_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_interrai_patient ON interrai_hc_assessments(patient_id, performed_at DESC);
    ALTER TABLE interrai_hc_assessments ENABLE ROW LEVEL SECURITY;

    -- Orphan subplan tracker (operational query)
    CREATE TABLE orphan_subplans (
      subplan_id UUID PRIMARY KEY,
      patient_id UUID NOT NULL,
      org_id UUID NOT NULL,
      discipline TEXT NOT NULL,
      original_owner_user_id UUID NOT NULL,
      orphaned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      transfer_deadline TIMESTAMPTZ NOT NULL,  -- orphaned_at + 14d (transfer window)
      hard_deadline TIMESTAMPTZ NOT NULL,  -- [RECONCILED] orphaned_at + 30d → auto-archive (matches AC: 14d transfer → 30d auto-archive)
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'transferred', 'archived', 'extended')),
      resolved_at TIMESTAMPTZ,
      resolved_by_user_id UUID,
      resolution_action TEXT  -- 'transfer' | 'archive'
    );
    CREATE INDEX idx_orphan_org ON orphan_subplans(org_id, status) WHERE status = 'pending';
    ALTER TABLE orphan_subplans ENABLE ROW LEVEL SECURITY;

### 6.6 Audit Log Event Type Genişlemesi

**Category: careplan**

  event\_type                                Tetikleyici
  ------------------------------------------ ----------------------------------------------------
  `careplan.draft.created`                   New plan started
  `careplan.draft.autosave`                  Autosave every 10s
  `careplan.activated`                       status=draft → active
  `careplan.on_hold`                         Manual or auto pause
  `careplan.resumed`                         on\_hold → active
  `careplan.completed`                       Goals achieved
  `careplan.revoked`                         T4 elevated; reason
  `careplan.entered_in_error`                T4 elevated
  `careplan.version.committed`               Save commit (auto-version)
  `careplan.milestone.created`               Named snapshot
  `careplan.lock.acquired`                   Editor opens
  `careplan.lock.released`                   Editor closes or idle
  `careplan.lock.conflict_force_overwrite`   Force overwrite + reason
  `careplan.collision_warning`               Subplan vs master goal conflict detected
  `careplan.template.instantiated`           Template applied
  `careplan.template.saved`                  Org saves custom template
  `careplan.patient_view.published`          Patient-facing readable view publish
  `careplan.patient_view.translated`         LLM translation generated
  `careplan.elevated.{action_code}`          Per elevated action (e.g. .dnr\_change, .iv\_init)

**Category: subplan**

  event\_type             Tetikleyici
  ----------------------- ----------------------------
  `subplan.created`       Discipline subplan started
  `subplan.activated`     Subplan active
  `subplan.orphaned`      Owner left care team
  `subplan.transferred`   New HCP accepted
  `subplan.archived`      CC archive after orphan

**Category: interrai**

  event\_type                                Tetikleyici
  ------------------------------------------ ------------------------
  `interrai.assessment.created`              New form started
  `interrai.assessment.completed`            Submit
  `interrai.assessment.linked_to_careplan`   Linked to plan version

### 6.7 PolicyEngine Integration

    // Master plan create
    PolicyEngine.evaluate({
      subject: { id: cc.id, role: 'care_coordinator' },
      action: 'create',
      resource: { type: 'CarePlan', category: 'master' },
      context: { patient_id, org_id, care_team_grant: 'active' }
    });

    // Subplan create (discipline scope check)
    PolicyEngine.evaluate({
      subject: { id: pt.id, role: 'physiotherapist' },
      action: 'create',
      resource: { type: 'CarePlan', category: 'subplan', discipline: 'physiotherapy' },
      context: { patient_id, org_id, master_plan_id, care_team_membership: 'active' }
    });

    // Subplan edit (single-author + lock check)
    PolicyEngine.evaluate({
      subject: { id: pt.id, role: 'physiotherapist' },
      action: 'update',
      resource: { type: 'CarePlan', id: subplan.id, owner_user_id: subplan.owner },
      context: { lock_holder: subplan.lock?.holder_user_id, requesting_lock: true }
    });

    // Elevated action gate
    PolicyEngine.evaluate({
      subject: { id: mrp.id, role: 'mrp', auth_tier_session: 'T4' },
      action: 'elevated_action',
      resource: { type: 'CarePlan', id: master.id, action_code: 'dnr_change' },
      context: { patient_id, org_id, elevated_matrix: orgPolicyMatrix }
    });

    // Cross-org read
    PolicyEngine.evaluate({
      subject: { id: specialist.id, role: 'specialist', org_id: specialist_org_id },
      action: 'read',
      resource: { type: 'CarePlan', id: master.id, owner_org_id: patient_org_id },
      context: { consent_grant: { scope: 'careplan', expires: deadline, active: true } }
    });

### 6.8 Cross-Doc Data Model Bağlantıları

  Doc 6 Resource/Table                         Bağlı Doc                                        İlişki
  -------------------------------------------- ------------------------------------------------ ---------------------------------------------------
  `CarePlan (master)`                          Doc 4 Patient 360 \"Care Plan Summary\" widget   Goals count + progress per master plan
  `CarePlan (subplan)`                         Doc 4 timeline                                   Subplan activity events feed timeline
  `CarePlan.activity.reference → Task/SR/MR`   Doc 8 (orders)                                   Doc 8 order create → reference burada
  `Goal`                                       Doc 4 outcome display                            Doc 4 widget Goals count + progress bars
  `Patient-facing View`                        Patient app cross-app                            Patient app render endpoint (Doc 10 consent feed)
  `CareTeam`                                   Doc 9 care team mgmt                             Membership change → subplan orphan event
  `Provenance`                                 Doc 2 audit + Doc 5 cross-source merge           Plan version + state transition
  `interrai_hc_assessments`                    Doc 4 Patient 360 \"Assessments\" tab (V1)       Latest assessment summary
  `careplan_patient_view`                      Doc 10 consent scope                             Publish gate respects patient consent
  `Consent (cross-org)`                        Doc 10                                           Specialist read access grant

§7 --- Hata ve Edge Cases
-------------------------

### 7.1 Concurrency + Lock

  Senaryo                                            Sistem Davranışı                                                             UX
  -------------------------------------------------- ---------------------------------------------------------------------------- ----------------------------------------------------------------------------------
  İki HCP aynı subplan açar                          İlk lock acquire; ikinci \"read-only --- X is editing\"                      Ikinci HCP read görür; \"Notify when free\" opt-in (V1)
  Lock holder tab kapatır without explicit release   5dk idle TTL release; sonra yeni acquire mümkün                              Kullanıcı uyarısı yok (sessiz release); draft autosaved
  Lock holder network drop, ama tab açık             Heartbeat fail 30s sonra; 5dk TTL hâlâ geçerli; reconnect ise lock korunur   Brief warning \"Reconnecting\...\"; no edit during disconnect
  Force overwrite reason not provided                UI submit deny; reason input mandatory                                       \"Sebep alanı zorunlu\"
  Master plan + subplan aynı anda CC + PT edit       Farklı lock (master vs subplan); independent                                 Sessiz; collision scan post-save warning UI
  5 dk idle ama user actively scrolling/reading      Heartbeat sadece edit action\'larında; passive view sayılmaz → release       \"Çok uzun süre inaktiftiniz, lock release oldu, devam etmek için yeniden açın\"

### 7.2 Version + History

  Senaryo                                      Sistem Davranışı                                                                  UX
  -------------------------------------------- --------------------------------------------------------------------------------- -------------------------------------------------------------------------------------------
  Autosave network fail                        Local IndexedDB queue + retry (3x); fail sonrası \"offline draft\" warning        \"Network bağlantısı yok --- değişiklikler local saklandı; bağlantı dönünce sync olacak\"
  Restore old version (örn. 3 ay önce)         Yeni draft olarak yaratılır (eski version preserve); CC review + activate gerek   \"Eski versiyon draft olarak yüklendi. İnceleyip aktive edin.\"
  Diff render heavy (büyük plan, 100+ goals)   Server-side diff compute + paginated rendering                                    Loading skeleton + \"Compare loading\...\"
  Patient-facing published version siliyor     Silinmiyor (immutable history); sadece \"superseded\" işaretleyebilir             Patient app: \"This is an older version of your plan\" badge

### 7.3 Elevated Action + T4 Re-Auth

  Senaryo                                                        Sistem Davranışı                                                            UX
  -------------------------------------------------------------- --------------------------------------------------------------------------- -------------------------------------------------------------------------------
  T4 re-auth modal cancel                                        Action aborted; plan unchanged                                              Modal close + back to plan editor
  T4 token timeout (5dk session boost)                           Re-auth tekrar gerek; eylem unblocked                                       \"Re-authentication expired. Try again.\"
  MRP yoksa elevated action attempt (örn. CC tries to set DNR)   PolicyEngine deny; role missing warning                                     \"DNR change requires MRP. Notify MRP to perform action?\" (Doc 9 routing V1)
  Attestation checkbox onaylanmadı                               Submit deny                                                                 \"Attestation onayı zorunlu\"
  Signature pad blank                                            Submit deny                                                                 \"Signature gerek\"
  Network drop mid-elevated action                               Local store + retry on reconnect; if successful, server idempotency check   \"Eylem bağlantı sırasında kayboldu; sonuç doğrulayın\"

### 7.4 Template + Instantiation

  Senaryo                                                 Sistem Davranışı                                                      UX
  ------------------------------------------------------- --------------------------------------------------------------------- ----------------------------------------------------------------
  Template\'den instantiate ama template güncellendi      Deep clone at instantiation; sonraki güncellemeler plan\'a yansımaz   Plan editor\'de \"Updated template available (V1 link)\" notif
  Org custom template Sinalytix template ile çakışan ad   Display \"Org: \" prefix; allowed coexist                             Gallery\'de filter ayrımı
  Template instantiate sırasında PlanDefinition invalid   Hata + alternative önerisi (Blank veya başka template)                \"Template uygulanamadı. Boş başlayın veya alternatif seçin.\"

### 7.5 interRAI HC

  Senaryo                                           Sistem Davranışı                                                          UX
  ------------------------------------------------- ------------------------------------------------------------------------- ---------------------------------------------------
  interRAI form kısmi save\'de browser crash        Autosave her step + on-blur; reload resume from last step                 \"Önceki cevaplarınız yüklendi\"
  MAPLe estimate manual; CC sezgi farklı            UI\'da \"Sinalytix estimate based on inputs: X\" + CC override allow      CC notu + audit
  CAP triggered ama plan\'da yansımıyor             Plan editor\'de \"Falls CAP triggered --- review activity?\" soft notif   Notif dismissible; audit
  interRAI license expired (V1+ algorithmic mode)   Fallback to manual mode + org admin alert                                 Org admin: \"Renew interRAI Canada license\" link

### 7.6 Patient-Facing Readable View

  Senaryo                                                  Sistem Davranışı                                                    UX
  -------------------------------------------------------- ------------------------------------------------------------------- ------------------------------------------------------------------------------
  Bedrock Claude rate limit at translate                   Queue + retry; CC notif \"Translation pending, retry in seconds\"   Preview \"Translation loading\...\"
  LLM çıktı abartılı simplification (klinik bilgi kaybı)   CC publish gate; CC edit ederek düzeltir                            Preview side-by-side; CC must explicit publish
  Multilingual language not supported                      Fallback EN; CC manual translate option                             \"FR translation unavailable --- patient app will see EN. Add FR manually?\"
  Patient app fetches old version                          Cache-bust on publish event; mobile pull-to-refresh                 Patient app: \"New version of your plan available\"
  Patient/Family consent revoked mid-view                  Patient app cache cleared; access blocked                           \"Bu hasta size erişim iznini kaldırdı\" + history erase

### 7.7 Lifecycle Transitions

  Senaryo                                                        Sistem Davranışı                                                  UX
  -------------------------------------------------------------- ----------------------------------------------------------------- ------------------------------------------------------------------------
  Hospitalization auto-detect false-positive (Tier 4 LLM hata)   Plan auto on-hold; CC override + status restore                   \"Plan on hold otomatik; doğru mu? Restore?\"
  License expiry race condition (HCP renews same day expired)    Cron processes; if renewed, restore eligibility next batch (1h)   Brief access window loss; HCP error if access in interim
  Care team grant lost mid-edit                                  Lock release + draft preserved; user redirected                   \"Bu hasta için yetkiniz kaldırıldı. Çalışmanız taslak olarak saklı.\"
  Completed plan\'a edit attempt                                 Reject --- must reactivate (T3)                                   \"Bu plan tamamlandı. Devam etmek için yeniden aktive edin.\"
  entered-in-error sonra recover                                 Immutable; new plan create gerek                                  \"Bu plan hata olarak işaretlendi. Yeni plan oluşturun.\"

### 7.8 Care Team Change + Orphan

  Senaryo                                                             Sistem Davranışı                                   UX
  ------------------------------------------------------------------- -------------------------------------------------- --------------------------------------------------------------------------
  Discipline HCP geçici çıkış (tatil/leave)                           CC manual \"Pause subplan\" (T3) --- not orphan    \"Subplan paused --- resume when HCP returns\"
  Orphan transfer ama yeni HCP role mismatch (PT subplan\'ı RN\'ye)   PolicyEngine deny; role validation                 \"RN bu subplan\'ı kabul edemez. PT/PTA atayın.\"
  14d transfer window expired without action                          CC alert escalation; subplan auto-archive at 30d   \"Bu subplan 30 gün önce orphan oldu, otomatik arşivlendi\"
  Multiple orphan subplans aynı patient                               Dashboard\'da grouped per patient                  Bulk transfer to single new HCP (if multi-discipline qualified) --- rare

### 7.9 Cross-Org

  Senaryo                                                       Sistem Davranışı                                                    UX
  ------------------------------------------------------------- ------------------------------------------------------------------- ----------------------------------------------------------
  Cross-org specialist consult sırasında consent revoke         Real-time access loss (Doc 10 5s pattern); specialist UI grey out   \"Hasta erişimi revoke etti. View kapatıldı.\"
  Specialist konsultasyon notu yazıyor ama consent kaybedildi   Note yarım kayboldu mu? Doc 7 spec; local draft preserved (V1)      Doc 7 ile entegre flow
  Specialist org\'unda farklı role mapping                      Doc 6 role floor: specialist                                        Cross-org context\'inde sadece read
  Consent expires (30d default)                                 Specialist erişimi otomatik kesil; renew için patient consent       \"Erişim süresi doldu. Hastadan yeniden grant isteyin.\"

### 7.10 Activity Reference (Doc 8 Bridge)

  Senaryo                                                            Sistem Davranışı                                                             UX
  ------------------------------------------------------------------ ---------------------------------------------------------------------------- ---------------------------------------------------------
  Plan activity references Task; Task cancelled separately (Doc 8)   Plan activity reflects Task.status; collision warning if plan still active   \"Task cancelled but plan activity active --- review?\"
  Rx (MedicationRequest) referenced; Rx fail to send via Doc 8       Plan activity status=failed; CC notif                                        \"Rx send failed; review and retry\"
  Activity reference broken (Task deleted)                           Plan activity orphan reference; UI shows broken link icon                    \"Linked task no longer available\"

§8 --- Kabul Kriterleri
-----------------------

### 8.1 Fonksiyonel Kabul Kriterleri

**Plan Hierarchy + CRUD:**

-   AC-1.1: CC master CarePlan create; FHIR CarePlan resource
    (status=draft → active) + partOf null.
-   AC-1.2: Discipline HCP subplan create; CarePlan resource
    (partOf=master/) + category includes discipline code.
-   AC-1.3: Master plan\'dan subplan listesi navigate (partOf reverse
    query).
-   AC-1.4: Discipline subplan single-author lock; second HCP read-only.
-   AC-1.5: CC master + discipline subplan parallel edit (farklı lock)
    --- collision warning post-save.

**interRAI HC:**

-   AC-2.1: CC veya RN interRAI HC form open + autosave + submit.
-   AC-2.2: Form data Observation resource (CA Core+) +
    Sinalytix-internal table\'a yazılır.
-   AC-2.3: Risk summary widget plan editor\'de gösterilir (MAPLe
    estimate + CAP triggers).
-   AC-2.4: MAPLe MVP manual rules (basic input → estimate); V1
    algorithmic.

**Templates:**

-   AC-3.1: Sinalytix-curated 10-12 template gallery\'de mevcut.
-   AC-3.2: Template instantiate → plan deep clone (goals + activities).
-   AC-3.3: Org-level custom template save (CC); private to org.
-   AC-3.4: Blank from-scratch alternatif her zaman gösterilir.

**Versioning:**

-   AC-4.1: Save commit her seferinde yeni version (FHIR \_history).
-   AC-4.2: CC milestone snapshot named + description.
-   AC-4.3: Version history viewer (PLAN-HISTORY-01) diff per version.
-   AC-4.4: Restore old version → new draft creation; eski preserve.
-   AC-4.5: Autosave 10s aralık (background); offline IndexedDB queue +
    sync on reconnect.

**Activity:**

-   AC-5.1: Inline activity (CarePlan.activity.detail) --- text +
    scheduledTiming + status.
-   AC-5.2: Reference activity (Task/ServiceRequest/MedicationRequest)
    --- Doc 8 picker + create in-line.
-   AC-5.3: PRN, daily, weekly, one-time schedule support.

**Goals + Outcome:**

-   AC-6.1: Goal resource per master + per subplan; lifecycle status.
-   AC-6.2: Manual progress note (CC veya owning discipline).
-   AC-6.3: Achievement status update (in-progress / achieved /
    sustaining / cancelled).
-   AC-6.4: Doc 4 Patient 360 widget Goals count + per-status progress
    bars feed.

**Lifecycle:**

-   AC-7.1: FHIR CarePlan.status state machine (draft, active, on-hold,
    completed, revoked, entered-in-error).
-   AC-7.2: Auto-transition hospitalization (Tier 4 ingestion-detected)
    → on-hold; CC notif.
-   AC-7.3: Auto-transition license expiry → revoked (Doc 1 cron).
-   AC-7.4: Manual transition T3 (biometric+PIN) çoğu; T4 (full 2FA)
    revoke + entered-in-error.

**Elevated Actions:**

-   AC-8.1: T4 re-auth modal Doc 2 spec.
-   AC-8.2: 8 baseline action (B2.1) MVP elevated; org customize V1.
-   AC-8.3: Attestation + signature pad zorunlu (configurable per
    action).
-   AC-8.4: Auto-milestone snapshot for elevated actions (configurable).
-   AC-8.5: Audit log per elevated action.

**Patient-Facing Readable View:**

-   AC-9.1: CC publish CTA → Bedrock Claude translate + simplify.
-   AC-9.2: Multilingual EN + FR MVP.
-   AC-9.3: Side-by-side preview; CC edit/approve.
-   AC-9.4: Publish creates PublishedView resource immutable per
    version.
-   AC-9.5: Patient app fetch endpoint (cross-app render).

**Concurrency:**

-   AC-10.1: Per-subplan single-author optimistic lock.
-   AC-10.2: 5dk idle TTL release.
-   AC-10.3: Conflict resolution UI (web) field-by-field merge.
-   AC-10.4: Force overwrite reason input zorunlu + audit.

**Care Team Change:**

-   AC-11.1: HCP care team\'den çıkış → subplan ownership=orphan +
    on-hold.
-   AC-11.2: CC dashboard \"Orphan Subplans\" widget; 14d transfer
    window countdown.
-   AC-11.3: Transfer to new HCP (PolicyEngine role-validate).
-   AC-11.4: 14d after no action → escalation; 30d auto-archive.

**Cross-Org:**

-   AC-12.1: Patient consent grant ile specialist read-only Patient
    360 + Plan.
-   AC-12.2: Specialist Doc 7 ile consultation note ekler.
-   AC-12.3: Specialist subplan edit yetkisi cross-org MVP\'de yok.

### 8.2 Regülasyon ve Güvenlik Kabul Kriterleri

-   AC-S.1: Tüm CarePlan CRUD audit log\'da (Doc 2 canonical schema).
-   AC-S.2: PolicyEngine.evaluate her read/write (Doc 2 generic
    interface).
-   AC-S.3: Discipline autonomy floor: CC discipline subplan\'i sessizce
    edit edemez.
-   AC-S.4: T4 elevated action listesi audit\'lenir + signed + reasoned.
-   AC-S.5: Patient-facing readable view CC explicit approval gate (LLM
    safety).
-   AC-S.6: Multilingual translation Bedrock Claude Canada Central (data
    residency).
-   AC-S.7: Cross-org plan access Doc 10 consent grant zorunlu;
    scope-limited.
-   AC-S.8: PHIPA: plan PHI; sensitive lockbox respect (Doc 4
    alignment).
-   AC-S.9: License expiry → cron immediate plan status revoke (within
    1h).
-   AC-S.10: Lock force overwrite reason audit; rare event.

### 8.3 Teknik ve Performans Kabul Kriterleri

-   AC-T.1: Plan editor initial load \< 1.5s p95 (nominal master + 3
    subplans).
-   AC-T.2: Autosave latency \< 500ms p95.
-   AC-T.3: Bedrock Claude translation generate \< 8s p95 (nominal plan
    size).
-   AC-T.4: Version diff render \< 2s p95 (\<50 goals/activities).
-   AC-T.5: Template instantiate \< 1s p95.
-   AC-T.6: Conflict resolution UI render \< 1s p95.
-   AC-T.7: PolicyEngine.evaluate \< 50ms p95.
-   AC-T.8: Lock acquire \< 100ms p95.
-   AC-T.9: Patient-facing view fetch (Patient app) \< 1s p95 (cache
    hit).
-   AC-T.10: Orphan dashboard query \< 1s p95 (per CC\'s patient panel).

§9 --- Başarı Metrikleri
------------------------

### 9.1 Adoption + Engagement

  Metrik                                                            V0 Hedef (Pilot)   V1 Hedef (GA)   Ölçüm
  ----------------------------------------------------------------- ------------------ --------------- --------------------------------------------
  Active patient\'ların plan\'ı olma oranı                          %85+               %95+            CarePlan active per patient / total
  CC başına ortalama master plan oluşturma süresi (with template)   \<25 dk            \<15 dk         Time from create to activate
  Template kullanım oranı (vs blank from scratch)                   %50+               %70+            Template-instantiated / total plans
  Discipline subplan ortalama sayısı per patient                    2.0-2.5            2.5-3.0         Subplans count / patients with active plan
  interRAI HC form completion (LHIN-funded patients)                %75+               %90+            Assessment / patient count
  Patient-facing readable view publish rate                         %60+               %85+            Published views / activated plans
  Patient app plan view weekly active rate                          %40+ patient       %60+ patient    Unique patient views / active patients

### 9.2 Quality + Safety

  Metrik                                                  V0 Hedef         V1 Hedef         Ölçüm
  ------------------------------------------------------- ---------------- ---------------- --------------------------------------
  Elevated action attestation completion                  %100             %100             Signed + attested / elevated actions
  LLM translation CC edit rate (publish-time edit)        %30-50           %20-40           CC edited / published views
  Conflict resolution force-overwrite rate                \<%2             \<%1             Force / total conflicts
  Collision warning (subplan vs master) resolution rate   %80+ within 7d   %95+ within 3d   Resolved / detected
  Plan version restore frequency                          \<%5 plans       \<%2             Restore actions / total plans
  Orphan subplan 14d resolution rate                      %85+             %95+             Transferred + archived / orphaned

### 9.3 Operational + Cost

  Metrik                                          V0 Hedef   V1 Hedef   Ölçüm
  ----------------------------------------------- ---------- ---------- ---------------------------------
  Bedrock translation cost per plan per publish   \<\$0.10   \<\$0.05   Token usage \* pricing
  Bedrock translation cache hit rate              \>%70      \>%85      Cache fetches / total fetches
  Plan editor session avg duration                8-15 dk    6-10 dk    Editor open → close/activate
  Autosave success rate                           \>%99      \>%99.5    Successful autosaves / attempts
  Orphan subplan avg time-to-resolution           \<7d       \<3d       orphaned\_at → resolved\_at avg

### 9.4 Clinical Outcome (V1+ Longitudinal)

  Metrik                                                         Hedef                       Ölçüm
  -------------------------------------------------------------- --------------------------- --------------------------------------------
  Goal achievement rate (achieved / total)                       %50+ at 90d                 Status outcome tracking
  Time-to-goal-achievement (per template)                        Reduced vs pilot baseline   Goal startDate → status=achieved
  Patient/Family plan view engagement → adherence correlation    Positive                    Cross-resource time series (Doc 4)
  Cross-discipline conflict resolution time                      \<72h avg                   Collision detect → resolve
  Care plan version churn (avg edits per active plan per week)   2-5                         Health indicator of active plan management

### 9.5 Compliance + Audit

  Metrik                                            Hedef               Ölçüm
  ------------------------------------------------- ------------------- -------------------------------------
  Audit completeness (her plan CRUD logged)         %100                Audit/op count parity
  Cross-border egress events                        0                   AWS VPC + IAM audit
  Elevated action signature presence                %100                Signature artifact / elevated event
  Sinalytix-internal unauthorized access attempts   Log + investigate   PolicyEngine deny audit

§10 --- UX ve Tasarım Notları
-----------------------------

### 10.1 Discipline Autonomy Görselleştirme

*CC orkestrasyonu + discipline autonomy paradigması UI\'da net
hissedilmeli. CC subplan editor\'e girdiğinde \"read context --- owned
by PT\" mesajı baskın. Discipline HCP master plan\'a girdiğinde \"master
context --- owned by CC\" baskın. Edit yetkisi disabilities tactile (gri
buton + tooltip), yumuşak engelleme tonu --- düşman değil, sınır.*

-   Master plan editor (CC sahibi): tüm controls active
-   Master plan view (discipline sahibi): controls read-only + tooltip
    \"Edit by CC only\"
-   Subplan editor (own discipline): tüm controls active
-   Subplan view (other discipline veya CC): read-only + tooltip \"Edit
    by \"
-   Comment thread her seviyede (V1 expand) --- CC notları discipline
    subplan\'ına etiketlenir; discipline notları master\'a etiketlenir;
    Master Doc §3.3 conflict resolution operationalize

### 10.2 Collision Warning UX

*Subplan goal\'leri master plan goal\'leri ile çelişebilir (örn. master
\"palliative comfort-only\" + PT \"aggressive ROM\"). Sistem bunu detect
ettiğinde uyarı yumuşak ama görünür olmalı --- engelleyici değil (klinik
kararı süreç içinde verilmeli).*

-   Collision warning advisory only --- UI\'da subplan + master goal yan
    yana göstererek \"Bu hedefler çelişebilir, gözden geçirin?\"
-   \"Anladım, ilerleyelim\" CTA dismiss
-   Audit\'lenir: collision detected + dismissed/resolved + actor
-   Master Doc §3.3 thread V1 (CC + MRP + discipline diyalog)

### 10.3 Template Galeri UX

*Template seçimi onboarding aksiyonu; CC akışı engelle ya da hızlandır.
Galeri görsel + searchable + relevance-sorted olmalı.*

-   Card visual: condition icon (kalp, akciğer, beyin, beslenme vb.) +
    başlık + 2-line description
-   Hover: tooltip first 3 goals preview
-   Click: full preview modal + \"Instantiate\"
-   Sort: relevance (patient context --- Dx\'lere göre suggested first);
    alphabetical; recently used
-   Filter chips: condition category, discipline involvement, source
    (Sinalytix/Org)

### 10.4 Patient-Facing View --- Klinik vs Patient-Friendly Dengesi

*LLM-translated view \"anlaşılır + güvenli + okunabilir\" üçü birden
olmalı. CC publish gate burada kritik. LLM bazen aşırı simplifiye
edebilir (klinik ayrıntı kaybı) veya yanlış idiom kullanabilir.*

-   Side-by-side preview: clinical (left) vs patient-friendly (right)
    per section
-   Inline edit on patient side; CC her satırı override edebilir
-   \"Tavsiye: gerçek kişi tonu ile hitap\" hint cards (örn. \"Hi Maria,
    here\'s what to expect this week\...\")
-   Multilingual: tab switch EN \| FR; CC her dilde ayrı edit
-   \"Family caregiver section\" ayrı (eğer patient/family separate
    consent ile)

### 10.5 Version Diff Görsel Dili

*Diff renkler: yeşil (eklendi), kırmızı (silindi), mavi (değişti).
Field-level highlight. Big-picture vs detail toggle.*

-   Top: summary stats (\"+3 goals, -1 activity, 2 status changes\")
-   Body: per-section diff (goals, activities, narrative)
-   Diff mode toggle: side-by-side \| inline (git-like)
-   Restore CTA per version (separate from diff selection)

### 10.6 Lock Indicator + Real-time Awareness

*Concurrent edit hassas; user \"X is editing\"i anlayıp saygı göstermesi
gerek.*

-   Header sticky: lock holder name + avatar + \"editing since 14:23\"
-   Read-only mode banner: \"X is editing --- your view is read-only.
    Refresh in 3s to check.\"
-   WebSocket update on lock release: real-time \"Lock released --- you
    can edit now\"
-   Conflict UI modal full-screen on save conflict (impossible to miss)

### 10.7 Elevated Action --- Klinik Aciliyet Hissi

*T4 re-auth modal \"ciddi karar\" hissi yaratmalı. Tasarım: serious
tone, signing flow visual, attestation çerçevelenmiş.*

-   Modal kırmızı top bar + warning icon
-   Re-auth step-by-step: 1) auth gate, 2) attestation, 3) signature, 4)
    confirmation
-   DNR/Goals-of-care change: full plan impact preview (\"This will
    change patient\'s resuscitation status from Full Code to DNR\")
-   Notification post-action: care team + patient/family notif
    (sensitive policy gözetilir)
-   Audit yarın CC retro review: weekly elevated action summary

### 10.8 Orphan Subplan Dashboard --- Aciliyet Görsel Dili

*Orphan subplan hizmet kesintisi riski; CC bunu görmeli ve hızlı aksiyon
almalı.*

-   Dashboard widget üst sırada (high-prominence)
-   Per-orphan card: patient avatar + discipline + days remaining
    countdown
-   Renk: yeşil (0-7d), sarı (8-12d), kırmızı (13-14d), gri (expired)
-   One-click \"Transfer\" → smart suggestion (discipline ile uyumlu
    care team member listed first)

### 10.9 Cross-Org Plan Görsel İşaretleme

*Specialist cross-org context\'te erişiyor; UI sınırı net çizilmeli
(yanlışlıkla edit girişimi olmasın).*

-   Top sticky banner: turuncu \"Cross-org view --- Read only. Patient:
    Maria T. --- consented to your org until June 28.\"
-   Watermark \"READ ONLY\" subtle background
-   Add Consultation Note CTA prominent (Doc 7 flow)
-   No edit/template/restore action visible

### 10.10 Erişilebilirlik

-   WCAG 2.1 AA: color contrast, keyboard nav, screen reader announce
-   Plan editor keyboard shortcuts: Ctrl+S (save), Ctrl+M (milestone),
    Ctrl+P (publish), Esc (close)
-   Screen reader: lock holder + status + change announce
-   High contrast theme: collision/elevated/orphan badges dual encode

### 10.11 Mobile vs Web UX Felsefesi

*Care plan authoring kompleks; mobile primarily \"saha kontrol + light
update\" deneyimi. Web \"deep authoring\".*

-   Mobile read default; quick aksiyon (status update, progress note,
    mark visit done)
-   Web full editor; mobile banner \"Edit on web for full features\"
-   Mobile push notif: yeni subplan, orphan event, elevated action
    approved, patient view publish

§11 --- Kullanıcı Senaryoları
-----------------------------

### 11.1 Senaryo: CC İlk Master Plan --- Yeni Onboarded Hasta

**Aktör:** Care Coordinator Anne

**Bağlam:** Maria T. (72y, post-stroke, T2 diabetes, hipertansiyon)
onboarding tamamlandı (Doc 1); Tier 4 bulk backfill (Doc 5) ile son 2
yıl chart hazır.

**Akış:**

1.  Anne worklist\'te Maria\'yı seçer → \"Create Care Plan\" CTA →
    PLAN-EDITOR-01 açılır.
2.  interRAI HC quick form CTA görünür; \"Recommended for LHIN-funded
    patients\". Anne 15 dakikada form\'u doldurur (ADL Hierarchy:
    Limited; CPS: 1 (intact); MAPLe: Moderate; Falls CAP triggered).
3.  Plan editor template gallery\'yi açar. \"Post-stroke
    rehabilitation\" template --- preview → goals (3): functional ROM
    recovery, ADL independence, falls prevention; activities (8): PT
    3x/week, OT 2x/week, daily home exercise, RN weekly check.
4.  \"Instantiate\" → plan deep-cloned. Anne goals\'u Maria\'ya
    özelleştirir: \"ROM right knee 0-90° within 6 weeks\" (PT subplan
    ile koordine olacak), \"Independent transfers within 8 weeks\",
    \"Falls prevention --- home modification by 30d\".
5.  Anne narrative ekler: \"Maria yalnız yaşıyor; family caregiver kızı
    Sarah haftada 4 gün uğruyor. Falls risk yüksek (CAP), home safety
    assessment first priority. Diabetes glycemic control stable,
    monitor.\"
6.  Anne goals\'u review → activate plan → status=active.
7.  \"Publish Patient View\" → Bedrock Claude translate; preview:
    \"Today\'s care for Maria\... PT will visit Mon/Wed/Fri to help your
    knee bend better. Your daughter Sarah can help you practice
    exercises\...\"
8.  Anne FR de görür (\"Soins d\'aujourd\'hui pour Maria\...\"), küçük
    düzeltme (\"right knee\" → \"votre genou droit\"), publish.
9.  Maria + Sarah patient app\'te push notif: \"Your care plan is
    ready.\"

**Sonuç:** 35 dakikada interRAI assessment + master plan +
patient-facing view tamamlandı. Discipline subplanları ileride PT/OT
kendi ekleyecek.

### 11.2 Senaryo: PT Discipline Subplan --- Otonom Yazım

**Aktör:** PT Sarah (Sinapse Home Care\'in fizyoterapist\'i)

**Bağlam:** Maria T. CC Anne tarafından master plan ile aktive edildi 2
gün önce; PT Sarah ilk ev ziyaretine geliyor.

**Akış:**

1.  Sarah worklist\'te Maria\'yı görür → Patient 360 → Care Plan Summary
    widget\'tan \"PT Subplan --- Not started\" → \"Create my subplan\"
    CTA.
2.  Subplan editor açılır. Sol rail\'da master plan context: \"Master
    Goal: ROM right knee 0-90° within 6 weeks\" + \"Falls prevention
    priority\".
3.  Sarah Maria\'nın evinde Berg Balance Score yapar (38/56 --- yüksek
    risk), ROM measure right knee (35° baseline). Mobile RN app\'ten
    quick entries girer.
4.  Subplan goals tanımlar: \"ROM right knee 0-90° within 6 weeks\"
    (master mirror), \"Berg ≥45 within 12 weeks\", \"Independent
    sit-to-stand within 8 weeks\", \"Home stairs ascent/descent with
    rail within 16 weeks\".
5.  Activities: PT visit 3x/week (Mon/Wed/Fri, 45 dk), home exercise
    plan (kendi seçtiği egzersizler --- PDF attach as
    DocumentReference), family education for Sarah\'ya falls prevention
    (Task referans, due tomorrow).
6.  Sarah subplan\'i activate eder. Collision scan tetiklenir; master
    goal ile uyum var → no warning.
7.  CC Anne dashboard\'da yeni subplan badge görür. Plan-View\'da PT
    subplan summary\'sini okur. \"Looks good\" --- no override.

**Sonuç:** PT Sarah master plan ile koordine + kendi disipline-spesifik
plan\'ı autonomous olarak oluşturdu. CC orkestrasyon + discipline
autonomy paradigması gerçek.

### 11.3 Senaryo: Goals-of-Care Change --- Elevated Action

**Aktör:** MRP Dr. Lee (Maria\'nın supervising physician\'ı)

**Bağlam:** Maria 4 ay sonra hospitalize edildi (massive stroke
recurrence); UHN\'de discharge planning meeting; family + MRP
\"comfort-only palliative\" kararı verdi.

**Akış:**

1.  Dr. Lee Sinalytix\'i açar → Maria\'s Care Plan → PLAN-EDITOR-01.
2.  \"Goals of Care\" sekmesinde \"Change to DNR + Comfort-only\" CTA.
    Sistem T4 elevated tetikler.
3.  PLAN-ELEVATED-01 modal: T4 re-auth biometric (Face ID) + PIN + 2FA
    TOTP. Tamam.
4.  Action form: \"Change goals of care from Full Code to DNR (Do Not
    Resuscitate) + Comfort-only palliative\". Attestation: \"Discussed
    with patient and family, documented consent, aligns with patient\'s
    expressed wishes\". Signature pad.
5.  Confirm → plan version bump (new version + auto-milestone
    \"Discharge from UHN --- palliative transition\") + audit
    `careplan.elevated.dnr_change` + notify care team (CC Anne, PT
    Sarah, OT) + patient/family notif (Doc 9 sensitive comm).
6.  Plan\'da goals değişir: rehab goals → \"completed (no longer
    applicable)\"; new goals \"Comfort + symptom management + family
    support\".
7.  Subplanlar collision warning: PT subplan \"aggressive ROM\" master
    \"comfort-only\" ile çelişir → PT Sarah\'ya alert. Sarah subplan\'i
    revise eder (PT goals → \"completed (no longer applicable)\", new
    activities \"passive ROM for comfort, weekly family training\").
8.  CC Anne publish gate\'i --- patient/family-facing view yeniden
    generate: \"Maria\'s care is now focused on comfort and quality of
    life. The team will help with pain, breathing, and supporting your
    family.\"

**Sonuç:** Klinik karar critical; T4 re-auth + attestation + signature +
audit tam izlenir. PMR uzmanı satisfied --- process safety +
accountability.

### 11.4 Senaryo: PT Sarah Care Team\'den Çıkıyor --- Orphan Subplan

**Aktör:** Sinapse Home Care manager (CC backup) + new PT Marcus

**Bağlam:** PT Sarah Sinapse\'tan ayrılıyor (yeni iş); Maria\'nın PT
subplan\'i orphan kalıyor.

**Akış:**

1.  Sarah care team\'den çıkış event\'i Doc 9\'da kayıt edilir.
    Sinalytix subplan ownership detect → orphan event tetiklenir.
2.  Maria\'nın PT subplan: status=on-hold, ownership=orphan,
    transfer\_deadline = 14 gün sonra.
3.  CC Anne dashboard\'da \"Orphan Subplans\" widget\'ında Maria T. ---
    PT --- 14d remaining (yeşil) görür.
4.  Patient-facing view: Maria + Sarah (kızı) Patient app\'te \"PT
    service paused --- your care team will resume soon\" badge.
5.  3 gün sonra Marcus (yeni PT) onboarding\'i tamamlanır → care team\'e
    eklenir → CC Anne \"Transfer Orphan Subplan to Marcus\" CTA → Marcus
    accept.
6.  Subplan ownership transferred; status=active; Marcus subplan\'i
    review eder (Sarah\'nın notları + ROM progress history korunur),
    kendi assessment ile yenisi yapmaya başlar.
7.  Patient app: \"PT service resumed with Marcus\" notif.

**Sonuç:** Hizmet kesintisi 3 gün ile sınırlı; klinik continuity
tarihçesi korundu; CC governance net.

### 11.5 Senaryo: Cross-Org Specialist Consult

**Aktör:** Dr. Patel (UHN neurologist), CC Anne (Sinapse)

**Bağlam:** Maria\'nın stroke recurrence sonrası UHN follow-up;
neurology consult ister; Maria Doc 10 üzerinden Dr. Patel\'in org\'una
30 günlük consent grant verir.

**Akış:**

1.  Dr. Patel UHN\'de Sinalytix\'i açar → patient list → Maria T.
    (cross-org access badge görünür) → Patient 360 + Care Plan görür.
2.  PLAN-CROSS-ORG-01 view: turuncu banner \"Cross-org view --- Read
    only. Patient: Maria T. --- consented to UHN Neurology until July
    28.\"
3.  Dr. Patel master plan\'ı (palliative comfort-only) + PT subplan
    (Marcus, passive ROM) + OT subplan (ADL maintenance) okur.
4.  \"Add Consultation Note\" CTA → Doc 7 flow → not yazar: \"Reviewed
    care plan post-stroke recurrence. Goals of care align with
    patient/family wishes. Recommend continuation of comfort-only
    palliative pathway. Suggest gabapentin trial for neuropathic pain.
    Follow-up in 4 weeks.\"
5.  Not signed → Patient timeline (Doc 4) ekler + CC Anne notify.
6.  CC Anne not\'u review → MRP Dr. Lee\'ye forward (gabapentin Rx
    kararı için Doc 8 flow) → MRP elevated action ile Rx orders.
7.  Dr. Patel\'in consent grant 30 gün sonra expire --- erişim otomatik
    kesilir.

**Sonuç:** Multi-org consultation rolü net; specialist autonomy yok
(kendi org context\'inde), ama klinik girdi tam değer veriyor. Patient
consent autonomy korunur.

### 11.6 Senaryo: Conflict Resolution --- CC + PT Simultaneous Edit

**Aktör:** CC Anne + PT Marcus

**Bağlam:** Maria\'s plan; Anne master plan\'da yeni goal eklemek
istiyor; Marcus aynı anda kendi subplan\'ında progress note ekliyor
(farklı resource = farklı lock; safe).

**Akış:**

1.  Marcus subplan editor açar → lock acquire → progress note ekler
    (\"Maria\'s pain better controlled with adjusted gabapentin dose\").
2.  Aynı anda Anne master plan editor açar → lock acquire (farklı
    resource) → \"Add Goal: Symptom mgmt --- pain ≤3/10\".
3.  Her ikisi de save eder; iki farklı CarePlan resource → conflict yok.
4.  Post-save, Anne\'in master goal\'i Marcus\'un subplan\'iyle uyum
    kontrolü → collision scan: \"PT subplan\'inde pain management
    activity yok ama master goal\'de var --- review?\"
5.  Anne notification: \"PT subplan\'i master plan ile uyum mü?
    Marcus\'a notify et?\"
6.  Anne Marcus\'a comment thread (V1 expand) ile not gönderir: \"Master
    plan\'a pain mgmt goal ekledim; PT subplan\'inde pain assessment +
    reporting activity ekleyebilir misin?\"
7.  Marcus comment notif → subplan\'ında \"Pain assessment weekly +
    report to MRP\" activity ekler.

**Sonuç:** Concurrency safety + collision detect + MDT communication
akıcı; Master Doc §3.3 yumuşak operationalize.

§12 --- Açık Konular
--------------------

### 12.1 V0 Launch Öncesi Karara Bağlanmalı

-   **interRAI HC manual MAPLe estimation rules:** Hangi input
    combinasyonu hangi estimate\'i üretir? PMR uzmanı + klinik danışman
    ile tanımlama gerek (basic rule table).
-   **Sinalytix-curated 10-12 template content detay:** Her template
    için goals + activities + interRAI CAP linkage düzenli yazılmalı;
    klinik review (PMR uzmanı + 2-3 home care RN/PT) zorunlu.
-   **Bedrock Claude translate prompt engineering:** Patient-friendly
    tone + medical accuracy dengesi; test set + iterative tuning;
    rage-quit risk (LLM too simplistic veya too clinical).
-   **Conflict resolution UI default behavior:** Hangi alanlar otomatik
    merge edilebilir vs hangi alanlar always manual?
-   **Lock TTL granularity:** 5 dakika idle release MVP; pilot feedback
    ile 3-10dk range tune.
-   **Hospitalization auto-detect threshold:** Tier 4 hangi
    keyword/pattern hospitalize sayar? False-positive cost?
-   **Orphan subplan 14d window:** Org admin V1\'de extend opsiyonu mu?
    MVP\'de hardcoded 14d.
-   **Elevated action signature format:** Drawn signature image mi yoksa
    typed full-name attestation mi? Health Canada precedent.

### 12.2 V1 Spec Kararları

-   **interRAI HC MAPLe algorithmic + CAP auto-triggered template
    suggestions** (full operational integration)
-   **Patient comment thread on plan:** Patient/Family per-goal
    reaction + comment; CC moderation; threading model
-   **Multilingual expand:** Turkish, Mandarin, Punjabi, Arabic; LLM
    prompt per language + native QA review
-   **Org admin elevated action matrix UI:** add/remove/customize per
    org
-   **Template publish + Sinalytix curated review workflow:** Quality
    bar; review board; veröffentlichen
-   **\"Plan vs Actual\" outcome dashboard:** Goal target vs actual;
    trend analyzes
-   **Goal target structured input:** numeric, range, qualitative;
    progress chart
-   **Conflict resolution V1 thread:** CC-MRP-Discipline structured
    diyalog (Master Doc §3.3 operationalize)
-   **Subplan-level patient consent override (break-glass):** Hangi UX,
    hangi approval, audit chain
-   **Hospitalization auto-trigger refinement:** ADT feed integration V2
    prep
-   **Plan publish diff for patient/family:** \"Changes since you last
    viewed\" diff highlight in Patient app

### 12.3 V2+ Vizyon

-   **Real-time collaborative editing:** Google Docs / CRDT; multi-user
    state mgmt
-   **AI-suggested goals/activities:** SaMD Class II yolculuğu; Bedrock
    Claude + interRAI MAPLe
-   **Cross-org subplan add workflow:** Specialist authoring in
    consulted patient context; multi-org governance
-   **Plan analytics + outcome correlation:** Population-level template
    performance, time-to-goal
-   **interRAI HC reporting export:** LHIN/OHA submission format
    auto-generate
-   **AI scribe direct plan update (Doc 7 ile entegre):** Visit
    recording → plan goal/activity update suggestion
-   **Voice/video MDT plan revise session:** Real-time collaborative
    whiteboard + auto-summary

### 12.4 Cross-App Reconciliation (10 Doc Bittikten Sonra)

-   **Care plan patient-facing view cross-app:** Patient app render
    endpoint contract; version sync; consent gate
-   **CareTeam cross-app:** Doc 9 care team mgmt → subplan ownership;
    cross-app refresh
-   **Plan comment + family/caregiver:** Hangi roller comment yapabilir;
    permission matrix Patient/Caregiver/Family PRD\'leri ile reconcile
-   **Plan notification cross-app:** Push notif unification (Doc 9
    communication primitive)
-   **Outcome data cross-app:** Patient self-report (Doc 4 adherence) →
    Goal outcomeReference (V1)

### 12.5 Klinik Review (PMR Uzmanı + CXO)

-   **Discipline autonomy floor --- yasal scope-of-practice
    validation:** CMA/CNO/CASLPO/CAOT scope ile Sinalytix role-activity
    matrix tam hizalı mı? Provincial farklar?
-   **interRAI HC manual mode klinik adequacy:** MAPLe estimate manual
    yeterince güvenilir mi? Pilot org\'larda risk?
-   **Elevated action 8-baseline tam mı:** Eklenmesi gereken (örn.
    urgent care escalation, suicidal ideation flag) var mı?
-   **Patient-facing translation klinik tone:** Tonu (formal vs
    informal) hangi standart? \"Tu\" vs \"vous\" FR; medical accuracy vs
    simplification trade-off
-   **Hospitalization auto-on-hold mantıklı mı?:** Bazı hospitalizations
    care plan continuity gerek (home care for chronic during acute
    episode). Pilot feedback
-   **Goals-of-care change ondalama compulsory documentation:**
    Discussion documentation, family consent witness --- yeterli mi?

### 12.6 Pilot Feedback Tuning

-   Plan editor open → activate time (workflow speed)
-   Template adoption per condition (which work, which need refinement)
-   Discipline subplan adoption per HCP role (PT vs OT vs RN engagement
    rates)
-   Patient-facing view engagement (open rate, time-on-page)
-   Bedrock translate CC edit rate (LLM tuning signal)
-   Conflict + collision warning false-positive rate
-   Orphan subplan resolution time
-   Elevated action frequency + actor distribution
-   Cross-org consult adoption rate

### 12.7 Backend Infra Detayları

-   **FHIR \_history retention:** Tüm versiyon storage long-term ---
    Glacier\'a archive policy?
-   **Bedrock Claude prompt versioning:** Prompt değişikliği →
    translation re-generate batch?
-   **Lock cron release cadence:** 30 saniye? Pilot tuning
-   **Patient-facing view cache invalidation strategy:** Pub/sub on plan
    version change
-   **Template versioning:** Sinalytix-curated template update →
    instantiated planlara propagate mi yoksa snapshot only?
-   **interRAI HC license integration:** V1 algorithmic mode için Canada
    license contract + API access
-   **Audit query for \"all changes to this patient\'s plan by HCP
    X\":** Index strategy
-   **Cross-org plan visibility audit:** Specialist read events ek alert
    hassas mı?

*Sinalytix HCP PRD --- Doc 6: Care Plan Authoring & Subplans. v1.0 ---
31 Mayıs 2026. Master Doc §3.1 + §3.2 + §3.3 + §5.5 + Session 2 Q&A
(B1.1-B3.4, 12 karar) ile uyumlu. Doc 1-5 baseline\'larına bağlı.
Cross-app reconciliation 10 doc bittikten sonra ayrı pass.*

Table of Contents {#table-of-contents-6 .TOC-Heading}
=================

Sinalytix HCP PRD --- Doc 7: Clinical Documentation & AI Scribe
===============================================================

**Versiyon:** v1.0 **Tarih:** 31 Mayıs 2026 **Sahip:** Sinalytix Ürün &
Klinik Ekibi **Statü:** Locked (Session 2 Q&A --- 12 karar: B1.1-B3.4)
**Bağlı Dokümanlar:** Master Doc §5.6, Doc 1 (Identity), Doc 2 (T3
re-auth signing), Doc 4 (Patient 360 timeline), Doc 5 (Bedrock+Claude
stack), Doc 6 (CarePlan link), Foundation \#6 (Tier 4 LLM moat)

§1 --- Bağlam ve Amaç
---------------------

### 1.1 Tanım

**Clinical Documentation & AI Scribe**, HCP\'nin klinik notlarını
(progress, assessment, SOAP, consult, vb.) yazma, imzalama, ek
(addendum) çekme ve hata düzeltme deneyimini sağlayan modüldür.
Sinalytix bu modüle iki stratejik diferansiyatör katmanı ekler:

1.  **In-house AI Scribe (Bedrock+Claude single-stack, Doc 5 ile
    sinerjik):** Visit audio → AWS Transcribe Medical → Claude Sonnet
    structured note draft → HCP review/edit/sign. Foundation \#6 Tier 4
    moat\'ı genişletir.
2.  **SmartTools-equivalent (snippets + smart placeholders) MVP:**
    Klinik hız multiplier; HCP zaman verimliliği için sektör standartı
    (Epic SmartTools).

Doc 7\'nin temel kararları (Session 2 Q&A):

-   **8-10 standard note type taxonomy (B1.1):** LOINC-coded; Doc 4
    timeline filter + Doc 8 order context feed.
-   **Hybrid free-text + structured panels (B1.2):** Klinik hız + FHIR
    data quality dengesi.
-   **Sinalytix-curated 8-12 note template + org custom save (B1.3):**
    Doc 6 paterni.
-   **Auto-link current plan version snapshot (B1.4):** Note ↔ CarePlan
    traceable.
-   **Two-step draft preview + final sign modal + immutable on sign
    (B2.1):** T3 re-auth (Doc 2) + attestation + signature artifact.
-   **Append-only addendum + 10dk typo grace (B2.2):** PHIPA + College
    documentation standards.
-   **MVP basic co-sign request + 72h timeout; V1 full orchestration
    (B2.3):** ON NP scope-of-practice.
-   **Strict immutable + entered-in-error + signed correction (B2.4):**
    T4 elevated; legal preserve.
-   **In-house Bedrock+Claude AI Scribe stack (B3.1):** Doc 5
    single-stack uyumu.
-   **MVP intermediate AI Scribe (B3.2):** Audio → transcript → LLM
    draft → HCP sign.
-   **MVP basic SmartTools (B3.3):** User + org snippets + smart
    placeholders.
-   **MVP EN write + on-demand Bedrock translate; native FR V2 (B3.4):**
    Cross-HCP multilang read.

### 1.2 Sinalytix\'teki Giriş Noktaları

  Giriş Noktası                                                       Tetikleyici                        Rol
  ------------------------------------------------------------------- ---------------------------------- --------------------------------------
  Worklist (Doc 3) --- \"Quick Note\" CTA                             Aktif hasta için hızlı not         HCP (any role)
  Patient 360 (Doc 4) --- Timeline \"Add Note\"                       Bağlam içinde not                  HCP (any role)
  Care Plan editor (Doc 6) --- \"Progress note for this plan\"        Plan context\'inde progress note   CC, discipline HCP
  Visit complete (Doc 9) --- \"Document visit\"                       Visit sonrası SOAP visit note      HCP
  AI Scribe --- \"Start recording\" floating button                   Visit sırasında otomatik not       HCP
  Co-sign Inbox (NP/MD koordinasyonu)                                 NP not\'una MD co-sign queue       MD, supervising HCP
  Cross-org consultation (Doc 6 B3.4) --- \"Add Consultation Note\"   Specialist not                     Cross-org Specialist
  Settings → Templates / SmartTools                                   Snippet + template yönetimi        HCP (kişisel), Org Admin (org-level)
  Timeline event tap → note view                                      Eski not okuma                     Tüm care team HCP
  Note edit (entered-in-error) UI                                     Hata düzeltme                      Original author + CC (elevated T4)

### 1.3 Hedef Rol Matrisi

  Rol                                          Birincil Eylem                                                                                 Yetki Kapsamı
  -------------------------------------------- ---------------------------------------------------------------------------------------------- -----------------------------------------------------------------------------------------------------
  Care Coordinator (CC)                        Master plan progress notes, family meeting notes, phone encounters, care plan update notes     Tüm note type\'lar; co-sign incoming queue (kendi yetki tier\'ında); entered-in-error initiate (T4)
  MRP (Most Responsible Provider)              Progress, assessment, SOAP, consult, discharge, telehealth notes; co-sign supervisor for NPs   Tüm note type\'lar + co-sign final signer; elevated T4 actions
  Specialist (kendi org + cross-org consult)   Consultation note, assessment, telehealth visit                                                Specialist note type subset; cross-org consultation context (Doc 6 B3.4)
  Allied Health (PT/OT/SLP/RN/RD)              Discipline subplan progress, SOAP visit, assessment, family education note                     Discipline-relevant note type\'lar; cross-discipline read
  NP (Nurse Practitioner)                      Tüm temel klinik notlar + co-sign request flag (controlled subst, certain orders)              MD/MRP\'nin yetki kapsamından küçük (provincial scope of practice); co-sign queue trigger
  Patient / Caregiver / Family (Patient app)   Read published notes (consent-scope, lockbox respect); not yazma yetkisi yok                   Read-only
  Org Admin (V1)                               Org-level note template + snippet share/publish                                                Configuration only

### 1.4 Ekosistem Konumu

*Klinik dokümantasyon HCP\'nin günlük en çok zaman harcadığı yer
(\"documentation burden\" --- North America physician burnout\'ta \#1
sebep). Sinalytix iki stratejik moat\'la pazarı diferansiye eder:*

-   **In-house AI Scribe (B3.1+B3.2):** Rakipler (AlayaCare/PCC) AI
    scribe için Tali AI veya Mutuo Health partnership cycle bekler;
    Sinalytix Bedrock+Claude in-house stack (Doc 5 zaten kurulu) ile
    out-of-the-box. Vendor lock-in yok, data residency Canada Central,
    single audit/IAM domain.
-   **SmartTools (B3.3):** Epic\'in SmartTools\'u 25+ yıl klinik
    adoption sahibi; Sinalytix bu paradigmayı home care\'e taşır ---
    small org\'lar için MVP\'de \"out-of-the-box clinical velocity
    multiplier\".

Pazar konumu: AI scribe + SmartTools birlikte = \"MVP\'den itibaren HCP
zaman tasarrufu\". Pilot org adoption: yaşam kalitesi iyileştirmesi →
adoption hızı + pazara giriş ivme. Foundation \#6 Tier 4 moat\'ı Doc 5 +
Doc 7 birlikte güçlü.

### 1.5 Regülasyon ve Standartlar

-   **PHIPA + provincial parallels:** Klinik not PHI; tüm CRUD + sign +
    addendum + entered-in-error audit (Doc 2 canonical).
-   **College of Physicians and Surgeons (CPSO ON), College of Nurses
    (CNO), CASLPO/CAOT/CDO:** Documentation standards: signed + dated +
    author identified + immutable (no edit post-sign), addendum only.
-   **PIPEDA:** Cross-border PHI yasaklı; Bedrock+Claude + Transcribe
    Medical Canada Central zorunlu.
-   **FHIR R4 + CA Core+:** DocumentReference + Composition (V1+) +
    Provenance.signature; CA Core+ note profile.
-   **NP/MD scope-of-practice:** Provincial (ON: RHPA, Nursing Act,
    Medicine Act) NP scope tanımları; controlled subst, certain orders
    MD co-sign zorunlu.
-   **Quebec Law 25 + bilingual federal:** Multilang note V1+ (FR native
    authoring V2).
-   **Health Canada SaMD Class I:** AI Scribe \"documentation aid\" ---
    clinical decision support değil; HCP human-in-loop final sign.
-   **AWS Canada Central data residency:** Audio + transcript + LLM +
    storage tüm boru hattı Canada Central.

§2 --- Endüstri ve Klinik Bağlam
--------------------------------

### 2.1 Kanada Home Care Documentation Practice --- Mevcut Durum

-   **OSCAR Pro:** Free-text note + structured fields kombinasyonu;
    signing primitiv (electronic signature attestation); addendum
    support sınırlı.
-   **AlayaCare / PCC:** Vendor-specific note builders;
    SmartTools-equivalent partial (templates evet, dynamic placeholder
    zayıf); AI scribe partnership cycle (Tali AI / Mutuo Health) son 1-2
    yılda yaygınlaşıyor.
-   **Kâğıt + dictation:** Hala baskın small home care org\'larda;
    transcription service maliyeti yüksek; turnaround days→weeks.
-   **Hospital EMR (Epic, Cerner):** SmartTools + AI scribe maturity
    yüksek (Epic SmartPhrases, MyChart Patient Notes); home care\'e
    taşınma yavaş.

Sinalytix MVP\'de bu manzarayı home care\'e taşır: in-house AI scribe +
SmartTools out-of-the-box, vendor partnership beklemeden.

### 2.2 AI Scribe Klinik Vakası

**Pazar verisi (2025-2026):**

-   Hekim documentation time average 16h/hafta (Annals of Internal
    Medicine 2024)
-   Burnout rate documentation burden\'a doğrudan korelasyon (NEJM
    Catalyst 2024)
-   Epic + Abridge / Nuance DAX partnership → physician burnout %30
    azalma rapor (early adopter org studies)
-   Home care\'de PT/OT/SLP/RN ev ziyareti sonrası \"note batch\" akşam
    (overtime) yaygın

**Sinalytix MVP AI Scribe değer önerisi:**

-   HCP visit sırasında \"Start recording\" → ortam audio (HCP +
    patient + family) yakalanır.
-   AWS Transcribe Medical (Canada Central) → medical-aware transcript.
-   Bedrock Claude → structured note draft (B1.2 hybrid template
    uyumlu).
-   HCP review/edit/sign (B2.1 flow).
-   FHIR resource extraction (Observation, MedicationStatement,
    Condition) V1.
-   Time saving target: HCP note time 30-60% azalma; visit→sign cycle
    \<10dk.

**Klinik safety çerçeve:**

-   HCP audio kayıt başlatma açık consent (patient/family informed).
-   LLM draft \"suggestion\" --- auto-sign yok (B2.1 immutable on
    explicit HCP sign).
-   Source citation: LLM her structured panel için transcript line
    referans verir (Doc 5 paterni).
-   Safety-critical (B3.1 Doc 5 whitelist) entity extraction V1; MVP\'de
    LLM \"Bu hastada penisilin alerjisi olabilir mi?\" gibi sorular HCP
    review için flag eder.

### 2.3 SmartTools Klinik Vakası

**Epic SmartTools modeli:**

-   `.dot phrases` → kullanıcı-tanımlı snippet\'ler (örn.
    `.normalcardio` → \"Heart RRR, S1 S2, no murmurs, gallops, or
    rubs\")
-   `{{placeholders}}` → patient context\'inden otomatik doldurur
    ({{patient.firstName}}, {{patient.age}}, {{today}}, {{lastBP}})
-   Org-level shared snippet\'ler (Best Practice Alerts equivalent)
-   Conditional logic V1 (Epic SmartLinks)

**Sinalytix MVP SmartTools:**

-   User-level snippets: HCP kendi `.snippet` adlandırılmış kısa
    text\'leri tanımlar (Settings → SmartTools)
-   Org-level shared snippets: Org admin yayınlar (org HCP\'leri
    kullanır)
-   Smart placeholders: `{{patient.firstName}}`, `{{patient.age}}`,
    `{{visitDate}}`, `{{lastVitalsBP}}`, `{{currentMeds}}` etc.
-   Note editor\'de typing during: `.snip` → auto-expand on space/tab
-   Statistics: usage tracking (which snippet most used, refinement
    candidate)

### 2.4 Co-Sign Klinik Vakası (NP → MD)

**Ontario provincial scope:**

-   NP (Nurse Practitioner Class) geniş scope ama bazı aksiyonlar MD
    co-sign zorunlu:
    -   Controlled substance order (Doc 8 koordineli)
    -   Bazı imaging order (NP scope dışında belirli modaliteler)
    -   Critical clinical decisions (palliative pathway change vb. ---
        provincial varies)
-   BC ve diğer provinces NP scope farklı (multi-province V2+)

**Sinalytix MVP co-sign:**

-   NP not\'unu kendi T3 imzasıyla aktif ettirir + \"needs MD co-sign\"
    flag (B2.3).
-   MD inbox\'ına queue düşer.
-   MD review → T3 re-auth → co-sign signature.
-   Co-sign timeout 72h → MD supervisor + NP notif (alert eskalasyon).
-   V1: structured supervisory matrix (hangi aksiyon hangi MD\'ye
    route\'lanır org admin config), auto-routing.

### 2.5 Multilang Note Practice

**Kanada bilingual obligation:**

-   Federal: EN + FR (Official Languages Act).
-   Quebec: Law 25 (FR mandatory clinical record + patient access).
-   ON: bilingual hospital regions (Ottawa, Sudbury, NE Ontario).

**Sinalytix MVP yaklaşım (B3.4):**

-   HCP not\'unu kendi tercih dilinde yazar (çoğunlukla EN MVP Ontario
    focus).
-   Diğer HCP cross-lang okumak isterse \"Translate\" CTA → Bedrock
    Claude on-demand → cache version.
-   Original immutable (translation reference resource).
-   Patient-facing translation Doc 6 B2.2 ile aynı altyapı (cache + cost
    ortak).
-   Native FR authoring V2 (Quebec expansion).

§3 --- Kapsam ve Kısıtlar
-------------------------

### 3.1 V0 (MVP) --- Q4 2026 Launch Hedefi

**Note Authoring + Lifecycle:**

-   8-10 standard note type (LOINC coded) MVP (B1.1):
    a.  Progress note (LOINC 11506-3)
    b.  Assessment + Plan (LOINC 51847-2)
    c.  SOAP visit note (Sinalytix internal code mapped to LOINC
        progress)
    d.  Consultation note (LOINC 11488-4)
    e.  Discharge summary (LOINC 18842-5)
    f.  Family meeting summary (Sinalytix code)
    g.  Phone encounter (LOINC 34109-9)
    h.  Discipline subplan progress (per-discipline subtype)
    i.  Incident report (Sinalytix code; org admin V1 expand)
    j.  Telehealth visit note (LOINC 34111-5)
-   Hybrid free-text rich body + opsiyonel structured panels (B1.2):
    -   Free-text body: markdown-like rich (bold/italic/list/heading);
        \~20K char limit per note
    -   Structured panels (opsiyonel): Vital snapshot, Problem list
        update, Medication change attestation, Allergy update, Goals
        progress update --- each panel FHIR resource extraction\'a feed
-   8-12 Sinalytix-curated template MVP (B1.3); blank from-scratch
    alternatif; org custom save (private to org).
-   Auto-link current CarePlan version snapshot (master + writer\'s
    discipline subplan, B1.4); audit izi.
-   Draft autosave 10s + on-blur; offline IndexedDB queue + sync on
    reconnect.
-   5dk idle lock release (Doc 6 paterni).

**Signing + Immutability:**

-   Two-step: Draft preview + Final sign modal (B2.1)
-   T3 re-auth: biometric + PIN (Doc 2 spec)
-   Attestation checkbox: \"I attest this note is accurate and
    complete\"
-   Signature artifact: typed full name (default) OR drawn signature
    (touch/mouse)
-   Immutable on commit; Provenance.signature + signed Practitioner
    reference
-   10dk grace window post-sign for typo correction (B2.2) --- heavily
    audited
-   Post 10dk: only addendum

**Addendum:**

-   Append-only addendum (B2.2): separate Note resource
    (DocumentReference.relatesTo.appends → original)
-   Each addendum own T3 sign
-   Patient timeline stack display (original + addendums)

**Entered-in-Error Correction:**

-   T4 elevated transition (Doc 6 B2.1 elevated matrix include this
    action)
-   Original retained immutable + status=entered-in-error
-   Signed correction note mandatory (reason + clarification)
-   Patient timeline: redacted badge (existence visible, content hidden
    from patient; HCP read-only with audit)

**Co-Sign (NP → MD):**

-   MVP basic: NP T3 sign + \'needs MD co-sign\' flag (B2.3)
-   MD inbox queue (note type filter); MD T3 re-auth + co-sign
-   72h timeout → MD supervisor + NP notif
-   V1: structured supervisory matrix + auto-routing

**AI Scribe (Bedrock+Claude in-house, B3.1+B3.2):**

-   \"Start Recording\" CTA in note editor (mobile + web)
-   Patient/family consent prompt (audio recording disclosure)
-   AWS Transcribe Medical Canada Central → live transcript (background)
-   Stop recording → Bedrock Claude → structured note draft per template
    (current template auto-mapped or default Progress note)
-   HCP review/edit/sign (B2.1 normal flow)
-   Audio retained (S3 Canada Central, lifecycle to Glacier per Doc 5
    retention)
-   Transcript retained (S3 Canada Central + indexed for search)
-   FHIR Observation/MedicationStatement/Condition extraction V1
    (MVP\'de structured note panels manuel doldurulur ama LLM draft
    öneri verir)
-   Safety-critical entity flag display (B3.1 Doc 5 whitelist) MVP-light
    (uyarı; HCP zaten review eder)

**SmartTools (B3.3):**

-   User-level snippets (HCP Settings → SmartTools)
-   Org-level shared snippets (Org Admin Settings, V1 publish workflow)
-   Smart placeholders: `{{patient.firstName}}`, `{{patient.lastName}}`,
    `{{patient.age}}`, `{{patient.sex}}`, `{{visitDate}}`, `{{today}}`,
    `{{currentTime}}`, `{{author.title}}`, `{{author.discipline}}`,
    `{{org.name}}`, `{{lastBP}}`, `{{lastWeight}}`, `{{lastA1c}}`,
    `{{currentMeds}}`, `{{activeAllergies}}`, `{{primaryCondition}}` ---
    patient context\'inden FHIR resolve
-   Typing trigger: `.snippet` → auto-expand on space/tab
-   Settings UI: list + edit + delete + clone (org → personal)

**Multilang:**

-   HCP authoring EN MVP (B3.4)
-   Cross-HCP read \"Translate to X\" CTA → Bedrock Claude on-demand →
    cache per (note\_id, lang)
-   Original immutable; translation reference resource
-   Native FR authoring V2

**Cross-Org Consultation Note (Doc 6 B3.4 bridge):**

-   Specialist consent grant active → \"Add Consultation Note\" CTA →
    standard note flow
-   Note resource\'a `Provenance.org=specialist_org` + cross-org consent
    reference
-   Original org care team notify

**Patient-Facing Note Read (cross-app):**

-   Patient app published notes consent-scope (Doc 10) + sensitive
    lockbox respect (Doc 4)
-   \"Translate\" button in Patient app (Bedrock cross-lang)
-   Audit each patient view

### 3.2 V1 (Post-MVP, 6-12 ay)

-   AI Scribe FHIR resource auto-extraction
    (Observation/MedicationStatement/Condition direct from transcript →
    structured panel auto-fill, HCP confirm)
-   AI Scribe safety-critical flag UI prominent (Doc 5 B3.1 whitelist
    alignment)
-   AI Scribe summary suggestion (\"Patient mentioned X --- add to
    problem list?\")
-   Co-sign structured supervisory matrix + auto-routing UI (org admin)
-   SmartTools conditional logic
    (`{{if patient.hasDiabetes}}...{{endif}}`)
-   SmartTools org marketplace (publish + share + rate)
-   Note template publish + Sinalytix curated review
-   Org admin note type custom expansion
-   Patient comment thread on notes (Patient app comment, CC moderation)
-   Note discovery: full-text search per patient, per author, per date,
    per type
-   Note bulk export (legal request, patient request
    right-to-portability)
-   Voice command in note editor (V1 light voice-to-text inline)

### 3.3 V2 (12-24 ay)

-   Native FR authoring (full editor support, FR templates + FR
    snippets)
-   Multilang expansion: Turkish, Mandarin, Punjabi, Arabic
-   AI Scribe video record (Doc 9 visit mgmt scope ile)
-   AI Scribe real-time live coaching (during recording: \"Forgot to
    mention DNR status?\")
-   Inter-note linking (consultation note → progress note reply thread)
-   Note revision audit visualization (Provenance diff)
-   Cross-org consultation note workflow expand (specialist authoring
    richer)

### 3.4 V3 (24+ ay vizyon)

-   AI Scribe ambient mode (sürekli arka plan, HCP başlatmadan otomatik
    visit detect)
-   Bidirectional patient-HCP note thread (V2 patient comment\'in fully
    bidirectional eşi)
-   AI Scribe summary directly → Care Plan update suggestion (Doc 6 ile
    entegre)
-   Federated learning AI Scribe per-HCP personalization
    (privacy-preserving)

### 3.5 Constraints (Sabit Kısıtlar)

-   **Note resource FHIR DocumentReference (text + structured panels via
    Composition V1):** Sinalytix custom resource yaratmaz.
-   **Sign immutability:** Post-sign edit yok (10dk grace window
    dışında); sadece addendum.
-   **T3 re-auth signing:** Doc 2 spec; biometric + PIN + signature
    artifact.
-   **Audit her CRUD:** Doc 2 canonical AuditLogEntry; tüm note events.
-   **PolicyEngine her access:** Per role + consent + sensitive scope.
-   **AI Scribe consent:** Patient/family explicit consent prompt before
    recording; refuse → no recording (HCP manual note).
-   **Data residency Canada Central:** Audio + transcript + LLM +
    storage tüm pipeline.
-   **Entered-in-error T4 elevated:** Sadece original author + CC (with
    reason); destroy yok.
-   **Auto-link plan version:** Note write-time\'da plan version
    snapshot ref; sonradan değişse not eski version\'a referansı.
-   **Note text limit 20K char body + \~10 structured panels:**
    Performance + UX guard.
-   **SmartTools snippet limit:** User 200 snippet max; org-level 100
    max (MVP performance; V1 pagination).
-   **Co-sign 72h MVP:** Hardcoded timeout; org admin V1 customize.

### 3.6 Non-Goals

-   **AI clinical decision support:** SaMD Class I; AI scribe
    documentation aid only (no diagnosis/Rx suggestion).
-   **Note edit (post-sign, post-grace):** Only addendum.
-   **Patient note write:** Read-only + V1 comment; no authoring.
-   **Conditional SmartTools:** V1+.
-   **Native FR authoring:** V2.
-   **Video AI scribe:** V2+.
-   **Visit recording without audio:** Out of scope (Doc 9 visit mgmt).
-   **Cross-org note authoring (specialist writing native to host
    org):** Out of scope; specialist always own-org context (Doc 6
    B3.4).
-   **Note revision history (post-grace edit tracking):** Not allowed
    (single-state on sign).

§4 --- Akışlar
--------------

### 4.1 Note Draft → Sign → Immutable Akışı (Manual Flow)

    sequenceDiagram
        participant HCP as HCP
        participant UI as Note Editor
        participant PE as PolicyEngine
        participant CP as CarePlan Service
        participant Note as Note Service
        participant Auth as Doc 2 T3 Auth
        participant Prov as Provenance
        participant AL as Audit Log

        HCP->>UI: "Add Note" (any entry point)
        UI->>PE: evaluate(role, action=create, resource=Note)
        PE-->>UI: Allow (care team grant + consent)
        UI->>UI: Open editor (template or blank)
        UI->>CP: GET current CarePlan version (B1.4 link)
        CP-->>UI: Master + discipline subplan versions
        UI->>UI: Apply template (if selected) — body + structured panels
        HCP->>UI: Type body + SmartTools expand + fill panels
        UI->>Note: PATCH /Note (autosave every 10s)
        Note->>AL: event_type=note.draft.autosave
        HCP->>UI: "Sign Note" CTA
        UI->>UI: Preview modal (read-only render)
        HCP->>UI: Review + click "Confirm Sign"
        UI->>Auth: T3 re-auth (biometric + PIN)
        Auth-->>UI: Token valid
        UI->>HCP: Attestation checkbox + signature input
        HCP->>UI: Check attestation + sign (typed or drawn)
        UI->>Note: POST /Note/sign (commit + immutable)
        Note->>Note: status=current, docStatus=final, immutable_at=now
        Note->>Prov: Create Provenance.signature (HCP + ts + artifact hash)
        Note->>AL: event_type=note.signed + actor + attestation
        Note-->>UI: Success; note visible in Patient 360 timeline
        UI->>UI: Start 10dk grace window (typo correction allowed)
        UI->>UI: After 10dk: any change → addendum required

**Kritik kurallar:**

1.  Autosave 10s; offline IndexedDB queue + sync.
2.  Plan version snapshot ref note write-time\'da (B1.4).
3.  T3 re-auth + attestation + signature commit immutable.
4.  10dk grace window: HCP inline edit allowed (typo correction);
    heavily audited (`note.grace_edit`); rare event.
5.  Post-grace: addendum only.
6.  Patient timeline event\'i sign tarihinde patient\'a görünür
    (signed\_at, mevcut not visible badge).

### 4.2 AI Scribe Audio Capture Pipeline

    flowchart TD
        A[HCP visit başlangıcı] --> B["'Start Recording' CTA in note editor"]
        B --> C[Patient/family consent prompt]
        C -->|Refused| Z[Manual note only; no recording]
        C -->|Accepted| D[Audio capture: device mic → WebRTC stream OR mobile native recorder]
        D --> E[Real-time chunk upload to S3 Canada Central]
        E --> F[Background: AWS Transcribe Medical async job]
        F --> G[Live transcript stream back to UI 'Live transcript' panel]
        A --> H[Note editor open in parallel - HCP can type or rely on scribe]
        G --> H
        H --> I[HCP 'Stop Recording' CTA]
        I --> J[Transcribe finalization]
        J --> K[Bedrock Claude structured note draft generation]
        K --> L["LLM output: body + structured panels suggested fill + safety-critical flag display"]
        L --> M[HCP review draft]
        M --> N{Edit needed?}
        N -->|Yes| O[Inline edit; markup changes; structured panels confirm/edit]
        N -->|No| P[Proceed to sign]
        O --> P
        P --> Q[T3 re-auth + attestation + signature §4.1]
        Q --> R[Note immutable on sign; audio + transcript retained S3]
        R --> S[Audit: note.scribe.completed + actor + tokens used]

**Kritik kurallar:**

1.  Audio recording HCP-initiated; consent prompt patient/family
    (recordings disclosure).
2.  Audio + transcript Canada Central; lifecycle policy per Doc 5 (10y
    hot + Glacier).
3.  AWS Transcribe Medical async; live transcript stream Web Sockets.
4.  Bedrock Claude prompt structured: \"Generate clinical note in
    \[template type\] format from transcript; mark uncertain entities
    for HCP review.\"
5.  Safety-critical entities (B3.1 Doc 5 whitelist: allergy,
    medications, code-status, DNR) → UI prominent display \"Verify in
    source\"; HCP confirm zorunlu.
6.  FHIR Observation/MedicationStatement extraction V1 (MVP:
    yapılandırılmış paneller manual confirm).
7.  HCP modify draft freely before sign; final sign committed normal
    flow.
8.  Cost guardrail: per-recording max duration 60dk (yeterli home care
    visit); per-org token budget.

### 4.3 Addendum Akışı (Post-Sign)

    sequenceDiagram
        participant HCP as HCP (original author or care team)
        participant UI as Patient Timeline / Note view
        participant Note as Note Service
        participant Auth as Doc 2 T3 Auth
        participant AL as Audit Log

        HCP->>UI: Open signed note → "Add Addendum" CTA
        UI->>UI: New Note draft (separate DocumentReference, relatesTo.appends → original)
        UI->>UI: HCP types addendum content (free-text + optional structured panels)
        HCP->>UI: "Sign Addendum"
        UI->>Auth: T3 re-auth
        Auth-->>UI: Token valid
        HCP->>UI: Attestation + signature
        UI->>Note: POST /Note/sign (addendum)
        Note->>Note: Create addendum Note resource (immutable on sign)
        Note->>AL: event_type=note.addendum.signed + relates_to_id
        Note-->>UI: Patient timeline: original note + addendum stacked display

**Kritik kurallar:**

1.  Addendum ayrı Note resource; relatesTo.appends ile original\'a
    referans.
2.  Her addendum kendi T3 sign.
3.  Patient timeline original + addendum stacked (chronological).
4.  Original note immutable; addendum unlimited zincir.
5.  Addendum author orijinal author ≠ olabilir (care team member); audit
    aktör track.

### 4.4 Entered-in-Error Correction Akışı (T4 Elevated)

    flowchart TD
        A[Original author or CC identifies error] --> B["'Mark Entered-in-Error' CTA"]
        B --> C[T4 elevated action modal — Doc 6 B2.1 matrix include]
        C --> D[Full 2FA + biometric + PIN]
        D --> E[Mandatory reason input + signed correction note draft]
        E --> F[HCP fills reason: 'Wrong patient', 'Tamamen yanlış content', etc.]
        F --> G[Correction note body: clarification + rectification]
        G --> H[T3 sign on correction note]
        H --> I[Original note status=entered-in-error + correction note created]
        I --> J[Audit event_type=note.entered_in_error + actor + reason + correction_ref]
        J --> K[Patient timeline: 'redacted' badge on original; correction note visible]
        K --> L[Patient/Family view: redacted (content hidden, existence visible)]
        K --> M[HCP read access: read-only with audit log]

**Kritik kurallar:**

1.  T4 elevated (Doc 6 B2.1 matrix added action).
2.  Original retained immutable; status=entered-in-error.
3.  Correction note: separate Note resource (`relatesTo.replaces`
    original).
4.  Patient-facing view: content hidden + \"Note redacted by clinician\"
    badge.
5.  HCP read: full audit log (every read event).
6.  Sadece original author + CC initiate; org admin yetkisi yok
    (clinical content).

### 4.5 Co-Sign Akışı (NP → MD)

    sequenceDiagram
        participant NP as Nurse Practitioner
        participant UI as Note Editor
        participant Note as Note Service
        participant Inbox as MD Inbox Queue
        participant MD as Supervising MD
        participant Auth as Doc 2 T3 Auth
        participant AL as Audit Log

        NP->>UI: Complete note + "Sign + Request MD Co-Sign" CTA
        UI->>Auth: T3 re-auth (NP)
        Auth-->>UI: Valid
        NP->>UI: Attestation + signature
        UI->>Note: POST /Note/sign + co_sign_required=true + supervising_md_id (optional, default = org primary)
        Note->>Note: Note status=current, awaiting_co_sign=true, co_sign_supervisor=MD/<id>
        Note->>Inbox: Queue note for MD
        Inbox->>MD: Notif (push + inbox badge)
        Note->>AL: event_type=note.cosign.requested + np_actor + supervisor_md
        MD->>UI: Open inbox → review note
        UI-->>MD: Note rendered (read-only) + "Co-Sign" CTA
        alt MD agrees
            MD->>Auth: T3 re-auth
            Auth-->>UI: Valid
            MD->>UI: Co-sign attestation + signature
            UI->>Note: POST /Note/cosign (commit + addtional Provenance.signature)
            Note->>Note: awaiting_co_sign=false, fully_signed=true
            Note->>AL: event_type=note.cosign.completed + md_actor
            Note->>NP: Notif "Note co-signed"
        else MD rejects (requests changes)
            MD->>Note: POST /Note/cosign/reject + reason
            Note->>Note: awaiting_co_sign=true, last_review_reason=<text>
            Note->>NP: Notif "Co-sign rejected — review and revise"
            Note->>AL: event_type=note.cosign.rejected + md_actor + reason
            Note->>UI: NP can create addendum or correction note based on MD feedback
        else 72h timeout
            Note->>NP: Notif "Co-sign pending — escalate"
            Note->>MD's Supervisor: Notif "NP X note awaiting co-sign 72h"
            Note->>AL: event_type=note.cosign.timeout_escalation
        end

**Kritik kurallar:**

1.  NP sign immutable; co-sign request flag aktif.
2.  MD inbox queue ile alır (note type + NP + patient context).
3.  Co-sign timeout 72h MVP; eskalasyon supervisor (org primary MD) + NP
    notif.
4.  Co-sign reject → NP addendum/correction kararı; note re-sign yapamaz
    (immutable).
5.  Patient timeline\'da \"pending co-sign\" badge yumuşak (klinik
    continuity için not erişilebilir; co-sign sonrası \"fully signed\"
    badge).

### 4.6 SmartTools Snippet Expand Akışı

    flowchart TD
        A[HCP typing in note body] --> B[".snippet trigger detected (e.g. '.normalcardio')"]
        B --> C{Match user snippet?}
        C -->|Yes| D[Auto-expand on space/tab]
        C -->|No| E{Match org snippet?}
        E -->|Yes| D
        E -->|No| F[No expansion; HCP continues typing]
        D --> G[Expanded text inserted at cursor]
        G --> H{Snippet contains placeholders?}
        H -->|Yes| I[Resolve placeholders from Patient context + visit context]
        H -->|No| J[Plain expansion only]
        I --> K[FHIR resolve: patient.firstName, lastBP, currentMeds, etc.]
        K --> L[Final expansion: '{{patient.firstName}}' → 'Maria']
        L --> M[Inserted in body with placeholders filled]
        J --> M
        M --> N[Continue typing]

**Kritik kurallar:**

1.  Trigger: `.snippet_name` + space/tab; case-insensitive match.
2.  User snippets \> org snippets priority (same name override).
3.  Placeholder resolve current visit context (Patient + author + last
    vitals + meds + allergies --- FHIR query).
4.  Resolve failure (örn. lastBP yok): \"\[no recent BP\]\" fallback
    display.
5.  Audit not yapılır per expand (high volume; statistics only).

### 4.7 Multilang Translate-on-Demand Akışı

    sequenceDiagram
        participant HCP2 as Cross-lang HCP (FR speaker)
        participant UI as Note View
        participant Cache as Translation Cache
        participant LLM as Bedrock Claude
        participant Note as Note Service
        participant AL as Audit Log

        HCP2->>UI: Open EN note → "Translate to FR" CTA
        UI->>Cache: Check (note_id, lang=fr)
        alt Cache hit
            Cache-->>UI: Cached FR translation
            UI->>HCP2: Render translated view + "Translated — clinical content" banner
        else Cache miss
            UI->>LLM: Submit note body + structured panels + target_lang=fr
            LLM->>LLM: Translate (medical-aware)
            LLM-->>UI: FR rendered text
            UI->>Cache: Store (note_id, version_id, lang)
            UI->>HCP2: Render
            UI->>AL: event_type=note.translated + lang
        end
        Note over HCP2,UI: Original immutable; translation reference; if note amended/addendum, cache invalidates per version

**Kritik kurallar:**

1.  Translation reference only --- never replaces original.
2.  Cache per (note\_id, version\_id, lang); addendum yeni version cache
    invalidate.
3.  Banner: \"Translated --- verify with original if clinical decision
    impact.\"
4.  Patient-facing view aynı altyapı (Doc 6 B2.2).
5.  Cost guardrail: cache hit rate target \>85% (Doc 6 metrik paralel).

### 4.8 Cross-Org Consultation Note (Doc 6 B3.4 Bridge)

    flowchart TD
        A[Specialist cross-org access via Patient Doc 10 consent grant] --> B[Specialist navigates Patient 360 + Care Plan]
        B --> C[Specialist 'Add Consultation Note' CTA]
        C --> D[Note editor opens — consultation type pre-selected]
        D --> E[Specialist writes note in own org context]
        E --> F[Auto-link: current CarePlan version + cross-org consent ref]
        F --> G[T3 sign by specialist]
        G --> H[Note resource created with Provenance: agent=specialist + onBehalfOf=specialist_org + consent_ref]
        H --> I[Patient timeline original org sees]
        H --> J[Original org CC notif: 'Specialist consult note added']
        H --> K[Specialist's own org Patient 360 sees note as outgoing consult]
        I --> L[CC reviews; may forward to MRP for action]
        L --> M[Doc 8 order flow if Rx/lab needed]

**Kritik kurallar:**

1.  Specialist authoring in specialist\'s org context;
    Provenance.onBehalfOf=specialist\_org.
2.  Cross-org consent grant active validation pre-write.
3.  Note visible in both original org Patient timeline + specialist\'s
    outgoing consult list.
4.  Original org CC notify; routing decision in CC hand.
5.  Specialist note immutable (own T3 sign); addendum allowed by
    specialist within consent window.

§5 --- Ekran/Yüzey Spec
-----------------------

### 5.1 Ekran Envanteri

  Ekran ID                İsim                                           Mobile (RN)   Web (React)   Birincil Rol
  ----------------------- ---------------------------------------------- ------------- ------------- ----------------------
  NOTE-EDITOR-01          Note Editor (draft + sign)                     ✓ Light       ✓ Full        Tüm HCP rolleri
  NOTE-VIEW-01            Note Viewer (signed read)                      ✓             ✓             Tüm care team
  NOTE-PREVIEW-01         Sign Preview Modal                             ✓             ✓             HCP signing
  NOTE-SIGN-01            T3 Re-Auth + Signature Modal                   ✓             ✓             HCP signing
  NOTE-ADDENDUM-01        Addendum Editor                                ✓ Light       ✓ Full        HCP
  NOTE-ERROR-01           Entered-in-Error Modal (T4)                    ✓             ✓             Original author + CC
  NOTE-COSIGN-INBOX-01    Co-Sign Inbox (MD)                             ✓             ✓             MD, supervising HCP
  NOTE-COSIGN-REVIEW-01   Co-Sign Review Modal                           ✓             ✓             MD reviewing
  SCRIBE-RECORD-01        AI Scribe Recording UI                         ✓ Primary     ✓             HCP visit author
  SCRIBE-DRAFT-01         AI Scribe Draft Review Panel                   ✓             ✓ Full        HCP
  SCRIBE-CONSENT-01       Patient/Family Recording Consent Modal         ✓             ✓             Patient/family
  SMARTTOOL-SETTINGS-01   SmartTools Settings (snippets, placeholders)   Lite          ✓ Full        HCP, Org Admin
  NOTE-TEMPLATE-01        Note Template Gallery                          ✓             ✓             HCP, Org Admin (V1)
  NOTE-TIMELINE-01        Patient Timeline Note Stack                    ✓             ✓             Care team
  NOTE-TRANSLATE-01       Translation View (cross-lang)                  ✓             ✓             Cross-lang HCP

### 5.2 NOTE-EDITOR-01 --- Note Editor (Birincil Ekran)

**Konum:** Worklist quick note CTA, Patient 360 timeline \"+\", Care
Plan editor \"Add progress note\", Visit complete \"Document visit\", AI
Scribe completion → draft handoff.

**Web (React) --- Full UX:**

-   Top sticky header:
    -   Patient mini-card (name + photo + allergies --- Doc 4 pattern)
    -   Note type pill (clickable: switch type)
    -   Linked plan version pill (B1.4 auto-link; click to see plan
        context)
    -   Lock indicator (if shared editor V1)
    -   Actions: Apply Template \| AI Scribe (B3.2) \| Save Draft \|
        Preview & Sign
-   Body 70% width:
    -   Rich text editor (markdown-like): bold/italic/list/heading/link
    -   SmartTools auto-expand inline (`.snippet` + space/tab → expand
        with placeholder resolve)
    -   Voice-to-text (V1 inline)
-   Right rail 30% (collapsible):
    -   Structured panels (opsiyonel; HCP adds):
        -   Vital snapshot (selects + auto-fills latest)
        -   Problem update (Condition picker + edit)
        -   Medication change (MedicationStatement picker + change
            description + attestation)
        -   Allergy update (AllergyIntolerance picker + update)
        -   Goals progress (Goal picker from plan + status update)
    -   Each panel commits FHIR resource on note sign
-   Footer:
    -   Word count
    -   Autosave status (\"Saved 8s ago\")
    -   SmartTools quick reference (\".bp\", \".meds\" hints)

**Mobile (RN) --- Light:**

-   Single column; structured panels accordion expand
-   SmartTools expand same trigger
-   AI Scribe primary entry mobile (saha visit)
-   Preview & Sign full screen modal

### 5.3 NOTE-VIEW-01 --- Note Viewer (Signed Read)

**Konum:** Patient timeline event tap; care plan reference link;
cross-doc tap.

**Mobile + Web:**

-   Header sticky:
    -   Note metadata: type, author (with discipline badge), signed\_at,
        plan version link
    -   Co-sign status badge (if applicable: \"Pending MD co-sign\" /
        \"Fully signed\")
    -   Translate CTA (cross-lang)
    -   Addendum count badge (if any: \"1 addendum\")
    -   Actions: Add Addendum \| Translate \| Print/Export (V1)
-   Body:
    -   Rendered body (markdown)
    -   Structured panels rendered as cards
    -   Addendum stack below original (chronological, each with own
        signature block)
-   Footer:
    -   Provenance trail: signed by, attested at, signature artifact
    -   Audit history link (V1)

### 5.4 NOTE-PREVIEW-01 --- Sign Preview Modal

**Konum:** NOTE-EDITOR-01 \"Preview & Sign\" CTA.

**Web + Mobile:**

-   Modal full screen
-   Header: \"Review before signing\"
-   Body: read-only render of note (body + panels)
-   \"Edit\" button (back to editor)
-   \"Confirm Sign\" CTA → opens NOTE-SIGN-01

### 5.5 NOTE-SIGN-01 --- T3 Re-Auth + Signature Modal

**Konum:** Triggered from NOTE-PREVIEW-01 confirm.

**Web + Mobile:**

-   Step 1: T3 re-auth (Doc 2 spec)
    -   Biometric prompt OR password
    -   PIN entry
-   Step 2: Attestation
    -   Checkbox: \"I attest this note is accurate and complete and
        reflects my professional clinical judgment\"
-   Step 3: Signature artifact
    -   Default: typed full name (pre-filled from profile, editable)
    -   Optional: drawn signature pad (touch/mouse)
-   \"Sign Now\" CTA → commit immutable
-   Success: confirmation \"Note signed at \[timestamp\]\" + 10dk grace
    window indicator

### 5.6 NOTE-ADDENDUM-01 --- Addendum Editor

**Konum:** NOTE-VIEW-01 \"Add Addendum\" CTA.

**Mobile + Web:**

-   Header: \"Adding addendum to \[Note Type\] signed by \[Author\] on
    \[Date\]\"
-   Body: original note read-only (collapsible) + addendum new draft
    editor
-   SmartTools available
-   Structured panels available (own subset for addendum)
-   Sign flow same as NOTE-SIGN-01

### 5.7 NOTE-ERROR-01 --- Entered-in-Error Modal (T4 Elevated)

**Konum:** NOTE-VIEW-01 \"Mark Entered-in-Error\" CTA (visible to
original author + CC).

**Web + Mobile:**

-   T4 re-auth modal: full 2FA + biometric + PIN
-   Mandatory reason dropdown:
    -   \"Wrong patient\"
    -   \"Completely incorrect content\"
    -   \"Duplicate entry\"
    -   \"Other (specify)\"
-   Reason text field (mandatory)
-   Correction note draft (required):
    -   Body: explain what\'s wrong + correct information
    -   Sign flow (T3 re-auth + signature)
-   Confirmation step: \"This will mark original note as
    entered-in-error and redact from patient view. Continue?\"
-   Submit → original status change + correction note created

### 5.8 NOTE-COSIGN-INBOX-01 --- Co-Sign Inbox

**Konum:** MD/supervisor\'s nav: \"Co-Sign Inbox\" badge in worklist.

**Web (React):**

-   Sidebar: badge count
-   List view:
    -   Columns: NP Author \| Patient \| Note Type \| Date \| Days
        Pending \| Actions (Review \| Skip to NEXT)
    -   Sort: oldest first (urgency)
    -   Filter: by NP, by note type, by patient
-   Click row → NOTE-COSIGN-REVIEW-01

**Mobile (RN):**

-   Liste card; tap to review
-   Push notif on new co-sign request

### 5.9 NOTE-COSIGN-REVIEW-01 --- Co-Sign Review Modal

**Konum:** From inbox.

**Web (React):**

-   Split: note (left) + co-sign actions (right)
-   Note rendered (read-only, same as NOTE-VIEW-01)
-   Right panel:
    -   \"Approve & Co-Sign\" CTA → T3 re-auth + signature
    -   \"Request Changes\" CTA → reason text + send back to NP
    -   \"View Patient 360\" deep link (context check)

**Mobile (RN):**

-   Full screen note view
-   Sticky bottom: Approve \| Request Changes

### 5.10 SCRIBE-RECORD-01 --- AI Scribe Recording UI

**Konum:** NOTE-EDITOR-01 \"Start Recording\" CTA; mobile primary saha
visit.

**Mobile (RN) --- Primary:**

-   Pre-recording: Patient/Family consent modal (SCRIBE-CONSENT-01)
-   Recording active state:
    -   Top: recording indicator (red dot + \"Recording 02:34\")
    -   Middle: Live transcript stream (auto-scroll)
    -   Bottom: \"Pause\" / \"Stop & Generate Draft\" / \"Cancel
        Recording\"
-   Recording paused state: \"Resume\" / \"Stop\"
-   Stop → transition to SCRIBE-DRAFT-01

**Web (React):**

-   Similar but inline panel within note editor
-   Live transcript stream in right rail; \"Generate Draft\" button at
    end

### 5.11 SCRIBE-DRAFT-01 --- AI Scribe Draft Review Panel

**Konum:** SCRIBE-RECORD-01 \"Stop & Generate Draft\" output.

**Web (React) --- Full UX:**

-   Three-pane layout:
    -   Left: Live transcript (read-only, scrollable)
    -   Middle: AI-generated note draft (editable; markdown render)
    -   Right: Structured panels suggestions (HCP confirm/edit/dismiss)
-   Top: Safety-critical entities flag (B3.1 Doc 5 whitelist):
    -   \"Verify in source: \'penicillin allergy\' mentioned at 03:42\"
    -   Click → transcript jump-to-line highlight
-   Bottom actions:
    -   \"Refine Prompt\" (re-generate with different style/length ---
        V1)
    -   \"Discard Draft\" (back to manual editor)
    -   \"Use Draft → Continue Editing\" (transition to NOTE-EDITOR-01
        with draft pre-filled)

**Mobile (RN):**

-   Single column scroll: transcript → draft → structured suggestions
-   Tap suggestion → expand confirm
-   \"Use Draft\" → handoff to editor

### 5.12 SCRIBE-CONSENT-01 --- Patient/Family Recording Consent Modal

**Konum:** SCRIBE-RECORD-01 pre-recording trigger.

**Mobile + Web:**

-   Modal: \"Bu visit\'i AI scribe asistanı ile kayıt etmek istiyoruz.
    Bu, hekim/HCP\'nin notlarınızı daha hızlı hazırlamasına yardımcı
    olur. Kayıt güvenli şekilde Canada\'da saklanır ve sadece klinik
    ekibinize görünür.\"
-   Disclosure text: \"Bu kayıt PHIPA + PIPEDA standartlarında korunur.
    İstediğiniz zaman silmek için ekibinize başvurabilirsiniz.\"
-   Options: \"Onaylıyorum --- Kayıt başlat\" \| \"Reddediyorum ---
    Manuel not\"
-   Multilang: EN + FR MVP

### 5.13 SMARTTOOL-SETTINGS-01 --- SmartTools Settings

**Konum:** Settings → SmartTools.

**Web (React) --- Full UX:**

-   Tabs: My Snippets \| Org Snippets (read-only HCP) \| Placeholders
    Reference
-   My Snippets table:
    -   Columns: Trigger (e.g. \".normalcardio\") \| Expansion preview
        (first 40 char) \| Last used \| Usage count \| Actions (Edit \|
        Delete \| Clone to Org --- Admin V1)
    -   \"+ New Snippet\" CTA → edit modal
-   Edit Modal:
    -   Trigger (validate: starts with `.`, alphanumeric + underscore,
        unique per user)
    -   Expansion text editor (rich text + placeholder insert button)
    -   Preview with sample patient
    -   Save
-   Org Snippets:
    -   List (read-only)
    -   \"Clone to Personal\" CTA per snippet (creates user copy)
-   Placeholders Reference:
    -   List all available `{{...}}` placeholders + example resolved
        values

**Mobile (RN) --- Lite:**

-   View list + add/edit single snippet
-   \"Manage on web for full features\" banner

### 5.14 NOTE-TEMPLATE-01 --- Note Template Gallery

**Konum:** NOTE-EDITOR-01 \"Apply Template\"; Settings (V1 manage).

**Web (React):**

-   Grid: Sinalytix-curated \| Org-saved
-   Filter: by note type, by discipline
-   Search by title
-   Click → preview modal → \"Use this template\"

**Mobile (RN):**

-   List; tap → preview → use

### 5.15 NOTE-TIMELINE-01 --- Patient Timeline Note Stack (Doc 4 Extension)

**Konum:** Doc 4 Patient 360 timeline; note events.

**Mobile + Web:**

-   Doc 4 timeline event shows: note type icon + author + signed\_at +
    first line preview
-   Tap → NOTE-VIEW-01
-   Multiple notes same day: collapsed group \"3 notes\" → expand
-   Filter (Doc 4 timeline filter): note type filter chip
-   Visual: addendum stack indented under original

### 5.16 NOTE-TRANSLATE-01 --- Translation View

**Konum:** NOTE-VIEW-01 \"Translate\" CTA.

**Mobile + Web:**

-   Side-by-side (web) or tab toggle (mobile): Original \| Translation
-   Top banner: \"Translated content --- verify with original if
    clinical decision impact\"
-   Cache info: \"Last translated \[timestamp\]\"
-   \"Re-translate\" option (cache invalidate; V1)

### 5.17 Ekran-Arası Etkileşim Notları

-   **Worklist (Doc 3) ↔ Quick Note:** Worklist patient row \"Quick
    Note\" CTA → NOTE-EDITOR-01
-   **Patient 360 (Doc 4) ↔ Timeline:** Timeline event → NOTE-VIEW-01;
    \"+ Note\" CTA → NOTE-EDITOR-01
-   **Care Plan (Doc 6) ↔ Progress note:** Plan editor \"Add progress
    note\" → NOTE-EDITOR-01 with plan version link
-   **Ingestion (Doc 5) ↔ Note:** Verified Tier 4 doc → \"Reference in
    new note\" CTA (V1)
-   **Orders/Rx (Doc 8) ↔ Note:** Note structured panel \"Add Rx\" → Doc
    8 order flow → reference in note
-   **Communication (Doc 9) ↔ Note:** Phone encounter type note
    auto-populated from Doc 9 call log (V1)
-   **Co-Sign Inbox ↔ Worklist:** Co-sign badge in worklist; click →
    NOTE-COSIGN-INBOX-01

§6 --- Veri Modeli (FHIR R4 + CA Core+)
---------------------------------------

### 6.1 FHIR Resource Kullanımı

  Resource                                          Kullanım
  ------------------------------------------------- ------------------------------------------------------------------------------------
  `DocumentReference`                               Note metadata + S3 reference (signed content snapshot binary)
  `Composition`                                     Structured note body + sections (V1; MVP\'de DocumentReference + text body inline)
  `Provenance`                                      Signing event (signature artifact, attestation, T3 auth tier, co-sign chain)
  `Observation`                                     Structured panel vital snapshot, lab references
  `MedicationStatement` / `MedicationRequest`       Structured panel medication update / new Rx (Doc 8 bridge)
  `Condition`                                       Structured panel problem update
  `AllergyIntolerance`                              Structured panel allergy update
  `Goal`                                            Structured panel goal progress update (Doc 6 link)
  `Patient` / `Practitioner` / `PractitionerRole`   Subject + authors + co-signers
  `Encounter`                                       V1 (visit context) --- Doc 9 ile koordineli
  `CarePlan`                                        Note B1.4 auto-link (master + subplan versions)
  `Consent`                                         Patient/family AI scribe recording consent; cross-org grant
  `Communication`                                   V1 unified notif (cross-doc)
  `Binary`                                          Audio recording + signature artifact (drawn)

### 6.2 DocumentReference Profile (Sinalytix Note)

    DocumentReference:
      id: <uuid>
      status: current | superseded | entered-in-error
      docStatus: preliminary (draft) | final (signed) | amended (addendum chain)
      type:
        coding:
          - { system: "http://loinc.org", code: "11506-3 | 51847-2 | 11488-4 | 18842-5 | ..." }
          - { system: "https://sinalytix.ca/codes/note-type", code: "progress | assessment | soap_visit | consultation | discharge_summary | family_meeting | phone_encounter | discipline_subplan_progress | incident_report | telehealth_visit" }
      category:
        - { system: "https://sinalytix.ca/codes/note-category", code: "clinical-note" }
      subject: Reference(Patient/<id>)
      date: <signed_at>
      author:
        - Reference(Practitioner/<id>)  # original signer
      authenticator:
        - Reference(Practitioner/<co_signer_id>)  # MD co-sign if applicable
      custodian: Reference(Organization/<org_id>)
      relatesTo:
        - code: "appends"
          target: Reference(DocumentReference/<original_id>)  # for addendums
        - code: "replaces"
          target: Reference(DocumentReference/<original_id>)  # for correction notes
      description: <first 120 chars body preview>
      content:
        - attachment:
            contentType: text/markdown
            data: <base64 body snapshot at sign>  # immutable snapshot
            title: <note short title>
            hash: <SHA-256 of body content>
          format: { code: "urn:sinalytix:note-rich-text-v1" }
      context:
        encounter: Reference(Encounter/<id>) | null  # Doc 9 V1
        period: { start, end }
        practiceSetting: home-care | clinic | hospital
        sourcePatientInfo: Reference(Patient/<id>)
        related:
          - Reference(CarePlan/<master_id_with_version>)
          - Reference(CarePlan/<subplan_id_with_version>)
      meta:
        tag:
          - { system: "https://sinalytix.ca/codes/note-language", code: "en | fr | ..." }
          - { system: "https://sinalytix.ca/codes/cosign-status", code: "not_required | pending | completed | rejected" }
          - { system: "https://sinalytix.ca/codes/lockbox", code: "lockbox" } (if sensitive)
        extension:
          - sinalytix-immutable-at: <ts>  # post-sign immutability
          - sinalytix-grace-window-until: <ts>  # 10 dakika typo grace
          - sinalytix-cosign-required-supervisor: Reference(Practitioner/<md_id>)
          - sinalytix-cosign-timeout-at: <ts>
          - sinalytix-attestation-text: <text>
          - sinalytix-signature-artifact: { type: typed_name | drawn, value_hash: <sha-256> }
          - sinalytix-ai-scribe-session-id: <uuid> (if AI scribe used)
          - sinalytix-template-source: <template_id> (if template applied)
          - sinalytix-structured-panels: [{ panel_type, fhir_resource_id, included_in_sign }]
          - sinalytix-cross-org-consent-ref: Reference(Consent/<id>) (if cross-org consult)

### 6.3 Provenance.signature Profile (Sign Event)

    Provenance:
      id: <uuid>
      target:
        - Reference(DocumentReference/<note_id>)
      recorded: <signed_at>
      occurred:
        dateTime: <signed_at>
      policy:
        - "https://sinalytix.ca/policy/note-signing/v1"
      agent:
        - type: { coding: [{ code: author }] }
          who: Reference(Practitioner/<id>)
          onBehalfOf: Reference(Organization/<org_id>)
        - type: { coding: [{ code: verifier }] }  # only for co-sign
          who: Reference(Practitioner/<md_co_signer_id>)
      entity:
        - role: source
          what: Reference(DocumentReference/<note_id>)
      signature:
        - type:
            - { system: "urn:iso-astm:E1762-95:2013", code: "1.2.840.10065.1.12.1.1", display: "Author's Signature" }
            - { system: "urn:iso-astm:E1762-95:2013", code: "1.2.840.10065.1.12.1.5", display: "Verifier's Signature" }  # co-sign
          when: <signed_at>
          who: Reference(Practitioner/<id>)
          onBehalfOf: Reference(Organization/<org_id>)
          sigFormat: "image/png" (drawn) | "text/plain" (typed)
          data: <signature artifact bytes or text>
      meta:
        extension:
          - sinalytix-auth-tier: T3 | T4
          - sinalytix-attestation-checked: bool
          - sinalytix-attestation-text: <text>
          - sinalytix-2fa-method: biometric_face | biometric_touch | password_pin | totp | sms (Doc 2)
          - sinalytix-cosign-chain: [previous_provenance_id, ...]

### 6.4 Internal PostgreSQL Schema

    -- Note draft state (pre-sign, mutable)
    CREATE TABLE note_drafts (
      id UUID PRIMARY KEY,
      patient_id UUID NOT NULL,
      org_id UUID NOT NULL,
      author_user_id UUID NOT NULL,
      note_type TEXT NOT NULL,
      body_markdown TEXT,
      body_word_count INT,
      structured_panels JSONB DEFAULT '[]'::jsonb,
      linked_careplan_master_version JSONB,  -- { id, version_id }
      linked_careplan_subplan_versions JSONB DEFAULT '[]'::jsonb,
      template_source UUID,
      ai_scribe_session_id UUID,
      cross_org_consent_id UUID,
      lock_holder UUID,
      lock_until TIMESTAMPTZ,
      last_autosave_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_note_drafts_author ON note_drafts(author_user_id, last_autosave_at DESC);
    CREATE INDEX idx_note_drafts_patient ON note_drafts(patient_id, last_autosave_at DESC);
    ALTER TABLE note_drafts ENABLE ROW LEVEL SECURITY;

    -- Co-sign queue
    CREATE TABLE note_cosign_queue (
      id UUID PRIMARY KEY,
      note_document_reference_id UUID NOT NULL,
      np_author_id UUID NOT NULL,
      supervising_md_id UUID NOT NULL,
      patient_id UUID NOT NULL,
      org_id UUID NOT NULL,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      timeout_at TIMESTAMPTZ NOT NULL,  -- requested_at + 72h
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'timeout_escalated')),
      reviewed_at TIMESTAMPTZ,
      reviewed_by UUID,
      rejection_reason TEXT,
      escalated_to_supervisor_id UUID,
      escalated_at TIMESTAMPTZ
    );
    CREATE INDEX idx_cosign_pending ON note_cosign_queue(supervising_md_id, status) WHERE status = 'pending';
    CREATE INDEX idx_cosign_timeout ON note_cosign_queue(timeout_at) WHERE status = 'pending';
    ALTER TABLE note_cosign_queue ENABLE ROW LEVEL SECURITY;

    -- AI Scribe sessions
    --
    -- > [RECONCILED: B3] Canonical Data Dictionary §5: the single mutable
    -- > `ai_scribe_sessions` table is SPLIT into two:
    -- >   (1) `ai_interaction_log` — IMMUTABLE, append-only, 7y audit trail.
    -- >       Adds `judge_verdict` and `risk_tier` {green|yellow|red}; carries
    -- >       the verdict/tier + cost/token summary for every Scribe run.
    -- >       (See Dictionary §5; shared across all four apps.)
    -- >   (2) `ai_scribe_drafts` — MUTABLE, editable draft content
    -- >       (transcript_text, llm_draft_markdown, llm_structured_panels,
    -- >       status, generated_note_document_reference_id, etc.).
    -- > The CREATE below is retained as the draft-content store and SHOULD be
    -- > read as `ai_scribe_drafts`; the immutable verdict/tier row is written
    -- > to `ai_interaction_log` (skill='scribe') in parallel. Ref Dictionary §5.
    CREATE TABLE ai_scribe_sessions (
      id UUID PRIMARY KEY,
      hcp_user_id UUID NOT NULL,
      patient_id UUID NOT NULL,
      org_id UUID NOT NULL,
      consent_id UUID NOT NULL,  -- Patient/family recording consent
      status TEXT NOT NULL CHECK (status IN ('recording', 'transcribing', 'generating', 'draft_ready', 'discarded', 'used_in_note')),
      audio_s3_key TEXT,
      audio_duration_seconds INT,
      transcript_s3_key TEXT,
      transcript_text TEXT,  -- inline for search
      llm_draft_markdown TEXT,
      llm_structured_panels JSONB,
      llm_safety_flags JSONB,  -- safety-critical entities flagged
      llm_tokens_input INT,
      llm_tokens_output INT,
      llm_cost_usd NUMERIC(8,4),
      generated_note_document_reference_id UUID,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      stopped_at TIMESTAMPTZ,
      generated_at TIMESTAMPTZ,
      used_in_note_at TIMESTAMPTZ
    );
    CREATE INDEX idx_scribe_hcp ON ai_scribe_sessions(hcp_user_id, started_at DESC);
    CREATE INDEX idx_scribe_patient ON ai_scribe_sessions(patient_id);
    CREATE INDEX idx_scribe_org_cost ON ai_scribe_sessions(org_id, date_trunc('month', started_at));
    ALTER TABLE ai_scribe_sessions ENABLE ROW LEVEL SECURITY;

    -- SmartTools user snippets
    CREATE TABLE smarttools_user_snippets (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      trigger TEXT NOT NULL,  -- ".normalcardio"
      expansion_markdown TEXT NOT NULL,
      contains_placeholders BOOLEAN NOT NULL DEFAULT false,
      usage_count INT NOT NULL DEFAULT 0,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX idx_smarttools_user_trigger ON smarttools_user_snippets(user_id, trigger);
    ALTER TABLE smarttools_user_snippets ENABLE ROW LEVEL SECURITY;

    -- SmartTools org snippets
    CREATE TABLE smarttools_org_snippets (
      id UUID PRIMARY KEY,
      org_id UUID NOT NULL,
      trigger TEXT NOT NULL,
      expansion_markdown TEXT NOT NULL,
      contains_placeholders BOOLEAN NOT NULL DEFAULT false,
      active BOOLEAN NOT NULL DEFAULT true,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX idx_smarttools_org_trigger ON smarttools_org_snippets(org_id, trigger) WHERE active;
    ALTER TABLE smarttools_org_snippets ENABLE ROW LEVEL SECURITY;

    -- Note templates
    CREATE TABLE note_templates (
      id UUID PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('sinalytix_curated', 'org_custom')),
      org_id UUID,  -- NULL for sinalytix_curated
      title TEXT NOT NULL,
      description TEXT,
      note_type TEXT NOT NULL,  -- LOINC mapping
      body_markdown TEXT NOT NULL,
      default_structured_panels JSONB DEFAULT '[]'::jsonb,
      active BOOLEAN NOT NULL DEFAULT true,
      created_by UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_templates_org ON note_templates(org_id) WHERE org_id IS NOT NULL;
    ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;

    -- Translation cache
    CREATE TABLE note_translation_cache (
      id UUID PRIMARY KEY,
      note_document_reference_id UUID NOT NULL,
      note_version_id INT NOT NULL,
      target_language TEXT NOT NULL,
      translated_markdown TEXT NOT NULL,
      translated_panels JSONB,
      bedrock_tokens_input INT,
      bedrock_tokens_output INT,
      bedrock_cost_usd NUMERIC(6,4),
      translated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      hit_count INT NOT NULL DEFAULT 0,
      last_hit_at TIMESTAMPTZ
    );
    CREATE UNIQUE INDEX idx_translation_cache_lookup ON note_translation_cache(note_document_reference_id, note_version_id, target_language);
    ALTER TABLE note_translation_cache ENABLE ROW LEVEL SECURITY;

### 6.5 Audit Log Event Type Genişlemesi

**Category: note**

  event\_type                        Tetikleyici
  ---------------------------------- -------------------------------------------
  `note.draft.created`               New note draft
  `note.draft.autosave`              Autosave 10s
  `note.draft.locked`                Editor open + lock acquire
  `note.draft.released`              Editor close + lock release
  `note.signed`                      Two-step sign commit (T3)
  `note.grace_edit`                  10dk grace window edit (rare; high audit)
  `note.addendum.created`            Addendum draft
  `note.addendum.signed`             Addendum sign
  `note.entered_in_error`            T4 mark as error + correction note ref
  `note.cosign.requested`            NP sign + co-sign flag
  `note.cosign.completed`            MD co-sign success
  `note.cosign.rejected`             MD reject + reason
  `note.cosign.timeout_escalation`   72h timeout escalation
  `note.read.patient`                Patient app patient read
  `note.read.cross_org`              Specialist cross-org read
  `note.translated`                  Bedrock translate (cache miss)
  `note.translation_cache_hit`       Cache hit (statistics only)
  `note.template.applied`            Template used
  `note.template.saved_org`          Org custom template saved

**Category: scribe**

  event\_type                          Tetikleyici
  ------------------------------------ --------------------------------
  `scribe.recording.started`           Recording begin (post-consent)
  `scribe.recording.consent_refused`   Patient/family decline
  `scribe.recording.paused`            Recording pause
  `scribe.recording.stopped`           Recording end
  `scribe.transcribe.completed`        AWS Transcribe Medical done
  `scribe.transcribe.failed`           Transcribe error
  `scribe.llm.draft_generated`         Bedrock Claude draft complete
  `scribe.llm.failed`                  LLM error
  `scribe.draft.discarded`             HCP discard draft
  `scribe.draft.used_in_note`          Draft handoff to editor
  `scribe.cost.budget_exceeded`        Per-org cost cap (V1)

**Category: smarttools**

  event\_type                                 Tetikleyici
  ------------------------------------------- ----------------------------------------------
  `smarttools.snippet.created`                New user/org snippet
  `smarttools.snippet.updated`                Edit
  `smarttools.snippet.deleted`                Delete
  `smarttools.snippet.expanded_high_volume`   Statistics aggregation (no per-expand event)

### 6.6 PolicyEngine Integration

    // Note create
    PolicyEngine.evaluate({
      subject: { id: hcp.id, role: hcp.role },
      action: 'create',
      resource: { type: 'Note', note_type: 'progress' },
      context: { patient_id, org_id, care_team_grant: 'active', consent_scope }
    });

    // Note sign (T3 elevated)
    PolicyEngine.evaluate({
      subject: { id: hcp.id, role: hcp.role, auth_tier_session: 'T3' },
      action: 'sign',
      resource: { type: 'Note', id: note.id },
      context: { patient_id, org_id }
    });

    // Note entered-in-error (T4 elevated)
    PolicyEngine.evaluate({
      subject: { id: hcp.id, role: hcp.role, auth_tier_session: 'T4' },
      action: 'mark_entered_in_error',
      resource: { type: 'Note', id: note.id, original_author: note.author },
      context: { patient_id, org_id, requestor_is_author_or_cc: bool }
    });

    // AI Scribe start recording
    PolicyEngine.evaluate({
      subject: { id: hcp.id, role: hcp.role },
      action: 'scribe_record',
      resource: { type: 'AIScribeSession' },
      context: { patient_id, patient_consent: 'recording_grant_active', org_id }
    });

    // Co-sign
    PolicyEngine.evaluate({
      subject: { id: md.id, role: 'mrp', auth_tier_session: 'T3' },
      action: 'cosign',
      resource: { type: 'Note', id: note.id, original_author_id: np.id, supervisor_id: md.id },
      context: { patient_id, org_id }
    });

    // Cross-org consultation note write
    PolicyEngine.evaluate({
      subject: { id: specialist.id, role: 'specialist', org_id: specialist_org_id },
      action: 'create_cross_org_note',
      resource: { type: 'Note', cross_org_consent_ref: consent_id },
      context: { patient_id, patient_org_id, consent_active: bool }
    });

### 6.7 Cross-Doc Data Model Bağlantıları

  Doc 7 Resource/Table                                     Bağlı Doc                                   İlişki
  -------------------------------------------------------- ------------------------------------------- ----------------------------------
  `DocumentReference (note)`                               Doc 4 Patient 360 timeline                  Note events feed timeline
  `DocumentReference.context.related → CarePlan`           Doc 6 plan version snapshot                 B1.4 auto-link
  `DocumentReference.relatesTo`                            Doc 7 internal addendum/correction chains   Append + replace patterns
  `Provenance.signature`                                   Doc 2 audit + Doc 2 T3 re-auth              Signing event source
  `ai_scribe_sessions.consent_id`                          Doc 10 consent layer                        Patient/family recording consent
  `note_cosign_queue`                                      Doc 9 communication (notif primitive V1)    MD inbox + escalation
  `Provenance.agent.onBehalfOf=specialist_org`             Doc 6 B3.4 cross-org                        Cross-org consult provenance
  `Structured panels → Observation/MedRequest/Condition`   Doc 4 + Doc 5 + Doc 8                       FHIR resource extraction feed
  `note_translation_cache`                                 Doc 6 patient view translation              Shared Bedrock Claude stack

§7 --- Hata ve Edge Cases
-------------------------

### 7.1 Note Draft + Sign

  Senaryo                                           Sistem Davranışı                                                          UX
  ------------------------------------------------- ------------------------------------------------------------------------- -------------------------------------------------------------------
  Autosave network fail                             IndexedDB queue + 3x retry; offline indicator                             \"Bağlantı yok --- değişiklikler local; bağlantı dönünce sync\"
  Browser crash mid-draft                           Reload resume from last autosave (≤10s loss)                              \"Önceki taslağınızı yüklüyoruz\...\"
  Sign attempt without attestation checkbox         UI block submit                                                           \"Onay kutusu zorunlu\"
  Sign attempt without signature artifact           UI block submit                                                           \"Imza gerek (typed veya drawn)\"
  T3 re-auth fail (wrong PIN, biometric mismatch)   3 attempt; sonra lockout (Doc 2 spec)                                     \"Re-authentication failed. Try again or use password fallback.\"
  Sign success ama network drop before commit       Local pending state; reconnect → server idempotency check (request\_id)   \"Sign processing\... reconnect successful\"
  HCP attempts edit signed note (post 10dk grace)   UI block; addendum CTA prominent                                          \"Bu not imzalandı. Değişiklik için Addendum ekleyin.\"
  Note body exceeds 20K char                        UI warn at 18K; reject save \>20K                                         \"Not 20K karakter sınırı; bölün veya kısaltın\"
  50+ structured panels (performance)               UI warn at 10; reject \>10                                                \"En fazla 10 yapılandırılmış panel\"
  HCP role mismatch (PT tries to add Rx panel)      UI block + tooltip                                                        \"PT scope dışında. MRP\'ye yönlendirin.\"

### 7.2 AI Scribe

  Senaryo                                                  Sistem Davranışı                                                                                                     UX
  -------------------------------------------------------- -------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------
  Patient refuses recording consent                        No recording; manual note only                                                                                       \"Manuel not yazımına geçildi\"
  Mid-recording network drop                               Local audio buffer; retry chunk upload on reconnect; if extended, \"Recording will resume --- visit can continue\"   Brief reconnect warning
  AWS Transcribe Medical fail                              Retry 3x; fallback to general Transcribe; if still fail → audio retained, transcript empty, manual note              \"Transkripsiyon başarısız --- manuel not önerilir\"
  Bedrock Claude fail                                      Retry 2x; fallback \"Use transcript only\" mode (HCP writes from transcript)                                         \"AI draft oluşturulamadı. Transkript\'i manuel kullanın.\"
  Audio \>60dk (single visit \> limit)                     Auto-stop + draft attempt with current; warn user                                                                    \"Maksimum 60dk; mevcut transkript ile devam ediliyor\"
  Background noise heavy (low transcript quality)          Transcript confidence flag; LLM hallucination riski yüksek                                                           \"Transkript kalitesi düşük --- gözden geçirin\"
  Multi-speaker (HCP + patient + family)                   AWS Transcribe Medical speaker diarization V1; MVP\'de speaker neutral                                               LLM \"different speakers\" hint in transcript
  Sensitive content recorded (örn. mental health detayı)   LLM safety-critical flag (B3.1 Doc 5 whitelist) + sensitive auto-detect (B2.4 Doc 5) → lockbox propose               \"Bu kayıt sensitive içerikleri içeriyor olabilir; lockbox uygula?\"
  HCP discards draft after recording                       Audio + transcript retain S3 (legal/audit; consent gave permission for clinical use)                                 \"Taslak silindi; ses kaydı ekibinizin audit\'inde 7 yıl saklanır\"
  Patient retracts consent post-recording                  Consent revoke event (Doc 10) → audio + transcript hidden (immutable retention); HCP\'ye notif                       \"Hasta kaydı erişimini revoke etti; mevcut materyal arşivde\"
  Cost budget exceeded mid-session                         Recording continues (ongoing visit safety); next session blocked until org admin action                              \"Bu ay AI Scribe budget aşıldı; org admin\'e bildirim gitti\"

### 7.3 Co-Sign

  Senaryo                                             Sistem Davranışı                                                              UX
  --------------------------------------------------- ----------------------------------------------------------------------------- -------------------------------------------------------------------
  MD inbox 100+ pending (overflow)                    Sort/filter prominent; supervisor notif (40+ pending alert)                   \"40+ co-sign bekliyor --- öncelik triaj\"
  72h timeout, no escalation supervisor (small org)   Default escalation = org primary MD/CC                                        \"Acil co-sign gerekli --- alternative routing\"
  MD reject loop (NP re-submits, MD reject again)     After 3 rejections, escalate to medical director (V1 supervisor matrix)       Notif \"Note 3 kez reject edildi --- supervisor review\"
  NP leaves org after sign + pending co-sign          NP\'in audit izi kalır; MD co-sign yapabilir; orphan handling Doc 6 paralel   Inbox\'ta \"Author no longer at org\" badge
  Co-sign request to MD not in org                    Validation pre-submit deny                                                    \"Belirtilen MD bu org\'da değil. Org primary MD\'ye yönlendir?\"

### 7.4 Entered-in-Error

  Senaryo                                                                        Sistem Davranışı                                                                             UX
  ------------------------------------------------------------------------------ -------------------------------------------------------------------------------------------- --------------------------------------------------------------------
  Original author bilmiyor başka HCP entered-in-error işaretledi                 CC initiates → original author notify + audit                                                \"Notunuz CC tarafından entered-in-error işaretlendi: \[reason\]\"
  Patient app real-time view at moment of error mark                             Cache invalidate; patient\'a \"Note redacted --- your care team has corrected this entry\"   Yumuşak görsel; klinik continuity korur
  Entered-in-error to addendum (typo correction yerine kullanıldı yanlışlıkla)   T4 elevated; reversibility yok                                                               \"Bu işlem geri alınamaz. Devam mı?\" --- onay zorunlu
  Correction note required but not signed                                        Original status not changed until correction note signed                                     \"Düzeltme not\'u sign edilmeden işlem tamamlanmaz\"

### 7.5 SmartTools

  Senaryo                                                Sistem Davranışı                          UX
  ------------------------------------------------------ ----------------------------------------- ----------------------------------------------------------
  Trigger conflict user vs org (.bp both)                User priority (B3.3)                      UI tooltip \"Org snippet \'.bp\' override edildi\"
  Placeholder resolve fail (lastBP yok)                  Fallback \"\[no recent BP\]\"             Inline text shows fallback
  Snippet expansion \>5K char                            Warn user; allow but performance flag     \"Bu snippet çok uzun --- performans etkileyebilir\"
  User 200+ snippets (limit hit)                         Block create                              \"Maksimum 200 snippet. Eski olanları silin veya bölün\"
  Org admin disables org snippet mid-typing              Cached snippets work until next session   Brief interruption; consistent next session
  Conditional logic V1 yokken user `{{if}}` kullanıyor   Plain text render (no logic)              Hint banner: \"Conditional logic V1+\"

### 7.6 Multilang Translation

  Senaryo                                        Sistem Davranışı                                     UX
  ---------------------------------------------- ---------------------------------------------------- ------------------------------------------------------------------
  Bedrock rate limit                             Cache fallback; if miss, queue + retry               \"Çeviri sırada; bir dakika bekleyin\"
  Translation cost budget exceeded (V1)          Cache served only; on-demand translate disabled      \"Çeviri quota aşıldı; cache\'lenmiş versiyon\"
  Note amended (addendum) → cache invalidate     Per-version cache; new translation on next request   Transparent; user sees fresh translation
  FR-native authoring V2 placeholder triggered   Re-direct to translation flow                        \"Native FR authoring V2\'de --- şimdilik EN write + translate\"
  Translation render fail (UI parsing)           Show original + error notice                         \"Çeviri yüklenemedi --- orijinal görüntüleniyor\"

### 7.7 Cross-Org Consultation

  Senaryo                                              Sistem Davranışı                                                UX
  ---------------------------------------------------- --------------------------------------------------------------- --------------------------------------------------------------------------------
  Specialist consent expires mid-note write            Save partial draft; pre-sign block; user notify                 \"Erişim süresi doldu; taslağınız kaydedildi. Hastadan tekrar grant isteyin.\"
  Original org rejects consult note (Doc 6 conflict)   Note remains in specialist\'s own org context; not propagated   \"Original org consult\'u reject etti; sizin kaydınızda kalıyor\"
  Specialist tries to write outside cross-org scope    PolicyEngine deny                                               \"Sadece consultation note yetkilisiniz cross-org context\'inde\"

### 7.8 Performance + Storage

  Senaryo                                Sistem Davranışı                                 UX
  -------------------------------------- ------------------------------------------------ ---------------------------
  Patient timeline 1000+ notes (Doc 4)   Cursor pagination + filter; load on-demand       Smooth scroll
  Search across all notes for HCP (V1)   Full-text index (PG FTS MVP, Elasticsearch V1)   Sub-second response
  Audio file storage cost growth         Lifecycle policy per Doc 5: 10y hot + Glacier    Transparent; no UX impact
  Long body note (15K+ char) render      Lazy render + virtual scroll                     Smooth view
  Cross-doc reference resolution slow    Cache + indexed lookup                           \<500ms typical

§8 --- Kabul Kriterleri
-----------------------

### 8.1 Fonksiyonel Kabul Kriterleri

**Note Authoring:**

-   AC-1.1: 10 standard note type taxonomy MVP; LOINC mapping; UI
    selector.
-   AC-1.2: Hybrid free-text body (20K char) + structured panels (5
    type, 10 max per note).
-   AC-1.3: Sinalytix-curated 8-12 template MVP; org custom save; blank
    from-scratch.
-   AC-1.4: Auto-link CarePlan version snapshot (master + writer\'s
    discipline subplan) at write-time.
-   AC-1.5: Draft autosave 10s + offline IndexedDB queue.
-   AC-1.6: 5dk idle lock release.

**Signing:**

-   AC-2.1: Two-step: preview modal + sign modal.
-   AC-2.2: T3 re-auth (biometric + PIN) Doc 2 spec.
-   AC-2.3: Attestation checkbox mandatory.
-   AC-2.4: Signature artifact (typed name OR drawn).
-   AC-2.5: Immutable on commit; Provenance.signature.
-   AC-2.6: 10dk grace window for typo edit (audit logged).
-   AC-2.7: Post-grace: append-only addendum.

**Addendum:**

-   AC-3.1: Append-only addendum (separate Note resource,
    relatesTo.appends).
-   AC-3.2: Each addendum own T3 sign.
-   AC-3.3: Patient timeline stack display (chronological).

**Entered-in-Error:**

-   AC-4.1: T4 elevated re-auth.
-   AC-4.2: Mandatory reason + signed correction note.
-   AC-4.3: Original status=entered-in-error; immutable retention.
-   AC-4.4: Patient view: redacted badge (existence visible, content
    hidden).
-   AC-4.5: HCP read: full audit log.

**Co-Sign (NP → MD):**

-   AC-5.1: NP sign + \'needs MD co-sign\' flag MVP.
-   AC-5.2: MD inbox queue (per supervisor or org primary).
-   AC-5.3: MD T3 co-sign + signature.
-   AC-5.4: 72h timeout → MD supervisor + NP notif escalation.
-   AC-5.5: Reject path: reason + NP addendum.

**AI Scribe:**

-   AC-6.1: Patient/family consent prompt pre-recording.
-   AC-6.2: Recording UI start/pause/stop; live transcript stream.
-   AC-6.3: AWS Transcribe Medical Canada Central + Bedrock Claude
    integration.
-   AC-6.4: LLM draft generation: body + suggested structured panels +
    safety-critical flags.
-   AC-6.5: HCP review → edit → sign normal flow.
-   AC-6.6: Audio + transcript retain S3 Canada Central (Doc 5
    lifecycle).
-   AC-6.7: Max 60dk per session; cost budget guardrail.

**SmartTools:**

-   AC-7.1: User-level snippets create/edit/delete.
-   AC-7.2: Org-level shared snippets (admin manage V1; HCP read MVP).
-   AC-7.3: Smart placeholders FHIR resolve (patient context).
-   AC-7.4: Auto-expand on `.snippet` + space/tab.
-   AC-7.5: User priority over org (override).
-   AC-7.6: 200 user snippet limit, 100 org snippet limit MVP.

**Multilang:**

-   AC-8.1: HCP authoring EN MVP.
-   AC-8.2: On-demand translate (FR + EN reverse) Bedrock Claude.
-   AC-8.3: Cache per (note\_id, version\_id, lang).
-   AC-8.4: Banner: \"Translated content\".
-   AC-8.5: Original immutable.

**Cross-Org Consultation Note:**

-   AC-9.1: Specialist consent grant active → \"Add Consultation Note\"
    CTA.
-   AC-9.2: Note Provenance: onBehalfOf=specialist\_org + consent ref.
-   AC-9.3: Original org timeline see + CC notify.
-   AC-9.4: Specialist own org outgoing consult list.

**Cross-Doc Integration:**

-   AC-10.1: Doc 4 Patient 360 timeline note events feed.
-   AC-10.2: Doc 6 CarePlan auto-link.
-   AC-10.3: Doc 5 Bedrock+Claude stack shared (single cost domain).
-   AC-10.4: Doc 2 audit canonical schema.
-   AC-10.5: Doc 8 order\'lar structured panels\'tan trigger.

### 8.2 Regülasyon ve Güvenlik Kabul Kriterleri

-   AC-S.1: Tüm note CRUD + sign + addendum + error audit log\'da (Doc 2
    canonical).
-   AC-S.2: Sign immutability (post-sign + post-grace); only
    addendum/correction allowed.
-   AC-S.3: Entered-in-error T4 elevated; sadece original author + CC.
-   AC-S.4: PolicyEngine.evaluate her read/write.
-   AC-S.5: AWS Canada Central data residency tüm pipeline (audio +
    transcript + LLM + storage).
-   AC-S.6: Patient/family AI scribe recording consent zorunlu.
-   AC-S.7: PHIPA + College documentation standards: signed + dated +
    author + immutable.
-   AC-S.8: Sensitive lockbox respect (Doc 4 + Doc 5 align).
-   AC-S.9: Cross-org consult Doc 10 consent grant scope-validated.
-   AC-S.10: Audit query UI (V1) for clinician + admin (Doc 2 paralel).

### 8.3 Teknik ve Performans Kabul Kriterleri

-   AC-T.1: Note editor open \< 1.5s p95.
-   AC-T.2: Autosave latency \< 500ms p95.
-   AC-T.3: SmartTools expand \< 100ms p95.
-   AC-T.4: Sign commit \< 2s p95.
-   AC-T.5: AI Scribe transcribe live latency \< 5s after speech
    (streaming).
-   AC-T.6: AI Scribe draft generation \< 30s p95 (nominal 15dk visit).
-   AC-T.7: Bedrock translation \< 8s p95 (nominal note size).
-   AC-T.8: Translation cache hit rate \> 85% pilot V1 target.
-   AC-T.9: Co-sign inbox load \< 1s p95.
-   AC-T.10: Note timeline render (50 notes) \< 2s p95.
-   AC-T.11: Per-AI Scribe session cost ≤ \$0.50 average.
-   AC-T.12: Per-note (manual + sign) backend cost negligible (≤ \$0.001
    storage/LLM-not-used).

§9 --- Başarı Metrikleri
------------------------

### 9.1 Adoption + Engagement

  Metrik                                                              V0 Hedef (Pilot)              V1 Hedef (GA)   Ölçüm
  ------------------------------------------------------------------- ----------------------------- --------------- ----------------------------------------
  Aktif HCP\'lerde günlük not yazma oranı                             %85+                          %95+            Daily active note authors / total HCPs
  HCP başına günlük ortalama not sayısı                               5-12                          8-15            Notes per HCP per day
  Note template kullanım oranı (vs blank)                             %50+                          %75+            Template-applied / total notes
  SmartTools kullanım: snippet expand per note                        1-3                           3-5             Expansions / note
  AI Scribe adoption (visit\'lerin AI scribe ile note edilme oranı)   %20+                          %50+            Scribe-used notes / total notes
  AI Scribe HCP başına haftalık session sayısı                        5-15                          10-25           Sessions / HCP / week
  Co-sign request rate per NP per week                                0-5 (NP scope\'a göre)        aynı            Co-sign requests / NP
  Multilang translate request rate per note                           %5-15 (multi-lang HCP team)   aynı            Translate events / total notes

### 9.2 Quality + Safety

  Metrik                                                 V0 Hedef                          V1 Hedef    Ölçüm
  ------------------------------------------------------ --------------------------------- ----------- ------------------------------------
  Sign attestation completion rate                       %100                              %100        Attested / signed
  Grace window (10dk) edit usage rate                    \<%5                              \<%2        Grace edits / total signed
  Entered-in-error frequency                             \<%0.5 of total notes             \<%0.2      Error / total
  Co-sign rejection rate (MD reject)                     \<%10                             \<%5        Rejected / total cosign
  Co-sign timeout rate (72h elapse)                      \<%5                              \<%1        Timeout escalations / total cosign
  AI Scribe safety-critical flag accuracy                %90+ precision                    %95+        HCP confirm vs override
  AI Scribe HCP edit rate on draft (avg edit volume)     %30-60 (early); %15-30 (mature)   declining   Char diff draft vs final
  Note translation CC clinical accuracy (sample audit)   %90+                              %95+        Clinical review sample

### 9.3 Time Saving (HCP Productivity)

  Metrik                                        V0 Hedef     V1 Hedef     Ölçüm
  --------------------------------------------- ------------ ------------ -----------------------------------------------
  AI Scribe time saving per visit (vs manual)   50%+         60%+         HCP self-report + time-tracking
  Note time from visit-end to sign              \<30dk avg   \<15dk avg   Recording\_stop → signed\_at
  SmartTools time saving per note               1-3 dk avg   3-5 dk       Estimated based on snippet length + frequency
  Daily HCP documentation time                  \<60dk avg   \<40dk avg   Self-report + telemetry

### 9.4 Operational + Cost

  Metrik                                              V0 Hedef       V1 Hedef       Ölçüm
  --------------------------------------------------- -------------- -------------- ----------------------------
  Per-AI Scribe session cost (Bedrock + Transcribe)   \<\$0.50 avg   \<\$0.30 avg   Cost telemetry per session
  Per-translation cost                                \<\$0.05 avg   \<\$0.03 avg   Bedrock token-based
  Translation cache hit rate                          \>%70          \>%85          Cache events
  Note autosave success rate                          \>%99          \>%99.5        Successful / attempts
  Co-sign avg time-to-completion                      \<24h          \<12h          Request → completed delta

### 9.5 Clinical Outcome (V1+ Longitudinal)

  Metrik                                                       Hedef                           Ölçüm
  ------------------------------------------------------------ ------------------------------- -------------------------
  HCP burnout self-report (validated scale)                    Improvement vs pilot baseline   Pre/post pilot survey
  Note quality clinical audit score                            %85+ acceptable                 Sample chart audit (V1)
  Patient comprehension of notes (Patient app readable view)   Pre/post survey                 V1
  Care coordination signal (cross-discipline note coherence)   Subjective + quant proxy        V1

### 9.6 Compliance + Audit

  Metrik                                                      Hedef                Ölçüm
  ----------------------------------------------------------- -------------------- ----------------------
  Audit completeness                                          %100                 Audit/op parity
  PHI cross-border egress                                     0                    AWS VPC + IAM
  Sign provenance integrity (signature artifact verifiable)   %100                 Signature hash audit
  AI Scribe consent capture                                   %100 of recordings   Consent table parity
  Entered-in-error proper workflow (signed correction note)   %100                 Audit pattern check

§10 --- UX ve Tasarım Notları
-----------------------------

### 10.1 Imza UX --- Klinik Ciddiyet Hissi

*Imza tıbbi kayıt için yasal aksiyon; UI bu \"ciddiyet\"i hissettirmeli.
Two-step (preview + sign) kasıtlı bir friction; klinik safety\'nin
maliyeti. UX akıcı ama \"review attended\" hissi yaratmalı.*

-   Preview modal full-screen (klinisyen tüm not\'u görür)
-   \"Edit\" geri dönüş yumuşak (kararsızlığa izin)
-   \"Confirm Sign\" CTA ana renk (Sinalytix primary)
-   T3 re-auth modal kırmızı top accent (ciddiyet)
-   Attestation text açık, klinik tone (\"Imzalıyorum\...\")
-   Signature pad/typed name görselleştirme (yasal artefakt)
-   Success \"Signed at \[time\]\" → 10dk grace banner (\"Bu pencerede
    typo correction yapılabilir\")

### 10.2 AI Scribe --- \"Trust + Verify\" Tonu

*AI Scribe HCP\'nin yazma yükünü azaltır ama LLM hallucination klinik
safety riski. UX \"AI draft + HCP final say\" net olmalı.*

-   Recording active state minimal interference (HCP visit\'e focus)
-   Live transcript \"yardımcı\"; HCP isterse manuel takip eder
-   Draft display \"Suggested draft --- review and edit\" net banner
-   Safety-critical flag (kırmızı pill): \"Verify: \'penicillin
    allergy\' at 02:34\" → click → transcript jump
-   Edit aksiyonu yumuşak inline (HCP doğal yazı flow\'unda düzeltir)
-   \"Use Draft\" CTA explicit; auto-handoff yok
-   Cost transparency (V1 settings): \"Bu session \~\$0.40\"

### 10.3 SmartTools --- Klinik Hız Maksimizatörü

*Klinisyen typing flow\'u kesintisiz olmalı. SmartTools sezgisel,
otomatik, görünmez ama güçlü.*

-   Inline expand otomatik (`.snippet` + space/tab → instant)
-   Placeholder resolve subtle (no flash; smooth)
-   Snippet suggestion (V1): user pattern öğrenir; \"Did you mean
    `.normalcardio`?\"
-   Settings UI temiz: trigger + preview + usage stats (HCP kendi
    ROI\'sini görür)
-   Org snippet \"shared by org\" badge (community trust)

### 10.4 Note Type Pill Görsel Dili

*8-10 note type kullanıcı düşünmeden hızlı seçim için pill UI iyi
olmalı; LOINC kod kullanıcıya görünmez (clinically irrelevant).*

-   Editor top pill: \"Progress Note\" + chevron (switch type)
-   Switch picker: icon + label per type (örn. kalp ikon = SOAP visit,
    telefon ikon = phone encounter)
-   Type değiştirme draft preserve (body korunur)

### 10.5 Patient-Facing Note Render

*Patient app\'te HCP not\'larını okuyabilmeli (consent-scope). Klinik
dil patient-friendly olmalı; Bedrock translate fonksiyonu zaten kurulu
(Doc 6 B2.2 ile aynı altyapı).*

-   Patient app not görünümü: HCP name + discipline + signed\_at + body
-   \"Translate to plain language\" CTA --- Bedrock simplify (Doc 6
    paterni)
-   Sensitive lockbox content gizli (Doc 4 alignment)
-   Comment thread V1 (patient/family react/ask)

### 10.6 Co-Sign Inbox UX

*MD/supervisor günde 10-30+ co-sign review yapabilir. Inbox triaj
odaklı.*

-   Sort: oldest first (urgency)
-   Color: days\_pending --- yeşil (0-1d), sarı (2-3d), kırmızı (4d+)
-   Bulk action V1: \"Approve high-confidence batch\" (LLM filtering
    V2+)
-   Mobile push notif on new request
-   Review UX hızlı: tek tıkla note görünür, tek tıkla approve veya
    reject

### 10.7 Multilang UX

*HCP team multilingual (Ontario\'da yaygın). UX cross-lang flow
kesintisiz.*

-   Note view\'da dil indicator (Note language: EN)
-   \"Translate to FR\" CTA prominent (FR-speaker HCP)
-   Translation banner: \"Translated by AI --- verify with original for
    clinical decisions\"
-   Cache-served translation badge \"Translated 3h ago\"
-   V1 user preference (HCP default-lang otomatik translate)

### 10.8 Addendum UX --- Görsel Hiyerarşi

*Addendum klinik kayıt korur; UI original + addendum hiyerarşik
göstermeli.*

-   Note view: original full, sonra \"Addendum 1 added by \[HCP\] on
    \[date\]\" başlık + addendum body
-   Multiple addendum chronological stack
-   \"Add Addendum\" CTA always visible (rolündeyse)
-   Patient timeline (Doc 4): tek event \"Note with N addendums\"
    (expand for stack)

### 10.9 Entered-in-Error UX --- Klinik Sorumluluk

*Hata kabul etmek HCP için psikolojik zorlu; UI yumuşak ama ciddiyetli.*

-   \"Mark Entered-in-Error\" CTA secondary action (not prominent)
-   Confirmation modal:\"Bu eylem orijinal not\'u tıbbi kayıtta
    `entered-in-error` olarak işaretler. Geri alınamaz. Devam edilsin
    mi?\"
-   Reason dropdown + free-text (klinik açıklama net)
-   Correction note draft (mandatory): \"Original not yanlıştı çünkü\...
    Doğru bilgi\...\"
-   T4 elevated re-auth (ciddiyet hissini taşır)

### 10.10 Mobile vs Web UX Felsefesi

-   **Web:** Full editor, AI Scribe full review panel, structured panels
    rich, SmartTools settings detail, co-sign inbox tablo.
-   **Mobile:** AI Scribe primary (saha visit), quick note creation,
    sign + addendum, view + translate, co-sign approve hızlı.
-   Mobile complex review (entered-in-error, conflict resolution) →
    \"Switch to web\" banner.

### 10.11 Erişilebilirlik

-   Keyboard shortcuts: Ctrl+S save, Ctrl+Enter sign, Ctrl+. SmartTools
    picker
-   Screen reader: not type announce, signed\_at, author, attestation
    prompt
-   High contrast: signature pad alternative typed name
-   Voice-to-text (V1) --- accessibility için kritik

§11 --- Kullanıcı Senaryoları
-----------------------------

### 11.1 Senaryo: PT Ev Ziyareti + AI Scribe

**Aktör:** PT Marcus (Sinapse Home Care)

**Bağlam:** Maria T. evinde haftanın 3. visit\'i; ROM exercise + balance
training; family Sarah eşlik ediyor.

**Akış:**

1.  Marcus iPhone Sinalytix app\'inde Maria\'yı açar → \"Document
    Visit\" CTA → \"Start AI Scribe Recording\".
2.  Patient/family consent prompt mobile: \"Bu visit\'i kayıt etmek
    istiyoruz\...\" Maria + Sarah onaylar.
3.  Recording başlar (red dot indicator). Marcus visit\'i normal şekilde
    yapar:
    -   Berg Balance test (42/56)
    -   ROM measure right knee (passive 0-95°, active 0-85°)
    -   Aile education (\"Sarah, weight shift exercise\'i her gün yarım
        saat\...\")
    -   Goals progress diyaloğu (\"Maria, stairs ile artık daha
        iyisin\")
4.  35 dakika sonra visit bitince Marcus \"Stop & Generate Draft\".
5.  Transcribe Medical + Bedrock Claude işliyor (\~25 saniye);
    SCRIBE-DRAFT-01 ekranı:
    -   **Body draft (markdown):** \"SOAP Visit Note --- Subjective:
        Patient reports improved mobility\... Objective: Berg Balance
        42/56 (improvement from 38 at last visit). ROM passive R knee
        0-95°, active 0-85°. Bed→chair transfer independent\...
        Assessment: Progress toward ROM goal continuing. Falls risk
        decreasing. Plan: Continue current PT 3x/week. Family education
        re: weight shift completed.\"
    -   **Suggested structured panels (HCP confirm/edit/dismiss):**
        -   Vital snapshot: BP 132/85 --- Patient mentioned at 14:22
            (need confirm)
        -   Goal progress: \"Berg ≥45 within 12 weeks\" --- current 42
            (in-progress, improving)
        -   Goal progress: \"ROM right knee 0-90° within 6 weeks\" ---
            current 95° passive (achieved threshold)
    -   **Safety-critical flag:** None this visit.
6.  Marcus body draft\'ı 3 dakika edit eder (typo \"exercice\" →
    \"exercise\", ekler \"Sarah demonstrated technique correctly\").
    Structured panels\'tan vital\'i confirm (Maria gerçekten 132/85 BP
    söyledi --- Marcus el cuff\'u ile teyit yapmadığı için \"Patient
    self-reported\" not ekler). Goal progress panels\'i confirm.
7.  \"Use Draft → Sign\" → NOTE-PREVIEW-01 → NOTE-SIGN-01 → T3 re-auth
    (Face ID) → attestation + typed signature.
8.  Note immutable; Patient 360 timeline güncel; CarePlan B1.4 auto-link
    (master + PT subplan); Doc 4 widget Berg + ROM update.
9.  Total time: visit 35dk + note 5dk = 40dk (vs eski workflow 35dk
    visit + 25dk akşam not yazma = 60dk).

**Sonuç:** AI Scribe + SmartTools + structured panels = 20dk tasarruf
per visit; pilot HCP \"burnout azaldı\" feedback.

### 11.2 Senaryo: NP → MD Co-Sign Akışı

**Aktör:** NP Lisa (palliative care) + Supervisor Dr. Chen (MRP)

**Bağlam:** Maria T. palliative pathway; Lisa visit\'te symptom mgmt
update yazıyor; opioid dose adjustment + new gabapentin Rx önerisi var
(controlled substance MD co-sign zorunlu).

**Akış:**

1.  Lisa visit sonrası NOTE-EDITOR-01: SOAP visit note. AI Scribe ile
    draft → review/edit.
2.  Structured panel \"Medication change attestation\": \"Hydromorphone
    2mg → 3mg PO q4h PRN pain; consideration of gabapentin 100mg PO TID
    for neuropathic pain\". Doc 8 order\'ları henüz oluşturulmamış (note
    signing sonra).
3.  Lisa \"Sign + Request MD Co-Sign\" CTA → supervisor field default
    Dr. Chen.
4.  T3 re-auth (Lisa) + attestation + signature → note signed + co-sign
    queue\'ya düşer.
5.  Dr. Chen (Lisa\'nın supervising MD\'si) inbox notif. 2 saat sonra
    Sinalytix\'i açar → co-sign inbox: Maria T. --- SOAP visit --- 2h
    pending.
6.  Dr. Chen note açar (NOTE-COSIGN-REVIEW-01); body + meds change panel
    okur. Approve.
7.  T3 re-auth (Chen) + signature → co-sign completed. Note fully
    signed.
8.  Lisa notif: \"Note co-signed by Dr. Chen\". Şimdi Doc 8 controlled
    substance order flow başlayabilir (NP authority + MD co-sign
    documentation).

**Sonuç:** ON NP scope-of-practice uyumlu; klinik continuity +
accountability izlenebilir.

### 11.3 Senaryo: Cross-Org Specialist Consultation Note

**Aktör:** Dr. Patel (UHN neurology) + CC Anne (Sinapse)

**Bağlam:** Maria T. cross-org consent grant aktif (Doc 6 B3.4); Dr.
Patel review consultation veriyor.

**Akış:**

1.  Dr. Patel UHN Sinalytix\'ten Maria\'s chart açar (cross-org access
    banner) → Care Plan görür (palliative) → Doc 7 \"Add Consultation
    Note\" CTA.
2.  NOTE-EDITOR-01 cross-org context: note type \"Consultation Note\"
    pre-selected; cross-org consent reference auto-linked;
    provenance.onBehalfOf=UHN Neurology.
3.  Dr. Patel SmartTools kullanır (kendi UHN snippets --- `.neuroassess`
    snippet expand\'le gabapentin trial recommendation template
    doluyor).
4.  Body: \"Reviewed care plan post-stroke recurrence. Goals of care
    align with patient/family wishes. Recommend gabapentin 100mg PO TID
    for neuropathic pain (titrate to 300mg TID over 2 weeks).
    Re-evaluate in 4 weeks. Cardiac and renal function within limits for
    trial.\"
5.  Sign flow → T3 re-auth + attestation + signature → note signed.
6.  Note iki yerde görünür: (a) Sinapse Patient 360 timeline (CC Anne
    için) --- \"Consultation note from UHN Neurology (Dr. Patel)\"; (b)
    UHN\'nin kendi Sinalytix instance\'ında outgoing consult listesinde.
7.  CC Anne notif: \"Specialist consult note added --- Maria T.\" →
    review eder, MRP Dr. Lee\'ye forward eder gabapentin Rx kararı için
    (Doc 8).
8.  30 gün sonra cross-org consent expire; Dr. Patel\'in erişimi
    kesilir; note tarihçesi her iki org\'da kalır.

**Sonuç:** Multi-org consultation Doc 7 ↔ Doc 6 ↔ Doc 10 entegre; her
org kendi kayıt + cross-org bilgi paylaşımı consent-aware.

### 11.4 Senaryo: Entered-in-Error --- Yanlış Hasta\'ya Not

**Aktör:** CC Anne

**Bağlam:** Anne PT visit notu yazarken yanlışlıkla başka patient\'in
(Mark) chart\'ında açmış → not \"Maria T.\" içeriğiyle Mark\'a sign
edilmiş. Anne 2 saat sonra fark ediyor.

**Akış:**

1.  Anne Mark\'s Patient 360 timeline\'da bu garip not\'u görür →
    NOTE-VIEW-01 → \"Mark Entered-in-Error\" CTA.
2.  NOTE-ERROR-01 modal:
    -   T4 elevated re-auth (full 2FA + biometric + PIN)
    -   Reason dropdown: \"Wrong patient\"
    -   Reason text: \"Bu not yanlışlıkla Maria T.\'nın visit\'i için
        Mark Smith chart\'ına yazıldı. Mark için bu visit yapılmadı.\"
    -   Correction note draft: \"Bu çerçeveye uyumlu olmadığı için
        entered-in-error işaretlendi. Doğru hasta için ayrı not Maria T.
        chart\'ında oluşturulacak.\"
3.  T3 sign correction note + commit.
4.  Original note: status=entered-in-error; Mark\'s timeline\'da \"Note
    redacted by clinician\" badge (content gizli).
5.  Mark Patient app\'inden bakarsa: \"Bir not redacted edildi; care
    team\'iniz düzeltti\" yumuşak görsel.
6.  Audit: `note.entered_in_error` event + Anne actor + reason +
    correction note ref + Mark notify.
7.  Anne ardından Maria T.\'nın gerçek chart\'ında yeni not yazar (visit
    gerçek olduğu için).

**Sonuç:** Klinik kayıt integrity korunur; PHIPA + College standards
uyumlu; PHI yanlış hasta\'nın chart\'ında kalır audit\'te ama clinical
use\'da gizli.

### 11.5 Senaryo: SmartTools Kullanım --- Klinik Hız

**Aktör:** RN Jordan (Sinapse Home Care)

**Bağlam:** Jordan günde 6-8 ev ziyareti yapıyor; her ziyaret SOAP note
+ medication check.

**Akış:**

1.  Jordan kişisel snippet\'lerini Setting\'ten kurar:
    -   `.normalvitals` → \"Vitals stable: BP {{lastBP}}, HR {{lastHR}},
        RR 16, SpO2 {{lastSpO2}}, Temp 36.8°C oral. Patient afebrile,
        hemodynamically stable.\"
    -   `.medcheckok` → \"Medication review: {{currentMeds}}.
        Patient/caregiver reports adherence. No new side effects.\"
    -   `.familyed` → \"Family education completed: {{topic}}. Caregiver
        demonstrated understanding.\"
2.  Visit Maria T.\'da: Jordan note açar (SOAP visit). Body:
    -   \"S: Patient reports stable mood, no new symptoms.
    -   O: \" → typing `.normalvitals` + space → expansion: \"Vitals
        stable: BP 132/85, HR 78, RR 16, SpO2 96%, Temp 36.8°C\...\"
    -   Next line: `.medcheckok` + tab → \"Medication review: Apixaban
        5mg BID, Metformin 500mg BID, Hydromorphone 3mg PO q4h PRN.
        Patient/caregiver reports adherence. No new side effects.\"
    -   \"A: Stable. Continue current plan.
    -   P: \" → `.familyed` + space + topic \"weight monitoring\":
        \"Family education completed: weight monitoring. Caregiver
        demonstrated understanding.\"
3.  Note 2 dakikada hazır (vs eski 10dk yazma); review → sign.

**Sonuç:** SmartTools per-note 5-8dk tasarruf; günde 6 visit × 7dk =
42dk; HCP work-life balance iyileşmesi.

### 11.6 Senaryo: Multilang Read --- FR Speaker HCP

**Aktör:** PT Antoine (Sinapse Home Care; FR-native, Ottawa region)

**Bağlam:** Maria T.\'nın chart\'ında EN-yazılmış 12 not var (Anne,
Marcus, Jordan, Dr. Chen, Dr. Patel\'den); Antoine ilk kez bu hasta\'ya
care veriyor.

**Akış:**

1.  Antoine Patient 360 timeline\'da notları görür → bir SOAP visit note
    (Marcus\'tan) açar → NOTE-VIEW-01.
2.  \"Translate to FR\" CTA tıklar. Cache hit? No (henüz translate
    edilmemiş).
3.  Bedrock Claude translate (\~6 saniye); cache store.
4.  NOTE-TRANSLATE-01 side-by-side: EN original \| FR translation.
5.  Banner: \"Translated content --- verify with original for clinical
    decisions\". Antoine FR okur, klinik bağlam anlaşılır.
6.  Antoine bir önceki not\'u (Anne\'in care plan progress note) açar →
    \"Translate to FR\" → bu sefer cache hit (Anne\'in not zaten
    translate edilmişti farklı session\'da) → instant FR display.
7.  Antoine kendi notunu EN yazar (MVP authoring EN); sonradan Anne
    FR-speaker patient family için patient view publish ederken Bedrock
    translate (Doc 6 B2.2) ile FR\'a çevrilecek.

**Sonuç:** Multilingual HCP team Ontario realitesini destekler; cache
cost-effective; original EN integrity korunur.

§12 --- Açık Konular
--------------------

### 12.1 V0 Launch Öncesi Karara Bağlanmalı

-   **Sinalytix-curated 8-12 note template detay içerik:** Her template
    için body skeleton + default structured panels + LOINC mapping; PMR
    uzmanı + klinik danışman review.
-   **AI Scribe Bedrock Claude prompt engineering:** Note draft
    generation prompt; safety-critical entity detection
    precision/recall; test set + iterative tuning; pilot data ile
    refine.
-   **AI Scribe per-org monthly cost cap default:** \$200-500/ay? Pilot
    data ile tune; auto-block vs warn-only policy.
-   **AI Scribe consent text official wording:** Legal review (PHIPA +
    PIPEDA + College standards); FR + EN.
-   **Co-sign supervisor matrix MVP default:** Org primary MD or
    NP-specified? Provincial NP scope variations (Ontario focus MVP).
-   **10dk grace window edit policy:** Sadece typo (regex-detected) mu
    yoksa free edit? Audit volume kontrol.
-   **Note type taxonomy LOINC mapping final:** Cross-cultural Kanada
    home care realitesi; PMR uzmanı + 2-3 home care HCP review.
-   **SmartTools placeholder list final:** MVP 15+ placeholders; resolve
    performance (FHIR resource cost); kullanım dağılımı pilot tune.
-   **Patient comment thread V1 design:** Patient app side scope; CC
    moderation; comment notif primitive.

### 12.2 V1 Spec Kararları

-   **AI Scribe FHIR resource auto-extraction:**
    Observation/MedicationStatement/Condition direct from transcript;
    HCP confirm UI; Doc 5 LLM safety patterns ile align
-   **AI Scribe summary suggestion:** \"Patient mentioned X --- add to
    problem list?\" interactive prompt
-   **AI Scribe safety-critical flag UI prominent:** Doc 5 B3.1
    whitelist + audit retrospective review
-   **Co-sign org admin supervisory matrix UI:** Add/edit/customize;
    auto-routing rules
-   **SmartTools conditional logic:**
    `{{if patient.hasDiabetes}}...{{endif}}` parser + UI
-   **SmartTools org marketplace:** Org admin publish + curate; share to
    Sinalytix-curated review
-   **Note template publish + Sinalytix-curated review:** Quality bar;
    review board
-   **Org admin note type custom expand:** New type codes; LOINC mapping
-   **Patient comment thread on notes:** Patient/family react +
    question; CC moderate; threading model
-   **Note full-text search:** Per patient, per author, per date, per
    type; Elasticsearch swap (Doc 3 paralel)
-   **Note bulk export:** Legal request, patient right-to-portability;
    FHIR Bundle + zip original
-   **Voice command in note editor:** \"Add allergy panel\", \"Set type
    to phone encounter\"
-   **Audit query UI for clinician:** Settings → Activity Log; Doc 2
    paralel

### 12.3 V2+ Vizyon

-   **Native FR authoring:** Full editor + FR templates + FR snippets
-   **Multilang expansion:** Turkish, Mandarin, Punjabi, Arabic
    (immigrant ON home care)
-   **AI Scribe video record:** Doc 9 visit mgmt ile entegre
-   **AI Scribe real-time live coaching:** During recording, gentle
    prompts (\"Forgot to mention DNR status?\")
-   **AI Scribe ambient mode:** Sürekli arka plan, otomatik visit detect
-   **Inter-note linking:** Consultation note ↔ progress note reply
    thread
-   **Note revision audit visualization:** Provenance diff UI (V1+
    advanced)
-   **Cross-org consultation note V2:** Specialist authoring richer
    (subplan add opt-in)
-   **AI Scribe summary → Care Plan update suggestion:** Doc 6 entegre
-   **Federated learning personalization:** Per-HCP AI scribe style
    adaptation, privacy-preserving

### 12.4 Cross-App Reconciliation (10 Doc Bittikten Sonra)

-   **Patient note read cross-app:** Patient app render endpoint;
    consent gate; lockbox respect
-   **Note comment cross-app:** Patient/Caregiver/Family permission;
    threading; moderation
-   **Notification primitive:** Doc 9 unified comm (co-sign, addendum,
    AI scribe completion, consent revoke)
-   **AI Scribe consent cross-app:** Patient app consent UI; revoke flow
-   **SmartTools cross-discipline:** Tüm Sinalytix apps\'lerde mı yoksa
    HCP-only mi?
-   **Translation cache cross-app:** Doc 6 + Doc 7 ortak; Patient app
    render path da kullanır

### 12.5 Klinik Review (PMR Uzmanı + CXO)

-   **10dk grace window klinik justification:** Pilot HCP feedback;
    PHIPA + College yorumu
-   **Entered-in-error frequency expectation:** Real-world rate; pilot
    data hedef \<0.5%
-   **AI Scribe accuracy threshold acceptable:** Hangi confidence (LLM
    precision) \"production-ready\"? PMR uzmanı + risk acceptance
-   **Safety-critical entity list final:** Doc 5 B3.1 whitelist Doc 7 AI
    Scribe context\'inde tam mı?
-   **Co-sign 72h timeout adequacy:** Pilot real-world rate; supervisor
    capacity
-   **Note type taxonomy clinical fit:** 10 type Kanada home care
    reality kapsıyor mu? Missing type?
-   **SmartTools placeholder accuracy:** `{{currentMeds}}` resolve doğru
    mu (active MedicationStatement vs all)?
-   **AI Scribe content reach (patient awareness):** Recording
    disclosure tone; patient autonomy duygusu

### 12.6 Pilot Feedback Tuning

-   AI Scribe adoption rate per HCP per role (PT vs RN vs MD)
-   AI Scribe HCP edit volume on draft (early vs mature)
-   SmartTools snippet creation rate + most-used snippets per discipline
-   Co-sign rejection patterns (which NPs/notes most rejected; training
    opportunity)
-   Translation cache hit rate org-by-org
-   Entered-in-error real rate + reason distribution
-   Note signing time visit-end to sign (workflow speed)
-   AI Scribe cost per HCP per month real-world

### 12.7 Backend Infra Detayları

-   **Bedrock Claude model versioning for note draft:** Stable model +
    canary new release
-   **AWS Transcribe Medical Canada Central availability:** GA Canada
    Central status; fallback strategy if regional
-   **Audio S3 storage lifecycle:** 10y hot + Glacier (Doc 5 paterni)
-   **Translation cache eviction policy:** LRU + version-based
    invalidation
-   **SmartTools placeholder resolve performance:** FHIR resource cache
    strategy
-   **Co-sign queue scaling:** Per-MD queue, fan-out for large orgs (10+
    supervised NPs)
-   **Note full-text indexing:** PG FTS MVP, Elasticsearch swap V1 (Doc
    3 paralel)
-   **Note autosave conflict (same draft from two devices):**
    Last-write-wins + warning V1 reconciliation
-   **Provenance.signature artifact storage:** Drawn signature image
    blob → S3; typed name inline

*Sinalytix HCP PRD --- Doc 7: Clinical Documentation & AI Scribe. v1.0
--- 31 Mayıs 2026. Master Doc §5.6 + Session 2 Q&A (B1.1-B3.4, 12 karar)
+ Foundation \#6 Tier 4 moat genişletilmiş (AI Scribe + SmartTools
MVP\'ye çekildi). Doc 1-6 baseline\'larına bağlı. Cross-app
reconciliation 10 doc bittikten sonra ayrı pass.*

Table of Contents {#table-of-contents-7 .TOC-Heading}
=================

Sinalytix HCP PRD --- Doc 8: Orders, Prescriptions & Referrals
==============================================================

**Versiyon:** v1.0 (Karara bağlanan öneriler --- kullanıcı son kontrol
bekliyor) **Tarih:** 31 Mayıs 2026 **Sahip:** Sinalytix Ürün & Klinik
Ekibi **Statü:** Drafted (Q&A skipped per user direction; recommended
options applied) **Bağlı Dokümanlar:** Master Doc §5.7, Foundation \#3
(controlled Rx V1), Foundation \#4 (PolicyEngine), Foundation \#7
(partnership V2+), Doc 2 (T3/T4 re-auth), Doc 4 (Patient 360), Doc 5
(Tier 1 OSCAR result feed), Doc 6 (CarePlan activity reference), Doc 7
(Note structured panels)

§0 --- Karara Bağlanan Öneriler (Kullanıcı Onay Bekliyor)
---------------------------------------------------------

Doc 8 için kullanıcı Q&A\'sız direkt yazım talimatı verdi; aşağıdaki
seçimler önceki dokümanların paterniyle uyumlu recommended kararlar:

  \#     Karar Noktası                            Önerilen                                                                                            Gerekçe
  ------ ---------------------------------------- --------------------------------------------------------------------------------------------------- ---------------------------------------------------
  D1.1   Order resource model                     FHIR ServiceRequest (lab/imaging/referral) + MedicationRequest (Rx)                                 FHIR R4 + CA Core+ best practice; Doc 5+6 paterni
  D1.2   Lab order taxonomy                       Sinalytix-curated 50-80 yaygın panel + LOINC codes + free-text custom V1                            Klinik hız + standardization
  D1.3   Imaging modality scope MVP               X-ray + Ultrasound + basic CT request; MRI/Nuclear medicine V1                                      Home care realistic priorities
  D1.4   Order signing                            T3 re-auth + attestation + signature (Doc 7 sign paterni); T4 controlled subst                      Cross-doc consistency
  D2.1   E-fax provider                           Documo (Canada, PHIPA-compliant, single-vendor MVP)                                                 Data residency + cost simplicity
  D2.2   Ocean Health referral integration        V1 (per Continuation Brief); MVP basic e-fax + patient printout                                     Foundation \#7 partnership V2+ koruma
  D2.3   Order status lifecycle                   Draft → Signed → Sent → Acknowledged → Completed (results linked) / Cancelled                       FHIR ServiceRequest.status native
  D2.4   Refill / standing orders                 Single Rx instance MVP; refill workflow + standing order V1                                         Scope discipline
  D3.1   Controlled substance Rx                  MVP scope dışı (Foundation \#3); V1 web-only + T4 + attestation + provincial Narcotics compliance   Foundation lock
  D3.2   Patient app order visibility             Yes; Patient 360 + Doc 4 timeline + dedicated \"Orders\" section + status updates                   Patient autonomy (Foundation \#5)
  D3.3   Pharmacy directory                       Sinalytix-maintained Canada pharmacy directory (basic MVP); HCP per-Rx select; e-fax target         Operational practicality
  D3.4   Lab/Imaging vendor directory             Sinalytix-curated MVP (LifeLabs, Dynacare, common imaging centers ON) + add custom V1               Same as pharmacy
  D4.1   Results auto-linking                     Tier 1 OSCAR + Tier 4 ingested results → ServiceRequest.basedOn back-reference (Doc 5 paterni)      Closed loop
  D4.2   Order ↔ Care Plan linkage                Auto-link from Plan activity (Doc 6 B3.1 reference); Auto-link to current Plan version              Doc 6 paterni
  D4.3   Order ↔ Note linkage                     Note structured panel \"New Rx/lab\" → Order create + reference (Doc 7 B1.2 paneli)                 Doc 7 paterni
  D4.4   Infoway National ePrescribing Standard   V2 (per Continuation Brief); MVP\'de e-fax-based                                                    Maturity trajectory

§1 --- Bağlam ve Amaç
---------------------

### 1.1 Tanım

**Orders, Prescriptions & Referrals**, HCP\'nin klinik aksiyon
kararlarını (lab order, imaging order, specialist referral,
prescription) yapılandırılmış FHIR resource olarak yazma, imzalama,
harici sağlık sağlayıcılara iletme (e-fax MVP) ve sonuçları/teyitleri
yakalama modülüdür. Klinik karar zincirini tamamlayan operasyonel köprü:
not yazıldı (Doc 7) → aksiyon kararı verildi (Doc 8) → harici sistemler
tetiklendi → sonuç döndü (Doc 5 Tier 1/4 ingestion) → Patient 360 (Doc
4) güncellendi.

Doc 8\'in temel kararları (D0 §0 tablosu özet):

-   FHIR ServiceRequest (lab/imaging/referral) + MedicationRequest (Rx)
    --- vendor-neutral standart.
-   Sinalytix-curated lab/imaging/pharmacy directory MVP; LOINC +
    Canada-specific code system.
-   E-fax MVP via Documo (Canada Central PHIPA-compliant); Infoway
    ePrescribing Standard V2.
-   Foundation \#3 controlled substance V1 --- MVP\'de regular Rx only.
-   Doc 7 note structured panels\'tan order trigger; Doc 6 plan activity
    reference; Doc 5 Tier 1 OSCAR result auto-link back to
    ServiceRequest.

### 1.2 Giriş Noktaları

  Giriş Noktası                                                                      Tetikleyici                                 Rol
  ---------------------------------------------------------------------------------- ------------------------------------------- -------------------------
  Worklist (Doc 3) --- \"Quick Order\" CTA                                           Hızlı lab/Rx order                          MRP, NP, authorized HCP
  Patient 360 (Doc 4) --- \"Orders\" tab → \"New Order\"                             Patient context\'inde order                 MRP, NP, authorized HCP
  Care Plan (Doc 6) --- activity inline veya reference yaratımı                      Plan\'dan order tetiklenir                  CC (plan author), MRP
  Clinical Note (Doc 7) --- structured panel \"New Rx / Lab / Imaging / Referral\"   Note context\'inde order                    MRP, NP
  Ingestion (Doc 5) --- Tier 4 LLM önerisi (V1)                                      Yeni rapor read sırasında follow-up order   MRP
  Patient 360 → \"Orders\" tab → existing order detail                               Cancel, modify (V1), refill (V1)            MRP, NP
  Inbox / Worklist --- \"Pending acknowledgment\" badge                              Sent order\'ların ack durumu                MRP, NP
  Settings → Pharmacy / Lab / Imaging directories                                    Sinalytix-curated + org custom              Org admin
  Patient app --- \"My Active Orders\" tab                                           Order list + status (read-only)             Patient/Family

### 1.3 Hedef Rol Matrisi

  Rol                               Order Yazma Yetkisi                                                                                                           Notlar
  --------------------------------- ----------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------
  MRP (Most Responsible Provider)   Tüm order tipleri MVP (lab, imaging, referral, regular Rx); controlled subst V1 web-only + T4                                 Sole authority controlled subst
  NP (Nurse Practitioner)           Lab, imaging (provincial scope subset), referral, regular Rx (NP scope); bazı orders MD co-sign (Doc 7 B2.3 ile koordineli)   ON scope: limited controlled subst, hep MD co-sign
  Care Coordinator (CC)             Order yazma yetkisi yok MVP (CC orkestre eder); Doc 6 plan\'dan \"Suggest order to MRP\" V1                                   Yetki ayrımı klinik safety
  Allied Health (PT/OT/SLP/RN/RD)   Discipline-specific orderable requests (örn. PT can request orthotic eval via referral; OT for ADL aid) --- V1 expand         MVP minimal; subspecialty referrals V1
  Specialist (kendi org context)    Specialist\'s own org context\'inde tam scope; cross-org context\'inde V1 limited                                             Doc 6 B3.4 cross-org gating
  Patient / Caregiver / Family      Read-only order status (consent-scope, sensitive lockbox)                                                                     Active order list + completion notif
  Org Admin                         Directory mgmt, controlled subst policy (V1), e-fax provider config                                                           Configuration only

### 1.4 Ekosistem Konumu

*Kanada home care\'de order workflow tarihsel olarak parçalı: kâğıt
requisition + faks + telefon takip; MyChart/eHealth Ontario portal
entegrasyonu sınırlı. Sinalytix MVP\'de e-fax-based yapılandırılmış
orders + Tier 1 result auto-loop ile \"order yaz, sonucu otomatik gör\"
closed-loop deneyimi sağlar. V2\'de Infoway National ePrescribing
Standard ile e-prescribing tam regülasyon-uyumlu.*

Stratejik konum:

-   **Closed-loop ordering (MVP):** Order → e-fax → Tier 1 OSCAR results
    back-reference → Patient 360 güncelleme. Rakip platformlar
    (AlayaCare) tipik olarak open-loop (order gönder; sonuç manual
    takip).
-   **Sinalytix-curated directories (MVP):** LifeLabs, Dynacare, common
    imaging centers, Canadian pharmacy chain --- out-of-the-box; pilot
    org operational onboarding hızlanır.
-   **Patient app order visibility (Foundation \#5):** Patient kendi
    order\'larını görür --- autonomy moat.

### 1.5 Regülasyon ve Standartlar

-   **PHIPA + provincial parallels:** Order PHI; tüm CRUD + sign +
    transmit audit (Doc 2 canonical).
-   **Health Canada Food and Drugs Act + Narcotic Control Regulations:**
    Controlled substance Rx provincial College + federal Narcotic
    Monitoring (V1 entry).
-   **OCRA (Ontario Controlled Drugs and Substances Act):** Provincial
    controlled subst tracking; V1 compliance.
-   **Infoway National ePrescribing Standard (PrescribeIT):** V2 entry;
    MVP e-fax-based legacy.
-   **FHIR R4 + CA Core+:** ServiceRequest + MedicationRequest profile
    alignment.
-   **eFax PHIPA compliance:** Documo Canada Central; BAA-style data
    processing agreement.
-   **CMA / Provincial Colleges scope-of-practice:** HCP role-action
    matrix validation pre-write (PolicyEngine).
-   **Ocean Health (referral integration V1):** OntarioMD-certified
    eReferral platform; V1 partnership.
-   **AWS Canada Central:** Tüm order data + binary (PDF Rx, e-fax
    confirmations) Canada Central.

§2 --- Endüstri ve Klinik Bağlam
--------------------------------

### 2.1 Kanada Home Care Order Practice --- Mevcut Durum

-   **OSCAR Pro:** Rx printable PDF + e-fax integration partial;
    lab/imaging requisition free-form; referral via Ocean partner.
-   **AlayaCare / PCC:** Order modülleri vendor-specific; e-prescribing
    limited; controlled subst kâğıt-baskın.
-   **MyChart Epic (hastane):** E-prescribing + lab/imaging fully
    digital; ama home care org\'lara erişim sınırlı.
-   **eHealth Ontario:** OLIS (lab results, read-only); eDelivery
    (faxless secure messaging V1+).
-   **Faks + telefon:** Dominant home care reality; turnaround days;
    close-loop manuel.
-   **Infoway PrescribeIT:** Canada national e-prescribing standardı;
    %20-30 pharmacy adoption (2025); growing.

Sinalytix MVP e-fax-baskın realisti; V2\'de Infoway standardına geçiş.

### 2.2 Order Klinik Vakaları

**Lab order:**

-   CBC, BMP, A1c (diyabet takibi), lipid (kardiyak), tiroid, INR
    (warfarin), troponin (akut), urinalysis, microbiology (UTI culture),
    CRP/ESR (inflam)
-   Provider note + collection instructions + send to lab provider
-   Result back via Tier 1 OSCAR (lab fed to family physician EMR) →
    Sinalytix Patient 360 auto-update via Doc 5 ingestion

**Imaging order (MVP X-ray + US + basic CT):**

-   X-ray: chest, joint, abdomen
-   Ultrasound: abdominal, vascular, soft tissue
-   CT: head, chest, abdomen basic
-   MRI + nuclear medicine V1 (specialist liaison)
-   Order + provider clinical indication + radiologist note request

**Referral:**

-   Specialist consult (neurology, cardio, palliative MD, geriatrics,
    mental health)
-   Allied health (PT/OT/SLP --- V1 expand)
-   Community resource (CCAC, social work, palliative team)
-   MVP: Sinalytix-curated specialist directory (Ontario focus); Ocean
    Health full integration V1

**Prescription (regular Rx, MVP):**

-   New Rx (drug + dose + freq + duration + indication + special
    instructions)
-   Refill (V1)
-   Renewal (V1)
-   Controlled substance V1 (web-only + T4 + attestation + Narcotic
    Monitoring report)
-   e-fax to pharmacy + patient printout option

### 2.3 Closed-Loop Order Vision

    HCP writes order → sign (Doc 7 paterni) → e-fax to provider → ack received → completed (results back via Tier 1) → Patient 360 update → Doc 4 timeline event → HCP notif on results

Bu döngü Sinalytix moat\'ı: rakipler tipik olarak step 4-5 manuel takip;
Sinalytix otomatize. Pilot HCP feedback\'i \"lab order edip akşam
unutuyordum, şimdi Sinalytix bana bildiriyor\" tipik gelişmesi.

### 2.4 Patient App Order Görünürlüğü

Foundation \#5 patient-controlled platform; patient kendi order\'larını
görmeli:

-   \"My Active Orders\" tab: lab/imaging/referral/Rx
-   Status: Sent, Acknowledged, Completed, Cancelled
-   Lab/imaging: \"Visit LifeLabs Bloor by \[date\]; bring this
    requisition (PDF download)\"
-   Rx: \"Picked up at Shoppers Drug Mart Bloor; show pharmacy this
    confirmation\"
-   Referral: \"Specialist clinic will contact you; if no response by
    \[date\], your CC will follow up\"
-   Family caregiver same view (consent-scope)
-   Sensitive lockbox respect (Doc 4 + Doc 5)

§3 --- Kapsam ve Kısıtlar
-------------------------

### 3.1 V0 (MVP) --- Q4 2026 Launch

**Order Types:**

-   Lab order: ServiceRequest + LOINC codes + Sinalytix-curated 50-80
    panel
-   Imaging order: ServiceRequest + Sinalytix-curated modality picker
    (X-ray, US, basic CT)
-   Referral: ServiceRequest (referral type) + Sinalytix-curated
    specialist directory (ON focus)
-   Regular Prescription: MedicationRequest + drug picker (RxNorm +
    Canada formulary) + pharmacy directory
-   Controlled substance Rx: MVP scope dışı (Foundation \#3; V1)

**Workflow:**

-   Two-step: Draft + Sign (T3 re-auth + attestation + signature
    artifact); Doc 7 paterni
-   Immutable on sign; cancel via \"Cancel Order\" (T3) →
    status=revoked + reason; original retained
-   Per-order PDF generation (Sinalytix-branded requisition form)
-   E-fax via Documo (Canada Central) to provider; e-fax confirmation
    tracked
-   Patient PDF download (if patient app linked + consent)
-   Auto-link CarePlan version (Doc 6 B1.4 paterni)
-   Note structured panel \"New Rx/Lab/Imaging/Referral\" trigger (Doc 7
    B1.2)

**Status Lifecycle (FHIR ServiceRequest.status native):**

-   draft → active (signed) → completed (results linked) / revoked
    (cancelled) / on-hold (paused awaiting decision)
-   MedicationRequest.status: draft → active → completed (filled at
    pharmacy V1 tracking) / cancelled / stopped

**Result Linking:**

-   Tier 1 OSCAR sync (Doc 5): incoming lab DiagnosticReport.basedOn →
    ServiceRequest match (PG join on orderID + patient + time window)
-   Tier 4 ingested results (Doc 5): LLM extracts result + LLM-suggested
    ServiceRequest match (HCP confirm V1)
-   Patient 360 (Doc 4) Observation feed automatic; HCP \"result
    available\" notif

**E-Fax (Documo):**

-   Sinalytix backend → Documo API → e-fax to provider\'s documented fax
    number
-   E-fax confirmation tracked (success/fail/retry)
-   Sent PDF + Documo confirmation receipt retained S3 Canada Central
-   Failure retry: 3 attempts; manual fallback alert (HCP must call
    provider)

**Directories:**

-   Pharmacy directory (Sinalytix MVP curated \~500 ON pharmacies +
    chains: Shoppers, Rexall, Loblaw, Costco Pharmacy, independents)
-   Lab directory (LifeLabs \~150 locations ON, Dynacare \~80 locations
    ON, hospital-based labs)
-   Imaging directory (\~200 ON imaging centers including hospital
    outpatient)
-   Specialist directory (\~5000 ON specialists; OPSP-derived + curated;
    ON only MVP)
-   Org admin V1: add custom entries

**Patient App Order Visibility:**

-   \"My Orders\" tab; active orders + completed last 30d
-   Status per order; download requisition/Rx PDF
-   Family caregiver shared view (consent-scope)
-   Sensitive lockbox respect

**Audit + PolicyEngine:**

-   Tüm CRUD + sign + send + status change + cancel audit (Doc 2
    canonical)
-   PolicyEngine evaluate her access (role + scope of practice +
    consent + sensitive scope)

### 3.2 V1 (Post-MVP, 6-12 ay)

-   Refill workflow (existing MedicationRequest derived; pharmacy
    notified)
-   Renewal workflow
-   Standing orders (PRN auto-renew)
-   Order modification (specific fields editable; full immutable
    retention V2)
-   LLM-suggested follow-up orders (Doc 5 Tier 4 result review →
    \"Recommend follow-up A1c in 3 months?\")
-   Ocean Health full eReferral integration (FHIR ServiceRequest direct
    send vs e-fax)
-   Pharmacy directory expand multi-province
-   Lab/Imaging directory expand multi-province
-   Specialist directory multi-province + family physician directory
-   Controlled substance Rx (Foundation \#3 V1): web-only + T4 +
    attestation + Narcotic Monitoring reporting
-   Order template (e.g., \"Diabetes check labs\" = A1c + lipid + ACR +
    LFTs preset)
-   Order ↔ Result match LLM-assisted (Doc 5 Tier 4 fuzzy match)
-   Patient app order proactive prompts (\"LifeLabs is 2km from you ---
    schedule your lab visit?\")
-   Allied Health discipline-specific orderable requests
-   HCP discipline-specific subspecialty referrals (PT→ortho
    subspecialty, OT→home accessibility eval)

### 3.3 V2 (12-24 ay)

-   **Infoway National ePrescribing Standard (PrescribeIT):** Full
    e-prescribing direct to pharmacy
-   DURx (Drug Utilization Review) integration: Rx interaction +
    duplication + contraindication checking
-   Real-time pharmacy inventory check (V2+ vendor partnership)
-   Imaging modality expand: MRI, nuclear medicine, PET, specialized US
-   Hospital ADT integration: discharge orders auto-import
-   Cross-province order forwarding (newcomer patient cross-province
    transfer)
-   Order analytics dashboard org-level (ordering patterns, cost,
    evidence-based suggestions)
-   Patient-initiated refill request (Patient app → HCP approve)
-   DUR alerts integrated with Patient 360 Active Meds (Doc 4)
-   Lab/Imaging order tracking: appointment scheduling (V2+ vendor)

### 3.4 V3 (24+ ay)

-   E-prescribing federated multi-vendor (PrescribeIT + provincial
    alternatives)
-   AI-suggested clinical decision support (SaMD Class II yolculuğu;
    Bedrock Claude + evidence base)
-   Population health ordering analytics (research-grade anonymized)
-   Patient-mediated cross-org order transfer

### 3.5 Constraints

-   **FHIR ServiceRequest + MedicationRequest:** Sinalytix custom
    resource yaratmaz
-   **Sign immutability:** Sign sonrası cancel only (no edit); Doc 7
    paterni
-   **Audit her CRUD:** Doc 2 canonical
-   **PolicyEngine her access:** Role + scope of practice + consent
-   **Data residency Canada Central:** Tüm order + binary + e-fax
    confirm
-   **Controlled subst MVP scope dışı:** Foundation \#3 lock
-   **E-fax PHIPA compliance:** Documo Canada Central BAA
-   **Patient access consent-scope:** Sensitive lockbox respect
-   **Order ↔ CarePlan auto-link:** Write-time version snapshot
-   **Result match window:** ServiceRequest active state max 6 months
    (result expected window); aşılırsa expired flag

### 3.6 Non-Goals

-   **Controlled substance MVP:** V1
-   **DUR (drug interaction checking):** V2 (SaMD)
-   **Real-time pharmacy inventory:** V2+ vendor
-   **Imaging scheduling integration:** V2+ vendor
-   **AI clinical decision support:** SaMD Class II V2+
-   **Patient-initiated order:** Refill request V1; new order request
    V2+
-   **Cross-province order:** V2
-   **Hospital ADT auto-import discharge orders:** V2

§4 --- Akışlar
--------------

### 4.1 Lab Order Akışı (e.g. CBC + A1c)

    sequenceDiagram
        participant MRP as MRP / NP
        participant UI as Order Editor
        participant Dir as Lab Directory
        participant PE as PolicyEngine
        participant Order as Order Service
        participant Auth as T3 Re-Auth
        participant PDF as PDF Generator
        participant Fax as Documo eFax
        participant AL as Audit Log

        MRP->>UI: Worklist/Patient 360/Note → "New Lab Order"
        UI->>PE: evaluate(role, action=create, resource=ServiceRequest:lab)
        PE-->>UI: Allow (MRP/NP scope)
        UI->>UI: Lab panel picker (Sinalytix-curated 50-80)
        MRP->>UI: Select "CBC" + "A1c"; add provider note "Diabetes f/u 3mo"
        UI->>Dir: Lab provider picker
        MRP->>UI: Select "LifeLabs - Bloor Street" (saved patient preference?)
        UI->>UI: Auto-link CarePlan version (B1.4)
        UI->>Order: PATCH /ServiceRequest (draft autosave)
        MRP->>UI: "Sign Order" CTA
        UI->>UI: Preview modal (read-only)
        MRP->>UI: Confirm Sign
        UI->>Auth: T3 re-auth (biometric + PIN)
        Auth-->>UI: Token valid
        MRP->>UI: Attestation + signature
        UI->>Order: POST /ServiceRequest/sign
        Order->>Order: status=active, signed_at, immutable
        Order->>PDF: Generate requisition PDF (Sinalytix branded)
        PDF-->>Order: PDF binary
        Order->>Fax: Documo send → LifeLabs Bloor fax number
        Fax-->>Order: Acceptance ID
        Order->>AL: event_type=order.lab.signed + sent
        Note over Fax,Order: Documo async deliver; success/fail callback
        Fax-->>Order: Callback success → status confirmed
        Order->>MRP: Notif "Lab order sent successfully"
        Order->>Patient_App: Update "My Orders" feed

**Kritik kurallar:**

1.  Lab panel multi-select; each LOINC mapped; combined requisition PDF.
2.  Provider note free-text (clinical indication; required field).
3.  Lab provider directory pick; patient preference saved (FHIR
    Patient.preferred\_lab V1).
4.  T3 sign + immutable; cancel only path post-sign.
5.  PDF retain S3 (legal + audit); Documo confirm retain.
6.  Patient app feed real-time (Doc 4 timeline + Orders tab).

### 4.2 Imaging Order Akışı

    flowchart TD
        A[MRP triggers New Imaging Order] --> B[Modality picker: X-ray/US/CT]
        B --> C[Body part + clinical indication]
        C --> D[Imaging center picker - Sinalytix directory]
        D --> E[Provider note + Q&A: 'Contrast?', 'STAT?', 'Comparison films request?']
        E --> F[Draft autosave]
        F --> G[Sign T3 re-auth + attestation + signature]
        G --> H[Immutable + PDF requisition]
        H --> I[Documo e-fax to imaging center]
        I --> J[Patient PDF download option]
        J --> K[Status tracking: Sent → Ack (V1 manual confirm) → Completed Image Report]
        K --> L[Tier 4 ingestion of image report - Doc 5]
        L --> M[ServiceRequest.basedOn auto-link results to order]

**Kritik kurallar:**

1.  Modality + body part dropdown (LOINC + RSNA coded).
2.  STAT request escalates Documo priority (urgent flag).
3.  Imaging report often Tier 4 (PDF discharge from hospital imaging) →
    LLM extraction + auto-link.

### 4.3 Referral Akışı (MVP eFax; V1 Ocean Integration)

    sequenceDiagram
        participant MRP as MRP
        participant UI as Referral Editor
        participant Dir as Specialist Directory
        participant Order as Order Service
        participant Auth as T3 Auth
        participant Fax as Documo
        participant Pt as Patient App

        MRP->>UI: Worklist/Patient → "New Referral"
        UI->>UI: Referral type: Specialist | Allied Health | Community
        UI->>Dir: Specialist directory (Sinalytix curated ~5000 ON)
        MRP->>UI: Select "Dr. Patel - UHN Neurology" (or search free-text)
        UI->>UI: Reason for referral + clinical summary auto-populated from Patient 360
        MRP->>UI: Edit summary; specify urgency (routine/urgent/emergent)
        UI->>Order: PATCH /ServiceRequest:referral (draft)
        MRP->>UI: Sign T3
        UI->>Auth: T3 re-auth
        Auth-->>UI: Token valid
        UI->>Order: POST /ServiceRequest/sign
        Order->>Fax: e-fax referral letter + patient summary to specialist office
        Fax-->>Order: Sent confirmation
        Order->>Pt: Patient notif "Referral sent to Dr. Patel - they will contact you within 5 business days"
        Note over Pt,Order: V1: Ocean Health integration replaces e-fax with FHIR ServiceRequest direct

**Kritik kurallar:**

1.  Clinical summary auto-populated from Patient 360 (active problems,
    current meds, recent labs); MRP edit.
2.  Urgency triage routine/urgent/emergent affects Documo priority.
3.  V1 Ocean Health direct FHIR transmit (OntarioMD certified).
4.  CC follow-up reminder: 5 business days no response → MRP notif (V1
    SLA tracking).

### 4.4 Prescription Akışı (Regular Rx MVP)

    flowchart TD
        A[MRP triggers New Rx] --> B[Drug picker: RxNorm + Canada formulary]
        B --> C[Strength/Form/Route/Frequency/Duration/Quantity]
        C --> D[Indication + Special Instructions + DAW No-Sub flag]
        D --> E[Pharmacy directory pick - patient preferred default]
        E --> F[Draft autosave]
        F --> G{Controlled substance?}
        G -->|Yes - MVP scope dışı| Z1[Block + redirect: 'Controlled substances V1']
        G -->|No| H[Sign T3 re-auth + attestation + signature]
        H --> I[Immutable + Rx PDF generation Sinalytix-branded]
        I --> J[Documo e-fax to pharmacy]
        J --> K[Patient PDF download option]
        K --> L[Status: Active]
        L --> M[V1: Pharmacy fill confirmation → status=completed]
        L --> N[V1: Doc 4 Active Meds widget auto-update from MedicationRequest]

**Kritik kurallar:**

1.  Drug picker: type-ahead (RxNorm + Canada formulary subset);
    generic + brand display.
2.  Pharmacy preferred per patient (Patient.preferred\_pharmacy V1); HCP
    override per-Rx.
3.  Controlled substance check: drug class flag → MVP\'de block +
    redirect message.
4.  DAW (Dispense As Written) flag prevents pharmacist generic
    substitution; mandatory reason if checked.
5.  PDF: Sinalytix-branded letterhead + HCP credentials + Rx number +
    barcode (V1 anti-fraud).
6.  Patient pickup confirmation V1 (status tracking).

### 4.5 Order Cancel Akışı

    sequenceDiagram
        participant HCP as HCP (original author or MRP)
        participant UI as Order View
        participant PE as PolicyEngine
        participant Order as Order Service
        participant Auth as T3 Auth
        participant Fax as Documo
        participant AL as Audit Log

        HCP->>UI: Open active order → "Cancel Order" CTA
        UI->>PE: evaluate(action=cancel, role, original_author?)
        PE-->>UI: Allow (original author + MRP)
        UI->>HCP: Cancel reason dropdown + free-text
        HCP->>UI: Reason: "Patient deceased" / "No longer indicated" / "Duplicate" / "Other"
        UI->>Auth: T3 re-auth
        Auth-->>UI: Token valid
        UI->>Order: POST /ServiceRequest/cancel
        Order->>Order: status=revoked, cancelled_at, cancel_reason
        alt Already sent
            Order->>Fax: Send cancellation notice to provider e-fax
            Fax-->>Order: Sent
        end
        Order->>AL: event_type=order.cancelled + actor + reason
        Order->>Patient_App: Status update "Cancelled by clinician"

**Kritik kurallar:**

1.  Cancel post-sign; original retained.
2.  If already sent (Documo confirmed): cancellation notice e-fax to
    provider.
3.  Patient notif optional (sensitive context → CC discretion V1).

### 4.6 Result Linking (Tier 1 OSCAR + Tier 4 Ingestion)

    flowchart TD
        A[Tier 1 OSCAR nightly sync - Doc 5] --> B[Incoming lab DiagnosticReport]
        B --> C[Match attempt: ServiceRequest by patient + LOINC + time window]
        C --> D{Match found?}
        D -->|Yes confidence high| E[DiagnosticReport.basedOn → ServiceRequest auto-link]
        D -->|Yes confidence medium| F[Suggest link → HCP confirm V1]
        D -->|No match| G[Orphan DiagnosticReport in Patient 360 timeline]
        E --> H[ServiceRequest.status=completed]
        E --> I[Patient 360 Observation feed]
        E --> J[Original order author notif "Lab results back"]
        A2[Tier 4 ingested doc - Doc 5] --> B2[LLM extracts DiagnosticReport]
        B2 --> C

**Kritik kurallar:**

1.  Auto-link confidence: patient + LOINC + same week ± window match.
2.  HCP notif \"Result available\" worklist Inbox badge.
3.  Orphan result: timeline event without order link; manual link CTA
    (V1).

### 4.7 Patient App Order Visibility

    flowchart TD
        A[Patient opens Sinalytix app] --> B["'My Orders' tab"]
        B --> C[Active orders list - Sinalytix backend filter consent-scope]
        C --> D[Per order: type icon + provider + sent date + status]
        D --> E{Tap order detail}
        E --> F[Status journey: Sent at 14:32, Acknowledged at 16:05 V1, Completed pending]
        E --> G[PDF download requisition/Rx]
        E --> H[Provider contact info: phone, address]
        E --> I["Sensitive order? lockbox redact - Doc 4 alignment"]
        B --> J[Completed last 30 days]
        B --> K[Family caregiver shared view consent-scope]

**Kritik kurallar:**

1.  Real-time WebSocket updates (Doc 3 paterni).
2.  Sensitive order (e.g. STI testing) lockbox respect.
3.  Status display patient-friendly (\"Going to your pharmacy now\" ---
    Bedrock translate, Doc 6+7 stack).

§5 --- Ekran/Yüzey Spec
-----------------------

### 5.1 Ekran Envanteri

  Ekran ID                İsim                                              Mobile      Web      Birincil Rol
  ----------------------- ------------------------------------------------- ----------- -------- ----------------
  ORDER-PICKER-01         New Order Type Picker (Lab/Imaging/Referral/Rx)   ✓           ✓        MRP, NP
  ORDER-LAB-EDITOR-01     Lab Order Editor                                  Lite        ✓ Full   MRP, NP
  ORDER-IMG-EDITOR-01     Imaging Order Editor                              Lite        ✓ Full   MRP, NP
  ORDER-REF-EDITOR-01     Referral Editor                                   ✓           ✓        MRP, NP
  ORDER-RX-EDITOR-01      Prescription Editor                               ✓           ✓ Full   MRP, NP
  ORDER-PREVIEW-01        Preview + Sign Modal                              ✓           ✓        HCP signing
  ORDER-SIGN-01           T3/T4 Re-Auth + Signature                         ✓           ✓        HCP signing
  ORDER-VIEW-01           Order Viewer (signed read)                        ✓           ✓        Care team
  ORDER-LIST-01           Patient Orders Tab (Doc 4 extension)              ✓           ✓        Care team
  ORDER-CANCEL-01         Cancel Modal                                      ✓           ✓        Author/MRP
  ORDER-RESULTS-LINK-01   Result Manual Link (V1)                           ✗           ✓        MRP, NP
  DIR-PHARMACY-01         Pharmacy Directory Picker                         ✓           ✓        HCP
  DIR-LAB-01              Lab Directory Picker                              ✓           ✓        HCP
  DIR-IMG-01              Imaging Directory Picker                          ✓           ✓        HCP
  DIR-SPECIALIST-01       Specialist Directory Picker                       ✓           ✓        HCP
  DIR-MGMT-01             Directory Management Settings                     Lite        ✓ Full   Org Admin
  ORDER-EFAX-STATUS-01    E-Fax Tracking Dashboard                          ✓           ✓        HCP, Org Admin
  PT-ORDER-LIST-01        Patient App \"My Orders\"                         ✓ Primary   ✓        Patient/Family

### 5.2 ORDER-PICKER-01 --- Order Type Selector

**Mobile + Web:**

-   Bottom sheet (mobile) / Modal (web)
-   4 büyük tile: Lab \| Imaging \| Referral \| Rx
-   Mevcut hasta context\'i; patient mini-card top
-   Recent orders quick-clone V1 (e.g. \"Repeat diabetes f/u labs\")

### 5.3 ORDER-LAB-EDITOR-01 --- Lab Order Editor

**Web (React) --- Full UX:**

-   Top sticky: patient mini-card + \"Lab Order\" pill + linked plan
    version + actions (Sign \| Save Draft \| Cancel)
-   Body:
    -   Panel picker: Sinalytix-curated chips (CBC, BMP, A1c, lipid,
        TSH, INR, vb.); multi-select; LOINC tooltip on hover
    -   \"Add custom test\" → LOINC search + free-text fallback (V1)
    -   Provider note (required, \~500 char) --- clinical indication
    -   Collection priority: Routine \| Urgent \| STAT (visual urgency)
    -   Special instructions (e.g., \"Fasting required\", \"Collect
        AM\")
-   Right rail:
    -   Lab provider picker (Directory) --- patient\'s preferred lab
        highlighted
    -   Recent labs at this provider (audit insight)
-   Footer: autosave status + word count + Sign CTA

**Mobile (RN):**

-   Single column: panel picker chips → note → provider → sign
-   Common panels prominent; \"Add more\" expand for full list

### 5.4 ORDER-RX-EDITOR-01 --- Prescription Editor

**Web (React) --- Full UX:**

-   Top: patient + \"Prescription\" pill + allergies banner (Doc 4
    alignment)
-   Body:
    -   Drug picker (type-ahead): generic name + brand + class
        -   \"Amoxicillin\" → suggestions: amoxicillin 250mg/500mg cap,
            amoxicillin clavulanate suspension, etc.
        -   Allergy cross-check inline alert: \"Patient has documented
            penicillin allergy --- caution\"
    -   Strength/Form: auto-suggested per drug; manual override
    -   Route: Oral / IM / IV / Topical / Inhaled / etc.
    -   Frequency: BID / TID / QID / Q4H / Daily / PRN / Custom
    -   Duration: 7 days / 14 days / 30 days / Until cancelled / Custom
    -   Quantity: auto-calculated from dose×freq×duration; manual
        override
    -   Refills: 0 (MVP); V1 multiple
    -   Indication (required): why this med
    -   Special instructions (e.g., \"Take with food\", \"Avoid
        alcohol\")
    -   DAW (Dispense As Written) checkbox + mandatory reason if checked
    -   Controlled substance check: drug class flag → if controlled,
        block + redirect message
-   Right rail:
    -   Patient allergies (Doc 4 active allergies)
    -   Current medications (Doc 4 MedicationStatement list) ---
        duplicate check
    -   Pharmacy picker (Directory) --- patient\'s preferred pharmacy
        highlighted
-   Footer: Sign CTA

**Mobile (RN):**

-   Compressed; single column; allergy banner persistent
-   Common Rx history (HCP\'s frequent) quick-fill (V1)

### 5.5 ORDER-IMG-EDITOR-01 + ORDER-REF-EDITOR-01

**Imaging editor:**

-   Modality dropdown (X-ray / US / CT --- MVP)
-   Body part dropdown (modality-specific)
-   Clinical indication (required)
-   Contrast Y/N (CT)
-   Compared with prior films Y/N
-   Urgency (Routine / Urgent / STAT)
-   Imaging center directory picker

**Referral editor:**

-   Referral type: Specialist \| Allied Health \| Community
-   Specialty dropdown
-   Specialist picker (directory + search)
-   Auto-summary: pulled from Patient 360 (active problems, current
    meds, recent relevant labs)
-   HCP edit summary; specify question/reason for referral
-   Urgency (Routine 2-12 weeks / Urgent 1-2 weeks / Emergent \<48h)

### 5.6 ORDER-PREVIEW-01 + ORDER-SIGN-01

Same pattern as Doc 7 NOTE-PREVIEW-01 + NOTE-SIGN-01:

-   Read-only render of order
-   \"Edit\" back or \"Confirm Sign\" → T3 re-auth + attestation +
    signature
-   Controlled subst V1: T4 elevated + extra attestation (\"I have
    verified patient identity and clinical need\")

### 5.7 ORDER-LIST-01 --- Patient Orders Tab (Doc 4 Extension)

**Konum:** Patient 360 → \"Orders\" tab.

**Mobile + Web:**

-   Tab sub-nav: Active \| Completed \| Cancelled \| All
-   Liste table (web) / cards (mobile):
    -   Type icon (lab/imaging/referral/Rx)
    -   Title (e.g., \"CBC + A1c at LifeLabs Bloor\")
    -   Author (HCP)
    -   Signed date
    -   Provider (lab/pharmacy/specialist)
    -   Status pill (Active / Sent / Acknowledged / Completed /
        Cancelled / Failed)
    -   Actions: View \| Cancel (active only) \| Download PDF \| Manual
        Link Result (V1)
-   Filter: type, status, author, date range
-   Search: by drug name, lab test, specialist
-   Bulk view (active): print all requisitions (Patient pickup envelope)

### 5.8 ORDER-VIEW-01 --- Order Viewer

**Mobile + Web:**

-   Header: order type + status badge + signed\_at + author + linked
    plan version link
-   Body:
    -   Order details (read-only render specific to type)
    -   Provider/destination + e-fax confirmation receipt
    -   PDF download
    -   Result linkage (if completed): \"Result: CBC normal --- see
        DiagnosticReport \[link\]\"
-   Actions: Cancel (if active) \| Manual Link Result (V1) \| View Audit
    Trail
-   Sensitive order: lockbox respect (consent-scope hide content;
    metadata visible)

### 5.9 ORDER-CANCEL-01

-   T3 re-auth + reason dropdown + free-text
-   If sent: warn \"Cancellation notice will be e-faxed to provider\"
-   Confirmation modal: \"This will mark order as revoked. Provider will
    be notified. Continue?\"

### 5.10 DIR-PHARMACY-01 / DIR-LAB-01 / DIR-IMG-01 / DIR-SPECIALIST-01

**Common structure (per directory type):**

-   Search input (name, city, postal code)
-   Filter: distance from patient (V1 geolocation), specialty
    (specialist dir), chain (pharmacy dir)
-   List view:
    -   Name + address + phone + fax (verified)
    -   Distance from patient home address (V1)
    -   \"Set as patient preferred\" toggle (saves to Patient resource)
    -   \"Use this\" → return to editor
-   \"Add custom entry\" (V1 org admin scope)

### 5.11 DIR-MGMT-01 --- Directory Management

**Web (React) --- Org Admin:**

-   Tab nav: Pharmacy \| Lab \| Imaging \| Specialist
-   Sinalytix-curated read-only list (cannot edit Sinalytix entries; can
    hide/disable for org)
-   Org custom entries (add/edit/delete)
-   CSV import (V1)
-   Verification status (cross-check Sinalytix verification)

### 5.12 ORDER-EFAX-STATUS-01 --- E-Fax Tracking

**Web + Mobile:**

-   Dashboard widget: pending / sent / failed / retried counts
-   Filter: by date, by HCP, by provider
-   Per-fax detail: order ID, provider, sent timestamp, status, retry
    count, last error
-   Manual resend CTA (after fix); manual mark as delivered (override)
    with audit reason

### 5.13 PT-ORDER-LIST-01 --- Patient App My Orders

**Mobile (RN) --- Primary:**

-   Section: Active Orders
    -   Per order card:
        -   Patient-friendly title (Bedrock translated, e.g., \"Blood
            test for diabetes check\")
        -   \"Visit LifeLabs Bloor --- bring this paper\" + PDF download
        -   Status journey visual (\"Sent → Going to lab → Results
            coming\")
        -   Provider contact info (call/map)
-   Section: Completed (last 30 days)
-   Family caregiver shared (consent-scope toggle if family member)
-   Sensitive lockbox respect

### 5.14 Ekran-Arası Etkileşimler

-   **Worklist (Doc 3) ↔ Quick Order:** Quick Order CTA from patient row
-   **Patient 360 (Doc 4) ↔ Orders tab:** Dedicated tab + timeline
    events
-   **Care Plan (Doc 6) ↔ Activity reference:** Plan activity create new
    order trigger
-   **Note (Doc 7) ↔ Structured panel:** \"New Rx panel\" creates Rx +
    references in note
-   **Ingestion (Doc 5) ↔ Result auto-link:** Tier 1 + Tier 4 results
    back-reference
-   **Settings → Directories:** Sinalytix-curated + org custom (V1 add)
-   **Patient App ↔ Patient app order render:** Real-time WebSocket
    update

§6 --- Veri Modeli (FHIR R4 + CA Core+)
---------------------------------------

### 6.1 FHIR Resource Kullanımı

  Resource                              Kullanım
  ------------------------------------- ---------------------------------------------------------------------------------------
  `ServiceRequest`                      Lab order, imaging order, referral (category code ile ayrım)
  `MedicationRequest`                   Prescription (regular + V1 controlled)
  `DiagnosticReport`                    Lab + imaging results (Doc 5 Tier 1/4 ingestion\'dan gelir; basedOn → ServiceRequest)
  `Observation`                         Specific lab values (DiagnosticReport.result references)
  `MedicationStatement`                 Patient\'s actual medication-taking (Doc 4 widget; updated by Rx fill V1)
  `Provenance`                          Sign + send + cancel events; signature artifact
  `Patient`                             Subject + preferred pharmacy/lab/imaging references (V1 stored)
  `Practitioner` / `PractitionerRole`   Authoring + co-signing HCPs
  `Organization`                        Provider entities (LifeLabs, Shoppers, specialist clinic) --- directory entries
  `Location`                            Specific lab/pharmacy locations
  `Task`                                E-fax send/ack tracking
  `DocumentReference`                   Order PDF (requisition/Rx) immutable snapshot + Documo confirmation
  `Consent`                             Patient consent for share (Doc 10)
  `CarePlan.activity.reference`         Doc 6 B3.1 plan activity → order link

### 6.2 ServiceRequest Profile (Lab/Imaging/Referral)

    ServiceRequest:
      id: <uuid>
      status: draft | active | on-hold | completed | revoked | entered-in-error
      intent: order  # for lab/imaging; referral uses "referral-request" via category
      category:
        - { system: "http://snomed.info/sct", code: "108252007 | 363679005 | 3457005", display: "Laboratory | Imaging | Referral" }
      priority: routine | urgent | asap | stat
      code:
        coding:
          - { system: "http://loinc.org", code: "<LOINC for lab>" }  # for lab
          - { system: "http://www.radlex.org", code: "<RID>" }  # for imaging (alt: LOINC document codes)
          - { system: "http://snomed.info/sct", code: "<SCT specialty referral>" }  # for referral
      orderDetail: [ ... e.g. "Fasting required" ]
      subject: Reference(Patient/<id>)
      occurrenceDateTime: <when collection/imaging expected>
      authoredOn: <signed_at>
      requester: Reference(Practitioner/<id>)
      performer:
        - Reference(Organization/<lab_id>)  # for lab
        - Reference(Organization/<imaging_center_id>)  # for imaging
        - Reference(Practitioner/<specialist_id>)  # for referral
      reasonCode: [ ... clinical indication ]
      reasonReference: [ Reference(Condition/<id>) ]  # underlying diagnosis
      supportingInfo: [Reference(DocumentReference/<id>), Reference(Observation/<id>)]
      note: [Annotation]  # provider note + special instructions
      meta:
        tag:
          - { system: "https://sinalytix.ca/codes/order-type", code: "lab | imaging | referral" }
          - { system: "https://sinalytix.ca/codes/sensitive", code: "lockbox" } (if sensitive)
        extension:
          - sinalytix-careplan-version-ref
          - sinalytix-note-ref  (if originated from note panel)
          - sinalytix-pdf-document-ref
          - sinalytix-efax-task-ref
          - sinalytix-results-linked: [Reference(DiagnosticReport/<id>)]  (V1 result tracking)
          - sinalytix-cancel-reason
          - sinalytix-cross-org-context: { specialist_org_id, consent_ref } (if specialist cross-org write)

### 6.3 MedicationRequest Profile (Rx)

    MedicationRequest:
      id: <uuid>
      status: active | on-hold | cancelled | completed | entered-in-error | stopped | draft
      intent: order
      category:
        - { system: "http://terminology.hl7.org/CodeSystem/medicationrequest-category", code: "community" }  # vs inpatient
      priority: routine | urgent | asap | stat
      medicationCodeableConcept:
        coding:
          - { system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: "<RxNorm>" }
          - { system: "https://hc-sc.gc.ca/dpd-bdpp", code: "<DIN>" }  # Health Canada DIN
      subject: Reference(Patient/<id>)
      authoredOn: <signed_at>
      requester: Reference(Practitioner/<id>)
      reasonCode: [ ... ]  # indication
      reasonReference: [Reference(Condition/<id>)]
      note: [Annotation]
      dosageInstruction:
        - text: "Amoxicillin 500mg PO TID x 7 days"
          timing: { repeat: { boundsDuration: { value: 7, unit: "d" }, frequency: 3, period: 1, periodUnit: "d" } }
          asNeededBoolean: false
          route: { coding: [{ system: "http://snomed.info/sct", code: "26643006", display: "Oral route" }] }
          doseAndRate:
            - doseQuantity: { value: 500, unit: "mg" }
      dispenseRequest:
        initialFill: { quantity: { value: 21, unit: "tab" } }  # 7d x 3/day
        dispenseInterval: { value: 7, unit: "d" }
        validityPeriod: { start, end }  # Rx valid for fill
        numberOfRepeatsAllowed: 0  # MVP no refills; V1+ refills
        quantity: { value: 21 }
        expectedSupplyDuration: { value: 7, unit: "d" }
        performer: Reference(Organization/<pharmacy_id>)
      substitution:
        allowedBoolean: true  # default; if DAW checked, false + reason
        reason: { coding: [{ code: "FP" }] }  # formulary policy
      meta:
        tag:
          - { system: "https://sinalytix.ca/codes/order-type", code: "rx" }
          - { system: "https://sinalytix.ca/codes/controlled-substance", code: "Y | N" }
          - { system: "https://sinalytix.ca/codes/sensitive", code: "lockbox" } (if sensitive)
        extension:
          - sinalytix-careplan-version-ref
          - sinalytix-note-ref
          - sinalytix-pdf-document-ref  # Rx PDF immutable snapshot
          - sinalytix-efax-task-ref
          - sinalytix-daw-attestation
          - sinalytix-fill-status-history (V1)
          - sinalytix-allergy-cross-check-warnings-acknowledged (audit trail)

### 6.4 Internal PostgreSQL Schema

    -- Order drafts (pre-sign)
    CREATE TABLE order_drafts (
      id UUID PRIMARY KEY,
      order_type TEXT NOT NULL CHECK (order_type IN ('lab', 'imaging', 'referral', 'rx')),
      patient_id UUID NOT NULL,
      org_id UUID NOT NULL,
      author_user_id UUID NOT NULL,
      draft_data JSONB NOT NULL,  -- serialized order draft
      linked_careplan_master_version JSONB,
      linked_careplan_subplan_versions JSONB,
      linked_note_id UUID,
      controlled_substance BOOLEAN NOT NULL DEFAULT false,
      last_autosave_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_order_drafts_author ON order_drafts(author_user_id, last_autosave_at DESC);
    ALTER TABLE order_drafts ENABLE ROW LEVEL SECURITY;

    -- Directory: Pharmacies
    CREATE TABLE directory_pharmacies (
      id UUID PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('sinalytix_curated', 'org_custom')),
      org_id UUID,  -- NULL for sinalytix_curated
      name TEXT NOT NULL,
      chain TEXT,
      address_line TEXT NOT NULL,
      city TEXT NOT NULL,
      province TEXT NOT NULL,
      postal_code TEXT,
      phone TEXT,
      fax_number TEXT NOT NULL,
      email TEXT,
      hours_jsonb JSONB,
      latitude NUMERIC,
      longitude NUMERIC,
      verified_at TIMESTAMPTZ,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_pharm_province ON directory_pharmacies(province) WHERE active;
    CREATE INDEX idx_pharm_city ON directory_pharmacies(city) WHERE active;
    CREATE INDEX idx_pharm_geo ON directory_pharmacies USING gist (point(longitude, latitude)) WHERE active AND longitude IS NOT NULL;
    ALTER TABLE directory_pharmacies ENABLE ROW LEVEL SECURITY;
    CREATE POLICY pharm_visibility ON directory_pharmacies USING (source = 'sinalytix_curated' OR org_id = current_setting('app.acting_org_id')::uuid);

    -- Directory: Labs (similar)
    CREATE TABLE directory_labs (
      id UUID PRIMARY KEY,
      source TEXT NOT NULL,
      org_id UUID,
      name TEXT NOT NULL,
      chain TEXT,  -- 'LifeLabs', 'Dynacare', 'Hospital'
      -- ... same fields as pharmacies ...
      fax_number TEXT NOT NULL,
      collection_services JSONB,  -- ['phlebotomy', 'specimen_dropoff', 'home_collection']
      active BOOLEAN NOT NULL DEFAULT true
    );
    ALTER TABLE directory_labs ENABLE ROW LEVEL SECURITY;

    -- Directory: Imaging
    CREATE TABLE directory_imaging_centers (
      id UUID PRIMARY KEY,
      source TEXT NOT NULL,
      org_id UUID,
      name TEXT NOT NULL,
      -- ... ...
      fax_number TEXT NOT NULL,
      modalities_supported TEXT[],  -- ['xray', 'ultrasound', 'ct', 'mri', 'nm']
      active BOOLEAN NOT NULL DEFAULT true
    );
    ALTER TABLE directory_imaging_centers ENABLE ROW LEVEL SECURITY;

    -- Directory: Specialists
    CREATE TABLE directory_specialists (
      id UUID PRIMARY KEY,
      source TEXT NOT NULL,
      org_id UUID,
      practitioner_id UUID,  -- if known Practitioner resource
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      subspecialty TEXT,
      clinic_name TEXT,
      -- ... address ...
      fax_number TEXT NOT NULL,
      accepting_new_referrals BOOLEAN NOT NULL DEFAULT true,
      active BOOLEAN NOT NULL DEFAULT true
    );
    CREATE INDEX idx_specialist_specialty ON directory_specialists(specialty) WHERE active;
    ALTER TABLE directory_specialists ENABLE ROW LEVEL SECURITY;

    -- E-Fax tracking (Documo integration)
    CREATE TABLE efax_jobs (
      id UUID PRIMARY KEY,
      order_resource_type TEXT NOT NULL CHECK (order_resource_type IN ('ServiceRequest', 'MedicationRequest')),
      order_resource_id UUID NOT NULL,
      org_id UUID NOT NULL,
      destination_fax TEXT NOT NULL,
      destination_directory_entry_id UUID,
      pdf_document_reference_id UUID NOT NULL,
      documo_message_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'retrying', 'manual_fallback')),
      attempt_count SMALLINT NOT NULL DEFAULT 0,
      last_error_text TEXT,
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      cost_cents INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_efax_order ON efax_jobs(order_resource_id);
    CREATE INDEX idx_efax_pending ON efax_jobs(status) WHERE status IN ('queued', 'sending', 'retrying');
    CREATE INDEX idx_efax_org_month ON efax_jobs(org_id, date_trunc('month', created_at));  -- cost
    ALTER TABLE efax_jobs ENABLE ROW LEVEL SECURITY;

    -- Patient preferred providers
    CREATE TABLE patient_preferred_providers (
      id UUID PRIMARY KEY,
      patient_id UUID NOT NULL,
      provider_type TEXT NOT NULL CHECK (provider_type IN ('pharmacy', 'lab', 'imaging')),
      directory_entry_id UUID NOT NULL,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      saved_by_user_id UUID
    );
    CREATE UNIQUE INDEX idx_patient_pref ON patient_preferred_providers(patient_id, provider_type);
    ALTER TABLE patient_preferred_providers ENABLE ROW LEVEL SECURITY;

    -- Result-to-order linking attempts (audit)
    CREATE TABLE result_order_link_attempts (
      id UUID PRIMARY KEY,
      diagnostic_report_id UUID NOT NULL,
      service_request_id UUID,
      patient_id UUID NOT NULL,
      match_confidence NUMERIC(3,2),
      match_method TEXT,  -- 'auto_high_confidence', 'auto_medium_confidence', 'manual', 'orphan'
      matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      matched_by_user_id UUID,
      confirmed BOOLEAN NOT NULL DEFAULT false
    );
    CREATE INDEX idx_link_report ON result_order_link_attempts(diagnostic_report_id);
    ALTER TABLE result_order_link_attempts ENABLE ROW LEVEL SECURITY;

### 6.5 Audit Log Event Type Genişlemesi

**Category: order**

  event\_type                            Tetikleyici
  -------------------------------------- ----------------------------------------
  `order.draft.created`                  New order draft
  `order.draft.autosave`                 Autosave
  `order.signed`                         Sign commit
  `order.cancelled`                      Cancel post-sign
  `order.efax.queued`                    E-fax send queued
  `order.efax.sent`                      Documo accept
  `order.efax.delivered`                 Documo confirmed delivery
  `order.efax.failed`                    Send failure
  `order.efax.manual_fallback`           After retries exhausted
  `order.result.linked_auto`             Tier 1/4 result auto-link
  `order.result.linked_manual`           HCP manual link
  `order.allergy_warning_acknowledged`   Cross-check alert acknowledged at sign
  `order.controlled_substance_blocked`   MVP block + redirect (Foundation \#3)
  `order.efax.cost_budget_exceeded`      Per-org monthly cap (V1)

**Category: directory**

  event\_type                                    Tetikleyici
  ---------------------------------------------- ------------------------
  `directory.custom_entry.added`                 Org admin add
  `directory.custom_entry.removed`               Org admin remove
  `directory.sinalytix_entry.disabled_for_org`   Org admin hide curated

### 6.6 PolicyEngine Integration

    // Order create scope-of-practice check
    PolicyEngine.evaluate({
      subject: { id: hcp.id, role: hcp.role, license: { discipline, province } },
      action: 'create',
      resource: { type: 'ServiceRequest', category: 'lab', code: 'LOINC:...' },
      context: { patient_id, org_id, consent_scope }
    });

    // Rx sign T3
    PolicyEngine.evaluate({
      subject: { id: hcp.id, role: hcp.role, auth_tier_session: 'T3', license },
      action: 'sign',
      resource: { type: 'MedicationRequest', controlled: false },
      context: { patient_id, org_id, allergy_warnings_acknowledged: bool }
    });

    // Controlled subst gate (MVP block)
    PolicyEngine.evaluate({
      subject: { ... },
      action: 'sign',
      resource: { type: 'MedicationRequest', controlled: true },
      context: { ... }
    });
    // MVP returns Deny: 'controlled_substance_v1_only'

    // E-fax send
    PolicyEngine.evaluate({
      subject: { id: 'system', role: 'efax_dispatcher' },
      action: 'send',
      resource: { type: 'EFax', destination: fax_number },
      context: { order_id, org_id, destination_verified: bool }
    });

    // Result auto-link
    PolicyEngine.evaluate({
      subject: { id: 'system', role: 'tier1_sync' },
      action: 'link',
      resource: { type: 'DiagnosticReport', basedOn: 'ServiceRequest/<id>' },
      context: { patient_id, org_id, match_confidence }
    });

### 6.7 Cross-Doc Data Model Bağlantıları

  Doc 8 Resource/Table                       Bağlı Doc                                 İlişki
  ------------------------------------------ ----------------------------------------- ----------------------------
  `ServiceRequest`/`MedicationRequest`       Doc 4 Patient 360 Orders tab + timeline   Order events + active list
  `CarePlan.activity.reference`              Doc 6 B3.1                                Plan activity → order
  `note_structured_panels`                   Doc 7 B1.2                                Note panel → order create
  `DiagnosticReport.basedOn`                 Doc 5 Tier 1/4 ingestion                  Result auto-link
  `efax_jobs.pdf_document_reference_id`      Doc 5 DocumentReference + S3              PDF storage
  `Provenance.signature`                     Doc 2 audit + T3/T4                       Sign artifact
  `Patient.preferred_pharmacy/lab/imaging`   Patient resource extension                Saved preference
  `Consent (cross-org)`                      Doc 10                                    Specialist context

§7 --- Hata ve Edge Cases
-------------------------

  Senaryo                                                       Sistem Davranışı                                                                                                   UX
  ------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------------ -------------------------------------------------------------------------------
  E-fax send fail (Documo 5xx)                                  3 retry exponential (1m, 5m, 25m); after final fail → manual\_fallback flag + HCP notif \"Please call provider\"   \"E-fax başarısız --- providera arayın: \[phone\]\"
  Documo callback timeout (sent but no delivered confirm 24h)   Status remains \"sent\"; daily reconciliation cron checks Documo API                                               Inbox badge \"Pending delivery confirmation\"
  Fax number malformed/changed (directory stale)                Documo reject → manual\_fallback + flag directory entry for review                                                 Org admin \"Directory verification needed\"
  Controlled substance Rx attempt MVP                           Block + redirect message; audit event                                                                              \"Controlled substances V1\'de. Şimdilik kâğıt Rx + paralel order kullanın.\"
  Allergy cross-check warning unacknowledged at sign            Modal blocks sign until \"I have reviewed and accept this risk\" + reason                                          \"Allerjen uyarısı: Penisilin allerjisi documented. Devam mı?\"
  Rx pharmacy directory entry inactive mid-write                UI flag + alternative suggest                                                                                      \"Bu eczane şu an inactive. Alternatif önerelim.\"
  Lab result orphan (no matching order)                         Patient 360 timeline\'da gösterilir; \"Manual link order?\" CTA (V1)                                               \"Bu sonuç hangi order\'a bağlı?\"
  Multi-source same lab result (OSCAR + Tier 4 PDF)             Cross-source merge (Doc 4/5 paterni); both preserved, primary by recency                                           \"2 source --- view both\"
  Sign çakışması (network delay)                                Idempotency key check; sole commit guaranteed                                                                      \"Sign processing\...\"
  Cancel post-acknowledged (provider already actioned)          Cancellation notice gönderilir; provider may have completed; HCP follow-up                                         Warning: \"Provider already acknowledged; cancellation may not be honored\"
  Cross-org specialist write attempt out of scope               PolicyEngine deny                                                                                                  \"Cross-org context\'inde sadece consultation note yazabilirsiniz (Doc 7)\"
  Patient consent revoke mid-order-sent                         Future communication blocked; existing order legally retained                                                      \"Yeni order\'lar engellendi; mevcut sent order\'lar provider\'ın elinde\"
  Drug picker no match (very rare drug)                         Free-text fallback (V1); audit + Sinalytix Operations notif (formulary update)                                     \"Bu ilacı listede bulamadık --- free-text Rx (V1)\"
  Order PDF render fail                                         Retry + Sinalytix Operations alert; manual PDF generation (admin)                                                  \"PDF generation issue --- support contacted\"
  Documo monthly budget exceeded                                Send blocked + Sinalytix + org admin alert; manual e-fax fallback (HCP individual fax)                             \"E-fax budget aşıldı; org admin bilgilendirildi\"
  Specialist directory entry \"not accepting referrals\"        Soft warn; HCP can override (audit reason)                                                                         \"Bu specialist şu an referral kabul etmiyor --- devam?\"
  Referral summary auto-populate fail (Patient 360 query)       Empty body; HCP write manually                                                                                     \"Otomatik özet oluşamadı --- manuel yazın\"
  Duplicate Rx detection (same drug 7d window)                  Soft warn; HCP confirm \"Intentional renewal?\"                                                                    \"Bu hasta bu ilacı son hafta aldı --- devam?\"
  Patient app order render not loading (cache)                  Pull-to-refresh; offline mode fallback last cache                                                                  \"Şu an bağlantı yok --- son sync\'i gösteriyor\"

§8 --- Kabul Kriterleri
-----------------------

### 8.1 Fonksiyonel

-   AC-1.1: Lab order create with multi-LOINC select + provider note +
    lab directory pick + sign + Documo send.
-   AC-1.2: Imaging order (X-ray/US/CT) create with modality + body
    part + clinical indication + center directory + sign + send.
-   AC-1.3: Referral create with specialist directory + auto-populated
    summary + edit + sign + send (V1 Ocean).
-   AC-1.4: Rx create with RxNorm drug picker + dosage + duration +
    pharmacy + sign + send.
-   AC-1.5: Allergy cross-check at Rx sign; unacknowledged warning
    blocks.
-   AC-1.6: Controlled substance attempt → block + redirect (Foundation
    \#3).
-   AC-1.7: Cancel any active order T3 + reason + cancellation notice to
    provider.
-   AC-1.8: Order status lifecycle (draft → active → completed/revoked).
-   AC-1.9: Result auto-link Tier 1 OSCAR + Tier 4 ingestion
    (high-confidence auto, medium HCP confirm V1).
-   AC-1.10: Patient app order visibility (Patient/Family
    consent-scope + sensitive lockbox).
-   AC-1.11: PDF requisition/Rx generation immutable snapshot.
-   AC-1.12: Documo e-fax + 3-retry + manual fallback.
-   AC-1.13: Directory access (pharmacy/lab/imaging/specialist) +
    patient preferred saved.
-   AC-1.14: Doc 6 plan activity reference creates order; Doc 7 note
    structured panel creates order.
-   AC-1.15: Cross-org consultation note (Doc 6 B3.4) write; order write
    out of scope MVP.

### 8.2 Regülasyon ve Güvenlik

-   AC-S.1: All CRUD audit (Doc 2 canonical).
-   AC-S.2: T3 sign (Doc 2); T4 controlled subst V1.
-   AC-S.3: PolicyEngine every access; scope-of-practice validate.
-   AC-S.4: Data residency Canada Central (orders + binaries + Documo +
    DB).
-   AC-S.5: PHIPA + College of Physicians documentation standards.
-   AC-S.6: Foundation \#3 controlled subst MVP block.
-   AC-S.7: Sensitive order lockbox respect (Doc 4 + Doc 5 alignment).
-   AC-S.8: E-fax provider PHIPA-compliant (Documo BAA-style).
-   AC-S.9: Allergy cross-check audit (warning + ack).
-   AC-S.10: Patient app order visibility consent-scope.

### 8.3 Teknik ve Performans

-   AC-T.1: Order editor open \< 1.5s p95.
-   AC-T.2: Drug picker type-ahead response \< 200ms p95.
-   AC-T.3: Sign commit \< 2s p95.
-   AC-T.4: PDF generation \< 3s p95.
-   AC-T.5: Documo send latency \< 5s p95 (acknowledge); delivery
    callback variable.
-   AC-T.6: Directory search \< 500ms p95.
-   AC-T.7: Tier 1 result auto-link \< 5 dakika after ingestion p95.
-   AC-T.8: Per-order Documo cost ≤ \$0.05 average.
-   AC-T.9: Cancel commit \< 2s p95.
-   AC-T.10: Patient app order list load \< 1s p95.

§9 --- Başarı Metrikleri
------------------------

### 9.1 Adoption + Engagement

  Metrik                                      V0 Hedef                      V1 Hedef
  ------------------------------------------- ----------------------------- ----------
  Aktif HCP\'lerde günlük order yazma oranı   %70+ (order-yetkili roller)   %85+
  Per active patient per month order count    3-6                           5-8
  Doc 7 note panel → order create rate        %30+                          %50+
  Doc 6 plan activity → order create rate     %20+                          %40+
  Sinalytix-curated directory usage rate      %95+                          %98+
  Patient app order view weekly active rate   %40+ patient                  %60+

### 9.2 Quality + Safety

  Metrik                                             V0 Hedef                        V1 Hedef
  -------------------------------------------------- ------------------------------- ----------
  E-fax send success rate (3-retry inclusive)        \>%97                           \>%99
  Tier 1 result auto-link confidence high accuracy   \>%95                           \>%98
  Allergy cross-check warning ack rate               %100                            %100
  Order cancel rate                                  %3-8 (clinically appropriate)   similar
  Duplicate Rx warning honored rate                  %85+                            %90+
  Result orphan rate (no match)                      \<%5                            \<%2

### 9.3 Operational + Cost

  Metrik                                         V0 Hedef   V1 Hedef
  ---------------------------------------------- ---------- ----------
  Per-order Documo cost                          \<\$0.05   \<\$0.04
  Per-org monthly e-fax cost (10 HCPs nominal)   \<\$200    \<\$150
  Order sign-to-sent latency p95                 \<30s      \<15s
  Manual fallback rate (e-fax failed)            \<%3       \<%1
  Order autosave success rate                    \>%99      \>%99.5

### 9.4 Clinical Outcome (V1+)

  Metrik                                                    Hedef                       Ölçüm
  --------------------------------------------------------- --------------------------- ------------------------------------------------------
  Time-to-result for labs                                   \<72h avg (lab dependent)   Sent → result linked
  Time-to-specialist-contact for referrals                  \<5d avg                    Referral sent → specialist contact (V1 SLA tracking)
  Adherence proxy: Rx fill rate (V1)                        \>%80                       Pharmacy fill confirmation
  Order cancellation/correction rate (workflow tightness)   \<%5                        Cancelled or modified within 24h

### 9.5 Compliance + Audit

  Metrik                                  Hedef
  --------------------------------------- -----------------------------
  Audit completeness                      %100
  Cross-border egress                     0
  Sign provenance integrity               %100
  Allergy ack audit                       %100 of overridden warnings
  Controlled subst attempt blocks (MVP)   %100

§10 --- UX ve Tasarım Notları
-----------------------------

### 10.1 Allergy Cross-Check --- Klinik Safety

*Rx sign anında allergy warning blocking modal; klinisyen acknowledge +
reason vermeden ilerleyemez. Bu defansif safety katmanı; auto-accept
yok.*

-   Allergy banner sticky note editor üst (Rx context)
-   Warning modal: \"⚠️ Bu hasta documented penisilin allerjisi. Bu Rx
    (Amoxicillin) cross-reactive. Devam mı?\"
-   \"Cancel Rx\" \| \"Continue + Acknowledge Risk\" CTA
-   Acknowledge → reason input mandatory; audit\'lenir

### 10.2 Closed-Loop Görsel Dili

*Order yazıldı → e-fax sent → result back closed loop UX\'i klinisyen
güveni için kritik.*

-   Order view\'da timeline visual: ⚪ Draft → ✓ Signed → 📠 Sent → ✓
    Delivered → 📋 Results
-   Each step timestamp + actor (where applicable)
-   \"Result available\" notif kırmızı badge worklist (Doc 3 paterni)
-   Patient app aynı visual journey (Bedrock translated
    patient-friendly)

### 10.3 Directory Picker --- Hızlı + Akıllı

*HCP order yazarken directory picker workflow hızlandırıcı olmalı.*

-   Type-ahead search (instant); top results: patient preferred +
    recently used + nearest
-   Geolocation suggestion (patient home address ± 5km)
-   Verified badge (Sinalytix-curated) vs unverified (org custom)
-   \"Save as preferred for this patient\" toggle

### 10.4 Controlled Substance Block UX

*MVP\'de controlled subst order block edilir; UI tone yumuşak +
alternatif yol açık.*

-   Drug picker\'da controlled substance flagged (kırmızı pill
    \"Controlled\")
-   Tap → modal: \"Controlled substances Sinalytix V1\'de. Şimdilik
    kağıt Rx + Narcotic Monitoring System paralel kullanın. Doc 8 V1
    spec roadmap \[link\]\"
-   Audit event

### 10.5 Patient App Order --- Plain Language

*Patient app order display medical jargon\'dan arıyık olmalı.*

-   Lab \"CBC + A1c\" → \"Diabetes ve genel sağlık için kan testi\"
-   Imaging \"Chest X-ray PA + Lat\" → \"Akciğer röntgeni\"
-   Rx \"Amoxicillin 500mg PO TID x 7d\" → \"Antibiyotik 500mg, günde 3
    kez, 7 gün, ağızdan\"
-   Bedrock translate + plain language layer (Doc 6+7 stack)

### 10.6 Mobile vs Web Felsefesi

-   **Web:** Full editor (lab multi-select, Rx complex dosage, referral
    summary edit); directory mgmt; e-fax dashboard; result link review
-   **Mobile:** Quick order create (visit context); status check; cancel
    quick; result notif response

§11 --- Kullanıcı Senaryoları
-----------------------------

### 11.1 Senaryo: MRP Routine Lab Order (Diabetes F/U)

**Aktör:** MRP Dr. Lee **Bağlam:** Maria T. diabetes 3-aylık takip; A1c
+ lipid + ACR labs gerekli.

1.  Dr. Lee Patient 360 → Orders tab → \"New Lab Order\".
2.  ORDER-LAB-EDITOR-01: panel picker → A1c + Lipid + ACR (3 LOINC).
3.  Provider note: \"Diabetes 3-month follow-up\". Priority: Routine.
4.  Lab provider: patient\'s preferred = LifeLabs Bloor (saved from
    prior visit).
5.  Auto-link Maria\'s CarePlan version (master + diabetes mgmt
    subplan).
6.  Sign T3 → preview → confirm → biometric + PIN + attestation + typed
    name signature.
7.  PDF generated; Documo e-fax → LifeLabs Bloor (\~2s ack).
8.  Audit + Patient app notif: \"Yeni kan testi order: LifeLabs Bloor\'a
    7 gün içinde uğrayın\".
9.  3 gün sonra Maria LifeLabs\'ta blood draw yaptırır.
10. 2 gün sonra: Tier 1 OSCAR nightly sync → DiagnosticReport gelir →
    A1c=7.2, Lipid normal, ACR normal → auto-link ServiceRequest.basedOn
    match.
11. Dr. Lee worklist Inbox: \"Result available - Maria T.\" badge →
    review.
12. Patient 360 Active Problems → Diabetes mgmt subplan progress update
    (\"A1c improving 7.5 → 7.2; on target trajectory\").

**Sonuç:** 5 günde closed-loop; Dr. Lee sadece sign + sonuç review
yaptı; klinisyen yükü minimal.

### 11.2 Senaryo: NP Rx + Co-Sign

**Aktör:** NP Lisa + Supervising MD Dr. Chen **Bağlam:** Maria yeni
semptom: idrar yolu enfeksiyonu suspect; ev visiti sırasında NP Lisa Rx
önerir.

1.  Lisa Rx editor → drug picker \"nitrofurantoin\" → \"Nitrofurantoin
    100mg PO BID x 7d\".
2.  Indication: \"Suspected UTI; urinalysis pending culture\".
3.  Pharmacy: Maria\'s preferred = Shoppers Drug Mart Bloor.
4.  Allergy cross-check: none flagged; sign T3.
5.  Allergy warning modal not shown (no contraindication).
6.  NP scope check: nitrofurantoin non-controlled; NP solo authority
    valid.
7.  Sign + send Documo (Shoppers Bloor); \~2s.
8.  Maria same-day picks up Rx.
9.  2 gün sonra urinalysis result → E. coli culture positive →
    ServiceRequest auto-link → DiagnosticReport in Patient 360.
10. (Bu vakada co-sign yoktu --- nitrofurantoin non-controlled, NP
    scope.)

**Alternatif:** Eğer Lisa narcotic önerseydi (örn. tramadol post-op
pain) → MVP scope dışı block + redirect \"V1\'de\"; manual kağıt Rx
fallback önerisi.

### 11.3 Senaryo: Referral to Specialist + Closed Loop

**Aktör:** CC Anne (initiate) + MRP Dr. Lee (sign) **Bağlam:** Maria
progressive cognitive decline; geriatric medicine consult gerekli.

1.  CC Anne Care Plan\'a \"Add Referral activity\" → MRP review için
    pending.
2.  Dr. Lee notification → açar → Referral Editor.
3.  Specialty: Geriatric Medicine. Specialist directory pick: Dr. Wong
    (Toronto Western, OPSP-derived).
4.  Auto-populated summary: Maria\'s CarePlan + active problems + recent
    labs + concerns.
5.  Dr. Lee summary edit: \"Progressive cognitive decline post-stroke;
    consider AD vs vascular dementia; MMSE 22/30 in office\".
6.  Urgency: Routine (4-12 weeks).
7.  Sign T3 → Documo e-fax to Dr. Wong\'s office.
8.  Patient app notif: \"Geriatrics referral made to Dr. Wong. Office
    will contact you within 5 business days.\"
9.  (V1 Ocean integration: FHIR ServiceRequest direct.)
10. 8 days later: Dr. Wong\'s office calls Maria; appointment booked.
11. (V1 SLA tracking: HCP notif if no response by Day 5; manual phone
    follow-up.)
12. Specialist sees Maria; consultation note returns (cross-org Doc 6
    B3.4 + Doc 7 specialist write); Anne reviews + plan update.

**Sonuç:** Referral workflow end-to-end; Sinalytix tracker pasif olmayan
+ outcome closed.

### 11.4 Senaryo: Order Cancel Mid-Stream

**Aktör:** MRP Dr. Lee **Bağlam:** Lab order sent yesterday for Maria;
today Maria hospitalize edildi (UHN); lab redundant.

1.  Dr. Lee Patient 360 → Orders tab → Maria\'s \"Lab CBC+A1c at
    LifeLabs\" → \"Cancel Order\".
2.  ORDER-CANCEL-01 modal: reason \"Patient hospitalized --- UHN running
    comprehensive labs\".
3.  T3 re-auth + sign cancel.
4.  Documo: cancellation notice e-fax to LifeLabs Bloor.
5.  Patient app: status update \"Cancelled by clinician\".
6.  Audit: order.cancelled + reason + actor.
7.  CarePlan (Doc 6) auto-detects hospitalization → status=on-hold;
    subplan\'lar paralel.

**Sonuç:** Cancel workflow + cross-doc state machine.

§12 --- Açık Konular
--------------------

### 12.1 V0 Launch Öncesi

-   Documo BAA + Canada Central data residency contract final
-   Pharmacy directory 500+ Ontario seed data verification (fax numbers,
    hours)
-   Lab + imaging directory ON seed data
-   Specialist directory ON \~5000 entries (OPSP-derived) + curation
-   Allergy cross-check rule engine (cross-reactive drug class mapping)
-   Drug duplicate detection window (7d default; class-aware)
-   E-fax cost budget per-org default
-   Provincial NP scope validation rules (Ontario MVP)
-   Bedrock translate prompt for patient-friendly order display
-   PDF requisition/Rx template design (Sinalytix-branded, anti-fraud
    barcode V1)

### 12.2 V1 Spec

-   Refill workflow + standing orders
-   Renewal workflow
-   Controlled substance Rx (Foundation \#3): web-only + T4 + Narcotic
    Monitoring System integration
-   Ocean Health eReferral FHIR integration
-   Order templates (saved sets)
-   LLM-suggested follow-up orders (Doc 5 + Doc 7 integration)
-   Result manual link UI (orphan resolution)
-   Allied Health discipline-specific orders (PT/OT subspecialty
    referrals)
-   Multi-province pharmacy + lab + imaging + specialist directory
    expansion
-   Pharmacy fill confirmation callback (V1 vendor partnership)
-   Patient-initiated refill request (Patient app → HCP approve)

### 12.3 V2+

-   Infoway PrescribeIT integration (national e-prescribing)
-   DURx integration (drug interaction + duplication clinical decision
    support)
-   Imaging scheduling integration
-   Hospital ADT discharge orders auto-import
-   AI clinical decision support (SaMD Class II)
-   Cross-province order forwarding
-   Order analytics dashboard (org-level)
-   Real-time pharmacy inventory check

### 12.4 Cross-App Reconciliation

-   Patient app order display contract
-   Patient-initiated order request (refill V1, new order V2)
-   Pharmacy fill confirmation cross-app
-   Insurance / billing integration (out of scope; Sinalytix billing
    separate module)
-   Caregiver order visibility scope

### 12.5 Klinik Review

-   Allergy cross-check rule completeness (PMR + pharmacy expert review)
-   Drug duplicate detection sensitivity (clinical override patterns)
-   Pharmacy directory verification process (fax numbers accuracy)
-   Specialist directory accepting-new-referrals accuracy (often stale)
-   Order cancellation provider notification effectiveness
-   Patient-friendly order display tone (Bedrock translate quality)

### 12.6 Pilot Feedback Tuning

-   Per-HCP per-day order count (workflow load)
-   E-fax success rate org-by-org
-   Tier 1 result auto-link match precision/recall
-   Allergy warning override rate (clinical patterns)
-   Order cancel rate + reason distribution
-   Specialist referral response time (V1 SLA tracking validation)

### 12.7 Backend Infra

-   Documo retry strategy + backoff tuning
-   PDF generation library (wkhtmltopdf vs Puppeteer vs commercial)
-   Drug picker performance (RxNorm + Canada formulary indexing)
-   Directory geolocation indexing (PostGIS)
-   E-fax cost monitoring + alerting
-   Order autosave conflict resolution (same draft from two devices)
-   Result match LLM-assisted (V1 fuzzy match Doc 5 paterni)

*Sinalytix HCP PRD --- Doc 8: Orders, Prescriptions & Referrals. v1.0
--- 31 Mayıs 2026. Master Doc §5.7 + Foundation \#3 (controlled subst
V1) + Foundation \#7 (Ocean partnership V1) + Doc 1-7 baseline\'ları ile
uyumlu. Q&A pas geçildi; recommended kararlarla yazıldı; kullanıcı son
kontrol.*

> **\[İNSAN REVIEW GEREKLİ\]** Doc 8 düşük-güven: "Q&A pas geçildi; recommended kararlarla yazıldı". İçeriği bu reconciliation pass'inde **çözülmedi** (yalnız bayrak); insan/klinik danışman gözden geçirmesi gerekir.

Table of Contents {#table-of-contents-8 .TOC-Heading}
=================

Sinalytix HCP PRD --- Doc 9: Communication, Visit Management & Care Team
========================================================================

**Versiyon:** v1.0 (Karara bağlanan öneriler --- kullanıcı son kontrol
bekliyor) **Tarih:** 31 Mayıs 2026 **Sahip:** Sinalytix Ürün & Klinik
Ekibi **Statü:** Drafted (Q&A skipped per user direction) **Bağlı
Dokümanlar:** Master Doc §3.2 (4-rol katmanı + MRP designation) + §3.3
(çatışma çözümü) + §5.8 + §5.9 + §5.11, Foundation \#2 (EVV V2), Doc 1-8
baseline

§0 --- Karara Bağlanan Öneriler (Kullanıcı Onay Bekliyor)
---------------------------------------------------------

  \#     Karar Noktası                           Önerilen                                                                                                 Gerekçe
  ------ --------------------------------------- -------------------------------------------------------------------------------------------------------- ----------------------------------------
  D1.1   Messaging resource model                FHIR Communication + Sinalytix threading layer                                                           Standard + flexible threading
  D1.2   Messaging participants MVP              HCP↔HCP intra-org + HCP↔Patient/Family; cross-org V1                                                     Operational scope + consent complexity
  D1.3   Push notif                              Unified notif primitive: FCM/APNs + in-app + email digest opt-in                                         Cross-app reconciliation hazırlığı
  D1.4   Message immutability                    Once sent: immutable; edit V1; soft delete (audit-retained) MVP                                          Legal record + practical UX
  D2.1   WebRTC voice/video                      V1 (Continuation Brief); MVP --- no calls; Twilio Programmable Video V1 (Canada region, PHIPA)           Scope discipline
  D2.2   Call recording integration              V1 + Doc 7 AI Scribe pipeline                                                                            Single LLM stack
  D2.3   Visit management MVP                    Timestamp-based check-in/check-out (mobile primary); EVV V2 (Foundation \#2)                             Foundation lock
  D3.1   Visit ↔ Note linkage                    Visit complete → \"Document Visit\" CTA → Doc 7 pre-populated SOAP note                                  Workflow speed
  D3.2   Visit scheduling                        MVP basic visit log only (manual entry); calendar integration V1                                         Out of MVP scope
  D4.1   Care Team display                       FHIR CareTeam + Patient 360 (Doc 4) sticky header (already specified) + Doc 9 mgmt UI                    Cross-doc consistency
  D4.2   MRP designation + transfer              MVP basic: CC initiate transfer + new MRP accept + patient notify + audit; V1 structured                 Master Doc §3.2
  D4.3   Care team membership change             Doc 6 B3.3 orphan subplan paterni + Doc 9 yumuşak workflow                                               Cross-doc paterni
  D4.4   Conflict resolution (Master Doc §3.3)   MVP basic: comment thread on plan/decision; V1 structured CC-MRP-Discipline dialog with decision audit   Yumuşak başlangıç
  D5.1   Notification primitive                  Unified `Notification` resource (Sinalytix custom over FHIR Communication) --- cross-app shareable       Cross-app reconciliation hazırlığı
  D5.2   Sensitive comm                          Doc 4+5 lockbox respect; per-message sensitive flag                                                      Klinik safety

§1 --- Bağlam ve Amaç
---------------------

### 1.1 Tanım

**Communication, Visit Management & Care Team**, HCP\'lerin
birbirleriyle ve patient/family ile iletişim kurması, ev ziyaretlerini
kaydetmesi, ve klinik ekip yapısını (üyeler + MRP designation + transfer
+ conflict resolution) yönetmesini sağlayan modüldür. Üç birbirini
destekleyen alan:

1.  **Secure Messaging:** HCP↔HCP + HCP↔Patient/Family thread\'leri;
    FHIR Communication; sensitive lockbox respect; Doc 9 unified
    Notification primitive feed.
2.  **Visit Management:** Mobile-primary check-in/check-out timestamp;
    visit complete → Doc 7 SOAP note flow; EVV (GPS + attestation) V2.
3.  **Care Team:** Master Doc §3.2 4-rol katmanı
    (CC/MRP/Specialist/Allied Health) --- display, MRP designation,
    transfer workflow, conflict resolution thread.

### 1.2 Giriş Noktaları

  Giriş Noktası                                                          Tetikleyici
  ---------------------------------------------------------------------- ---------------------------
  Worklist (Doc 3) --- \"Message\" CTA per patient                       HCP yeni thread başlatır
  Patient 360 (Doc 4) --- sticky header Care Team chip \"Open Team\"     Care team mgmt
  Patient 360 --- \"Send Message\" CTA                                   Patient context messaging
  Care Plan (Doc 6) --- \"Notify Team\" CTA                              Plan change broadcast
  Inbox / Worklist Messages tab                                          Unread thread badge
  Visit \"Start Check-In\" CTA (mobile primary)                          Saha ev ziyareti
  Patient app messaging                                                  Patient-initiated thread
  Notification: push/email digest opt-in                                 Cross-event consolidate
  Conflict thread (V1 structured): Plan-level CC↔MRP↔discipline dialog   
  MRP designation transfer modal (CC initiate)                           

### 1.3 Hedef Rol Matrisi

  Rol                            Communication Yetkisi                                                                   Visit Mgmt                              Care Team Mgmt
  ------------------------------ --------------------------------------------------------------------------------------- --------------------------------------- ----------------------------------------------------------------------
  CC                             Initiate any thread; team broadcast; MRP transfer initiate; conflict thread moderator   Visit log review                        Team mgmt + MRP transfer initiate
  MRP                            Threads within scope; accept MRP transfer; conflict thread participant                  Visit log review (oversight)            Accept MRP transfer; conflict resolution final say (Master Doc §3.3)
  Allied Health                  Discipline threads; team thread participate                                             Visit check-in/check-out (own visits)   Team member view
  Specialist (kendi org)         Consultation thread (Doc 7 ile bridge)                                                  Visit log own                           Team view (cross-org via consent)
  Patient / Caregiver / Family   Patient app --- initiate thread with care team; visit feedback (V1)                     Visit history view                      Care team view (consent-scope)
  Org Admin                      Configuration only                                                                      Visit policy config (V1)                MRP/CT policy config (V1)

### 1.4 Ekosistem Konumu

*Home care\'de communication tarihsel olarak parçalı --- telefon, faks,
kişisel mesajlaşma (WhatsApp/SMS klinik dışı kullanım yaygın PHIPA
risk). Sinalytix unified PHIPA-compliant in-app messaging + voice/video
V1 + visit log + care team mgmt = rakipler için partition\'lı modüller,
Sinalytix için tek tutarlı klinik communication mimarisi.*

Stratejik moat:

-   **Patient-controlled messaging (Foundation \#5):** Patient kendi HCP
    team\'iyle direct PHIPA-compliant mesajlaşır; WhatsApp/SMS PHIPA
    gap\'i kapanır.
-   **Visit ↔ Note ↔ Plan closed loop:** Visit check-in → AI scribe
    recording (Doc 7) → note sign → plan update (Doc 6); rakip
    platformlar bu loop\'u manuel takip eder.
-   **MRP designation + transfer (Master Doc §3.2):** Klinik
    accountability net; rakip platformlar tipik olarak \"manager
    assigns\" model\'i (lider ad-hoc); Sinalytix explicit clinical
    responsibility chain.

### 1.5 Regülasyon

-   **PHIPA + provincial parallels:** Tüm messaging + visit + care team
    change PHI; audit (Doc 2).
-   **FHIR R4 + CA Core+:** Communication, CareTeam, Encounter (visit),
    Practitioner, PractitionerRole.
-   **Provincial scope-of-practice:** MRP designation provincial College
    rules (örn. ON RHPA Most Responsible Practitioner).
-   **AWS Canada Central:** Mesaj + visit + audio/video V1 storage.
-   **Twilio Programmable Video PHIPA-compliant Canada region (V1):**
    BAA-style agreement.

§2 --- Endüstri ve Klinik Bağlam
--------------------------------

### 2.1 Home Care Communication Pain Points

-   **WhatsApp/SMS gri zone:** HCP\'ler patient/family ile gayri-resmi
    mesajlaşır → PHIPA exposure risk; documentation gap; consent
    unclear.
-   **Telefon takibi:** Geri arama döngüleri; phone tag; documentation
    eksik.
-   **Email yetersiz:** PHIPA-compliant olmayan; thread management
    zayıf.
-   **Mobile push notif eksik:** EMR notif\'leri masaüstü-bound; saha
    HCP late.

Sinalytix MVP unified messaging + push notif PHIPA-compliant +
audit-trail; pilot HCP feedback: \"WhatsApp\'tan kurtuldum\" net.

### 2.2 Visit Management Reality

-   Home care HCP günde 4-8 ev ziyareti yapar.
-   Vergi/fonlama (Ontario LHIN) için visit verification gerekiyor.
-   EVV (Electronic Visit Verification --- GPS + attestation) ABD\'de
    federal mandate (21st Century Cures Act); Kanada provincial
    planlanıyor.
-   MVP basic timestamp check-in/check-out; V2 full EVV (Foundation
    \#2).

### 2.3 Care Team Klinik Karmaşası

-   Multi-disciplinary home care (CC + MRP + 3-5 allied health +
    occasional specialist) klinik norm.
-   MRP designation tarihsel olarak family physician default; ama
    palliative/specialty pivot durumlarında değişir.
-   Master Doc §3.3 conflict resolution: CC ↔ MRP ↔ discipline diyalog;
    MVP basic comment thread; V1 structured dialog with decision audit.

### 2.4 Master Doc §3.3 Conflict Resolution Implementation

*\"PT subplan\'i ile master plan goal arasında uyumsuzluk\" gibi
durumlar (Doc 6 collision warning tetiklenir); Doc 9 conflict thread bu
diyaloğa platform sağlar.*

-   Collision warning (Doc 6) → \"Open conflict thread\" CTA
-   Thread: master plan goal + subplan goal yan yana; comments per
    participant (CC + MRP + discipline)
-   MRP final say record (V1 structured); audit chain
-   Resolution outcome → plan update veya subplan revise

§3 --- Kapsam ve Kısıtlar
-------------------------

### 3.1 V0 (MVP)

**Secure Messaging:**

-   FHIR Communication + Sinalytix threading layer
-   Participants: HCP↔HCP intra-org + HCP↔Patient/Family
-   Cross-org messaging V1 (consent-aware)
-   Threading per patient context
-   Per-message immutability on send; soft delete V1 (audit-retained)
-   Attachment support (PDF/image --- Doc 5 ingestion gates)
-   Sensitive flag per message (auto-detect or manual; Doc 4 lockbox
    respect)
-   Read receipts opt-in V1; MVP basic delivered/read

**Push Notification + Unified Primitive:**

-   Sinalytix custom Notification resource (cross-app shareable)
-   FCM (Android) + APNs (iOS) + in-app + email digest (HCP opt-in)
-   Per-event-type subscription (e.g., \"Co-sign requests only
    critical\")
-   Cross-doc events feed: new message, co-sign request, result
    available, conflict opened, MRP transfer, etc.

**Voice/Video Calls:**

-   MVP: scope dışı (Continuation Brief V1)
-   V1: Twilio Programmable Video Canada region; PHIPA-compliant BAA
-   V1: AI Scribe pipeline integration (Doc 7); call recording opt-in

**Visit Management:**

-   Mobile-primary check-in/check-out timestamp (V0)
-   Visit notes pre-populate (Doc 7 SOAP visit note flow)
-   Visit log per patient + per HCP
-   EVV (GPS + attestation) V2 (Foundation \#2)
-   Visit scheduling V1 (basic calendar integration; V2 vendor
    scheduling)

**Care Team:**

-   FHIR CareTeam resource (Doc 4 sticky header already specified)
-   Member list with discipline + role + license
-   MRP designation: Patient resource extension (currentMRP) +
    CareTeam.participant role
-   MRP transfer workflow MVP basic:
    -   CC initiate \"Transfer MRP\" → new MRP accept invitation →
        patient/family notify → audit + Care Plan version snapshot
-   Care team change auto-emit orphan event (Doc 6 B3.3 paterni)

**Conflict Resolution:**

-   MVP basic: per-plan/per-decision comment thread (FHIR Communication
    threaded)
-   Participants: CC + MRP + relevant discipline
-   V1: structured \"Conflict Thread\" resource with decision outcome +
    audit
-   Master Doc §3.3 final say MRP (clinical decisions) / CC
    (coordination) --- V1 explicit

**Audit + PolicyEngine + Data Residency:**

-   All CRUD + message send + read + visit timestamp + care team
    change + MRP transfer + conflict thread audit
-   PolicyEngine every access
-   Canada Central residency

### 3.2 V1

-   Voice/video calls (Twilio Programmable Video Canada; PHIPA BAA)
-   Call recording (opt-in) + AI Scribe pipeline (Doc 7)
-   Cross-org messaging (Patient consent grant + cross-org HCP context)
-   Read receipts
-   Message edit (within 5min) + soft delete (audit-retained)
-   Visit scheduling basic calendar
-   Structured conflict resolution thread + decision audit
-   Voice/video session quality + WebRTC TURN fallback
-   Patient-initiated voice call to care team (Patient app)
-   Care team broadcast announcement (CC → all members)
-   Notification preferences per-event-type granular

### 3.3 V2

-   EVV (GPS + attestation; provincial reporting) --- Foundation \#2
-   Visit scheduling vendor integration
-   Real-time MDT collaborative care plan whiteboard (Master Doc §3.3
    real-time)
-   Sensitive message auto-detect (LLM, Doc 5 B2.4 paterni)
-   Cross-province care team transfer (newcomer patient)
-   Patient-initiated video call request
-   AI-summarized message thread (V1+ option)
-   Group video call (MDT meeting)

### 3.4 V3 {#v3-2}

-   AI-powered routing suggestion (auto-suggest reviewer for incoming
    message)
-   Visit prediction (next visit slot recommendation)
-   Care team performance analytics

### 3.5 Constraints

-   FHIR Communication + CareTeam + Encounter resources
-   Audit her CRUD
-   PolicyEngine every access
-   Canada Central residency
-   Sensitive lockbox respect (Doc 4 + Doc 5 alignment)
-   MRP transfer T4 elevated (Doc 6 B2.1 matrix)
-   Care team change → orphan subplan event (Doc 6 B3.3 paterni)

### 3.6 Non-Goals

-   Voice/video calls MVP (V1)
-   EVV MVP (V2 Foundation \#2)
-   AI clinical decision support (SaMD)
-   Cross-app message bridge (V1+ reconciliation)
-   Group video conferencing (V2)

§4 --- Akışlar
--------------

### 4.1 Secure Messaging --- HCP↔HCP Thread

    sequenceDiagram
        participant CC as CC
        participant UI as Messaging UI
        participant PE as PolicyEngine
        participant Comm as Communication Service
        participant Notif as Notification Service
        participant Recipient as Recipient HCP
        participant AL as Audit Log

        CC->>UI: Worklist → patient → "Message PT Marcus"
        UI->>PE: evaluate(participants, patient_context)
        PE-->>UI: Allow
        CC->>UI: Type message + attach file optional + sensitive flag
        UI->>Comm: POST /Communication (status=in-progress)
        Comm->>Comm: Create resource + thread reference
        Comm->>AL: event_type=message.sent
        Comm->>Notif: Emit notification event
        Notif->>Recipient: Push (FCM/APNs) + in-app badge + email digest opt-in
        Recipient->>UI: Tap notif → thread view
        UI->>Comm: GET thread + mark message as read
        Comm->>AL: event_type=message.read + actor + ts
        Recipient->>UI: Reply
        UI->>Comm: POST /Communication (thread continuation)
        Note over Comm: Once sent immutable; soft delete V1

**Kritik kurallar:**

1.  Thread context per patient + per participants subset.
2.  Immutable on send; soft delete V1 (audit-retained).
3.  Sensitive flag → Doc 4 lockbox respect (consent-scope).
4.  Attachment Doc 5 ingestion gates (virus scan, file format
    whitelist).
5.  PolicyEngine every access (recipient role + consent + sensitive
    scope).

### 4.2 Patient↔HCP Messaging

    flowchart TD
        A[Patient app — "Message care team"] --> B[Thread type: General | Care team broadcast]
        B --> C[Patient types message + attachment optional]
        C --> D[Sinalytix backend: PolicyEngine consent-scope check]
        D --> E[Communication.subject = Patient/<id>, sender = Patient]
        E --> F[Recipients: all active care team OR specific HCP]
        F --> G[Notification to recipients]
        G --> H[HCP reads in worklist Messages inbox + thread view]
        H --> I[HCP reply]
        I --> J[Patient app push notif + read receipt V1]
        J --> K[Thread persists; patient can review history]

**Kritik kurallar:**

1.  Patient app messaging consent-scope (Doc 10): patient → care team
    OK; cross-org blocked unless consent.
2.  Sensitive thread (e.g. mental health) patient-can-mark sensitive →
    lockbox.
3.  HCP response SLA target (org config V1): \"24h Saaten içinde yanıt\"
    target.
4.  Family caregiver messaging (consent-scope; patient explicit grant).

### 4.3 Care Team Display (Doc 4 Header Already; Doc 9 Mgmt)

    flowchart TD
        A[Patient 360 sticky header — Care Team chip] --> B[Open Care Team panel]
        B --> C[Member list: photo + name + role + discipline + active status + last interaction]
        C --> D[MRP designation badge — yellow star]
        C --> E[Add member CTA — CC initiate]
        E --> F[Practitioner directory pick — org practitioners]
        F --> G[Confirm + audit + notify added HCP]
        C --> H[Remove member CTA — CC or self]
        H --> I[Confirm + orphan subplan event Doc 6 B3.3]
        C --> J[Transfer MRP CTA — CC initiate T4 elevated]
        J --> K[See 4.4]

### 4.4 MRP Designation Transfer

    sequenceDiagram
        participant CC as CC
        participant UI as Care Team Mgmt UI
        participant CurrentMRP as Current MRP
        participant NewMRP as New MRP
        participant Patient as Patient/Family
        participant CT as CareTeam Service
        participant Plan as CarePlan Service (Doc 6)
        participant Auth as T4 Auth (elevated)
        participant AL as Audit Log

        CC->>UI: Care Team panel → "Transfer MRP"
        UI->>UI: Reason input + new MRP selection (org practitioners pickable as MRP)
        CC->>Auth: T4 re-auth (elevated, Doc 6 B2.1 matrix)
        Auth-->>UI: Token valid
        UI->>CT: POST /careteam/transfer-mrp
        CT->>NewMRP: Notif "Pending MRP invitation for Patient X"
        NewMRP->>UI: Open notif → review patient context → "Accept" or "Decline"
        alt Accept
            NewMRP->>Auth: T3 re-auth
            Auth-->>UI: Token valid
            NewMRP->>CT: POST /careteam/accept-mrp-transfer
            CT->>CT: currentMRP = NewMRP/<id>; previousMRP archived
            CT->>Plan: Create CarePlan milestone snapshot "MRP transfer: Dr. A → Dr. B"
            CT->>Patient: Notif "Your MRP changed to Dr. B"
            CT->>CurrentMRP: Notif "MRP responsibility transferred"
            CT->>AL: event_type=careteam.mrp_transferred + chain
        else Decline
            NewMRP->>CT: POST /careteam/decline-mrp-transfer + reason
            CT->>CC: Notif "Dr. B declined; choose alternative"
            CT->>AL: event_type=careteam.mrp_transfer_declined
        end

**Kritik kurallar:**

1.  T4 elevated (Doc 6 B2.1 matrix add).
2.  Patient/family notify yumuşak (sensitive announcement).
3.  Plan milestone snapshot auto.
4.  New MRP must accept (no auto-assign without consent).
5.  Audit chain full.

### 4.5 Care Team Member Removal --- Orphan Subplan Trigger (Doc 6 B3.3 Bridge)

    flowchart TD
        A[CC removes member or HCP self-leave] --> B[CareTeam.participant removed]
        B --> C[Audit event_type=careteam.member_removed]
        C --> D{HCP has active subplan?}
        D -->|Yes| E[Doc 6 B3.3 orphan event tetiklenir]
        D -->|No| F[Notify others; complete]
        E --> G[PLAN-ORPHAN-01 dashboard CC alert]

### 4.6 Visit Check-In / Check-Out (Mobile Primary)

    sequenceDiagram
        participant HCP as HCP (saha)
        participant UI as Mobile App
        participant Visit as Visit Service
        participant Note as Doc 7 Note Service
        participant AL as Audit Log

        HCP->>UI: Worklist → patient → "Start Visit"
        UI->>Visit: POST /Encounter (status=in-progress, period.start=now)
        Visit-->>UI: Visit_id; check-in timestamp recorded
        Visit->>AL: event_type=visit.check_in + actor + ts + location (mobile)
        HCP->>HCP: Provide care (AI Scribe Doc 7 can start parallel)
        HCP->>UI: "End Visit"
        UI->>Visit: PATCH /Encounter (status=finished, period.end=now)
        Visit-->>UI: Check-out timestamp
        Visit->>AL: event_type=visit.check_out
        UI->>HCP: "Document Visit" CTA → Doc 7 SOAP note pre-populated with Encounter ref + duration
        HCP->>Note: Doc 7 flow (AI Scribe or manual)
        Note->>Visit: Note signed → Encounter.diagnosis/note linked

**Kritik kurallar:**

1.  MVP: timestamp only; EVV (GPS + attestation) V2.
2.  Visit pre-populates Doc 7 SOAP note (patient + duration +
    start/end + Encounter ref).
3.  Visit ↔ AI Scribe parallel possible.
4.  Visit cancel/no-show: separate status (status=cancelled with
    reason).

### 4.7 Conflict Resolution Thread (Master Doc §3.3 MVP Basic)

    flowchart TD
        A[Doc 6 collision warning detected: master goal vs subplan goal conflict] --> B["'Open Conflict Thread' CTA"]
        B --> C[Communication thread created with participants: CC + MRP + relevant discipline]
        C --> D[Initial post: collision context + plan goals diff]
        D --> E[Participants comment + discuss]
        E --> F{Resolution outcome}
        F -->|Plan update agreed| G[CC updates master plan version]
        F -->|Subplan revise| H[Discipline updates subplan version]
        F -->|MRP overrides| I[MRP final say recorded V1 structured]
        G --> J[Thread marked resolved + outcome note]
        H --> J
        I --> J
        J --> K[Audit chain: collision detect → thread → resolution]

**Kritik kurallar:**

1.  MVP: free-form thread comment.
2.  V1: structured Conflict Thread resource with decision outcome enum.
3.  MRP final say (Master Doc §3.3); CC orkestrasyon.
4.  Audit chain full (decision accountability).

### 4.8 Unified Notification Primitive

    flowchart TD
        A[Cross-doc event source: new message, co-sign request, result available, plan published, conflict opened, MRP transfer, etc.] --> B[Sinalytix Notification Service]
        B --> C[Resolve recipient HCP + preferences]
        C --> D{Per recipient channel}
        D --> E[Push FCM/APNs]
        D --> F[In-app badge]
        D --> G[Email digest opt-in]
        D --> H[V1: SMS opt-in for urgent]
        E --> I[Mobile app open → notif tap → deep link to event source]
        F --> I
        G --> J[Daily/Weekly digest email]

**Kritik kurallar:**

1.  Single notification resource → multi-channel fan-out.
2.  Per-event-type subscription preferences.
3.  Cross-app reconciliation hazır (Patient/Caregiver/Family aynı
    primitive).
4.  Audit per notification dispatch.

§5 --- Ekran/Yüzey Spec
-----------------------

### 5.1 Ekran Envanteri

  Ekran ID             İsim                                       Mobile      Web      Birincil Rol
  -------------------- ------------------------------------------ ----------- -------- ---------------------
  MSG-INBOX-01         Messages Inbox (per HCP, multi-thread)     ✓           ✓        HCP
  MSG-THREAD-01        Message Thread View                        ✓           ✓        HCP, Patient/Family
  MSG-COMPOSE-01       Compose Message Modal                      ✓           ✓        HCP, Patient/Family
  MSG-BROADCAST-01     Team Broadcast Modal                       Lite        ✓        CC
  NOTIF-CENTER-01      Notifications Center                       ✓           ✓        HCP, Patient/Family
  NOTIF-PREFS-01       Notification Preferences Settings          ✓           ✓        HCP, Patient/Family
  VISIT-START-01       Start Visit (mobile primary)               ✓ Primary   Lite     HCP
  VISIT-LOG-01         Visit Log per Patient                      ✓           ✓        Care team
  VISIT-DETAIL-01      Visit Detail View                          ✓           ✓        Care team
  TEAM-PANEL-01        Care Team Panel (Doc 4 header extension)   ✓           ✓        Care team, Patient
  TEAM-MGMT-01         Care Team Management UI                    Lite        ✓ Full   CC
  MRP-TRANSFER-01      MRP Transfer Modal (T4)                    ✓           ✓        CC + NewMRP
  CONFLICT-THREAD-01   Conflict Resolution Thread                 Lite        ✓ Full   CC, MRP, discipline
  CALL-V1-01           Voice/Video Call UI (V1)                   ✓           ✓        HCP, Patient/Family

### 5.2 MSG-INBOX-01 --- Messages Inbox

**Web (React):**

-   Sidebar nav: Messages (count badge)
-   Left panel: thread list (unread first)
    -   Patient avatar + name
    -   Latest message preview
    -   Timestamp
    -   Sender (HCP name/role or \"Patient/Family\")
    -   Unread badge
-   Right panel: selected thread view (MSG-THREAD-01 embed)
-   Filter: by patient, by sender role, by date, unread only
-   New Thread CTA

**Mobile (RN):**

-   Tab bar Messages icon + badge
-   List view; tap → MSG-THREAD-01 ayrı screen
-   Pull-to-refresh

### 5.3 MSG-THREAD-01 --- Message Thread

**Mobile + Web:**

-   Header: patient mini-card + participants list (avatars)
-   Body: chronological messages
    -   Per message: sender + ts + text + attachments + read receipt V1
    -   Sensitive flag indicator (Doc 4 lockbox alignment)
-   Input box (bottom): text + attach + sensitive flag toggle
-   Send CTA

### 5.4 NOTIF-CENTER-01 --- Notifications Center

**Mobile + Web:**

-   Top tab in nav (bell icon + badge)
-   List: unified events (messages, co-signs, results, plan updates,
    conflicts, MRP transfer)
-   Per event: icon (type) + title + ts + tap action (deep link)
-   Filter: by event type, unread only

### 5.5 VISIT-START-01 --- Start Visit (Mobile Primary)

**Mobile (RN) --- Primary:**

-   Worklist patient → \"Start Visit\" big CTA
-   Confirmation: \"Starting visit at \[time\]. Continue?\"
-   Active state: visit timer + visit context (patient mini-card +
    active care plan summary)
-   \"End Visit\" CTA
-   Quick aksiyon during visit: AI Scribe start (Doc 7), add visit note
    inline (V1), call patient (V1)

### 5.6 VISIT-LOG-01 --- Visit Log per Patient

**Mobile + Web:**

-   Doc 4 Patient 360 → \"Visits\" tab
-   List: chronological visit history
-   Per visit: HCP avatar + role + start/end + duration + linked note
    (Doc 7 reference)
-   Filter: by HCP discipline, by date

### 5.7 TEAM-PANEL-01 --- Care Team Panel (Doc 4 Header Extension)

**Mobile + Web:**

-   Patient 360 sticky header → Care Team chip tap → panel slide-in
-   Member list:
    -   Avatar + name + discipline + role badge (MRP star, CC label, NP,
        etc.)
    -   Active status
    -   Last interaction
    -   Tap → quick actions (Message, View profile)
-   CC has additional actions: Add Member, Transfer MRP, Remove Member

### 5.8 MRP-TRANSFER-01 --- MRP Transfer Modal

**Web + Mobile:**

-   T4 elevated re-auth Doc 2 spec
-   New MRP picker (org practitioners eligible)
-   Reason input + clinical justification
-   Patient notify preview (\"New MRP: Dr. B effective \[date\]\")
-   Submit → trigger NewMRP accept flow (notification + accept screen)

### 5.9 CONFLICT-THREAD-01 --- Conflict Resolution Thread

**Web (React) --- Full UX:**

-   Top: collision context (master goal vs subplan goal side-by-side)
-   Body: thread comments (CC + MRP + relevant discipline +
    chronological)
-   \"Mark Resolved\" CTA at end (CC initiate) → outcome selection (Plan
    updated / Subplan revised / MRP override / Other)
-   V1: structured decision audit

**Mobile (RN):**

-   Light view + comment add; \"Mark resolved on web\"

### 5.10 CALL-V1-01 --- Voice/Video Call (V1)

**Mobile + Web (V1):**

-   Twilio Programmable Video integration
-   Call initiator: patient row → \"Call\" CTA
-   Pre-call: consent prompt (recording opt-in for AI Scribe pipeline
    Doc 7)
-   Active call: video tiles + mute/camera/screen-share (V1+) + AI
    Scribe transcript stream
-   End call → option \"Document this call\" → Doc 7 SOAP visit note
    pre-populated

### 5.11 Ekran-Arası Etkileşim

-   **Worklist (Doc 3) ↔ Messages inbox:** Unread badge sidebar
-   **Patient 360 (Doc 4) ↔ Care Team panel:** Sticky header tap
-   **Visit ↔ Doc 7 Note:** Visit end → \"Document Visit\" CTA → Note
    editor pre-populated
-   **Care Plan (Doc 6) ↔ Conflict thread:** Collision warning → open
    thread
-   **Notification center ↔ Cross-app primitive:** Unified events feed

§6 --- Veri Modeli (FHIR R4 + CA Core+)
---------------------------------------

### 6.1 FHIR Resource Kullanımı

  Resource                              Kullanım
  ------------------------------------- --------------------------------------------------------------------------
  `Communication`                       Messaging (HCP↔HCP, HCP↔Patient/Family, broadcast, conflict thread)
  `CareTeam`                            Patient care team (members + roles + MRP designation)
  `Encounter`                           Visit (timestamp check-in/check-out; V2 EVV with location + attestation)
  `Practitioner` / `PractitionerRole`   Member identity + scope
  `Patient`                             Subject + Patient.generalPractitioner (MRP designation)
  `RelatedPerson`                       Family caregiver (Doc 5 paterni)
  `Provenance`                          Care team change, MRP transfer audit
  `DocumentReference`                   Message attachments (Doc 5 ingestion gates)
  `Consent`                             Patient cross-org consent (Doc 10) for cross-org messaging V1

### 6.2 Communication Profile (Messaging)

    Communication:
      id: <uuid>
      status: preparation | in-progress | not-done | on-hold | stopped | completed | entered-in-error | unknown
      category:
        - { system: "https://sinalytix.ca/codes/comm-category", code: "hcp_hcp | hcp_patient | broadcast | conflict_thread" }
      priority: routine | urgent | asap | stat
      subject: Reference(Patient/<id>)
      about: [Reference(<related resource>)]  # e.g. CarePlan, ServiceRequest, Note
      sender: Reference(Practitioner/<id> | Patient/<id> | RelatedPerson/<id>)
      recipient: [Reference(Practitioner/<id> | Patient/<id> | RelatedPerson/<id>)]
      sent: <ts>
      received: <ts>  # delivered ts (read separately tracked)
      payload:
        - contentString: <message text>
        - contentAttachment:
            contentType: ...
            url: s3://...
            title: ...
      inResponseTo: [Reference(Communication/<previous_id>)]  # thread continuation
      meta:
        tag:
          - { system: "https://sinalytix.ca/codes/sensitive", code: "lockbox" }
        extension:
          - sinalytix-thread-id: <uuid>  # thread grouping
          - sinalytix-read-by: [{ user_id, read_at }]  # read receipts V1
          - sinalytix-deleted-soft: { deleted_at, deleted_by, audit_retained: true } (V1)
          - sinalytix-cross-org-consent-ref (if cross-org V1)

### 6.3 CareTeam Profile (Patient Care Team)

    CareTeam:
      id: <uuid>
      status: proposed | active | suspended | inactive | entered-in-error
      category:
        - { system: "http://snomed.info/sct", code: "780000006", display: "Home care team" }
      subject: Reference(Patient/<id>)
      period: { start, end }
      participant:
        - role: [{ coding: [{ system: "https://sinalytix.ca/codes/role", code: "cc | mrp | specialist | nurse | pt | ot | slp | rd | rn | np" }] }]
          member: Reference(Practitioner/<id>)
          onBehalfOf: Reference(Organization/<id>)
          period: { start, end }
      reasonReference: [Reference(Condition/<id>)]
      managingOrganization: [Reference(Organization/<primary_org>)]
      note: [Annotation]
      meta:
        extension:
          - sinalytix-current-mrp: Reference(Practitioner/<id>)
          - sinalytix-mrp-history: [{ practitioner_id, started_at, ended_at, transfer_reason }]
          - sinalytix-pending-mrp-transfer: { new_mrp_id, initiated_by, initiated_at } (during transfer)

### 6.4 Encounter Profile (Visit)

    Encounter:
      id: <uuid>
      status: planned | arrived | triaged | in-progress | onleave | finished | cancelled | entered-in-error | unknown
      class:
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "HH", display: "Home Health" }]
      subject: Reference(Patient/<id>)
      participant:
        - type: [{ coding: [{ code: "PPRF", display: "Primary performer" }] }]
          individual: Reference(Practitioner/<hcp_id>)
      period: { start: <check_in>, end: <check_out> }
      serviceProvider: Reference(Organization/<org_id>)
      meta:
        tag:
          - { system: "https://sinalytix.ca/codes/visit-type", code: "home_visit | telehealth | phone_encounter" }
        extension:
          - sinalytix-evv-gps: { latitude, longitude, accuracy_m } (V2)
          - sinalytix-evv-attestation: { signed_by_patient_or_family: bool, ts } (V2)
          - sinalytix-linked-note-id: Reference(DocumentReference/<id>) (Doc 7)
          - sinalytix-linked-ai-scribe-session-id (Doc 7 B3.2)
          - sinalytix-cancellation-reason

### 6.5 Internal PostgreSQL Schema

    -- Notification primitive (cross-app shareable)
    CREATE TABLE notifications (
      id UUID PRIMARY KEY,
      recipient_user_id UUID NOT NULL,
      app_context TEXT NOT NULL CHECK (app_context IN ('hcp', 'patient', 'caregiver', 'family')),
      event_type TEXT NOT NULL,  -- 'message.received', 'cosign.requested', 'result.available', 'plan.published', 'conflict.opened', 'mrp.transferred', etc.
      event_source_resource_type TEXT NOT NULL,
      event_source_resource_id UUID NOT NULL,
      patient_id UUID,
      org_id UUID,
      payload_summary JSONB NOT NULL,  -- title + preview + deep_link
      channels TEXT[] NOT NULL,  -- ['push', 'in_app', 'email'] selected based on preferences
      push_sent_at TIMESTAMPTZ,
      email_sent_at TIMESTAMPTZ,
      in_app_read_at TIMESTAMPTZ,
      dismissed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_notif_recipient ON notifications(recipient_user_id, created_at DESC);
    CREATE INDEX idx_notif_unread ON notifications(recipient_user_id) WHERE in_app_read_at IS NULL AND dismissed_at IS NULL;
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    -- Notification preferences per user
    CREATE TABLE notification_preferences (
      user_id UUID PRIMARY KEY,
      email_digest_enabled BOOLEAN NOT NULL DEFAULT true,
      email_digest_frequency TEXT NOT NULL DEFAULT 'daily',  -- 'daily', 'weekly'
      push_enabled BOOLEAN NOT NULL DEFAULT true,
      per_event_subscriptions JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { 'message.received': true, ... }
      quiet_hours_start TIME,
      quiet_hours_end TIME,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

    -- Message threads (FHIR Communication grouping)
    CREATE TABLE message_threads (
      id UUID PRIMARY KEY,
      patient_id UUID NOT NULL,
      org_id UUID NOT NULL,
      thread_type TEXT NOT NULL CHECK (thread_type IN ('hcp_hcp', 'hcp_patient', 'broadcast', 'conflict_thread')),
      participants UUID[] NOT NULL,  -- user_ids
      sensitive BOOLEAN NOT NULL DEFAULT false,
      conflict_collision_id UUID,  -- if conflict_thread
      last_message_at TIMESTAMPTZ,
      last_message_preview TEXT,
      created_by UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_threads_patient ON message_threads(patient_id, last_message_at DESC);
    CREATE INDEX idx_threads_participant ON message_threads USING gin (participants);
    ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

    -- Visit log (PG cache; FHIR Encounter authoritative)
    CREATE TABLE visits (
      id UUID PRIMARY KEY,
      encounter_resource_id UUID NOT NULL,
      patient_id UUID NOT NULL,
      hcp_user_id UUID NOT NULL,
      org_id UUID NOT NULL,
      visit_type TEXT NOT NULL,
      check_in_at TIMESTAMPTZ NOT NULL,
      check_out_at TIMESTAMPTZ,
      duration_minutes INT,
      linked_note_id UUID,
      linked_ai_scribe_session_id UUID,
      evv_gps JSONB,  -- V2
      evv_attestation JSONB,  -- V2
      cancellation_reason TEXT,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_visits_patient ON visits(patient_id, check_in_at DESC);
    CREATE INDEX idx_visits_hcp ON visits(hcp_user_id, check_in_at DESC);
    ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

    -- MRP transfer log
    CREATE TABLE mrp_transfers (
      id UUID PRIMARY KEY,
      patient_id UUID NOT NULL,
      org_id UUID NOT NULL,
      initiated_by_user_id UUID NOT NULL,  -- usually CC
      previous_mrp_id UUID NOT NULL,
      new_mrp_id UUID NOT NULL,
      reason TEXT NOT NULL,
      initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      accepted_at TIMESTAMPTZ,
      declined_at TIMESTAMPTZ,
      decline_reason TEXT,
      patient_notified_at TIMESTAMPTZ,
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'))
    );
    CREATE INDEX idx_mrp_transfer_patient ON mrp_transfers(patient_id, initiated_at DESC);
    CREATE INDEX idx_mrp_transfer_pending ON mrp_transfers(new_mrp_id, status) WHERE status = 'pending';
    ALTER TABLE mrp_transfers ENABLE ROW LEVEL SECURITY;

    -- Conflict resolution threads (V1 structured)
    CREATE TABLE conflict_threads (
      id UUID PRIMARY KEY,
      patient_id UUID NOT NULL,
      org_id UUID NOT NULL,
      thread_id UUID NOT NULL REFERENCES message_threads(id),
      collision_context JSONB NOT NULL,  -- master goal id + subplan goal id + diff
      initiated_by UUID NOT NULL,
      participants UUID[] NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated')),
      resolution_outcome TEXT,  -- 'plan_updated', 'subplan_revised', 'mrp_override', 'other'
      resolution_actor_id UUID,
      resolution_notes TEXT,
      opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ
    );
    CREATE INDEX idx_conflict_patient_open ON conflict_threads(patient_id) WHERE status = 'open';
    ALTER TABLE conflict_threads ENABLE ROW LEVEL SECURITY;

### 6.6 Audit Event Type Genişlemesi

**Category: message**

  event\_type                   Tetikleyici
  ----------------------------- -----------------------
  `message.sent`                Communication created
  `message.read`                Recipient read
  `message.attachment.added`    Attachment included
  `message.soft_deleted`        V1 soft delete
  `message.cross_org_blocked`   Consent failure

**Category: visit**

  event\_type          Tetikleyici
  -------------------- -----------------------------
  `visit.check_in`     Encounter started
  `visit.check_out`    Encounter finished
  `visit.cancelled`    No-show or cancel
  `visit.documented`   Doc 7 note signed for visit

**Category: careteam**

  event\_type                         Tetikleyici
  ----------------------------------- ------------------------
  `careteam.member_added`             New member joins
  `careteam.member_removed`           Member leaves
  `careteam.mrp_transfer_initiated`   CC starts MRP transfer
  `careteam.mrp_transfer_accepted`    New MRP accepts
  `careteam.mrp_transfer_declined`    Decline
  `careteam.mrp_transferred`          Completed

**Category: conflict**

  event\_type                   Tetikleyici
  ----------------------------- -----------------------------------
  `conflict.thread_opened`      Collision warning → thread create
  `conflict.thread_commented`   Participant comments
  `conflict.resolved`           Outcome marked
  `conflict.escalated`          V1 escalation

**Category: notification**

  event\_type                       Tetikleyici
  --------------------------------- ---------------
  `notification.created`            New notif
  `notification.dispatched_push`    FCM/APNs sent
  `notification.dispatched_email`   Email sent
  `notification.read_in_app`        In-app read
  `notification.dismissed`          User dismiss

### 6.7 PolicyEngine Integration

    // Message create (HCP↔HCP)
    PolicyEngine.evaluate({
      subject: { id: sender.id, role: sender.role },
      action: 'create',
      resource: { type: 'Communication', category: 'hcp_hcp', recipients },
      context: { patient_id, org_id, care_team_membership }
    });

    // Patient messaging (consent-scope)
    PolicyEngine.evaluate({
      subject: { id: patient.id, role: 'patient' },
      action: 'create',
      resource: { type: 'Communication', category: 'hcp_patient' },
      context: { patient_id, target_org_id, consent_grant_active }
    });

    // MRP transfer (T4 elevated)
    PolicyEngine.evaluate({
      subject: { id: cc.id, role: 'cc', auth_tier_session: 'T4' },
      action: 'transfer_mrp',
      resource: { type: 'CareTeam', id: ct.id, current_mrp, new_mrp },
      context: { patient_id, org_id }
    });

    // Visit check-in
    PolicyEngine.evaluate({
      subject: { id: hcp.id, role: hcp.role },
      action: 'start_visit',
      resource: { type: 'Encounter' },
      context: { patient_id, org_id, care_team_membership, consent_scope }
    });

### 6.8 Cross-Doc Bağlantılar

  Doc 9 Resource/Table   Bağlı Doc                                                               İlişki
  ---------------------- ----------------------------------------------------------------------- -----------------------
  `Communication`        Doc 7 conflict thread + Doc 6 broadcast + cross-doc notif               Multi-source
  `CareTeam`             Doc 4 sticky header + Doc 6 plan ownership + Doc 7 co-sign supervisor   Universal team source
  `Encounter` (visit)    Doc 7 note linkage + Doc 8 order context                                Visit → note → orders
  `notifications`        All other docs event sources                                            Unified primitive
  `mrp_transfers`        Doc 6 milestone snapshot auto + Doc 8 order MRP authority check         Plan + order context
  `conflict_threads`     Doc 6 collision warning trigger                                         Master Doc §3.3 ops

§7 --- Hata ve Edge Cases
-------------------------

  Senaryo                                                 Sistem Davranışı                                                       UX
  ------------------------------------------------------- ---------------------------------------------------------------------- -------------------------------------------------------------------
  Push notif device offline                               FCM/APNs queue + retry; in-app badge persists                          \"Yeniden bağlantıda gösterilir\"
  Message recipient not in care team anymore              Message delivered but recipient blocked from open; CC notify           \"Bu kişi artık hasta için care team\'inde değil\"
  Cross-org message (MVP scope dışı)                      Block + redirect \"Cross-org messaging V1\"                            \"Şu an cross-org mesajlaşma desteklenmiyor\"
  Sensitive thread mid-stream consent revoke              Future messages blocked; history retained immutable + access blocked   \"Bu hasta\'nın consent\'i revoke etti --- thread arşivlendi\"
  Visit check-in but no check-out (HCP forgot)            Auto-end after 8h with \"auto-closed\" flag + HCP notif                \"Visit otomatik kapatıldı 22:00; süre teyit edin?\"
  Visit overlap (HCP starts new before ending previous)   UI block + warn                                                        \"Önceki visit henüz açık --- kapatın veya overlap reason girin\"
  MRP transfer accepted by mistake                        T3 unwind window 1h (cancel new MRP designation)                       \"1 saat içinde geri al --- eski MRP geri yüklenir\"
  MRP transfer declined repeatedly                        CC notif + alternative suggestion                                      \"3 alternatif declined; medical director consult önerilir\"
  Conflict thread participants offline                    Notif queued; resolution beklenir                                      \"Tüm participants beklemede; bildirim gönderildi\"
  Notification storm (multiple events same minute)        Batch into single notif (3+ events same recipient within 1min)         \"5 yeni event --- center\'da görüntüle\"
  Attachment file format/size reject (Doc 5 paterni)      UI reject pre-send                                                     \"Bu format desteklenmiyor --- Doc 5 gates\"
  Patient messaging during quiet hours (HCP off-duty)     Delivered + email digest + next-day push                               Patient notif \"Mesajınız ulaştı; ekibiniz 09:00\'da görecek\"
  Visit GPS V2 spoofing attempt                           Detect anomaly (impossibly fast location change); flag + audit         V2
  Care team change during active conflict thread          Thread participants list update; resolved actor preserved              \"Participant değişti --- thread devam ediyor\"

§8 --- Kabul Kriterleri
-----------------------

### 8.1 Fonksiyonel

-   AC-1.1: Messaging FHIR Communication + thread layer; HCP↔HCP +
    HCP↔Patient/Family MVP.
-   AC-1.2: Push notif via FCM/APNs + in-app + email digest opt-in.
-   AC-1.3: Unified Notification primitive cross-doc event sources.
-   AC-1.4: Per-event notification preferences + quiet hours.
-   AC-1.5: Sensitive flag per message + Doc 4 lockbox respect.
-   AC-1.6: Voice/video calls V1 (Twilio Programmable Video Canada).
-   AC-1.7: Visit check-in/check-out timestamp; mobile primary.
-   AC-1.8: Visit → Doc 7 note pre-populate.
-   AC-1.9: Care team display Doc 4 sticky header + Doc 9 mgmt UI.
-   AC-1.10: MRP designation transfer MVP basic (CC initiate + new MRP
    accept + patient notify + audit + plan milestone).
-   AC-1.11: Care team member add/remove + orphan subplan event Doc 6
    B3.3.
-   AC-1.12: Conflict resolution thread MVP basic (free-form
    Communication thread); V1 structured.

### 8.2 Regülasyon ve Güvenlik

-   AC-S.1: All CRUD audit (Doc 2 canonical).
-   AC-S.2: PolicyEngine every access.
-   AC-S.3: Canada Central residency (messages + attachments + visit
    data + V1 video).
-   AC-S.4: PHIPA + provincial parallels.
-   AC-S.5: MRP transfer T4 elevated; signed audit chain.
-   AC-S.6: Cross-org messaging consent-gated V1.
-   AC-S.7: V1 video calls Twilio Canada PHIPA BAA.
-   AC-S.8: Sensitive lockbox alignment Doc 4 + Doc 5.

### 8.3 Teknik ve Performans

-   AC-T.1: Message send latency \< 500ms p95.
-   AC-T.2: Push notif delivery \< 5s p95.
-   AC-T.3: Thread list load \< 1s p95 (50 threads).
-   AC-T.4: Care team panel load \< 500ms p95.
-   AC-T.5: Visit check-in \< 1s p95.
-   AC-T.6: MRP transfer commit \< 2s p95.
-   AC-T.7: Notif center load \< 1s p95.
-   AC-T.8: WebSocket reconnect after drop \< 10s.

§9 --- Başarı Metrikleri
------------------------

### 9.1 Adoption + Engagement

  Metrik                            V0 Hedef               V1 Hedef
  --------------------------------- ---------------------- ----------------------
  HCP daily messaging activity      5-15 messages          10-25
  Patient messaging adoption rate   %25+ patients          %50+
  Visit check-in usage rate         %80+                   %95+
  Notification push opt-in rate     %85+                   %90+
  Care team panel daily open rate   %60+ HCPs              %80+
  MRP transfer frequency            \<2 per patient/year   similar
  Conflict thread usage             1-3 per active plan    2-5 (more proactive)

### 9.2 Quality + Workflow

  Metrik                                V0 Hedef                 V1 Hedef
  ------------------------------------- ------------------------ ----------
  Message response time (HCP)           \<24h avg                \<12h
  Patient message response time         \<8h business hours      \<4h
  Visit check-in / check-out coverage   %95+ visits documented   %99+
  Visit → Note completion within 24h    %85+                     %95+
  MRP transfer SLA (new MRP response)   \<72h                    \<24h
  Conflict resolution time              \<7d                     \<3d

### 9.3 Operational

  Metrik                                                    V0 Hedef   V1 Hedef
  --------------------------------------------------------- ---------- ----------
  Push notif delivery success                               \>%98      \>%99
  Notification batch efficiency (avg events per dispatch)   1-3        2-5
  Voice/video call success rate (V1)                        \>%95      \>%98
  WebSocket connection uptime                               \>%99      \>%99.5

### 9.4 Compliance + Audit

-   AC: Audit completeness %100; cross-border egress 0; sensitive
    lockbox respect %100.

§10 --- UX ve Tasarım Notları
-----------------------------

### 10.1 Messaging --- WhatsApp Familiarity + Klinik Discipline

*Patient/HCP\'lerin WhatsApp benzeri thread deneyimi alışkanlıkları var;
ama Sinalytix klinik discipline + PHIPA-compliant. UX familiar ama
klinik attribute\'lar visible (timestamp + read receipt + sensitive
flag).*

### 10.2 Visit Check-In --- Saha Hızlı UX

*Mobile primary; HCP eve giriş anında 2-tıkla check-in.*

-   Worklist → patient row → \"Start\" big CTA
-   Auto-link patient context; check-out CTA always visible
-   Background sync (offline-tolerant)

### 10.3 Care Team Panel --- Açık + Aksiyon-friendly

*Patient 360 sticky header\'dan tek tıkla; visual hierarchy: MRP yıldız
\> CC label \> discipline badges.*

-   Member card: photo + name + discipline + active status + last seen
-   Tap → quick actions (message, view profile)
-   CC görür \"Add member\" + \"Transfer MRP\" tools

### 10.4 MRP Transfer --- Klinik Sorumluluk Ciddiyeti

*MRP değişikliği klinik aksiyon; UI net + onaylı.*

-   T4 elevated re-auth (ciddiyet)
-   New MRP must accept (consent)
-   Patient notify yumuşak ama açık
-   1h unwind window (mistake recovery)
-   Audit chain full

### 10.5 Conflict Thread --- Master Doc §3.3 Yumuşak Operasyonel

*Conflict thread yapıcı diyalog için tasarım; \"kavga\" değil \"klinik
karar\".*

-   Header: side-by-side conflict context (transparency)
-   Thread comment yapıcı tone hint
-   \"Mark Resolved\" CC initiative
-   V1 structured decision outcome (accountability)

### 10.6 Notification Center --- Unified + Filterable

*Cross-doc events tek yerde; filter event type\'a göre.*

-   Top tab in nav (bell + count)
-   Group by type (Messages, Co-Signs, Results, Plans, etc.)
-   Quiet hours respect
-   Email digest opt-in (HCP work-life)

§11 --- Kullanıcı Senaryoları
-----------------------------

### 11.1 Senaryo: Patient↔CC Messaging

**Aktör:** Patient Maria (Patient app) + CC Anne

**Akış:**

1.  Maria ev\'de tatil yaklaşırken Apixaban\'ını iki haftalığına
    eksiltebilir mi sormak ister.
2.  Patient app → Message care team → \"I\'m traveling next week ---
    should I still take my Apixaban?\"
3.  Sinalytix backend: PolicyEngine consent-scope check → pass; thread
    create (hcp\_patient).
4.  Anne worklist Messages inbox unread badge → tap → read.
5.  Anne MRP Dr. Lee\'ye danışmak için intra-team mini-thread başlatır
    (hcp\_hcp); Dr. Lee yanıt: \"Continue Apixaban; reassure
    travel-friendly\".
6.  Anne Maria\'ya yanıt: \"Maria, evet Apixaban\'ı seyahatte de almaya
    devam edin; özel önlem gerekmez. Soru olursa yine yazın.\"
7.  Maria push notif → read.

**Sonuç:** WhatsApp-grade UX + PHIPA-compliant audit; cross-thread MDT
consultation hızlı.

### 11.2 Senaryo: Visit Check-In + AI Scribe (Doc 7 Bridge)

**Aktör:** PT Marcus

**Akış:**

1.  Marcus arabasıyla Maria\'nın evine gelir; ön kapıda \"Start Visit\"
    CTA mobile.
2.  Visit\_id created; check-in timestamp recorded.
3.  Marcus eve girer; \"AI Scribe Start\" → patient/family consent →
    recording başlar (Doc 7 B3.2).
4.  35dk visit; ROM + balance + family education.
5.  \"End Visit + AI Scribe Stop\" → check-out timestamp + transcript +
    LLM draft.
6.  \"Document Visit\" CTA → Doc 7 NOTE-EDITOR-01 pre-populated:
    -   Visit type: SOAP visit
    -   Patient: Maria T.
    -   Duration: 35min
    -   Encounter ref: visit\_id
    -   AI Scribe draft body + structured panels
7.  Marcus 4dk edit → sign T3.
8.  Visit ↔ Note linkage: Encounter.sinalytix-linked-note-id;
    Note.context.encounter.

**Sonuç:** Closed-loop visit → note pipeline; klinik workflow seamless.

### 11.3 Senaryo: MRP Transfer (Palliative Pathway)

**Aktör:** CC Anne + Current MRP Dr. Lee (family physician) + New MRP
Dr. Wong (palliative MD)

**Bağlam:** Maria palliative pathway\'e geçti (Doc 6 B2.1 DNR change
post-stroke recurrence); MRP family physician → palliative MD transfer
önerisi.

**Akış:**

1.  Anne Care Team panel → \"Transfer MRP\" CTA → MRP-TRANSFER-01 modal.
2.  T4 re-auth (Anne).
3.  New MRP: Dr. Wong (palliative MD; org practitioner directory).
4.  Reason: \"Palliative care transition; primary care responsibility
    shifts to palliative team\".
5.  Submit → Dr. Wong notif \"Pending MRP invitation\".
6.  Dr. Wong reviews patient → \"Accept\" + T3 re-auth + signature.
7.  CareTeam.currentMRP = Dr. Wong; previousMRP = Dr. Lee (archived in
    mrp\_history).
8.  CarePlan milestone snapshot auto: \"MRP transfer to palliative MD\".
9.  Patient/family notif: \"Your MRP is now Dr. Wong who specializes in
    palliative care.\"
10. Dr. Lee notif: \"MRP responsibility transferred; you remain on care
    team as consultant.\"

**Sonuç:** Klinik accountability chain net; multidisciplinary transition
smooth.

### 11.4 Senaryo: Conflict Resolution Thread

**Aktör:** CC Anne + MRP Dr. Wong + PT Marcus

**Bağlam:** Maria palliative; PT Marcus subplan\'inde \"aggressive ROM
3x/week\"; master plan\'da \"comfort-only palliative\". Doc 6 collision
warning fired.

**Akış:**

1.  Doc 6 collision warning Anne dashboard\'ında: \"Master goal vs PT
    subplan conflict\".
2.  Anne \"Open Conflict Thread\" → CONFLICT-THREAD-01 thread create
    with participants (Anne, Dr. Wong, Marcus).
3.  Initial post: collision context auto-populated.
4.  Marcus yanıt: \"Aggressive ROM goal stroke recurrence öncesi; revise
    to passive ROM + family education palliative-aligned\".
5.  Dr. Wong: \"Agreed; passive ROM for comfort; goal achievement
    reframe\".
6.  Anne \"Mark Resolved\" → outcome: \"Subplan revised\". Audit chain.
7.  Marcus subplan\'i revise eder Doc 6 paterni; new version. Patient
    view re-published (Doc 6 B2.2).

**Sonuç:** Master Doc §3.3 yumuşak operationalize; klinik karar
audit\'lenmiş.

§12 --- Açık Konular
--------------------

### 12.1 V0 Launch Öncesi

-   Notification batch policy default (3 events/1min window vs daha
    esnek)
-   Email digest template design + frequency default
-   Visit auto-close cron (8h after check-in)
-   MRP transfer 1h unwind window detayı (audit + technical
    implementation)
-   Conflict thread participant default suggestion algorithm (collision
    context\'e göre)
-   Patient messaging quiet hours default (HCP work-life)
-   Care team member directory (org practitioners + Allied Health
    curation)
-   Sensitive message auto-detect MVP rules (Doc 5 B3.1 paterni extended
    to messaging)
-   Bedrock Claude integration patient-friendly message (Doc 6 paterni)

### 12.2 V1 Spec

-   Voice/video calls (Twilio Programmable Video Canada; BAA contract)
-   Call recording + AI Scribe pipeline (Doc 7)
-   Cross-org messaging (Patient consent grant gate)
-   Read receipts + typing indicator
-   Message edit (5min window) + soft delete
-   Visit scheduling basic calendar
-   Conflict resolution structured outcome + decision audit
-   Patient-initiated voice call request
-   Care team broadcast announcement
-   Notification per-event-type granular subscription UI
-   Notification preferences quiet hours config
-   Visit cancel/no-show workflow
-   Care team change history visualization

### 12.3 V2+

-   EVV (GPS + attestation; Foundation \#2)
-   Visit scheduling vendor integration (Calendly-equivalent home care)
-   Real-time MDT collaborative care plan whiteboard
-   Sensitive message LLM auto-detect
-   Cross-province care team transfer
-   Group video call (MDT meeting)
-   AI-summarized message thread
-   AI-suggested message routing

### 12.4 Cross-App Reconciliation

-   Notification primitive shared with Patient/Caregiver/Family apps
-   Messaging cross-app contract (patient sender from Patient app → HCP
    recipient)
-   Care team display in Patient app (consent-scope)
-   Visit history Patient app rendering
-   Conflict thread Patient/Family observability (consent-scope +
    sensitive)

### 12.5 Klinik Review

-   MRP transfer 1h unwind clinical adequacy (acute decision
    reversibility)
-   Conflict thread resolution outcome enum (PMR review)
-   Sensitive message auto-detect false-positive vs false-negative
    balance
-   Patient messaging response SLA realistic (target vs realistic
    capacity)
-   Visit check-in compliance enforcement (auto-close + audit)

### 12.6 Pilot Feedback Tuning

-   Messaging volume per HCP per day
-   Patient messaging adoption + retention rate
-   Visit auto-close frequency
-   MRP transfer real-world frequency + reason distribution
-   Conflict thread escalation patterns
-   Notification opt-out rate per event type
-   Email digest engagement rate

### 12.7 Backend Infra

-   WebSocket connection scaling (multi-region or single Canada Central)
-   FCM/APNs deliverability monitoring
-   Notification batch worker architecture
-   Twilio Programmable Video Canada region BAA confirmation
-   Visit log storage growth (Encounter resources volume)
-   Conflict thread message archival
-   Cross-org messaging consent state cache

*Sinalytix HCP PRD --- Doc 9: Communication, Visit Management & Care
Team. v1.0 --- 31 Mayıs 2026. Master Doc §3.2 + §3.3 + §5.8 + §5.9 +
§5.11 + Foundation \#2 (EVV V2) + Doc 1-8 baseline ile uyumlu. Q&A pas
geçildi; recommended kararlarla yazıldı; kullanıcı son kontrol.*

> **\[İNSAN REVIEW GEREKLİ\]** Doc 9 düşük-güven: "Q&A pas geçildi; recommended kararlarla yazıldı". İçeriği bu reconciliation pass'inde **çözülmedi** (yalnız bayrak); insan/klinik danışman gözden geçirmesi gerekir.

Table of Contents {#table-of-contents-9 .TOC-Heading}
=================

Sinalytix HCP PRD --- Doc 10: Patient Consent, Notifications, Settings & Cross-Cutting
======================================================================================

**Versiyon:** v1.0 (Karara bağlanan öneriler --- kullanıcı son kontrol
bekliyor) **Tarih:** 31 Mayıs 2026 **Sahip:** Sinalytix Ürün & Klinik
Ekibi **Statü:** Drafted (Q&A skipped per user direction; final doc of
HCP PRD series) **Bağlı Dokümanlar:** Master Doc §4.8 (consent moat) +
§5.10 + §5.13, Foundation \#5 (patient-controlled platform), Doc 1-9
baseline

§0 --- Karara Bağlanan Öneriler (Kullanıcı Onay Bekliyor)
---------------------------------------------------------

  \#     Karar Noktası                                                                          Önerilen                                                                                                Gerekçe
  ------ -------------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------------- ----------------------------------
  D1.1   Consent resource model                                                                 FHIR Consent + Sinalytix Grant Scope hierarchy (layered)                                                Master Doc §4.8 moat operasyonel
  D1.2   SDM (Substitute Decision Maker) provincial-aware                                       ON HCCA primary MVP; BC RAA + QC mandate + AB mandate V2                                                Foundation Ontario MVP
  D1.3   Granular view rights                                                                   medication / labs / mental health / HIV / genetic / gender\_identity / sensitive                        Doc 4+5 paterni alignment
  D1.4   Break-glass override                                                                   V1 (Doc 4 alignment); MVP defensive consent only                                                        Foundation MVP discipline
  D2.1   Notification preferences                                                               Doc 9 paterni; granular per-event-type + quiet hours                                                    Cross-doc consistency
  D2.2   Settings --- profile + language + working hours + license + 2FA + connected accounts   MVP basic; advanced (delegation, sub-accounts) V1                                                       Workflow practical
  D2.3   Adherence reporting                                                                    Patient/Caregiver self-report → backend → Doc 4 widget feed (already MVP)                               Doc 4 alignment
  D3.1   Cross-cutting: Language preference cascade                                             User-level language → HCP UI; Patient app patient pref; care plan patient view multilang (Doc 6 B2.2)   Unified
  D3.2   Working hours / availability                                                           HCP schedule visibility (Doc 9 messaging delivery rules; quiet hours)                                   Operational
  D3.3   License management                                                                     Doc 1 license lifecycle + auto-revoke on expiry; renewal proactive workflow V1                          Doc 1 cross-ref
  D3.4   2FA management                                                                         Doc 2 TOTP/SMS choice; recovery codes; trusted devices V1                                               Doc 2 cross-ref
  D3.5   Connected accounts                                                                     Sinalytix-internal SSO (Doc 1 + Doc 2 reference); ONE ID SAML federation V1                             Doc 2 reference

§1 --- Bağlam ve Amaç
---------------------

### 1.1 Tanım

Doc 10, Sinalytix HCP PRD serisinin **cross-cutting + Sinalytix
stratejik moat\'larını somutlaştıran final dokümanıdır**. Dört birbirini
destekleyen alan:

1.  **Patient Consent & Grant Layer (Master Doc §4.8 + Foundation
    \#5):** Patient\'in kendi PHI\'sinin hangi org/HCP\'ye + hangi data
    kategorisine + hangi süre + hangi yetki dahilinde
    paylaşılabileceğini granular kontrol ettiği layer. Sinalytix\'in
    patient-controlled moat\'ının operasyonel kalbi; tüm diğer Doc 1-9
    fonksiyonları bu layer\'a uyum sağlar.
2.  **Provincial-Aware SDM (Substitute Decision Maker):** ON HCCA
    (Health Care Consent Act) + BC RAA + QC mandate V2 --- patient
    klinik karar verme kapasitesi yoksa yasal vekil framework\'ü.
3.  **Notification Preferences:** Doc 9 unified notification
    primitive\'inin user-level customization (event-type + channel +
    quiet hours).
4.  **Settings:** Profile + dil + çalışma saatleri + license + 2FA +
    connected accounts. Cross-doc reference hub.

### 1.2 Sinalytix Konumlanması

Foundation \#5 \"Patient-controlled + family caregiver coordination
platform for home care\" konumlanmasının operasyonel manifestosu Doc
10\'da somutlaşır:

-   **Rakipler (AlayaCare/PCC):** Consent tipik olarak binary on/off
    (HCP/org-level); granular data category yok; SDM provincial-aware
    değil.
-   **Sinalytix:** Per-category (medications/labs/mental
    health/HIV/genetic/gender) × per-org × per-HCP × per-time-window
    granular consent grants. Patient autonomy gerçek.

### 1.3 Giriş Noktaları

  Giriş Noktası                                                 Tetikleyici                                   Rol
  ------------------------------------------------------------- --------------------------------------------- -------------------
  Patient app --- Settings → Consent & Privacy                  Granular consent yönetimi                     Patient + SDM
  Doc 1 onboarding flow                                         Initial consent grants                        Patient
  Cross-org consent grant request (Doc 6+7+9 cross-org flows)   Specialist consult, vb.                       Patient grant
  HCP Settings (Settings UI)                                    Profile, lang, working hours, license, 2FA    Each HCP
  Notification preferences                                      Doc 9 customization                           HCP, Patient
  Adherence self-report (Patient app)                           Med taking, vitals, mood, sleep, vb.          Patient/Caregiver
  HCP onboarding (Doc 1)                                        License + 2FA setup                           HCP
  Break-glass override request (V1)                             Emergency clinical decision without consent   HCP + audit chain

### 1.4 Hedef Rol Matrisi

  Rol                               Consent Yetkisi                                                                  Settings Erişimi
  --------------------------------- -------------------------------------------------------------------------------- ------------------------------------------
  Patient                           Tüm consent grant\'ler kendi kontrolünde; revoke, grant, modify                  Profile, lang, notif prefs, app settings
  SDM (Substitute Decision Maker)   Patient kapasitesi yoksa (provincial-aware) tüm consent grants                   Patient-on-behalf-of
  Caregiver (formal/informal)       Patient grant-scoped subset access; kendi consent grants Patient\'ı reflektör    Caregiver profile + notif prefs
  Family member                     Patient consent grant ile read-only (consent-scope)                              Family profile + notif prefs
  CC                                Consent grant request initiate (cross-org Doc 6 B3.4); consent grant view        Own settings
  MRP                               Break-glass override request (V1; T4 + reason); consent grant view               Own settings
  HCP (all)                         Own settings (profile, lang, working hours, license, 2FA, notif prefs)           Own settings
  Org Admin                         Org-level settings (notif policy default, working hours, license mgmt support)   Org settings
  Sinalytix Operations              Read-only audit access to consent events (no PHI access)                         Internal admin

### 1.5 Regülasyon ve Standartlar

-   **PHIPA + provincial parallels:** Consent + SDM provincial-specific
    implementation.
-   **ON HCCA (Health Care Consent Act 1996):** Hierarchy of substitute
    decision-makers (Section 20); incapable persons standards; emergency
    exceptions.
-   **BC RAA (Representation Agreement Act):** BC SDM framework.
-   **QC mandate (Civil Code of Quebec, Mandate of Incapacity Law 18):**
    Quebec-specific.
-   **AB / SK / MB provincial parallels:** V2 expansion.
-   **PIPEDA + provincial privacy:** Cross-border consent +
    cross-jurisdictional handling.
-   **CMA / Provincial Colleges:** HCP duty to obtain consent; emergency
    override standards.
-   **FHIR R4 + CA Core+:** Consent resource profile.
-   **AWS Canada Central:** All consent records + audit trails
    residency.
-   **Bill C-27 (CPPA + AIDA, projected):** Patient AI consent
    governance future-proof.

§2 --- Endüstri ve Klinik Bağlam
--------------------------------

### 2.1 Patient Consent Reality

Kanada home care\'de consent tarihsel olarak:

-   **Binary on/off:** Patient EMR\'a giriş izni verir veya vermez;
    granular yok.
-   **Org-level paylaşım:** Hangi org\'un gördüğü patient için opak;
    \"consultative consent\" yaygın ama dokümante zayıf.
-   **SDM aktivasyonu manuel:** Patient kapasitesi düşüş gösterse
    aile/avukat ile manuel SDM atanır; sistemde yansıma yetersiz.
-   **Sensitive lockbox kâğıt-baskın:** Mental health/HIV/genetic ayrı
    dosya yaygın ama otomatik sistem yok.

Sinalytix bu boşluğu kapatır:

-   **Per-category × per-org × per-time-window grants:** Granular
    control patient\'ta.
-   **SDM provincial-aware automation:** ON HCCA hierarchy auto-cascade;
    consent yetkisi yasal vekile.
-   **Sensitive lockbox digital + auto-detect (Doc 4+5):** Patient
    default-hidden; explicit grant + audit.

### 2.2 SDM (Substitute Decision Maker) Klinik Workflow

ON HCCA Section 20 SDM hierarchy:

1.  Guardian (court-appointed)
2.  Attorney for personal care (power of attorney)
3.  Representative (Consent and Capacity Board appointed)
4.  Spouse or partner
5.  Child or parent
6.  Brother or sister
7.  Any other relative
8.  Public Guardian and Trustee (default fallback)

Sinalytix MVP\'de:

-   Patient onboarding\'de optional SDM declare (POA document upload
    veya provincial registry V1)
-   Patient kapasitesi düşüş → MRP capacity assessment → SDM
    auto-activation
-   SDM patient-on-behalf-of consent grants yapabilir
-   Audit chain: SDM aktivasyon + her karar audit\'lenir

### 2.3 Granular Consent Categories

Sinalytix MVP categories (Doc 4+5 lockbox paterni alignment):

-   **Medications:** Active Rx list + history
-   **Labs:** All lab results
-   **Imaging:** Imaging reports
-   **Mental health:** Psych Dx (ICD-10 F-codes), psychotherapy notes
-   **HIV/STI:** HIV serology, STI panels, sensitive infectious disease
-   **Genetic/Genomic:** Genetic testing results (V2 expand)
-   **Gender identity / Reproductive health:** Transgender care, sexual
    health
-   **Substance use:** Addiction treatment, MAT records
-   **Demographic:** Address, contact info, marital status

Per-category × per-org × per-time-window grants; default deny outside
grant.

### 2.4 Break-Glass Override (V1 Defensive)

Clinical emergency override (örn. unconscious patient in critical
condition; consent not active for this org but clinical necessity):

-   MVP scope dışı (defensive); MVP\'de strict consent enforcement
-   V1: Break-glass workflow:
    -   HCP requests override + reason + clinical urgency attestation
    -   T4 elevated re-auth + multi-step approval (CC + MRP confirm)
    -   Time-limited access (e.g., 24-72h emergency window)
    -   Patient/SDM post-event notification
    -   Audit chain full + Sinalytix Operations alert
    -   Provincial College reporting (compliance V1+)

### 2.5 Adherence Reporting

Patient/Caregiver self-report → Sinalytix backend → Doc 4 widget feed
(already MVP per Doc 4):

-   Med taking confirmation (per day; per Rx)
-   Vitals self-report (cross-app HealthKit/Health Connect Doc 5 Tier 1;
    complementary manual entry)
-   Mood/sleep/symptom log (Patient app)
-   Family caregiver report (consent-scope)

§3 --- Kapsam ve Kısıtlar
-------------------------

### 3.1 V0 (MVP)

**Patient Consent Layer:**

-   FHIR Consent resource + Sinalytix Grant Scope hierarchy
-   Per-category × per-org × per-time-window grants
-   Categories MVP: medications, labs, imaging, mental health, HIV,
    gender identity, substance use, demographic
-   Patient app: granular consent management UI
-   HCP Settings: read consent grants per patient (audit transparency)
-   Cross-org consent grant (Doc 6 B3.4 ile koordineli): specialist
    consult, etc.
-   Consent revoke immediate cascade (Doc 5 B4.1 ile koordineli; Doc 3
    5s graceful pattern)

**SDM (Substitute Decision Maker):**

-   MVP: ON HCCA hierarchy primary
-   Optional SDM declare at onboarding (POA upload or fallback \"I\'ll
    provide later\")
-   Capacity assessment workflow: MRP-initiated → ON capacity framework
    → SDM activation
-   SDM patient-on-behalf-of consent grants
-   Audit chain
-   Multi-province (BC RAA, QC) V2

**Granular View Rights:**

-   Doc 4 lockbox alignment (sensitive categories default-hidden)
-   Per-category grant: patient explicitly grants (or auto-granted at
    care team join)
-   Doc 5 sensitive auto-detect MVP high-precision (psych Dx + HIV
    serology + gender markers) feeds lockbox
-   HCP read attempts: PolicyEngine evaluate consent scope; deny + audit
    if missing

**Break-Glass Override:**

-   MVP: scope dışı (strict enforcement)
-   V1: full workflow (T4 + multi-step + time-limited + audit +
    post-notify)

**Notification Preferences:**

-   Doc 9 paterni + Settings UI (per-event-type + channel + quiet hours)
-   Patient app + HCP equivalent settings
-   Per-app-context (HCP vs Patient app preferences ayrı)

**Settings:**

-   HCP Settings:
    -   Profile (name, photo, contact, discipline, specialty, license)
    -   Language preference (UI + note authoring + patient view
        defaults)
    -   Working hours / availability (Doc 9 messaging delivery rules)
    -   License management (Doc 1 license info + expiry warning +
        renewal V1)
    -   2FA (Doc 2 TOTP/SMS choice + recovery codes + trusted devices
        V1)
    -   Notification preferences
    -   Connected accounts (Sinalytix-internal SSO; ONE ID SAML
        federation V1)
    -   SmartTools (Doc 7 settings)
    -   Templates (Doc 6+7 personal templates)
    -   Audit log query (V1)
-   Patient Settings:
    -   Profile + emergency contacts
    -   Language preference
    -   Notification preferences
    -   Connected accounts (Apple Health, Google Health Connect --- Doc
        5 Tier 1)
    -   SDM declaration
    -   Sensitive category preferences (which auto-locked, which grant
        default)
    -   Care team grants (per HCP/per org/per category --- granular
        consent UI)

**Adherence Reporting:**

-   Patient/Caregiver self-report submission (Patient app)
-   Med adherence (per Rx)
-   Vitals manual entry (complementary HealthKit/Health Connect)
-   Mood/sleep/symptom log
-   Family caregiver report (consent-scope, RelatedPerson)
-   Doc 4 widget feed

**Cross-Cutting:**

-   All language preferences cascade (user → UI + note default + patient
    view defaults)
-   Working hours respect (Doc 9 messaging delivery)
-   License auto-revoke on expiry (Doc 1 cron + Doc 6 plan revoke chain)

### 3.2 V1

-   Break-glass override full workflow
-   Multi-province SDM (BC, QC, AB, SK, MB)
-   Genetic/genomic data consent expand
-   Patient comment threads on consent grants (audit trail)
-   Org admin consent governance dashboard
-   License renewal proactive workflow (Doc 1 cross-ref)
-   ONE ID SAML federation (Doc 2 cross-ref)
-   Trusted device management (Doc 2 cross-ref)
-   Audit log query UI for clinician (Doc 2 cross-ref)
-   Consent grant time-bounded auto-expire (e.g., specialist 30d
    default)
-   Consent grant re-affirmation prompts (annual / on major change)
-   SDM hierarchy walk visualization
-   Cross-app consent reconciliation (Patient/Caregiver/Family PRD\'leri
    ile)

### 3.3 V2+

-   Bill C-27 CPPA + AIDA compliance (AI governance)
-   Patient right-to-be-forgotten workflow (PHIPA exception handling)
-   Cross-province consent portability (patient relocates ON → BC)
-   Patient AI consent (AI Scribe, LLM translate) granular V2 expand
-   Population-level consent for research (de-identified aggregation V2)
-   Multi-language consent UI expand (Turkish, Mandarin, Punjabi,
    Arabic)
-   Newcomer onboarding from non-Canadian jurisdictions (cross-border
    consent normalization)

### 3.4 Constraints

-   FHIR Consent resource + Sinalytix Grant Scope layered
-   ON HCCA primary MVP; provincial expand V2
-   Audit her consent change (Doc 2 canonical)
-   PolicyEngine every access (consent-scope check)
-   Canada Central residency
-   Patient autonomy floor: only patient (or SDM) can grant/revoke
-   Org admin cannot override patient consent (only operational
    settings)

### 3.5 Non-Goals

-   Break-glass override MVP (V1)
-   Multi-province SDM MVP (V2)
-   Patient right-to-be-forgotten MVP (V2)
-   Bill C-27 AI governance MVP (V2)
-   Population research consent (V2)
-   Cross-app reconciliation MVP (post-10-doc ayrı pass)

§4 --- Akışlar
--------------

### 4.1 Patient Initial Consent Grant (Onboarding)

    flowchart TD
        A[Patient onboarding Doc 1 sonrası] --> B[Patient app — Consent Setup Wizard]
        B --> C[Step 1: Sinalytix data residency + privacy intro]
        C --> D[Step 2: Care team identification - hangi org primary care veriyor]
        D --> E[Step 3: Per-category consent picker - default sensible defaults]
        E --> F[Step 4: SDM optional declare - POA upload or fallback]
        F --> G[Step 5: Family caregiver designations - optional]
        G --> H[Step 6: Adherence reporting opt-in]
        H --> I[Step 7: Notification preferences]
        I --> J[Confirm all → consent records created]
        J --> K[FHIR Consent + Sinalytix Grant resources stored]
        K --> L[Audit chain initiated; care team HCPs receive notif]

**Kritik kurallar:**

1.  Sensible defaults: medications/labs/imaging granted to current care
    team (org-scope); sensitive (mental/HIV/genetic) default deny →
    patient explicit opt-in.
2.  SDM optional; later add option always available.
3.  Patient can revisit + modify anytime (Patient app Settings).
4.  Multi-language wizard (Bedrock translate; Doc 6 stack).

### 4.2 Granular Consent Modification (Patient App)

    sequenceDiagram
        participant P as Patient
        participant App as Patient App
        participant PE as PolicyEngine
        participant Consent as Consent Service
        participant Care as Care team HCPs
        participant AL as Audit Log

        P->>App: Settings → Consent & Privacy
        App->>App: Current grants list (per org × per category)
        P->>App: "Modify mental health access for Sinapse Home Care"
        App->>P: Confirm modification + reason optional
        P->>App: "Revoke mental health access for next 30d"
        App->>Consent: PATCH /Consent (scope modify; revoke partial)
        Consent->>Consent: Update grant resource + period
        Consent->>PE: Invalidate access cache
        Consent->>Care: Notif "Patient modified mental health consent — access restricted"
        Consent->>AL: event_type=consent.modified + actor + scope + before/after
        Note over Consent,Care: HCP next access attempt: PolicyEngine deny + audit

**Kritik kurallar:**

1.  Patient autonomy: anytime modify; reason optional.
2.  Cascade real-time (Doc 3 5s pattern paralel --- Doc 5 B4.1).
3.  HCP receives notif yumuşak (klinik continuity için sentinel).
4.  Audit before/after state.

### 4.3 SDM Activation (Capacity Assessment)

    flowchart TD
        A[MRP observes capacity decline] --> B["MRP initiates 'Capacity Assessment' workflow"]
        B --> C[T3 re-auth + ON HCCA capacity assessment form]
        C --> D[MRP attestation: 'In my professional opinion, patient is incapable of making this healthcare decision because...']
        D --> E[Sign + commit]
        E --> F{SDM declared at onboarding?}
        F -->|Yes| G[Auto-activate declared SDM]
        F -->|No| H[Walk ON HCCA hierarchy: spouse → child → parent → brother/sister → other relative → Public Guardian and Trustee]
        H --> I[Sinalytix backend contacts hierarchy candidates]
        I --> J[First eligible candidate notified → accept/decline]
        J --> K[Accept → SDM activation]
        G --> K
        K --> L[SDM identity verification - Doc 1 paterni]
        L --> M[SDM gets patient-on-behalf-of consent management access]
        M --> N[Patient + family + care team notify]
        M --> O[Audit chain: SDM activated + actor + framework]

**Kritik kurallar:**

1.  ON HCCA framework MVP; multi-province V2.
2.  SDM identity verification (Doc 1 onboarding paterni).
3.  Patient + SDM both transparent on activation.
4.  Capacity reassessment workflow (V1; ön HCCA periodic review).

### 4.4 Cross-Org Consent Grant (Doc 6 B3.4 Bridge)

    sequenceDiagram
        participant CC as CC (originating org)
        participant Patient as Patient
        participant App as Patient App
        participant Consent as Consent Service
        participant Spec as Specialist (cross-org)
        participant AL as Audit Log

        CC->>Patient: "Requesting consult with Dr. Patel UHN — need consent to share PHI"
        Patient->>App: Notification received → review consent request
        App->>App: Detail view: requested scope (CarePlan + Patient360 + relevant categories), expiry (30d default), specialist credentials
        Patient->>App: "Grant access" or "Decline"
        alt Grant
            App->>Consent: POST /Consent (cross-org grant)
            Consent->>Consent: Create grant resource (target_org, scope, expiry)
            Consent->>Spec: Notif "Patient granted access — opening consult window"
            Consent->>AL: event_type=consent.cross_org.granted
            Spec->>Spec: Access patient context (Doc 6 cross-org view)
            Note over Consent,Spec: 30d window auto-expire; specialist can renew (Patient consent)
        else Decline
            App->>Consent: POST /Consent (deny)
            Consent->>CC: Notif "Patient declined consult consent"
            Consent->>AL: event_type=consent.cross_org.declined
        end

**Kritik kurallar:**

1.  CC initiate; patient is final authority.
2.  Time-bounded default (30d); patient explicit renew.
3.  Scope-limited (only relevant categories).
4.  Specialist post-grant respects consent scope; revoke → access
    blocked.

### 4.5 Consent Revoke Cascade (Cross-Doc)

    flowchart TD
        A[Patient revokes consent in Patient app] --> B[Consent Service updates resource]
        B --> C[PolicyEngine cache invalidate]
        B --> D[Multi-doc cascade events]
        D --> E[Doc 3 Worklist: patient panel grey 5s animation + remove]
        D --> F[Doc 4 Patient 360: access blocked next request]
        D --> G[Doc 5 Ingestion: future Tier 1-4 access blocked + retained immutable]
        D --> H[Doc 6 Care Plan: status preservation; HCP access blocked]
        D --> I[Doc 7 Notes: future read access blocked; existing immutable]
        D --> J[Doc 8 Orders: future orders blocked; sent orders legal preserve]
        D --> K[Doc 9 Messaging: future messages blocked; thread history retained]
        D --> L[Cross-org specialist: immediate access cut]
        B --> M[Audit chain: parent revoke + cascading access_blocked events]
        B --> N[HCPs notif yumuşak "Patient revoked consent"]

**Kritik kurallar:**

1.  Real-time cascade (Doc 3 5s graceful pattern).
2.  Immutable retention legal (PHIPA 10y; Doc 5 paterni).
3.  Re-grant restore (Doc 5 B4.1).
4.  Hard delete request (V1+ legal workflow).

### 4.6 Break-Glass Override (V1)

    flowchart TD
        A[HCP encounters clinical emergency without consent grant] --> B["'Request Break-Glass Override' CTA"]
        B --> C[Multi-step form:<br/>- Clinical urgency reason<br/>- Patient status: unconscious/incapacitated<br/>- Anticipated duration]
        C --> D[T4 re-auth elevated]
        D --> E[Multi-approval: CC + MRP confirm]
        E --> F[Time-limited access window (e.g., 24-72h)]
        F --> G[Access granted; full audit log every read]
        G --> H[Patient/SDM post-event notification within 24h]
        H --> I[Provincial College reporting (V1+ compliance)]
        G --> J[Override expires; access auto-revoked]

**Kritik kurallar:**

1.  V1; MVP\'de strict consent enforcement.
2.  Multi-step approval + multi-actor audit chain.
3.  Time-limited (auto-revoke).
4.  Patient/SDM post-notify (autonomy respect).
5.  Sinalytix Operations alert + provincial College compliance.

### 4.7 Adherence Self-Report (Patient/Caregiver → Doc 4 Feed)

    sequenceDiagram
        participant P as Patient/Caregiver
        participant App as Patient App
        participant PE as PolicyEngine
        participant Adh as Adherence Service
        participant P360 as Patient 360 (Doc 4)
        participant Care as HCP Care Team
        participant AL as Audit Log

        P->>App: Daily prompt "Did you take Apixaban this morning?"
        P->>App: "Yes" / "No - missed" / "No - delayed" / "Skip"
        App->>Adh: POST /Adherence (med_id, status, ts)
        Adh->>PE: evaluate(consent_scope, adherence reporting opt-in)
        PE-->>Adh: Allow
        Adh->>Adh: Create Observation (MedicationAdministration self-report)
        Adh->>P360: Doc 4 Active Meds widget update (adherence indicator)
        Adh->>AL: event_type=adherence.self_report
        alt Missed multiple days
            Adh->>Care: Alert "Patient X missed 3 doses Apixaban — clinical follow-up?"
        end

**Kritik kurallar:**

1.  Patient/Caregiver self-report; Doc 4 widget feed (already
    specified).
2.  Consent scope: adherence reporting opt-in (Settings).
3.  Pattern detect → care team alert (V1).
4.  Family caregiver self-report consent-scope (RelatedPerson).

### 4.8 HCP Working Hours + Notification Delivery (Doc 9 Bridge)

    flowchart TD
        A[Doc 9 Notification Service dispatches event] --> B[Check recipient HCP working hours]
        B --> C{Quiet hours?}
        C -->|No| D[Immediate push FCM/APNs]
        C -->|Yes| E[Queue for next working hours start]
        E --> F[At working hours start: dispatch]
        D --> G[In-app badge always real-time regardless]
        E --> G
        A --> H[Urgent event types override quiet hours - e.g., conflict critical, MRP transfer]
        H --> D

**Kritik kurallar:**

1.  Per-HCP working hours respect (Settings → working hours).
2.  Urgent override (configured per event type).
3.  In-app badge always; only push delivery filtered.

§5 --- Ekran/Yüzey Spec
-----------------------

### 5.1 Ekran Envanteri

  Ekran ID                         İsim                                        Mobile      Web   Birincil Rol
  -------------------------------- ------------------------------------------- ----------- ----- ----------------------------------
  CONSENT-WIZARD-01                Patient Initial Consent Setup               ✓ Primary   ✓     Patient (during onboarding)
  CONSENT-MGMT-01                  Patient Consent Management                  ✓           ✓     Patient, SDM
  CONSENT-GRANT-REQ-01             Cross-Org Consent Request                   ✓           ✓     Patient (notif)
  SDM-DECLARE-01                   SDM Declaration Modal                       ✓           ✓     Patient
  SDM-ACTIVATE-01                  SDM Activation Workflow                     ✓           ✓     MRP + SDM
  SETTINGS-PROFILE-01              HCP Profile Settings                        ✓           ✓     HCP
  SETTINGS-LANG-01                 Language Preference                         ✓           ✓     All users
  SETTINGS-WORKING-HOURS-01        Working Hours / Availability                ✓           ✓     HCP
  SETTINGS-LICENSE-01              License Management                          ✓           ✓     HCP (Doc 1 cross-ref)
  SETTINGS-2FA-01                  2FA Management                              ✓           ✓     All users (Doc 2 cross-ref)
  SETTINGS-NOTIF-PREFS-01          Notification Preferences                    ✓           ✓     All users
  SETTINGS-CONNECTED-ACCOUNTS-01   Connected Accounts (SSO, HealthKit, etc.)   ✓           ✓     All users
  SETTINGS-ADHERENCE-OPT-IN-01     Adherence Reporting Opt-In                  ✓           ✓     Patient
  ADHERENCE-PROMPT-01              Daily Adherence Self-Report Prompt          ✓ Primary   ✓     Patient/Caregiver
  BREAK-GLASS-REQ-01               Break-Glass Override Request (V1)           ✓           ✓     HCP + CC + MRP
  AUDIT-LOG-QUERY-01               Audit Log Query UI (V1)                     ✓           ✓     HCP self-query (Doc 2 cross-ref)

### 5.2 CONSENT-WIZARD-01 --- Initial Setup (Patient App)

**Mobile (RN) --- Primary:**

-   Multi-step wizard (\~7 steps)
-   Each step explanatory tone (Bedrock translate to Turkish/EN/FR +
    plain language)
-   Step indicators top + back/forward
-   Visual privacy-friendly (lock + shield icons)
-   Final summary: \"Your privacy preferences\"
-   Skip option (deferred setup; sensible defaults applied)

### 5.3 CONSENT-MGMT-01 --- Granular Management

**Mobile + Web:**

-   Sections:
    -   **My Care Team** (per org grant matrix): per-org row ×
        per-category column; toggle per cell
    -   **Cross-Org Consults** (active + history): specialist consults
        granted, with expiry countdown
    -   **Sensitive Categories** (special lockbox): mental health / HIV
        / genetic / gender / substance use --- each with own grant
        matrix
    -   **SDM**: declared SDM info + edit + revoke
    -   **Family Caregivers**: designated family with consent-scope per
        category
-   Visual: green chips (granted) + gray chips (default deny) + red
    (revoked)
-   Tap → toggle modal with confirmation + audit reason optional

### 5.4 CONSENT-GRANT-REQ-01 --- Cross-Org Request Notification

**Mobile:**

-   Push notif → tap → modal
-   Detail: requesting HCP/org + scope + duration (e.g., \"Dr. Patel,
    UHN Neurology --- 30 days access to CarePlan + Active Problems +
    Recent Labs\")
-   \"Grant\" CTA + \"Decline\" CTA
-   \"Adjust scope\" V1 (advanced: granular per-category override)

### 5.5 SDM-DECLARE-01 + SDM-ACTIVATE-01

**SDM Declare (Patient initiated, anytime):**

-   Form: SDM name + relationship + contact + POA upload (PDF)
-   Provincial framework selector (ON HCCA default)
-   Save + audit; SDM notified

**SDM Activate (MRP-initiated, capacity assessment):**

-   Form: clinical reason + capacity assessment (provincial-specific)
-   T3 re-auth + MRP attestation
-   Submit → SDM hierarchy walk + activate

### 5.6 SETTINGS-PROFILE-01 --- HCP Profile

**Web + Mobile:**

-   Sections:
    -   Name + Photo + Discipline + Specialty + Bio (optional)
    -   Contact email + phone
    -   Multi-province license summary (Doc 1)
    -   Org memberships (Doc 1)
-   Edit per section with audit

### 5.7 SETTINGS-NOTIF-PREFS-01

**Web + Mobile:**

-   Per-event-type toggle table:
    -   Channels: Push \| In-App \| Email \| SMS (V1)
    -   Quiet hours: time range + days of week
    -   Email digest frequency: Daily \| Weekly
-   Save + audit

### 5.8 SETTINGS-LANG-01

-   Language picker: EN \| FR \| (V2 expand)
-   Cascade: UI + note authoring default + patient view default
-   Bedrock translate cost note (V1+ transparency)

### 5.9 SETTINGS-LICENSE-01 (Doc 1 Cross-Ref)

-   Active licenses per province + discipline
-   Expiry countdown (yellow 90d / red 30d)
-   \"Renew\" CTA → Doc 1 renewal workflow V1
-   Inactive license history

### 5.10 SETTINGS-2FA-01 (Doc 2 Cross-Ref)

-   TOTP / SMS choice (MVP); TOTP mandatory V1
-   Recovery codes (8 codes; single-use; Argon2id hashed --- Doc 2)
-   Trusted devices V1
-   Force re-2FA action (manual)

### 5.11 SETTINGS-CONNECTED-ACCOUNTS-01

**HCP side:**

-   Sinalytix-internal SSO (default; org SAML federation V1)
-   Linked: Apple Health (V2 personal use; not PHI)

**Patient side:**

-   Apple Health / Google Health Connect (Doc 5 Tier 1)
-   Health Canada PHR (V2+)
-   Identity providers

### 5.12 ADHERENCE-PROMPT-01 --- Daily Self-Report

**Mobile (RN) --- Primary:**

-   Push notif morning (configurable)
-   Tap → adherence card per active Rx + vitals optional
-   One-tap \"Took it\" / \"Missed\" / \"Delayed\" / \"Skip\"
-   Mood/sleep slider quick log (optional)
-   Submit + Patient 360 widget feed (Doc 4)

### 5.13 BREAK-GLASS-REQ-01 (V1)

**Web (V1):**

-   Multi-step:
    -   Step 1: Clinical justification (urgency + patient status)
    -   Step 2: T4 re-auth (full 2FA + biometric)
    -   Step 3: CC + MRP confirmation (multi-actor approval)
    -   Step 4: Time-limited access granted; full audit
-   Post-grant: every read audit + patient/SDM 24h notification

### 5.14 AUDIT-LOG-QUERY-01 (V1)

-   Per-user audit access query (Doc 2 paterni)
-   Filter: date range, event type, patient, actor
-   Cross-doc events visible (consent, plan, note, order, message)

### 5.15 Ekran-Arası Etkileşimler

-   **CONSENT-WIZARD-01 ↔ Doc 1 onboarding:** Onboarding final step →
    wizard launch
-   **CONSENT-MGMT-01 ↔ All other docs:** Real-time PolicyEngine cascade
-   **SETTINGS-WORKING-HOURS-01 ↔ Doc 9 notif:** Quiet hours enforcement
-   **SETTINGS-LICENSE-01 ↔ Doc 1 + Doc 6:** License expiry → CarePlan
    revoke chain
-   **ADHERENCE-PROMPT-01 ↔ Doc 4:** Self-report widget feed

§6 --- Veri Modeli (FHIR R4 + CA Core+)
---------------------------------------

### 6.1 FHIR Resource Kullanımı

  Resource                              Kullanım
  ------------------------------------- -------------------------------------------------------------------
  `Consent`                             Patient consent grants (per-category × per-org × per-time-window)
  `Patient`                             Subject; SDM reference; preferred contacts
  `RelatedPerson`                       SDM + Family caregiver entities
  `Practitioner` / `PractitionerRole`   HCP profile + licenses
  `Observation`                         Adherence self-report (MedicationAdministration alt)
  `Provenance`                          Consent change audit + SDM activation
  `Communication`                       Cross-org consent request (Doc 9)
  `AuditEvent`                          Audit log (Doc 2 canonical)

### 6.2 Consent Profile (Sinalytix Granular Grant)

> [RECONCILED: B2] This FHIR `Consent` resource is the **API-boundary projection** of the canonical per-category `consent_grants` rows (§6.3 / Dictionary §10), produced only at the API surface — not a third independent definition. The immutable patient legal `ConsentRecord` (Dictionary §2) is a distinct layer alongside this FHIR `Consent`.

    Consent:
      id: <uuid>
      status: draft | proposed | active | rejected | inactive | entered-in-error
      scope:
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/consentscope", code: "patient-privacy" }]
      category:
        - { system: "https://sinalytix.ca/codes/consent-category", code: "phi_share | care_team_join | cross_org_consult | sdm_grant | adherence_reporting | break_glass_override" }
      patient: Reference(Patient/<id>)
      dateTime: <granted_at>
      performer: [Reference(Patient/<id> | RelatedPerson/<sdm_id>)]
      organization: [Reference(Organization/<grantor_org>)]
      sourceAttachment: Reference(DocumentReference/<poa_doc>)  # for SDM
      policyRule: { coding: [{ code: "ON_HCCA_2025 | BC_RAA | QC_MANDATE" }] }
      provision:
        type: permit | deny
        period: { start, end }
        actor:
          - role: { coding: [{ code: "primary-care-org | specialist | family-caregiver" }] }
            reference: Reference(Organization/<target>) | Reference(Practitioner/<target>) | Reference(RelatedPerson/<target>)
        action: [{ coding: [{ code: "access | use | disclose" }] }]
        purpose: [{ code: "TREAT | NORMAL | ETREAT | BTG (break-glass)" }]
        dataPeriod: { start, end }  # which data time period
        data:
          - meaning: instance | related
            reference: Reference(<resource_id>)
        code:  # category-scoped grants
          # [RECONCILED: B5] Lockbox set (default-hidden, separate grant required) = {mental_health, hiv_sti, gender_identity, substance_use}; substance_use enforced everywhere.
          # `genetic` remains a valid data-category but is "sensitive, non-lockbox (V2)" — NOT in the V0 lockbox set. `imaging`/`labs`/`medications`/`demographic` are non-sensitive categories.
          - { system: "https://sinalytix.ca/codes/data-category", code: "medications | labs | imaging | mental_health | hiv_sti | genetic | gender_identity | substance_use | demographic" }
      meta:
        extension:
          - sinalytix-grant-source: "patient_initiated | sdm | break_glass | onboarding_default"
          - sinalytix-grant-expiry-auto: <ts>  # for time-bounded grants
          - sinalytix-revoke-cascade-completed-at: <ts>
          - sinalytix-renewal-prompt-count: <int>

### 6.3 Internal PostgreSQL Schema

> [RECONCILED: B2] This `consent_grants` table (per-category rows: `data_category` + `target_type` + permit/deny via `status`, default-deny) is the **CANONICAL** consent-grant shape for all Docs (Dictionary §2/§10). Doc 3's per-role boolean-map `scope` is a derived view over these rows. Note also: the FHIR `Consent` profile in §6.2 is the API-boundary representation of these same grants, while the immutable patient legal `ConsentRecord` (Dictionary §2 — ToS/privacy/`ack_ai_processing`, append-only 7y) is a SEPARATE layer that exists alongside the FHIR `Consent`.

    -- Consent grants flattened cache (PG for query performance)
    CREATE TABLE consent_grants (
      id UUID PRIMARY KEY,
      fhir_consent_id UUID NOT NULL,
      patient_id UUID NOT NULL,
      grantor_user_id UUID NOT NULL,  -- Patient or SDM
      grantor_type TEXT NOT NULL CHECK (grantor_type IN ('patient', 'sdm')),
      target_type TEXT NOT NULL CHECK (target_type IN ('org', 'practitioner', 'related_person', 'system')),
      target_id UUID NOT NULL,
      data_category TEXT NOT NULL,  -- 'medications', 'labs', etc.
      action TEXT[] NOT NULL,  -- ['read', 'write', 'share']
      purpose TEXT NOT NULL,  -- 'treat', 'normal', etc.
      status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'expired', 'revoked')),
      granted_at TIMESTAMPTZ NOT NULL,
      effective_period_start TIMESTAMPTZ,
      effective_period_end TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      source TEXT NOT NULL,  -- 'patient_initiated', 'sdm', 'break_glass', 'onboarding_default'
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_consent_patient_target ON consent_grants(patient_id, target_id, data_category) WHERE status = 'active';
    CREATE INDEX idx_consent_expiry ON consent_grants(effective_period_end) WHERE status = 'active' AND effective_period_end IS NOT NULL;
    ALTER TABLE consent_grants ENABLE ROW LEVEL SECURITY;

    -- SDM declarations
    CREATE TABLE sdm_declarations (
      id UUID PRIMARY KEY,
      patient_id UUID NOT NULL,
      declared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      sdm_related_person_id UUID NOT NULL,
      relationship TEXT NOT NULL,
      provincial_framework TEXT NOT NULL DEFAULT 'ON_HCCA',
      poa_document_reference_id UUID,
      is_active BOOLEAN NOT NULL DEFAULT false,
      activated_at TIMESTAMPTZ,
      activated_by_mrp_id UUID,
      capacity_assessment_doc_ref UUID,
      deactivated_at TIMESTAMPTZ,
      deactivation_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_sdm_patient ON sdm_declarations(patient_id) WHERE is_active OR poa_document_reference_id IS NOT NULL;
    ALTER TABLE sdm_declarations ENABLE ROW LEVEL SECURITY;

    -- HCP/User settings
    CREATE TABLE user_settings (
      user_id UUID PRIMARY KEY,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      working_hours JSONB DEFAULT '[]'::jsonb,  -- [{ day_of_week, start, end }]
      notification_preferences_id UUID,
      trusted_devices JSONB DEFAULT '[]'::jsonb,  -- V1
      audit_log_query_access BOOLEAN NOT NULL DEFAULT false,  -- V1
      smart_tools_settings_id UUID,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

    -- Adherence self-report
    CREATE TABLE adherence_reports (
      id UUID PRIMARY KEY,
      patient_id UUID NOT NULL,
      reporter_user_id UUID NOT NULL,  -- patient or related_person
      reporter_type TEXT NOT NULL CHECK (reporter_type IN ('patient', 'caregiver', 'family')),
      report_type TEXT NOT NULL CHECK (report_type IN ('med_taken', 'vital_self_report', 'symptom_log', 'mood', 'sleep')),
      related_resource_id UUID,  -- e.g., MedicationStatement
      data_jsonb JSONB NOT NULL,
      reported_at TIMESTAMPTZ NOT NULL,
      observation_resource_id UUID,  -- FHIR Observation
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_adherence_patient_type ON adherence_reports(patient_id, report_type, reported_at DESC);
    ALTER TABLE adherence_reports ENABLE ROW LEVEL SECURITY;

    -- Break-glass override log (V1)
    CREATE TABLE break_glass_overrides (
      id UUID PRIMARY KEY,
      patient_id UUID NOT NULL,
      requester_user_id UUID NOT NULL,
      approving_cc_id UUID,
      approving_mrp_id UUID,
      clinical_urgency_reason TEXT NOT NULL,
      patient_status TEXT NOT NULL,
      anticipated_duration_hours INT NOT NULL,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      granted_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      patient_notified_at TIMESTAMPTZ,
      provincial_college_reported_at TIMESTAMPTZ,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'revoked'))
    );
    CREATE INDEX idx_break_glass_patient ON break_glass_overrides(patient_id, requested_at DESC);
    ALTER TABLE break_glass_overrides ENABLE ROW LEVEL SECURITY;

### 6.4 Audit Event Type Genişlemesi

**Category: consent**

  event\_type                           Tetikleyici
  ------------------------------------- --------------------------------
  `consent.granted`                     New grant created
  `consent.modified`                    Scope changed
  `consent.revoked`                     Patient revoke
  `consent.expired`                     Time-bounded auto-expire
  `consent.cross_org.requested`         CC initiates cross-org consult
  `consent.cross_org.granted`           Patient grants
  `consent.cross_org.declined`          Patient declines
  `consent.revoked.cascade_completed`   All access blocked
  `consent.restored`                    Re-grant after revoke

**Category: sdm**

  event\_type         Tetikleyici
  ------------------- ----------------------------------------------
  `sdm.declared`      Patient declares POA
  `sdm.activated`     MRP capacity assessment activate
  `sdm.deactivated`   Capacity restored
  `sdm.grant_made`    SDM makes consent grant on patient\'s behalf

**Category: settings**

  event\_type                                 Tetikleyici
  ------------------------------------------- ----------------------
  `settings.notification_prefs.updated`       Change
  `settings.working_hours.updated`            Change
  `settings.language.changed`                 Language pref change
  `settings.2fa.method_changed`               TOTP/SMS swap
  `settings.2fa.recovery_codes_regenerated`   Reset

**Category: break\_glass (V1)**

  event\_type                            Tetikleyici
  -------------------------------------- ---------------------------------
  `break_glass.requested`                HCP initiates
  `break_glass.approved`                 CC + MRP confirm
  `break_glass.denied`                   Approval failed
  `break_glass.access_during_override`   Each read event during override
  `break_glass.expired`                  Time window passed
  `break_glass.patient_notified`         Post-event notify

**Category: adherence**

  event\_type                         Tetikleyici
  ----------------------------------- ---------------------------------------
  `adherence.self_report.submitted`   Patient/Caregiver submit
  `adherence.pattern_alert`           Missed doses pattern → HCP alert (V1)

### 6.5 PolicyEngine Integration

    // HCP read access (per-category consent check)
    PolicyEngine.evaluate({
      subject: { id: hcp.id, role: hcp.role, org_id, license },
      action: 'read',
      resource: { type: 'Observation', category: 'medications', patient_id },
      context: { consent_grants: <active_grants_for_patient_x_hcp_org_x_category> }
    });
    // Returns: allow only if matching grant exists

    // SDM-on-behalf-of consent grant
    PolicyEngine.evaluate({
      subject: { id: sdm.related_person_id, role: 'sdm', patient_subject_id: patient.id },
      action: 'create_consent_grant',
      resource: { type: 'Consent' },
      context: { sdm_active: true, provincial_framework: 'ON_HCCA' }
    });

    // Break-glass access (V1)
    PolicyEngine.evaluate({
      subject: { id: hcp.id, role: hcp.role, auth_tier_session: 'T4' },
      action: 'break_glass_read',
      resource: { type: 'any_phi', patient_id },
      context: { break_glass_active: true, expires_at: <ts>, override_id }
    });

    // Patient revoke (always allowed within own scope)
    PolicyEngine.evaluate({
      subject: { id: patient.id, role: 'patient', subject_patient_id: patient.id },
      action: 'revoke_consent',
      resource: { type: 'Consent', id: consent.id },
      context: { is_patient_own_consent: true }
    });

### 6.6 Cross-Doc Bağlantılar

  Doc 10 Resource/Table                         Bağlı Doc                                                                                             İlişki
  --------------------------------------------- ----------------------------------------------------------------------------------------------------- -------------------------
  `Consent + consent_grants`                    All other docs PolicyEngine                                                                           Universal access gate
  `consent_grants.target_org × data_category`   Doc 4 Patient 360 + Doc 5 Tier 1-4 + Doc 6 plan view + Doc 7 notes + Doc 8 orders + Doc 9 messaging   Cross-cutting access
  `sdm_declarations`                            Doc 1 onboarding + Doc 4 patient header                                                               SDM info display
  `user_settings.working_hours`                 Doc 9 notification delivery                                                                           Quiet hours enforcement
  `user_settings.preferred_language`            Doc 6 + Doc 7 patient view + UI                                                                       Multilang cascade
  `adherence_reports`                           Doc 4 widget feed                                                                                     Patient 360 display
  `break_glass_overrides`                       All docs PolicyEngine override                                                                        Emergency access
  `Communication (cross-org request)`           Doc 6 B3.4 + Doc 7 cross-org note + Doc 9 messaging                                                   Cross-org gate

§7 --- Hata ve Edge Cases
-------------------------

  Senaryo                                                                   Sistem Davranışı                                                              UX
  ------------------------------------------------------------------------- ----------------------------------------------------------------------------- ---------------------------------------------------------------------
  Patient revokes during HCP active session                                 Doc 3 5s graceful + cascade; HCP transition smooth                            \"Hastanın erişimi şu an kaldırıldı; çalışmanız taslakta\"
  SDM dies / loses capacity                                                 MRP capacity assessment chain → next ON HCCA hierarchy → new SDM activation   \"SDM değişti; yeni SDM Dr. Y bilgilendiriliyor\"
  Consent grant expires mid-procedure (e.g., specialist consult)            24h grace warning + auto-renew prompt to patient                              \"Erişim süresi 24h sonra dolacak; renew için patient\'a iletildi\"
  Patient grants then immediately revokes (test pattern)                    All cascade respected; audit complete                                         Normal flow
  Break-glass override without proper urgency (audit suspicion)             Sinalytix Operations alert + provincial College report                        Internal review
  SDM declared but POA doc not uploaded                                     Soft warn; declaration draft state                                            \"POA document yüklemeden SDM aktivasyonu yapılamaz\"
  Working hours overlap (HCP across orgs)                                   Per-org working hours separately                                              Org context display
  Trusted device V1 added then revoked                                      Force 2FA on next access                                                      \"Trusted device kaldırıldı; 2FA gerekli\"
  Patient app multiple devices same account                                 Both real-time sync; revoke logout cascade                                    Doc 1 +Doc 2 paterni
  Adherence report missed days alert false-positive (patient on vacation)   Patient can mark \"Away\" period (V1)                                         \"Vacation mode\" --- V1 feature
  Consent revoke for active conflict thread                                 Thread access blocked but history retained                                    \"Thread arşivlendi; klinik kayıt kalır\"
  Cross-org consent request to specialist not yet onboarded Sinalytix       Block + suggestion to invite                                                  \"Specialist Sinalytix\'te değil; davet edilsin mi?\"
  Adherence opt-out then opt-in mid-pattern                                 Pattern analysis discontinuous; clinical interpretation note                  \"Pattern interrupted; clinical use caution\"

§8 --- Kabul Kriterleri
-----------------------

### 8.1 Fonksiyonel

-   AC-1.1: FHIR Consent + Sinalytix Grant Scope per-category × per-org
    × per-time-window.
-   AC-1.2: Patient onboarding consent wizard with sensible defaults.
-   AC-1.3: Patient app consent management UI (grant/modify/revoke).
-   AC-1.4: SDM declaration optional at onboarding + anytime.
-   AC-1.5: SDM activation via MRP capacity assessment (ON HCCA MVP).
-   AC-1.6: Cross-org consent request flow (Doc 6 B3.4 bridge).
-   AC-1.7: Consent revoke real-time cascade (Doc 3+5+6+7+8+9 paterni).
-   AC-1.8: Adherence self-report (Patient app) → Doc 4 widget feed.
-   AC-1.9: HCP settings: profile, language, working hours, license,
    2FA, notification prefs, connected accounts, SmartTools, templates.
-   AC-1.10: Patient settings: profile, language, notif prefs, connected
    accounts (HealthKit/Health Connect), SDM, sensitive prefs, care team
    grants.
-   AC-1.11: Notification preferences per-event × per-channel + quiet
    hours respect (Doc 9 bridge).
-   AC-1.12: Language preference cascade UI + note authoring + patient
    view.
-   AC-1.13: License auto-revoke on expiry (Doc 1 cross-ref) + plan
    revoke chain (Doc 6).
-   AC-1.14: Break-glass override V1 (multi-step T4 + multi-actor +
    time-limited + audit + post-notify).

### 8.2 Regülasyon ve Güvenlik

-   AC-S.1: All consent CRUD audit (Doc 2 canonical).
-   AC-S.2: PolicyEngine consent-aware every access (any doc resource).
-   AC-S.3: ON HCCA SDM hierarchy MVP; provincial expand V2.
-   AC-S.4: Patient autonomy floor: only patient or SDM grants/revokes.
-   AC-S.5: PHIPA + provincial parallels.
-   AC-S.6: Canada Central data residency (consent data + audit +
    adherence + SDM).
-   AC-S.7: Break-glass V1 provincial College reporting.
-   AC-S.8: Sensitive category lockbox respect (Doc 4 + Doc 5
    alignment).
-   AC-S.9: Cross-border consent (newcomers V2) handling.
-   AC-S.10: Audit trail accessible to patient (right-to-know V1).

### 8.3 Teknik ve Performans

-   AC-T.1: Consent grant create \< 500ms p95.
-   AC-T.2: PolicyEngine evaluate with consent check \< 50ms p95.
-   AC-T.3: Consent revoke cascade complete \< 30s p99.
-   AC-T.4: Notification quiet hours respect (delayed dispatch) accuracy
    100%.
-   AC-T.5: Adherence self-report submit \< 500ms p95.
-   AC-T.6: SDM activation workflow \< 5dk e2e (MRP form + system
    actions).

§9 --- Başarı Metrikleri
------------------------

### 9.1 Adoption + Engagement

  Metrik                                                       V0 Hedef                   V1 Hedef
  ------------------------------------------------------------ -------------------------- ----------
  Patient consent wizard completion rate                       %85+                       %95+
  SDM declaration rate (eligible patients)                     %20+                       %40+
  Patient consent management Settings revisit rate (monthly)   %25+                       %40+
  Adherence reporting opt-in rate                              %50+                       %75+
  Adherence self-report daily completion rate (opt-in users)   %60+                       %75+
  Notification opt-in rate (push)                              %80+ HCPs, %70+ Patients   similar
  Cross-org consent grant rate (specialist consult)            %85+                       %95+
  Working hours configured rate (HCPs)                         %60+                       %85+

### 9.2 Quality + Safety

  Metrik                                           V0 Hedef         V1 Hedef
  ------------------------------------------------ ---------------- ----------
  Consent revoke cascade completeness              %100             %100
  Consent grant audit chain integrity              %100             %100
  Adherence pattern alert accuracy (V1)            %85+ precision   %95+
  Break-glass false-positive rate (V1)             \<%2             \<%1
  SDM activation provincial framework compliance   %100             %100
  Sensitive category lockbox respect (cross-doc)   %100             %100

### 9.3 Compliance + Audit

  Metrik                                                  Hedef
  ------------------------------------------------------- --------------------------------
  Cross-border egress                                     0
  Provincial College report submission (V1 break-glass)   %100 of approved overrides
  Audit completeness                                      %100
  Right-to-know patient audit query response time (V1)    \<30 day (regulatory standard)

### 9.4 Sinalytix Stratejik Moat

  Metrik                                                                 Hedef                 Ölçüm
  ---------------------------------------------------------------------- --------------------- ---------------------
  Per-patient consent granularity (avg \# categories actively managed)   5-8                   Grants per patient
  Cross-org consult success rate (consent granted)                       %85+                  Granted / requested
  Patient satisfaction with privacy control (V1 NPS proxy)               NPS \> 40             Survey
  Care continuity through revoke/re-grant cycles                         \<5d disruption avg   Time-to-restore

§10 --- UX ve Tasarım Notları
-----------------------------

### 10.1 Patient Autonomy First --- Tone + Visual Dil

*Sinalytix konumlanmasının özü \"patient autonomy\"; Doc 10 UI bunu
hissedilebilir kılmalı.*

-   Privacy-friendly visuals: shield, lock icons
-   Tone: \"Sizin verileriniz. Sizin kontrolünüzde.\" (EN: \"Your data.
    Your control.\")
-   Action verbs patient-empowering: \"Grant access\", \"Modify
    access\", \"Revoke\"
-   Visual transparency: who sees what; never opaque

### 10.2 Granular Consent Matrix UX

*Per-category × per-org grant matrix overwhelming olabilir; UX
abstraction shipte gerekli.*

-   Default view: high-level \"My Care Team --- All Categories\" toggle
-   Expand for granular per-category control
-   Bulk operations (grant all to org; revoke all from org)
-   Visual: heat-map style green/gray/red

### 10.3 SDM Declaration --- Sensitive Topic Handling

*SDM yasal vekil declaration --- kapasitesi düşmüş olma ihtimaline
ilişkin. UI tone yumuşak + bilgilendirici.*

-   Intro: \"Health emergencies --- you can designate someone you trust
    to make decisions if you can\'t\"
-   Form ile sürpriz olmadan adım adım
-   POA upload guidance (multi-language)
-   Skip option always (patient autonomy honored)

### 10.4 Break-Glass --- Klinik Aciliyet vs Patient Autonomy Tension

*Break-glass override patient autonomy ile clinical emergency arasındaki
tension noktası. UX bunu çok dikkatli yönetir.*

-   Multi-step deliberate friction (mistake önler)
-   Clinical urgency justification mandatory + structured (yumuşatma)
-   Multi-actor approval (CC + MRP) --- single-person decision değil
-   Time-limited (otomatik revoke)
-   Patient/SDM 24h post-notify (autonomy respect)
-   Provincial College reporting (regulatory)
-   Sinalytix Operations alert (oversight)

### 10.5 Notification Preferences --- User Control Granular

*Doc 9 unified notif primitive Doc 10\'da kullanıcı kontrolü.*

-   Per-event-type toggle (HCP and patient context\'inde farklı set)
-   Quiet hours respect (work-life balance)
-   Email digest opt-in granular (daily vs weekly)
-   \"Mute thread\" option per conversation (V1)

### 10.6 Adherence Reporting --- Friction Minimal

*Patient daily prompt; UX friction minimum, tek tıkla submit.*

-   Push notif sabah custom time (Settings)
-   One-tap \"Took it\" / \"Missed\" / \"Skip\"
-   Optional mood slider quick add
-   Streak gamification (V1; carefully --- patient wellbeing first)

### 10.7 Language Preference --- Cascade Visual

*User-level language cascade UI + note default + patient view default.*

-   Settings → Language: clear visualization \"Affects: UI + note
    authoring + patient view defaults\"
-   Per-feature override possible (Settings → Note Authoring Language
    ayrı V1)
-   Bedrock translate transparency: \"Patient/family see translated
    version\"

### 10.8 Mobile vs Web

-   **Mobile primary:** Patient consent management; adherence
    self-report; notification interaction
-   **Web full:** HCP settings detail (templates, SmartTools, working
    hours setup); break-glass workflow; audit log query

### 10.9 Erişilebilirlik

-   WCAG 2.1 AA
-   Screen reader announce: consent state changes, SDM activation
-   High contrast: consent state colors dual-encoded
-   Keyboard nav full
-   Multilang support (EN + FR MVP; V2 expand)

§11 --- Kullanıcı Senaryoları
-----------------------------

### 11.1 Senaryo: Patient Initial Onboarding Consent

**Aktör:** Patient Maria T. (newcomer, ON home care)

**Akış:**

1.  Doc 1 onboarding (HCP-initiated; Maria identity verify; soft-gate
    active).
2.  Maria Patient app açar; ilk açılışta CONSENT-WIZARD-01 launch.
3.  Step 1 Sinalytix intro: \"Verileriniz Kanada\'da güvenli
    sunucularda. Siz kontrol edersiniz.\"
4.  Step 2 Care team identification: \"Şu an Sinapse Home Care\'in size
    bakacağını anlıyoruz. Onaylar mısınız?\" → \"Onaylıyorum\".
5.  Step 3 Per-category consent picker:
    medications/labs/imaging/demographic auto-granted (defaults). Mental
    health/HIV/genetic/gender --- Maria pas geçer (default deny).
    Sensible defaults applied.
6.  Step 4 SDM optional: Maria kızı Sarah\'yı declare etmek istiyor. POA
    yok yet → \"Sonra eklerim\" skip.
7.  Step 5 Family caregiver: Sarah (kızı, RelatedPerson) declared as
    caregiver (limited scope per Doc 5 B2.3).
8.  Step 6 Adherence reporting: opt-in.
9.  Step 7 Notification preferences: push enabled, quiet hours
    22:00-08:00.
10. Confirm → consent records created; care team HCPs notif \"Maria
    consent set up; access scope granted\".

**Sonuç:** Maria autonomy-respecting onboarding; klinik HCP\'ler
scope-limited access başlatır; safety + privacy dengeli.

### 11.2 Senaryo: Cross-Org Specialist Consult Consent

**Aktör:** CC Anne + Patient Maria + Specialist Dr. Patel (UHN
Neurology)

**Akış:**

1.  Anne Maria için neurology consult önerisi (stroke recurrence
    sonrası).
2.  Anne Patient app push notif Maria\'ya: \"Sinapse\'tan CC Anne sizden
    UHN Neurology Dr. Patel\'e 30 günlük erişim istiyor --- palliative
    pathway için.\"
3.  Maria notif tap → CONSENT-GRANT-REQ-01 modal: scope (Care Plan +
    Patient 360 + Active Problems + Recent Labs), expiry 30d,
    credentials Dr. Patel.
4.  Maria \"Grant access\" → consent\_grant created; Dr. Patel notif.
5.  25 gün sonra: 5d remaining warning Maria\'ya: \"Erişim 5 gün sonra
    dolacak; renew etmek ister misiniz?\".
6.  Maria \"Renew 30d more\" → grant extended.
7.  60 gün sonra Maria döner; pathway stabilize edildi; \"Revoke
    specialist access\" → cascade real-time.

**Sonuç:** Time-bounded consent + patient explicit renew; consultation
kapanış autonomous.

### 11.3 Senaryo: SDM Activation (Capacity Decline)

**Aktör:** Patient Maria (cognitive decline) + MRP Dr. Lee + SDM
(Maria\'s daughter Sarah)

**Bağlam:** Maria dementia progression; klinik karar yapma kapasitesinde
belirgin düşüş.

**Akış:**

1.  Dr. Lee Maria\'nın chart\'ında capacity decline gözlemler;
    \"Initiate Capacity Assessment\".
2.  T3 re-auth + ON HCCA capacity assessment form:
    -   Domain-specific evaluation (medical, financial)
    -   MRP attestation: \"Maria is incapable of making this healthcare
        decision because of progressive cognitive impairment from
        dementia\...\"
3.  Sign + commit assessment → audit chain.
4.  SDM-ACTIVATE-01 workflow tetiklenir: ON HCCA hierarchy.
5.  Maria önceden POA Sarah\'yı declare etmiş (SDM-DECLARE-01 §11.1 step
    4 follow-up later) → Sarah auto-activate.
6.  Sarah notif \"Bayanız capacity assessment ile incapable bulundu;
    sizin SDM yetkiniz aktif\" → Sarah identity verify (Doc 1 paterni).
7.  Sarah Patient app\'ten patient-on-behalf-of consent management open;
    mevcut grant\'leri review eder.
8.  Family + care team transparency notif.
9.  Maria klinik karar verme yetkisi şu an Sarah\'da; tüm consent
    değişiklikleri Sarah üzerinden.
10. Audit chain: SDM activated + MRP + framework + timestamp.

**Sonuç:** Patient autonomy → SDM autonomy chain klinik gerçekliği
yansıtır; ON HCCA compliance.

### 11.4 Senaryo: Adherence Self-Report → Care Team Alert

**Aktör:** Maria (post-SDM, Sarah caregiver) + CC Anne

**Bağlam:** Maria Apixaban active; Sarah günlük adherence self-report
opt-in.

**Akış:**

1.  Sarah Patient app push notif sabah 09:00: \"Maria bugün Apixaban
    aldı mı?\"
2.  Sarah tap → \"Took it\" (one-tap).
3.  Submit → Adherence Service → MedicationAdministration Observation +
    Doc 4 Active Meds widget update.
4.  3 gün sonra Sarah missed → \"Forgot today\" submit.
    d.  gün missed → 5. gün missed. Pattern alert tetiklenir (V1).
5.  CC Anne worklist alert: \"Maria T. missed 3 doses Apixaban ---
    clinical follow-up?\".
6.  Anne Sarah\'ya message: \"Sarah, Maria\'nın Apixaban\'ı için sorun
    var mı? Konuşalım\".
7.  Sarah: \"Maria mide şikayeti vardı, ilacı reddetti\".
8.  Anne MRP Dr. Lee\'ye: \"Apixaban tolerability check; alternative
    consider?\".
9.  Plan revision Doc 6 paterni.

**Sonuç:** Adherence self-report → klinik action chain; aile-clinical
team koordinasyonu real-time.

### 11.5 Senaryo: Break-Glass Override (V1 Hypothetical)

**Aktör:** ER MRP Dr. Smith + CC Anne + MRP Dr. Lee

**Bağlam:** Maria bilinçsiz; ev\'de Sarah 911 çağırmış; UHN ER\'de
geliyor. Maria şu an Sinapse\'a aktif consent; UHN ER farklı org;
consent yok.

**Akış (V1):**

1.  UHN ER Dr. Smith Sinalytix\'te Maria\'yı görür ama erişim engelli
    (consent yok).
2.  Dr. Smith \"Break-Glass Override\" CTA → BREAK-GLASS-REQ-01.
3.  Step 1 Justification: \"Patient unconscious presented with stroke
    symptoms; need immediate medication history + allergies for
    life-saving decision\".
4.  Step 2 T4 re-auth (Dr. Smith full 2FA + biometric).
5.  Step 3 Approval cascade: CC Anne (Sinapse) + MRP Dr. Lee
    notification → both confirm (T3 each).
6.  Step 4 72h time-limited access granted; full audit log every read.
7.  Dr. Smith Maria\'s Patient 360 + Active Meds + Allergies + Recent
    Labs okur → clinical decision-making.
8.  24h sonra Maria conscious + capacity restored; Sarah Sinalytix\'e
    bilgi → Maria notif \"Break-glass override used by UHN ER; full
    audit log available\".
9.  Provincial College reporting Sinalytix Operations.
10. 72h sonra override auto-expire; UHN Dr. Smith access auto-revoked.
11. Maria isterse follow-up: explicit consent grant UHN Neurology
    (normal flow).

**Sonuç:** Clinical emergency + patient autonomy balance; tüm audit
chain + post-notification.

§12 --- Açık Konular
--------------------

### 12.1 V0 Launch Öncesi

-   Patient consent wizard plain-language final wording (multilang)
-   Sensible defaults per-category review (PMR uzmanı + privacy advisor)
-   SDM declaration UX flow detail (POA document requirements +
    provincial-aware copy)
-   ON HCCA capacity assessment form fields final
-   Notification preferences default set
-   Working hours UX (overlapping orgs)
-   Adherence prompt frequency + content (multilang)
-   Bedrock translate cost per consent action (acceptable threshold)
-   HCP language preference cascade testing
-   Patient sensitive category prefs default (deny everything; explicit
    opt-in)

### 12.2 V1 Spec

-   Break-glass override full workflow (UI + API + audit + College
    reporting)
-   Multi-province SDM (BC RAA, QC mandate, AB)
-   Trusted device management Doc 2 cross-ref
-   ONE ID SAML federation HCP login (Doc 2 cross-ref)
-   Audit log query UI clinician (Doc 2 cross-ref)
-   License renewal proactive workflow (Doc 1 cross-ref)
-   Consent grant time-bounded auto-renew prompt
-   Consent grant re-affirmation annual prompt
-   Adherence pattern alert (missed doses trend)
-   Patient comment thread on consent grants
-   Org admin consent governance dashboard
-   \"Vacation mode\" for adherence reporting (suppress alerts)
-   Audit log right-to-know patient query (V1)

### 12.3 V2+

-   Multi-province SDM expansion (provincial-aware)
-   Bill C-27 CPPA + AIDA compliance (AI consent governance)
-   Patient right-to-be-forgotten workflow (PHIPA exception)
-   Cross-province consent portability
-   Population research consent (de-identified aggregation)
-   Multi-language consent UI expansion (TR, MAN, PUN, AR)
-   Newcomer cross-border consent normalization
-   Genetic/genomic data consent expand
-   AI consent (AI Scribe, LLM translate) granular V2

### 12.4 Cross-App Reconciliation (Post-10-Doc)

-   Patient/Caregiver/Family PRD\'lerinde consent layer mirror
-   Notification primitive cross-app contract
-   SDM cross-app visibility
-   Adherence reporting cross-app entry points
-   Sensitive lockbox cross-app render

### 12.5 Klinik Review

-   ON HCCA framework operationalization fidelity
-   Capacity assessment form clinical adequacy (PMR review)
-   Break-glass override clinical urgency threshold definitions
-   SDM hierarchy edge cases (estranged family, no relatives)
-   Sensitive category taxonomy (mental health subcategories ---
    addiction, suicide attempt history)
-   Adherence pattern alert clinical false-positive tolerance

### 12.6 Pilot Feedback Tuning

-   Patient consent wizard completion rate per question type
-   SDM declaration rate (uptake) vs medical realism
-   Adherence reporting opt-in rate + completion
-   Cross-org consent grant rate (specialist consult)
-   Notification opt-out rate per event type
-   Patient consent revoke patterns (which trigger common)

### 12.7 Backend Infra

-   Consent grants cache strategy (PolicyEngine read-heavy)
-   Real-time cascade architecture (event bus + idempotency)
-   Cross-region consent (Quebec data residency edge case)
-   Audit log query performance (cross-doc events filter)
-   Provincial College reporting API integration (V1)
-   POA document storage + verification workflow

*Sinalytix HCP PRD --- Doc 10: Patient Consent, Notifications, Settings
& Cross-Cutting. v1.0 --- 31 Mayıs 2026. **Final document of HCP PRD
series (10/10).** Master Doc §4.8 + §5.10 + §5.13 + Foundation \#5 + Doc
1-9 baseline ile uyumlu. Q&A pas geçildi; recommended kararlarla
yazıldı; kullanıcı son kontrol.*

> **\[İNSAN REVIEW GEREKLİ\]** Doc 10 düşük-güven: "Q&A pas geçildi; recommended kararlarla yazıldı". İçeriği bu reconciliation pass'inde **çözülmedi** (yalnız bayrak); insan/klinik danışman gözden geçirmesi gerekir.

§13 --- Doc 1-10 Serisi Tamamlandı --- Sıradaki Aşama
-----------------------------------------------------

**HCP PRD Serisi 10/10 doc tamam.** Sinalytix MVP roadmap için sonraki
adımlar:

1.  **Cross-app reconciliation pass** (ayrı doc ---
    Sinalytix\_CrossApp\_Reconciliation\_Audit.md): User table
    extension, ConsentRecord schema, Notification primitive unification,
    Patient resource CA Core+ alignment, Session schema, AuditLogEntry,
    PolicyEngine, Provenance, CareTeam, Care plan patient-facing, AI
    Scribe consent cross-app --- Patient/Caregiver/Family PRD\'leri ile
    reconcile. Continuation Brief §4 tablosu temel; kullanıcı (Efe) son
    hakem.

2.  **Software Architecture Document (SAD):** PRD\'leri infrastructure +
    service architecture + deployment topology + non-functional
    requirements\'a dönüştür.

3.  **Antigravity / Claude Code development cycle:** SAD → vibecoding →
    MVP build. GitHub repo: `https://github.com/efe7694/sinalytix.git`.

4.  **IRAP / hibe başvuru:** Sinalytix research grants for MVP
    development support.

5.  **Pilot deployment:** Q4 2026 launch hedef; 2-3 home care org pilot.

6.  **Klinik review (PMR uzmanı + CXO + privacy advisor):** Doc 1-10
    toplu review; konsolide feedback.
