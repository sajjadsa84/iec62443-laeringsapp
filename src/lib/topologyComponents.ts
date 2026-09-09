export type ComponentKind = "zone" | "protection" | "device";

export interface PaletteItem {
  type: string;
  label: string;
  kind: ComponentKind;
  level?: number;
  icon: string;
}

export interface PaletteGroup {
  category: string;
  items: PaletteItem[];
}

/**
 * Nivåhierarki for soner, samme prinsipp som Purdue-modellen i modul 0
 * (høyere tall = nærmere kontor/enterprise, lavere tall = nærmere prosessen).
 */
export const ZONE_LEVELS: Record<string, number> = {
  "enterprise-zone": 4,
  "dmz-zone": 3,
  "production-zone": 2,
  "cell-zone": 1,
};

export const PALETTE: PaletteGroup[] = [
  {
    category: "Soner",
    items: [
      { type: "enterprise-zone", label: "Enterprise-sone", kind: "zone", level: ZONE_LEVELS["enterprise-zone"], icon: "🏢" },
      { type: "dmz-zone", label: "DMZ", kind: "zone", level: ZONE_LEVELS["dmz-zone"], icon: "🛡️" },
      { type: "production-zone", label: "Produksjonssone", kind: "zone", level: ZONE_LEVELS["production-zone"], icon: "🏭" },
      { type: "cell-zone", label: "Cellesone", kind: "zone", level: ZONE_LEVELS["cell-zone"], icon: "⚙️" },
    ],
  },
  {
    category: "Beskyttelse",
    items: [
      { type: "firewall", label: "Industriell brannmur", kind: "protection", icon: "🔥" },
      { type: "ids-ips", label: "IDS/IPS-sensor", kind: "protection", icon: "🔎" },
      { type: "jump-host", label: "Jump host", kind: "protection", icon: "🖥️" },
      { type: "vpn-gateway", label: "VPN-gateway", kind: "protection", icon: "🔒" },
      { type: "data-diode", label: "Data-diode (unidireksjonell gateway)", kind: "protection", icon: "➡️" },
      { type: "managed-switch", label: "Administrert svitsj (VLAN)", kind: "protection", icon: "🔀" },
    ],
  },
  {
    category: "Enheter",
    items: [
      { type: "plc", label: "PLC", kind: "device", icon: "🔧" },
      { type: "hmi", label: "HMI", kind: "device", icon: "🖵" },
      { type: "historian", label: "Historian", kind: "device", icon: "🗄️" },
      { type: "engineering-workstation", label: "Engineering workstation", kind: "device", icon: "💻" },
      { type: "rtu-scada", label: "RTU/SCADA-server", kind: "device", icon: "📡" },
    ],
  },
];

export const PALETTE_BY_TYPE: Record<string, PaletteItem> = Object.fromEntries(
  PALETTE.flatMap((group) => group.items).map((item) => [item.type, item]),
);

/**
 * Beskyttelsestyper som teller når vi sjekker om en låst/brownfield-node
 * har vern i nærheten.
 */
export const LOCKED_NODE_PROTECTION_TYPES = ["firewall", "ids-ips", "data-diode"];
