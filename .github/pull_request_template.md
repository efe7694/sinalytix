<!--
Mühendislik El Kitabı §7 (Tanımlar: Bitti) + Teslim Notu §7 (süreç kuralları).
Spec seti repo içinde: docs/spec/ — öncelik sırası docs/spec/README.md'de.
-->

## Ne yapıldı

<!-- 2-3 cümle. Hangi Faz / slice? -->

## Hangi PRD bölümü?

<!-- ZORUNLU. Örn: "Modül 2 §3.2 + Kanonik Sözlük §2 (B2/B9)".
     Spec'ten sapma varsa DEVIATIONS.md'ye girdi eklendi mi? -->

## DoD (El Kitabı §7) — hepsi işaretlenmeli veya gerekçelendirilmeli

- [ ] Kontrat (`packages/domain`) güncellendi — **şema değişikliği varsa sıra: sözlük → contracts → migration**
- [ ] Testler (unit + varsa RLS/erişim-matrisi testi)
- [ ] Audit olayları yazılıyor (`AuditLogEntry`; audit-first uçlarda senkron)
- [ ] i18n anahtarları (EN/FR/TR) — kodda literal dize yok
- [ ] Erişilebilirlik etiketi (`accessibilityLabel` / axe) — UI değiştiyse
- [ ] Boş durum + hata durumu tasarlandı (boş ≠ hata)
- [ ] Runtime sabitleri `SystemConfig`'ten okunuyor, koda gömülmedi (K10)

## Güvenlik / uyum kontrolü

- [ ] **SaMD yasak-listesi** (Uyum Listesi §3): teşhis / triage / doz önerisi / otomatik acil tespiti / "cevaplandı" türetimi **eklenmedi** — pazarlama metni dahil
- [ ] Cross-actor yazım varsa **SECURITY DEFINER** fonksiyonla, geniş RLS UPDATE policy'siyle değil (D12/D13/D14 dersi)
- [ ] Yetkisiz erişim 404/boş döner (varlık-sızdırmazlık), 403 değil
- [ ] Lockbox kategorileri (B5) açık grant olmadan sızmıyor; `substance_use` her noktada kilitli
- [ ] PHI hiçbir URL/query-string/log/push payload'ında yok

## Doğrulama

<!-- Ne koştu, ne gördün? Testler + varsa canlı uçtan uca doğrulama. -->
