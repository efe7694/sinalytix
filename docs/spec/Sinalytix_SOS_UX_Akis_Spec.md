# Sinalytix — SOS Ekran-Ekran UX Akış Spec'i (Hasta App)

**Sürüm:** 0.1 · **Tarih:** 2026-07-22 · **Statü:** Taslak — B7 kararının (Kanonik Sözlük §6) ekran-ekran uygulaması.
**Veri:** `SOSEvent` + `CallAttemptLog` (Sözlük §6) · **API:** Modül 2 §3.7 · **Aile görünümü:** FAM banner (freshness 4 saat, A13).

**Değişmez ilkeler (B7, SaMD-nötr):**
1. Uygulama yalnız aramayı **kolaylaştırır**; hiçbir adımda klinik değerlendirme/otomatik karar yok. Tetik = kullanıcı aksiyonu veya görünür geri sayımlı timeout.
2. Native dialer'dan "cevaplandı" bilgisi **alınamaz ve varsayılmaz**. "Biri açtıysa durdur" mantığı yoktur.
3. Her faz geçişinde **görünür geri sayım + tek dokunuşla iptal**.
4. Kullanıcı uygulamaya dönmese de zincir timeout ile ilerleyebilir (yardım tıkanmaz) — ama yalnız **önceden ekranda ilan edilmiş** adımlarla.

---

## Ekran S0 — SOS Butonu (Home, kalıcı)
Büyük, sabit konumlu, yüksek kontrast (yaşlı-dostu ≥64pt dokunma alanı). Tek dokunuş → S1. Yanlış-dokunuş koruması: buton dokunuşunda hafif titreşim + S1 zaten bir iptal penceresidir (ekstra "emin misiniz?" modalı YOK — acil durumda sürtünme eklenmez).

## Ekran S1 — Faz-1 Geri Sayımı (aile aranacak)
- Tam ekran, kırmızı-dışı sakin acil paleti; başlık: **"Acil kişiniz aranacak: {EC1 adı}"**.
- **10 sn** dev geri sayım halkası + tek büyük buton: **"İPTAL"**.
- İkincil buton: **"Şimdi ara"** (geri sayımı atlar).
- Arka planda: `POST /sos-events` (tetik anında; iptal edilirse `cancel_stage=pre_family_10s`).
- 10 sn dolunca veya "Şimdi ara": `CallAttemptLog(call_type=sos, target_type=family, status=initiated)` → **native dialer açılır** (EC `sort_order=1`).
- Ekranın altında sıradaki adımlar **önceden ilan edilir**: "Ulaşamazsanız: {EC2…} → 911 seçeneği".

## Ekran S2 — Arama Dönüşü (dialer'dan geri gelince)
Dialer'dan dönen kullanıcıya soru ekranı — cevaplanma bilgisi **kullanıcıdan** alınır, varsayılmaz:
- **"Yardım alabildiniz mi?"**
  - **"Evet, yardım geliyor"** → `SOSEvent.status=resolved, resolved_by=patient` → S5 (kapanış).
  - **"Ulaşamadım"** → sıradaki EC varsa S1'e döner (EC2 için, yine 10 sn iptal penceresi); EC listesi bittiyse → S3.
  - **"911'i aramak istiyorum"** → S3 (her an erişilebilir kısayol).
- Kullanıcı **hiçbir şey seçmezse**: 60 sn sonra ekran S3'e ilerler — bu ilerleme S2'de görünür bir ikinci geri sayımla ilan edilir ("60 sn içinde seçim yapılmazsa 911 adımı gösterilecek").

## Ekran S3 — Faz-2 Geri Sayımı (911)
- Başlık: **"911 aranacak"** + **30 sn** geri sayım + dev **"İPTAL"** (iptal → `cancel_stage=pre_911_30s`; event `status=cancelled`… kullanıcı S2'ye döner, oradan tekrar seçebilir).
- İkincil: **"Şimdi ara"**.
- 30 sn dolunca veya "Şimdi ara": `CallAttemptLog(target_type=emergency_services)` → native dialer `tel:911` açılır; `SOSEvent.status=escalated_911`, `current_phase=done`.
- **Uygulama 911 aramasını kendisi başlatamaz** (OS kısıtı + tasarım tercihi): timeout, dialer'ı tuşlanmış hâlde açar; **son dokunuş her zaman kullanıcıda**. (Bu, B7 "timeout zinciriyle ilerleyebilir" kuralının OS-gerçekçi yorumudur: zincir 911 *ekranına* kadar kendiliğinden ilerler; aramanın kendisi kullanıcı dokunuşudur.)

## Ekran S4 — 911 Dönüşü
"911 ile görüştünüz mü?" → "Evet" → `resolved (resolved_by=patient)`; "Hayır" → S3'e dönüş (tekrar arama). Her iki durumda aileye durum bildirimi gider.

## Ekran S5 — Kapanış
Özet: kimler arandı, saatler (CallAttemptLog'dan), durum. "Aileme not gönder" kısayolu (Mesaj, hazır taslak: "SOS'u kapattım, iyiyim"). Event `resolved`.

## Kural Tablosu — Kenar Durumlar
| Durum | Davranış |
|---|---|
| Uygulama S1/S3 sırasında arka plana düşer/ölür | Sunucu zamanlayıcısı (Modül 2 §3.7) fazı işaretlemeye devam eder; aileye `sos.triggered`/`phase_advanced` bildirimi gider (görünürlük kaybolmaz). Arama yapılamaz — arama yalnız cihazda, kullanıcı dokunuşuyla. |
| EC listesi boş (onboarding'de zorunlu ama silinmiş olabilir) | S1 atlanır, doğrudan S3 (911) gösterilir + "acil kişi ekleyin" kalıcı uyarısı. |
| Aynı anda ikinci SOS tetiği | Aktif event varsa yeni event açılmaz; mevcut akışın kaldığı ekranına dönülür. |
| Aile tarafında | `patient:{id}:sos` kanalı + `sos` bildirimi (DND/quiet-hours bypass, B6). Banner: aktif VEYA <4 saat (A13). Aile "Ben ilgileniyorum" derse `resolved_by=family_user`. |
| Standart (SOS-dışı) çağrı | Ayrı akış: kişi seç → onay modalı (timeout `regular_modal_timeout`) → dialer. `call_type=regular`. SOS ile hiçbir adımı paylaşmaz (karışma riski yok). |
| Erişilebilirlik | Tüm geri sayımlar sesli okunur (VoiceOver/TalkBack); İPTAL butonu ekranın alt yarısında; renk + metin + titreşim üçlü sinyal; EN/FR/TR. |

## Kabul Kriterleri
1. Hiçbir kod yolunda "arama cevaplandı" türetimi yok (statik analiz + code review kontrol listesi maddesi).
2. S1→dialer, S3→dialer geçişlerinde `CallAttemptLog` satırı %100 yazılır (idempotent).
3. İptal her ekranda tek dokunuş, ≥64pt.
4. Uygulama öldürüldüğünde sunucu event durumu ≤5sn içinde aile görünümüne yansır.
5. Faz-1'i atlayıp doğrudan 911 her ekrandan ≤2 dokunuş.
6. Tüm akış klinik değerlendirme içermez (SaMD kontrol listesi: giriş yok, semptom sorusu yok, aciliyet skoru yok).
