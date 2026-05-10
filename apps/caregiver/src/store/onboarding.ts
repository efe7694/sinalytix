/**
 * Caregiver onboarding local draft store.
 *
 * All data is kept in memory (and optionally SecureStore) until auth succeeds.
 * After auth, the draft is transferred to the backend and cleared.
 * No PHI or PII is sent to the server before authentication.
 */
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export type OnboardingStep =
  | 'intro'
  | 'language'
  | 'consent'
  | 'profile'
  | 'auth_method'
  | 'auth'
  | 'done';

interface ConsentDraft {
  accept_tos: boolean;
  accept_privacy: boolean;
  ack_not_emergency: boolean;
  ack_no_clinical_decision: boolean;
  consented_at: string | null;
}

interface OnboardingDraft {
  step_progress: OnboardingStep;
  language: string;
  consent: ConsentDraft;
  profile: {
    first_name: string;
    last_name: string;
  };
}

const DRAFT_KEY = 'caregiver_onboarding_draft';

const defaultDraft: OnboardingDraft = {
  step_progress: 'intro',
  language: 'en',
  consent: {
    accept_tos: false,
    accept_privacy: false,
    ack_not_emergency: false,
    ack_no_clinical_decision: false,
    consented_at: null,
  },
  profile: { first_name: '', last_name: '' },
};

interface OnboardingState {
  draft: OnboardingDraft;
  setLanguage: (lang: string) => void;
  setConsent: (consent: Partial<ConsentDraft>) => void;
  setProfile: (profile: Partial<OnboardingDraft['profile']>) => void;
  setStep: (step: OnboardingStep) => void;
  loadDraft: () => Promise<void>;
  saveDraft: () => Promise<void>;
  clearDraft: () => Promise<void>;
  isConsentComplete: () => boolean;
  isProfileComplete: () => boolean;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  draft: defaultDraft,

  setLanguage: (language) => {
    set((s) => ({ draft: { ...s.draft, language } }));
    get().saveDraft();
  },

  setConsent: (partial) => {
    set((s) => ({
      draft: {
        ...s.draft,
        consent: { ...s.draft.consent, ...partial },
      },
    }));
    get().saveDraft();
  },

  setProfile: (partial) => {
    set((s) => ({
      draft: {
        ...s.draft,
        profile: { ...s.draft.profile, ...partial },
      },
    }));
    get().saveDraft();
  },

  setStep: (step) => {
    set((s) => ({ draft: { ...s.draft, step_progress: step } }));
    get().saveDraft();
  },

  loadDraft: async () => {
    try {
      const raw = await SecureStore.getItemAsync(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<OnboardingDraft>;
        set((s) => ({ draft: { ...s.draft, ...saved } }));
      }
    } catch {
      // draft corrupt or missing — start fresh
    }
  },

  saveDraft: async () => {
    try {
      await SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify(get().draft));
    } catch {
      // non-fatal
    }
  },

  clearDraft: async () => {
    await SecureStore.deleteItemAsync(DRAFT_KEY);
    set({ draft: defaultDraft });
  },

  isConsentComplete: () => {
    const c = get().draft.consent;
    return c.accept_tos && c.accept_privacy && c.ack_not_emergency && c.ack_no_clinical_decision;
  },

  isProfileComplete: () => {
    const p = get().draft.profile;
    return p.first_name.length >= 2 && p.last_name.length >= 2;
  },
}));
