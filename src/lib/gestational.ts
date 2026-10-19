/**
 * NIVA gestational dating engine.
 *
 * Scientific basis:
 * - LMP/EDD: Naegele's rule (280 days from LMP) — WHO/ACOG standard for preliminary dating.
 * - CRL: Hadlock-style biometry table with linear interpolation (educational estimate;
 *   clinical dating must be established by a qualified clinician).
 * - IVF: EDD = embryo transfer date + 266 days − embryo age in days at transfer.
 *
 * Guarantees:
 * - Gestational age (GA) is counted from LMP (≈ fertilization + 14 days). Post-conception
 *   age is never conflated with GA.
 * - Clinician-established dating is NEVER silently overwritten (see `resolveDating`).
 */

export const GESTATION_DAYS = 280;

export type DatingMethod = 'LMP' | 'ULTRASOUND_CRL' | 'CLINICIAN' | 'IVF';
export type DatingConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type DatingSource = 'SELF' | 'CLINICIAN';

export interface GestationalAge {
  weeks: number;
  days: number;
  totalDays: number;
}

export interface DatingProposal {
  method: DatingMethod;
  referenceDate: string; // ISO date
  crlMm?: number | null;
  embryoAgeDays?: number | null;
  dueDate: string; // ISO date
  confidence: DatingConfidence;
  warnings: string[];
  valid: boolean;
}

const DAY_MS = 86_400_000;

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function addDays(d: Date, days: number): Date {
  return new Date(startOfDay(d).getTime() + days * DAY_MS);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

export function dueDateFromLmp(lmp: Date): Date {
  return addDays(lmp, GESTATION_DAYS);
}

/** Hadlock-style CRL(mm) → gestational days lookup points [mm, days]. */
const CRL_TABLE: Array<[number, number]> = [
  [2, 35], [5, 42], [10, 49], [16, 56], [23, 63], [31, 70],
  [41, 77], [51, 84], [62, 91], [74, 98], [87, 105], [98, 112], [110, 119],
];

export function gestationalDaysFromCrl(crlMm: number): number {
  const crl = Math.min(Math.max(crlMm, 1), 120);
  for (let i = 0; i < CRL_TABLE.length - 1; i++) {
    const [mm1, d1] = CRL_TABLE[i];
    const [mm2, d2] = CRL_TABLE[i + 1];
    if (crl >= mm1 && crl <= mm2) {
      return Math.round(d1 + ((crl - mm1) / (mm2 - mm1)) * (d2 - d1));
    }
  }
  return 119;
}

export function dueDateFromCrl(scanDate: Date, crlMm: number): Date {
  const gaDays = gestationalDaysFromCrl(crlMm);
  return addDays(scanDate, GESTATION_DAYS - gaDays);
}

export function dueDateFromIvf(transferDate: Date, embryoAgeDays = 5): Date {
  return addDays(transferDate, 266 - embryoAgeDays);
}

export function gestationalAgeAt(
  reference: { dueDate: Date } | { lmp: Date },
  at: Date = new Date()
): GestationalAge {
  const start =
    'lmp' in reference ? startOfDay(reference.lmp) : addDays(reference.dueDate, -GESTATION_DAYS);
  const totalDays = daysBetween(start, at);
  return {
    weeks: Math.floor(totalDays / 7),
    days: ((totalDays % 7) + 7) % 7,
    totalDays,
  };
}

export function trimesterOf(week: number): 1 | 2 | 3 {
  if (week < 14) return 1;
  if (week < 28) return 2;
  return 3;
}

/** Validates raw input and produces a dating proposal with explicit warnings. */
export function proposeDating(input: {
  method: DatingMethod;
  lmpDate?: string | null;
  scanDate?: string | null;
  crlMm?: number | null;
  transferDate?: string | null;
  embryoAgeDays?: number | null;
  clinicianDueDate?: string | null;
}): DatingProposal {
  const warnings: string[] = [];
  let dueDate: Date | null = null;
  let referenceDate: Date | null = null;
  let confidence: DatingConfidence = 'MEDIUM';
  let valid = true;
  const now = new Date();

  const reject = (msg: string) => {
    warnings.push(msg);
    valid = false;
  };

  switch (input.method) {
    case 'LMP': {
      if (!input.lmpDate) return { valid: false, warnings: ['LMP date required'], confidence: 'LOW', method: 'LMP', referenceDate: '', dueDate: '' };
      const lmp = new Date(input.lmpDate);
      if (Number.isNaN(lmp.getTime())) return reject('Invalid LMP date'), invalid('LMP');
      const lmpDelta = daysBetween(lmp, now);
      if (lmpDelta < 14) { warnings.push('LMP within last two weeks — pregnancy may not be confirmable yet'); }
      if (lmpDelta < 0) reject('LMP cannot be in the future');
      if (lmpDelta > 300) reject('LMP is more than 300 days ago — please verify the date');
      dueDate = dueDateFromLmp(lmp);
      referenceDate = lmp;
      confidence = 'MEDIUM';
      break;
    }
    case 'ULTRASOUND_CRL': {
      if (!input.scanDate || !input.crlMm) return reject('Scan date and CRL required'), invalid('ULTRASOUND_CRL');
      const scan = new Date(input.scanDate);
      if (Number.isNaN(scan.getTime())) return reject('Invalid scan date'), invalid('ULTRASOUND_CRL');
      if (daysBetween(scan, now) < 0) reject('Scan date cannot be in the future');
      const crl = input.crlMm;
      if (crl < 1 || crl > 120) reject('CRL must be between 1 and 120 mm');
      dueDate = dueDateFromCrl(scan, crl);
      referenceDate = scan;
      confidence = 'HIGH';
      warnings.push('Ultrasound dating is an educational estimate — final dating must be confirmed by your clinician');
      break;
    }
    case 'IVF': {
      if (!input.transferDate) return reject('Transfer date required'), invalid('IVF');
      const transfer = new Date(input.transferDate);
      if (Number.isNaN(transfer.getTime())) return reject('Invalid transfer date'), invalid('IVF');
      const embryoAge = input.embryoAgeDays ?? 5;
      if (embryoAge < 1 || embryoAge > 6) reject('Embryo age must be 1–6 days');
      dueDate = dueDateFromIvf(transfer, embryoAge);
      referenceDate = transfer;
      confidence = 'HIGH';
      break;
    }
    case 'CLINICIAN': {
      if (!input.clinicianDueDate) return reject('Clinician-established due date required'), invalid('CLINICIAN');
      const dd = new Date(input.clinicianDueDate);
      if (Number.isNaN(dd.getTime())) return reject('Invalid due date'), invalid('CLINICIAN');
      dueDate = dd;
      referenceDate = addDays(dd, -GESTATION_DAYS);
      confidence = 'HIGH';
      warnings.push('Clinician-established dating is authoritative and will be locked');
      break;
    }
  }

  return {
    method: input.method,
    referenceDate: referenceDate ? referenceDate.toISOString().slice(0, 10) : '',
    crlMm: input.crlMm ?? null,
    embryoAgeDays: input.embryoAgeDays ?? null,
    dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : '',
    confidence,
    warnings,
    valid,
  };
}

function invalid(method: DatingMethod): DatingProposal {
  return { method, referenceDate: '', dueDate: '', confidence: 'LOW', warnings: [], valid: false };
}

export interface DatingResolution {
  dueDate: Date;
  locked: boolean;
  conflict: boolean;
  conflictDays: number;
  warnings: string[];
}

/**
 * Merges a new dating proposal with existing pregnancy dating.
 * Rule: clinician-established dating is never silently overwritten — a conflict
 * larger than 7 days is surfaced for explicit user decision.
 */
export function resolveDating(
  existing: { dueDate: Date; datingLocked: boolean; datingMethod: string } | null,
  proposal: DatingProposal
): DatingResolution {
  const newDue = new Date(proposal.dueDate);
  if (!existing) {
    return {
      dueDate: newDue,
      locked: proposal.method === 'CLINICIAN',
      conflict: false,
      conflictDays: 0,
      warnings: proposal.warnings,
    };
  }
  const diff = Math.abs(daysBetween(existing.dueDate, newDue));
  if (existing.datingLocked) {
    return {
      dueDate: existing.dueDate,
      locked: true,
      conflict: diff > 7,
      conflictDays: diff,
      warnings: [
        ...proposal.warnings,
        'Existing clinician-established dating was preserved. If you believe it is incorrect, contact your clinician.',
      ],
    };
  }
  return {
    dueDate: newDue,
    locked: proposal.method === 'CLINICIAN',
    conflict: diff > 7,
    conflictDays: diff,
    warnings: diff > 7
      ? [...proposal.warnings, `New dating differs from the previous due date by ${diff} days. The previous estimate has been replaced — review your timeline.`]
      : proposal.warnings,
  };
}

/** Baby-size comparison helper (educational approximations). */
export function pluralityLabel(plurality: string): 'SINGLETON' | 'TWINS' | 'TRIPLETS_OR_MORE' {
  if (plurality === 'TWINS' || plurality === 'TRIPLETS_OR_MORE') return plurality;
  return 'SINGLETON';
}
