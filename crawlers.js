/**
 * WS-CHROME-EXT — AI crawler identities for the reachability test.
 *
 * 🔴 THIS IS NOT A COPY OF src/lib/ai-crawlers.ts. That file holds lowercased
 * SUBSTRINGS used to recognise a crawler that is calling US (middleware UA
 * match). Sending a request AS a crawler needs the vendor's full published
 * User-Agent string, which that file does not contain. Different job, different
 * data — do not "deduplicate" the two.
 *
 * 🔴 RED LINE 3 / zero hallucination: `ua` is transcribed VERBATIM from the
 * vendor's own documentation (verified 2026-07-26, sources below). A crawler
 * whose full UA the vendor does not publish gets NO `ua` and is never
 * live-tested — its robots.txt declaration is still reported, because that part
 * is a hard fact that needs no request. Nothing here is inferred from a naming
 * pattern.
 *
 *   OpenAI      https://developers.openai.com/api/docs/bots
 *   Perplexity  https://docs.perplexity.ai/guides/bots
 *   Anthropic   https://support.claude.com/en/articles/8896518
 *   Google      https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
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
 * @property {'training'|'search'|'assistant'} purpose  what the VENDOR says the
 *   crawler is for. See PURPOSE_LABELS below — this is transcribed, not inferred.
 */

/** @type {Crawler[]} */
export const CRAWLERS = [
  {
    id: 'gptbot',
    label: 'GPTBot',
    vendor: 'OpenAI',
    token: 'gptbot',
    ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot',
    skipReason: null,
    inServerAudit: true,
    purpose: 'training',
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
  },
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
  },
  {
    id: 'claudebot',
    label: 'ClaudeBot',
    vendor: 'Anthropic',
    token: 'claudebot',
    ua: null,
    skipReason:
      "Anthropic publishes the robots.txt token but not the full User-Agent string, so we won't guess one.",
    inServerAudit: true,
    purpose: 'training',
  },
  {
    id: 'claude-user',
    label: 'Claude-User',
    vendor: 'Anthropic',
    token: 'claude-user',
    ua: null,
    skipReason:
      "Anthropic publishes the robots.txt token but not the full User-Agent string, so we won't guess one.",
    inServerAudit: false,
    purpose: 'assistant',
  },
  {
    id: 'claude-searchbot',
    label: 'Claude-SearchBot',
    vendor: 'Anthropic',
    token: 'claude-searchbot',
    ua: null,
    skipReason:
      "Anthropic publishes the robots.txt token but not the full User-Agent string, so we won't guess one.",
    inServerAudit: false,
    purpose: 'search',
  },
  {
    id: 'google-extended',
    label: 'Google-Extended',
    vendor: 'Google',
    token: 'google-extended',
    ua: null,
    // Google's own wording: it "doesn't have a separate HTTP request user agent
    // string. Crawling is done with existing Google user agent strings; the
    // robots.txt user-agent token is used in a control capacity."
    skipReason:
      'Google-Extended has no User-Agent of its own — it is a robots.txt control token only, so a live request could never test it.',
    inServerAudit: true,
    purpose: 'training',
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
 * Re-read at the four documented URLs above on 2026-08-15. Each vendor states
 * the purpose in its own words; the mapping below is those statements, reduced
 * to one of three buckets:
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
 * behaviour under a training-shaped token. There is no fourth bucket because
 * inventing one would make eight crawlers share three well-attested labels and
 * one sit alone under a label we coined. The UI must not present these three
 * buckets as if every row sat squarely in one.
 *
 * ⚠️ WHY THIS MATTERS AT ALL, i.e. why it is not decoration: blocking a
 * training crawler and blocking a search crawler are opposite decisions wearing
 * the same word "blocked". The first withholds your text from a model that will
 * never credit you; the second removes you from the index that decides whether
 * you are cited. A panel that prints one number for "AI crawlers blocked" tells
 * a reader nothing about which of those two they just did.
 */
export const PURPOSE_LABELS = {
  training: 'Model training',
  search: 'Search indexing',
  assistant: 'User-triggered fetch',
};

/** The ones we can actually send a request as. */
export const TESTABLE = CRAWLERS.filter((c) => c.ua !== null);

/**
 * WS-EXT-ENRICH A1 — 🔴 THE FOUR TOKENS THE SERVER-SIDE AUDIT CHECKS, AND WHY
 * THEY ARE A FLAG ON THE TABLE ABOVE RATHER THAN A SECOND ARRAY.
 *
 * The panel needs two different answers about robots.txt and they are not the
 * same question:
 *
 *   1. "Can each crawler fetch THIS page?" — over all nine tokens, resolved
 *      against the page's own path. This is the panel's own reading and it is
 *      what the Robots & sitemap screen shows.
 *   2. "Is each of the FOUR bots the audit checks blanket-blocked?" — the exact
 *      question src/diagnose/fetch.ts answers with its own AI_BOTS constant.
 *      This one exists only so the stored check and the live reading can be
 *      PAIRED. A pairing whose two sides ask different questions reports the
 *      difference between the questions as a difference about the site.
 *
 * 🔴 So the four are marked, not listed twice. A separate array would be a
 * second token table — the exact defect this change exists to remove — and it
 * would drift from the nine silently: nothing compares two arrays, whereas a
 * token that loses its flag is still one row with one spelling.
 *
 * ⚠️ NOTHING ENFORCES THE MIRROR. If src/diagnose/fetch.ts adds a fifth bot to
 * its AI_BOTS, this file does not fail — the pairing just goes quiet about the
 * new one. Same standing as the SERVER_RULE thresholds in sidepanel.js and the
 * SAME_ORIGIN_TIMEOUT_MS pair in background.js: a comment is the mechanism.
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
