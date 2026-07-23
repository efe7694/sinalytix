# Sinalytix Doküman Seti — repo kopyası

Bu klasör, ürünün **tek ve kendi kendine yeterli** spesifikasyon setidir (v2.0,
2026-07-22). Mühendislik El Kitabı §2 gereği doküman seti repo içinde yaşar:
daha önce spec her oturumda dışarıdan yeniden eklenmek zorundaydı, bu da
"hangi sürüme göre kodladık?" sorusunu sürekli belirsiz bırakıyordu.

**Kaynak:** `_OKUBENI_Proje_Talimati.md` (bu klasörde) — set kullanım
talimatının kendisi. Yeni bir spec sürümü geldiğinde bu klasör bütünüyle
değiştirilir ve değişikliğin kodu nasıl etkilediği `DEVIATIONS.md`'ye
yazılır (bkz. D15).

## Öncelik sırası (çelişki durumunda üstteki kazanır)

1. `Sinalytix_Canonical_Data_Dictionary.md` (v0.2) — **TEK doğruluk kaynağı**;
   B1–B10 + K1–K11 kararları.
2. `Core_Infra_PRD_Module1__RECONCILED.md` … `Module4_Agent.md`
3. `Sinalytix_SOS_UX_Akis_Spec.md`, `Admin_Panel_PRD.md`
4. Uygulama PRD'leri (`Hasta_Patient` / `Family_App` / `Caregiver` /
   `HCP_Combined` `__RECONCILED.md`)
5. Destek dokümanları: Tasarım Sistemi, Mühendislik El Kitabı, Test & QA,
   Uyum Listesi, Kapsam Matrisi, Sözlükçe, Developer Teslim Notu.

## Okuma kuralları (kod üretirken uy)

- "Eski metin + `[RECONCILED: ...]` / `[KARAR Kx]`" deseninde **her zaman
  notun hâli esastır**.
- `ÖNERİLEN DEFAULT — teyit bekliyor` etiketli kararlar (K1, K2, K4, K6, K8)
  aynen kodlanır; değiştirme yetkisi yalnız ürün sahibindedir.
- V1/V2 etiketli özellikler (Kapsam Matrisi) kodlanmaz; yalnız şema-hazırlığı
  yapılır (nullable kolon / enum değeri).
- Runtime sabitleri (süreler, limitler) **koda gömülmez**; `SystemConfig`
  anahtarlarından okunur (K10, Admin PRD A7) — repo karşılığı
  `packages/config`.
- SaMD yasak-listesi (Uyum Listesi §3) her özellikte geçerlidir: teşhis /
  triage / doz / otomatik-acil davranışı EKLENMEZ, pazarlama metninde bile.
- interRAI MAPLe kuralları ve klinik not/order şablon **içerikleri** bilerek
  yoktur (lisans + klinik danışman) — uydurulmaz, şema/placeholder kullanılır.

## Şema değişikliği süreci (Teslim Notu §7 — "sözlük-önce")

Sözlük PR → `packages/domain` (contracts) PR → migration PR. Bu sırayı
atlayan şema değişikliği kabul edilmez.

## Repo ↔ El Kitabı §2 dizin eşlemesi

El Kitabı'nın önerdiği düzen ile bu repo'nun düzeni birebir aynı değil; El
Kitabı §1 ikameye açıkça izin veriyor (kontratlar ve SLO'lar değişmediği
sürece). Güncel eşleme:

| El Kitabı §2 | Bu repo |
|---|---|
| `apps/api` | `services/core-api` |
| `apps/rt-gateway` | `services/ws-gateway` |
| `apps/worker` | `services/job-runner`, `services/notification`, `services/ingestion-worker` |
| `apps/patient` / `family` / `caregiver` | aynı (`apps/*`) |
| `apps/hcp` / `admin` / `web` | **henüz yok** (Faz 5 / Admin fazı) |
| `packages/contracts` | `packages/domain` |
| `packages/policy` | `packages/policy-engine` |
| `packages/config` | `packages/config` |
| `packages/ui` | aynı |
| `packages/i18n` | **henüz yok** |

Ek olarak repoda El Kitabı'nda geçmeyen `packages/db` (migration + RLS),
`packages/audit`, `packages/api-client`, `packages/shared` (eski app'lerin
paketi — D1) bulunur. `services/api` (eski Python backend) emekliye
ayrılmaktadır; harvest kuralları `LEGACY_HARVEST.md`'de.
