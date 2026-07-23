# Sinalytix — Tasarım Sistemi & UX Temelleri (5 yüzey)

**Sürüm:** 0.1 · **Tarih:** 2026-07-22 · **Statü:** Taslak — web sitesi + 4 uygulama + admin panel görsel/etkileşim temeli.
**Kural:** Bu doküman davranış tanımlamaz (davranış PRD'lerde); **görünüm, erişilebilirlik ve etkileşim standartlarını** tanımlar. Ekran içerikleri uygulama PRD'lerindedir.

---

## 1. Tasarım İlkeleri (öncelik sırasıyla)

1. **Yaşlı-önce (Hasta app'i belirler):** birincil persona 65+, düşük teknoloji aşinalığı, olası görme/motor kısıt. Hasta app standartları en katıdır; diğer yüzeyler gevşetir, asla tersi olmaz.
2. **Sakin sağlık estetiği:** acil olmayan hiçbir şey kırmızı değildir. Alarm yorgunluğu yaratmayan, güven veren, klinik-soğuk olmayan dil ve renk.
3. **Tek sistem, beş ton:** ortak token seti + yüzey başına tema katmanı. Bir bileşen beş yüzeyde de aynı API ile kullanılır.
4. **Erişilebilirlik pazarlık dışı:** WCAG 2.2 AA taban; Hasta app'te kritik akışlar (SOS, ilaç) AAA kontrast hedefler.

## 2. Token'lar

### 2.1 Renk (anlamsal; hex değerleri marka çalışmasında kalibre edilir — roller sabittir)
| Token | Rol | Not |
|---|---|---|
| `color.primary` | Marka/birincil eylem | Tüm yüzeylerde aynı |
| `color.surface / surface-alt / border` | Zemin katmanları | Açık+koyu tema çifti |
| `color.text / text-muted` | Metin | Hasta app gövde metni AA değil **AAA** kontrast |
| `color.success / warning / danger / info` | Durum | `danger` YALNIZ: SOS, geri alınamaz silme, kritik hata |
| `color.emergency` | SOS'a özel | `danger`'dan ayrı ton; yalnız SOS yüzeylerinde; başka hiçbir bileşen kullanamaz |
| `color.risk.green / yellow / red` | AI risk katmanı görselleştirme (B3) | Metin etiketiyle birlikte (renk tek başına anlam taşımaz) |
| `color.tier1..4` | Provenance rozetleri | HCP Patient-360 |

Tema katmanları: `theme.patient` (en yüksek kontrast, en büyük ölçek), `theme.family`, `theme.caregiver` (saha: yüksek parlaklıkta okunabilirlik, tek el kullanım), `theme.hcp` (yoğun veri, nötr), `theme.admin` (nötr + "iç araç" kimliği — üretim yüzeyleriyle karıştırılmaz, header'da kalıcı ortam etiketi: PROD kırmızı-bant/STAGING sarı-bant).

### 2.2 Tipografi & ölçek
Sistem fontu (SF/Roboto; web: Inter). Ölçek `theme` başına: Hasta gövde **min 18pt** (dinamik tipe %200'e kadar kırılmadan), diğer mobil 16pt, HCP/Admin web 14–15px yoğun tablo modu. Satır uzunluğu ≤70ch. Sayısal klinik değerler tabular-lining.

### 2.3 Boşluk, dokunma, hareket
4pt grid. Dokunma hedefi: Hasta **≥56pt** (SOS ≥64pt — SOS UX spec ile uyumlu), diğer mobil ≥44pt. Hareket: 150–250ms, `prefers-reduced-motion`'a saygı; geri sayım animasyonları (SOS) hareketsiz modda da sayı+ilerleme çubuğuyla anlam korur.

## 3. Çekirdek Bileşen Envanteri (ortak kit)

`Button` (primary/secondary/ghost/danger/emergency) · `Card` · `ListRow` (Hasta: tek satır = tek eylem) · `TaskRow` (occurrence: durum + saat + tamamla eylemi; B1 gereği Aile temasında tamamla eylemi **render edilmez**, disable değil) · `ShiftCard` (A5 tek şeması) · `Badge` (durum/provenance/"doğrulanmadı") · `RiskChip` (green/yellow/red + etiket) · `CountdownRing` (SOS) · `Modal/Sheet` · `Toast` (başarı 3sn; hata kalıcı+eylemli) · `EmptyState` (her liste için zorunlu; boş ≠ hata) · `OfflineBanner` (24s cache kuralı) · `MaskedField` + `RevealButton` (admin §3.4) · `ApprovalCard` (FAM-12) · `MessageBubble` (+"Sina ile gönderildi" etiketi) · `NotificationRow` · `FormField` (etiket üstte, hata alt satırda metinle) · `DataTable` (HCP/Admin: yapışkan başlık, yoğunluk anahtarı) · `AudioWave` (Scribe/Sina dinleme durumu — kayıt halindeyken **her zaman görünür** gösterge, gizli dinleme yok).

Her bileşen: açık+koyu tema, RTL-hazır (V2 dil ihtimali), ekran okuyucu etiket sözleşmesi (`accessibilityLabel` zorunlu prop), klavye erişimi (web).

## 4. Desenler

- **Onay desenleri:** yellow-AI aksiyonu = önizleme kartı + "Uygula/Vazgeç" (Modül 4 §4); geri alınabilir eylem = toast+"Geri al" (5sn); geri alınamaz = yazılı onay modalı (isim yazdırma yalnız hesap silme).
- **Acil desenler:** SOS akışı SOS UX spec'e aynen uyar; `color.emergency` + tam ekran; iptal her zaman alt yarıda.
- **Hata dili:** suçlamayan, eylem öneren, TR/EN/FR ("Bir şeyler ters gitti" yasak; ne olduğu + ne yapılacağı yazılır). Hata kodu küçük puntoyla (`request_id` destek için kopyalanabilir).
- **Boş/ilk kullanım:** her ana yüzeyin ilk-gün durumu tasarlanır (Hasta: görevsiz gün; Aile: bağlantısız durum; Bakıcı: vardiyasız gün; HCP: doğrulama bekleyen hesap; Admin: boş kuyruk).
- **Bildirim görgü kuralları:** varsayılan sessiz saat 21:00–08:00 (kullanıcı ayarı; `sos` bypass — B6); rozet sayısı 99+ kesilir; bildirim → derin bağlantı → ilgili ekran (redirect-only).
- **Maskeleme:** PHI önizlemeleri (push, widget) ad/ilaç adı içermez ("İlaç hatırlatması" der, hangi ilaç demez — kilit ekranı sızıntısı).

## 5. Yüzey Özellikleri

| Yüzey | Platform | Navigasyon | Özel kurallar |
|---|---|---|---|
| Hasta | iOS/Android (RN) | Alt tab 4: Bugün, Sina, Mesajlar, Profil + kalıcı SOS | Tek sütun; sayfa başına tek birincil eylem; onboarding sesli destekli |
| Aile | iOS/Android (RN) | Alt tab 4 (Aile PRD ağacı) | Çoklu-hasta anahtarı üst başlıkta; onay rozeti kalıcı |
| Bakıcı | iOS/Android (RN) | Alt tab + hasta seçici | Vardiya durumu her ekranda kalıcı şerit; eldivenli kullanım → büyük hedefler |
| HCP | Web-first (+tablet) | Sol ray + hasta bağlam şeridi | Yoğun tablo modu; klavye kısayolları; imza eylemleri çift-adım |
| Admin | Web | Sol ray | Ortam bandı; PHI-maskeli varsayılan; tablolarda satır-içi eylem yok (detay panelinden — yanlış tık koruması) |
| Pazarlama sitesi | Web (Next.js) | Üst nav | Aynı token seti; "acil hizmet değildir" bandı; SaMD-uyumlu dil (teşhis/tedavi iddiası yasak — pazarlama metni dahil) |

## 6. İçerik & Yerelleştirme
- Diller: EN/FR/TR; tüm UI dizeleri anahtar-tabanlı (kod içinde literal yasak); Fransızca yasal eşdeğerlik (Ontario) — consent/güvenlik metinleri hukuk onaylı çeviri, makine çevirisi yasak.
- Okuma düzeyi: tüketici yüzeylerinde ≤6. sınıf seviyesi; klinik terim yerine gündelik dil ("hipertansiyon" değil "yüksek tansiyon", parantezde klinik terim).
- Tarih/saat: kullanıcı yereli + hasta timezone bağlamı çakışırsa açık etiket ("hastanın saatiyle 09:00").
- Ses (Sina): kişilik = sakin, kısa cümleli, asla teşhis/rahatlama-vaadi dili; her sesli yanıtın ekran eşdeğeri (işitme erişilebilirliği).

## 7. Teslimat & Kalite Kapıları
- Kit, `packages/ui` (Mühendislik El Kitabı §2) içinde Storybook ile yaşar; her bileşen story + erişilebilirlik testi (axe) + görsel regresyon (Chromatic/Playwright) olmadan merge edilmez.
- Tasarım token'ları tek JSON kaynağından (style-dictionary) RN + web'e üretilir; hex'ler kodda elle yazılmaz.
- Figma kaynağı bu dokümana bağlanır (token adları birebir); Figma yoksa Storybook referans kaynaktır.
- Erişilebilirlik denetimi: her sürüm öncesi Hasta app kritik akışları (onboarding, görev tamamlama, SOS) ekran okuyucu ile uçtan uca test (Test Stratejisi §5).
