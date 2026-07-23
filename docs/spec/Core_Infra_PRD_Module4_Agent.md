# Sinalytix — Birleşik Çekirdek Altyapı PRD
## Modül 4 / 4 — Agent Orkestrasyon & AI Guardrails

**Sürüm:** 0.1 · **Tarih:** 2026-07-22 · **Statü:** Taslak (Modül 1–3 + Kanonik Sözlük v0.2 üzerine)
**SaMD sınırı (değişmez):** Bu modüldeki hiçbir davranış teşhis koymaz, tedavi/doz önermez, klinik değerlendirme yapmaz, aciliyet triage'ı yapmaz. Tüm AI = **koordinasyon + kayıt + arama/iletişimi kolaylaştırma + belgelendirme yardımı**. Bu sınırı genişleten her değişiklik Health Canada SaMD değerlendirmesi gerektirir ve bu PRD kapsamında **yasaktır**.

---

## 0. Yönetici Özeti

Dört uygulamadaki tüm AI yüzeyleri (Hasta "Sina" sesli/yazılı agent, Aile brifing+Q&A, Bakıcı asistan, HCP Scribe+RAG) **tek orkestrasyon çekirdeğinden** geçer: girdi → skill yönlendirme → **judge** (sınıflandırma) → **risk katmanı** (green/yellow/red) → aksiyon/yanıt → **`ai_interaction_log`** (immutable, B3). Uygulamalar kendi guardrail'ini yazmaz; çekirdek pipeline'ı çağırır.

---

## 1. Mimari

```
istemci → /ai/* (Modül 2 §3.8) → Orchestrator
  1. Consent kapısı  (ConsentRecord.flags.ack_ai_processing — B9; yoksa 403 CONSENT_REQUIRED)
  2. Context builder  (rol-filtreli veri: PolicyEngine'den geçmiş DTO'lar; ham tablo erişimi YOK)
  3. Skill router     (§2)
  4. LLM çağrısı      (Kanada-host; §7)
  5. Judge            (§3 — ayrı, küçük model + kural seti; ana modelin kendi çıktısını yargılamasına izin yok)
  6. Risk gate        (§4 — green/yellow/red davranışı)
  7. Action executor  (§5 — yalnız beyaz-liste araçlar)
  8. Logger           (§6 — ai_interaction_log, her adım)
```
Orkestratör `worker` sürecinde koşar (Modül 3 §1); senkron yüzeyler (chat) streaming yanıt verir, asenkron yüzeyler (scribe, brifing) iş kuyruğundan.

## 2. Skill Kataloğu (per-app)

| Skill (`ai_interaction_log.skill`) | Uygulama | Ne yapar | Ne YAPMAZ |
|---|---|---|---|
| `command` | Hasta | Sesli/yazılı komut → uygulama aksiyonu (görev tamamla, mesaj gönder, çağrı başlat, hatırlatma kur) | Klinik soru yanıtlamaz → `qa`'ya yönlenir |
| `symptom` | Hasta | Serbest şikâyet → max 2 nötr netleştirme sorusu → `SymptomReport` (aile/bakıcıya iletim) | Triage/aciliyet değerlendirme, tavsiye |
| `qa` | Hasta, Aile, Bakıcı | Uygulama-içi veri hakkında soru ("bugün hangi ilaçlar var?") + genel yaşam sohbeti | Tıbbi tavsiye (K8 dahil) |
| `briefing` | Aile, Bakıcı | Günlük özet üretimi (görev/vardiya/rapor verisinden, rol-filtreli) | Klinik yorum ("kötüleşiyor" demez; sayıları aktarır) |
| `decompose` | Hasta, Bakıcı, HCP | `CareTask` → alt görevler (`parent_task_id`; Modül 2 §3.3 `/decompose`) | Yeni klinik içerik icadı; yalnız var olan plan/görev metnini böler |
| `translate` | Hepsi | EN/FR/TR çeviri (mesaj, not özeti) | — |
| `scribe` | HCP | Ses → transkript → taslak not (`ai_scribe_drafts`, mutable); klinisyen düzenler + imzalar | Kendi kendine imza/finalize; tanı kodu önerisi V1+insan-onaylı |
| `rag_qa` | HCP | Kurum-içi kılavuz/hasta-kaydı RAG yanıtı, **kaynak alıntılı** | Kaynaksız serbest klinik yanıt |

Yeni skill ekleme = bu tabloya kayıt + judge kural seti güncellemesi + risk sınıfı ataması; kod-yolu başka türlü açılmaz.

## 3. Judge (sınıflandırıcı)

Her etkileşimde bağımsız judge çağrısı; çıktı `judge_verdict` (Sözlük §5): `MEDICAL_ADVICE` (tıbbi tavsiye istendi/üretilmek üzere) · `IN_SCOPE_ACTION` (meşru uygulama aksiyonu) · `GENERAL_LIFE` (klinik olmayan sohbet) · `IRRELEVANT` · `REFUSED` (+ HCP'ye özgü `SCRIBE_DRAFT`, `RAG_ANSWER` alt-türleri log'da `skill` ile ayrışır). Judge iki katmandır: (1) deterministik kural/regex ön-filtre (ilaç adı+doz kalıpları, "ne kadar almalıyım", aciliyet kelimeleri); (2) küçük LLM sınıflandırıcı. İkisi çelişirse **daha kısıtlayıcı** kazanır.

**K8 — GENERAL_LIFE klinik sızıntı kuralı:** nicel sağlık/beslenme/egzersiz/sıvı tavsiyesi ("kaç bardak su", "kaç kalori", "ne kadar yürüyeyim") GENERAL_LIFE **sayılmaz** → `MEDICAL_ADVICE` işaretlenir → yellow davranışı: jenerik, kişiselleştirilmemiş yanıt + "bu sizin durumunuza özel bir soru; bakım ekibinize danışın" + istenirse mesaj taslağı önerisi (bakım ekibine iletmek üzere). CHF/CKD benzeri kısıt senaryoları için güvenli default budur; kişiselleştirilmiş miktar **hiçbir koşulda** verilmez.

## 4. Risk Katmanı (green/yellow/red)

| Tier | Tanım | Davranış | `human_approved_by` |
|---|---|---|---|
| **green** | Okuma/özet/sohbet; geri alınabilir tekil aksiyonlar (görev tamamla, hatırlatma kur, çeviri) | Otomatik yürüt; sonuç bildirimi | — |
| **yellow** | Veriyi değiştiren/paylaşan aksiyonlar (görev oluştur/düzenle, mesaj gönder, SymptomReport iletimi, decompose sonucu yazımı) veya K8 sapmaları | **Önizleme + açık onay** (kullanıcı "gönder/uygula" der); onaysız hiçbir yazım | onaylayan kullanıcı |
| **red** | Acil/güvenlik bağlamı (aciliyet ifadeleri, SOS niyeti, kendine zarar içeriği), kapsam-dışı klinik talep ısrarı | AI **aksiyon almaz, değerlendirme yapmaz**; sabit güvenlik yanıtı + kullanıcıyı SOS/911/uygun insan kanalına **yönlendiren UI** gösterilir (B7 kuralları; arama karar ve tetiği kullanıcıda) + ilgili tarafa görünürlük bildirimi (hasta bağlamında aile, grant dahilinde) | — (insan aksiyonu zaten dışarıda) |

Eşleme: Hasta PRD'nin eski `low/medium/high` → `green/yellow/red` (A10). Red davranışındaki "biri açtıysa durdur" mantığı **yoktur** (B7). Tier ataması skill+verdict matrisinden; matris tek dosyada, değişiklik = kod review + klinik danışman onayı.

## 5. Action Executor
- Beyaz-liste araçlar: `complete_occurrence`, `create_care_task`, `decompose_task`, `send_message(draft→approve)`, `create_reminder`, `create_symptom_report(draft→approve)`, `initiate_call_ui` (yalnız arama UI'ını açar; aramayı kullanıcı başlatır — B7), `set_notification_pref`. Liste dışı araç çağrısı = hard fail + log.
- Her araç, kullanıcı adına **aynı API uçlarından** (Modül 2) geçer: PolicyEngine, B1 kuralı, consent — agent için de aynen işler (`actor_type=agent`). Agent'a özel arka kapı **yok**.
- Yazan aksiyonlar `ActivityLog` + gerekirse `AuditLogEntry`'ye `agent.*` event'iyle düşer; mesajlar "Sina ile gönderildi" etiketi taşır (Modül 1 §7.1).

## 6. Loglama (B3)
Her etkileşim → `ai_interaction_log` (immutable, 7y): girdi/çıktı kolon-şifreli, `judge_verdict`, `risk_tier`, `action_taken`, `human_approved_by`, `tokens`, `cost`. Operasyonel tablolar (Hasta `VoiceSession`/`ProposedAction`, HCP `ai_scribe_drafts`) yaşamaya devam eder ama **özet satır her zaman** kanonik log'a yazılır (Sözlük §5 eşleme). Bakıcı `safety_filter_*` alanları verdict/tier altına alt-alan olarak taşınır. Günlük maliyet tavanı kullanıcı-başına ve org-başına; aşımda AI yüzeyi nazikçe kapanır ("bugünlük limit"), acil-dışı olduğundan güvenlik etkisi yok.

## 7. Model Barındırma & Veri
- Tüm LLM/STT uçları **Kanada-host** (Azure Canada Central OpenAI + Azure Speech; alternatif CA-host model — Bakıcı PRD §AI SLA ile uyumlu). Sınır-ötesi çağrı IAM'de kapalı.
- Prompt'lara giden PHI minimizasyonu: context builder yalnız görevin gerektirdiği alanları koyar; lockbox kategorileri (B5) **yalnız açık grant varsa** ve skill gerektiriyorsa girer; `substance_use` tüketici AI bağlamına **hiç girmez**.
- Ses: wakeword on-device, V0 foreground-only (Hasta PRD kararı); ham ses saklama Modül 1 §12 (transkript sonrası min; opt-in ≤7g).
- Model sürümü `model_id` log'da; model değişimi = regresyon değerlendirme seti (aşağıda) yeniden koşulur.

## 8. Değerlendirme & Yayın Kapısı
Guardrail regresyon seti (tehlikeli istem koleksiyonu: doz soruları, K8 nicel tavsiye, aciliyet, kendine zarar, jailbreak kalıpları; EN/FR/TR) her model/prompt değişiminde koşar. Yayın kapısı: `MEDICAL_ADVICE` yakalama ≥ hedef eşik, red-tier yanlış-negatif = sıfır tolerans (tek kaçak = yayın bloke). Sonuçlar sürümlü saklanır (denetim kanıtı).

## 9. Açık Konular (Modül 4) — KAPANDI [KARAR K11 — 2026-07-22]
1. Judge: Azure Canada Central'da küçük sınıf model + §3 deterministik ön-filtre; eşikler değerlendirme setinin (§8) ilk koşumunda kalibre edilir — kalibrasyon bir yayın-öncesi görevdir, mimari karar değildir.
2. `decompose` klinisyen-onaylı şablon bağlama: **V1** (V0'da decompose çıktısı her zaman yellow → kullanıcı onaylı; şablonsuz güvenli).
3. Aile `briefing` **cache'lenmez** — her istekte rol-filtreli taze veriden üretilir; böylece revoke ≤5sn garantisi brifingi de kapsar.
4. `rag_qa` korpus yönetimi: kurum yüklemeleri `DocumentReference(org)` + Sinalytix-curated ayrı koleksiyon; korpus CRUD'u Admin Panel A6 üzerinden (ops), indeksleme worker'da. Derin detay HCP Doc 7 kapsamında yeterli.
