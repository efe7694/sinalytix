/**
 * Health condition catalog — from Onboarding PRD.
 *
 * Hardcoded enum in V0. May move to CMS in V1.
 * IDs must match Python ConditionCode enum exactly.
 */

export interface ConditionOption {
  id: string;
  labelKey: string; // i18n key
  labelTr: string; // Turkish fallback
  labelEn: string; // English fallback
}

export const CONDITION_CATALOG: ConditionOption[] = [
  { id: 'dementia', labelKey: 'condition.dementia', labelTr: 'Demans', labelEn: 'Dementia' },
  {
    id: 'alzheimer',
    labelKey: 'condition.alzheimer',
    labelTr: 'Alzheimer',
    labelEn: "Alzheimer's",
  },
  { id: 'parkinson', labelKey: 'condition.parkinson', labelTr: 'Parkinson', labelEn: "Parkinson's" },
  {
    id: 'ms',
    labelKey: 'condition.ms',
    labelTr: 'Multipl Skleroz (MS)',
    labelEn: 'Multiple Sclerosis (MS)',
  },
  {
    id: 'stroke',
    labelKey: 'condition.stroke',
    labelTr: 'İnme / Felç',
    labelEn: 'Stroke',
  },
  {
    id: 'chf',
    labelKey: 'condition.chf',
    labelTr: 'Kalp Yetmezliği',
    labelEn: 'Congestive Heart Failure',
  },
  {
    id: 'cad',
    labelKey: 'condition.cad',
    labelTr: 'Koroner Arter Hastalığı',
    labelEn: 'Coronary Artery Disease',
  },
  {
    id: 'hypertension',
    labelKey: 'condition.hypertension',
    labelTr: 'Hipertansiyon',
    labelEn: 'Hypertension',
  },
  {
    id: 'diabetes_t1',
    labelKey: 'condition.diabetes_t1',
    labelTr: 'Tip 1 Diyabet',
    labelEn: 'Type 1 Diabetes',
  },
  {
    id: 'diabetes_t2',
    labelKey: 'condition.diabetes_t2',
    labelTr: 'Tip 2 Diyabet',
    labelEn: 'Type 2 Diabetes',
  },
  {
    id: 'copd_asthma',
    labelKey: 'condition.copd_asthma',
    labelTr: 'KOAH / Astım',
    labelEn: 'COPD / Asthma',
  },
  {
    id: 'ckd',
    labelKey: 'condition.ckd',
    labelTr: 'Kronik Böbrek Hastalığı',
    labelEn: 'Chronic Kidney Disease',
  },
  {
    id: 'cancer_oncology',
    labelKey: 'condition.cancer',
    labelTr: 'Kanser / Onkolojik Takip',
    labelEn: 'Cancer / Oncology',
  },
  {
    id: 'ortho_postop',
    labelKey: 'condition.ortho',
    labelTr: 'Ortopedik / Ameliyat Sonrası',
    labelEn: 'Orthopedic / Post-Surgery',
  },
  {
    id: 'palliative',
    labelKey: 'condition.palliative',
    labelTr: 'Palyatif Bakım',
    labelEn: 'Palliative Care',
  },
  { id: 'other', labelKey: 'condition.other', labelTr: 'Diğer', labelEn: 'Other' },
  {
    id: 'unknown',
    labelKey: 'condition.unknown',
    labelTr: 'Bilmiyorum / Seçmek İstemiyorum',
    labelEn: "I Don't Know / Prefer Not to Say",
  },
];

/**
 * "unknown" is always pinned at the bottom of the list
 * and rendered with a different visual style.
 */
export const UNKNOWN_CONDITION_ID = 'unknown';
