> **[RECONCILED 2026-06-28 — Canonical Data Dictionary v0.1]** Kararlar B1–B10.

# 0️⃣ Onboarding

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-01  —  Onboarding**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

## **1.1 Özelliğin Tanımı**

Family App onboarding akışı, hasta yakınlarının (aile üyeleri, vekiller) Sinalytix ekosistemine minimum sürtünmeyle dahil edilmesini sağlar. Onboarding tamamlandıktan sonra kullanıcı bir veya birden fazla hasta ile bağlantı kurarak bakım gözetim, koordinasyon ve karar mekanizmalarına erişim kazanır.

Bu özelliğin dört temel amacı vardır:

* PIPEDA/PHIPA uyumlu açık rıza (explicit consent) ve güvenlik uyarılarını toplamak — ConsentRecord immutable olarak backend'e yazılır.

* Temel aile üyesi profilini oluşturmak: ad, soyad ve hastayla ilişki tipi.

* Auth sürtünmesini akışın sonuna taşıyarak terk oranını düşürmek; auth öncesi tüm veriyi şifreli yerel depolamada tutmak.

* En az bir hasta bağlantısı kurarak kullanıcıyı aktif bakım döngüsüne dahil etmek.

## **1.2 İki Giriş Noktası**

Family App onboarding akışı iki farklı giriş noktasını destekler. Bu iki yol, ekranlar açısından büyük ölçüde aynıdır; ancak hasta bağlama adımındaki davranış farklılaşır.

| Giriş Noktası | Tetikleyici | Hasta Bağlama Davranışı |
| :---- | :---- | :---- |
| Akış A — EC Davet Linki | Patient App → Profil → Acil Kişilerim → Kişi → "Uygulamaya Davet Et" | Link içindeki patient\_id ile otomatik eşleşme; onay ekranı gösterilir |
| Akış B — Bağımsız İndirme | App Store / Google Play üzerinden organik indirme | QR okutma veya 6 haneli kod girişi; opsiyonel |

## **1.3 Hedef Kitle**

Hasta yakınları: eş, çocuk, kardeş, ebeveyn veya yasal vekil (POA — Power of Attorney). Teknoloji okuryazarlığı geniş bir spektrumda değişir; 20'li yaşlarındaki genç çocuktan, hastanın eşi olan yaşlı bireye kadar. Bu nedenle:

* UX karmaşıklığı: Patient App (elderly-first) ile Caregiver App (profesyonel-first) arasında orta bir seviyede konumlanır.

* Metin miktarı ve font boyutu: Caregiver App'e kıyasla biraz daha erişilebilir, Patient App'e kıyasla biraz daha bilgi yoğun.

* Karar yorgunluğu minimalize edilmeli: her ekranda maksimum 1 primary CTA \+ 1 secondary CTA.

## **1.4 Ekosistem İçindeki Konum**

Family App onboarding, dört uygulamalı Sinalytix ekosisteminin koordinasyon katmanına giriş kapısıdır.

| Uygulama | Onboarding'deki Rolü | Bağlantı Tipi |
| :---- | :---- | :---- |
| Patient App | EC davet linki gönderir; hasta bağlama kodunu üretir | PatientFamilyLink oluşturur |
| Caregiver App | Onboarding'le doğrudan ilişkisi yok; bağlantı hasta üzerinden kurulur | Dolaylı |
| Family App | Bu dokümandaki akış | User (roles\[\]=family) \+ FamilyProfile \+ ConsentRecord yazar |
| Healthcare Pro App | V2+ entegrasyon; onboarding'de kapsam dışı | — |

## **1.5 Regülasyon Çerçevesi**

Onboarding akışında iki temel regülasyon yükümlülüğü bulunur:

* PIPEDA / PHIPA: Tüm kişisel bilgi ve sağlık bilgisi (PHI) Ontario/Kanada sınırları içinde saklanır. Auth öncesinde hiçbir veri sunucuya iletilmez. ConsentRecord immutable tutulur — güncelleme olmaz, versiyon değişikliğinde yeni kayıt açılır.

* Health Canada SaMD Sınırları: Uygulama teşhis koymaz, tedavi veya dozaj önermez. Onboarding intro son slaydında ve consent ekranında "acil durum servisi değildir, 911'i arayın" uyarısı zorunludur.

*⚠ PHIPA açısından önemli: Hasta erişiminin kapasitesi varsa, hasta kendi sağlık bilgilerini kiminle paylaşacağını bizzat seçer. PatientFamilyLink ve permission\_level her zaman hasta tarafından kontrol edilir. Aile onboarding'i, hastanın verisini otomatik olarak açmaz; yalnızca bağlantı kurma imkânı sağlar.*

# **2\. Endüstri ve Klinik Bağlam**

## **2.1 Kanada'da Aile Bakıcısı Rolü**

Ontario'da evde bakım hastalarının yaklaşık %80'inin bir aile üyesi veya yakını tarafından desteklendiği tahmin edilmektedir. Aile bakıcıları; profesyonel bakıcı yokken acil müdahale eder, bakım kararlarında vekâlet alabilir ve sağlık sisteminin birincil iletişim noktası konumundadır.

Özellikle Alzheimer ve demans vakalarında aile, zamanla hastanın yerine karar veren konumuna geçer. Bu "substitute decision-maker (SDM)" rolü PHIPA ve Ontario Consent and Capacity Board mevzuatı kapsamında düzenlenmektedir. Sinalytix'in FAM-13 Permission Layer ve FAM-12 Approval Queue özellikleri bu gerçekliği dijital ortama taşımaktadır.

## **2.2 Sektör Uygulamalarından Öğrenilen Nuanslar**

Caring Village, CareSwitch ve ShiftCare Connect gibi platform liderlerinin aile onboarding akışları incelendiğinde şu örüntüler öne çıkmaktadır:

* Davet tabanlı kayıt: Aile üyeleri kendi başlarına değil, hasta veya ajans tarafından davet edilerek sisteme girer. Bu pattern, hasta egemenliğini (patient autonomy) korur ve veri erişim yetkisinin hasta tarafından verilmesini zorunlu kılar. Sinalytix'in Akış A yaklaşımı bu best practice ile örtüşmektedir.

* Profil minimum: Bakıcı uygulamalarında bile onboarding'de gereksiz bilgi toplamak terk oranını artırır. Aile onboarding'i yalnızca regülasyon için zorunlu olan minimum veriyi toplar — ek profil bilgisi (doğum tarihi, POA belgesi vb.) onboarding sonrası Settings akışına ertelenir.

* İlişki tipi zorunlu: Hasta ile ilişki (eş/çocuk/kardeş/diğer) onboarding'de sorulması, ilerleyen sürümlerde rol bazlı yetki önerisi (FAM-22) ve bakım planı kişiselleştirme için kritik bir girdidir.

* Proxy erişim şeffaflığı: En iyi uygulamalarda aile üyesine "hangi verilere erişebildiği" ve "hangi verilerin hâlâ hasta tarafından kontrol edildiği" net şekilde gösterilir. Bu psikografik güveni artırır ve şikâyet riskini düşürür.

# **3\. Kapsam ve Kısıtlar**

## **3.1 V0 — MVP Kapsamı**

* Slide-based tanıtım (2–3 ekran, atlanabilir)

* Zorunlu dil seçimi — cihaz diline göre öneri (İngilizce, Fransızca, Türkçe)

* Açık rıza \+ güvenlik uyarıları — 3 zorunlu checkbox (ToS, Privacy Policy, acil servis değil); tümü işaretlenmeden ilerleme olmaz

* Temel profil: ad, soyad, hastayla ilişki tipi (zorunlu)

* Auth yöntemi seçimi: Apple SSO / Google SSO / Telefon OTP

* Auth öncesi tüm verinin şifreli yerel depolamada (iOS Keychain / Android Keystore) tutulması

* Auth başarısı sonrası local → backend transfer; ConsentRecord immutable yazımı

* Hasta bağlama: Akış A'da otomatik eşleşme \+ onay; Akış B'de QR okutma veya 6 haneli kod girişi (opsiyonel)

## **3.2 V1 Eklemeleri**

* Re-consent akışı: ToS/Privacy Policy versiyon değişikliğinde mevcut kullanıcıyı yeniden rızaya yönlendiren modal / full-screen interstitial

* POA belge yükleme: vekâlet belgesi upload (opsiyonel, profil zenginleştirme — onboarding sonrası Settings'e de eklenebilir)

## **3.3 V2 Eklemeleri**

* Ters onboarding (patient-invite): hasta uygulamadan "Aileyi Davet Et" aksiyonu başlatır; aile linke tıklayarak bazı adımları prefill edilmiş şekilde tamamlar

* Hastalık bazlı otomatik yetki önerisi (FAM-22 ile birlikte): Alzheimer/Demans tanılı hasta için aile onboarding tamamlandığında sistem "Tam Yetki" önerisi sunar

## **3.4 Kısıtlar**

* Auth Step 0–3 arasında gerçekleşmez; bu adımlardaki hiçbir veri sunucuya iletilmez. PIPEDA ihlali oluşturur.

* SSO (Apple/Google) form adımlarını bypass etmez; yalnızca ad/e-posta alanlarını prefill eder.

* Telefon OTP yolunda SMS OTP zorunludur. SSO yolunda SMS OTP gerekmez.

* Onboarding tamamlandıktan sonra otomatik tekrar tetiklenmez. Reset yalnızca admin/debug işlemidir.

* Akış yarıda bırakılırsa, tekrar açılışta step\_progress'e göre kaldığı adımdan devam eder; yerel draft bozulmaz.

* Hasta bağlantısı onboarding sırasında zorunlu değil; tamamlandı ekranında CTA olarak sunulur.

* ConsentRecord immutable — UPDATE/DELETE yasak, versiyon değişikliğinde yeni kayıt açılır.

* Facebook SSO kapsam dışıdır, eklenmeyecektir.

## **3.5 Non-goals (Kapsam Dışı)**

* Aile üyesinin kendi sağlık profili toplama

* Hasta sağlık verisi onboarding sırasında görüntüleme veya düzenleme

* Çoklu aile üyesini tek seferde davet etme (V1+ roadmap)

* Bakıcı veya sağlık profesyoneliyle bağlantı kurma (hasta üzerinden gerçekleşir)

* Acil kişi doğrulama (telefon teyidi) — bu onboarding sonrası Profile & Settings'te yapılır

# **4\. Giriş Noktaları ve Kullanıcı Akışları**

## **4.1 Akış A — EC Davet Linki ile Giriş**

Patient App'te hasta veya yetkili kişi "Acil Kişilerim \> Kişi \> Uygulamaya Davet Et" aksiyonunu başlatır. Sistem, patient\_id içeren derin bağlantı (deep link) üretir ve SMS/e-posta ile gönderir.

* Kullanıcı linke tıklar → Family App henüz yüklü değilse App Store/Play Store'a yönlendirilir.

* Yüklenmiş ya da yükleme sonrası uygulama açılır → deep link parametresinden patient\_id okunur ve session'a kaydedilir.

* Onboarding akışı başlar (FAM\_ONB\_00 → FAM\_ONB\_06).

* FAM\_ONB\_05\_CONNECT adımında: patient\_id'ye karşılık gelen hasta adı gösterilir, tek tıkla bağlantı kurulur.

## **4.2 Akış B — Bağımsız İndirme ve Kayıt**

Kullanıcı uygulamayı App Store/Play Store üzerinden organik olarak indirir. Deep link parametresi yoktur.

* Onboarding akışı başlar (FAM\_ONB\_00 → FAM\_ONB\_06).

* FAM\_ONB\_05\_CONNECT adımında: QR okutma veya 6 haneli kod girişi seçenekleri sunulur. "Şimdilik Geç" ile ana ekrana geçilebilir (hasta bağlı olmayan boş durum).

## **4.3 Adım Sırası Tablosu (V0)**

| Adım | Ekran ID | Açıklama | Depolama |
| :---- | :---- | :---- | :---- |
| 0 | FAM\_ONB\_00\_INTRO | Intro slaytlar (atlanabilir) | — |
| 1 | FAM\_ONB\_01\_LANGUAGE | Dil seçimi (zorunlu) | LOCAL |
| 2 | FAM\_ONB\_02\_CONSENT | Rıza \+ güvenlik uyarıları (zorunlu) | LOCAL |
| 3 | FAM\_ONB\_03\_PROFILE | Ad, soyad, ilişki tipi (zorunlu) | LOCAL |
| 4 | FAM\_ONB\_04\_AUTH\_METHOD | Giriş yöntemi seçimi | — |
| 5a | FAM\_ONB\_04A\_PHONE | Telefon numarası (OTP yolu) | — |
| 5b | FAM\_ONB\_04B\_OTP | OTP doğrulama | — |
| — | AUTH\_TRANSFER | Local → backend transfer | BACKEND |
| 6 | FAM\_ONB\_05\_CONNECT | Hasta bağlama (opsiyonel) | — |
| 7 | FAM\_ONB\_06\_DONE | Tamamlandı | — |

## **4.4 Akış Diyagramı (Mermaid — Geliştirici Referansı)**

*Not: Aşağıdaki diyagram Mermaid.js formatındadır. CI/CD pipeline veya Confluence entegrasyonunda otomatik render edilebilir.*

flowchart TD  A\[App Launch\] \--\> B{Deep link param?}  B \--\>|patient\_id var| C\[Akış A: Davet Linki\]  B \--\>|param yok| D\[Akış B: Bağımsız\]  C \--\> E\[FAM\_ONB\_00\_INTRO\]  D \--\> E  E \--\> F\[FAM\_ONB\_01\_LANGUAGE: Dil — ZORUNLU — LOCAL\]  F \--\> G\[FAM\_ONB\_02\_CONSENT: Rıza — ZORUNLU — LOCAL\]  G \--\> G1{3 checkbox tam?}  G1 \--\>|Hayır| G  G1 \--\>|Evet| H\[FAM\_ONB\_03\_PROFILE: Ad/Soyad/İlişki — ZORUNLU — LOCAL\]  H \--\> I\[FAM\_ONB\_04\_AUTH\_METHOD\]  I \--\>|Apple/Google| J\[SSO Native Flow\]  I \--\>|OTP| K\[FAM\_ONB\_04A\_PHONE\]  J \--\> J1{SSO başarılı?}  J1 \--\>|Evet| L\[AUTH\_TRANSFER: Local → Backend\]  J1 \--\>|Hayır| I  K \--\> K1\[OTP Gönder — rate limit\]  K1 \--\> K2\[FAM\_ONB\_04B\_OTP: Doğrula\]  K2 \--\> K3{OTP?}  K3 \--\>|Başarılı| L  K3 \--\>|Başarısız| K2  L \--\> M\[FAM\_ONB\_05\_CONNECT: Hasta Bağla\]  M \--\>|Akış A: otomatik| N\[Onay Ekranı → Bağla\]  M \--\>|Akış B: QR/Kod| O\[QR / Kod Girişi\]  M \--\>|Geç| P\[Ana Ekran \- boş durum\]  N \--\> Q\[FAM\_ONB\_06\_DONE\]  O \--\> Q  P \--\> R\[Ana Ekran\]  Q \--\> R

## **4.5 Kritik Akış Kuralları**

* Adım 0–3 arasında hiçbir veri sunucuya iletilmez. PIPEDA uyumunun temel koşuludur.

* Auth başarısız olursa kullanıcı FAM\_ONB\_04\_AUTH\_METHOD ekranına döner; local draft korunur.

* Backend transfer sırasında ağ hatası olursa: silent retry (exponential backoff, max 5 deneme). Tüm retry'lar başarısız olursa bir sonraki uygulama açılışında sessizce yeniden denenir. Kullanıcıya onboarding tekrar gösterilmez.

* Onboarding tamamlanmış kullanıcı uygulamayı tekrar açarsa doğrudan ana ekrana yönlendirilir (onboarding\_completed\_at dolu ise).

* Deep link'teki patient\_id; auth tamamlanana kadar session'da şifreli tutulur, backend'e gönderilmez.

# **5\. Ekran Spesifikasyonları**

## **FAM\_ONB\_00\_INTRO — Tanıtım Slaytları**

Platformun ilk izlenimini oluşturan 2–3 slaytlık carousel. V0'da placeholder içerikle gönderilir; V1'de A/B test edilmiş final kopya ile güncellenir.

| Özellik | Değer / Kural |
| :---- | :---- |
| UI Pattern | Swipe carousel — yatay geçiş animasyonu |
| Slayt Sayısı | 2–3 (V0 placeholder) |
| Slayt 1 | "Sevdiğinizin bakımını yakından takip edin." |
| Slayt 2 | "Hasta, bakıcı ve siz — tek platformda." |
| Slayt 3 (ZORUNLU) | "Sinalytix acil doktor servisi değildir. Acil durumlarda 911'i arayın." |
| Primary CTA | Devam (son slaytta: Başla) |
| Secondary CTA | Geç — tüm intro'yu atlar, Step 1'e gider |
| Geri Navigasyon | Yok — akışın ilk adımı |
| Analytics | intro\_slide\_viewed { slide\_index } | intro\_skipped { at\_slide\_index } |

*⚠ Son slayt her zaman güvenlik uyarısını içermelidir. Bu hem regülasyon gereği hem de kullanıcı beklenti yönetiminin parçasıdır. Slaytlar swipe ile de geçilebilir; bu durumda her slayt görüntülendi sayılır.*

## **FAM\_ONB\_01\_LANGUAGE — Dil Seçimi**

Zorunlu adım. Kullanıcının seçtiği dil, uygulama genelinde tüm içeriği ve bildirimleri etkiler. V0'da desteklenen diller: İngilizce (en), Fransızca (fr), Türkçe (tr).

| Özellik | Değer / Kural |
| :---- | :---- |
| Input | selected\_language (enum: en | fr | tr | genişletilebilir) |
| Prefill | Cihaz locale'i / bölge tespiti — kullanıcı değiştirebilir |
| Validasyon | selected\_language boş geçilemez; CTA boşken disabled |
| Yerel Depolama | onboarding\_draft.language |
| Primary CTA | Devam |
| Secondary CTA | Geri (intro'ya) |
| Analytics | language\_selected { selected\_language, suggested\_language, changed\_from\_suggested: bool } |

*⚠ Dil seçimi ConsentRecord'a yazılmaz, ancak backend'e user.locale olarak iletilir. Rıza metinleri seçilen dilde gösterilmelidir. V0'da çeviri yoksa İngilizce fallback kullanılır ve kullanıcı bilgilendirilir.*

## **FAM\_ONB\_02\_CONSENT — Rıza ve Güvenlik Uyarıları**

Bu ekran PIPEDA/PHIPA uyumunun temel noktasıdır. Üç zorunlu checkbox içerir. Hiçbiri önceden işaretli gelmez. Tüm checkbox işaretlenmeden CTA aktif olmaz.

| Özellik | Değer / Kural |
| :---- | :---- |
| Görünür Uyarı Başlığı | "Sinalytix teşhis koymaz, tedavi önermez. Bakım koordinasyonu ve görev yönetimi aracıdır." |
| Checkbox 1 — accept\_tos (ZORUNLU) | "Kullanım Koşulları'nı okudum ve kabul ediyorum" \[bağlantılı metin\] |
| Checkbox 2 — accept\_privacy (ZORUNLU) | "Gizlilik Politikasını okudum ve kabul ediyorum" \[bağlantılı metin\] |
| Checkbox 3 — ack\_not\_emergency (ZORUNLU) | "Bu uygulama acil durum servisi değildir. Acil durumlarda 911'i ararım." |
| CTA Durumu | 3 checkbox tam işaretlenmeden "Kabul Et ve Devam" disabled |
| Primary CTA | Kabul Et ve Devam |
| Secondary CTA | Geri |
| Yerel Depolama | onboarding\_draft.consent { accept\_tos, accept\_privacy, ack\_not\_emergency, consented\_at } |
| Backend Yazımı | ConsentRecord — immutable, auth sonrası |
| Analytics | consent\_completed { all\_accepted: bool, time\_on\_screen\_ms } |

*⚠ ToS / Privacy Policy bağlantıları uygulama içi WebView'da açılır. Kullanıcı geri döndüğünde checkbox durumu korunur. Caregiver PRD'deki 4\. checkbox (ack\_no\_clinical\_decision) Family App için gerekli değildir — aile klinik eylem üstlenmez; bu sorumluluk bakıcı/sağlık profesyonelinde kalır.*

### **Re-consent Akışı (V1)**

Sinalytix ToS veya Gizlilik Politikasını güncellediğinde, mevcut kullanıcılar uygulamayı açtıklarında yeni sürümü kabul etmek zorundadır. Onboarding'in tekrarı değil, ayrı bir modal/full-screen interstitial'dır. Kullanıcı yeni sürümü kabul etmeden uygulamaya devam edemez.

* Tetikleyici: consent\_record.version \< current\_tos\_version

* ConsentRecord'a yeni satır eklenir — önceki silinmez (audit trail bütünlüğü)

* Reddederse: çıkış yapılır, hesap pasif durumda bırakılır

## **FAM\_ONB\_03\_PROFILE — Temel Profil Bilgisi**

Bu adımda ad, soyad ve hastayla ilişki tipi toplanır. Telefon numarası OTP yolunda auth sırasında alınır. Maksimum sadelik korunur.

| Özellik | Değer / Kural |
| :---- | :---- |
| Input 1 — first\_name | string, zorunlu, min 2, max 50 karakter, yalnızca harf+boşluk+tire+apostrof |
| Input 2 — last\_name | string, zorunlu, min 2, max 50 karakter |
| Input 3 — relationship | enum: spouse | child | sibling | parent | other (ZORUNLU) — dropdown veya chip seçimi |
| SSO Prefill | SSO'dan isim geldiyse alanlar dolu gelir; "Dilersen düzenleyebilirsin" notu gösterilir |
| Validasyon | Her üç alan dolu değilse CTA disabled |
| Yerel Depolama | onboarding\_draft.profile { first\_name, last\_name, relationship } |
| Primary CTA | Devam |
| Secondary CTA | Geri |
| Analytics | profile\_completed { relationship\_type, name\_prefilled\_from\_sso: bool } |

*⚠ İlişki tipi V0'da klinik amaçla kullanılmaz; yalnızca bakım koordinasyonu ve bildirim kişiselleştirme için toplanır. V2'de hastalık bazlı yetki önerisinde (FAM-22) girdi olarak kullanılabilir.*

## **FAM\_ONB\_04\_AUTH\_METHOD — Giriş Yöntemi Seçimi**

| Özellik | Değer / Kural |
| :---- | :---- |
| Seçenekler | Apple ile Devam | Google ile Devam | Telefon Numarasıyla Devam |
| Validasyon | Yok — her seçim bir aksiyon tetikler |
| Secondary CTA | Geri (ONB\_03\_PROFILE'a) |
| Analytics | auth\_method\_selected { method: apple | google | phone\_otp } |

## **FAM\_ONB\_04A\_PHONE — Telefon Numarası Girişi (OTP Yolu)**

| Özellik | Değer / Kural |
| :---- | :---- |
| Input | phone\_number — E.164 normalizasyonu (ör: \+1 416 555 0123\) |
| UI | Ülke kodu seçici (+1 default Kanada) \+ numara alanı |
| Validasyon | E.164 format \+ ülke kodu \+ minimum uzunluk |
| Rate Limit | Max 3 OTP isteği / 10 dakika / numara |
| Primary CTA | Kod Gönder |
| Secondary CTA | Geri |
| Analytics | otp\_sent { phone\_country\_code, resend\_count } |

## **FAM\_ONB\_04B\_OTP — OTP Doğrulama (OTP Yolu)**

| Özellik | Değer / Kural |
| :---- | :---- |
| Input | otp\_code — 6 hane, yalnızca rakam |
| Auto-fill | iOS/Android OTP auto-fill (SMS'ten otomatik doldur) desteklenir |
| Timeout | 5 dakika (görünür geri sayım) |
| Hata: Yanlış Kod | "Kod hatalı. X deneme hakkın kaldı." \+ retry sayacı |
| Hata: Timeout | "Süre doldu. Yeni kod iste." \+ Kodu Tekrar Gönder CTA aktif |
| Hata: Max Retry (3) | "Çok fazla deneme. Lütfen yeni kod iste." \+ Kodu Tekrar Gönder |
| Primary CTA | Doğrula |
| Secondary CTA | Kodu Tekrar Gönder (rate limit: 3/10 dk) |
| Başarı Tetikler | Local data → Backend transfer akışı |
| Analytics | otp\_verified { result: success|fail, attempt\_number, error\_code? } |

## **AUTH SONRASI — Local → Backend Transfer**

Auth (SSO veya OTP) başarıyla tamamlanır tamamlanmaz tetiklenir. Bu işlem kullanıcıya görünmez; arka planda gerçekleşir.

| Adım | İşlem |
| :---- | :---- |
| 1 | User (roles\[\]=family) hesabı oluşturulur / oturum açılır |
| 2 | onboarding\_draft okunur: language → user.locale | consent → ConsentRecord | profile → FamilyProfile |
| 3 | ConsentRecord backend'e immutable olarak yazılır (version, flags, timestamp, ip\_hash) |
| 4 | FamilyProfile (1:1 uzantı) backend'e yazılır |
| 5 | Eğer Akış A'dan gelinmişse patient\_id ile PatientFamilyLink oluşturulur (status: pending\_patient\_confirm veya auto\_confirmed) |
| 6 | Local draft temizlenir (Keychain/Keystore'dan silinir) |
| 7 | onboarding\_completed\_at timestamp'i set edilir |

*⚠ Hata yönetimi: Transfer başarısız olursa kullanıcı FAM\_ONB\_06\_DONE ekranını görür. Arka planda exponential backoff ile max 5 retry yapılır. Tüm retry'lar başarısız olursa bir sonraki uygulama açılışında sessizce yeniden denenir.*

## **FAM\_ONB\_05\_CONNECT — Hasta Bağlama**

Auth sonrası kullanıcıya hasta bağlama seçeneği sunulur. Bu adım zorunlu değildir; opsiyonel.

| Senaryo | UI Davranışı | Sistem Aksiyonu |
| :---- | :---- | :---- |
| Akış A (patient\_id var) | Hasta adı \+ yakınlık bilgisi gösterilir. "\[Hasta Adı\] ile bağlantı kur" CTA. | PatientFamilyLink oluşturulur; hasta bilgilendirilir (push \+ in-app) |
| Akış B — QR | "QR Kodu Okut" CTA → kamera izni → QR tarama | Patient App Settings \> Bakımımı Yönetenler'deki QR kodu eşleştirilir |
| Akış B — 6 Haneli Kod | "Kodu Gir" CTA → 6 haneli input | Patient App'teki geçici kod ile eşleştirilir (max 5 dk geçerli) |
| Şimdilik Geç | Secondary CTA → ana ekrana (boş durum) | PatientFamilyLink oluşturulmaz |

## **FAM\_ONB\_06\_DONE — Tamamlandı**

| Özellik | Değer / Kural |
| :---- | :---- |
| Başlık | "Hazırsın." |
| Alt Metin | Hasta bağlandıysa: "\[Hasta Adı\]'nın bakım ekibindesiniz." / Geçildiyse: "Hasta bağlayarak başlayabilirsiniz." |
| Primary CTA | Uygulamaya Geç → Ana ekran |
| Secondary CTA (soft link) | "Bir Hasta Bağla" (Geç seçildiyse görünür) |
| Analytics | onboarding\_completed { completion\_time\_ms, linked\_patient\_immediately: bool, auth\_method } |

# **6\. Veri Modeli**

## **6.1 Yerel Depolama (Auth Öncesi)**

Tüm onboarding verisi auth gerçekleşene kadar şifreli yerel depolamada (iOS Keychain / Android Keystore) tutulur. Key: onboarding\_draft

onboarding\_draft {  step\_progress: "intro|language|consent|profile|auth\_method|auth|connect|done"  language: string  consent: {    accept\_tos: bool    accept\_privacy: bool    ack\_not\_emergency: bool    consented\_at: ISO8601  }  profile: {    first\_name: string    last\_name: string    relationship: "spouse|child|sibling|parent|other"  }  pending\_patient\_id: string | null   // Akış A: deep link'ten gelen patient\_id}

## **6.2 Backend Veri Modeli — User**

> [RECONCILED: A2] Tekil `user_type: family_member` ayrımcısı KALDIRILDI. Kimlik tek `User` satırıdır; aile rolü çok-değerli `roles[]` içinde `family` değeriyle taşınır (Kanonik Sözlük §1). Ayrı `FamilyMember` kimlik tablosu yok → `User` + `FamilyProfile` (1:1). `User` tablosunu çekirdek tanımlar; bu PRD referans verir.

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| user\_id | UUID | Primary key |
| roles\[\] | text\[\] | Çok-değerli; bu uygulamada `family` içerir (eski `user\_type: family\_member` yerine) |
| locale | string | Dil seçiminden (en | fr | tr) |
| auth\_methods | text\[\] | apple | google | phone\_otp |
| created\_at | timestamp | — |
| onboarding\_completed\_at | timestamp | null → tamamlandı sonrası set |
| status | enum | incomplete | active | suspended\_soft | suspended\_hard | dormant | deactivated |

## **6.3 Backend Veri Modeli — FamilyProfile (1:1 Profil Uzantısı)**

> [RECONCILED: A2] Eski `FamilyMember` (Profil) tablosu → `FamilyProfile` (`user_id` FK ile `User`'a 1:1 uzantı). DND artık burada (`dnd` bool) tutulur (B6 — bkz. FAM-10).

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| user\_id | UUID | FK → User (PK aynı zamanda; 1:1) |
| first\_name | string | — |
| last\_name | string | — |
| phone | string | OTP yolunda auth'tan; SSO yolunda null (V1'de tamamlama) |
| email | string | SSO'dan geliyorsa dolu; OTP yolunda null |
| relationship | enum | spouse | child | sibling | parent | other |
| dnd | boolean | DND durumu (B6; FamilyAvailability emekli) — varsayılan false |
| created\_at | timestamp | — |

## **6.4 Backend Veri Modeli — ConsentRecord (Immutable)**

> [RECONCILED: B2] İki katmanlı consent kanonik (Kanonik Sözlük §2): `ConsentRecord` (immutable yasal/ToS) **veri-paylaşımı yetkisi vermez**. Aileye yönelik veri-paylaşımı yetkisi `ConsentGrant` (iptal edilebilir, default-deny) ile; vekâlet/SDM senaryosu `SDMDeclaration` ile tanımlanır. AI/sesli özellik onamı `ConsentRecord.flags.ack_ai_processing` (B9). PatientFamilyLink.`permission_level` UI davranışı için korunur; ancak **yetkili (authoritative) erişim grant'ı `ConsentGrant`'tır** (canlı enforcement PolicyEngine/V1).

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| consent\_id | UUID | Primary key |
| user\_id | UUID | FK → User |
| version | string | ToS/Privacy sürüm numarası (ör: "2.1.0") |
| flags.accept\_tos | bool | — |
| flags.accept\_privacy | bool | — |
| flags.ack\_not\_emergency | bool | — |
| consented\_at | timestamp | Client-side timestamp |
| server\_recorded\_at | timestamp | Backend yazım zamanı |
| ip\_hash | string | SHA-256 hash — PIPEDA audit; plain IP saklanmaz |
| TABLO KURALI | — | IMMUTABLE — UPDATE/DELETE yasak. Versiyon değişikliğinde yeni satır. |

*⚠ PIPEDA uyum notu: Rıza kayıtları audit amaçlı minimum 7 yıl saklanmalıdır. ConsentRecord tablosuna UPDATE ve DELETE işlemleri uygulama seviyesinde engellenir. Yasal uyum için ayrı bir denetim veritabanına replike edilmesi önerilir.*

## **6.5 Backend Veri Modeli — PatientFamilyLink**

> [RECONCILED: A2/B2] FK `family_member_id` → `User (Family)` / `FamilyProfile` (ayrı `FamilyMember` tablosu yok). `permission_level` UI için kalır; veri-paylaşımının yetkili kaynağı `ConsentGrant`'tır (bkz. §6.4).

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| link\_id | UUID | Primary key |
| patient\_id | UUID | FK → User (Patient) |
| family\_member\_id | UUID | FK → User (Family) / FamilyProfile |
| permission\_level | enum | view (default) | edit | full |
| linked\_at | timestamp | Bağlantı oluşturulma zamanı |
| unlinked\_at | timestamp | null | Bağlantı kesilirse set edilir |
| link\_source | enum | invite\_link | qr\_code | manual\_code |
| permission\_granted\_at | timestamp | null | Edit/Full yetki verilirse |
| permission\_granted\_by | UUID | null | Yetkiyi veren kişi (genellikle hasta) |

# **7\. Hata Durumları ve Edge Case'ler**

| Senaryo | Kullanıcıya Gösterilen | Sistem Davranışı |
| :---- | :---- | :---- |
| OTP kodu yanlış (1–2. deneme) | "Kod hatalı. X deneme hakkın kaldı." | Retry sayacı artar |
| OTP kodu yanlış (3. deneme) | "Çok fazla deneme. Yeni kod iste." | Input disabled; Resend CTA aktif |
| OTP timeout (5 dk) | "Süre doldu. Yeni kod iste." | Timeout timer sıfır; Resend aktif |
| Rate limit aşıldı (3 SMS/10 dk) | "Kısa süre içinde çok fazla kod istedin. Lütfen bekle." | Resend CTA X dakika disabled (kalan süre gösterilir) |
| SSO iptal / başarısız | "Giriş iptal edildi. Başka yöntem deneyebilirsin." | FAM\_ONB\_04\_AUTH\_METHOD'a dön |
| Backend transfer hatası | Kullanıcıya gösterilmez | Silent retry (exponential backoff, max 5\) |
| Deep link patient\_id geçersiz | "Davet linki geçersiz veya süresi dolmuş. Manuel bağlanabilirsiniz." | patient\_id temizlenir; Akış B'ye geçilir |
| Uygulama kapanır, yarım bırakılır | Tekrar açınca kaldığı adımdan devam | step\_progress okunur, doğru ekrana yönlendirilir |
| Dil çevirisi eksik | "Bu dil kısmi desteklenmektedir" notu gösterilir | İngilizce fallback devreye girer |
| 6 haneli kod süresi doldu (\>5 dk) | "Bu kod geçersiz. Yeni kod iste." | Kod iptal edilir; hasta tarafından yeni kod üretilmesi gerekir |

# **8\. Kabul Kriterleri**

## **8.1 Fonksiyonel**

* İlk launch'ta intro slaytlar görünür; swipe veya "Devam" ile geçilir; "Geç" ile Step 1'e atlanabilir.

* Dil seçimi yapılmadan Step 2'ye geçilemez; seçim uygulama dilini anında değiştirir.

* Consent ekranındaki 3 checkbox işaretlenmeden CTA aktif olmaz.

* Ad, soyad ve ilişki tipi boş bırakılarak auth adımına geçilemez; min 2 karakter kontrolü çalışır.

* Auth öncesi (Step 0–3) tüm veri şifreli yerel depolamada saklanır; uygulama kapatılıp açıldığında kaybolmaz.

* Akış yarıda bırakılırsa tekrar açılışta step\_progress'e göre doğru ekranda devam edilir.

* Auth başarıyla tamamlandıktan sonra local draft backend'e aktarılır; ConsentRecord immutable yazılır.

* OTP: 3 yanlış denemede resend forced; timeout'ta süre doldu mesajı görünür.

* Onboarding tamamlandıktan sonra uygulama tekrar açılırsa onboarding tekrar gösterilmez.

* Akış A'da hasta otomatik eşleşir ve bağlantı kurulur; Akış B'de QR/kod ile bağlantı kurulabilir veya atlanabilir.

## **8.2 Regülasyon / Güvenlik**

* Hiçbir ekran kopyası teşhis, tedavi veya dozaj önermez.

* "Acil durumlarda 911'i arayın" uyarısı intro son slaytında VE consent ekranında görünür.

* ConsentRecord version alanı dolu olmalı; UPDATE/DELETE backend seviyesinde engellenmeli.

* Auth öncesinde hiçbir PII/PHI sunucuya gönderilmemeli.

* Yerel draft iOS Keychain / Android Keystore ile şifreli saklanmalı.

* ip\_hash SHA-256 olarak saklanmalı; plain IP tutulmamalı.

## **8.3 Teknik / Performans**

* Auth sonrası local → backend transfer: ≤ 3 saniye (normal bağlantı).

* Transfer hatası: silent retry; kullanıcıya onboarding tekrar gösterilmez.

* OTP rate limit: max 3 gönderim / 10 dakika / numara — DB veya cache seviyesinde uygulanır.

* step\_progress'e göre resume başarı oranı: ≥ %95.

* Onboarding flow crash/force-close oranı: ≤ %1.

# **9\. Başarı Metrikleri**

## **9.1 Funnel / Drop-off Hedefleri**

| Adım Geçişi | Hedef Oran | Neden Bu Hedef |
| :---- | :---- | :---- |
| Intro → Dil Seçimi | ≥ %90 | Intro "Geç" ile atlanabilir; kayıp beklenir |
| Dil → Rıza | ≥ %97 | Zorunlu adım; kayıp teknik hata göstergesi |
| Rıza → Profil | ≥ %95 | Küçük kayıp: kullanıcı uygulamayı anlayıp vazgeçebilir |
| Profil → Auth | ≥ %93 | — |
| Auth → Tamamlandı | ≥ %85 | SSO başarısızlıkları bu adımı etkiler |
| Tamamlandı → Hasta Bağlama | İzleme (hedef değil) | Davet linki vs bağımsız segmenti karşılaştırma |
| TOPLAM Onboarding Completion | ≥ %78 | Endüstri benchmark (consumer health uygulamaları) |

## **9.2 Zaman Metrikleri**

* Medyan tamamlama süresi (SSO yolu): ≤ 3 dakika

* Medyan tamamlama süresi (OTP yolu): ≤ 4 dakika

* 10 dakikayı aşan oturumlar "takılma sinyali" olarak flag'lenir

## **9.3 Hata Metrikleri**

* OTP ilk denemede başarısızlık oranı: ≤ %20

* Auth failure sonrası farklı yöntem denemesi oranı: izlenir (hedef: ≥ %30)

* Consent ekranında takılma (3+ dakika geçirilip terk): ≤ %5

* Geçersiz deep link ile gelen kullanıcılarda akış tamamlama oranı: izlenir

# **10\. UX ve Tasarım Notları**

* Her ekranda maksimum 1 primary CTA \+ 1 secondary CTA. Karar yorgunluğunu artırır.

* Geri navigasyonda form içerikleri korunur (yerel draft sayesinde); kullanıcı her geri adımda sıfırdan başlamaz.

* SSO prefill olduğunda "Dilersen düzenleyebilirsin" notu form alanlarının üstünde görünür.

* İlişki tipi seçimi için chip/büyük buton tasarımı tercih edilmeli — dropdown yerine görsel seçici.

* Klavye açıldığında CTA ekranda görünür kalmalı (scroll / padding ayarı gerekli).

* Hata mesajları: tek satır \+ ne yapması gerektiği (örn. "Kod hatalı. Tekrar dene." — sadece "Hata" değil).

* Font boyutu ve kontrast: Patient App'e yakın erişilebilirlik standartları; WCAG 2.1 AA minimum.

* Intro son slaydındaki güvenlik uyarısı göze çarpan bir renk veya ikon ile vurgulanmalı (ör. turuncu uyarı bandı).

# **11\. Kullanıcı Senaryoları**

## **Senaryo 1 — Alzheimer tanılı annenin çocuğu, davet linki ile giriyor**

Hasta (anne) Patient App'ten kızını EC olarak ekler ve "Uygulamaya Davet Et" butonuna basar. Kızına SMS gelir. SMS'teki linke tıklar; Family App Store'dan indirilir ve açılır. Intro'yu geçer, İngilizce seçer, 3 checkbox'ı işaretler, adını girer, "Çocuk" ilişkisini seçer, Google ile giriş yapar. Tamamlandı ekranında annesinin adı gösterilir: "Fatma Öztürk ile bağlantı kurulsun mu?" — Evet diyerek tek tuşta bağlantıyı kurar. Hedef süre: 3 dakika altı.

## **Senaryo 2 — Organik indirme, aynı anda birden fazla çocuk**

İki kardeş, babalarının bakımını organize etmek için Family App'i ayrı ayrı indirir. İlk kardeş bağımsız onboarding tamamlar, QR ile bağlantı kurar. İkinci kardeş onboarding yapar; ancak 6 haneli kod kullanır (QR kodunu kaydetmemiş). Her ikisi de eşzamanlı olarak hasta bakım ekibine dahil olur; görüntüleme yetkisi ile başlarlar.

## **Senaryo 3 — Yarım bırakıp dönen kullanıcı**

Kullanıcı profil bilgisini doldurmak üzereyken telefon gelir, uygulamayı kapatır. Ertesi gün tekrar açınca FAM\_ONB\_03\_PROFILE ekranından devam eder; dil ve rıza seçimleri kayıtlı gelir. Ad-soyad alanı boştur; yeniden doldurur ve devam eder.

## **Senaryo 4 — OTP sorunu yaşayan kullanıcı**

Telefon OTP'yi seçer. SMS gelmez, 2 dakika bekler. "Kodu Tekrar Gönder" butonuna basar. İkinci SMS gelir, 6 haneli kodu girer, doğrulama başarılı. Rate limit tetiklenmez (2 istek / 10 dk \< 3 limit).

## **Senaryo 5 — POA belgesi olan yasal vekil (V1 senaryosu)**

Hastanın yasal vekili (Power of Attorney) onboarding tamamlar, "Diğer" ilişki tipini seçer ve notuna "POA" yazar. V1'de onboarding'e eklenen opsiyonel POA belge yükleme adımını kullanarak vekaletname yükler. Sinalytix belgesi doğrulamaz; sadece saklar. İleride (V2) Healthcare Pro onayı ile full yetki atanabilir.

# **12\. Açık Konular**

| Konu | Durum | Sorumlu / Hedef |
| :---- | :---- | :---- |
| Akış A'da hasta tarafında onay gerekli mi? (Auto-confirm vs hasta onayı) | Açık | Patient App PRD güncellemesi ile koordineli karar verilmeli |
| PatientFamilyLink oluşturulduğunda hastaya bildirim zorunlu mu, bilgilendirme mi? | Açık | Ürün kararı \+ PHIPA değerlendirme |
| Re-consent interstitial tasarımı — modal mi, full-screen mu? | Açık | V1 UX sürecinde |
| SSO yolunda telefon numarası toplanacak mı? (iletişim ve 2FA için) | Açık | V1 profil tamamlama kararı |
| Çoklu aile üyesi aynı anda onboarding yaparsa çakışma riski var mı? | Düşük Risk | Teknik mimari — PatientFamilyLink composite key kontrolü |
| 6 haneli kod süresi (5 dk) yeterli mi, uzatılmalı mı? | Açık | UX testi \+ kullanıcı araştırması |
| Deep link parametresi sadece patient\_id mi, yoksa relationship hint de var mı? | Açık | V1 API tasarımı |
| ConsentRecord audit replication stratejisi (ayrı DB mi?) | Açık | Teknik mimari kararı |

*Sinalytix — Gizli ve Özel. Bu doküman geliştirici referansı içindir.*

# 0️⃣ Home Screen / Dashboard

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-02  —  Home Screen / Dashboard**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

## **1.1 Özelliğin Tanımı**

Family App Home Screen, aile üyesinin bakım sürecini tek bakışta kavrayabildiği merkezi kontrol panelidir. Günlük bakım durumu, bakıcı vardiya bilgisi, tamamlanmamış görevler, semptom bildirimleri ve acil uyarılar kart tabanlı bileşenlerle sunulur. Detay için kullanıcı ilgili özellik ekranına yönlendirilir.

Dashboard'un üç temel işlevi vardır:

* Durum farkındalığı (situational awareness): Hastanın bugünkü bakım durumunu özetleyen önemli sinyallerin öne çıkarılması.

* Hızlı aksiyon: En sık gerçekleştirilen aksiyonlara (mesaj gönder, görevi görüntüle, AI brifingini oku) minimum tıklamayla erişim.

* Acil sinyal yönetimi: SOS tetiklendiğinde kalıcı kırmızı banner ile dikkat çekme ve bildirim alma.

## **1.2 Hedef Kitle ve Kullanım Bağlamı**

Aile üyesi genellikle hastanın yanında değildir; uzaktan bakım sürecini izler. Tipik kullanım anları:

* Sabah rutini: "Bakıcı geldi mi, dünkü görevler tamamlandı mı?" — hızlı göz atma.

* Gece uyumadan önce: Gün sonu raporunu kontrol etme.

* Ani bildirim geldiğinde: Semptom bildirimi veya SOS uyarısına anında yanıt verme.

Bu kullanım senaryoları, kartların bilgi yoğunluğu ve yüklenme hızının kritik olduğuna işaret eder.

## **1.3 Ekosistem İçindeki Konum**

| Kaynak | Home'a Yansıyan Veri | Yönlendirme Hedefi |
| :---- | :---- | :---- |
| Patient App | SOS tetikleyicisi, görev tamamlama durumu | SOS Banner → 911 | Görevler sekmesi |
| Caregiver App | Vardiya check-in/check-out, shift notları | FAM-07 Vardiya İzleme |
| Patient AI Agent | Semptom raporu (SYMPTOM\_REPORT\_SEND) | FAM-08 Semptom Bildirimleri |
| Mesajlaşma Modülü | Son mesaj önizlemesi, okunmamış sayı | FAM-09 Mesajlaşma |
| Task Engine | Bugün: tamamlanan/bekleyen görev sayısı | FAM-04 Görev Yönetimi |

# **2\. Endüstri ve Klinik Bağlam**

## **2.1 Uzaktan Bakım İzleme Trendi**

2025-2026 döneminde Kanada'da uzaktan hasta izleme (remote patient monitoring) ve aile bakım koordinasyon uygulamaları hızla yaygınlaşmıştır. ShiftCare Connect, CareSwitch ve Caring Village gibi platformlar; aile dashboard'larının üç temel best practice'ini öne çıkarmıştır:

* Sadece özet veri göster: Aile klinisyen değil, yönetici perspektifine ihtiyaç duyar. "Bugün 5 görevden 3'ü tamamlandı" bilgisi yeterlidir; klinik detay değil.

* Aksiyon odaklı: Her kart, kullanıcının bir sonraki adımını net şekilde göstermeli (tamamlanmamış görevlere bak, mesaj gönder, raporu oku).

* Hız öncelikli: Dashboard açılış süresi ≤ 2 saniye olmalı; kullanıcıların %80'i 3 saniyeden uzun bekleme sürelerinde uygulamayı terk eder.

## **2.2 SOS ve Acil Sinyal Tasarımı**

Acil sinyal (SOS) bildirimlerinde en kritik UX prensibi, bannerın kalıcılığıdır. Kullanıcı ekranı kapatıp yeniden açtığında da banner görünür kalmalı; aktif SOS durumu çözülene veya kullanıcı "Gördüm" deyene kadar silinmemelidir. Apple Health ve Fall Detection uygulamalarının SOS deneyimleri bu prensip üzerine kuruludur.

# **3\. Kapsam ve Kısıtlar**

## **3.1 V0 — MVP Kapsamı**

* Hasta seçici (header dropdown — birden fazla hasta için)

* SOS banner (koşullu — aktif SOS event varsa)

* Bakıcı kartı: ad, vardiya durumu, süre sayacı (aktif varsa)

* Görev özeti kartı: bugün tamamlanan / toplam / bekleyen sayı

* Semptom bildirim kartı: son bildirim önizleme \+ okunmamış sayı

* Son mesaj kartı: son mesaj önizlemesi \+ gönderen

* DND (Rahatsız Etme Modu) toggle — header veya kartlarda

* Pull-to-refresh ile manuel yenileme

## **3.2 V1 Eklemeleri**

* Görev tamamlama trend grafiği (son 7 gün, sparkline)

* Bakıcı vardiya geçmişi özeti (bu haftaki toplam saat)

* Semptom bildirim trend göstergesi

## **3.3 V2 Eklemeleri**

* Wearable veri kartı (nabız, adım, uyku özeti — FAM-25)

* Sağlık portalı bağlantı durumu göstergesi (FAM-21)

## **3.4 Kısıtlar**

* Dashboard yalnızca read-only veri gösterir; aksiyonlar ilgili modüllere yönlendirir.

* Bakıcı veri kartı: salt okunur; shift bilgisi yazma yetkisi aile üyesine ait değildir.

* Semptom bildirimi kartı: klinik yorum içermez; "Acil değil" disclaimeri her zaman görünür.

* SOS banner: kullanıcı tarafından silinemez — yalnızca "Gördüm" onayı ile minimize edilebilir. SOS aktif olduğu sürece header'da küçük indikatör kalır.

## **3.5 Non-goals**

* Görev tamamlama — aksiyon Caregiver/Patient App'e aittir

* Shift başlatma/bitirme — Caregiver App'e aittir

* Klinik yorum veya semptom değerlendirmesi

* Doğrudan ilaç takibi dashboard'dan — detay FAM-04 Görev Yönetimi'nde

# **4\. Bileşen Mimarisi**

## **4.1 Sayfa Düzeni (Layout)**

Home ekranı dikey scroll ile çalışır. Bileşenler aşağıdan yukarıya öncelik sırasıyla yerleştirilir:

| Sıra | Bileşen | Koşul | Kaynak Tablo |
| :---- | :---- | :---- | :---- |
| 1 | Header (Hasta Seçici \+ DND \+ Çan) | Her zaman | PatientFamilyLink |
| 2 | SOS Banner | Aktif SOS event varsa | CallAttemptLog / SOS Event |
| 3 | Bakıcı Kartı | Her zaman (boş durum dahil) | CaregiverShift |
| 4 | Görev Özeti Kartı | Her zaman (boş durum dahil) | CareTaskOccurrence |
| 5 | Semptom Bildirim Kartı | Okunmamış bildirim varsa görünür | SymptomReport |
| 6 | Son Mesaj Kartı | Aktif konuşma varsa | Message / Conversation |
| 7 | AI Brifing CTA | Her zaman | — |

## **4.2 Header**

| Öğe | Davranış |
| :---- | :---- |
| Hasta Seçici | Birden fazla hasta bağlıysa: dropdown ile aktif hasta değiştirilir. Tek hasta varsa: yalnızca isim gösterilir, tıklanamaz. |
| DND Toggle | Anlık aç/kapa. FamilyProfile.dnd alanı güncellenir ≤ 2 sn (B6). Açıkken ikon kırmızı rozet ile işaretlenir. |
| Bildirim Çanı | Okunmamış bildirim sayısı badge'i. Tıklanınca FAM-15 Bildirim Merkezi açılır. |
| SOS İndikatör | Aktif SOS varsa header'da küçük kırmızı nokta (banner minimize edilmiş olsa bile) |

## **4.3 SOS Banner**

Hasta SOS butonuna bastığında Family App anında push bildirimi alır ve Home açıldığında ekranın en üstünde tam genişlikte kırmızı banner görünür.

| Özellik | Değer / Kural |
| :---- | :---- |
| Tetikleyici | SOS Event oluşturulduğunda — push \+ in-app |
| İçerik | "\[Hasta Adı\] acil yardım çağrısı başlatıldı. \[Saat\]" |
| Aksiyon Butonları | "911'i Ara" (tel: deep link) | "Gördüm" (minimize eder) |
| Kalıcılık | Uygulama yeniden açılırsa banner tekrar görünür (SOS aktifse) |
| DND Davranışı | SOS bildirimi DND durumundan bağımsız — her koşulda iletilir |
| Renk | Kırmızı arka plan, beyaz metin, dikkat çekici ikon |

## **4.4 Bakıcı Kartı**

| Durum | Gösterilen İçerik | Kaynak |
| :---- | :---- | :---- |
| Aktif vardiya | Bakıcı adı \+ yeşil badge \+ başlangıç saati \+ çalışan süre sayacı | CaregiverShift (shift\_active = true) |
| Vardiya yok | Gri kart: "Aktif bakıcı yok" | CaregiverShift (boş veya shift\_active = false) |
| Checkout yapıldı | Son checkout: "\[Bakıcı Adı\] vardiyayı tamamladı (\[süre\])" — 2 saat görünür, sonra "Vardiya yok"'a geçer | CaregiverShift (shift\_active = false, checked\_out\_at) |

*⚠ Bakıcı kartına tıklanınca FAM-07 Vardiya İzleme detay ekranına yönlendirilir. Aile bakıcı shift verisi yazamaz.*

## **4.5 Görev Özeti Kartı**

| Özellik | Değer / Kural |
| :---- | :---- |
| Başlık | "Bugünün Görevleri" |
| Özet Satırı | "X / Y tamamlandı  |  Z bekliyor" |
| İlaç Vurgusu | Tamamlanmamış medication subtype görev varsa: "⚠ \[N\] ilaç görevi bekliyor" satırı öne çıkarılır |
| CTA | Karta tıklanınca Görevler sekmesine (FAM-04) yönlendirilir |
| Boş Durum | Bugün görev yoksa: "Bugün planlanmış görev yok" |
| Kaynak | CareTaskOccurrence (date\_local \= bugün, patient\_id \= aktif hasta) |

## **4.6 Semptom Bildirim Kartı**

| Özellik | Değer / Kural |
| :---- | :---- |
| Görünürlük | Yalnızca okunmamış semptom bildirimi varsa görünür |
| İçerik | Son bildirim önizlemesi (ilk 100 karakter) \+ tarih-saat \+ okunmamış sayı badge |
| Disclaimer | "Bu bildirim acil durum değerlendirmesi içermez." — kart üzerinde küçük metin |
| CTA | Tıklanınca FAM-08 Semptom Bildirimi detay paneline gider |
| Kaynak | SymptomReport (patient\_id \= aktif hasta, read\_by'da family\_member\_id yok) |

## **4.7 Son Mesaj Kartı**

| Özellik | Değer / Kural |
| :---- | :---- |
| İçerik | Gönderen adı \+ mesaj önizlemesi (ilk 80 karakter) \+ saat \+ okunmamış sayı badge |
| Agent Kaynaklı Mesajlar | "Sina ile gönderildi" etiketi — ayrıştırılmış görsel stil |
| CTA | Tıklanınca FAM-09 Inbox'a yönlendirilir |
| Boş Durum | Aktif konuşma yoksa kart görünmez |
| Kaynak | Message tablosu (conversation\_id, last\_message\_at) |

## **4.8 AI Brifing CTA**

Home ekranında sabit bir "Günlük Brifing" butonu veya kartı bulunur. Tıklanınca FAM-11 AI Agent ekranı açılır ve günlük brifing otomatik üretilir.

| Özellik | Değer / Kural |
| :---- | :---- |
| Buton Metni | "Sina ile Günlük Brifing Al" |
| Görünürlük | Her zaman görünür (hasta bağlı değilse disabled) |
| Yönlendirme | FAM-11 AI Agent ekranı — brifing modu |

# **5\. Hasta Seçici Detay**

## **5.1 Çoklu Hasta Senaryosu**

Bir aile üyesi birden fazla hastayla bağlantılı olabilir (ör: hem annesi hem de babası için bakım koordinasyonu yapan bir çocuk). Hasta seçici bu durumu yönetir.

| Senaryo | Davranış |
| :---- | :---- |
| Tek hasta bağlı | Header'da hasta adı sabit gösterilir; tıklanamaz; dropdown yoktur |
| Birden fazla hasta | Header'da aktif hasta adı \+ dropdown oku; tıklanınca hasta listesi açılır |
| Hasta değiştirildiğinde | Tüm kartlar ve sekmeler yeni hasta bağlamına ≤ 2 sn içinde güncellenir |
| Hiç hasta bağlı değil | Header: "Hasta bağlı değil" \+ "Hasta Bağla" CTA (onboarding connect akışına) |

## **5.2 Aktif Hasta Durumu**

Aktif hasta seçimi yerel olarak saklanır (son oturumdaki hasta hatırlanır). Uygulama her açılışında son seçili hasta varsayılan olarak gelir.

# **6\. Boş Durum Davranışları**

| Durum | Görsel / Mesaj | Aksiyon CTA |
| :---- | :---- | :---- |
| Hiç hasta bağlı değil | İllüstrasyon \+ "Sevdiğinizin bakımını takip etmek için hasta bağlayın" | Hasta Bağla |
| Hasta bağlı ama bakıcı yok | Bakıcı Kartı: gri — "Aktif bakıcı yok" | — |
| Bugün görev yok | Görev Kartı: "Bugün planlanmış görev yok" | Görev Ekle (Görevler sekmesine) |
| Okunmamış semptom yok | Semptom kartı görünmez | — |
| Mesaj yok | Son Mesaj kartı görünmez | — |
| Genel boş durum (hepsi boş) | Görev \+ Bakıcı kartları boş durum metniyle gösterilir; Semptom ve Mesaj kartları gizlenir | — |

# **7\. Veri Modeli ve API Gereksinimleri**

## **7.1 Dashboard Veri Kaynakları**

| Kart | Tablo / Endpoint | Sorgu Parametreleri |
| :---- | :---- | :---- |
| Bakıcı Kartı | CaregiverShift | patient\_id, shift\_active (true=aktif; false=tamamlandı), date \= today |
| Görev Özeti | CareTaskOccurrence | patient\_id, date\_local \= today |
| Semptom Bildirimi | SymptomReport | patient\_id, read\_by yok (family\_member\_id) |
| Son Mesaj | Conversation \+ Message | patient\_id, family\_member\_id, last\_message\_at DESC LIMIT 1 |
| SOS Banner | SOSEvent / CallAttemptLog | patient\_id, status \= active OR created\_at \> now() − `freshness\_window\_minutes` (varsayılan 240 = 4 saat, config) |
| DND Durumu | FamilyProfile.dnd (B6) | user\_id (family) |

> [RECONCILED: A13] SOS tazelik penceresi tek değere sabitlendi: **4 saat (config)**. Eski çelişki (§7.1 `now()-1h` vs §8 ">4 saat") giderildi. Kanonik kaynak `SOSEvent.freshness_window_minutes` (default 240) — Kanonik Sözlük §6 (`SOSEvent`/`CallAttemptLog`). SaMD-nötr: app yalnız aramayı kolaylaştırır, klinik karar vermez.

## **7.2 Gerçek Zamanlı Güncelleme Gereksinimleri**

| Olay | Güncelleme Süresi | Mekanizma |
| :---- | :---- | :---- |
| Bakıcı check-in/check-out | ≤ 2 saniye | WebSocket / push notification |
| SOS tetiklendiğinde | Anlık (push öncelikli) | Push notification \+ WebSocket fallback |
| Yeni mesaj geldiğinde | ≤ 3 saniye | WebSocket |
| Görev tamamlandığında | ≤ 3 saniye | WebSocket |
| Semptom bildirimi | ≤ 5 saniye | Push notification |
| DND toggle | ≤ 2 saniye (karşı tarafa) | REST POST \+ async propagation |

# **8\. Hata Durumları ve Edge Case'ler**

| Senaryo | Kullanıcıya Gösterilen | Sistem Davranışı |
| :---- | :---- | :---- |
| Ağ bağlantısı yok | Her kartta "Çevrimdışı — Son güncelleme: \[saat\]" banner'ı | Son önbellek verisi gösterilir; otomatik retry bağlantı gelince |
| Bakıcı verisi yüklenemedi | Bakıcı kartında spinner → "Yüklenemedi. Yenile." | Retry butonu ile manuel yenileme |
| SOS event çok eski (\> 4 saat) | Banner gösterilmez; bildirim geçmişinde görünür | 4 saat eşik = `SOSEvent.freshness\_window\_minutes` (240, config) — A13 |
| Hasta seçici değiştirilirken hata | Toast: "Hasta değiştirilemedi. Tekrar dene." | Eski hasta bağlamı korunur |
| Birden fazla SOS event aynı anda | En son SOS öne çıkarılır; diğerleri "X uyarı daha var" ile gösterilir | Kronolojik sıralama |

# **9\. Kabul Kriterleri**

## **9.1 Fonksiyonel**

* Home açıldığında tüm kartlar ≤ 2 saniyede yüklenir (bağlantılı ağda).

* Bakıcı check-in/check-out değişikliği ≤ 2 sn içinde Bakıcı Kartına yansır.

* DND toggle anlık çalışır; Patient App FamilyProfile.dnd flag'i ≤ 2 sn güncellenir.

* Hasta seçici değiştirildiğinde tüm ekran yeni hasta bağlamına ≤ 2 sn içinde geçer.

* SOS event push geldiğinde banner uygulama açılınca görünür; "Gördüm" ile minimize edilebilir.

* Semptom kartı yalnızca okunmamış bildirim varsa görünür; okunduğunda kaybolur.

* Pull-to-refresh tüm kartları günceller.

* Çevrimdışı modda son önbellek verisi gösterilir; çevrimdışı banner görünür.

## **9.2 Regülasyon / Güvenlik**

* Semptom bildirim kartındaki disclaimer ("Acil değil") her zaman görünür.

* SOS banner'ındaki "911'i Ara" butonu her koşulda aktif (DND bağımsız).

* Klinik yorum veya tanı içeren metin hiçbir kartta yer almaz.

## **9.3 Teknik / Performans**

* Home ekranı ilk açılış (cold start): ≤ 2 saniye (p95).

* Hasta değişimi animasyon dahil: ≤ 300 ms UI geçişi, ≤ 2 sn veri yenileme.

* WebSocket bağlantısı koptuğunda: 30 sn polling fallback devreye girer.

* Çevrimdışı önbellek: son başarılı veri maksimum 24 saat gösterilir.

# **10\. Başarı Metrikleri**

| Metrik | Hedef | Ölçüm Yöntemi |
| :---- | :---- | :---- |
| Home ekranı yüklenme süresi (p95) | ≤ 2 saniye | APM (Application Performance Monitoring) |
| SOS bildirimini görüp "911'i Ara" tıklama oranı | İzleme (hedef değil) | Funnel analizi |
| Dashboard oturumu başına görüntülenme süresi | İzleme | Session analytics |
| Pull-to-refresh kullanım oranı | İzleme | Gesture tracking |
| Hasta seçici kullanım sıklığı (çoklu hasta sahipleri) | İzleme | Feature adoption |
| Semptom kartı tıklama oranı (görüldüğünde) | İzleme | Click-through rate |

# **11\. UX ve Tasarım Notları**

* Kart tasarımı: Her kart başlık \+ özet içerik \+ ok/chevron (detaya gidiyor) pattern'ini kullanır.

* SOS banner rengi: tam kırmızı (\#CC0000 veya brand kırmızısı); diğer renklerle karıştırılmamalı.

* Boş durum kartları: silmek yerine boş durumu açıklayan metin ile gösterilmeli (Bakıcı ve Görev kartları için). Kullanıcı "ekran bozuk mu?" yerine "bilgi yok" mesajını anlayabilmeli.

* Semptom ve Mesaj kartları: Veri yoksa gizlenmeli (boş kart gösterme); bu sayede ekran gereksiz boşluk içermez.

* Renk kodlaması tutarlı olmalı: yeşil \= aktif/iyi, sarı \= dikkat, kırmızı \= acil/eksik, gri \= pasif/yok.

* DND toggle: açıkken ikon üzerinde kırmızı çizgi veya X; kullanıcı durumu görmeden geçmemeli.

* AI Brifing CTA'sı: diğer kartlardan görsel olarak ayrışmalı (gradient veya özel arka plan); "magic" etkisi yaratmalı.

# **12\. Kullanıcı Senaryoları**

## **Senaryo 1 — Sabah rutini**

Aile üyesi sabah kahvaltısında uygulamayı açar. Bakıcı Kartı: "Ayşe Hanım vardiyaya girdi — 08:15". Görev Kartı: "2/7 tamamlandı — 5 bekliyor, 1 ilaç görevi". Alarm vermez, günlük kontrolü yapar; Görevler sekmesine geçer. Total süresi: 30 saniye.

## **Senaryo 2 — SOS bildirimi**

Öğleden sonra telefon masada dururken push bildirimi gelir: "Annen acil yardım çağrısı başlattı". Uygulamayı açar; tam ekran kırmızı banner: "Fatma Öztürk acil yardım çağrısı — 14:37". "911'i Ara" butonuna basar.

## **Senaryo 3 — Çevrimdışı kontrol**

Aile üyesi uçaktan inmeden önce uygulamayı açar (çevrimdışı). Kartlarda "Çevrimdışı — Son güncelleme: 3 saat önce" banner'ı görünür. Son önbellek verisi okunabilir; yeni veri çekilemez. İniş sonrası bağlantı gelince kartlar otomatik yenilenir.

## **Senaryo 4 — Hasta değiştirme (iki ebeveyn)**

Hem annesi hem babası bakım altında olan bir kullanıcı, header'dan hasta seçiciye tıklar. "Fatma Öztürk" ve "Ahmet Öztürk" listelenir. Ahmet'i seçince tüm kartlar Ahmet'in bakım verisine geçer. Bakıcı Kartı farklı bakıcıyı gösterir; görevler de farklı.

# **13\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| SOS banner: kullanıcı "Gördüm" dedikten sonra kaç saat küçük indikatör kalacak? | Açık | UX tasarım kararı |
| Çoklu SOS event aynı anda: hangisi öne çıkar? | Açık | En son event öncelikli (teknik kural) |
| AI Brifing CTA'sı her oturum açılışında otomatik tetiklensin mi? | Açık | UX araştırması \+ kullanıcı tercihi |
| WebSocket alt yapısı — shared mi, per-user mi? | Açık | Teknik mimari kararı |
| Çevrimdışı önbellek süresi (24 saat uygun mu?) | Açık | Güvenlik \+ veri tazeliği dengesi |

*Sinalytix — Gizli ve Özel. Bu doküman geliştirici referansı içindir.*

# 0️⃣ Navigasyon Yapısı

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-03  —  Navigasyon Yapısı**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

## **1.1 Özelliğin Tanımı**

Family App navigasyon yapısı, kullanıcının uygulama içindeki tüm modüllere erişimini düzenleyen mimarisel çerçevedir. Patient App ve Caregiver App'teki navigasyon örüntülerinden ilham alınarak tasarlanmış, ancak aile üyesinin özel ihtiyaçlarına göre uyarlanmıştır.

Navigasyon tasarımı üç temel ilkeyi esas alır:

* Sık kullanılan modüllere (Home, Görevler, Mesajlar) maksimum 1 tıklamayla erişim.

* Profil ve ayarlar gibi daha az sık kullanılan ekranlara 2 tıklamayla erişim (Profil sekmesi → alt ekranlar).

* Acil durum aksiyonları (SOS bildirimi, 911 arama) navigasyon hiyerarşisinden bağımsız — her zaman erişilebilir.

## **1.2 Endüstri Bağlamı**

Bottom tab bar mimarisi, mobil sağlık uygulamalarında standart navigasyon pattern'i olarak yerleşmiştir (Apple Human Interface Guidelines, Material Design 3). Sağlık uygulamalarında yapılan araştırmalar, kullanıcıların 4'ten fazla sekme arasında gezinmekte zorlandığını göstermektedir. 4 sekme, bilgi yoğunluğu ile kullanım kolaylığı arasındaki optimum nokta olarak belirlenmiştir.

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* 4 sekmeli alt navigasyon çubuğu (Bottom Tab Bar): Home, Görevler, Mesajlar, Profil

* Header: Hasta seçici \+ DND toggle \+ Bildirim çanı

* Profil sekmesi içinde alt navigasyon (Settings, Hasta Profili, Gizlilik & Bağlantılar, Bildirimler)

* Geri navigasyon: Android'de sistem geri butonu desteklenir; iOS'ta swipe-back desteklenir

## **2.2 Kısıtlar**

* Bottom tab bar sabit kalır — scroll veya ekran boyutundan bağımsız her zaman görünür.

* SOS banner aktif olduğunda tab bar gizlenmez; banner tab bar'ın üzerinde yer alır.

* Keyboard açıldığında tab bar gizlenebilir (native platform davranışı); kullanıcı klavyeyi kapattığında geri gelir.

## **2.3 Non-goals**

* Hamburger menü veya side drawer — tab bar mimarisine karşı tercih edilmez.

* Gesture-only navigasyon (swipe ile sekme değiştirme) — V0'da opsiyonel, ana navigasyon tab bar'dır.

# **3\. Navigasyon Mimarisi**

## **3.1 Alt Navigasyon (Bottom Tab Bar)**

| Sıra | Sekme | İkon | İçerik / Hedef | Badge Kuralı |
| :---- | :---- | :---- | :---- | :---- |
| 1 | Home | Ev / Dashboard ikonu | FAM-02 Home Screen / Dashboard | Yok |
| 2 | Görevler | Liste / Checkbox ikonu | FAM-04 Görev Yönetimi \+ FAM-05 Carry-over | Bekleyen görev sayısı (kırmızı) |
| 3 | Mesajlar | Konuşma balonu ikonu | FAM-09 Inbox / Mesajlaşma | Okunmamış mesaj sayısı (kırmızı) |
| 4 | Profil | Kişi / Kullanıcı ikonu | FAM-14 Profile & Settings | Yok |

## **3.2 Header (Tüm Ekranlar İçin Ortak)**

| Öğe | Konum | Davranış |
| :---- | :---- | :---- |
| Hasta Seçici | Sol | Aktif hasta adı \+ dropdown (birden fazla hastada). Tek hastada tıklanamaz. |
| DND Toggle | Orta-sağ | Anlık aç/kapa. Açıkken kırmızı ikon. FamilyProfile.dnd alanı ≤ 2 sn güncellenir (B6). |
| Bildirim Çanı | Sağ uç | Okunmamış bildirim badge'i. Tıklanınca FAM-15 Bildirim Merkezi açılır (modal veya push ekran). |

## **3.3 Profil Sekmesi İç Navigasyonu**

Profil sekmesi kendi içinde 4 alt bölüm içerir. Bu alt bölümler arasında navigasyon vertical scroll veya nested tab ile sağlanır.

| Alt Sekme | İçerik Özeti | Feature Referansı |
| :---- | :---- | :---- |
| Hesabım | Ad soyad, dil, güvenlik, hesap silme, veri export | FAM-14 Profile & Settings — Hesabım |
| Hasta Profili | Hastalıklar, alerjiler, ilaçlar (görüntüleme/yetki varsa düzenleme) | FAM-14 Profile & Settings — Hasta Profili |
| Gizlilik & Bağlantılar | DND, bağlı hasta listesi, bakıcı bilgisi, yetki durumu | FAM-14 Profile & Settings — Gizlilik | FAM-13 Yetki |
| Bildirimler | Bildirim tercihleri (V0 görüntüleme; V1 toggle) | FAM-14 Profile & Settings — Bildirimler |

## **3.4 Ekran Hiyerarşisi (Ağaç Diyagramı)**

*Family App tam navigasyon haritası:*

Family App├── Bottom Tab Bar│   ├── \[1\] Home│   │   ├── SOS Banner (koşullu)│   │   ├── Bakıcı Kartı → FAM-07 Vardiya Detay│   │   ├── Görev Özeti Kartı → \[2\] Görevler│   │   ├── Semptom Bildirimi Kartı → Semptom Detay (FAM-08)│   │   ├── Son Mesaj Kartı → \[3\] Mesajlar│   │   └── AI Brifing CTA → FAM-11 AI Agent│   ├── \[2\] Görevler│   │   ├── Bugün Görünümü (CareTaskOccurrence listesi)│   │   ├── Görev Ekleme Modal (FAM-04)│   │   ├── Görev Detay / Düzenleme│   │   └── Carry-over Akışı (FAM-05)│   ├── \[3\] Mesajlar│   │   ├── Konuşma Listesi (FAM-09 Inbox)│   │   │   ├── Bireysel Thread (Aile ↔ Hasta)│   │   │   ├── Bireysel Thread (Aile ↔ Bakıcı)│   │   │   └── Grup Thread (Bakım Ekibim)│   │   └── Yeni Konuşma Başlat│   └── \[4\] Profil│       ├── Hesabım│       ├── Hasta Profili│       │   ├── Hastalıklar (görüntüle / yetkiyle düzenle)│       │   ├── Alerjiler│       │   └── İlaçlar│       ├── Gizlilik & Bağlantılar│       │   ├── Bağlı Hasta Listesi│       │   ├── Bakıcı Bilgisi│       │   ├── Yetki Durumu (FAM-13)│       │   └── DND Toggle│       └── Bildirimler└── Global Overlay (tab bar üzerinde)    ├── FAM-12 Approval Queue (header badge ile tetiklenir)    ├── FAM-15 Bildirim Merkezi (çan ikonu ile tetiklenir)    └── FAM-11 AI Agent (Home CTA veya derinlink)

# **4\. Navigasyon Kuralları**

## **4.1 Deep Link Desteği**

| Kaynak | Deep Link Pattern | Hedef Ekran |
| :---- | :---- | :---- |
| Bildirim (gün sonu raporu) | sinalytix://family/report/\[date\] | FAM-06 Gün Sonu Raporu detayı |
| Bildirim (semptom) | sinalytix://family/symptom/\[report\_id\] | FAM-08 Semptom detayı |
| Bildirim (mesaj) | sinalytix://family/messages/\[conversation\_id\] | FAM-09 Thread detayı |
| Bildirim (approval) | sinalytix://family/approval/\[approval\_id\] | FAM-12 Approval Queue |
| SOS bildirim | sinalytix://family/sos/\[event\_id\] | Home → SOS Banner |
| Yetki değişikliği | sinalytix://family/permissions | Profil → Gizlilik & Bağlantılar |

## **4.2 Back Stack Yönetimi**

* Tab değiştirme back stack'i sıfırlamaz; her sekmenin kendi back stack'i tutulur.

* Home'a dönmek için bottom tab bar'a tıklama her zaman çalışır; tab kendi root'una döner.

* Modal ekranlar (Approval Queue, Bildirim Merkezi, AI Agent): kendi back stack'leri vardır; kapatma ile önceki ekrana dönülür.

* Deep link ile açılan ekranlar: back butonu navigasyon kökünü (Home) gösterir.

## **4.3 Approval Queue Erişimi**

Onay bekleyen aksiyon varsa Profil sekmesi veya Bildirim Çanı üzerinde kırmızı badge gösterilir. FAM-12 Approval Queue modal olarak açılır — tab bar'ı değiştirmez. Header'da onay ikonu eklenebilir (V1 tasarım kararı).

# **5\. Kabul Kriterleri**

## **5.1 Fonksiyonel**

* 4 sekme tüm ekranlarda görünür; aktif sekme vurgulanır.

* Her sekme tıklandığında doğru modüle ≤ 300 ms animasyon ile geçilir.

* Mesajlar ve Görevler sekmelerinde badge sayıları gerçek zamanlı güncellenir.

* Header hasta seçici değiştirildiğinde aktif sekme kendi bağlamını günceller.

* Android geri butonu ve iOS swipe-back doğru çalışır.

* Deep link'ler doğru ekrana yönlendirir; back butonu mantıklı bir üst ekrana döner.

## **5.2 Teknik / Performans**

* Sekme geçişi animasyonu: ≤ 300 ms.

* Bottom tab bar frame rate'i: 60 fps (scroll sırasında bile).

* Header hasta seçici dropdown açılışı: ≤ 200 ms.

# **6\. UX ve Tasarım Notları**

* İkon seti: platform native (SF Symbols için iOS, Material Icons için Android) veya tutarlı custom icon set.

* Aktif sekme: renk vurgusu \+ dolgu ikonu (outline → filled geçişi).

* Badge: kırmızı dolu daire, maksimum "99+" gösterilir.

* DND toggle: header'da her zaman görünür; kullanıcı aktif sekmeye bakılmaksızın DND durumunu kontrol edebilmeli.

* Erişilebilirlik: VoiceOver / TalkBack için her sekme ve header öğesi anlamlı label içermeli.

# **7\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| Approval Queue header'da ayrı ikon mu, yoksa Profil badge'i mi? | Açık | V1 UX tasarım kararı |
| FAM-11 AI Agent sekme mi, Home'dan CTA mı? | Açık | Ürün kararı — şu an Home CTA tercih edilmiş |
| FAM-06 Gün Sonu Raporu hangi sekmeye giriyor? (Home kart vs Profil alt ekran) | Açık | FAM-06 PRD ile koordineli karar |
| Keyboard açılınca tab bar gizlensin mi? (iOS davranışı) | Açık | Platform convention takip edilebilir |

*Sinalytix — Gizli ve Özel. Bu doküman geliştirici referansı içindir.*

# 0️⃣ Görev Yönetimi

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-04  —  Görev Yönetimi**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

## **1.1 Özelliğin Tanımı**

Görev Yönetimi, aile üyesinin hastanın ortak görev havuzunu (shared task pool) görüntülemesini, yeni görevler eklemesini ve kendi eklediği görevleri düzenlemesini sağlar. Görev havuzu Patient App, Caregiver App ve Family App arasında paylaşımlıdır; bir actörün yaptığı değişiklik diğerlerinin ekranına eşzamanlı yansır.

Aile üyesinin görev döngüsündeki rolü planlama ve izlemedir. Fiziksel bakım aksiyonu (görevi tamamlama) hasta veya bakıcıya aittir; aile bu aksiyonu uygulama üzerinden gerçekleştiremez. Bu ayrım hem klinik sorumluluk sınırlarını netleştirir hem de uygulama ActivityLog'unun doğruluğunu korur.

## **1.2 Shared Task Pool Mimarisi**

Tüm actörler aynı CareTask ve CareTaskOccurrence tablolarını okur ve yazar. Her görev, kim tarafından oluşturulduğunu (created\_by) ve kim tarafından tamamlandığını (completed\_by) takip eder.

| Actor | Görev Görüntüleme | Görev Ekleme | Görev Düzenleme | Görev Tamamlama |
| :---- | :---- | :---- | :---- | :---- |
| Hasta | Evet | Evet | Kendi eklediği | Evet |
| Bakıcı | Evet | Evet | Kendi eklediği \+ hasta'nın | Evet |
| Aile | Evet | Evet | Kendi eklediği \+ hasta'nın (V0) | Hayır |

*⚠ Aile V0'da görev tamamlayamaz. Açık konu: "Bakıcı yokken aile ilacı verdi" senaryosu V1'de klinik danışma ile değerlendirilecek (bkz. Açık Konular).*

> [RECONCILED: B1] Kanonik kural (Kanonik Sözlük §3): görev tamamlama = Hasta + Bakıcı (+agent/system). **Aile tamamlayamaz (V0)** — `CareTaskOccurrence.completed_by_actor_type` `family` değerini KABUL ETMEZ. Aile yalnız ekler/görür/düzenler (kendi + hastanın). Çapraz-not: Caregiver PRD'deki actor matrisi bu kuralla uyumlu olacak şekilde düzeltiliyor (orada aile-tamamlama satırı V0'da kapalı olmalı).

## **1.3 Görev Tipleri ve Alt Tipleri**

| Tip | Alt Tip | Açıklama |
| :---- | :---- | :---- |
| One-time | Standard | Belirli bir tarih/saat için tek seferlik görev |
| One-time | Medication | İlaç eylemi — ilaç ikonu ile ayrıştırılır; actor bilgisi vurgulanır |
| Recurring | Standard | Her gün veya belirli hafta günlerinde tekrarlayan görev |
| Recurring | Medication | Tekrarlayan ilaç görevi (sabah/akşam dozu gibi) |
| Counter | Standard | Günlük hedef sayı gerektiren görev (ör: 8 bardak su) |
| Counter | Medication | Günlük sayılı ilaç hedefi (ör: 3x fizik tedavi egzersizi) |

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* Görev listesi görüntüleme: Today view (bugün) — todo / done / skipped durumları

* Görev ekleme: One-time, Recurring, Counter; Standard ve Medication subtypes

* Görev düzenleme: kendi eklediği \+ hasta eklediği (bakıcı eklediğini düzenleyemez V0'da)

* Görev soft-delete: yalnızca kendi eklediği

* Görev satırı: başlık \+ created\_by label \+ durum \+ tamamlayan actor

* Medication subtype ilaç ikonu \+ actor vurgusu

* Counter görevlerde progress göstergesi (4/8 gibi)

* ActivityLog: her görev aksiyonu actor \+ timestamp ile kaydedilir

* Eşzamanlı yansıma: görev ekleme/düzenleme ≤ 2 sn içinde diğer actörlere yansır

## **2.2 V1 Eklemeleri**

* Bakıcı eklediği görevi düzenleme yetkisi (yetki seviyesi ile bağlantılı — FAM-13)

* İlaç görevlerinde Medication Administration Record (MAR) görünümü

* Görev kategorileri / etiket sistemi

## **2.3 Kısıtlar**

* Aile görev tamamlayamaz — "Tamamla" butonu hiçbir senaryoda görünmez.

* Aile görev skip edebilmez — skip aksiyonu bakıcı/hasta tarafından gerçekleştirilir.

* Medication subtype görevlerde ilaç adı ve dozu toplanmaz (V0); bu veri Patient profil modülünden gelecek (V1).

* Görev silme hard-delete değil soft-delete'dir; audit trail bütünlüğü korunur.

# **3\. Kullanıcı Akışları**

## **3.1 Görev Ekleme Akışı**

| Adım | Ekran / Aksiyonu | Alan | Kural |
| :---- | :---- | :---- | :---- |
| 1 | Görevler sekmesi → "+" CTA | — | Modal açılır |
| 2 | Görev başlığı | title (string) | Zorunlu; max 150 karakter |
| 3 | Görev tipi | type (One-time / Recurring / Counter) | Zorunlu; dropdown veya chip |
| 4 | Alt tip | subtype (Standard / Medication) | Zorunlu; chip seçimi |
| 5a (One-time) | Tarih \+ opsiyonel saat | date\_local, time\_local (nullable) | Tarih zorunlu; geçmiş tarih uyarı verir ama izin verilir |
| 5b (Recurring) | Gün seçimi | days\_of\_week (dizi) | En az 1 gün seçilmeli; "Her gün" toggle |
| 5c (Counter) | Günlük hedef | daily\_target (int) | Zorunlu; min 1, max 100 |
| 6 | Kaydet | — | CareTask \+ ilk CareTaskOccurrence('ler) oluşturulur; diğer actörlere ≤ 2 sn yansır |

## **3.2 Görev Düzenleme Akışı**

Kullanıcı görev satırına uzun basma veya kaydırma aksiyonu ile düzenleme menüsüne erişir.

| Senaryo | Düzenleme Yetkisi | Kural |
| :---- | :---- | :---- |
| Kendi eklediği görev | Tam düzenleme | Başlık, tip, alt tip, zaman — hepsi düzenlenebilir |
| Hasta eklediği görev | Kısıtlı düzenleme | V0'da başlık ve zaman düzenlenebilir; created\_by "Hasta" etiketi kalır |
| Bakıcı eklediği görev | Hayır (V0) | Düzenleme menüsü gösterilmez; yalnızca görüntüleme |

*⚠ Bakıcı eklediği görevi düzenleme V1 için açık konudur. Yetki seviyeleri FAM-13 ile koordineli tanımlanacak.*

# **4\. Ekran Spesifikasyonları**

## **4.1 Görev Listesi — Today View**

| Öğe | Değer / Kural |
| :---- | :---- |
| Başlık | Bugün | \[Tarih\] |
| Filtre | Varsayılan: All | Todo | Done | Skipped (sekmeli filtre) |
| Görev Satırı | Checkbox (disabled aile için) \+ Başlık \+ created\_by chip \+ durum badge \+ tamamlayan actor |
| created\_by Chip Değerleri | Sen | Hasta | Bakıcı — renkli chip ile ayrışır |
| Tamamlanan Görevler | Listede kalır — görsel olarak soluk/üstü çizili |
| Medication Subtype | İlaç ikonu \+ tamamlayan actor metni vurgulanır: "Dr. \[Adı\] tarafından / Hasta tarafından / Bakıcı tarafından" |
| Counter Görev | Progress bar: "4 / 8 tamamlandı" |
| Boş Durum | Filtre seçimine göre: "Bugün görev yok" veya "Tüm görevler tamamlandı 🎉" |
| Sticky Section Header | "Tamamlananlar (N)" — todo ve done arasında ayırıcı |

## **4.2 Görev Ekleme Modalı**

| Öğe | Değer / Kural |
| :---- | :---- |
| Modal Tipi | Bottom sheet (yarım ekran → tam ekran scroll) |
| Başlık Alanı | Büyük text input; otomatik focus; max 150 karakter sayacı |
| Tip Seçimi | 3 büyük chip: One-time | Recurring | Counter |
| Alt Tip Seçimi | 2 chip: Standard | Medication |
| Tarih/Gün/Sayı | Tip'e göre koşullu gösterim |
| Kaydet CTA | Zorunlu alanlar dolmadan disabled |
| İptal CTA | Modal kapanır; draft kaydedilmez |
| Validasyon | Başlık boş: "Görev başlığı zorunludur" | Tarih geçmişse: uyarı toast |

# **5\. Veri Modeli**

> [RECONCILED: A1] `TaskDefinition`→`CareTask`, `TaskOccurrence`→`CareTaskOccurrence` (Kanonik Sözlük §3). Tablolar çekirdek (care) tarafından tanımlanır; bu PRD referans verir.

## **5.1 CareTask**

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| task\_id | UUID | Primary key |
| patient\_id | UUID FK | Hangi hastaya ait |
| title | string | Max 150 karakter |
| type | enum | one\_time | recurring | counter |
| subtype | enum | standard | medication |
| created\_by | UUID FK | Actor user\_id |
| created\_by\_role | enum | patient | caregiver | family |
| days\_of\_week | int\[\] | Recurring için (0=Pazar ... 6=Cumartesi) |
| daily\_target | int | null | Counter için |
| is\_deleted | bool | Soft-delete flag |
| created\_at | timestamp | — |
| updated\_at | timestamp | — |

## **5.2 CareTaskOccurrence**

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| occurrence\_id | UUID | Primary key |
| task\_id | UUID FK | CareTask'a referans |
| patient\_id | UUID FK | Denormalize — sorgu optimizasyonu |
| date\_local | date | Görevin planlı tarihi |
| time\_local | time | null | Opsiyonel saat |
| status | enum | todo | done | skipped |
| completed\_by | UUID FK | null | Tamamlayan actor |
| completed\_by\_role | enum | null | patient | caregiver | family |
| completed\_at | timestamp | null | — |
| counter\_value | int | null | Counter tipinde o ana kadar yapılan sayı |
| carry\_over\_from | UUID FK | null | FAM-05: kaynak occurrence\_id |

## **5.3 ActivityLog (Görev Aksiyonları)**

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| log\_id | UUID | Primary key |
| entity\_type | enum | task\_definition | task\_occurrence |
| entity\_id | UUID | İlgili entity |
| action | enum | created | updated | deleted | completed | skipped | carried\_over |
| actor\_id | UUID FK | Aksiyonu gerçekleştiren |
| actor\_role | enum | patient | caregiver | family |
| timestamp | timestamp | — |
| diff | JSONB | Önceki ve yeni değerler (update için) |

# **6\. Gerçek Zamanlı Senkronizasyon**

## **6.1 Eşzamanlı Güncelleme Davranışı**

| Olay | Yansıma Süresi | Mekanizma |
| :---- | :---- | :---- |
| Aile yeni görev ekledi | ≤ 2 sn (tüm actörler) | WebSocket push veya server-sent event |
| Bakıcı görevi tamamladı | ≤ 2 sn (aile \+ hasta) | WebSocket — occurrence status güncellemesi |
| Hasta görev skip etti | ≤ 2 sn (aile \+ bakıcı) | WebSocket |
| Aile görev düzenledi | ≤ 2 sn (diğerleri) | WebSocket |
| Aile görev sildi | ≤ 2 sn | WebSocket — soft-delete, listeden kaybolur |

## **6.2 Çakışma Yönetimi (Conflict Resolution)**

İki actör aynı görevi eşzamanlı düzenlerse: last-write-wins politikası uygulanır. ActivityLog'da her iki yazım da kayıt altına alınır. V1'de optimistic concurrency control (version field) eklenebilir.

# **7\. Hata Durumları ve Edge Case'ler**

| Senaryo | Kullanıcıya Gösterilen | Sistem Davranışı |
| :---- | :---- | :---- |
| Aile "Tamamla" butonuna basmaya çalışıyor | "Tamamla" butonu görünmez | UI seviyesinde engelleme; API seviyesinde de yetki kontrolü |
| Geçmiş tarihle görev ekleme | Toast: "Seçilen tarih geçmişte. Devam etmek istiyor musun?" | Kullanıcı onaylarsa kaydedilir; uyarı loglanır |
| Ağ hatası — görev ekleme | Toast: "Görev kaydedilemedi. Tekrar dene." | Local optimistic update → rollback; retry CTA |
| Bakıcı eklediği görevi düzenlemeye çalışma | Düzenleme seçeneği menüde gösterilmez | UI seviyesinde engelleme |
| Counter hedef aşıldı (12/8 gibi) | Counter: "12 / 8" — üstü çizili stil yoktur; tamamlandı sayılır | counter\_value \> daily\_target kabul edilir; status: done |
| Görev listesi 100+ item | Sayfalama devreye girer; "Daha fazla yükle" CTA | Backend pagination; ilk 50 item yüklenir |

# **8\. Kabul Kriterleri**

## **8.1 Fonksiyonel**

* Aile görev ekleyebilir; eklenen görev hasta ve bakıcı listesine ≤ 2 sn yansır.

* Aile görev tamamlayamaz — "Tamamla" butonu/opsiyonu hiçbir şekilde görünmez.

* created\_by label doğru gösterilir: Sen / Hasta / Bakıcı.

* Medication subtype görevlerde tamamlayan actor bilgisi vurgulanır.

* Counter görevlerde progress bar doğru hesaplanır.

* Soft-delete sonrası görev listeden kaybolur; ActivityLog kaydı oluşur.

* Recurring görev eklenince gelecekteki tüm occurrence'lar oluşturulur (veya lazy generation yapılır — teknik kararı).

* ActivityLog her aksiyon için actor \+ timestamp \+ diff yazar.

## **8.2 Regülasyon / Güvenlik**

* Aile, bakıcının eklediği görevi V0'da düzenleyemez veya silemez — API seviyesinde yetki kontrolü.

* Medication subtype görevlerde dozaj bilgisi aile tarafından eklenemez veya düzenlenemez (V0).

* Her görev aksiyonu audit log'a yazılır; silinmez.

## **8.3 Teknik / Performans**

* Görev listesi yüklenme süresi: ≤ 2 sn (50 görev için, normal bağlantı).

* Görev ekleme modal açılışı: ≤ 200 ms.

* Eşzamanlı güncelleme yansıma süresi: ≤ 2 sn (WebSocket bağlıysa).

# **9\. Başarı Metrikleri**

| Metrik | Hedef / İzleme |
| :---- | :---- |
| Görev ekleme başarı oranı | ≥ %98 (ağ hatası hariç) |
| Ortalama görev ekleme süresi | İzleme (benchmarking) |
| Görev tamamlama oranı (hasta \+ bakıcı) | İzleme — bakım kalitesi sinyali |
| Medication görev tamamlama oranı | İzleme — ilaç uyumu kritik sinyali |
| Aile tarafından eklenen görev oranı | İzleme — feature adoption |
| Conflict occurrence oranı (eşzamanlı düzenleme) | İzleme — düşük beklenir |

# **10\. UX ve Tasarım Notları**

* created\_by chip'ler renk kodlu olmalı: Hasta \= mavi, Bakıcı \= turuncu, Sen (Aile) \= mor/yeşil — tutarlı renk kullanımı tüm actörlerde uygulanmalı.

* "Tamamla" butonu aile görünümünde asla gösterilmemeli; "kilitli" ikon yerine hiç gösterilmemesi tercih edilir (daha az kafa karışıklığı).

* Medication görevleri görsel olarak öne çıkarılmalı: ilaç ikonu, farklı kart rengi veya border.

* Görev ekleme modalında "Medication" alt tipi seçildiğinde küçük bir disclaimer görünmeli: "Dozaj bilgisi için Hasta Profilini ziyaret edin."

* Uzun görev listelerinde "bugün tamamlananlar" bölümü default olarak daraltılmış (collapsed) gelebilir.

# **11\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| Bakıcı yokken aile ilacı verse ve kaydedebilse — klinik sorumluluk kime ait? | Açık (yüksek öncelik) | Klinik danışma \+ V1 kararı |
| Bakıcı eklediği görevi düzenleme yetkisi: hangi permission\_level ile açılır? | Açık | FAM-13 ile koordineli V1 kararı |
| Recurring görev occurrence lazy mi, eager mi üretilmeli? | Açık | Teknik mimari kararı |
| Görev listesi sayfalama eşiği (50 uygun mu?) | Açık | Performans testi sonrası |
| Medication görev için ilaç adı V0'da serbest metin mi? | Açık | Patient profil modülü ile koordineli |
| Çevrimdışı görev ekleme: optimistic update \+ sync stratejisi | Açık | Teknik mimari — offline-first karar |

*Sinalytix — Gizli ve Özel. Bu doküman geliştirici referansı içindir.*

# 0️⃣ Görev Taşıma (Carry-over)

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-05  —  Görev Taşıma (Carry-over)**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

Carry-over özelliği, tamamlanmamış görevlerin bir sonraki güne veya seçilen tarihe taşınmasını sağlar. Patient App PRD'de "Family App PRD belirler" olarak ertelenen bu özellik, aile üyesinin bakım sürekliliğini yönetmesindeki kritik araçlardan biridir.

Özelliğin üç temel motivasyonu vardır:

* Bakım sürekliliği: Bir günde tamamlanamayan görevler kaybedilmeden takip edilmeli.

* Geçmiş bütünlüğü: Orijinal occurrence silenmez; yeni occurrence oluşturulur. ActivityLog audit trail'i korunur.

* Aile koordinasyonu: Carry-over aksiyonu hasta ve bakıcıya eşzamanlı yansır; herkes güncel görev listesini görür.

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* Tekli taşıma: Belirli bir görevi seçip sonraki güne (veya özel tarihe) taşı.

* Toplu taşıma: Tüm açık (todo) görevleri tek aksiyonla taşı.

* Giriş noktaları: (1) Gün Sonu Raporu içindeki "Sonraki Güne Taşı" CTA; (2) Görev listesinde eski tarihli todo görevin üzerindeki kaydırma aksiyonu.

* Hedef tarih: Varsayılan yarın; kullanıcı başka tarih seçebilir (date picker).

## **2.2 Kısıtlar**

* Orijinal CareTaskOccurrence değiştirilemez; yeni CareTaskOccurrence oluşturulur.

* Sadece todo (tamamlanmamış) görevler taşınabilir; done veya skipped taşınamaz.

* Recurring görev occurrence'ları taşınmaz — otomatik olarak zaten gelecekte var.

* Aile, bakıcı eklediği görevi taşıyamaz (V0).

# **3\. Akış ve Ekran Spesifikasyonları**

## **3.1 Tekli Taşıma Akışı**

| Adım | Aksiyonu | Sistem Davranışı |
| :---- | :---- | :---- |
| 1 | Görev satırında sağa kaydır veya "..." menüsü → "Sonraki Güne Taşı" | Tarih onay bottom sheet açılır |
| 2 | Hedef tarih seç (varsayılan: yarın) | Date picker — geçmiş tarih seçilemez |
| 3 | "Taşı" CTA | Yeni CareTaskOccurrence oluşturulur; ActivityLog yazılır; diğer actörlere yansır |
| 4 | Başarı toast | "Görev \[hedef tarih\]'e taşındı" |

## **3.2 Toplu Taşıma Akışı**

| Adım | Aksiyonu | Sistem Davranışı |
| :---- | :---- | :---- |
| 1 | Gün Sonu Raporu → "Tüm Açık Görevleri Taşı" CTA veya Görev listesi başlığından "Toplu Taşı" | Onay modal: "N görev yarına taşınacak. Onaylıyor musun?" |
| 2 | "Onayla" CTA | Tüm todo occurrence'lar için yeni occurrence'lar oluşturulur; ActivityLog toplu yazılır |
| 3 | Başarı toast | "N görev \[hedef tarih\]'e taşındı" |

# **4\. Veri Modeli**

## **4.1 CareTaskOccurrence (Carry-over Alanları)**

| Alan | Tip | Açıklama |
| :---- | :---- | :---- |
| carry\_over\_from | UUID FK | null | Kaynak occurrence\_id; null ise orijinal occurrence |
| carry\_over\_at | timestamp | null | Taşıma zamanı |
| carry\_over\_by | UUID FK | null | Taşıyan actor |
| carry\_over\_by\_role | enum | null | family | patient | caregiver |

## **4.2 ActivityLog Carry-over Kaydı**

| Alan | Değer |
| :---- | :---- |
| action | carried\_over |
| entity\_type | task\_occurrence |
| entity\_id | Yeni occurrence\_id |
| diff | { source\_occurrence\_id, target\_date, carried\_over\_by\_role } |

# **5\. Kabul Kriterleri**

* Tamamlanmamış görev sonraki güne veya seçilen tarihe taşınabilir.

* Toplu taşıma çalışır; N görev tek aksiyonla taşınır.

* Orijinal occurrence değişmez; yeni occurrence oluşur.

* ActivityLog carry\_over\_from alanıyla birlikte yazılır.

* Taşınan görev ≤ 2 sn içinde hasta ve bakıcı listesine yansır.

* Recurring görev occurrence'ları taşıma seçeneği sunulmaz.

# **6\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| Hasta veya bakıcı carry-over yapabilir mi? (aile dışı actörler) | Açık | Tüm actörlere açık olması önerilir — Product kararı |
| Carry-over zincirleme sınırı: bir görev kaç kez taşınabilir? | Açık | 3 gün ardışık taşıma → uyarı mesajı önerisi |
| Taşınan görevler özel görsel stil almalı mı? (taşındı ikonu) | Açık | UX tasarım kararı |

*Sinalytix — Gizli ve Özel.*

# 0️⃣ Gün Sonu Raporu Görüntüleme

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-06  —  Gün Sonu Raporu Görüntüleme**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

Gün Sonu Raporu, her gün saat 22:00'de (hastanın timezone'unda) otomatik oluşturulan ve aile üyesine iletilen bir bakım özet bildirimidir. Aile üyesi hastanın günlük bakım performansını, ilaç tamamlanma oranını ve tamamlanmamış görevleri tek ekranda görebilir; gerekirse carry-over aksiyonu başlatabilir.

Bu özellik, Sinalytix'in "aile her zaman bilgili olmalı" ilkesini günlük ritüel haline getiren temel bir mekanizmadır. Raporun kalitesi ve tutarlılığı, aile üyesinin platforma güvenini doğrudan etkiler.

## **1.1 Tasarım Prensipleri**

* Klinik yorum yok: Rapor yalnızca görev ve ilaç tamamlanma verisi içerir; semptom değerlendirmesi, sağlık yorumu veya öneri içermez.

* Carry-over için eylem noktası: Tamamlanmamış görevler liste halinde gösterilir ve tek tıkla taşıma (FAM-05) başlatılabilir.

* Tarihsel erişim: Son 30 günlük raporlar liste görünümünde erişilebilir — aile bakım trendini takip edebilir.

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* Günlük rapor oluşturma: Her gün 22:00±5 dakika (hasta timezone'u), otomatik.

* Push \+ in-app bildirim ile aile üyesine iletim.

* Rapor detay ekranı: Tamamlananlar \+ Tamamlanmayanlar \+ Carry-over CTA.

* Medication taskları için actor bilgisi (kim tamamladı).

* Son 30 günlük rapor geçmişi listesi.

## **2.2 V1 Eklemeleri**

* Görsel trend grafiği: Tamamlama oranı grafiği (son 7 / 30 gün sparkline).

* Haftalık özet raporu (her Pazar gece ek bir özet).

## **2.3 Kısıtlar**

* Rapor içeriği yalnızca o güne ait CareTaskOccurrence verisini yansıtır; klinik yorum içermez.

* Rapor retroaktif düzenlenemez; immutable görünüm.

* Hasta timezone'u baz alınır — aile farklı timezone'da olsa bile rapor 22:00 hasta saatine göre gelir.

# **3\. Rapor İçeriği ve Ekran Spesifikasyonu**

## **3.1 Rapor Detay Ekranı**

| Bölüm | İçerik |
| :---- | :---- |
| Başlık | "\[Hasta Adı\]'nın \[Tarih\] Günü Özeti" |
| Tamamlananlar | ✅ ikonu \+ görev adı \+ tamamlama saati \+ actor (Hasta / Bakıcı) |
| Medication Tamamlananlar | 💊 ikonu \+ ilaç görevi adı \+ actor vurgusu: "Bakıcı tarafından — 09:15" |
| Tamamlanmayanlar | ⏳ ikonu \+ görev adı listesi |
| Carry-over CTA | "Açık görevleri yarına taşı" — tamamlanmayan varsa görünür (FAM-05 akışı tetikler) |
| Genel Özet | Başlık altında: "X / Y görev tamamlandı" |
| Disclaimer | Yok — klinik yorum olmadığı için disclaimer gerekmez |

## **3.2 Boş Durum / Özel Durumlar**

| Durum | Görünen İçerik |
| :---- | :---- |
| Tüm görevler tamamlandı | "🎉 Tüm görevler tamamlandı\!" — carry-over CTA görünmez |
| O gün hiç görev yoktu | "Bugün planlanmış görev yoktu." |
| Rapor henüz oluşturulmadı (22:00 öncesi) | Liste görünümünde "Bugün'ün raporu henüz hazır değil" |

## **3.3 Rapor Geçmişi Listesi**

Profil sekmesi veya bildirim geçmişi üzerinden "Rapor Geçmişi" erişimi. Son 30 gün listelenir.

| Öğe | Değer |
| :---- | :---- |
| Liste öğesi | \[Tarih\] — X/Y tamamlandı — okundu/okunmadı durumu |
| Tıklama | Rapor detay ekranı açılır |
| Sayfalama | 30 gün — "Daha fazla yükle" ile önceki aylar açılabilir (DB retention: 1 yıl) |

# **4\. Teknik Gereksinimler**

## **4.1 Rapor Oluşturma (Backend)**

| Parametre | Değer |
| :---- | :---- |
| Tetikleyici | Scheduled job — her gün 22:00 (hasta timezone'u) |
| Tolerans | ±5 dakika — yük dengeleme için |
| Veri Kaynağı | CareTaskOccurrence (date\_local \= bugün, patient\_id) |
| Bildirim | Push \+ in-app notification (FAM-15 Bildirim Merkezi'ne de yazılır) |
| Tablo | DailySummaryLog (tarihsel rapor arşivi) |
| DB Retention | 1 yıl (audit uyumu) |

## **4.2 DailySummaryLog Veri Modeli**

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| summary\_id | UUID | Primary key |
| patient\_id | UUID FK | — |
| date\_local | date | Rapor tarihi |
| total\_tasks | int | O günkü toplam görev sayısı |
| completed\_tasks | int | Tamamlanan görev sayısı |
| pending\_tasks | int | Tamamlanmayan görev sayısı |
| medication\_tasks\_completed | int | Tamamlanan ilaç görevi sayısı |
| task\_details | JSONB | Her görev: { task\_id, status, completed\_by\_role, completed\_at } |
| generated\_at | timestamp | Rapor oluşturulma zamanı |
| notification\_sent\_at | timestamp | Push gönderim zamanı |

# **5\. Kabul Kriterleri**

* Rapor her gün 22:00±5 dakika içinde oluşturulur.

* Push \+ in-app bildirim gönderilir; bildirim Rapor detay ekranına deep link içerir.

* Tamamlanan görevlerde actor bilgisi (Hasta / Bakıcı) görünür.

* Medication görevlerde actor vurgusu doğru çalışır.

* Carry-over CTA tamamlanmayan görev varsa görünür; yoksa görünmez.

* Son 30 günlük rapor listesi erişilebilir.

* DailySummaryLog doğru verilerle yazılır.

# **6\. Başarı Metrikleri**

| Metrik | Hedef / İzleme |
| :---- | :---- |
| Rapor oluşturma başarı oranı | ≥ %99.5 (zamanlanmış job güvenilirliği) |
| Rapor açılma oranı (push → ekran) | İzleme — engagement sinyali |
| Carry-over CTA kullanım oranı | İzleme — feature adoption |
| Ortalama rapor okuma süresi | İzleme — içerik kalitesi sinyali |

# **7\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| Semptom bildirimi gün sonu raporuna eklensin mi? | Açık | FAM-08 ile koordineli karar |
| Haftalık özet için V1'de ayrı notification tipi mi gerekli? | Açık | V1 bildirim tasarımı |
| Hasta timezone yoksa varsayılan (UTC-5 Ontario)? | Açık | Teknik kararı — profil tamamlama akışı ile bağlantılı |

*Sinalytix — Gizli ve Özel.*

# 0️⃣ Bakıcı Vardiya İzleme

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-07  —  Bakıcı Vardiya İzleme**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

Bakıcı Vardiya İzleme, aile üyesinin profesyonel bakıcının vardiya durumunu gerçek zamanlı takip etmesini sağlar. CaregiverShift tablosundan salt okunur (read-only) erişim; aile yazma yetkisine sahip değildir.

Bu özelliğin aile için üç temel değeri vardır:

* Güvence: "Bakıcı geldi mi?" sorusunun yanıtı uzaktan, anlık.

* Şeffaflık: Bakıcının ne kadar süre kaldığını ve ne zaman ayrıldığını bilmek.

* Hesap verebilirlik: Check-in/check-out geçmişi, ilerleyen sürümlerde bakıcı değerlendirme (FAM-17) için girdi sağlar.

## **1.1 Caregiver App Bağlantısı**

Bakıcı, Caregiver App üzerinden vardiyaya check-in ve check-out yapar. Sinalytix'in ilerleyen versiyonlarında Electronic Visit Verification (EVV) entegrasyonu planlanmaktadır; V0'da check-in/check-out manuel, uygulama üzerinden.

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* Home ekranında Bakıcı Kartı (FAM-02 ile entegre)

* Vardiya Detay Ekranı: aktif vardiya \+ bugünkü geçmiş vardiyalar \+ son 7 gün özeti

* Check-in / check-out bildirimleri: push \+ in-app

* Gerçek zamanlı sayaç: aktif vardiyanın süre sayacı

## **2.2 Kısıtlar**

* Aile vardiya başlatamaz, bitiremez ve shift notu ekleyemez (write yasak).

* Shift notu içeriği aileye özet olarak görünür; tam metin bakıcı erişimindedir.

# **3\. Ekran Spesifikasyonları**

## **3.1 Vardiya Detay Ekranı**

| Bölüm | İçerik |
| :---- | :---- |
| Aktif Vardiya (varsa) | Bakıcı adı \+ yeşil badge \+ başlangıç saati \+ anlık süre sayacı (HH:MM:SS) |
| Aktif Vardiya Yok | Gri kart: "Şu an aktif bakıcı yok" |
| Bugünkü Vardiya Geçmişi | Liste: \[Bakıcı Adı\] — Giriş: \[saat\] | Çıkış: \[saat\] | Süre: \[HH:MM\] |
| Shift Notu Özeti | Son checkout'taki notun ilk 150 karakteri (tam metin bakıcıya özel) |
| Son 7 Gün Özeti | Her gün: toplam vardiya süresi \+ bakıcı adı (varsa) veya "Vardiya yok" |

## **3.2 Bildirimler**

| Olay | Bildirim İçeriği | Kanal |
| :---- | :---- | :---- |
| Check-in | "\[Bakıcı Adı\] saat \[HH:MM\]'de vardiyaya girdi" | Push \+ in-app |
| Check-out | "\[Bakıcı Adı\] vardiyayı tamamladı. Süre: \[HH:MM\]" | Push \+ in-app |
| Planlanan vardiya gelmedi (V1) | Uyarı — planlanan saatte check-in yoksa | Push (V1) |

# **4\. Veri Modeli**

> [RECONCILED: A5] Bu read şeması OWNER (Caregiver app) kanonik `CaregiverShift` tablosuna hizalanmıştır (Kanonik Sözlük §4): `status{active,completed,cancelled}`→`shift_active`(bool); `check_in_at`→`checked_in_at`; `check_out_at`→`checked_out_at`; `shift_notes`→`shift_note`/`shift_note_structured` (SBAR; V1). `caregiver_phone` bu tabloda DEĞİLDİR — `CaregiverProfile.phone`'dan join edilir. Tablo Caregiver app sahibidir; Family yalnız okur.

| Alan (CaregiverShift) | Tip | Açıklama |
| :---- | :---- | :---- |
| shift\_id | UUID | Primary key |
| patient\_id | UUID FK | — |
| caregiver\_id | UUID FK | — |
| shift\_active | boolean | Aktif vardiya bayrağı (eski `status` enum yerine; tek aktif vardiya/bakıcı) |
| checked\_in\_at | timestamp | Check-in zamanı (eski `check\_in\_at`) |
| checked\_out\_at | timestamp | null | Check-out zamanı (eski `check\_out\_at`) |
| check\_out\_reason | enum | null | manual | auto\_switch | system\_timeout |
| duration\_minutes | int | null | Checkout sonrası hesaplanır |
| shift\_note | TEXT (encrypted) | Bakıcı notu — aile özet görür (eski `shift\_notes`) |
| shift\_note\_structured | JSONB | null | SBAR yapılandırılmış not (V1) |

*Not: `caregiver_phone` shift tablosunda tutulmaz; aile çağrısı için `CaregiverProfile.phone`'dan join edilir.*

# **5\. Kabul Kriterleri**

* CaregiverShift değişikliği (check-in/out) ≤ 2 sn içinde aile ekranına yansır.

* Aile shift verisi yazamaz — API seviyesinde yetki kontrolü.

* Check-in ve check-out bildirimleri DND bağımsız gönderilir (DND standart çağrıyı etkiler; bakıcı check-in bildirimini etkilemez).

* Aktif vardiyanın süre sayacı saniye bazında güncellenir.

* Son 7 gün geçmişi doğru listelenir.

# **6\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| Shift notu tam metnini görmek için yetki gerekiyor mu? | Açık | FAM-13 yetki seviyesi ile koordineli |
| Birden fazla bakıcı aynı anda aktif olabilir mi? | Açık | Teknik kural — V0'da max 1 aktif shift önerisi |
| Check-in bildirimi DND durumundan muaf tutulmalı mı? | Açık | Ürün kararı — şimdilik muaf tutulması önerilir |

*Sinalytix — Gizli ve Özel.*

# 1️⃣ Semptom Bildirimi Alımı

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-08  —  Semptom Bildirimi Alımı**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

Semptom Bildirimi Alımı, Patient AI Agent'ın SYMPTOM\_REPORT\_SEND aksiyonuyla gönderdiği yapılandırılmış semptom bildirimlerini aile üyesine iletir ve görüntülemesini sağlar. Inbox'tan (mesajlaşma) ayrı bir panel — klinik ağırlıklı içerik sade mesajlaşma akışından ayrıştırılır.

Bu özellik, Sinalytix'in "aile her zaman bilgili olmalı" ilkesinin klinik boyutunu temsil eder. Ancak şu kritik sınır her zaman korunur: uygulama klinik değerlendirme yapmaz, tedavi önermez; bildirim yalnızca hastanın beyanını ve AI'ın netleştirici sorulara verilen yanıtları iletir.

## **1.1 Patient AI Agent Bağlantısı**

Hasta Sina AI Agent ile etkileşime girip bir semptom raporladığında, Agent maksimum 2 netleştirici soru sorar ve yanıtları toplar. SYMPTOM\_REPORT\_SEND aksiyonu tetiklenince hem veritabanına yazılır hem de aile üyesine bildirim gönderilir.

*⚠ Semptom bildirimi aile için okuma amaçlıdır. Aile bildirime yanıt veremez — yanıt için mesajlaşma (FAM-09) kullanılır.*

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* Push \+ in-app bildirim ile yeni semptom raporunun iletimi

* Semptom Detay Ekranı: semptom metni, soru-cevap çiftleri, zaman damgası, okundu durumu

* Zorunlu disclaimer: "Bu bildirim acil durum değerlendirmesi içermez."

* Son 90 günlük bildirim geçmişi, kronolojik liste

* Okunmamış bildirimler badge

## **2.2 V1 Eklemeleri**

* Filtreleme: tarih aralığı, semptom anahtar kelimesi

* Semptom trend grafiği: belirli semptomların frekansı

## **2.3 Kısıtlar**

* Semptom bildirimlerine aile yanıt gönderemez bu panel üzerinden.

* Klinik yorum, hastalık eşleştirme veya acil risk değerlendirmesi yapılmaz.

* Bildirim içeriğini aile düzenleyemez, silemez.

# **3\. Ekran Spesifikasyonları**

## **3.1 Semptom Bildirimi Listesi**

| Öğe | İçerik / Kural |
| :---- | :---- |
| Liste öğesi | \[Tarih-Saat\] \+ Semptom önizlemesi (ilk 80 karakter) \+ okundu/okunmadı badge |
| Okunmamış stil | Koyu metin \+ mavi nokta indikatörü |
| Filtre (V1) | Tarih aralığı \+ anahtar kelime arama |
| Boş durum | "Henüz semptom bildirimi yok" |

## **3.2 Semptom Detay Ekranı**

| Bölüm | İçerik |
| :---- | :---- |
| Başlık | "Semptom Bildirimi — \[Tarih\]" |
| Semptom Metni | Hastanın beyanı (tam metin, şifresi çözülmüş) |
| AI Netleştirici Sorular | Soru 1: "\[Soru\]" → Yanıt: "\[Yanıt\]" ... (max 2 çift) |
| Kaynak Bilgisi | "Sina ile paylaşıldı — \[tarih saat\]" |
| Disclaimer (sabit) | ⚠ "Bu bildirim acil durum değerlendirmesi içermez. Endişe duyuyorsanız sağlık profesyonelinize danışın." |
| Mesaj Gönder CTA | → FAM-09 Mesajlaşma — hasta thread'ine yönlendirir (yanıt vermek isteyenler için) |

# **4\. Veri Modeli**

| Alan (SymptomReport) | Tip | Açıklama |
| :---- | :---- | :---- |
| report\_id | UUID | Primary key |
| patient\_id | UUID FK | — |
| symptom\_text | TEXT (encrypted) | Hastanın beyanı |
| clarification\_qa | JSONB (encrypted) | \[{ question, answer }, ...\] — max 2 çift |
| source\_interaction\_id | UUID FK | Patient AI Agent etkileşim referansı |
| created\_at | TIMESTAMPTZ | — |
| read\_by | JSONB | { family\_member\_id: read\_at\_timestamp } — çoklu aile üyesi desteği |

# **5\. Kabul Kriterleri**

* Semptom bildirimi push \+ in-app bildirim olarak ≤ 5 sn içinde aile üyesine ulaşır.

* Detay ekranında semptom metni ve Q\&A çiftleri görünür.

* Disclaimer her detay ekranında görünür; silinemez veya gizlenemez.

* Okundu durumu: detay ekranı açıldığında read\_by güncellenir.

* Son 90 gün bildirimleri listelenir; eski bildirimler DB'de (1 yıl) tutulur.

* Aile semptom bildirimini silemez veya düzenleyemez.

# **6\. Başarı Metrikleri**

| Metrik | Hedef / İzleme |
| :---- | :---- |
| Bildirim açılma oranı (push → detay ekranı) | İzleme — engagement sinyali |
| Disclaimer görüntüleme oranı | %100 (her açılışta görünür) |
| Detay ekranı → Mesaj Gönder CTA tıklama oranı | İzleme — follow-up aksiyonu frekansı |

# **7\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| Semptom bildirimi birden fazla aile üyesine mi gönderilir? | Açık | Ürün kararı — önerim: tüm bağlı aile üyelerine |
| Aile semptom bildirimini "onemli" olarak işaretleyebilmeli mi? | Açık | V1 feature flag'i |
| Bildirim DND durumundan muaf mı? | Açık | SOS gibi muaf tutulması önerilir — önemli sinyal |

*Sinalytix — Gizli ve Özel.*

# 1️⃣ Mesajlaşma

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-09  —  Mesajlaşma / Inbox**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

Mesajlaşma / Inbox, aile üyesinin hasta ve bakıcı ile çift yönlü in-app iletişim kurmasını sağlar. İletişim hem bireysel thread'ler hem de "Bakım Ekibim" grup konuşması üzerinden yürütülür. Uygulama dışı iletişimi (SMS, e-posta, telefon) minimize ederek tüm bakım iletişimini tek platformda konsolide etmek hedeflenir.

Mesajlaşmanın PIPEDA/PHIPA çerçevesindeki önemi: Bakımla ilgili mesajlar PHI (Personal Health Information) içerebilir. Bu nedenle tüm mesajlar at-rest ve in-transit AES-256 ile şifrelenir; veri Kanada sınırları içinde tutulur.

## **1.1 Endüstri Bağlamı**

HIPAA/PHIPA uyumlu sağlık mesajlaşma uygulamalarında en kritik tasarım kararlarından biri agent/bot kaynaklı mesajların ayrıştırılmasıdır. Kullanıcı "AI mı insanla mı konuştuğunu" her zaman bilebilmelidir. Sinalytix bu ilkeyi "Sina ile gönderildi" etiketiyle uygular.

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* Bireysel konuşmalar: Aile ↔ Hasta, Aile ↔ Bakıcı

* "Bakım Ekibim" grup konuşması: hasta \+ tüm bağlı aile üyeleri \+ aktif bakıcı — sistem tarafından otomatik oluşturulur ve güncellenir

* Metin tabanlı mesaj gönderme ve alma

* Konuşma listesi: son mesaj önizlemesi \+ okunmamış sayacı

* Agent kaynaklı mesajlarda "Sina ile gönderildi" etiketi (kaldırılamaz)

* Push bildirimi: yeni mesaj geldiğinde (DND durumuna göre — DND açıksa bakım dışı mesajlar bastırılabilir)

* Mesaj retention: 2 yıl

* Şifreleme: at-rest ve in-transit AES-256

* Bağlantı kesilince thread arşive düşer; geçmiş okunabilir, yeni mesaj gönderilemez

## **2.2 V1 Eklemeleri**

* Sesli mesaj gönderme (ses kaydı → transkript \+ dosya)

* Dosya / fotoğraf paylaşımı (bakım belgeleri)

* Mesaj okundu bildirimleri (read receipts)

## **2.3 V2 Eklemeleri**

* In-app VoIP çağrı (FAM-23 ile birlikte)

* E2E şifreleme (end-to-end — şu an at-rest \+ in-transit ile karşılanıyor; açık konu)

## **2.4 Kısıtlar**

* Mesaj içeriği klinik tavsiye içeremez — bu uygulama kontrolünde değil, kullanıcı sorumluluğundadır; ancak AI mesajları bu sınıra tabidir.

* Sina AI Agent ürettiği mesajlar her zaman "Sina ile gönderildi" etiketi taşır; etiket kaldırılamaz.

* Grup konuşmasına dışarıdan kişi eklenemez (hasta, bakıcı, aile dışı).

# **3\. Konuşma Tipleri**

| Tip | Katılımcılar | Oluşturma | Arşiv Kuralı |
| :---- | :---- | :---- | :---- |
| Bireysel (Aile ↔ Hasta) | Aile üyesi \+ Hasta | Manuel (aile başlatır) | Hasta bağlantısı kesilince arşive |
| Bireysel (Aile ↔ Bakıcı) | Aile üyesi \+ Bakıcı | Manuel (aile başlatır) | Bakıcı bağlantısı değişince arşive |
| "Bakım Ekibim" Grubu | Hasta \+ tüm aile üyeleri \+ aktif bakıcı | Otomatik (sistem) | Aktif katılımcı kalmazsa arşive |

## **3.1 "Bakım Ekibim" Grup Dinamiği**

Bu grup, hasta etrafındaki aktif bakım ekibini temsil eder. Katılımcı listesi dinamiktir:

* Yeni aile üyesi bağlandığında: otomatik eklenir

* Aile üyesi bağlantısı kesildiğinde: gruptan çıkarılır (mesaj geçmişi silinmez)

* Bakıcı değiştiğinde: eski bakıcı çıkar, yeni bakıcı eklenir

* Hasta her zaman grupta; çıkarılamaz

# **4\. Ekran Spesifikasyonları**

## **4.1 Inbox — Konuşma Listesi**

| Öğe | İçerik / Kural |
| :---- | :---- |
| Sıralama | Son mesaj tarihine göre azalan (en yeni üstte) |
| Konuşma satırı | Avatar \+ İsim/Grup adı \+ Son mesaj önizlemesi (80 karakter) \+ Saat \+ Okunmamış badge |
| "Bakım Ekibim" grubu | Özel ikon \+ grup adı; listenin en üstünde sabitlenmiş (pinned) |
| Sina etiketli mesaj önizlemesi | "Sina: \[mesaj önizlemesi\]" — italik stil |
| Bağlantı kesilmiş thread | "Arşiv" etiketi — soluk stil; okunabilir, yazılamaz |
| Boş durum | "Henüz konuşma yok. Mesaj göndererek başlayın." |

## **4.2 Thread (Konuşma Detayı)**

| Öğe | İçerik / Kural |
| :---- | :---- |
| Mesaj balonu | Sağda: aile üyesi mesajları | Solda: diğerleri |
| Gönderen bilgisi | Ad \+ gönderim saati |
| Sina etiketi | "Sina ile gönderildi" — mesaj balonunun altında, kaldırılamaz, italik |
| Metin input | Alt sabit input bar; gönder butonu |
| Bağlantı kesilmiş | Input disabled; "Bu kişiyle bağlantı kesildi. Mesaj gönderilemiyor." banner |
| Yükleme | İlk 50 mesaj; yukarı kaydırarak daha fazla yükle (pagination) |

# **5\. Veri Modeli**

## **5.1 Conversation**

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| conversation\_id | UUID | Primary key |
| type | enum | individual | group |
| patient\_id | UUID FK | — |
| participants | UUID\[\] | Aktif katılımcı listesi |
| created\_at | timestamp | — |
| archived\_at | timestamp | null | Bağlantı kesilince |

## **5.2 Message**

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| message\_id | UUID | Primary key |
| conversation\_id | UUID FK | — |
| sender\_id | UUID FK | — |
| sender\_type | enum | family | patient | caregiver | ai\_agent |
| content | TEXT (AES-256 encrypted) | — |
| is\_ai\_generated | bool | Sina etiket göstergesi |
| sent\_at | timestamp | — |
| read\_by | JSONB | { user\_id: read\_at } — çoklu okuyucu |
| retention\_expires\_at | timestamp | sent\_at \+ 2 yıl |

# **6\. Kabul Kriterleri**

* Inbox açılınca konuşmalar son mesaja göre sıralı; "Bakım Ekibim" en üstte sabitlenmiş.

* Thread açılınca okundu işaretlenir; okunmamış sayacı sıfırlanır.

* "Bakım Ekibim" grubu otomatik oluşturulur; katılımcı değişikliğinde otomatik güncellenir.

* Sina etiketli mesajlar "Sina ile gönderildi" ile ayrıştırılır; etiket kaldırılamaz.

* Bağlantı kesilmiş thread'de input disabled; geçmiş okunabilir.

* Mesaj iletim başarı oranı ≥ %99.5.

* Tüm mesajlar AES-256 ile at-rest ve in-transit şifrelenir.

# **7\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| E2E şifreleme gerekliliği (PIPEDA için yeterli mi at-rest?) | Açık | Hukuki değerlendirme \+ teknik mimari |
| DND açıkken mesaj bildirimi bastırılsın mı? | Açık | Ürün kararı — bakımla ilgili mesajlar muaf tutulabilir |
| Hasta mesaj iletim kısıtlaması (ör: demans senaryosu) | Açık | Hasta kapasitesi değerlendirme — V2 |

*Sinalytix — Gizli ve Özel.*

# 1️⃣ Çağrı İşlemleri \+ DND

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-10  —  Çağrı İşlemleri \+ DND**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

Çağrı İşlemleri ve DND (Do Not Disturb — Rahatsız Etme Modu), aile üyesinin hasta ve bakıcıyı aramasını ve aile üyesinin uygun olmadığında standart aramaların engellenmesini sağlar. Kritik tasarım prensibi: DND standart aramaları etkiler; SOS (acil) aramaları hiçbir koşulda engellenemez.

## **1.1 DND Mekanizmasının Ekosistem İçindeki Rolü**

DND flag'i Family App'ten set edilir; Patient App bu flag'i okur. Patient App'teki "Aile Üyesi Ara" standart çağrı butonu DND durumuna göre aktif/pasif olur.

| DND Durumu | Patient App Davranışı | SOS Davranışı |
| :---- | :---- | :---- |
| DND Kapalı (varsayılan) | Standart çağrıda "Aile Üyesi Ara" butonu aktif | SOS her koşulda çalışır |
| DND Açık | Standart çağrıda "Aile Üyesi Ara" butonu disabled; hasta uyarılır | SOS her koşulda çalışır |

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* DND toggle: Header veya Home ekranından anlık aç/kapa

* Native dialer çağrı: Hasta veya bakıcıyı tel: deep link ile arama

* SOS bildirimi alma: push \+ in-app bildirim; Home'da kırmızı banner

* FamilyProfile.dnd alanı güncelleme ve okuma (B6 — FamilyAvailability emekli)

## **2.2 V2 Eklemeleri**

* In-app VoIP \+ numara maskeleme (FAM-23)

* Çağrı logu ve kayıt politikası

## **2.3 Kısıtlar**

* V0'da çağrılar native dialer üzerinden — uygulama içi arama yok.

* DND, mesajlaşma bildirimlerini V0'da etkilemez; yalnızca standart çağrıyı etkiler.

* SOS bildirimi DND'den her koşulda muaf.

# **3\. DND Toggle Spesifikasyonu**

| Özellik | Değer / Kural |
| :---- | :---- |
| Konumu | Header'da — tüm ekranlarda görünür |
| Varsayılan | Kapalı (DND off) |
| Açma Aksiyonu | Toggle tıklanır → FamilyProfile.dnd \= true → ≤ 2 sn Patient App'e yansır |
| Kapama Aksiyonu | Toggle tıklanır → FamilyProfile.dnd \= false → ≤ 2 sn yansır |
| Görsel Geri Bildirim | Açıkken: kırmızı ikon \+ "DND Açık" micro-label; kapalıyken: normal ikon |
| Konfirmasyon Modalı | V0'da yok; V1'de "DND ne kadar süre açık kalsın?" seçeneği |
| Analytics | dnd\_toggled { new\_state: on|off, source: header|settings } |

# **4\. Çağrı Akışları**

## **4.1 Hastayı Arama**

| Adım | Aksiyonu | Sistem Davranışı |
| :---- | :---- | :---- |
| 1 | Home veya Profil sekmesi → "Hastayı Ara" CTA | — |
| 2 | Onay ekranı (V0'da opsiyonel): "\[Hasta Adı\]'nı aramak üzeresin" | — |
| 3 | tel: deep link tetiklenir | Native dialer açılır; hasta telefon numarası pre-filled |

## **4.2 Bakıcıyı Arama**

Aynı akış; bakıcı telefon numarası Bakıcı Kartı üzerinden erişilebilir. V2'de numara maskeleme (bakıcı numarası gizlenir, VoIP yönlendirmesi devreye girer).

## **4.3 SOS Bildirim Alma**

| Olay | Aile Tarafında Davranış |
| :---- | :---- |
| Hasta SOS tetikledi | Anlık push bildirimi: "\[Hasta Adı\] acil yardım çağrısı başlatıldı" |
| Uygulama açık değilse | Push notification lock screen'de görünür |
| Uygulama açılınca | Home'da kırmızı SOS banner görünür (FAM-02) |
| DND durumunda | SOS bildirimi DND'den muaf — her koşulda iletilir |
| Birden fazla aile üyesi | Tüm bağlı aile üyeleri aynı anda bildirim alır |

# **5\. Veri Modeli**

> [RECONCILED: B6] `FamilyAvailability` tablosu EMEKLİ. DND artık kişi başına `FamilyProfile.dnd` (bool) alanıdır (Kanonik Sözlük §1/§7). Per-hasta DND override **V1** kapsamındadır (V0'da DND kullanıcı genelinde tek bool). Süreli DND (`dnd_until`) V1 açık-konu.

| Alan (FamilyProfile) | Tip | Açıklama |
| :---- | :---- | :---- |
| user\_id | UUID FK | FamilyProfile PK (User'a 1:1) |
| dnd | boolean | Family App'ten set edilir; kişi başına (per-hasta override V1) — varsayılan false |

*Not: V0'da DND tek kullanıcı geneli bayraktır. Acil tipler (`sos`) DND/quiet-hours'ı her zaman geçersiz kılar (B6/§7).*

# **6\. Kabul Kriterleri**

* DND toggle anlık çalışır; Patient App flag'i ≤ 2 sn güncellenir.

* DND açıkken Patient App'teki "Aile Üyesi Ara" butonu disabled olur.

* DND kapalıyken "Aile Üyesi Ara" butonu aktif olur.

* SOS bildirimi DND bağımsız her koşulda aile üyesine ulaşır.

* "Hastayı Ara" CTA native dialer'ı doğru numara ile açar.

# **7\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| DND süreli mi olmalı? (ör: 2 saat) | Açık | V1 UX kararı — FamilyProfile.dnd\_until (V1) |
| Bakıcı çağrı numarası maskeleme politikası | Açık | V2 — VoIP \+ gizlilik politikası |
| SOS bildiriminde 911 kısa yol butonu push'ta da görünmeli mi? | Açık | Platform push aksiyonu — teknik karar |
| Birden fazla aile üyesi DND'si: hasta hangi koşulda "Aile Üyesi Ara" görecek? | Açık | En az 1 aktif (DND off) aile üyesi varsa göster — önerim |

*Sinalytix — Gizli ve Özel.*

# 1️⃣ AI Agent — Aile Perspektifi (Sina)

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-11  —  AI Agent — Aile Perspektifi (Sina)**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

Family App AI Agent, aile üyesinin bakım süreci hakkında Sina AI ile etkileşim kurmasını sağlar. Caregiver App AI Agent'tan farklı olarak kapsam sınırları daha dar tutulur: aile klinik detaylara değil, operasyonel bakım bilgisine erişir. RAG pipeline aynı altyapıyı kullanır; ancak erişim kapsamı aile rolüne göre filtrelenir.

Bu özelliğin üç temel işlevi vardır:

* Günlük brifing: Sabah veya Home açılışında güncel bakım özetini AI'ın hazırladığı formatta sunmak.

* Bakım durumu Q\&A: Görev, vardiya ve hasta tercihleri hakkında doğal dil sorularını yanıtlamak.

* Sesli not / mesaj: Ses kaydını metne çevirip hasta veya bakıcıya mesaj olarak göndermek.

*⚠ Health Canada SaMD Class I kapsamında: AI Agent klinik yorum yapmaz, teşhis, tedavi veya dozaj önerisi vermez. Her yanıtta disclaimer görünür; silinemez.*

## **1.1 Caregiver AI Agent ile Kapsam Farkı**

| Veri Kaynağı | Bakıcı Erişimi | Aile Erişimi |
| :---- | :---- | :---- |
| care\_plan (detay) | Tam | Operasyonel özet (diyabet diyeti var/yok, ilaç saatleri) |
| care\_plan\_medications | Tam (ilaç adı, doz, saat) | Sadece ilaç adı \+ saat (özetlenmiş, doz yok) |
| shift\_note (eski shift\_notes) | Tam (son 5 vardiya) | Tam (son 5 vardiya özeti) |
| task\_history | Son 30 gün | Son 30 gün |
| escalation\_protocols | Tam | Sadece iletişim bilgileri (çağrılacak numaralar) |
| patient\_preferences | Tam | Tam |
| klinik değerlendirme | Yok (redder) | Yok (redder) |
| tanı/tedavi/dozaj | Yok (redder) | Yok (redder) |

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* Günlük brifing: otomatik üretim (Home açılışında veya CTA ile)

* Bakım durumu Q\&A: metin tabanlı soru-yanıt, kaynak etiketli

* Sesli not / mesaj gönderme: PTT (push-to-talk) → transkript → gönder/iptal

* ai\_interaction\_log: her etkileşim immutable kayıt

* Offline: AI devre dışı, açıklama mesajı

## **2.2 V1 Eklemeleri**

* Proaktif uyarılar: birkaç gün ardışık tamamlanmayan görev → "Bu haftaki bakım düzenini kontrol etmek ister misiniz?"

* Haftalık bakım özeti üretimi

## **2.3 V2 Eklemeleri**

* Yapılandırılmış anamnez raporu (FAM-24): semptom geçmişinden sağlık profesyoneline iletilecek rapor taslağı

## **2.4 Kısıtlar**

* Klinik yorum yok: tanı, tedavi, dozaj önerisi redded.

* Her yanıtta disclaimer: "Bu bilgi bakım planından alınmıştır. Klinik değerlendirme için sağlık profesyonelinize danışın."

* Sesli not kaydı: max 2 dakika; transkript onaylanmadan gönderilmez.

* ai\_interaction\_log immutable — silinmez, düzenlenemez.

# **3\. Özellik Spesifikasyonları**

## **3.1 Günlük Brifing**

AI, aile üyesi için her sabah günlük bakım özetini RAG pipeline üzerinden hazırlar. Home açıldığında otomatik tetiklenir veya "Sina ile Günlük Brifing Al" CTA'sı ile başlatılır.

| Brifing Bölümü | İçerik |
| :---- | :---- |
| Görev Özeti | Bugün: X/Y tamamlandı | Z bekliyor | Kritik: ilaç görevleri |
| Bakıcı Durumu | Son vardiya notu özeti \+ bugünkü planlanmış vardiya |
| Dikkat Noktaları | Son vardiyanın önemli notlarından çıkarılan "dikkat edilecekler" (max 2 madde) |
| Hasta Günü | Hasta'nın bugün tercih ve alışkanlıkları (patient\_preferences) |
| **Özellik** | **Değer / Kural** |
| Üretim Süresi | ≤ 3 saniye (p95) |
| Kaynak Etiketleri | Her madde yanında "\[Görev Listesi\]", "\[Vardiya Notu\]" gibi kaynak |
| Disclaimer | Her brifing sonunda: "Bu özet operasyonel bakım verisinden üretilmiştir. Klinik değerlendirme için sağlık profesyonelinize danışın." |
| Yenileme | Kullanıcı "Yenile" CTA'sı ile manual yenileyebilir |

## **3.2 Bakım Durumu Q\&A**

Aile üyesi metin ile soru sorar; AI yanıt verir. Güvenli ve güvensiz soru sınıflandırması:

| Soru Tipi | Örnek | AI Davranışı |
| :---- | :---- | :---- |
| Görev durumu | "Bugün ilaçlarını aldı mı?" | Yanıt ver \+ görev kaynağı etiketle |
| Vardiya bilgisi | "Son vardiyada ne oldu?" | shift\_note özetle \+ kaynak etiket |
| Haftalık özet | "Bu hafta kaç görev tamamlandı?" | CareTaskOccurrence'dan hesapla \+ yanıt |
| Hasta tercihleri | "Kahvaltıda ne sever?" | patient\_preferences'dan yanıtla |
| Tanı sorgusu | "Demansı ne kadar ilerledi?" | Reddeder \+ "Bu konuda sağlık profesyonelinize danışın" |
| Tedavi önerisi | "Bu ilaç uygun mu?" | Reddeder \+ yönlendirme |
| Klinik yorum | "Bu semptom tehlikeli mi?" | Reddeder \+ escalation yönlendirme (sağlık profesyoneline git) |

## **3.3 Sesli Not / Mesaj Gönderme**

| Adım | Aksiyonu | Sistem Davranışı |
| :---- | :---- | :---- |
| 1 | AI Agent ekranında PTT (push-to-talk) butonu basılı tutulur | Ses kaydı başlar; max 2 dakika |
| 2 | Bırakılır | Ses → metin transkripsiyonu ≤ 3 sn |
| 3 | Transkript ekranda görünür; kullanıcı gözden geçirir | Düzenleme opsiyonel |
| 4 | Alıcı seçilir: Hasta / Bakıcı / Bakım Ekibim | — |
| 5 | Gönder veya İptal | Gönder: Message olarak yazılır \+ "Sina ile gönderildi" etiketi |

# **4\. Güvenlik Mimarisi**

## **4.1 Üç Katmanlı Güvenlik**

AI Agent güvenlik mimarisi Health Canada SaMD Class I sınırları içinde kalacak şekilde üç katmanda tanımlanmıştır:

* Katman 1 — Prompt engineering: sistem prompt'u klinik yorum yasağını net şekilde içerir.

* Katman 2 — LLM-as-judge: AI yanıtı üretmeden önce güvenlik sınıflandırması yapılır; yüksek riskli sorular reddedilir.

* Katman 3 — RAG erişim filtresi: aile rolü için dosyalar filtrelenmiş context ile RAG çalıştırılır; klinik detaylar erişim kapsamı dışında tutulur.

## **4.2 False Refusal (Yanlış Red) Yönetimi**

Güvenli soruların yanlışlıkla reddedilmesi kullanıcı güvenini zedeler. Hedef: false refusal oranı \< %5.

* Yanlış red tespit edildiğinde: "Bu soruyu yanıtlayamadım. Farklı ifade ederek tekrar deneyebilirsiniz." mesajı gösterilir.

* False refusal loglanır ve product team'e raporlanır.

# **5\. Veri Modeli**

> [RECONCILED: B3] Tek kanonik AI günlüğü `ai_interaction_log` (immutable, append-only, 7y; Kanonik Sözlük §5). Kanonik alanlar `judge_verdict` + `risk_tier`{green|yellow|red} eklendi. Bu PRD'deki `refused`/`refusal_reason` operasyonel alanlar olarak kalır ancak özet `judge_verdict`/`risk_tier` altına yazılır.

| Alan (ai\_interaction\_log) | Tip | Açıklama |
| :---- | :---- | :---- |
| interaction\_id | UUID | Primary key |
| family\_member\_id | UUID FK | — |
| patient\_id | UUID FK | — |
| interaction\_type | enum | briefing | qa | voice\_message |
| user\_input | TEXT (encrypted) | Kullanıcının sorusu / ses transkripti |
| ai\_response | TEXT (encrypted) | AI yanıtı veya "REFUSED" |
| judge\_verdict | enum | MEDICAL\_ADVICE | IN\_SCOPE\_ACTION | GENERAL\_LIFE | IRRELEVANT | REFUSED | ... (B3; LLM-as-judge kararı) |
| risk\_tier | enum | green | yellow | red (B3) |
| refused | bool | Reddedildi mi? (operasyonel; `judge_verdict=REFUSED` ile eşlenir) |
| refusal\_reason | string | null | Reddedilme gerekçesi (operasyonel) |
| sources\_cited | JSONB | Kullanılan RAG kaynakları |
| created\_at | timestamp | Immutable |

# **6\. Performans Hedefleri**

| Metrik | Hedef |
| :---- | :---- |
| Brifing üretim süresi | ≤ 3 saniye (p95) |
| Q\&A yanıt süresi | ≤ 5 saniye (p95) |
| Ses transkripsiyon süresi | ≤ 3 saniye (1 dakika ses için, p95) |
| False refusal oranı | \< %5 |
| AI yanıt doğruluk oranı (kaynak veriye uygunluk) | İzleme — insan değerlendirmesi ile örnekleme |

# **7\. Kabul Kriterleri**

* Günlük brifing Home açılışında otomatik üretilir (≤ 3 sn).

* Güvenli sorulara kaynak etiketli yanıt verilir.

* Güvensiz sorular (tanı/tedavi/dozaj) reddedilir \+ açıklama \+ yönlendirme gösterilir.

* Her yanıtta disclaimer görünür; silinemez.

* ai\_interaction\_log her etkileşimi immutable olarak yazar.

* Sesli not transkript onaylanmadan gönderilemez.

* Offline'da AI devre dışı kalır; kullanıcıya açıklama mesajı gösterilir.

# **8\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| AI Agent için ayrı consent record gerekli mi? (PIPEDA) | Açık — muhtemelen evet | PIPEDA değerlendirmesi — V1 önce karar verilmeli |
| Günlük brifing Home açılışında her seferinde mi, yoksa günde 1 kez mi üretilsin? | Açık | UX araştırması — öneri: günde 1 kez üretilip cache'lenir |
| Sesli not kayıt dosyası backend'de saklanacak mı? | Açık | Sadece transkript saklanması önerilir (veri minimizasyonu) |
| LLM modeli seçimi (GPT-4o, Claude, Llama?) | Açık | Teknik kararı — PIPEDA veri yerleşimi ile birlikte değerlendirilmeli |

*Sinalytix — Gizli ve Özel.*

# 1️⃣ Approval Queue — Onay Kuyruğu

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-12  —  Approval Queue — Onay Kuyruğu**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

Approval Queue, hastanın veya sistemin tetiklediği belirli kritik aksiyonlar için aile üyesinin onayını zorunlu kılan veya aileyi bilgilendiren bir mekanizmadır. Özellikle Alzheimer, demans veya ağır düşkünlük senaryolarında, hasta kendi başına kararlar alırken aile gözetiminin bir güvenlik ağı oluşturması sağlanır.

Bu özellik, Sinalytix'in "hasta egemenliği ile aile gözetimi dengesi" ilkesini yansıtır. Her aksiyon tipi için onay zorunluluğu konfigüre edilebilir; her aile farklı dinamiğe sahiptir.

*⚠ PHIPA açısından önemli: Hasta kapasiteliyse onay mekanizması bilgilendirme veya onay talep etme şeklinde çalışmalıdır; hastanın kararını engelleyecek şekilde tasarlanamaz. Hasta kapasitesiz ise (SDM senaryosu) mekanizma daha kısıtlayıcı olabilir. Bu nüans V2 kapsamında klinik danışma ile detaylandırılacaktır.*

## **1.1 Endüstri Bağlamı**

Dijital vasi/vekâlet (digital guardianship) uygulamalarında onay kuyruğu en yaygın kullanılan pattern'dir. Modern uygulamalar iki temel yaklaşım benimser:

* Hard block: İzin verilmeden aksiyon gerçekleşemez.

* Soft alert: Aksiyon gerçekleşir; aile bilgilendirilir ve itiraz edebilir.

Sinalytix V0'da bakıcı bağlantısı ve EC değişikliği için varsayılan "soft block" yaklaşımını benimser: aksiyon pending durumunda bekler, aile onaylamazsa 48 saatte otomatik reddedilir.

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* Onay Gerektiren Aksiyon Tipleri (varsayılan konfigürasyon ile)

* ApprovalRequest oluşturma, listeleme, onaylama ve reddetme

* Push \+ in-app bildirim ile aile üyesine iletim

* 24 saat hatırlatma \+ 48 saat timeout ile otomatik red

* Hasta tarafına sonuç bildirimi

* Konfigürasyon: her aksiyon tipi için onay zorunluluğu açılıp kapatılabilir

## **2.2 V1 Eklemeleri**

* Birden fazla aile üyesi: çoğunluk kararı mı, tek kişi yeterli mi? (V1 kural tasarımı)

* Aksiyon tipine göre otomatik onay eşiği (düşük risk aksiyonlar için)

## **2.3 Kısıtlar**

* Approval Queue aile üyesine aittir; hasta veya bakıcı kuyruk içeriğini görüntüleyemez.

* Onaylama / reddetme aksiyonu yalnızca "full" veya "edit" yetki seviyesindeki aile üyesi tarafından gerçekleştirilebilir.

* Onay kararı geri alınamaz.

> [RECONCILED: logic — deadlock/hasta-egemenliği override] Hasta tarafından başlatılan bir aksiyon, **kalıcı olarak bloke edilemez**. Eğer bağlı tek aile üyesi yalnızca `view` yetkisindeyse (onaylayacak edit/full yetkili kimse yoksa), aksiyon sonsuza dek `pending`→`expired` (otomatik red) ile tıkanmamalıdır. Bu durumda hasta-egemenliği gereği aksiyon ilerler (PHIPA: kapasiteli hasta kendi kararını verir; onay mekanizması yalnız bilgilendirme/gözetim olur, hastanın kararını engelleyemez — bkz. §1 PHIPA notu). SaMD-nötr: yalnız iş-akışı kilidini önler; klinik karar davranışı eklemez.

# **3\. Onay Gerektiren Aksiyon Tipleri**

| Aksiyon | Varsayılan | Açıklama |
| :---- | :---- | :---- |
| Bakıcı bağlantısı değişikliği | Onay gerekli | Hasta yeni bakıcı ekliyor veya mevcut bakıcıyı çıkarıyor |
| EC (Acil Kişi) değişikliği | Onay gerekli | Acil iletişim kişisi ekleme veya çıkarma |
| Profil düzenlemesi (yetkili aile) | Onaysız | Yetki var ise doğrudan; onay gerekmez |
| Hesap silme talebi | Bilgilendirme | Aile bilgilendirilir; onay zorunlu değil (hasta hakkı) |

*⚠ Yukarıdaki tablo varsayılan konfigürasyondur. Her aksiyon tipi için onay zorunluluğu açılıp kapatılabilir. Hangi aile üyesinin onay verebileceği FAM-13 yetki seviyesiyle belirlenir.*

> [KARAR K4 — 2026-07-22 · ÖNERİLEN DEFAULT, klinik/legal teyit bekliyor] Onay kuyruğu ↔ hasta otonomisi dengesi şöyle sabitlenir: (1) Onay zorunluluğu **`PatientApprovalConfig` üzerinden hasta-başına toggle'dır ve V0'da canlıdır** — kapasiteli hasta, onboarding sonrası Ayarlar'dan herhangi bir aksiyon tipi için aile onayını kapatabilir (PHIPA: kapasiteli hasta kendi kararını verir). (2) Toggle AÇIK iken 48s yanıtsızlık → otomatik red **korunur** (bilinçli tercih edilen "soft block"); 24s hatırlatma + son 4 saatte ikinci hatırlatma eklenir. (3) Onaylayabilecek `edit`/`full` yetkili üye hiç yoksa aksiyon bloke olmaz (yukarıdaki deadlock override notu). (4) `SDMDeclaration.active=true` ise toggle kontrolü SDM'e geçer. Otomatik-ONAY default'u bilinçli olarak SEÇİLMEDİ: hedef kitlede (demans/yaşlı) sessizlik-onayı, kötüye kullanım riskini artırır.

# **4\. Onay Akışı**

## **4.1 Temel Akış**

| Adım | Aktör / Sistem | Aksiyonu |
| :---- | :---- | :---- |
| 1 | Hasta | Aksiyonu tetikler (ör: Yeni bakıcı ekle) |
| 2 | Sistem | ApprovalRequest oluşturur (status: pending) |
| 3 | Sistem | Tüm yetkili aile üyelerine push \+ in-app bildirim gönderilir |
| 4 | Aile | Approval Queue'yu açar; aksiyon detayını görür |
| 5a | Aile → Onayla | ApprovalRequest status: approved → aksiyon gerçekleştirilir → hasta bildirilir |
| 5b | Aile → Reddet | ApprovalRequest status: rejected → aksiyon iptal edilir → hasta bildirilir |
| 5c | 24 saat geçti | Hatırlatma push bildirimi gönderilir |
| 5d | 48 saat geçti | ApprovalRequest status: expired → otomatik red → her iki tarafa bildirim |

## **4.2 Approval Queue Ekranı**

| Öğe | İçerik / Kural |
| :---- | :---- |
| Erişim | Header badge tıklanınca veya bildirimden deep link ile açılır |
| Liste | Bekleyen onaylar — oluşturma tarihine göre sıralı (en eski önce) |
| Onay Kartı | Aksiyon tipi \+ açıklama \+ kim tetikledi \+ ne zaman \+ kalan süre sayacı |
| Aksiyon Detayı | action\_payload'dan: ne değişiyor? (ör: "Ayşe Yılmaz bakıcı olarak ekleniyor") |
| Onayla Butonu | Yeşil — tıklayınca onay modal: "Bu aksiyonu onaylıyor musunuz?" |
| Reddet Butonu | Kırmızı — tıklayınca red modal: "Red nedeni (opsiyonel serbest metin)" |
| Boş Durum | "Bekleyen onay yok" |
| Geçmiş | Tamamlanan onaylar (approved/rejected/expired) — son 30 gün |

# **5\. Bildirimler**

| Olay | Bildirim İçeriği | Kanal |
| :---- | :---- | :---- |
| Yeni onay talebi | "\[Hasta Adı\]: \[aksiyon açıklaması\]. Onaylamanızı bekliyor." | Push \+ in-app |
| 24 saat hatırlatma | "Bekleyen bir onay talebiniz var. 24 saat içinde yanıt vermezseniz otomatik reddedilecek." | Push \+ in-app |
| Otomatik red (48 saat) | "\[Aksiyon\] onay süresi dolduğu için otomatik reddedildi." | Push \+ in-app (her iki taraf) |
| Onay kararı (hasta tarafına) | "Aile üyeniz \[aksiyonu\] onayladı / reddetti." | Push \+ in-app (hasta) |

# **6\. Veri Modeli**

| Alan (ApprovalRequest) | Tip | Açıklama |
| :---- | :---- | :---- |
| approval\_id | UUID | Primary key |
| patient\_id | UUID FK | — |
| action\_type | enum | caregiver\_link\_change | ec\_change | profile\_edit | account\_delete |
| action\_payload | JSONB | Aksiyonun tam detayı (ne değişiyor) |
| requested\_by | UUID FK | Aksiyonu tetikleyen (genellikle hasta) |
| requested\_by\_role | enum | patient | system |
| status | enum | pending | approved | rejected | expired |
| decided\_by | UUID FK | null | Karar veren aile üyesi |
| decided\_at | timestamp | null | — |
| rejection\_reason | TEXT | null | Red nedeni (opsiyonel) |
| created\_at | timestamp | — |
| expires\_at | timestamp | created\_at \+ 48 saat |
| reminder\_sent\_at | timestamp | null | 24 saat hatırlatması gönderildi mi? |

# **7\. Konfigürasyon Modeli**

Hangi aksiyon tiplerinin onay gerektireceği, her hasta için ayrıca konfigüre edilebilir. Bu konfigürasyon PatientApprovalConfig tablosunda saklanır.

| Alan (PatientApprovalConfig) | Tip | Açıklama |
| :---- | :---- | :---- |
| config\_id | UUID | Primary key |
| patient\_id | UUID FK | — |
| action\_type | enum | Her aksiyon tipi için ayrı kayıt |
| requires\_approval | bool | true: onay gerekli | false: bilgilendirme |
| updated\_by | UUID FK | Konfigürasyonu değiştiren (hasta veya yetkili aile) |
| updated\_at | timestamp | — |

# **8\. Kabul Kriterleri**

* Onay bekleyen aksiyonlar panelde listelenir; kalan süre sayacı görünür.

* Onayla/Reddet butonları çalışır; sonuç hasta ve aile üyesine bildirilir.

* 24 saat hatırlatma zamanında gönderilir.

* 48 saat timeout: otomatik red \+ her iki tarafa bildirim.

* Onay vermek için yetki kontrolü: yalnızca edit/full yetkisi olan aile üyesi onaylayabilir.

* Konfigürasyon: hangi aksiyonların onay gerektirdiği değiştirilebilir.

* Tüm onay kararları audit log'a yazılır (ApprovalRequest'e kayıt).

# **9\. Başarı Metrikleri**

| Metrik | Hedef / İzleme |
| :---- | :---- |
| Onay yanıt süresi (pending → karar) | İzleme — 24 saat içinde yanıt oranı |
| Otomatik red oranı (timeout) | İzleme — yüksekse bildirim veya UX sorunu sinyali |
| Onay kararı dağılımı (onayla vs reddet) | İzleme — product insight |
| Konfigürasyon değiştirme oranı | İzleme — varsayılan konfigürasyonun uygunluğu |

# **10\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| Birden fazla aile üyesi varsa onay için çoğunluk mu, tek kişi mi yeterli? | Açık (yüksek öncelik) | Hukuki değerlendirme \+ V1 kural tasarımı |
| Hasta kapasitesizse onay mekanizması nasıl farklılaşır? | Açık | Klinik danışma \+ V2 SDM senaryosu |
| Hesap silme talebi için aile onayı zorunlu olabilir mi? (PHIPA hasta hakkı) | Açık | PHIPA hukuki değerlendirme |
| Timeout süresi 48 saat yeterli mi? (aile seyahatte olabilir) | Açık | Kullanıcı testi \+ konfigürasyon opsiyonu |
| Red nedeni zorunlu mu yapılmalı? | Açık | UX araştırması — şimdilik opsiyonel önerilir |

*Sinalytix — Gizli ve Özel.*

# 1️⃣ Yetki Yönetimi

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-13  —  Yetki Yönetimi — Permission Layer**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

Permission Layer, hasta tarafından aile üyelerine verilen veya kaldırılan düzenleme yetkilerinin yönetildiği ekosistem genelinde yeni bir mimarisel bileşendir. Bu katman, Sinalytix'in temel etik ilkesini teknolojiyle somutlaştırır: "Hasta kapasiteliyken kendi sağlık verisi ve bakım sürecini yönetme hakkına sahiptir."

Görüntüleme (view) hakkı, bağlı tüm aile üyelerine varsayılan olarak verilir. Düzenleme (edit) ve tam yetki (full) ise hasta tarafından açıkça verilmesi gereken izinlerdir.

*⚠ PHIPA uyum notu: Hasta kapasiteliyse yetki kararları hasta tarafından alınır. Hasta kapasitesizse (SDM senaryosu), yetki mekanizması V2'de POA belgesi doğrulaması ile genişletilecektir. V0'da bu senaryo kapsam dışıdır.*

> [KARAR K6 — 2026-07-22 · ÖNERİLEN DEFAULT, klinik/legal teyit bekliyor] Denetimde işaretlenen "kapasite modeli gelmeden vekil güç" riskine karşı `full` yetkisi V0'da daraltılır: **`permission_level = full` yalnızca `SDMDeclaration.active = true` olan aile üyesine atanabilir** (Kanonik Sözlük §2). SDM beyanı olmayan üyeye verilebilecek en yüksek seviye `edit`'tir. `full`'un Approval-Queue-bypass gücü, ancak beyan edilmiş SDM bağlamında meşrudur; POA belge doğrulaması yine V2'dedir (V0'da beyan + audit yeterli, doğrulama değil). Mevcut `full` tanımının geri kalanı değişmez.

## **1.1 Endüstri Bağlamı**

Carequality, HL7 FHIR ve modern sağlık veri paylaşım çerçevelerinde "proxy access" veya "delegation of authority" olarak bilinen bu model; hastanın seçtiği kişilere belirli veri veya aksiyon yetkisi vermesini sağlar. En iyi uygulamalarda:

* Yetki verilmesi ve kaldırılması anlık etkinleşir.

* Her yetki değişikliği audit log'a yazılır.

* Her iki tarafa bildirim gönderilir.

* Yetki seviyeleri kümülatif değil ayrıktır (edit, view'ı kapsamaz; her seviye ayrı tanımlıdır).

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* Üç yetki seviyesi tanımı: view, edit, full

* Hasta tarafından yetki verme ve kaldırma (Patient App üzerinden)

* Family App'te yetki durumunun görüntülenmesi

* Yetki bazlı UI davranışı: düzenleme yetkisi yoksa edit butonları disabled veya görünmez

* Yetki değişikliğinde her iki tarafa bildirim

* HealthProfileAuditLog'a her yetki değişikliği kaydı

## **2.2 V2 Eklemeleri**

* POA belge doğrulaması ile yasal yetki eşleştirme (FAM-22)

* Hastalık bazlı otomatik yetki önerisi (ileri evre demans → tam yetki önerisi)

* Hastanın kendi yetkisinin kısıtlanması senaryoları (SDM tam devir)

## **2.3 Kısıtlar**

* Yetki verme/kaldırma yalnızca Patient App üzerinden — Family App'ten talep edilemez.

* Aile üyesi kendi yetki seviyesini yükseltemez.

* Edit yetkisi belirli alanlar için geçerlidir; tam kontrol değildir.

# **3\. Yetki Seviyeleri**

| Seviye | Kapsam | Kim Verir | Varsayılan |
| :---- | :---- | :---- | :---- |
| view | Tüm bağlı aile üyeleri — otomatik; hasta profili, görev listesi, vardiya, semptom bildirimi okuma | Sistem (bağlantı kurulunca) | Evet |
| edit | Sağlık profili (hastalıklar, alerjiler, ilaçlar), EC listesi, görev ekleme/düzenleme | Hasta (Patient App'ten) | Hayır |
| full | Tüm edit kapsamı \+ Approval Queue bypass \+ bakıcı/EC bağlantısı değişikliği onaysız | Hasta (Patient App'ten) | Hayır |

## **3.1 Edit Yetkisi Kapsamı (Detay)**

| Alan | View | Edit | Full | Notlar |
| :---- | :---- | :---- | :---- | :---- |
| Sağlık profili (hastalıklar, alerjiler) | ✓ | ✓ | ✓ | Edit \+ Full yazabilir |
| İlaçlar (ilaç adı, saat) | ✓ | ✓ | ✓ | Dozaj validasyonu yok — ilaç adı ve saat |
| EC listesi | ✓ | ✓ | ✓ | Ekleme/çıkarma edit yetkisi gerektirir |
| Bakıcı bağlantısı | ✓ (okuma) | ✗ | ✓ | Full: onaysız bağla/çıkar; Edit: Approval Queue üzerinden |
| Görev ekleme | ✓ (okuma) | ✓ | ✓ | — |
| Görev tamamlama | ✗ | ✗ | ✗ | Hiçbir seviyede aile tamamlayamaz (V0) |
| Hasta profil ayarları | ✗ | ✗ | ✗ | Hasta onboarding verileri değiştirilemez |

# **4\. Yetki Verme Mekanizması (Patient App Tarafı)**

NOT: Bu bölüm Patient App için gerekli güncellemeyi tanımlar. Family App PRD'ye paralel bir Patient App geliştirmesidir.

| Adım | Patient App Aksiyonu | Sistem Davranışı |
| :---- | :---- | :---- |
| 1 | Profil → Gizlilik & Güvenlik → Aile Üyeleri | Bağlı aile üyeleri listesi gösterilir |
| 2 | \[Kişi\] → Yetki Yönetimi | Mevcut yetki seviyesi \+ değiştirme seçenekleri |
| 3 | Yetki tipi seç (view / edit / full) | — |
| 4 | Onayla | PatientFamilyLink.permission\_level güncellenir; her iki tarafa bildirim |

# **5\. Family App Tarafında Yetki Davranışı**

## **5.1 UI Davranış Kuralları**

| Yetki Seviyesi | Hasta Profili | Görev Yönetimi | EC Listesi |
| :---- | :---- | :---- | :---- |
| view | Görüntüler; düzenleme butonu yok/disabled | Görüntüler; kendi görevini ekleyebilir | Görüntüler; düzenleme butonu yok |
| edit | Görüntüler \+ düzenleyebilir | Görüntüler \+ ekleyebilir \+ hasta'nın düzenleyebilir | Görüntüler \+ ekleyebilir \+ çıkarabilir |
| full | edit kapsamı \+ Approval Queue bypass | edit kapsamı \+ bakıcı bağlantısı değiştirebilir | edit kapsamı |

## **5.2 Yetki Durumu Göstergesi (Profil Sekmesi)**

Profil → Gizlilik & Bağlantılar altında yetki durumu açıkça gösterilir:

* "Düzenleme yetkiniz var" — yeşil badge

* "Tam yetkiniz var" — mavi badge

* "Salt okunur erişim" — gri badge

* Yetki değiştirildiğinde badge anlık güncellenir.

# **6\. Veri Modeli**

## **6.1 PatientFamilyLink (Yetki Alanları)**

| Alan | Tip | Açıklama |
| :---- | :---- | :---- |
| permission\_level | enum | view | edit | full |
| permission\_granted\_at | timestamp | null | Yetki verildiği zaman |
| permission\_granted\_by | UUID FK | null | Yetkiyi veren (genellikle hasta) |
| permission\_revoked\_at | timestamp | null | Yetki kaldırılırsa set edilir |
| permission\_revoked\_by | UUID FK | null | Yetkiyi kaldıran |

## **6.2 HealthProfileAuditLog**

| Alan | Tip | Açıklama |
| :---- | :---- | :---- |
| audit\_id | UUID | Primary key |
| patient\_id | UUID FK | — |
| actor\_id | UUID FK | Aksiyonu gerçekleştiren |
| actor\_role | enum | patient | family | caregiver |
| action | enum | permission\_granted | permission\_revoked | profile\_updated | medication\_updated | ec\_updated |
| entity\_type | string | Değiştirilen alan / tablo |
| old\_value | JSONB | null | Önceki değer |
| new\_value | JSONB | null | Yeni değer |
| timestamp | timestamp | Immutable |

# **7\. Bildirimler**

| Olay | Aile Bildirimi | Hasta Bildirimi |
| :---- | :---- | :---- |
| Edit yetkisi verildi | "\[Hasta Adı\] size düzenleme yetkisi verdi" | — |
| Full yetki verildi | "\[Hasta Adı\] size tam yetki verdi" | — |
| Yetki kaldırıldı | "\[Hasta Adı\] düzenleme yetkinizi kaldırdı. Salt okunur erişiminiz var." | — |
| Aile profil düzenledi | — | "\[Aile Adı\] profilinizi güncelledi: \[alan\]" |

# **8\. Kabul Kriterleri**

* Yetki verilmemiş aile üyesi profili görüntüleyebilir ama edit butonlarına erişemez.

* Edit yetkili aile üyesi ilgili alanları düzenleyebilir.

* Full yetkili aile üyesi Approval Queue bypass ile bakıcı/EC değişikliği yapabilir.

* Yetki değişikliği anlık etkinleşir; UI ≤ 2 sn güncellenir.

* Yetki değişikliği HealthProfileAuditLog'a yazılır.

* Her iki tarafa bildirim gönderilir.

* API seviyesinde yetki kontrolü — yetki olmadan düzenleme isteği 403 döner.

# **9\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| V2 SDM senaryosu: hasta yetkisini tamamen devredebilir mi? | Açık | Klinik danışma \+ hukuki çerçeve \+ V2 kararı |
| POA belgesi doğrulaması: 3\. taraf servisi mi, manuel onay mı? | Açık | V2 teknik kararı |
| Edit vs Full ayrımı kullanıcıya yeterince açık mı? (UX netliği) | Açık | UX araştırması \+ kullanıcı testi |
| Bakıcı bağlantısı değişikliği: edit yetkisi ile Approval Queue üzerinden mi geçmeli? | Açık | FAM-12 ile koordineli karar |

*Sinalytix — Gizli ve Özel.*

# 1️⃣ Profile & Settings

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-14  —  Profile & Settings**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

Profile & Settings, aile üyesinin kendi hesap bilgilerini, bağlı hasta profilini ve gizlilik/bağlantı tercihlerini yönettiği merkezi ekrandır. Profil sekmesi altında dört alt bölüm bulunur: Hesabım, Hasta Profili, Bildirimler ve Gizlilik & Bağlantılar.

Bu özelliğin tasarımında iki temel denge korunur:

* Yetki kontrolü: Aile üyesi yalnızca kendi sahibi olduğu veriyi serbestçe düzenler; hasta verisini yalnızca yetki verilmişse düzenler.

* PIPEDA uyumu: Hesap silme, veri export ve veri retention politikaları regülasyonla uyumlu tasarlanır.

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* Hesabım: ad/soyad görüntüleme/düzenleme, dil değiştirme, hesap silme, veri export

* Hasta Profili: hastalıklar, alerjiler, ilaçlar (görüntüleme herkes; düzenleme yetkililer)

* Bildirimler: bildirim tipleri listesi (V0 görüntüleme; V1 toggle ile tercih yönetimi)

* Gizlilik & Bağlantılar: DND toggle, bağlı hasta listesi, yetki durumu, hasta bağlantısı kesme

## **2.2 V1 Eklemeleri**

* Bildirim tercihleri toggle'ları (bildirim tipi bazında kapatma)

* POA belge upload (FAM-18 ile birlikte)

## **2.3 Kısıtlar**

* Hasta profili düzenleme yalnızca yetki seviyesi edit veya full ise mümkün.

* Hesap silme 30 gün grace period içerir (PIPEDA).

* Veri export asenkron — maksimum 72 saat geçerli link.

# **3\. Alt Bölüm Spesifikasyonları**

## **3.1 Hesabım**

| Alan / Özellik | Davranış / Kural |
| :---- | :---- |
| Ad, Soyad görüntüleme | Görüntüler; düzenleme butonuyla değiştirilebilir |
| Telefon / E-posta | Görüntüler; değiştirme V1 (yeniden doğrulama gerektirir) |
| Dil değiştirme | Dropdown; seçim anlık uygulanır; uygulama dili güncellenir |
| Şifre / Güvenlik | Apple/Google SSO: "Apple/Google ile giriş yapılıyor" gösterilir | OTP: "Telefon ile giriş yapılıyor" |
| Hesap Silme | Çift onay modal: "Emin misiniz? 30 gün içinde geri alabilirsiniz." | 30 gün sonra kalıcı silme | Grace period içinde giriş: hesap yeniden aktif edilebilir |
| Veri Export | JSON formatında; asenkron istek; hazır olunca bildirim \+ 72 saat geçerli link |

## **3.2 Hasta Profili**

Aile üyesi hastanın sağlık profilini görüntüler; yetki seviyesine göre düzenleyebilir.

| Bölüm | View | Edit/Full | Kurallar |
| :---- | :---- | :---- | :---- |
| Hastalıklar | ✓ | ✓ | Ekleme, çıkarma; HealthProfileAuditLog kaydı |
| Alerjiler | ✓ | ✓ | Ekleme, güncelleme, kaldırma |
| İlaçlar | ✓ | ✓ | İlaç adı \+ saat (dozaj validasyonu yok V0); her değişiklik loglanır |
| Tanı geçmişi (V1) | ✓ | Portal ile (V1) | Portal entegrasyonu (FAM-21) ile |

*⚠ Hasta profili düzenlemesi HealthProfileAuditLog'a actor \+ timestamp \+ diff ile yazılır. Düzenlemeden sonra hastaya bildirim gider: "\[Aile Adı\] profilinizi güncelledi."*

## **3.3 Bildirimler**

V0'da bildirim tiplerine genel bakış listesi görüntülenir; kapatma/açma V1'de gelecektir.

| Bildirim Tipi | V0 Durumu | V1 Toggle |
| :---- | :---- | :---- |
| Gün sonu raporu | Aktif — görüntüleme | Kapatılabilir |
| Semptom bildirimi | Aktif — görüntüleme | Kapatılabilir |
| Yeni mesaj | Aktif — görüntüleme | Kapatılabilir |
| Bakıcı check-in / check-out | Aktif — görüntüleme | Kapatılabilir |
| SOS tetiklendi | Aktif — görüntüleme | KAPATILMAZ (güvenlik) |
| Görev değişikliği | Aktif — görüntüleme | Kapatılabilir |
| Approval bekleyen | Aktif — görüntüleme | Kapatılabilir |
| Yetki değişikliği | Aktif — görüntüleme | Kapatılabilir |

*⚠ SOS bildirimi hiçbir koşulda kapatılamaz — güvenlik kritik.*

## **3.4 Gizlilik & Bağlantılar**

| Öğe | Davranış |
| :---- | :---- |
| DND Toggle | Anlık; Header'daki ile senkronize |
| Bağlı Hasta Listesi | Her bağlı hasta için: ad, ilişki tipi, yetki durumu badge, bağlantı tarihi |
| Hasta Bağlantısını Kes | Onay modal: "Bu hastadan bağlantınız kesilecek. Emin misiniz?" | PatientFamilyLink.unlinked\_at set edilir | Her iki tarafa bildirim |
| Bakıcı Bilgisi | Aktif bakıcı adı ve ajans bilgisi — read-only |
| Yetki Durumu | Her hasta için yetki seviyesi badge (view/edit/full) |
| Yeni Hasta Bağla | QR okutma veya 6 haneli kod girişi CTA — onboarding connect akışıyla aynı |

# **4\. Hesap Silme Detayı**

## **4.1 PIPEDA Uyumlu Silme Akışı**

| Adım | Aksiyonu | Sistem Davranışı |
| :---- | :---- | :---- |
| 1 | Hesabım → "Hesabımı Sil" | Uyarı modal: silme sonuçları listelenir |
| 2 | Kullanıcı "Devam Et" der | İkinci onay: "Bu işlem geri alınamaz. 30 gün içinde hesabınızı geri yükleyebilirsiniz." |
| 3 | Kullanıcı "Evet, Sil" der | Hesap deactivated; PatientFamilyLink'ler pasif; 30 gün sayacı başlar |
| 4 | 30 gün içinde giriş yapılırsa | Hesap yeniden aktif edilir; tüm bağlantılar restore edilir |
| 5 | 30 gün sonunda | Kalıcı silme; veri PIPEDA uyumlu anonimleştirme / silme politikasına göre işlenir |

## **4.2 Veri Export**

| Özellik | Değer / Kural |
| :---- | :---- |
| Format | JSON (structured data) |
| İçerik | FamilyProfile (User) \+ ConsentRecord \+ mesaj geçmişi \+ bildirim geçmişi \+ PatientFamilyLink metadata |
| Süreç | Asenkron; backend job; kullanıcıya "hazır olunca bildirim" mesajı |
| Teslimat | Push \+ e-posta bildirimi \+ 72 saat geçerli indirme linki |
| Tekrar talep | Aynı kullanıcı 7 gün içinde yeni export talep edemez (rate limit) |

# **5\. Kabul Kriterleri**

* Profil düzenlemesi yetki kontrolüyle çalışır; yetkisiz aile edit butonlarına erişemez.

* Dil değiştirme anlık uygulanır.

* Hesap silme 30 gün grace period uygular; grace period içinde giriş yapılırsa hesap restore edilir.

* Veri export talebi asenkron işlenir; kullanıcıya bildirim gönderilir.

* Hasta profil güncellemeleri HealthProfileAuditLog'a yazılır.

* Hasta bağlantısı kesildiğinde her iki tarafa bildirim gider; PatientFamilyLink.unlinked\_at set edilir.

* SOS bildirim Bildirimler bölümünde kapatılamaz olarak görünür.

# **6\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| Mesaj geçmişi veri export'a dahil mi? (PIPEDA: taraf verisini de kapsar mı) | Açık | Hukuki değerlendirme |
| İlaç listesi düzenlemesi: serbest metin mi, ilaç veritabanı araması mı? | Açık | V1 UX kararı — V0'da serbest metin önerilir |
| 30 gün grace period sonrası anonimleştirme: hangi veriler hangi politikayla silinir? | Açık | PIPEDA \+ teknik veri lifecycle kararı |
| V1'de bildirim toggle'ları: hangi tipler gruplandırılır? | Açık | UX tasarım kararı |

*Sinalytix — Gizli ve Özel.*

# 1️⃣ Bildirim Merkezi

**SINALYTIX**

Family / Aile Uygulaması

*Product Requirements Document*

**FAM-15  —  Bildirim Merkezi**

| Versiyon | MVP (V0) |
| :---- | :---- |
| **Uygulama** | Family App |
| **Hedef Pazar** | Kanada (Ontario odaklı) |
| **Durum** | Taslak — Geliştirici Referansı |
| **Tarih** | Nisan 2026 |

*Sinalytix — Gizli ve Özel*

# **1\. Bağlam ve Amaç**

Bildirim Merkezi, header'daki çan ikonu aracılığıyla erişilen in-app bildirim geçmişi panelidir. Bildirimler kendi başına içerik göstermez; yalnızca ilgili modüle yönlendiren bağlantılar (redirect links) olarak çalışır. Bu tasarım tercihi, içeriğin her zaman kanonik kaynağında (rapor ekranı, semptom paneli, inbox vb.) görüntülenmesini sağlar.

Patient App Bildirim Merkezi ile aynı mimariyi paylaşır; aile rolüne özgü bildirim tipleri ve yönlendirme hedefleri farklıdır.

## **1.1 Push Bildirim vs In-App Bildirim**

İki farklı bildirim kanalı birbirini tamamlar:

| Kanal | Tetikleme | Gösterim Yeri |
| :---- | :---- | :---- |
| Push Notification | Uygulama arka planda veya kapalıyken | Lock screen, notification center (OS) |
| In-App Notification | Uygulama açıkken ve geçmişte | FAM-15 Bildirim Merkezi (header çanı) |

*⚠ Her push notification eşzamanlı olarak in-app notification olarak da Bildirim Merkezi'ne yazılır. Böylece kullanıcı kaçırdığı bildirimleri her zaman bulabilir.*

# **2\. Kapsam ve Kısıtlar**

## **2.1 V0 Kapsamı**

* Bildirim listesi: kronolojik, en yeni üstte

* Okundu/okunmadı durumu: panel açıldığında görünür bildirimler okundu sayılır

* Her bildirim tıklanınca ilgili modüle deep link

* UI retention: 30 gün

* DB retention: 1 yıl (audit uyumu)

* Okunmamış badge: header çan ikonunda

## **2.2 V1 Eklemeleri**

* Bildirim tipine göre filtreleme

* Tümünü okundu işaretle CTA

## **2.3 Kısıtlar**

* Bildirim Merkezi içerik göstermez; yalnızca yönlendirme.

* Bildirimler silinemez (audit trail).

* SOS bildirimi hâlâ aktifse bildirim listede kırmızı ile gösterilir ve Home banner'ıyla senkronize kalır.

# **3\. Bildirim Tipleri**

| Tip | Tetikleyici | Bildirim Metni | Yönlendirme |
| :---- | :---- | :---- | :---- |
| gün sonu raporu | Her gün 22:00 scheduled job | "\[Hasta\] bugünkü özeti hazır" | FAM-06 rapor detayı |
| semptom bildirimi | Patient AI Agent SYMPTOM\_REPORT\_SEND | "\[Hasta\] yeni bir semptom bildirdi" | FAM-08 semptom detayı |
| yeni mesaj | Mesaj alındığında | "\[Gönderen\]: \[mesaj önizlemesi\]" | FAM-09 inbox → thread |
| bakıcı check-in | CaregiverShift check-in | "\[Bakıcı\] vardiyaya girdi — \[saat\]" | Home → bakıcı kartı |
| bakıcı check-out | CaregiverShift check-out | "\[Bakıcı\] vardiyayı tamamladı (\[süre\])" | Home → bakıcı kartı |
| SOS tetiklendi | Patient SOS event | "\[Hasta\] acil yardım çağrısı başlattı — \[saat\]" | Home → SOS banner |
| görev değişikliği | Task ekleme/düzenleme (başka actör) | "\[Actor\] görev listesini güncelledi" | Görevler sekmesi |
| approval bekleyen | ApprovalRequest oluştu | "\[Hasta\] bir eylem onayınızı bekliyor" | FAM-12 approval queue |
| yetki değişikliği | PatientFamilyLink permission güncellendi | "\[Hasta\] yetki durumunuzu güncelledi" | Profil → Gizlilik & Bağlantılar |
| bakıcı bağlandı/kesildi | PatientCaregiverLink değişikliği | "\[Bakıcı\] bakım ekibine eklendi/çıkarıldı" | Profil → bağlantılar |

# **4\. Ekran Spesifikasyonu**

## **4.1 Bildirim Listesi**

| Öğe | İçerik / Kural |
| :---- | :---- |
| Erişim | Header çan ikonu tıklanınca → panel açılır (slide-in veya modal) |
| Sıralama | En yeni üstte |
| Bildirim Satırı | Tip ikonu \+ başlık \+ kısa metin \+ zaman damgası \+ okundu/okunmadı stil |
| Okunmamış Stil | Mavi sol kenarlık \+ koyu metin |
| Okundu Stil | Soluk metin \+ gri arka plan |
| SOS Bildirimi | Kırmızı sol kenarlık \+ kalın metin — aktif SOS'ta hâlâ kırmızı |
| Tıklama Davranışı | İlgili modüle deep link; panel kapanır |
| 30 Günden Eski | Listede görünmez (UI); DB'de 1 yıl kalır |
| Boş Durum | "Henüz bildirim yok" |

## **4.2 Badge Yönetimi**

| Durum | Badge Davranışı |
| :---- | :---- |
| Okunmamış bildirim var | Çan ikonu üzerinde kırmızı badge \+ sayı (max 99+) |
| Panel açıldığında | Görünür bildirimler okundu işaretlenir; badge güncellenir |
| Tüm bildirimler okundu | Badge kaybolur |
| Yeni bildirim geldiğinde (uygulama açıkken) | Badge artı 1 artır; panel kapalıysa toast (bildirim balonuna benzer mini uyarı) |

# **5\. Veri Modeli**

> [RECONCILED: A3] `InAppNotification` → tek birleşik `Notification` primitifi (tüm apps; Kanonik Sözlük §7). Family'ye özgü 10-değerli enum KALDIRILDI; bunun yerine birleşik `event_type` taksonomisinin Family-ilgili alt-kümesi kullanılır (uygulama filtreleme `app_context` + tercih ile). `app_context` zorunlu kolon; `channels[]` ve `push_sent` kanonik alanlar eklendi. Tercih/quiet-hours `NotificationPreference`'ta (acil `sos` quiet-hours'ı geçersiz kılar).

| Alan (Notification) | Tip | Açıklama |
| :---- | :---- | :---- |
| notification\_id | UUID | Primary key |
| user\_id | UUID FK | Alıcı (family) |
| app\_context | enum | family (zorunlu kolon) |
| patient\_id | UUID FK | İlgili hasta |
| event\_type | enum | Birleşik taksonomi (Family alt-kümesi): daily\_report | symptom\_report\_sent | new\_message | caregiver\_checkin | caregiver\_checkout | caregiver\_connected | sos | task\_change | approval\_pending | permission\_change | caregiver\_link\_change |
| title | string | Bildirim başlığı |
| body | string | Kısa metin |
| deep\_link | string | Yönlendirme URL |
| channels | text\[\] | push | in\_app | email | sms |
| is\_read | bool | Panel açılınca true |
| read\_at | timestamp | null | — |
| push\_sent | bool | Push gönderildi mi |
| created\_at | timestamp | — |
| expires\_at | timestamp | created\_at \+ 30 gün (UI retention) |
| db\_expires\_at | timestamp | created\_at \+ 1 yıl (DB retention, audit) |

# **6\. Kabul Kriterleri**

* Header çan ikonuna tıklayınca panel açılır; bildirimler kronolojik sıralanır.

* Panel açıldığında görünür bildirimler okundu işaretlenir; badge sayısı güncellenir.

* Her bildirime tıklanınca ilgili modüle yönlendirilir; panel kapanır.

* 30 günden eski bildirimler listede görünmez; DB'de 1 yıl kalır.

* SOS bildirimi aktif olduğu sürece kırmızı stilde gösterilir.

* Bildirimler silinemez (audit trail).

* Yeni bildirim geldiğinde badge anlık artar.

# **7\. Başarı Metrikleri**

| Metrik | Hedef / İzleme |
| :---- | :---- |
| Bildirim paneli açılma oranı (push → panel) | İzleme — push CTR sinyali |
| Bildirim → ilgili ekran geçiş oranı | İzleme — deep link etkinliği |
| Ortalama okunmamış bildirim sayısı (kullanıcı başına) | İzleme — bildirim hacmi uygunluğu |
| SOS bildirim açılma süresi (push → uygulama) | İzleme — acil yanıt hızı |

# **8\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| Panel slide-in mı, tam ekran modal mı? | Açık | UX tasarım kararı |
| Semptom ve SOS bildirimleri DND'den muaf mı? | Açık — önerilen evet | Ürün kararı |
| Birden fazla SOS bildirimi: gruplama mı, ayrı satır mı? | Açık | UX kararı — ayrı satır önerilir (her SOS önemli) |
| V1 filtreleme: tip bazlı mı, tarih bazlı mı, ikisi birden mi? | Açık | V1 UX tasarımı |

*Sinalytix — Gizli ve Özel. Bu doküman geliştirici referansı içindir.*

