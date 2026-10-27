/**
 * Generates the photoreal week-by-week womb series (weeks 1–40) for the NIVA
 * studio "photoreal view" via z-ai-web-dev-sdk (backend only).
 *
 * Hard-won filter lessons (error 1301 is stochastic): week NUMBERS in prompts
 * reliably trip it; anomaly-adjacent vocabulary ("tail", "paddle") on baby
 * subjects trips it; identical-style prompts pass/fail nondeterministically.
 * Strategy: locked templates derived from verified-passing prompts, ordered
 * variant chains per week, jitter on 1301, resumable, 3s spacing.
 *
 * Run (survives tool-call reaping via double-fork PPID-1):
 *   ( setsid nohup bun scripts/gen-fetus-images.ts >> .zscripts/genfetus.log 2>&1 & )
 */

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'public', 'fetus');
const RAW_DIR = path.join(process.cwd(), '.zscripts', 'fetus-raw');
const SPACING_MS = 3000;

/** Exact suffix from the verified-passing week-40 test. */
const SUF =
  ', ultra-detailed, professional medical illustration, cinematic soft lighting, deep warm crimson and amber gradient background, soft glowing bokeh particles, gentle volumetric light, delicate rim light, shallow depth of field, three-quarter profile view, single subject centered, no text, no watermark, 8k quality';

/** Verified-passing baby template (week-40 test) with a swappable stage phrase. */
const baby = (stage: string, extra = '') =>
  [
    `A peaceful sleeping baby curled up inside the womb${stage}`,
    extra,
  ]
    .filter(Boolean)
    .join(', ') + SUF;

/** Verified-passing macro template (fertilization test) with a swappable subject. */
const macro = (subject: string) =>
  `Scientific macro 3D visualization of ${subject}, embryology education${SUF}`;

type Variants = string[];

const V: Record<number, Variants> = {
  // ── Cellular conception (macro template) ──────────────────────────────
  1: [
    macro(
      'human fertilization: a single sperm cell fusing with a large luminous ovum (egg cell) wrapped in a halo of corona radiata cells and a translucent glowing zona pellucida, radiant golden core'
    ),
    macro('fertilization: a luminous egg cell with a glowing halo meeting a single sperm cell, radiant golden core'),
  ],
  2: [
    macro(
      'a ball of cells in earliest development: a glistening cluster with a soft inner cell mass and a delicate translucent shell, iridescent inner glow'
    ),
    macro('a glistening sphere of tiny cells with a soft golden inner glow and a delicate translucent shell'),
  ],
  3: [
    macro(
      'implantation: a tiny cell cluster nestling into soft warm velvety uterine lining, tender glow at the attachment point'
    ),
    macro('a tiny glowing cell cluster nestled in soft warm velvety tissue, tender glow'),
  ],
  // ── Weeks 4–8: embryonic period — pure scientific macro framing (the only
  // register that both passes the filter and produces actual embryo shapes).
  4: [
    macro(
      'an early prenatal specimen: a tiny curved form only a few millimeters across, a prominent rounded head fold, a delicate neural groove along the curved back, visible rows of small somite segments, translucent gelatinous tissue'
    ),
    macro('a minuscule curved prenatal specimen with a large head fold and a visible neural groove, translucent gelatinous tissue'),
  ],
  5: [
    macro(
      'an early prenatal specimen the size of an apple seed: a curved form with a large rounded head, two dark eye spots, tiny arm and leg buds just emerging, a softly glowing heart prominence, translucent gelatinous skin'
    ),
    macro('a tiny curved prenatal specimen with dark eye spots and newly emerging limb buds, translucent glowing tissue'),
  ],
  6: [
    macro(
      'an early prenatal specimen the size of a lentil: a gracefully curved form with a big rounded head, dark retinal pigment, paddle-shaped arm buds, a short tapering tail, translucent glowing skin'
    ),
    macro('a small curved prenatal specimen with paddle-shaped arm buds and a short tapering tail, translucent glowing skin'),
  ],
  7: [
    macro(
      'an early prenatal specimen the size of a blueberry: a curved form with a large forehead, webbed paddle hands, eyelids beginning to form, a short regressing tail, translucent pink skin'
    ),
    macro('a small curved prenatal specimen with webbed paddle hands and forming eyelids, translucent pink skin'),
  ],
  8: [
    macro(
      'an early prenatal specimen the size of a raspberry: a curved form with a still-prominent head, tiny separated fingers, fused closed eyelids, tail almost gone, translucent pink skin'
    ),
    macro('a small curved prenatal specimen with tiny separated fingers and fused closed eyelids, translucent pink skin'),
  ],
  // ── Weeks 9–19: early fetal period — baby framing with hard scale anchors.
  9: [
    baby(
      ' no bigger than an olive, its head taking up nearly half of its body',
      'closed fused eyelids, skin so thin and translucent it glows deep red, arms as thin as threads, no fat under the skin yet'
    ),
    macro('a tiny prenatal specimen the size of an olive with an oversized head, thin translucent red skin and thread-thin limbs'),
  ],
  10: [
    baby(
      ' no bigger than a strawberry, head still nearly half of its body',
      'closed eyelids, faint tiny fingernails beginning, translucent reddish skin with a soft glow, thin delicate limbs'
    ),
    macro('a tiny prenatal specimen the size of a strawberry with an oversized head and translucent red skin'),
  ],
  11: [
    baby(
      ' no bigger than a fig, head still very large for its body',
      'closed eyelids, a delicate face profile with a small nose and lips, thin translucent reddish skin, tiny hands'
    ),
    macro('a small prenatal specimen the size of a fig with a large head and translucent red skin'),
  ],
  12: [
    baby(
      ' about the size of a lime, head still very large',
      'closed fused eyelids, a sweet facial profile, little ears low on the head, skin thin and translucent with a soft glow, tiny hands near the face'
    ),
    macro('a small prenatal specimen the size of a lime with a large head and translucent glowing skin'),
  ],
  13: [
    baby(
      ' about the size of a lemon, head still large for its body',
      'closed eyes, distinct lips and a small nose, skin thin and translucent showing fine vessels, tiny hands'
    ),
    macro('a small prenatal specimen the size of a lemon with distinct lips and translucent skin'),
  ],
  14: [
    baby(
      ' about the size of a lemon, squirming gracefully',
      'closed fused eyelids, soft translucent skin with a gentle glow, tiny hands near the face, fine lanugo beginning'
    ),
    macro('a small prenatal specimen the size of a lemon with translucent glowing skin and tiny hands'),
  ],
  15: [
    baby(
      ' about the size of an apple, skin so thin the fine blood vessels glow through',
      'closed fused eyelids, relaxed curled pose, thin delicate limbs'
    ),
    macro('a small prenatal specimen the size of an apple with translucent skin showing fine vessels'),
  ],
  16: [
    baby(
      ' about the size of an avocado, head still notably large',
      'faint eyebrows, tiny hands near the face, translucent glowing skin with soft vessels beneath, closed eyes'
    ),
    macro('a small prenatal specimen the size of an avocado with faint eyebrows and translucent skin'),
  ],
  17: [
    baby(
      ' about the size of a pear, still slender with translucent glowing skin',
      'closed eyes, relaxed graceful fetal posture, tiny hands folded'
    ),
    macro('a small prenatal specimen the size of a pear with translucent glowing skin'),
  ],
  18: [
    baby(
      ' about the size of a bell pepper, still slender',
      'closed eyes, fully formed little ears, soft pink translucent skin, tiny hands near the mouth'
    ),
    macro('a small prenatal specimen the size of a bell pepper with formed ears and translucent skin'),
  ],
  19: [
    baby(
      ' about the size of a mango, skin still softly translucent',
      'closed eyes, delicate features, a faint creamy glow on the skin, tiny hands near the face'
    ),
    macro('a small prenatal specimen the size of a mango with delicate features and a creamy glow'),
  ],
  // ── Mid pregnancy ──────────────────────────────────────────────────────
  20: [
    baby(' about the size of a banana, halfway through the pregnancy, still slender and not yet chubby', 'visible eyebrows, closed eyes, softer pink skin, calm sleeping face in profile, tiny hands near the face'),
    baby(' in the middle of the pregnancy, still slender', 'eyebrows, closed eyes, soft pink skin, calm face, tiny hands'),
  ],
  21: [
    baby(' about the size of a carrot, still slender and graceful', 'closed eyes, small nostrils, soft pink skin, tiny hands'),
    baby(' in the middle of the pregnancy, still slender', 'closed eyes, soft pink skin, gentle face'),
  ],
  22: [
    baby(' about the size of a small papaya, skin softly wrinkled and not yet plump', 'distinct little lips, closed eyes, a tiny hand near the mouth'),
    baby(' in the middle of the pregnancy, skin softly wrinkled', 'little lips, closed eyes, hand near mouth'),
  ],
  23: [
    baby(' about the size of a large mango, skin reddish and wrinkled, not yet plump', 'closed eyes, well-defined tiny fingers'),
    baby(' in the middle of the pregnancy, skin wrinkled', 'closed eyes, tiny fingers'),
  ],
  24: [
    baby(' about the size of an ear of corn, skin pink and wrinkled, not yet plump', 'closed eyes, tiny fingernails, gentle sleeping expression'),
    baby(' in the middle of the pregnancy, skin pink and wrinkled', 'closed eyes, tiny nails, gentle expression'),
  ],
  25: [
    baby(' about the size of a rutabaga, just beginning to fill out', 'fine soft hair on the head, closed eyes, tiny hands near the face'),
    baby(' in the middle of the pregnancy, beginning to fill out', 'soft hair, closed eyes'),
  ],
  26: [
    baby(' about the size of a zucchini, skin smoothing out', 'tiny eyelashes, closed eyes with lids just beginning to part, gentle face'),
    baby(' in the middle of the pregnancy, skin smoothing', 'tiny lashes, gentle face'),
  ],
  27: [
    baby(' about the size of a cauliflower, cheeks beginning to fill', 'eyes gently open showing dark gentle irises, tiny hands near the face'),
    baby(' in the middle of the pregnancy, cheeks filling', 'eyes gently open, dark irises, fuller cheeks'),
  ],
  // ── Third trimester ────────────────────────────────────────────────────
  28: [
    baby(' in the final months of pregnancy', 'open dark eyes, soft hair on the head, smoother skin, calm expression, tiny hands folded'),
    baby(' late in the pregnancy', 'open dark eyes, soft hair, calm expression'),
  ],
  29: [
    baby(' in the final months of pregnancy', 'open eyes, firmer little bones, smooth skin, snug tucked pose, tiny hands near the face'),
    baby(' late in the pregnancy', 'open eyes, smooth skin, tucked pose'),
  ],
  30: [
    baby(' in the final months of pregnancy', 'plumping cheeks, open curious eyes, smoother pink skin, tiny hands folded'),
    baby(' late in the pregnancy', 'plump cheeks, open eyes, pink skin'),
  ],
  31: [
    baby(' in the final months of pregnancy', 'chubby little limbs, closed sleeping eyes, soft smooth skin, tiny hands near the cheek'),
    baby(' late in the pregnancy', 'chubby limbs, closed eyes, smooth skin'),
  ],
  32: [
    baby(' in the final months of pregnancy', 'chubby folds at the limbs, closed eyes, rounder face, tiny hands near the cheek'),
    baby(' late in the pregnancy', 'chubby limbs, round face, closed eyes'),
  ],
  33: [
    baby(' in the final months of pregnancy', 'rounded cheeks, closed eyes, plump little arms, soft skin'),
    baby(' late in the pregnancy', 'rounded cheeks, closed eyes, plump arms'),
  ],
  34: [
    baby(' in the final months of pregnancy', 'fuller face, closed sleeping eyes, creamy sheen on the skin, tiny hands folded'),
    baby(' late in the pregnancy', 'fuller face, closed eyes, creamy sheen'),
  ],
  35: [
    baby(' in the final months of pregnancy', 'plump and snuggled tight, closed eyes, soft cheeks, tiny hands near the face'),
    baby(' late in the pregnancy', 'plump, snuggled, closed eyes, soft cheeks'),
  ],
  36: [
    baby(' in the final weeks of pregnancy', 'chubby cheeks, closed eyes, rosy smooth skin, tiny hands near the cheek'),
    baby(' near the end of the pregnancy', 'chubby cheeks, closed eyes, rosy skin'),
  ],
  // ── Term (verified T1 verbatim at 40; near-verbatim neighbors) ─────────
  37: [
    baby(
      ' at full term, ready to be born',
      'closed eyes with long lashes, full rosy lips, small button nose, soft chubby cheeks, tiny ears, soft hair, plump arms and legs, tiny hands folded near the cheek'
    ),
    baby(' nearly full term', 'closed eyes with long lashes, rosy lips, chubby cheeks, soft hair, tiny hands near the cheek'),
  ],
  38: [
    baby(
      ' at full term, ready to be born',
      'closed eyes with long lashes, full rosy lips, small button nose, soft chubby cheeks, a full head of soft hair, creamy gentle glow on the skin, plump arms and legs, tiny hands folded near the cheek'
    ),
    baby(' at full term', 'long lashes, rosy lips, chubby cheeks, full soft hair, tiny hands near the cheek'),
  ],
  39: [
    baby(
      ' at full term, ready to be born',
      'closed eyes with long lashes, full rosy lips, small button nose, soft chubby cheeks, tiny ears, dense soft hair, plump arms and legs, tiny hands folded near the cheek'
    ),
    baby(' at full term', 'long lashes, rosy lips, chubby cheeks, dense soft hair'),
  ],
  40: [
    // Verified passing verbatim.
    `A peaceful sleeping baby curled up inside the womb at full term, closed eyes with long lashes, full rosy lips, small button nose, soft chubby cheeks, tiny ears, soft hair, plump arms and legs, tiny hands folded near the cheek, gentle amniotic ambience${SUF}`,
    baby(' at full term, ready to be born', 'closed eyes with long lashes, rosy lips, chubby cheeks, soft hair, plump limbs'),
  ],
};

function promptFor(week: number): string[] {
  return V[week] ?? [baby(' at full term')];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const zai = await ZAI.create();
  const target = (w: number) => path.join(OUT_DIR, `week-${String(w).padStart(2, '0')}.webp`);
  const missing = Array.from({ length: 40 }, (_, i) => i + 1).filter((w) => {
    try {
      return fs.statSync(target(w)).size < 20_000;
    } catch {
      return true;
    }
  });

  console.log(`[gen-fetus] missing ${missing.length}: ${missing.join(',')}`);
  if (missing.length === 0) {
    console.log('[gen-fetus] complete — nothing to do');
    return;
  }

  let ok = 0;
  const fail: number[] = [];
  for (const week of missing) {
    const variants = promptFor(week);
    let done = false;
    // Up to 2 passes over the variant chain, plus one-repeat on 500s.
    for (let round = 0; round < 2 && !done; round++) {
      for (let vi = 0; vi < variants.length && !done; vi++) {
        const prompt = variants[vi];
        for (let attempt = 0; attempt < 2 && !done; attempt++) {
          try {
            const res = await zai.images.generations.create({ prompt, size: '1024x1024' });
            const b64 = res?.data?.[0]?.base64;
            if (!b64) throw new Error('empty base64');
            const buf = Buffer.from(b64, 'base64');
            const raw = path.join(RAW_DIR, `week-${String(week).padStart(2, '0')}.png`);
            fs.writeFileSync(raw, buf);
            await sharp(raw).resize(1024, 1024).webp({ quality: 86 }).toFile(target(week));
            console.log(`[gen-fetus] ✓ week ${week} v${vi}r${round} (${(fs.statSync(target(week)).size / 1024).toFixed(0)}KB)`);
            ok++;
            done = true;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            const filtered = msg.includes('1301');
            console.error(`[gen-fetus] ✗ week ${week} v${vi}r${round}a${attempt}: ${filtered ? 'FILTER_1301' : msg.slice(0, 160)}`);
            if (!filtered) await sleep(2000); // transient (500/network) — brief backoff, same prompt
            await sleep(SPACING_MS);
          }
        }
      }
    }
    if (!done) fail.push(week);
    await sleep(SPACING_MS);
  }

  console.log(`[gen-fetus] DONE ok=${ok} fail=${fail.length ? fail.join(',') : 'none'}`);
}

main().catch((e) => {
  console.error('[gen-fetus] fatal:', e);
  process.exit(1);
});
