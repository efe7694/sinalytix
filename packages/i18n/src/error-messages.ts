/**
 * Localized API error messages — EN / FR / TR.
 *
 * Modül 2 §1.3 defines `error.message` as "insan-okur, Accept-Language'a
 * göre", and the Tasarım Sistemi §6 forbids literal strings in code. Before
 * this, every one of ~45 error messages was a Turkish literal inlined at its
 * `throw` site, which meant (a) an English- or French-speaking user got
 * Turkish, and (b) the same sentence existed in several places and could
 * drift.
 *
 * Wording follows Tasarım Sistemi §4 "hata dili": non-blaming, says what
 * happened AND what to do, no "something went wrong". The machine-readable
 * half of an error is `code` + `details[]` (see `@sinalytix/domain`) —
 * clients must branch on those, never on this text.
 *
 * FR is a working translation. Ontario requires legal equivalence for
 * **consent/safety** copy specifically (Uyum Listesi §5/2), and those strings
 * are UI/ToS text, not this catalog; still, any string here that becomes
 * user-facing in a consent or emergency flow must go through the same legal
 * review before public launch — machine translation is forbidden there.
 */

import type { Locale } from './locale';
import { DEFAULT_LOCALE } from './locale';

type Messages = Record<Locale, string>;

export const ERROR_MESSAGES = {
  // ── Protocol / generic ────────────────────────────────────────────────
  'error.bad_request': {
    en: 'The request could not be read. Please try again.',
    fr: "La requête n'a pas pu être lue. Veuillez réessayer.",
    tr: 'İstek okunamadı. Lütfen tekrar deneyin.',
  },
  'error.not_found': {
    en: 'We could not find that record.',
    fr: 'Cet enregistrement est introuvable.',
    tr: 'Kayıt bulunamadı.',
  },
  'error.permission_denied': {
    en: 'You do not have permission to do that.',
    fr: "Vous n'avez pas l'autorisation d'effectuer cette action.",
    tr: 'Bu işlem için yetkiniz yok.',
  },
  'error.internal': {
    en: 'Something on our side failed. If it keeps happening, contact support with the error id below.',
    fr: "Une erreur est survenue de notre côté. Si le problème persiste, contactez l'assistance avec l'identifiant ci-dessous.",
    tr: 'Bizim tarafımızda bir sorun oluştu. Devam ederse aşağıdaki hata kimliğiyle destek ile iletişime geçin.',
  },
  'error.rate_limited': {
    en: 'Too many requests. Please wait a moment and try again.',
    fr: 'Trop de requêtes. Veuillez patienter un instant avant de réessayer.',
    tr: 'Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin.',
  },
  'error.feature_disabled': {
    en: 'This feature is temporarily unavailable.',
    fr: 'Cette fonctionnalité est temporairement indisponible.',
    tr: 'Bu özellik geçici olarak kullanılamıyor.',
  },
  'error.validation_failed': {
    en: 'Some fields need attention: {count} could not be accepted.',
    fr: 'Certains champs nécessitent votre attention : {count} refusé(s).',
    tr: 'Bazı alanlar düzeltilmeli: {count} alan kabul edilmedi.',
  },

  // ── Request framing ───────────────────────────────────────────────────
  'request.app_context_header_required': {
    en: 'The X-App-Context header is required.',
    fr: "L'en-tête X-App-Context est requis.",
    tr: 'X-App-Context başlığı zorunlu.',
  },
  'request.app_context_mismatch': {
    en: 'This session belongs to a different app. Please sign in from the right app.',
    fr: 'Cette session appartient à une autre application. Veuillez vous connecter depuis la bonne application.',
    tr: 'Bu oturum başka bir uygulamaya ait. Lütfen doğru uygulamadan giriş yapın.',
  },
  'request.idempotency_key_required': {
    en: 'The X-Idempotency-Key header is required for this request.',
    fr: "L'en-tête X-Idempotency-Key est requis pour cette requête.",
    tr: 'Bu istek için X-Idempotency-Key başlığı zorunlu.',
  },
  'request.idempotency_key_reuse': {
    en: 'This X-Idempotency-Key was already used with a different request body.',
    fr: 'Cette X-Idempotency-Key a déjà été utilisée avec un contenu différent.',
    tr: 'Bu X-Idempotency-Key farklı bir istek gövdesiyle zaten kullanıldı.',
  },
  'request.invalid_cursor': {
    en: 'That page link is no longer valid. Please reload the list.',
    fr: 'Ce lien de page n’est plus valide. Veuillez recharger la liste.',
    tr: 'Bu sayfa bağlantısı artık geçerli değil. Lütfen listeyi yeniden yükleyin.',
  },

  // ── Auth ──────────────────────────────────────────────────────────────
  'auth.required': {
    en: 'Please sign in to continue.',
    fr: 'Veuillez vous connecter pour continuer.',
    tr: 'Devam etmek için giriş yapın.',
  },
  'auth.access_token_missing': {
    en: 'Please sign in to continue.',
    fr: 'Veuillez vous connecter pour continuer.',
    tr: 'Devam etmek için giriş yapın.',
  },
  'auth.access_token_invalid': {
    en: 'Your session has expired. Please sign in again.',
    fr: 'Votre session a expiré. Veuillez vous reconnecter.',
    tr: 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.',
  },
  'auth.session_invalid': {
    en: 'Your session is no longer valid. Please sign in again.',
    fr: "Votre session n'est plus valide. Veuillez vous reconnecter.",
    tr: 'Oturumunuz artık geçerli değil. Lütfen tekrar giriş yapın.',
  },
  'auth.session_terminated': {
    en: 'This session was ended. Please sign in again.',
    fr: 'Cette session a été fermée. Veuillez vous reconnecter.',
    tr: 'Bu oturum sonlandırıldı. Lütfen tekrar giriş yapın.',
  },
  'auth.id_token_required': {
    en: 'A sign-in token from Apple or Google is required.',
    fr: 'Un jeton de connexion Apple ou Google est requis.',
    tr: 'Apple veya Google giriş jetonu zorunlu.',
  },
  'auth.use_otp_endpoints': {
    en: 'Phone sign-in uses the code request and verify steps.',
    fr: 'La connexion par téléphone passe par la demande puis la vérification du code.',
    tr: 'Telefonla giriş, kod isteme ve doğrulama adımlarından geçer.',
  },
  'auth.email_password_hcp_only': {
    en: 'Email and password sign-in is only available in the clinician app.',
    fr: "La connexion par courriel et mot de passe n'est disponible que dans l'application clinicienne.",
    tr: 'E-posta ve şifre ile giriş yalnız klinisyen uygulamasında kullanılabilir.',
  },
  'auth.email_password_required': {
    en: 'Email and password are both required.',
    fr: 'Le courriel et le mot de passe sont tous deux requis.',
    tr: 'E-posta ve şifre zorunlu.',
  },
  'auth.email_already_registered': {
    en: 'An account already exists for this email. Try signing in instead.',
    fr: 'Un compte existe déjà pour ce courriel. Essayez plutôt de vous connecter.',
    tr: 'Bu e-posta ile bir hesap zaten var. Bunun yerine giriş yapmayı deneyin.',
  },
  'auth.invalid_credentials': {
    en: 'That email and password combination did not match.',
    fr: 'Ce courriel et ce mot de passe ne correspondent pas.',
    tr: 'E-posta veya şifre hatalı.',
  },
  'auth.code_invalid': {
    en: 'That code is not correct.',
    fr: "Ce code n'est pas correct.",
    tr: 'Kod hatalı.',
  },
  'auth.code_invalid_or_expired': {
    en: 'That code is incorrect or has expired. Request a new one.',
    fr: 'Ce code est incorrect ou a expiré. Demandez-en un nouveau.',
    tr: 'Kod hatalı veya süresi dolmuş. Yeni bir kod isteyin.',
  },
  'auth.totp_enroll_first': {
    en: 'Start authenticator setup before confirming a code.',
    fr: "Commencez la configuration de l'authentificateur avant de confirmer un code.",
    tr: 'Kod doğrulamadan önce kimlik doğrulayıcı kurulumunu başlatın.',
  },
  'auth.mfa_token_invalid': {
    en: 'This verification step expired. Please sign in again.',
    fr: 'Cette étape de vérification a expiré. Veuillez vous reconnecter.',
    tr: 'Bu doğrulama adımının süresi doldu. Lütfen tekrar giriş yapın.',
  },
  'auth.refresh_token_invalid': {
    en: 'Your session could not be renewed. Please sign in again.',
    fr: "Votre session n'a pas pu être renouvelée. Veuillez vous reconnecter.",
    tr: 'Oturumunuz yenilenemedi. Lütfen tekrar giriş yapın.',
  },
  'auth.refresh_token_replayed': {
    en: 'For your security this session was ended, because an old sign-in token was reused. Please sign in again.',
    fr: "Par sécurité, cette session a été fermée : un ancien jeton de connexion a été réutilisé. Veuillez vous reconnecter.",
    tr: 'Güvenliğiniz için bu oturum sonlandırıldı; eski bir giriş jetonu yeniden kullanıldı. Lütfen tekrar giriş yapın.',
  },
  'auth.otp_too_many_requests': {
    en: 'Too many code requests. Please try again later.',
    fr: 'Trop de demandes de code. Veuillez réessayer plus tard.',
    tr: 'Çok fazla kod isteği. Lütfen daha sonra tekrar deneyin.',
  },
  'auth.otp_too_many_attempts': {
    en: 'Too many incorrect attempts. Please try again in {minutes} minutes.',
    fr: 'Trop de tentatives incorrectes. Veuillez réessayer dans {minutes} minutes.',
    tr: 'Çok fazla hatalı deneme. {minutes} dakika sonra tekrar deneyin.',
  },

  // ── Emergency contacts ────────────────────────────────────────────────
  'ec.max_contacts': {
    en: 'You can have at most {max} emergency contacts.',
    fr: "Vous pouvez avoir au maximum {max} contacts d'urgence.",
    tr: 'En fazla {max} acil kişi ekleyebilirsiniz.',
  },
  'ec.phone_already_present': {
    en: 'This phone number is already one of your emergency contacts.',
    fr: "Ce numéro figure déjà parmi vos contacts d'urgence.",
    tr: 'Bu telefon numarası zaten acil kişi listenizde.',
  },
  'ec.reorder_mismatch': {
    en: 'The new order must list exactly your current emergency contacts.',
    fr: "Le nouvel ordre doit contenir exactement vos contacts d'urgence actuels.",
    tr: 'Yeni sıralama, mevcut acil kişilerinizin tamamını ve yalnız onları içermeli.',
  },
  'ec.verify_too_many_requests': {
    en: 'Too many code requests for this contact. Please try again later.',
    fr: 'Trop de demandes de code pour ce contact. Veuillez réessayer plus tard.',
    tr: 'Bu kişi için çok fazla kod isteği. Lütfen daha sonra tekrar deneyin.',
  },

  // ── Links (family + caregiver) ────────────────────────────────────────
  'link.code_invalid_or_expired': {
    en: 'That code is incorrect or has expired. Ask for a new one.',
    fr: 'Ce code est incorrect ou a expiré. Demandez-en un nouveau.',
    tr: 'Kod hatalı veya süresi dolmuş. Yeni bir kod isteyin.',
  },
  'link.too_many_attempts': {
    en: 'Too many incorrect attempts. Please try again in {minutes} minutes.',
    fr: 'Trop de tentatives incorrectes. Veuillez réessayer dans {minutes} minutes.',
    tr: 'Çok fazla hatalı deneme. {minutes} dakika sonra tekrar deneyin.',
  },
  'link.caregiver_already_linked': {
    en: 'You are already connected to this person.',
    fr: 'Vous êtes déjà connecté à cette personne.',
    tr: 'Bu kişiyle zaten bağlısınız.',
  },
  'link.caregiver_approval_pending': {
    en: 'A request for this change is already waiting for family approval.',
    fr: "Une demande pour ce changement attend déjà l'approbation de la famille.",
    tr: 'Bu değişiklik için zaten aile onayı bekleyen bir talep var.',
  },
  'link.family_relationship_required': {
    en: 'Please say how you are related.',
    fr: 'Veuillez indiquer votre lien de parenté.',
    tr: 'Yakınlık derecenizi belirtin.',
  },
  'link.family_already_linked': {
    en: 'You already have a connection with this person.',
    fr: 'Vous avez déjà une connexion avec cette personne.',
    tr: 'Bu kişiyle zaten bir bağlantınız var.',
  },
  'link.invite_no_longer_valid': {
    en: 'This invitation is no longer valid.',
    fr: "Cette invitation n'est plus valide.",
    tr: 'Bu davet artık geçerli değil.',
  },
  'link.confirm_patient_only': {
    en: 'Only the person being cared for can confirm this connection.',
    fr: 'Seule la personne accompagnée peut confirmer cette connexion.',
    tr: 'Bu bağlantıyı yalnız bakım alan kişi onaylayabilir.',
  },
  'link.already_decided': {
    en: 'This connection has already been confirmed or cancelled.',
    fr: 'Cette connexion a déjà été confirmée ou annulée.',
    tr: 'Bu bağlantı zaten onaylanmış veya iptal edilmiş.',
  },

  // ── Approvals ─────────────────────────────────────────────────────────
  'approval.config_patient_only': {
    en: 'Only the person being cared for can change their approval settings.',
    fr: 'Seule la personne accompagnée peut modifier ses paramètres d’approbation.',
    tr: 'Onay ayarlarını yalnız bakım alan kişi değiştirebilir.',
  },
  'approval.config_view_patient_only': {
    en: 'Only the person being cared for can view their approval settings.',
    fr: 'Seule la personne accompagnée peut consulter ses paramètres d’approbation.',
    tr: 'Onay ayarlarını yalnız bakım alan kişi görüntüleyebilir.',
  },
  'approval.cannot_approve_own': {
    en: 'You cannot approve a request you made yourself.',
    fr: 'Vous ne pouvez pas approuver une demande que vous avez faite.',
    tr: 'Kendi yaptığınız talebi onaylayamazsınız.',
  },
  'approval.already_decided': {
    en: 'This request has already been decided.',
    fr: 'Cette demande a déjà été traitée.',
    tr: 'Bu talep zaten karara bağlanmış.',
  },
  'approval.expired': {
    en: 'This request expired before it was decided.',
    fr: "Cette demande a expiré avant d'être traitée.",
    tr: 'Bu talebin süresi karara bağlanmadan doldu.',
  },
  'approval.decider_must_be_active_family': {
    en: 'Only an active family member of this person can decide this request.',
    fr: 'Seul un membre actif de la famille de cette personne peut traiter cette demande.',
    tr: 'Bu talebi yalnız kişinin aktif aile üyesi karara bağlayabilir.',
  },

  // ── Consent ───────────────────────────────────────────────────────────
  'consent.family_grant_system_only': {
    en: 'Family access grants are created by the system when a connection is made, not directly.',
    fr: "Les autorisations d'accès familial sont créées par le système lors de la connexion, non directement.",
    tr: 'Aile erişim yetkileri bağlantı kurulurken sistem tarafından oluşturulur, doğrudan verilmez.',
  },
  'consent.grant_already_revoked': {
    en: 'This access has already been revoked.',
    fr: 'Cet accès a déjà été révoqué.',
    tr: 'Bu erişim zaten iptal edilmiş.',
  },
  'consent.sdm_clinician_only': {
    en: 'A substitute decision-maker declaration can only be recorded by a clinician or nurse.',
    fr: 'Une déclaration de mandataire spécial ne peut être enregistrée que par un clinicien ou une infirmière.',
    tr: 'Vekil karar verici beyanı yalnız klinisyen veya hemşire tarafından kaydedilebilir.',
  },
  'consent.sdm_duplicate': {
    en: 'A declaration already exists for this person and decision-maker.',
    fr: 'Une déclaration existe déjà pour cette personne et ce mandataire.',
    tr: 'Bu kişi ve vekil için zaten bir beyan var.',
  },
  'consent.patient_or_sdm_only': {
    en: 'Only the person being cared for, or their active substitute decision-maker, can do this.',
    fr: 'Seule la personne accompagnée, ou son mandataire spécial actif, peut effectuer cette action.',
    tr: 'Bu işlemi yalnız bakım alan kişi veya aktif vekil karar vericisi yapabilir.',
  },
} as const satisfies Record<string, Messages>;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

export function isErrorMessageKey(key: string): key is ErrorMessageKey {
  return Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, key);
}

/**
 * Resolves a message key to text in `locale`, substituting `{name}`
 * placeholders from `params`.
 *
 * An unknown placeholder is left as-is rather than replaced with "undefined":
 * a visible `{minutes}` in a message is an obvious bug report, whereas
 * "try again in undefined minutes" reads like a product that is simply broken.
 */
export function translateError(
  key: ErrorMessageKey,
  locale: Locale = DEFAULT_LOCALE,
  params?: Record<string, string | number>,
): string {
  const template = ERROR_MESSAGES[key][locale] ?? ERROR_MESSAGES[key][DEFAULT_LOCALE];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}
