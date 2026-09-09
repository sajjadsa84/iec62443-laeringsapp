import type { ComponentCategory } from "./types";

/** Samme fargekoding brukt både i React-UI (hex) og på selve Pixi-brettet (0x-tall). */
export const CATEGORY_COLORS_HEX: Record<ComponentCategory, string> = {
  segmentation: "#2FE8B0",
  access: "#18A6E0",
  detection: "#6B6FE0",
  integrity: "#6EE7B7",
  physical: "#94A3C4",
};

export const CATEGORY_COLORS_PIXI: Record<ComponentCategory, number> = {
  segmentation: 0x2fe8b0,
  access: 0x18a6e0,
  detection: 0x6b6fe0,
  integrity: 0x6ee7b7,
  physical: 0x94a3c4,
};
