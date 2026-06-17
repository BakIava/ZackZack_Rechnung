/**
 * §19 Kleinunternehmer logic.
 * Default: no MwSt is shown → §19 note appears automatically.
 * MwSt is opt-in per invoice; positions default to 19 %, switchable to 7 %.
 */

export type Steuersatz = 0 | 7 | 19;

export interface SteuerPosition {
  nettoCents: number;
  satz: Steuersatz;
}

export interface SteuerSumme {
  ausgewiesen: boolean;
  nettoCents: number;
  steuerCents: number;
  bruttoCents: number;
}

/** §19-Hinweis is required exactly when no MwSt is shown on the document. */
export function braucht19Hinweis(mwstAusgewiesen: boolean): boolean {
  return !mwstAusgewiesen;
}

export function berechneSteuer(
  positionen: SteuerPosition[],
  mwstAktiv: boolean,
): SteuerSumme {
  const nettoCents = positionen.reduce((sum, p) => sum + p.nettoCents, 0);

  if (!mwstAktiv) {
    return {
      ausgewiesen: false,
      nettoCents,
      steuerCents: 0,
      bruttoCents: nettoCents,
    };
  }

  const steuerCents = positionen.reduce(
    (sum, p) => sum + Math.round((p.nettoCents * p.satz) / 100),
    0,
  );

  return {
    ausgewiesen: true,
    nettoCents,
    steuerCents,
    bruttoCents: nettoCents + steuerCents,
  };
}
