# Sinalytix — Sözlükçe (Terimler EN/TR)

**Sürüm:** 0.1 · **Tarih:** 2026-07-22 · Ekip-içi ortak dil; tablo/enum tanımları için Kanonik Sözlük esastır — burası kavram açıklamasıdır.

| Terim | TR karşılık | Tanım (Sinalytix bağlamında) |
|---|---|---|
| Care plan (master/subplan) | Bakım planı | HCP'nin oluşturduğu plan; master tek, disiplin başına subplan; günlük aksiyona `CareTask` üretimiyle iner |
| CareTask / Occurrence | Bakım görevi / görev örneği | Tanım vs gün-bazlı örnek; occurrence tamamlanır, task tamamlanmaz |
| Carry-over | Ertesi güne taşıma | Tamamlanmayan occurrence'ın yeni güne kopyalanması (orijinal değişmez; max 7g) |
| Lockbox | Kilitli kutu | Hastanın kısıtlama hakkı olan hassas kategori seti (B5): mental_health, hiv_sti, gender_identity, substance_use |
| ConsentRecord vs ConsentGrant | Yasal onam vs veri-paylaşım yetkisi | İlki immutable ToS/yasal kabul; ikincisi iptal edilebilir, kapsam-bazlı runtime erişim yetkisi |
| SDM | Vekil karar verici | Substitute Decision-Maker (ON HCCA); `SDMDeclaration` ile beyan |
| POA | Vekâletname | Power of Attorney (belge doğrulaması V2) |
| MRP | Sorumlu hekim | Most Responsible Practitioner; devri `MRPTransfer` (T4) |
| Cosign | Eş-imza | İkinci klinisyen imzası gereken not/order akışı |
| Provenance / Tier 1–4 | Veri kökeni / katman | Verinin kaynağı+güveni; T1 cihaz → T4 OCR+LLM ekstraksiyon (insan doğrulamalı) |
| "Doğrulanmadı" rozeti | — | Provenance.verified=false görselleştirmesi; veri gösterilir ama güven düzeyi açık |
| Break-glass | Cam kırma erişimi | Acil PHI erişim istisnası — V0'da YOK (K5), V1 tam akış |
| Judge / verdict / risk tier | Yargıç / hüküm / risk katmanı | AI çıktısını sınıflandıran bağımsız katman; green/yellow/red davranışı (B3, Modül 4) |
| Wakeword | Uyandırma sözcüğü | "Sina" — V0 yalnız uygulama önplandayken |
| Guardrail | Koruma rayı | AI'ın SaMD-nötr sınırda kalmasını zorlayan pipeline (consent→judge→tier→beyaz-liste araç) |
| SBAR | — | Situation-Background-Assessment-Recommendation devir çerçevesi (K2: V0 ipucu, V1 form) |
| EVV | Elektronik ziyaret doğrulama | Electronic Visit Verification (GPS; V2) |
| Auto-switch | Otomatik vardiya geçişi | Bakıcı yeni hastaya check-in yapınca öncekinin otomatik kapanması |
| Lone worker | Yalnız çalışan | Sahada tek başına bakıcı; güvenliği PRD 08 (V1) |
| PSW / HCA / RPN / RN | — | Personal Support Worker / Health Care Aide / Registered Practical Nurse / Registered Nurse |
| CPSO / CNO | — | Ontario hekim / hemşire meslek kurulları (manuel lisans doğrulama) |
| OHIP / PHN / RAMQ / AHCIP | — | Eyalet sağlık sigorta numaraları (`identifier_set`) |
| PHIPA / PIPEDA | — | Ontario sağlık gizlilik yasası / federal gizlilik yasası |
| PIA | Gizlilik etki değerlendirmesi | Privacy Impact Assessment (lansman bloğu, Uyum §5) |
| SaMD | Tıbbi cihaz yazılımı | Software as a Medical Device — Sinalytix bilinçli olarak bu sınıfın DIŞINDA kalır (yasak-liste: Uyum §3) |
| FHIR R4 / CA Core+ | — | Sağlık veri değişim standardı / Kanada profili; yalnız API cephesinde (Modül 1 §1.2) |
| RLS | Satır düzeyi güvenlik | Row-Level Security; `app.acting_org_id` vb. oturum değişkenleriyle |
| Varlık-sızdırmazlık | — | Yetkisiz kayda 403 değil 404/boş dönme ilkesi |
| Idempotency key | Tekrarsızlık anahtarı | Aynı mutasyonun güvenli tekrar oynatımı (`X-Idempotency-Key`) |
| Outbox | Giden kutusu deseni | Mutasyon+olayın aynı transaction'da yazılması; kayıpsız olay garantisi |
| Orphan subplan | Sahipsiz alt plan | Sahibi ayrılan subplan; devir zamanlayıcısı (HCP Doc 6) |
| interRAI / MAPLe / CAP | — | Yaşlı bakım değerlendirme enstrümanı / öncelik algoritması / uyarı protokolleri — algoritmik kısım lisanslı, V1 |
| Credentialing | Kredensiyel doğrulama | HCP lisans/kimlik doğrulama süreci (Admin A1) |
| e-fax | — | V0 order/rx iletim kanalı (PrescribeIT V2) |
| Freshness window | Tazelik penceresi | SOS banner görünürlük süresi (240dk config — A13) |
| Two-person rule / four-eyes | İki-kişi kuralı | Yıkıcı admin eylemlerinde ikinci onaycı zorunluluğu |
| Kill switch | Acil kapatma | `ai.kill_switch` feature flag — tüm AI yüzeylerini ≤5sn'de kapatır |
| Declarative_v0 | — | ConsentGrant'ın V0 durumu: yazılır+okunur+DTO filtreler uygulanır, tam motor-enforcement V1 |
| Reveal | Mühürlü görüntüleme | Admin'in gerekçeli, süreli, denetimli PHI görme istisnası (lockbox hariç) |
