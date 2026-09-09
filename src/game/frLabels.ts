/** IEC 62443-3-3 Foundational Requirements — norske korttitler til merkelapper. */
export const FR_NAMES: Record<string, string> = {
  FR1: "Identification & Authentication Control",
  FR2: "Use Control",
  FR3: "System Integrity",
  FR4: "Data Confidentiality",
  FR5: "Restricted Data Flow",
  FR6: "Timely Response to Events",
  FR7: "Resource Availability",
};

export const CATEGORY_LABELS: Record<string, string> = {
  segmentation: "Segmentering",
  access: "Tilgang",
  detection: "Deteksjon",
  integrity: "Integritet",
  physical: "Fysisk",
};
