# Sinalytix — Konsolide Kapsam Matrisi (V0 / V1 / V2)

**Sürüm:** 0.1 · **Tarih:** 2026-07-22 · Tüm dokümanlardan derlenmiş tek sürüm-kapsam görünümü. Çelişki durumunda ilgili PRD + sözlük kazanır; bu matris **navigasyon** içindir. "V0" = ilk üretim sürümü (MVP).

| Alan | V0 (MVP) | V1 | V2 |
|---|---|---|---|
| **Kimlik** | `User`+`roles[]`, per-app oturum, TOTP/SMS-OTP MFA, max 5 oturum | cihaz güveni (`trusted`) | SSO (uygulamalar-arası), WebAuthn |
| **Consent** | `ConsentRecord` + `ConsentGrant` yazım/okuma (declarative_v0) + `SDMDeclaration` (ON) | **PolicyEngine tam enforcement (Cedar)**, revoke-cascade zaten V0 | BC/QC/AB SDM kuralları, POA belge doğrulaması |
| **Görev motoru** | `CareTask`/`CareTaskOccurrence`, K7 üretim, B1 kuralı, carry-over 7g, decompose (yellow-onaylı) | "bakıcı yokken aile" istisna kararı, kaçırılan-doz pattern uyarısı | — |
| **Vardiya** | check-in/out, auto-switch, K3 24/36/48s zinciri, tek aktif vardiya | SBAR yapılandırılmış not (K2), kaçırılan-checkout eskalasyonu + PRD 08 lone-worker | EVV/GPS `location_checkin` |
| **SOS** | Tam akış (SOS UX spec), `SOSEvent`/`CallAttemptLog`, aile banner 4s | — | — |
| **AI — tüketici** | Sina komut/QA/semptom (foreground wakeword), aile/bakıcı brifing+QA, guardrail (judge+tier), K8 | kilitli-ekran wakeword (+ayrı consent), decompose şablonları | — |
| **AI — HCP** | Scribe (taslak→klinisyen imza), RAG-QA (kaynaklı) | tanı kodu önerisi (insan-onaylı) | — |
| **Klinik** | İlişkisel çekirdek (Patient…Provenance), Patient-360, care plan master/subplan, manuel interRAI form | algoritmik MAPLe/CAP (lisans), conflict auto-merge yardımı | — |
| **Orders/Rx** | e-fax gönderim, `ServiceRequest` | kontrollü madde (web-only+T4+Narcotic Monitoring), eReferral (Ocean) | PrescribeIT e-prescribing |
| **Ingestion** | Tier 1–4 + insan doğrulama kuralları, maliyet tavanları | batch provenance (perf) | — |
| **Mesajlaşma** | HCP↔hasta/aile, bakım ekibi grubu, agent etiketi | cross-org HCP↔HCP (consent-gated), mesaj edit/soft-delete penceresi | — |
| **Bildirim** | Tek `Notification`+taksonomi, push/in-app/email, quiet-hours, DND (B6) | SMS kanalı, per-hasta DND override, süreli DND | — |
| **Erişim istisnaları** | break-glass YOK (K5; uygulama-dışı prosedür) | `BreakGlassOverride` tam akış | — |
| **Onay/yönetişim** | `ApprovalRequest`+K4 (toggle, 48s, deadlock-override), K6 full↔SDM | bakıcı-görev düzenleme yetki ayrıntısı (FAM-13 koordineli) | hastalık-bazlı yetki önerisi |
| **Admin** | A1 kredensiyel, A2 destek, A4 audit+AI kuyruğu, A5 ingestion, A7 config+kill-switch, A8 pano | dışa aktarım otomasyonu, şablon yayın akışı, user_pct flag, WebAuthn | — |
| **Arama** | PG FTS (RLS-filtreli) | Elasticsearch (tenant-index) | — |
| **Altyapı** | ca-central-1 tek bölge, monolit+worker+rt-gateway, SQS, blue/green | okuma replikası (K11) | Toronto+Montreal active-active |
| **Offline** | okuma cache 24s; bakıcı check-in yazma kuyruğu | genel tüketici yazma kuyruğu | — |
| **FHIR** | `/fhir/r4` sunucu-sunucu (kaynak-bazlı), CA Core+ (Patient, Observation) | `$everything`, kalan CA Core+ profilleri | SMART-on-FHIR |
| **Lockbox/hassas** | B5 dört kategori + `substance_use` mutlak | — | `genetic` kategorisi |
| **Yerelleştirme** | EN/FR/TR tam (tüketici); TR dahili (HCP) | — | ek diller/RTL değerlendirme |
| **Pazar** | Ontario | — | BC/QC/AB genişleme (SDM kuralları ile) |

**Okuma notu:** Bir özellik bu matriste V1/V2 ise, V0 kodunda yalnız şema-hazırlığı (nullable kolon, enum değeri) bulunabilir; davranış kodlanmaz. V0 kolonundaki her satırın davranış spec'i ilgili PRD'de mevcuttur.
