/**
 * Iranian mobile-number normalization for OTP identity (Wave 11).
 * Accepts Persian/Arabic digits, +98 / 0098 / 98 / 9 prefixes, separators.
 * Canonical storage format: 09xxxxxxxxx (11 digits).
 * sms.ir wire format: 9xxxxxxxxx (10 digits, no leading zero) — see toSmsIr().
 */

export function normalizeDigits(v: string): string {
  return v
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/** Returns canonical `09xxxxxxxxx` or null when the input is not a valid Iranian mobile. */
export function normalizeMobile(raw: string): string | null {
  const digits = normalizeDigits(String(raw ?? '')).replace(/[\s()\-._]/g, '');
  let d = digits.replace(/^\+/, '');
  if (d.startsWith('0098')) d = d.slice(4);
  else if (d.startsWith('098')) d = d.slice(3);
  else if (d.startsWith('98') && d.length === 12) d = d.slice(2);
  if (/^9\d{9}$/.test(d)) d = `0${d}`;
  return /^09\d{9}$/.test(d) ? d : null;
}

/** sms.ir v1 expects the mobile WITHOUT the leading zero (e.g. 9123456789). */
export function toSmsIrMobile(canonical: string): string {
  return canonical.replace(/^0/, '');
}

/** Masked display form: 0912•••6789 */
export function maskMobile(canonical: string): string {
  return canonical.length === 11 ? `${canonical.slice(0, 4)}•••${canonical.slice(7)}` : canonical;
}

/** Synthetic email for OTP-native accounts (User.email is @unique/@required legacy). */
export function phoneEmail(canonical: string): string {
  return `${canonical}@otp.niva.health`;
}
