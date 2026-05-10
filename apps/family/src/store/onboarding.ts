import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export type OnboardingStep =
  | 'intro'
  | 'language'
  | 'consent'
  | 'profile'
  | 'auth_method'
  | 'auth'
  | 'connect'
  | 'done';

export type Relationship = 'spouse' | 'child' | 'sibling' | 'parent' | 'other';

export interface OnboardingDraft {
  step_progress: OnboardingStep;
  language: string;
  consent: {
    accept_tos: boolean;
    accept_privacy: boolean;
    ack_not_emergency: boolean;
    consented_at: string | null;
  };
  profile: {
    first_name: string;
    last_name: string;
    relationship: Relationship | null;
  };
  pending_patient_id: string | null;
}

const DRAFT_KEY = 'family_onboarding_draft';

const DEFAULT_DRAFT: OnboardingDraft = {
  step_progress: 'intro',
  language: 'tr',
  consent: {
    accept_tos: false,
    accept_privacy: false,
    ack_not_emergency: false,
    consented_at: null,
  },
  profile: {
    first_name: '',
    last_name: '',
    relationship: null,
  },
  pending_patient_id: null,
};

interface OnboardingState {
  draft: OnboardingDraft;
  isLoaded: boolean;

  loadDraft: () => Promise<void>;
  setStep: (step: OnboardingStep) => Promise<void>;
  setLanguage: (lang: string) => Promise<void>;
  setConsent: (consent: OnboardingDraft['consent']) => Promise<void>;
  setProfile: (profile: OnboardingDraft['profile']) => Promise<void>;
  setPendingPatientId: (id: string | null) => Promise<void>;
  clearDraft: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  draft: DEFAULT_DRAFT,
  isLoaded: false,

  loadDraft: async () => {
    try {
      const raw = await SecureStore.getItemAsync(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as OnboardingDraft;
        set({ draft, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  setStep: async (step) => {
    const draft = { ...get().draft, step_progress: step };
    set({ draft });
    await SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify(draft));
  },

  setLanguage: async (language) => {
    const draft = { ...get().draft, language };
    set({ draft });
    await SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify(draft));
  },

  setConsent: async (consent) => {
    const draft = { ...get().draft, consent };
    set({ draft });
    await SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify(draft));
  },

  setProfile: async (profile) => {
    const draft = { ...get().draft, profile };
    set({ draft });
    await SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify(draft));
  },

  setPendingPatientId: async (id) => {
    const draft = { ...get().draft, pending_patient_id: id };
    set({ draft });
    await SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify(draft));
  },

  clearDraft: async () => {
    await SecureStore.deleteItemAsync(DRAFT_KEY);
    set({ draft: DEFAULT_DRAFT });
  },
}));
