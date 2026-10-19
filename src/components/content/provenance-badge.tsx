'use client';

import { Badge } from '@/components/ui/badge';
import { useApp } from '@/store/app';
import { ShieldCheck, GraduationCap } from 'lucide-react';

/**
 * Provenance rendering for CMS educational content (Wave 2.4):
 * evidence grade (A–D), true governance status and review date are always
 * shown together so users are never misled about clinical approval.
 */
export function ProvenanceBadge({
  status,
  evidenceGrade,
  reviewedAt,
  compact = false,
}: {
  status: string;
  evidenceGrade?: string | null;
  reviewedAt?: string | Date | null;
  compact?: boolean;
}) {
  const { t, locale } = useApp();
  const grade = (evidenceGrade ?? 'C').toUpperCase();
  const approved = status === 'APPROVED';

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {approved ? (
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <ShieldCheck className="h-3 w-3" />
          {t('status.APPROVED')}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px]">
          {t(`status.${status}`)}
        </Badge>
      )}
      <Badge variant="outline" className="gap-1 text-[10px]" title={t(`cms.evidence${grade}`)}>
        <GraduationCap className="h-3 w-3" />
        {t('cms.evidence')} {grade}
      </Badge>
      {!compact && reviewedAt && (
        <span className="text-[11px] text-muted-foreground num">
          {t('cms.reviewed')}: {new Date(reviewedAt).toLocaleDateString(locale === 'fa' ? 'fa-IR' : 'en-US')}
        </span>
      )}
    </span>
  );
}
