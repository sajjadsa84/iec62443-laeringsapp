/**
 * Delt fargepalett for selve spillbrettet (lyst, Siemens-inspirert) — skilt fra
 * appens mørke ramme rundt brettet og fra CATEGORY_COLORS (som fortsatt styrer
 * komponentenes egen identitetsfarge). Brukt både i Pixi (0x-tall) og HTML/CSS (hex).
 */
export const BOARD_THEME_HEX = {
  conduit: "#4A9B5E",
  packet: "#6FD68A",
  threat: "#D64545",
  alert: "#E8A33D",
  nodeSurface: "#FFFFFF",
  nodeBorder: "#5B7A8C",
  textDark: "#2C3E4A",
  textMuted: "#6B8494",
} as const;

export const BOARD_THEME_PIXI = {
  conduit: 0x4a9b5e,
  packet: 0x6fd68a,
  threat: 0xd64545,
  alert: 0xe8a33d,
  nodeSurface: 0xffffff,
  nodeBorder: 0x5b7a8c,
  textDark: 0x2c3e4a,
  textMuted: 0x6b8494,
} as const;
