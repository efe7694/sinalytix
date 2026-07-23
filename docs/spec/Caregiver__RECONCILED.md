> **[RECONCILED 2026-06-28 — Canonical Data Dictionary v0.1]** Kararlar B1–B10.
>
> [RECONCILED: not → KAPANDI, KARAR K1 — 2026-07-22] Modül numaralandırması "PRD 08"i atlıyordu (PRD 07 Bildirim Merkezi → PRD 09 Profile & Settings). İçerik denetimi: tüm fonksiyonel yüzeyler PRD 00–07 + 09'da kapsanıyor; **içerik kaybı yok, yalnız numara boşluğu**. Boşluk **PRD 08 — Lone-Worker Güvenliği & Eskalasyon (V1)** olarak rezerve edildi ve kapsam iskeleti bu dosyanın sonuna eklendi (K1 kararının V1 ayağı).

# 0️⃣ Onboarding

**CAREGIVER APP — PRODUCT REQUIREMENTS DOCUMENT**

**Onboarding**

| Versiyon MVP (V0) | Uygulama Caregiver App | Hedef Pazar Kanada (Ontario odaklı) | Uygulama Konumu İlk açılış — bir kez çalışır |
| :---- | :---- | :---- | :---- |

# **1\. Bağlam ve Amaç**

Bakıcı uygulamasının onboarding akışı, profesyonel evde bakım çalışanlarının (PSW, RPN, RN, HCA ve benzeri roller) sisteme minimum sürtünmeyle alınmasını sağlar. Endüstri verisine göre evde bakım sektöründe yıllık bakıcı ciro oranı %75 civarındadır ve bu cirolarının %57'si işin ilk 90 gününde gerçekleşmektedir. Onboarding deneyiminin kalitesi, bakıcının platforma bağlılığını doğrudan etkiler.

Bu özelliğin üç temel amacı vardır:

* Regülasyon sınırları içinde gerekli tüm rızaları ve uyarıları toplamak (PIPEDA/PHIPA uyumlu, immutable ConsentRecord).

* Bakıcının temel profilini başlatmak ve en az bir hasta bağlantısına zemin hazırlamak.

* Auth sürtünmesini akışın sonuna taşıyarak terk oranını düşürmek; auth öncesi tüm veriyi şifreli yerel depolamada tutmak.

| *Hedef kitle: Profesyonel bakıcılar. Hasta uygulamasının aksine, bu akış teknoloji okuryazarlığı görece yüksek kullanıcılar için tasarlanır — yardımcı metin minimal tutulur, ilerleme hızlı olur. Bununla birlikte bazı bakıcılar ESL (İngilizce ikinci dil) konuşanlar olabilir; basit dil ve görsel destekler bu grup için önemlidir.* |
| :---- |

# **2\. Endüstri ve Klinik Bağlam**

## **2.1 Kanada'da Evde Bakım İş Gücü Profili**

Ontario'da evde bakım çalışanları ağırlıklı olarak şu rollerden oluşur: PSW (Personal Support Worker), HCA (Home Care Aide), RPN (Registered Practical Nurse) ve RN (Registered Nurse). Her rolün görev sınırları (scope of practice) farklıdır ve bu farklılık ilerleyen sürümlerde (V1+) platforma yansıtılmalıdır.

| Rol | Yetkili Görevler (Özet) | Klinik Sınır |
| :---- | :---- | :---- |
| PSW | Kişisel bakım, beslenme yardımı, mobilizasyon, ilaç hatırlatıcısı (verme değil) | İlaç vermez, yara bakımı yapmaz |
| HCA | PSW ile benzer; hijyen, günlük aktivite desteği | Tıbbi prosedür yapmaz |
| RPN | İlaç yönetimi, yara bakımı, vital takibi, basit prosedürler | Bağımsız tıbbi karar vermez; RN ya da MD gözetiminde |
| RN | Kapsamlı değerlendirme, ilaç yönetimi, prosedürler, bakım planı | En geniş scope; klinik sorumluluk taşır |

| *Bu tablo V0 için bilgilendirici niteliktedir. V1'de bakıcı rolü platforma kaydedildiğinde, görev şablonları ve bildirim içerikleri role göre özelleştirilebilir.* |
| :---- |

## **2.2 Endüstri Yazılımlarından Öğrenilen Nuanslar**

AlayaCare, HHAeXchange ve WellSky ClearCare gibi platform liderlerinin onboarding akışları incelendiğinde şu ortak örüntüler öne çıkar:

* Kimlik ve belge doğrulama (credentialing) onboarding sonrası bir HR modülü olarak ele alınır; ilk girişi bloke etmez. Bu pattern, platforma giriş sürtünmesini düşürür.

* Ajans bağlantısı genellikle bakıcının kendi başına değil, ajans tarafından davet ile tetiklenir — Sinalytix'in V2 hedefiyle örtüşür.

* Elektronik Ziyaret Doğrulama (EVV — Electronic Visit Verification), ABD'de zorunlu ancak Kanada'da henüz federal zorunluluk yok. Bununla birlikte Ontario'daki bazı özel ajanslar kendi EVV politikalarını uygulamakta. V1+ planlamasında bu göz önünde bulundurulmalı.

* Bakıcı uygulamalarında %70'i aşkın kullanıcı masaüstü erişimi olmayan (deskless) çalışanlar olduğundan mobil-first tasarım standart.

# **3\. Kapsam ve Kısıtlar**

## **3.1 Kapsam (In Scope)**

### **V0 — MVP**

* Slide-based tanıtım (2–3 ekran, atlayabilir)

* Zorunlu dil seçimi — cihaz diline göre öneri

* Açık rıza \+ güvenlik uyarıları — tüm checkbox'lar zorunlu (bkz. Bölüm 5.2)

* Temel profil: ad, soyad (zorunlu)

* Auth yöntemi seçimi: Apple SSO / Google SSO / Telefon OTP

* Auth öncesi tüm verinin şifreli yerel depolamada (iOS Keychain / Android Keystore) tutulması

* Auth başarısı sonrası local → backend transfer ve onboarding\_completed işaretlenmesi

* Tamamlandı ekranında 'İlk Hastanı Bağla' CTA (opsiyonel, QR / 6 haneli kod)

### **V1 — Sonraki Sürüm**

* Ajans bağlantısı: ajans kodu ile opsiyonel adım

* Sertifika / belge upload: PSW, RPN, RN, HCA sertifika yükleme (zorunlu değil, profil zenginleştirme)

* Re-consent akışı: ToS/Privacy versiyon değişikliğinde mevcut kullanıcıyı yeniden rızaya yönlendirme

### **V2 — İleride**

* Ters onboarding (agency-invite): Ajans davet linki → onboarding → otomatik ajans bağlantısı, bazı adımlar prefill

* EVV entegrasyon altyapısı hazırlığı (Ontario özel ajans taleplerine göre)

## **3.2 Kısıtlar (Constraints)**

* Akış profesyonel bakıcılar içindir. Hasta uygulamasına kıyasla daha az yönlendirici metin, standart font boyutları, daha hızlı ilerleme temposu.

* Auth Step 0–3 arasında gerçekleşmez. Bu aşamalardaki veriler şifreli yerel depolamada (iOS Keychain / Android Keystore) tutulur; sunucuya gönderilmez.

* SSO (Apple/Google) form adımlarını bypass etmez; yalnızca ad/e-posta alanlarını prefill eder.

* Telefon OTP yolunda SMS OTP zorunlu. SSO yolunda SMS OTP gerekmez.

* Onboarding tamamlandıktan sonra otomatik tekrar tetiklenmez. Reset yalnızca admin/debug işlemidir.

* Akış yarıda bırakılırsa, tekrar açılışta kaldığı adımdan devam eder; yerel draft bozulmaz.

* Hasta bağlantısı onboarding sırasında zorunlu değil; tamamlandı ekranında CTA olarak sunulur.

* ConsentRecord immutable — güncelleme yok, versiyon değişikliğinde yeni kayıt açılır.

## **3.3 Non-goals (Kapsam Dışı)**

* Bakıcının kendi sağlık profili toplama

* Bakıcının kendi acil iletişim kişisi girişi

* Ajans kimlik doğrulama (V1 kapsamı)

* Wearable / cihaz kurulumu

* Facebook SSO (eklenmeyecek)

* Bakıcı performans değerlendirmesi veya ücretlendirme (V2+ kapsamı)

# **4\. Kullanıcı Akışı**

## **4.1 Adım Sırası (V0)**

| Adım | Ekran ID | Açıklama | Depolama |
| :---- | :---- | :---- | :---- |
| 0 | ONB\_00\_INTRO | Intro slaytlar (atlayabilir) | — |
| 1 | ONB\_01\_LANGUAGE | Dil seçimi (zorunlu) | LOCAL |
| 2 | ONB\_02\_CONSENT | Rıza \+ güvenlik uyarıları (zorunlu) | LOCAL |
| 3 | ONB\_03\_PROFILE | Ad soyad (zorunlu) | LOCAL |
| 4 | ONB\_04\_AUTH\_METHOD | Giriş yöntemi seçimi | — |
| 5a | ONB\_04A\_PHONE | Telefon numarası (OTP yolu) | — |
| 5b | ONB\_04B\_OTP | OTP doğrulama | — |
| — | AUTH\_TRANSFER | Local → backend transfer | BACKEND |
| 6 | ONB\_05\_DONE | Tamamlandı \+ hasta bağlantısı CTA | — |

## **4.2 Akış Diyagramı (Mermaid — Developer Referansı)**

| *flowchart TD  A\[App First Launch\] \--\> B\[ONB\_00\_INTRO: Slide Intro\]  B \--\> C\[ONB\_01\_LANGUAGE: Dil Seçimi \- ZORUNLU \- LOCAL\]  C \--\> D\[ONB\_02\_CONSENT: Rıza \+ Güvenlik \- ZORUNLU \- LOCAL\]  D \--\> D1{5 checkbox tam?}  D1 \--\>|Hayır| D  D1 \--\>|Evet| E\[ONB\_03\_PROFILE: Ad Soyad \- ZORUNLU \- LOCAL\]  E \--\> F\[ONB\_04\_AUTH\_METHOD: Giriş Yöntemi\]  F \--\>|Apple / Google| G\[SSO Flow \- platform native\]  F \--\>|Telefon OTP| H\[ONB\_04A\_PHONE: Telefon Gir\]  G \--\> G1{SSO?}  G1 \--\>|Başarılı| I\[LOCAL → BACKEND TRANSFER\]  G1 \--\>|Başarısız| F  H \--\> H1\[OTP Gönder \- rate limit\]  H1 \--\> H2\[ONB\_04B\_OTP: OTP Doğrula\]  H2 \--\> H3{OTP?}  H3 \--\>|Başarılı| I  H3 \--\>|Başarısız / Timeout| H2  I \--\> J\[ONB\_05\_DONE: Tamamlandı\]  J \--\>|İlk Hastanı Bağla| K\[QR / Kod Girişi\]  J \--\>|Şimdilik Geç| L\[Ana Ekran \- hasta yok\]  K \--\> L* |
| :---- |

## **4.3 Kritik Akış Kuralları**

* Adım 0–3 arasında herhangi bir veri sunucuya iletilmez. Kullanıcı kimliği doğrulanmadan sunucuya PHI (Personal Health Information) veya PII (Personally Identifiable Information) gönderilmesi PIPEDA ihlali oluşturur.

* Auth başarısız olursa kullanıcı ONB\_04\_AUTH\_METHOD ekranına döner; local draft korunur.

* Backend transfer sırasında ağ hatası olursa: silent retry (exponential backoff, max 5 deneme). Tüm retry'lar başarısız olursa kullanıcı bir sonraki uygulama açılışında sessiz yeniden deneme yaşar. Kullanıcıya onboarding tekrar gösterilmez.

* Onboarding tamamlanmış bir kullanıcı uygulamayı tekrar açarsa doğrudan ana ekrana yönlendirilir.

# **5\. Ekran Spesifikasyonları**

## **ONB\_00\_INTRO — Tanıtım Slaytları**

Platformun ilk izlenimini oluşturan 2–3 slaytlık carousel. V0'da placeholder içerikle gönderilir; V1'de A/B test edilmiş final kopya ile güncellenir.

| ONB\_00\_INTRO — Tanıtım Slaytları |
| :---- |
| **UI Pattern:** Swipe carousel — yatay geçiş |
| **Slayt Sayısı:** 2–3 (V0 placeholder) |
| **Slayt 1:** "Bakım sürecini profesyonelleştir." |
| **Slayt 2:** "Hastanın, ailesi ve sen — tek platformda." |
| **Slayt 3:** "Sinalytix acil doktor servisi değildir. Acil durumlarda 911'i arayın." (ZORUNLU güvenlik mesajı) |
| **Primary CTA:** Devam (son slaytta: Başla) |
| **Secondary CTA:** Geç (tüm intro'yu atlar, Step 1'e gider) |
| **Geri navigasyon:** Yok — bu akışın ilk adımı |
| **Analytics:** intro\_slide\_viewed { slide\_index }, intro\_skipped { at\_slide\_index } |

| *Tasarım notu: Son slayt her zaman güvenlik uyarısını içermelidir. Bu hem regülasyon gereği hem de kullanıcı beklenti yönetiminin parçasıdır. Slaytlar swipe ile de geçilebilir; bu durumda her slayt görüntülendi sayılır.* |
| :---- |

## **ONB\_01\_LANGUAGE — Dil Seçimi**

Zorunlu adım. Kullanıcının seçtiği dil, uygulama genelinde tüm içeriği ve bildirimleri etkiler. V0'da desteklenen diller: İngilizce (en), Fransızca (fr), Türkçe (tr).

| ONB\_01\_LANGUAGE — Dil Seçimi |
| :---- |
| **Input:** selected\_language (enum: en | fr | tr | genişletilebilir) |
| **Prefill:** Cihaz locale'i / bölge tespiti — kullanıcı değiştirebilir |
| **Validasyon:** selected\_language boş geçilemez; CTA boşken disabled |
| **Yerel depolama:** onboarding\_draft.language |
| **Primary CTA:** Devam |
| **Secondary CTA:** Geri (intro'ya) |
| **Analytics:** language\_selected { selected\_language, suggested\_language, changed\_from\_suggested: bool } |

| *Kritik: Dil seçimi ConsentRecord'a yazılmaz ancak backend'e user.locale olarak iletilir. Rıza metinleri kullanıcının seçtiği dilde gösterilmelidir — aynı ekran, aynı anda farklı dillerdeki çeviriyi render etmelidir. V0'da eğer seçilen dil için çeviri yoksa İngilizce fallback kullanılır ve kullanıcı bilgilendirilir.* |
| :---- |

## **ONB\_02\_CONSENT — Rıza ve Güvenlik Uyarıları**

Bu ekran PIPEDA/PHIPA uyumunun temel noktasıdır. Dört zorunlu checkbox içerir. Hiçbiri önceden işaretli gelme. Tüm checkbox işaretlenmeden CTA aktif olmaz.

| ONB\_02\_CONSENT — Rıza \+ Güvenlik Uyarıları |
| :---- |
| **Görünür uyarı başlığı:** "Sinalytix teşhis koymaz, tedavi önermez. Bakım koordinasyonu ve görev yönetimi aracıdır." |
| **Checkbox 1 — accept\_tos (ZORUNLU):** "Kullanım Koşulları'nı okudum ve kabul ediyorum" \[bağlantılı metin\] |
| **Checkbox 2 — accept\_privacy (ZORUNLU):** "Gizlilik Politikasını okudum ve kabul ediyorum" \[bağlantılı metin\] |
| **Checkbox 3 — ack\_not\_emergency (ZORUNLU):** "Bu uygulama acil durum servisi değildir. Acil durumlarda 911'i ararım." |
| **Checkbox 4 — ack\_no\_clinical\_decision (ZORUNLU):** "Bu uygulama klinik karar verme yetkisine sahip değildir. Klinik sorumluluk bana ve/veya yetkili sağlık profesyoneline aittir." |
| **Checkbox 5 — ack\_ai\_processing (ZORUNLU):** "AI/sesli asistan özelliklerinin sağlık bilgisini işlemesine onay veriyorum." \[RECONCILED: B9\] |
| **CTA durumu:** 5 checkbox tam işaretlenmeden 'Kabul Et ve Devam' disabled |
| **Primary CTA:** Kabul Et ve Devam |
| **Secondary CTA:** Geri |
| **Yerel depolama:** onboarding\_draft.consent { accept\_tos, accept\_privacy, ack\_not\_emergency, ack\_no\_clinical\_decision, ack\_ai\_processing, consented\_at } |
| **Backend yazımı:** ConsentRecord — immutable, auth sonrası |
| **Analytics:** consent\_completed { all\_accepted: bool, time\_on\_screen\_ms } |

> [RECONCILED: B9] 5. checkbox `ack_ai_processing` eklendi. AI onamı tek yerde: kanonik `ConsentRecord.flags.ack_ai_processing` (Dictionary §2). Ayrı `ai_consent_record` tablosu kanonik `ConsentGrant`'a (revoke yolu) eşlenir — bkz. AI Agent PRD §3.3.

| *Neden 4\. checkbox ayrı? Bakıcı profesyonel bir rol üstlenmektedir. Klinik karar yetkisinin uygulamada olmadığını açıkça kabul etmesi, hem olası hukuki sorumluluk iddialarına karşı platform koruması sağlar hem de bakıcının rol sınırlarını baştan anlamasına yardımcı olur. Bu özellikle PSW ve HCA rollerinde kritiktir.* |
| :---- |

ToS / Privacy Policy bağlantıları uygulama içi WebView'da açılır. Kullanıcı bağlantıya tıklayıp geri döndüğünde, checkbox durumu korunur.

### **Re-consent Akışı (V1)**

Sinalytix ToS veya Gizlilik Politikasını güncellediğinde, mevcut kullanıcılar uygulamayı açtıklarında yeni sürümü kabul etmek zorundadır. Bu akış onboarding'in tekrarı değil, ayrı bir modal / full-screen interstitial'dır. Kullanıcı yeni sürümü kabul etmeden uygulamaya devam edemez. Reddederse: çıkış yapılır, hesap pasif durumda bırakılır.

* Tetikleyici: consent\_record.version \< current\_tos\_version

* ConsentRecord'a yeni satır eklenir (önceki silinmez — audit trail bütünlüğü)

* Bildirim: push \+ e-posta ("Kullanım koşullarımız güncellendi. Lütfen onaylayın.")

## **ONB\_03\_PROFILE — Temel Profil Bilgisi**

Bu adımda yalnızca ad ve soyad toplanır. Telefon numarası OTP yolunda auth sırasında alınır; SSO yolunda isteğe bağlı profil tamamlama adımında sorulabilir (V1). Maksimum sadelik korunur.

| ONB\_03\_PROFILE — Temel Profil Bilgisi |
| :---- |
| **Input 1 — first\_name:** string, zorunlu, min 2 karakter, max 50 karakter |
| **Input 2 — last\_name:** string, zorunlu, min 2 karakter, max 50 karakter |
| **SSO prefill:** SSO'dan isim geldiyse alanlar dolu gelir; üzerinde not: "Dilersen düzenleyebilirsin" |
| **Validasyon:** Her iki alan dolu değilse CTA disabled; min 2 karakter; yalnızca harf+boşluk+tire+apostrof |
| **Yerel depolama:** onboarding\_draft.profile { first\_name, last\_name } |
| **Primary CTA:** Devam |
| **Secondary CTA:** Geri |
| **Analytics:** profile\_basic\_completed { name\_prefilled\_from\_sso: bool } |

| *V1 profil genişletme: Bakıcı rolü (PSW/RPN/RN/HCA), sertifika numarası ve belge upload bu adıma değil onboarding sonrası Settings \> Profilim ekranına eklenecektir. Onboarding akışını şişirmemek için bu bilgiler zorunlu tutulmaz.* |
| :---- |

## **ONB\_04\_AUTH\_METHOD — Giriş Yöntemi Seçimi**

| ONB\_04\_AUTH\_METHOD — Giriş Yöntemi Seçimi |
| :---- |
| **Seçenekler:** Apple ile Devam | Google ile Devam | Telefon Numarasıyla Devam |
| **Validasyon:** Yok — her seçim bir aksiyon tetikler |
| **Secondary CTA:** Geri (ONB\_03\_PROFILE'a) |
| **Analytics:** auth\_method\_selected { method: apple | google | phone\_otp } |

## **ONB\_04A\_PHONE — Telefon Numarası (OTP Yolu)**

| ONB\_04A\_PHONE — Telefon Numarası Girişi |
| :---- |
| **Input:** phone\_number — E.164 normalizasyonu (örn: \+1 416 555 0123\) |
| **UI:** Ülke kodu seçici \+ numara alanı |
| **Validasyon:** E.164 format \+ ülke kodu \+ minimum uzunluk |
| **Rate limit:** Max 3 OTP isteği / 10 dakika / numara |
| **Primary CTA:** Kod Gönder |
| **Secondary CTA:** Geri |
| **Analytics:** otp\_sent { phone\_country\_code, resend\_count } |

## **ONB\_04B\_OTP — OTP Doğrulama (OTP Yolu)**

| ONB\_04B\_OTP — OTP Doğrulama |
| :---- |
| **Input:** otp\_code — 6 hane, yalnızca rakam |
| **Auto-fill:** iOS/Android OTP auto-fill (SMS'ten otomatik doldur) desteklenir |
| **Timeout:** 5 dakika (görünür geri sayım) |
| **Hata: yanlış kod:** "Kod hatalı, tekrar dene." \+ kalan deneme sayısı göster |
| **Hata: timeout:** "Süre doldu. Yeni kod iste." \+ Kodu Tekrar Gönder CTA aktif |
| **Hata: max retry (3):** "Çok fazla deneme. Lütfen yeni kod iste." \+ Kodu Tekrar Gönder |
| **Primary CTA:** Doğrula |
| **Secondary CTA:** Kodu Tekrar Gönder (rate limit: 3 / 10 dk) |
| **Başarı tetikler:** Local data → Backend transfer akışı |
| **Analytics:** otp\_verified { result: success|fail, attempt\_number, error\_code? } |

## **AUTH SONRASI — Local → Backend Transfer**

Auth (SSO veya OTP) başarıyla tamamlanır tamamlanmaz tetiklenir. Bu işlem kullanıcıya görünmez; arka planda gerçekleşir.

| Adım | İşlem |
| :---- | :---- |
| 1 | Caregiver hesabı oluşturulur / oturum açılır |
| 2 | onboarding\_draft okunur: language → user.locale, consent → ConsentRecord, profile → CaregiverProfile |
| 3 | ConsentRecord backend'e immutable olarak yazılır (version, flags, timestamp, ip\_hash) |
| 4 | CaregiverProfile backend'e yazılır |
| 5 | Local draft temizlenir (Keychain/Keystore'dan silinir) |
| 6 | onboarding\_completed\_at timestamp'i set edilir |

| *Hata yönetimi: Transfer başarısız olursa kullanıcı ONB\_05\_DONE ekranını görür (işlem tamamlanmış hissi korunur). Arka planda exponential backoff ile max 5 retry yapılır. Tüm retry'lar başarısız olursa: bir sonraki uygulama açılışında sessizce yeniden denenir. Kullanıcıya onboarding tekrar gösterilmez.* |
| :---- |

## **ONB\_05\_DONE — Tamamlandı**

| ONB\_05\_DONE — Tamamlandı Ekranı |
| :---- |
| **Başlık:** "Hazırsın." |
| **Alt metin:** "İlk hastanı bağlayarak başlayabilirsin." |
| **Primary CTA:** İlk Hastanı Bağla → QR okutma veya 6 haneli kod girişi |
| **Secondary CTA:** Şimdilik Geç → Ana ekran (hasta yok durumu) |
| **Hasta bağlantısı mekanizması:** Patient App'teki Settings \> Bakıcı Ekle'den üretilen 6 haneli tek kullanımlık kod |
| **Analytics:** onboarding\_completed { completion\_time\_ms, linked\_patient\_immediately: bool } |

# **6\. Veri Modeli**

## **6.1 Yerel Depolama (Auth Öncesi)**

Tüm onboarding verisi auth gerçekleşene kadar şifreli yerel depolamada tutulur.

| *onboarding\_draft {  step\_progress: "intro | language | consent | profile | auth\_method | auth | done"  language: string  consent: {    accept\_tos: bool    accept\_privacy: bool    ack\_not\_emergency: bool    ack\_no\_clinical\_decision: bool    ack\_ai\_processing: bool    consented\_at: ISO8601 timestamp  }  profile: {    first\_name: string    last\_name: string  }}* |
| :---- |

## **6.2 Backend Veri Modeli (Auth Sonrası)**

### **User (Caregiver)**

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| user\_id | uuid | Primary key |
| roles[] | text[] | {`patient`\|`family`\|`caregiver`\|`clinician`\|`nurse`\|`coordinator`\|`admin`} — bakıcı için `caregiver` içerir |
| locale | string | Dil seçiminden |
| auth\_method | enum | apple | google | phone\_otp |
| created\_at | timestamp | — |
| onboarding\_completed\_at | timestamp | null → tamamlandı sonrası set |
| status | enum | active | suspended | deactivated |

> [RECONCILED: A2/B8] Tekil `user_type: caregiver` ayrımcısı kaldırıldı → kanonik `User` + çok-değerli `roles[]` (Dictionary §1). `coordinator` / `nurse` / `admin` ayrı tablo değil, `roles[]` değerleridir; böylece mesajlaşma/profil bölümlerindeki koordinatör/hemşire/yönetici aktörleri artık tek `User` hesap modeline sahip olur.

### **ConsentRecord**

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| consent\_id | uuid | Primary key |
| user\_id | uuid | FK → User |
| version | string | ToS/Privacy sürüm numarası (örn: '2.1.0') |
| flags.accept\_tos | bool | — |
| flags.accept\_privacy | bool | — |
| flags.ack\_not\_emergency | bool | — |
| flags.ack\_no\_clinical\_decision | bool | — |
| flags.ack\_ai\_processing | bool | [RECONCILED: B9] AI/sesli işleme onamı — AI onamının tek kanonik yeri |
| consented\_at | timestamp | Yerel depolamadaki timestamp (client-side) |
| server\_recorded\_at | timestamp | Backend yazım zamanı |
| ip\_hash | string | SHA-256 hash — PIPEDA audit için; plain IP saklanmaz |
| TABLO KURALI | — | IMMUTABLE — UPDATE yok. Sürüm değişikliğinde yeni satır açılır. |

| *PIPEDA uyum notu: Rıza kayıtları audit amaçlı minimum 7 yıl saklanmalıdır. ConsentRecord tablosuna DELETE ve UPDATE işlemleri uygulama seviyesinde engellenir; yalnızca INSERT kabul edilir. Yasal uyum için bu tablo ayrı bir denetim veritabanına replike edilmesi önerilir.* |
| :---- |

### **CaregiverProfile**

| Alan | Tip | Notlar |
| :---- | :---- | :---- |
| user\_id | uuid | FK → User (PK aynı zamanda) |
| first\_name | string | — |
| last\_name | string | — |
| phone | string | OTP yolunda auth'tan, SSO yolunda null (V1'de tamamlama) |
| email | string | SSO'dan geliyorsa dolu, OTP yolunda null |
| role | enum | null (psw | rpn | rn | hca | coordinator | admin | other) — uzlaştırılmış enum |
| agency\_id | uuid | null (V1'de ajans bağlantısıyla set) |
| status | enum | active | suspended | deactivated |
| created\_at | timestamp | — |

> [RECONCILED: kalite] **Tek kanonik `CaregiverProfile`** budur (Dictionary §1). Profil PRD'sindeki `caregiver_profiles` tablosu AYNI tablodur (ayrı bir tablo değil). Çift tanım birleştirildi; `role` enum'u her iki yerin birleşimine uzlaştırıldı: {psw\|rpn\|rn\|hca\|coordinator\|admin\|other}. Profil PRD'sindeki `role_type` kolonu bu kanonik `role` alanına eşlenir.

# **7\. Hata Durumları ve Edge Case'ler**

| Senaryo | Kullanıcıya Gösterilen | Sistem Davranışı |
| :---- | :---- | :---- |
| OTP kodu yanlış (1-2. deneme) | "Kod hatalı. X deneme hakkın kaldı." | Retry sayacı artar |
| OTP kodu yanlış (3. deneme) | "Çok fazla deneme. Yeni kod iste." | Input disabled; Resend CTA aktif |
| OTP timeout (5 dk) | "Süre doldu. Yeni kod iste." | Timeout timer sıfırlanır; Resend CTA aktif |
| Rate limit aşıldı (3 SMS/10 dk) | "Kısa süre içinde çok fazla kod istedin. Lütfen bekle." | Resend CTA X dakika disabled (kalan süre gösterilir) |
| SSO iptal / başarısız | "Giriş iptal edildi. Başka yöntem deneyebilirsin." | ONB\_04\_AUTH\_METHOD'a dön |
| Backend transfer hatası | Kullanıcıya gösterilmez | Silent retry (exponential backoff, max 5\) |
| Uygulama kapanır, yarım bırakılır | Tekrar açınca kaldığı adımdan devam | step\_progress okunur, doğru ekrana yönlendirme |
| Dil çevirisi eksik | İngilizce fallback \+ "Bu dil kısmi desteklenmektedir" notu | Fallback mekanizması devreye girer |

# **8\. Kabul Kriterleri**

## **8.1 Fonksiyonel**

* İlk launch'ta intro slaytlar görünür; swipe veya 'Devam' ile geçilir; 'Geç' ile Step 1'e atlanabilir.

* Dil seçimi yapılmadan Step 2'ye geçilemez; seçim uygulama dilini anında değiştirir.

* Consent ekranındaki 5 checkbox işaretlenmeden CTA aktif olmaz ve ilerleme gerçekleşmez. [RECONCILED: B9] (5. checkbox: ack\_ai\_processing)

* Ad/soyad her biri min 2 karakter olmadan auth adımına geçilemez.

* Auth öncesi (Step 0–3) tüm veri şifreli yerel depolamada saklanır; uygulama kapatılıp açıldığında kaybolmaz.

* Akış yarıda bırakılırsa tekrar açılışta step\_progress'e göre doğru ekranda devam edilir.

* Auth başarıyla tamamlandıktan sonra local draft backend'e aktarılır; ConsentRecord immutable yazılır.

* OTP: 3 yanlış denemede resend forced, timeout'ta süre doldu mesajı görünür.

* Onboarding tamamlandıktan sonra uygulama tekrar açılırsa onboarding tekrar gösterilmez.

* Tamamlandı ekranında 'İlk Hastanı Bağla' CTA çalışır; hasta bağlantısı opsiyoneldir.

## **8.2 Regülasyon / Güvenlik**

* Hiçbir ekran kopyası teşhis, tedavi veya dozaj önermez.

* 'Acil durumlarda 911'i arayın' uyarısı intro son slaytında VE consent ekranında görünür.

* ack\_no\_clinical\_decision flag'i ConsentRecord'da ayrı alan olarak immutable saklanır.

* ConsentRecord version alanı dolu olmalı; UPDATE/DELETE backend seviyesinde engellenmeli.

* Auth öncesinde hiçbir PII/PHI sunucuya gönderilmemeli.

* Yerel draft iOS Keychain / Android Keystore ile şifreli saklanmalı.

## **8.3 Teknik / Performans**

* Auth sonrası local → backend transfer: ≤ 3 saniye (normal bağlantı).

* Transfer hatası: silent retry, kullanıcıya onboarding tekrar gösterilmez.

* OTP rate limit: max 3 gönderim / 10 dakika / numara — DB veya cache seviyesinde uygulanır.

* step\_progress'e göre resume başarı oranı: ≥ %95.

* Onboarding flow crash/force-close oranı: ≤ %1.

# **9\. Başarı Metrikleri**

## **9.1 Funnel / Drop-off Hedefleri**

| Adım Geçişi | Hedef Oran | Neden bu hedef? |
| :---- | :---- | :---- |
| Intro → Dil Seçimi | ≥ %90 | Intro 'Geç' ile atlanabilir; kayıp beklenir |
| Dil → Rıza | ≥ %97 | Zorunlu adım; kayıp teknik hata göstergesi |
| Rıza → Profil | ≥ %95 | Küçük kayıp: bakıcı iş tanımını anlayıp vazgeçebilir |
| Profil → Auth | ≥ %93 | — |
| Auth → Tamamlandı | ≥ %85 | SSO başarısızlıkları bu adımı etkiler |
| TOPLAM Onboarding Completion | ≥ %78 | Endüstri benchmark (caregiver uygulamaları için) |

## **9.2 Zaman Metrikleri**

* Medyan tamamlama süresi (SSO yolu): ≤ 2 dakika

* Medyan tamamlama süresi (OTP yolu): ≤ 3 dakika

## **9.3 Hata Metrikleri**

* OTP ilk denemede başarısızlık oranı: ≤ %20

* Auth failure sonrası farklı yöntem denemesi oranı: izlenir (minimum %30 hedefi)

* Consent ekranında takılma oranı (3+ dakika geçirilip terk): ≤ %5

# **10\. UX ve Tasarım Notları**

* Her ekranda maksimum 1 primary CTA \+ 1 secondary CTA. CTA yoğunluğu bakıcı karar yorgunluğunu artırır.

* Geri navigasyonda form içerikleri korunur (yerel draft sayesinde); kullanıcı her geri adımda sıfırdan başlamaz.

* SSO prefill olduğunda 'Dilersen düzenleyebilirsin' notu form alanlarının üstünde görünür.

* Hata mesajları: tek satır \+ ne yapması gerektiği (örn: 'Kod hatalı. Tekrar dene.' değil sadece 'Hata').

* Bakıcı uygulaması hedef kitlesi için büyütülmüş font / erişilebilirlik optimizasyonu hasta uygulamasına kıyasla daha az kritik; standart sistem font boyutları yeterli.

* Klavye açıldığında CTA ekranda görünür kalmalı (scroll / padding ayarı gerekli olabilir).

* ESL bakıcılar için: metin basit tutulur, teknik jargon kullanılmaz, consent metinleri B1-B2 İngilizce seviyesinde yazılır.

# **11\. Kullanıcı Senaryoları**

## **Senaryo 1 — Bağımsız PSW, kendi başına kuruyor**

Bakıcı uygulamayı indirir, intro'yu geçer, İngilizce seçer, 4 checkbox'ı işaretler, adını girer, Google ile giriş yapar. Tamamlandı ekranında 'İlk Hastanı Bağla'ya basar, hastanın telefonundan aldığı 6 haneli kodu girer, bağlantı kurulur. Hedef süre: 2 dakika altı.

## **Senaryo 2 — Ajans bakıcısı, henüz hasta atanmamış**

Onboarding'i tamamlar, 'Şimdilik Geç' der. Ana ekranda 'Henüz bağlı hastan yok' boş durumu görünür. Ajans veya hasta tarafı daha sonra bağlantı kurar.

## **Senaryo 3 — Yarım bırakıp dönen bakıcı**

Step 2 Rıza ekranına kadar gelmiş, uygulamayı kapatmış. Ertesi gün tekrar açınca rıza ekranından devam eder; dil seçimi kayıtlı gelir.

## **Senaryo 4 — OTP sorunu yaşayan bakıcı**

Telefon ile giriş seçer. SMS gelmez, 2 dakika bekler. 'Kodu Tekrar Gönder' butonuna basar. İkinci SMS gelir, 6 haneli kodu girer, doğrulama başarılı. Rate limit tetiklenmez (2 istek / 10 dk \< 3 limit).

# **12\. Açık Konular**

| Konu | Durum | Sorumlu / Hedef |
| :---- | :---- | :---- |
| V1 ajans bağlantısı — bakıcı kodu ile mi, ajans tarafı onayı ile mi? | Açık | V1 PRD'de tanımlanacak |
| Ters onboarding (ajans daveti) — hangi adımlar prefill olur? | Açık | V2 PRD'de tanımlanacak |
| Sertifika upload — hangi sertifika tipleri kabul edilir? (PSW, RPN, RN, HCA, CNO no. vb.) | Açık | V1 PRD \+ FTR uzmanı görüşü |
| Re-consent interstitial tasarımı — modal mi, full-screen mi? | Açık | V1 UX sürecinde |
| SSO yolunda telefon numarası toplanacak mı? (iletişim ve 2FA için) | Açık | V1 profil tamamlama adımı kararı |
| EVV (Electronic Visit Verification) Ontario özel ajans gereksinimleri | İzleniyor | V2 kapsamı — mevzuat takibi |
| ConsentRecord audit replication stratejisi (ayrı DB veya same DB?) | Açık | Teknik mimari kararı |

*Sinalytix — Gizli ve Özel. Bu doküman geliştirici referansı içindir.*

# 0️⃣ Vardiya Yönetimi

**CAREGIVER APP — PRODUCT REQUIREMENTS DOCUMENT**

**Vardiya Yönetimi**

| Versiyon MVP (V0) | Uygulama Caregiver App | Hedef Pazar Kanada (Ontario odaklı) | Uygulama Konumu Anasayfa \+ Hasta kontekstinde |
| :---- | :---- | :---- | :---- |

# **1\. Bağlam ve Klinik Önem**

Vardiya yönetimi, evde bakım ekosisteminin zamansal omurgasıdır. Bakıcının 'şu an bu hastanın yanındayım' durumunu sisteme bildirmesi; hasta ve aile tarafında gerçek zamanlı güven sağlar, hasta uygulamasındaki çağrı yönlendirmesini doğrudan etkiler ve ilerideki ücretlendirme ile ajans entegrasyonunun temelini oluşturur.

## **1.1 Sektör Bağlamı: EVV ve Vardiya Takibi**

ABD'de Medicaid kapsamındaki evde bakım hizmetleri için Elektronik Ziyaret Doğrulama (EVV — Electronic Visit Verification) federal zorunluluktur. Kanada'da henüz federal zorunluluk yoktur; ancak Ontario'daki büyük özel ajanslar (AlayaCare, HHAeXchange müşterileri) kendi EVV politikalarını uygulamaktadır. Sinalytix'in V0 check-in / check-out altyapısı bu ilerleyen ihtiyaca zemin hazırlar.

Sektör lideri platformların (HHAeXchange, AlayaCare) check-in/check-out akışları incelendiğinde şu ortak örüntüler öne çıkar:

* Check-in/check-out tek buton aksiyonuyla gerçekleşir — karmaşık form yok.

* Check-out sırasında o vardiyada yapılan görev/görevler teyit edilir (duty confirmation). V0'da bu adım yoktur; V1'de görev yönetimi ile entegre edilir.

* Bazı kontratlarda hasta imzası (elektronik) check-out şartı olabilir. V2 kapsamında tutulmuştur.

* Ajanslar için günlük istisna takibi (exception review) kritiktir: kaçırılmış check-in, süre tutarsızlıkları, eksik check-out. Bu analitik katman V1+ içindir.

## **1.2 Klinik Önem: Vardiya Devri ve Hasta Güvenliği**

Klinisyenler arası devir (handover/handoff) araştırmaları ciddi bir bulgu ortaya koymaktadır: ciddi tıbbi hataların yaklaşık %80'i bakıcılar arası geçişlerdeki iletişim eksikliklerinden kaynaklanmaktadır (The Joint Commission). WHO, yapılandırılmış devir protokollerini hasta güvenliğinin temel unsuru olarak tanımlamaktadır.

SBAR çerçevesi (Situation-Background-Assessment-Recommendation) standart devir iletişim aracıdır. V0'da check-out notu serbest metin olarak başlar; V1'de SBAR-ilhamlı yapılandırılmış nota evrilmesi, evde bakım ekosistemini klinik standartlara yaklaştırır.

> [KARAR K2 — 2026-07-22 · ÖNERİLEN DEFAULT, klinik teyit bekliyor] SBAR devri kademeli: **V0'da check-out notu serbest metin kalır (500 kr) AMA giriş alanı SBAR-ipuçlu placeholder ile sunulur** ("Durum / Arka plan / Gözlem / Öneri" başlıkları öneri olarak gösterilir, zorunlu değildir; tek `shift_note` alanına yazılır). **V1'de** `shift_note_structured` (jsonb, Dictionary §4) 4 ayrı alanla yapılandırılmış forma geçer; eski serbest notlar migrate edilmez, yan yana yaşar. Bu, bilinen devir-teslim güvenlik boşluğunu V0'da sıfır-şema-değişikliğiyle kısmen kapatır. Yeni klinik davranış eklenmez (SaMD-nötr).

| *PSW (Personal Support Worker) günde ortalama 3–5 farklı hastayı ziyaret eder; her ziyaret arasında ücretlendirilmeyen boşluklar olabilir. Bu multi-visit pattern, hasta geçişi akışının (auto-switch) rutin bir kullanım senaryosu olduğunu gösterir; istisnai değil.* |
| :---- |

## **1.3 Ontario İş Hukuku ve 24 Saat Uyarısı**

Ontario İstihdam Standartları Yasası (ESA) kapsamında evde bakım çalışanları için temel kurallar: günde maksimum 8 saat (yazılı anlaşma olmaksızın), haftada 44 saati aşan çalışma fazla mesai olarak değerlendirilir, ardışık iki vardiya arasında minimum 8 saat dinlenme zorunludur.

Bu bağlamda Sinalytix'in 24 saati aşan vardiyalar için gönderdiği uyarı bildirimi yalnızca bir UX özelliği değil, aynı zamanda olası düzensiz bir durumun (bakıcının check-out yapmayı unutması veya gerçek bir çalışma saati aşımı) erken işaretidir. Platform klinik karar vermez; ancak bu veriyi raporlamak için saklar.

# **2\. Kapsam ve Kısıtlar**

## **2.1 Kapsam (In Scope)**

### **V0 — MVP**

* Vardiya başlat (check-in): seçili hasta için aktif vardiya kaydı oluşturur

* Vardiya bitir (check-out): aktif vardiyayı kapatır, opsiyonel not alır

* Tekli aktif vardiya kuralı: aynı anda yalnızca 1 aktif vardiya; geçiş onay popup'ı ile

* Vardiya süresi sayacı: aktif vardiyada HH:MM formatında canlı sayaç

* Otomatik uyarı: 24 saat aşılınca push bildirimi

* Vardiya geçmişi: tarih, hasta adı, başlangıç/bitiş, süre, not — basit liste

* Çift taraflı güncelleme: CaregiverShift durumu Patient App ve Family App tarafından okunur

### **V1 — Sonraki Sürüm**

* Planlanmış vardiya: ileri tarihli vardiya oluşturma (gün-hasta eşleştirmesi / takvim görünümü)

* Yapılandırılmış check-out notu: SBAR-ilhamlı alan grupları (Durum / Önemli Olaylar / Devir Notu)

* Görev konfirmasyonu: check-out sırasında o vardiyada tamamlanan görevlerin teyidi

* Vardiya özeti raporu: vardiya süresince tamamlanan görevler, kayıtlı semptomlar, notlar

* Ajans entegrasyonu: ajansın bakıcıya vardiya ataması, onay mekanizması

### **V2 — İleride**

* Ücretlendirme altyapısı: vardiya süresi bazlı faturalandırma / ödeme hesaplama

* Konum doğrulama (EVV hazırlığı): check-in'de opsiyonel GPS koordinatı kaydı

* Hasta/bakıcı elektronik imzası: check-out onayı için

* Vardiya devir notu: bir bakıcıdan diğerine bilgi iletimi için yapılandırılmış form

* Ajans istisna raporlama: kaçırılmış check-in, süre tutarsızlıkları otomatik flag

## **2.2 Kısıtlar (Constraints)**

* Bakıcı aynı anda yalnızca 1 aktif vardiyaya sahip olabilir. Bu kural DB seviyesinde partial unique index ile zorunlu tutulur.

* V0'da konum doğrulama yoktur. check-in yalnızca bakıcının manuel eylemi ile gerçekleşir.

* Vardiya otomatik kapanmaz. 24 saat aşıldığında bildirim gönderilir; kapatma kararı bakıcıya aittir.

* Check-in/check-out zaman damgaları UTC olarak saklanır, bakıcının cihaz timezone'u metadata olarak eklenir.

* CaregiverShift tablosu Patient App ve Family App tarafından salt okunur erişimle kullanılır; yazma yetkisi yalnızca Caregiver App'e aittir.

* Vardiya geçmişi verileri silinmez; audit ve ileride ücretlendirme için saklanır.

* Çevrimdışı durumda check-in yapılırsa: eylem yerel olarak kuyruklanır, bağlantı sağlanınca senkronize edilir (bkz. Bölüm 6).

## **2.3 Non-goals (Kapsam Dışı — V0)**

* Otomatik check-in/check-out (geolocation tetiklemeli)

* Ajans veya hasta tarafından vardiya onayı

* Mola yönetimi (V1 değerlendirmesi)

* Fazla mesai hesaplama veya uyarısı

* Bakıcı performans değerlendirmesi

* Hasta imzası

# **3\. Kullanıcı Akışları**

## **3.1 Temel Akış: Vardiya Başlatma (Check-in)**

Bakıcı Home ekranında aktif hastayı seçer → 'Vardiyayı Başlat' butonuna basar.

| Durum | Sistem Tepkisi |
| :---- | :---- |
| Aktif vardiya yok | Yeni vardiya oluşturulur → buton 'Vardiyayı Bitir'e döner \+ süre sayacı başlar → CaregiverShift güncellenir → Patient/Family App bilgilenir |
| Bu hastada aktif vardiya var | Buton 'Vardiyayı Bitir' olarak görünür (check-in tetiklenmez) |
| Başka hastada aktif vardiya var | Onay popup'ı gösterilir: 'X hastasındaki vardiyan kapanacak. Devam et?' → Onay: eski vardiya auto\_switch ile kapatılır, yeni başlar → İptal: eski vardiya devam eder |

## **3.2 Temel Akış: Vardiya Bitirme (Check-out)**

Bakıcı 'Vardiyayı Bitir' butonuna basar → Bottom sheet açılır.

| Adım | Açıklama |
| :---- | :---- |
| 1 — Opsiyonel not | Serbest metin, max 500 karakter. 'Geç' ile atlanabilir. |
| 2 — Bitir onayı | 'Vardiyayı Bitir' butonu — tıklanınca vardiya kapanır |
| Sonuç | CaregiverShift: shift\_active=false, checked\_out\_at, duration\_minutes set edilir. Patient/Family App bilgilenir. |

## **3.3 Akış Diyagramı (Mermaid — Developer Referansı)**

| *flowchart TD  A\[Home \- Hasta Seçili\] \--\> B{shift\_active?}  B \--\>|Yok| C\[Vardiyayı Başlat butonu \- nötr\]  B \--\>|Bu hastada| D\[Vardiyayı Bitir butonu \- yeşil \+ süre sayacı\]  B \--\>|Başka hastada| E\[Vardiyayı Başlat butonu \+ uyarı ikonu\]  C \--\> F\[Kullanıcı basar\]  F \--\> G\[POST /shifts/checkin\]  G \--\> H\[shift\_active=true, checked\_in\_at set\]  H \--\> D  D \--\> I\[Kullanıcı basar\]  I \--\> J\[Bottom Sheet: Opsiyonel not\]  J \--\> K\[POST /shifts/checkout\]  K \--\> L\[shift\_active=false, duration\_minutes hesapla\]  L \--\> C  E \--\> M\[Kullanıcı basar\]  M \--\> N\[Popup: Mevcut vardiya kapanacak. Devam?\]  N \--\>|Onay| O\[POST /shifts/checkout reason=auto\_switch\]  O \--\> G  N \--\>|İptal| A  L \--\>|24h aşıldıysa| P\[Push Bildirim: Vardiyan 24 saati aştı\]* |
| :---- |

## **3.4 Kritik Akış Kuralları**

* check-in isteği gönderilmeden önce mevcut aktif vardiya kontrolü yapılır — race condition'ı önlemek için DB-level unique constraint birincil güvence mekanizmasıdır.

* auto\_switch senaryosunda: önce eski vardiya kapatılır (check\_out\_reason: auto\_switch), ardından yeni vardiya açılır. Bu iki işlem aynı DB transaction içinde gerçekleştirilir.

* 24 saati aşan vardiya uyarısı: cron job veya scheduled function ile saatlik kontrol önerilir. Bildirim bir kez gönderilir (tekrarlayan spam olmaz).

> [KARAR K3 — 2026-07-22 · ÖNERİLEN DEFAULT, klinik teyit bekliyor] Vardiya kapanış zinciri **V0'a çekildi**: (1) 24s → ilk uyarı (`alert_24h_sent`, mevcut); (2) **36s → ikinci uyarı** (push + in-app); (3) **48s → otomatik kapanış**: `checked_out_at = now()`, `check_out_reason = system_timeout`, **`duration_minutes = NULL`** (gerçek süre bilinmediği için hesaplanmaz — bordro/faturalama bu kayıtları ayrıca ele alır), koordinatör/ajans bağıysa bilgilendirme bildirimi. Saatlik cron zaten mevcut; yalnızca iki eşik eklenir. `system_timeout` enum değeri şemada zaten var (Dictionary §4) — V2 beklemeye gerek yok.

* Çevrimdışı check-in: eylem yerel olarak zaman damgasıyla kuyruklanır. Bağlantı sağlanınca senkronize edilir. UI'da 'Çevrimdışı — senkronize edilecek' göstergesi.

# **4\. Ekran Spesifikasyonları**

## **4.1 Home Ekranı — Vardiya Butonu**

Vardiya butonu Home ekranında hasta seçici bileşeninin hemen altında yer alır. Tüm vardiya durumları bu tek butonun görsel durumuyla iletilir.

| Durum | Buton Etiketi | Görsel | Ek UI |
| :---- | :---- | :---- | :---- |
| Aktif vardiya yok | Vardiyayı Başlat | Nötr / gri | — |
| Bu hastada aktif vardiya | Vardiyayı Bitir | Yeşil arka plan, pulse animasyonu | Süre sayacı: HH:MM (butona bitişik) |
| Başka hastada aktif vardiya | Vardiyayı Başlat | Nötr \+ sarı uyarı ikonu | Tooltip/not: 'X hastasında aktif vardiya var' |

| *Süre sayacı: Aktif vardiya süresini gerçek zamanlı gösterir. Cihaz saatine değil, sunucudan alınan checked\_in\_at timestamp'ine göre hesaplanır; bu şekilde cihaz saati manipülasyonuna karşı korunmuş olur.* |
| :---- |

## **4.2 Check-out Bottom Sheet**

| SHIFT\_CHECKOUT — Vardiya Bitirme — Bottom Sheet |
| :---- |
| **Açılış tetikleyicisi:** 'Vardiyayı Bitir' butonuna basılması |
| **Alan 1 — shift\_note:** Opsiyonel, serbest metin, max 500 karakter, placeholder: 'Vardiya notu ekle... (opsiyonel)' |
| **Karakter sayacı:** Girişin altında: 'X / 500 karakter' göstergesi |
| **Primary CTA:** Vardiyayı Bitir |
| **Secondary CTA:** Geç (notu kaydetmeden bitir) |
| **İptal:** Bottom sheet kapatılır, vardiya devam eder |
| **Doğrulama:** Not opsiyoneldir; 'Geç' ile de bitirilebilir |
| **Analytics:** shift\_checkout { has\_note: bool, note\_length, shift\_duration\_minutes } |

## **4.3 Hasta Geçiş Onay Popup'ı**

| SHIFT\_SWITCH\_CONFIRM — Hasta Geçişi — Onay Popup |
| :---- |
| **Tetikleyici:** Başka hastada aktif vardiyayken yeni hasta için 'Vardiyayı Başlat' basılması |
| **Başlık:** 'Aktif Vardiya Mevcut' |
| **Mesaj:** '{Hasta Adı} hastasındaki vardiyan kapatılacak ve {Yeni Hasta Adı} için yeni vardiya başlayacak. Devam et?' |
| **Primary CTA:** Devam Et |
| **Secondary CTA:** İptal |
| **Onay sonucu:** Auto-switch transaction: eski checkout (reason: auto\_switch) \+ yeni check-in |
| **Analytics:** shift\_switch\_confirmed { previous\_patient\_id, new\_patient\_id, previous\_duration\_minutes } |

## **4.4 Vardiya Geçmişi**

Vardiya geçmişi, Settings veya Home ekranındaki bir 'Geçmiş' bağlantısı üzerinden erişilebilen basit bir listedir.

| SHIFT\_HISTORY — Vardiya Geçmişi |
| :---- |
| **Liste öğesi içeriği:** Tarih | Hasta Adı | Başlangıç \- Bitiş | Süre | Not (varsa, kısaltılmış) |
| **Sıralama:** Kronolojik tersten (en yeni üstte) |
| **Sayfalama:** Son 30 vardiya ilk yüklemede, daha fazlası 'Yükle' ile |
| **Not detayı:** Liste öğesine tıklanınca tam not görünür |
| **Arama / filtre (V1):** Tarihe göre filtre, hastaya göre filtre |
| **Dışa aktarma (V2):** PDF veya CSV export (ücretlendirme kanıtı için) |

# **5\. Veri Modeli**

## **5.1 CaregiverShift Tablosu**

| *Bu tablo Patient App PRD'sinde de tanımlıdır. Sinalytix ekosisteminde ortak bir tablo; yazma yetkisi yalnızca Caregiver App'e, okuma yetkisi Patient App ve Family App'e aittir.* |
| :---- |

| Alan | Tip | Zorunlu | Açıklama |
| :---- | :---- | :---- | :---- |
| shift\_id | uuid | Evet | Primary key |
| caregiver\_id | uuid | Evet | FK → User (Caregiver) |
| patient\_id | uuid | Evet | FK → User (Patient) |
| shift\_active | bool | Evet | true \= aktif vardiya; false \= kapanmış |
| checked\_in\_at | timestamptz | Evet | UTC; cihaz local saati metadata'da |
| checked\_out\_at | timestamptz | Hayır | null → check-out yapıldığında set |
| check\_out\_reason | enum | Hayır | manual | auto\_switch | system\_timeout (V2) | null |
| shift\_note | text | Hayır | Serbest metin, max 500 karakter, V0 |
| shift\_note\_structured | jsonb | Hayır | null; V1'de SBAR-ilhamlı yapılandırılmış not için |
| duration\_minutes | int | Hayır | Hesaplanan: (checked\_out\_at \- checked\_in\_at) / 60; check-out sonrası set |
| timezone\_iana | string | Evet | Bakıcı cihazının IANA timezone kodu (örn: 'America/Toronto') |
| location\_checkin | point | Hayır | null; V2 EVV için ayrılmış |
| alert\_24h\_sent | bool | Evet default false | 24 saat uyarı bildiriminin gönderilip gönderilmediği |
| created\_at | timestamptz | Evet | — |

## **5.2 Veritabanı Kısıtları**

* Partial unique index: CREATE UNIQUE INDEX ON caregiver\_shift (caregiver\_id) WHERE shift\_active \= true; — aynı bakıcı için aynı anda birden fazla aktif vardiyayı DB seviyesinde engeller.

* check\_out\_reason ENUM değerleri: manual (bakıcı kapattı), auto\_switch (hasta geçişinde otomatik), system\_timeout (V2 — 48 saat aşımında sistem kapattı).

* duration\_minutes check-out sırasında computed field olarak yazılır; gerçek zamanlı sorgularda (CURRENT\_TIMESTAMP \- checked\_in\_at) ile hesaplanabilir.

## **5.3 Gerçek Zamanlı Yayın (Realtime)**

Patient App ve Family App, bakıcı durumunu gerçek zamanlı görebilmelidir. CaregiverShift tablosundaki değişiklikler ilgili patient\_id abonelerine yayınlanır.

| Olay | Yayın Alıcıları | Payload |
| :---- | :---- | :---- |
| Check-in (shift\_active: true) | Patient App, Family App (bu patient\_id için) | { caregiver\_id, patient\_id, checked\_in\_at } |
| Check-out (shift\_active: false) | Patient App, Family App (bu patient\_id için) | { caregiver\_id, patient\_id, checked\_out\_at, duration\_minutes } |

| *Gerçek zamanlı güncelleme gecikmesi hedefi: ≤ 2 saniye. Patient App'te bakıcı çağrı butonu bu duruma bağlı olduğundan gecikme doğrudan kullanıcı güvenini etkiler.* |
| :---- |

# **6\. Çevrimdışı Dayanıklılık**

Bakıcılar çoğunlukla hasta evindedir ve bağlantı garantisi yoktur. Check-in/check-out işleminin çevrimdışı çalışabilmesi güvenilirlik için kritiktir.

| Senaryo | Sistem Davranışı | Kullanıcıya Gösterilen |
| :---- | :---- | :---- |
| Check-in — çevrimdışı | Eylem yerel kuyruğa alınır (timestamp: cihaz saati). Bağlantı sağlanınca senkronize edilir. | Buton 'Vardiyayı Bitir'e döner \+ 'Çevrimdışı — senkronize edilecek' göstergesi |
| Check-out — çevrimdışı | Aynı kuyruk mekanizması. Nota eklenir. | Sayaç durur \+ 'Çevrimdışı — senkronize edilecek' göstergesi |
| Senkronizasyon başarısız (kalıcı hata) | Kullanıcıya hata gösterilir; tekrar denemesi istenir. | 'Vardiya kaydedilemedi. Tekrar dene.' \+ Yeniden Dene butonu |
| Çakışma (sunucuda farklı durum) | Sunucu durumu önceliklidir. Yerel kuyruk iptal edilir, UI güncellenir. | Sessiz güncelleme; anormalse kullanıcı bilgilendirilir |

| *Zaman damgası güvenilirliği: Çevrimdışı check-in için cihaz saati kullanılır. Bu, kötüye kullanım riski taşır (cihaz saati değiştirilebilir). V2'de sunucu tarafı EVV doğrulaması bu açığı kapatır. V0'da bu risk kabul edilmiştir; ajans entegrasyonu olmadan ücretlendirme söz konusu değildir.* |
| :---- |

# **7\. Hata Durumları ve Edge Case'ler**

| Senaryo | Kullanıcıya Gösterilen | Sistem Davranışı |
| :---- | :---- | :---- |
| Check-in API hatası (5xx) | 'Vardiya başlatılamadı. Tekrar dene.' | Yeniden Dene butonu; çevrimdışı kuyruğa geç |
| Concurrent check-in (race condition) | Unique constraint hatası yakalanır | Kullanıcıya mevcut durum gösterilir; duplicate oluşmaz |
| Check-out API hatası | 'Vardiya kaydedilemedi. Tekrar dene.' | Vardiya açık kalır; kullanıcı yeniden deneyebilir |
| 24 saat bildirimi gönderilemedi | Sessiz — bir sonraki kontrol döngüsünde tekrar denenir | alert\_24h\_sent false kalır; cron tekrar dener |
| Hasta bağlantısı kopuk iken check-in | Hasta seçici hata gösterir (ilgili PRD) | Geçersiz patient\_id ile shift oluşturulmaz |
| Uygulama çöker — aktif vardiya var | Kullanıcı tekrar açınca aktif vardiya gösterilir, sayaç devam eder | Durum sunucudan yüklenir; local state önemsizleşir |

# **8\. Kabul Kriterleri**

## **8.1 Fonksiyonel**

* Hasta seçiliyken 'Vardiyayı Başlat' butonu görünür ve basınca check-in gerçekleşir.

* Aktif vardiyada süre sayacı HH:MM formatında canlı güncellenir; sunucudan alınan checked\_in\_at baz alınır.

* 'Vardiyayı Bitir' basılınca bottom sheet açılır; not olmadan da bitirilebilir.

* Başka hastada aktif vardiyayken yeni check-in denemesi onay popup'ı açar.

* Onay verilirse: eski vardiya auto\_switch ile kapanır → yeni vardiya başlar (aynı transaction).

* 24 saat aşılınca push bildirimi gönderilir; bildirime tıklanınca doğrudan check-out ekranına gidilir.

* Vardiya geçmişinde tarih, hasta adı, başlangıç/bitiş, süre ve not görünür.

* CaregiverShift.shift\_active değişikliği Patient App ve Family App'e ≤ 2 saniye içinde yansır.

* Çevrimdışı check-in: yerel kuyruğa alınır, bağlantıda senkronize edilir, kullanıcıya çevrimdışı durumu gösterilir.

## **8.2 Teknik / Güvenlik**

* Aynı caregiver\_id için concurrent shift\_active=true: DB partial unique index ile engellenir, uygulama seviyesinde de kontrol edilir.

* Auto-switch: çift write (checkout \+ check-in) atomik transaction içinde; kısmi başarı durumu oluşmamalı.

* Check-in/check-out API yanıt süresi: ≤ 1 saniye (p95, normal bağlantı).

* Vardiya verileri hiçbir koşulda silinmez; soft-delete bile yoktur.

* Farklı patient'a ait shift verileri karşılıklı erişilemez (tenant isolation).

# **9\. Başarı Metrikleri**

| Metrik | Hedef / İzleme | Neden? |
| :---- | :---- | :---- |
| Check-in/check-out başarı oranı | ≥ %99.9 | Bakıcı durumu kritik downstream feature'lar için girdi |
| Patient App'e yansıma süresi | ≤ 2 sn (p95) | Hasta çağrı butonu bu veriye bağlı |
| Günlük aktif bakıcılarda vardiya başlatma oranı | İzleme metriği | Düşükse feature adoption sorunu |
| Ortalama vardiya süresi | İzleme (anomali tespiti) | Aşırı uzun vardiyalar \= check-out unutma veya hata |
| 24 saat timeout bildirimi oranı | Düşük olması beklenir | Yüksekse: UX iyileştirme veya check-out riski |
| Check-out notu bırakma oranı | İzleme | V1 yapılandırılmış nota geçiş kararını etkiler |
| Auto-switch kullanım oranı | İzleme | PSW multi-visit pattern'inin platform kullanımına yansıması |
| Çevrimdışı senkronizasyon başarı oranı | ≥ %99 | Bakıcı deneyimi güvenilirliği |

# **10\. UX ve Tasarım Notları**

* Vardiya butonu Home ekranında her zaman görünür olmalı; herhangi bir hasta seçiliyken erişilebilir.

* Aktif vardiya durumu yeşil renk ve pulse animasyonu ile net şekilde vurgulanır. Bakıcı hangi hastada aktif vardiyası olduğunu tek bakışta anlamalı.

* Süre sayacı büyük ve okunaklı olmalı — bakıcı saatini takip etmek için uygulamaya bakar.

* Bottom sheet check-out notu alanı klavye ile birlikte yukarı kaymalı; CTA hep görünür kalmalı.

* Auto-switch popup metni hasta adlarını içermeli — soyut 'aktif vardiya' mesajı değil.

* Vardiya geçmişi minimal ama bilgi yoğun olmalı: tarih, hasta, süre ilk bakışta okunabilir.

* 24 saat bildirim mesajı: 'Vardiyan 24 saati aştı. Kapatmayı unuttun mu?' — yargılamamalı, yönlendirmeli.

# **11\. Kullanıcı Senaryoları**

## **Senaryo 1 — Sabah vardiyası, tek hasta**

Bakıcı sabah 8:00'de Ayşe Teyze'nin evine gider. Uygulamayı açar, Ayşe Teyze seçili. 'Vardiyayı Başlat' basar. Yeşil buton ve 00:00'dan başlayan sayaç görünür. Öğleden sonra 2:00'de tüm görevler tamamlandı. 'Vardiyayı Bitir' basar. Not ekler: 'Tansiyon normal, öğle ilacı verildi, su içmedi akşam hatırlatılsın.' Bitir. Geçmişte: 8:00–14:00, 6 saat.

## **Senaryo 2 — Çok hastali gün, geçiş senaryosu**

Bakıcı sabah Ayşe Teyze'de vardiya açtı (09:00). Öğleden sonra Mehmet Bey'e geçecek. Hasta seçiciden Mehmet Bey'i seçer, 'Vardiyayı Başlat' basar. Popup: 'Ayşe Teyze'deki vardiyan kapatılacak. Devam et?' — Onaylar. Ayşe'nin vardiyası 12:30'da auto\_switch ile kapanır, Mehmet'in 12:30'da başlar. İki vardiya da geçmişe ayrı satır olarak düşer.

## **Senaryo 3 — Çevrimdışı check-in**

Bakıcı hastanın evine girdiğinde internet yok. 'Vardiyayı Başlat' basar. UI: buton değişir, küçük bir 'çevrimdışı' ikonu görünür. 10 dakika sonra bağlantı sağlanır. Uygulama sessizce senkronize eder, ikon kaybolur. Sunucuda checked\_in\_at \= 09:15 (cihaz saatinden).

## **Senaryo 4 — 24 saat uyarısı**

Bakıcı Cuma akşamı vardiyayı açık unutur. Cumartesi akşamı telefona bildirim gelir: 'Vardiyan 24 saati aştı. Kapatmayı unuttun mu?' Bildirime tıklar, check-out bottom sheet açılır. Not ekler, kapatır.

# **12\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| V1 yapılandırılmış check-out notu: hangi SBAR alanları? Zorunlu mu opsiyonel mi? | Açık | V1 PRD \+ Fizik Tedavi uzmanı görüşü |
| V1 görev konfirmasyonu check-out'ta nasıl entegre olur? (Görev Yönetimi PRD ile koordinasyon) | Açık | Görev Yönetimi PRD sonrası netleşecek |
| Çevrimdışı senkronizasyon çakışması: hangi timestamp öncelikli? (client vs. server) | Açık | Teknik mimari kararı — V0'da client öncelikli |
| 48 saat aşan vardiyalar için otomatik kapanma (system\_timeout): V2 mi V1 mi? | Açık | Ajans entegrasyonu gereksinimine bağlı |
| EVV GPS kaydı: opsiyonel mi zorunlu mu olacak? Ontario özel ajans talepleri? | İzleniyor | V2 kapsamı — mevzuat ve ajans talebi takibi |
| Hasta imzası check-out'ta zorunlu mu? (bazı özel ajans kontratlarda var) | İzleniyor | V2 kapsamı |

*Sinalytix — Gizli ve Özel. Bu doküman geliştirici referansı içindir.*

# 0️⃣ Hasta Seçici \+ Home Screen

**CAREGIVER APP — PRODUCT REQUIREMENTS DOCUMENT**

**Hasta Seçici ve Home Screen**

| Versiyon MVP (V0) | Uygulama Caregiver App | Hedef Pazar Kanada | Konum Bottom Nav — Home sekmesi |
| :---- | :---- | :---- | :---- |

# **1\. Bağlam ve Tasarım Felsefesi**

Hasta Seçici ve Home Screen, Caregiver uygulamasının bilgi mimarisinin merkezidir. Bakıcının her gün onlarca karar aldığı, görevleri yönettiği, vardiyasını takip ettiği ve hastasına ulaştığı tek ekrandır. Tasarım kararlarının klinisyen iş akışı üzerindeki ağırlığı büyüktür.

## **1.1 Çok Hastali Bakıcı Gerçekliği**

PSW ve HCA rolündeki bakıcılar günde ortalama 3–5 farklı hasta ziyareti gerçekleştirir. Her ziyaret bağımsız bir klinik bağlamdır: farklı görevler, farklı ilaçlar, farklı aile dinamikleri. Bu gerçeklik, hasta seçici mekanizmasının istisnai bir özellik değil, günlük temel iş akışı olduğu anlamına gelir.

| *Bağlam karışıklığı riski: Klinik araştırmalar, bakıcılar arası bağlam karışıklığının (yanlış hastanın verisine bakarak aksiyon alma) hasta güvenliği olaylarına yol açabildiğini ortaya koymaktadır. UI'ın her an hangi hastanın bağlamında çalıştığını net göstermesi, bu riski azaltan birincil tasarım gereksinimidir.* |
| :---- |

## **1.2 Bilişsel Yük ve Profesyonel Kullanıcı**

Araştırmalar, sağlık profesyonellerinin %94'ünün kolay navigasyonu kritik bulduğunu ve kötü tasarlanmış navigasyonun bilişsel aşırı yüklenmeyi artırdığını göstermektedir. Bakıcı uygulamasının Home ekranı bu nedenle iki ilkeye uygun tasarlanır:

* Öncelikli bilgi önce: Bakıcının 'hangi hastanın yanındayım, ne yapacağım' sorularını en fazla 2 saniyede yanıtlaması gerekir.

* Bilgi yoğunluğu kabul edilebilir: Hasta uygulamasının aksine, bakıcı uygulaması profesyonel kullanıcı için optimize edilir — daha kompakt düzen, daha fazla bilgi tek ekranda.

## **1.3 PHIPA Veri İzolasyonu Gerekliliği**

PHIPA (Personal Health Information Protection Act) kapsamında her hastanın kişisel sağlık bilgisi (PHI) diğer hastanın verisiyle karışmamalıdır. Hasta seçici yalnızca bir UX kolaylığı değil; aynı zamanda veri izolasyon sınırını uygulayan mekanizmadır. Bakıcı hastanın bağlamını değiştirdiğinde: (1) önceki hastanın tüm verileri ekrandan silinir, (2) yeni hastanın verileri yüklenir. Hiçbir alan yanlış bağlamda gösterilmemelidir.

# **2\. Kapsam ve Kısıtlar**

## **2.1 Kapsam (In Scope)**

### **V0 — MVP**

* Header: logo (sol) \+ bildirim çanı (sağ) — tüm sekmelerde sabit, scroll'da kaybolmaz

* Hasta seçici: tek hasta için statik görünüm; çok hasta için yatay scroll kartları

* Seçili hasta bağlamı: görev listesi, vardiya durumu, aksiyon butonları seçili hastaya bağlı

* Vardiya durum kartı: aktif/pasif gösterimi, süre sayacı, ilgili buton

* Aksiyon butonları: Standart Çağrı \+ Sina (AI Agent) — SOS yok

* Günün görevleri: seçili hastanın bugünkü görev listesi, açık gelir

* Bottom navigation: 3 sekme — Home, Mesajlar, Profil

* Boş durum: hasta yoksa yönlendirici boş durum \+ 'Hasta Bağla' CTA

* Çevrimdışı önbellek: son yüklenen bağlam okunabilir (salt okunur)

### **V1 — Sonraki Sürüm**

* Hasta kartlarında son vardiya bilgisi (örn: 'Son: dün 14:00–18:00')

* Kişiselleştirilmiş karşılama: 'Günaydın, \[bakıcı adı\]' \+ günün özeti

* Bakıcı dashboard: aktif hasta sayısı, bugün tamamlanan görev sayısı

* Hasta sıralama: aktif vardiya önce, sonra alfabetik veya son ziyaret

* Görev öncelik işareti: acil veya süresi geçmiş görev varsa hasta kartında uyarı

### **V2 — İleride**

* Hasta başına özelleştirilmiş widget'lar: bir hastada ilaç saati geri sayımı, diğerinde vital değer

* Çoklu hasta karşılaştırma / özet panosu (ajans kullanımı)

* Sesli bağlam geçişi: 'Sina, Mehmet Bey'e geç'

## **2.2 Kısıtlar (Constraints)**

* Hasta seçici Mesajlar sekmesinde görünmez — mesajlaşma tüm hastalar için ortaktır.

* Bağlam değişikliği anlık olmalı: UI geçiş animasyonu ≤ 300ms, veri yükleme ≤ 1 saniye (cached) / ≤ 3 saniye (fresh).

* Seçili hasta her zaman görünür olmalı: Header veya hasta seçici scroll'da sabit kalır.

* Bakıcı uygulamasında SOS butonu yoktur. Bakıcı 911'i doğrudan arar; platform 911 yönlendirmesi yapmaz.

* Bottom navigation 3 sekmeden oluşur, V0'da artmaz.

* AI Agent (Sina) her zaman seçili hasta bağlamında çalışır; bağlam değişmeden başka hastaya aksiyon yürütemez.

* Bildirim deep-link'leri doğru hasta bağlamına yönlendirmelidir (bkz. Bölüm 6.3).

## **2.3 Non-goals (Kapsam Dışı)**

* Hasta karşılaştırma / ajans panosu (V2+)

* Otomatik hasta sıralama veya AI önceliklendirme (V1+)

* Hastaların konum bazlı sıralanması

* SOS veya 911 yönlendirmesi

# **3\. Navigasyon Mimarisi**

## **3.1 Genel Yapı**

Caregiver uygulaması 3 katmanlı navigasyon mimarisine sahiptir:

| Katman | Mekanizma | Kapsam |
| :---- | :---- | :---- |
| Global | Header (sabit) | Tüm sekmelerde: logo \+ bildirim çanı |
| Birincil | Bottom Navigation (3 sekme) | Home / Mesajlar / Profil — her yerden erişilebilir |
| Bağlamsal | Hasta Seçici (Home \+ alt ekranlar) | Home, Görev Detay, Hasta Profili ekranlarında görünür; Mesajlar'da gizli |

## **3.2 Bottom Navigation Sekme Detayları**

| Sekme | İkon | İçerik | Badge | Not |
| :---- | :---- | :---- | :---- | :---- |
| Home | Ev | Ana ekran (bu PRD) | — | Varsayılan açılış sekmesi |
| Mesajlar | Konuşma balonu | Ortak Inbox (tüm hastalar) | Okunmamış mesaj sayısı | Hasta seçicisinden bağımsız |
| Profil | Kişi | Bakıcı profili \+ Settings erişimi | — | Settings gear ikonu profil içinde |

## **3.3 Header Bileşeni**

| HEADER — Global Header (Tüm Sekmelerde Sabit) |
| :---- |
| **Sol:** Sinalytix logosu veya uygulama adı — tıklanamaz |
| **Sağ:** Çan ikonu — Bildirim Merkezi'ni açar |
| **Badge:** Okunmamış bildirim varsa kırmızı/turuncu sayı badge'i (max: '9+') |
| **Scroll davranışı:** Header sabit kalır; içerik altında kayar |
| **Yükseklik:** Standart platform header yüksekliği; iOS safe area'ya saygılı |

# **4\. Home Ekranı — Bileşen Mimarisi**

## **4.1 Bileşen Hiyerarşisi (Yukarıdan Aşağı)**

| Sıra | Bileşen | Sabit mi? | Açıklama |
| :---- | :---- | :---- | :---- |
| 1 | Header | Evet | Logo \+ Çan ikonu |
| 2 | Hasta Seçici | Evet | Scroll'da sabit kalır; bağlam göstergesi olarak kritik |
| 3 | Vardiya Durum Kartı | Hayır | Scroll edilebilir içeriğin başı |
| 4 | Aksiyon Butonları | Hayır | Standart Çağrı \+ Sina |
| 5 | Günün Görevleri | Hayır | Seçili hastanın task listesi; açık gelir |

| *Tasarım notu: Hasta Seçici'nin scroll'da sabit kalması (sticky), bakıcının kaydırırken hangi hastanın bağlamında olduğunu her an görmesini sağlar. Bu, bağlam karışıklığı riskini azaltan kritik bir tasarım kararıdır.* |
| :---- |

## **4.2 Hasta Seçici — Detaylı Spesifikasyon**

### **Tek Hasta Durumu**

Bakıcının yalnızca bir hastası varken hasta seçici 'static chip' olarak görünür: hasta adı \+ birincil tanı \+ aktif vardiya ikonu (varsa). Geçiş mekanizması gizlenir. Ekstra UI karmaşıklığına gerek yoktur.

### **Çok Hasta Durumu**

Yatay scroll kart listesi. Her kart eşit yükseklikte, hasta adı ve birincil tanı net okunabilir boyutta.

| PATIENT\_CARD — Hasta Kartı Bileşeni (Çok Hasta) |
| :---- |
| **Hasta adı:** Büyük, kalın — en önemli bilgi |
| **Birincil tanı:** Küçük, gri — kısa (max 30 karakter, truncated) |
| **Aktif vardiya göstergesi:** Yeşil dot veya yeşil çerçeve — bu bakıcının aktif vardiyası varsa |
| **Seçili kart:** Belirgin vurgu: border rengi veya arka plan tonu değişir |
| **Okunmamış mesaj göstergesi (V1):** Küçük badge — bu hasta ailesi için okunmamış mesaj varsa |
| **Kart boyutu:** Yeterince büyük — parmak dokunuşu kolaylığı (min 44x44 pt hedef) |
| **Kart sırası (V0):** Bağlantı sırasına göre; V1'de aktif vardiya önce |
| **Son öğe:** '+' kart ikonu: 'Hasta Ekle' — Settings \> Hasta Bağla'ya yönlendirir |

### **Hasta Yok Durumu**

| EMPTY\_STATE\_NO\_PATIENT — Boş Durum — Hasta Yok |
| :---- |
| **Görsel:** Nötr, sıcak illüstrasyon veya ikon |
| **Başlık:** 'Henüz bağlı hastan yok.' |
| **Alt metin:** 'İlk hastanı bağlayarak başla.' |
| **Primary CTA:** 'Hasta Bağla' → QR okutma / 6 haneli kod ekranına |
| **Ton:** Yönlendirici, yargılamayan — yeni bakıcıyı itmeden yönlendirir |

## **4.3 Vardiya Durum Kartı**

Home ekranında hasta seçicinin hemen altında yer alır. Vardiya Yönetimi PRD'siyle doğrudan bağlantılıdır; bu bileşen o PRD'nin UI çıktısıdır.

| Vardiya Durumu | Kart Görünümü | CTA |
| :---- | :---- | :---- |
| Pasif (bu hastada) | 'Vardiyayı Başlat' — nötr arka plan | Vardiyayı Başlat butonu |
| Aktif (bu hastada) | Yeşil arka plan, pulse efekti, HH:MM sayacı | Vardiyayı Bitir butonu |
| Aktif (başka hastada) | Nötr \+ sarı uyarı çizgisi: 'X hastasında aktif vardiya var' | Vardiyayı Başlat (geçiş popup'ı açar) |

## **4.4 Aksiyon Butonları**

İki büyük aksiyon butonu; hasta seçicinin altında, görev listesinin üzerinde yer alır.

| Buton | İkon | Aksiyon | Devre Dışı Koşulu |
| :---- | :---- | :---- | :---- |
| Standart Çağrı | Telefon | Seçili hastayı veya ulaşılabilir aile üyesini arar | Hasta ve aile kayıtlı ulaşılabilir kişi yoksa soluk \+ 'Ulaşılabilir kişi yok' notu |
| Sina (AI Agent) | Mikrofon | Voice modal açılır; aktif seçili hasta bağlamında çalışır | Hasta bağlı değilse devre dışı |

| *Neden SOS yok? Bakıcı uygulamasında SOS butonu yer almaz. Bir acil durumda bakıcı doğrudan 911'i arar. Platforma 911 yönlendirme mekanizması eklemek hem regülasyon (SaMD sınırı) hem de güvenlik riski yaratır — doğru kurum her zaman 911'dir. Bu karar değişmez.* |
| :---- |

> [KARAR K1 — 2026-07-22 · ÖNERİLEN DEFAULT, klinik teyit bekliyor] Lone-worker güvenliği kademeli kapatılır: **V0** = K3'teki 24s/36s/48s uyarı-kapanış zinciri + ajans bağlı bakıcılarda `system_timeout` kapanışının **koordinatöre bildirimi** (yeni tablo yok; mevcut `Notification` + `coordinator` rolü, B8). **V1** = kaçırılmış check-out eskalasyonu (planlanan bitişten X saat sonra check-out yoksa koordinatöre `caregiver_checkout` uyarısı) + bakıcı kişisel panik akışı — kapsam rezervasyonu **PRD 08** olarak ayrılmıştır (bkz. PRD 08 bölümü). Hasta SOS'u ile ayrı tutulur; klinik karar davranışı yoktur (SaMD-nötr).

## **4.5 Günün Görevleri Bölümü**

Home ekranının ana içerik alanı. Görev Yönetimi PRD'siyle doğrudan bağlantılıdır; bu bileşen o PRD'nin özet çıktısıdır.

| TODAYS\_TASKS\_WIDGET — Günün Görevleri Widget |
| :---- |
| **Header:** '\[Hasta adı\] — Bugünün Görevleri' |
| **İlerleme göstergesi:** '3/7 tamamlandı' — progres bar veya metin |
| **Liste içeriği:** Bugünkü görevler: todo / done / skipped; Görev Yönetimi PRD spesifikasyonuna göre |
| **Hasta değişikliğinde:** Liste anında temizlenir, yeni hastanın görevleri yüklenir (loading indicator) |
| **Görev yok durumu:** 'Bugün \[hasta adı\] için görev yok.' \+ 'Görev Ekle' CTA |
| **'Tümünü Gör' linki:** Görev Yönetimi tam ekranına gider |
| **Görev ekleme:** '+' butonu — Görev Yönetimi PRD'deki ekleme formunu açar |

# **5\. Scroll ve Düzen Davranışları**

## **5.1 Sabit (Sticky) Elemanlar**

| Eleman | Scroll Davranışı | Gerekçe |
| :---- | :---- | :---- |
| Header | Her zaman sabit | Global navigasyon (çan, logo) her an erişilebilir |
| Hasta Seçici | Sabit (sticky) | Bağlam göstergesi — hangi hastada olduğu her an görülmeli |
| Vardiya Kartı | Scroll edilir | Görev listesine alan açmak için |
| Aksiyon Butonları | Scroll edilir (V0) — V1'de sticky değerlendirilebilir | Bakıcı perspektifinde görev listesi daha kritik |
| Görev Listesi | Scroll edilir | Ana içerik |
| Bottom Navigation | Her zaman sabit | Sekme geçişi her an erişilebilir |

## **5.2 Bağlam Geçişi Performansı**

Hasta geçişi sırasında kullanıcı deneyimi kesintisiz hissettirmelidir. Geçiş gecikmeleri bağlam karışıklığı riskini artırır.

| Aşama | Hedef Süre | Teknik Yaklaşım |
| :---- | :---- | :---- |
| UI animasyonu (kart seçim geri bildirimi) | ≤ 300ms | Anlık highlight, optimistic UI |
| Önbellek verisi yükleme | ≤ 500ms | Local cache'den render; arka planda refresh |
| Güncel veri yükleme | ≤ 2 saniye | API call; skeleton loader gösterilir |
| Çevrimdışı durum | Önbellekten anında | Çevrimdışı banner \+ 'Son güncelleme: X dakika önce' |

# **6\. Özel Durumlar ve Edge Case'ler**

## **6.1 Tüm Boş Durumlar**

| Durum | Gösterilen | CTA |
| :---- | :---- | :---- |
| Hasta yok | 'Henüz bağlı hastan yok.' | Hasta Bağla |
| Hasta seçili, görev yok | 'Bugün \[isim\] için görev yok.' | Görev Ekle |
| Vardiya pasif | 'Vardiyayı Başlat' kartı görünür | Vardiyayı Başlat |
| Standart çağrı için ulaşılabilir kişi yok | Buton soluk \+ not | — |
| Çevrimdışı durum | Önbellekten içerik \+ çevrimdışı banner | — |
| Veri yükleme hatası | 'İçerik yüklenemedi.' \+ Yeniden Dene | Yeniden Dene |

## **6.2 Çevrimdışı Durum**

* Home ekranı son başarılı yüklemenin önbelleğini gösterir.

* Ekranda küçük çevrimdışı banner: 'Çevrimdışı — Son güncelleme: X dakika önce'

* Görev tamamlama gibi yazma işlemleri çevrimdışıyken kuyruğa alınır (Görev Yönetimi PRD koordinasyonu).

* Hasta seçici önbellekten çalışır; yeni hasta verisi çevrimdışıyken yüklenemez (loading indicator \+ hata mesajı).

## **6.3 Bildirim Deep-Link Yönlendirmesi**

Push bildirimleri veya bildirim merkezi öğeleri tıklandığında doğru hasta bağlamına yönlendirilmelidir.

| Bildirim Tipi | Deep-link Davranışı |
| :---- | :---- |
| Görev hatırlatıcısı (hasta X) | Home'a git \+ X hastasını seç \+ görev listesi aç |
| Yeni mesaj (hasta X ailesi) | Mesajlar sekmesine git \+ X hasta konuşmasına aç |
| Vardiya uyarısı (24h) | Home'a git \+ aktif hasta seçili \+ checkout bottom sheet aç |
| Genel bildirim | Bildirim merkezi panelini aç |

| *Kritik: Bildirim deep-link'i hasta\_id içermelidir. Uygulama açıkken: hasta seçici güncellenir \+ ilgili sekme aktive edilir. Uygulama kapalıyken: açılır \+ doğru hasta bağlamına götürülür. Yanlış bağlamda açılan bildirim, bağlam karışıklığı riskinin en yüksek olduğu senaryodur.* |
| :---- |

# **7\. Veri ve Performans Gereksinimleri**

## **7.1 Home Ekranı Veri Bağımlılıkları**

| Bileşen | Veri Kaynağı | Gerçek Zamanlı mı? | Önbellek Politikası |
| :---- | :---- | :---- | :---- |
| Hasta Seçici — kart listesi | CaregiverProfile.linked\_patients | Hayır (düşük değişim) | 5 dakika TTL |
| Vardiya Durum Kartı | CaregiverShift (shift\_active) | Evet — realtime subscription | Anlık |
| Günün Görevleri | CareTaskOccurrence (bugün, seçili hasta) | Evet — realtime subscription | 30 saniye TTL; realtime patch |
| Bildirim badge | NotificationCenter.unread\_count | Evet — realtime subscription | Anlık |
| Mesaj badge | Inbox.unread\_count (tüm hastalar) | Evet — realtime subscription | Anlık |

## **7.2 Hasta Bağlamı Yüklenirken Gereken API Çağrıları**

| Çağrı | Öncelik | Açıklama |
| :---- | :---- | :---- |
| GET /patients/{id}/tasks?date=today | Kritik | Görev listesi |
| GET /patients/{id}/shifts/active | Kritik | Vardiya durumu |
| GET /patients/{id}/profile/summary | Normal | Hasta adı, tanı (kart için) |
| GET /patients/{id}/contacts | Normal | Standart çağrı için ulaşılabilir kişi |

# **8\. Kabul Kriterleri**

## **8.1 Navigasyon**

* Uygulama açılınca Home ekranı varsayılan sekme olarak gelir.

* Bottom navigation Home, Mesajlar, Profil sekmeleri arasında sorunsuz çalışır.

* Header tüm sekmelerde ve Home scroll edilirken sabit kalır.

* Profil sekmesinde gear ikonu tıklanınca Settings açılır.

* Mesajlar sekmesinde okunmamış mesaj varsa badge gösterilir.

* Çan ikonunda okunmamış bildirim varsa badge gösterilir.

## **8.2 Hasta Seçici**

* Tek hasta varken static chip gösterilir; kart scroll mekanizması gizlenir.

* Birden fazla hasta varken yatay scroll kartlar görünür; seçili kart vurgulanır.

* Hasta değiştirildiğinde görev listesi, vardiya kartı ve aksiyon butonları seçilen hasta bağlamına güncellenir.

* Mesajlar sekmesinde hasta seçici görünmez.

* Hasta yokken boş durum mesajı ve 'Hasta Bağla' CTA gösterilir.

* Seçili hastanın adı her an görünürdür (scroll'da da).

* Bağlam geçişi UI animasyonu ≤ 300ms; önbellekli içerik ≤ 500ms; güncel veri ≤ 2 saniye.

## **8.3 Aksiyon Butonları**

* Standart Çağrı butonu seçili hasta bağlamında çalışır; ulaşılabilir kişi yoksa devre dışı \+ not gösterilir.

* Sina butonu tıklanınca Voice Modal açılır (AI Agent PRD'sine göre).

* SOS butonu hiçbir koşulda görünmez.

## **8.4 Veri İzolasyonu (PHIPA)**

* Hasta bağlamı değiştirildiğinde önceki hastanın tüm verileri ekrandan kaldırılır.

* Hiçbir bileşen farklı hastanın verisini karışık göstermez.

* Deep-link yönlendirmesi her zaman doğru hasta bağlamına götürür.

# **9\. Başarı Metrikleri**

| Metrik | Hedef | Neden? |
| :---- | :---- | :---- |
| Home ekranı yükleme süresi (ilk açılış) | ≤ 2 saniye | Günde defalarca açılan ekran |
| Hasta bağlamı geçiş süresi | ≤ 500ms (cached) / ≤ 2sn (fresh) | Bakıcı günde 3–5 kez geçiş yapar |
| Yanlış hasta bağlamında aksiyon (hata oranı) | İzleme — hedef: sıfır | Hasta güvenliği riski |
| Bottom nav sekme kullanım dağılımı | İzleme | Feature kullanım dengesini anlamak için |
| Home ekranı crash oranı | ≤ %0.5 | Kritik günlük kullanım ekranı |
| Boş durum CTA dönüşüm oranı | ≥ %60 | 'Hasta Bağla' CTA etkinliği |

# **10\. UX ve Tasarım Notları**

* Hasta seçici kartları parmak dokunuşu için yeterince büyük olmalı (min 44x44 pt touch target).

* Seçili hasta vurgusu net ve tutarlı olmalı — renk veya border yeterince belirgin.

* Aktif vardiyalı hasta kartında yeşil görsel sinyal (dot veya border) hem seçici kartında hem vardiya kartında tutarlı olmalı.

* Bakıcı uygulaması 'profesyonel' ton: bilgi yoğunluğu hasta uygulamasından yüksek olabilir; büyük font, geniş boşluk gereksinimleri daha az.

* Çevrimdışı banner dikkat çekici ama agresif olmamalı — bakıcıyı stres etmeden durumu iletmeli.

* Loading skeleton'lar kullanılmalı — boş alan yerine içeriğin yerini işaret eden yapı.

* Hasta ismi truncation'da '...' ile kesilmeli; tam isim tooltip veya tıklamayla görünebilmeli.

# **11\. Kullanıcı Senaryoları**

## **Senaryo 1 — Tek hasta, sabah açılış**

Bakıcı uygulamayı açar. Tek hastası Ayşe Teyze otomatik seçili — hasta seçici statik chip olarak görünür. Vardiya kartı pasif. 'Vardiyayı Başlat'a basar. Günün görev listesi gözükür: 7 görev, 0/7 tamamlandı.

## **Senaryo 2 — Üç hasta, gün içi bağlam geçişi**

Bakıcının 3 hastası var: Ayşe Teyze (aktif vardiya — yeşil dot), Mehmet Bey, Fatma Hanım. Öğleden sonra Mehmet'e geçmek için kartına tıklar. Vardiya geçiş popup'ı gelir (Vardiya Yönetimi PRD). Onaylar. Ekran Mehmet'in görevlerini ve vardiya durumunu yükler. Hasta seçicide Mehmet'in kartı vurgulu.

## **Senaryo 3 — Bildirim deep-link**

Bakıcı telefona bildirim alır: 'Ayşe Teyze — İlaç hatırlatıcısı'. Bildirime tıklar. Uygulama açılır, hasta seçici Ayşe Teyze'yi seçer, görev listesi ilaç görevi vurgulu açılır.

## **Senaryo 4 — Çevrimdışı kullanım**

Bakıcı hastanın evindeyken internet kesilir. Home ekranı önbellekten yüklenir, 'Çevrimdışı' banner görünür. Görevleri görebilir, tamamlama yapabilir (kuyruklanır). Hasta değiştiremez (yeni hasta verisi yüklenemez). Bağlantı sağlanınca kuyruklanmış aksiyonlar senkronize edilir.

# **12\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| Hasta seçici UI: horizontal scroll card mi, dropdown mi? (tasarım kararı) | Açık | UX tasarım aşamasında kararlaştırılacak |
| Aksiyon butonları sticky mi? V0'da scroll edilir olarak bırakılsın mı? | Açık | UX tasarım aşamasında — bakıcı feedback'i ile şekillenebilir |
| V1 hasta kartı okunmamış mesaj badge'i: Mesajlar sekmesinden bağımsız mı yoksa aynı sayaç mı? | Açık | Mesajlaşma PRD ile koordinasyon |
| Çevrimdışı mod: hangi yazma işlemleri kuyruğa alınabilir? (Görev tamamlama — evet; yeni görev ekleme — tartışmalı) | Açık | Görev Yönetimi PRD ile koordinasyon |
| Deep-link şeması: universal link mi, custom scheme mi? | Açık | Teknik mimari kararı |

*Sinalytix — Gizli ve Özel. Bu doküman geliştirici referansı içindir.*

# 0️⃣ Görev Yönetimi

**CAREGIVER APP — PRODUCT REQUIREMENTS DOCUMENT**

**Görev Yönetimi**

| Versiyon MVP (V0) | Uygulama Caregiver App | Hedef Pazar Kanada (Ontario) | Konum Home — hasta kontekstinde |
| :---- | :---- | :---- | :---- |

# **1\. Bağlam ve Klinik Önem**

Görev yönetimi, evde bakım ekosisteminin operasyonel kalbidir. Hasta, aile ve bakıcı aynı bakım planını paylaşır; herhangi birinin yaptığı değişiklik diğerlerine anında yansır. Bakıcı perspektifinden bu özellik iki kritik rol taşır: günlük bakım planını görüntülemek ve yürütmek, aynı zamanda kendi gözlemlerine göre yeni görevler planlamak.

## **1.1 Evde Bakım Görev Taksonomisi**

Evde bakım literatüründe görevler iki ana kategoriye ayrılır: Temel Günlük Yaşam Aktiviteleri (ADL — Activities of Daily Living) ve Araçsal Günlük Yaşam Aktiviteleri (IADL — Instrumental Activities of Daily Living). Platform bu ayrımı V0'da görev şablonu olarak desteklemez; ancak tasarım kararları bu gerçekliği yansıtmalıdır.

| Kategori | Alt Kategori | Örnek Görevler | Bakıcı Notu |
| :---- | :---- | :---- | :---- |
| ADL | Kişisel hijyen | Banyo, diş bakımı, saç bakımı, tırnak bakımı | PSW/HCA yetkisi içinde |
| ADL | Beslenme | Öğün hazırlama, yemek yardımı, sıvı takibi | PSW/HCA yetkisi içinde |
| ADL | Mobilite | Transfer, yürüyüş, pozisyon değiştirme | PSW/HCA; RPN/RN daha karmaşık |
| ADL | Giyinme | Giyinme/soyunma yardımı | PSW/HCA yetkisi içinde |
| ADL | İlaç | Hatırlatma, dozaj kutusundan verme | Rol sınırına göre — bkz. Bölüm 1.2 |
| ADL | Vital takip | Tansiyon, nabız, ağırlık, ateş | RPN/RN; PSW sadece ölçer, yorum yapmaz |
| IADL | Ev yönetimi | Temizlik, çamaşır, alışveriş | PSW/HCA yetkisi içinde |
| IADL | Sosyal katılım | Egzersiz, aktivite, sohbet | PSW/HCA yetkisi içinde |
| IADL | Randevu & koordinasyon | Doktor randevusu, ilaç yenileme | Bakıcı desteğiyle |

## **1.2 Kritik Nüans: İlaç Yardımı vs. İlaç Uygulaması**

| *Bu ayrım Ontario hukuku ve RHPA (Regulated Health Professions Act) açısından kritiktir. Sinalytix platformu bu sınırın yanlış anlaşılmasına zemin hazırlamamalıdır.* |
| :---- |

Ontario'da PSW ve HCA'nın ilaç konusundaki yetkisi yalnızca 'yardım' (assistance) seviyesindedir; 'uygulama' (administration) değildir. Bu ayrım şu şekilde özetlenebilir:

| İzin verilen (PSW/HCA) | İzin verilmeyen (PSW/HCA) | RPN/RN Yetkisi |
| :---- | :---- | :---- |
| Oral tablet/sıvı, topikal, göz/kulak/burun damlası, transdermal yama — yalnızca dozaj kutusundan veya hazırlanmış formdan | Enjeksiyon (insülin dahil), inhalasyon (oksijen), kontrollü madde (narkotik, opioid) | Tüm ilaç uygulaması; kontrollü madde; enjeksiyon; IV |

Platforma yansıması: Bir PSW 'ilacını verdim' dediğinde ActivityLog'a yazılan metin 'medication\_assistance\_completed' olmalıdır; 'medication\_administered' değil. Bu ayrım yasal sorumluluk açısından kritiktir. UI'da da 'İlaç Yardımı Tamamlandı' kullanılmalı.

| *Uyarı: Platform ilaç görevinde hangi ilacın, hangi dozun, hangi saatte verildiğini kullanıcı beyanına dayanarak loglar. Klinisyen kararı ve doğrulama platformun sorumluluğunda değildir. Bu bilgi aile ve bakıcı koordinasyonu için saklanır; klinik kayıt olarak yorumlanamaz. Bu sınır her medication task tamamlamasında açık olmalıdır.* |
| :---- |

## **1.3 Dijital MAR (Medication Administration Record) Bağlamı**

Evde bakım yazılımlarında ilaç görevlerinin dijital takibi, kağıt MAR'ın (Medication Administration Record) yerini almaktadır. Sinalytix'in medication subtype görevleri bu amaca hizmet eder; ancak gerçek bir MAR standardını karşılamamaktadır (V0'da). V1'de medication task'lerinin tarihsel listesi, bir bakıcının kimler için hangi ilaçlara yardım ettiğini gösteren aile raporu olarak sunulabilir.

## **1.4 Çok Aktörlü Bakım Planı**

Hasta, aile ve bakıcı aynı görev havuzunu kullanır. Her aktörün görev değişikliği diğerlerine anlık yansır. Bu tasarım; bakım koordinasyonu açısından güçlü olmakla birlikte, conflict resolution ve actor attribution konularında dikkatli bir yaklaşım gerektirir.

# **2\. Kapsam ve Kısıtlar**

## **2.1 Kapsam (In Scope)**

### **V0 — MVP**

* Seçili hastanın bugünkü görev listesini görüntüleme (todo / done / skipped)

* Görev tipleri: one-time, recurring, counter

* Görev subtipleri: standard, medication

* Bakıcı aksiyonları: Tamamla (normal), \+1 (counter), Manuel Skip

* 5 saniye Undo penceresi — tamamlama ve counter \+1 için

* Görev CRUD: Ekle / Düzenle / Sil (soft delete) — seçili hasta için

* created\_by attribution: her görev satırında kim ekledi görünür

* Actor logging: her tamamlama/skip ActivityLog'a caregiver aktörüyle yazılır

* Medication subtype task tamamlamada: 'İlaç Yardımı Tamamlandı' etiketi \+ actor log

* Eşzamanlı güncelleme: bakıcının aksiyonu hasta ve aile uygulamasına ≤ 2 sn yansır

### **V1 — Sonraki Sürüm**

* Gün dilimleri: Sabah / Öğlen / Akşam / Gece gruplama

* Takvim görünümü: bakıcının tüm hastalarını kapsayan ajanda

* Task detayı: uzun açıklama, ek notlar, dosya eklentisi

* Skip reason: neden atlandığı seçimi (hasta reddetti / uyuyor / tamamlanamadı vb.)

* Sesli not: task tamamlamaya sesli gözlem ekleme

* Medication task geçmişi raporu: aile için özet görünüm

### **V2 — İleride**

* Sağlık profesyoneli uygulamasıyla entegrasyon: doktor bakım planından otomatik görev

* AI task önerisi: bakım geçmişine göre önerilen görevler

* Task breakdown: karmaşık görevi alt adımlara bölme

## **2.2 Kısıtlar (Constraints)**

* Bakıcı yalnızca seçili hastanın görevlerini görür ve yönetir. Hasta seçimi değişmeden başka hastanın görevlerine erişilemez (PHIPA izolasyonu).

* Görev listesi Patient App'teki ile aynı veri kaynağından beslenir (CareTask, CareTaskOccurrence, ActivityLog tabloları ortak).

* V0 conflict resolution: last-write-wins \+ activity log. Aynı task'i aynı anda birden fazla aktör tamamlarsa son yazılan geçerli olur; tüm aksiyonlar loglanır.

* Platform ilaç görevini 'medication\_assistance' olarak loglar; 'medication\_administration' değil. Bu ayrım UI metinlerine de yansır.

* Platform hiçbir ilaç görevinde dozaj, frekans veya ilaç etkileşimi yorumu yapmaz.

* Soft delete: görevler fiziksel olarak silinmez; deleted\_at \+ deleted\_by ile işaretlenir.

* Tamamlama aksiyonu geri alınamaz (undo penceresi kapandıktan sonra). Yanlışlıkla tamamlanan görevler için Activity Log'dan geriye dönük görülebilir; sadece admin/HC professional düzeltebilir (V1+).

## **2.3 Non-goals (Kapsam Dışı)**

* Çapraz hasta görev karşılaştırması

* Gamification, skor, rozet

* Tedavi veya ilaç önerisi — kesinlikle kapsam dışı, regülasyon sınırı

* Doktor reçetesi veya bakım planı oluşturma

* Otomatik görev üretimi (V2)

* İlaç doz hesaplama veya uyumluluk takibi

# **3\. Actor İzin Matrisi**

Görevler üç aktör tarafından yönetilir: Hasta, Aile ve Bakıcı. Her aktörün yapabileceği işlemler tanımlıdır.

| İşlem | Hasta | Aile | Bakıcı | Not |
| :---- | :---- | :---- | :---- | :---- |
| Görev görüntüleme | Evet | Evet | Evet (seçili hasta) | — |
| Görev oluşturma | Evet | Evet | Evet (seçili hasta için) | Bakıcı yalnızca aktif seçili hastaya ekler |
| Görev düzenleme | Kendi eklediği | Kendi eklediği | Kendi eklediği | V0'da; V1'de ajans yetkisi eklenebilir |
| Görev silme (soft) | Kendi eklediği | Kendi eklediği | Kendi eklediği | — |
| Görev tamamlama | Evet | Hayır (V0) | Evet | Actor loglanır · [RECONCILED: B1] — Aile V0'da görev tamamlayamaz; yalnız ekler/görür |
| Görev skip | Evet | Evet | Evet | Actor loglanır; V1'de skip reason |
| Undo (5 sn) | Evet | Evet | Evet | Pencere kapandıktan sonra geri alınamaz |
| Counter \+1 | Evet | Evet | Evet | — |

# **4\. Görev Tipi ve Subtype Spesifikasyonları**

## **4.1 Görev Tipleri**

| Tip | Açıklama | Örnek Kullanım | Tamamlanma Mantığı |
| :---- | :---- | :---- | :---- |
| one-time | Tek seferlik görev; belirtilen tarihte bir kez görünür | Doktor randevusu, kan testi, özel aktivite | Tamamla veya skip → o gün biter |
| recurring | Düzenli tekrarlayan görev; her gün veya belirli günlerde görünür | Sabah ilacı, günlük egzersiz, haftalık banyo | Her occurrence bağımsız tamamlanır |
| counter | Günlük sayaç hedefi; \+1 ile ilerlenir | Sıvı alımı (8/8 bardak), egzersiz tekrarı (10/10) | Hedefe ulaşılınca otomatik done |

## **4.2 Görev Subtipleri**

| Subtype | Açıklama | UI Farkı | ActivityLog Farkı |
| :---- | :---- | :---- | :---- |
| standard | Genel bakım görevi | Standart ikon | completed\_by\_actor\_type: caregiver |
| medication | İlaç yardımı içeren görev | İlaç ikonu (hasta uygulamasıyla tutarlı) | medication\_assistance\_completed: caregiver \+ zaman damgası |

| *Medication subtype UI metni: Bakıcı bir medication görevini tamamladığında butonda ve activity log'da görünen metin 'İlaç Yardımı Tamamlandı' olmalıdır; 'İlaç Verildi' veya 'Medication Administered' değil. Bu ayrım Ontario RHPA kapsamında hukuki önem taşır.* |
| :---- |

## **4.3 Counter Görevi — Klinik Kullanım Örnekleri**

Counter görevleri özellikle evde bakımda yüksek klinik öneme sahip iki alanda kullanılır:

| Kullanım | Örnek Hedef | Klinik Önemi |
| :---- | :---- | :---- |
| Sıvı alımı takibi | 8 bardak / gün | Dehidrasyon riski yüksek yaşlı hastalarda kritik; böbrek fonksiyon sorunlarında izleme |
| Pozisyon değiştirme | Her 2 saatte 1 kez (12 / 24 saat) | Bası yarası (pressure ulcer) önleme; uzun süre yatağa bağlı hastalarda standart protokol |
| Egzersiz tekrarı | 10 tekrar / gün | Fizyoterapi planına göre belirlenmiş egzersiz protokolü |
| Derin nefes egzersizi | 5 seans / gün | Post-operatif veya solunum kısıtlılığı olan hastalarda aspirasyon önleme |

# **5\. Kullanıcı Akışları**

## **5.1 Görev Görüntüleme**

Hasta seçilir → Home'da 'Günün Görevleri' otomatik açık gelir → Liste: todo / done / skipped grupları → Her satır: başlık \+ created\_by label \+ subtype ikonu \+ aksiyon butonu.

## **5.2 Görev Tamamlama — Normal Task**

| Adım | Açıklama |
| :---- | :---- |
| 1 | Bakıcı 'Tamamla' butonuna basar |
| 2 | Optimistic UI: görev anında 'done' görünür; 5 saniyelik Undo bar beliriyor |
| 3a — Undo basılırsa | Görev 'todo'ya döner; ActivityLog'a undo\_by: caregiver yazılır; API çağrısı iptal edilir veya geri alınır |
| 3b — 5 sn geçerse | ActivityLog'a completed\_by: caregiver \+ completed\_at yazılır; diğer actorların ekranına yansır |

## **5.3 Görev Tamamlama — Medication Task**

Normal akışın aynısı \+ ek adım: 'İlaç Yardımı Tamamlandı' etiketi ActivityLog'a ek olarak yazılır. UI'da tamamlama sonrası kısa konfirmasyon: 'İlaç yardımı kaydedildi.'

| *Medication task tamamlamasında 5 saniyelik Undo penceresi medication\_assistance için de geçerlidir. Undo basılırsa log geri alınır. Bu önemlidir çünkü yanlışlıkla tamamlanan ilaç görevi aile bildirimini tetikleyebilir.* |
| :---- |

## **5.4 Counter Görevi (+1)**

| Adım | Açıklama |
| :---- | :---- |
| 1 | Bakıcı '+1' butonuna basar → sayaç 1 artar (örn: 3/8 → 4/8) |
| 2 | 5 saniyelik Undo bar → Undo basılırsa sayaç geri gider |
| 3 — Hedefe ulaşıldığında | Otomatik 'done' → görev yeşile döner → 5 saniyelik Undo |
| Log | Her \+1: ActivityLog'a counter\_increment: caregiver \+ değer yazılır |

## **5.5 Manuel Skip**

| Adım | Açıklama |
| :---- | :---- |
| 1 | Bakıcı görev satırında skip aksiyonunu seçer (swipe veya üç nokta menüsü) |
| 2 | Görev 'skipped' olarak işaretlenir |
| V1 ek | Skip reason seçimi: 'Hasta reddetti' / 'Uyuyordu' / 'Tamamlanamadı' / 'Diğer' |
| Log | ActivityLog'a skipped\_by: caregiver \+ timestamp yazılır |

## **5.6 Görev Ekleme Formu**

| TASK\_ADD\_FORM — Görev Ekleme Formu |
| :---- |
| **Açılış:** '+' butonu veya FAB → bottom sheet olarak açılır |
| **Alan 1 — Başlık:** Zorunlu, string, max 100 karakter |
| **Alan 2 — Tip:** Zorunlu; one-time / recurring / counter |
| **Alan 3 — Subtype:** Zorunlu; standard / medication |
| **Alan 4a — One-time ise:** Tarih (zorunlu) \+ Saat (opsiyonel) |
| **Alan 4b — Recurring ise:** Günlük mi / Haftanın hangi günleri (çoklu seçim) |
| **Alan 4c — Counter ise:** Günlük hedef sayı (zorunlu, min 1\) |
| **Alan 5 — Notlar (V1):** Opsiyonel açıklama alanı |
| **Kaydet sonucu:** Görev tüm bağlı actorların listesine anlık düşer; created\_by: caregiver |
| **Validasyon:** Başlık boşsa / tip seçilmemişse kaydet disabled |

## **5.7 Akış Diyagramı (Mermaid — Developer Referansı)**

| *flowchart TD  A\[Home \- Hasta Seçili\] \--\> B\[Günün Görevleri\]  B \--\> C{Görev Tipi}  C \--\>|Normal| D\[Tamamla butonu\]  C \--\>|Counter| E\[+1 butonu\]  C \--\>|Skip| F\[Skip aksiyonu\]  D \--\> G\[Optimistic done \+ 5sn Undo bar\]  G \--\>|Undo| H\[todo'ya geri dön \+ undo log\]  G \--\>|5sn geçer| I\[ActivityLog: completed\_by caregiver\]  E \--\> J\[Sayaç \+1 \+ 5sn Undo\]  J \--\>|Hedefe ulaştı| K\[Otomatik done \+ Undo\]  F \--\> L\[ActivityLog: skipped\_by caregiver\]  I \--\> M\[Realtime: Hasta \+ Aile ekranına yansır ≤2sn\]  L \--\> M  B \--\> N\[+ butonu\]  N \--\> O\[Görev Ekleme Formu\]  O \--\> P\[Kaydet → CareTaskOccurrence oluştur\]  P \--\> M* |
| :---- |

# **6\. Veri Modeli**

## **6.1 Tablolar**

Bakıcı uygulaması Hasta PRD'sindeki tabloların aynısını kullanır. Bakıcı bu tablolara tam okuma ve yazma yetkisine sahiptir (seçili hasta kapsamında).

| Tablo | Bakıcı Yetkisi | Kullanım |
| :---- | :---- | :---- |
| CareTask | Okuma \+ Yazma (CRUD) | Görev şablonu; recurring kuralları, başlık, tip, subtype |
| CareTaskOccurrence | Okuma \+ Yazma | Günlük görev instance'ı; status (todo/done/skipped), assigned\_date |
| ActivityLog | Okuma \+ Yazma (insert only) | Her aksiyon kaydı; actor, timestamp, aksiyon tipi |

> [RECONCILED: A1] `TaskDefinition`→`CareTask`, `TaskOccurrence`→`CareTaskOccurrence` (kanonik Dictionary §3). `CareTaskOccurrence`'a tamamlama alanları eklendi; tamamlama artık yalnız ActivityLog'da değil, occurrence satırında da tutulur:
>
> | Alan | Tip | Açıklama |
> | :---- | :---- | :---- |
> | completed\_by | uuid NULL | Görevi tamamlayan kullanıcı (occurrence üzerinde) |
> | completed\_by\_actor\_type | enum {patient\|caregiver\|system\|agent} | Tamamlayan aktör tipi *(NOT `family` — B1)* |

## **6.2 ActivityLog — Bakıcıya Özel Alanlar**

| Alan | Değer (Bakıcı) | Açıklama |
| :---- | :---- | :---- |
| actor\_type | caregiver | Kim yaptı |
| actor\_id | caregiver user\_id | — |
| action\_type | task\_completed / task\_skipped / counter\_increment / task\_created / task\_deleted / task\_undo | Aksiyon tipi |
| medication\_context | medication\_assistance\_completed (subtype=medication ise) | PSW/HCA rol sınırı için doğru terminoloji |
| undo\_of | ActivityLog ID (undo ise) | Hangi aksiyonu geri aldı |
| shift\_id | UUID (aktif vardiya varsa) | Hangi vardiya sırasında yapıldı; V1 raporlama için |
| patient\_id | UUID | Hangi hastanın görevi |
| created\_at | timestamptz | UTC |

## **6.3 Conflict Resolution**

V0 politikası: last-write-wins. Aynı task'i aynı anda birden fazla aktör tamamlarsa son gelen API isteği geçer. ActivityLog tüm aksiyonları kaydeder — çakışma geçmişe dönük izlenebilir. Gerçek çakışma ihtimali düşüktür: bakıcı zaten hasta yanındayken hasta telefonu kullanmaz.

# **7\. Ekran Spesifikasyonları**

## **7.1 Görev Listesi Satırı**

| TASK\_ROW — Görev Listesi Satırı |
| :---- |
| **Sol — ikon/checkbox:** Subtype ikonu (medication için özel ikon) \+ durum göstergesi (todo: boş, done: ✓, skipped: —) |
| **Orta — başlık:** Görev başlığı; medication ise 'İlaç Yardımı' etiketi altında |
| **Orta — created\_by label:** 'Hasta' / 'Sen' (bakıcı kendi eklediği) / 'Aile' / 'Doktor (V2)' |
| **Sağ — aksiyon:** Normal: 'Tamamla' butonu | Counter: '+1' \+ X/Y göstergesi | Done/Skipped: gri |
| **Skip aksiyonu:** Satır swipe veya üç nokta menüsünden |
| **Kompaktlık:** Bakıcı uygulamasında satır yüksekliği hasta uygulamasına göre daha kompakt |

## **7.2 Undo Bar**

| UNDO\_BAR — 5 Saniye Undo Bar |
| :---- |
| **Konum:** Ekran altı — tost benzeri, görev listesinin üzerinde |
| **İçerik:** '\[Görev adı\] tamamlandı.' \+ 'Geri Al' butonu \+ 5sn geri sayım progress bar |
| **Birden fazla hızlı tamamlama:** Her yeni tamamlama undo bar'ı sıfırlar ve yeni görevi gösterir; önceki otomatik onaylanır |
| **Medication undo:** Undo basılırsa medication\_assistance log kaydı geri alınır \+ aileye bildirim iptal edilir (henüz gönderilmemişse) |

# **8\. Hata Durumları ve Edge Case'ler**

| Senaryo | Kullanıcıya Gösterilen | Sistem Davranışı |
| :---- | :---- | :---- |
| Task tamamlama API hatası | 'Kaydedilemedi. Tekrar dene.' \+ Yeniden Dene butonu | Optimistic UI geri alınır; görev todo'ya döner |
| Çevrimdışı tamamlama | Optimistic UI \+ 'Çevrimdışı — senkronize edilecek' | Yerel kuyruğa alınır; bağlantıda senkronize edilir |
| Undo penceresi kapanmadan uygulama çöker | Undo kaybedilir; görev done olarak loglanır | ActivityLog yazılmadan çöküş: idempotent retry sonraki açılışta |
| Medication task yanlış tamamlandı (undo süresi geçmiş) | Kullanıcıya geri alma seçeneği sunulmaz | Activity log görünür; HC professional/admin V1'de düzeltme yetkisi |
| Görev silinmek isteniyor — başka actor bağlı | Bakıcı yalnızca kendi eklediğini silebilir | Yetkisiz silme girişimi: 'Bu görevi yalnızca ekleyen kişi silebilir' |
| Aynı görev aynı anda iki aktör tamamlıyor | Son gelen geçer (last-write-wins) | Tüm aksiyonlar ActivityLog'a yazılır; çakışma izlenebilir |

# **9\. Kabul Kriterleri**

## **9.1 Fonksiyonel**

* Seçili hastanın 'Günün Görevleri' Home'da ekstra tıklama olmadan görünür ve açık gelir.

* Her görev satırında created\_by label görünür: 'Hasta', 'Sen' (bakıcı), 'Aile'.

* Normal task 'Tamamla' ile done olur; 5 saniye Undo bar açılır; Undo basılırsa todo'ya döner.

* Counter task '+1' ile ilerler; hedefe ulaşılınca otomatik done \+ 5 sn Undo.

* Manuel skip çalışır; ActivityLog'a skipped\_by: caregiver yazılır.

* Bakıcı seçili hasta için yeni görev ekleyebilir; form validasyonları çalışır.

* Medication subtype görev tamamlamada ActivityLog'a 'medication\_assistance\_completed' yazılır; UI'da 'İlaç Yardımı Tamamlandı' gösterilir; 'İlaç Verildi' veya 'Administered' ifadesi görünmez.

* Görev değişiklikleri tüm bağlı actorların ekranına ≤ 2 saniye içinde yansır.

* Hasta bağlamı değiştiğinde görev listesi yeni hastanın verileriyle güncellenir; önceki hasta verileri gösterilmez.

* Soft delete çalışır; silinen görev listeden kalkar ancak DB'de deleted\_at ile işaretlenir.

## **9.2 Regülasyon / Güvenlik**

* Hiçbir görev tamamlama akışında ilaç önerisi, dozaj yorumu veya klinik değerlendirme mesajı oluşturulmaz.

* Medication task UI metni: 'Tamamla' butonu \+ 'İlaç Yardımı Tamamlandı' label — 'İlaç Verildi' asla kullanılmaz.

* ActivityLog insert-only; güncelleme veya silme yoktur.

## **9.3 Teknik**

* Görev tamamlama → diğer actor ekranına yansıma: ≤ 2 saniye (realtime subscription).

* ActivityLog yazım başarı oranı: ≥ %99.9.

* Çevrimdışı tamamlama: kuyruğa alınır, senkronize edilir, çift log oluşmaz (idempotent).

# **10\. Başarı Metrikleri**

| Metrik | Hedef | Neden? |
| :---- | :---- | :---- |
| Günlük görev tamamlama oranı (bakıcı) | İzleme | Bakıcı platform kullanım bağlılığı |
| Medication subtype task tamamlama oranı | İzleme | İlaç yardımı takibinin gerçek kullanımı |
| Counter görevi tamamlama oranı | İzleme | Sıvı/egzersiz takibi kullanımı |
| Undo kullanım oranı | İzleme — hedef düşük | Yüksekse: tamamlama UI hataya açık |
| Görev ekleme oranı (bakıcı tarafından) | İzleme | Bakıcının plan kurma yetkisini kullanımı |
| ActivityLog yazım başarı oranı | ≥ %99.9 | Audit trail bütünlüğü |
| Görev değişikliği yansıma süresi | ≤ 2 sn (p95) | Çok aktörlü koordinasyon kalitesi |

# **11\. UX ve Tasarım Notları**

* created\_by label küçük ve soluk görünmeli — asıl odak görev başlığı ve aksiyon butonu.

* Medication ikon tutarlı olmalı: hasta uygulamasıyla aynı ikon kullanılır.

* 'İlaç Yardımı Tamamlandı' konfirmasyonu kısa ve net olmalı — uzun modal gereksiz.

* Counter görevinde hedef görünür olmalı: '4/8 bardak' — progress bar veya X/Y sayısı.

* Görev ekleme formu bottom sheet — tam ekran modal değil; bakıcı hızlı form doldurup geri dönmeli.

* Todo / done / skipped görsel ayrımı net: done öğeler gri \+ üstü çizili; skipped farklı bir işaretle.

* Undo bar otomatik kaybolmamalı: 5 saniyelik progress bar ile ne kadar süresi kaldığı görünür.

# **12\. Kullanıcı Senaryoları**

## **Senaryo 1 — Sabah ilaç yardımı**

Bakıcı Ayşe Teyze'nin yanında, sabah vardiyasında. Görev listesinde 'Sabah İlacı (Metformin)' görünüyor, subtype: medication. 'Tamamla' basıyor. 5 saniyelik undo bar açılıyor. Bekliyor. ActivityLog'a medication\_assistance\_completed: caregiver yazılıyor. Ailenin telefonuna bildirim geliyor: 'Sabah ilacı yardımı tamamlandı (bakıcı).

## **Senaryo 2 — Sıvı takibi, counter görevi**

Hasta için 8 bardak su hedefi var. Bakıcı her su verişinde '+1' basıyor. 6\. bardakta '6/8' görünüyor. Biraz sonra 8/8'e ulaşılıyor; görev otomatik done oluyor. Bakıcı undo basmıyor. ActivityLog'a 8 ayrı counter\_increment kaydı düşüyor.

## **Senaryo 3 — Bakıcı yeni görev ekliyor**

Bakıcı öğlen ziyaretinde hastanın bacaklarının şiştiğini fark ediyor. Bunu not etmek için 'Görev Ekle'ye basıyor: başlık \= 'Bacak elevasyonu \- sağ/sol', tip \= recurring, subtype \= standard, her gün. Kaydediyor. Görev hem bakıcı hem aile listesine anlık düşüyor. Aile bunu görünce mesaj atıyor: 'Fark etmişsiniz, teşekkürler.'

## **Senaryo 4 — Yanlış tamamlama, undo**

Bakıcı yanlışlıkla 'Akşam İlacı'nı tamamlıyor, öğlen vakti. Hemen fark ediyor, undo bar hâlâ aktif. 'Geri Al'a basıyor. ActivityLog'a undo\_by: caregiver yazılıyor. Görev todo'ya dönüyor. Aile bildirimi gönderilmemişti (henüz 5 sn içindeydi); bildirim iptal ediliyor.

# **13\. Açık Konular**

| Konu | Durum | Hedef |
| :---- | :---- | :---- |
| Skip reason alanı V0'a alınmalı mı? Regülasyon açısından 'hasta reddetti' logu önemli. | Açık — önerilen V0'a dahil edilsin | Fizik Tedavi uzmanı görüşü \+ hukuki değerlendirme |
| Medication task için ek onay adımı (çift tıklama / onay modal): gerekli mi? | Açık | Bakıcı rol sınırı ve kullanılabilirlik dengesi |
| ActivityLog'da shift\_id: aktif vardiya olmadan tamamlanan görev? Zorunlu mu? | Açık | Teknik mimari kararı |
| V1 medication geçmişi raporu: aile için nasıl görüntülenecek? (tarihsel MAR benzeri) | Açık | V1 PRD sürecinde |
| Çevrimdışı çakışma: iki aktör çevrimdışıyken aynı görevi tamamlarsa ne olur? | Açık | Teknik mimari — senkronizasyon stratejisi |
| Görev düzenleme yetkisi: bakıcı başkasının eklediği görevi düzenleyebilmeli mi? (V1 ajans koordinasyonu) | Açık | V1 PRD \+ ajans rol yönetimi |

*Sinalytix — Gizli ve Özel. Bu doküman geliştirici referansı içindir.*

# 0️⃣ AI Agent

**Sinalytix**

Caregiver App — PRD 05

**AI Agent (Bakıcı Yapay Zeka Asistanı)**

Versiyon: 0.1 — Nisan 2026

Hedef Pazar: Kanada (Ontario odaklı)

Durum: Araştırma Destekli İlk Taslak

# **1\. Amaç ve Kapsam**

Bu PRD, Sinalytix Caregiver App bünyesinde yer alacak AI Agent özelliğini tanımlamaktadır. AI Agent; PSW/HCA bakıcısının vardiya başında brifing almasını, bakım planı hakkında doğal dil sorguları yapmasını, dökümentasyon notlarını sesle oluşturmasını ve escalation protokollerini anlık olarak hatırlamasını sağlayan bir asistan katmanıdır.

Bu araç klinik karar destek sistemi DEĞİLDİR. Tanı koymaz, tedavi önermez, ilaç dozu belirtmez. Health Canada SaMD sınıflandırması açısından "Class I / administrative & workflow support" kapsamında tasarlanmıştır. Her yanıt kullanıcıya yasal sorumluluk reddi beyanı ile birlikte sunulur.

⚕ Tasarım İlkesi: AI Agent, bakıcının önündeki bakım planı verisini daha erişilebilir kılar; bakıcının klinik yargısının yerini almaz. "Bu hastanın diyabetine ne iyi gelir?" sorusu → cevapsız. "Bu hastanın diyabet diyeti bakım planında nasıl belirtilmiş?" sorusu → yanıt verilir.

## **1.1 Hedef Kullanıcı**

| Kullanıcı | Senaryo | AI Erişim Düzeyi |
| :---- | :---- | :---- |
| PSW / HCA | Aktif vardiyada hasta hakkında soru sorma, not alma | Tam erişim — sadece kendi hastası |
| Registered Nurse (RN) | Bakım planı değişikliği sonrası AI özeti doğrulama | Tam erişim \+ AI log görüntüleme |
| Hasta Yakını | Ayrı Family App üzerinden — bu PRD kapsamı dışı | Kapsam Dışı (V2) |

## **1.2 V1 Kapsam Sınırları**

| Kapsam İÇİ (V1) | Kapsam DIŞI (V1 → V2+) |
| :---- | :---- |
| Vardiya başı AI brifing özeti | Semptom değerlendirmesi / triaj |
| Bakım planı içeriği hakkında doğal dil Q\&A | İlaç dozu / etki önerisi |
| Sesle checkout notu oluşturma (voice-to-text) | Bakım planı değişikliği / güncelleme |
| Görev öncelik sıralaması hatırlatma (zaman bazlı) | Hasta veya aile ile doğrudan AI etkileşimi |
| Escalation protokolü yüzey alma | Predictive alert / risk skorlaması |
| Tüm AI sorgularının audit log'a yazılması | Gerçek zamanlı vital sign analizi |
| Yanıt başına yasal disclaimer gösterimi | AI çıktısının EHR'a otomatik eklenmesi |

# **2\. Düzenleyici Çerçeve ve Hukuki Sınırlar**

## **2.1 Health Canada — SaMD Sınıflandırması**

Health Canada, Software as a Medical Device (SaMD) Kılavuz Belgesi (ve Şubat 2025'te yayınlanan Pre-Market Guidance for Machine Learning-Enabled Medical Devices – PMGMLMD) kapsamında AI tabanlı yazılımları Class I–IV arasında sınıflandırır.

| Sınıf | Risk Düzeyi | Örnek Kullanım | Sinalytix AI Durumu |
| :---- | :---- | :---- | :---- |
| Class I | Düşük | İdari yardım, workflow, bilgi erişimi | ✅ Hedef sınıf — Sinalytix AI |
| Class II | Orta-düşük | Genel klinik karar desteği (non-critical) | ⚠ Dikkatli ol |
| Class III | Orta-yüksek | Tanı desteği, risk skorlaması | 🚫 V1 yasak |
| Class IV | Yüksek | Ölüm/ciddi hasar riski olan kararlar | 🚫 Her zaman yasak |

**⚠ Kritik: AI Agent'in herhangi bir özelliği "tanı koyabilir", "tedavi önerir" veya "ilaç dozu belirtir" şeklinde pazarlanırsa veya teknik olarak bu işlevi görürse ürün otomatik olarak Class II+ sınıfına girer ve Health Canada pre-market approval gerektirir. Tüm feature metinleri hukuk revizyonundan geçirilmelidir.**

## **2.2 PIPEDA / PHIPA — Yapay Zeka Veri Akışı Uyumu**

Ontario'da sağlık verisi PHIPA (Personal Health Information Protection Act) kapsamındadır. Federal düzeyde PIPEDA geçerlidir. AI Agent mimarisi aşağıdaki kuralları karşılamalıdır:

| Kural | Gereksinim | Teknik Karşılık |
| :---- | :---- | :---- |
| Veri yerleşimi | PHI Kanada sınırları dışına çıkamaz | LLM endpoint: Azure Canada Central veya CA-hosted model |
| 3\. Parti LLM | PHI gönderilecekse BAA/DPA imzalanmalı | OpenAI public API yasak; Azure OpenAI \+ veri işleme anlaşması |
| Audit izlenebilirlik | AI sorgu ve yanıtları loglanmalı | ai\_interaction\_log tablosu (immutable insert-only) |
| Amaç sınırı | Veri toplama amacını aşan AI kullanımı yasak | Sadece o hastanın aktif bakım planı sorgulanabilir |
| Rıza | Hasta PHI'sinin AI işlenmesi için bilgilendirilmiş rıza | Onboarding'de AI kullanım izni ayrı consent record |
| Veri minimizasyonu | LLM'e en az gerekli veri gönderilmeli | RAG: full EHR yerine sadece ilgili chunk'lar |
| Güvenlik ihlali bildirimi | PHIPA ihlalinde IPC Ontario'ya bildirim | Breach detection hook → compliance alert pipeline |

## **2.3 Ontario RHPA — PSW Rol Sınırı ve AI**

PSW/HCA rolü Ontario RHPA (Regulated Health Professions Act) altında düzenlenmemektedir; ancak işverenin belirlediği Scope of Practice sınırları geçerlidir. AI Agent bu sınırları aşacak eylemler için kullanılamaz:

**PSW için AI Agent YAPAMAZ:**

• "Bu ilaç bu hastaya uygun mu?" sorusunu yanıtlamak

• Bakım planında olmayan bir aktiviteyi önermek

• RN tarafından yazılmış tıbbi değerlendirmeyi yorumlamak

• Hastanın durumu hakkında aile ile paylaşmak üzere özet oluşturmak (PHIPA)

**PSW için AI Agent YAPABİLİR:**

• Bakım planında yazılı ilaç yardımı adımlarını sıralamak

• "Bu hastanın alerjileri neler?" sorusunu bakım planından yanıtlamak

• Checkout notuna sesle eklemek istediği metni yazıya çevirmek

• Vardiya başında bugünkü görevleri özetlemek (zaman sıralamasıyla)

• "Bu durumda ne yapmalıyım?" → bakım planındaki escalation protokolünü göstermek

# **3\. Teknik Mimari**

## **3.1 RAG Pipeline Genel Bakış**

AI Agent, büyük dil modeline (LLM) ham PHI göndermek yerine Retrieval-Augmented Generation (RAG) mimarisi kullanır. Bu mimari; veri güvenliği, yanıt doğruluğu ve SaMD sınıf kontrolü açısından sektörün en iyi uygulamasıdır (AlayaCare Layla, HHAeXchange AI Assist vb.).

| ▐ RAG Pipeline — Veri Akışı ┌──────────────────────────────────────────────────────────────┐ │  CAREGIVER APP (Mobile)                                       │ │  └─ User query (text / voice transcript)                     │ │       ↓  \[patient\_id \+ shift\_id \+ query\_text\]                 │ ├──────────────────────────────────────────────────────────────┤ │  AI SERVICE (Backend — Canada-hosted)                         │ │  1\. Auth check: caregiver has active shift for patient?       │ │  2\. Retriever: embed query → vector DB search                 │ │     └─ Sources: care\_plan chunks, task\_history, shift\_notes  │ │  3\. Context assembly: top-k relevant chunks (k=5 default)     │ │  4\. Prompt builder:                                           │ │     \[system prompt: role constraints \+ disclaimer\]            │ │     \[context: retrieved chunks\]                               │ │     \[user query\]                                              │ │  5\. LLM call → Azure OpenAI CA Central (GPT-4o / Claude)     │ │  6\. Response filter: safety check → disclaimer append         │ │  7\. ai\_interaction\_log INSERT (immutable)                     │ │       ↓  \[response \+ sources\_cited \+ disclaimer\]              │ ├──────────────────────────────────────────────────────────────┤ │  CAREGIVER APP                                                │ │  └─ Renders response \+ source tags \+ disclaimer banner        │ └──────────────────────────────────────────────────────────────┘ |
| :---- |

## **3.2 Veri Kaynakları (RAG İndeks)**

Her hasta için ayrı bir RAG index oluşturulur. İndeks, bakım planı güncellendiğinde veya yeni shift notu eklendiğinde otomatik olarak yeniden vektörleştirilir (re-embed tetikleyicisi).

| Kaynak Tablo | İçerik | Güncelleme Tetikleyicisi | Hassasiyet |
| :---- | :---- | :---- | :---- |
| care\_plan | Bakım hedefleri, özel talimatlar, diyabet/diyet notları, alerjiler | care\_plan UPDATE | PHI — yüksek |
| care\_plan\_medications | Reçeteli ilaçlar, yardım adımları, saatler | medications UPDATE | PHI — yüksek |
| shift\_notes | Son 5 shift checkout notu | shift COMPLETE event | PHI — orta |
| task\_history | Son 30 günlük görev tamamlama/atlama geçmişi | task\_event INSERT | PHI — orta |
| escalation\_protocols | Bakım planı kaynaklı müdahale adımları | care\_plan UPDATE | PHI — yüksek |
| patient\_profile\_summary | Ad, doğum tarihi, tanılar (kod), tercihler | profile UPDATE | PHI — yüksek |

🔒 Veri İzolasyonu: Her bakıcı sadece kendi aktif vardiyasındaki hastanın RAG index'ine erişebilir. Vardiya sona erdiğinde oturum context'i temizlenir (PHIPA data isolation, PRD 03 ile tutarlı).

## **3.3 Veritabanı Şeması**

### **ai\_interaction\_log (INSERT-only — audit trail)**

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| id | UUID PK | Her AI etkileşimi için benzersiz ID |
| caregiver\_id | UUID FK → caregivers | Sorguyu yapan bakıcı |
| patient\_id | UUID FK → patients | Sorgunun ait olduğu hasta |
| shift\_id | UUID FK → shifts | Aktif vardiya referansı |
| interaction\_type | ENUM | shift\_briefing | care\_plan\_qa | voice\_note | escalation\_lookup | task\_priority |
| query\_text | TEXT (encrypted) | Bakıcının yazdığı / konuştuğu ham sorgu |
| retrieved\_chunks | JSONB | RAG'ın döndürdüğü kaynak chunk ID'leri ve skorları |
| llm\_response | TEXT (encrypted) | Ham LLM yanıtı (disclaimer öncesi) |
| response\_shown | TEXT (encrypted) | Kullanıcıya gösterilen son metin (disclaimer dahil) |
| model\_version | VARCHAR(64) | Kullanılan LLM modeli ve versiyonu |
| latency\_ms | INTEGER | Toplam yanıt süresi (ms) |
| judge\_verdict | ENUM | {MEDICAL\_ADVICE\|IN\_SCOPE\_ACTION\|GENERAL\_LIFE\|IRRELEVANT\|REFUSED\|...} — kanonik judge kararı |
| risk\_tier | ENUM | {green\|yellow\|red} — kanonik risk seviyesi |
| ↳ safety\_filter\_triggered | BOOLEAN | `judge_verdict`/`risk_tier` altında alt-alan: safety filter devreye girdi mi? |
| ↳ safety\_filter\_reason | TEXT | `judge_verdict`/`risk_tier` altında alt-alan: filtre gerekçesi (NULL ise tetiklenmedi) |
| created\_at | TIMESTAMPTZ | Sorgu zamanı (UTC, immutable) |

> [RECONCILED: B3] Kanonik tek AI günlüğü `ai_interaction_log`'a `judge_verdict` + `risk_tier`{green\|yellow\|red} eklendi (Dictionary §5). Mevcut `safety_filter_triggered`/`safety_filter_reason` korunur ama artık bu iki alanın altında alt-alandır. [RECONCILED: A8] FK'lar kanonik tekil `User (Caregiver)` / `User (Patient)` referans eder (`caregivers`/`patients`/`users`/`shifts` çoğul-küçük formlar yalnızca yerel takma adlardır).

### **ai\_consent\_record**

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| id | UUID PK | Rıza kaydı ID |
| patient\_id | UUID FK → User (Patient) (eski: patients) | Rıza veren hasta |
| granted\_by | UUID FK → User (eski: users) | Rızayı veren kullanıcı (genellikle hasta/POA) |
| consent\_type | VARCHAR | ai\_processing\_for\_care\_coordination |
| granted\_at | TIMESTAMPTZ | Rıza tarihi |
| revoked\_at | TIMESTAMPTZ NULL | Rıza geri alınma tarihi (NULL \= aktif rıza) |
| ip\_hash | CHAR(64) | SHA-256 IP hash (ham IP tutulmaz — PIPEDA) |
| version | INTEGER | Consent metni versiyonu |

> [RECONCILED: B9] AI onamı tek yerde toplanır. Onboarding consent ekranında 5. flag `ack_ai_processing` ile alınır ve kanonik `ConsentRecord.flags.ack_ai_processing` olarak yazılır (bkz. Onboarding ONB\_02 + §6.2 ConsentRecord). Buradaki ayrı `ai_consent_record` tablosu kanonik `ConsentGrant`'a eşlenir (iptal/revoke yolu: `ConsentGrant.revoked_at/by`). Yani: izin = `ConsentRecord.flags`, runtime veri-paylaşımı + revoke = `ConsentGrant` (Dictionary §2).

# **4\. Özellikler (Features)**

## **4.1 Vardiya Başı AI Brifing (Shift Briefing)**

Bakıcı vardiyaya başladığında (check-in tamamlandıktan sonra) AI Agent otomatik olarak o hasta için yapılandırılmış bir brifing özeti oluşturur. Bakıcı bu özeti okuyarak hastanın güncel durumunu, bugünkü görevleri ve dikkat edilmesi gereken notları hızla kavrar.

| ▐ Shift Briefing — Örnek Çıktı ┌────────────────────────────────────────────────────────────┐ │  AI Vardiya Özeti — Margaret Chen  |  09:00 – 17:00       │ │  Oluşturuldu: 24 Nis 2026, 08:58                          │ ├────────────────────────────────────────────────────────────┤ │  📋 Bugünkü Görevler (8 görev)                             │ │   ✦ Sabah hijyen yardımı — 09:00 (öncelikli)              │ │   ✦ İlaç yardımı (Metformin 500mg) — 09:30               │ │   ✦ Basınç ülseri önleme — 2 saatlik pozisyon değişimi    │ │                                                            │ │  ⚠ Önemli Notlar (son vardiyadan)                         │ │   • Dün gece az uyudu, yorgun olabilir — Sarah K., 23 Nis │ │   • Kahvaltıda iştahsız — Sarah K., 23 Nis                 │ │                                                            │ │  🌿 Hasta Tercihleri                                        │ │   • Sağ taraf tercih eder (pozisyon değişiminde)          │ │   • Günlük yürüyüşü bölünmeden tamamlamak ister           │ │                                                            │ │  📞 Escalation: Solunum sıkıntısı → 911 \+ Hemşire Jane   │ │                                                            │ │  ⚠ Bu özet bilgilendirme amaçlıdır. Klinik karar         │ │    verme aracı değildir. Bakım planını onaylayın.          │ └────────────────────────────────────────────────────────────┘ |
| :---- |

### **Brifing Bölümleri ve Veri Kaynakları**

| Brifing Bölümü | Veri Kaynağı | Koşul |
| :---- | :---- | :---- |
| Bugünkü görevler (öncelik sıralı) | tasks tablosu (scheduled\_time ASC) | Her zaman |
| Son vardiyadan önemli notlar | shift\_notes — son 2 vardiya | Eğer not varsa |
| Bakım planı özel uyarıları | care\_plan.special\_instructions | Eğer varsa |
| İlaç yardımı zamanları | care\_plan\_medications (zaman \+ ilaç adı) | Eğer medication task varsa |
| Hasta tercihleri | patient\_preferences | Eğer kayıtlıysa |
| Escalation özeti | escalation\_protocols (ilk 2 kayıt) | Her zaman |
| Disclaimer banner | Sabit metin | Her zaman, silinemez |

**🕐 Performans Hedefi: Shift briefing AI yanıtı ≤ 3 saniyede kullanıcıya ulaşmalıdır. Vardiya check-in'den sonra arka planda ön-üretim (pre-generation) yapılabilir.**

### **Tetikleme Mantığı**

Brifing aşağıdaki koşullardan biri sağlandığında üretilir:

* Bakıcı shift'e check-in yaptığında otomatik tetiklenir (push)

* Bakıcı HomeScreen'den "AI Brifing" butonuna bastığında (pull)

* Son brifingden bu yana ≥ 30 dakika geçtiyse ve bakıcı uygulamayı yeniden açarsa

📌 V1 Kısıtı: Brifing yeniden üretimi bakıcı başlatır; arka plan otomatik yenileme V2.

## **4.2 Bakım Planı Soru-Cevap (Care Plan Q\&A)**

Bakıcı, aktif hastası hakkında doğal dil ile soru sorabilir. AI Agent yalnızca o hastanın bakım planı, görev geçmişi ve shift notları üzerinden yanıt üretir. Yanıt her zaman kaynağını (hangi bakım planı bölümünden) gösterir.

| ▐ Care Plan Q\&A — Akış Bakıcı: "Bu hastanın ne zaman pozisyon değiştirmem gerekiyor?" AI Agent: "Bakım planına göre Margaret'in pozisyon değişimi her 2 saatte bir yapılmalı. Tercih: sağ tarafa dönme (belirtilen rahat pozisyon). Son pozisyon değişimi: 08:30 (Sarah K. tarafından, dün gece vardiyası). Kaynak: Bakım Planı Bölüm 3 – Basınç Ülseri Önleme ───────────────────────────────────────────────────────── ⚠ Bu bilgi bakım planından alınmıştır. Klinik değerlendirme için hemşirenize danışın." |
| :---- |

### **Güvenli / Güvensiz Soru Kategorileri**

| Soru Tipi | Örnek | AI Davranışı | Neden |
| :---- | :---- | :---- | :---- |
| Bakım planı içeriği | "Diyeti nedir?" | Yanıt ver \+ kaynak göster | RAG'da doğrudan kaynak var |
| Görev bilgisi | "Bugün ilaç yardımı var mı?" | Yanıt ver \+ zaman göster | tasks tablosundan alınır |
| Shift notu geçmişi | "Geçen hafta neler oldu?" | Son 5 shift özetle | shift\_notes'dan alınır |
| Hasta tercihleri | "Kahvaltıda ne sever?" | Yanıt ver (kayıtlıysa) | patient\_preferences |
| Tanı sorgusu | "Demansı ne kadar ilerledi?" | Reddedilir \+ açıklama | SaMD sınır aşımı |
| Tedavi önerisi | "Bu ilacın yerine ne kullanılabilir?" | Reddedilir \+ yönlendirme | RHPA sınır aşımı |
| Klinik yorum | "Bu semptom tehlikeli mi?" | Reddedilir \+ escalation göster | Tanı riski |
| Diğer hasta sorusu | "Diğer hastam ne zaman?" | Reddedilir \+ açıklama | PHIPA veri izolasyonu |

### **Red (Refusal) Yanıt Şablonu**

**Güvensiz sorular için standart red yanıtı:"Bu soruyu yanıtlamak, tıbbi değerlendirme gerektirdiğinden AI asistan kapsamı dışındadır. Lütfen hemşirenize veya sorumlu sağlık profesyonelinize danışın. Acil bir durum ise lütfen bakım planındaki escalation protokolünü takip edin."**

## **4.3 Sesli Dökümentasyon Asistanı (Voice Note Assistant)**

Bakıcı checkout notu yazarken ses kaydı başlatabilir. AI Agent konuşmayı metne dönüştürür (speech-to-text) ve isteğe bağlı olarak SBAR (Situation–Background–Assessment–Recommendation) formatına yapılandırır. Son metin bakıcı tarafından gözden geçirilip onaylandıktan sonra shift\_notes tablosuna kaydedilir.

| ▐ Voice Note — Kullanıcı Akışı 1\. Bakıcı Checkout ekranında  🎤 "Sesli Not"  butonuna basar 2\. Konuşur: "Margaret bugün çok yorgundu, kahvaltıda sadece yarım dilim ekmek yedi.    Pozisyon değişimlerini iyi tolere etti, sağ tarafı tercih etti.    Solunum normal, şikayeti yok." 3\. AI: speech-to-text → ham transkript gösterir 4\. Bakıcı "SBAR'a Çevir" seçeneğine basar (opsiyonel) 5\. AI çıktısı:    S – Durum: Hasta bugün yorgun görüldü.    B – Arka Plan: Kahvaltıda iştahsız, az yedi.    A – Değerlendirme: Pozisyon değişimlerini tolere etti, solunum normal.    R – Öneri: Sonraki bakıcı iştah takibine dikkat etsin. 6\. Bakıcı metni onaylar / düzenler → Kaydet 7\. shift\_notes'a INSERT, ai\_interaction\_log'a INSERT |
| :---- |

### **SBAR Yapılandırma Kuralları**

AI, SBAR formatını oluştururken aşağıdaki sınırlara uyar:

* "A – Değerlendirme" bölümüne klinik yorum EKLEMEZ — sadece bakıcının söylediklerini organize eder

* "R – Öneri" bölümünde ilaç, tedavi veya tıbbi işlem önerisi yapamaz

* Bakıcının söylemediği hiçbir bilgiyi SBAR'a ekleyemez (hallucination önleme)

* Eğer bakıcı "kötü hissediyor" gibi semptom odaklı ifade kullandıysa, "A" bölümüne bakım planındaki escalation tetikleyicileri eklenir

### **Teknik Bileşenler**

| Bileşen | Teknoloji / Yaklaşım | Not |
| :---- | :---- | :---- |
| Speech-to-Text | Azure Speech Services (Canada Central) | PHI Kanada'da kalır |
| SBAR yapılandırma | GPT-4o (Azure OpenAI CA) \+ sistem prompt | Prompt engineering ile kısıtlama |
| Dil desteği | İngilizce (V1), Fransızca (V2) | Ontario iki dilli gereksinim |
| Ses kaydı saklama | Geçici — işlendikten sonra silinir | PIPEDA veri minimizasyonu |
| Metin onay adımı | Kullanıcı confirm olmadan kaydedilmez | AI çıktısı asla ham olarak yazılmaz |

## **4.4 Escalation Protokolü Sorgulama**

Bakıcı ani durum veya beklenmedik değişimle karşılaştığında AI Agent'a "ne yapmalıyım?" diyebilir. AI, bakım planındaki escalation protokollerini öncelik sırasıyla gösterir. Bu özellik bilgi erişimi sağlar; klinik karar vermez.

| ▐ Escalation Lookup — Örnek Bakıcı: "Hasta nefes almakta güçlük çekiyor, ne yapmalıyım?" AI Agent: "Bakım planınızdaki solunum sıkıntısı protokolüne göre:", 1\. HEMEN 911'i Arayın 2\. Hemşire Jane Smith'i bilgilendirin: \+1 (416) 555-0123 3\. Hastayı dik pozisyona alın (bakım planı: Bölüm 5\) 4\. Ajansı arayın: Sinalytix Dispatch \+1 (416) 555-0999 "Kaynak: Margaret Chen Bakım Planı – Bölüm 5: Acil Durumlar Son güncelleme: 15 Mart 2026, Dr. R. Sharma ⚠ Bu bilgi bakım planından alınmıştır.    Klinik karar yerine geçmez." |
| :---- |

**🚨 Tasarım Gerekliliği: Escalation lookup yanıtında her zaman "önce 911" adımı en üstte yer almalıdır. Bu adım hiçbir zaman AI tarafından bastırılamaz, değiştirilemez veya bakım planı kaynağından bağımsız eklenir.**

## **4.5 Görev Öncelik Hatırlatıcı (Task Priority Hint)**

Bakıcı "bugün ne ile başlamalıyım?" dediğinde AI, görevleri zaman çizelgesine göre sıralar ve varsa "bugün özellikle dikkat et" notlarını öne çıkarır. Bu tamamen takvim/zaman bazlıdır; klinik öncelik sıralaması yapmaz.

| Öncelik Kriteri | Kaynak | Açıklama |
| :---- | :---- | :---- |
| scheduled\_time ASC | tasks.scheduled\_time | En erken görev en üstte |
| Overdue flag | tasks.scheduled\_time \< NOW() | Gecikmiş görevler sarı uyarı ile listelenir |
| medication\_assistance | tasks.task\_type | İlaç yardımı görevleri ayrı vurgulanır |
| Shift notu uyarısı | son shift\_note içeriği | "Dün iştahsız" gibi notlar ilgili göreve bağlanır |

# **5\. Kullanıcı Akışı ve UI Gereksinimleri**

## **5.1 AI Chat Arayüzü — Tasarım Gereksinimleri**

| UI Elemanı | Gereksinim | Gerekçe |
| :---- | :---- | :---- |
| Disclaimer banner | Her AI yanıtının altında sabit, silinemez uyarı metni | Health Canada SaMD, PHIPA |
| Kaynak etiketleri | Yanıtın hangi bakım planı bölümünden geldiği gösterilir | Güven \+ doğrulanabilirlik |
| Güvensiz soru uyarısı | Reddedilen sorularda neden reddedildiği açıklanır | Kullanıcı deneyimi |
| Ses butonu erişilebilirliği | Eldiven giyilmişken de kullanılabilir büyüklükte | PSW gerçek kullanım koşulları |
| Yükleniyor göstergesi | LLM yanıtı beklenirken spinner (≤5s timeout) | UX \+ hata yönetimi |
| Konuşma geçmişi | Sadece o vardiya süresince görünür | PHIPA veri izolasyonu |
| Çıkış/Vardiya bitişinde temizle | Shift sona erince chat geçmişi ekrandan kaldırılır | PHIPA |
| Hasta bağlamı göstergesi | Hangi hasta için konuşulduğu her zaman görünür | Güvenlik — yanlış hasta riski |

## **5.2 Ana Kullanıcı Akışı — Shift Başından Sonuna**

| ▐ Akış Diyagramı (Metin) SHIFT CHECK-IN     ↓ AI Brifing otomatik üretilir (≤3s)     ↓ Bakıcı brifing ekranını görür     ↓  \[Opsiyonel\] AI Chat aç → bakım planı Q\&A     |     ├── Güvenli soru → yanıt \+ kaynak \+ disclaimer     └── Güvensiz soru → red \+ yönlendirme     ↓ Görevler yapılır (PRD 04 akışı)     ↓  \[Görev tamamlama sırasında\] Sesli not opsiyonu (voice → text → SBAR öneri)     ↓ Checkout notu → bakıcı onaylar → kaydedilir     ↓ SHIFT CHECK-OUT     ↓ AI chat geçmişi ekrandan temizlenir (PHIPA)     |     └── ai\_interaction\_log'da kalır (7 yıl, PHIPA) |
| :---- |

# **6\. Sistem Prompt Tasarımı**

LLM'e gönderilecek sistem prompt'u, AI Agent'in rol sınırlarını ve davranış kurallarını tanımlar. Bu prompt değiştirilmesi halinde Sinalytix güvenlik revizyonundan geçirilmelidir.

| ▐ Sistem Prompt — Temel Yapı (İngilizce) You are a caregiver support assistant for Sinalytix home care. You help PSW/HCA caregivers do their job more effectively. YOUR ROLE: \- Provide factual information FROM the retrieved care plan documents \- Summarize shift notes and tasks \- Convert spoken notes to text (SBAR formatting if requested) \- Show escalation protocols from the care plan STRICT BOUNDARIES — NEVER: \- Diagnose symptoms or conditions \- Recommend medication changes, dosages, or alternatives \- Make clinical judgments or interpret medical results \- Answer questions about patients not in the current session \- Provide information not found in the retrieved context \- Generate new care plan content If a question falls outside your role, respond: "This question requires clinical judgment and is outside my role. Please consult your nurse or responsible health professional. For emergencies, follow the escalation protocol in the care plan." ALWAYS append to every response: "⚠ This information is from the care plan for informational purposes. It is not a substitute for clinical judgment." Context (retrieved from patient care plan): {retrieved\_chunks} |
| :---- |

**🔧 Geliştirici Notu: Sistem prompt'unu değiştirmek için güvenlik incelemesi (security review) gereklidir. Prompt injection saldırılarına karşı input sanitization katmanı eklenmelidir: kullanıcı girişindeki "ignore previous instructions" veya benzeri jailbreak kalıpları otomatik olarak filtrelenmelidir.**

# **7\. Güvenlik, Hata ve Edge Case Yönetimi**

## **7.1 Safety Filter Katmanı**

LLM yanıtı kullanıcıya ulaşmadan önce bir safety filter katmanından geçer. Bu katman kural tabanlıdır (ML tabanlı değil — V1 basitliği ve denetlenebilirliği için).

| Filtre Kuralı | Tetikleyici | Eylem |
| :---- | :---- | :---- |
| Tanı kelimesi algılama | Yanıtta "diagnosed with", "you have", "suggests X diagnosis" içeriyorsa | Yanıt reddedilir → standart red mesajı |
| Doz önerisi | Yanıtta mg, dosage, "take X times" gibi ifadeler varsa | Yanıt reddedilir |
| Diğer hasta PHI | Yanıtta başka patient\_id'ye ait veri varsa | Yanıt reddedilir \+ güvenlik log |
| Boş context | RAG hiçbir chunk döndüremediyse | "Bu konuda bakım planında bilgi bulunamadı" yanıtı |
| LLM timeout (\>5s) | Yanıt 5 saniyeyi aşarsa | Timeout mesajı \+ retry butonu |
| LLM API hatası | Azure endpoint erişilemiyorsa | "AI şu an kullanılamıyor" \+ manuel devam yönlendirmesi |

## **7.2 Prompt Injection Koruması**

* Kullanıcı girişi sisteme ulaşmadan HTML, JSON ve özel karakter sanitizasyonu uygulanır

* "ignore", "forget", "override", "jailbreak", "pretend" gibi anahtar kelimeler içeren girdiler loglama ile birlikte uyarı üretir

* Kullanıcı girişi her zaman prompt'un en sonunda, context'ten SONRA yerleştirilir

* Max input token limiti: 512 token (mobil kullanım için yeterli, injection yüzeyini sınırlar)

## **7.3 Offline Davranışı**

**AI Agent tamamen online bir özelliktir. Offline modda AI Chat devre dışı kalır ve bakıcıya "İnternet bağlantısı gerekli — AI asistan şu an kullanılamıyor" mesajı gösterilir. Offline sırasında yapılan görev tamamlamaları etkilenmez (PRD 04 offline resilience).**

# **8\. Performans ve SLA Hedefleri**

| Metrik | Hedef | Ölçüm Yöntemi |
| :---- | :---- | :---- |
| Shift briefing üretim süresi | ≤ 3 saniye (p95) | ai\_interaction\_log.latency\_ms |
| Care plan Q\&A yanıt süresi | ≤ 5 saniye (p95) | ai\_interaction\_log.latency\_ms |
| Voice-to-text transkripsiyon | ≤ 4 saniye (60 saniyelik ses için) | Azure Speech latency |
| Safety filter işlem süresi | ≤ 100ms | Backend middleware log |
| AI uptime (Canada Central) | N/A — Azure Canada Central SLA | Azure SLA %99.9 |
| Yanlış red oranı (false refusal) | \< %5 meşru soru reddedilmemeli | Manuel QA örneklemesi |
| PHI sızıntısı | Sıfır tolerans | Güvenlik denetimi \+ penetrasyon testi |

# **9\. V2+ Yol Haritası**

| Özellik | V2 Hedefi | Gereksinim / Engel |
| :---- | :---- | :---- |
| Proaktif Uyarılar | AI, bakım planı \+ shift notu değişimlerini analiz edip önceden uyarır | Predictive ML → Class II SaMD review |
| Fransızca Destek | Tüm AI yanıtları Fransızca kullanılabilir (Ontario FLSA) | Fransızca fine-tune / prompt |
| Family App AI Entegrasyonu | Aile bireyleri kendi kapsam sınırıyla AI soru sorabilir | Ayrı consent \+ role kısıtlaması |
| Çoklu Hasta Zaman Çizelgesi | Birden fazla aktif hastası olan bakıcı için shift optimizasyonu | PHIPA veri izolasyonu tasarımı |
| AI Çıktısı EHR Entegrasyonu | Onaylı SBAR notları doğrudan EHR'a aktarılabilir | HL7 FHIR Write API |
| Risk Skorlama | ADL değişimlerine göre bakıcı uyarısı (düşme riski, beslenme) | Class III SaMD → klinik validasyon |
| Çevrimdışı AI (Edge LLM) | Küçük bir modelin cihaz üzerinde çalışması | Model compression \+ privacy review |

# **10\. Açık Sorular ve Kararlar**

| \# | Soru | Öneri / Seçenekler | Karar Sahibi |
| :---- | :---- | :---- | :---- |
| 1 | LLM provider: Azure OpenAI mi, başka mı? | Azure OpenAI Canada Central (veri yerleşimi garantisi); Anthropic Claude (Kanada endpoint eksik — inceleme gerekli) | Teknik \+ Hukuk |
| 2 | Embedding modeli: OpenAI text-embedding-3 mi? | Azure tarafında çalışan embedding → veri Kanada'da kalır | Teknik |
| 3 | Vector DB seçimi: pgvector (PostgreSQL) mi, Pinecone mi? | pgvector \= mevcut Supabase/PostgreSQL ile entegre; Pinecone \= ayrı servis \+ veri yerleşimi inceleme | Teknik |
| 4 | SBAR otomatik uygulansın mı, opsiyonel mi? | Opsiyonel önerilir — bakıcı tercihi | UX araştırma |
| 5 | Ses kaydı ne kadar saklanmalı? | Metin oluştuktan hemen sonra silinmeli (PIPEDA minimizasyon); transkript 7 yıl | Hukuk \+ PHIPA |
| 6 | AI brifing dil seçimi: Türkçe/Fransızca? | V1 İngilizce; V2 Fransızca (Ontario resmi); Türkçe UI dışı | Ürün |
| 7 | AI consent: hasta onayı onboarding'de mi, her shift'te mi? | Onboarding'de bir kez, revoke hakkı her zaman | Hukuk |
| 8 | Hallucination önleme: RAG context dışı yanıt nasıl engellenir? | Sistem prompt \+ grounding check; context bulunamadıysa "bilgi yok" yanıtı | Teknik |
| 9 | AI günlük kullanım limiti var mı? | V1 limit yok; rate limit sadece DDoS koruması için (ör. 60 req/dakika/kullanıcı) | Ürün |
| 10 | AI revision/feedback mekanizması: bakıcı yanıtı derecelendirebilmeli mi? | Basit 👍/👎 → model iyileştirme datasına eklenir | Ürün |

# **11\. Terimler Sözlüğü**

| Terim | Açıklama |
| :---- | :---- |
| RAG | Retrieval-Augmented Generation — LLM yanıtlarını gerçek belgelerle destekleme mimarisi |
| SaMD | Software as a Medical Device — Health Canada tıbbi yazılım sınıflandırması |
| PIPEDA | Personal Information Protection and Electronic Documents Act — Kanada federal gizlilik yasası |
| PHIPA | Personal Health Information Protection Act — Ontario sağlık veri gizlilik yasası |
| RHPA | Regulated Health Professions Act — Ontario sağlık meslekleri yönetmeliği |
| PHI | Protected/Personal Health Information — korunan sağlık bilgisi |
| SBAR | Situation–Background–Assessment–Recommendation — klinik iletişim çerçevesi |
| PSW | Personal Support Worker — kişisel destek çalışanı (Ontario) |
| HCA | Home Care Aide — ev bakım yardımcısı |
| LLM | Large Language Model — büyük dil modeli |
| Embedding | Metin parçacığının sayısal vektör temsili; semantik arama için kullanılır |
| pgvector | PostgreSQL'e vektör desteği ekleyen açık kaynak uzantı |
| ai\_interaction\_log | Tüm AI etkileşimlerinin immutable audit kaydı |
| Safety Filter | LLM yanıtını kullanıcıya sunmadan önce kural tabanlı kontrol katmanı |
| Prompt Injection | Kötü niyetli kullanıcı girişiyle sistem prompt'unu bypass etme saldırısı |
| Grounding | AI yanıtının kaynaklandığı belge/bölüm referansı ile desteklenmesi |

# **12\. Onay ve Revizyonlar**

| Rol | İsim | Tarih | Durum |
| :---- | :---- | :---- | :---- |
| Ürün Sahibi | Efe İşikyüzlü |  | Bekliyor |
| Klinik Danışman (FTR Uzmanı) |  |  | Bekliyor |
| Hukuk / PHIPA Revizyonu |  |  | Bekliyor |
| Güvenlik / Privacy Review |  |  | Bekliyor |
| Baş Geliştirici |  |  | Bekliyor |

**⚠ Bu PRD Health Canada SaMD sınıflandırması ve PHIPA/PIPEDA uyumu açısından geliştirme başlamadan önce hukuki ve klinik incelemeden geçirilmelidir.**

# 1️⃣ Mesajlaşma / Inbox

**Sinalytix**

Caregiver App — PRD 06

**Mesajlaşma / Inbox**

Versiyon: 0.1 — Nisan 2026

Hedef Pazar: Kanada (Ontario odaklı)

Durum: Araştırma Destekli İlk Taslak

# **1\. Amaç ve Kapsam**

Bu PRD, Sinalytix Caregiver App'ın Mesajlaşma / Inbox özelliğini tanımlar. Bakıcılar saha koşullarında genellikle yalnız çalışır; koordinatör, hemşire veya ajansla güvenli, hızlı iletişim kuramadıklarında bakım kalitesi düşer, bildirilmeyen değişimler klinik riske dönüşür. Bu özellik; şifreli, rol tabanlı, PHI uyumlu dahili mesajlaşma sağlar.

Özellik WhatsApp, SMS veya e-posta yerine kullanılmak üzere tasarlanmıştır. Tüm mesaj içeriği PHIPA kapsamında korunan veri olarak işlenir; uçtan uca şifreleme (TLS \+ AES-256) ve rol tabanlı erişim kontrolü mimarinin temel gereksinimleridir.

## **1.1 Kapsam**

| Kapsam | V1 Dahil mi? | Açıklama |
| :---- | :---- | :---- |
| Bakıcı ↔ Koordinatör mesajlaşma | Evet | Birincil iletişim kanalı |
| Bakıcı ↔ Hemşire/RN mesajlaşma | Evet | Klinik sorgu kanalı |
| Ajans yayın mesajları (broadcast) | Evet | Tek yönlü duyuru |
| Bakım ekibi grup sohbeti (hasta bazlı) | Evet | Hasta bakım ekibi grubu |
| Sistem otomatik bildirim mesajları | Evet | Vardiya değişimi, yeni görev atama vb. |
| Bakıcı ↔ Hasta / Aile mesajlaşma | Hayır (V2) | Family App entegrasyonu V2 |
| Sesli/video mesaj | Hayır (V2) | V1 sadece metin \+ ek dosya |
| Dosya eki (fotoğraf/döküman) | Kısmi (V1) | Sadece ajans/koordinatör gönderebilir |

## **1.2 Hedef Kullanıcılar**

| Rol | Mesaj Gönderebildiği Roller | Aldığı Mesaj Tipleri |
| :---- | :---- | :---- |
| PSW / HCA | Koordinatör, Hemşire | Yayın, sistem bildirimi, koordinatör/hemşire yanıtı |
| Koordinatör | Tüm bakıcılar, hemşireler, yönetici | Bakıcı soruları, sistem uyarıları |
| Hemşire / RN | Bakıcılar, koordinatör | Klinik sorular, bakım notu bildirimleri |
| Ajans Yöneticisi | Tüm kullanıcılar (yayın) | Raporlar, koordinatör iletileri |

# **2\. Düzenleyici Çerçeve**

## **2.1 PHIPA / PIPEDA Gereksinimleri**

Mesajlaşma özelliği PHI içerebilecek iletişimi kapsar (hasta adı, durumu, bakım notu gibi). Dolayısıyla PHIPA Health Information Custodian yükümlülükleri tam olarak uygulanır.

| Gereksinim | Teknik Karşılık | Referans |
| :---- | :---- | :---- |
| Şifreleme (iletim) | TLS 1.2+ tüm API trafiği için zorunlu | PHIPA s.12 / PIPEDA P5 |
| Şifreleme (depolama) | AES-256 mesaj içeriği şifrelemesi | PHIPA s.12 |
| Erişim kontrolü | Rol tabanlı mesaj erişimi; bakıcı sadece kendi mesajlarını görür | PHIPA s.37 |
| Audit log | Her mesaj için gönderen, alıcı, zaman, okundu durumu loglanır | PHIPA s.12(1)(c) |
| Saklama süresi | Mesajlar minimum 7 yıl saklanır (PHIPA kayıt saklama) | PHIPA s.13 |
| Veri yerleşimi | Mesaj verisi Kanada sunucularında tutulur | PHIPA / PIPEDA |
| İhlal bildirimi | Yetkisiz mesaj erişiminde IPC Ontario'ya bildirim | PHIPA s.12(2) |
| Kullanıcı silme hakkı | Mesaj silme \= soft delete; audit kaydı korunur | PIPEDA P4.3.2 |

## **2.2 Tüketici Mesajlaşma Araçlarının Yasaklanması**

**⚠ Kurumsal Politika Gerekliliği: PHI içerebilecek iletişimler için WhatsApp, iMessage, standart SMS veya kişisel e-posta KESİNLİKLE yasaktır. Bu durum hem PHIPA hem de Ontario IPC kılavuzlarıyla uyumludur. Bakıcı onboarding'inde bu politika açıkça imzalatılmalı ve uygulama bu araçlara bağlantı içermemelidir.**

# **3\. Veri Modeli**

## **3.1 Temel Tablolar**

### **conversations**

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| id | UUID PK | Konuşma ID |
| type | ENUM('direct','group','broadcast','system') | Konuşma tipi |
| title | VARCHAR(255) NULL | Grup ve yayın konuşmaları için başlık |
| patient\_id | UUID FK → patients NULL | Hasta bazlı grup sohbetinde dolu; direkt mesajlarda NULL |
| created\_by | UUID FK → users | Konuşmayı başlatan kullanıcı |
| created\_at | TIMESTAMPTZ | Oluşturulma zamanı |
| last\_message\_at | TIMESTAMPTZ | Son mesaj zamanı (inbox sıralama için) |
| is\_archived | BOOLEAN DEFAULT false | Soft arşivleme |

### **conversation\_participants**

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| conversation\_id | UUID FK → conversations | Konuşma referansı |
| user\_id | UUID FK → users | Katılımcı kullanıcı |
| role | ENUM('member','admin') | Grup yönetimi için |
| joined\_at | TIMESTAMPTZ | Katılım zamanı |
| last\_read\_at | TIMESTAMPTZ | Son okunma zamanı (okunmamış sayısı için) |
| is\_muted | BOOLEAN DEFAULT false | Bildirim sessize alma |
| left\_at | TIMESTAMPTZ NULL | Gruptan ayrılma (NULL \= aktif üye) |

### **messages**

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| id | UUID PK | Mesaj ID |
| conversation\_id | UUID FK → conversations | Ait olduğu konuşma |
| sender\_id | UUID FK → users | Gönderen kullanıcı |
| message\_type | ENUM('text','image','file','system\_event') | Mesaj tipi |
| content\_encrypted | TEXT | AES-256 şifrelenmiş mesaj içeriği |
| content\_iv | BYTEA | AES şifreleme IV (initialization vector) |
| reply\_to\_id | UUID FK → messages NULL | Alıntı/yanıtlama referansı |
| is\_deleted | BOOLEAN DEFAULT false | Soft delete — içerik silinir audit kaydı kalır |
| deleted\_at | TIMESTAMPTZ NULL | Silme zamanı |
| deleted\_by | UUID FK → users NULL | Silen kullanıcı |
| created\_at | TIMESTAMPTZ | Gönderim zamanı (immutable) |
| edited\_at | TIMESTAMPTZ NULL | Düzenleme zamanı (NULL \= düzenlenmemiş) |

### **message\_receipts**

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| message\_id | UUID FK → messages | Mesaj referansı |
| user\_id | UUID FK → users | Alıcı kullanıcı |
| delivered\_at | TIMESTAMPTZ NULL | Cihaza iletilme zamanı |
| read\_at | TIMESTAMPTZ NULL | Okunma zamanı (NULL \= okunmadı) |

### **message\_attachments**

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| id | UUID PK | Ek ID |
| message\_id | UUID FK → messages | Mesaj referansı |
| file\_type | ENUM('image','pdf','document') | Dosya tipi |
| storage\_key | VARCHAR | Şifrelenmiş depolama yolu (S3/Canada region) |
| file\_size\_bytes | INTEGER | Dosya boyutu |
| uploaded\_by | UUID FK → users | Yükleyen kullanıcı |
| created\_at | TIMESTAMPTZ | Yükleme zamanı |

# **4\. Özellikler**

## **4.1 Inbox (Ana Mesaj Listesi)**

Inbox ekranı tüm aktif konuşmaları son mesaj zamanına göre sıralı gösterir. Okunmamış mesaj sayısı her konuşma başlığının yanında badge olarak görünür. Inbox aynı zamanda alt navigasyondan erişilebilir; okunmamış mesaj varsa badge gösterir.

| ▐ Inbox Ekranı — Wire Frame ┌─────────────────────────────────────────────────┐ │  Mesajlar                             \[+ Yeni\]  │ │  ─────────────────────────────────────────────  │ │  🔵 Koordinatör Sarah K.                  2     │ │     "Bugün öğleden sonra değişiklik..."  14:32  │ │  ─────────────────────────────────────────────  │ │  👩‍⚕️ RN Jane M. (Hemşire)                  1     │ │     "Margaret'in bacak ödemine..."       12:15  │ │  ─────────────────────────────────────────────  │ │  📢 Ajans Duyurusu                             │ │     "Nisan protokol güncellemesi..."     09:00  │ │  ─────────────────────────────────────────────  │ │  👥 Margaret Chen Bakım Ekibi             0     │ │     "Shift notu eklendi — Sarah K."      dün    │ │  ─────────────────────────────────────────────  │ │  🤖 Sistem                                0     │ │     "Yeni görev atandı: Hijyen — 09:00" 08:45  │ └─────────────────────────────────────────────────┘ |
| :---- |

### **Inbox Sıralama ve Filtreleme**

| Özellik | Davranış | Not |
| :---- | :---- | :---- |
| Varsayılan sıralama | last\_message\_at DESC | En yeni konuşma en üstte |
| Okunmamış pin | Okunmamış mesajı olan konuşmalar üstte pin | V1 opsiyonel |
| Sistem mesajları | Ayrı "Bildirimler" sekmesinde veya listenin altında | Human mesajlarla karışmasın |
| Arşiv | Kaydırarak arşivle (swipe left) | Silinmez, arşivde görünür |
| Arama | Konuşma başlığı \+ son mesaj içeriği metin arama | V1 — full-text index |

## **4.2 Direkt Mesajlaşma (1:1)**

Bakıcı koordinatörüne veya hemşiresine doğrudan mesaj gönderebilir. Yeni konuşma başlatırken arama yaparak sadece aynı ajans bünyesindeki yetkilendirilmiş kullanıcılar listelenir (PHIPA izolasyonu).

| ▐ 1:1 Sohbet Ekranı ┌─────────────────────────────────────────────────┐ │  ← Sarah K. (Koordinatör)           📞  ⋮      │ │  ─────────────────────────────────────────────  │ │                                                 │ │  \[Sarah K.\]  14:32                              │ │  Bugün Margaret'in vardiyası değişti,           │ │  17:00'de bitecek.                              │ │                                                 │ │                           \[Sen\]  14:35          │ │                    Anladım, teşekkürler. ✓✓     │ │                                                 │ │  ─────────────────────────────────────────────  │ │  \[📎\]  Mesaj yazın...              \[Gönder 🡒\]  │ └─────────────────────────────────────────────────┘    ✓ \= iletildi   ✓✓ \= okundu |
| :---- |

### **Mesaj İşlevleri**

| İşlev | V1? | Açıklama |
| :---- | :---- | :---- |
| Metin mesaj gönder | Evet | Max 2000 karakter |
| Okundu bilgisi (✓✓) | Evet | İki tik: iletildi / okundu |
| Alıntı/yanıtla (reply) | Evet | Mesaja basılı tutup "Yanıtla" |
| Mesaj sil | Evet | Gönderenden 5 dakika içinde; soft delete |
| Mesaj düzenle | Hayır (V2) | Düzenleme geçmişi audit zorlaştırır |
| Resim gönder | Kısmi | Sadece koordinatör/hemşire; bakıcı görebilir |
| Dosya eki (PDF) | Kısmi | Sadece koordinatör/hemşire; bakıcı görebilir |
| Emoji reaksiyon | Hayır (V2) | Klinik bağlam; V1'de profesyonel ton |
| Sesli mesaj | Hayır (V2) | Ses kayıt altyapısı V2 |
| Mesaj iletme (forward) | Hayır (V2) | PHI yayılma riski — sonraki versiyona bırakıldı |

## **4.3 Hasta Bakım Ekibi Grup Sohbeti**

Her hasta için "bakım ekibi" grubu otomatik oluşturulur. Bu gruptaki üyeler: o hastaya atanmış tüm bakıcılar, koordinatör, ilgili hemşire/RN. Yönetici bakıcı ekleyebilir/çıkarabilir; bakıcı gruptan ayrılamaz (bakım sürekliliği).

💡 Sektör Pratiği (AlayaCare): Hasta bazlı grup sohbeti, bakım ekibinin ortak hasta bağlamında iletişim kurmasını sağlar; ayrı kanallar yerine tek bir akış. "Circle of Care" modeli — tüm bakım paydaşları tek kanalda.

### **Grup Yönetimi Kuralları**

| Kural | Açıklama |
| :---- | :---- |
| Otomatik oluşturma | Yeni hasta eklendiğinde sistem grup oluşturur |
| Üye ekleme | Sadece koordinatör veya yönetici ekleyebilir |
| Üye çıkarma | Sadece koordinatör veya yönetici çıkarabilir |
| Bakıcı ayrılamaz | Aktif shift'i olan bakıcı gruptan çıkamaz (kendi isteğiyle) |
| Hasta silinirse | Grup arşivlenir; mesajlar 7 yıl korunur |
| Başlık | "{Hasta Adı} Bakım Ekibi" otomatik atanır, değiştirilemez |

## **4.4 Ajans Yayın Mesajları (Broadcast)**

Ajans yöneticisi veya koordinatör tüm bakıcılara ya da seçili bir gruba (örn. "Ontario bölgesi bakıcıları") tek yönlü yayın mesajı gönderebilir. Bakıcılar yayın mesajlarına yanıt veremez; sadece okur.

| Özellik | Açıklama |
| :---- | :---- |
| Hedef kitle | Tüm bakıcılar / etiket bazlı filtre (bölge, görev tipi) |
| Tek yönlü | Bakıcı yanıt veremez; sadece "Okundu" bilgisi gösterilir |
| Okundu raporu | Koordinatör kaç kişinin okuduğunu görebilir |
| Örnek kullanım | Protokol güncellemesi, tatil duyurusu, acil haber |
| Bildirim | Yayın mesajı push bildirim ile iletilir (yüksek öncelikli) |

## **4.5 Sistem Otomatik Mesajları**

Belirli uygulama olayları tetiklendiğinde sistem otomatik olarak bakıcının inbox'una mesaj iletir. Bu mesajlar "Sistem" göndereninden gelir ve sohbet listesinde ayrı gösterilir.

| Olay | Mesaj İçeriği | Aksiyon Linki |
| :---- | :---- | :---- |
| Yeni vardiya atandı | "\[Tarih\] tarihli \[Hasta\] vardiyanız atandı." | Vardiyayı Görüntüle |
| Vardiya değiştirildi | "\[Hasta\] vardiyanız \[eski saat\] → \[yeni saat\] olarak güncellendi." | Değişikliği Gör |
| Vardiya iptal edildi | "\[Tarih\] vardiyanız iptal edildi." | Ajansı Ara |
| Yeni görev atandı | "\[Hasta\] için yeni görev: \[Görev Adı\] — \[Saat\]" | Göreve Git |
| Bakım planı güncellendi | "\[Hasta\] bakım planı güncellendi. Lütfen gözden geçirin." | Planı Gör |
| Checkout notu istendi | "\[Hasta\] vardiyanız bitti — checkout notunuzu ekleyin." | Not Ekle |

# **5\. Gerçek Zamanlı Mesajlaşma Mimarisi**

## **5.1 WebSocket / SSE Tasarımı**

Anlık mesaj iletimi için WebSocket bağlantısı tercih edilir. Mobil ağ kısıtlamaları veya pil tasarrufu modunda bağlantı kesilebileceğinden reconnect mekanizması ve offline mesaj kuyruğu gereklidir.

| ▐ Gerçek Zamanlı Mesaj Akışı ┌─────────────────────────────────────────────────────────┐ │  GÖNDEREN (Koordinatör App)                             │ │  └─ POST /messages  {conversation\_id, content\_enc}      │ ├─────────────────────────────────────────────────────────┤ │  BACKEND                                                │ │  1\. Auth check                                          │ │  2\. messages INSERT (DB)                                │ │  3\. message\_receipts INSERT per recipient               │ │  4\. conversation.last\_message\_at UPDATE                 │ │  5\. Push to WebSocket channel → per recipient           │ │  6\. Push notification (if app backgrounded)             │ ├─────────────────────────────────────────────────────────┤ │  ALICI (Caregiver App — foreground)                     │ │  └─ WebSocket event → render new message bubble         │ │                                                         │ │  ALICI (Caregiver App — background)                     │ │  └─ Push notification → tap → app açılır → inbox günceli│ └─────────────────────────────────────────────────────────┘ |
| :---- |

## **5.2 Offline Mesaj Kuyruğu**

Bakıcı mesaj gönderirken internet bağlantısı yoksa mesaj yerel kuyruğa (SQLite) alınır. Bağlantı geri geldiğinde sırayla sunucuya iletilir.

| Durum | UI Gösterimi | Davranış |
| :---- | :---- | :---- |
| Online — gönderildi | ✓ tek tik (gri) | Sunucuya ulaştı |
| Online — iletildi | ✓ çift tik (gri) | Alıcı cihaza push edildi |
| Online — okundu | ✓✓ çift tik (mavi) | Alıcı mesajı açtı |
| Offline — kuyrukta | ⏳ saat ikonlu (gri) | Bağlantı gelince gönderilecek |
| Gönderim hatası | ⚠ hata ikonu (kırmızı) | Dokunarak yeniden gönder seçeneği |

## **5.3 Şifreleme Detayı**

Mesaj içeriği sunucuda şifreli saklanır. Anahtar yönetimi:

* Her konuşma için benzersiz AES-256 anahtarı oluşturulur

* Anahtarlar KMS (Key Management Service) tarafından yönetilir — Canada region

* Uygulama sunucusu ham mesaj içeriğine erişir (E2E değil — moderasyon ve audit için), ancak depolamada şifreli

* TLS 1.2+ tüm iletimde zorunlu; HSTS policy uygulanır

**📌 Tasarım Kararı: Uçtan uca şifreleme (E2E) V1'de uygulanmamaktadır. Gerekçe: PHIPA moderasyon ve audit yükümlülüğü, E2E ile çelişir (sunucu içeriği okuyamazsa ihlal tespiti yapamaz). Çalışan güvenliği ve bakım kalitesi denetimi için sunucu erişimi zorunludur. E2E seçeneği V2 değerlendirmesine alınmıştır.**

# **6\. Kullanıcı Akışı**

## **6.1 Yeni Mesaj Gönderme**

| ▐ Yeni Mesaj Akışı 1\. Bakıcı alt navdan "Mesajlar" ikonuna basar 2\. Inbox açılır → sağ üstteki \[+ Yeni\] butonuna basar 3\. Arama çubuğu açılır → koordinatör/hemşire adı yazar    (Sadece aynı ajans \+ aynı hasta/bölge yetkisi olanlar listelenir) 4\. Alıcıyı seçer → sohbet açılır 5\. Metin yazar → "Gönder" 6\. Mesaj görüntülenir:    \- Bakıcı tarafında: sağda mavi balon ✓    \- Koordinatör alınca: ✓✓ gri    \- Koordinatör okuyunca: ✓✓ mavi |
| :---- |

## **6.2 Sistem Mesajına Tepki**

| ▐ Sistem Mesajı → Aksiyon 1\. Bakıcı push bildirim alır: "Yeni vardiya atandı" 2\. Bildirime dokunur → Inbox açılır 3\. Sistem mesajı görünür: "\[25 Nis\] Margaret Chen vardiyanız atandı."    \[Vardiyayı Görüntüle\] butonu 4\. Butona basar → Shift ekranına deep-link ile yönlendirilir 5\. Mesaj otomatik "okundu" işaretlenir |
| :---- |

# **7\. Bildirim Entegrasyonu**

Mesajlaşma bildirimleri PRD 07 (Bildirim Merkezi) ile koordineli çalışır. Bu bölüm yalnızca mesajlaşmaya özgü bildirim kurallarını tanımlar.

| Mesaj Tipi | Push Bildirim | In-App Badge | Sessize Alınabilir mi? |
| :---- | :---- | :---- | :---- |
| Direkt mesaj (koordinatör) | Evet | Evet | Evet |
| Direkt mesaj (hemşire) | Evet | Evet | Evet |
| Grup mesajı (bakım ekibi) | Evet | Evet | Evet |
| Ajans yayın mesajı | Evet (yüksek öncelikli) | Evet | Hayır (önemli duyuru) |
| Sistem otomatik mesajı | Evet | Evet | Kısmen (vardiya iptali sessize alınamaz) |

## **7.1 Bildirim Metni Kuralları**

Push bildirimi metni PHI içermemelidir. Örnek:

| ❌ Yanlış (PHI içeriyor) | ✅ Doğru (PHI yok) |
| :---- | :---- |
| Sarah K.: "Margaret'in ayağında şişlik var" | "Sarah K. size mesaj gönderdi" |
| Sistem: "Margaret Chen — ilaç yardımı atlandı" | "Bir görev güncelleme bildirimi var" |
| Koordinatör: "Hasta diabetes kontrolü için..." | "Koordinatörünüzden yeni mesaj" |

**🔒 PHIPA Uyarısı: iOS/Android push bildirim altyapısı (APNs / FCM) mesaj içeriğini Apple ve Google sunucularından geçirir. Bu sunucular Kanada dışındadır. Bu nedenle bildirim payload'ında hasta adı, durum veya herhangi bir PHI KESİNLİKLE yer almamalıdır — sadece "yeni mesaj var" benzeri genel metin.**

# **8\. Güvenlik ve Erişim Kontrolü**

## **8.1 Yetkilendirme Matrisi**

| Eylem | PSW/HCA | Koordinatör | Hemşire/RN | Yönetici |
| :---- | :---- | :---- | :---- | :---- |
| Direkt mesaj gönder (koordinatör) | ✅ | ✅ | ✅ | ✅ |
| Direkt mesaj gönder (hemşire) | ✅ | ✅ | ✅ | ✅ |
| Grup mesajı gönder | ✅ | ✅ | ✅ | ✅ |
| Yayın mesajı gönder | 🚫 | ✅ | 🚫 | ✅ |
| Dosya/fotoğraf gönder | 🚫 | ✅ | ✅ | ✅ |
| Grup üyesi ekle/çıkar | 🚫 | ✅ | 🚫 | ✅ |
| Diğer bakıcının mesajlarını okuma | 🚫 | ✅ (denetim) | 🚫 | ✅ |
| Mesaj sil (kendi) | ✅ (5 dk) | ✅ (30 dk) | ✅ (30 dk) | ✅ |
| Mesaj audit log görüntüle | 🚫 | 🚫 | 🚫 | ✅ |

## **8.2 Veri Sızıntısı Önleme**

* Bakıcı kendi atanmadığı hasta grubunu göremez

* Başka ajans çalışanıyla mesajlaşma arayüzden engellenir

* Ekran görüntüsü tespiti: iOS/Android screenshot event → audit log (içerik yasak değil, ama izlenir)

* Pasif oturum: 30 dakika işlem yapılmazsa mesaj geçmişi blurlanır; PIN/biyometri ile devam

# **9\. Performans Hedefleri**

| Metrik | Hedef | Ölçüm |
| :---- | :---- | :---- |
| Mesaj iletim gecikmesi (online) | ≤ 500ms (p95) | WebSocket event latency |
| Inbox yükleme süresi | ≤ 1.5 saniye (p95) | Son 20 konuşma |
| Push bildirim gecikme | ≤ 3 saniye (p95) | Gönderim → bildirim |
| Offline kuyruk senkronizasyon | ≤ 5 saniye bağlantı sonrası | Queue flush time |
| Mesaj şifreleme/deşifreleme | ≤ 50ms istemci tarafında | Client perf log |
| Eş zamanlı bağlantı kapasitesi | Min 10.000 bakıcı | Load test |

# **10\. V2+ Yol Haritası**

| Özellik | Açıklama | Engel / Gereksinim |
| :---- | :---- | :---- |
| Bakıcı ↔ Aile mesajlaşma | Aile bireyleri Family App üzerinden bakıcıya mesaj atabilir | Family App \+ ayrı consent tasarımı |
| Sesli mesaj | Sürücü/hastane giriş gibi durumlarda sesle mesaj | Ses depolama \+ PHIPA review |
| Video mesaj | Kısa klip gönderimi (yara fotoğrafı, pozisyon kontrolü) | Depolama maliyeti \+ PHI kontrolü |
| Mesaj çeviri | Göçmen bakıcılar için otomatik çeviri (İngilizce-Fransızca) | Translation API \+ PHI riski |
| Okundu bilgisi kapatma | Bakıcı kendi read receipt'ini kapatabilir | UX araştırma |
| Arama (full-text) | Tüm konuşma geçmişinde içerik araması | Şifreli mesaj arama zorluğu |
| Emoji reaksiyonlar | Mesajlara emoji ile hızlı tepki | V1'de klinik ton önceliği |

# **11\. Açık Sorular**

| \# | Soru | Öneri | Karar Sahibi |
| :---- | :---- | :---- | :---- |
| 1 | WebSocket teknoloji seçimi: Supabase Realtime mi, Socket.io mu, Ably mi? | Supabase Realtime (zaten DB altyapısı) → maliyet avantajı | Teknik |
| 2 | Mesaj saklama süresi: 7 yıl PHIPA minimum — tüm mesajlar mı? | 7 yıl immutable; sonrası cold storage (S3 Glacier CA) | Hukuk |
| 3 | Koordinatör tüm bakıcıların mesajlarını okuyabilmeli mi? | Sadece kendi ekibini okuyabilir; "denetim" rolü ayrı tanımlanmalı | Hukuk \+ Ürün |
| 4 | Bakıcı kaç farklı konuşma yönetebilir? Limit var mı? | Teknik limit yok; UX limit: inbox scroll optimizasyonu | Teknik |
| 5 | Mesaj silme: 5 dakika yeterli mi? | AlayaCare benchmark; klinik bağlamda 5 dk yeterli önerilir | Ürün |
| 6 | Dosya eki: bakıcı gönderemiyor — sahadan fotoğraf ihtiyacı var mı? | Saha fotoğrafı (yara, cilt durumu) önemli — V1 kapsam tartışması | Klinik \+ Ürün |
| 7 | Grup mesajlarında "yazıyor..." göstergesi? | V1 opsiyonel; WebSocket yük artırır — devre dışı öneri | Teknik |

# **12\. Onay ve Revizyonlar**

| Rol | İsim | Tarih | Durum |
| :---- | :---- | :---- | :---- |
| Ürün Sahibi | Efe İşikyüzlü |  | Bekliyor |
| Klinik Danışman (FTR Uzmanı) |  |  | Bekliyor |
| Hukuk / PHIPA Revizyonu |  |  | Bekliyor |
| Güvenlik / Privacy Review |  |  | Bekliyor |
| Baş Geliştirici |  |  | Bekliyor |

**⚠ Bu PRD PHIPA/PIPEDA uyumu ve şifreleme gereksinimleri açısından hukuki incelemeden geçirilmelidir. Özellikle mesaj saklama, koordinatör erişim hakları ve push bildirim PHI kuralları onaylanmalıdır.**

# 1️⃣ Bildirim Merkezi

**Sinalytix**

Caregiver App — PRD 07

**Bildirim Merkezi**

Versiyon: 0.1 — Nisan 2026

Hedef Pazar: Kanada (Ontario odaklı)

Durum: Araştırma Destekli İlk Taslak

# **1\. Amaç ve Kapsam**

Bu PRD, Sinalytix Caregiver App'ın Bildirim Merkezi özelliğini tanımlar. Bildirim Merkezi; bakıcının uygulama içi bildirim geçmişini görüntüleyebildiği, hangi bildirimleri almak istediğini kişiselleştirebildiği ve eylem gerektiren bildirimleri hızla yanıtlayabildiği merkezi bir hub'dır.

Sağlık çalışanlarında bildirim yorgunluğu (alert fatigue) klinik kanıtlarla desteklenen ciddi bir sorundur — 2025 araştırmaları, klinik alarmların %80-99'unun eyleme gerektirilmediğini göstermektedir. Sinalytix Bildirim Merkezi, öncelik bazlı filtreleme ve kullanıcı kontrolü ile bu sorunu proaktif olarak çözer.

## **1.1 Kapsam**

| Kapsam | V1 Dahil mi? | Açıklama |
| :---- | :---- | :---- |
| In-app bildirim merkezi (geçmiş) | Evet | Tüm bildirimlerin kronolojik listesi |
| Push bildirim gönderimi (iOS/Android) | Evet | APNs \+ FCM entegrasyonu |
| Bildirim tercih merkezi | Evet | Kullanıcı kategori bazlı ayar |
| Kritik bildirim (sessize alınamaz) | Evet | Vardiya iptali, acil mesaj |
| Sessize alma / Do Not Disturb | Evet | Zaman aralığı bazlı sessiz mod |
| Gruplandırma (batch) | Kısmi | Aynı tip bildirimler özetlenir |
| E-posta bildirimleri | Hayır (V2) | V1 sadece push \+ in-app |
| SMS bildirimleri | Hayır (V2) | Maliyet \+ PHIPA review |
| Wearable (smartwatch) bildirimleri | Hayır (V2) | Altyapı genişletmesi V2 |

# **2\. Bildirim Taksonomisi**

Tüm bildirimler dört öncelik seviyesine ve beş kategoriye ayrılır. Öncelik seviyesi, bildirimin sunulma şeklini ve kullanıcının sessiz moda alıp alamayacağını belirler.

## **2.1 Öncelik Seviyeleri**

| Seviye | Renk Kodu | Ses/Titreşim | Sessize Alınabilir mi? | Örnek |
| :---- | :---- | :---- | :---- | :---- |
| P1 — Kritik | 🔴 Kırmızı | Yüksek ses \+ uzun titreşim | Hayır | Vardiya iptali, acil mesaj |
| P2 — Önemli | 🟠 Turuncu | Standart ses \+ titreşim | Hayır (V1) | Yeni vardiya atama, bakım planı değişikliği |
| P3 — Bilgilendirici | 🔵 Mavi | Hafif ses veya sessiz | Evet | Yeni mesaj, AI brifing hazır |
| P4 — Pasif | ⚪ Gri | Sessiz (sadece in-app) | Her zaman sessiz | Haftalık özet, istatistik |

## **2.2 Bildirim Kategorileri**

| Kategori | İkon | Açıklama | Öncelik | Sessize Alınabilir? |
| :---- | :---- | :---- | :---- | :---- |
| Vardiya | 📅 | Vardiya atama, iptal, değişiklik, hatırlatma | P1-P2 | Hayır (P1), Evet (P2 hatırlatma) |
| Görev | ✅ | Yeni görev, görev değişikliği, gecikmiş görev | P2-P3 | Evet |
| Mesaj | 💬 | Yeni mesaj, sistem mesajı, ajans duyurusu | P2-P3 | Evet (P3), Hayır (acil mesaj) |
| Bakım Planı | 📋 | Bakım planı güncellemesi, yeni talimat | P2 | Evet |
| Sistem | ⚙ | Uygulama güncellemesi, bakım penceresi | P4 | Her zaman sessiz |

# **3\. Bildirim Kataloğu**

Aşağıdaki tablo tüm bildirim tiplerini, tetikleyicilerini ve içerik kurallarını tanımlar.

## **3.1 Vardiya Bildirimleri**

| Bildirim Adı | Tetikleyici | Öncelik | Push Başlığı (PHI yok) | In-App İçerik | Aksiyon |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Vardiya Atandı | Yeni shift kaydı oluşturuldu | P2 | "Yeni vardiya atandı" | "\[Tarih\] \[Saat\] vardiyanız atandı." | Vardiyayı Görüntüle |
| Vardiya İptal Edildi | shift.status \= cancelled | P1 | "Vardiyanız iptal edildi" | "\[Tarih\] vardiyanız iptal edildi. Ajansınızla iletişime geçin." | Ajansı Ara |
| Vardiya Değiştirildi | shift.scheduled\_start güncellendi | P2 | "Vardiya saatiniz değişti" | "\[Hasta / kodlu\] vardiyanız \[eski saat\] → \[yeni saat\] olarak güncellendi." | Değişikliği Gör |
| Vardiya Hatırlatma (2 sa.) | NOW() \= shift.start \- 2 saat | P3 | "Vardiyanız 2 saat sonra başlıyor" | "Hazırlık zamanı\! \[Saat\] vardiyanız yaklaşıyor." | Vardiyaya Git |
| Vardiya Hatırlatma (30 dk) | NOW() \= shift.start \- 30 dk | P2 | "Vardiyanız 30 dakika sonra" | "Vardiyanız \[saat\] başlıyor. Hazır mısınız?" | Check-in Yap |
| Check-in Gecikme | NOW() \> shift.start \+ 15 dk ve check-in yok | P2 | "Check-in bekleniyor" | "\[Saat\] başlaması gereken vardiyanız için henüz check-in yapılmadı." | Check-in Yap |
| Checkout Hatırlatma | NOW() \= shift.end \- 15 dk | P3 | "Vardiyanız bitiyor" | "Vardiyanız \[saat\] bitiyor. Checkout notunuzu hazırlamaya başlayın." | Checkout Yap |

**📌 PHI Kuralı: Tüm push bildirim başlıkları hasta adı, tanı veya klinik bilgi içermez. Push metni sadece genel bilgi taşır. Ayrıntılar sadece uygulama açıldıktan sonra in-app bildirim detayında görünür.**

## **3.2 Görev Bildirimleri**

| Bildirim Adı | Tetikleyici | Öncelik | Push Başlığı | Aksiyon |
| :---- | :---- | :---- | :---- | :---- |
| Yeni Görev Atandı | Yeni task INSERT → caregiver\_id dolu | P2 | "Yeni görev atandı" | Göreve Git |
| Görev Zamanı Yaklaştı (15 dk) | NOW() \= task.scheduled\_time \- 15 dk | P3 | "Yaklaşan göreviniz var" | Görevi Gör |
| Görev Gecikmiş | task.scheduled\_time \< NOW() ve tamamlanmamış | P2 | "Gecikmiş göreviniz var" | Göreve Git |
| Görev Değiştirildi | task güncellendi (zaman/içerik) | P2 | "Görev güncellendi" | Değişikliği Gör |
| Görev İptal Edildi | task.status \= cancelled | P3 | "Bir görev iptal edildi" | Detayı Gör |

## **3.3 Mesaj Bildirimleri**

| Bildirim Adı | Tetikleyici | Öncelik | Push Başlığı | Aksiyon |
| :---- | :---- | :---- | :---- | :---- |
| Yeni Direkt Mesaj | Yeni message INSERT → conversation direct | P3 | "Yeni mesajınız var" | Mesajı Aç |
| Acil Mesaj (Koordinatör) | message.is\_urgent \= true | P1 | "Acil: Koordinatörünüzden mesaj" | Hemen Aç |
| Grup Mesajı | Bakım ekibi grubuna yeni mesaj | P3 | "Bakım ekibinden mesaj" | Grubu Aç |
| Ajans Duyurusu | broadcast mesaj INSERT | P2 | "Ajansınızdan duyuru" | Duyuruyu Oku |

## **3.4 Bakım Planı Bildirimleri**

| Bildirim Adı | Tetikleyici | Öncelik | Push Başlığı | Aksiyon |
| :---- | :---- | :---- | :---- | :---- |
| Bakım Planı Güncellendi | care\_plan UPDATE → active shift var | P2 | "Bakım planı güncellendi" | Planı Gör |
| Yeni Talimat Eklendi | care\_plan.special\_instructions UPDATE | P2 | "Yeni bakım talimatı var" | Talimatı Oku |
| İlaç Değişikliği | care\_plan\_medications güncellendi | P2 | "İlaç bilgisi güncellendi" | Detayı Gör |

# **4\. Veri Modeli**

### **notifications**

> [RECONCILED: A3] Bu tablo kanonik tek `Notification` primitifine (Dictionary §7) hizalanır. Per-app `category`/`priority` enum'ları kanonik **birleşik `event_type` taksonomisine** eşlenir (üst-küme): `new_message`, `daily_report`, `task_reminder`, `task_change`, `result_available`, `plan_published`, `caregiver_checkin`, `caregiver_checkout`, `caregiver_connected`, `symptom_report_sent`, `sos`, `approval_pending`, `permission_change`, `caregiver_link_change`, `cosign_request`, `mrp_transfer`, `consent_revoke`, `ai_scribe_complete`, `orphan_subplan`, `ec_verification_reminder`. Yerel `category` filtreleme + `priority` UI-katmanı olarak kalabilir ama kanonik alan `event_type` + `app_context`'tir. [RECONCILED: A8] `user_id` FK kanonik tekil `User`'a referans verir (eski: `users`).

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| id | UUID PK | Bildirim ID |
| user\_id | UUID FK → User (eski: users) | Alıcı kullanıcı |
| event\_type | text | [RECONCILED: A3] Kanonik birleşik taksonomi (Dictionary §7); `category`+`priority`'nin yerini alan kanonik alan |
| category | ENUM('shift','task','message','care\_plan','system') | Yerel filtreleme; kanonik `event_type`'a eşlenir |
| priority | ENUM('p1\_critical','p2\_important','p3\_info','p4\_passive') | Yerel UI öncelik katmanı (kanonik taksonomide ayrı alan değil) |
| title | VARCHAR(128) | Push bildirim başlığı (PHI içermez) |
| body\_text | TEXT | In-app bildirim metni (şifrelenmiş — PHI içerebilir) |
| deep\_link | VARCHAR(512) NULL | Uygulamada açılacak ekran/route |
| entity\_type | VARCHAR(64) NULL | İlgili kayıt tipi: shift / task / message vb. |
| entity\_id | UUID NULL | İlgili kayıt ID'si |
| is\_read | BOOLEAN DEFAULT false | Kullanıcı okudu mu? |
| read\_at | TIMESTAMPTZ NULL | Okunma zamanı |
| push\_sent\_at | TIMESTAMPTZ NULL | Push bildirim gönderilme zamanı |
| push\_delivered\_at | TIMESTAMPTZ NULL | Push cihaza ulaşma zamanı (APNs/FCM callback) |
| created\_at | TIMESTAMPTZ | Oluşturulma zamanı |
| expires\_at | TIMESTAMPTZ NULL | Geçerlilik sonu (NULL \= kalıcı) |

### **notification\_preferences**

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| user\_id | UUID FK → User (eski: users) | Kullanıcı referansı [RECONCILED: A8] |
| category | ENUM('shift','task','message','care\_plan','system') | [RECONCILED: A3] Tercih boyutu; kanonik `event_type` (Dictionary §7) bazında değerlendirilir |
| push\_enabled | BOOLEAN DEFAULT true | Push bildirim açık mı? |
| in\_app\_enabled | BOOLEAN DEFAULT true | In-app bildirim açık mı? |
| sound\_enabled | BOOLEAN DEFAULT true | Ses açık mı? (P1 her zaman true) |
| updated\_at | TIMESTAMPTZ | Son güncelleme |

### **dnd\_schedules (Do Not Disturb)**

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| id | UUID PK | DND kaydı ID |
| user\_id | UUID FK → User (eski: users) | Kullanıcı referansı [RECONCILED: A8] |
| start\_time | TIME | Günlük sessiz mod başlangıcı (ör. 22:00) |
| end\_time | TIME | Günlük sessiz mod bitişi (ör. 07:00) |
| timezone | VARCHAR(64) | Kullanıcı zaman dilimi (ör. America/Toronto) |
| override\_p1 | BOOLEAN DEFAULT true | P1 bildirimler sessiz modda yine de gelsin mi? |
| is\_active | BOOLEAN DEFAULT true | DND kuralı aktif mi? |

# **5\. Push Bildirim Mimarisi**

## **5.1 Genel Akış**

| ▐ Push Bildirim Gönderim Akışı ┌──────────────────────────────────────────────────────────┐ │  OLAY (ör: shift iptal)                                  │ │  └─ Domain Event: shift.status → cancelled              │ ├──────────────────────────────────────────────────────────┤ │  NOTIFICATION SERVICE (Backend)                          │ │  1\. Event listener tetiklenir                            │ │  2\. Hedef kullanıcı belirlenir (caregiver\_id)            │ │  3\. DND kontrolü → P1 ise DND atla                      │ │  4\. Tercih kontrolü → category push\_enabled?            │ │  5\. Bildirim oluştur: title (PHI yok) \+ body (şifreli)  │ │  6\. notifications INSERT (DB)                            │ │  7\. Push provider'a gönder:                              │ │     iOS → APNs (Apple Push Notification Service)         │ │     Android → FCM (Firebase Cloud Messaging)             │ │  8\. push\_sent\_at UPDATE                                  │ ├──────────────────────────────────────────────────────────┤ │  PUSH PROVIDER                                           │ │  └─ Cihaza iletir → push\_delivered\_at callback          │ ├──────────────────────────────────────────────────────────┤ │  CAREGIVER APP                                           │ │  Foreground: in-app toast \+ badge güncelle               │ │  Background: system push notification göster             │ │  Tap → deep\_link ile ilgili ekrana yönlendir             │ └──────────────────────────────────────────────────────────┘ |
| :---- |

## **5.2 PHI ve Push Bildirim Uyumu**

iOS APNs ve Android FCM bildirim payload'ları Apple ve Google sunucularından geçer. Bu sunucular Kanada dışındadır. PHIPA uyumu için push payload'ında PHI OLMAMALIDIR.

| Payload Alanı | İzin verilen | Yasak | Gerekçe |
| :---- | :---- | :---- | :---- |
| title | "Yeni vardiya atandı" | "Margaret Chen vardiyanız atandı" | Hasta adı PHI |
| body | "Vardiyanız güncellendi, detaylar için açın" | "Diyabetik hasta — ilaç zamanı: 09:30" | Tanı \+ ilaç PHI |
| data (silent) | notification\_id, deep\_link, type | patient\_id, shift detayları | Metadata payload'da PHI yasak |
| badge count | Okunmamış bildirim sayısı (integer) | Hasta adı veya içerik | Sayı PHI değil |

## **5.3 Toplu Bildirim (Batching)**

Bakıcı yorgunluğunu (notification fatigue) önlemek için aynı kategoride birden fazla bildirim kısa sürede oluşursa gruplandırılır. P1 bildirimleri hiçbir zaman gruplandırılmaz.

| Senaryo | Tek Tek mi? | Gruplandırma Kuralı | Örnek Metin |
| :---- | :---- | :---- | :---- |
| 5 dakikada 3 görev güncellendi | Hayır | Tek bildirim: "X görev güncellendi" | "3 göreviniz güncellendi" |
| Vardiya iptali | Evet (P1) | Gruplandırılmaz | "Vardiyanız iptal edildi" |
| 2 yeni mesaj (aynı konuşma) | Hayır | Gruplandırılır | "Sarah K.'dan 2 yeni mesaj" |
| Bakım planı 2 kez güncellendi | Hayır | "Bakım planı birden fazla değişti" | "Bakım planında değişiklik var" |

# **6\. In-App Bildirim Merkezi UI**

## **6.1 Bildirim Listesi Ekranı**

| ▐ Bildirim Merkezi — Wire Frame ┌──────────────────────────────────────────────────────┐ │  Bildirimler                  \[Tümünü Okundu İşaretle\]│ │  ──────────────────────────────────────────────────  │ │  \[Filtre: Tümü | Vardiya | Görev | Mesaj | Diğer\]    │ │  ──────────────────────────────────────────────────  │ │  🔴 Vardiyanız iptal edildi          Bugün 14:32  🔵  │ │     "24 Nisan vardiyanız iptal edildi."              │ │     \[Ajansı Ara\]                                     │ │  ──────────────────────────────────────────────────  │ │  🟠 Bakım planı güncellendi          Bugün 12:15     │ │     "Bakım planında değişiklik var."                 │ │     \[Planı Gör\]                                      │ │  ──────────────────────────────────────────────────  │ │  🔵 Yeni mesajınız var               Bugün 11:42  🔵  │ │     "Koordinatörünüzden yeni mesaj"                  │ │     \[Mesajı Aç\]                                      │ │  ──────────────────────────────────────────────────  │ │  ⚪ Haftalık özet hazır               Dün 08:00      │ │     "Bu hafta 5 vardiya tamamlandı."                 │ └──────────────────────────────────────────────────────┘    🔵 \= Okunmamış göstergesi |
| :---- |

## **6.2 UI Etkileşim Kuralları**

| Etkileşim | Davranış |
| :---- | :---- |
| Bildirime dokun | is\_read \= true → deep\_link ile ilgili ekrana git |
| Kaydır (swipe left) | "Sil" seçeneği → soft delete (is\_deleted \= true) |
| "Tümünü Okundu İşaretle" | Tüm görünen bildirimleri okundu işaretle |
| Filtre sekmesi | Seçili kategoriye göre filtrele (DB query) |
| Yenile (pull-to-refresh) | Son bildirimleri çek |
| Sayfalama (pagination) | 20 bildirim per sayfa, infinite scroll |
| P1 bildirim banner | Ekranın üstünde kırmızı banner — her ekranda görünür |

## **6.3 Okunmamış Badge Kuralları**

* Alt navigasyon "Bildirimler" ikonunda toplam okunmamış sayısı gösterilir

* Uygulama simgesinde iOS/Android app badge: toplam okunmamış bildirim sayısı

* Bildirim okunduğunda badge otomatik azalır

* Mesaj bildirimleri için Mesajlar ikonunda ayrıca badge gösterilir (PRD 06 ile tutarlı)

# **7\. Bildirim Tercih Merkezi**

Bakıcı, hangi bildirimleri almak istediğini özelleştirebilir. P1 (kritik) bildirimleri her zaman açık tutulur; kullanıcı kapatamaz. Bu, hasta ve bakıcı güvenliği için zorunlu bir tasarım kararıdır.

| ▐ Tercih Merkezi — Wire Frame ┌──────────────────────────────────────────────────────┐ │  Bildirim Ayarları                                   │ │  ──────────────────────────────────────────────────  │ │  📅 Vardiya Bildirimleri                              │ │     Vardiya iptali          \[Açık — kapatılamaz 🔒\]  │ │     Vardiya hatırlatma      \[  ●  Açık           \]   │ │     Check-in hatırlatma     \[  ●  Açık           \]   │ │  ──────────────────────────────────────────────────  │ │  ✅ Görev Bildirimleri                                │ │     Yeni görev              \[  ●  Açık           \]   │ │     Gecikmiş görev          \[  ●  Açık           \]   │ │  ──────────────────────────────────────────────────  │ │  💬 Mesaj Bildirimleri                                │ │     Yeni mesaj              \[  ●  Açık           \]   │ │     Ajans duyurusu          \[  ●  Açık           \]   │ │  ──────────────────────────────────────────────────  │ │  🌙 Sessiz Mod (Do Not Disturb)                       │ │     \[  ●  Açık  \]  22:00 — 07:00                     │ │     P1 kritik bildirimler sessiz modda da gelir       │ └──────────────────────────────────────────────────────┘ |
| :---- |

## **7.1 Do Not Disturb (Sessiz Mod)**

Bakıcı belirli bir zaman aralığını sessiz mod olarak tanımlayabilir. Bu süre içinde P3 ve P4 bildirimleri sessiz olarak iletilir (in-app birikir). P1 kritik bildirimler her zaman sesli gelir (override\_p1 \= true varsayılan).

| Ayar | Varsayılan | Kullanıcı Değiştirebilir mi? |
| :---- | :---- | :---- |
| Sessiz mod saatleri | 22:00–07:00 | Evet |
| P1 sesli mod override | Açık (her zaman P1 sesli) | Evet (kapatma önerilmez — uyarı gösterilir) |
| Hafta sonu farklı saat | Yok (V1) | Hayır (V2) |
| Shift aktifken sessiz mod | Devre dışı (shift aktifse DND uygulanmaz) | Hayır |

**⚠ Güvenlik Uyarısı: Bakıcı P1 sesli modunu kapatmak isterse "Vardiya iptali gibi kritik bildirimler sessiz kalır, bunu onaylıyor musunuz?" uyarı dialogu gösterilir.**

# **8\. Performans Hedefleri**

| Metrik | Hedef | Not |
| :---- | :---- | :---- |
| Bildirim iletim gecikmesi (P1) | ≤ 2 saniye (olay → push) | APNs/FCM callback izlenir |
| Bildirim iletim gecikmesi (P2) | ≤ 5 saniye | Normal yük altında |
| In-app bildirim yükleme | ≤ 1 saniye (20 bildirim) | Pagination \+ index |
| Push teslim oranı | ≥ %99 aktif cihazlar için | APNs/FCM analytics |
| Toplu bildirim işleme | 5 dk pencere içinde gruplandırma | Background job |
| DND kontrolü | ≤ 10ms per bildirim | Cache ile optimize |

# **9\. V2+ Yol Haritası**

| Özellik | Açıklama |
| :---- | :---- |
| E-posta özet bildirimleri | Günlük/haftalık bildirim özeti e-posta ile |
| SMS bildirimleri (P1) | Push ulaşamazsa SMS fallback — Twilio CA |
| Wearable desteği | Apple Watch / Wear OS bildirim iletimi |
| Akıllı bildirim zamanlama | ML ile bakıcı kullanım saatine göre optimum gönderim zamanı |
| Hafta sonu DND ayrımı | Haftaiçi/hafta sonu farklı sessiz mod saatleri |
| Bildirim analitik panosu (yönetici) | Ajans bazında teslim oranı, okunma oranı, opt-out izleme |

# **10\. Açık Sorular**

| \# | Soru | Öneri | Karar Sahibi |
| :---- | :---- | :---- | :---- |
| 1 | Push provider: Firebase FCM mi, OneSignal mi, Expo Notifications mi? | React Native ise Expo Notifications (FCM/APNs wrapper) → en az kod; PHI payload kontrolü kolay | Teknik |
| 2 | P2 bildirimleri de sessize alınamaz mı? | V1'de P2 kapatılamaz öneridir; bakıcı feedback ile V2'de P2 opsiyonel yapılabilir | Ürün |
| 3 | Bildirim saklama süresi ne kadar? | 90 gün (in-app görünürlük); DB'de 7 yıl (PHIPA audit) | Hukuk |
| 4 | Ajans yöneticisi bireysel bakıcının tercihlerini görebilmeli mi? | Opt-out oranını görür ama kişisel tercihi görmez (PIPEDA) | Hukuk |
| 5 | Bildirim içeriği şifrelenmeli mi? | PHI içeren body\_text şifreli saklanmalı; push title şifresiz ama PHI içermemeli | Teknik |

# **11\. Onay ve Revizyonlar**

| Rol | İsim | Tarih | Durum |
| :---- | :---- | :---- | :---- |
| Ürün Sahibi | Efe İşikyüzlü |  | Bekliyor |
| Klinik Danışman (FTR Uzmanı) |  |  | Bekliyor |
| Hukuk / PHIPA Revizyonu |  |  | Bekliyor |
| Baş Geliştirici |  |  | Bekliyor |

**⚠ Push bildirim PHI kuralları ve DND güvenlik override politikası hukuki incelemeden geçirilmelidir.**

# 8️⃣ PRD 08 — Lone-Worker Güvenliği & Eskalasyon (V1 — kapsam rezervasyonu)

> [YENİ — 2026-07-22, KARAR K1'in V1 ayağı · ÖNERİLEN DEFAULT, klinik + İK/İş Hukuku teyidi bekliyor] Bu bölüm, atlanmış "PRD 08" numarasını kapatır. **V0'da bu modülün hiçbir davranışı kodlanmaz**; burada yalnız V1 kapsam iskeleti sabitlenir ki numara boşluğu ve lone-worker açığı izlenebilir kalsın.

**Amaç:** Tek başına sahada çalışan bakıcının (PSW/RPN/RN) kendi güvenliği. Hastaya yönelik SOS'tan (Patient app, B7) tamamen ayrıdır.

**V1 kapsamı (iskelet):**

1. **Kaçırılmış check-out eskalasyonu** — planlanan vardiya bitişi + X saat (config, öneri 2s) içinde check-out yoksa: bakıcıya uyarı → yanıt yoksa koordinatöre `Notification` (`event_type: caregiver_checkout`, ajans bağlıysa). Bağımsız bakıcıda alıcı: hasta birincil aile üyesi (opt-in).
2. **Vardiya-içi durum yoklaması (opsiyonel, ajans-config)** — uzun vardiyalarda (>6s) tek dokunuşlu "güvendeyim" yoklaması; yanıtsızlık koordinatöre bilgilendirme üretir. Klinik değerlendirme yok; yalnız operasyonel sinyal.
3. **Kişisel acil kısayolu** — bakıcının kendi 911 araması için hızlı erişim (native dialer; B7 kuralları geçerli: cevaplandı-varsayımı yok, açık iptal penceresi). `CallAttemptLog.call_type=regular`, `target_type=emergency_services`.
4. **Veri:** yeni tablo YOK. Mevcut `CaregiverShift`, `Notification`, `CallAttemptLog` yeterli; yoklama için `CaregiverShift`e nullable `last_wellness_ping_at` kolonu (V1 migration).

**Kapsam dışı (her sürümde):** konum takibi ile otomatik tehlike tespiti, klinik triage, "düşme algılama" vb. — SaMD sınıfı davranışlardır, eklenmez.

---

# 1️⃣ Profile & Settings

**Sinalytix**

Caregiver App — PRD 09

**Profile & Settings (Profil ve Ayarlar)**

Versiyon: 0.1 — Nisan 2026

Hedef Pazar: Kanada (Ontario odaklı)

Durum: Araştırma Destekli İlk Taslak

# **1\. Amaç ve Kapsam**

Bu PRD, Sinalytix Caregiver App'ın Profile & Settings (Profil ve Ayarlar) özelliğini tanımlar. Bakıcı; kişisel profil bilgilerini görüntüleyebilir, müsaitlik durumunu yönetebilir, sertifikasyon belgelerini takip edebilir, uygulama tercihlerini ayarlayabilir ve güvenlik ayarlarını yönetebilir.

Bu ekran iki ana bölümden oluşur: (1) Bakıcı Profili — kimlik, sertifikasyonlar, müsaitlik; (2) Uygulama Ayarları — bildirimler, gizlilik, güvenlik, dil/erişilebilirlik.

## **1.1 Kapsam**

| Kapsam | V1 Dahil mi? | Açıklama |
| :---- | :---- | :---- |
| Profil görüntüleme (ad, fotoğraf, rol, ajans) | Evet | Kimlik doğrulama ve tanıma |
| İletişim bilgileri görüntüleme | Evet | E-posta, telefon (read-only) |
| Müsaitlik durumu (available/unavailable) | Evet | Koordinatore görünür |
| Sertifikasyon belgesi listesi ve son kullanma tarihleri | Evet | CPR, First Aid, PSW sertifikası vb. |
| Bildirim tercih merkezi | Evet | PRD 07 ile entegre |
| Dil seçimi (EN/FR) | Evet | Ontario iki dilli gereksinim |
| Erişilebilirlik ayarları | Evet | Yazı boyutu, yüksek kontrast |
| PIN / biyometrik kilit ayarı | Evet | PHIPA oturum güvenliği |
| Çıkış (Logout) | Evet | Güvenli oturum kapatma |
| Profil bilgilerini düzenleme | Kısmi | Bazıları bakıcı, bazıları koordinatör düzenler |
| Şifre değiştirme | Evet | Güvenlik |
| Hesap silme | Hayır (V2) | Hukuki süreç gerektirir |
| Ücret/ödeme bilgileri | Hayır | Ayrı HR/payroll sistemi |
| Performans değerlendirme görüntüleme | Hayır (V2) | HR modülü |

# **2\. Bakıcı Profili**

## **2.1 Profil Görüntüleme**

| ▐ Profil Ekranı — Wire Frame ┌──────────────────────────────────────────────────────┐ │  \[Fotoğraf\]  Sarah Kim                               │ │              PSW — Sinalytix Home Care               │ │              Çalışan No: SC-00124                    │ │              \[Fotoğrafı Değiştir\]                    │ │  ──────────────────────────────────────────────────  │ │  İletişim                                            │ │  E-posta:    sarah.kim@email.com     (düzenlenemez)  │ │  Telefon:    \+1 (416) 555-0187       \[Düzenle\]       │ │  ──────────────────────────────────────────────────  │ │  Durum       ●  Müsait               \[Değiştir\]      │ │  Son güncelleme: Bugün 08:45                         │ │  ──────────────────────────────────────────────────  │ │  Sertifikasyonlar                                    │ │  ✅ PSW Sertifikası          Son: Aralık 2027        │ │  ✅ CPR (Basic Life Support) Son: Haziran 2026       │ │  ⚠  First Aid               Son: Mayıs 2026 (30 gün)│ │  ──────────────────────────────────────────────────  │ │  \[⚙ Uygulama Ayarları\]                               │ │  \[❓ Yardım & Destek\]                                │ │  \[🚪 Çıkış\]                                          │ └──────────────────────────────────────────────────────┘ |
| :---- |

## **2.2 Profil Alanları ve Düzenleme Yetkileri**

| Alan | Bakıcı Düzenleyebilir mi? | Koordinatör Düzenleyebilir mi? | Kaynak Tablo |
| :---- | :---- | :---- | :---- |
| Ad / Soyad | Hayır | Evet | users.full\_name |
| Profil fotoğrafı | Evet | Evet | users.avatar\_url |
| E-posta adresi | Hayır | Evet (HR sürecinde) | users.email |
| Telefon numarası | Evet | Evet | caregiver\_profiles.phone |
| Çalışan numarası | Hayır (sistem atar) | Hayır | caregiver\_profiles.employee\_id |
| Rol / Ünvan | Hayır | Evet | caregiver\_profiles.role\_type |
| Müsaitlik durumu | Evet | Evet (override) | caregiver\_profiles.availability\_status |
| Sertifikasyon belgeleri | Evet (yükle) | Evet (onay) | caregiver\_certifications |

## **2.3 Müsaitlik Durumu Yönetimi**

Bakıcı, müsaitlik durumunu "Müsait" veya "Müsait Değil" olarak işaretleyebilir. Bu durum koordinatörün shift atama arayüzünde görünür. İzin talebi V1'de sadece mesaj yoluyla yapılır; V2'de resmi izin talebi formu eklenecektir.

| Durum | Açıklama | Koordinatör Görünümü |
| :---- | :---- | :---- |
| Müsait (available) | Yeni vardiya ataması alabilir | Yeşil nokta — shift atanabilir |
| Müsait Değil (unavailable) | Geçici: hastalık, izin, kişisel | Kırmızı nokta — atama yapılmaz |
| Aktif Vardiyada | Süren shift var — otomatik olarak sistem işler | Mavi nokta — sahada |

**📌 Tasarım Notu: "Müsait Değil" seçildiğinde bakıcı kısa bir neden belirtebilir ("Hastalık", "İzin", "Kişisel"). Bu bilgi koordinatöre gösterilir ancak klinik ya da yasal kayıt oluşturmaz.**

## **2.4 Sertifikasyon Takibi**

Bakıcının aktif sertifikasyonları, son kullanma tarihleri ve durum göstergeleri profil ekranında listelenir. Son kullanma tarihine 60 gün kala uyarı bildirimi ve 30 gün kala kırmızı uyarı gösterilir.

| Sertifika Tipi | Zorunlu mu? | Uyarı Eşiği | Güncelleme |
| :---- | :---- | :---- | :---- |
| PSW Sertifikası (Ontario) | Evet | 90 gün | Koordinatör onaylı yükleme |
| CPR — Basic Life Support | Evet | 60 gün | Bakıcı yükler \+ koordinatör onay |
| First Aid | Evet | 60 gün | Bakıcı yükler \+ koordinatör onay |
| TB Testi / Immunization | Ajanstan ajansal değişir | 30 gün | Koordinatör yükler |
| Ek eğitim sertifikaları | Hayır (opsiyonel) | Bildirim yok | Bakıcı yükler |

### **Sertifika Durum Göstergeleri**

| Gösterge | Renk | Anlamı |
| :---- | :---- | :---- |
| ✅ Geçerli | Yeşil | Geçerlilik süresi \> 60 gün |
| ⚠ Yaklaşıyor | Sarı | 30–60 gün kalmış — yenileme önerilir |
| 🔴 Acil | Kırmızı | \< 30 gün kalmış — yenileme zorunlu |
| ❌ Süresi Dolmuş | Koyu kırmızı | Süresi geçmiş — koordinatör bildirildi |

**⚠ Süresi Dolmuş Sertifika: Zorunlu bir sertifika (PSW, CPR, First Aid) süresi geçtiğinde koordinatör bildirim alır. Bu PRD'de bakıcının shift atanıp atanmayacağı kararı koordinatör/yönetici tarafından verilir; uygulama otomatik bloke etmez (V1). V2'de otomatik bloke kuralı eklenebilir.**

# **3\. Veri Modeli**

### **caregiver\_profiles**

> [RECONCILED: kalite] Bu tablo, Onboarding §6.2'deki **kanonik `CaregiverProfile` ile AYNI tablodur** (iki ayrı tablo değil; tek kanonik tanım — Dictionary §1). `role_type` kolonu kanonik `role` alanına eşlenir ve enum uzlaştırıldı: {psw\|rpn\|rn\|hca\|coordinator\|admin\|other}. [RECONCILED: A8] `user_id` FK kanonik tekil `User`'a, `agency_id` FK `Organization`'a referans verir (`users`/`agencies` çoğul-küçük formlar yerel takma adlardır).

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| id | UUID PK | Profil ID |
| user\_id | UUID FK → User (tekil; eski: users) | Bağlı kullanıcı hesabı |
| employee\_id | VARCHAR(32) UNIQUE | Ajans çalışan numarası |
| role\_type | ENUM('psw','rpn','rn','hca','coordinator','admin','other') | Bakıcı rolü (kanonik `role`; uzlaştırılmış enum) |
| phone | VARCHAR(20) | Telefon numarası |
| availability\_status | ENUM('available','unavailable','on\_shift') | Müsaitlik durumu |
| availability\_note | VARCHAR(256) NULL | Müsait değil gerekçesi (opsiyonel) |
| availability\_updated\_at | TIMESTAMPTZ | Son durum güncelleme zamanı |
| agency\_id | UUID FK → agencies | Bağlı ajans |
| hire\_date | DATE | İşe başlama tarihi |
| created\_at | TIMESTAMPTZ | Kayıt oluşturulma |
| updated\_at | TIMESTAMPTZ | Son güncelleme |

### **caregiver\_certifications**

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| id | UUID PK | Sertifika kaydı ID |
| caregiver\_id | UUID FK → caregiver\_profiles | Bakıcı referansı |
| cert\_type | VARCHAR(64) | PSW, CPR, First\_Aid, TB\_Test, Other vb. |
| cert\_name | VARCHAR(256) | Sertifika tam adı |
| issue\_date | DATE | Veriliş tarihi |
| expiry\_date | DATE | Son kullanma tarihi |
| document\_url | VARCHAR(512) NULL | Yüklenen belge URL (şifrelenmiş storage) |
| status | ENUM('valid','expiring\_soon','urgent','expired') | Hesaplanan durum (TTL bazlı) |
| approved\_by | UUID FK → User NULL (eski: users) | Koordinatör onay kaydı [RECONCILED: A8] |
| approved\_at | TIMESTAMPTZ NULL | Onay zamanı |
| created\_at | TIMESTAMPTZ | Kayıt oluşturulma |

### **user\_app\_settings**

| Kolon | Tip | Açıklama |
| :---- | :---- | :---- |
| user\_id | UUID FK → User PK (eski: users) | Kullanıcı referansı [RECONCILED: A8] |
| language | ENUM('en','fr') DEFAULT 'en' | Uygulama dili |
| font\_size | ENUM('normal','large','x\_large') DEFAULT 'normal' | Yazı büyüklüğü |
| high\_contrast | BOOLEAN DEFAULT false | Yüksek kontrast modu |
| biometric\_lock | BOOLEAN DEFAULT false | Biyometrik kilit aktif mi? |
| pin\_lock | BOOLEAN DEFAULT false | PIN kilit aktif mi? |
| auto\_lock\_minutes | INTEGER DEFAULT 5 | Otomatik kilit süresi (dakika) |
| updated\_at | TIMESTAMPTZ | Son güncelleme |

# **4\. Uygulama Ayarları**

| ▐ Ayarlar Ekranı — Wire Frame ┌──────────────────────────────────────────────────────┐ │  ← Ayarlar                                           │ │  ──────────────────────────────────────────────────  │ │  🔔 Bildirim Ayarları                     \[Git \>\]    │ │     (PRD 07 Tercih Merkezi ile bağlantılı)           │ │  ──────────────────────────────────────────────────  │ │  🔐 Güvenlik                                         │ │     PIN Kodu            \[  ○  Kapalı  \]              │ │     Yüz/Parmak İzi      \[  ●  Açık   \]               │ │     Otomatik Kilit      5 dakika      \[Değiştir\]     │ │     Şifre Değiştir                    \[Git \>\]        │ │  ──────────────────────────────────────────────────  │ │  🌐 Dil                                              │ │     \[English ✓\]  \[Français\]                          │ │  ──────────────────────────────────────────────────  │ │  ♿ Erişilebilirlik                                   │ │     Yazı Büyüklüğü   Normal | Büyük | Çok Büyük     │ │     Yüksek Kontrast  \[  ○  Kapalı  \]                 │ │  ──────────────────────────────────────────────────  │ │  📱 Uygulama                                         │ │     Versiyon: 1.0.0 (Build 42\)                       │ │     Önbelleği Temizle                 \[Temizle\]      │ │  ──────────────────────────────────────────────────  │ │  📄 Yasal                                            │ │     Gizlilik Politikası               \[Oku \>\]        │ │     Kullanım Şartları                 \[Oku \>\]        │ │     PHIPA Veri Uygulaması             \[Oku \>\]        │ └──────────────────────────────────────────────────────┘ |
| :---- |

## **4.1 Güvenlik Ayarları**

| Ayar | Seçenekler | Varsayılan | Not |
| :---- | :---- | :---- | :---- |
| PIN Kodu | Açık / Kapalı; 6 haneli PIN | Kapalı | Biyometrik yoksa önerilir |
| Biyometrik Kilit | Face ID / Touch ID (cihaz desteğine göre) | Kapalı | Açınca PIN de aktifleştirilmeli |
| Otomatik Kilit Süresi | 1 dk / 5 dk / 15 dk / Hiç | 5 dakika | PHIPA idle session önerisi |
| Aktif Shift'te Kilit | Shift aktifken auto-lock devre dışı bırakılabilir | Shift aktifse 15 dk | Saha kullanım kolaylığı |
| Şifre Değiştirme | Mevcut şifre \+ yeni şifre \+ onay | N/A | Email doğrulama olmadan değişmez |

🔐 Güvenlik Zorunluluğu: Bakıcı uygulamaya giriş yaptığında, eğer PIN veya biyometrik kilit henüz kurulmamışsa ilk açılışta kurulum teşvik edilir (zorunlu değil — V1). PHIPA idle session önerisi: 30 dakika inaktivite sonrası session geçersizleşmeli (PRD 03 ile tutarlı).

## **4.2 Dil ve Erişilebilirlik**

| Ayar | V1 Seçenekler | Not |
| :---- | :---- | :---- |
| Uygulama Dili | İngilizce (EN), Fransızca (FR) | Ontario Fransızca Dil Hizmetleri Yasası (FLSA) |
| Yazı Büyüklüğü | Normal, Büyük, Çok Büyük | PSW yaşlı nüfusla çalışırken cihazı okuma |
| Yüksek Kontrast | Açık / Kapalı | Düşük ışıkta kullanım; görme engeli desteği |
| Ekran Okuyucu Desteği | iOS VoiceOver / Android TalkBack uyumluluğu | WCAG 2.1 AA hedefi — V1 |

**🌐 Fransızca Gereksinimi: Ontario Fransızca Dil Hizmetleri Yasası (FLSA) kapsamındaki ajanslar için Fransızca dil desteği zorunlu olabilir. V1'de arayüz Fransızca çevirisi entegre edilmeli; bakıcı dil tercihini istediği zaman değiştirebilmelidir.**

## **4.3 Önbellek Temizleme**

"Önbelleği Temizle" işlevi: cihazda yerel olarak saklanan geçici uygulama verilerini siler. Bu işlem aktif bir shift sırasında yapılamaz (veri kaybı riski).

* Aktif shift varsa "Önbelleği Temizle" butonu pasif (disabled) gösterilir

* Temizleme onay dialogu: "Yerel önbellek silinecek. Bağlantı gerektiğinde veriler yeniden yüklenecektir."

* Temizleme sonrası hasta PHI'si cihazdan kaldırılır (güvenlik bonus)

## **4.4 Yasal Dokümanlar**

| Doküman | Güncelleme Yetkisi | Kullanıcı Aksiyonu |
| :---- | :---- | :---- |
| Gizlilik Politikası | Sinalytix legal team | Sadece okuma; kabul onboarding'de alındı |
| Kullanım Şartları | Sinalytix legal team | Sadece okuma |
| PHIPA Veri Uygulaması | Sinalytix legal team | Sadece okuma; AI consent de burada |
| AI Kullanım Onayı | Sinalytix legal team | Onboarding'de alındı; buradan iptal edilebilir |

📌 Onay İptali: Kullanıcı "AI Kullanım Onayını" bu ekrandan iptal edebilir. İptal edildiğinde ai\_consent\_record.revoked\_at güncellenir ve AI Agent özelliği devre dışı bırakılır (PRD 05 ile tutarlı).

# **5\. Güvenli Çıkış (Logout)**

"Çıkış" butonu; kullanıcıyı oturumdan çıkarır, tüm yerel önbellek temizlenir ve cihazdan PHI kaldırılır. Aktif bir shift varsa çıkış yapmadan önce uyarı gösterilir.

| ▐ Logout Akışı 1\. Kullanıcı \[Çıkış\] butonuna basar 2a. AKTİF VARDİYA VAR:     "Aktif vardiyanız devam ediyor. Çıkış yapmadan önce      checkout yapmanız önerilir. Yine de çıkmak istiyor      musunuz?"  \[İptal\]  \[Yine de Çıkış Yap\] 2b. AKTİF VARDİYA YOK:     "Çıkış yapmak istediğinizden emin misiniz?"     \[İptal\]  \[Çıkış Yap\] 3\. Onay → session token geçersizleştirilir (server-side) 4\. SQLite yerel önbellek temizlenir 5\. Bildirim token (APNs/FCM) cihazdan kaldırılır 6\. Login ekranına yönlendirme |
| :---- |

🔐 PHIPA Uyumu: Logout sırasında cihazda kalan tüm hasta PHI'si (SQLite, image cache, bildirim geçmişi dahil) temizlenmelidir. Bu hem PHIPA hem de Apple App Store / Google Play güvenlik politikalarıyla uyumludur.

# **6\. Açık Sorular**

| \# | Soru | Öneri | Karar Sahibi |
| :---- | :---- | :---- | :---- |
| 1 | Bakıcı kendi e-posta adresini değiştirebilmeli mi? | Hayır — e-posta login credential; koordinatör/HR değiştirir | Ürün \+ Güvenlik |
| 2 | Müsaitlik durumu neden değiştirilemez? Ajans kısıtlaması var mı? | V1'de bakıcı serbestçe değiştirir; koordinatör override edebilir | Ürün |
| 3 | Sertifika yükleme formatı: PDF mi, fotoğraf mı? | Her ikisi de; max 10MB; PDF veya JPEG/PNG | Teknik |
| 4 | Süresi dolmuş sertifika otomatik shift engeli V2'de gelecekse, V1'de uyarı yeterli mi? | Evet — V1'de sadece uyarı; koordinatör kararı | Klinik \+ Ürün |
| 5 | Yüksek kontrast renk paleti erişilebilirlik standardıyla uyumlu mu (WCAG 2.1 AA)? | Tasarım sürecinde doğrulanmalı | UX \+ Teknik |
| 6 | AI onayı profil ekranından iptal edilebiliyorsa, iptal anında AI chat geçmişi silinmeli mi? | Hayır — audit amacıyla DB'de saklanır; ama yeni sorgu yapılamaz | Hukuk |

# **7\. Onay ve Revizyonlar**

| Rol | İsim | Tarih | Durum |
| :---- | :---- | :---- | :---- |
| Ürün Sahibi | Efe İşikyüzlü |  | Bekliyor |
| Klinik Danışman (FTR Uzmanı) |  |  | Bekliyor |
| Hukuk / PHIPA Revizyonu |  |  | Bekliyor |
| Baş Geliştirici |  |  | Bekliyor |

**⚠ Sertifika takip politikası (hangi sertifikalar zorunlu, ne zaman bloke edilir) ajans operasyon kurallarına göre belirlenmeli; Fransızca dil desteği yasal gereksinimle teyit edilmeli.**

