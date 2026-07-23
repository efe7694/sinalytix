# Sinalytix — Admin Panel PRD (İç Operasyon Konsolu)

**Sürüm:** 0.1 · **Tarih:** 2026-07-22 · **Statü:** Taslak — beşinci yüzey ("for us")
**Kural:** Tablolar Kanonik Sözlük v0.2'de; bu PRD yeniden tanımlamaz, referans verir. Yeni tanımlanan iki tablo (`SystemConfig`, `FeatureFlag`) sözlüğe K10 ile eklendi.

---

## 0. Amaç ve Konum

Admin Panel, Sinalytix operasyon ekibinin (bizim) iç aracıdır; **hasta/aile/bakıcı/HCP'ye hiçbir zaman görünmez**. Dört uygulamanın hiçbir işlevini tekrar etmez; yalnız dört uygulamanın **çalışmasını mümkün kılan** operasyonel işleri yapar: kredensiyel doğrulama, hesap kurtarma/destek, uyum denetimi, ingestion gözetimi, katalog/konfigürasyon yönetimi. Web-only (masaüstü); mobil yok.

**Tasarım ilkesi — "PHI'siz varsayılan":** Admin ekranları varsayılan olarak PHI göstermez (maskeli). PHI görüntüleme istisnai, gerekçeli ve tek tek denetlenen bir eylemdir (§2.1). Admin, klinik veri üzerinde **hiçbir düzenleme** yapamaz (okuma bile istisnai); Sinalytix "custodian değil, platform" pozisyonunu korur.

---

## 1. Kullanıcılar ve Roller

`AdminUser` (Modül 1 §3.2) + `admin_role` enum — **en az yetki ilkesiyle** dört rol + bir süper rol:

| `admin_role` | Görebildiği | Yapabildiği |
|---|---|---|
| `support` | Hesap meta verisi (maskeli), oturumlar, kurtarma biletleri | Hesap durum değişimi (soft), oturum iptali, kurtarma onayı |
| `credentialing` | Kredensiyel kuyruğu + yüklenen belgeler | Lisans onay/red, SLA yönetimi |
| `compliance` | Audit/consent/AI logları (PHI'siz projeksiyonlar; §2.1 istisnası ile ham) | Denetim raporu dışa aktarımı, inceleme işaretleri |
| `ops` | Ingestion işleri, kuyruklar, SLO panoları, maliyet | İş yeniden-kuyruklama, maliyet tavanı ayarı, config/flag değişikliği |
| `superadmin` | Hepsi | + admin kullanıcı yönetimi, `hard` durum değişimleri; **iki-kişi kuralı** gerektiren eylemlerin ikinci onaycısı |

Bir admin birden çok role sahip olabilir (`AdminUser.admin_role` → text[] olarak uygulanır; K10). Admin hesabı, tüketici/HCP hesabından **ayrı `User` satırı** olmak zorunda değildir ama ayrı `Session` ister (aşağıda).

---

## 2. Güvenlik Modeli

- **`Session.app_context = admin`** (K9 ile enum'a eklendi). Admin oturumu diğer app oturumlarıyla paylaşılmaz; SSO yok.
- Giriş: e-posta + şifre (Argon2id) + **zorunlu TOTP** (SMS fallback yok). Oturum: max 8 saat, 15dk idle timeout. IP allowlist (ofis + VPN; `IPBlock` altyapısı ters modda).
- **İki-kişi kuralı (four-eyes):** `suspended_hard`, hesap silme işleminin manuel tetiklenmesi, kredensiyel "verified→revoked" düşürme, `superadmin` atama → ikinci bir superadmin onayı olmadan uygulanmaz (`ApprovalRequest` altyapısı `requested_by_role=admin` ile yeniden kullanılır).
- **Her admin eylemi** `AuditLogEntry`'ye (`event_category=admin`) yazılır — okumalar dahil (§2.1 PHI okumaları `event_severity=critical`).
- Admin API'si ayrı önek (S9, §5) ve ayrı ağ politikası (yalnız iç origin'den CORS); rate-limit ayrı havuz.

### 2.1 PHI Reveal (mühürlü görünüm)
Varsayılan maskeler: isim → ilk harf + `***`, e-posta/telefon → kısmi, klinik alanlar → hiç gösterilmez. Bir destek/uyum vakası ham değer gerektiriyorsa: admin **"Reveal"** düğmesi → zorunlu gerekçe metni + vaka/bilet no → 15dk'lık alan-bazlı görünürlük → `AuditLogEntry(event_type=admin.phi_reveal, severity=critical)` + günlük reveal raporu compliance rolüne. Lockbox kategorili (B5) klinik veri admin panelde **hiçbir koşulda** görüntülenemez (reveal kapsamı dışı — sabit kural).

---

## 4. Modüller

### A1 — Kredensiyel Doğrulama Kuyruğu (`credentialing`)
HCP Doc 1'in operasyon yüzü. `AdminQueueItem` + `CredentialingReview` + `VerificationDocument` + `LicenseRecord` üzerinde:
- Kuyruk görünümü: SLA sayaçlı (target/hard `sla_at`), öncelik sırası, atama (claim) modeli — bir kaydı aynı anda tek admin inceler.
- Detay: yüklenen belge görüntüleyici (S3 presigned, watermark'lı, indirme kapalı V0), lisans alanları, eyalet kurul çapraz-kontrol talimat kartları (CPSO/CNO manuel arama linkleri — API yok, Modül 1 §3.4).
- Eylemler: `approve` / `reject(reason)` / `request_more_info` → başvurana `Notification` (`event_type=verification_status_change` HCP taksonomisi) + e-posta.
- SLA ihlali → ops'a uyarı; pano metriği: medyan doğrulama süresi, kuyruk yaşı.

### A2 — Hesap & Destek (`support`)
- Arama: e-posta/telefon (tam eşleşme; kısmi arama yok — PHI sızıntı yüzeyini daraltır) → hesap kartı (maskeli): `status`, `roles[]`, `auth_methods`, oturumlar, son giriş, bağlı org, link sayıları (aile/bakıcı — kişiler değil, sayılar).
- Eylemler: `suspended_soft`/aktifleştirme; `suspended_hard` (iki-kişi); tüm oturumları iptal; `RecoveryTicket` çözümü (kimlik doğrulama playbook'u: kayıtlı kanala OTP + güvenlik metaverisi teyidi; playbook operasyon el kitabında); MFA sıfırlama (iki-kişi).
- Yapamadıkları (sabit): şifre görme/atama (yalnız sıfırlama linki), klinik veri okuma/yazma, consent/grant değiştirme, mesaj okuma, görev düzenleme. Hesap silme yalnız kullanıcı-tetikli akışın (`AccountDeletionRequest`, 30g grace) izlenmesi; admin yalnız yasal zorunlulukta iki-kişi kuralıyla hızlandırabilir.

### A3 — Organizasyon Yönetimi (`support`+`ops`)
`Organization` CRUD (tip, hiyerarşi), org üyelik görünümü (`PractitionerRole` listesi — kişi değil rol düzeyi), `invisible_to_users` self-org'ların gizliliği korunur (listelenmez, yalnız tekil arama). Ajans (B2B, bakıcı `agency_id`) kayıtları V0'da buradan manuel açılır.

### A4 — Uyum & Denetim (`compliance`)
- **Audit arama:** `AuditLogEntry` üzerinde zaman + `event_type` + `event_category` + actor filtreli arama; sonuçlar PHI'siz projeksiyon (event_data zaten PHI sızdırmaz — Modül 1 §8.1). HMAC zincir doğrulama durumu göstergesi (gecelik işin sonucu).
- **Consent görünümü:** kullanıcı bazlı `ConsentRecord` zaman çizelgesi (immutable) + aktif `ConsentGrant` sayıları (scope özetli, hasta kimliği maskeli).
- **AI inceleme kuyruğu:** `ai_interaction_log`'da `risk_tier=red` ve `judge_verdict=MEDICAL_ADVICE` kayıtları (Sözlük §10 okuma yetkisi "Denetim/admin"). İçerik şifreli saklanır; inceleme §2.1 reveal + compliance rolü gerektirir. İnceleme çıktısı: `reviewed` işareti + not (ayrı `AdminQueueItem`); model/prompt regresyonuna girdi (Modül 4 §8).
- **Dışa aktarım:** tarih-aralıklı denetim raporu (CSV/PDF), superadmin onaylı, kendisi de audit'lenir.

### A5 — Ingestion Operasyonları (`ops`)
`ingestion_jobs` panosu: durum/tier/org dağılımı, başarısız işler (hata sınıfı + yeniden kuyruklama), `tier4_extraction_entities` doğrulama kuyruğunun **yaş ve hacim** metrikleri (içerik değil — içerik HCP doğrulayıcısında kalır), `document_hash_index` dedup istatistikleri, org-başına günlük maliyet vs tavan (Modül 3 §8) + tavan düzenleme.

### A6 — Katalog & İçerik (`ops`)
- `Directory*` tabloları (eczane/lab/uzman dizinleri): CRUD + coğrafi doğrulama; `org_custom` kayıtlara dokunulmaz (org'un kendisinindir).
- `COND_`/`ALG_` katalogları (Hasta onboarding seçim listeleri): sürümlü liste yönetimi (ekleme/pasifleştirme; silme yok — referans bütünlüğü), EN/FR/TR etiketler.
- Bildirim şablonları: `event_type` başına başlık/gövde şablonu, 3 dil; değişiklik sürümlenir, yayın onayı ops+ikinci göz.

### A7 — Konfigürasyon & Feature Flag (`ops`)
- **`SystemConfig`** (Sözlük K10): anahtar-değer, şema-doğrulamalı; V0 anahtar seti: `sos.freshness_window_minutes` (240), `sos.phase1_cancel_sec` (10), `sos.phase2_cancel_sec` (30), `shift.alert_hours` (24/36/48 — K3), `approval.expiry_hours` (48), `approval.reminder_hours` (24), `carryover.max_days` (7), `ai.daily_cost_cap_user/org`, `upload.credential_mb` (10), `upload.clinical_mb` (25), `link.code_ttl_min` (15). Değişiklik → audit + ilgili servislere config-invalidate olayı; güvenlik-ilgili anahtarlar (sos.*) iki-kişi kuralı.
- **`FeatureFlag`**: `key`, `scope` {global|org|user_pct}, `enabled`, `app_context[]`; V1 özelliklerinin kademeli açılışı için. AI yüzeylerinin acil kapatma anahtarı (`ai.kill_switch`) buradadır — tek admin (ops) kapatabilir, açmak iki-kişi.

### A8 — Operasyon Panosu (`ops`, salt-okunur)
SLO göstergeleri (Modül 3 §10): API gecikme, realtime yayın gecikmesi, revoke-cascade süresi, occurrence-üretim başarımı, SOS uç sağlığı, push teslim oranı, audit-yazım hata sayacı (0 olmalı). Grafana embed; panel veri kaynağı metrik deposudur, PHI içermez.

---

## 5. API — S9 `/admin/*` (Modül 2'ye ek servis sınırı)

Modül 2 §2 tablosuna eklenir: **S9 Admin** — önek `/admin`; sahip olduğu tablolar: `AdminUser`, `AdminQueueItem`, `SystemConfig`, `FeatureFlag` (+diğer sınırların admin-projeksiyon uçları). Genel sözleşme (hata zarfı, idempotency, pagination) Modül 2 §1 ile aynı; farklar: `X-App-Context: admin` zorunlu, ayrı origin/CORS, tüm mutasyonlarda `reason` alanı zorunlu (audit'e geçer).

Yük taşıyan uçlar: `GET/POST /admin/credentialing/queue|{id}/decision` · `GET /admin/users/lookup` (tam eşleşme) · `POST /admin/users/{id}/status|sessions/revoke|mfa/reset` · `POST /admin/phi-reveal` (§2.1; alan+gerekçe+TTL) · `GET /admin/audit/search` · `GET /admin/ai-review/queue` + `POST /admin/ai-review/{id}/mark` · `GET/POST /admin/ingestion/jobs|{id}/requeue` · `GET/PUT /admin/config/{key}` · `GET/PUT /admin/flags/{key}` · `POST /admin/approvals/{id}/second-approve` (iki-kişi) · `GET/POST /admin/catalogs/*` · `GET/POST /admin/orgs`.

---

## 6. Veri Modeli Ekleri (sözlüğe K10 ile işlendi)

- **`SystemConfig`** — `key` (PK) · `value` (jsonb) · `value_schema` · `updated_by` · `updated_at` · `requires_second_approval` (bool). Geçmiş: her değişiklik `AuditLogEntry`'de (ayrı history tablosu yok, V0).
- **`FeatureFlag`** — `key` (PK) · `enabled` · `scope` {global|org|user_pct} · `scope_value` · `app_context[]` · `updated_by/at`.
- `AdminUser.admin_role` → **text[]** (çok rollü admin; K10).

## 7. Kabul Kriterleri (özet)
1. PHI-maskeli varsayılan: hiçbir admin ekranı reveal olmadan ham PHI göstermez; lockbox verisi reveal ile bile görünmez (otomatik test).
2. Her mutasyon + her reveal `AuditLogEntry` üretir (%100; audit-first — yazılamazsa eylem reddedilir).
3. İki-kişi kuralı listedeki eylemlerde atlatılaamaz (tek superadmin kendi talebini onaylayamaz).
4. `ai.kill_switch` kapatma → tüm `/ai/*` uçları ≤5sn'de 503 `FEATURE_DISABLED`.
5. Config değişikliği ilgili servise ≤30sn'de yansır.
6. Admin oturumları `app_context=admin` dışında hiçbir API'ye erişemez; tüketici token'ı `/admin/*`'a 403.

## 8. Kapsam — V0 / V1
**V0:** A1, A2, A4 (audit arama + AI kuyruğu), A5, A7 (config+kill switch), A8 temel pano; A3 manuel-minimal; A6 katalog CRUD.
**V1:** A4 dışa aktarım otomasyonu, A6 şablon sürüm-yayın akışı, flag `user_pct` kademeli açılış, destek bilet sistemi entegrasyonu (harici araç), hardware-key (WebAuthn) admin MFA.
**Hiçbir sürümde:** klinik veri düzenleme, mesaj içeriği okuma, consent/grant düzenleme, hasta adına eylem.
