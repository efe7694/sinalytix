import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

const DRAFT_KEY = 'onboarding_draft';
const COMPLETED_KEY = 'onboarding_completed';

export type OnboardingStep =
  | 'intro'
  | 'language'
  | 'consent'
  | 'ec'
  | 'seed'
  | 'auth_method'
  | 'auth'
  | 'done';

/** Version of the ToS/Privacy text the consent screen currently renders.
 * Bumped together with that copy — `ConsentRecord.version` is what proves
 * WHICH document a user agreed to, so a stale constant here silently
 * misattributes their consent. */
export const TOS_VERSION = 'tos-2026-07';

export interface ConsentDraft {
  accept_tos: boolean;
  accept_privacy: boolean;
  ack_not_emergency: boolean;
  consented_at: string | null;
}

export interface EmergencyContactDraft {
  name: string;
  relationship: string;
  phone: string;
  verified: false;
}

export type AllergyFlag = 'yes' | 'no' | 'unknown';

export interface HealthSeedDraft {
  conditions: string[];
  allergy_flag: AllergyFlag | null;
  allergy_notes: string | null;
  source: 'self_declared';
}

export interface OnboardingDraft {
  step_progress: OnboardingStep;
  language: string | null;
  consent: ConsentDraft;
  emergency_contact: EmergencyContactDraft | null;
  health_seed: HealthSeedDraft | null;
}

interface OnboardingStore {
  draft: OnboardingDraft;
  isCompleted: boolean;
  setStep: (step: OnboardingStep) => void;
  setLanguage: (lang: string) => void;
  setConsent: (fields: Partial<ConsentDraft>) => void;
  setEmergencyContact: (ec: EmergencyContactDraft) => void;
  setHealthSeed: (seed: Partial<HealthSeedDraft>) => void;
  markCompleted: () => void;
  clearDraft: () => void;
}

const secureStorage = createJSONStorage(() => ({
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}));

const defaultDraft: OnboardingDraft = {
  step_progress: 'intro',
  language: null,
  consent: {
    accept_tos: false,
    accept_privacy: false,
    ack_not_emergency: false,
    consented_at: null,
  },
  emergency_contact: null,
  health_seed: null,
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      draft: defaultDraft,
      isCompleted: false,

      setStep: (step) =>
        set((s) => ({ draft: { ...s.draft, step_progress: step } })),

      setLanguage: (lang) =>
        set((s) => ({ draft: { ...s.draft, language: lang } })),

      setConsent: (fields) =>
        set((s) => ({
          draft: {
            ...s.draft,
            consent: { ...s.draft.consent, ...fields },
          },
        })),

      setEmergencyContact: (ec) =>
        set((s) => ({ draft: { ...s.draft, emergency_contact: ec } })),

      setHealthSeed: (seed) =>
        set((s) => ({
          draft: {
            ...s.draft,
            health_seed: {
              conditions: [],
              allergy_flag: null,
              allergy_notes: null,
              source: 'self_declared',
              ...s.draft.health_seed,
              ...seed,
            },
          },
        })),

      markCompleted: () => set({ isCompleted: true }),

      clearDraft: () => set({ draft: defaultDraft }),
    }),
    {
      name: DRAFT_KEY,
      storage: secureStorage,
    }
  )
);

export async function checkOnboardingCompleted(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(COMPLETED_KEY);
  return val === 'true';
}

export async function persistOnboardingCompleted(): Promise<void> {
  await SecureStore.setItemAsync(COMPLETED_KEY, 'true');
}
