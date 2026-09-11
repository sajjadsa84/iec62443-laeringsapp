# OT Game — Lærdommer fra første forsøk

Skrevet før omstart. Delen nederst, «Beslutninger før første kodelinje», er den som faktisk hindrer gjentakelse — resten forklarer hvorfor.

---

## De fire som kostet mest

**1. Grafikk er en egen pipeline, ikke en implementasjonsoppgave.**
Hele speccen var skrevet i programvarearkitekturtermer — moduler, tilstandsmodell, selektorer — og grafikken ble plassert inne i renderinglaget som om den var kode på linje med resten. Det er den ikke. I spillutvikling er assets et eget spor med eget verktøy og egen leveranse. Da det ble skjult inne i `scene/`, ble det heller aldri planlagt, estimert eller godkjent.

**2. En språkmodell kan ikke tegne.**
Claude Code skriver polygonkoordinater uten å se hva den lager. Den kan skrive en Blender-pipeline, en projeksjonsfunksjon eller en materialoverstyring — alt det er kode. Men å plassere 200 koordinater slik at det blir en gjenkjennelig robotarm krever visuell vurdering underveis, og den vurderingen finnes ikke i løkken. Dette er en kapasitetsgrense, ikke en promptsvakhet. Ingen mengde presisering i prompten fikser den.

**3. Visuelt arbeid uten visuell tilbakemeldingssløyfe blir aldri bra.**
Vi kjørte mange runder der Claude Code rapporterte «ferdig» uten noen gang å ha sett resultatet. Rutinen som må være på plass fra dag én: installer Playwright, start dev-serveren, ta screenshot til PNG, og *åpne PNG-en med view-verktøyet*. Uten det siste steget er den fortsatt blind, uansett hvor mange screenshots som genereres.

**4. Godkjenn én før du replikerer 28.**
Alle feilene multipliserte seg fordi de ble laget i batch. Feil farge på maskinene ble feil på 28 assets samtidig. Regelen er enkel: én asset, ferdig til godkjent standard, vist ved siden av referansebildet, før nummer to påbegynnes.

---

## Om referanser og dokumenter

**5. Referansebilder må ligge i repoet.**
Claude Code kan åpne bildefiler. Et bilde beskrevet i tekst er ikke et bilde. Vi brukte flere runder på at den designet mot en beskrivelse av referansen i stedet for referansen.

**6. Verifiser at mottakersiden faktisk har dokumentene.**
Vi mistet tid på at arkitekturspeccen ikke var i repoet mens guiden refererte til den i hvert eneste steg. Sjekk ved oppstart: har den alle dokumentene den skal jobbe mot, og kan den åpne dem?

**7. Diagnostiser rotårsak før du foreskriver.**
Jeg brukte to runder på farger og lysmodell da problemet var at maskinene ikke var gjenkjennelige i det hele tatt. Fargene var reelle feil, men å fikse dem ville gitt uleselige maskiner i riktig farge. Når noe er «helt ubrukelig», er det sjelden parameterjustering som mangler.

---

## Det som faktisk fungerte, og bør beholdes

**8. Skillet mellom statiske fabrikkdata og kjørende tilstand.**
Dette reddet prosjektet. Fordi `factory.json`, schemaet, `engine/` og `domain/` aldri visste noe om rendering, overlevde de at hele det visuelle laget viste seg å være feil. Behold regelen: ingenting i `engine/` eller `domain/` importerer React eller three.

**9. Port-gaten.**
«Legg til en asset i JSON, last om, se den dukke opp uten å røre en `.tsx`» var riktig test på riktig sted. Behold den.

**10. Kutt fra 70 til 28 assets.**
Riktig kall. Vurder å kutte enda hardere ved omstart — én etasje med seks assets er nok til å bevise pipelinen.

---

## Verktøyvalg

**11. Motorvalg følger innholdspipelinen, ikke omvendt.**
Godot-spørsmålet ditt var egentlig det riktige spørsmålet stilt for tidlig. Svaret avhenger av hvor assets kommer fra. Når de kommer som ferdige 3D-modeller, gir three.js med ortografisk kamera deg lys, dybdesortering og picking gratis — og du beholder React for de teksttunge panelene, som er mesteparten av dette spillet.

**12. Hent, ikke bygg.**
Kenney Conveyor Kit og Factory Kit er CC0, gratis, og dekker det meste av industriutstyret. De 5–8 typene som mangler (PLC-skap, serverrack, brannmur) komponeres fra bokser i 3D — med ekte lys leser det riktig, noe det aldri gjorde i flat SVG.

---

## Beslutninger før første kodelinje

Ta disse eksplisitt, skriv dem ned i repoet, før noe annet:

1. **Asset-kilde.** Kenney CC0 + three.js. Modellene lastes ned og committes manuelt — ikke overlat nedlasting til en sandkasse med begrenset nettverk.
2. **Renderer.** three.js med `OrthographicCamera`, ingen OrbitControls, flat Lambert-belysning.
3. **Visuell verifiseringsrutine.** Playwright + screenshot + view, definert i `CLAUDE.md` slik at den gjelder hver sesjon.
4. **Godkjenningsregel.** Én asset av gangen til standarden er satt.
5. **Slice-omfang.** Én etasje (L0), seks assets, én forbindelse. Ikke sju etasjer.
6. **Rekkefølge.** Assets → rendering → interaksjon → engine → misjoner. Ikke engine først denne gangen; den delen er billig og kjent, og den visuelle risikoen må bevises tidlig.
7. **Dokumenter i repoet fra commit én:** master prompt, arkitekturspec, referansebilder, denne lista.

---

## Én ting til

Du trenger ikke slette alt. Schema, `engine/`, `domain/` og datamodellen bærer fortsatt — det var nettopp poenget med å skille dem fra rendering. Det som var feil var `scene/` og asset-tilnærmingen. En ren omstart er helt legitim hvis den gir deg bedre hode for det, men vurder å ta med `content/factories/schema.ts` og engine-strukturen som utgangspunkt i stedet for å skrive dem på nytt.
