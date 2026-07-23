# Modül 2 §3 kataloğu ↔ core-api rotaları

**Amaç:** Spec'in uç kataloğundaki her satırın kodda nerede olduğunu tek bakışta bulmak. Yollar birebir aynı değil; neden aynı olmadığı aşağıda.

## Neden yeniden adlandırma yapılmadı (D15 item B7)

Modül 2 §3 kendini şöyle tanımlıyor: *"CRUD'un bariz kısımları (GET by id vb.) tekrarlanmaz; farklılaşan kurallar yazılır."* Yani §3 bir **routing tablosu değil**, yük taşıyan uçların ve onların kurallarının kataloğu. `/patients/{id}/emergency-contacts` ile `/emergency-contacts` aynı kaynağın iki geçerli REST ifadesi.

İç içe biçim bilinçli tercih edildi çünkü **sahiplik ilişkisini URL'de taşıyor** ve bu, veri modelinin kendisiyle örtüşüyor: bu kaynaklar hasta-sahipli ve RLS de tam olarak `patient_id` üzerinden karar veriyor. Yolun kendisi "bu, şu hastanın verisi" diyor.

Yeniden adlandırmanın maliyeti ise gerçek: üç yayınlanmış uygulamanın her çağrı noktası, `packages/api-client`, testler ve deploy tanımları — **sıfır davranışsal kazanç** karşılığında. Mühendislik El Kitabı §1 de sözleşmelerin (Modül 2) korunmasını istiyor, yolların harf birliğini değil.

Bu bilinçli bir sapma olarak kaydedildi; bu tablo onun telafisi.

## Eşleme

| Modül 2 §3 | core-api | Not |
|---|---|---|
| **S1 — Identity** ||
| `POST /auth/register` | `POST /v1/auth/signup` | "signup" uygulama diliyle tutarlı |
| `POST /auth/otp/request` · `/verify` | aynı | |
| `POST /auth/login` · `/refresh` · `/logout` | aynı | |
| `POST /auth/reauth` (T3/T4) | **yok** | Yükseltme gerektiren uç henüz yok (klinik imza/order = Faz 5). `REAUTH_REQUIRED` kodu ve `details.tier` sözleşmesi hazır |
| `GET/PATCH /users/me` | `GET/PATCH /v1/me` | |
| `GET /users/me/roles` | `GET /v1/me` (`roles[]` alanı) | Ayrı uç yerine tek profil yanıtı; ekstra round-trip yok |
| `POST /users/me/profiles/{role}` | **yok** | Rol uzantısı ekleme henüz akış değil |
| **S2 — Consent & Policy** ||
| `POST /consents` · `GET /consents` | aynı | + `GET /v1/consents/effective` (bkz. D15.3) |
| `POST /grants` | `POST /v1/patients/{id}/consent-grants` | |
| `POST /grants/{id}/revoke` | `POST /v1/consent-grants/{id}/revoke` | |
| `GET /grants?patient_id=` | `GET /v1/patients/{id}/consent-grants` | |
| `POST /sdm` · `PATCH /sdm/{id}` | `POST/GET /v1/patients/{id}/sdm-declarations` | |
| **S4 — Shift & Links** ||
| `POST /caregiver-links` | `POST /v1/patients/{id}/caregiver-links` | |
| `POST /caregiver-links/claim` | `POST /v1/caregiver-links/redeem` | "redeem" legacy paritesi; üç uygulama da bunu çağırıyor |
| `DELETE /caregiver-links/{id}` | `POST /v1/caregiver-links/{id}/unlink` | POST, çünkü işlem **onaya ertelenebiliyor** (FAM-12) — gövde taşıyan bir yanıt döner, `DELETE`'in 204 beklentisiyle örtüşmez |
| `POST /family-links/invite` | `POST /v1/emergency-contacts/{id}/invite` | Davet her zaman bir EC satırından doğar (D12) |
| `POST /family-links/accept` | `POST /v1/family-links/redeem` (+ `/{id}/confirm`) | İki adım: aile kodu kullanır, hasta onaylar |
| `PATCH /family-links/{id}` | aynı | K6 burada uygulanıyor (D15.4) |
| `POST /emergency-contacts` | `POST /v1/patients/{id}/emergency-contacts` | |
| **S8 — Governance** ||
| `GET /approvals?status=pending` | `GET /v1/patients/{id}/approvals` | |
| `POST /approvals/{id}/approve|reject` | aynı | |

## Henüz olmayan servis sınırları

`S3 Care & Tasks` (Faz 2) · `S5 Clinical` (Faz 5) · `S6 Comms` (Faz 3) · `S7 Emergency/SOS` (Faz 4) · `S8`'in AI uçları (Faz 6) · `S9 Admin`. Kapsam Matrisi'nde V0 olan her satırın davranış spec'i ilgili PRD'de mevcut.
