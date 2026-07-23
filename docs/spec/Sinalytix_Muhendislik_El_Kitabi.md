# Sinalytix — Mühendislik El Kitabı (Referans Stack, Repo, CI/CD, Veri)

**Sürüm:** 0.1 · **Tarih:** 2026-07-22 · **Statü:** Önerilen referans — [KARAR K11 uzantısı: stack seçimi ÖNERİLEN DEFAULT'tur; ekip eşdeğer bir yığını gerekçeli PR ile ikame edebilir, **kontratlar (Modül 2) ve SLO'lar (Modül 3) değişmez.**]

---

## 1. Referans Stack

| Katman | Seçim | Gerekçe |
|---|---|---|
| Dil | **TypeScript** (uçtan uca) | Tek dil; DTO tiplerinin API↔istemci paylaşımı |
| Backend | **NestJS** (modüler monolit, Modül 3 §1) | Modül sınırları = Nest modülleri; DI ile PolicyEngine enjeksiyonu |
| DB erişim | **Prisma** + ham SQL (RLS/policy için) | Migration disiplini; RLS politikaları elle SQL (Prisma yönetmez — `migrations/rls/*.sql`) |
| rt-gateway | **Node.js + uWebSockets.js** (K11) | Modül 2 §4 kontratı |
| Mobil (Hasta/Aile/Bakıcı) | **React Native (Expo)** — 3 app, tek monorepo, paylaşık `packages/` | Üç tüketici app'in bileşen/tema paylaşımı (Tasarım Sistemi §7) |
| HCP + Admin + site | **Next.js** (3 ayrı app) | Web-first yüzeyler |
| Kuyruk / cache | **SQS / ElastiCache Redis** (K11) | Modül 3 |
| Arama | PG FTS (V0) → Elasticsearch (V1) | Modül 1 §11 |
| AI | Azure OpenAI + Azure Speech (Canada Central) | Modül 4 §7 |
| IaC / CI | **Terraform + GitHub Actions** | Modül 3 §9 |
| Gözlemlenebilirlik | OpenTelemetry → Grafana stack | Modül 3 §9 SLO panoları |

## 2. Monorepo Yapısı (pnpm + turborepo)

```
sinalytix/
  apps/
    api/            # NestJS monolit (S1–S9 modülleri: src/modules/{identity,consent,care,shift,clinical,comms,emergency,governance,admin})
    rt-gateway/     # uWS WebSocket (Modül 2 §4)
    worker/         # kuyruk tüketicileri + cron (Modül 3 §1)
    patient/ family/ caregiver/   # Expo RN
    hcp/ admin/ web/              # Next.js (web = pazarlama sitesi)
  packages/
    contracts/      # DTO + zod şemaları + hata kodları — Modül 2'nin KODDAKİ TEK KARŞILIĞI; OpenAPI buradan üretilir
    ui/             # tasarım sistemi (RN + web çıktılı), Storybook
    policy/         # PolicyEngine kural seti (B1, K6, lockbox...) — saf fonksiyon, her yerden test edilebilir
    i18n/           # EN/FR/TR kaynakları
    config/         # SystemConfig anahtar tipleri + istemci SDK
  infra/            # Terraform (ca-central-1)
  docs/             # BU DOKÜMAN SETİ — repo'ya aynen konur; PR şablonu sözlük-önce kuralını hatırlatır
```

**Kritik kural:** `packages/contracts` = Modül 2'nin tek kod karşılığı. Endpoint eklemek/değiştirmek = önce contracts PR (OpenAPI diff görünür), sonra implementasyon. İstemciler üretilmiş tipli SDK kullanır; elle fetch yazılmaz.

## 3. Ortamlar & CI/CD
- `dev` (kişisel) → `staging` (sentetik veri; **gerçek PHI yasak** — CI kuralı: staging DB'ye prod snapshot kopyalanamaz) → `prod` (blue/green, tek-tık geri alma).
- CI zorunlu kapılar (merge engeli): typecheck+lint · unit · contracts-diff onayı (kırıcı değişiklik etiketi) · RLS testleri (§Test Stratejisi) · migration ileri+geri koşumu · `packages/policy` kural testleri (B1/K6/lockbox %100 dallı kapsam) · guardrail regresyon seti (AI dokunulduysa; Modül 4 §8) · axe erişilebilirlik (ui değiştiyse).
- Sürümleme: uygulama başına bağımsız (app-store döngüleri farklı); API tek `v1` (Modül 2 §1.1).
- Gizli anahtar yönetimi: AWS Secrets Manager; `.env` prod'da yasak; PR'da sır tarama (gitleaks).

## 4. Migration & Veri Disiplini
- Migration'lar yalnız ileri-yazılır; geri alma = yeni migration. Her migration PR'ında: RLS etkisi kontrol maddesi + append-only tablolara (ConsentRecord, AuditLogEntry, ai_interaction_log, ActivityLog) UPDATE/DELETE trigger'larının korunumu testi.
- Şema değişikliği süreci: **Sözlük PR → contracts PR → migration PR** (Teslim Notu §7 sözlük-önce ilkesi).
- Partition: `AuditLogEntry` aylık (Modül 1 §8.1) — otomasyon migration'da, elle partition açılmaz.

## 5. Seed & Demo Verisi (sentetik — hiçbir gerçek kişi/kurum değil)
`apps/api/seeds/` üç profil:
- `minimal`: 1 org, 1 admin (her rol), sistem config defaultları (K10 anahtar seti), bildirim şablonları, COND_/ALG_ katalog başlangıç listesi, Directory örnekleri.
- `demo`: 3 hasta persona (65+ çoklu-ilaç; demans+SDM'li; genç kronik) × bağlı aile/bakıcı/HCP hesapları, 2 hafta görev/vardiya/mesaj geçmişi, 1 çözülmüş SOS olayı, örnek care plan+subplan, tier-4 kuyrukta bekleyen 2 belge. Tüm isimler bariz-sentetik ("Test Hasta A"), telefonlar 555.
- `e2e`: test senaryolarının (Test Stratejisi §3) sabit fixture'ları (deterministik id'ler).
Lockbox kategorili sentetik kayıt demo'da **bulunur** (görünürlük filtrelerinin demo'da kanıtlanması için) ama yalnız `demo_lockbox=true` bayrağıyla yüklenir.

## 6. Yerel Geliştirme
`docker compose up` → PG (RLS aktif!), Redis, LocalStack (SQS/S3), mock-LLM (deterministik judge cevapları — testlerde gerçek LLM çağrısı yok). `pnpm dev` tüm app'leri turbo ile ayağa kaldırır. RLS lokalde **asla kapatılmaz** (en pahalı hata sınıfını erken yakalar).

## 7. Tanımlar: Bitti (DoD)
Bir iş "bitti" sayılır ancak: kontrat + testler + audit olayları + i18n anahtarları + erişilebilirlik etiketi + boş/hata durumu + dokümandaki ilgili PRD bölümüne uygunluk kontrolü tamamsa. PR şablonunda bu listeye + "hangi PRD bölümü?" alanına zorunlu referans.
