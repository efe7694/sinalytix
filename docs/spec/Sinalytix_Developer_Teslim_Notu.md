# Sinalytix — Developer Teslim Notu (v2.0)

**Tarih:** 2026-07-22 · **Muhatap:** Geliştirme ekibi / Claude Code · **Statü:** Kodlamaya hazır, uçtan uca set — 5 yüzey (Hasta, Aile, Bakıcı, HCP, Admin) + ortak çekirdek + pazarlama sitesi temeli.

---

## 1. Setin içeriği ve okuma sırası (19 dosya — bu not ve _OKUBENI dahil)

| Sıra | Dosya | Rol |
|---|---|---|
| 0 | `_OKUBENI_Proje_Talimati.md` | Set kullanım kuralları (Claude Project instructions'a da yapıştırılır) |
| 1 | `Sinalytix_Canonical_Data_Dictionary.md` (**v0.2**) | **TEK doğruluk kaynağı** — tüm tablolar/enum'lar + B1–B10 ve K1–K11 karar kayıtları |
| 2 | `Core_Infra_PRD_Module1__RECONCILED.md` | Veri modeli & DB (RLS, immutability, retention) |
| 3 | `Core_Infra_PRD_Module2_API.md` | API kontratları, S1–S9 servis sınırları, WebSocket kanalları, render kontratları |
| 4 | `Core_Infra_PRD_Module3_Backend.md` | PolicyEngine, revoke-cascade, görev motoru, fan-out, deployment, NFR |
| 5 | `Core_Infra_PRD_Module4_Agent.md` | AI orkestrasyon, judge/risk-tier, skill kataloğu, SaMD sınırı |
| 6 | `Sinalytix_SOS_UX_Akis_Spec.md` | SOS ekran-ekran akışı + kabul kriterleri |
| 7 | `Admin_Panel_PRD.md` | 5. yüzey: kredensiyel, destek, uyum, ingestion ops, config/flag |
| 8–11 | `Hasta / Family_App / Caregiver / HCP_Combined __RECONCILED.md` | Uygulama PRD'leri (not-desenli; notlar esas) |
| 12 | `Sinalytix_Tasarim_Sistemi_UX_Temelleri.md` | Token'lar, bileşen kiti, erişilebilirlik, per-yüzey tema |
| 13 | `Sinalytix_Muhendislik_El_Kitabi.md` | Referans stack (K11), monorepo, CI/CD, seed/demo, DoD |
| 14 | `Sinalytix_Test_QA_Stratejisi.md` | Test piramidi, güvenlik matrisleri, 12 kritik E2E, yayın vetoları |
| 15 | `Sinalytix_Uyum_Guvenlik_Kontrol_Listesi.md` | PHIPA/PIPEDA/SaMD karşılıkları, olay müdahale, lansman blokları |
| 16 | `Sinalytix_Kapsam_Matrisi_V0_V1_V2.md` + `Sinalytix_Sozlukce.md` | Sürüm navigasyonu + ortak terminoloji |

## 2. Kilitli olanlar (tartışmasız uygulanır)
Şema/isimler (sözlük v0.2 bütünüyle) · B1 enforcement (Modül 2 §3.3) · B7/SOS kuralları (cevaplandı-varsayımı yok) · K3 vardiya zinciri · K7 occurrence üretimi · ≤5sn revoke cascade · ≤2sn realtime SLO · lockbox/`substance_use` mutlak kuralları · admin PHI-maske + iki-kişi kuralı (K9) · tüm runtime sabitleri `SystemConfig`'ten (K10) · **hiçbir açık teknik soru kalmadı** (K11 ile son seçimler de kapandı).

## 3. "ÖNERİLEN DEFAULT — teyit bekliyor" etiketlileri (kodlanır; değişirse dar yüzeyli)
K1, K2, K4, K6, K8 + B1 V1-istisnası + B7 klinik teyidi + HCP Doc 8/9/10 ("Q&A pas" dipnotlu). Bunlar **dokümantasyon eksiği değildir** — bilinçli default + imza bekleyen süreç maddesidir; imza listesi = sözlük §0.1. Uyum Listesi §5'teki dört dış inceleme (PIA, hukuk, klinik, pentest) **halka açık lansmanın** blokudur; geliştirme ve kapalı pilotu bloklamaz.

## 4. Bilerek V0'da kodlanmayanlar (kapsam kararı, eksik değil)
Kapsam Matrisi'nin V1/V2 kolonlarının tamamı; özellikle: interRAI algoritmik MAPLe (lisans), break-glass (K5), yapılandırılmış SBAR (K2), SSO, EVV, e-prescribing. V0 kodu bunlar için yalnız şema-hazırlığı içerir.

## 5. Önerilen kodlama sırası
1. **Sprint 0:** Monorepo iskeleti (El Kitabı §2) + DB şeması/migration/RLS + `packages/contracts` + `packages/policy` + seed `minimal`. S1 Identity.
2. **Sprint 1:** S2 Consent + S3 Care&Tasks (K7+B1) + S4 Shift/Link (K3 cron) + `packages/ui` çekirdek bileşenler.
3. **Sprint 2:** S6 Comms + rt-gateway + S7 SOS (UX spec) + tüketici app iskeletleri (3 RN app).
4. **Sprint 3:** S5 Clinical + Ingestion T1–T2 + S8 Governance + **S9 Admin (A1/A2/A7 önce — kredensiyel kuyruğu HCP onboarding'inin ön-koşulu!)** + Modül 4 orkestratör + guardrail seti v1.
5. **Sprint 4:** HCP derin akışları (scribe/cosign/MRP), Admin A4/A5/A8, pazarlama sitesi, E2E senaryo tamamlama (Test §3), yük testleri, UAT.

## 6. Bilinen bilinçli borçlar
declarative_v0 consent enforcement (V1 tam motor) · last-write-wins (medication+klinik dışı) · bakıcı cihaz-saat riski (`occurred_at`/`recorded_at` ayrımı) · Hasta PRD'deki mimari görsel bu kopyadan çıkarıldı (içerik kaybı yok).

## 7. Süreç kuralları
Sözlük-önce (şema değişikliği: Sözlük PR → contracts PR → migration PR) · `[RECONCILED]`/`[KARAR Kx]` notları silinmez, yeni tarihli not eklenir · SaMD yasak-listesi (Uyum §3) her AI/SOS/pazarlama PR'ında kontrol maddesi · DoD (El Kitabı §7) her PR'da.
