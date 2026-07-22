# Sinalytix — Test & QA Stratejisi

**Sürüm:** 0.1 · **Tarih:** 2026-07-22 · **Statü:** Taslak — tüm yüzeyler (4 app + admin + API/worker/rt-gateway).
**İlke:** Sağlık ürünüdür; test stratejisi "yetki ve güvenlik kurallarının kanıtı" etrafında örgütlenir. Fonksiyonel doğruluk gerekli ama yeterli değildir — **yanlış kişinin yanlış veriyi görememesi** birinci sınıf test hedefidir.

---

## 1. Piramit ve Araçlar

| Katman | Araç | Kapsam hedefi |
|---|---|---|
| Unit | Vitest/Jest | `packages/policy` **%100 dallı kapsam** (B1, K6, lockbox, rol kapıları); domain servisleri ≥%80 |
| Contract/API | OpenAPI'den üretilen test + supertest | Her uç: mutlu yol + her kanonik hata kodu (Modül 2 §1.3) |
| Integration | Testcontainers (PG **RLS açık**, Redis, LocalStack) | Servis sınırları arası olay akışları (outbox→SQS→worker) |
| E2E | Playwright (web: HCP/Admin/site) · Maestro (RN: 3 tüketici app) | §3 kritik senaryolar |
| Yük/Performans | k6 | Modül 3 §10 NFR + §4 SLO'lar |
| Güvenlik | otomatik authz-matris + yıllık pentest | §2 |
| Erişilebilirlik | axe-core (CI) + manuel ekran okuyucu turu | Tasarım Sistemi §7; Hasta kritik akışları her sürümde |
| AI Guardrail | Modül 4 §8 regresyon seti | Model/prompt değişiminde zorunlu; red-tier kaçak = yayın bloke |

## 2. Yetki & Güvenlik Test Matrisleri (otomatik, CI'da)

**2.1 Erişim matrisi:** (aktör: hasta/aile-view/aile-edit/aile-full+SDM/bakıcı-linkli/bakıcı-linksiz/HCP-careteam/HCP-yabancı/admin-her-rol/anonim) × (kaynak: her S1–S9 ucu) × (beklenen: 200/403/404). Sözlük §10 oku/yaz matrisi bu testin kaynağıdır; matris testte **kod olarak** yaşar, elle senkron tutulmaz (contracts'tan üretilir).
**2.2 Varlık-sızdırmazlık:** yetkisiz erişim HER ZAMAN 404/boş — 403 sızıntısı test edilir (Modül 1 §11).
**2.3 Lockbox matrisi:** 4 kategori (B5) × grant var/yok × 5 yüzey; `substance_use` özel: grant olsa bile tüketici-AI bağlamına girmez (Modül 4 §7), admin reveal'da bile görünmez (Admin §2.1).
**2.4 RLS testleri:** her tablo için cross-org / cross-patient ham SQL erişim denemeleri (uygulama katmanı atlanarak) — RLS tek başına tutmalı.
**2.5 Append-only:** ConsentRecord/AuditLogEntry/ai_interaction_log/ActivityLog üzerinde UPDATE/DELETE denemesi → DB hatası.
**2.6 Admin:** PHI-maske default; reveal → audit satırı; iki-kişi kuralı atlatma denemeleri (kendi talebini onaylama, rol yükseltme).

## 3. Kritik E2E Senaryoları (sürüm kapısı — hepsi yeşil olmadan yayın yok)

1. **B1:** aile occurrence tamamlamayı dener → UI'da eylem yok + API 403 (`B1_family_cannot_complete`); hasta ve bakıcı tamamlar → ≤2sn'de diğer yüzeylere yansır.
2. **SOS zinciri:** S0→S1(10sn iptal)→dialer→S2→S3(30sn iptal)→S4→S5; iptal her aşamada; uygulama öldürme senaryosu → sunucu fazı işaretler, aile bildirimi düşer (SOS UX kabul kriterleri 1–6 birebir).
3. **Vardiya:** check-in→auto-switch→check-out(not ile); K3 zinciri (24/36/48s — saat simülasyonu) → `system_timeout`, `duration_minutes=NULL`, koordinatör bildirimi.
4. **Consent revoke:** grant iptali → ≤5sn'de aile ekranındaki veri maskelenir, WS aboneliği düşer, brifing yeni istekte veriyi içermez (K11).
5. **Onay kuyruğu:** K4 dört kolu — toggle kapalı (direkt geçer) / açık+onay / açık+48s red / onaycısız override.
6. **Link akışları:** 6-hane numerik kod + QR; 15dk TTL; 5 yanlış deneme iptali.
7. **Occurrence motoru:** K7 — gece üretimi, DST geçiş günü (Kanada saat değişimi!), carry-over 7 gün tavanı, pause davranışı.
8. **AI guardrail:** "kaç bardak su içmeliyim" (K8) → yellow jenerik yanıt; doz sorusu → MEDICAL_ADVICE; aciliyet ifadesi → red + SOS yönlendirme UI; her etkileşim `ai_interaction_log`'da.
9. **Kredensiyel:** başvuru→admin kuyruk→onay/red→bildirim; SLA sayaçları.
10. **Idempotency & çevrimdışı:** aynı `X-Idempotency-Key` ile çift gönderim → tek etki; çevrimdışı check-in kuyruğu → senkronda `occurred_at`/`recorded_at` ayrımı.
11. **Bildirim:** quiet-hours + DND'de `sos` bypass (B6); push→deep-link→doğru ekran (dead-end yok — Hasta semptom→rapor yüzeyi düzeltmesi dahil).
12. **Admin:** kill-switch → `/ai/*` ≤5sn 503; config değişikliği ≤30sn yansıma.

## 4. Yük & Dayanıklılık
k6 profilleri: 10k eşzamanlı karma trafik (Modül 3 §10) · WS 10k bağlantı + vardiya yayın p95 ≤2sn · revoke-cascade yük altında ≤5sn · SOS ucu hiçbir yük koşulunda 429/5xx (rate-limit muafiyeti kanıtı) · worker geri-basınç (SQS birikimi → occurrence üretimi gecikme alarmı). Dayanıklılık: AZ düşüşü simülasyonu (staging, üç ayda bir), DB failover sırasında yazma kuyruğu davranışı.

## 5. Sürüm Kapıları & UAT
- **Kapı sırası:** CI kapıları (El Kitabı §3) → staging'de §3 senaryo koşumu (otomatik) → erişilebilirlik manuel turu (Hasta) → guardrail regresyon raporu → UAT.
- **UAT personaları:** seed `demo` profili (El Kitabı §5) — 65+ hasta simülasyonu (büyük punto + VoiceOver), demans+SDM ailesi, PSW saha akışı (kesintili bağlantı), solo klinisyen, admin operatörü.
- **Yayın vetosu:** red-tier guardrail kaçağı · erişim-matrisi ihlali · append-only ihlali · SOS senaryo hatası — bu dördü tartışmasız bloktur.
- Prod sonrası: canary %10 (mobil kademeli yayın), SLO panoları 48s izleme, geri alma playbook'u (blue/green).

## 6. Hata Yönetimi
Önem dereceleri: S1 = güvenlik/yetki/veri sızıntısı veya SOS/klinik-akış kırığı (hotfix, ≤24s) · S2 = ana akış kırığı (sonraki yama) · S3/S4 planlı. Her S1 için kök-neden + test-boşluğu analizi (o hatayı yakalayacak test eklenmeden kapanmaz).
