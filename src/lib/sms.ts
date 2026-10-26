/**
 * sms.ir OTP delivery (Wave 11) — v1 verify-template API.
 *
 * Contract (docs/07-security-privacy.md §OTP):
 *  - Set SMS_IR_API_KEY (x-api-key) and SMS_IR_TEMPLATE_ID (numeric template id
 *    whose content contains the #CODE# parameter) as environment variables.
 *  - When the key is NOT configured (sandbox/preview), the provider is skipped
 *    and the code is returned as `devCode` so the flow stays testable end-to-end.
 *    devCode is NEVER included in responses once a real API key exists.
 *  - Never log the code in plaintext production paths (audit keeps phone only).
 */

const SMS_IR_VERIFY_URL = 'https://api.sms.ir/v1/send/verify';

export interface SmsResult {
  sent: boolean;
  provider: 'sms.ir' | 'dev-fallback';
  devCode?: string;
  error?: string;
}

export function smsConfigured(): boolean {
  return Boolean(process.env.SMS_IR_API_KEY && process.env.SMS_IR_TEMPLATE_ID);
}

export async function sendOtpSms(mobile98: string, code: string): Promise<SmsResult> {
  const apiKey = process.env.SMS_IR_API_KEY;
  const templateId = Number(process.env.SMS_IR_TEMPLATE_ID ?? 0);

  if (!apiKey || !templateId) {
    // Sandbox/preview fallback: no provider credentials → surface the code to
    // the client behind an explicit dev-mode flag so QA can complete the flow.
    console.log(`[sms.ir] DEV fallback — OTP for ${mobile98}: ${code}`);
    return { sent: false, provider: 'dev-fallback', devCode: code };
  }

  try {
    const res = await fetch(SMS_IR_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        mobile: mobile98,
        templateId,
        parameters: [{ name: 'CODE', value: code }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => null)) as { status?: number; message?: string } | null;
    if (res.ok && data?.status === 1) {
      return { sent: true, provider: 'sms.ir' };
    }
    console.error('[sms.ir] send failed', res.status, data?.message ?? data);
    return { sent: false, provider: 'sms.ir', error: data?.message ?? `HTTP ${res.status}` };
  } catch (err) {
    console.error('[sms.ir] network error', err instanceof Error ? err.message : err);
    return { sent: false, provider: 'sms.ir', error: 'NETWORK' };
  }
}
