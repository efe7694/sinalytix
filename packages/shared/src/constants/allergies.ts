/**
 * Allergy catalog — mirrors Python AllergyCode enum.
 * Hardcoded V0; may move to CMS in V1.
 */

export interface AllergyOption {
  id: string;
  labelTr: string;
  labelEn: string;
}

export const ALLERGY_CATALOG: AllergyOption[] = [
  { id: 'penicillin', labelTr: 'Penisilin', labelEn: 'Penicillin' },
  { id: 'sulfa', labelTr: 'Sülfa Antibiyotikleri', labelEn: 'Sulfa Antibiotics' },
  { id: 'aspirin', labelTr: 'Aspirin / NSAID', labelEn: 'Aspirin / NSAIDs' },
  { id: 'latex', labelTr: 'Lateks', labelEn: 'Latex' },
  { id: 'peanut', labelTr: 'Yer Fıstığı', labelEn: 'Peanut' },
  { id: 'tree_nut', labelTr: 'Ağaç Kuruyemişleri', labelEn: 'Tree Nuts' },
  { id: 'shellfish', labelTr: 'Kabuklu Deniz Ürünleri', labelEn: 'Shellfish' },
  { id: 'fish', labelTr: 'Balık', labelEn: 'Fish' },
  { id: 'milk', labelTr: 'Süt / Laktoz', labelEn: 'Milk / Lactose' },
  { id: 'egg', labelTr: 'Yumurta', labelEn: 'Egg' },
  { id: 'wheat_gluten', labelTr: 'Buğday / Glüten', labelEn: 'Wheat / Gluten' },
  { id: 'bee_sting', labelTr: 'Arı Sokması', labelEn: 'Bee Sting' },
  { id: 'contrast_dye', labelTr: 'Radyoloji Kontrast Madde', labelEn: 'Contrast Dye' },
  { id: 'other', labelTr: 'Diğer', labelEn: 'Other' },
];
