# Komponentkatalog — "Secure the Plant"

Alle komponenter er vendor-nøytrale og navngitt etter funksjon, ikke produkt.
Hver har tre oppgraderingsnivåer. Kostnader er utgangspunkt for balansering — juster i `balance.json`.

**FR-referanser (IEC 62443-3-3 Foundational Requirements):**
FR1 Identification & Authentication Control · FR2 Use Control · FR3 System Integrity · FR4 Data Confidentiality · FR5 Restricted Data Flow · FR6 Timely Response to Events · FR7 Resource Availability

---

## Kategori 1: Segmentering og flytkontroll (primært FR5)

### 1.1 Industriell brannmur
**Profiltekst:** Kontrollerer trafikk mellom to soner. Slipper bare gjennom det som er eksplisitt tillatt, og blokkerer resten. Grunnsteinen i sone/conduit-modellen.
**Primær FR:** FR5 · **Sekundær:** FR2
**Grunnkostnad:** 300

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Grunnregelsett | — | Blokkerer 60% av kjente angrepsforsøk |
| 2 | Finjustert regelsett | 250 | Blokkerer 80%. Reduserer falske positiver |
| 3 | OT-protokollinspeksjon (DPI) | 500 | Blokkerer 92%. Forstår industrielle protokoller og oppdager manipulerte kommandoer |

---

### 1.2 Administrert svitsj (VLAN-segmentering)
**Profiltekst:** Deler et flatt nettverk i logiske segmenter. Hindrer at en kompromittert enhet fritt kan nå alle andre på samme nettverk.
**Primær FR:** FR5 · **Sekundær:** FR1
**Grunnkostnad:** 150

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | VLAN-oppdeling | — | Bremser lateral bevegelse med 40% |
| 2 | Portsikkerhet | 200 | Bremser 65%. Blokkerer ukjente enheter som kobles til |
| 3 | 802.1X portautentisering | 400 | Bremser 85%. Kun autentiserte enheter får nettverkstilgang |

---

### 1.3 Data-diode (unidireksjonell gateway)
**Profiltekst:** Fysisk enveis dataoverføring. Data kan gå ut, men ingenting kan komme inn. Uslåelig i sin retning, men kan ikke brukes der toveis kommunikasjon kreves.
**Primær FR:** FR5 · **Sekundær:** FR3
**Grunnkostnad:** 900 (dyr)

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Enveis dataflyt | — | 100% blokkering innover. Kun på conduits merket "eksport" |
| 2 | Med protokollbrudd | 400 | Fjerner også innebygde protokollsårbarheter i datastrømmen |
| 3 | Med innholdsvalidering | 600 | Validerer at utgående data ikke lekker sensitiv informasjon |

---

### 1.4 Industriell DMZ
**Profiltekst:** Et mellomliggende nettverkslag mellom IT og OT. Ingen trafikk går direkte mellom kontornettet og produksjonen — alt må stoppe i DMZ-en først.
**Primær FR:** FR5
**Grunnkostnad:** 600

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Grunnleggende DMZ | — | Stopper 70% av lateral bevegelse fra IT til OT |
| 2 | Med replikerte tjenester | 450 | 85%. OT-data speiles i DMZ, ingen direkte OT-oppslag fra IT |
| 3 | Med brokerbasert dataflyt | 700 | 95%. All dataflyt går via mellomledd som validerer innhold |

---

## Kategori 2: Tilgang og identitet (primært FR1/FR2)

### 2.1 Jump host / bastion-vert
**Profiltekst:** Eneste inngangsport for administrativ tilgang inn i OT-nettverket. All fjerntilgang må gå via denne, som kan overvåkes og kontrolleres.
**Primær FR:** FR1 · **Sekundær:** FR2, FR6
**Grunnkostnad:** 400

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Sentralisert tilgangspunkt | — | Blokkerer 50% av angrep via stjålne kontoer |
| 2 | Med multifaktorautentisering | 350 | 85%. Stjålet passord alene er ikke nok |
| 3 | Med sesjonsopptak og godkjenning | 550 | 92%. All aktivitet logges; tilgang må godkjennes i sanntid |

---

### 2.2 VPN-gateway (fjerntilgang)
**Profiltekst:** Kryptert tunnel for leverandører og fjernarbeid. Beskytter trafikken i transitt, men er selv et angrepsmål hvis den ikke er herdet.
**Primær FR:** FR4 · **Sekundær:** FR1
**Grunnkostnad:** 350

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Kryptert tunnel | — | Beskytter mot avlytting. Selv sårbar for kontokompromittering |
| 2 | Med MFA og tidsbegrenset tilgang | 300 | Tilgang åpnes kun i avtalte vinduer |
| 3 | Zero-trust tilgang per ressurs | 600 | Leverandør når kun den ene maskinen de skal, ikke hele nettet |

---

### 2.3 Autentiseringsserver (sentral identitetshåndtering)
**Profiltekst:** Sentraliserer brukerkontoer og rettigheter. Uten dette har anlegget delte passord og kontoer som aldri deaktiveres.
**Primær FR:** FR1 · **Sekundær:** FR2
**Grunnkostnad:** 450

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Sentrale kontoer | — | Fjerner delte kontoer. Blokkerer 45% av innsider-/kontoangrep |
| 2 | Rollebasert tilgangskontroll | 350 | 70%. Hver rolle får kun nødvendige rettigheter |
| 3 | Privilegert tilgangsstyring (PAM) | 550 | 88%. Administratorrettigheter tildeles midlertidig ved behov |

---

## Kategori 3: Deteksjon og respons (primært FR6)

### 3.1 IDS/IPS-sensor
**Profiltekst:** Overvåker nettverkstrafikk og varsler om mistenkelig aktivitet. Stopper ikke nødvendigvis angrepet selv, men gir deg sjansen til å reagere i tide.
**Primær FR:** FR6 · **Sekundær:** FR3
**Grunnkostnad:** 200

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Signaturbasert deteksjon | — | Oppdager 60% av kjente angrep. Blind for nye varianter |
| 2 | Anomalibasert deteksjon | 400 | 80%. Lærer normal trafikk og reagerer på avvik |
| 3 | Aktiv blokkering (IPS-modus) | 500 | 88% og stopper angrepet automatisk i stedet for bare å varsle |

---

### 3.2 Loggsamler / SIEM
**Profiltekst:** Samler logger fra hele anlegget på ett sted og korrelerer hendelser. Gjør at man ser mønsteret i angrep som ellers ser ut som enkeltstående småfeil.
**Primær FR:** FR6
**Grunnkostnad:** 350

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Sentral logginnsamling | — | Halverer tiden det tar å oppdage et pågående angrep |
| 2 | Med korrelasjonsregler | 400 | Oppdager sammensatte angrep som går over flere systemer |
| 3 | Med automatisert respons | 650 | Iverksetter forhåndsdefinerte tiltak umiddelbart ved deteksjon |

---

### 3.3 Endepunktsbeskyttelse / applikasjonshvitliste
**Profiltekst:** Hindrer at ukjent programvare kjører på ingeniørstasjoner og HMI-er. På OT-utstyr er hvitlisting ofte bedre enn tradisjonell antivirus.
**Primær FR:** FR3 · **Sekundær:** FR6
**Grunnkostnad:** 250

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Antivirus/antimalware | — | Blokkerer 55% av skadevare |
| 2 | Applikasjonshvitliste | 350 | 82%. Kun godkjent programvare kan kjøre |
| 3 | Med integritetsovervåking | 450 | 90%. Varsler ved uautoriserte endringer i systemfiler |

---

## Kategori 4: Integritet og robusthet (primært FR3/FR7)

### 4.1 Patch-/oppdateringsserver
**Profiltekst:** Distribuerer sikkerhetsoppdateringer kontrollert til OT-utstyr. I OT kan man ikke bare oppdatere automatisk — det må testes og planlegges.
**Primær FR:** FR3
**Grunnkostnad:** 300

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Manuell distribusjon | — | Reduserer sårbarhetsvinduet med 30% |
| 2 | Med teststadium | 350 | 60%. Oppdateringer verifiseres før produksjonssetting |
| 3 | Med sårbarhetsskanning | 500 | 80%. Identifiserer hva som faktisk må prioriteres |

---

### 4.2 Sikkerhetskopiering og gjenoppretting
**Profiltekst:** Stopper ikke angrep, men avgjør hvor lenge anlegget står stille etterpå. Mot løsepengevirus er dette ofte det som redder produksjonen.
**Primær FR:** FR7
**Grunnkostnad:** 300

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Regelmessig sikkerhetskopi | — | Halverer nedetid etter vellykket angrep |
| 2 | Frakoblet/uforanderlig kopi | 400 | Kopien kan ikke krypteres av angriperen |
| 3 | Testet gjenopprettingsplan | 450 | Nedetiden reduseres til et minimum — planen er faktisk øvd på |

---

### 4.3 PKI / sertifikathåndtering (TLS på conduits)
**Profiltekst:** Krypterer og autentiserer kommunikasjon mellom komponenter. Hindrer avlytting og at noen utgir seg for å være en legitim enhet.
**Primær FR:** FR4 · **Sekundær:** FR1, FR3
**Grunnkostnad:** 400

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | TLS-kryptering | — | Blokkerer avlytting på conduits |
| 2 | Gjensidig autentisering (mTLS) | 400 | Begge sider må bevise identitet — stopper falske enheter |
| 3 | Automatisert sertifikatrullering | 350 | Fjerner risikoen ved utløpte/kompromitterte sertifikater |

---

### 4.4 Redundant styring / failover
**Profiltekst:** Reserveenhet som overtar hvis primærsystemet settes ut av spill. Holder produksjonen i gang under angrep.
**Primær FR:** FR7
**Grunnkostnad:** 700

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Kald reserve | — | Produksjon gjenopptas etter manuell omkobling |
| 2 | Varm reserve | 500 | Automatisk omkobling ved feil |
| 3 | Full redundans | 800 | Ingen merkbar nedetid ved angrep på én node |

---

## Kategori 5: Fysisk sikring (FR1/FR2)

### 5.1 Fysisk adgangskontroll
**Profiltekst:** Låste skap og adgangskontrollerte rom. Alle nettverkstiltak er verdiløse hvis noen kan koble seg rett på svitsjen med en kabel.
**Primær FR:** FR2 · **Sekundær:** FR1
**Grunnkostnad:** 200

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Låste skap | — | Blokkerer 50% av fysiske/innsiderangrep |
| 2 | Adgangskontroll med logging | 300 | 75%. Man vet hvem som var hvor og når |
| 3 | Med kameraovervåking og alarm | 400 | 88%. Uautorisert adgang oppdages umiddelbart |

---

### 5.2 Kontroll av flyttbare medier
**Profiltekst:** Sperrer eller kontrollerer USB-porter og annen flyttbar lagring. En av de vanligste smitteveiene inn i nettverk uten internettilkobling.
**Primær FR:** FR3 · **Sekundær:** FR2
**Grunnkostnad:** 150

| Nivå | Navn | Kostnad | Effekt |
|---|---|---|---|
| 1 | Fysiske portlåser | — | Blokkerer 55% av USB-baserte angrep |
| 2 | Programvarebasert portkontroll | 250 | 78%. Kun godkjente enheter tillates |
| 3 | Med skannestasjon | 350 | 90%. Alle medier kontrolleres før bruk i anlegget |

---

## Tilgjengelighet per digitaliseringsnivå

| Komponent | Nivå 1 (Purdue) | Nivå 2 (Fjerntilgang) | Nivå 3 (IT/OT) | Nivå 4 (Sky/AI) |
|---|---|---|---|---|
| Industriell brannmur | ✓ | ✓ | ✓ | ✓ |
| Administrert svitsj | ✓ | ✓ | ✓ | ✓ |
| Fysisk adgangskontroll | ✓ | ✓ | ✓ | ✓ |
| Kontroll flyttbare medier | ✓ | ✓ | ✓ | ✓ |
| Endepunktsbeskyttelse | ✓ | ✓ | ✓ | ✓ |
| Sikkerhetskopiering | ✓ | ✓ | ✓ | ✓ |
| Patch-server | ✓ | ✓ | ✓ | ✓ |
| Autentiseringsserver | ✓ | ✓ | ✓ | ✓ |
| IDS/IPS | — | ✓ | ✓ | ✓ |
| Jump host | — | ✓ | ✓ | ✓ |
| VPN-gateway | — | ✓ | ✓ | ✓ |
| Industriell DMZ | — | — | ✓ | ✓ |
| Loggsamler/SIEM | — | — | ✓ | ✓ |
| PKI/sertifikater | — | — | ✓ | ✓ |
| Data-diode | — | — | ✓ | ✓ |
| Redundant styring | — | — | — | ✓ |

Komponenter låses opp etter hvert som anlegget digitaliseres — spilleren skal føle at nye muligheter og nye trusler kommer samtidig.

---

## Datamodell

```ts
interface GameComponent {
  id: string;
  name: string;
  category: "segmentation" | "access" | "detection" | "integrity" | "physical";
  profileText: string;          // vises ved klikk
  primaryFR: string;            // f.eks. "FR5"
  secondaryFRs: string[];
  baseCost: number;
  unlockedAtLevel: 1 | 2 | 3 | 4;
  upgrades: ComponentUpgrade[]; // alltid 3
}

interface ComponentUpgrade {
  tier: 1 | 2 | 3;
  name: string;
  cost: number;                 // 0 for tier 1 (inkludert i baseCost)
  effectDescription: string;
  effectValues: Record<string, number>;  // f.eks. { blockChance: 0.8 }
}
```
