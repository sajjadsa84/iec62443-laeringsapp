export interface ModuleMeta {
  moduleId: string;
  title: string;
}

/**
 * Rekkefølgen her styrer rekkefølgen i ProgressPath og hvilken modul
 * som låses opp av hvilken. Legg til nye moduler etter hvert som de lages.
 */
export const AVAILABLE_MODULES: ModuleMeta[] = [
  {
    moduleId: "module-0-overview",
    title: "Oversikt over IEC 62443",
  },
  {
    moduleId: "module-1c-network-architect",
    title: "Modul 1c: Nettverksarkitekt",
  },
  {
    moduleId: "module-3-audit-and-risk",
    title: "Modul 3: Revisjon og risikovurdering",
  },
  {
    moduleId: "module-7-incident-response",
    title: "Modul 7: Hendelsesrespons",
  },
];
