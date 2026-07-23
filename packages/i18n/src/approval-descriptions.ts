/**
 * Human-readable approval-queue descriptions — EN / FR / TR.
 *
 * The API returns a rendered `description` on each `ApprovalRequest` so the
 * three apps don't each reimplement the action_type → sentence mapper
 * (DEVIATIONS D14). That was right, but the sentences were Turkish literals
 * in the service, so a French family member reading "who is asking to change
 * what" got Turkish — on the one screen where misunderstanding has a real
 * cost (approving a change to who the SOS chain dials).
 */

import type { Locale } from './locale';
import { DEFAULT_LOCALE } from './locale';

const APPROVAL_DESCRIPTIONS = {
  caregiver_link_change: {
    en: '{name} wants to end the caregiver connection.',
    fr: '{name} souhaite mettre fin à la connexion avec le soignant.',
    tr: '{name} bakıcı bağlantısını sonlandırmak istiyor.',
  },
  ec_change: {
    en: '{name} wants to change an emergency contact.',
    fr: "{name} souhaite modifier un contact d'urgence.",
    tr: '{name} bir acil kişiyi değiştirmek istiyor.',
  },
  profile_edit: {
    en: '{name} wants to edit the profile.',
    fr: '{name} souhaite modifier le profil.',
    tr: '{name} profili düzenlemek istiyor.',
  },
  account_delete: {
    en: '{name} has requested account deletion.',
    fr: '{name} a demandé la suppression du compte.',
    tr: '{name} hesap silme talebinde bulundu.',
  },
  unknown: {
    en: 'An action is waiting for your approval.',
    fr: 'Une action attend votre approbation.',
    tr: 'Onay bekleyen bir işlem var.',
  },
} as const satisfies Record<string, Record<Locale, string>>;

export function describeApprovalAction(actionType: string, requesterName: string, locale: Locale = DEFAULT_LOCALE): string {
  const entry =
    (APPROVAL_DESCRIPTIONS as Record<string, Record<Locale, string> | undefined>)[actionType] ??
    APPROVAL_DESCRIPTIONS.unknown;
  return (entry[locale] ?? entry[DEFAULT_LOCALE]).replace('{name}', requesterName);
}
