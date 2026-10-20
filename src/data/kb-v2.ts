// NIVA Pregnancy Intelligence Platform — RAG v2 chunked knowledge base.
//
// Derives from MEDICAL_KNOWLEDGE (src/data/medical-knowledge.ts) WITHOUT altering
// any medical text: each bilingual entry body is split deterministically into
// 2–4 overlapping sentence chunks. Every chunk carries its own locale fields,
// keywords, category, red-flag marker and citation so retrieval, re-ranking and
// the answer prompt operate at chunk granularity while citations stay
// entry-accurate (chunk → parent entry provenance via entryId).
//
// KB_VERSION is part of the safe-content cache key: bumping it invalidates all
// cached answers, which is exactly what should happen when curated content is
// revised by the clinical review workflow (backlog 3.1).

import { MEDICAL_KNOWLEDGE, type KnowledgeCategory } from '@/data/medical-knowledge';

export const KB_VERSION = '2.0.0';

export interface KBChunk {
  chunkId: string; // `${entry.id}#c${n}`
  entryId: string;
  kbVersion: string;
  chunkIndex: number; // 1-based within the entry
  chunkCount: number;
  category: KnowledgeCategory;
  redFlagRelated: boolean;
  // locale fields (both locales always present — per-locale weighting happens at query time)
  titleEn: string;
  titleFa: string;
  textEn: string;
  textFa: string;
  keywordsEn: string[];
  keywordsFa: string[];
  topicsEn: string[];
  citation: string;
  sourceUrl?: string;
}

/** Deterministic sentence splitter for English and Persian bodies. */
function splitSentences(body: string): string[] {
  return body
    .split(/(?<=[.!?؟…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Distribute sentences into `target` chunks with a 1-sentence overlap between
 * adjacent chunks (deterministic; keeps chunks ≥ 1 sentence).
 */
function groupWithOverlap(sentences: string[], target: number): string[][] {
  const n = sentences.length;
  if (n === 0) return [];
  const count = Math.max(1, Math.min(target, n));
  const base = Math.floor(n / count);
  const groups: string[][] = [];
  let start = 0;
  for (let i = 0; i < count; i++) {
    // last chunk absorbs the remainder
    const size = i === count - 1 ? n - start : base;
    const end = Math.min(n, start + size);
    groups.push(sentences.slice(start, end));
    if (end >= n) break;
    start = end - 1; // 1-sentence overlap with the next chunk
  }
  return groups;
}

function buildChunksForEntry(entry: {
  id: string;
  category: KnowledgeCategory;
  topicsEn: string[];
  keywordsEn: string[];
  keywordsFa: string[];
  titleEn: string;
  titleFa: string;
  bodyEn: string;
  bodyFa: string;
  citation: string;
  sourceUrl?: string;
  redFlagRelated?: boolean;
}): KBChunk[] {
  const enSentences = splitSentences(entry.bodyEn);
  const faSentences = splitSentences(entry.bodyFa);
  // Chunk count from the (longer) English side so fa/en chunk counts align.
  const enLen = enSentences.length;
  const target = enLen >= 12 ? 4 : enLen >= 8 ? 3 : 2;
  const enGroups = groupWithOverlap(enSentences, target);
  const faGroups = groupWithOverlap(faSentences, target);
  const chunkCount = enGroups.length;

  const chunks: KBChunk[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const enGroup = enGroups[i];
    // Persian groups may differ by one in count if sentence splitting differs —
    // fall back to proportional slicing so every chunk still has text.
    const faGroup = faGroups[i] ?? faGroups.slice(-1)[0] ?? [];
    chunks.push({
      chunkId: `${entry.id}#c${i + 1}`,
      entryId: entry.id,
      kbVersion: KB_VERSION,
      chunkIndex: i + 1,
      chunkCount,
      category: entry.category,
      redFlagRelated: entry.redFlagRelated ?? false,
      titleEn: entry.titleEn,
      titleFa: entry.titleFa,
      textEn: enGroup.join(' '),
      textFa: faGroup.join(' '),
      keywordsEn: entry.keywordsEn,
      keywordsFa: entry.keywordsFa,
      topicsEn: entry.topicsEn,
      citation: entry.citation,
      sourceUrl: entry.sourceUrl,
    });
  }
  return chunks;
}

export const KB_CHUNKS: KBChunk[] = MEDICAL_KNOWLEDGE.flatMap((entry) => buildChunksForEntry(entry));

/** Sanity helper for the evaluation harness / admin diagnostics. */
export function kbStats(): { entries: number; chunks: number; version: string } {
  return {
    entries: new Set(KB_CHUNKS.map((c) => c.entryId)).size,
    chunks: KB_CHUNKS.length,
    version: KB_VERSION,
  };
}
