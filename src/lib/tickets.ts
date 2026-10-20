/**
 * Wave 6.2 support tickets — shared, localized notification copy.
 * Notification.type 'TICKET' is a free String column (schema comment lists the
 * original set; new types are additive and the notifications feed renders by
 * title/body, not by type).
 */

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH';
export type TicketCategory = 'BILLING' | 'CLINICAL' | 'TECHNICAL' | 'PRIVACY' | 'OTHER';

export const TICKET_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const TICKET_PRIORITIES: TicketPriority[] = ['LOW', 'NORMAL', 'HIGH'];
export const TICKET_CATEGORIES: TicketCategory[] = ['BILLING', 'CLINICAL', 'TECHNICAL', 'PRIVACY', 'OTHER'];

export function staffReplyNotification(locale: string, subject: string): { title: string; body: string } {
  return locale === 'en'
    ? { title: 'Support replied to your ticket', body: `"${subject}" — a NIVA specialist has replied. Open the app for details.` }
    : { title: 'پاسخ پشتیبانی به تیکت شما', body: `«${subject}» — کارشناس نیوا پاسخی ثبت کرد. برای دیدن جزئیات وارد شوید.` };
}

export function ticketStatusNotification(locale: string, subject: string, status: TicketStatus): { title: string; body: string } {
  if (locale === 'en') {
    const label = status === 'RESOLVED' ? 'resolved' : 'closed';
    return {
      title: `Your ticket was ${label}`,
      body: `"${subject}" is now ${label}. If anything is still unclear, you can open a new ticket anytime.`,
    };
  }
  const label = status === 'RESOLVED' ? 'حل شد' : 'بسته شد';
  return {
    title: status === 'RESOLVED' ? 'تیکت شما حل شد' : 'تیکت شما بسته شد',
    body: `«${subject}» اکنون ${label} است. اگر پرسش دیگری دارید، هر زمان می‌توانید تیکت جدیدی ثبت کنید.`,
  };
}
