> **[RECONCILED 2026-06-28 — Canonical Data Dictionary v0.1]** Kararlar B1–B10 uygulandı.

# 0️⃣ Onboarding

# **Onboarding**

**Release Version:** MVP **Uygulama İçi Konumu:** İlk açılış. Bir kez tamamlandıktan sonra tekrar tetiklenmez.

---

## **1\. Özelliğin Tanımı ve Amacı**

**Tanım:** Patient uygulamasında ilk kurulumda çalışan onboarding akışı. Kullanıcıyı minimum sürtünmeyle içeri alırken regülasyon sınırları içinde gerekli rıza ve uyarıları toplar, temel profili başlatır. Auth akışı onboardingin son iki adımında yer alır; önceki adımlar yerel (local) depolamada tutulur ve auth başarıyla tamamlandıktan sonra backend'e aktarılır.

**Amaçlar:**

* Kullanıcıyı hızlıca uygulama içine almak. Hedef kitle yaşlı ve teknoloji uyumsuz olabilir; akış buna göre tasarlanır.  
* Açık rıza (explicit consent) ve gerekli regülasyon dili ile Medical Device sınıf riskini yönetmek.  
* Kritik minimumları toplamak: dil tercihi, güvenlik onayı, acil durum kişisi, temel sağlık profili.  
* Auth sürtünmesini sona taşıyarak onboarding terk oranını düşürmek.

**Regülasyon dili (onboardingde görünür olmalı):**

* "Sinalytix bir acil doktor hizmeti değildir."  
* "Teşhis koymaz, tedavi veya dozaj önermez."  
* "Acil durumlarda yetkilileri arayın (911)."  
* "Uygulama içindeki bilgiler kullanıcı beyanına veya bağlı kaynaklara dayanır; Sinalytix klinik karar verme yetkisine sahip değildir."

  ---

  ## **2\. Kapsam ve Kısıtlar**

  ### **2.1 Kapsam (In Scope)**

**V0 (MVP):**

* Slide-based tanıtım (2–3 ekran, placeholder)  
* Dil seçimi (zorunlu, cihaz diline göre öneri)  
* Açık rıza \+ güvenlik uyarıları kabulü (zorunlu)  
* Emergency contact girişi (zorunlu, max 1 kişi)  
* Sağlık profil seed: tanılı rahatsızlıklar \+ alerji (zorunlu, "Bilmiyorum" geçerli seçimdir)  
* Auth yöntemi seçimi ve tamamlama (Apple / Google / Telefon OTP)  
* Auth sonrası local verilerin backend'e aktarımı

**V1 eklemesi:**

* Sağlık portalı bağlama (opsiyonel adım, Step 4 ile Step 5 arasına girer)

**V2 eklemesi:**

* Belge upload \+ OCR (onboarding sonrası profil tamamlama akışında)

  ### **2.2 Kısıtlar (Constraints)**

* Akış "yaşlı/low-tech" için tasarlanır: kısa ekranlar, az metin, büyük butonlar.  
* Auth Step 0–4 arasında yoktur. Bu adımlardaki veriler cihazda local olarak tutulur.  
* Auth başarıyla tamamlanır tamamlanmaz tüm local onboarding verisi backend'e aktarılır ve kullanıcı hesabına bağlanır. Bundan sonra kullanıcı farklı cihazdan giriş yaptığında veriler hesabından erişilebilir.  
* SSO (Apple/Google) ile giriş, form adımlarını bypass etmez; sadece isim/e-posta gibi alanları prefill eder.  
* Telefon OTP yolunda SMS OTP zorunludur.  
* SSO yolunda SMS OTP gerekmez.  
* Onboarding tamamlandıktan sonra tekrar otomatik tetiklenmez. (Reset: ayrı admin/debug işlemi.)  
* Akış yarıda bırakılırsa, tekrar açılışta kaldığı adımdan devam eder.

  ### **2.3 Non-goals (Out of Scope)**

* İlaç adı/dozu toplamak (V1'de portal entegrasyonu ile otomatik gelir).  
* Belge upload, wearable veya Apple Health kurulumu (sürtünme artmaması için onboarding sonrasına kalır).  
* Bakıcı veya aile bağlama, doktor/klinik bilgisi (profil tamamlama akışında).  
* Emergency contact telefon doğrulaması (Profile & Settings'te yapılır, aşağıya bakınız).  
* Facebook SSO (kapsam dışı, eklenmeyecek).

  ### **2.4 Versiyonlama**

* **V0 (MVP):** Hasta profili oluşturma, bilgilendirme, rıza, acil kişi, sağlık seed, auth.  
* **V1:** Sağlık portalı entegrasyonu opsiyonel adım olarak eklenir.  
* **V2:** Belge upload \+ OCR profil tamamlama akışında gelir.

  ---

  ## **3\. Kullanıcı Akışı**

  ### **3.1 Adım sırası (V0)**

  * Step 0 → Intro Slides (atlayabilir)  
  * Step 1 → Dil Seçimi (zorunlu) \[LOCAL\]  
  * Step 2 → Rıza \+ Güvenlik Uyarıları (zorunlu) \[LOCAL\]  
  * Step 3 → Emergency Contact (zorunlu, max 1\) \[LOCAL\]  
  * Step 4 → Sağlık Profil Seed (zorunlu, "Bilmiyorum" geçerli) \[LOCAL\]  
  * ──── V1 ekleme noktası: Sağlık Portalı Bağlama (opsiyonel) ────  
  * Step 5 → Auth Yöntemi Seçimi  
  * Step 6 → Auth (SSO tamamlama veya OTP doğrulama)  
  *          └→ Başarı: local data → backend transfer  
    Step 7 → Tamamlandı ekranı → Uygulamaya geç

    ### **3.2 Mermaid Diyagramı**

  * flowchart TD  
  *   A\[App First Launch\] \--\> B\[ONB\_00\_INTRO: Slide Intro 2-3\]  
  *   B \--\> C\[ONB\_01\_LANGUAGE: Dil Seçimi \- zorunlu \- LOCAL\]  
  *   C \--\> D\[ONB\_02\_CONSENT: Rıza \+ Güvenlik \- zorunlu \- LOCAL\]  
  *   D \--\> D1{Tüm checkbox işaretli?}  
  *   D1 \--\>|Hayır| D  
  *   D1 \--\>|Evet| E\[ONB\_03\_EC: Emergency Contact \- zorunlu \- LOCAL\]  
  *   E \--\> E1{Telefon format geçerli?}  
  *   E1 \--\>|Hayır| E  
  *   E1 \--\>|Evet| F\[ONB\_04\_SEED: Rahatsızlık \+ Alerji \- zorunlu \- LOCAL\]  
  *   F \--\> F1{En az 1 seçim yapıldı? \- Bilmiyorum dahil}  
  *   F1 \--\>|Hayır| F  
  *   F1 \--\>|Evet| G{V0 mü V1 mi?}  
  *   G \--\>|V0| H\[ONB\_05\_AUTH\_METHOD: Giriş Yöntemi Seç\]  
  *   G \--\>|V1| V1A\[ONB\_V1\_CONNECT: Sağlık Portalı Bağla \- opsiyonel\]  
  *   V1A \--\>|Bağlandı veya Geç| H  
  *   H \--\>|Apple veya Google| I\[SSO Flow \- platform native\]  
  *   H \--\>|Telefon OTP| J\[ONB\_05A\_PHONE: Telefon Numarası Gir\]  
  *   I \--\> I1{SSO Sonucu}  
  *   I1 \--\>|Başarılı| K\[Local Data → Backend Transfer\]  
  *   I1 \--\>|Başarısız| H  
  *   J \--\> J1\[OTP Gönder\]  
  *   J1 \--\> J2\[ONB\_05B\_OTP: OTP Doğrula\]  
  *   J2 \--\> J3{OTP Sonucu}  
  *   J3 \--\>|Başarılı| K  
  *   J3 \--\>|Başarısız| J2  
  *   K \--\> L\[ONB\_06\_DONE: Tamamlandı\]  
      L \--\> M\[Ana Ekran\]  
    ---

    ## **4\. Adım Adım Ekran Spesifikasyonları**

**Notasyon:** Required \= ilerlemek için zorunlu | Optional \= atlanabilir | Prefill \= SSO'dan dolu gelebilir ama kullanıcı düzenleyebilir

---

### **ONB\_00\_INTRO — Slide Intro**

* **UI Pattern:** Carousel / swipe (kaydırma ile geçiş)  
* **Slayt sayısı:** 2–3  
* **İçerik (V0 placeholder mesajlar):**  
  * Slayt 1: "Evde bakım artık herkes için daha kolay."  
  * Slayt 2: "Aile, bakıcı ve sağlık ekibin tek ekranda."  
  * Slayt 3: "Acil doktor servisi değildir. Acil durumlarda 911'i arayın."  
* **Input fields:** Yok  
* **Validations:** Yok  
* **Primary CTA:** `Devam` (son slaytta: `Başla`)  
* **Secondary CTA:** `Geç` (tüm intro'yu atlar, Step 1'e gider)  
* **Analytics:** `intro_slide_viewed { slide_index }`, `intro_skipped { at_slide_index }`

  ---

  ### **ONB\_01\_LANGUAGE — Dil Seçimi (Required) \[LOCAL\]**

* **Input fields:**  
  * `selected_language` (enum: `en`, `fr`, `tr`, genişletilebilir)  
* **Prefill:** Cihaz dili / bölge önerisi  
* **Validations:** `selected_language` boş geçilemez  
* **Local storage:** `onboarding_draft.language`  
* **Primary CTA:** `Devam`  
* **Secondary CTA:** `Geri` (intro'ya)  
* **Analytics:** `language_selected { selected_language, suggested_language, changed_from_suggested: bool }`

  ---

  ### **ONB\_02\_CONSENT — Rıza \+ Güvenlik Uyarıları (Required) \[LOCAL\]**

* **UI Pattern:** Checkbox seti. Scroll zorunluluğu yok; kullanıcı direkt onaylayabilir.  
* **Input fields (checkbox):**  
  * `accept_tos` (Required) — "Kullanım Koşulları'nı okudum ve kabul ediyorum"  
  * `accept_privacy` (Required) — "Gizlilik Politikasını okudum ve kabul ediyorum"  
  * `ack_not_emergency` (Required) — "Bu uygulama acil durum servisi değildir. Acil durumlarda 911'i ararım."  
* **Görünür uyarı metni (checkbox'ların üzerinde):**  
  * "Sinalytix teşhis koymaz, tedavi önermez. Klinik kararlar yalnızca lisanslı sağlık profesyonellerine aittir."  
* **Validations:** Tüm required checkbox'lar işaretli değilse CTA disabled.  
* **Local storage:** `onboarding_draft.consent { accept_tos, accept_privacy, ack_not_emergency, consented_at }`  
* **Backend'e yazılacak:** Auth sonrası `ConsentRecord { version, flags, timestamp }` — audit için immutable.  
* **Primary CTA:** `Kabul Et ve Devam`  
* **Secondary CTA:** `Geri`  
* **Analytics:** `consent_completed { all_accepted: bool }`

  ---

  ### **ONB\_03\_EC — Emergency Contact (Required, max 1\) \[LOCAL\]**

* **Input fields:**  
  * `ec_name` (string, zorunlu) — Ad Soyad  
  * `ec_relationship` (string, zorunlu) — Yakınlık (serbest metin veya kısa liste: Eş / Çocuk / Kardeş / Arkadaş / Diğer)  
  * `ec_phone` (string, zorunlu) — Telefon numarası  
* **Validations:**  
  * `ec_name` boş olamaz  
  * `ec_phone` format kontrolü (E.164 normalizasyonu, ülke kodu)  
* **Önemli not:** Bu aşamada telefon doğrulama (SMS ile teyit) yapılmaz. Doğrulama Profile & Settings'te tamamlanır. Kullanıcı bu ekranda bir banner görür: "Acil kişinin numarasını daha sonra profilinden doğrulayabilirsin."  
* **Local storage:** `onboarding_draft.emergency_contact { name, relationship, phone, verified: false }`  
* **Backend'e yazılacak:** Auth sonrası `EmergencyContact` entity, `verified: false` ile oluşturulur.  
* **Primary CTA:** `Kaydet ve Devam`  
* **Secondary CTA:** `Geri`  
* **Analytics:** `emergency_contact_added { relationship_type, phone_country_code }`

  ---

  ### **ONB\_04\_SEED — Sağlık Profil Seed (Required) \[LOCAL\]**

* **Amaç:** Uygulamanın görev ve bakım akışlarını kişiselleştirmesi için minimum sağlık verisi. Self-declared (kullanıcı beyanı) olarak toplanır; klinik doğrulama iddiası yoktur.  
* **Ekran 1 — Tanılı Rahatsızlıklar:**  
  * "Sağlık durumunla ilgili aşağıdakilerden uygun olanları seç."  
  * **Liste (çoklu seçim):**  
    * Demans / Alzheimer  
    * Parkinson  
    * Multipl Skleroz (MS)  
    * İnme / Felç (Stroke)  
    * Kalp Yetmezliği (CHF)  
    * Koroner Arter Hastalığı / Kalp Krizi  
    * Hipertansiyon (Yüksek Tansiyon)  
    * Tip 1 Diyabet  
    * Tip 2 Diyabet  
    * KOAH / Astım  
    * Kronik Böbrek Hastalığı  
    * Kanser / Onkolojik Takip  
    * Ortopedik / Ameliyat Sonrası Takip  
    * Palyatif Bakım  
    * Diğer (kısa serbest metin)  
    * **Bilmiyorum / Seçmek İstemiyorum** ← bu seçim geçerlidir, onboarding ilerleyebilir  
  * **Kural:** En az 1 seçim (veya "Bilmiyorum") yapılmadan CTA disabled.  
* **Ekran 2 — Alerji:**  
  * "Bilinen alerjin var mı?" (Evet / Hayır / Bilmiyorum)  
  * Evet seçilirse: kısa serbest metin alanı (ilaç, besin, diğer)  
* **Local storage:** `onboarding_draft.health_seed { conditions[], allergy_flag, allergy_notes, source: "self_declared" }`  
* **Backend'e yazılacak:** Auth sonrası `PatientProfile.conditions[]`, `PatientProfile.allergies[]`, `data_source: "self_declared"`  
* **Primary CTA:** `Devam`  
* **Secondary CTA:** `Geri`  
* **Analytics:** `health_seed_completed { condition_count, has_allergy, selected_unknown: bool }`

  ---

  ### **ONB\_V1\_CONNECT — Sağlık Portalı Bağlama (V1, Optional)**

Bu adım V1'de Step 4 ile Step 5 arasına girer.

* **Açıklama:** "Sağlık kayıtlarını bağla, ilaçların ve tanılarının otomatik gelsin."  
* **Desteklenen platformlar (V1 hedef):** DotHealth, PocketHealth, Medchart, Human API, TELUS Health  
* **Akış:** Platform seçimi → OAuth → import → profil seed'e prefill (kullanıcı onaylar)  
* **Import sonrası provenance:** `integrated_portal`  
* **Secondary CTA:** `Şimdilik Geç` (Step 5'e devam eder)

  ---

  ### **ONB\_05\_AUTH\_METHOD — Giriş Yöntemi Seçimi (Required)**

* **Butonlar:**  
  * `Apple ile Devam`  
  * `Google ile Devam`  
  * `Telefon Numarasıyla Devam`  
* **Validations:** Yok (seçim aksiyonu tetikler)  
* **Primary CTA:** Yok (butonlar aksiyon)  
* **Secondary CTA:** `Geri`  
* **Analytics:** `auth_method_selected { method: "apple|google|phone_otp" }`

  ---

  ### **ONB\_05A\_PHONE — Telefon Numarası (Phone OTP path)**

* **Input fields:**  
  * `phone_number` (E.164 normalizasyonu)  
* **Validations:** Format \+ ülke kodu \+ minimum uzunluk  
* **Primary CTA:** `Kod Gönder`  
* **Secondary CTA:** `Geri`  
* **System action:** OTP gönder, rate-limit uygula (max 3 istek / 10 dk)  
* **Analytics:** `otp_sent { phone_country_code, resend_count }`

  ---

  ### **ONB\_05B\_OTP — OTP Doğrulama (Phone OTP path)**

* **Input fields:**  
  * `otp_code` (6 hane numeric)  
* **Validations:** 6 hane, yalnızca rakam  
* **Timeout:** 5 dakika  
* **Error handling:**  
  * Yanlış kod: "Kod hatalı, tekrar dene." \+ retry sayacı  
  * Timeout: "Süre doldu." \+ resend CTA  
  * Max retry (3): "Çok fazla deneme. Lütfen yeni kod iste."  
* **Primary CTA:** `Doğrula`  
* **Secondary CTA:** `Kodu Tekrar Gönder`  
* **Auth başarısı tetikler:** Local data → backend transfer (aşağıya bakınız)  
* **Analytics:** `otp_verified { result: "success|fail", attempt_number, error_code? }`

  ---

  ### **\[AUTH SONRASI\] Local Data → Backend Transfer**

Auth (SSO veya OTP) başarıyla tamamlandıktan hemen sonra tetiklenir:

* 1\. User account oluşturulur / oturumu açılır  
  * 2\. onboarding\_draft local verisi okunur:  
  *    \- language → user.locale  
  *    \- consent → ConsentRecord { version, flags: { accept\_tos, accept\_privacy, ack\_not\_emergency }, timestamp, ip? }  *(RECONCILED: A12 — {tos,privacy,safety\_ack} varyantı kaldırıldı)*  
  *    \- emergency\_contact → EmergencyContact { name, relationship, phone, verified: false }  
  *    \- health\_seed → PatientProfile { conditions\[\], allergies\[\], data\_source: "self\_declared", seed\_at }  
  * 3\. Local draft temizlenir  
    4\. Onboarding state: completed \= true

Hata durumu: Transfer başarısız olursa retry mekanizması devreye girer. Kullanıcı tamamlandı ekranını görür; arka planda silent retry yapılır.

---

### **ONB\_06\_DONE — Tamamlandı**

* **Başlık:** "Hazırsın."  
* **Alt metin:** "Profilini dilediğinde tamamlayabilirsin."  
* **Primary CTA:** `Uygulamaya Geç`  
* **Secondary CTA (soft link):** `Profilimi Şimdi Tamamla` → Profile & Settings'e açılır  
* **Analytics:** `onboarding_completed { completion_time_ms }`

  ---

  ### **\[SONRASI\] Onboarding Dışına Taşınan İçerikler**

* Emergency contact telefon doğrulaması → **Profile & Settings**  
* Emergency contact artırma (max 3\) → **Profile & Settings**  
* Dil değiştirme → **Profile & Settings**  
* Wearable / cihaz kurulumu → **Profile & Settings (V2+)**  
* Belge upload \+ OCR → **Profil Tamamlama akışı (V2)**  
* Bakıcı / aile bağlama, doktor / klinik → **Profil Tamamlama akışı**  
* Sağlık portalı bağlama (opsiyonel) → **Profile & Settings (V1)**

  ---

  ## **5\. Veri ve Entegrasyon**

  ### **5.1 Local Storage Yapısı (Auth Öncesi)**

  * onboarding\_draft {  
  *   step\_progress: "intro|language|consent|ec|seed|auth\_method|auth|done"  
  *   language: string  
  *   consent: {  
  *     accept\_tos: bool  
  *     accept\_privacy: bool  
  *     ack\_not\_emergency: bool  
  *     consented\_at: timestamp  
  *   }  
  *   emergency\_contact: {  
  *     name: string  
  *     relationship: string  
  *     phone: string  
  *     verified: false  
  *   }  
  *   health\_seed: {  
  *     conditions: string\[\]          // seçili condition ID'leri veya "unknown"  
  *     allergy\_flag: "yes|no|unknown"  
  *     allergy\_notes: string | null  
  *     source: "self\_declared"  
  *   }  
    }

    ### **5.2 Backend Veri Modeli (Auth Sonrası Yazılan)**

**User**

* `user_id`  
* `roles[]`: `text[]` — `{ patient | family | caregiver | clinician | nurse | coordinator | admin }` `[RECONCILED: A2 — tekil `user_type` yerine çok-değerli `roles[]`; kanonik `User`+`roles[]` modeli]`  
* `locale` (dil seçiminden)  
* `auth_method`: `apple | google | phone_otp`  
* `created_at`  
* `onboarding_completed_at`

**ConsentRecord**

* `consent_id`  
* `user_id`  
* `version` (ToS/Privacy versiyon numarası)  
* `flags`: `{ accept_tos, accept_privacy, ack_not_emergency }`  
* `consented_at`  
* **NOT:** Bu tablo immutable'dır. Güncelleme olmaz, yeni kayıt açılır.

> [RECONCILED: B2 — `ConsentRecord` yalnız yasal/ToS onamını tutar. Çalışma-zamanı veri paylaşımı (ör. semptom raporunun aile/bakıcıya iletilmesi) `ConsentGrant` (+ gerekli yerlerde `SDMDeclaration`) ile gated'dır; bu tablolar kanonik veri sözlüğünde (§2) tanımlıdır ve default-deny çalışır. Canlı erişim enforcement'ı PolicyEngine/V1.]

**EmergencyContact**

> [RECONCILED: A11 — Kanonik tek şekil: `phone_verified` + `sort_order`. Eski `verified`→`phone_verified`, `is_primary` kaldırıldı (sıralama `sort_order` ile; primary = `sort_order = 1`).]

* `ec_id`  
* `user_id`  
* `name`, `relationship`, `phone`  
* `phone_verified`: `false` (başlangıçta)  
* `verified_at`: `null`  
* `sort_order`: `int` (SOS arama sırası; 1 = birincil)  
* `created_at`

**PatientProfile**

* `user_id`  
* `conditions`: `string[]` (condition ID listesi veya `["unknown"]`)  
* `allergies`: `{ flag: "yes|no|unknown", notes: string | null }`  
* `data_source`: `"self_declared"`  
* `seed_completed_at`  
* `last_updated_at`

  ### **5.3 Entegrasyonlar**

* **V1:** Sağlık portalı bağlama → import provenance: `integrated_portal`  
* **V2:** Belge upload \+ OCR → provenance: `document_uploaded` / `ocr_extracted`

  ---

  ## **6\. Kabul Kriterleri**

  ### **V0 Fonksiyonel**

* İlk launch'ta intro slides görünür; swipe veya "Devam" ile geçilir.  
* "Geç" ile intro atlanabilir.  
* Dil seçimi yapılmadan Step 2'ye geçilemez.  
* Consent ekranındaki tüm required checkbox'lar işaretlenmeden ilerleme olmaz.  
* Consent scroll zorunluluğu yoktur; kullanıcı direkt checkbox'ları işaretleyebilir.  
* Emergency contact (ad, yakınlık, telefon) girilmeden Step 4'e geçilemez.  
* Telefon format hatası inline olarak gösterilir, CTA disabled kalır.  
* Emergency contact onboardingde doğrulanmaz; `verified: false` ile kaydedilir.  
* Health seed'de "Bilmiyorum / Seçmek İstemiyorum" geçerli bir seçimdir ve ilerlemeye izin verir.  
* Health seed'de hiçbir seçim yapılmadan Step 5'e geçilemez.  
* Auth öncesi (Step 0–4) tüm veri local'de saklanır, uygulama kapatılıp açıldığında kaybolmaz.  
* Auth başarıyla tamamlandıktan sonra local veriler backend'e aktarılır.  
* Onboarding yarıda bırakılırsa, tekrar açılışta kaldığı adımdan devam eder.  
* Onboarding tamamlandıktan sonra tekrar otomatik tetiklenmez.  
* Auth başarısız olursa kullanıcı auth method seçim ekranına döner.  
* OTP timeout'ta "Süre Doldu" mesajı görünür, resend CTA aktif olur.

  ### **V0 Regülasyon / Safety**

* Hiçbir ekrandaki kopya teşhis, tedavi veya dozaj önermez.  
* "Not for emergency use" ve "Acil durumlarda 911'i arayın" uyarısı en az bir ekranda görünür.  
* ConsentRecord backend'e immutable olarak yazılır; version alanı doldurulur.  
* `ack_not_emergency` flag'i consent record'da ayrıca saklanır.

  ### **V0 Teknik**

* Local draft şifreli tutulur (iOS Keychain / Android Keystore minimum).  
* Auth sonrası transfer başarısız olursa silent retry yapılır; kullanıcıya onboarding tekrar gösterilmez.  
* OTP rate-limit: max 3 gönderim / 10 dk / numara.

  ---

  ## **7\. Görsel ve UX Notları**

* Her ekran: 1 ana CTA \+ en fazla 1 ikincil CTA.  
* Geri gidilirse içerik kaybolmaz; form alanları dolu kalır.  
* Büyük font, yüksek kontrast; yazı blokları değil kısa cümleler.  
* Hata mesajları: tek satır \+ ne yapması gerektiği.  
* SSO prefill varsa "Dilersen düzenleyebilirsin" notu gösterilir.  
* Condition listesi: çoklu seçim için checkbox grid (2 sütun), "Bilmiyorum" en alta sabitlenmiş, farklı stil.  
* Emergency contact telefon alanı: Kanada/ABD için \+1 varsayılan ülke kodu, değiştirilebilir.

  ---

  ## **8\. Kullanıcı Senaryoları**

**Demans/Alzheimer — Endişeli aile hastanın telefonu üzerinden kuruyor:** Aile intro'yu geçer, İngilizce seçer, üç kutucuğu onaylar, kendi numarasını emergency contact olarak girer, "Demans/Alzheimer" seçer, Google ile giriş yapar. Toplam süre hedefi: 3 dakika altı.

**Kompleks kronik (CHF \+ Tip 2 Diyabet) — hasta kendi kuruyor:** Hasta intro'yu kaydırır, dil seçer, onaylar, emergency contact olarak çocuğunu girer, CHF ve Tip 2 Diyabet seçer, alerji var diyor, kısa not yazar, telefon OTP ile giriş yapar.

**İnme/Afazi — iletişim engelli, aile yardımcı:** Dil seçimi kritik (tercüme gereken durum). Minimum adımda içeri alınır; "İnme/Felç" seçilir, geri kalan profil tamamlama akışına kalır.

**Hipertansiyon — yaşlı ama yardım olmadan kuruyor:** Intro'yu yavaşça geçer, "Bilmiyorum" seçimine ulaşır ve bunu seçer (veya Hipertansiyon'u bulur), telefon OTP ile girer. Wearable kurulumu onboarding'de sorulmaz, sonraya kalır.

**Yarım bırakıp dönen kullanıcı:** Step 3'e kadar gelmiş, uygulamayı kapatmış. Tekrar açınca emergency contact ekranından devam eder; önceki seçimler (dil, consent) kayıtlı gelir.

---

## **9\. Başarı Metrikleri**

### **Funnel / Drop-off**

| Adım | Hedef Geçiş Oranı |
| ----- | ----- |
| Intro → Step 1 (Dil) | ≥ %85 |
| Step 1 → Step 2 (Consent) | ≥ %95 |
| Step 2 → Step 3 (Emergency Contact) | ≥ %92 |
| Step 3 → Step 4 (Seed) | ≥ %88 |
| Step 4 → Auth | ≥ %85 |
| Auth → Tamamlandı | ≥ %80 |
| **Toplam Onboarding Completion Rate** | **≥ %72** |

### **Zaman Metrikleri**

* Medyan tamamlama süresi: ≤ 4 dakika (SSO path), ≤ 5 dakika (OTP path)  
* 10 dakikayı aşan oturumlar "takılma sinyali" olarak flag'lenir

  ### **Hata Metrikleri**

* OTP ilk denemede başarısızlık oranı: ≤ %20  
* Emergency contact telefon format hatası oranı: ≤ %15  
* Auth failure sonrası farklı yöntem denemesi oranı: izlenir (hedef değil, SSO sorun tespiti için)

  ### **Kalite / İzleme Metrikleri (hedef değil, sinyal)**

* "Bilmiyorum" seçim oranı: yüksekse seed UX gözden geçirilir  
* SSO vs OTP dağılımı: segment bilgisi  
* Condition dağılımı: ürün roadmap'i için girdi

  ### **Teknik / Güvenilirlik**

* Onboarding flow crash/force-close oranı: ≤ %1  
* Resume (kaldığı adımdan devam) başarı oranı: ≥ %95  
* Auth sonrası local → backend transfer başarı oranı: ≥ %99

  ---

  ## **10\. Vibe Coding / Geliştirici Notları**

**Local storage:** iOS Keychain veya Android Keystore kullanılır. `onboarding_draft` key'i altında JSON. Auth sonrası `onboarding_draft` temizlenir.

**Resume mantığı:** App launch'ta `onboarding_completed` flag kontrol edilir. False ise `onboarding_draft.step_progress` okunur ve ilgili step'e yönlendirilir.

**Backend transfer atomik olmalı:** Tüm local veriler tek transaction içinde yazılır. Kısmen yazılmış state olmamalı. Hata durumunda retry kuyruğuna alınır.

**Condition listesi:** Hardcoded enum olarak başlar (V0). V1'de CMS'e taşınabilir. ID'ler: `dementia`, `alzheimer`, `parkinson`, `ms`, `stroke`, `chf`, `cad`, `hypertension`, `diabetes_t1`, `diabetes_t2`, `copd_asthma`, `ckd`, `cancer_oncology`, `ortho_postop`, `palliative`, `other`, `unknown`.

**ConsentRecord versiyonlama:** Şu an `v1.0`. ToS veya Privacy Policy değiştiğinde version artar; mevcut kullanıcılar yeniden consent verir (ayrı akış, onboarding değil).

* 

# 0️⃣ Hızlı Çağrı İşlemleri

# **Hızlı Çağrı İşlemleri**

**Release Version:** MVP **Uygulama İçi Konumu:** Anasayfa

---

## **1\. Özelliğin Tanımı ve Amacı**

**Tanım:** Patient uygulamasında iki çağrı tipi sağlanır.

**SOS (Acil Çağrı):** Hastanın acil durumda hızlıca destek çağırabilmesi. Sırayla aile aranır; yanıt alınamazsa 911'e otomatik eskalasyon.

**Standart Çağrı:** Günlük ihtiyaçlar için aktif vardiyadaki bakıcıya veya müsait aile üyesine ulaşma. Availability UI'da kontrol edilir; seçilen kişi meşgulse veya açmazsa arama kapanır, kullanıcı anasayfaya döner.

**Amaçlar:**

* Yaşlı/low-tech kullanıcı için tek buton \+ net geri bildirim.  
* SOS'ta hız önceliği: availability check yok, direkt arama.  
* Standart çağrıda "yanlış tetikleme" riskini düşük tutmak.  
* Akışı sade tutmak: meşgul sesi gelirse kullanıcı zaten anasayfada diğer seçeneklere ulaşabiliyor, ekstra yönlendirme gerekmez.

**Regülasyon notu:** Bu feature emergency alert veya critical monitoring içermez. Acil durumları tespit etmek sorumluluğu yoktur; hastanın yardım talebini iletmesini kolaylaştırır. SaMD Class II riskine girmez.

**Çağrı yöntemi:** V0 ve V1'de tüm çağrılar native dialer üzerinden başlatılır (`tel:` deep link). Numara maskeleme ve in-app VoIP V2 kapsamındadır.

---

## **2\. Kapsam ve Kısıtlar**

### **2.1 Kapsam (In Scope)**

**V0 (MVP):**

* Anasayfada SOS butonu ve Standart Çağrı butonu (üçüncü buton ayrı PRD'de).  
* SOS akışı: onay popup \+ geri sayım → aile araması → yanıt yok → 911 eskalasyonu.  
* Standart çağrı akışı: popup → bakıcı/aile seçimi (availability'ye göre) → native arama → meşgul/yanıtsızsa kapanır.  
* Tüm çağrılar native dialer.  
* Call attempt log (audit için).

**V1:**

* SOS'ta birden fazla emergency contact sıralı deneme (Profile & Settings'te sıra belirlenir).  
* Standart çağrıda aile üyeleri arasında seçim (birden fazla family user varsa).

**V2:**

* In-app VoIP (numara maskeleme, çağrı logu, kayıt politikası) — ayrı legal çerçeve ile.  
* SOS başladığında aileye konum \+ profil özeti push bildirimi.

### **2.2 Kısıtlar (Constraints)**

* Sistem acil durumu kendi tespit etmez. SOS yalnızca kullanıcı butona bastığında başlar.  
* SOS'ta availability check yoktur; emergency contact numarası direkt aranır.  
* Standart çağrıda availability UI'da resolve edilir: bakıcı butonu `shift_active=true` ise aktif, aile butonu `dnd=false` ise aktif. Disabled buton karşı tarafı rahatsız etmez.  
* Çağrı native dialer'dan yapıldığı için uygulamanın çağrının bağlandığını veya cevaplandığını garantisi yoktur; OS/operatör koşullarına bağlıdır.  
* Standart çağrıda karşı taraf açmazsa veya meşgulse normal OS sesi döner, uygulama geri geldiğinde anasayfadadır. Ekstra yönlendirme popup'ı yoktur.  
* 30 saniye içinde standart çağrı popup'ında seçim yapılmazsa akış iptal olur, anasayfaya dönülür.  
* V0'da caregiver'ın telefon numarası hastaya görünür. Bakım ajansı entegrasyonu geldiğinde numara maskeleme V2 kapsamında ele alınacaktır.  
* 911'e otomatik arama yalnızca SOS eskalasyon akışında gerçekleşir ve yalnızca kullanıcı aktif olarak iptal etmediğinde tetiklenir.

### **2.3 Non-goals (Out of Scope)**

* Otomatik acil durum tespiti (sensör, arka plan dinleme vb.)  
* Standart çağrıda "yanıt yok → başka birini dene" akışı (anasayfada zaten mevcut)  
* In-app VoIP (V2)  
* Konumun 911'e otomatik iletilmesi (teknik/yasal farklılıklar, V2+)  
* Kurumsal/ajans çağrı yönlendirme (B2B fazı)

### **2.4 Versiyonlama**

* **V0:** SOS (tek emergency contact → 911\) \+ Standart Çağrı (tek bakıcı \+ tek aile) — native dialer  
* **V1:** SOS'ta sıralı emergency contact listesi \+ standart çağrıda çoklu aile seçimi  
* **V2:** In-app VoIP \+ numara maskeleme \+ konum paylaşımı

---

## **3\. Aile ve Bakıcı Bağlantısı**

Dört uygulama ortak DB üzerinde çalışır. Bağlantı telefon numarası üzerinden kurulur.

**Emergency Contact → Family App bağlantısı:**

* Onboarding'de emergency contact olarak girilen telefon numarası `EmergencyContact` tablosuna yazılır (`verified: false` ile).  
* İlgili kişi Family uygulamasına aynı telefon numarası ile kayıt olduğunda, sistem bu kaydı `patient_id` ile ilişkilendirir.  
* Family App'te DND (rahatsız etme modu) açılıp kapatılabilir → `family_availability.dnd` flag'ini günceller → Patient App bu flag'i okur.

**Caregiver bağlantısı:**

* Caregiver, kendi uygulamasından hastasına vardiya başlatır → `caregiver_shift.shift_active = true` \+ `patient_id` yazılır.  
* Patient App bu kaydı okur, bakıcı butonunu aktif/pasif yapar.  
* Caregiver telefon numarası Caregiver App hesabından alınır.

**V0 minimum şart:** SOS çalışması için sadece emergency contact telefon numarası gereklidir (onboarding'de girildi). Family App'in kurulu olması zorunlu değildir. Standart çağrının "Aile" butonu çalışması için family\_availability kaydı gereklidir; yoksa buton disabled görünür.

---

## **4\. Kullanıcı Akışı**

### **4.1 SOS Akışı**

Kullanıcı SOS butonuna basar  
→ \[POPUP \- Faz 1\] açılır \+ sesli uyarı başlar (Ton A: "aile aranacak")  
   Metin: "Aile üyeniz aranacak. 10 saniye içinde iptal etmezseniz arama başlar."  
   CTA: \[İptal\] (tek buton, büyük)  
   └─ İptal edilirse: sesli uyarı durur, popup kapanır, Home'a dön. Log: cancelled\_pre\_family.

→ 10 saniye içinde iptal edilmezse:  
   Native dialer açılır → Emergency Contact \#1 aranır (tel: deep link)

→ Kullanıcı uygulamaya geri döndüğünde (çağrı bitti / yanıt yok / red):  
   \[POPUP \- Faz 2\] açılır \+ sesli uyarı başlar (Ton B: "acil aranacak")  
   Metin: "Aileye ulaşılamadı. 30 saniye içinde iptal etmezseniz 911 aranacak."  
   CTA: \[İptal\] (tek buton, büyük)  
   └─ İptal edilirse: sesli uyarı durur, popup kapanır, Home'a dön. Log: cancelled\_pre\_911.

→ 30 saniye içinde iptal edilmezse:  
   Native dialer açılır → 911 aranır (tel:911)  
   Log: escalated\_to\_911.

**Önemli notlar:**

> [RECONCILED: B7 — SaMD-nötr. Kanonik §6 "Güvenli 911 akış kuralı"na hizalandı. Uygulama yalnız aramayı kolaylaştırır; triyaj/klinik karar vermez.]

* **"Biri açtıysa zinciri durdur" varsayımı kaldırıldı.** Native dialer çağrının "cevaplandı mı" bilgisini **varsaymaz**; uygulama çağrının bağlandığını/cevaplandığını bilemez. Bu nedenle Faz-1 aile araması, karşı taraf açsa da açmasa da, uygulama tekrar öne geldiğinde Faz-2 değerlendirmesine geçilir.  
* **Faz-2, kullanıcı uygulamaya dönmese bile timeout zinciriyle ilerleyebilir** (kullanıcı kararsız/erişilemez kalırsa acil yardım tıkanmasın). Ancak her ilerleme öncesi **görünür geri sayım + tek dokunuşla iptal** penceresi gösterilir (Faz-1: 10sn, Faz-2: 30sn).  
* Net iptal pencereleri korunur: kullanıcı her aşamada İptal'e basarak zinciri durdurabilir. Hiçbir adımda **klinik değerlendirmeye dayalı otomatik karar yoktur**; tetik tamamen kullanıcı aksiyonu veya timeout'tur.  
* Kullanıcı çağrı sırasında zaten ailesine ulaştıysa, Faz-2 geri sayımı başladığında görünür iptal ile durdurabilir.  
* V1'de birden fazla emergency contact varsa Faz 1'de sıradaki kişi aranır, hepsi yanıtsız/timeout ise Faz 2 başlar.  
* Geri sayım sayacı UI'da görünür olmalıdır.

### **4.2 Standart Çağrı Akışı**

Kullanıcı Standart Çağrı butonuna basar  
→ Availability check (DB'den anlık okuma):  
   shift\_active \= true olan caregiver var mı?  
   dnd \= false olan family user var mı?

→ İkisi de yoksa:  
   Popup açılmaz.  
   Kısa toast/banner: "Şu an ulaşabileceğin kimse yok."  
   Home'da kalır.

→ En az biri varsa:  
   \[POPUP\] açılır. İki buton (aktif olanlara göre):  
     \[Bakıcıyı Ara\] — shift\_active=true ise aktif, değilse disabled \+ "Aktif vardiya yok"  
     \[Aile Üyesi Ara\] — dnd=false ise aktif, değilse disabled \+ "Rahatsız etme modu açık"  
     \[İptal\]

→ 30 saniye içinde seçim yapılmazsa:  
   Popup kapanır, Home'a dön.

→ Seçim yapılırsa:  
   Native dialer açılır → seçilen kişi aranır.  
   Arama sonrasında (açsın açmasın) uygulama Home'a döner.  
   Ekstra popup veya yönlendirme yok.

### **4.3 Mermaid Diyagramı**

flowchart TD  
  A\[Anasayfa\] \--\> B{Hangi buton?}

  B \--\>|SOS| SOS1\[POPUP Faz1 açılır \+ Ton A başlar\]  
  SOS1 \--\> SOS2{10sn içinde iptal?}  
  SOS2 \--\>|Evet| SOS\_CANCEL1\[Log: cancelled\_pre\_family → Home\]  
  SOS2 \--\>|Hayır / timeout| SOS3\[Native dialer → EC \#1 aranır\]  
  SOS3 \--\> SOS4\[Kullanıcı uygulamaya döner\]  
  SOS4 \--\> SOS5\[POPUP Faz2 açılır \+ Ton B başlar\]  
  SOS5 \--\> SOS6{30sn içinde iptal?}  
  SOS6 \--\>|Evet| SOS\_CANCEL2\[Log: cancelled\_pre\_911 → Home\]  
  SOS6 \--\>|Hayır / timeout| SOS7\[Native dialer → 911 aranır\]  
  SOS7 \--\> SOS8\[Log: escalated\_to\_911 → Home\]

  B \--\>|Standart| REG1{Availability check}  
  REG1 \--\>|Kimse yok| REG2\[Toast: Şu an kimse yok → Home\]  
  REG1 \--\>|Biri var| REG3\[POPUP açılır: Bakıcı \+ Aile butonları\]  
  REG3 \--\> REG4{30sn içinde seçim?}  
  REG4 \--\>|Hayır / timeout| REG5\[Popup kapanır → Home\]  
  REG4 \--\>|Bakıcı seçildi| REG6\[Native dialer → Caregiver tel\]  
  REG4 \--\>|Aile seçildi| REG7\[Native dialer → Family tel\]  
  REG6 \--\> REG8\[Arama biter → Home\]  
  REG7 \--\> REG8  
---

## **5\. Veri Modeli**

### **5.1 Okunan Tablolar (Patient App)**

**EmergencyContact**

> [RECONCILED: A11 — Kanonik şekle hizalandı: `order`→`sort_order`, `verified`→`phone_verified`.]

* `ec_id`, `user_id` (patient), `phone`, `name`, `relationship`  
* `sort_order` (int; SOS arama sırası — V1 sıralı liste, V0'da tek kayıt = 1)  
* `phone_verified` (bool)

**CaregiverShift**

* `shift_id`, `caregiver_id`, `patient_id`  
* `shift_active` (bool)  
* `checked_in_at`, `checked_out_at`  
* `caregiver_phone` (Caregiver App hesabından join)

**FamilyProfile.dnd**

> [RECONCILED: B6 — `FamilyAvailability` emekli; DND kişi-başına `FamilyProfile.dnd` (per-hasta override V1). `family_phone` `FamilyProfile`/`User` hesabından join.]

* `family_member_id` (user_id, role=family), `patient_id`  
* `dnd` (bool) — Family App'ten set edilir  
* `family_phone` (Family App hesabından join)

### **5.2 Yazılan Tablo**

**CallAttemptLog**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `call_id` | uuid | Primary key |
| `patient_id` | uuid |  |
| `call_type` | enum | `sos` | `regular` |
| `target_type` | enum | `family` | `caregiver` | `emergency_services` |
| `target_id` | uuid | null | emergency\_services için null |
| `status` | enum | `initiated` | `cancelled` | `completed` |
| `cancel_stage` | enum | null | `pre_family_10s` | `pre_911_30s` | `regular_modal_timeout` | `regular_user_cancelled` |
| `initiated_at` | timestamp |  |
| `ended_at` | timestamp | null |  |

---

## **6\. Kabul Kriterleri**

### **SOS (V0)**

* SOS butonuna basınca popup açılır ve sesli uyarı (Ton A) başlar.  
* Popup'ta yalnızca bir CTA vardır: İptal.  
* 10 saniye içinde iptal edilmezse native dialer açılır, emergency contact \#1 aranır.  
* Kullanıcı uygulamaya geri döndüğünde (herhangi bir sebeple) Faz 2 popup'ı açılır, sesli uyarı (Ton B) başlar.  
* 30 saniye içinde iptal edilmezse native dialer açılır, 911 aranır.  
* Her iki aşamada da iptal edilebilir; iptal sonrası Home'a dönülür, sesli uyarı durur.  
* Geri sayım sayacı UI'da görünürdür.  
* Her call attempt `CallAttemptLog`'a yazılır.

### **Standart Çağrı (V0)**

* Availability check: `shift_active=true` caregiver yoksa bakıcı butonu disabled.  
* Availability check: `dnd=false` family user yoksa aile butonu disabled.  
* Her ikisi de disabled ise popup açılmaz, toast gösterilir.  
* En az biri aktifse popup açılır.  
* Disabled butonlarda kısa neden yazısı görünür ("Aktif vardiya yok" / "Rahatsız etme modu açık").  
* 30 saniye içinde seçim yapılmazsa popup kapanır, Home'a dönülür.  
* Seçim yapılırsa native dialer açılır.  
* Arama sonrasında (açsın açmasın) uygulama Home'a döner. Ekstra yönlendirme popup'ı yoktur.

### **Genel**

* Çağrı başlatma yöntemi V0'da yalnızca `tel:` deep link'tir. In-app VoIP yoktur.  
* SOS akışında availability check yapılmaz.  
* 911 araması kullanıcı aktif olarak iptal etmediğinde ve Faz 2 timeout'unda başlar; başka hiçbir koşulda tetiklenmez.

---

## **7\. Görsel ve UX Notları**

* SOS popup'ı: yüksek kontrast (kırmızı arka plan önerilir), büyük font, net geri sayım sayacı.  
* Ton A (aile aranacak) ve Ton B (acil aranacak) farklı ses/ton olmalıdır — kullanıcı duyduğunda durumun ne olduğunu anlayabilmeli.  
* İptal butonu her iki popup'ta da çok büyük ve tek CTA olmalı (panik kullanım senaryosu).  
* Standart çağrı popup'ı: maksimum 2 seçenek \+ iptal. Disabled butonlar gri gösterilir, tek satır neden yazısı altlarında.  
* Sesli uyarı: kullanıcı telefonu sessize almış olsa bile SOS sesli uyarısı çalabilmeli mi? Bu UX kararı ve iOS/Android izin politikasıyla ilgili, ayrıca değerlendirilmeli. (Onboarding veya Profile & Settings'te "SOS ses izni" ayrı bir onay adımı gerekebilir.)

---

## **8\. Kullanıcı Senaryoları**

**Demans/Alzheimer (panik):** SOS'a basar, ne yapacağını bilmez ama iptal etmez. 10sn sonra kızı aranır, kızı açar, süreç biter.

**Yalnız yaşayan kronik hasta (gece yarısı, aile ulaşılamıyor):** SOS → aile araması → yanıt yok → Faz 2 başlar → iptal etmez → 911 aranır.

**Bakıcı vardiyada, hasta bir şey sormak istiyor:** Standart çağrı → bakıcı butonu aktif → bakıcı seçilir → arama başlar. Arama bitmişse Home'a döner.

**Aile DND açık, bakıcı da çalışmıyor:** Standart çağrı → her iki buton disabled → popup açılmaz → toast görünür → Home'da kalır. SOS hala çalışır çünkü emergency contact numarası direkt aranır.

**Yanlış SOS tetikleme:** SOS'a yanlışlıkla basar, popup gelir, İptal'e basar. Süreç sonlanır. Log: `cancelled_pre_family`.

---

## **9\. Başarı Metrikleri**

### **Güvenilirlik**

* SOS popup'ı tetiklenme başarı oranı (butona basınca popup \+ ses açılıyor mu): ≥ %99  
* Faz 1 → native dialer açılma başarı oranı (10sn timeout sonrası): ≥ %99  
* CallAttemptLog yazım başarı oranı: ≥ %99

### **Kullanım Örüntüsü (izleme, hedef değil)**

* SOS cancel oranı (Faz 1'de iptal): yüksekse yanlış tetikleme sorunu, uzun basma gibi mekanizma değerlendirilebilir  
* SOS → 911 eskalasyon oranı (Faz 2'ye ulaşan ve iptal edilmeyen): izlenir  
* Standart çağrıda "kimse yok" toast oranı: yüksekse availability UX gözden geçirilmeli  
* Standart çağrıda popup timeout oranı (30sn seçimsiz kapanma): izlenir

### **Teknik**

* SOS popup açılma süresi (butona basıştan popup görünümüne): ≤ 500ms  
* Availability check süresi (DB okuma): ≤ 1sn

# 0️⃣ Görev Takip Listesi

# **Görev Takip Listesi**

**Release Version:** MVP **Uygulama İçi Konumu:** Anasayfa

---

## **1\. Özelliğin Tanımı ve Amacı**

**Tanım:** Patient uygulamasında hastanın gün içindeki bakım sürecini yürütmesi için görev listesi. Görevler hasta, aile ve bakıcı tarafından ortak bir havuzdan yönetilir; birinin yaptığı değişiklik diğerlerinin ekranına eşzamanlı yansır.

**Amaçlar:**

* **Bakım operasyonu:** İlaç, egzersiz, ölçüm, su gibi bakım görevlerinin listelenmesi ve takibi.  
* **Maksimum kullanım kolaylığı:** Hasta için "bugün yapılacaklar" ekstra tıklama olmadan görünür, tek aksiyonla tamamlanır.  
* **Collaboration:** Aile/bakıcı planlar, hasta uygular; herkes aynı gerçeği görür.  
* **Güven ve izlenebilirlik:** Kimin neyi ne zaman yaptığı activity log ile görülebilir. İlaç görevlerinde kim tamamladı bilgisi ayrıca saklanır.

---

## **2\. Kapsam ve Kısıtlar**

### **2.1 Kapsam (In Scope)**

**V0 (MVP):**

* Today Task List (bugünün görevleri) — anasayfada, ekstra tıklama olmadan  
* Görev tipleri:  
  * **One-time:** Tek seferlik, belirli bir tarih/saate bağlı (ör. "Bugün 15:00 doktor araması")  
  * **Recurring:** Günlük veya haftalık tekrar eden (ör. "Her gün sabah tansiyon ölç")  
  * **Counter:** Günlük sayaç hedefi (ör. "8 bardak su" → 0/8, \+1 ile ilerler, 8/8 olunca otomatik done)  
* Görev subtipleri:  
  * **Standard:** Varsayılan tip  
  * **Medication:** İlaç görevleri için özel flag; kim tamamladığı activity log'da ve gün sonu raporunda ayrıca gösterilir  
* Aksiyonlar (patient UI):  
  * Normal task (one-time & recurring): `Tamamla` → 5 saniye Undo penceresi  
  * Counter task: `+1` → 8/8 olunca otomatik done → 5 saniye Undo penceresi  
  * Manuel skip (hasta da yapabilir)  
* Task yönetimi — kim ekleyebilir:  
  * **Hasta:** Kendi taskını ekleyebilir  
  * **Caregiver:** Hastası için task ekleyebilir  
  * **Family:** Hastası için task ekleyebilir  
  * Her taskın kim tarafından eklendiği görünür (`created_by` label olarak task satırında gösterilir)  
* Task CRUD: ekle / düzenle / sil (soft delete)  
* Gün sonu raporu: tamamlanan ve tamamlanmayan taskların özeti aileye push \+ in-app bildirim olarak gider (saat: 22:00 lokal). Rapor içeriği aşağıda tanımlanmıştır.  
* Bildirimler:  
  * Task'a saat atanmışsa o saatte hatırlatma  
  * 21:00 lokal: pending task varsa genel hatırlatma  
  * 22:00 lokal: gün sonu raporu (aileye)

**V1:**

* Takvim görünümü: geçmiş ve gelecek günlere göz atma, aylık kuşbakışı özet, gün detayına tıklama  
* Günlük liste görünümünde gün dilimleri: All Day / Sabah / Öğlen / Akşam / Gece  
* Tasklara saat atama; saat atamalı tasklar bölüm içinde saat sırasına göre listelenir  
* Sabah taskları için 12:00'da hatırlatma (o saate kadar tamamlanmamışsa)  
* Daha güçlü tekrar kuralları: her X günde bir, günde N kez, belirli saat aralıkları  
* Task detayı: uzun açıklama, ek bilgi alanları (hastane adı, adres vb.)  
* Skip reason, sesli not, comment-like not ekleme  
* Activity feed: "Kim tamamladı, ne zaman" görünümü

**V2:**

* Sağlık Profesyonelleri uygulamasıyla entegrasyon: doktorun yazdığı planlardan otomatik task üretimi (onay gerektirir)  
* Sağlık portalı entegrasyonu: reçeteden ilaç taskı, ölçüm planından görev üretimi  
* Sistem üzerinden randevuları otomatik task olarak ekleme  
* Task breakdown: uzun bir taskı AI ile alt görevlere bölme (onay gerektirir)  
* Çift onay mekanizması: ilaç taskında "hasta aldım \+ bakıcı verildi" pending second confirmation (V0'da sadece actor log var, bağımlılık yok)  
* Offline mod \+ conflict resolution iyileştirmeleri

### **2.2 Kısıtlar (Constraints)**

* Patient app'te arayüz mümkün olduğunca sade: kanban, etiket sistemi, proje yapısı yok. Yalnızca `todo / done / skipped` durumları.  
* Gün sonu auto-skip yoktur. Tamamlanmayan tasklar `todo` olarak kalır; gün sonu raporu aileye iletilir. Aile, Family App üzerinden açık taskları sonraki güne taşıyabilir (Family App PRD'sinde tanımlanacak).  
* Conflict resolution V0'da "last write wins" \+ activity log. Aynı task aynı anda güncellenirse son yazan kazanır.  
* Saat dilimi: patient timezone baz alınır. Tüm bildirimler ve gün sonu raporu buna göre tetiklenir.  
* Task completion actor'ı her zaman loglanır; medication subtype'ta bu ayrım gün sonu raporuna da yansır.  
* V0'da çift taraflı onay bağımlılığı yoktur. Kim işaretlerse task done olur; kim işaretlediği logda saklanır.

### **2.3 Non-goals (Out of Scope)**

* Gamification (streak, rozet, motivasyon mekanizmaları)  
* Tedavi veya ilaç önerisi (task yönetir, klinik karar vermez)  
* Wearable'dan otomatik tamamlama (V2+)  
* Tam teşekküllü to-do uygulaması (etiket, proje, dosya yönetimi)  
* Gün sonu auto-skip

### **2.4 Versiyonlama**

* **V0:** Today list \+ tipler (one-time/recurring/counter) \+ medication subtype \+ hasta task ekleyebilir \+ created\_by label \+ complete/undo \+ skip \+ basic reminders \+ shared sync \+ gün sonu raporu  
* **V1:** Takvim görünümü \+ gün dilimleri \+ saat atama \+ güçlü tekrar kuralları \+ task detayı \+ activity feed  
* **V2:** Entegrasyon kaynaklı task üretimi \+ çift onay \+ task breakdown \+ offline iyileştirme

---

## **3\. Kullanıcı Akışı**

### **3.1 Patient App V0 — Günün Görevleri**

**Giriş noktası:** Anasayfada butonların hemen altında liste — ekstra tıklama yok.

Hasta Home'a gelir  
→ "Günün Görevleri" otomatik listelenir (todo / done / skipped)  
→ Her task satırında: başlık, created\_by label, ve tek aksiyon

Normal task (one-time & recurring):  
  → \[Tamamla\] butonuna basar  
  → Status: todo → done  
  → 5 saniye Undo penceresi açılır  
  → Undo basılırsa: done → todo  
  → 5 sn geçerse: done kalır, log yazılır

Counter task:  
  → \[+1\] butonuna basar (ör. 3/8 → 4/8)  
  → 8/8 olunca: otomatik done  
  → 5 saniye Undo penceresi açılır  
  → Undo basılırsa: done → 7/8

Manuel skip:  
  → Task satırında skip aksiyonu (swipe veya opsiyonel buton)  
  → Status: todo → skipped  
  → Activity log: actor \+ timestamp

Gün sonu akışı:  
  → 21:00 lokal: pending task varsa "Bugün tamamlanmayan görevlerin var" push bildirimi hastaya  
  → 22:00 lokal: Gün sonu raporu aileye gider (aşağıda tanımlı)  
  → Tamamlanmayan tasklar todo olarak kalır, otomatik kapanmaz

### **3.2 Gün Sonu Raporu İçeriği**

Push \+ in-app bildirim. Sade, suçlayıcı değil.

Başlık: "\[Hasta adı\]'nın bugünkü özeti"

✅ Tamamlanan: X görev  
  \- \[Task adı\] — \[Saat\] — \[Actor: Hasta / Bakıcı\]  
  \- İlaç taskları için: "\[İlaç adı\] — Hasta tarafından tamamlandı / Bakıcı tarafından tamamlandı"

⏳ Tamamlanmayan: Y görev  
  \- \[Task adı\]  
  \- \[Task adı\]

\[Sonraki güne taşı\] CTA (Family App'te açılır)

Rapor yalnızca o günün tasklarını kapsar. Geçmiş günler kapsama dahil edilmez.

### **3.3 Task Oluşturma Akışı (Tüm Actorlar)**

Actor (hasta / caregiver / family) "Görev Ekle"ye basar  
→ Form açılır:  
   \- Başlık (zorunlu)  
   \- Tip: One-time / Recurring / Counter (zorunlu)  
   \- Subtype: Standard / Medication (zorunlu)  
   \- One-time ise: tarih \+ opsiyonel saat  
   \- Recurring ise: günlük mi / haftanın hangi günleri  
   \- Counter ise: günlük hedef sayı  
→ Kaydet  
→ Tüm bağlı actorların listesine eşzamanlı düşer  
→ Task satırında "created\_by" label görünür:  
   "Hasta", "Bakıcı", "Aile" veya ileride "Sistem / Doktor"

### **3.4 Mermaid Diyagramı**

flowchart TD  
  A\[Hasta Home'a gelir\] \--\> B\[Günün Görevleri listelenir\]  
  B \--\> C{Task tipi?}

  C \--\>|Normal| D\[Tamamla butonuna basar\]  
  D \--\> E\[Status: done\]  
  E \--\> F\[5sn Undo penceresi\]  
  F \--\>|Undo| G\[Status: todo\]  
  F \--\>|5sn geçer| H\[Done kalır, log yazılır\]

  C \--\>|Counter| I\[+1 butonuna basar\]  
  I \--\> J{Hedefe ulaşıldı mı?}  
  J \--\>|Hayır| K\[progress\_count artar\]  
  J \--\>|Evet 8/8| L\[Otomatik done\]  
  L \--\> F

  C \--\>|Skip| M\[Status: skipped, log yazılır\]

  B \--\> N{Saat 21:00?}  
  N \--\>|Pending task var| O\[Hastaya genel hatırlatma push\]

  B \--\> P{Saat 22:00?}  
  P \--\>|Her gün| Q\[Gün sonu raporu aileye gider\]  
  Q \--\> R\[Tamamlanan \+ tamamlanmayan liste\]  
  R \--\> S\[Family App: sonraki güne taşı CTA\]  
---

## **4\. Veri Modeli**

### **CareTask**

> [RECONCILED: A1 — `TaskDefinition`→`CareTask`, `TaskOccurrence`→`CareTaskOccurrence`. `TaskSchedule` artık ayrı entity değil; `CareTask.schedule` (jsonb) altına merge edildi — alanları aşağıda "TaskSchedule (→ CareTask.schedule)" başlığında açıklanır.]

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `task_id` | uuid | Primary key |
| `patient_id` | uuid |  |
| `parent_task_id` | uuid | null | Agent alt-görev hiyerarşisi (canonical A1) |
| `title` | string |  |
| `type` | enum | `one_time | recurring | counter` |
| `subtype` | enum | `standard | medication` |
| `status` | enum | `active | archived` |
| `created_by_actor_type` | enum | `patient | caregiver | family | system | agent` |
| `created_by_actor_id` | uuid |  |
| `source_provenance` | enum | `manual | caregiver | family | integrated | agent` |
| `created_at` | timestamp |  |
| `updated_at` | timestamp |  |

**V1 ek alanları:**

* `day_part`: `all_day \| morning \| noon \| evening \| night`  
* `scheduled_time_local`: `HH:MM` (opsiyonel)

### **TaskSchedule (→ `CareTask.schedule`)**

> [RECONCILED: A1 — Bu alanlar ayrı bir tablo değil; `CareTask.schedule` (jsonb) içinde tutulur (days_of_week, time(s), daily_target). Açıklama amaçlı burada listelenir.]

**One-time:**

* `due_date_local`: `YYYY-MM-DD`  
* `due_time_local`: `HH:MM` (opsiyonel)

**Recurring (V0 basit):**

* `frequency`: `daily \| weekly`  
* `days_of_week[]`: (weekly ise, ör. `[MON, WED, FRI]`)  
* `time_of_day_local`: `HH:MM` (opsiyonel)

**Counter:**

* `target_per_day`: integer  
* `reset_rule`: `daily`

### **CareTaskOccurrence**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `occurrence_id` | uuid |  |
| `task_id` | uuid |  |
| `date_local` | `YYYY-MM-DD` |  |
| `status` | enum | `todo | done | skipped` |
| `progress_count` | integer | null | Counter için (0..target) |
| `completed_at` | timestamp | null |  |
| `completed_by_actor_type` | enum | null | `patient | caregiver | system | agent` *(NOT `family` — B1; `agent` eklendi, A1)* |
| `completed_by_actor_id` | uuid | null |  |
| `skipped_at` | timestamp | null |  |
| `skipped_by_actor_type` | enum | null |  |
| `skip_reason` | enum | null | `manual | (V1: user_defined)` |
| `last_updated_at` | timestamp |  |

### **ActivityLog**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `event_id` | uuid |  |
| `patient_id` | uuid |  |
| `task_id` | uuid |  |
| `occurrence_id` | uuid | null |  |
| `actor_type` | enum | `patient | caregiver | family | system | agent` |
| `actor_id` | uuid |  |
| `action` | enum | `created | edited | deleted | completed | undone | skipped | unskipped` |
| `timestamp` | timestamp |  |

### **DailySummaryLog**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `summary_id` | uuid |  |
| `patient_id` | uuid |  |
| `date_local` | `YYYY-MM-DD` |  |
| `completed_count` | integer |  |
| `pending_count` | integer |  |
| `completed_tasks[]` | json | `{ task_id, title, subtype, completed_at, completed_by_actor_type }` |
| `pending_tasks[]` | json | `{ task_id, title, subtype }` |
| `sent_at` | timestamp |  |
| `sent_to_family_ids[]` | uuid\[\] |  |

---

## **5\. Bildirim Kuralları**

| Tetikleyici | Saat (lokal) | Alıcı | İçerik |
| ----- | ----- | ----- | ----- |
| Task'a saat atanmışsa | Atanan saat | Hasta | "\[Task adı\] zamanı geldi" |
| Pending task varsa | 21:00 | Hasta | "Bugün tamamlanmayan görevlerin var" |
| Gün sonu raporu | 22:00 | Aile | Tamamlanan \+ tamamlanmayan özet |
| (V1) Sabah taskı tamamlanmamışsa | 12:00 | Hasta | "Sabah görevlerinden bazıları kaldı" |

**Kurallar:**

* Günlük hatırlatma (21:00): pending task yoksa bildirim gönderilmez.  
* Gün sonu raporu (22:00): her gün gönderilir; pending yoksa da "hepsi tamamlandı" raporu gider.  
* Aynı gün içinde aynı type'ta bildirim tekrarlanmaz (spam koruması).  
* Bildirim send log tutulur: `notification_type`, `sent_at`, `opened_at`.

---

## **6\. Senkronizasyon ve Conflict**

* **V0:** Last write wins \+ activity log. Aynı occurrence aynı anda güncellenirse son yazan kazanır; önceki state activity log'da korunur.  
* **V1:** Optimistic locking / conflict resolution iyileştirmeleri (ayrı teknik karar).

---

## **7\. Kabul Kriterleri**

### **V0 — Patient UI**

* Home'da "Günün Görevleri" ekstra tıklama olmadan görünür.  
* Her task satırında `created_by` label görünür: "Hasta", "Bakıcı" veya "Aile".  
* Normal task `Tamamla` ile done olur; 5 saniye Undo penceresi açılır.  
* Counter task `+1` ile ilerler; 8/8 (veya tanımlı hedefe) ulaşınca otomatik done olur; 5 saniye Undo penceresi açılır.  
* Undo süresi dolduktan sonra done kalır, geri alınamaz.  
* Manuel skip çalışır; skip activity log'a yazılır.  
* Status seti yalnızca `todo / done / skipped`'tir.  
* Gün sonu auto-skip yoktur. Tamamlanmayan tasklar `todo` kalır.  
* Hasta task ekleyebilir: başlık, tip, subtype girerek kaydeder.  
* Medication subtype seçilmiş tasklarda `completed_by_actor_type` activity log'a ve gün sonu raporuna yansır.  
* Task değişiklikleri (oluşturma, düzenleme, silme, tamamlama) tüm bağlı actorların ekranına eşzamanlı yansır.  
* ActivityLog her tamamlama/skip/undo/oluşturma olayını actor \+ timestamp ile yazar.

### **V0 — Bildirimler**

* Task'a saat atanmışsa o saatte push bildirimi gider.  
* 21:00 lokal'de pending task varsa hasta push bildirimi alır; pending yoksa bildirim gönderilmez.  
* 22:00 lokal'de gün sonu raporu aileye push \+ in-app gider; tamamlanan ve tamamlanmayan tasklar ayrı listede gösterilir.  
* Medication taskları gün sonu raporunda actor bilgisiyle gösterilir.  
* Bildirim send log tutulur.

### **V0 — Veri**

* CareTask, CareTaskOccurrence ve ActivityLog tabloları doğru yazılır.  
* DailySummaryLog her gün 22:00'de oluşturulur ve ilgili family\_id'lerine bağlanır.  
* Conflict durumunda last write wins uygulanır; önceki state activity log'da korunur.  
* Soft delete: silinen tasklar `status: archived` olur, fiziksel silinmez.

---

## **8\. Görsel ve UX Notları**

* Satır yüksekliği büyük tutulur; tek aksiyonlu (Tamamla veya \+1), minimum dokunma alanı standartlarına uygun.  
* `created_by` label: küçük, ikincil renkte, başlığın altında veya yanında. "Sen", "Bakıcı", "Aile" gibi kısa ve anlaşılır.  
* Counter task: "3/8" gibi net ilerleme göstergesi \+ büyük `+1` butonu. Hedef dolduğunda görsel geri bildirim (renk değişimi veya tik animasyonu).  
* Undo: tamamlama sonrası kısa süreli snackbar/toast biçiminde — "Tamamlandı. Geri al" şeklinde, büyük dokunma alanıyla.  
* Done tasklar listede kalır ama görsel olarak ayrışır (üstü çizili veya soluk). Tam gizleme V1 tasarım kararı.  
* Skipped tasklar en alta düşer veya ayrı gruplanır.  
* Medication taskları için opsiyonel ilaç ikonu veya renk kodu — tasarım kararı, V0'da zorunlu değil.

---

## **9\. Kullanıcı Senaryoları**

**Hasta kendi günlük görevini ekliyor:** Hasta "Görev Ekle"ye basar, "Günde 8 bardak su" yazar, counter seçer, hedef 8 girer, günlük tekrar seçer, kaydeder. Listesinde "Sen ekledin" etiketiyle görünür.

**Bakıcı ilaç görevi ekliyor:** Bakıcı kendi uygulamasından medication subtype ile "Metformin 500mg" ekler. Patient listesinde "Bakıcı ekledin" etiketiyle görünür. Hasta tamamladığında activity log'a `completed_by: patient` yazılır; gün sonu raporunda "Hasta tarafından tamamlandı" görünür.

**Counter tamamlanıyor:** Hasta gün boyu su bardağını 7/8'e taşır, akşam son \+1'e basar, 8/8 olunca otomatik done animasyonu oynar. 5 saniye Undo penceresi açılır, kullanmaz, kapanır.

**Yanlış tamamlama:** Hasta yanlışlıkla ilaç görevini tamamlandı işaretler, hemen Undo'ya basar, 4\. saniyede. Task todo'ya döner.

**Gün sonu — aile raporu:** 22:00'de aile şunu alır: "5 görevden 4'ü tamamlandı. Akşam egzersizi açık kaldı. Metformin 500mg — Bakıcı tarafından tamamlandı." Aile Family App'te açık görevi sonraki güne taşır.

**Hasta pending taskla uyuyor:** Gün sonu geçti, görev todo kaldı. Otomatik skip olmaz. Ertesi sabah listede hala todo olarak görünür (eski tarihli). Aile dün gece Family App'ten sonraki güne taşıdıysa yeni tarihli occurrence oluşmuş olur.

---

## **10\. Başarı Metrikleri**

### **Kullanım**

* Günlük aktif kullanıcılarda task tamamlama oranı ≥ %60 (en az 1 task tamamlayan / gün)  
* Counter task hedefine ulaşma oranı (0/N → N/N gün içinde) — izleme metriği, hedef belirlenmeyecek, baseline toplanacak  
* Manuel skip oranı: yüksekse task uygunluğu veya hatırlatma zamanlaması gözden geçirilmeli

### **Bildirim**

* Gün sonu raporu teslim başarı oranı ≥ %98  
* Gün sonu raporu açılma oranı (push tap-through) — izleme metriği  
* 21:00 hatırlatma sonrası tamamlama oranı: hatırlatmanın etkisini ölçmek için izlenir

### **Teknik**

* Task tamamlama → karşı actor ekranına yansıma süresi ≤ 2 saniye (eşzamanlılık)  
* ActivityLog yazım başarı oranı ≥ %99.9  
* DailySummaryLog 22:00±5 dakika içinde oluşturulma oranı ≥ %99

---

## **11\. Açık Konular**

**Family App'e taşınanlar:**

* Gün sonu raporundaki "Sonraki güne taşı" CTA akışı Family App PRD'sinde tanımlanacak.  
* Aile hangi taskları taşıyabileceğini ve taşıma yapıldığında yeni occurrence'ın nasıl oluşturulacağını Family App PRD belirler.

**Profile & Settings'e taşınanlar:**

* Gün sonu raporu saati (22:00) ve genel hatırlatma saati (21:00) V1'de kullanıcı tarafından editlenebilir hale getirilecek.

**V2 kararları:**

* Medication subtype'ta çift onay mekanizması (pending second confirmation): hasta işaretledi, bakıcı henüz onaylamadı ara state'i — V2'de değerlendirilecek.  
* Task'a saat atanmamış recurring görevlerde Undo süresi geçtikten sonra önceki güne mi yoksa bugüne mi ait sayılacağı gece yarısı edge case'i — V1'de netleştirilecek.

# 0️⃣ AI Agent

# **AI Agent**

**Release Version:** MVP **Uygulama İçi Konumu:** Anasayfa

---

## **1\. Özelliğin Tanımı ve Amacı**

**Tanım:** Ürünü muadillerinden ayıran ana özellik. Hastanın sesli konuşmasından tanımlı aksiyonlar çıkarabilen, bunları güvenlik çerçevesinde sınıflandırıp kullanıcı onayıyla uygulayan agentic bir kabiliyettir. Kullanıcı konuşur, sistem aksiyona çevirir, kullanıcı onay verir, aksiyon gerçekleşir. Chat değil, bakım operasyonu komut merkezi.

**Amaçlar:**

* **Maksimum erişilebilirlik:** Dokunma kabiliyeti kısıtlı veya düşük teknoloji okuryazarlığına sahip kullanıcılar için ses tek arayüz olabilir.  
* **Safety-first:** Riskli aksiyonlarda sürtünme ve guardrail; düşük riskte sürtünmesiz tamamlama.  
* **Collaboration uyumu:** Aksiyonlar (task tamamlama, mesaj, çağrı tetikleme, semptom bildirimi) aile/bakıcı uygulamalarına eşzamanlı yansır.  
* **Regülasyon sınırı:** Teşhis/tedavi/ilaç/dozaj önerisi hiçbir koşulda verilmez. Sistem "bakım operasyonu \+ bilgi toplama \+ iletme" düzeyinde kalır.  
* **SaMD güvenli alan:** Health Canada sınıflandırmasında "otomatik acil tespiti", "klinik karar desteği", "teşhis" iddiası taşınmaz. İntended use: iletişim ve koordinasyon kolaylaştırma.

*(Mimari şema görseli — token tasarrufu için bu kopyadan çıkarıldı; bkz. dosya sonu notu.)*

---

## **2\. Kapsam ve Kısıtlar**

### **2.1 Kapsam (In Scope)**

**V0 (MVP):**

* Anasayfada tek mikrofon butonu (PTT — Push to Talk)  
* Uygulama foreground'dayken "Sina" wakeword ile hands-free tetikleme (on-device, foreground-only)  
* Voice Modal: ASR dikte görselleştirmesi \+ "Çözümleniyor" durumu  
* Pipeline: Ses → ASR → LLM-as-judge sınıflandırma → aksiyon çıkarımı → risk sınıflandırma → Aksiyon Onay Paneli → uygulama  
* Aksiyon tipleri (whitelist):  
  * `TASK_COMPLETE`: task tamamlama  
  * `TASK_COUNTER_INCREMENT`: counter \+1  
  * `MESSAGE_SEND`: aile/bakıcıya in-app mesaj  
  * `CALL_TRIGGER_REGULAR`: standart çağrı akışını tetikler (Calls PRD)  
  * `CALL_TRIGGER_SOS`: SOS akışını tetikler (Calls PRD)  
  * `SYMPTOM_REPORT_SEND`: semptom bildirimi aile/bakıcıya gönderim  
* Risk sınıflandırması: Yeşil / Sarı / Kırmızı  
* LLM-as-judge: gelen içeriği 4 kategoriye sınıflandırır (aşağıda tanımlı)  
* Semptom bildirimi: maksimum 2 netleştirici soru \+ zenginleştirilmiş bildirim  
* Sessizlik eşiği: 3.5 saniye sessizlik → konuşma bitti sayılır  
* Maksimum tek kayıt süresi: 45 saniye  
* Aksiyon yok → maksimum 1 netleştirici soru → yanıt yok → otomatik iptal

**V1:**

* Daha güçlü belirsizlik çözümü: 1-2 tur follow-up  
* Kişi eşleştirme: "Rebecca" → kayıtlı kişi öner \+ seçim  
* Aile onayı gereken aksiyonlar için approval queue (Family App)  
* Wakeword: arka plan dinleme değerlendirmesi (teknik \+ PIPEDA incelemesi)

**V2:**

* Yapılandırılmış anamnez raporu: doktor uygulaması entegrasyonu ile birlikte, sağlık profesyoneline iletilmek üzere yapılandırılmış semptom formu  
* Güvenlik katmanı genişletme: medical advice / dosage / diagnosis hard-block iyileştirmeleri  
* Task breakdown: uzun bir aksiyonu AI ile alt görevlere bölme

### **2.2 Kısıtlar (Constraints)**

**Buton / UX:**

* Anasayfada tek mic butonu. Buton sayısı artmaz.  
* Wakeword: yalnızca uygulama foreground'dayken aktif. Arka plan dinleme yok.  
* V0'da maksimum 45 saniye kayıt. Sessizlik eşiği: 3.5 saniye.  
* Tek session'da maksimum 1 aksiyon yürütülür.

**Sessizlik eşiği davranışı:**

* 3.5 saniye sessizlik → "Çözümleniyor" durumuna geçilir, ASR transcript kesilir.  
* Kullanıcı tekrar konuşmaya başlarsa aynı session içinde devam eder (45 sn limiti aşılmadıkça).  
* 45 saniye dolduğunda aktif konuşma olsa bile kayıt kesilir, mevcut transcript ile pipeline çalışır.

**SaMD güvenli alan — Hard Constraints:**

* LLM hiçbir koşulda teşhis, tedavi, ilaç veya dozaj önerisi üretemez.  
* Semptom soruları yönlendirici olamaz: "Göğüs ağrısı da var mı?" gibi hipotez kuran sorular yasaktır.  
* Soruların cevapları sistemin aksiyonunu değiştirmez — sadece bildirimin içeriğini zenginleştirir.  
* Sistem "bu ciddi / ciddi değil / acil / acil değil" biçiminde hiçbir değerlendirme cümlesi üretemez.  
* Klinik pattern matching yasaktır: "bu semptomlar X'e işaret edebilir" çıktısı hard-block.

**Kırmızı aksiyon:**

* 911 araması kullanıcı net onayı olmadan hiçbir koşulda başlatılamaz.  
* Kırmızı yalnızca explicit emergency beyanında tetiklenir (tanımı aşağıda).  
* Sarı ve Kırmızı'da hareketsizlik → otomatik iptal (otomatik onay yok).

**Conflict:**

* Aynı session'da birden fazla aksiyon çıkarılırsa sistem en yüksek riskli olanı önerir, diğerlerini atar.

### **2.3 Non-goals (Out of Scope)**

* Teşhis, tedavi planı, ilaç/dozaj önerisi  
* Otomatik acil durum tespiti (sensör, arka plan dinleme)  
* Terapist botu, genel sohbet botu  
* Kullanıcı onayı olmadan 911 araması  
* Arka planda çalışan always-on hotword (V0)  
* Çoklu eşzamanlı aksiyon yürütme

### **2.4 Versiyonlama**

* **V0:** PTT \+ foreground wakeword \+ ASR \+ LLM-as-judge \+ aksiyon whitelist \+ risk paneli \+ semptom bildirimi (2 soru) \+ kırmızı eskalasyon zinciri  
* **V1:** Follow-up güçlendirme \+ kişi eşleştirme \+ aile approval queue \+ wakeword değerlendirme  
* **V2:** Yapılandırılmış anamnez (doktor uygulaması ile) \+ task breakdown \+ ileri güvenlik

---

## **3\. LLM-as-Judge: İçerik Sınıflandırması**

Pipeline'ın ilk katmanı olan judge, gelen konuşmayı 4 kategoriden birine atar. Bu sınıflandırma LLM'in tek bir inference adımında, aksiyon çıkarımından önce gerçekleşir.

### **Kategori Tanımları**

**`MEDICAL_ADVICE` — Hard Block**

Teşhis, tedavi, ilaç, dozaj, klinik değerlendirme içeren her türlü soru veya talep.

Örnekler:

\- "Bu ilaç ne işe yarar?"

\- "Metformin ile aspirin birlikte alınır mı?"

\- "Başım ağrıyorsa ne ilaç alayım?"

\- "Bu semptomlar ciddi mi?"

\- "Kan değerim 7.2, iyi mi?"

Davranış: Aksiyon pipeline'ına geçmez. Sabit yönlendirme cümlesi döner: *"Bu konuda sana yardımcı olamam. Doktoruna veya eczacına sorabilirsin. Ailenle paylaşmamı ister misin?"*

---

**`IRRELEVANT` — Nazik Reddet**

Bakım, sağlık veya günlük yaşamla hiçbir bağlantısı olmayan içerik.

**Örnekler:**

**\- "Bana şiir yaz"**

**\- "Bugün hava nasıl?" (genel bilgi olarak, lokal servis yoksa)**

**\- "Futbol maçı kaç kaç bitti?"**

**\- "Şarkı söyle"**

Davranış: Sabit yönlendirme cümlesi döner: *"Buna yardımcı olamam. Bakımınla ilgili bir şey yapabilmem için söyleyebilirsin."* Session kapanır.

---

**`GENERAL_LIFE` — Yanıtla, Aksiyon Arama**

Bakım veya günlük yaşamla ilgili, zararlı olmayan genel bilgi soruları. Klinik içerik taşımayan, LLM'in genel bilgisiyle güvenle yanıtlayabileceği konular.

Örnekler (LLM yanıtlar):

\- "Bugün ne yemeliyim?" (genel beslenme)

\- "Egzersiz için iyi saatler hangileri?"

\- "Yeterli su içiyor muyum, kaç bardak olmalı?"

\- "Nöbetçi eczane nerede?" → "Bunu bilemiyorum, Google Maps'ten bakabilirsin."

Örnekler (yönlendir, gerçek zamanlı veri gerekli):

\- Adres, servis saati, anlık konum sorguları

Davranış: Yanıtla, aksiyon pipeline'ına geçme. Kısa yanıt \+ "Başka bir şey yapabilmem için söyleyebilirsin." Session kapanır.

**Sınır notu:** GENERAL\_LIFE ile MEDICAL\_ADVICE arasındaki çizgi şudur: genel yaşam bilgisi (ne zaman, ne kadar, nasıl alışkanlık) GENERAL\_LIFE, klinik içerik (hangi ilaç, hangi semptom, tanı, değerlendirme) MEDICAL\_ADVICE. Judge bu ayrımı few-shot örneklerle beslenerek öğrenir; belirsiz durumlarda MEDICAL\_ADVICE'a yuvarlama yapılır (güvenli taraf).

---

**`IN_SCOPE_ACTION` — Aksiyon Pipeline'ına Gönder**

Bakım operasyonuyla ilgili, tanımlı aksiyonlardan birini tetikleyebilecek içerik.

Örnekler:

\- "Suyumu içtim" → TASK\_COUNTER\_INCREMENT

\- "İlacımı aldım" → TASK\_COMPLETE (medication)

\- "Annem beni arasın söyle" → MESSAGE\_SEND

\- "Bakıcımı ara" → CALL\_TRIGGER\_REGULAR

\- "Başım çok ağrıyor" → SYMPTOM\_REPORT\_SEND

\- "Düştüm, kalkamıyorum" → CALL\_TRIGGER\_SOS (Kırmızı)

Davranış: Risk sınıflandırma \+ aksiyon çıkarım pipeline'ına geçer.

---

### **Judge Sistem Kriteri (Development için)**

Judge katmanına verilecek system prompt'un içermesi gereken kriterler:

1\. Önce kategoriyi belirle, sonra aksiyon çıkar. Sıra önemli.

2\. Belirsiz tıbbi içeriklerde MEDICAL\_ADVICE'a yuvarlama yap.

3\. Kullanıcı "ilaç aldım" diyorsa bu TASK\_COMPLETE (MEDICAL\_ADVICE değil).

4\. Kullanıcı "bu ilaç ne işe yarar" diyorsa bu MEDICAL\_ADVICE (IN\_SCOPE\_ACTION değil).

5\. Semptom bildirimi (başım ağrıyor, midem bulanıyor) IN\_SCOPE\_ACTION → SYMPTOM\_REPORT\_SEND.

6\. Semptom \+ klinik soru (bu ciddi mi, ne olabilir) → MEDICAL\_ADVICE.

7\. GENERAL\_LIFE yanıtlarında klinik yorum yapma. Bilgi ver, öneri verme.

8\. Persona: Sinalytix bakım asistanı. Sohbet botu değil, komut merkezi.

9\. Kapsam dışı sorularda persona'yı terk etme. Sabit yönlendirme cümlesini kullan.

10\. Hiçbir koşulda "bu ciddi / acil / tehlikeli / hafif" gibi değerlendirme cümlesi üretme.

---

## **4\. Aksiyon Risk Sınıflandırması**

### **Yeşil — Düşük Risk**

**Tanım:** Klinik sonucu olmayan, geri alınabilir veya düşük etkili aksiyonlar.

**Örnekler:**

* Su counter \+1  
* Non-medication task tamamlama  
* Aile/bakıcıya genel in-app mesaj ("iyi günler", "eve geç geleceğim")

**Davranış:**

* 10 saniye hareketsizlik → auto-confirm → aksiyon uygulanır  
* Bildirim: yok (sadece ActivityLog)  
* Sesli geri bildirim: kısa onay tonu

---

### **Sarı — Orta Risk**

**Tanım:** Klinik etkisi olan, geri alınması güç veya başka actorı etkileyen aksiyonlar.

**Örnekler:**

* Medication subtype task tamamlama ("ilacımı aldım")  
* Standart çağrı tetikleme  
* Semptom bildirimi gönderme  
* Aile/bakıcıya içerik taşıyan mesaj gönderme

**Davranış:**

* 30 saniye hareketsizlik → auto-cancel  
* Onaylanırsa: aksiyon uygulanır \+ aile/bakıcıya bilgilendirme bildirimi  
* Bildirim: in-app \+ push (aile ve/veya aktif bakıcıya)

---

### **Kırmızı — Yüksek Risk**

**Tanım:** Yalnızca kullanıcının açık acil beyanında tetiklenir. Klinik pattern matching veya sistem tahminiyle tetiklenmez.

**Kırmızı tetikleme kriterleri (explicit emergency — bunların dışında tetiklenmez):**

* Açık acil beyanı: "düştüm kalkamıyorum", "nefes alamıyorum", "göğsüm çok ağrıyor", "çok kötüyüm biri gelsin"  
* Açık çağrı talebi: "9-1-1'i ara", "ambulans çağır", "SOS"  
* Açık yardım talebi: "acil yardım lazım"

**Kırmızı Panel:**

* Uyarı metni: *"9-1-1 sadece acil durumlar içindir."*  
* Soru: *"Aileni şimdi arayalım mı?"*  
* Butonlar: `Aileyi Ara` (primary) / `Güncelle` / `İptal`

**Kırmızı timeout (30 saniye hareketsizlik):**

* 911 aranmaz  
* Family push/in-app bildirimi → Family call round-1 otomatik başlar

**Family call round-1 spam guardrails:**

* Maksimum 2 hedef (Primary \+ Secondary emergency contact)  
* Kişi başına maksimum 1 arama  
* Round-1 toplam maksimum 90 saniye  
* Bir kişi yanıtladıysa zincir durur

**Round-1 başarısızsa hasta ekranına:** *"Ailene ulaşamadım. 9-1-1'i aramamı ister misin?"*

* `Evet, 9-1-1'i ara` → 911 aranır  
* `Hayır, aileyi tekrar dene` → Round-2 (sadece kullanıcı seçerse)  
* `İptal` → süreç biter

**Cool-down:** Aynı hasta için Red auto-call 15 dakikada maksimum 1 kez.

**Red attempt bildirimi (iptal veya timeout olsa bile):**

* Aktif vardiya bakıcı varsa: bakıcı \+ aile  
* Yoksa: yalnızca aile  
* İçerik: "Yüksek risk teşebbüsü" bildirimi

---

## **5\. Semptom Bildirimi Akışı (SYMPTOM\_REPORT\_SEND)**

**Tetikleyici:** Kullanıcı fiziksel şikayet bildirdiğinde, judge `IN_SCOPE_ACTION` → `SYMPTOM_REPORT_SEND` sınıflandırması yapar.

**Risk seviyesi:** Sarı (orta risk) — kullanıcı onayı gerekir.

**Soru protokolü (V0):**

Sistem maksimum 2 netleştirici soru sorar. Sorular:

* Zaman odaklı: "Ne zamandır devam ediyor?"  
* Şiddet odaklı: "Nasıl tarif edersin, hafif mi şiddetli mi?"  
* Genel bağlam: "Buna eşlik eden başka bir şey fark ettin mi?"

**Yasak soru tipleri:**

* Hipotez kuran: "Göğüs ağrısı da var mı?"  
* Yönlendiren: "Baş dönmesi de oluyor mu?"  
* Değerlendiren: "Bu daha önce oldu mu, ne oldu?"

**Soruların davranışa etkisi:** Sıfır. Cevaplar sadece bildirimin içeriğini zenginleştirir. "Evet göğsüm de ağrıyor" cevabı sistemin risk kararını veya bildirim hedefini değiştirmez.

**Bildirim içeriği:**

Başlık: "\[Hasta adı\] bir şikayet bildirdi"

İçerik:

  Şikayet: \[transkript özeti\]

  Zaman: \[cevap verilmişse\]

  Şiddet: \[cevap verilmişse\]

  Ek bilgi: \[cevap verilmişse\]

  Bildirim saati: \[timestamp\]

**Bildirim hedefi:** Aile \+ aktif vardiya bakıcı (ikisine birden).

**Sistem hiçbir koşulda şunları yazmaz:** "Bu ciddi görünüyor", "Acil olmayabilir", "Muhtemelen geçer", "Bu semptomlar X'e işaret edebilir."

---

## **6\. Kullanıcı Akışı**

### **6.1 Ana Pipeline (V0)**

\[1\] TETİKLEME

    PTT butonu → Voice Modal açılır

    VEYA

    Foreground wakeword "Sina" → Voice Modal açılır

\[2\] KAYIT \+ DİKTE

    Mic açık. "Dinliyorum…" durumu.

    Son 3-4 satır transcript görünür (fade-out).

    Sessizlik 3.5 sn → kayıt kesilir → "Çözümleniyor…"

    45 sn dolunca aktif konuşma olsa bile kayıt kesilir.

\[3\] PIPELINE

    ASR → raw transcript

    ↓

    LLM-as-judge → kategori sınıflandırması

    ↓

    MEDICAL\_ADVICE   → hard block \+ yönlendirme → modal kapanır

    IRRELEVANT       → nazik ret → modal kapanır

    GENERAL\_LIFE     → LLM yanıtı → seslendirilir → modal kapanır

    IN\_SCOPE\_ACTION  → aksiyon çıkarımı \+ risk sınıflandırması → \[4\]

\[4\] AKSİYON ONAY PANELİ

    Modal rengi: Yeşil / Sarı / Kırmızı

    "Anladığım:" \[özet\]

    "Yapacağım:" \[aksiyon\]

    Butonlar: \[Onayla\] / \[Güncelle\] / \[İptal\]

    Sesli okuma: aksiyon özeti kısaca seslendirilir

    

    Yeşil: 10sn timeout → auto-confirm

    Sarı:  30sn timeout → auto-cancel

    Kırmızı: 30sn timeout → family notify \+ call round-1

    

    Onayla   → \[5\] Uygula

    Güncelle → mic tekrar açılır → yeni input → \[3\]'e döner

    İptal    → modal kapanır, Home'a dön

\[5\] UYGULA

    Aksiyon yürütülür

    Kısa "Tamam" geri bildirimi (görsel \+ ses)

    Modal kapanır

    ActivityLog \+ ActionExecutionLog yazılır

### **6.2 Aksiyon Çıkmadı (V0)**

Judge → IN\_SCOPE\_ACTION

Aksiyon çıkarımı → aksiyon yok / belirsiz

→ Sistem tek netleştirici soru sorar:

   "Ne yapmak istiyorsun?" / "Hangi görev?" / "Kime göndereyim?"

→ Kullanıcı 10 saniye içinde yanıt vermezse:

   Otomatik iptal → modal kapanır → Home

→ Yanıt gelirse pipeline \[3\]'ten yeniden çalışır

→ İkinci denemede de aksiyon çıkmazsa: modal kapanır

### **6.3 Wakeword Akışı**

Uygulama foreground'da açık

On-device wakeword engine dinliyor (sessiz, görsel gösterge var)

"Sina" algılandı → Voice Modal açılır → \[2\]'den devam

Yanlış pozitif / kullanıcı "İptal" → session kapanır, false\_wake loglanır

### **6.4 Mermaid Diyagramı**

flowchart TD

  A\[PTT butonu veya Wakeword\] \--\> B\[Voice Modal açılır\]

  B \--\> C\[Kayıt: Dinliyorum...\]

  C \--\> D{3.5sn sessizlik veya 45sn?}

  D \--\> E\[Çözümleniyor... ASR → LLM Judge\]

  E \--\> F{Kategori?}

  F \--\>|MEDICAL\_ADVICE| G\[Hard block \+ yönlendirme → kapan\]

  F \--\>|IRRELEVANT| H\[Nazik ret → kapan\]

  F \--\>|GENERAL\_LIFE| I\[LLM yanıtı → seslendir → kapan\]

  F \--\>|IN\_SCOPE\_ACTION| J\[Aksiyon çıkarımı\]

  J \--\> K{Aksiyon bulundu mu?}

  K \--\>|Hayır| L\[1 netleştirici soru\]

  L \--\> M{10sn içinde yanıt?}

  M \--\>|Hayır| N\[İptal → Home\]

  M \--\>|Evet| E

  K \--\>|Evet| O\[Risk sınıflandırması\]

  O \--\> P{Risk seviyesi?}

  P \--\>|Yeşil| Q\[Onay Paneli — 10sn auto-confirm\]

  P \--\>|Sarı| R\[Onay Paneli — 30sn auto-cancel\]

  P \--\>|Kırmızı| S\[Onay Paneli — 30sn → family zinciri\]

  Q \--\> T{Kullanıcı aksiyonu?}

  R \--\> T

  S \--\> T

  T \--\>|Onayla veya timeout Yeşil| U\[Aksiyon uygula → log → Tamam → Home\]

  T \--\>|Güncelle| B

  T \--\>|İptal veya timeout Sarı/Kırmızı| V\[İptal → log → Home\]

  S \--\>|30sn timeout| W\[Family notify \+ call round-1\]

---

## **7\. Veri Modeli**

### **ai_interaction_log** (kanonik — B3)

> [RECONCILED: B3 — Tek kanonik AI günlüğü. Immutable, append-only, 7 yıl retention. `VoiceSession`/`ProposedAction`/`ActionExecutionLog` operasyonel kalır; her etkileşimin özeti buraya yazılır.]

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `interaction_id` | uuid | Primary key |
| `app_context` | enum | `patient` (bu app) |
| `user_id` | uuid |  |
| `patient_id` | uuid | null |  |
| `skill` | enum | `command | symptom | qa | translate | ...` |
| `model_id` | string |  |
| `input_encrypted` | bytea | Şifreli girdi |
| `output_encrypted` | bytea | Şifreli çıktı |
| `judge_verdict` | enum | `MEDICAL_ADVICE | IN_SCOPE_ACTION | GENERAL_LIFE | IRRELEVANT | REFUSED | ...` |
| `risk_tier` | enum | `green | yellow | red` |
| `action_taken` | string | null |  |
| `human_approved_by` | uuid | null |  |
| `tokens` | int |  |
| `cost` | numeric |  |
| `created_at` | timestamp |  |

**Eşleme (mevcut → kanonik):**

* Hasta `risk_level` {`low | medium | high`} → `risk_tier` {`green | yellow | red`}.  
* Hasta `judge_category` (`VoiceSession`) → `judge_verdict`.  
* `VoiceSession`/`ProposedAction`/`ActionExecutionLog` operasyonel tablolar olarak korunur; özet `ai_interaction_log`'a yazılır.

### **VoiceSession**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `session_id` | uuid |  |
| `patient_id` | uuid |  |
| `trigger_source` | enum | `ptt | wakeword_in_app | siri_shortcut | assistant_deeplink` |
| `started_at` | timestamp |  |
| `ended_at` | timestamp | null |  |
| `asr_transcript_raw` | text |  |
| `asr_confidence` | float | null |  |
| `llm_normalized_text` | text | null |  |
| `judge_category` | enum | `medical_advice | irrelevant | general_life | in_scope_action` |
| `status` | enum | `processing | awaiting_user | executed | cancelled | failed` |
| `audio_uri` | string | null | Opsiyonel, 7 gün retention |

### **ProposedAction**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `action_id` | uuid |  |
| `session_id` | uuid |  |
| `action_type` | enum | `TASK_COMPLETE | TASK_COUNTER_INCREMENT | MESSAGE_SEND | CALL_TRIGGER_REGULAR | CALL_TRIGGER_SOS | SYMPTOM_REPORT_SEND` |
| `risk_level` | enum | `green | yellow | red` *(RECONCILED: B3 — eski `low/medium/high` → `green/yellow/red`; kanonik `risk_tier` ile eşlenir)* |
| `is_explicit_emergency` | bool | Kırmızı tetikleme kriteri |
| `requires_user_confirm` | bool | Yeşil false, Sarı/Kırmızı true |
| `auto_confirm_after_sec` | int | null | Yeşil: 10, diğerleri: null |
| `payload` | json | Aksiyona özel veri |
| `confidence_score` | float |  |

### **ActionExecutionLog**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `execution_id` | uuid |  |
| `action_id` | uuid |  |
| `executed_by` | enum | `patient_tap | patient_voice_confirm | auto_confirm | system` |
| `result` | enum | `success | cancelled | failed` |
| `cancel_reason` | enum | null | `user_cancelled | timeout | pipeline_error` |
| `error_code` | string | null |  |
| `executed_at` | timestamp |  |

### **SymptomReport**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `report_id` | uuid |  |
| `session_id` | uuid |  |
| `patient_id` | uuid |  |
| `raw_complaint` | text | Hastanın kendi ifadesi |
| `clarification_q1` | string | null | Sorulan birinci soru |
| `clarification_a1` | string | null | Verilen cevap |
| `clarification_q2` | string | null |  |
| `clarification_a2` | string | null |  |
| `sent_to_family` | bool |  |
| `sent_to_caregiver` | bool |  |
| `sent_at` | timestamp |  |

### **RedEscalationLog**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `escalation_id` | uuid |  |
| `session_id` | uuid |  |
| `patient_id` | uuid |  |
| `trigger_text` | text | Tetikleyen ifade |
| `user_confirmed` | bool | `Aileyi Ara` seçildi mi |
| `user_cancelled` | bool |  |
| `timeout_occurred` | bool |  |
| `family_round1_called` | bool |  |
| `family_called_targets` | uuid\[\] |  |
| `family_answered` | bool |  |
| `asked_911_confirmation` | bool |  |
| `emergency_services_called` | bool | *(RECONCILED: A9 — geçersiz tanıtıcı `911_called` → `emergency_services_called`)* |
| `attempt_notification_sent` | bool |  |
| `created_at` | timestamp |  |

---

## **8\. Agent Sınır Kriteri Metni**

*Bu metin, agent'ın hangi LLM veya agentic framework üzerine inşa edileceğinden bağımsız olarak uygulanacak davranış sınırlarını tanımlar. System prompt yazımında, guardrail katmanı tasarımında ve output validation adımında bu kriterler baz alınmalıdır.*

---

**Sistemin kim olduğu ve ne yaptığı:**

Sinalytix bakım asistanı. Evde bakım sürecindeki hastaların günlük bakım operasyonlarını sesli komutla yönetmelerine yardımcı olur. Görev tamamlama, mesaj gönderme, çağrı tetikleme ve semptom bildirimi yapabilir. Sohbet botu değildir; komut merkezi olarak çalışır.

---

**Ne yapamaz — absolute constraints:**

1. Teşhis koyamaz, tedavi öneremez, ilaç adı veya dozaj bilgisi veremez.  
2. Semptomları değerlendiremez, "ciddi / hafif / acil / bekleyebilir" biçiminde hiçbir yorum üretemez.  
3. Klinik pattern matching yapamaz. "Bu semptomlar X'e işaret edebilir" formatında hiçbir çıktı üretemez.  
4. 911'i kullanıcı net onayı olmadan arayamaz.  
5. Semptom sorularında yönlendirici soru soramaz. "Göğüs ağrısı da var mı?" gibi hipotez kuran sorular yasaktır.  
6. Persona'yı terk edemez. Kapsam dışı sorularda bile Sinalytix bakım asistanı olarak kalır.

---

**Ne yapabilir — permitted behaviors:**

1. Tanımlı aksiyon whitelist'i içindeki aksiyonları önerebilir ve kullanıcı onayı ile uygulayabilir.  
2. Genel yaşam sorularına (beslenme alışkanlığı, egzersiz zamanlaması, genel sağlık rutinleri) klinik yorum içermeden yanıt verebilir.  
3. Gerçek zamanlı veri gerektiren sorularda (nöbetçi eczane, adres) bilgi olmadığını söyler ve yönlendirir.  
4. Semptom bildirimi için maksimum 2 nötr, zaman/şiddet/bağlam odaklı soru sorabilir.  
5. Kırmızı durumda aile arama zincirini başlatabilir; 911 için net kullanıcı onayı ister.

---

**Belirsiz durumlarda davranış:**

* Tıbbi içerik mi genel bilgi mi belirsizse → MEDICAL\_ADVICE'a yuvarlama yap.  
* Aksiyon çıkarımı belirsizse → tek netleştirici soru sor, ikinci belirsizlikte iptal et.  
* Kullanıcı ifadesi hem semptom hem aksiyon içeriyorsa → SYMPTOM\_REPORT\_SEND öner, tamamlama için ayrıca onay al.  
* Kırmızı tetikleyici belirsizse → Kırmızı tetikleme. "Bu konuşma acil mi?" diye sormak gereksiz sürtünme yaratır ve gecikmede risk oluşturur.

---

**Output validation (her LLM çıktısı üretilmeden önce kontrol edilir):**

❌ "bu ciddi görünüyor" → BLOCK

❌ "acil olmayabilir" → BLOCK

❌ "muhtemelen X hastalığı" → BLOCK

❌ "\[ilaç adı\] al / kullan / bırak" → BLOCK

❌ "dozajını artır / azalt" → BLOCK

❌ herhangi bir tıbbi değerlendirme cümlesi → BLOCK

Blok durumunda çıktının yerine sabit metin döner:

"Bu konuda sana yardımcı olamam. Doktoruna veya eczacına sorabilirsin."

---

## **9\. Kabul Kriterleri**

### **V0 — Fonksiyonel**

* PTT butonu → Voice Modal → ASR → pipeline çalışır.  
* Foreground wakeword "Sina" → Voice Modal açılır; arka planda dinleme yok.  
* 3.5 saniye sessizlik → "Çözümleniyor" geçişi gerçekleşir.  
* 45 saniye dolunca aktif konuşma kesilir, mevcut transcript ile pipeline çalışır.  
* Voice Modal'da son 3-4 satır transcript görünür (fade-out).  
* Tek session'da maksimum 1 aksiyon yürütülür.

### **V0 — LLM-as-Judge**

* MEDICAL\_ADVICE içerik → hard block \+ sabit yönlendirme cümlesi. Aksiyon pipeline'ına geçmez.  
* IRRELEVANT içerik → sabit ret cümlesi. Session kapanır.  
* GENERAL\_LIFE içerik → LLM yanıtı \+ seslendirilir \+ session kapanır. Klinik yorum içermez.  
* IN\_SCOPE\_ACTION → aksiyon çıkarımına geçer.  
* Belirsiz tıbbi içerik → MEDICAL\_ADVICE'a yuvarlanır.

### **V0 — Risk Davranışları**

* Yeşil: 10 saniye hareketsizlik → auto-confirm → aksiyon uygulanır.  
* Sarı: 30 saniye hareketsizlik → auto-cancel.  
* Kırmızı: yalnızca explicit emergency beyanında tetiklenir.  
* Kırmızı 30 saniye timeout → family push \+ call round-1. 911 tetiklenmez.  
* 911 yalnızca kullanıcı `Evet, 9-1-1'i ara`'ya bastığında aranır.  
* Red attempt bildirimi: iptal veya timeout olsa bile aile/bakıcıya gider.

### **V0 — Semptom Bildirimi**

* SYMPTOM\_REPORT\_SEND → Sarı panel → kullanıcı onayı gerekir.  
* Maksimum 2 netleştirici soru sorulur; sorular nötr ve yönlendirici değil.  
* Soruların cevapları sistemin aksiyon kararını değiştirmez.  
* Bildirim: aile \+ aktif bakıcıya (ikisine birden). Zaman damgalı transkript özeti içerir.  
* Sistem hiçbir koşulda değerlendirme cümlesi üretmez; output validation bunu engeller.

### **V0 — Veri**

* Her session VoiceSession tablosuna yazılır.  
* Her proposed aksiyon ProposedAction tablosuna yazılır (yürütülsün ya da yürütülmesin).  
* ActionExecutionLog her sonuç için yazılır.  
* SymptomReport gönderildiğinde tam içerikle saklanır.  
* RedEscalationLog kırmızı akışa girildiğinde oluşturulur (iptal olsa bile).

### **V0 — Güvenlik**

* LLM output validation: tanımlı blocked pattern'ler her çıktıda kontrol edilir.  
* Blocked çıktı sabit cümle ile replace edilir; ham LLM çıktısı kullanıcıya ulaşmaz.  
* Audio dosyası varsa 7 günden fazla saklanmaz.  
* Wakeword engine ses verisini sunucuya göndermez; on-device işleme.

---

## **10\. Görsel ve UX Notları**

**Home / Entry:**

* Mic butonu büyük ve görünür. Wakeword aktifken yanında sessiz bir "dinliyorum" göstergesi (ikon veya animasyon). Net: gizli dinleme algısı yaratmayacak şekilde tasarlanmalı.

**Voice Modal — Dikte:**

* Scrolling subtitle: son 3-4 satır, büyük font, yüksek kontrast.  
* "Çözümleniyor…" geçişi görsel olarak net.  
* İptal butonu her an görünür, büyük dokunma alanı.  
* "Bitirdim" butonu opsiyonel ama yaşlı kullanıcı için değerli — 3.5 saniye beklemek yerine manuel bitirebilir.

**Aksiyon Onay Paneli:**

* Yeşil / Sarı / Kırmızı renk arka plan dominant.  
* "Anladığım" ve "Yapacağım" metni kısa, büyük font.  
* Geri sayım sayacı görünür (Yeşil için 10sn, Sarı için 30sn).  
* Butonlar büyük: `Onayla` / `Güncelle` / `İptal`.  
* Sesli okuma: aksiyon özeti kısaca seslendirilir (yaşlı kullanıcı için kritik).  
* Hands-free onay: "Onayla", "İptal", "Güncelle" sesli komutuyla da işlem yapılabilir.

**Kırmızı Panel:**

* Uyarı metni ekranda çok görünür: "9-1-1 sadece acil durumlar içindir."  
* Primary CTA: `Aileyi Ara` (daha az regülasyon riskli, daha sıcak ilk adım).  
* 911 CTA yalnızca "aileye ulaşılamadı" sonrası çıkar.

**Semptom Soruları:**

* Sorular seslendirilir.  
* Kullanıcı sesli veya yazılı yanıt verebilir.  
* İkinci soru birincinin cevabına bakmaksızın standarttır (dinamik soru yok).

---

## **11\. Kullanıcı Senaryoları**

**Yatalak hasta, hands-free task tamamlama (Yeşil):** "Sina, bir bardak su içtim." → Judge: IN\_SCOPE\_ACTION → TASK\_COUNTER\_INCREMENT → Yeşil panel → 10 saniye hareketsizlik → auto-confirm → su 1/8 olur → kısa ses tonu → modal kapanır.

**Hasta ilacını aldı (Sarı):** "Metformin'imi az önce içtim." → Judge: IN\_SCOPE\_ACTION → TASK\_COMPLETE (medication) → Sarı panel → kullanıcı Onayla'ya basar → task done, aileye bildirim → modal kapanır.

**Hasta ailesine mesaj gönderiyor (Sarı):** "Kızıma söyle akşam erken gelsin." → Judge: IN\_SCOPE\_ACTION → MESSAGE\_SEND → Sarı panel → "Kızına 'akşam erken gel' mesajı göndereceğim" → Onayla → mesaj gönderilir.

**Hasta ilaç soruyor (MEDICAL\_ADVICE):** "Aspirin tokken mi içilir?" → Judge: MEDICAL\_ADVICE → hard block → "Bu konuda sana yardımcı olamam. Eczacına sorabilirsin." → modal kapanır.

**Hasta şikayet bildiriyor (Sarı):** "Sabahtan beri başım ağrıyor." → Judge: IN\_SCOPE\_ACTION → SYMPTOM\_REPORT\_SEND → Sarı panel → "Ailene baş ağrısı bildirimi göndereceğim. Önce biraz daha bilgi alabilir miyim?" → Soru 1: "Ne zamandır devam ediyor?" → Soru 2: "Buna eşlik eden başka bir şey fark ettin mi?" → kullanıcı Onayla → aile \+ bakıcıya zenginleştirilmiş bildirim.

**Hasta acil (Kırmızı):** "Düştüm, kalkamıyorum." → Judge: IN\_SCOPE\_ACTION → Kırmızı tetikleme → panel: "9-1-1 sadece acil durumlar içindir. Aileni şimdi arayalım mı?" → kullanıcı `Aileyi Ara`'ya basar → native dialer → aile cevaplarsa zincir biter → cevaplamazsa "Ailene ulaşılamadı. 9-1-1'i aramamı ister misin?" → kullanıcı `Evet` → 911 aranır.

**Kırmızı — kullanıcı hareketsiz (30sn timeout):** "Nefes alamıyorum" → Kırmızı panel → 30 saniye geçer, kullanıcı yanıt vermez → 911 aranmaz → family push \+ call round-1 başlar → Red attempt bildirimi gider (aile \+ varsa bakıcı).

**Kapsam dışı soru:** "Bana şiir yaz." → Judge: IRRELEVANT → "Buna yardımcı olamam. Bakımınla ilgili bir şey yapabilmem için söyleyebilirsin." → modal kapanır.

---

## **12\. Başarı Metrikleri**

### **Pipeline Güvenilirliği**

* ASR transcript başarı oranı (boş transcript döndürmeme): ≥ %95  
* Judge sınıflandırma hata oranı (false MEDICAL\_ADVICE block): izleme metriği, baseline toplanacak  
* Aksiyon çıkarım başarı oranı (IN\_SCOPE\_ACTION'dan aksiyon üretme): izleme metriği  
* Output validation block tetiklenme oranı: ≥ %0 (sıfır bloklanmamış klinik içerik geçmemeli)

### **Güvenlik**

* Kırmızı panel → 911 tetiklenme oranında kullanıcı net onayı olmadan: %0 (absolute)  
* Red attempt bildirimi gönderim başarı oranı: ≥ %99  
* MEDICAL\_ADVICE içerik → kullanıcıya ulaşan klinik çıktı: %0 (absolute)

### **Kullanım**

* Wakeword false positive oranı: izleme metriği; yüksekse eşik kalibrasyonu  
* Session tamamlama oranı (aksiyon önerisi \+ kullanıcı onayı): izleme metriği, baseline  
* Güncelle (Güncelle butonu basılma) oranı: yüksekse aksiyon çıkarım kalitesi veya ASR sorunu  
* Sarı panel auto-cancel oranı: yüksekse panel UX veya kullanıcı eğitimi değerlendirilebilir

### **Teknik**

* Voice Modal açılma süresi (tetiklemeden modal görünümüne): ≤ 800ms  
* Pipeline tamamlanma süresi (ASR son → Aksiyon Paneli görünümü): ≤ 3 saniye  
* VoiceSession kayıt başarı oranı: ≥ %99.9

---

## **13\. Açık Konular**

**PIPEDA / Consent:**

* Wakeword ve mikrofon kullanımı için onboarding'de veya ilk kullanımda ayrı consent adımı gerekir. "Uygulama açıkken 'Sina' için mikrofon dinlenmesi yapılır" notu açık olmalı. Profile & Settings'ten kapatılabilir. Bu akış onboarding PRD'sine eklenecek.

**Audio retention:**

* V0'da audio kaydının saklanıp saklanmayacağı ürün kararı. Önerim: default kapalı (sadece transcript saklanır), kullanıcı opt-in ile 7 günlük audio log açabilir. PIPEDA açısından temiz.

**LLM / ASR sağlayıcı seçimi:**

* Google Vertex, OpenAI Whisper \+ GPT-4o, ya da başka bir stack. Bu seçim system prompt yapısını ve output validation katmanının implementasyonunu etkiler. Sağlayıcı kararı netleşince teknik spec güncellenecek.

**V1 wakeword arka plan dinleme:**

* Teknik: Picovoice/Porcupine custom wakeword engine değerlendirmesi. Maliyet: custom wakeword lisansı gerekli. PIPEDA: "yalnızca wakeword eşleşmesi, ses kaydı yok" iddiası için on-device işleme doğrulaması şart. V1 öncesinde ayrı teknik \+ legal inceleme gerekir.

# 0️⃣ Home Screen

**Home Screen Layout**

Release Version: MVP     |     Uygulama İçi Konumu: Bottom Navigation — Home sekmesi

# **1\. Özelliğin Tanımı ve Amacı**

Tanım: Patient uygulamasının ana ekranı. Kullanıcı her oturumda bu ekranla karşılanır. Uygulamanın tüm temel işlevlerine tek ekrandan erişim sağlar: acil ve standart çağrı, AI Agent, görev listesi. Bu PRD yeni bir feature tanımlamaz; daha önce yazılmış feature PRD'lerini (Hızlı Çağrı, AI Agent, Görev Takip, Bildirim Merkezi) bir araya getiren yerleşim ve navigasyon dokümanıdır.

Amaçlar:

* Yaşlı ve düşük teknoloji okuryazarlığına sahip kullanıcı için sıfır sürtünmeli erişim: en kritik aksiyonlar ekranın üst kısmında, ekstra tıklama olmadan görünür.

* Bilişsel yük minimizasyonu: ekranda az eleman, büyük dokunma alanları, net hiyerarşi.

* Agentic kullanımı teşvik etmek: Sina butonu ana aksiyonlar arasında eşit ağırlıkla konumlandırılır.

* Görev listesini default açık tutmak: hasta ekrana gelince bugünün görevlerini görmek için ek tıklamaya ihtiyaç duymamalı.

# **2\. Kapsam ve Kısıtlar**

## **2.1 Kapsam (In Scope)**

**V0 (MVP):**

* Uygulama geneli navigasyon yapısı: bottom navigation \+ header

* Home ekranı bileşen yerleşimi: header, 3 ana aksiyon butonu, görev listesi

* Her bileşenin ilgili feature PRD'sine bağlantısı

* Boş durum davranışları (yeni kullanıcı, görev yok vb.)

**V1:**

* Kişiselleştirilmiş karşılama mesajı ("Günaydın \[isim\]")

* Bakıcı vardiya durumu özeti (aktif bakıcı adı ve vardiya süresi)

* Hızlı semptom bildirimi kısayolu (Sina'ya alternatif)

## **2.2 Kısıtlar (Constraints)**

* Home ekranı yalnızca yerleşim ve yönlendirme içerir. Her bileşenin davranışı kendi PRD'sinde tanımlıdır; bu PRD davranış değiştirmez.

* Bottom navigation 3 sekmeden oluşur: Home, Mesajlar, Profil. Sekme sayısı artmaz (V0).

* Settings'e bottom nav'dan doğrudan sekme yoktur; Profil sekmesi üzerinden ayarlar ikonu ile erişilir.

* Header sabit kalır (sticky); scroll ile kaybolmaz.

* Görev listesi Home ekranına gömülüdür; ayrı bir sekme veya sayfaya gidilmez.

* Ana aksiyon butonları 3'tür ve sabit yerleşimdedir. Yeni buton eklenmez (V0).

## **2.3 Non-goals (Out of Scope)**

* Widget veya dashboard özelleştirme

* Sağlık metrikleri özeti, grafik veya istatistik gösterimi (V0)

* Haber akışı, içerik önerisi

* Dark mode (V1+)

## **2.4 Versiyonlama**

* V0 (MVP): Sabit layout — header \+ 3 aksiyon butonu \+ görev listesi

* V1: Karşılama mesajı \+ bakıcı vardiya özeti \+ hızlı semptom kısayolu

# **3\. Navigasyon Yapısı**

## **3.1 Bottom Navigation**

| Sekme | İkon | İçerik | Not |
| :---- | :---- | :---- | :---- |
| Home | Ev ikonu | Ana ekran (bu PRD) | Varsayılan açılış |
| Mesajlar | Konuşma balonu ikonu | Inbox — Mesajlaşma PRD | Okunmamış mesaj badge'i gösterilir |
| Profil | Kişi ikonu | Profil ekranı (aşağıda tanımlı) | Settings'e buradan erişilir |

## **3.2 Header (Tüm Sekmelerde Sabit)**

| Eleman | Konum | Davranış |
| :---- | :---- | :---- |
| Sinalytix logosu / uygulama adı | Sol üst | Tıklanamaz, sadece marka gösterimi |
| Çan ikonu (Bildirim Merkezi) | Sağ üst | Okunmamış bildirim badge'i; tıklanınca panel açılır — Bildirim Merkezi PRD |

## **3.3 Profil Ekranı**

Profil sekmesine tıklanınca açılan ekran. Bottom navigation üzerinden erişilir.

| Bileşen | Açıklama |
| :---- | :---- |
| Avatar \+ Ad Soyad | Kullanıcı profil fotoğrafı (placeholder) ve kayıtlı adı |
| Ayarlar ikonu | Sağ üst köşede dişli ikonu; tıklanınca Profile & Settings PRD'sindeki sekme yapısına gidilir |
| Hızlı bilgi kartı | Onboarding'de girilen birincil tanı (veya "Profil tamamlanmadı" uyarısı) |
| Emergency Contact özeti | Birincil EC adı ve doğrulama durumu; doğrulanmamışsa uyarı rengi |

# **4\. Home Ekranı Yerleşimi**

## **4.1 Bileşen Hiyerarşisi (Yukarıdan Aşağı)**

| Sıra | Bileşen | Açıklama | Kaynak PRD |
| :---- | :---- | :---- | :---- |
| 1 | Header | Logo (sol) \+ Çan ikonu (sağ) — sabit, scroll etkilemez | Bildirim Merkezi PRD |
| 2 | Aksiyon Butonları | 3 büyük buton: SOS | Standart Çağrı | Sina. Yatay veya 2+1 grid yerleşim (aşağıda detay) | Hızlı Çağrı PRD, AI Agent PRD |
| 3 | Günün Görevleri | Today task listesi; ekstra tıklama olmadan açık gelir. Scroll ile uzar. | Görev Takip PRD |

## **4.2 Aksiyon Butonları — Yerleşim Seçenekleri**

3 butonun fiziksel yerleşimi için iki alternatif. Her ikisi de kabul edilebilir; final karar tasarım aşamasında verilecek.

**Seçenek A — Yatay 3'lü Grid:**

* SOS | Standart Çağrı | Sina — yan yana eşit genişlikte

* Avantaj: simetrisi ve tarama kolaylığı

* Dezavantaj: dar ekranlarda buton başlığı kısalabilir

**Seçenek B — 2 \+ 1 Grid:**

* Üst satır: SOS (sol, kırmızı) | Standart Çağrı (sağ)

* Alt satır: Sina — tam genişlik

* Avantaj: SOS ve Sina'ya görsel ağırlık; Sina butonuna mikrofon animasyonu için daha fazla alan

* Dezavantaj: hafif asimetri

Her iki seçenekte de geçerli kurallar:

* SOS butonu daima kırmızı/uyarı rengi; diğerlerinden görsel olarak ayrışır.

* Sina butonu mikrofon ikonu içerir; wakeword aktifse sessiz bir "dinliyorum" animasyonu gösterir.

* Standart Çağrı butonu: bakıcı ve/veya aile müsait değilse görsel olarak soluklaşır (disabled değil, sadece availability uyarısı).

* Her buton minimum 44pt × 44pt dokunma alanı kuralına uyar; pratikte çok daha büyük olacak.

## **4.3 Günün Görevleri Bölümü**

* Header: "Günün Görevleri" başlığı \+ varsa tamamlanma özeti ("3/7 tamamlandı").

* Liste doğrudan butonların altında açık gelir; ayrı bir tıklama gerektirmez.

* Her task satırı: başlık \+ created\_by label \+ aksiyon butonu (Tamamla / \+1).

* Liste uzunsa Home ekranı scroll edilir; header ve aksiyon butonları yukarıda sabit kalır.

* Görev yoksa boş durum mesajı: "Bugün için görev yok. Aile veya bakıcın henüz görev eklemedi."

* Tüm davranışlar (tamamlama, undo, skip, counter) Görev Takip PRD'sinde tanımlıdır.

## **4.4 Scroll Davranışı**

* Header (logo \+ çan) scroll etkilenmez; sabit.

* Aksiyon butonları scroll etkilenmez; sabit. (Görev listesi uzadıkça butonlar yukarıda sabit kalır.)

* Yalnızca Günün Görevleri listesi scroll edilir.

Not: Aksiyon butonlarının sabit kalması yaşlı/düşük koordinasyonlu kullanıcılar için kritik güvenlik tercihidir — uzun görev listesinde kaydırırken SOS her an erişilebilir olmalıdır.

# **5\. Boş Durum Davranışları**

| Durum | Görev Listesi Gösterimi | Aksiyon Butonları |
| :---- | :---- | :---- |
| Yeni kullanıcı — görev yok | "Bugün için görev yok." | Her zaman aktif |
| Tüm görevler tamamlandı | "Bugünkü tüm görevleri tamamladın." \+ tik ikonu | Her zaman aktif |
| Bakıcı ve aile bağlı değil | Normal liste gösterilir | Standart Çağrı soluk; SOS ve Sina aktif |
| Wakeword kapalı | Normal liste gösterilir | Sina butonu aktif; PTT ile kullanılabilir; wakeword animasyonu gösterilmez |

# **6\. Ekran Akış Diyagramı**

flowchart TD  LAUNCH\[Uygulama Açılışı\] \--\> HOME\[Home Ekranı\]  HOME \--\> HEADER\[Header: Logo \+ Çan İkonu\]  HEADER \--\>|Çan tıkla| NOTIF\[Bildirim Merkezi Paneli\]  HOME \--\> BUTTONS\[Aksiyon Butonları\]  BUTTONS \--\>|SOS| SOS\_FLOW\[SOS Akışı — Hızlı Çağrı PRD\]  BUTTONS \--\>|Standart Çağrı| CALL\_FLOW\[Standart Çağrı Akışı — Hızlı Çağrı PRD\]  BUTTONS \--\>|Sina| AGENT\_FLOW\[AI Agent Voice Modal — AI Agent PRD\]  HOME \--\> TASKS\[Günün Görevleri Listesi — Görev Takip PRD\]  HOME \--\> BOTTOM\_NAV\[Bottom Navigation\]  BOTTOM\_NAV \--\>|Mesajlar| INBOX\[Inbox — Mesajlaşma PRD\]  BOTTOM\_NAV \--\>|Profil| PROFILE\[Profil Ekranı\]  PROFILE \--\>|Ayarlar ikonu| SETTINGS\[Profile & Settings PRD\]

# **7\. Kabul Kriterleri**

## **V0 — Navigasyon**

* Uygulama açılınca Home ekranı varsayılan olarak gelir.

* Bottom navigation her sekmede görünürdür; Home, Mesajlar, Profil sekmeleri çalışır.

* Header (logo \+ çan ikonu) tüm sekmelerde ve Home scroll edilirken sabit kalır.

* Profil sekmesindeki ayarlar ikonu Profile & Settings ekranını açar.

* Mesajlar sekmesinde okunmamış mesaj varsa badge gösterilir.

* Çan ikonunda okunmamış bildirim varsa badge gösterilir.

## **V0 — Home Aksiyon Butonları**

* SOS, Standart Çağrı ve Sina butonlarının üçü de Home ekranında ekstra tıklama olmadan görünür.

* SOS butonu kırmızı/uyarı rengiyle görsel olarak ayrışır.

* SOS butonuna tıklanınca Hızlı Çağrı PRD'sindeki SOS akışı başlar.

* Standart Çağrı butonuna tıklanınca Hızlı Çağrı PRD'sindeki standart çağrı akışı başlar.

* Sina butonuna tıklanınca AI Agent Voice Modal açılır.

* Wakeword aktifse Sina butonu üzerinde sessiz dinleme animasyonu gösterilir.

## **V0 — Görev Listesi**

* Home açılınca Günün Görevleri listesi ekstra tıklama olmadan görünürdür.

* Görev yoksa boş durum mesajı gösterilir.

* Tüm görevler tamamlandıysa tebrik mesajı gösterilir.

* Aksiyon butonları görev listesi scroll edilirken sabit kalır (yapışık header / sticky buttons).

## **V0 — Performans**

* Home ekranı açılış süresi (splash → içerik görünümü): ≤ 1.5 saniye.

* Bottom navigation sekme geçiş süresi: ≤ 300ms.

* Görev listesi yükleme süresi (Home açıldıktan itibaren): ≤ 1 saniye.

# **8\. Görsel ve UX Notları**

* Renk hiyerarşisi: SOS kırmızı, Sina marka birincil rengi, Standart Çağrı nötr/ikincil renk.

* Font boyutları büyük tutulur; buton etiketleri minimum 16pt, görev başlıkları minimum 14pt.

* Görev listesinin üstünde çok ince bir ayırıcı çizgi veya hafif renk geçişi bölüm ayrımını netleştirir.

* Sina butonu üzerindeki wakeword animasyonu gizli dinleme algısı yaratmayacak şekilde tasarlanmalı — AI Agent PRD'sindeki uyarıyla paralel.

* Standart Çağrı availability durumu: bakıcı/aile yoksa buton tam disabled yapılmaz (kullanıcıyı korkutabilir); görsel olarak soluklaşır ve küçük bilgi ikonu ile "Şu an müsait kimse yok" gösterilir. Buton tıklanınca yine de akış çalışır (toast ile bilgilendirir).

* Home ekranının genel tonu: sakin, güven verici, kalabalık değil. Maksimum 2-3 renk kullanılır.

* Splash screen: Sinalytix logosu \+ yükleniyor animasyonu. Süresi ≤ 1.5 saniye, sonra Home.

# **9\. Kullanıcı Senaryoları**

## **Sabah rutini:**

Hasta uygulamayı açıyor. Home'da 3 büyük buton ve altında 5 görevlik listesini görüyor. "İlaç hatırlatması" task'ına bakıyor, Sina'ya basıp "ilacımı aldım" diyor. Sonra bakıcısını aramak için Standart Çağrı butonuna basıyor.

## **Yanlışlıkla SOS:**

Hasta telefonu tutarken yanlışlıkla SOS'a basıyor. Kırmızı popup geliyor (Hızlı Çağrı PRD), İptal'e basıyor. Home'a dönüyor, görev listesini görüyor. SOS butonu yerli yerinde, erişilebilir.

## **Görev listesi uzun:**

Aile bugün 8 görev eklemiş. Hasta Home'a gelince liste görünüyor, scroll ediyor. Kaydırırken yukarıdaki SOS ve diğer butonlar sabit kalıyor; ne kadar aşağı inerse insin acil butonlara ulaşabileceğini biliyor.

## **Bildirim kontrolü:**

Çan ikonunda "2" badge'i var. Tıklıyor: gün sonu raporu ve bakıcı bağlantı bildirimi. Bakıcı bildirimini tıklıyor, Settings'e gidiyor. Geri gelince Home'da; badge sıfırlanmış.

## **Yeni kullanıcı, henüz görev yok:**

Onboarding'i yeni bitiren hasta Home'a geliyor. Görev listesi bölümünde "Bugün için görev yok." yazıyor. 3 aksiyon butonu tam aktif. Sina'ya basıp ne yapabileceğini soruyor.

# **10\. Başarı Metrikleri**

* Home ekranı açılış süresi: ≤ 1.5sn (P95)

* SOS butonuna basış → popup açılma: ≤ 500ms (Hızlı Çağrı PRD'den)

* Sina butonuna basış → Voice Modal açılma: ≤ 800ms (AI Agent PRD'den)

* Görev listesi günlük görüntülenme oranı (Home'a giren kullanıcıların kaçı listeye bakıyor): izleme metriği

* Bottom nav sekme kullanım dağılımı (Home / Mesajlar / Profil): izleme

* Home'dan aksiyon butonlarına tıklanma oranı: izleme (SOS / Standart Çağrı / Sina ayrı ayrı)

# **11\. Açık Konular**

* Aksiyon buton yerleşim kararı (Seçenek A: 3'lü yatay grid vs Seçenek B: 2+1 grid): tasarım aşamasında kullanıcı testi ile netleştirilecek.

* Profil ekranı detay içeriği: bu PRD minimum yapıyı tanımladı (avatar, ad, ayarlar ikonu, hızlı bilgi kartı, EC özeti). Tam içerik ve layout Profil ekranı tasarım iterasyonunda şekillenecek.

* Splash screen animasyonu ve branding: pazarlama / tasarım ekibi kararı.

* V1 karşılama mesajı kişiselleştirme kuralları: günün saatine göre mi (Günaydın / İyi Günler / İyi Akşamlar), yoksa sabit mi — V1 PRD'sinde tanımlanacak.

# 1️⃣ Profile & Settings

# **Profile & Settings**

**Release Version:** MVP **Uygulama İçi Konumu:** Alt navigasyon — Settings sekmesi

---

## **1\. Özelliğin Tanımı ve Amacı**

**Tanım:** Hastanın kişisel bilgilerini, sağlık profilini, acil iletişim kişilerini, uygulama tercihlerini ve gizlilik ayarlarını yönettiği merkezi ayarlar ekranı. Sekmeli yapı, ilerleyen versiyonlarda yeni ayar kategorileri (sağlık portalı entegrasyonu, wearable vb.) eklendiğinde genişlemeye uygun olacak şekilde tasarlanır.

**Amaçlar:**

* Onboarding'de toplanan minimum bilginin sonradan zenginleştirilmesine zemin sağlamak.  
* Emergency contact yönetimini (max 3, sıralama, davet, doğrulama) tek noktada toplamak.  
* Sağlık profilini güncel tutma sorumluluğunu kullanıcıya vermek, audit trail ile izlenebilir kılmak.  
* PIPEDA zorunlulukları olan hesap silme ve veri export'u erişilebilir kılmak.  
* Bağlı aile ve bakıcı üyelerini görüntüleme ve yönetme imkanı vermek.

---

## **2\. Sekme Yapısı**

Settings dört ana sekmeye ayrılır. Sekme başlıkları üst kısımda yatay olarak listelenir; ilerleyen versiyonlarda yeni sekme eklenebilir.

| Sekme | İçerik Özeti |
| ----- | ----- |
| **Hesabım** | Kişisel bilgiler, dil, güvenlik, hesap silme, veri export |
| **Sağlık Profilim** | Hastalıklar, alerjiler, ilaçlar, sağlık kayıtları, kaynak bağlantıları |
| **Bildirimler** | Bildirim tercihleri (V0'da görüntüleme; yönetim V1+) |
| **Gizlilik & Güvenlik** | Bağlı kişiler, bakıcı bağlantısı, veri paylaşım izinleri, wakeword/mic izinleri |

---

## **3\. Kapsam ve Kısıtlar**

### **3.1 Kapsam (In Scope)**

---

#### **HESABIM Sekmesi**

**V0:**

* Ad soyad görüntüleme ve düzenleme  
* Telefon numarası görüntüleme (auth yöntemine göre)  
* E-posta görüntüleme (SSO'dan geldiyse)  
* Dil değiştirme → anlık uygulanır, yeniden başlatma gerekmez  
* Hesap silme (çift onay \+ 30 gün grace period)  
* Veri export (JSON formatı, asenkron)

**V1+:**

* Erişilebilirlik tercihleri (font boyutu, yüksek kontrast)  
* İki faktörlü doğrulama (2FA)

**Hesap Silme Detayı:**

* "Hesabımı Sil" CTA ekranın en altında, kırmızı renk  
  2. adım: onay popup — *"Bu işlem 30 gün içinde hesabınızı kalıcı olarak siler. Bu süre içinde giriş yaparak iptal edebilirsiniz."*  
  3. adım: "SİL" yazarak onay kutusu \+ "Kalıcı Olarak Sil" butonu  
* Talep alınır → `AccountDeletionRequest` oluşturulur → kullanıcıya e-posta gönderilir  
* Grace period 30 gün: PIPEDA Organization Accountability ilkesi gereği  
* Grace period içinde giriş yapılırsa: *"Hesap silme isteğiniz var. İptal etmek ister misiniz?"* banner'ı gösterilir → iptal edilirse `status: cancelled`  
* 30 gün sonra fiziksel silme çalışır → e-posta bildirimi

**Veri Export Detayı:**

* Format: JSON  
* İçerik: profil bilgileri, sağlık seed, emergency contacts, task log, activity log, consent kayıtları, ilaç listesi, sağlık profili audit log  
* Export asenkron hazırlanır; hazır olunca push \+ e-posta ile iletilir  
* İndirme linki 72 saat geçerli

---

#### **SAĞLIK PROFİLİM Sekmesi**

**V0 — Manuel Giriş:**

*Hastalıklar:*

* Onboarding'de girilen hastalık listesi görüntüleme ve güncelleme  
* Aynı COND\_ enum katalogu \+ "Diğer" serbest metin  
* `declared_confidence_choice` güncellenebilir  
* Her güncelleme `HealthProfileAuditLog`'a yazılır (önceki değer, yeni değer, actor, timestamp)

*Alerjiler:*

* Alerji listesi görüntüleme ve güncelleme  
* Aynı ALG\_ enum katalogu \+ "Diğer" serbest metin  
* İlaç alerjisi seçiliyse `allergy_notes_text` düzenlenebilir

*İlaçlar (V0 — Manuel):*

* İlaç adı (serbest metin, zorunlu)  
* Doz (serbest metin, opsiyonel)  
* Kullanım sıklığı (serbest metin, opsiyonel)  
* Başlangıç tarihi (opsiyonel)  
* Ekle / düzenle / sil (soft delete, `status: archived`)  
* `data_source: manual` olarak işaretlenir  
* **Önemli constraint:** Sistem dozaj validasyonu yapmaz, klinik doğrulama iddiası taşımaz. Bu alan yalnızca kayıt tutma amaçlıdır.

*Sağlık Kayıtları:*

* V0'da boş, entry point hazır  
* Placeholder: *"Henüz kayıt yok. Sağlık belgelerini eklemek için sonraki güncellemeyi bekleyin."*

**V1 — Belge Upload \+ OCR:**

* PDF veya fotoğraf yükleme (laboratuvar sonucu, reçete, taburculuk belgesi vb.)  
* Yüklenen belge OCR ile taranır; LLM çıktıyı yapılandırır  
* Çıkarılan kalemler kullanıcıya toplu liste olarak sunulur:  
  * Her kalem ayrı checkbox ile seçilebilir / kaldırılabilir  
  * "Tümünü Onayla" kısayolu \+ "Seçilenleri Ekle" CTA  
  * Reddedilen kalemler profile eklenmez, ham belge yine de saklanır  
* Onaylanan kayıtlar `data_source: ocr_extracted`, `ocr_confidence` alanı ile işlenir  
* Ham belge PIPEDA uyumlu retention politikasıyla saklanır

**V2 — Sağlık Portalı API Entegrasyonu:**

Desteklenen sağlık portalları (liste konfigürasyon tabanlıdır; yeni provider eklenebilir):

| Portal | Açıklama |
| ----- | ----- |
| **DotHealth** | Kanada hasta portalı |
| **PocketHealth** | Görüntüleme kayıtları (X-ray, MRI vb.) |
| **MedChart** | Kanada elektronik sağlık kayıtları |
| **Human API** | Çok kaynaklı sağlık veri agregasyonu |
| **PicnicHealth** | Kapsamlı tıbbi geçmiş yönetimi |
| **TELUS Health** | Kanada'nın en büyük dijital sağlık platformu |

* Her provider için ayrı OAuth akışı  
* Bağlantı kurulunca veriler çekilir; kullanıcı onayı ile profile işlenir  
* `data_source: integrated_portal`, `provider_name` ile saklanır  
* Bağlantı kesilince yeni veri çekilmez; mevcut veriler `data_source` etiketi ile kalır

---

#### **BİLDİRİMLER Sekmesi**

**V0:**

* Mevcut bildirim kategorileri listelenir (task reminder, gün sonu raporu, red attempt bildirimi, semptom bildirimi vb.)  
* Toggle yönetimi yoktur — kategoriler görüntülenir, "yakında yönetilebilecek" notu gösterilir  
* OS bildirim izni yönetimi için OS ayarlarına yönlendirme linki

**V1+:**

* Her kategori için ayrı açma/kapama toggle  
* Sessiz saatler (Do Not Disturb) tanımlama — SOS bildirimleri her koşulda çalışır, DND bunları etkilemez

---

#### **GİZLİLİK & GÜVENLİK Sekmesi**

**V0 — Wakeword & Mikrofon:**

> [RECONCILED: Wakeword çelişkisi çözüldü — **V0 = yalnızca foreground (uygulama önplandayken) dinleme.** Kilitli/arka plan ekran dinlemesi **V1**'e ertelendi ve ayrı **`ack_ai_processing`** consent'i gerektirir (kanonik `ConsentRecord.flags.ack_ai_processing`, B9). AI Agent PRD'si zaten foreground-only der; Settings buna hizalandı.]

* "Sina" wakeword toggle: açık/kapalı  
* Wakeword **değiştirilemez**. "Sina" marka bilinirliği ve teknik tutarlılık için sabittir; kişiselleştirme seçeneği sunulmaz.  
* **V0** toggle açılırken açıklama kartı gösterilir: *"Uygulama açıkken (önplandayken) 'Sina' dediğinizde Sinalytix dinlemeye başlar. Ses veriniz yalnızca cihazınızda işlenir, sunucuya gönderilmez. İstediğiniz zaman kapatabilirsiniz."*  
* **Kilitli ekran / arka plan wakeword (V1 — ayrı `ack_ai_processing` consent'i ile):**  
  * On-device wakeword engine (Picovoice Porcupine) arka planda çalışır  
  * Ses verisi cihazdan çıkmaz; yalnızca "kelime eşleşti / eşleşmedi" sinyali üretilir  
  * iOS: Background Audio entitlement \+ "Sina" tetiklenince foreground'a alınır  
  * Android: Background Service \+ WakeLock ile aynı davranış sağlanır  
  * PIPEDA uyumu: (1) ayrı `ack_ai_processing` consent'i bu ekranda alınır, (2) ses sunucuya gönderilmez, (3) kullanıcı istediğinde kapatır  
* SOS sesli uyarı toggle: *"Telefon sessizde bile SOS uyarısı çalsın"* — default açık, kapatılabilir. Kapatılırsa uyarı gösterilir.

**V0 — Bakıcı Bağlantısı:**

* Aktif bakıcı bilgisi görüntüleme: ad, ajans (varsa), aktif vardiya durumu  
* **Bakıcı Ekleme — QR / Kod ile:**  
  * "Bakıcı Ekle" butonuna basılınca sistem bir QR kod \+ 6 haneli numerik kod üretir  
  * QR kod: bakıcı kendi uygulamasından kamerasıyla okutarak bağlanır (fiziksel ortamda hızlı bağlantı)  
  * 6 haneli kod: bakıcı kendi uygulamasında manuel giriş yaparak bağlanır (uzaktan çalışır)  
  * Kod geçerlilik süresi: 15 dakika (güvenlik)  
  * Süre dolunca yeni kod üretilebilir  
  * Bağlantı kurulunca bakıcı listede görünür; Caregiver App tarafında da hasta bağlantısı oluşur  
* Bakıcı bağlantısını kesme: listeden "Bağlantıyı Kes" CTA → onay popup → kesilir

**V0 — Emergency Contact Yönetimi:**

* Onboarding'de eklenen kişi burada görünür  
* Max 3 kişiye kadar ekleme  
* Sürükle-bırak ile sıralama — sıra SOS arama önceliğini belirler; sıra numarası label olarak gösterilir ("1. Öncelik", "2. Öncelik", "3. Öncelik")  
* Her kişi için durum label'ı:

| Durum | Açıklama |
| ----- | ----- |
| `Davet Bekleniyor` | Davet gönderildi, henüz kabul edilmedi |
| `Uygulama Kullanıcısı` | Family App'e kayıtlı ve hasta ile bağlı |
| `Yalnızca Telefon` | Daveti kabul etti, uygulamayı indirmedi |
| `Doğrulama Bekliyor` | Telefon numarası SMS ile doğrulanmamış |

* Telefon doğrulama: SMS OTP ile; doğrulama tamamlanmadan SOS çalışmaya devam eder (acil önceliği)  
* Doğrulama hatırlatması: onboarding'den 24 saat sonra ve 7 gün sonra bildirim

**Emergency Contact Davet Akışı:**

Yeni kişi eklenir (ad \+ telefon \+ ilişki)  
→ SMS \+ e-posta ile davet gönderilir:  
   "\[Hasta adı\] sizi Sinalytix'te acil iletişim kişisi olarak ekledi.  
    Daveti kabul etmek için: \[link\]"  
→ Davet kabul edilene kadar: "Davet Bekleniyor"  
→ Kişi linke tıklar:  
   → Sinalytix/Family App hesabı varsa: otomatik bağlanır → "Uygulama Kullanıcısı"  
   → Hesap yoksa: Family App'e yönlendirilir → kayıt sonrası bağlanır → "Uygulama Kullanıcısı"  
   → Uygulamayı indirmezse: "Yalnızca Telefon" olarak işaretlenir  
→ SOS akışında tüm durumlar aranabilir:  
   "Uygulama Kullanıcısı" ve "Yalnızca Telefon" → numara üzerinden aranır  
   "Doğrulama Bekliyor" → telefon doğrulanmamış olsa da aranabilir  
   "Davet Bekleniyor" → numara girilmişse yine de aranabilir

**V0 — Bağlı Aile Üyeleri:**

* Family App'te kayıtlı ve `patient_id` ile eşleşmiş aile üyeleri listesi  
* Her üye için: ad, ilişki, bağlantı durumu  
* Bağlantı kesme CTA → onay popup → kesilir → o kişiye bildirim gider: *"Sinalytix bağlantınız \[hasta adı\] tarafından sonlandırıldı."*

---

### **3.2 Kısıtlar (Constraints)**

* Tüm sağlık profili güncellemeleri `HealthProfileAuditLog`'a yazılır; fiziksel silme yapılmaz, soft delete \+ `updated_by` \+ `previous_value` saklanır.  
* İlaç bilgisi validasyon içermez. Sistem kullanıcının girdiğini olduğu gibi saklar; klinik doğrulama iddiası taşımaz.  
* Hesap silme grace period: 30 gün (PIPEDA uyumu).  
* Veri export asenkron çalışır; büyük hesaplarda anlık indirme garanti edilmez. İndirme linki 72 saat geçerli.  
* Wakeword "Sina" sabittir, değiştirilemez, kişiselleştirilemez.  
* Wakeword on-device çalışır; ses verisi sunucuya gitmez.  
* **(V1)** Kilitli ekran wakeword için iOS Background Audio entitlement ve Android Background Service izinleri gerekir; bu izinler Settings'te açıklamalı şekilde ve ayrı `ack_ai_processing` consent'i ile kullanıcıya gösterilir. *(RECONCILED: V0 yalnız foreground)*  
* Bildirim yönetimi V0'da pasif (görüntüleme); aktif toggle yönetimi V1.  
* Bakıcı ekleme kodu 15 dakika geçerlidir; süre dolunca yeni kod üretilir.  
* Emergency contact max 3 kişi sınırı uygulanır.

### **3.3 Non-goals (Out of Scope)**

* Doktor / klinik bilgisi yönetimi (Healthcare Professional App entegrasyonu ile gelecek)  
* Ödeme bilgileri yönetimi (B2B faz)  
* Wearable / cihaz kurulumu (V2+)  
* Sigorta bilgisi (V2+)  
* Bakıcı profil düzenleme (Caregiver App tarafından yönetilir)

### **3.4 Versiyonlama**

* **V0:** 4 sekme yapısı \+ Hesabım (kişisel bilgi, dil, silme, export) \+ Sağlık Profilim (hastalık, alerji, ilaç manuel girişi) \+ Bildirimler (görüntüleme) \+ Gizlilik (wakeword, bakıcı QR/kod bağlantısı, EC yönetimi \+ davet, aile listesi)  
* **V1:** Belge upload \+ OCR (toplu onay akışı), bildirim toggle yönetimi \+ sessiz saatler, 2FA, erişilebilirlik tercihleri  
* **V2:** Sağlık portalı API entegrasyonu (DotHealth, PocketHealth, MedChart, Human API, PicnicHealth, TELUS Health), wearable bağlantısı

---

## **4\. Veri Modeli**

### **HealthProfile**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `profile_id` | uuid |  |
| `user_id` | uuid |  |
| `conditions[]` | enum\[\] | COND\_ katalog kodları |
| `conditions_other_text` | string|null |  |
| `allergies[]` | enum\[\] | ALG\_ katalog kodları |
| `allergy_notes_text` | string|null |  |
| `declared_confidence` | enum | `professionally_diagnosed|self_declared|prefer_not_to_say` |
| `last_updated_at` | timestamp |  |
| `last_updated_by` | enum | `patient|caregiver|family|system|ocr|portal` |

### **MedicationRecord**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `medication_id` | uuid |  |
| `user_id` | uuid |  |
| `name` | string | Serbest metin |
| `dose` | string|null | Serbest metin, validasyon yok |
| `frequency` | string|null | Serbest metin |
| `start_date` | date|null |  |
| `status` | enum | `active|discontinued|archived` |
| `data_source` | enum | `manual|ocr_extracted|integrated_portal` |
| `source_provider` | string|null | Portal adı (V2) |
| `ocr_confidence` | float|null | V1+ |
| `created_at` | timestamp |  |
| `created_by` | enum | `patient|caregiver|family|system` |

### **HealthProfileAuditLog**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `audit_id` | uuid |  |
| `user_id` | uuid |  |
| `field_changed` | string | `conditions|allergies|medication_added|medication_removed|medication_updated` |
| `previous_value` | json |  |
| `new_value` | json |  |
| `changed_by_actor` | enum | `patient|caregiver|family|system|ocr|portal` |
| `changed_at` | timestamp |  |

### **EmergencyContact**

> [RECONCILED: A11 — Kanonik tek şekil (`phone_verified` + `sort_order`). Bu tablo zaten uyumlu; §5.2 (eski `verified`/`is_primary`) ve Calls §5.1 (eski `order`/`verified`) varyantları buna hizalandı.]

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `ec_id` | uuid |  |
| `user_id` | uuid | Hasta |
| `name` | string |  |
| `relationship` | enum \+ other |  |
| `phone` | string |  |
| `phone_verified` | bool |  |
| `sort_order` | int | SOS arama sırası (1, 2, 3\) |
| `invite_status` | enum | `pending|accepted_app_user|accepted_phone_only` |
| `invite_sent_at` | timestamp|null |  |
| `invite_accepted_at` | timestamp|null |  |
| `linked_family_user_id` | uuid|null | Family App hesabıyla eşleşmişse |

### **CaregiverLink**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `link_id` | uuid |  |
| `patient_id` | uuid |  |
| `caregiver_id` | uuid|null | Bağlantı kurulunca dolar |
| `link_code` | string | 6 haneli numerik *(RECONCILED: B4 — eski "alfanumerik" → "numerik"; tabloyu Patient app sahiplenir)* |
| `qr_payload` | string | QR içeriği (deep link) |
| `expires_at` | timestamp | Oluşturulma \+ 15 dakika |
| `status` | enum | `pending|linked|expired|unlinked` |
| `linked_at` | timestamp|null |  |
| `unlinked_at` | timestamp|null |  |
| `unlinked_by` | enum|null | `patient|caregiver|system` |

### **AccountDeletionRequest**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `request_id` | uuid |  |
| `user_id` | uuid |  |
| `requested_at` | timestamp |  |
| `scheduled_deletion_at` | timestamp | `requested_at + 30 gün` |
| `cancelled_at` | timestamp|null |  |
| `executed_at` | timestamp|null |  |
| `status` | enum | `pending|cancelled|executed` |

---

## **5\. Kullanıcı Akışları**

### **5.1 Emergency Contact Ekleme \+ Davet**

Settings → Gizlilik & Güvenlik → Emergency Contacts → "Kişi Ekle"  
→ Form: Ad Soyad (zorunlu) \+ İlişki (zorunlu) \+ Telefon (zorunlu)  
→ Kaydet  
→ SMS \+ e-posta ile davet gönderilir  
→ Listede "Davet Bekleniyor" label ile görünür

→ Kişi daveti kabul ederse:  
   Sinalytix hesabı varsa → "Uygulama Kullanıcısı"  
   Hesap yoksa → Family App'e yönlendirilir → kayıt sonrası "Uygulama Kullanıcısı"  
   Uygulamayı indirmezse → "Yalnızca Telefon"

→ Sıralama: kişiyi sürükle-bırak ile istenen sıraya taşı  
→ SOS akışı sort\_order'a göre çalışır

### **5.2 Bakıcı Bağlantısı Kurma**

Settings → Gizlilik & Güvenlik → Bakıcı Bağlantısı → "Bakıcı Ekle"  
→ QR kod \+ 6 haneli kod üretilir  
→ Geri sayım: 15:00 başlar  
→ İki seçenek sunulur:  
   "Bakıcıya QR kodu göster" (fiziksel ortam)  
   "Kodu paylaş" (uzaktan: kopyala/WhatsApp/SMS ile)  
→ Bakıcı Caregiver App'ten kodu girer veya QR'ı okutur  
→ Bağlantı kurulur → "Aktif Bakıcı: \[İsim\]" görünür  
→ Süre dolarsa: "Kod süresi doldu, yeni kod oluştur" CTA

Bakıcı Bağlantısını Kesme:  
Settings → Gizlilik & Güvenlik → Aktif Bakıcı → "Bağlantıyı Kes"  
→ Onay popup → Kesilir → CaregiverLink.status: unlinked

### **5.3 İlaç Ekleme (V0 Manuel)**

Settings → Sağlık Profilim → İlaçlar → "İlaç Ekle"  
→ İlaç adı (zorunlu) \+ Doz (opsiyonel) \+ Sıklık (opsiyonel) \+ Başlangıç tarihi (opsiyonel)  
→ Kaydet  
→ MedicationRecord oluşturulur (data\_source: manual)  
→ HealthProfileAuditLog'a yazılır

### **5.4 Belge Upload \+ OCR Onayı (V1)**

Settings → Sağlık Profilim → Sağlık Kayıtları → "Belge Yükle"  
→ PDF veya fotoğraf seçilir  
→ Yükleniyor... → OCR \+ LLM çalışır  
→ Toplu onay ekranı açılır:  
   "Bu belgeden şunlar çıkarıldı:"  
   ☑ İlaç: Metformin 500mg — günde 2  
   ☑ Hastalık: Tip 2 Diyabet  
   ☐ Değer: HbA1c: 7.2 (checkbox kaldırılmış)  
     
   "Tümünü Onayla" | "Seçilenleri Ekle"  
→ Onaylananlar profile eklenir (ilgili data\_source ile)  
→ Reddedilenler eklenmez  
→ Ham belge saklanır

### **5.5 Wakeword Aktivasyonu**

Settings → Gizlilik & Güvenlik → Wakeword & Mikrofon → Toggle  
→ Açıklama kartı gösterilir (V0 — foreground):  
   "Uygulama açıkken (önplandayken) 'Sina' dediğinizde  
    Sinalytix dinlemeye başlar. Ses veriniz yalnızca  
    cihazınızda işlenir, sunucuya gönderilmez."  
   *(RECONCILED: V0 foreground-only; kilitli ekran dinleme V1 + ayrı `ack_ai_processing` consent'i)*  
→ "Anladım, Aktifleştir"  
→ OS mikrofon izni istenir  
→ İzin verilirse: toggle açılır, on-device engine başlar  
→ İzin reddedilirse: "Mikrofon izni gerekiyor" \+ OS ayarlarına link

### **5.6 Hesap Silme**

Settings → Hesabım → "Hesabımı Sil" (kırmızı, en altta)  
→ 1\. Onay popup:  
   "Bu işlem 30 gün içinde hesabınızı kalıcı olarak siler.  
    Bu süre içinde giriş yaparak iptal edebilirsiniz."  
   CTA: "Devam Et" / "Vazgeç"  
→ 2\. Metin girişi:  
   "Onaylamak için 'SİL' yazın"  
   "Kalıcı Olarak Sil" butonu (metin doğruysa aktif)  
→ AccountDeletionRequest oluşturulur  
→ E-posta: "Hesap silme talebiniz alındı..."  
→ Grace period boyunca giriş yapılırsa banner:  
   "Hesap silme isteğiniz var. İptal etmek ister misiniz?"  
→ 30 gün sonra fiziksel silme \+ e-posta  
---

## **6\. Kabul Kriterleri**

### **Hesabım**

* Dil değişikliği anlık uygulanır, yeniden başlatma gerekmez.  
* Hesap silme iki aşamalı onay gerektirir; tek tıkla silinemez.  
* Grace period 30 gündür. Grace period içinde giriş yapılırsa silme talebi iptal edilebilir.  
* Fiziksel silme `scheduled_deletion_at` tarihinde gerçekleşir; `executed_at` güncellenir.  
* Veri export talebi alınır, asenkron hazırlanır, bildirim \+ e-posta ile iletilir.  
* Export linki 72 saat geçerlidir.

### **Sağlık Profilim**

* Hastalık ve alerji listesi onboarding'deki katalogla aynı enum'ları kullanır.  
* İlaç kaydı validasyon içermez; sistem girilen metni olduğu gibi saklar.  
* Her sağlık profili güncellemesi `HealthProfileAuditLog`'a yazılır (önceki değer, yeni değer, actor, timestamp).  
* Silinen ilaç kayıtları `status: archived` olur, fiziksel silinmez.

### **Bildirimler**

* V0'da bildirim kategorileri listelenir, toggle çalışmaz.  
* OS ayarlarına yönlendirme linki çalışır.

### **Gizlilik & Güvenlik**

* Emergency contact max 3 kişi sınırı uygulanır; 3\. kişi eklenince "Ekle" butonu disable olur.  
* Sürükle-bırak ile sıralama değiştirilince `sort_order` güncellenir ve SOS akışına yansır.  
* Davet e-postası \+ SMS'i yeni kişi eklendiğinde otomatik gönderilir.  
* Davet durumu doğru label ile gösterilir.  
* Telefon doğrulama SMS ile çalışır; doğrulanmadan önce SOS arama çalışmaya devam eder.  
* Bakıcı bağlantı kodu 6 haneli numerik \+ QR olarak üretilir.  
* Kod 15 dakika sonra expire olur; süresi dolan kod ile bağlantı kurulamaz.  
* Wakeword toggle açılırken OS izin akışı tetiklenir; izin reddedilirse toggle açılmaz.  
* On-device wakeword engine ses verisini sunucuya göndermez (teknik test ile doğrulanacak).  
* **(V0)** "Sina" wakeword **yalnızca foreground'da** (uygulama önplandayken) tetiklenince Voice Modal açılır. Kilitli ekran/arka plan dinleme **V1** (ayrı `ack_ai_processing` consent'i ile). *(RECONCILED)*  
* Wakeword "Sina" sabittir, değiştirilemez; Settings'te bu bilgi açıkça gösterilir.  
* Bağlı aile üyesi bağlantısı kesilince o kişiye bildirim gönderilir.  
* Bakıcı bağlantısı kesilince `CaregiverLink.status: unlinked` olur; Caregiver App'te de yansır.  
* SOS ses toggle kapatılırsa kullanıcıya uyarı gösterilir.

---

## **7\. Görsel ve UX Notları**

* Sekme navigasyonu üst kısımda, yatay scroll ile taşma desteği.  
* Her sekme kendi bağımsız scroll alanına sahip.  
* Emergency Contact listesi: sürükle-bırak ikonu solda görünür, sıra numarası label ile ("1. Öncelik" vb.).  
* Durum label'ları renk kodlu: sarı (Davet Bekleniyor), yeşil (Uygulama Kullanıcısı), gri (Yalnızca Telefon), turuncu (Doğrulama Bekliyor).  
* Bakıcı bağlantı ekranı: QR büyük ve merkeze yakın, 6 haneli kod altında büyük fontla; geri sayım zamanlayıcısı görünür.  
* İlaç listesi: ilaç adı büyük, doz/sıklık ikincil renkte alt satırda.  
* Hesap silme CTA'sı kırmızı ve Hesabım sekmesinin en altında, diğer aksiyonlardan görsel olarak ayrışır.  
* Wakeword için ayrı açıklama kartı: ne olduğunu, ne yapmadığını (ses göndermediğini) net anlatan kısa metin; teknik detay değil, kullanıcı dili.  
* V1 OCR onay ekranı: her kalem checkbox ile ayrı ayrı seçilebilir; "Tümünü Onayla" kısayolu üstte, "Seçilenleri Ekle" CTA altta.

---

## **8\. Kullanıcı Senaryoları**

**Bakıcı yeni ilaç ekliyor:** Hasta yeni reçete aldı, bakıcısı Settings'ten ilaç ekliyor. Sadece ilaç adı giriyor, doz opsiyonel bırakıyor. Sistem validasyon yapmaz, kaydeder. AuditLog'a "bakıcı ekledi" yazılır.

**Acil iletişim sırasını değiştirdi:** Kullanıcının kızı şehir dışına çıktı. Settings → Emergency Contacts'tan oğlunu birinci sıraya sürüklüyor. Kayıt anlık güncelleniyor; bir sonraki SOS oğlunu önce arıyor.

**Uzaktan bakıcı ekleme:** Kullanıcı yeni bakıcısıyla daha önce hiç görüşmedi, telefon üzerinden hallediyor. Settings'ten "Bakıcı Ekle" diyor, 6 haneli kodu oluşturuyor, WhatsApp'tan bakıcıya gönderiyor. Bakıcı Caregiver App'te kodu giriyor, bağlantı kuruluyor.

**Kızı uygulamaya davet:** Kullanıcı kızının numarasını emergency contact olarak ekliyor. Kıza SMS \+ e-posta gidiyor. Kız Family App'i indirip kayıt olunca "Uygulama Kullanıcısı" oluyor; artık hem emergency contact hem family member.

**Wakeword ilk aktivasyon (V0 — foreground):** Settings → toggle → açıklama kartı → "Anladım" → OS izin popup'ı → izin veriyor → toggle açılıyor. Uygulama önplandayken "Sina" diyor, Voice Modal açılıyor. *(RECONCILED: kilitli ekranda dinleme V1; ayrı `ack_ai_processing` consent'i gerektirir.)*

**V1: Laboratuvar sonucu yükleme:** Hasta son kan tahlilini PDF olarak yüklüyor. OCR çalışıyor, 3 kalem çıkarıyor: Tip 2 Diyabet, Metformin 500mg, HbA1c değeri. Hasta ilk ikisini onaylıyor, HbA1c değerini (sayısal veri, bağlam yok) reddediyor. İki kalem profile ekleniyor, PDF saklanıyor.

**Hesap silme \+ pişmanlık:** Settings → "Hesabımı Sil" → çift onay → talep alınır. 10 gün sonra giriş yapıyor, banner geliyor, "İptal Et" basıyor. Hesap korunuyor.

---

## **9\. Başarı Metrikleri**

### **Kullanım**

* Settings'e ilk ay içinde giren kullanıcı oranı: izleme metriği  
* Emergency contact sayısını 1'den fazlaya tamamlama oranı: izleme  
* Davet gönderilip kabul edilme oranı: izleme; düşükse davet metni/UX gözden geçirilmeli  
* Bakıcı bağlantı kurma başarı oranı (kod üretme → bağlantı tamamlama): izleme  
* İlaç kaydı ekleme oranı (V0 manuel): izleme

### **Güvenilirlik**

* Wakeword toggle açma başarı oranı (OS izni dahil): ≥ %95  
* Telefon doğrulama SMS teslim oranı: ≥ %98  
* Davet SMS \+ e-posta teslim oranı: ≥ %98  
* Bakıcı bağlantı kodu expire olmadan önce kullanılma oranı: izleme; düşükse süre uzatılabilir  
* Hesap silme grace period sonrası fiziksel silme başarı oranı: %100 (absolute)

### **Teknik**

* HealthProfileAuditLog yazım başarı oranı: ≥ %99.9  
* Settings sekme geçiş süresi: ≤ 300ms  
* Bakıcı bağlantı kodu üretme süresi: ≤ 1 saniye

## **10\. Açık Konular**

* **Bakıcı bağlantısı karşı taraf akışı:** Caregiver App'te kod girme / QR okutma ekranı ve bağlantı onay akışı Caregiver App PRD'sinde tanımlanacak.  
* **Family App bağlantı bildirimi içeriği:** Aile üyesi listeden çıkarıldığında gönderilen bildirimin tam içeriği ve bağlantı kesilince Family App tarafındaki davranış Family App PRD'sinde tanımlanacak.  
* **Wakeword engine final seçimi:** Picovoice Porcupine custom wakeword lisans maliyeti vs. OpenWakeWord açık kaynak performansı karşılaştırması teknik karar olarak ayrıca yapılacak. Her iki durumda da davranış bu PRD'de tanımlandığı gibi çalışacak.  
* **V1 OCR provider seçimi:** Hangi OCR \+ LLM kombinasyonu kullanılacağı (AWS Textract, Google Document AI, Azure Form Recognizer vb.) teknik mimari kararı olarak ayrıca ele alınacak.

# 1️⃣ Mesajlaşma

# **Mesajlaşma / Inbox**

**Release Version:** MVP **Uygulama İçi Konumu:** Alt navigasyon — Mesajlar sekmesi

---

## **1\. Özelliğin Tanımı ve Amacı**

**Tanım:** Hasta, aile üyeleri ve bakıcı arasındaki in-app çift yönlü mesajlaşma ekosistemi. Bireysel veya grup konuşmaları üzerinden metin tabanlı iletişim sağlar. Agent tarafından tetiklenen mesajlar da aynı Inbox içinde görünür; kaynağı belirtilen görsel etiketle ayrıştırılır.

**Amaçlar:**

* Hasta, aile ve bakıcı arasında düşük sürtünmeli, tek platformda iletişim kanalı oluşturmak.  
* Agent aksiyonlarıyla üretilen mesajları kullanıcıya tutarlı ve anlaşılır bir şekilde sunmak.  
* Yaşlı / düşük teknoloji okuryazarlığına sahip kullanıcı için basit, net bir mesajlaşma deneyimi sağlamak.  
* Semptom bildirimi (`SYMPTOM_REPORT_SEND`) gibi klinik ağırlıklı akışları buradan ayırarak Inbox'ı sade tutmak.

**Kapsam notu:** Semptom bildirimleri ayrı bir aksiyon olarak Family App PRD'sinde ele alınacak; bu PRD'de kapsama dahil değildir.

---

## **2\. Kapsam ve Kısıtlar**

### **2.1 Kapsam (In Scope)**

**V0 (MVP):**

* Bireysel konuşma: hasta ↔ aile üyesi, hasta ↔ bakıcı  
* Grup konuşması: hasta \+ aile üyeleri \+ bakıcı (tek grup, "Bakım Ekibim")  
* Metin tabanlı mesaj gönderme ve alma  
* Konuşma listesi (Inbox): tüm konuşmalar, son mesaj önizlemesi, okunmamış sayacı  
* Agent kaynaklı mesajlar Inbox'ta görünür; "Sina ile gönderildi" etiketi / ikonu ile ayrıştırılır  
* Push bildirimi: yeni mesaj geldiğinde  
* Okundu/okunmadı durumu  
* Mesaj retention: 2 yıl

**V1:**

* Ses kaydı ekleme (voice note)  
* Fotoğraf / video gönderme  
* Mesaj arama

**V2:**

* Dosya ekleme (PDF vb.)  
* Mesaj içeriğinde arama (full-text)

### **2.2 Kısıtlar (Constraints)**

* Yalnızca in-app mesajlaşma. SMS, e-posta veya harici kanal entegrasyonu hiçbir versiyonda planlanmamaktadır.  
* Medya ekleri (ses, fotoğraf, video) V0'da yoktur. Güvenlik ve veri yerleşimi (data residency) değerlendirmeleri V1'de tamamlanacak.  
* Semptom raporları (`SYMPTOM_REPORT_SEND`) bu Inbox'ta görünmez; ayrı bir akış.  
* Mesaj şifreleme: at-rest ve in-transit AES-256. PIPEDA/PHIPA uyumlu.  
* Veri yerleşimi: tüm mesaj verisi Kanada bölgesinde saklanır (AWS Canada Central / Azure Canada).  
* Mesaj retention: 2 yıl. Süre dolunca mesajlar otomatik arşivlenir / silinir; kullanıcı bilgilendirilir.  
* "Bakım Ekibim" grubu sistem tarafından otomatik oluşturulur; kullanıcı tarafından oluşturulan özel grup yok (V0).  
* Grup konuşmasına kimlerin dahil olduğu hasta'nın bağlı kişi listesinden otomatik belirlenir.  
* Agent mesajlarında kaynak etiketi her zaman görünür; etiket kaldırılamaz.  
* Hasta, aile veya bakıcıyla bağlantısı kesilmişse o kişiye mesaj gönderilemez.

### **2.3 Non-goals (Out of Scope)**

* SMS / harici kanal entegrasyonu (hiçbir versiyonda)  
* Semptom raporu görüntüleme (Family App PRD'sinde)  
* Doktor / sağlık profesyoneli ile mesajlaşma (Healthcare Professional App entegrasyonu ile gelecek)  
* Mesaj silme / düzenleme (V0)  
* Okundu bilgisi karşı tarafa gösterme / çift tik (V0)  
* Ödeme veya görev atama içeren mesajlar

### **2.4 Versiyonlama**

* **V0:** Metin mesajlaşması \+ bireysel \+ grup ("Bakım Ekibim") \+ Agent etiketli mesajlar \+ push bildirimi \+ 2 yıl retention  
* **V1:** Ses kaydı \+ fotoğraf/video \+ mesaj arama  
* **V2:** Dosya ekleme \+ full-text içerik arama

---

## **3\. Konuşma Tipleri**

### **3.1 Bireysel Konuşmalar**

Her bağlı kişi için ayrı bir konuşma iş parçacığı (thread) oluşturulur:

* Hasta ↔ Aile Üyesi 1  
* Hasta ↔ Aile Üyesi 2  
* Hasta ↔ Bakıcı

Bağlantı kesilirse thread arşive düşer; geçmiş mesajlar okunabilir, yeni mesaj gönderilemez.

### **3.2 Grup Konuşması — "Bakım Ekibim"**

* Sistem tarafından otomatik oluşturulur; kullanıcı adını değiştiremez (V0)  
* Üyeler: hasta \+ tüm bağlı aile üyeleri \+ aktif bakıcı  
* Yeni aile üyesi / bakıcı bağlanınca gruba otomatik eklenir  
* Bağlantı kesilince gruptan otomatik çıkarılır  
* Hasta bu gruba mesaj gönderebilir; tüm üyeler görür

### **3.3 Agent Kaynaklı Mesajlar**

`MESSAGE_SEND` aksiyonu yürütüldüğünde mesaj ilgili thread'e eklenir. Görsel ayrıştırma:

* Mesaj baloncuğu üzerinde küçük "Sina ile gönderildi" etiketi  
* Etiket rengi ve ikonu tasarım kararı (ör. küçük mikrofon ikonu veya "S" harfi)  
* Etiket kaldırılamaz; her zaman görünür  
* Agent mesajı bir bireysel thread'e de, "Bakım Ekibim" grubuna da gönderilebilir (aksiyon payload'ına göre)

---

## **4\. Kullanıcı Akışı**

### **4.1 Inbox (Konuşma Listesi)**

Hasta Mesajlar sekmesine girer  
→ Konuşma listesi açılır (son mesaja göre sıralı):  
   \[Bakım Ekibim\]         "Su içtim 💧" — Sina ile gönderildi   14:32  🔴3  
   \[Kızım — Sarah\]        "Nasılsın anne?"                      12:10  🔴1  
   \[Bakıcı — Maria\]       "Şimdi geldim, kapıdayım"             09:45

→ Her konuşma satırında:  
   Konuşma adı / kişi adı  
   Son mesaj önizlemesi (max 1 satır)  
   Zaman damgası  
   Okunmamış mesaj sayacı (varsa)

### **4.2 Konuşma Ekranı**

Konuşmaya tıklanır → Thread açılır  
→ Mesajlar kronolojik sırada  
→ Hasta mesajları sağda, karşı taraf mesajları solda  
→ Agent kaynaklı mesajlarda "Sina ile gönderildi" etiketi görünür  
→ Alt kısım: metin kutusu \+ Gönder butonu (büyük)  
→ Kullanıcı mesaj yazar → Gönder → thread'e eklenir  
→ Karşı tarafa push bildirimi gider

### **4.3 Yeni Mesaj Gönderme Akışı**

Hasta Inbox'ta "Yeni Mesaj" butonuna basar (veya mevcut thread'i açar)  
→ Alıcı seçimi (Yeni Mesaj'da):  
   Bireysel: listeden kişi seç (sadece bağlı kişiler)  
   Grup: "Bakım Ekibim" (tek grup seçeneği)  
→ Metin yaz → Gönder  
→ Thread'e eklenir, karşı tarafa push bildirimi

### **4.4 Agent Kaynaklı Mesaj Akışı**

Hasta Voice Modal'da "Anneye söyle akşam erken gelsin" der  
→ Agent: MESSAGE\_SEND aksiyonu → Sarı panel → Onayla  
→ Sistem mesajı Sarah'nın thread'ine ekler  
→ "Akşam erken gel" metni \+ "Sina ile gönderildi" etiketi  
→ Sarah'ya push bildirimi: "\[Hasta adı\]: Akşam erken gel"  
→ Hasta Inbox'ta gönderilmiş mesajı thread içinde görür

### **4.5 Mermaid Diyagramı**

flowchart TD  
  A\[Mesajlar sekmesi\] \--\> B\[Inbox — konuşma listesi\]  
  B \--\> C{Kullanıcı aksiyonu}

  C \--\>|Mevcut thread'e tıkla| D\[Thread açılır\]  
  C \--\>|Yeni Mesaj butonu| E\[Alıcı seçimi\]

  E \--\>|Bireysel| F\[Kişi listesi — bağlı kişiler\]  
  E \--\>|Grup| G\[Bakım Ekibim\]  
  F \--\> D  
  G \--\> D

  D \--\> H\[Metin yaz \+ Gönder\]  
  H \--\> I\[Mesaj thread'e eklenir\]  
  I \--\> J\[Alıcıya push bildirimi\]

  K\[Agent MESSAGE\_SEND aksiyonu onaylandı\] \--\> L\[Hedef thread belirlenir\]  
  L \--\> I

---

## **5\. Veri Modeli**

### **Conversation**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `conversation_id` | uuid |  |
| `patient_id` | uuid |  |
| `type` | enum | `individual | group` |
| `name` | string | null | Grup için "Bakım Ekibim"; bireysel için null |
| `created_at` | timestamp |  |
| `archived_at` | timestamp | null | Bağlantı kesilince |
| `last_message_at` | timestamp | null | Sıralama için |

### **ConversationMember**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `member_id` | uuid |  |
| `conversation_id` | uuid |  |
| `actor_type` | enum | `patient | family | caregiver` |
| `actor_id` | uuid |  |
| `joined_at` | timestamp |  |
| `left_at` | timestamp | null | Bağlantı kesilince |

### **Message**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `message_id` | uuid |  |
| `conversation_id` | uuid |  |
| `sender_actor_type` | enum | `patient | family | caregiver | system` |
| `sender_actor_id` | uuid |  |
| `content` | text | Mesaj metni |
| `source` | enum | `manual | agent` |
| `sent_at` | timestamp |  |
| `expires_at` | timestamp | `sent_at + 2 yıl` |

### **MessageReadStatus**

| Alan | Tip | Açıklama |
| ----- | ----- | ----- |
| `read_id` | uuid |  |
| `message_id` | uuid |  |
| `reader_actor_id` | uuid |  |
| `read_at` | timestamp |  |

---

## **6\. Bildirim Kuralları**

| Tetikleyici | Alıcı | İçerik |
| ----- | ----- | ----- |
| Yeni bireysel mesaj | Alıcı | "\[Gönderen\]: \[Mesaj önizlemesi\]" |
| Yeni grup mesajı | Tüm üyeler (göndericisi hariç) | "Bakım Ekibim: \[Gönderen\]: \[Mesaj önizlemesi\]" |
| Agent mesajı gönderildi | Alıcı | "\[Hasta adı\]: \[Mesaj\] • Sina ile gönderildi" |

**Kurallar:**

* Kullanıcı uygulamayı aktif kullanıyorsa (foreground) push yerine in-app bildirim gösterilir.  
* Bildirim içeriğinde mesaj metni max 80 karakter; uzunsa kesilir.  
* DND modu aktifse mesaj bildirimleri gönderilmez (Settings V1'de); SOS bildirimleri her koşulda çalışır.

---

## **7\. Kabul Kriterleri**

### **V0 — Fonksiyonel**

* Inbox açılınca tüm konuşmalar son mesaja göre sıralı listelenir.  
* Okunmamış mesaj sayacı her konuşma satırında görünür.  
* Thread açılınca mesajlar okundu olarak işaretlenir; sayaç sıfırlanır.  
* Hasta bağlı kişilerden herhangi birine bireysel mesaj gönderebilir.  
* "Bakım Ekibim" grubu hasta için otomatik oluşturulur; tüm bağlı kişileri kapsar.  
* Yeni aile/bakıcı bağlantısı kurulunca "Bakım Ekibim" grubuna otomatik eklenir.  
* Bağlantı kesilince ilgili thread arşive düşer; geçmiş okunabilir, yeni mesaj gönderilemez.  
* Agent (`MESSAGE_SEND`) kaynaklı mesajlar ilgili thread'de "Sina ile gönderildi" etiketiyle görünür.  
* Etiket her zaman görünür; kaldırılamaz.  
* Mesaj gönderilince alıcıya push bildirimi gider.  
* Bağlantısı olmayan kişiye mesaj gönderilemez; buton disable görünür.

### **V0 — Veri ve Güvenlik**

* Tüm mesajlar at-rest ve in-transit AES-256 ile şifrelenir.  
* Mesaj verisi Kanada bölgesi sunucularında saklanır.  
* `expires_at` \= `sent_at + 2 yıl`; süre dolan mesajlar otomatik arşivlenir/silinir.  
* `Message.source` alanı her mesaj için doğru şekilde `manual` veya `agent` olarak yazılır.  
* `MessageReadStatus` mesaj açılınca yazılır.

---

## **8\. Görsel ve UX Notları**

* Inbox listesi sade: konuşma adı, son mesaj, zaman, okunmamış sayacı. Fazlası yok.  
* Konuşma satır yüksekliği büyük, dokunma alanı geniş (yaşlı kullanıcı).  
* Thread ekranında metin kutusu büyük, "Gönder" butonu belirgin.  
* Agent kaynaklı mesaj baloncuğu: standart balondan görsel olarak hafifçe ayrışır (örn. hafif farklı arka plan tonu \+ etiket). Fazla teknik görünmemeli; "Sina ile gönderildi" etiketi küçük, ikincil renkte, mesaj altında.  
* Arşive düşmüş thread: "Bu kişiyle bağlantınız kesildi. Geçmiş mesajları okuyabilirsiniz." banner'ı thread üstünde gösterilir. Metin kutusu gizlenir.  
* "Bakım Ekibim" grubu listede en üstte sabitlenebilir (tasarım kararı).  
* Grup thread'inde gönderen adı her mesajın üstünde küçük fontla gösterilir.

---

## **9\. Kullanıcı Senaryoları**

**Hasta bakıcısına mesaj gönderiyor:** Bakıcı vardiyada ama öte odada. Hasta Inbox'tan bakıcısını seçiyor, "Koltukta kalsam olur mu?" yazıyor. Bakıcının telefonuna push bildirimi düşüyor.

**Agent mesaj gönderiyor:** Hasta Voice Modal'da "Kızıma söyle akşam erken gelsin" diyor. Agent Sarı panel öneriyor, hasta Onayla basıyor. Kızının thread'ine "Akşam erken gel • Sina ile gönderildi" mesajı düşüyor. Hasta Inbox'ta gönderilmiş mesajı görüyor.

**Bakım Ekibim grubuna mesaj:** Hasta sabah gruba "Bugün kendimi iyi hissediyorum" yazıyor. Hem kızı hem bakıcısı bildirimi alıyor; kızı "Çok güzel anne\!" diye yanıtlıyor.

**Bakıcı değişti, grup güncellendi:** Eski bakıcının bağlantısı kesildi. "Bakım Ekibim" grubundan otomatik çıkarıldı. Yeni bakıcı bağlandı, gruba otomatik eklendi. Hasta ekranda fark etmez, grup aynı adla çalışmaya devam eder.

**Arşivlenmiş thread:** Hasta eski bir aile üyesiyle bağlantısını kesti. O thread listede arşiv bölümüne düştü. Hasta eski mesajları okuyabiliyor ama yeni mesaj kutusu görünmüyor.

---

## **10\. Başarı Metrikleri**

### **Kullanım**

* Günlük mesaj gönderen aktif hasta oranı: izleme metriği  
* Agent kaynaklı mesaj / manuel mesaj oranı: izleme (agent ağırlıklıysa UX dengesi gözden geçirilmeli)  
* "Bakım Ekibim" grubuna mesaj gönderme oranı vs bireysel: izleme

### **Güvenilirlik**

* Mesaj iletim başarı oranı (gönderildi → alıcıda göründü): ≥ %99.5  
* Push bildirim teslim oranı: ≥ %98  
* MessageReadStatus yazım başarı oranı: ≥ %99.9

### **Teknik**

* Thread açılma süresi (Inbox'tan tıkla → mesajlar görünür): ≤ 500ms  
* Mesaj gönderme süresi (Gönder → thread'de görünür): ≤ 1 saniye  
* expires\_at kontrolü: günlük batch job, başarı oranı %100

---

## **11\. Açık Konular**

* **V1 medya güvenliği:** Ses kaydı ve fotoğraf gönderiminde PIPEDA uyumlu depolama, içerik moderasyonu ve veri yerleşimi gereksinimleri V1 öncesinde ayrıca değerlendirilecek.  
* **Family ve Caregiver App Inbox:** Bu PRD patient app perspektifinden yazıldı. Aile ve bakıcı uygulamalarındaki Inbox deneyimi (bildirim yönetimi, thread görünümü, grup yönetimi) ilgili PRD'lerde tanımlanacak.  
* **Mesaj şifreleme tipi:** At-rest \+ in-transit şifreleme tanımlandı. End-to-end encryption (E2EE) teknik ve yasal değerlendirme gerektiriyor (anahtar yönetimi, PIPEDA uyum); V1+ kararı.

# 1️⃣ Bildirimler

**Bildirim Merkezi**

Release Version: MVP     |     Uygulama İçi Konumu: Header — çan ikonu

# **1\. Özelliğin Tanımı ve Amacı**

Tanım: Hasta uygulamasında sisteme ait bildirimlerin merkezi olarak listelendiği panel. Header'da çan ikonu aracılığıyla erişilir. Bildirimler içeriği burada göstermez; yalnızca yönlendirme (redirect) bağlantısı olarak çalışır. Kullanıcı ilgili bildirimi görünce doğrudan ilgili ekrana geçer.

Amaçlar:

* Uygulamada gerçekleşen önemli olaylardan kullanıcıyı haberdar etmek.

* Bildirimleri tek noktada, sade bir liste olarak sunmak; içerik karmaşıklığını bu panel üstlenmiyor.

* Okundu/okunmadı durumu ile kullanıcının kaçırdığı olayları net şekilde görmesini sağlamak.

* Büyük orkestrasyon bildirimleri (hesap silme onayı, veri export gibi) uygulama dışı (e-posta) üzerinden yönetilir; bu panel bakım operasyonu bildirimlerine odaklanır.

# **2\. Kapsam ve Kısıtlar**

## **2.1 Kapsam (In Scope)**

**V0 (MVP):**

* Header'da çan ikonu; üzerinde okunmamış bildirim badge sayacı

* Panel (bottom sheet veya overlay): bildirimler sade liste olarak gösterilir

* Her bildirim satırı: ikon \+ kısa başlık metni \+ zaman damgası \+ okundu/okunmadı göstergesi

* Tıklanınca ilgili ekrana redirect; içerik panelde genişlemiyor

* Panel açılınca görünür olan tüm bildirimler okunmuş sayılır; bireysel tıklama gerekmez

* UI'da son 30 günün bildirimleri görünür

* 30 günden eski bildirimler UI'dan kaldırılır; DB'de 1 yıl saklanır

Bildirim tipleri (V0):

| Bildirim Tipi | Tetikleyici | Alıcı | Redirect |
| :---- | :---- | :---- | :---- |
| daily\_report | 22:00'de gün sonu raporu oluşturuldu | Hasta | Task listesi |
| new\_message | Inbox'ta yeni mesaj geldi | Hasta | Mesajlar / Inbox |
| task\_reminder | Saat bazlı task hatırlatması veya 21:00 pending uyarısı | Hasta | Task listesi |
| caregiver\_connected | Bakıcı bağlantısı kuruldu | Hasta | Settings \> Gizlilik & Güvenlik |
| caregiver\_link\_change (kesildi) | Bakıcı bağlantısı kesildi | Hasta | Settings \> Gizlilik & Güvenlik |
| ec\_verification\_reminder | Acil iletişim kişisi telefon numarası doğrulanmadı (onboarding'den 24 saat ve 7 gün sonra) | Hasta | Settings \> Gizlilik & Güvenlik |
| symptom\_report\_sent | Hasta Sina aracılığıyla semptom bildirimi gönderdi (onay amaçlı) | Hasta | Semptom rapor yüzeyi (gönderim onayı) |

> [RECONCILED: dead-end düzeltmesi — `symptom_report_sent` redirect'i Inbox yerine semptom rapor yüzeyine işaret eder. Inbox modülü (bkz. §"Inbox") semptom raporlarının orada görünmediğini açıkça belirtir; eski "→ Inbox" yönlendirmesi boş ekrana düşürürdü.]

## **2.2 Kısıtlar (Constraints)**

* Bildirim paneli yalnızca hasta uygulamasında header çan ikonu üzerinden açılır; bottom nav'da ayrı sekme yoktur.

* Her bildirim redirect bağlantısıdır. İçerik (rapor detayı, mesaj metni vb.) panelde gösterilmez.

* Panel açılınca tüm görünür bildirimler okunmuş sayılır. Bireysel okuma işlemi yoktur.

* Hesap silme, veri export hazır bildirimi ve benzeri yüksek orkestrasyon işlemleri e-posta üzerinden gider; bu panele düşmez.

* Red attempt (kırmızı eskalasyon) bildirimi bu panele düşmez; o akış zaten ekranda canlı yürür.

* UI'da 30 günlük görünürlük sınırı uygulanır. 30 günü geçen bildirimler listeden kaldırılır; DB'de PIPEDA audit gerekliliği için 1 yıl saklanır.

* Bildirimler kullanıcı tarafından silinemez (V0).

* Push bildirim ile in-app bildirim ayrı kanallardır. Push bildirim OS seviyesinde çalışır; bu panel in-app geçmiştir. Bir push bildirime tıklanınca uygulama açılır ve ilgili ekrana gidilir; Notification Center üzerinden geçmez.

## **2.3 Non-goals (Out of Scope)**

* Bildirim içeriğinin panel içinde genişletilmesi / detay görünümü

* Kullanıcı tarafından bildirim silme veya arşivleme

* Bireysel bildirim okundu işaretleme

* Bildirim kategorisi filtreleme (V0)

* Hesap silme, veri export, ToS güncelleme bildirimleri (e-posta kanalı)

* Red attempt bildirimi

* Family veya Caregiver App bildirim merkezi (ayrı PRD'lerde tanımlanacak)

## **2.4 Versiyonlama**

* V0 (MVP): Header çan ikonu \+ panel \+ 7 bildirim tipi \+ redirect \+ 30 gün UI retention

* V1: Bildirim kategorisi filtresi, sessiz saatler (Settings PRD ile entegre toggle yönetimi), toplu silme

* V2: Bildirim tercihleri kişiselleştirme, reminder zamanlama ayarı

# **3\. Kullanıcı Akışı**

## **3.1 Panel Açma ve Okundu Mantığı**

Kullanıcı header'daki çan ikonuna basar

→ Panel açılır (bottom sheet veya overlay)

→ Bildirimler tarih sırasıyla listelenir (en yeni üstte)

→ Panel açıldığı anda görünür tüm bildirimler okunmuş sayılır

→ Badge sayacı sıfırlanır

→ Kullanıcı bir bildirime tıklar → panel kapanır → ilgili ekrana redirect

→ Kullanıcı paneli kapatırsa (swipe down veya X) → Home'a döner

## **3.2 Badge Davranışı**

* Yeni (okunmamış) bildirim varsa çan ikonu üzerinde sayı badge'i görünür

* Panel açılınca sayaç sıfırlanır

* Kullanıcı uygulamadayken (foreground) yeni bildirim gelirse badge anlık güncellenir

* Okunmamış bildirim yoksa badge gösterilmez

## **3.3 Mermaid Diyagramı**

flowchart TD  A\[Header \- Çan İkonu\] \--\>|Badge varsa| B\[Panel açılır\]  A \--\>|Badge yoksa| B  B \--\> C\[Bildirimler listelenir \- en yeni üstte\]  C \--\> D\[Tüm görünür bildirimler okunmuş sayılır\]  D \--\> E\[Badge sıfırlanır\]  E \--\> F{Kullanıcı aksiyonu}  F \--\>|Bildirimi tıkla| G\[Panel kapanır \- redirect\]  G \--\> H1\[daily\_report → Task Listesi\]  G \--\> H2\[new\_message → Inbox\]  G \--\> H3\[task\_reminder → Task Listesi\]  G \--\> H4\[caregiver\_connected/disconnected → Settings\]  G \--\> H5\[ec\_verification\_reminder → Settings\]  G \--\> H6\[symptom\_report\_sent → Semptom rapor yüzeyi\]  F \--\>|Paneli kapat| I\[Home'a dön\]

# **4\. Veri Modeli**

## **4.1 Notification**

> [RECONCILED: A3 — `type` birleşik taksonomiye hizalandı (kanonik §7 `event_type` üst-kümesinin alt-kümesi); `caregiver_disconnected` → `caregiver_link_change`. `redirect_target`'taki yinelenen `settings_privacy` değeri kaldırıldı. `push_sent` bool alanı tabloya eklendi. `symptom_report_sent` redirect'i semptom rapor yüzeyine işaret eder (aşağıya bakınız).]

| Alan | Tip | Açıklama |
| :---- | :---- | :---- |
| notification\_id | uuid | Primary key |
| user\_id | uuid | Alıcı hasta |
| type | enum | daily\_report | new\_message | task\_reminder | task\_change | caregiver\_connected | caregiver\_link\_change | ec\_verification\_reminder | symptom\_report\_sent | sos |
| title | string | Kısa başlık metni (lokalize edilmiş) |
| redirect\_target | enum | task\_list | inbox | symptom\_report | settings\_privacy |
| redirect\_params | json | null | Opsiyonel deep link parametresi (ör. conversation\_id) |
| is\_read | bool | Panel açılınca true olur |
| read\_at | timestamp | null | Panel açıldığı zaman damgası |
| push\_sent | bool | Push tetiklendi mi; başarısız olsa bile in-app bildirim oluşturulur |
| created\_at | timestamp | Oluşturulma zamanı |
| expires\_at\_ui | timestamp | created\_at \+ 30 gün; bu tarihten sonra UI'da gösterilmez |
| expires\_at\_db | timestamp | created\_at \+ 1 yıl; DB'den fiziksel silme |

## **4.2 Yazma Kuralları**

* Bildirimler tetikleyen servis tarafından yazılır (task scheduler, mesajlaşma servisi, caregiver bağlantı servisi vb.).

* Her bildirim oluşturulduğunda push notification da ayrıca tetiklenir (OS kanalı).

* push\_sent: bool alanı notification kaydında tutulur; push başarısız olsa bile in-app bildirim oluşturulmuş olur.

* ec\_verification\_reminder: onboarding tamamlandıktan 24 saat sonra bir kez, 7 gün sonra bir kez yazılır; ec.phone\_verified \= true ise yazılmaz.

# **5\. Bildirim Tipi Detayları**

| Tip | Başlık metni (TR) | Tetikleyici | Redirect |
| :---- | :---- | :---- | :---- |
| daily\_report | "Bugünün özeti hazır" | 22:00 scheduler | task\_list |
| new\_message | "\[Gönderen adı\] sana mesaj gönderdi" | Mesaj gönderilince | inbox (conversation\_id ile) |
| task\_reminder (saat bazlı) | "\[Task adı\] zamanı geldi" | Task scheduled\_time | task\_list |
| task\_reminder (21:00) | "Bugün tamamlanmayan görevlerin var" | 21:00 scheduler (pending task varsa) | task\_list |
| caregiver\_connected | "\[Bakıcı adı\] hesabınla bağlandı" | Bağlantı kurulunca | settings\_privacy |
| caregiver\_link\_change (kesildi) | "Bakıcı bağlantısı kesildi" | Bağlantı kesilince | settings\_privacy |
| ec\_verification\_reminder | "Acil iletişim kişinin numarasını doğrula" | Onboarding \+24s, \+7g (verified=false ise) | settings\_privacy |
| symptom\_report\_sent | "Şikayetin aile ve bakıcına iletildi" | SYMPTOM\_REPORT\_SEND onaylanınca | symptom\_report *(RECONCILED: Inbox değil — semptom rapor yüzeyi)* |

# **6\. Kabul Kriterleri**

## **V0 — Fonksiyonel**

* Header'da çan ikonu her ekranda görünür (Home, Inbox, Settings dahil).

* Okunmamış bildirim varsa çan ikonu üzerinde badge sayacı görünür.

* Panel açılınca tüm görünür bildirimler okunmuş sayılır; badge sıfırlanır.

* Her bildirim satırında: ikon \+ başlık metni \+ zaman damgası \+ okundu/okunmadı göstergesi bulunur.

* Okunmamış bildirimler görsel olarak ayrışır (koyu nokta veya farklı arka plan).

* Bildirimlere tıklanınca panel kapanır ve ilgili ekrana redirect çalışır.

* Redirect doğru ekrana gider: daily\_report ve task\_reminder → Task Listesi; new\_message → Inbox; symptom\_report\_sent → Semptom rapor yüzeyi (Inbox değil — semptom raporları Inbox'ta görünmez); caregiver\_connected/disconnected ve ec\_verification\_reminder → Settings \> Gizlilik & Güvenlik.

* UI'da yalnızca son 30 günün bildirimleri görünür; 30 günü geçenler listeden kaldırılır.

* Bildirim listesi boşsa boş durum mesajı gösterilir: "Henüz bildirim yok."

* ec\_verification\_reminder: emergency contact telefon numarası doğrulanmamışsa onboarding tamamlanmasından 24 saat sonra ve 7 gün sonra tetiklenir; doğrulanmışsa tetiklenmez.

## **V0 — Veri**

* Her bildirim Notification tablosuna yazılır; type, redirect\_target, created\_at alanları dolu olur.

* Panel açıldığında is\_read \= true ve read\_at \= timestamp olarak güncellenir.

* expires\_at\_ui \= created\_at \+ 30 gün; bu tarihten sonra sorgu dışında kalır.

* expires\_at\_db \= created\_at \+ 1 yıl; DB'den fiziksel silme bu tarihte çalışır.

## **V0 — Teknik**

* Badge sayacı: is\_read \= false ve expires\_at\_ui \> now olan kayıtların count'u.

* Panel açılma süresi: ≤ 300ms.

* Okundu güncelleme (is\_read \= true): panel açılışından ≤ 500ms içinde DB'ye yazılır.

# **7\. Görsel ve UX Notları**

* Çan ikonu header'ın sağ tarafında, kullanıcı avatarı veya profil ikonunun yanında konumlanır.

* Badge: kırmızı daire, maksimum "99+" gösterir; sayı 99'u geçerse "99+" yazılır.

* Panel: bottom sheet olarak açılması önerilir (yaşlı kullanıcı için kaydırma daha kolay); overlay alternatifi de kabul edilir.

* Liste satırı yüksekliği büyük tutulur; minimum dokunma alanı standartlarına uygun.

* Okunmamış bildirim: satır solunda küçük koyu mavi nokta veya hafif farklı arka plan tonu.

* Zaman damgası: kısa format ("Az önce", "2 saat önce", "Dün", "3 Haz").

* Bildirim ikonu tipi başına farklılaşır: task için takvim/tik ikonu, mesaj için konuşma balonu, bakıcı için kişi ikonu, acil kişi için kalkan ikonu.

* Boş durum ekranı: küçük ikon \+ "Henüz bildirim yok." metni; sade, kullanıcıyı yönlendiren bir alt metin eklenebilir ("Bakım etkinliklerin burada görünecek.").

* Panel kapatma: swipe down veya sağ üstte X butonu.

# **8\. Kullanıcı Senaryoları**

## **Sabah rutini — birden fazla bildirim birikmiş:**

Hasta sabah uygulamayı açıyor. Çan ikonunda "3" badge'i görüyor. Tıklıyor: "Bugünün özeti hazır" (gece 22:00'den), "Maria hesabınla bağlandı" (bakıcı bağlandı) ve "İlaç zamanı geldi" (task hatırlatması) listede. Panel açılınca üçü de okunmuş sayılıyor, badge sıfırlanıyor. "İlaç zamanı geldi" bildirimine tıklıyor, Task Listesine gidiyor.

## **Acil iletişim kişisi doğrulanmadı:**

Onboardingden 24 saat geçmiş, telefon numarası hâlâ doğrulanmamış. Bildirim panelinde "Acil iletişim kişinin numarasını doğrula" görünüyor. Tıklıyor, Settings \> Gizlilik & Güvenlik'e gidiyor, SMS doğrulama başlatıyor. 7 gün sonra ikinci hatırlatma da gelecek, ama doğrulama yapılırsa artık gelmeyecek.

## **Semptom bildirimi gönderildi:**

Hasta Sina üzerinden baş ağrısı bildiriyor, onaylıyor. Panel'de "Şikayetin aile ve bakıcına iletildi" bildirimi düşüyor. Hasta bunu tıklayınca Inbox'a gidiyor; ailesinin yanıtı varsa orada görüyor.

## **Bakıcı bağlantısı kesildi:**

Bakıcı Caregiver App'ten ayrıldı. Hasta'nın paneline "Bakıcı bağlantısı kesildi" bildirimi düşüyor. Tıklayınca Settings \> Gizlilik & Güvenlik'e gidiyor; yeni bakıcı ekleyebileceğini görüyor.

## **Hiç bildirim yok:**

Yeni kullanıcı onboarding'i az önce tamamladı. Çan ikonuna basıyor, panel açılıyor: "Henüz bildirim yok. Bakım etkinliklerin burada görünecek." mesajı görüyor.

# **9\. Başarı Metrikleri**

## **Kullanım**

* Bildirim paneli açılma oranı (bildirim alan günlerde): izleme metriği, baseline toplanacak

* Bildirime tıklanma (redirect kullanım) oranı: izleme; düşükse başlık metni veya UX gözden geçirilmeli

* ec\_verification\_reminder tıklanma → doğrulama tamamlama oranı: izleme

* daily\_report bildiriminden Task Listesine geçiş oranı: izleme

## **Güvenilirlik**

* Notification yazım başarı oranı: ≥ %99.9

* is\_read güncelleme başarı oranı (panel açılınca): ≥ %99.9

* Badge sayacı hatalı gösterim oranı (stale count): izleme

* expires\_at\_db batch silme başarı oranı: %100 (absolute)

## **Teknik**

* Panel açılma süresi: ≤ 300ms

* Okundu yazma süresi (panel açılışından DB güncellemesine): ≤ 500ms

* Badge güncelleme gecikmesi (yeni bildirim → badge görünümü): ≤ 1sn

# **10\. Açık Konular**

* Family ve Caregiver App bildirim merkezi: Bu PRD yalnızca Patient App perspektifini kapsar. Aile ve bakıcı bildirim panelleri ilgili PRD'lerde tanımlanacak.

* Push bildirim sağlayıcısı: FCM / APNs entegrasyon detayları teknik mimari kararı olarak ayrıca ele alınacak. Bildirim başlık metinleri bu PRD'de tanımlandığı gibi kullanılacak.

* V1 sessiz saatler entegrasyonu: Settings \> Bildirimler sekmesinde V1'de gelecek toggle yönetimi ile Notification Center'daki bildirim oluşturma kuralları senkronize edilecek. SOS ve acil bildirimler DND'den muaf tutulacak.

* new\_message deduplication: Kısa sürede aynı konuşmadan birden fazla mesaj gelirse tek bildirim mi yoksa her mesaj için ayrı bildirim mi oluşturulacağı V0 sonrasında kararlaştırılacak. V0'da her mesaj için ayrı bildirim oluşturulur.

[image1]: <> "GÖRSEL ÇIKARILDI — orijinal ~1MB gömülü base64 PNG (ekran görseli), Claude Project token tasarrufu için 2026-07-22 tarihinde kaldırıldı. Orijinal görsel arşiv kopyasında (yüklenen Hasta_Patient__RECONCILED.md) durur."
