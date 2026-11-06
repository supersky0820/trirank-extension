/**
 * WS-CHROME-EXT — AI crawler identities for the reachability test.
 *
 * 🔴 THE TOKEN COLUMN MIRRORS THE MAIN SITE; THE `ua` COLUMN DOES NOT EXIST
 * THERE AT ALL. Those are two different statements and this file used to make
 * only the second one, saying flatly "do not deduplicate the two". That was
 * right about `ua` and wrong as a whole, and the gap it left was real: this
 * roster carried nine tokens while src/lib/ai-crawlers.ts carried twenty-one,
 * so a panel screen answering "can AI crawlers reach this page" was silently
 * answering it about a third of the crawlers the rest of the product counts.
 *
 * So the split is now explicit (WS-EXT-1.10.6-ROSTER):
 *   · `token` — MUST equal, set for set, `AI_ROBOTS_AGENTS` in
 *     src/lib/robots-txt.ts, which is itself `AI_CRAWLERS` plus the two
 *     robots-only control tokens. `scripts/check-crawler-mirror.ts` compares
 *     them and names whichever side is short.
 *   · `ua` — a full sendable User-Agent, which the main site has no column for
 *     and never will: it recognises crawlers calling US, we send requests AS
 *     one. Nothing about the token mirror obliges this column to fill up.
 *
 * 🔴 RED LINE 3 / zero hallucination: `ua` is transcribed VERBATIM from the
 * vendor's own documentation (the five strings present were verified
 * 2026-07-26). A row with no `ua` is never live-tested — its robots.txt
 * declaration is still reported, because that part is a hard fact that needs no
 * request. Nothing here is inferred from a naming pattern; `source` on every row
 * carries the page and the UTC day it was read.
 *
 * ⚠️ AND THERE ARE TWO DIFFERENT REASONS A ROW HAS NO `ua`. See
 * ROBOTS_ONLY_SKIP / DECLARATION_ONLY_SKIP below — conflating them would have
 * the panel tell a reader that Amazon publishes no User-Agent, which is false.
 */

/**
 * @typedef {Object} Crawler
 * @property {string} id        stable key
 * @property {string} label     display name
 * @property {string} vendor    display vendor
 * @property {string} token     robots.txt user-agent token (lowercased)
 * @property {string|null} ua   full sendable User-Agent, or null = not live-testable
 * @property {string|null} skipReason  why it is not live-testable (shown in the UI)
 * @property {boolean} inServerAudit  is this token also checked by the
 *   server-side audit? See SERVER_AUDIT_TOKENS below for why that matters.
 * @property {'training'|'search'|'assistant'|null} purpose  what the VENDOR says
 *   the crawler is for, or null when the vendor says nothing that fits. See
 *   PURPOSE_LABELS below — this is transcribed, not inferred.
 * @property {CrawlerSource} source  the page this row rests on and the UTC day
 *   it was read. `url: null` requires `note`.
 */

/**
 * @typedef {Object} CrawlerSource
 * @property {string|null} url   vendor page publishing this token, or null
 * @property {string} readUtc    UTC calendar day that source was last read
 * @property {string} [note]     required when `url` is null: what the row rests on instead
 */

const OPENAI = 'https://developers.openai.com/api/docs/bots';
const ANTHROPIC = 'https://support.claude.com/en/articles/8896518';
const PERPLEXITY = 'https://docs.perplexity.ai/guides/bots';
const GOOGLE =
  'https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers';
const AMAZON = 'https://developer.amazon.com/amazonbot';
const META =
  'https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/';
const MISTRAL = 'https://docs.mistral.ai/robots';
const DUCKDUCKGO =
  'https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot/';

/**
 * 🔴 ONE SENTENCE, USED BY EVERY ROW THAT REPORTS ONLY A DECLARATION, AND IT MAY
 * NOT BE CONFUSED WITH THE OTHER SKIP REASON IN THIS FILE. There are exactly two
 * reasons a row is not live-tested and they are opposite facts:
 *
 *   ROBOTS_ONLY_SKIP  — the token has no User-Agent AT ALL. Nothing could ever
 *                       be sent as it, in any version, by anyone.
 *   DECLARATION_ONLY_SKIP — the vendor DOES publish a User-Agent and this
 *                       version simply does not send it. A choice of ours, not
 *                       a fact about the vendor.
 *
 * Telling a reader "the vendor does not publish one" about Amazonbot would be
 * false — Amazon publishes it, we have not transcribed it. The two strings are
 * constants so `check-crawler-mirror.ts` can assert which rows carry which: a
 * row that swaps them makes the panel state something untrue about a vendor.
 */
const ROBOTS_ONLY_SKIP =
  'This token has no User-Agent of its own — it exists only as a robots.txt control, so a live request could never test it.';
const DECLARATION_ONLY_SKIP =
  'This version reads its robots.txt declaration only and sends no live request as it.';
const ANTHROPIC_NO_UA_SKIP =
  "Anthropic publishes the robots.txt token but not the full User-Agent string, so we won't guess one.";

/**
 * 🔴 ROW ORDER IS src/lib/ai-crawlers.ts's ORDER, NOT ALPHABETICAL, and the UA
 * crawlers come before the two robots-only controls. Reading the two files side
 * by side is how a person checks the mirror by eye, and sorting one of them
 * differently makes that reading useless while the gate stays green.
 *
 * @type {Crawler[]}
 */
export const CRAWLERS = [
  // ── OpenAI ────────────────────────────────────────────────────────────────
  {
    id: 'gptbot',
    label: 'GPTBot',
    vendor: 'OpenAI',
    token: 'gptbot',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot',
    skipReason: null,
    inServerAudit: true,
    purpose: 'training',
    source: { url: OPENAI, readUtc: '2026-08-15' },
  },
  {
    id: 'oai-searchbot',
    label: 'OAI-SearchBot',
    vendor: 'OpenAI',
    token: 'oai-searchbot',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot',
    skipReason: null,
    inServerAudit: false,
    purpose: 'search',
    source: { url: OPENAI, readUtc: '2026-08-15' },
  },
  {
    id: 'chatgpt-user',
    label: 'ChatGPT-User',
    vendor: 'OpenAI',
    token: 'chatgpt-user',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
    skipReason: null,
    inServerAudit: false,
    purpose: 'assistant',
    source: { url: OPENAI, readUtc: '2026-08-15' },
  },
  // ── Anthropic ─────────────────────────────────────────────────────────────
  {
    id: 'claudebot',
    label: 'ClaudeBot',
    vendor: 'Anthropic',
    token: 'claudebot',
    ua: null,
    skipReason: ANTHROPIC_NO_UA_SKIP,
    inServerAudit: true,
    purpose: 'training',
    source: { url: ANTHROPIC, readUtc: '2026-08-15' },
  },
  {
    id: 'claude-user',
    label: 'Claude-User',
    vendor: 'Anthropic',
    token: 'claude-user',
    ua: null,
    skipReason: ANTHROPIC_NO_UA_SKIP,
    inServerAudit: false,
    purpose: 'assistant',
    source: { url: ANTHROPIC, readUtc: '2026-08-15' },
  },
  {
    id: 'claude-searchbot',
    label: 'Claude-SearchBot',
    vendor: 'Anthropic',
    token: 'claude-searchbot',
    ua: null,
    skipReason: ANTHROPIC_NO_UA_SKIP,
    inServerAudit: false,
    purpose: 'search',
    source: { url: ANTHROPIC, readUtc: '2026-08-15' },
  },
  // ── Perplexity ────────────────────────────────────────────────────────────
  {
    id: 'perplexitybot',
    label: 'PerplexityBot',
    vendor: 'Perplexity',
    token: 'perplexitybot',
    // Transcribed exactly as published, including the unbalanced parenthesis.
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
    skipReason: null,
    inServerAudit: true,
    purpose: 'search',
    source: { url: PERPLEXITY, readUtc: '2026-08-15' },
  },
  {
    id: 'perplexity-user',
    label: 'Perplexity-User',
    vendor: 'Perplexity',
    token: 'perplexity-user',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)',
    skipReason: null,
    inServerAudit: false,
    purpose: 'assistant',
    source: { url: PERPLEXITY, readUtc: '2026-08-15' },
  },
  // ── Google ────────────────────────────────────────────────────────────────
  {
    id: 'googleother',
    label: 'GoogleOther',
    vendor: 'Google',
    token: 'googleother',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    // 🔴 null, and the vendor's own words are why: "GoogleOther is the generic
    // crawler that may be used by various product teams for fetching publicly
    // accessible content from sites", and crawling preferences addressed to it
    // "don't affect any specific product". That is a statement that it belongs
    // to no product, which is not the same as us being unable to classify it.
    purpose: null,
    source: { url: GOOGLE, readUtc: '2026-09-07' },
  },
  // ── ByteDance ─────────────────────────────────────────────────────────────
  {
    id: 'bytespider',
    label: 'Bytespider',
    vendor: 'ByteDance',
    token: 'bytespider',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: null,
    source: {
      url: null,
      readUtc: '2026-09-06',
      note: 'ByteDance publishes no reachable crawler page (the reference URL inside the UA does not resolve from outside China), so there is no vendor statement of purpose to transcribe. Token carried over from src/lib/ai-crawlers.ts, which records the same absence.',
    },
  },
  // ── Amazon ────────────────────────────────────────────────────────────────
  {
    id: 'amazonbot',
    label: 'Amazonbot',
    vendor: 'Amazon',
    token: 'amazonbot',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: 'training',
    source: {
      url: AMAZON,
      readUtc: '2026-09-06',
      note: "Amazon publishes the same training / search-index / user-fetch three-way split Anthropic does; this row is the training third. Read date is src/lib/ai-crawlers.ts's own reading of that page, carried over rather than re-stamped.",
    },
  },
  {
    id: 'amzn-searchbot',
    label: 'Amzn-SearchBot',
    vendor: 'Amazon',
    token: 'amzn-searchbot',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: 'search',
    source: {
      url: AMAZON,
      readUtc: '2026-09-06',
      note: "The search-index third of Amazon's split; read date carried over from src/lib/ai-crawlers.ts.",
    },
  },
  {
    id: 'amzn-user',
    label: 'Amzn-User',
    vendor: 'Amazon',
    token: 'amzn-user',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: 'assistant',
    source: {
      url: AMAZON,
      readUtc: '2026-09-06',
      note: "The user-fetch third of Amazon's split; read date carried over from src/lib/ai-crawlers.ts.",
    },
  },
  // ── Cohere ────────────────────────────────────────────────────────────────
  {
    id: 'cohere-ai',
    label: 'cohere-ai',
    vendor: 'Cohere',
    token: 'cohere-ai',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: null,
    source: {
      url: null,
      readUtc: '2026-09-06',
      note: 'Cohere publishes no crawler documentation page. The only statement on record is a negative one — that it does not currently crawl for foundation-model training — which rules a bucket out without naming one. Token carried over from src/lib/ai-crawlers.ts.',
    },
  },
  // ── Meta ──────────────────────────────────────────────────────────────────
  {
    id: 'meta-externalagent',
    label: 'Meta-ExternalAgent',
    vendor: 'Meta',
    token: 'meta-externalagent',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: 'training',
    source: {
      url: META,
      readUtc: '2026-09-06',
      note: "Meta's training/indexing agent; read date carried over from src/lib/ai-crawlers.ts.",
    },
  },
  {
    id: 'meta-webindexer',
    label: 'meta-webindexer',
    vendor: 'Meta',
    token: 'meta-webindexer',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: 'search',
    source: {
      url: META,
      readUtc: '2026-09-06',
      note: "Meta's AI search index; read date carried over from src/lib/ai-crawlers.ts.",
    },
  },
  {
    id: 'meta-externalfetcher',
    label: 'meta-externalfetcher',
    vendor: 'Meta',
    token: 'meta-externalfetcher',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: 'assistant',
    source: {
      url: META,
      readUtc: '2026-09-06',
      note: 'The user-requested fetch Meta ties to agentic AI; read date carried over from src/lib/ai-crawlers.ts.',
    },
  },
  // ── Mistral ───────────────────────────────────────────────────────────────
  {
    id: 'mistralai-user',
    label: 'MistralAI-User',
    vendor: 'Mistral',
    token: 'mistralai-user',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: 'assistant',
    source: {
      url: MISTRAL,
      readUtc: '2026-09-06',
      note: 'The retrieval third of the split Mistral publishes on one page; read date carried over from src/lib/ai-crawlers.ts.',
    },
  },
  {
    id: 'mistralai-index',
    label: 'MistralAI-Index',
    vendor: 'Mistral',
    token: 'mistralai-index',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: 'search',
    source: {
      url: MISTRAL,
      readUtc: '2026-09-06',
      note: 'The index third of the split Mistral publishes on one page; read date carried over from src/lib/ai-crawlers.ts.',
    },
  },
  {
    id: 'mistralai-training',
    label: 'MistralAI-Training',
    vendor: 'Mistral',
    token: 'mistralai-training',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: 'training',
    source: {
      url: MISTRAL,
      readUtc: '2026-09-06',
      note: 'The training third of the split Mistral publishes on one page; read date carried over from src/lib/ai-crawlers.ts.',
    },
  },
  // ── DuckDuckGo ────────────────────────────────────────────────────────────
  {
    id: 'duckassistbot',
    label: 'DuckAssistBot',
    vendor: 'DuckDuckGo',
    token: 'duckassistbot',
    ua: null,
    skipReason: DECLARATION_ONLY_SKIP,
    inServerAudit: false,
    purpose: 'assistant',
    source: {
      url: DUCKDUCKGO,
      readUtc: '2026-09-06',
      note: 'Retrieval for AI-assisted answers; the vendor page states the data is not used to train models, which is why this sits with the user-fetch class. Read date carried over from src/lib/ai-crawlers.ts.',
    },
  },
  // ── robots.txt control tokens (no User-Agent exists for either) ────────────
  {
    id: 'google-extended',
    label: 'Google-Extended',
    vendor: 'Google',
    token: 'google-extended',
    ua: null,
    skipReason: ROBOTS_ONLY_SKIP,
    inServerAudit: true,
    purpose: 'training',
    source: { url: GOOGLE, readUtc: '2026-09-07' },
  },
  {
    id: 'applebot-extended',
    label: 'Applebot-Extended',
    vendor: 'Apple',
    token: 'applebot-extended',
    ua: null,
    skipReason: ROBOTS_ONLY_SKIP,
    inServerAudit: false,
    purpose: 'training',
    source: {
      url: null,
      readUtc: '2026-09-06',
      note: "Apple's AI-training control token, as src/lib/ai-crawlers.ts and src/lib/robots-txt.ts both record it. Neither cites a vendor page and none is invented here; the basis is those two rosters, not a page this file has read.",
    },
  },
];

/**
 * WS-EXT-ENRICH B-B — 🔴 `purpose` IS TRANSCRIBED FROM THE VENDOR, NOT INFERRED
 * FROM THE NAME. The rule at the top of this file — "Nothing here is inferred
 * from a naming pattern" — applies to this column exactly as it applies to `ua`,
 * and it is the column most tempting to guess: "-User" looks like it means
 * assistant and "-SearchBot" looks like it means search, and both happen to be
 * right, which is precisely what makes guessing feel safe.
 *
 * Each row's `source` carries the page its purpose was read from and the UTC day
 * it was read. The mapping is those statements, reduced to one of three buckets
 * — plus a fourth state that is not a bucket at all, below:
 *
 *   training  — the crawl feeds model training. GPTBot ("content that may be
 *               used in training our generative AI foundation models"),
 *               ClaudeBot ("could potentially contribute to their training"),
 *               Google-Extended (Gemini training).
 *   search    — the crawl builds an index that decides whether you are SHOWN.
 *               OAI-SearchBot ("is for search"), PerplexityBot ("surface and
 *               link websites in search results ... not used to crawl content
 *               for AI foundation models"), Claude-SearchBot ("improve search
 *               result quality").
 *   assistant — fetched because a user asked, at the moment they asked.
 *               ChatGPT-User, Perplexity-User, Claude-User.
 *
 * 🔴 GOOGLE-EXTENDED IS THE ONE THAT DOES NOT FIT CLEANLY, and it is filed under
 * `training` with the seam named rather than smoothed over. Google's page says
 * it governs training AND "grounding (providing content from the Google Search
 * index to the model at prompt time)" — the second half is a search-shaped
 * behaviour under a training-shaped token. It is not moved to a bucket of its
 * own: that would be a label we coined for a row the vendor DID describe. The UI
 * must not present these three buckets as if every row sat squarely in one.
 *
 * 🔴 `purpose: null` IS A FOURTH STATE AND IT IS NOT A FOURTH BUCKET — the
 * distinction is the whole reason it is allowed to exist. A bucket is a claim
 * about what a crawl is for; null is the ABSENCE of such a claim, which is a
 * different kind of thing and the only honest option for three rows:
 *
 *   GoogleOther — the vendor DOES describe it, and what it says is that it
 *                 belongs to nothing: "the generic crawler that may be used by
 *                 various product teams", whose crawling preferences "don't
 *                 affect any specific product" (read 2026-09-07).
 *   Bytespider  — ByteDance publishes no reachable page at all, so there is no
 *                 statement to transcribe.
 *   cohere-ai   — no documentation page; the only statement on record is a
 *                 negative one (not crawling for foundation-model training),
 *                 which rules a bucket out without naming one.
 *
 * ⚠️ THE TEMPTATION THIS BLOCKS is filing GoogleOther under `training` because
 * it is Google's, or Bytespider under `training` because ByteDance trains
 * models. Both would be inferred from the vendor's identity rather than
 * transcribed from its words, which is the same move the rule at the top of this
 * file forbids for names. `check-crawler-mirror.ts` holds every non-null purpose
 * to having a `source`, so a bucket cannot be quietly assigned without one.
 *
 * ⚠️ WHY THIS MATTERS AT ALL, i.e. why it is not decoration: blocking a
 * training crawler and blocking a search crawler are opposite decisions wearing
 * the same word "blocked". The first withholds your text from a model that will
 * never credit you; the second removes you from the index that decides whether
 * you are cited. A panel that prints one number for "AI crawlers blocked" tells
 * a reader nothing about which of those two they just did.
 */
/**
 * 🔴 WS-EXT-TRUTH-BATCH — THE LABELS AND THE NOTES LEFT THIS FILE. They were
 * four English strings here (`PURPOSE_LABELS`, `UNSTATED_PURPOSE_LABEL`,
 * `UNSTATED_PURPOSE_NOTE`) and a reader on a Chinese panel saw all four in
 * English, because a data module cannot call `chrome.i18n` at module scope —
 * it is evaluated while the extension is still loading. The text now lives in
 * extension/_locales under `crawlerPurpose*`, and the key tables that name it
 * (`PURPOSE_LABEL_KEYS`, `PURPOSE_NOTE_KEYS`) sit in extension/sidepanel.js
 * beside `purposeHeading`, which is where scripts/check-ext-i18n.ts can resolve
 * them and hold them against the catalogue.
 *
 * 🔴 WHAT STAYED IS THE TAXONOMY, AND THAT IS THE LINE. `purpose` on each row
 * above is transcribed from the vendor's own page and is data; the words a
 * screen prints for it are copy. Splitting them that way is why there is still
 * exactly one place each lives.
 *
 * ⚠️ The `purpose: null` bucket keeps its own heading rather than joining the
 * three: "Unclassified" would read as OUR shortcoming and invite someone to
 * "finish the job" by guessing, when what is true is that the vendor has not
 * said. See `crawlerPurposeUnstated` in the catalogue.
 */

/** The ones we can actually send a request as. */
export const TESTABLE = CRAWLERS.filter((c) => c.ua !== null);

/**
 * WS-EXT-ENRICH A1 — 🔴 THE FOUR TOKENS THE SERVER-SIDE AUDIT CHECKS, AND WHY
 * THEY ARE A FLAG ON THE TABLE ABOVE RATHER THAN A SECOND ARRAY.
 *
 * The panel needs two different answers about robots.txt and they are not the
 * same question:
 *
 *   1. "Can each crawler fetch THIS page?" — over every token in the table
 *      above, resolved against the page's own path. This is the panel's own reading and it is
 *      what the Robots & sitemap screen shows.
 *   2. "Is each of the FOUR bots the audit checks blanket-blocked?" — the exact
 *      question src/diagnose/fetch.ts answers with its own AI_BOTS constant.
 *      This one exists only so the stored check and the live reading can be
 *      PAIRED. A pairing whose two sides ask different questions reports the
 *      difference between the questions as a difference about the site.
 *
 * 🔴 So the four are marked, not listed twice. A separate array would be a
 * second token table — the exact defect this change exists to remove — and it
 * would drift from the full table silently: nothing compares two arrays, whereas
 * a token that loses its flag is still one row with one spelling.
 *
 * ✅ THE MIRROR IS ENFORCED, and this paragraph used to say the opposite.
 * `scripts/check-crawler-mirror.ts` compares this export against
 * src/diagnose/fetch.ts's AI_BOTS and fails on any difference, naming the token
 * and the side. What stood here — "NOTHING ENFORCES THE MIRROR. If
 * src/diagnose/fetch.ts adds a fifth bot to its AI_BOTS, this file does not
 * fail" — was an accurate self-description of a defect when it was written, the
 * gate was built BECAUSE of it (its own docblock quotes this paragraph), and
 * nobody came back to correct the sentence afterwards. It is deleted rather than
 * annotated: a warning that a guard does not exist, sitting next to the guard,
 * teaches the next reader to go and build a second one.
 *
 * ⚠️ THAT GATE ALSO HOLDS THE OTHER MIRROR — the whole `token` column against
 * src/lib/robots-txt.ts's AI_ROBOTS_AGENTS. Adding a crawler to only one of the
 * two rosters is what left this table at nine while the main site counted
 * twenty-one, and it is now a red build rather than a quiet gap.
 */
export const SERVER_AUDIT_TOKENS = CRAWLERS.filter((c) => c.inServerAudit).map(
  (c) => c.token
);

/**
 * 🔴 Every vendor above publishes an IP allow-list so site owners can verify a
 * crawler is genuine (OpenAI gptbot.json / chatgpt-user.json / searchbot.json,
 * Anthropic bots.json, Perplexity's per-bot JSON). Our request carries the
 * right User-Agent but the USER'S OWN IP, so a site that verifies by IP is
 * SUPPOSED to reject us while admitting the real crawler. Every piece of UI
 * that reports a blocked result must say so — today that is the note emitted by
 * `renderProbe` in extension/sidepanel.js, guarded on the 'warn' bucket being
 * non-empty, which is the only place a blocked result is reported.
 *
 * 🔴 THAT POINTER USED TO READ "see VERDICT_COPY in probe.js" AND BOTH HALVES
 * WERE DEAD. Checked 2026-08-19: `extension/probe.js` does not exist and never
 * appears in this tree, and `VERDICT_COPY` occurs nowhere in the repository
 * except inside that sentence — so the one cross-reference carrying this rule
 * pointed at nothing, in a file whose whole subject is not inventing things. It
 * is the failure mode CLAUDE.md's referencing rule is about, with path AND
 * symbol both stale at once, and prose has no failing entrance to catch it.
 *
 * ⚠️ THE RULE IS CARRIED BY THAT CODE, AND THIS FILE EXPORTS NOTHING FOR IT.
 * A `true` constant used to sit under this block as if it were the switch that
 * gates the warning. It was not: the note is unconditional on the 'warn' bucket
 * and nothing here reaches it, and the constant was imported by nobody — its
 * only two occurrences in the whole tree were its own declaration and the
 * sentence pointing out that it had no readers. A boolean next to a rule reads
 * as the mechanism for that rule, so it was removed rather than left to be
 * mistaken for one (WS-EXT-PROSE-HYGIENE; `git log -S` on this file recovers
 * the name and the value). The rule loses nothing: it was always these
 * paragraphs. Its proper home is beside `renderProbe` in
 * extension/sidepanel.js, where it is actually enforced — it stays here only
 * because that file is being edited on another lane as this is written.
 */
