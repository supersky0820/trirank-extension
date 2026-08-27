/**
 * WS-EXT-PANEL — side-panel shell.
 *
 * The carrier, the rail, and one screen per rail row. "Not built yet" remains its own
 * wording wherever a screen is not wired up — an unbuilt screen and a measured
 * emptiness are different claims, and this file never lets one look like the
 * other.
 *
 * 🔴 This header said "the 16-dimension rail … the other fifteen screens" until
 * WS-EXT-UI ⑤, and then said "18 rows in 4 groups" until WS-EXT-PAGESPEED-BLOCK
 * added a nineteenth. Both were true when written and neither had anything
 * keeping it honest — that paragraph diagnosed the disease ("a count in a
 * comment has nothing to keep it honest") in a sentence that was itself a count
 * in a comment, and went stale the next time the rail grew.
 *
 * 🔴 SO THE COUNTS ARE GONE FROM THIS FILE RATHER THAN CORRECTED — nine of them,
 * in one pass, plus one in sidepanel.html. Bumping 18 to 19 buys one more commit
 * before the same failure; deleting the number costs nothing, because not one of
 * the nine sentences needed it to make its point. GROUPS below is the count, and
 * it is the only thing that cannot be wrong about it.
 *
 * 🔴 RED LINE 3, the four states, spelled out once here because every renderer
 * below obeys them:
 *   data          → the number, in the data face, with source + date under it
 *   a real zero   → still the number, same treatment; 0 is a measurement
 *   never measured→ an em-dash in the faint tier on a DASHED card, plus how to
 *                   get it measured. Never a 0, never an empty card.
 *   can't measure → stated as our limitation, in neutral wording and neutral
 *                   colour. It is not a finding about the site and must never
 *                   borrow the warn palette.
 *
 * 🔴 AI visibility is the default screen (`state.screen = 'aeo'`). Not an
 * overview, and not GEO in sixth place: the product's claim is AI visibility,
 * so it is what opens.
 */

import { CRAWLERS, PURPOSE_LABELS } from './crawlers.js';

const SITE = 'https://trirankai.com';

// The rail's dimensions, in four groups. `id` is the screen key; `needs` records
// what each screen reads, so the rail's status dot can be honest about what is
// knowable for that row.
const GROUPS = [
  // WS-EXT-PARITY batch 6. 🔴 First in the rail, and deliberately NOT the
  // default screen. The ruling at the top of this file is about what OPENS —
  // the product's claim is AI visibility, so that is what opens — and it stays
  // in force. What was missing was a screen that answers "how is this site
  // doing" at all, not a reason to demote the claim to second place.
  ['Summary', [['overview', 'Overview', 'summary']]],
  [
    'AI visibility',
    [
      ['aeo', 'AI visibility', 'signals'],
      ['geo', 'Structure readiness', 'signals'],
      ['crawler', 'Crawler access', 'probe'],
    ],
  ],
  // WS-EXT-PANEL-POLISH ② — 🔴 THIRD, above Site basics, and it is the GROUP
  // that moved, not its rows. Domain rating / Backlinks / Traffic estimate are
  // what a reader opens this panel wanting, and they used to sit under eleven
  // per-check rows; whether they were reachable was never the question, whether
  // anyone scrolled that far was.
  //
  // 🔴 The label and the grouping SURVIVE the move — they are not merged into
  // Site basics, and the reason is the product's, not the layout's. "What we
  // measured" and "what we cached from a vendor" is the distinction the
  // competitor's panel does not draw: AITDK prints one flat list where its own
  // checks and third-party shortcuts sit side by side, indistinguishable. A
  // merge would buy the same ordering and spend that distinction to get it.
  //
  // 🔴 And it stays BELOW AI visibility rather than going to the top. Those two
  // screens are the only ones here nobody else can produce; a generic vendor
  // metric ranked above them tells a reader the panel's own claim is the
  // secondary thing. Ordering is an argument about what this product is, and
  // "most wanted" is not the only input to it.
  [
    'External (cached)',
    [
      ['dr', 'Domain rating', 'signals'],
      ['backlinks', 'Backlinks', 'cache'],
      ['traffic', 'Traffic estimate', 'cache'],
      // WS-EXT-PAGESPEED-BLOCK — 🔴 `needs` is 'pagespeed', not 'cache', and it
      // is the only row that needed a value of its own. Every other cached row
      // is one screen reading one block, so `state.cache[id]` answers the dot.
      // This screen reads TWO blocks (lighthouse and the rendered read, two
      // vendor calls that fail independently) and there is no block named
      // 'pagespeed' to look up — a plain 'cache' row here would report an empty
      // dot on a domain that has one of the two. See railStatus.
      ['pagespeed', 'Measured page', 'pagespeed'],
    ],
  ],
  [
    'Site basics',
    [
      ['checks', 'SEO checks', 'signals'],
      ['issues', 'Issue list', 'signals'],
      ['headings', 'Heading levels', 'page'],
      ['density', 'Word density', 'page'],
      ['images', 'Images', 'page'],
      ['links', 'Links', 'page'],
      ['schema', 'Structured data', 'page'],
      ['hreflang', 'hreflang', 'page'],
      // WS-EXT-ENRICH C — renamed from 'Social tags' on PM's ruling. The screen
      // grew a favicon row and an analytics row and the old label covered
      // neither; what all four rows share is that they are the page DECLARING
      // what it is to something that is not a reader — a share card, a browser
      // tab, an analytics account. The id is untouched, so nothing keyed on
      // 'social' moves.
      ['social', 'Page declarations', 'page'],
      ['robots', 'Robots & sitemap', 'page'],
      // WS-EXT-UNKNOWN-URL — next to Robots & sitemap and not next to Links,
      // because the subject is the SERVER's behaviour, not the page's markup.
      // Every other 'page' row above reads something the document contains;
      // this one reads how the origin answers a request for a document that
      // does not exist, which no amount of reading this page can tell you.
      ['unknownurl', 'Unknown URLs', 'page'],
      ['whois', 'Whois', 'cache'],
    ],
  ],
];

const TITLES = Object.fromEntries(
  GROUPS.flatMap(([, items]) => items.map(([id, label]) => [id, label]))
);

const state = {
  screen: 'aeo',
  host: null,
  tabId: null,
  signals: null,
  signalsError: null,
  // WS-EXT-UI ① — 🔴 `null` used to mean two different things at once: "the
  // lookup has not come back yet" and "we asked, and there is nothing stored".
  // Every screen below read the second meaning out of the first, so for as long
  // as a lookup was in flight the panel printed conclusions — "No audit is
  // stored for this domain", "Couldn't reach TriRank just now" — that its own
  // answer, seconds later, made false. A load state is not a finding, and
  // neither is a missing one: 'loading' | 'ok' | 'error' says which of the three
  // we are in, and no renderer may state an absence while it is 'loading'.
  signalsState: 'idle',
  cacheState: 'idle',
  // Batch 2 — what the page itself told us, read after its JavaScript ran.
  // `state` is one of idle | running | ok | error; `error` is a tagged reason
  // so the UI can say whether the problem is the page or our own permission.
  scan: { state: 'idle', data: null, error: null, query: '' },
  // WS-EXT-LINKS-V2 — the Links table's two filter axes. 'all' is not a value
  // the data can hold, so it can never collide with a real scope/rel.
  linksFilter: { scope: 'all', rel: 'all' },
  // Batch 5 — the crawler probe.
  probe: { payload: null, error: null, awaitingGrant: false },
  // WS-EXT-PARITY batch 1 — set when the bound tab navigated somewhere we are
  // not allowed to look. Everything on screen is then the PREVIOUS page's
  // reading, and every renderer has to say so. See onNavigated().
  stale: false,
  // Batch 7 — the other cache-only read: Whois (RDAP) and Backlinks
  // (DataForSEO), both from /api/site-cache. Same posture as `signals`: what is
  // stored, or an honest "not measured".
  cache: null,
  cacheError: null,
  url: null,
  // WS-EXT-BEHAVIOR — the window this panel belongs to. Chrome opens the panel
  // per WINDOW (background.js calls sidePanel.open with a windowId and never
  // sets a per-tab option), so a second window has its own panel document with
  // its own copy of this state. onActivated fires for EVERY window, so without
  // this the user switching tabs over there would close the panel over here.
  // It survives a url-only reload of state because a tab cannot change windows
  // by navigating.
  windowId: null,
};

const $ = (id) => document.getElementById(id);

/** Build an element. Children that are strings are set as TEXT, never HTML. */
function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const c of children) {
    if (c === null || c === undefined) continue;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

/**
 * WS-EXT-NULL-APPEND-SWEEP — the only way this file hands children to a node it
 * did not build with `el`.
 *
 * 🔴 WHY IT HAS TO EXIST AT ALL. `el` above drops a null child on purpose, so
 * `el('div', null, cond ? x : null)` is safe and reads as safe. `append` is the
 * RAW DOM call, and its argument is the WebIDL union `(Node or DOMString)`,
 * which has NO nullable member — so a null is converted to the DOMString
 * "null" and inserted as a text node. The two calls look identical at the call
 * site, take the same-shaped arguments, and disagree about exactly one value.
 *
 * 🔴 THIS IS NOT HYPOTHETICAL. On 2026-08-26 a reader on vercel.com saw the word
 * `null` printed under "Top gaps from the stored audit · 1". It was not a gap
 * with an empty body — a null INSIDE that list would have thrown in the map, not
 * printed — it was the truncation note's `: null` else-branch, handed straight
 * to `box.append` and stringified. `004929c` fixed that one site with a spread;
 * this helper replaces the spread so all five read the same way, because a fix
 * that only one of five sites wears is a fix the next author will not copy.
 *
 * ⚠️ IT FILTERS `false` TOO, so `cond && el(...)` is safe here as well. That is
 * deliberate: the two conditional idioms produce different falsy values and a
 * helper that only knew about one of them would be a trap wearing a safe name.
 * Everything else — including the empty string — is passed through untouched,
 * because a caller that means to append text is not making this mistake.
 */
function appendSome(parent, ...parts) {
  for (const part of parts) {
    if (part === null || part === undefined || part === false) continue;
    parent.append(part);
  }
  return parent;
}

/**
 * WS-EXT-UI ② — the one rule for numbers: a number is never cut.
 *
 * 🔴 Half a number is worse than no number. "#2,951,9" is a rank that does not
 * exist, and a reader has no way to tell it from one that does — unlike a dash,
 * which says plainly that we have nothing. So where the exact figure cannot fit
 * its card it is ABBREVIATED rather than clipped, and the abbreviation wears a
 * K/M suffix so nobody reads the short form as the measurement. The exact
 * figure is not lost: it stays on the element as its title.
 *
 * The threshold is the digit count, not the container: seven digits is where a
 * grouped figure stops fitting the narrowest card this panel draws, and a rule
 * the reader can predict beats one that changes as they drag the panel.
 */
const EXACT_NUM = new Intl.NumberFormat('en-US');
/**
 * WS-EXT-TRAFFIC-CHART — the abbreviation carries three significant digits.
 *
 * 🔴 `maximumFractionDigits: 1` alone leaves one or two significant digits once
 * a value is compacted, which prints figures that genuinely differ as one
 * identical string. Measured against every value this panel abbreviates from
 * production (27 cached domains): harvey.ai's 1,118,775 and 1,134,795 both read
 * "1.1M", and invoicesimple.com's three months — 1,981,644 / 1,951,660 /
 * 1,969,305 — all read "2M". `morePrecision` keeps whichever rule yields more
 * digits, so this is a strict SUPERSET of what stood here: 9 strings change
 * across those domains and none loses a digit.
 *
 * 🔴 SUPERSET OF WHAT, precisely: of THIS panel's prior rule. /site's chart runs
 * the same two keys, but transplanting its formatter wholesale would have been a
 * REGRESSION here, because /site compacts every value while this panel prints
 * anything under ABBREVIATE_FROM exactly — that swap turns the exact 963,230
 * into "963.2K" and the exact 1,315 into "1.32K", which is the degrade-a-correct
 * number case /site's own comment names. Only the abbreviation branch changes;
 * below the threshold nothing does.
 */
const SHORT_NUM = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
  maximumSignificantDigits: 3,
  roundingPriority: 'morePrecision',
});
const ABBREVIATE_FROM = 1000000;

function figure(n, prefix = '') {
  const exact = `${prefix}${EXACT_NUM.format(n)}`;
  return Math.abs(n) >= ABBREVIATE_FROM
    ? { text: `${prefix}${SHORT_NUM.format(n)}`, title: exact }
    : { text: exact, title: null };
}

/** A figure rendered in the data face, carrying its exact value if abbreviated. */
function numCell(className, n, prefix = '') {
  const f = figure(n, prefix);
  const node = el('span', className, f.text);
  if (f.title) node.title = f.title;
  return node;
}

/**
 * WS-EXT-PANEL-UX A-2 — the rank cell on the Backlinks screen's referring-domain
 * table, where a 0 is the ordinary case rather than the edge one.
 *
 * 🔴 THE DIGIT IS NOT REPLACED BY A WORD, and that is a deliberate narrowing of
 * what was asked for. The dispatch's premise was "DataForSEO returns 0 for
 * unknown/unrated", which would make "unranked" the honest label. Two readings
 * of the repo say otherwise and neither could be dismissed:
 *
 *   · the vendor's own definition of the field is "rank volume that a referring
 *     website passes to the target", on a 0–100 scale under
 *     rank_scale:'one_hundred' (what src/lib/dataforseo.ts sends). It defines no
 *     sentinel, and 0 is inside the scale it defines.
 *   · this repo already ruled on the same question for the sibling endpoint:
 *     pickBestProspectColumn in src/lib/dataforseo.ts refuses to coerce a
 *     missing rank to 0 because that "would let it win against A REAL 0".
 *
 * So printing "unranked" over a stored 0 would assert an absence we cannot
 * demonstrate — the mirror image of the fabrication red line 3 forbids, and on
 * the one screen whose whole job is to say where a number came from.
 *
 * 🔴 WHAT THE READER ACTUALLY NEEDED IS DELIVERED ANYWAY, by the two things
 * that were genuinely missing rather than by relabelling the value: the column
 * header says which number this is, and the sentence above the table gives the
 * scale and says what a 0 means. Once "0–100, higher is better" is on screen, a
 * 0 cannot be read as "first place" and the tier below cannot be read as data
 * we failed to fetch. The demotion here is the same device `.term.empty` and
 * `.lvltag.est` already use: it says "this is not a value worth acting on"
 * without saying "there is no value".
 *
 * Measured against production D1 on 2026-08-11, all six stored rows: 54
 * referring-domain records, 30 of them at rank exactly 0, and ZERO with a null
 * rank — so the em-dash branch below has never once been reached by real data,
 * while this one carries more than half of every table this screen draws.
 * turbo0.com is the specimen that made the question worth asking at all: rank
 * 29 on 2026-07-17, rank 0 on 2026-08-10, same domain, same endpoint.
 */
function rankCell(rank) {
  if (rank === null) return el('span', 'lvltag', '—');
  if (rank === 0) {
    const cell = el('span', 'lvltag zero', '0');
    cell.title =
      'Passes no rank to this domain — the bottom of the 0–100 scale, not a missing measurement.';
    return cell;
  }
  return numCell('lvltag', rank);
}

/**
 * WS-EXT-UI ② — the one rule for text: a value that had to be cut stays
 * reachable.
 *
 * 🔴 Deliberately central and measured, not a title= added at each call site.
 * Every previous "add it where it is missing" pass in this panel has ended with
 * one more place that was missed, and this one has ~14 call sites across eight
 * screens. It also has to survive the drag: a value that fits at 700px is cut
 * at 320px, so the answer cannot be decided once at render time.
 *
 * The title is set only where the text ACTUALLY overflows — a tooltip that
 * repeats a fully visible label is noise — and removed again when a wider drag
 * makes it fit.
 */
const CLIPPABLE = '.term, .ovlabel, .lvltag, .host, .ldkey';

function annotateClipped(root) {
  for (const e of root.querySelectorAll(CLIPPABLE)) {
    const full = e.dataset.full ?? e.textContent;
    if (e.scrollWidth > e.clientWidth + 1) {
      e.dataset.full = full;
      e.title = full;
    } else if (e.title) {
      e.removeAttribute('title');
    }
  }
}

// Dates are formatted in en-US because the panel's copy is English; following
// the host locale would render "7月24日" inside an English sentence.
function shortDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

/**
 * 🔴 The only value footer in this file. A number without a source and a date
 * is a number the reader cannot check, so this returns the "no measurement
 * stored" line rather than nothing when either is missing.
 */
function sourceLine(source, iso) {
  const when = iso ? shortDate(iso) : null;
  return el(
    'p',
    'meta',
    source && when
      ? `Source: ${source} · measured ${when}`
      : 'No measurement stored'
  );
}

/**
 * WS-EXT-UI ① — the state that has to exist before any of the four below can be
 * told apart: we are still looking.
 *
 * 🔴 It is deliberately NOT a dashed card. Dashed means "we asked and there is
 * nothing stored", which is a claim about the domain; this is a claim about us,
 * and the two must not share a treatment. It prints no number, no dash and no
 * verdict — the em-dash is the "never measured" symbol and would be read as one.
 */
function reading(what) {
  return el(
    'div',
    'card readingcard',
    el('span', 'readingbar'),
    el('div', 'label', 'Reading…'),
    el(
      'p',
      'prose',
      `Looking up ${what}${state.host ? ` for ${state.host}` : ''}. Nothing on this screen is a finding yet.`
    )
  );
}

/** data / real zero → the number. Never measured → dash on a dashed card. */
function scoreCard(opts) {
  const { value, label, unit, source, checkedAt, extra, howTo } = opts;
  const measured = typeof value === 'number' && Number.isFinite(value);
  const card = el('div', measured ? 'card' : 'card dashed');
  const n = el(
    'div',
    measured ? 'num hero' : 'num hero dash',
    measured ? String(value) : '—'
  );
  if (measured && unit) n.append(el('span', 'unit', unit));
  card.append(n, el('div', 'label', label));
  if (measured) {
    if (extra) card.append(extra);
    card.append(sourceLine(source, checkedAt));
  } else {
    card.append(
      sourceLine(source, null),
      el('p', 'prose', howTo ?? 'Run a free audit to fill this in.')
    );
  }
  return card;
}

function metricRow(label, value, source, checkedAt) {
  const measured = typeof value === 'number' && Number.isFinite(value);
  const card = el('div', measured ? 'card' : 'card dashed');
  card.append(
    el(
      'div',
      'row',
      el('span', 'label', label),
      el(
        'span',
        measured ? 'num md' : 'num md dash',
        measured ? String(value) : '—'
      )
    ),
    sourceLine(source, measured ? checkedAt : null)
  );
  return card;
}

// --- screens ---------------------------------------------------------------

function screenAeo() {
  const box = document.createDocumentFragment();
  box.append(el('h1', 'title', 'AI visibility'));

  const s = state.signals;
  if (state.signalsState === 'loading') {
    box.append(reading('the stored AI-citation check'), entryLinks());
    return box;
  }
  if (!s) {
    box.append(
      el(
        'div',
        'card dashed',
        el('div', 'label', 'Nothing read yet'),
        el(
          'p',
          'prose',
          state.signalsError === 'rate_limited'
            ? "You've hit today's lookup limit. It resets tomorrow — nothing about this site is implied by it."
            : "Couldn't reach TriRank just now. This says nothing about the site; it is our lookup that failed."
        )
      ),
      // WS-EXT-EMPTY-STATE — 🔴 THE HIGHEST-PRIORITY ONE OF THESE, because this
      // screen is the default (`state.screen = 'aeo'`). A first-time reader whose
      // lookup fails lands HERE, not on Overview, and until now this branch
      // returned a dashed card and nothing to do about it. Same trio, same shape
      // as the Overview branch and as 4ca768d's two backlink states.
      //
      // Actionable in both halves, checked not assumed: the limit that produces
      // this card is `site-signals` (60/IP/day), a different tool key from the
      // audit's `domain-overview-usd6` / `free_audit_citation`, so a reader who
      // has exhausted the panel's reads can still run the audit.
      entryLinks()
    );
    return box;
  }

  const c = s.citation;

  box.append(
    scoreCard({
      value: c.state === 'scored' ? c.score : null,
      unit: '/100',
      label: 'Weighted citation score',
      source: c.source,
      checkedAt: c.checkedAt,
      // 🔴 WS-EXT-CONTENT ④ — the four engines used to ride inside this card as
      // pills whose only verdict was a colour. They now have their own block
      // below, with the verdict in words. One fact, one place.
      howTo:
        c.state === 'partial'
          ? `Not every engine has answered yet${
              Array.isArray(c.missing) && c.missing.length
                ? ` — still missing ${c.missing.join(', ')}`
                : ''
            }. A partial set is not a low score, so no number is shown until it is complete.`
          : 'No AI-citation check is stored for this domain yet. The free audit runs every engine this score needs.',
    })
  );

  if (c.state === 'scored') {
    box.append(
      el(
        'p',
        'qual',
        'This is what AI engines actually cited, weighted by each engine’s referral share — not a readiness estimate. Structure readiness is the next dimension.'
      )
    );
  }
  box.append(citationDetail(c), entryLinks());
  return box;
}

// The four engines the citation score is folded from, in the order the panel
// has always listed them. The API sends LABELS, so these are the strings it
// sends — not ids.
const CITATION_ENGINES = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity'];

/**
 * 🔴 Copied from src/lib/citation-score.ts (STALENESS_CAP_DAYS = 14). If that
 * constant moves, THIS MUST MOVE WITH IT — same standing as the thresholds in
 * SERVER_RULE above, and the same reason: a rule stated to the user has to be
 * the rule the server actually applies, and there is nothing but this comment
 * holding the two together.
 *
 * 🔴 This is the SECOND value copied out of the app into the extension (the
 * first is the token set in tokens.css, which at least has a paste-and-run
 * drift check). A third should be a reason to send these down the API instead
 * of copying them again.
 */
const CITATION_STALENESS_DAYS = 14;

/**
 * WS-EXT-CONTENT ④ — what the score is, and when it stops existing.
 *
 * 🔴 Neither sentence below is decoration for an empty screen. Both are
 * mechanics of our own that the panel was silent about:
 *
 *   · the date printed under the score is the OLDEST of the four readings, not
 *     the day the four ran (citation-score.ts: "checkedAt = oldest of the four
 *     — conservative"). The panel printed it flat, so "measured Jul 21" read as
 *     the day all four were measured. Red line: every number carries when it
 *     was measured — a timestamp that is not the one it appears to be fails
 *     that quietly.
 *
 *   · the score DISAPPEARS on its own. An engine's newest reading older than
 *     the staleness cap counts as unanswered; under four fresh readings there
 *     is no score at all. Nothing about the site has to change. A user who
 *     watches a number vanish and is told nothing will conclude their site got
 *     worse.
 *
 * 🔴 And the sentence about refreshing is deliberately about THIS SOURCE, not
 * about the product: watchlist domains genuinely are re-probed weekly by the
 * engine's cron — into a different table, which this panel cannot read. "We do
 * not re-probe" would be false; "nothing refreshes this source" is true.
 */
/**
 * 🔴 An engine row is NOT an audit check and does not borrow checkCard: that
 * function's chip says Pass / Fail / Not measurable, and this one has to say
 * Cited / Not cited. Passing a different word into it would have meant a
 * seventh parameter and a chip whose text no longer matches its status — the
 * kind of near-fit that ends with two vocabularies wearing one set of clothes.
 *
 * "Not cited" takes the warn treatment because it IS a measured shortfall about
 * the site, which is the one thing warn has always meant here. Both partial-state
 * rows take the neutral one, because in that state we are showing no verdict at
 * all — only which engines are still out.
 */
const ENGINE_VERDICT = {
  cited: { cls: 'ok', glyph: '✓', word: 'Cited' },
  not_cited: { cls: 'warn', glyph: '✕', word: 'Not cited' },
  answered: { cls: 'stale', glyph: '·', word: 'Answered' },
  no_answer: { cls: 'stale', glyph: '–', word: 'No answer yet' },
};

function engineRow(kind, name, detail) {
  const v = ENGINE_VERDICT[kind];
  return el(
    'li',
    'checkcard',
    el(
      'div',
      'checkhead',
      el('span', 'checkname', el('b', null, name)),
      el(
        'span',
        `chip ${v.cls}`,
        el('span', 'glyph', v.glyph),
        el('span', null, v.word)
      )
    ),
    detail ? el('p', 'checkdetail', detail) : null
  );
}

function citationDetail(c) {
  if (c.state !== 'scored' && c.state !== 'partial') return null;
  const cited = Array.isArray(c.cited) ? c.cited : [];
  const missing = Array.isArray(c.missing) ? c.missing : [];

  const list = el('ul', 'checks');
  for (const name of CITATION_ENGINES) {
    // 🔴 In the partial state the reading carries `missing` and nothing else —
    // no per-engine verdict for the ones that DID answer. So those rows say
    // they answered and stop there. Guessing "cited" from a score that is not
    // being shown yet would be inventing the one number this screen is about.
    const kind =
      c.state === 'scored'
        ? cited.includes(name)
          ? 'cited'
          : 'not_cited'
        : missing.includes(name)
          ? 'no_answer'
          : 'answered';
    const detail =
      c.state === 'scored'
        ? null
        : kind === 'no_answer'
          ? 'This engine has not returned a reading, so the set is incomplete and no score is shown.'
          : 'This engine answered. Its verdict is shown once all four have.';
    list.append(engineRow(kind, name, detail));
  }

  const box = document.createDocumentFragment();
  box.append(
    el('span', 'caps', `Per engine · ${CITATION_ENGINES.length}`),
    list
  );
  if (c.state === 'scored') {
    box.append(
      el(
        'p',
        'meta',
        `The date under the score is the oldest of these four readings, not the day all four ran — the score is at least that fresh, and parts of it may be fresher.`
      )
    );
  }
  box.append(
    el(
      'p',
      'meta',
      `A reading stops counting after ${CITATION_STALENESS_DAYS} days: that engine goes back to unanswered, and with fewer than four fresh readings no score is shown at all. Nothing about the site has to change for that to happen.`
    ),
    el(
      'p',
      'meta',
      // 🔴 WS-EXT-WATCHLIST NARROWED THIS SENTENCE, AND DELIBERATELY DID NOT
      // REPLACE IT WITH "you are tracking this".
      //
      // It used to say "Nothing refreshes this reading on a schedule", flat.
      // That was true while the panel had no way to start anything — and the
      // "Track this domain" link in `entryLinks` makes it reachable to be
      // standing here, having just set up a weekly sweep, being told nothing
      // refreshes. Two of our own surfaces contradicting each other.
      //
      // 🔴 THE PANEL CANNOT KNOW WHETHER THE USER ACTUALLY ADDED IT. The link
      // opens a browser tab; there is no receipt, no callback, and this
      // extension holds no session it could ask with. So the honest move is not
      // to claim a state we cannot observe — it is to say exactly what this
      // number is and stop short of the user's account. "If you have set up
      // weekly monitoring" is a conditional the reader can resolve and we
      // cannot, which is the accurate division of knowledge here.
      //
      // ⚠️ It also stays true for every reader who never clicks: the weekly
      // sweep writes `watchlist_snapshot`, and THIS reading comes from the
      // citation cache. Tracking a domain genuinely does not refresh this
      // number — the two live in different tables and the panel can only read
      // one of them.
      'Nothing refreshes this reading on a schedule. It exists because someone ran the free audit or the free AI-visibility check, and a newer one appears only when someone runs it again. Weekly monitoring, if you have set it up, is tracked separately on the site and does not update this reading.'
    )
  );
  return box;
}

function screenGeo() {
  const box = document.createDocumentFragment();
  box.append(el('h1', 'title', 'Structure readiness'));
  const a = state.signals?.audit;
  const measured = a?.state === 'measured';
  // The live page read is independent of this lookup and often lands first, so
  // only the stored half waits — the client checks below still render.
  box.append(
    state.signalsState === 'loading'
      ? reading('the stored GEO structure score')
      : scoreCard({
          value: measured ? a.geoScore : null,
          unit: '/100',
          label: 'GEO structure score',
          source: a?.source,
          checkedAt: a?.checkedAt,
          howTo:
            'Nothing stored for this domain. The free audit parses the homepage and fills this in.',
        }),
    el(
      'p',
      'qual',
      'Being built for AI to cite you is not the same as AI citing you. This number is the first layer; the AI visibility screen is the second.'
    )
  );
  // 🔴 The checks that produced the number, not a second opinion about it. Only
  // four of the five are scored — "AI citation tracking" is carried as
  // needs_connection precisely so the score is not quietly computed over a
  // measurement we never made.
  const checks = auditChecks('geo');
  if (checks?.length) box.append(checkList(checks));
  // Batch 4 — the client-only entity checks, kept BELOW the stored ones and
  // under their own heading. Above them is what produced the score; this is
  // what the score never saw.
  const client = clientCheckSection();
  box.append(client ?? clientCheckUnavailable());
  box.append(entryLinks());
  return box;
}

/**
 * WS-EXT-CLOSEOUT ⑤ — what this screen shows when the live half cannot be read.
 *
 * 🔴 IT PRINTED NOTHING, AND NOTHING IS THE ONE THING IT MUST NOT PRINT. The
 * stored score rendered, the stored checks rendered, and ten client checks —
 * brand consistency, sameAs, author and date, freshness, HTTPS, URL shape,
 * standing pages, question headings, lists and tables, and server-rendered
 * content — silently were not there. No false sentence was on screen; a false
 * COMPLETENESS was, which is worse to catch because there is nothing to
 * disagree with.
 *
 * 🔴 This screen is also the reason it went unnoticed: it is the only one of
 * the nine that reads the page and has no scan button, because its top half is
 * the stored audit and needs none. So the failure had no button to fail
 * against — the other eight screens surface a scan error through `scanButton`,
 * and this one had nowhere to put it.
 *
 * The button is reused rather than reinvented: it already renders "Reading the
 * page…" while a scan is running, the tagged SCAN_ERROR copy on failure, and
 * its own sentence when the tab navigated away and Chrome withdrew access. All
 * three states were reachable here and none of them was reachable ON here.
 */
function clientCheckUnavailable() {
  const box = document.createDocumentFragment();
  const why =
    state.scan.state === 'running' || state.scan.state === 'idle'
      ? 'They are being read now.'
      : state.stale
        ? 'The page moved on before we could read it.'
        : state.scan.state === 'error'
          ? 'We could not read the page this time.'
          : 'This page gave us nothing to read them from.';
  box.append(
    el('span', 'caps', 'Read from this page · not in the score'),
    el(
      'p',
      'qual',
      `Ten more checks belong here — brand name, sameAs links, author and date, freshness, HTTPS, URL shape, contact/privacy/terms, question-shaped headings, lists and tables, and whether this page is server-rendered. ${why} None of them is in the score above, so nothing here is missing from that number — but their absence from this screen is our reading failing, not this page lacking them.`
    ),
    scanButton('Read this page again')
  );
  return box;
}

/**
 * WS-EXT-PARITY batch 2 — the stored audit's per-check list.
 *
 * 🔴 Four statuses, four treatments, and 'needs_connection' is the one that has
 * to stay out of the warn palette: "we could not measure this in-Worker" is our
 * limitation, not a finding about the site. It is excluded from the score at the
 * source (diagnose/core.ts scores over the other three only), so showing it in
 * red would contradict the number printed above it.
 */
// WS-EXT-PARITY batch 8 — `glyph` joins dot and word so a verdict is carried by
// SHAPE as well as by colour. The dot alone met the 3:1 non-text threshold, but
// it still asked a reader to tell four hues apart at 7px; a tick and a cross do
// not depend on that, and the two neutral states share one mark because they
// are one idea (nothing was measured) reached two ways.
const CHECK_STATUS = {
  pass: { dot: 'ok', word: 'Pass', glyph: '✓' },
  partial: { dot: 'partial', word: 'Partial', glyph: '~' },
  fail: { dot: 'warn', word: 'Fail', glyph: '✕' },
  needs_connection: { dot: 'stale', word: 'Not measurable here', glyph: '–' },
  // WS-EXT-PARITY batch 4 — a client check that had nothing to read. Same
  // neutral treatment as needs_connection and for the same reason: an absent
  // input is our limitation for that row, not a verdict on the site.
  not_measured: { dot: 'stale', word: 'Not measured', glyph: '–' },
};

/**
 * WS-EXT-PARITY batch 8 — one check, rendered as a card.
 *
 * 🔴 The order is the structure and it does not change: the verdict is first,
 * what we measured second, why it matters third, and any raw table stays below
 * the whole list. Density comes from binding those three into one block with a
 * status chip carrying the mark, not from hiding the detail or promoting the
 * argument above the finding.
 */
function checkCard(status, label, detail, why, live, tag) {
  const s = CHECK_STATUS[status] ?? CHECK_STATUS.not_measured;
  const chip = el(
    'span',
    `chip ${s.dot}`,
    el('span', 'glyph', s.glyph),
    el('span', null, s.word)
  );
  // WS-EXT-CONTENT ① — an optional origin tag. Only the issue list passes one:
  // it is the single screen that mixes both dimensions, so a row there has to
  // say which audit it came from. The two per-dimension screens do not, because
  // on those the whole screen already answers it.
  const name = el(
    'span',
    'checkname',
    el('b', null, label),
    tag ? el('span', 'checkstatus', tag) : null
  );
  return el(
    'li',
    'checkcard',
    el('div', 'checkhead', name, chip),
    detail ? el('p', 'checkdetail', detail) : null,
    live,
    why ? el('p', 'checkwhy', why) : null
  );
}

/**
 * WS-EXT-PARITY batch 3 — the same-named readings this panel already holds.
 *
 * 🔴 Aggregating is not copying. Every entry below names a stored check and the
 * live reading of the SAME NAMED THING, so the panel can put them next to each
 * other instead of listing the same concern twice in two screens and letting a
 * reader conclude it was checked twice.
 *
 * 🔴 No entry produces a verdict. Each returns the raw reading; the stored
 * check keeps its own status, and the difference — if there is one — is left
 * visible rather than being graded. A client-side pass/fail here would be a
 * second scoring system nobody asked for, and it would sit under a GEO score
 * that was computed without it.
 *
 * `where` says what kind of comparison is even possible:
 *   'page'     → both sides describe A PAGE, so they only line up when the user
 *                is on the page the audit ran against.
 *   'siteFile' → both sides describe a file at the site root. Comparable from
 *                anywhere on the site — but fetched over two different networks.
 */
const PAIRED = {
  // WS-EXT-ENRICH B-B — 🔴 THE COUNT IS RESIDENT NOW, ON BOTH, AND AGAINST THE
  // SAME LIMIT THE RULE ALREADY USES.
  //
  // The stored check only ever prints a number when it FAILS the length test
  // ("Title is 72 chars (aim for ≤60)"); on the pass path its detail is the
  // words "a good length" and no figure at all. So a reader who wanted to know
  // how much room was left had to trip the limit to find out. Meanwhile the
  // limit itself was being applied on every render — SERVER_RULE compares
  // against 60 and 160 to decide whether the two readings agree — and never
  // shown.
  //
  // 🔴 `52/60` IS NOT A SECOND VERDICT. Both numbers are already in this file:
  // the count is the reading, and the denominator is the server's own threshold
  // transcribed in SERVER_RULE directly below. Nothing new is being judged; a
  // measurement that was computed and discarded is now printed. The row's
  // status still comes from the stored check, as everywhere in PAIRED.
  'seo.meta.title': {
    where: 'page',
    read: (d) =>
      d.head?.title
        ? `${d.head.title.length}/60 chars — “${d.head.title}”`
        : 'no title tag',
  },
  'seo.meta.description': {
    where: 'page',
    read: (d) =>
      d.head?.metaDescription
        ? `${d.head.metaDescription.length}/160 chars`
        : 'no meta description',
  },
  'seo.indexable.canonical': {
    where: 'page',
    read: (d) => d.head?.canonical ?? 'no canonical tag',
  },
  'seo.indexable.noindex': {
    where: 'page',
    read: (d) =>
      d.head?.metaRobots ? `robots: ${d.head.metaRobots}` : 'no robots meta',
  },
  'seo.mobile.viewport': {
    where: 'page',
    read: (d) => (d.head?.viewport ? 'viewport present' : 'no viewport meta'),
  },
  'seo.headings.h1': {
    where: 'page',
    read: (d) => `${d.headings.counts.h1} H1`,
  },
  'seo.meta.og': {
    where: 'page',
    read: (d) => `${d.social.ogCount} Open Graph tag(s)`,
  },
  'seo.meta.twitter': {
    where: 'page',
    read: (d) => `${d.social.twitterCount} Twitter card tag(s)`,
  },
  'seo.schema.jsonld': {
    where: 'page',
    read: (d) =>
      d.schema.jsonLdTypes.length
        ? [...new Set(d.schema.jsonLdTypes)].join(', ')
        : 'no JSON-LD',
  },
  'seo.schema.breadcrumb': {
    where: 'page',
    read: (d) =>
      d.schema.hasBreadcrumb ? 'BreadcrumbList present' : 'no BreadcrumbList',
  },
  'seo.links.internal': {
    where: 'page',
    read: (d) => `${d.links.internal} internal link(s)`,
  },
  'seo.images.alt': {
    where: 'page',
    read: (d) =>
      d.images.total === 0
        ? 'no images'
        : `${d.images.total - d.images.withAlt} of ${d.images.total} without alt`,
  },
  'geo.faq': {
    where: 'page',
    read: (d) => (d.schema.hasFaqPage ? 'FAQPage present' : 'no FAQPage'),
  },
  // WS-EXT-CANT-VS-ISNT 笔二 — 🔴 THESE TWO WERE THE HALF THAT DID NOT GET
  // FIXED, AND THAT IS WHY THEY WERE HARD TO SEE.
  //
  // A2 taught `geo.llms` directly below to say "our request failed … not read,
  // not absent", and taught the Robots & sitemap screen's own verdicts the same
  // sentence. These two read the SAME THREE FIELDS from the SAME payload and
  // kept saying `not reachable (no response)` — where "no response" is just
  // `status ?? …`, i.e. the string a timeout, a DNS failure and a CORS refusal
  // all collapse into. A statement about the site, produced by our request
  // failing.
  //
  // ⚠️ The consequence was not one bad sentence but TWO SCREENS DISAGREEING:
  // on the same timeout, Robots & sitemap said "That is our request failing,
  // not proof the file is missing" while SEO checks said "not reachable". A
  // reader holding both has to decide which of our screens to believe.
  //
  // 🔴 `not reachable` IS STILL CORRECT FOR A STATUS. A 404 or a 503 is the
  // server answering, and that answer is a fact about the site — so the branch
  // survives, and only the case where nothing answered at all is re-attributed.
  'seo.indexable.robots': {
    where: 'siteFile',
    read: (d) =>
      d.robots.ok
        ? 'reachable'
        : d.robots.clientOnly?.fetchError
          ? `our request failed (${d.robots.clientOnly.fetchError}) — not read, not absent`
          : `not reachable (${d.robots.status ?? 'no response'})`,
  },
  'seo.indexable.sitemap': {
    where: 'siteFile',
    read: (d) =>
      d.sitemap.ok
        ? 'reachable and looks like a sitemap'
        : d.sitemap.clientOnly?.fetchError
          ? `our request failed (${d.sitemap.clientOnly.fetchError}) — not read, not absent`
          : `not reachable (${d.sitemap.status ?? 'no response'})`,
  },
  // 🔴 The key is `geo.llms`, from buildGeoChecks in src/diagnose/core.ts —
  // NOT `aeo.llms`, which is the same-named check in src/diagnose/geo-checklist.ts
  // behind the public /tools/geo-checklist page. That one never reaches this
  // panel, and a mis-keyed entry fails silently: PAIRED[c.key] is just
  // undefined, so the row renders exactly as it does today with no live half
  // and nothing to notice.
  //
  // 🔴 FOUR readings, because the stored check has four outcomes to line up
  // with. Its rule is ok && status < 400 && text.trim() non-empty, so a served
  // but BLANK llms.txt is a fail there; folding that into "present" here would
  // put the pair permanently out of step on every empty file. `ok === false` at
  // a 2xx status can only be the blank case, which is why it is sayable without
  // a second field.
  //
  // 🔴 `d.llms.ok` is NOT optional-chained, deliberately. A scan payload from
  // before this shipped has no `llms` at all; letting that throw hands the row
  // to the caller's catch and prints no live reading, which is correct. With
  // `d.llms?.status` the missing-field case would slide into the `< 400` branch
  // and print "present but empty" for a file nobody looked at.
  // 🔴 WS-EXT-ENRICH A2 — A FIFTH READING, AND IT IS NOT A FIFTH OUTCOME OF THE
  // STORED CHECK. The four above line up with the stored check's four; this one
  // says the read never happened. `not reachable (no response)` is a statement
  // about the SITE, and it was being printed for a timeout on our side — the
  // one case where the two sides of this pairing differ for a reason that has
  // nothing to do with the file. Naming it keeps the other four honest.
  //
  // 🔴 Still no verdict, as everywhere in PAIRED: this is the raw reading, the
  // stored check keeps its own status, and geo.llms has no SERVER_RULE entry so
  // nothing here reaches the Overview comparison.
  'geo.llms': {
    where: 'siteFile',
    read: (d) =>
      d.llms.ok
        ? 'present'
        : d.llms.status !== null && d.llms.status < 400
          ? 'present but empty'
          : d.llms.clientOnly?.fetchError
            ? `our request failed (${d.llms.clientOnly.fetchError}) — not read, not absent`
            : `not reachable (${d.llms.status ?? 'no response'})`,
  },
  // 🔴 Paired, NOT reimplemented as a client-only check: the server's rule is a
  // regex over hrefs and the scan applies that same regex. Writing a better
  // about-page rule here would have produced two checks that disagree by design.
  //
  // 🔴 THE SAME REGEX IS NOT AUTOMATICALLY THE SAME MEASUREMENT, and this
  // comment once claimed it was. The regex is identical; what it runs over has
  // to be made identical too, and for three href shapes it was not:
  //
  //   #about-us                        server: true   scan: false
  //   mailto:x@y.com?subject=about-us  server: true   scan: false
  //   tel:+1-about-us                  server: true   scan: false
  //
  // ✅ CLOSED ON THE SERVER SIDE (WS-METHODOLOGY-SCOPE). METHODOLOGY_RE now runs
  // only on hrefs `classifyLink` counted as links, so all three read false on
  // both sides. The server moved rather than this scan because the server was
  // contradicting ITSELF: the same `#about-us` was excluded from its own
  // internal/external link counts and simultaneously recorded as a link to an
  // editorial page. This scan's two answers already agreed, and its `continue`
  // is load-bearing for the link COUNTS that pair with the server's — moving it
  // would have traded a small divergence for a larger one.
  //
  // ⚠️ ONE SHAPE STILL DIFFERS, IN THE OPPOSITE DIRECTION, and it is named here
  // rather than left to be rediscovered. The `continue` above covers only
  // empty/`#`/`mailto:`/`tel:`, and the nav matching below runs BEFORE scope is
  // computed — so `javascript:...about-us` or `ftp://x/about-us` still reaches
  // the matcher here, while classifyLink now rejects it there. Measured over the
  // 24 audited domains that could be fetched: of 13 hrefs matching this regex,
  // 13 are ordinary links and zero are any null-shape at all. Same production
  // count as the divergence that was closed — none.
  //
  // 🔴 WHY IT STAYED HIDDEN, which is the part worth keeping. Disagreement is
  // this pairing's ORDINARY output: the stored side read pre-JS HTML, this side
  // reads the DOM after JavaScript ran, so a reader already expects the two to
  // differ. A rule drift is shaped exactly like the difference the screen exists
  // to show. Nothing surfaced it until both sides were run against one input
  // set, and nothing will surface the next one either.
  'geo.methodology': {
    where: 'page',
    read: (d) =>
      d.pageShape?.nav?.editorial
        ? 'links to an editorial / methodology / about-us page'
        : 'no editorial, methodology or about-us link on this page',
  },
  // WS-EXT-CANT-VS-ISNT 笔二 — 🔴 NOT A WORDING FIX. THIS ONE WAS LANDING IN THE
  // WRONG BRANCH.
  //
  // `aiBotBlocked` is null whenever the robots.txt text was not read, and
  // `?? {}` turned that null into an empty map, which has no blocked entries,
  // which printed `none blocked` — a sentence about the SITE, produced by a
  // request that never completed. Nothing about a timeout says no crawler is
  // blocked; a robots.txt we could not fetch could be blocking all nine.
  //
  // 🔴 NULL HAS TWO CAUSES AND ONLY ONE OF THEM IS OURS, so the branch splits
  // on which:
  //   fetchError set  → we never got the file. Unknown, and said as unknown.
  //   no fetchError   → the server answered and there is no usable robots.txt
  //                     (404, or a body that parsed to nothing). The standard
  //                     reads an absent robots.txt as "everything allowed", so
  //                     that IS a statement we are entitled to make — and it is
  //                     the same reading the stored check makes, which is the
  //                     whole point of a paired row.
  //
  // ⚠️ `SERVER_RULE['geo.aibots']` DIRECTLY BELOW IS DELIBERATELY NOT TOUCHED.
  // That one feeds the Overview comparison table, and its `if (!map) return
  // 'pass'` is transcribed from buildGeoChecks. Checked before editing, because
  // this exact field fed two consumers once before (WS-EXT-ENRICH A1) and the
  // screen and the pairing wanted different answers from it: the comparison
  // reads SERVER_RULE, this reading is rendered on the check card, and they do
  // not share a code path. Teaching the server's rule to say "unknown" would
  // invent a fourth status the stored side cannot produce, so every row would
  // disagree.
  'geo.aibots': {
    where: 'siteFile',
    read: (d) => {
      const map = d.robots.aiBotBlocked;
      if (!map) {
        if (d.robots.clientOnly?.fetchError) {
          return `our request failed (${d.robots.clientOnly.fetchError}) — we did not read robots.txt, so which crawlers it blocks is unknown`;
        }
        // 🔴 4xx AND 5xx ARE OPPOSITE ANSWERS AND THE FIRST DRAFT OF THIS LINE
        // GAVE BOTH THE 4xx ONE. RFC 9309 splits them and does not hedge:
        // §2.3.1.3, an "unavailable" status (400-499) means "the crawler MAY
        // access any resources on the server"; §2.3.1.4, an "unreachable" one
        // (500-599) means "the robots.txt file is undefined and the crawler
        // MUST assume complete disallow". Read at rfc-editor.org 2026-08-15.
        //
        // So "no file, nothing blocked" is right for a 404 and is the exact
        // reverse of the rule for a 503. Collapsing them would have replaced
        // one sentence that was wrong about our own failure with another that
        // was wrong about the standard.
        if (d.robots.status !== null && d.robots.status >= 500) {
          return `robots.txt answered HTTP ${d.robots.status} — a server error, not an absent file. RFC 9309 tells a crawler to assume a complete disallow while that lasts, so this is the opposite of "nothing is blocked"`;
        }
        return `no robots.txt${d.robots.status ? ` (HTTP ${d.robots.status})` : ''} — with no file to read, nothing is blocked`;
      }
      const blocked = Object.entries(map)
        .filter(([, v]) => v)
        .map(([k]) => k);
      return blocked.length ? `blocks ${blocked.join(', ')}` : 'none blocked';
    },
  },
};

/**
 * WS-EXT-PARITY batch 6 — the server's own rules, applied to the live reading.
 *
 * 🔴 This is not a second opinion and it is not a client-side grade. Every
 * threshold below is copied LITERALLY out of src/diagnose/core.ts
 * (buildSeoChecks / buildGeoChecks): one H1 passes and none fails, a title over
 * 60 characters is partial, two Open Graph tags pass and one is partial, ten
 * internal links pass and three are partial, alt text passes at 100% and is
 * partial at 90%. The whole point is that the SAME rule is applied to both
 * readings, so a difference in the answer can only come from a difference in
 * what was read — which is exactly the thing the overview exists to show.
 *
 * 🔴 It is used for ONE purpose: deciding whether the two readings agree. It
 * never renders as this row's status. The stored check keeps its own, as it has
 * since batch 2, and nothing here touches a score.
 *
 * A check with no entry here simply does not appear in the comparison. Guessing
 * at a rule we could not copy would put a manufactured disagreement on screen.
 */
const SERVER_RULE = {
  'seo.headings.h1': (d) =>
    d.headings.counts.h1 === 1
      ? 'pass'
      : d.headings.counts.h1 === 0
        ? 'fail'
        : 'partial',
  'seo.meta.title': (d) =>
    d.head?.title ? (d.head.title.length <= 60 ? 'pass' : 'partial') : 'fail',
  'seo.meta.description': (d) =>
    d.head?.metaDescription
      ? d.head.metaDescription.length <= 160
        ? 'pass'
        : 'partial'
      : 'fail',
  'seo.indexable.canonical': (d) => (d.head?.canonical ? 'pass' : 'fail'),
  'seo.indexable.noindex': (d) =>
    (d.head?.metaRobots || '').toLowerCase().includes('noindex')
      ? 'fail'
      : 'pass',
  'seo.mobile.viewport': (d) => (d.head?.viewport ? 'pass' : 'fail'),
  'seo.meta.og': (d) =>
    d.social.ogCount >= 2 ? 'pass' : d.social.ogCount >= 1 ? 'partial' : 'fail',
  'seo.meta.twitter': (d) => (d.social.twitterCount >= 1 ? 'pass' : 'partial'),
  'seo.schema.jsonld': (d) =>
    d.schema.jsonLdTypes.length >= 1 ? 'pass' : 'fail',
  'seo.schema.breadcrumb': (d) => (d.schema.hasBreadcrumb ? 'pass' : 'fail'),
  'geo.faq': (d) => (d.schema.hasFaqPage ? 'pass' : 'fail'),
  'seo.links.internal': (d) =>
    d.links.internal >= 10
      ? 'pass'
      : d.links.internal >= 3
        ? 'partial'
        : 'fail',
  'seo.images.alt': (d) =>
    d.images.total === 0 || d.images.withAlt === d.images.total
      ? 'pass'
      : d.images.withAlt / d.images.total >= 0.9
        ? 'partial'
        : 'fail',
  'seo.indexable.robots': (d) => (d.robots.ok ? 'pass' : 'fail'),
  'seo.indexable.sitemap': (d) => (d.sitemap.ok ? 'pass' : 'fail'),
  // 🔴 This verdict is compared against the stored one on screen. See the note
  // above `geo.methodology` in the read map for the input class where the two
  // sides genuinely disagree — a difference this pairing displays as if it were
  // the page having changed.
  'geo.methodology': (d) => (d.pageShape?.nav?.editorial ? 'pass' : 'partial'),
  // Copied from buildGeoChecks: a 4xx robots.txt means allowed, all four
  // blocked is a fail, some blocked is partial.
  //
  // WS-ROBOTS-5XX-SERVER — 🔴 THE MIRROR MOVED BECAUSE THE RULE MOVED, IN THE
  // SAME COMMIT, AND THAT IS THE WHOLE POINT OF IT BEING A MIRROR.
  //
  // buildGeoChecks now scores a 5xx robots.txt `fail` (RFC 9309 §2.3.1.4 — a
  // server error means the file is undefined and a crawler MUST assume complete
  // disallow, the opposite of the 4xx rule in §2.3.1.3). This function's only
  // job is to apply the STORED side's rule to the LIVE reading so the Overview
  // table can tell whether the two readings agree. Leaving `return 'pass'` here
  // would have made every 5xx site show a manufactured disagreement — our two
  // sides differing because our two transcriptions differ, displayed as the
  // page having changed between them.
  //
  // ⚠️ NOTHING ENFORCES THIS PAIR. No gate compares this file with   ⟵ 🔴 HALF OF THIS WENT FALSE. `scripts/check-server-rule-parity.ts` compares exactly these two files, so the second sentence is no longer true. The FIRST one still is, and only for this key: run on 2026-08-19 that gate printed "compared 16 check(s); skipped 2 (geo.aibots, geo.llms)" — `geo.aibots` is an exemption it asserts, because core.ts reaches this rule through a bare identifier that its reducer refuses to guess at. So sixteen of this map's entries are now machine-compared and THIS one is still comment-enforced, which is a narrower and more useful thing to know than what the sentence below says. The rebuttal sits on this physical line because a grep for either "NOTHING ENFORCES THIS PAIR" or "No gate compares" lands here, and must not read the stale half without the correction — the same placement rule the note in src/diagnose/gap-tools.ts follows.
  // src/diagnose/core.ts, and the extension ships separately from the app, so
  // the two can be out of step for as long as one is deployed and the other is
  // not. Same standing as the SAME_ORIGIN_TIMEOUT_MS pair in background.js: the
  // comment is the mechanism.   ⟵ ⚠️ the SAME_ORIGIN_TIMEOUT_MS comparison is UNCHANGED and was re-checked on the same date: `rg -n SAME_ORIGIN_TIMEOUT_MS scripts/` is still empty, so that pair really does have only a comment. It is now the weaker claim of the two, not the equal one this sentence assumes.
  'geo.aibots': (d) => {
    const map = d.robots.aiBotBlocked;
    // `status` is null only when our own fetch never completed; a real 5xx from
    // the site's server carries its code, which is the case the rule is about.
    if (!map) {
      return d.robots.status !== null && d.robots.status >= 500
        ? 'fail'
        : 'pass';
    }
    const bots = Object.keys(map);
    const blocked = bots.filter((b) => map[b]);
    return blocked.length === 0
      ? 'pass'
      : blocked.length >= bots.length
        ? 'fail'
        : 'partial';
  },
};

/**
 * 🔴 The gate on the whole pairing. The stored checks ran against ONE url; if
 * the user is not on it, a difference between the two readings says nothing
 * about the site — it is just two different pages — and presenting them side by
 * side would manufacture contradictions.
 *
 * Host and path only, and the copy says "the same address" rather than "the
 * same page" because of what it deliberately ignores: a query string. Even an
 * exact match is not a claim the two should be identical — ours was read before
 * JavaScript and on a different day.
 */
function onAuditedPage() {
  const audited = state.signals?.audit?.url;
  if (!audited || !state.url) return null;
  try {
    const key = (u) =>
      `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`;
    return key(new URL(audited)) === key(new URL(state.url));
  } catch {
    return null;
  }
}

function auditedPath() {
  try {
    const u = new URL(state.signals.audit.url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return state.signals?.audit?.url ?? 'the audited page';
  }
}

/**
 * 🔴 The provenance sentence every check list carries. The panel's other page
 * screens read the page the user is ON, after its JavaScript; these were
 * measured on the HOMEPAGE, as delivered, before any JavaScript. Same-named
 * things (H1, canonical, sitemap…) can therefore legitimately disagree between
 * the two, and a reader who does not know which is which will read the
 * disagreement as a bug in one of them.
 */
function checkList(checks) {
  const box = document.createDocumentFragment();
  const counts = checks.reduce((m, c) => {
    m[c.status] = (m[c.status] ?? 0) + 1;
    return m;
  }, {});
  const order = ['pass', 'partial', 'fail', 'needs_connection'];
  box.append(
    el(
      'span',
      'caps',
      order
        .filter((s) => counts[s])
        .map((s) => `${CHECK_STATUS[s].word} ${counts[s]}`)
        .join(' · ')
    )
  );
  // The live reading is only offered where we HAVE one. A scan that has not run,
  // failed, or gone stale leaves every row exactly as batch 2 rendered it.
  const scan =
    state.scan.state === 'ok' && !state.stale ? state.scan.data : null;
  const samePage = scan ? onAuditedPage() : null;

  const list = el('ul', 'checks');
  for (const c of checks) {
    const pair = scan ? PAIRED[c.key] : null;
    // A page-scoped pair is withheld entirely when we are somewhere else. Not
    // greyed out, not captioned "not comparable" — printed, it would be read as
    // a second opinion on this check no matter what the caption said.
    const show = pair && (pair.where === 'siteFile' || samePage === true);
    let live = null;
    if (show) {
      try {
        live = pair.read(scan);
      } catch {
        live = null; // a shape we did not expect is not a finding
      }
    }
    list.append(
      checkCard(
        c.status,
        c.label,
        c.detail,
        null,
        live
          ? el(
              'p',
              'checklive',
              el(
                'span',
                'livetag',
                pair.where === 'siteFile'
                  ? 'Same file, our fetch'
                  : 'This page now'
              ),
              live
            )
          : null
      )
    );
  }
  // No sourceLine here on purpose. Both callers print the score card for the
  // SAME stored row directly above this list, dated by the same timestamp —
  // repeating it would be duplicated text, not extra honesty. What does have to
  // be said is the bit the score card cannot say: WHAT was measured.
  // 🔴 This sentence has to follow the pairing rather than being fixed text.
  // "not on the page you are looking at" is FALSE the moment the user is on the
  // audited address — which is exactly when the pairing turns on — and a
  // provenance line that contradicts what is on screen beside it is worse than
  // no provenance line at all.
  box.append(
    list,
    el(
      'p',
      'meta',
      samePage === true
        ? 'Measured on this same address, as it was delivered and before any JavaScript ran.'
        : state.signals?.audit?.url
          ? `Measured on ${auditedPath()}, as it was delivered and before any JavaScript ran — not on the page you are looking at.`
          : 'Measured on the homepage as it was delivered, before any JavaScript ran — not on the page you are looking at.'
    )
  );
  // 🔴 Said ONCE, under the list, instead of on every row. What it has to
  // establish is that a second line is the SAME check read a second way — not a
  // second check — and, where the two disagree, that neither side is wrong.
  if (scan) {
    box.append(
      el(
        'p',
        'meta',
        samePage === true
          ? 'Rows with a second line are that same check, read again just now from this page in your browser. Ours ran before JavaScript and on an earlier day, so the two can differ without either being wrong — that difference is usually the site building itself in the browser.'
          : samePage === false
            ? `Only the site-wide files are read twice here. The rest of these checks ran on ${auditedPath()} and you are on a different page, so a live reading of this one would not be the same check and is not shown.`
            : 'The live readings shown are of files at the site root, which are the same wherever you are on the site. We fetched them from our servers and this reading came from your browser, so a difference means the site answers the two differently.'
      )
    );
  }
  return box;
}

// --- client-only checks (WS-EXT-PARITY batch 4) -----------------------------
//
// 🔴 These four are NOT the batch-3 pairing and must not be confused with it.
// Batch 3 puts a live reading beside a stored check of the same named thing and
// deliberately issues no verdict, because the stored check already carries one.
// These have no stored counterpart at all — the server's parser has no sameAs,
// no author, no dates and no site name — so a verdict here is the only verdict
// there is, and issuing one is legitimate.
//
// 🔴 What they are still not is part of geoScore. That number was computed
// server-side over four checks, none of them these. The section header says so;
// nothing here ever touches the score.
//
// 🔴 Every entry carries `why`. A check that cannot say why it moves AI
// citation is a check that pads the count, which is exactly what we said we
// would not copy from the competitor.

const ENTITY_TYPES = ['organization', 'person', 'website'];
const ARTICLE_TYPES =
  /article|blogposting|newsarticle|scholarlyarticle|report|webpage$/;

const FRESH_PASS_DAYS = 180;
const FRESH_PARTIAL_DAYS = 540;

/** Loose enough to survive real markup, strict enough to still be a comparison. */
function brandKey(s) {
  return s
    .toLowerCase()
    .replace(/[‘’'"“”]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function checkBrand(e, head) {
  // 🔴 PM's rule, literally: one source is NOT agreement. Two declarations are
  // the minimum that can agree or disagree, so anything less is "not measured"
  // and never a pass.
  const declared = [];
  if (e.ogSiteName)
    declared.push({ from: 'og:site_name', value: e.ogSiteName });
  const org = (e.ldNodes ?? []).find(
    (n) => n.name && n.types.some((t) => ENTITY_TYPES.includes(t))
  );
  if (org) {
    declared.push({ from: `JSON-LD ${org.types[0]}.name`, value: org.name });
  }

  const inTitle = (v) =>
    head?.title ? brandKey(head.title).includes(brandKey(v)) : null;

  if (declared.length < 2) {
    return {
      label: 'Brand name consistency',
      status: 'not_measured',
      detail: declared.length
        ? `Only one name is declared on this page (${declared[0].from}: “${declared[0].value}”). A second declaration is needed before there is anything to agree or disagree with.`
        : 'This page declares no site or organisation name — neither og:site_name nor a name on an Organization/WebSite node.',
      why: 'An engine has to decide which entity this site IS before it can attribute an answer to you. It reconciles the names a page declares; with only one declaration there is nothing to reconcile, and with none there is nothing to attribute.',
    };
  }

  const [a, b] = declared;
  const ka = brandKey(a.value);
  const kb = brandKey(b.value);
  const same = ka === kb;
  const overlap = !same && (ka.includes(kb) || kb.includes(ka));
  const titleNote =
    inTitle(a.value) === null
      ? ''
      : inTitle(a.value)
        ? ' The page title carries the same name.'
        : ' The page title does not carry that name — not a contradiction on its own, titles are written for readers.';
  return {
    label: 'Brand name consistency',
    status: same ? 'pass' : overlap ? 'partial' : 'fail',
    detail: `${a.from}: “${a.value}” · ${b.from}: “${b.value}”.${
      same
        ? ' Both declarations agree.'
        : overlap
          ? ' One name contains the other — close, but they are not the same string.'
          : ' These are two different names for the same site.'
    }${titleNote}`,
    why: 'Two names for one site split it into two entities in the systems AI engines ground on, so half the evidence for citing you attaches to a name nobody asked about.',
  };
}

function checkSameAs(e) {
  const nodes = e.ldNodes ?? [];
  const entityNode = nodes.some((n) =>
    n.types.some((t) => ENTITY_TYPES.includes(t))
  );
  const links = [...new Set(nodes.flatMap((n) => n.sameAs ?? []))];
  // ④ — how many this node-level cap refused. The verdict thresholds (>=2 pass)
  // are unaffected by a cap at 20, but the printed COUNT was silently a floor.
  const sameAsDropped = nodes.reduce((n, x) => n + (x.sameAsDropped ?? 0), 0);
  // WS-EXT-170 ① — 🔴 READ FROM THE PAYLOAD. This sentence used to print the cap
  // from a literal `${20}` written here, while the slice that applies it lives in
  // background.js — the arrangement B2's own note called out as the thing it was
  // avoiding, using this very line as the example. Same guard shape as
  // `authorCap`: null when the payload predates the field, and the sentence then
  // drops the number instead of guessing it.
  const sameAsCap =
    typeof e.sameAsCap === 'number' && e.sameAsCap > 0 ? e.sameAsCap : null;
  // The display cap, distinct from the collection cap above and disclosed
  // separately. `SAMEAS_SHOWN` is this file's own number — it decides how many
  // of the links IN HAND to print — so unlike the cap above it belongs here.
  const SAMEAS_SHOWN = 5;
  if (!entityNode) {
    return {
      label: 'sameAs entity links',
      status: 'fail',
      detail:
        'This page carries no Organization, Person or WebSite node, so there is nothing here declaring who the site is — and therefore nowhere for sameAs to live.',
      why: 'sameAs is the field a knowledge graph follows to bind a site to an already-known entity (Wikipedia, Wikidata, LinkedIn, GitHub). It is the most direct machine-readable claim about identity a page can make, and it is the one AI grounding actually resolves.',
    };
  }
  return {
    label: 'sameAs entity links',
    status:
      links.length >= 2 ? 'pass' : links.length === 1 ? 'partial' : 'fail',
    detail: links.length
      ? `${links.length} sameAs link${links.length > 1 ? 's' : ''}${sameAsDropped ? ` (at least — ${sameAsDropped} more ${sameAsDropped === 1 ? 'was' : 'were'} past the ${sameAsCap ?? 'per-node'} limit and never read)` : ''}: ${links.slice(0, SAMEAS_SHOWN).join(', ')}${links.length > SAMEAS_SHOWN ? `. Showing the first ${SAMEAS_SHOWN} of ${links.length} — the count above is over all of them; this list is not.` : ''}`
      : 'An entity is declared, but with no sameAs links pointing at any already-known profile.',
    why: 'sameAs is the field a knowledge graph follows to bind a site to an already-known entity (Wikipedia, Wikidata, LinkedIn, GitHub). Without it an engine has your name but no way to confirm you are the thing it already knows about.',
  };
}

function articleDates(e) {
  const nodes = e.ldNodes ?? [];
  const published =
    nodes.map((n) => n.datePublished).find(Boolean) ??
    e.articlePublished ??
    null;
  const modified =
    nodes.map((n) => n.dateModified).find(Boolean) ?? e.articleModified ?? null;
  const authors = [
    ...new Set([
      ...nodes.flatMap((n) => n.authors ?? []),
      ...(e.metaAuthor ? [e.metaAuthor] : []),
    ]),
  ];
  const looksLikeArticle = nodes.some((n) =>
    n.types.some((t) => ARTICLE_TYPES.test(t))
  );
  // WS-EXT-HONEST-SURFACE B2 — summed across nodes exactly the way `checkSameAs`
  // sums `sameAsDropped`, and reported with the same "at least" hedge for the
  // same reason: the Set above de-duplicates while this counts names before the
  // de-duplication, so it is a floor on what was refused, not an exact figure.
  // ⚠️ `?? 0` because a scan payload from before B2 has no such key at all —
  // absent must read as "we do not know of any dropped", never as a number.
  const authorsDropped = nodes.reduce((n, x) => n + (x.authorsDropped ?? 0), 0);
  // 🔴 READ FROM THE PAYLOAD, NOT RETYPED HERE. The cap belongs to the walk in
  // background.js and travels with the reading; `checkSameAs` two functions up
  // still prints its own hardcoded 20 and is the standing example of what the
  // other choice costs. Null when the payload predates the field, and the
  // sentence below then drops the number rather than guessing it.
  const authorCap =
    typeof e.authorCap === 'number' && e.authorCap > 0 ? e.authorCap : null;
  return {
    published,
    modified,
    authors,
    authorsDropped,
    authorCap,
    looksLikeArticle,
  };
}

function checkAuthorDate(e) {
  const {
    published,
    modified,
    authors,
    authorsDropped,
    authorCap,
    looksLikeArticle,
  } = articleDates(e);
  const hasDate = !!(published || modified);
  // 🔴 A homepage or a pricing page is not supposed to carry a byline. Marking
  // one "fail" for that would be inventing a requirement the web does not have.
  if (!looksLikeArticle && !authors.length && !hasDate) {
    return {
      label: 'Author and date markup',
      status: 'not_measured',
      detail:
        'This page does not declare itself as an article and carries no author or date markup. Those are expected on articles, so nothing is being counted as missing here.',
      why: 'On pages that ARE articles, an engine weighing two candidate sources prefers the one it can attribute to someone and place in time.',
    };
  }
  const both = authors.length > 0 && hasDate;
  return {
    label: 'Author and date markup',
    status: both ? 'pass' : authors.length || hasDate ? 'partial' : 'fail',
    // WS-EXT-HONEST-SURFACE B2 — 🔴 TWO CAPS ON ONE ROW, NOW BOTH SAID, AND THEY
    // ARE DIFFERENT CLAIMS. `authors.length - 3` is names we HOLD and chose not
    // to print here; `authorsDropped` is names the scan never carried out of the
    // page. A reader can go find the first group in the page source; the second
    // group we cannot produce at all, which is why they get different wording
    // rather than one merged "+N more".
    detail: [
      authors.length
        ? `Author: ${authors.slice(0, 3).join(', ')}${authors.length > 3 ? ` and ${authors.length - 3} more on this page` : ''}${authorsDropped ? ` (at least — ${authorsDropped} further ${authorsDropped === 1 ? 'name was' : 'names were'} past the ${authorCap ?? 'per-node'} limit and never read)` : ''}`
        : 'No author declared',
      published ? `published ${published}` : null,
      modified ? `modified ${modified}` : null,
      !hasDate ? 'no published or modified date' : null,
    ]
      .filter(Boolean)
      .join(' · '),
    why: 'An engine weighing two candidate sources prefers the one it can attribute to someone and place in time. Unattributed, undated text is the easiest thing for it to pass over.',
  };
}

function checkFreshness(e) {
  const { published, modified } = articleDates(e);
  const iso = modified ?? published;
  const age = iso ? daysBetween(iso) : null;
  // 🔴 No date is NOT stale. It is a page whose age we cannot read, and saying
  // otherwise would be a finding we manufactured out of an absence.
  if (age === null) {
    return {
      label: 'Content freshness',
      status: 'not_measured',
      detail:
        'No readable published or modified date on this page, so its age cannot be measured. That is not the same as the page being old.',
      why: 'For anything a user could ask about "now", engines prefer a source they can date. An undated page is not judged stale — it is simply harder to justify citing.',
    };
  }
  const days = Math.abs(age);
  return {
    label: 'Content freshness',
    status:
      days <= FRESH_PASS_DAYS
        ? 'pass'
        : days <= FRESH_PARTIAL_DAYS
          ? 'partial'
          : 'fail',
    detail: `Last declared change ${iso} — ${days} day${days === 1 ? '' : 's'} ago${modified ? '' : ' (published date; no modified date is declared)'}.`,
    why: 'For anything a user could ask about "now", engines prefer a source they can date and that dates recently. A years-old declared date is a reason to reach for someone else.',
  };
}

// --- batch 5: page shape ----------------------------------------------------

// Same threshold the word-density screen refuses at, applied to its own
// measurement (the headings' CJK share, not the page's).
const HEADING_CJK_REFUSAL_SHARE = 10;
const QUESTION_HEAD_PASS_PCT = 20;
const URL_MAX_DEPTH = 4;
const URL_MAX_LENGTH = 100;

function checkHttps(s) {
  const secure = s.protocol === 'https:';
  return {
    label: 'HTTPS',
    status: secure ? 'pass' : 'fail',
    detail: secure
      ? 'Served over HTTPS.'
      : 'Served over plain HTTP. Any canonical, og:url or sitemap entry pointing at the http:// form also splits this page in two as far as an index is concerned.',
    why: 'Insecure pages are demoted or dropped by the crawlers that build the indexes AI answers are grounded on, and a browser blocking mixed content can leave a crawler reading a page the user never sees.',
  };
}

function checkUrlShape(s) {
  const path = s.pathname ?? '/';
  const faults = [];
  const depth = path.split('/').filter(Boolean).length;
  if (depth > URL_MAX_DEPTH) faults.push(`${depth} path segments deep`);
  if (path.includes('_')) faults.push('underscores instead of hyphens');
  if (/[A-Z]/.test(path)) faults.push('mixed case');
  if (path.length > URL_MAX_LENGTH)
    faults.push(`${path.length} characters long`);
  if (s.search) faults.push('carries a query string');
  return {
    label: 'URL shape',
    status:
      faults.length === 0 ? 'pass' : faults.length <= 2 ? 'partial' : 'fail',
    detail: faults.length
      ? `${path} — ${faults.join(', ')}.`
      : `${path} — short, lower-case, hyphenated, no query string.`,
    why: 'When an AI answer cites you it shows this string to the reader. A URL that states its own subject is the difference between a citation someone clicks and one they skim past.',
  };
}

function checkStandingPages(s) {
  const nav = s.nav ?? {};
  const found = ['contact', 'privacy', 'terms'].filter((k) => nav[k]);
  const missing = ['contact', 'privacy', 'terms'].filter((k) => !nav[k]);
  return {
    label: 'Contact, privacy and terms pages',
    status: missing.length === 0 ? 'pass' : found.length ? 'partial' : 'fail',
    detail: `${found.length ? `Links to: ${found.join(', ')}.` : 'No links to any of them.'}${
      missing.length ? ` Not linked from this page: ${missing.join(', ')}.` : ''
    } The about / editorial link is not repeated here — it is the Editorial / methodology check above. Both sides now skip in-page #anchors, mailto: and tel: links there, so those three shapes no longer make the two disagree on their own.`,
    why: 'These are the pages a reader checks to decide whether a site is a real operation, and the same absence reads the same way to a model weighing whether to put your name behind an answer.',
  };
}

function checkQuestionHeadings(s) {
  // 🔴 The density screen's posture, for the same reason: the question-word
  // list is English, so on a CJK page it would find nothing and report that as
  // "no question-shaped headings" — a false negative dressed as a finding.
  if ((s.headingCjkShare ?? 0) >= HEADING_CJK_REFUSAL_SHARE) {
    return {
      label: 'Question-shaped headings',
      status: 'not_measured',
      detail: `${s.headingCjkShare}% of the heading text is CJK. Our test is an English question-word list and a question mark, which would find nothing here and report that as an absence. We would rather not measure it than report a false one.`,
      why: 'A heading phrased as the question a user would ask is the passage a retrieval system lifts. We can only detect that in languages our test covers.',
    };
  }
  if (!s.subheads) {
    return {
      label: 'Question-shaped headings',
      status: 'not_measured',
      detail:
        'This page has no H2 or H3 headings, so there is no set of subheadings to look at.',
      why: 'A heading phrased as the question a user would ask is the passage a retrieval system lifts out and attributes.',
    };
  }
  const pct = Math.round((s.questionHeads / s.subheads) * 100);
  return {
    label: 'Question-shaped headings',
    status:
      pct >= QUESTION_HEAD_PASS_PCT
        ? 'pass'
        : s.questionHeads > 0
          ? 'partial'
          : 'fail',
    detail: `${s.questionHeads} of ${s.subheads} H2/H3 headings are phrased as a question (${pct}%).`,
    why: 'AI answers are assembled from passages that already answer a question. A subheading written as the question makes the passage under it liftable as-is; one written as a label makes a model reconstruct what it was for.',
  };
}

function checkStructures(s) {
  const blocks = (s.lists ?? 0) + (s.tables ?? 0);
  return {
    label: 'Lists and tables',
    status: blocks >= 3 ? 'pass' : blocks > 0 ? 'partial' : 'fail',
    detail: blocks
      ? `${s.lists} list${s.lists === 1 ? '' : 's'} (${s.listItems} items) and ${s.tables} table${s.tables === 1 ? '' : 's'} (${s.tableRows} rows) outside the navigation.`
      : 'No lists or tables in the body. Navigation menus are excluded — a menu is markup, not structure a reader gets anything from.',
    why: 'A list or a table is already the shape an answer is given in, so it can be lifted whole. The same facts in a paragraph have to be taken apart and reassembled first, and models reassemble badly.',
  };
}

/**
 * 🔴 PM ruling, and it is a measurement with NO status by construction: counting
 * numerals cannot distinguish "grew 40% in 2025" from "5 tips" — both are
 * digits to a regex. Grading it would be exactly the "listed but not checked"
 * failure we hold the competitor to, in reverse: checked far more confidently
 * than the measurement supports.
 */
function numeralDensity(scan) {
  const words = scan.keywords?.totalWords ?? 0;
  const n = scan.pageShape?.numerals ?? 0;
  if (!words) return null;
  return {
    label: 'Figures in the body text',
    detail: `${n} numeric expression${n === 1 ? '' : 's'} across ${words} words — ${Math.round((n / words) * 1000)} per thousand.`,
    why: 'Concrete figures are what a model quotes when it wants to attribute something specific to you. This is a count, not a judgement: it cannot tell a statistic from a step number, so it is reported and not graded.',
  };
}

/**
 * WS-EXT-ENRICH C — is this page there before JavaScript runs?
 *
 * 🔴 WHY THIS IS NOT THE OVERVIEW COMPARISON TABLE AGAIN, which is the first
 * objection and the right one to answer here rather than in a commit message.
 *
 * That table puts the stored audit's verdicts beside live ones and, where they
 * differ, says the difference is "the ordinary signature of a page that builds
 * itself in the browser". That sentence names ONE cause for a difference that
 * has FOUR variables moving at once: our servers vs this browser, an earlier
 * day vs now, our IP vs the reader's, and pre-JS vs post-JS. A site that
 * changed last week, or that serves Cloudflare's challenge to us and the page
 * to you, produces the same disagreement and gets the same explanation.
 *
 * This measurement moves one variable. Same origin, same client, same second —
 * the only difference between the two readings is whether the JavaScript ran.
 * Where the table's disagreement is INTERESTING because it includes those
 * confounders (a sitemap we cannot fetch and you can is a real finding), this
 * is the controlled version of the single claim the table asserts.
 *
 * 🔴 And it answers on pages the table cannot speak about at all. The table has
 * five gates — the lookup still loading, no stored audit, an audit whose check
 * list did not ride along, no live scan, and the reader not being on the exact
 * audited address — and on a domain that has never been audited it is a
 * paragraph of explanation. This runs on any page, first visit, no audit.
 *
 * 🔴 GRADED ON THREE BINARIES AND NOTHING ELSE. Title, H1 and meta description
 * are either in the delivered bytes or they are not; that is a fact with no
 * threshold in it. The body-text ratio is reported in the detail and is
 * deliberately NOT part of the verdict — "how much of the text must be in the
 * HTML" has no answer that is not invented.
 */
function checkServerRendered(d) {
  const del = d.delivered;
  if (!del) return null;
  if (!del.ok) {
    return {
      label: 'Server-rendered content',
      status: 'not_measured',
      detail: del.error
        ? `We could not re-read this page's own HTML (${del.error}). That is our request failing, not a finding about the page.`
        : `Re-reading this page's own HTML answered ${del.status ?? 'nothing'}, so there is nothing to compare the rendered page against.`,
      why: 'An engine that does not run JavaScript sees only what the server sent. Measuring that means asking the server again, and this time we could not.',
    };
  }
  const have = [];
  const missing = [];
  (del.title ? have : missing).push('title');
  (del.h1 > 0 ? have : missing).push('H1');
  (del.metaDescription ? have : missing).push('meta description');
  const rendered = d.keywords?.totalWords ?? 0;
  const share = rendered > 0 ? Math.round((del.words / rendered) * 100) : null;
  // WS-EXT-HONEST-SURFACE A1 — 🔴 `delivered.truncated` WAS RECORDED FOR THIS
  // SENTENCE AND READ BY NOBODY. The field exists in collectOutline and its
  // note there says what it is for, verbatim: "a delivered body cut at the read
  // cap makes `words` a floor, which makes the server-rendered share a floor
  // too." The collector wrote the caveat down and this renderer printed the
  // share without it — the number was already a floor, and a floor presented as
  // a measurement reads LOW, i.e. it reports a page as building more of itself
  // in the browser than it does.
  //
  // 🔴 IT NAMES `words` AND THE SHARE, AND NOTHING ELSE. The pass/partial/fail
  // arm above is decided by title / H1 / meta description, and whether a
  // 300,000-character cut could reach those is not something this field says —
  // claiming the verdict is safe would be inventing a second fact out of the one
  // we have. The scope of the caveat is the scope of the note that asked for it.
  //
  // Neutral wording, not the warn palette's vocabulary: the cap is OURS. A page
  // is doing nothing wrong by being longer than we read.
  const cut = del.truncated === true;
  return {
    label: 'Server-rendered content',
    status: missing.length === 0 ? 'pass' : have.length ? 'partial' : 'fail',
    detail: `${missing.length === 0 ? 'The delivered HTML already carries the title, an H1 and a meta description' : have.length ? `The delivered HTML carries ${have.join(' and ')}, but not ${missing.join(' or ')}` : 'The delivered HTML carries none of the title, an H1 or a meta description'}. Its body holds ${cut ? 'at least ' : ''}${del.words} word${del.words === 1 ? '' : 's'} against ${rendered} in the page you are looking at${share === null ? '' : ` (${cut ? 'at least ' : ''}${share}%)`} — reported, not graded: there is no correct share.${cut ? ' We stopped reading that response at 300,000 characters, so both of those are floors rather than totals: the delivered HTML holds that much and may hold more. The limit is ours, not something this page is doing wrong.' : ''}`,
    why: 'Read from this page’s own address a second time, without running its JavaScript. Every variable except that one is held still — same origin, same browser, same moment — so a gap here is the page building itself in front of you and nowhere else. It carries your User-Agent, not a crawler’s, so a site that renders differently for bots is not being tested.',
  };
}

function clientChecks(scan) {
  const e = scan.entity;
  const s = scan.pageShape;
  const out = [];
  const ssr = checkServerRendered(scan);
  if (ssr) out.push(ssr);
  if (e) {
    out.push(
      checkBrand(e, scan.head),
      checkSameAs(e),
      checkAuthorDate(e),
      checkFreshness(e)
    );
  }
  if (s) {
    out.push(
      checkHttps(s),
      checkUrlShape(s),
      checkStandingPages(s),
      checkQuestionHeadings(s),
      checkStructures(s)
    );
  }
  return out;
}

/**
 * 🔴 The header is load-bearing, not a caption. Everything in this section is
 * read from the live page and has NO server-side counterpart, so two things
 * have to be said before the first row: where it came from, and that the score
 * above was computed without any of it.
 */
function clientCheckSection() {
  if (state.scan.state !== 'ok' || state.stale) return null;
  const checks = clientChecks(state.scan.data);
  if (!checks.length) return null;
  const dropped = state.scan.data.entity?.ldNodesDropped ?? 0;

  const box = document.createDocumentFragment();
  appendSome(
    box,
    el('span', 'caps', 'Read from this page · not in the score'),
    // WS-EXT-CLOSEOUT ③ — 🔴 SAID BEFORE THE CHECKS, NOT AFTER, because four of
    // the rows below are absence claims read off a list this cap may have cut.
    // A reader who has already read "no Organization node — fail" cannot unread
    // it, so the caveat has to arrive first or not be worth printing.
    dropped > 0
      ? el(
          'p',
          'qual',
          `⚠️ This page declares more JSON-LD nodes than we walk: we read the first ${state.scan.data.entity.ldNodeCap ?? 60} and stopped, leaving ${dropped} unread. The four checks below look for a name, sameAs links, an author and a date among the nodes we DID read, so any "none found" here means none in that first stretch — not none on the page.`
        )
      : null,
    el(
      'p',
      'qual',
      'We do not audit these server-side, so there is no stored check to compare them with and no version of them in the GEO score above. They are read from the page in front of you, now, and each one says why it moves whether an AI engine cites you.'
    )
  );
  const list = el('ul', 'checks');
  for (const c of checks) {
    list.append(checkCard(c.status, c.label, c.detail, c.why, null));
  }
  box.append(list);

  // 🔴 Below the graded list and visibly outside it: a measurement with no dot
  // and no status word, because there is no honest verdict to attach. Giving it
  // a row in the list above would make the eye read one anyway.
  const density = numeralDensity(state.scan.data);
  if (density) {
    box.append(
      el(
        'div',
        'measureonly',
        el('b', null, density.label),
        el('span', 'checkstatus', 'Measured, not graded'),
        el('p', 'checkdetail', density.detail),
        el('p', 'checkwhy', density.why)
      )
    );
  }
  box.append(scanFooter(state.scan.data.ranAt));
  return box;
}

// --- overview (WS-EXT-PARITY batch 6) ---------------------------------------

/**
 * 🔴 The one thing this screen must never do is invent a number. There is no
 * grade, no letter, no roll-up percentage — the competitor's screen opens with
 * a 92 and a Grade A that it computed itself, and the whole reason we can say
 * its checklist is "listed but never checked" is that we do not do the mirror
 * image of it and grade far past what we measured.
 *
 * So: the three scores that already exist and are already real, one sentence
 * saying they are not one ruler, what the two readings disagree about, and a
 * count of verdicts. Nothing on this screen is computed from another number on
 * this screen.
 */
function overviewScores() {
  const s = state.signals;
  const c = s?.citation;
  const a = s?.audit;
  const row = (label, value, unit, state_, note) =>
    el(
      'div',
      typeof value === 'number' ? 'ovcard' : 'ovcard dashed',
      el(
        'div',
        typeof value === 'number' ? 'num md' : 'num md dash',
        typeof value === 'number' ? String(value) : '—',
        typeof value === 'number' && unit ? el('span', 'unit', unit) : null
      ),
      el('div', 'label', label),
      el('p', 'meta', state_),
      note ? el('p', 'meta', note) : null
    );
  const grid = el('div', 'ovgrid');
  grid.append(
    row(
      'AI visibility',
      c?.state === 'scored' ? c.score : null,
      '/100',
      c?.state === 'scored'
        ? `Cited by ${c.cited.join(', ')}`
        : c?.state === 'partial'
          ? 'Not every engine has answered'
          : 'Not measured yet'
    ),
    row(
      'GEO structure',
      a?.state === 'measured' ? a.geoScore : null,
      '/100',
      a?.state === 'measured' ? 'From the stored audit' : 'Not measured yet'
    ),
    row(
      'SEO basics',
      a?.state === 'measured' ? a.seoScore : null,
      '/100',
      a?.state === 'measured' ? 'From the stored audit' : 'Not measured yet'
    )
  );
  return el(
    'div',
    'ovblock',
    grid,
    // 🔴 The sentence that stops the three from being read as one thing. They
    // are not comparable, they do not average, and the left one is the only one
    // that is about anything actually happening.
    el(
      'p',
      'qual',
      'These are three different rulers, not three views of one number. AI visibility is whether engines actually cited you — the only one measuring an outcome. GEO structure and SEO basics are whether the page is built to be citable and findable, which is a precondition, not a result. A site can be built perfectly and cited by nobody.'
    )
  );
}

/**
 * The half of this screen the competitor structurally cannot have: it reads a
 * page one way, we read it two ways.
 *
 * 🔴 Only the checks whose server rule we could copy exactly take part, and
 * only when the user is standing on the page the audit ran against. Everything
 * else would be comparing two different pages, or comparing our guess at a rule
 * with the rule itself.
 */
/** One side of a comparison row, tagged with which reading it is. */
function side(name, status) {
  const cell = el('span', null, el('span', `dot ${status.dot}`), status.word);
  cell.dataset.side = name;
  return cell;
}

function overviewComparison() {
  const a = state.signals?.audit;
  const scan =
    state.scan.state === 'ok' && !state.stale ? state.scan.data : null;
  const box = el('div', 'ovblock');
  box.append(el('span', 'caps', 'What we saw vs what your browser saw'));

  // 🔴 Three states, not two — the same guard screenChecks has carried since
  // batch 2, which this screen was missing. "No audit exists" and "the audit
  // exists but its per-check list did not ride along in this reply" are
  // different facts, and collapsing them printed "there is no stored audit for
  // this domain" directly underneath that audit's own two scores, on the same
  // screen. The reader is then holding a contradiction we handed them.
  if (state.signalsState === 'loading') {
    box.append(el('p', 'prose', 'Still reading the stored audit.'));
    return box;
  }
  if (a?.state !== 'measured') {
    box.append(
      el(
        'p',
        'prose',
        'Nothing to compare yet — there is no stored audit for this domain. Run the free audit and this fills in.'
      )
    );
    return box;
  }
  if (!Array.isArray(a.checks)) {
    box.append(
      el(
        'p',
        'prose',
        'The stored audit is above, dated, with its scores — but this lookup came back without its per-check list, so there is nothing to line the two readings up against. That is our end, not a missing audit.'
      )
    );
    return box;
  }
  if (!scan) {
    box.append(
      el(
        'p',
        'prose',
        state.stale
          ? 'The page moved on and we lost access to it, so there is no live reading to compare against right now. Click the TriRank icon on the page you are on.'
          : 'No live reading of this page yet.'
      )
    );
    return box;
  }
  if (onAuditedPage() !== true) {
    box.append(
      el(
        'p',
        'prose',
        `The stored checks ran on ${auditedPath()} and you are on a different page. Comparing the two would report the difference between two pages as a difference in what a page looks like from two sides, which is not the same claim. Open ${auditedPath()} to see the comparison.`
      )
    );
    return box;
  }

  const rows = [];
  for (const c of a.checks) {
    const rule = SERVER_RULE[c.key];
    if (!rule || c.status === 'needs_connection') continue;
    let live;
    try {
      live = rule(scan);
    } catch {
      continue;
    }
    rows.push({
      label: c.label,
      stored: c.status,
      live,
      agrees: live === c.status,
    });
  }
  if (!rows.length) {
    box.append(
      el(
        'p',
        'prose',
        'No check in the stored audit has a rule we can apply to the live page.'
      )
    );
    return box;
  }

  const differ = rows.filter((r) => !r.agrees);
  box.append(
    el(
      'p',
      'qual',
      `${rows.length - differ.length} of ${rows.length} checks come out the same on both readings${
        differ.length
          ? `; ${differ.length} do not. Both used the audit's own rule — the only difference is what each one could see. A check that fails for us and passes here is the ordinary signature of a page that builds itself in the browser: our fetch got the shell, your browser ran the JavaScript.`
          : '. The page an engine fetches and the page you are looking at agree.'
      }`
    )
  );

  const table = el('div', 'ovtable');
  table.append(
    el(
      'div',
      'ovhead',
      el('span', null, 'Check'),
      el('span', null, 'Our fetch'),
      el('span', null, 'This page')
    )
  );
  // Disagreements first: they are the reason to look at this table at all.
  for (const r of [...differ, ...rows.filter((x) => x.agrees)]) {
    table.append(
      el(
        'div',
        r.agrees ? 'ovrow' : 'ovrow differs',
        el('span', 'ovlabel', r.label),
        // WS-EXT-UI ③ — 🔴 The two verdicts carry the name of the reading they
        // came from. At a narrow drag the row stacks and the column header is
        // no longer above them, and a verdict whose side you cannot name is
        // worse than no verdict: the whole point of this table is WHICH of the
        // two readings said what.
        side('Our fetch', CHECK_STATUS[r.stored]),
        side('This page', CHECK_STATUS[r.live])
      )
    );
  }
  box.append(table);
  return box;
}

/**
 * 🔴 A count, and only a count. Four buckets that already exist as verdicts
 * somewhere in this panel, added up. It is deliberately not turned into a
 * percentage or a share: "18 of 31 pass" is a fact about how many checks
 * passed, and "58%" is a grade wearing a fact's clothes.
 */
function overviewTally() {
  const a = state.signals?.audit;
  const scan =
    state.scan.state === 'ok' && !state.stale ? state.scan.data : null;
  const tally = { pass: 0, partial: 0, fail: 0, unmeasured: 0 };
  const bump = (status) => {
    if (status === 'pass') tally.pass += 1;
    else if (status === 'partial') tally.partial += 1;
    else if (status === 'fail') tally.fail += 1;
    else tally.unmeasured += 1;
  };
  let sources = 0;
  if (a?.state === 'measured' && Array.isArray(a.checks)) {
    sources += 1;
    for (const c of a.checks) bump(c.status);
  }
  if (scan) {
    sources += 1;
    for (const c of clientChecks(scan)) bump(c.status);
  }
  if (!sources) return null;

  const total = tally.pass + tally.partial + tally.fail + tally.unmeasured;
  const cell = (dot, word, n) =>
    el(
      'div',
      'tallycell',
      el('span', `dot ${dot}`),
      el('span', 'num md', String(n)),
      el('span', 'label', word)
    );
  return el(
    'div',
    'ovblock',
    el('span', 'caps', `Every verdict in this panel · ${total}`),
    el(
      'div',
      'tally',
      cell('ok', 'Pass', tally.pass),
      cell('partial', 'Partial', tally.partial),
      cell('warn', 'Fail', tally.fail),
      cell('stale', 'Not measured', tally.unmeasured)
    ),
    el(
      'p',
      'meta',
      `Counted from ${
        sources === 2
          ? 'the stored audit and this page’s live reading'
          : a?.state === 'measured'
            ? 'the stored audit only — no live reading of this page yet'
            : 'this page’s live reading only — no stored audit for this domain'
      }. A count, not a score: nothing here is weighted, averaged or turned into a grade.`
    )
  );
}

function screenOverview() {
  const box = document.createDocumentFragment();
  box.append(el('h1', 'title', 'Overview'));
  // 🔴 The whole screen is derived from the stored lookup — the three scores,
  // the comparison and the tally alike — so it waits as one thing. Rendering
  // the tally early would print "no stored audit for this domain" under a
  // heading that is about to fill in.
  if (state.signalsState === 'loading') {
    box.append(reading('everything we have stored'), entryLinks());
    return box;
  }
  if (!state.signals) {
    box.append(
      el(
        'div',
        'card dashed',
        el('div', 'label', 'Nothing read yet'),
        el(
          'p',
          'prose',
          state.signalsError === 'rate_limited'
            ? "You've hit today's lookup limit. It resets tomorrow — nothing about this site is implied by it."
            : "Couldn't reach TriRank just now. This says nothing about the site; it is our lookup that failed."
        )
      ),
      // WS-EXT-EMPTY-STATE — the trio, in the same shape 4ca768d gave the two
      // backlink empty states: appended to this branch's own box.append, not a
      // new container. This was the one branch of this screen that ended with
      // nothing to click; the path below has closed with entryLinks() since the
      // screen was written, and this early return simply never got it.
      //
      // 🔴 IT IS RIGHT FOR BOTH SUB-STATES, INCLUDING THE RATE-LIMITED ONE, and
      // that was checked rather than assumed — a link that cannot deliver what
      // the copy beside it promises is exactly what 4ca768d was raised to
      // remove. The limit that produced this card is the extension's own lookup
      // (`site-signals`, 60/IP/day in src/app/api/signals/[domain]/route.ts).
      // The free audit bills a different tool key entirely
      // (`domain-overview-usd6`, plus `free_audit_citation`), so exhausting the
      // panel's reads leaves the audit fully available. "Run a free audit" is
      // actionable in both halves of this branch.
      //
      // `Full report →` drops itself here without needing a condition: it is
      // gated on state.signals?.audit and state.signals is null on this path.
      entryLinks()
    );
    return box;
  }
  box.append(overviewScores(), overviewComparison());

  const a = state.signals.audit;
  const stored = a?.state === 'measured';

  // WS-EXT-EMPTY-STATE — ONE trio, placed by whether there is anything to read.
  //
  // 🔴 MOVED, NOT COPIED, AND THE SINGLE `links` BINDING IS WHAT MAKES THAT
  // CHECKABLE. Two `entryLinks()` calls would be two independent node trees and
  // a later edit could let both render; one node cannot be in two places, so
  // the "exactly one" property holds structurally rather than by reading the
  // branches. The two appends below are mutually exclusive on `stored`.
  //
  // 🔴 Nothing stored: the reader is looking at three dashed cards and a
  // "nothing to compare yet" line, so the next thing on screen should be the
  // action that fills them — ahead of the verdict tally, which is a count of a
  // live page read and does not answer "how do I get the missing scores".
  // Something stored: the old order stands. There are real numbers to read and
  // an action belongs after them, not between the reader and the data.
  const links = entryLinks();
  if (!stored) box.append(links);

  const tally = overviewTally();
  if (tally) box.append(tally);

  // WS-EXT-PANEL-FIXES — 🔴 THE `null` ON SCREEN CAME FROM THE APPEND, NOT FROM
  // THE DATA, and that distinction is the whole fix. `el()` above skips a null
  // child by design; `box` is a DocumentFragment and `append` is the RAW DOM
  // call, whose (Node or DOMString) argument has no nullable member — so a
  // `: null` branch handed to it is coerced to the STRING "null" and inserted
  // as a text node. That is what a reader saw under the caption: not a gap with
  // no body, but the truncation note's else-branch printing itself. The
  // conditional argument below goes through `appendSome`, which drops it.
  //
  // ⚠️ THIS PARAGRAPH USED TO NAME FOUR UNFIXED SIBLINGS AND TO SAY THIS SITE
  // USED A SPREAD. Both were true when written at `004929c` and both are false
  // now: WS-EXT-NULL-APPEND-SWEEP moved all five — this one, the JSON-LD node
  // cap, the outline, images and links truncation notes — onto the one helper,
  // so there is no second spelling left to copy. Kept rather than deleted
  // because the reason the helper exists is the story, not the count.
  //
  // The filter is separate hardening, not the cause: a null INSIDE `gaps` would
  // have thrown in the map below rather than printing anything, so nothing on
  // screen could have come from it. It is here because a list of gaps is worth
  // rendering only for the entries that have something to say, and because the
  // caption's count must be of what is actually shown — a caption reading `· 1`
  // over an empty list is the failure this screen fixed on Images and Links.
  const gaps = Array.isArray(a?.gaps)
    ? a.gaps.filter((g) => g && typeof g === 'object' && g.title)
    : [];
  if (stored && gaps.length) {
    // WS-EXT-HONEST-SURFACE B1 — 🔴 THIS LIST IS CAPPED AT THREE AND SAID SO
    // NOWHERE. `MAX_GAPS` lives in src/app/api/signals/[domain]/route.ts and the
    // caption printed `· 3` for a domain with three failing checks and for one
    // with thirty. A capped list under a bare count is the shape this panel
    // already fixed on Images, Links and the Outline; this one was missed
    // because the cap is at the ENDPOINT rather than in the scan payload, so
    // there was no `itemsTruncated` beside it to notice.
    //
    // 🔴 THE TOTAL IS DERIVED, NOT A SECOND HARDCODED 3, and that is the whole
    // point of doing it this way. `gaps` is the FAIL subset of the very same
    // `checks` array in the same reply — measured on production and recorded in
    // the note above screenIssues (stripe.com: 2 fails → the same 2 gaps;
    // trirankai.com: 0 fails → []). So the honest denominator is already in hand
    // and needs no new field. If MAX_GAPS is ever changed the sentence follows
    // it, and if the gaps↔fails identity ever breaks the condition simply goes
    // quiet instead of printing a subtraction nobody checked.
    //
    // ⚠️ `>` and not `!==`: fewer fails than gaps would mean a gap that matches
    // no check label — the orphan case screenIssues handles defensively and has
    // never observed. That is not a truncation and must not be described as one.
    const fails = Array.isArray(a.checks)
      ? a.checks.filter((c) => c.status === 'fail').length
      : null;
    appendSome(
      box,
      el('span', 'caps', `Top gaps from the stored audit · ${gaps.length}`),
      fails !== null && fails > gaps.length
        ? el(
            'p',
            'meta',
            `Showing the first ${gaps.length} of ${fails} failing checks — our lookup sends at most that many. The Issue list screen has all of them, ordered by the weight the audit gives each one.`
          )
        : null,
      el(
        'ul',
        'gaps',
        ...gaps.map((g) =>
          el(
            'li',
            el('span', 'dot warn'),
            el(
              'div',
              null,
              el('b', null, g.title),
              ' ',
              el('span', null, g.description)
            )
          )
        )
      ),
      sourceLine(a.source, a.checkedAt)
    );
  }
  // The other half of the `links` placement above — same node, so if this line
  // and that one ever both ran, the second append would MOVE it rather than
  // draw a second trio. The guard is `stored` on both sides; the append is not
  // unconditional any more, which it was before this screen had two orders.
  if (stored) box.append(links);
  return box;
}

function auditChecks(dimension) {
  const a = state.signals?.audit;
  if (a?.state !== 'measured' || !Array.isArray(a.checks)) return null;
  return a.checks.filter((c) => c.dimension === dimension);
}

function screenChecks() {
  const box = document.createDocumentFragment();
  box.append(el('h1', 'title', 'SEO checks'));
  const a = state.signals?.audit;
  if (state.signalsState === 'loading') {
    box.append(reading('the stored SEO audit'));
    return box;
  }
  box.append(
    metricRow(
      'SEO score',
      a?.state === 'measured' ? a.seoScore : null,
      a?.source,
      a?.checkedAt
    )
  );
  // 🔴 Three states, not two. "The audit has no checks in this response" and
  // "no audit exists" are different facts, and collapsing them prints "no audit
  // is stored" directly under a real score from the stored audit. That is not
  // hypothetical: an extension reloaded before the API that carries the check
  // list is deployed lands in exactly this state.
  const checks = auditChecks('seo');
  if (checks?.length) {
    box.append(checkList(checks));
  } else if (a?.state === 'measured') {
    box.append(
      el(
        'div',
        'card dashed',
        el('div', 'label', 'Checks not in this reply'),
        el(
          'p',
          'prose',
          'The audit above is stored and dated, but the lookup came back without its per-check list. That is our end, not a missing audit.'
        ),
        sourceLine(a.source, a.checkedAt)
      )
    );
  } else {
    box.append(
      el(
        'div',
        'card dashed',
        el('div', 'label', '—'),
        el(
          'p',
          'prose',
          'No audit is stored for this domain yet, so there are no checks to list. The free audit runs all of them.'
        ),
        sourceLine(a?.source, null)
      ),
      // WS-EXT-EMPTY-STATE — the sentence above already ends in "The free audit
      // runs all of them" and handed the reader nothing to click, which is
      // 4ca768d's shape exactly. The audit is genuinely what fills this: these
      // checks come from readLatestDiagnosis, and the diagnosis IS what the free
      // audit writes.
      //
      // 🔴 ONLY THIS BRANCH OF THE THREE. The "checks not in this reply" branch
      // above deliberately does not get it: an audit EXISTS there and is on
      // screen with its score, so "run a free audit" would name an action the
      // reader has already taken to answer a problem at our end, not theirs.
      // The loading branch returns before either.
      entryLinks()
    );
  }
  return box;
}

/**
 * WS-EXT-CONTENT ① — the issue list, built from the checks instead of the gaps.
 *
 * 🔴 What `gaps` actually is, measured on production rather than assumed: it is
 * the FAIL subset of the same check list, title and description matching the
 * check's label and detail word for word (stripe.com: 2 fails → the same 2
 * gaps; trirankai.com: 0 fails → []). So the old screen was not wrong when it
 * printed "No gaps in the stored audit" — it was answering a narrower question
 * than the reader's. Two partials and four not-measurable checks were sitting in
 * the same reply, unrendered, on a screen called Issue list.
 *
 * 🔴 It is not a third copy of the other two screens. SEO checks and Structure
 * readiness each list ONE dimension in full, passes included; this lists what is
 * not a pass, across both, in the order the audit's own weighting puts them. The
 * passes are counted here and not repeated — a reader who wants them has two
 * screens that are about exactly that, and listing the same check three times is
 * how a panel teaches people that its screens are interchangeable.
 *
 * 🔴 The weight orders the rows and is never printed. It is the audit's internal
 * weighting; showing "1.5" beside a check would be handing over a number with no
 * unit and no explanation, and explaining it would mean inventing a reading of
 * it that the audit does not publish.
 */
const ISSUE_SECTIONS = [
  {
    status: 'fail',
    caps: 'Failing',
    lead: 'The audit could check these and they did not pass. These are also what it reports as its gaps.',
  },
  {
    status: 'partial',
    caps: 'Partly there',
    lead: 'Present but not in the shape the check looks for. Usually the shortest distance to a pass.',
  },
  {
    status: 'needs_connection',
    caps: 'Not measurable from an audit',
    // 🔴 Neutral wording and neutral treatment, as everywhere else in this
    // panel: these are OUR limits, not findings about the site, and they are
    // excluded from the score at the source. The chip renders them in the stale
    // vocabulary rather than the warn palette (batch 2's ruling).
    lead: 'Nothing is wrong with these. They need a data source a one-off audit does not have, so the audit records that rather than guessing — and its score is computed without them.',
  },
];

const DIMENSION_TAG = { seo: 'SEO', geo: 'GEO' };

function screenIssues() {
  const box = document.createDocumentFragment();
  box.append(el('h1', 'title', 'Issue list'));
  const a = state.signals?.audit;
  if (state.signalsState === 'loading') {
    box.append(reading('the stored audit’s checks'));
    return box;
  }
  if (a?.state !== 'measured') {
    box.append(
      el(
        'div',
        'card dashed',
        el('div', 'label', '—'),
        el('p', 'prose', 'No audit is stored for this domain yet.'),
        sourceLine(a?.source, null)
      )
    );
    return box;
  }
  // Same three-state guard the other check screens carry: an audit with no
  // check list in this reply is our end, not an audit without findings.
  if (!Array.isArray(a.checks)) {
    box.append(
      el(
        'div',
        'card dashed',
        el('div', 'label', 'Checks not in this reply'),
        el(
          'p',
          'prose',
          'The audit is stored and dated, but the lookup came back without its per-check list, so there is nothing to sort into issues. That is our end, not a clean bill of health.'
        ),
        sourceLine(a.source, a.checkedAt)
      )
    );
    return box;
  }

  const passes = a.checks.filter((c) => c.status === 'pass').length;
  const byWeight = (x, y) =>
    (y.weight ?? 0) - (x.weight ?? 0) || x.label.localeCompare(y.label);

  let listed = 0;
  for (const section of ISSUE_SECTIONS) {
    const rows = a.checks
      .filter((c) => c.status === section.status)
      .sort(byWeight);
    if (!rows.length) continue;
    listed += rows.length;
    const list = el('ul', 'checks');
    for (const c of rows) {
      list.append(
        checkCard(
          c.status,
          c.label,
          c.detail,
          null,
          null,
          DIMENSION_TAG[c.dimension] ?? null
        )
      );
    }
    box.append(
      el('span', 'caps', `${section.caps} · ${rows.length}`),
      el('p', 'qual', section.lead),
      list
    );
  }

  // 🔴 Defensive, and cheap: everything above is built from the checks, so a gap
  // the audit reports WITHOUT a matching failing check would silently vanish.
  // That has not happened on any production row inspected — gaps has been the
  // fail subset every time — but "has not happened yet" is not a reason to drop
  // a finding the audit went to the trouble of naming.
  const labels = new Set(a.checks.map((c) => c.label));
  const orphans = (a.gaps ?? []).filter((g) => !labels.has(g.title));
  if (orphans.length) {
    box.append(
      el('span', 'caps', `Also reported as a gap · ${orphans.length}`),
      el(
        'ul',
        'checks',
        ...orphans.map((g) => checkCard('fail', g.title, g.description, null))
      )
    );
    listed += orphans.length;
  }

  if (!listed) {
    box.append(
      el(
        'div',
        'card',
        el('div', 'label', `All ${a.checks.length} checks pass`),
        el(
          'p',
          'prose',
          'Nothing in the stored audit failed, fell short or went unmeasured. The full list is on the SEO checks and Structure readiness screens.'
        )
      )
    );
  } else {
    box.append(
      el(
        'p',
        'meta',
        `${passes} of ${a.checks.length} checks pass and are not repeated here — they are listed in full on the SEO checks and Structure readiness screens. Ordered by the weight the audit gives each check.`
      )
    );
  }
  box.append(sourceLine(a.source, a.checkedAt), entryLinks());
  return box;
}

function screenDr() {
  const box = document.createDocumentFragment();
  box.append(el('h1', 'title', 'Domain rating'));
  const d = state.signals?.authority;
  if (state.signalsState === 'loading') {
    box.append(reading('the stored Domain Rating'), entryLinks());
    return box;
  }
  box.append(
    scoreCard({
      value: d?.state === 'measured' ? d.dr : null,
      label: 'Ahrefs Domain Rating',
      source: d?.source,
      checkedAt: d?.checkedAt,
      howTo:
        'Not in our cache for this domain. We only ever read what is already stored — the panel never triggers a paid lookup.',
    }),
    entryLinks()
  );
  return box;
}

/**
 * 🔴 "Not built yet" is its own wording, deliberately not the "can't measure"
 * wording and never the warn palette: one is a gap in this build, the other is
 * a statement about the site.
 */
function notBuilt(what) {
  return el(
    'div',
    'card dashed',
    el('div', 'label', 'Not built yet'),
    el(
      'p',
      'todo',
      `This screen will show ${what}. It is not wired up in this build, so nothing is shown rather than an empty result.`
    )
  );
}

function entryLinks() {
  const box = el('div', 'links');
  const add = (text, href) => {
    const a = el('a', null, text);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noreferrer';
    box.append(a);
  };
  const host = state.host ? encodeURIComponent(state.host) : '';
  add('Run a free audit →', `${SITE}/free-audit?url=${host}`);
  if (state.signals?.audit?.state === 'measured') {
    add('Full report →', `${SITE}/site/${host}`);
  }
  // WS-EXT-WATCHLIST — the one thing on this panel that starts something ongoing
  // rather than showing what is already stored.
  //
  // 🔴 A LINK, NOT A CALL, AND THAT IS THE WHOLE DESIGN. This extension has no
  // credentials: both of its backend reads pass `credentials:'omit'`, the
  // manifest asks for neither `identity` nor `cookies`, and adding a watchlist
  // row is a per-account write. Handing the browser a URL lets the session the
  // user already has do the authenticating, so nothing here needs a token and
  // nothing on the server needs a new endpoint. `middleware.ts` appends
  // `nextUrl.search` to the login callbackUrl, so the domain survives a
  // logged-out round trip.
  //
  // ⚠️ Only the domain travels. `brand` is required on the other end and this
  // panel does not know it — see the note on `initialDomain` in
  // src/components/watchlist/watchlist-manager.tsx for why sending the hostname
  // instead would change what gets measured rather than what gets displayed.
  add('Track this domain →', `${SITE}/watchlist?domain=${host}`);
  add('How we score →', `${SITE}/methodology`);
  return box;
}

/**
 * WS-EXT-1.3.0 D — the per-screen "you can fix this now" block.
 *
 * Every other outbound link on this panel goes to /free-audit, /site or
 * /watchlist: measure it again, look at the report, or start tracking. None of
 * them is a thing to DO about what the screen just said. The free tools are,
 * they need no login and they cost the reader nothing, and until now the
 * panel linked exactly one of them, from one empty branch.
 *
 * 🔴 THE MATCHING RULE, and it is the expensive part of this map rather than
 * the code under it: a tool belongs on a screen when the tool PRODUCES THE
 * ARTIFACT that screen is reporting the absence or the shape of, OR when it
 * ANSWERS A QUESTION THE SCREEN RAISES AND DOES NOT ANSWER. Not when it shares
 * a subject. The entries below are what survived that rule applied to every
 * screen; the misses are recorded because a reader's first question about a
 * sparse map is whether it is unfinished, and it is not.
 *
 * 🔴 THE SECOND HALF OF THAT RULE WAS ADDED IN WS-EXT-TOOLLINKS-LINKS, AND IT
 * IS WRITTEN DOWN BECAUSE A RULE THAT WIDENS WITHOUT A RECORD IS A RULE NOBODY
 * CAN ARGUE WITH LATER. Until then the rule was the first clause alone. What
 * forced the change was `links`: that screen counts internal links and says so
 * precisely ("N internal link(s) on this page"), and it never says whether a
 * single one of them resolves. Nothing PRODUCES an outbound link, so the first
 * clause left the screen empty forever — while a tool that visits each of those
 * links and reports the dead ones answers exactly the question the counting
 * raises. The rule was too narrow, not the screen too poor.
 *
 * ⚠️ AND HERE IS WHERE THE SECOND CLAUSE DOES *NOT* REACH, because it reads
 * like a skeleton key and is not one. Heading levels, Images and Word density
 * all now have tools — heading-structure-analyzer, alt-text-auditor,
 * word-density-analyzer — and all three stay excluded. The test is whether the
 * screen ASKS something it leaves open. Those three screens already display the
 * outline, the alt attributes and the frequencies; the tools re-read the same
 * artifact and hand back the same reading. That is not an unanswered question,
 * it is the answer the reader already has, fetched again on a second page. A
 * tool qualifies under the second clause only when the screen's own output
 * points at something it cannot see — `links` counts what it cannot reach.
 *
 * ⚠️ AT MOST TWO TOOLS PER SCREEN, AND THAT NUMBER IS A READING RATHER THAN A
 * PREFERENCE. Two is the widest row this block has ever actually rendered — the
 * original five entries were four twos and a one — so it is the last width
 * anyone looked at on a real panel and accepted. The rule throttles the map on
 * its own (asking for the tool that PRODUCES the artifact rarely leaves more
 * than two candidates), so the cap is a backstop, not the thing doing the work.
 * A third would need a reading, not a slot: see the `robots` note below for a
 * screen that has a plausible third and does not get it.
 *
 *  · Overview and Issue list aggregate other screens and say so in their own
 *    copy ("the full list is on the SEO checks and Structure readiness
 *    screens"). Their fix links are on those screens. A union of everything
 *    here would be five links that fit no particular finding.
 *  · Crawler access — NOT the robots screen, and the two were conflated here
 *    until WS-EXT-TOOLLINKS. What this bullet used to say was: "Crawler access
 *    reports what robots.txt does to AI crawlers. The fix is an edit to
 *    robots.txt and no tool writes one." Both halves were wrong, and the
 *    correction is kept visible because the wrong version shipped: a reader who
 *    only sees the fix would have no way to know the screens are distinct.
 *      · screenCrawler does not read robots.txt at all. It sends one real
 *        request per crawler User-Agent FROM THE READER'S OWN BROWSER AND IP
 *        and reports reachability — an effect, measured live.
 *      · screenRobots is the one that fetches robots.txt (and sitemap.xml) and
 *        reports what it declares, AI-crawler blocks included.
 *    A tool that writes robots.txt now exists, so the second half stopped being
 *    true as well. It goes on `robots`, whose findings ARE that file, and NOT
 *    on `crawler`, whose finding is the effect rather than the artifact —
 *    the same door opened twice would be one of them opened at the wrong
 *    screen.
 *  · Domain rating and Backlinks are the Backlink Checker's, and it is
 *    deliberately not here. Backlinks already links it in context, under the
 *    sentence that discloses the run costs us a paid lookup and is capped at
 *    three a day — a second copy in a footer would be the same door with the
 *    disclosure stripped off. Domain rating's own card says "the panel never
 *    triggers a paid lookup"; a one-click path to one, directly beneath that
 *    sentence, is the kind of true-but-adjacent that reads as a contradiction.
 *  · AI visibility does NOT get the AI Visibility Checker. The tool fires one
 *    bare-brand prompt per engine; /free-audit runs that same prompt plus the
 *    competitor prompt plus the domain-overview group, and this panel already
 *    links /free-audit on every screen. Same ruling, same words, as
 *    NO_TOOL_LINK_FROM_BLOG's "free-audit-already-links-the-superset" in
 *    src/lib/related-tools.ts.
 *  · Structure readiness does NOT get the GEO Checklist. It re-runs the check
 *    list the screen is already showing in full, and returns it as a
 *    register-gated preview — less than the reader has in front of them.
 *  · Redirect Checker matches NOTHING, re-judged against the widened rule in
 *    WS-EXT-TOOLLINKS-LINKS rather than carried over. It produces no artifact
 *    any screen reports, and — the half the second clause would have caught —
 *    no screen raises the question it answers: searching this file for a
 *    redirect, a hop or a 3xx status finds one hit, and that hit is
 *    `totalWords >= 300` on the density screen. A tool with no screen is the
 *    map being honest; a tool parked on the nearest-sounding screen is the
 *    thing this rule exists to prevent.
 *  · Heading levels, Word density, Images, Whois still get nothing, but
 *    the reason narrowed twice. This bullet used to open "Heading levels, Word
 *    density, Images, Links, hreflang, Whois: nothing generates headings, alt
 *    text, outbound links or hreflang tags". hreflang left that list in
 *    WS-EXT-TOOLLINKS because a generator for those tags now exists; Links left
 *    it in WS-EXT-TOOLLINKS-LINKS under the rule's second clause. Both old
 *    wordings are kept here so the changes read as corrections rather than as
 *    screens someone forgot.
 *    What remains excluded, and why it is not the same case: there are now
 *    tools that READ headings, alt text and links (heading-structure-analyzer,
 *    alt-text-auditor, link-extractor), and reading is what these screens
 *    already do. Sending a reader from a screen to a tool that re-reads what
 *    the screen just showed them offers less than they have in front of them —
 *    the same ruling as Structure readiness above. The rule asks for the tool
 *    that PRODUCES the artifact, and for headings, alt text and outbound links
 *    nothing does. Word density is now measured (word-density-analyzer, and
 *    the 'content-quality-judgement' roster entry in src/lib/related-tools.ts
 *    was corrected accordingly in WS-TOOLS-CONSOLIDATE) — measured, not
 *    produced, so it stays out on the same ground.
 *  · 🔴 TRAFFIC ESTIMATE GETS NOTHING, AND UNTIL WS-EXT-VERDICT-TO-FIX IT WAS
 *    THE ONE MISS THIS BLOCK NEVER RECORDED. Every other screen without an
 *    entry is named somewhere above; that one was reachable only by noticing
 *    which screen was absent, which is the one thing a reader of a
 *    sparse map cannot do. The paragraph at the top promises the misses are
 *    recorded, and a promise of completeness has no failing entrance — it went
 *    on being true-sounding for as long as nobody counted.
 *    The ruling itself is not close, and it is the screen's own: everything on
 *    Traffic estimate is Similarweb's model, and `screenTraffic` opens by
 *    saying so and by naming where the measured numbers are instead — "The
 *    numbers this product sells as measured are on the AI visibility and
 *    Crawler access screens". No tool writes somebody else's panel estimate, so
 *    the first clause of the rule cannot match. The second cannot either, and
 *    that is the part worth writing down rather than assuming: attaching a fix
 *    to this screen would mean treating a third-party model as a thing the
 *    reader is failing at, and the distinction between what we measured and
 *    what we cached from a vendor is the one the rail is arranged around.
 *  · 🔴 "Three tools still end up with no home at all — Favicon, Keyword, ROI"
 *    CLOSED THIS BULLET AND WAS THREE CLAIMS WEARING ONE SENTENCE. Two of them
 *    still hold, one had its premise dismantled four days after it was written,
 *    and the count was false on the day it was written. They are separated
 *    below rather than repaired in place: a sentence that bundles a live ruling
 *    with a dead one cannot be argued with a piece at a time, and the reader who
 *    finds the dead half has no way to tell how far the rot goes.
 *      · 🔴 FAVICON'S REASON IS GONE. It was recorded on 2026-08-11 in
 *        WS-EXT-TOOLLINKS and it meant "no screen reports this". On 2026-08-15,
 *        5d0b836 gave Page declarations an "Other head declarations" card whose
 *        first row is the favicon, and its absent state is a named finding with
 *        a consequence attached — "none declared — a browser or a citation card
 *        falls back to /favicon.ico, which may or may not be there".
 *        favicon-generator produces that file and the snippet that declares it,
 *        so the FIRST clause now matches on something the screen already prints.
 *        🔴 The failure mode is the one this file keeps meeting: nothing went
 *        red, and nothing could have. This is prose, and the commit that took
 *        the premise away never opened this block.
 *        ⚠️ IT IS STILL NOT PLACED, and the reason is now the cap rather than
 *        the rule — see the replacement candidates at the end of this block.
 *      · Keyword and ROI keep the ruling. Keyword: the density screen does print
 *        a keywords meta tag now, but only `if (declaredKeywords)` — an absent
 *        tag renders nothing at all, and the card beside it says in its own
 *        words that the tag has been ignored since 2009 and is not graded. No
 *        absence is reported, so there is no absence to fill; a screen that
 *        declines to grade something is not a screen asking for a fix. ROI: no
 *        screen carries a figure it works from or a question it answers.
 *      · 🔴 THE COUNT IS DELETED RATHER THAN CORRECTED, and "three" is the
 *        evidence for why. It was written in e0b457d, by which point the roster
 *        had already gone from twelve tools (8387e09, the same day) to
 *        thirty-eight — so it was wrong when it was typed, not after. Writing a
 *        bigger number in its place only moves the same failure to the next
 *        tool that ships, and this comment cannot see the roster it would be
 *        counting. What makes the case rather than the arithmetic:
 *        ai-visibility-roi-calculator was named here while ctr-calculator,
 *        conversion-rate-calculator and seo-cost-calculator — its own siblings,
 *        excluded for the identical reason — were named nowhere at all. Three
 *        of the four went unrecorded and the count still read as complete. The
 *        block below is where those three finally get a line; past tense here
 *        because this commit is what changed it.
 *
 * 🔴 THE TOOLS THIS BLOCK HAD NEVER WEIGHED, RULED ON HERE SO THE NEXT READER
 * DOES NOT HAVE TO ASK AGAIN. Every bullet above names a tool and says why it is
 * in or out; the roster also carries tools named by neither the map nor the
 * misses. They were not overlooked at re-audit time — e0b457d and e3d307c both
 * ran against the thirty-eight-tool roster, not the twelve-tool one 8387e09 saw
 * earlier the same day — but an unwritten ruling and an unmade one are the same
 * thing here, because both get re-litigated by whoever reads this next.
 *
 * ⚠️ NONE OF WHAT FOLLOWS CHANGES A `tools:` ARRAY, and that is the finding
 * rather than an anticlimax. The ones that match the rule ALL land on a screen
 * already holding two, so what they produce is a replacement question for PM,
 * recorded at the end of this block, and not an edit here.
 *
 * Match the rule, held out only by the cap:
 *   · structured-data-validator → Structured data. The screen prints "N of M
 *     JSON-LD block(s) did not parse" and cannot say which one or why: the
 *     scan's `catch { malformed += 1 }` keeps neither the block's text nor the
 *     parse error, and `trees` carries only the blocks that DID parse. That is
 *     the `links` shape exactly — a count of something the screen cannot reach.
 *   · robots-txt-validator → Robots & sitemap. `parseRobots` in
 *     extension/robots.js drops what it does not understand in silence: a line
 *     with no colon hits `continue`, and any field that is not
 *     user-agent/allow/disallow falls through the trailing `else`. So
 *     `Disalow: /` parses as though the line were absent, the screen reports the
 *     file as reachable, and the crawler table below it is computed from the
 *     rules that survived. The screen cannot report a broken line because it
 *     discarded it before rendering.
 *     ⚠️ ONLY THE SYNTAX HALF IS NEW. The other half that tool offers — which AI
 *     crawlers the file blocks — is what this screen has done with its own
 *     parser since WS-EXT-ENRICH A1, and that half is excluded on exactly the
 *     heading-structure-analyzer ground: a second reading of what is on screen.
 *   · sitemap-validator → Robots & sitemap. The screen says "A valid sitemap.xml
 *     was found at the default path", and the whole test behind that word is
 *     `looksLikeSitemap`, one regex for `<urlset` or `<sitemapindex`. Namespace,
 *     relative or duplicate URLs, lastmod format, priority range and the size
 *     limits are all outside what that can see, so "valid" is a wider word than
 *     the measurement under it.
 *   · llms-txt-validator → Structure readiness. `geo.llms` reports present /
 *     present but empty / not reachable and never opens the file. Whether a
 *     model could use what is inside it is not a re-read of anything on screen,
 *     because nothing on screen has read it.
 *   · canonical-tag-checker → SEO checks. The scan takes ONE canonical
 *     (`querySelector('link[rel="canonical" i]')` in the head block of
 *     extension/background.js), so a second canonical is invisible to this panel
 *     by construction; and nothing here judges a relative href, an http
 *     canonical on an https page, or the canonical/noindex contradiction — both
 *     halves of which this panel holds separately and never reconciles.
 *   · favicon-generator → Page declarations. Ruled above.
 *
 * Do not match, one reason each, so the question is closed rather than merely
 * unasked:
 *   · meta-tag-checker — title and description length are already on the SEO
 *     checks screen, counted against the server's own thresholds since
 *     WS-EXT-ENRICH B-B. Re-reading them on a second page is the
 *     heading-structure-analyzer ruling.
 *   · sitemap-url-extractor — no screen asks what is inside the sitemap. Robots
 *     & sitemap lists the sitemaps DECLARED in robots.txt with their statuses,
 *     and never claims to know their contents, so there is no open question.
 *   · anchor-text-generator — the `links` entry above already records that
 *     nothing produces the links that screen counts, and anchor text is not a
 *     link. Its input is a page you are about to link TO, while that screen's
 *     "(no anchor text)" rows are links which already exist and are mostly
 *     images and icons, where the fix is alt text.
 *   · question-extractor — no screen reports which questions a page answers or
 *     leaves open. No absence, no raised question.
 *   · llm-content-rewriter, ai-outline-generator — the nearest failing state is
 *     Word density's thin-content verdict, and it is near by SUBJECT rather than
 *     by artifact: that screen counts the words on the page and never asks what
 *     should be written. "Not when it shares a subject" is the rule's own third
 *     sentence, and a content tool parked under a word count is the shape it
 *     was written to name.
 *   · url-slug-generator — no screen reads or reports a URL slug.
 *   · ctr-calculator, conversion-rate-calculator, seo-cost-calculator — ROI's
 *     case, and the reason the count above went stale: no screen carries an
 *     impression, a conversion or a cost for any of them to work from.
 *
 * 🔴 REPLACEMENT CANDIDATES, REPORTED AND NOT TAKEN. The cap is two and every
 * qualifying tool above sits behind a full screen, so acting on one means
 * dropping something already there — PM's call, not this file's. One of them is
 * not merely a tie: on Page declarations the screen prints the favicon's absence
 * BY NAME and never mentions og:image at all, counting `og:*` only in aggregate.
 * ⚠️ THE SECOND HALF OF THAT ARGUMENT HAS BEEN SPENT, and it is recorded rather
 * than quietly dropped. It used to read that og-image-generator's note called
 * og:image "the tag most often missing here", an assertion this panel does not
 * measure — and WS-EXT-NOTE-SUBJECTS removed the ASSERTION rather than the
 * tool, so the note no longer says it. The first half is enough on its own:
 * favicon's match is a finding the screen prints, og:image's is not.
 * Everywhere else the incumbent is simply the earlier arrival; there it is the
 * weaker fit.
 *
 * 🔴 THIS IS NOT THE ONLY TOOL LINK IN THE PANEL, AND THE OTHER ONE APPEARS
 * UNDER THE OPPOSITE CONDITION. `oneLink` below puts the free Backlink Checker
 * on the Backlinks screen, and the two are deliberately not merged:
 *   · This block is appended by `render()` for every screen in the map, in all
 *     four of a screen's states. It is there when the screen is full of data,
 *     because "here is what would change this" does not stop being true when
 *     the reading succeeded.
 *   · `oneLink` renders only on the two Backlinks branches with nothing to
 *     show. That is not this block with a narrower trigger: what fills a
 *     referring-domain list is the Backlink Checker and NOT the free audit, so
 *     on those branches `entryLinks`' trio would name an action that cannot
 *     produce what the reader just failed to see. It is answering the empty
 *     state, not the screen.
 * Merging them would have to impose one of those conditions on the other, and
 * both are load-bearing where they are. What was missing was any record that a
 * second path exists at all: someone auditing "which screens offer a fix" from
 * TOOL_LINKS alone gets an answer that is short by one screen, and nothing in
 * either mechanism would tell them.
 *
 * 🔴 THE `?ref=` IS AN ANALYTICS MARKER AND NOTHING READS IT, which is exactly
 * what makes it safe here. `oneLink` below records the opposite case and the
 * distinction is the point: a `?url=` on a page that ignores searchParams
 * PROMISES the reader their domain travelled with them, and the empty form
 * breaks that promise. `?ref=` promises the reader nothing — it is not
 * addressed to them. Measured rather than assumed, twice: no tool page under
 * src/app/[locale]/(marketing)/(pages)/tools reads searchParams at all, and
 * nothing in src/ reads a `ref` param; and the live page emits
 * `rel="canonical"` to the clean URL, so the marker cannot fork an indexed
 * page. It is the form the app already uses for the same purpose
 * (`?ref=dr-leaderboard`, `?ref=ai-crawler-stats`, `?ref=shared-report`), and
 * the screen id is in it so a click can be attributed to the block that earned
 * it rather than only to "the extension".
 *
 * 🔴 THE TEST EVERY `note` HAS TO PASS, WRITTEN DOWN IN WS-EXT-NOTE-SUBJECTS:
 * is the SUBJECT of this sentence something we measured? Not "is it true" — a
 * true sentence about something we never read is still a claim we cannot
 * defend, and this panel's position is precisely that it says which half is our
 * limit and which half is the page. Three kinds of subject appear below, and
 * only the first two are answerable from here:
 *   · the screen's own output — checkable against the screen;
 *   · our own tools' behaviour — checkable in this repo, and checked: every
 *     "runs in your browser" below is backed by that tool having no route under
 *     src/app/api/tools at all, every "three a day per visitor" by an
 *     IP_DAILY_LIMIT of 3 in the tool's route, the links note's twenty-five by
 *     MAX_CHECKED_LINKS in src/lib/link-audit.ts, and the 1200×630 by OG_WIDTH
 *     and OG_HEIGHT in src/components/tools/og-image-generator.tsx;
 *   · what engines do, or what pages have in general — which nothing here reads.
 * The third kind is the one to refuse. It is also the one that reads best,
 * which is why it needs a test rather than an instinct.
 *
 * ⚠️ THE `aeo` NOTE CARRIED THREE CLAUSES OF THE THIRD KIND AND THE RULING SPLIT
 * THEM, which is why the split is recorded rather than just its outcome. The
 * three were "and nothing does", "They change what an engine finds when it
 * looks", and "FAQ schema makes your answers quotable". The first two STAND:
 * they WITHDRAW a promise about our own product rather than assert a fact about
 * the reader's page, and a disclaimer that overshoots costs the reader nothing.
 * The third had no such defence — a positive claim about what an artifact does
 * to an engine, from a panel that has never measured one — and
 * WS-EXT-AEO-NOTE-EFFICACY removed it.
 *
 * 🔴 IT WAS REMOVED RATHER THAN REPOINTED, AND THAT IS THE ONE THING TO CARRY
 * FORWARD FROM IT. The og:image fix worked by pointing at something the screen
 * already renders; this note had nothing to point at, and the check is not a
 * matter of looking harder. `screenAeo` and `citationDetail` together contain
 * zero occurrences of "FAQ", "faq", "llms", "schema" or "structured" — this is
 * the ONLY entry in the map whose tools and whose screen share no subject at
 * all. So both tools are now described by the artifact they produce and by
 * nothing else, and the note says outright that neither file is read here.
 * ⚠️ What it must NOT say is which element on the screen it means: `toolLinks`
 * renders in all four of a screen's states, and in two of them there is no
 * score card and no engine list to point at. The sentence names what the screen
 * REPORTS, which survives the empty branches.
 *
 * ⚠️ THE LABELS ARE HAND-COPIED and nothing compares them. Each is the tool
 * page's own title from `ToolsPages.<i18nKey>.meta.title` in messages/en.json;
 * the panel has no i18n and cannot import from src/, so this is a copy, and the
 * day a title is reworded the panel will keep announcing the old one. That is
 * the same exposure `oneLink`'s "Free Backlink Checker" already carries. The
 * slugs are the half that WOULD be caught — a wrong one 404s.
 */
const TOOL_LINKS = {
  aeo: {
    note: 'Neither of these makes an engine cite you, and nothing does. They change what an engine finds when it looks: llms.txt is a file naming the pages on your site worth reading, the FAQ one drafts question-and-answer pairs and the matching FAQPage JSON-LD. Neither file is read by anything on this screen — what it reports is citations that already happened, not what your site declares. The FAQ one runs a model for you and is capped at three a day per visitor.',
    tools: [
      ['llms-txt-generator', 'llms.txt Generator'],
      ['faq-generator', 'AI FAQ Generator'],
    ],
  },
  geo: {
    note: 'These write the two artifacts the checks above look for. Both run entirely in your browser — nothing is sent to us, and there is no limit.',
    tools: [
      ['llms-txt-generator', 'llms.txt Generator'],
      ['schema-generator', 'Schema Markup Generator'],
    ],
  },
  checks: {
    note: 'Two of the checks above are the title tag and the meta description. These draft them at the lengths those checks want. Both run a model for you and are capped at three a day per visitor.',
    tools: [
      ['title-generator', 'AI Title Generator'],
      ['description-generator', 'AI Meta Description Generator'],
    ],
  },
  schema: {
    note: 'These produce the JSON-LD this screen reads back: the first for any type, the second for the FAQPage block named above. If this screen says you have no FAQPage, the second one drafts it from the questions already on the page — but if it says questions in your FAQPage are not on the page, generating more schema is the wrong end: publish those answers where a reader can see them, or delete them from the block. The first runs in your browser; the second runs a model and is capped at three a day per visitor.',
    tools: [
      ['schema-generator', 'Schema Markup Generator'],
      ['faq-generator', 'AI FAQ Generator'],
    ],
  },
  social: {
    note: 'The list above is the tags; these are the two halves of filling it. The first writes the og: and twitter: block itself, the second builds the 1200×630 image the og:image tag has to point at — look for that key in the tag list above, because the count on this screen is every og: property together and never says whether that one is among them. Both run in your browser and nothing is uploaded.',
    tools: [
      ['open-graph-generator', 'Open Graph Tag Generator'],
      ['og-image-generator', 'OG Image Generator'],
    ],
  },
  /**
   * 🔴 THIS SCREEN MAKES TWO SEPARATE ASSERTIONS AND EACH TOOL ANSWERS ONE OF
   * THEM — robots.txt reachable (plus which AI crawlers it blocks), and
   * /sitemap.xml being a real sitemap rather than a soft 200. That is why two
   * is the right number here rather than the cap being spent.
   *
   * ⚠️ A THIRD CANDIDATE EXISTS AND IS DELIBERATELY NOT HERE. A sitemap
   * indexability checker answers whether the URLs INSIDE the sitemap can be
   * indexed — a question this screen never asks. Adding it would be treating
   * the two-per-screen cap as an allowance to spend rather than a ceiling the
   * rule rarely reaches, and the reader would get a third link that fits no
   * finding on the screen they are looking at.
   */
  robots: {
    note: 'This screen reads two files off the site; these write them. The first covers the AI crawlers by name, not just Googlebot, so a block reported above has something specific to edit. Both run entirely in your browser — nothing is sent to us, and there is no limit.',
    tools: [
      ['robots-txt-generator', 'robots.txt Generator'],
      ['sitemap-generator', 'Sitemap Generator'],
    ],
  },
  /**
   * WS-DISCOVERY-SURFACE — the Crawler access screen, which until now was the
   * ONLY screen with no outbound link of any kind: not in this
   * map, not `entryLinks`, not `oneLink`. Every other screen offered the reader
   * something, and the one that tests whether AI crawlers can reach the page at
   * all offered nothing.
   *
   * 🔴 SAME TOOL AS THE `robots` ENTRY ABOVE, AND THAT IS NOT A DUPLICATE.
   * src/diagnose/gap-tools.ts already maps two keys to one destination
   * (`seo.indexable.robots` and `geo.aibots` both go to this generator), for the
   * same reason: two screens can raise two different questions whose answer is
   * one file. `robots` reads the file off the site; this one sends live requests
   * and never opens it. The `robots` entry is deliberately untouched.
   *
   * 🔴 "NAMES EVERY CRAWLER LISTED ABOVE" IS MEASURED, NOT A TURN OF PHRASE,
   * and it is stated in one direction on purpose. This panel cannot import from
   * src/, so `CRAWLERS` in extension/crawlers.js is a separate hand-kept roster
   * from `AI_CRAWLERS` — claiming the two are "the same list" would be false.
   * What IS true, read at the time of writing: the generator's AI section is
   * `AI_ROBOTS_AGENTS` (src/lib/robots-txt.ts) = `AI_CRAWLERS.map(...)` plus the
   * two robots-only tokens, and every one of this screen's nine labels appears
   * in it — eight through AI_CRAWLERS, and Google-Extended through the
   * robots-only half. The generator additionally names six that this screen
   * never probes, so the relation is a strict superset in that direction and
   * must not be written as an equality. Nothing enforces it; if a crawler is
   * added to extension/crawlers.js and not to AI_CRAWLERS, this sentence goes
   * quietly false, which is the same exposure the hand-copied labels carry.
   *
   * 🔴 WHAT THIS NOTE MAY NOT BORROW FROM THE `robots` ENTRY. That one ends
   * "so a block reported above has something specific to edit". Here that would
   * CONTRADICT THE SCREEN: this screen's own warning says a block it reports may
   * mean the site admits only the vendor's verified crawler IPs — usually
   * correct configuration, with nothing to edit — and that this test cannot tell
   * the two apart. A note that told the reader they have something to fix would
   * be the panel disagreeing with itself one block later. So the note says what
   * the generator IS and stops.
   */
  crawler: {
    note: 'This screen sends the requests; nothing here writes a robots.txt. The generator does, and it names every crawler listed above, including the ones marked here as not live-tested. It runs entirely in your browser — nothing is sent to us, and there is no limit.',
    tools: [['robots-txt-generator', 'robots.txt Generator']],
  },
  hreflang: {
    note: 'This writes the block the screen above reads back, x-default included — the declaration whose absence is called out separately up there. It runs in your browser and there is no limit. It cannot tell you whether your site needs hreflang at all: a single-language site is complete without it, which is what the first line above says.',
    tools: [['hreflang-generator', 'Hreflang Tag Generator']],
  },
  /**
   * 🔴 THE ONE ENTRY THAT EXISTS UNDER THE SECOND CLAUSE OF THE RULE. Nothing
   * produces an outbound link, so under the original wording this screen was
   * permanently empty. What it does do is count internal links without ever
   * following one — so "are any of these dead?" is raised by the number and
   * left open by the screen. That is the question this tool answers.
   *
   * ⚠️ IT IS NOT A BROWSER TOOL, and the note says so rather than leaving the
   * reader to find out. It fetches the page and then visits each internal link
   * from our servers, so it is capped per visitor and it truncates: the reader
   * should know both before clicking, because a page with three hundred links
   * gets an answer about the first twenty-five of them.
   */
  links: {
    note: 'The count above is links found, not links that work — this screen never follows one. This visits each internal link and reports the dead ends. It runs on our servers rather than in your browser, so it is capped per visitor and checks the first twenty-five links on a page.',
    tools: [['internal-link-checker', 'Internal Link Checker']],
  },
  /**
   * WS-DISCOVERY-BATCH1 — the three page screens that had no tool link at all,
   * while the tool that answers each one had already shipped. One tool each:
   * the two-per-screen cap is a ceiling and not an allowance, which is what the
   * `robots` entry above records for turning a third candidate down.
   *
   * 🔴 ALL THREE NOTES SAY "Paste" BECAUSE ALL THREE TOOLS TAKE A TEXTAREA AND
   * NO URL — heading-structure-analyzer and alt-text-auditor parse pasted HTML,
   * word-density-analyzer pasted copy. None of them can be handed the page this
   * panel is looking at, and a note that implied otherwise would send the reader
   * to a form that comes back empty.
   *
   * ⚠️ A DRAFT OF THE headings NOTE SAID "check it against a target keyword",
   * AND IT WAS CUT RATHER THAN REWORDED. That input belongs to
   * word-density-analyzer, which holds two useState values and a target field;
   * heading-structure-analyzer holds one and has no keyword of any kind. The
   * subject test above is aimed at claims about engines — this was a wrong claim
   * about our own tool, the kind that passes that test and only fails when
   * somebody opens the tool.
   */
  headings: {
    note: 'Paste your HTML into the analyzer to check heading length. It runs in your browser.',
    tools: [['heading-structure-analyzer', 'Heading Structure Analyzer']],
  },
  density: {
    note: 'Paste your copy into the analyzer to compare term frequency across drafts. It runs in your browser.',
    tools: [['word-density-analyzer', 'Word Density Analyzer']],
  },
  images: {
    note: 'Paste your HTML into the auditor to review alt text away from the page. It runs in your browser.',
    tools: [['alt-text-auditor', 'Alt Text Auditor']],
  },
};

/**
 * 🔴 Called from `render()` after the screen, never from inside a renderer, and
 * that placement is what answers the empty-state half of this. A screen has
 * four states — data, a measured zero, nothing stored, and our own read having
 * failed — and the state with the most reason to offer a fix is the one with
 * the least code in it. Sitting outside the renderer, this cannot be reached by
 * three of the four and forgotten by the fourth.
 */
function toolLinks(screenId) {
  const entry = TOOL_LINKS[screenId];
  if (!entry) return null;
  const box = el('div', 'links');
  for (const [slug, label] of entry.tools) {
    const a = el('a', null, `${label} →`);
    a.href = `${SITE}/tools/${slug}?ref=extension-${screenId}`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    box.append(a);
  }
  return el(
    'div',
    'toolfix',
    el('span', 'caps', 'Free tools that change this'),
    el('p', 'qual', entry.note),
    box
  );
}

/**
 * WS-EXT-EMPTY-STATE-FIX — one destination, in the container `entryLinks` uses
 * so it wears identical styling and wraps identically at every panel width.
 *
 * 🔴 It exists because `entryLinks`' fixed trio is WRONG for one empty state.
 * The referring-domain list is written by exactly one thing — the public free
 * Backlink Checker — and the free audit does not fill it. Sending a reader to
 * /free-audit from that block would name an action that cannot produce what
 * they just failed to see, which is the same class of error as quoting another
 * feature's plan tiers beside it: nothing goes red, and the reader finds out by
 * doing the wrong thing.
 *
 * 🔴 NO `?url=` ON THE TOOL LINK, and that is measured rather than assumed:
 * /free-audit reads `searchParams` (its page destructures `{ url }`), and
 * tools/backlink-checker does NOT read searchParams at all. A url parameter
 * there is dropped in silence, so the link would carry a promise the landing
 * page never keeps — the reader would arrive at an empty form believing the
 * domain came with them. The bare link tells the truth about what happens.
 */
function oneLink(text, href) {
  const a = el('a', null, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noreferrer';
  return el('div', 'links', a);
}

// --- page scan (batch 2) ---------------------------------------------------

/**
 * 🔴 THE CATCH IS THE POINT, not defensive habit. Without it a rejected
 * sendMessage — the service worker going away, the port closing — escapes this
 * function and leaves `state.scan` on 'running' permanently. That state renders
 * a button labelled "Reading the page…" with `disabled` set, so the failure
 * took away the retry as well: the panel said it was still working, forever,
 * and the user could not even ask again.
 *
 * It resolves to the error branch rather than a new one, so it reaches
 * SCAN_ERROR.failed — "The scan did not complete. That is our failure, not a
 * finding about the site." That sentence was written for exactly this and had
 * no path to the screen, because every route to it ran after the promise
 * settled and this was the case where it never did.
 */
async function runScan() {
  state.scan = { state: 'running', data: null, error: null, query: '' };
  render();
  let res = null;
  try {
    res = await chrome.runtime.sendMessage({
      type: 'scanPage',
      tabId: state.tabId,
      // WS-EXT-UNKNOWN-URL — the worker needs an origin BEFORE it injects, to
      // decide whether a request the site did not ask for may be sent at all.
      // It comes from here rather than from chrome.tabs because this is the
      // address the panel is bound to and the one every screen is about.
      url: state.url,
    });
  } catch {
    // No new wording: a lost channel is the same fact as a scan that did not
    // complete, and inventing a second sentence for it would be inventing a
    // second finding.
    res = null;
  }
  state.scan = res?.data
    ? { state: 'ok', data: res.data, error: null, query: '' }
    : { state: 'error', data: null, error: res?.error ?? 'failed', query: '' };
  render();
}

/**
 * 🔴 The four scan failures are four different sentences, because they are four
 * different facts. Only one of them is about the site at all, and none of them
 * is a finding — a page we could not read is not a page that failed.
 */
const SCAN_ERROR = {
  no_access:
    'Chrome is not letting us read this page right now. That access lasts from the moment you click the TriRank icon until you navigate — click the icon on this page again and the scan will work.',
  no_tab:
    'We do not have a tab to read. Click the TriRank icon on the page you want to scan.',
  restricted:
    'Chrome blocks extensions from reading its own pages (chrome://, the Web Store). Nothing is wrong with the page — we are simply not allowed in.',
  no_result:
    'The page returned nothing to read. That is our failure, not a finding about the site.',
  failed:
    'The scan did not complete. That is our failure, not a finding about the site.',
};

/**
 * The page is read automatically when the panel opens, so this is a re-read, not
 * the way in. Two states it must not lie about:
 *   - running: it is already reading, and the button says so;
 *   - stale: the tab navigated somewhere we cannot look, so a re-read is KNOWN
 *     to fail. Offering a button that we know returns no_access is worse than
 *     saying plainly that the only way back in is the toolbar icon.
 */
function scanButton(label) {
  if (state.stale) {
    return el(
      'div',
      'scanbox',
      el(
        'p',
        'prose',
        'This page cannot be re-read from here — Chrome withdrew our access to the tab the moment it navigated. Click the TriRank icon on the new page and the panel will read it.'
      )
    );
  }
  const btn = el(
    'button',
    'scan',
    state.scan.state === 'running' ? 'Reading the page…' : label
  );
  btn.type = 'button';
  btn.disabled = state.scan.state === 'running';
  btn.addEventListener('click', runScan);
  const box = el('div', 'scanbox', btn);
  if (state.scan.state === 'error') {
    box.append(
      el('p', 'prose', SCAN_ERROR[state.scan.error] ?? SCAN_ERROR.failed)
    );
  }
  return box;
}

/**
 * 🔴 The interaction rule: any table over ~20 rows carries its own search and a
 * one-click copy, and the copy count reflects what the FILTER left, not the
 * whole set. A long table without a filter is furniture.
 */
function dataTable(rows, render_, copyLine) {
  const q = state.scan.query.trim().toLowerCase();
  const shown = q
    ? rows.filter((r) => copyLine(r).toLowerCase().includes(q))
    : rows;

  const input = el('input', null);
  input.type = 'search';
  input.placeholder = 'Filter…';
  input.value = state.scan.query;
  input.addEventListener('input', () => {
    state.scan.query = input.value;
    render();
    const again = document.querySelector('.tools input');
    if (again) {
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    }
  });

  const copy = el('button', 'copy', `Copy ${shown.length}`);
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(shown.map(copyLine).join('\n'));
    copy.textContent = `Copied ${shown.length}`;
  });

  const box = el('div', 'table');
  box.append(el('div', 'tools', input, copy));
  if (!shown.length) {
    box.append(
      el('p', 'prose', q ? 'Nothing matches that filter.' : 'Nothing to list.')
    );
    return box;
  }
  for (const r of shown) box.append(render_(r));
  return box;
}

function verdict(status, text) {
  return el(
    'div',
    `verdict ${status}`,
    el('span', `dot ${status}`),
    el('span', null, text)
  );
}

function screenHeadings() {
  const box = document.createDocumentFragment();
  box.append(
    el('h1', 'title', 'Heading levels'),
    el(
      'p',
      'qual',
      'Read from the page as it renders in your browser — after its JavaScript. Our server-side audit only ever sees the HTML before JavaScript runs, so on a site that builds itself in the browser this is the outline that exists and that one is empty.'
    ),
    scanButton('Read this page again')
  );

  if (state.scan.state !== 'ok') return box;

  const { headings, items, itemsTruncated, pageShape, ranAt } = state.scan.data;
  const h1 = headings.counts.h1;
  const skips = headings.skips;

  // 🔴 Verdict first, table second. The same H1 rule the server-side audit uses
  // (one = pass, none = fail, more than one = partial), so the two paths cannot
  // grade the same page differently.
  box.append(
    verdict(
      h1 === 1 ? 'ok' : h1 === 0 ? 'warn' : 'partial',
      h1 === 1
        ? 'One H1 — the page states what it is exactly once.'
        : h1 === 0
          ? 'No H1. Add one that describes the page.'
          : `${h1} H1 tags. Use exactly one.`
    ),
    verdict(
      skips.length === 0 ? 'ok' : 'partial',
      skips.length === 0
        ? 'No skipped levels — the outline steps down one level at a time.'
        : `${skips.length} skipped level${skips.length > 1 ? 's' : ''}: ${skips
            .map((s) => `h${s.from} → h${s.to}`)
            .join(
              ', '
            )}. A jump down more than one level reads as a missing section to anything parsing the outline.`
    ),
    el(
      'div',
      'card',
      el('span', 'caps', 'Count by level'),
      el(
        'div',
        'levels',
        ...[1, 2, 3, 4, 5, 6].map((n) =>
          el(
            'div',
            'lvl',
            el('span', 'k', `H${n}`),
            numCell('num md', headings.counts[`h${n}`])
          )
        )
      ),
      el(
        'p',
        'meta',
        `Source: this page in your browser · read ${new Date(ranAt).toLocaleTimeString('en-US')}`
      )
    )
  );

  // WS-EXT-ENRICH B-B — 🔴 A MEASUREMENT WITH NO DOT AND NO STATUS WORD, placed
  // visibly outside the two verdicts above it, for the reason numeralDensity
  // already carries: there is no honest verdict to attach. A "right" section
  // length does not exist — a reference table is complete under its heading at
  // twenty words and a tutorial step is thin at two hundred — so a threshold
  // here would be one we invented and then reported as a finding about the page.
  //
  // What is sayable without inventing anything is the spread, which is what an
  // author actually looks at: one 900-word section beside eleven 40-word ones
  // is a page whose shape a reader can see is wrong, and neither number on its
  // own says so.
  const sec = pageShape?.sections ?? null;
  if (sec) {
    box.append(
      el(
        'div',
        'measureonly',
        el('b', null, 'Words under each heading'),
        el('span', 'checkstatus', 'Measured, not graded'),
        el(
          'p',
          'checkdetail',
          `${sec.count} section${sec.count === 1 ? '' : 's'} — shortest ${sec.min}, median ${sec.median}, longest ${sec.max} words${sec.empty ? `. ${sec.empty} heading${sec.empty === 1 ? ' has' : 's have'} no text before the next one.` : '.'}`
        ),
        el(
          'p',
          'checkwhy',
          'A retrieval system lifts the passage under a heading, not the page. A section far longer than its neighbours has to be cut down before it can be quoted, and one with nothing under it gives an engine a promise with no answer behind it. There is no correct length, which is why this is a count and not a verdict.'
        )
      )
    );
  }

  // WS-EXT-ENRICH B-A ① — 🔴 THE HEADLINE NUMBER IS THE PAGE'S, NOT THE TABLE'S,
  // AND THIS IS THE declaredCount BUG A SECOND TIME. It printed `items.length`
  // — how many headings we KEPT — under the word "Outline", and `items` stops
  // at MAX_ITEMS. A page with 350 headings read as having 200, with the other
  // 150 marked only by a parenthesis that says "first 200" and not what it is
  // the first 200 OF.
  //
  // `headings.order` is the uncapped record: one entry per heading node on the
  // page, pushed before the cap is applied. It was already in the payload and
  // already the source `skips` is computed from — nothing read it, so the true
  // figure sat right here and was being discarded, exactly as declaredCount was.
  //
  // The fallback covers only a payload produced by an older scan than this
  // renderer, which needs a mid-session upgrade to happen at all; the two ship
  // together and every panel open re-scans.
  const headingTotal = Array.isArray(headings.order)
    ? headings.order.length
    : items.length;
  appendSome(
    box,
    el('span', 'caps', `Outline · ${headingTotal}`),
    // 🔴 Said in a sentence, not in a parenthesis after the count — the same
    // ruling the Links table already carries. "(first 200)" is the kind of note
    // a reader skims past and then reads the table as the whole page; what
    // changes how they read it is the count of what is NOT here.
    itemsTruncated
      ? el(
          'p',
          'meta',
          `Showing the first ${items.length} of ${headingTotal} headings on the page. The counts and skipped levels above are over all of them; this table is not.`
        )
      : null,
    dataTable(
      items,
      (it) =>
        el(
          'div',
          'tr',
          el('span', 'lvltag', `H${it.level}`),
          el('span', 'term', it.text || '(empty heading)')
        ),
      (it) => `H${it.level}\t${it.text}`
    )
  );
  return box;
}

/** Shared head of every page-read screen: what it is, where it came from, and
 *  the button. The provenance sentence is the same claim every time — measured
 *  here, after JavaScript, unlike the stored audit. */
function pageScreenHead(title, note) {
  const box = document.createDocumentFragment();
  box.append(
    el('h1', 'title', title),
    el('p', 'qual', note),
    scanButton('Read this page again')
  );
  return box;
}

function scanFooter(ranAt) {
  return el(
    'p',
    'meta',
    `Source: this page in your browser · read ${new Date(ranAt).toLocaleTimeString('en-US')}`
  );
}

function screenSchema() {
  const box = pageScreenHead(
    'Structured data',
    'JSON-LD as it exists in the live page. Types are read the way the audit reads them — @type plus @graph, nothing deeper — so both paths name the same schemas.'
  );
  if (state.scan.state !== 'ok') return box;
  const { schema, ranAt } = state.scan.data;
  const unique = [...new Set(schema.jsonLdTypes)];
  // WS-EXT-CLOSEOUT ② — 🔴 THE CORRECTION USED TO COME AFTER THE VERDICT AND
  // THAT ORDER MADE THE VERDICT A LIE FOR A WHOLE CLASS OF PAGE.
  //
  // With every block malformed, `jsonLdTypes` is empty, so the headline read
  // "No JSON-LD structured data found." — and the sentence that said three
  // blocks were there and none of them parsed was printed BELOW it, after two
  // more verdicts. A reader takes the first line. "Not found" and "found but
  // broken" are different things to do something about: one means write some
  // schema, the other means fix the JSON you already wrote.
  //
  // 🔴 The fix is ordering plus a clause in the verdict itself, not a fourth
  // row. The malformed count now leads, and each of the three verdicts says
  // "none of them parsed" inside its own sentence rather than relying on a line
  // the reader may never reach.
  //
  // ⚠️ THE OLD SENTENCE'S ARGUMENT SURVIVES VERBATIM — "counts as no schema at
  // all, for us and for every engine reading it" is true and is why the
  // statuses do not change. What changes is that a reader learns it before
  // being told the page has no structured data, not after.
  const allMalformed =
    schema.malformedBlocks > 0 && schema.malformedBlocks === schema.blockCount;
  const brokenNote = allMalformed
    ? ` All ${schema.blockCount} JSON-LD block${schema.blockCount === 1 ? '' : 's'} on this page failed to parse, so there is markup here — it just does not count, for us or for any engine reading it.`
    : '';
  if (schema.malformedBlocks > 0) {
    box.append(
      verdict(
        'partial',
        `${schema.malformedBlocks} of ${schema.blockCount} JSON-LD block${schema.blockCount === 1 ? '' : 's'} did not parse. A block that is not valid JSON counts as no schema at all — for us and for every engine reading it.`
      )
    );
  }
  box.append(
    // Same rules as the audit: any JSON-LD passes, FAQPage is its own GEO check.
    //
    // 🔴 THE BREADCRUMB ROW IS TWO VOCABULARIES MEETING, AND THIS ONE HAS NO
    // 'fail' IN IT. The audit grades an absent BreadcrumbList a 'fail'
    // (`buildSeoChecks`, src/diagnose/core.ts) and `SERVER_RULE` above mirrors
    // that. What `verdict` takes is not a check status: it is the dot's CSS
    // class, and the only ones that exist are ok / warn / partial — there is no
    // `verdict('fail')` anywhere in this file. So 'partial' below is not this
    // screen contradicting the grade, it is the nearest colour this vocabulary
    // owns. Do not "align" it to 'warn': that would be a user-visible change
    // made to settle a wording question, and the wording is settled here.
    verdict(
      unique.length ? 'ok' : 'warn',
      unique.length
        ? `Found schema types: ${unique.join(', ')}.`
        : `No usable JSON-LD structured data.${brokenNote}`
    ),
    verdict(
      schema.hasFaqPage ? 'ok' : 'warn',
      schema.hasFaqPage
        ? 'FAQPage schema found — AI engines can lift answers.'
        : `No FAQPage schema — answers are not machine-extractable.${allMalformed ? ' Whether this page declares one cannot be told from here while its blocks do not parse.' : ''}`
    ),
    verdict(
      schema.hasBreadcrumb ? 'ok' : 'partial',
      schema.hasBreadcrumb
        ? 'BreadcrumbList schema present.'
        : `No BreadcrumbList schema found.${allMalformed ? ' Same caveat as above — nothing on this page parsed.' : ''}`
    )
  );

  // WS-EXT-FAQ-CARRIERS — the row above says the page DECLARES a FAQ. This one
  // says whether a reader can find it. Four states, and the fourth is the one
  // that matters most: when our own read stopped short we say so, in our own
  // name, instead of grading the page on what we did not see.
  //
  // 🔴 THE SKIP CONDITION READS `faq.dropped`, NEVER `treeLimits`. Those four
  // counters are totals over every array and string on the page, so
  // `treeLimits.items > 0` is true for a page whose FAQ was untouched and false
  // for a page whose FAQ lost ten answers to a budget some other block spent.
  // A count with no basis attached cannot answer a question about one tree.
  //
  // 🔴 AND THE ROW IS ABSENT, NOT GREEN, WHEN THERE IS NOTHING TO SAY. A page
  // with no FAQ schema and no question-and-answer content on screen has already
  // been told, by the row above, that it declares no FAQPage. Printing a second
  // verdict there would turn "we found nothing to compare" into a finding.
  const faq = schema.faq;
  const sig = schema.faqSignals ?? {
    details: 0,
    microdata: 0,
    aria: 0,
    questionHeads: 0,
  };
  if (faq) {
    const missing = faq.items.filter((i) => !i.visible);
    if (!faq.parsedOk || faq.dropped.items > 0) {
      appendSome(
        box,
        verdict(
          'partial',
          `Couldn't compare: ${
            !faq.parsedOk
              ? 'some JSON-LD on this page did not parse, so we cannot tell whether a FAQ was inside it'
              : `this page declares more than the ${faq.dropped.maxItems} questions we read`
          }. That is our reading stopping, not a finding about your page.`
        )
      );
      // WS-EXT-FAQ-SCANSTATE — the two ways the DOM half of the comparison can
      // come back incomplete, said before any verdict is drawn from it.
      //
      // 🔴 WITHOUT THESE, THREE DIFFERENT THINGS RENDER IDENTICALLY. A question
      // we never looked for because the text walk hit its ceiling, a question we
      // could not look for because the walk threw, and a question that genuinely
      // is not on the page all arrive here as `visible: false` — and the row
      // below would report all three as "not on the page", which is a finding
      // about the site made out of our own failure. Both branches therefore stop
      // before FAIL-B: no M-of-N, no list of "missing" questions, because in
      // neither case do we know that any question is missing.
      //
      // ⚠️ THEY SIT AFTER the parse/cap SKIP and BEFORE the verdicts, not merged
      // into the SKIP above, because that one is about the JSON-LD side (what
      // the page DECLARED) and these are about the DOM side (what we managed to
      // READ). Same word on screen, two different halves failing, and a reader
      // who has to act on it needs to know which.
    } else if (faq.scanError) {
      appendSome(
        box,
        verdict(
          'partial',
          `Couldn't compare: reading the page's visible text failed (${String(
            faq.scanError
          ).slice(
            0,
            80
          )}). That is our reading stopping, not a finding about your page.`
        )
      );
    } else if (faq.scanTruncated) {
      // 🔴 20000 IS A SECOND COPY OF `FAQ_MAX_TEXT_NODES` IN
      // extension/background.js AND NOTHING COMPARES THEM. The payload carries
      // the boolean but not the ceiling, so the number cannot be derived here
      // without a field that does not exist yet — the honest fix is to send
      // it alongside `scanTruncated`, and that is a change to the other file.
      // Until then this is the same standing as the SERVER_RULE thresholds and
      // the SAME_ORIGIN_TIMEOUT_MS pair this extension already documents: a
      // comment is the mechanism.
      // ⚠️ Written as the bare digits `20000` and NOT as `20,000` on purpose:
      // whoever changes the constant will look for its value, and a grouped
      // copy is invisible to that search.
      appendSome(
        box,
        verdict(
          'partial',
          "Couldn't compare: this page has more text than we read (we stop at 20000 text nodes). That is our reading stopping, not a finding about your page."
        )
      );
    } else if (faq.present && faq.distinctCount > 0 && missing.length === 0) {
      appendSome(
        box,
        verdict(
          'ok',
          `All ${faq.distinctCount} question${faq.distinctCount === 1 ? '' : 's'} in your FAQPage schema also appear as visible text on this page — an engine quoting your schema will find the same words a reader does.`
        )
      );
    } else if (faq.present && missing.length > 0) {
      appendSome(
        box,
        verdict(
          'warn',
          `${missing.length} of ${faq.distinctCount} question${faq.distinctCount === 1 ? '' : 's'} in your FAQPage schema ${missing.length === 1 ? 'does' : 'do'} not appear anywhere in this page's visible text — schema describing content a reader cannot see is the one thing every engine's guidelines call out, so either publish those answers or drop them from the block. Questions only; answer text is not compared.`
        ),
        el('span', 'caps', `Declared but not on the page · ${missing.length}`),
        dataTable(
          missing.map((m, i) => ({ ...m, i })),
          (r) =>
            el('div', 'tr', el('span', 'lvltag', '?'), el('span', 'term', r.q)),
          (r) => r.q
        )
      );
    } else if (
      !faq.present &&
      (sig.microdata > 0 || sig.details >= 2 || sig.aria >= 2)
    ) {
      appendSome(
        box,
        verdict(
          'warn',
          sig.microdata > 0
            ? 'This page marks its questions up as microdata, and this screen reads JSON-LD — engines that only take JSON-LD see no FAQ here, so the same pairs are worth emitting as a FAQPage block too.'
            : 'This page has question-and-answer content but declares no FAQPage JSON-LD, so an engine has to infer the pairs instead of being handed them — the AI FAQ Generator below drafts the block from what is already here.'
        )
      );
    }
  }
  box.append(
    el('span', 'caps', `Types · ${schema.jsonLdTypes.length}`),
    dataTable(
      schema.jsonLdTypes.map((t, i) => ({ t, i })),
      (r) =>
        el('div', 'tr', el('span', 'lvltag', '{}'), el('span', 'term', r.t)),
      (r) => r.t
    ),
    schemaTree(schema),
    scanFooter(ranAt)
  );
  return box;
}

/**
 * WS-EXT-CONTENT ③ — the blocks themselves, not just their @type.
 *
 * 🔴 Named apart from everything above it, and deliberately so. `jsonLdTypes`
 * mirrors the server's collectJsonLdTypes, which records @type and nothing
 * deeper BY DESIGN — that is not a shortfall to be corrected here, and this is
 * not a better version of it. There is no stored counterpart to a block's
 * contents at all, so nothing on this screen compares the two: it is the
 * client-only reading, said to be one.
 */
function ldRows(node, key, depth, out) {
  if (node === null) {
    out.push({ depth, key, value: 'null' });
    return;
  }
  if (Array.isArray(node)) {
    out.push({ depth, key, value: `[ ${node.length} ]` });
    node.forEach((v, i) => {
      ldRows(v, String(i), depth + 1, out);
    });
    return;
  }
  if (typeof node === 'object') {
    const keys = Object.keys(node);
    out.push({ depth, key, value: `{ ${keys.length} }` });
    for (const k of keys) ldRows(node[k], k, depth + 1, out);
    return;
  }
  out.push({ depth, key, value: String(node) });
}

function schemaTree(schema) {
  const trees = schema.trees;
  if (!Array.isArray(trees) || !trees.length) return null;
  const rows = [];
  trees.forEach((t, i) => {
    ldRows(t, trees.length > 1 ? `Block ${i + 1}` : 'Block', 0, rows);
  });

  const box = document.createDocumentFragment();
  box.append(
    el('span', 'caps', `Every field in the blocks · ${rows.length}`),
    el(
      'p',
      'qual',
      'Read from this page after its JavaScript ran. The stored audit records only each block’s @type — it never keeps the contents — so there is nothing stored to compare this with, and nothing here is a second opinion on the types above.'
    )
  );

  // 🔴 The budget, said out loud. Every limit that actually bit gets a clause;
  // a limit that did not bite says nothing, because listing it would imply
  // something was removed when nothing was.
  const l = schema.treeLimits ?? {};
  const cut = [];
  if (l.depth)
    cut.push(
      `${l.depth} branch${l.depth === 1 ? '' : 'es'} deeper than ${l.maxDepth} levels ${l.depth === 1 ? 'is' : 'are'} not expanded`
    );
  if (l.fields)
    cut.push(
      `${l.fields} field${l.fields === 1 ? '' : 's'} past the ${l.maxFields}-field budget ${l.fields === 1 ? 'is' : 'are'} not shown`
    );
  if (l.items)
    cut.push(
      `${l.items} array item${l.items === 1 ? '' : 's'} past the first ${l.maxArray} in their list ${l.items === 1 ? 'is' : 'are'} not shown`
    );
  if (l.values)
    cut.push(
      `${l.values} value${l.values === 1 ? '' : 's'} ${l.values === 1 ? 'is' : 'are'} cut to ${l.maxValue} characters and end in an ellipsis`
    );
  box.append(
    cut.length
      ? // 🔴 Neutral, not the warn palette. Everything this sentence describes
        // is a limit WE imposed — the page is not doing anything wrong by
        // carrying a big block, and colouring our own budget as a problem with
        // the site is exactly the confusion the four states exist to prevent.
        el(
          'p',
          'disclosure',
          `This is not the whole of what the page carries: ${cut.join('; ')}. The limits are ours — a page's JSON-LD can be arbitrarily large, and we do not copy an unbounded amount of someone else's markup into the panel. Read the page source for the parts that are not here.`
        )
      : el(
          'p',
          'meta',
          'Nothing was left out: every block fits inside the limits this panel copies under.'
        )
  );

  box.append(
    dataTable(
      rows,
      (r) =>
        el(
          'div',
          `tr ld d${Math.min(r.depth, 6)}`,
          el('span', 'ldkey', r.key),
          el('span', 'term', r.value)
        ),
      (r) => `${'  '.repeat(r.depth)}${r.key}: ${r.value}`
    )
  );
  return box;
}

function screenSocial() {
  const box = pageScreenHead(
    'Page declarations',
    'What this page states about itself to something that is not a reader. Open Graph and Twitter card tags are counted exactly as the audit counts them: every og:* property, every twitter:* name.'
  );
  if (state.scan.state !== 'ok') return box;
  const { head, pageShape, social, ranAt } = state.scan.data;
  box.append(
    // WS-EXT-VERDICT-TO-FIX ① — 🔴 A GRADE COMPUTED FROM A NUMBER THAT CANNOT
    // CARRY IT. Both of these rows used to be `verdict(...)`, coloured from
    // `ogCount >= 2` and `twitterCount >= 1`. The counts are honest — the
    // header above says exactly what they count, and `background.js` counts it
    // the same way `src/diagnose/fetch.ts` does — but the thresholds decide
    // HOW MANY and the reader's question is WHICH.
    //
    // 🔴 THE NUMBERS ARE NOT REPLACED WITH BETTER NUMBERS, because there is no
    // number that separates the cases. Two `og:locale` tags reach 2 and produce
    // no card; `og:title` + `og:image` reach 2 and produce one. The thing that
    // answers it is already on this screen — the Tags table below lists every
    // key and value — so the dot was not summarising that table, it was
    // competing with it.
    //
    // ⚠️ THE AUDIT'S BAR IS UNTOUCHED AND STAYS WHERE IT MEANS SOMETHING.
    // `SERVER_RULE` in this file still reproduces `seo.meta.og` and
    // `seo.meta.twitter` verbatim, on purpose: that map exists to put the
    // stored verdict beside the live one, and its own note says guessing at a
    // rule we could not copy would show a manufactured disagreement. Nothing in
    // src/ changes either. What is withdrawn is this screen issuing the audit's
    // grade a second time, on its own account.
    el(
      'div',
      'measureonly',
      el('b', null, 'Open Graph tags'),
      el('span', 'checkstatus', 'Measured, not graded'),
      el('p', 'checkdetail', `${social.ogCount} Open Graph tag(s) found.`),
      el(
        'p',
        'checkwhy',
        'This counts every meta tag whose property starts with og: and it does not look at which ones. A card needs og:title and og:image to render as more than a bare link; two og:locale tags reach the same number and produce none of it. Which tags are actually here is the table below. No count separates those cases, which is why this is a count and not a verdict.'
      )
    ),
    el(
      'div',
      'measureonly',
      el('b', null, 'Twitter card tags'),
      el('span', 'checkstatus', 'Measured, not graded'),
      el(
        'p',
        'checkdetail',
        `${social.twitterCount} Twitter card tag(s) found.`
      ),
      el(
        'p',
        'checkwhy',
        'This counts every meta tag whose name starts with twitter: and, like the row above, does not look at which ones. X reads the og: tags when a twitter: equivalent is absent, so a page with none of these can still produce a complete card. The table below says which of them this page sets.'
      )
    ),
    // WS-EXT-ENRICH B-B — 🔴 TWO MORE HEAD DECLARATIONS ON THE SCREEN THAT IS
    // ALREADY ABOUT HOW THIS PAGE PRESENTS ITSELF WHEN SOMETHING ELSE SHOWS IT.
    // og:image is the picture on a shared card; the favicon is the mark beside
    // the link, including beside a citation in an AI answer. Same family, same
    // screen.
    //
    // ✅ THE TITLE MISMATCH THIS NOTE USED TO FLAG IS CLOSED. It said "Social
    // tags" did not cover a favicon or an analytics tag and left the choice to
    // PM; the ruling was to rename rather than to split, so the screen is now
    // 'Page declarations' and this block is inside its subject rather than
    // beside it.
    //
    // 🔴 THE FAVICON IS THE DECLARATION, NOT A FETCH. We do not request the href
    // to see whether it resolves — that is a new request to a URL the page
    // chose, and the whole point of this batch is that it adds none.
    el(
      'div',
      'card',
      el('span', 'caps', 'Other head declarations'),
      el(
        'div',
        'row',
        el('span', 'label', 'Favicon'),
        // WS-EXT-HONEST-SURFACE A4 — 🔴 `sizes` WAS THE ONE FIELD IN THE WHOLE
        // SCAN PAYLOAD WITH ZERO REFERENCES ANYWHERE IN extension/. It was read
        // off the same `<link>` as `rel` and `href` in the same pass and then
        // dropped on the floor.
        //
        // 🔴 ABSENT IS SAID, NOT LEFT BLANK, and it is said WITHOUT a fault
        // attached. `sizes` is optional in HTML and a single .ico legitimately
        // carries none — so "no sizes declared" is where this stops. What it
        // must not become is a finding: the row above it in this card is graded
        // nowhere, and this screen's own rule is that a fact we happen to hold is
        // not a reason to invent a requirement for it.
        el(
          'span',
          'term',
          head?.clientOnly?.favicon
            ? `${head.clientOnly.favicon.rel} → ${head.clientOnly.favicon.href ?? '(no href)'} · ${head.clientOnly.favicon.sizes ? `sizes ${head.clientOnly.favicon.sizes}` : 'no sizes declared'}`
            : 'none declared — a browser or a citation card falls back to /favicon.ico, which may or may not be there'
        )
      ),
      // 🔴 Reported, never graded. Neither tag moves whether an engine cites
      // you, so a verdict on them would be padding the check count with
      // something we cannot justify — the exact thing we hold the competitor to.
      el(
        'div',
        'row',
        el('span', 'label', 'Analytics / ads'),
        el(
          'span',
          'term',
          (() => {
            const t = pageShape?.thirdParty;
            if (!t) return 'not read';
            const on = [
              t.googleAnalytics ? 'Google Analytics' : null,
              t.googleTagManager ? 'Google Tag Manager' : null,
              t.adSense ? 'AdSense' : null,
            ].filter(Boolean);
            return on.length ? on.join(', ') : 'none of the three we look for';
          })()
        )
      ),
      el(
        'p',
        'meta',
        'Read from the scripts declared on this page, so a tag that a tag manager injects later reads as absent, and a page that only mentions the name reads as present. Neither line is graded — they are here because they are facts about this page we already hold, not because they move AI citation.'
      )
    ),
    el('span', 'caps', `Tags · ${social.items.length}`),
    dataTable(
      social.items,
      (r) =>
        el(
          'div',
          'tr wide',
          el('span', 'lvltag', r.key),
          el('span', 'term', r.value || '(empty)')
        ),
      (r) => `${r.key}\t${r.value}`
    ),
    scanFooter(ranAt)
  );
  return box;
}

function screenImages() {
  const box = pageScreenHead(
    'Images',
    'Every <img> in the live page. Alt and title are counted the way the audit counts them, so those numbers are comparable.'
  );
  if (state.scan.state !== 'ok') return box;
  const { images, ranAt } = state.scan.data;
  const missing = images.total - images.withAlt;
  appendSome(
    box,
    verdict(
      images.total === 0 || images.withAlt === images.total
        ? 'ok'
        : images.withAlt / images.total >= 0.9
          ? 'partial'
          : 'warn',
      images.total === 0
        ? 'No images to check.'
        : missing === 0
          ? 'All images have an alt attribute.'
          : `${missing} of ${images.total} images have no alt attribute.`
    ),
    // 🔴 The one field that CANNOT be compared across the two paths, said out
    // loud rather than quietly dropped: the audit counts placeholder srcs in
    // the HTML as delivered; by the time this code runs the swap has already
    // happened, so the same name would mean two different things.
    el(
      'div',
      'card',
      el('span', 'caps', 'Lazy loading — read differently here'),
      el(
        'p',
        'qual',
        `The stored audit counts images whose delivered src was a placeholder waiting for JavaScript. This screen runs after that swap, so it cannot see those and does not pretend to. What it can see: ${images.clientOnly.lazyAttr} image(s) marked loading="lazy", ${images.clientOnly.swappedAfterLoad} whose rendered source differs from the src attribute, ${images.clientOnly.notLoaded} not loaded at the moment of reading. A difference between the two screens here is expected, not an error.`
      )
    ),
    el(
      'div',
      'card',
      el('span', 'caps', 'Counts'),
      el(
        'div',
        'levels',
        el(
          'div',
          'lvl',
          el('span', 'k', 'TOTAL'),
          numCell('num md', images.total)
        ),
        el(
          'div',
          'lvl',
          el('span', 'k', 'ALT'),
          numCell('num md', images.withAlt)
        ),
        el(
          'div',
          'lvl',
          el('span', 'k', 'TITLE'),
          numCell('num md', images.withTitle)
        ),
        // WS-EXT-ENRICH B-B — counted in collectOutline's single pass over every
        // <img>, keyed on the resolved source. NOT derived from the table below,
        // which stops at 100: a unique count taken from a capped list answers a
        // question about the cap.
        el(
          'div',
          'lvl',
          el('span', 'k', 'UNIQUE'),
          numCell('num md', images.unique ?? images.total)
        )
      ),
      scanFooter(ranAt)
    ),
    el('span', 'caps', `Images · ${images.items.length}`),
    // WS-EXT-CANT-VS-ISNT 笔一 — 🔴 THE LAST TABLE STILL USING THE PARENTHESIS,
    // AND THE ONLY ONE THAT ACTUALLY TRUNCATES IN PRODUCTION. Links and Heading
    // levels were both moved to a sentence; this one kept "(first 100)", which
    // does not say a hundred OF WHAT — measured, bbc.com delivers 144 images and
    // theverge.com 150, so the parenthesis was appearing on real pages while the
    // TOTAL cell four rows above already said 144.
    images.itemsTruncated
      ? el(
          'p',
          'meta',
          `Showing the first ${images.items.length} of ${images.total} images on the page. The counts above are over all of them; this table is not.`
        )
      : null,
    // WS-EXT-ENRICH B-A ③ — 🔴 THREE FIELDS THAT WERE COLLECTED PER IMAGE AND
    // THROWN AWAY PER IMAGE. `title`, `loading` and `swappedAfterLoad` are
    // recorded on every row of `images.items` and were read by nothing; only
    // their AGGREGATES reached the screen (the TITLE count above, and the lazy /
    // swapped / not-loaded sentence). So the panel could say "17 images have no
    // title" and could not say WHICH — the one question a reader has after
    // reading the count.
    //
    // 🔴 THE COUNTS ABOVE ARE NOT TOUCHED. They are computed in collectOutline's
    // single pass over every <img>; this table is at most the first 100. Same
    // ruling as the Links filter: a total and a listing are two measurements and
    // only one of them is capped.
    //
    // Reuses `.tr.quad` rather than adding a row shape: two max-content tag
    // columns, the text, and the source on its own full-width line. That is
    // exactly this row's shape — a verdict tag, a flag cluster, the alt text,
    // and a long URL that must not squeeze the other three.
    dataTable(
      images.items,
      (r) => {
        // Only true flags are shown. A row of mostly-absent markers reads as
        // noise, and "not lazy" is not a finding about an image.
        const flags = [];
        if (r.title !== null && r.title !== undefined) flags.push('TITLE');
        if (r.loading === 'lazy') flags.push('LAZY');
        if (r.swappedAfterLoad) flags.push('SWAP');
        return el(
          'div',
          'tr quad',
          el('span', 'lvltag', r.alt === null ? 'NO ALT' : 'ALT'),
          el('span', 'lvltag', flags.length ? flags.join(' ') : '—'),
          el('span', r.alt ? 'term' : 'term empty', r.alt || '(no alt text)'),
          el('span', 'term href', r.realSrc || r.src || '(no source)')
        );
      },
      // 🔴 The copy line carries the title's VALUE, which the row deliberately
      // does not: a title can be a sentence, and a sentence in a max-content
      // column is the row eating itself. Presence is the finding, the text is
      // the detail, and an export is where detail belongs.
      (r) =>
        `${r.alt === null ? '(no alt)' : r.alt}\t${r.title ?? '(no title)'}\t${r.loading ?? ''}\t${r.swappedAfterLoad ? 'swapped' : ''}\t${r.realSrc || r.src || ''}`
    )
  );
  return box;
}

// --- CSV, second copy ------------------------------------------------------

/**
 * WS-EXT-LINKS-V2 — 🔴 THIS IS A SECOND COPY OF src/lib/csv.ts, NOT A SHARED
 * MODULE, AND IT CANNOT BE ONE. The panel ships as static files with no bundler
 * and no dependencies; it cannot import from the Next app, and the Next app's
 * copy cannot import from here. So the escaping rule and the spreadsheet-formula
 * guard now exist twice in this repository. Nothing keeps them in step — no
 * gate compares them, and changing one is silent. A matching note sits on
 * `quote` in src/lib/csv.ts so whoever opens either one learns the other exists.
 *
 * Kept deliberately identical to the server's `csvCellStrict` + `quote`:
 *   - an empty cell THROWS rather than becoming '', because a blank cell cannot
 *     be told apart from any other absence (the caller names the absence — the
 *     Links export maps an empty anchor to '(no anchor text)', the same words
 *     the table shows);
 *   - a cell starting with = + - @ tab or CR is prefixed with an apostrophe, so
 *     a spreadsheet displays it instead of executing it — EXCEPT a cell that is
 *     a plain number, which cannot execute into anything but itself (see
 *     `NUMERIC_LITERAL` below).
 */

/**
 * WS-CSV-NEGATIVE-NUMBER — 🔴 THE ONE HOLE IN THE FORMULA GUARD, AND IT IS A
 * SECOND COPY TOO. Without it a measured -30 lands in the file as `'-30`, text
 * rather than a number; with it, exactly one of the six guarded leads can be
 * skipped, and only when what follows is a whole number and nothing else.
 *
 * The grammar is RFC 8259's number — one optional leading minus, no leading
 * `+`, no leading zeros, no bare `.5`, no separators, no `Infinity`. `-30 -40`,
 * `--30`, `- 30`, `-1-1`, `-=1`, `-` and `+30` all keep their apostrophe; the
 * full argument, and the measured list of what stays guarded and why, is the
 * docblock on `NUMERIC_LITERAL` in src/lib/csv.ts.
 *
 * 🔴 THE NAME AND THE REGEX ARE SPELLED IDENTICALLY TO THE SERVER'S ON PURPOSE,
 * so the two copies can be compared by machine instead of by eye:
 *   grep -h '^const NUMERIC_LITERAL = ' src/lib/csv.ts extension/sidepanel.js |
 *     sort -u | wc -l    # 1 means they still agree; 2 means they have drifted
 * The `^const` anchor is load-bearing: unanchored, the pattern matches this
 * very comment in both files and reports drift where there is none.
 * This panel's Links export carries free anchor text scraped off whatever page
 * the user is on, so the guard here is the one facing the least trusted input
 * in the repository — which is exactly why its hole is defined by a published
 * grammar rather than by whatever looked numeric on the day.
 */
const NUMERIC_LITERAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?$/;

function csvCellStrictExt(value) {
  if (value === '') {
    throw new Error(
      'csvCellStrictExt: empty cell. Name the absence at the call site instead ' +
        'of passing a blank — a blank cell cannot be told apart from any other.'
    );
  }
  const guarded =
    /^[=+\-@\t\r]/.test(value) && !NUMERIC_LITERAL.test(value)
      ? `'${value}`
      : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** CRLF, because Excel is the reader — same choice as the server's csvJoin. */
function csvJoinExt(rows) {
  return rows.map((r) => r.join(',')).join('\r\n');
}

/** BOM so Excel reads UTF-8 anchors and hosts correctly instead of mojibake. */
function saveCsvExt(filename, csv) {
  const blob = new Blob([`\ufeff${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * The rows the Links table and the Links export both read. ONE function so the
 * file can never disagree with the screen it was exported from.
 */
function filteredLinkItems(items, filter) {
  return items.filter(
    (r) =>
      (filter.scope === 'all' || r.scope === filter.scope) &&
      (filter.rel === 'all' || r.rel === filter.rel)
  );
}

/** The export's rows, absences named rather than blank (see csvCellStrictExt). */
/**
 * WS-EXT-HONEST-SURFACE B3 — 🔴 THE TABLE SAID AN ANCHOR WAS CLIPPED AND THE
 * FILE DID NOT. `anchorTruncated` reached the row renderer, which appends an
 * ellipsis, and reached neither the CSV nor the clipboard line — so a 300-word
 * anchor and an anchor that is genuinely 118 characters long left this panel as
 * the same cell, in the one artefact that outlives the screen.
 *
 * 🔴 A COLUMN, NOT AN ELLIPSIS, AND THE TWO SURFACES DELIBERATELY DIFFER.
 *   · CSV → a fifth field, `anchor_truncated`, yes/no. This file is for
 *     secondary processing, and an ellipsis glued into the DATA cannot be told
 *     apart from an anchor whose author actually ended it in "…". A separate
 *     field is sortable, filterable and cannot collide with the text.
 *   · clipboard → the ellipsis, matching the table. That line has no header row
 *     to name a fifth field, and the Copy button's promise is "the rows you are
 *     looking at".
 *
 * 🔴 WHY THE TEXT IS NOT EXPORTED IN FULL, WHICH IS THE OTHER WAY THIS COULD
 * HAVE GONE. The full anchor is not ours to export: `collectOutline` slices at
 * ANCHOR_MAX_CHARS **inside the page**, so nothing on this side of the message
 * channel has ever held it. Exporting it in full is not an export change at all
 * — it is a decision to pull unbounded text off an arbitrary page through the
 * channel, up to 150 rows of it, and this file already has a ruling on exactly
 * that shape: `shapeLd` in background.js copies under four hard limits because
 * "a page's JSON-LD ... can be arbitrarily large and deep, and none of it is
 * ours". Widening the anchor would contradict that ruling for a lesser reason.
 * ⚠️ PM's stated lean was the full text. This is the argument against it, put
 * where the next person will look; it is a payload-width decision, not a
 * formatting one, and it can be revisited on that basis.
 */
function linkExportRows(items, filter) {
  const rows = [['scope', 'rel', 'anchor', 'anchor_truncated', 'href']];
  for (const r of filteredLinkItems(items, filter)) {
    rows.push([
      r.scope,
      r.rel,
      r.anchor || '(no anchor text)',
      // Never '' — csvCellStrictExt throws on an empty cell by design, and the
      // absence would be unreadable anyway. A payload from before
      // `anchorTruncated` existed reports 'no', which is what the previous build
      // silently claimed; it is not a new assertion.
      r.anchorTruncated === true ? 'yes' : 'no',
      r.href,
    ]);
  }
  return rows;
}

/**
 * 🔴 THE FILE NAME CARRIES THE TRUNCATION, BECAUSE THE SENTENCE ON SCREEN DOES
 * NOT TRAVEL WITH THE FILE. The table says in a full sentence that it shows the
 * first 150 of N links; a CSV opened next week has no such sentence and no
 * place to put one without breaking the column structure. Encoding it in the
 * name is the lightest carrier that leaves with the file: a reader who sees
 * `-150of412-` knows the rows are a prefix, not the page (red line 3).
 */
function linkExportFilename(host, items, total, filter) {
  const shown = filteredLinkItems(items, filter).length;
  const truncated = total > items.length ? `-${items.length}of${total}` : '';
  const scoped =
    filter.scope === 'all' && filter.rel === 'all'
      ? ''
      : `-${filter.scope}-${filter.rel}-${shown}`;
  return `trirank-links-${host || 'page'}${truncated}${scoped}.csv`;
}

function screenLinks() {
  const box = pageScreenHead(
    'Links',
    'Links in the live page. Internal/external and dofollow/nofollow use the audit’s own rules (#, mailto:, tel: and non-http links are skipped; www is ignored when comparing hosts).'
  );
  if (state.scan.state !== 'ok') return box;
  const { links, ranAt } = state.scan.data;
  appendSome(
    box,
    // WS-EXT-VERDICT-TO-FIX ① — 🔴 GRADED ON A BAR CALIBRATED FOR A DIFFERENT
    // PAGE, AND THAT IS THE HARDER HALF OF WHY IT IS GONE. The thresholds this
    // row used — 10 for ok, 3 for partial — are the audit's `seo.links.internal`
    // in src/diagnose/core.ts, and the audit's own sentence says what it
    // measured them against: `internal link(s) on the homepage.` This screen
    // reads whatever page the reader happens to be on. A hub that lists a
    // section and a single article at the end of it are both doing their job at
    // very different counts, so the dot was answering a question this screen
    // never asked.
    //
    // 🔴 NO REPLACEMENT NUMBER. There is no recorded basis for 10 anywhere in
    // this repo — the rule arrived whole in `19895d0` with no comment, and
    // nothing since has written one — so choosing a different bar here would be
    // inventing one and printing it as a finding.
    //
    // ⚠️ `SERVER_RULE` still mirrors the audit's version of this check, for the
    // reason its own note gives. The audit keeps its grade for the page it
    // calibrated it on; this screen stops re-issuing it for every other page.
    el(
      'div',
      'measureonly',
      el('b', null, 'Internal links'),
      el('span', 'checkstatus', 'Measured, not graded'),
      el(
        'p',
        'checkdetail',
        `${links.internal} internal link(s) on this page.`
      ),
      el(
        'p',
        'checkwhy',
        'Internal links are how a crawler reaches the rest of a site and how a page says which other pages belong beside it. How many a page should carry depends on what the page is — a hub that lists a section and a single article at the end of it are both doing their job at very different counts. There is no correct number, which is why this is a count and not a verdict.'
      )
    ),
    // 🔴 Second divergence, stated in the same breath as the numbers: anything
    // JavaScript added is in here and was never in the audit's copy.
    el(
      'div',
      'card',
      el('span', 'caps', 'Why this can exceed the stored audit'),
      el(
        'p',
        'qual',
        'These are the links present after the page ran. Navigation, carousels and anything else built in the browser are included, and none of them existed in the HTML the audit parsed. A higher number here is the two paths measuring different moments, not a contradiction.'
      )
    ),
    el(
      'div',
      'card',
      el('span', 'caps', 'Counts'),
      el(
        'div',
        'levels',
        el(
          'div',
          'lvl',
          el('span', 'k', 'INTERNAL'),
          numCell('num md', links.internal)
        ),
        el(
          'div',
          'lvl',
          el('span', 'k', 'EXTERNAL'),
          numCell('num md', links.external)
        ),
        el(
          'div',
          'lvl',
          el('span', 'k', 'DOFOLLOW'),
          numCell('num md', links.dofollow)
        ),
        el(
          'div',
          'lvl',
          el('span', 'k', 'NOFOLLOW'),
          numCell('num md', links.nofollow)
        ),
        // WS-EXT-ENRICH B-B — 🔴 BOTH COME FROM THE SINGLE PASS, NOT FROM
        // `links.items`. That array stops at 150, so de-duplicating it would
        // report the unique destinations AMONG THE FIRST 150 under the word
        // "unique" — the same substitution the Outline count and declaredCount
        // were both making. `unique` keys on the resolved absolute URL, so
        // `/pricing` and `https://host/pricing` count once.
        el(
          'div',
          'lvl',
          el('span', 'k', 'TOTAL'),
          numCell('num md', links.total ?? links.internal + links.external)
        ),
        el(
          'div',
          'lvl',
          el('span', 'k', 'UNIQUE'),
          numCell('num md', links.unique ?? links.internal + links.external)
        )
      ),
      scanFooter(ranAt)
    ),
    el('span', 'caps', `Links · ${links.items.length}`),
    // WS-EXT-LINKS-V2 — filter + export.
    //
    // 🔴 THE FOUR COUNTS ABOVE DO NOT MOVE WHEN A FILTER IS ON, AND THAT IS THE
    // WHOLE POINT. They are counted inside collectOutline's single pass over
    // every anchor on the page; this table is at most the first 150. If
    // filtering rewrote them, one position on screen would silently switch from
    // "all links on the page" to "the loaded subset matching your filter" —
    // two different measurements wearing one label, which is exactly the
    // confusion red line 3 exists to stop. The filter narrows the TABLE and
    // says so; the totals keep answering the question they were built for.
    //
    // ⚠️ PER-LINK STATUS CHECKING IS NOT HERE AND WAS NOT AN OVERSIGHT. Ahrefs'
    // outbound-links screen shows an HTTP status per row; doing that means
    // requesting every external URL on the page — a new egress destination, and
    // an unbounded one (any third-party host), which would need
    // `optional_host_permissions` to be exercised and would have to be added to
    // the egress ledger. That is a separate decision with a separate blast
    // radius, and no work item is open for it.
    linksFilterBar(links),
    linksExportBar(links),
    // 🔴 WS-EXT-CONTENT ② — the truncation is said in a sentence, not in a
    // parenthesis after a count. "(first 150)" is the kind of note a reader
    // skims past and then reads the table as the whole page; the count of what
    // is NOT here is the part that changes how they read it.
    links.itemsTruncated
      ? el(
          'p',
          'meta',
          `Showing the first ${links.items.length} of ${links.internal + links.external} links on the page. The counts above are over all of them; this table is not.`
        )
      : null,
    dataTable(
      filteredLinkItems(links.items, state.linksFilter),
      // 🔴 Four fields, four columns — the reading is scope, then whether it
      // passes authority, then what it says, then where it goes. The old two
      // columns did not merely hide two fields: one tag had to stand for both
      // scope and rel, so an internal nofollow link showed as "NOFO" and its
      // scope was gone, and a row fell back to printing the href when the
      // anchor was empty, which made a missing anchor look like a URL anchor.
      (r) =>
        el(
          'div',
          'tr quad',
          el('span', 'lvltag', r.scope === 'internal' ? 'INT' : 'EXT'),
          el(
            'span',
            `lvltag rel${r.rel === 'nofollow' ? ' off' : ''}`,
            r.rel === 'nofollow' ? 'NOFO' : 'DO'
          ),
          // An empty anchor is a finding of its own — an image link, an icon, or
          // a link with nothing for a reader or an engine to read — so it is
          // named rather than papered over with the href.
          el(
            'span',
            r.anchor ? 'term' : 'term empty',
            // ④ — an ellipsis is the whole marker. Without it a clipped anchor
            // reads as the complete anchor text, and the table is the one place
            // a reader compares anchors to each other.
            r.anchor
              ? r.anchorTruncated
                ? `${r.anchor}…`
                : r.anchor
              : '(no anchor text)'
          ),
          el('span', 'term href', r.href)
        ),
      // B3 — the ellipsis, matching the table above. See linkExportRows for
      // why the CSV gets a field instead and why neither carries the full text.
      (r) =>
        `${r.scope}\t${r.rel}\t${r.anchor}${r.anchorTruncated === true ? '…' : ''}\t${r.href}`
    ),
    // A filter that matches nothing is a finding, not an error: it says this
    // page has no link of that kind AMONG THE LOADED ROWS. The second half is
    // load-bearing when the table is truncated, so it is said rather than left
    // to a reader who has scrolled past the sentence above.
    filteredLinkItems(links.items, state.linksFilter).length === 0
      ? el(
          'p',
          'meta',
          links.itemsTruncated
            ? 'No link of this kind among the loaded rows. The page has more links than are loaded here, so this is not a statement about the whole page.'
            : 'No link of this kind on this page.'
        )
      : null
  );
  return box;
}

/** The two filter axes. 'ALL' is the default on both and is never a data value. */
function linksFilterBar(links) {
  const bar = el('div', 'card', el('span', 'caps', 'Filter'));
  const row = el('div', 'levels');
  const axis = (key, values) => {
    for (const v of values) {
      const on = state.linksFilter[key] === v;
      const b = el('button', `lvltag${on ? '' : ' off'}`, v.toUpperCase());
      b.type = 'button';
      b.setAttribute('data-filter', `${key}:${v}`);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.addEventListener('click', () => {
        state.linksFilter = { ...state.linksFilter, [key]: v };
        render();
      });
      row.append(b);
    }
  };
  axis('scope', ['all', 'internal', 'external']);
  axis('rel', ['all', 'dofollow', 'nofollow']);
  bar.append(row);
  return bar;
}

/** Export what the table currently shows — never more, never less. */
function linksExportBar(links) {
  const total = links.internal + links.external;
  const shown = filteredLinkItems(links.items, state.linksFilter).length;
  const bar = el('div', 'card', el('span', 'caps', 'Export'));
  const btn = el('button', 'lvltag', `EXPORT ${shown} ROW(S) · CSV`);
  btn.type = 'button';
  btn.setAttribute('data-export', 'links');
  btn.disabled = shown === 0;
  btn.addEventListener('click', () => {
    saveCsvExt(
      linkExportFilename(state.host, links.items, total, state.linksFilter),
      csvJoinExt(
        linkExportRows(links.items, state.linksFilter).map((r) =>
          r.map(csvCellStrictExt)
        )
      )
    );
  });
  bar.append(
    btn,
    el(
      'p',
      'meta',
      links.itemsTruncated
        ? `The file holds what this table holds: ${shown} of the ${links.items.length} loaded rows, and the page has ${total} links in all. The row count and the truncation are both in the file name, because this sentence is not.`
        : `The file holds what this table holds: ${shown} of ${total} links on the page.`
    )
  );
  return bar;
}

function screenHreflang() {
  const box = pageScreenHead(
    'hreflang',
    'Alternate-language declarations in the live page, read the same way the audit reads them: any link with rel containing "alternate" and an hreflang.'
  );
  if (state.scan.state !== 'ok') return box;
  const { head, hreflang, ranAt } = state.scan.data;
  // WS-EXT-ENRICH B-A ② — the page's own declared language, on the screen that
  // is already about language. It was read on every scan since the field was
  // added and rendered nowhere: `head.clientOnly.htmlLang` had no consumer
  // anywhere in the extension, so the whole `head.clientOnly` container was
  // dead weight crossing the boundary.
  //
  // 🔴 IT SITS ABOVE hreflang AND SAYS "no stored counterpart", because the
  // field's own note in background.js requires it: the server's parser has no
  // lang field at all, so nothing here may be rendered as if there were another
  // reading to compare it against. Everything else on this screen does have a
  // server-side twin; this one does not, and the difference is stated rather
  // than left to the layout.
  //
  // 🔴 No verdict beyond present/absent. "Is `lang` CORRECT" would mean judging
  // the declared code against the text, which is a language-detection claim we
  // have not measured and would be inventing.
  const lang = head?.clientOnly?.htmlLang ?? null;
  box.append(
    verdict(
      lang ? 'ok' : 'partial',
      lang
        ? `The page declares lang="${lang}" on <html>.`
        : 'No lang attribute on <html>. Nothing on the page states which language it is written in.'
    ),
    el(
      'p',
      'qual',
      'We do not audit this server-side, so unlike everything below it there is no stored reading to compare it with. An engine deciding whether to quote you into an answer in a given language starts from this declaration; without it the language is inferred, and inference is where the wrong-language citation comes from.'
    )
  );
  box.append(
    verdict(
      hreflang.total === 0 ? 'partial' : 'ok',
      hreflang.total === 0
        ? 'No hreflang declarations. That is only a problem if this site serves more than one language — a single-language site is complete without them.'
        : `${hreflang.total} hreflang declaration(s).`
    )
  );
  if (hreflang.total > 0) {
    box.append(
      verdict(
        hreflang.hasXDefault ? 'ok' : 'partial',
        hreflang.hasXDefault
          ? 'An x-default fallback is declared.'
          : 'No x-default. Engines have no declared fallback for languages not listed here.'
      ),
      // Renamed off 'Declarations' when the social screen became 'Page
      // declarations': two different things called the same word, one a screen
      // and one a table inside another screen, is a collision a reader has to
      // resolve for us.
      el('span', 'caps', `Alternates · ${hreflang.entries.length}`),
      dataTable(
        hreflang.entries,
        (r) =>
          el(
            'div',
            'tr wide',
            el('span', 'lvltag', r.lang),
            el('span', 'term', r.href)
          ),
        (r) => `${r.lang}\t${r.href}`
      )
    );
  }
  box.append(scanFooter(ranAt));
  return box;
}

/**
 * 🔴 The tokenizer behind these numbers matches runs of letters, so a Chinese,
 * Japanese or Korean phrase counts as ONE word. Above this share of CJK
 * characters the densities stop describing the page and start describing the
 * tokenizer, and the screen refuses to print them rather than dressing a
 * distorted number in a Source line. The counts themselves are still shown —
 * "we cannot measure this here" is a state we already have, and it is not a
 * finding about the site.
 */
const CJK_REFUSAL_SHARE = 10;

function screenDensity() {
  const box = pageScreenHead(
    'Word density',
    'Word and phrase frequency over the live page’s visible text, using the audit’s own tokenizer, stop list and rounding — so the two paths report the same number for the same text.'
  );
  if (state.scan.state !== 'ok') return box;
  const { head, keywords, ranAt } = state.scan.data;
  const cjk = keywords.clientOnly.cjkShare;

  if (cjk >= CJK_REFUSAL_SHARE) {
    box.append(
      el(
        'div',
        'card dashed',
        el('div', 'label', 'Not measurable on this page'),
        el(
          'p',
          'qual',
          `${cjk}% of the text on this page is Chinese, Japanese or Korean. Our tokenizer splits on runs of letters, which treats a whole CJK phrase as a single word — so a density figure here would describe the tokenizer, not the page. We would rather show nothing than a number that looks measured.`
        ),
        el(
          'p',
          'qual',
          `For the record, and not as a density: the tokenizer produced ${keywords.totalWords} token(s) over ${keywords.clientOnly.textChars} characters of visible text. The stored audit hits the same limit on the same page — this is not a difference between the two paths.`
        ),
        scanFooter(ranAt)
      )
    );
    return box;
  }

  const total = keywords.totalWords;
  box.append(
    verdict(
      total >= 300 ? 'ok' : total >= 100 ? 'partial' : 'warn',
      total >= 300
        ? `${total} words of visible text — enough for an engine to have something to quote.`
        : `${total} words of visible text. Thin pages give an engine little to lift, and a page that builds its copy in the browser can read thin to anything that does not run JavaScript.`
    ),
    el(
      'div',
      'card',
      el('span', 'caps', 'Counts'),
      el(
        'div',
        'levels',
        el('div', 'lvl', el('span', 'k', 'WORDS'), numCell('num md', total)),
        // WS-EXT-CANT-VS-ISNT 笔一 — 🔴 `unigrams.length` USED TO BE HERE AND IT
        // WAS A CONSTANT. `topOf` slices to 20, so this cell printed 20 beside
        // a WORDS count of any size, on every page, forever — and `unigrams`
        // additionally drops stop words, so the two cells were not even
        // counting the same population. `clientOnly.uniqueWords` is a Set over
        // the exact array WORDS counts.
        //
        // ⚠️ The fallback is the OLD WRONG VALUE, on purpose and only for a
        // payload produced by a scan older than this renderer — which needs a
        // mid-session upgrade to happen at all. Printing nothing there would
        // hide the cell; printing 20 there is at least what the previous build
        // showed. Every panel open re-scans, so it is unreachable in practice.
        el(
          'div',
          'lvl',
          el('span', 'k', 'UNIQUE'),
          numCell(
            'num md',
            keywords.clientOnly.uniqueWords ?? keywords.unigrams.length
          )
        ),
        el(
          'div',
          'lvl',
          el('span', 'k', 'CJK'),
          el('span', 'num md', `${cjk}%`)
        )
      ),
      scanFooter(ranAt)
    )
  );

  // WS-EXT-ENRICH B-B — 🔴 THE DECLARED KEYWORDS, PLACED AGAINST THE MEASURED
  // ONES, WHICH IS THE ONLY PLACE THIS TAG IS WORTH ANYTHING.
  //
  // Search engines have ignored `meta name="keywords"` since 2009 and this panel
  // does not grade it — a verdict would be inventing a requirement that no
  // engine has. What it can do is sit directly above the terms actually counted
  // in the body, where the gap between what a page CLAIMS it is about and what
  // its text says is visible without anyone scoring it.
  const declaredKeywords = head?.clientOnly?.metaKeywords ?? null;
  if (declaredKeywords) {
    box.append(
      el(
        'div',
        'card',
        el('span', 'caps', 'Declared in a keywords meta tag'),
        el('p', 'prose', declaredKeywords),
        el(
          'p',
          'qual',
          'Not graded, and not because we ran out of room: no search engine has used this tag since 2009 and no AI engine reads it either. It is here because it is the page’s own claim about its subject, and the measured terms below are what the text actually says. Where those two disagree, the text wins with every reader and every machine.'
        )
      )
    );
  }

  const rows = [
    ...keywords.unigrams.map((k) => ({ ...k, n: '1' })),
    ...keywords.bigrams.map((k) => ({ ...k, n: '2' })),
    ...keywords.trigrams.map((k) => ({ ...k, n: '3' })),
  ];
  box.append(
    // WS-EXT-HONEST-SURFACE B4 — 🔴 `rows.length` IS A CEILING, NOT A COUNT, AND
    // THE OLD CAPTION MADE IT LOOK LIKE ONE. `topOf` slices to 20 / 12 / 12 in
    // background.js, so on every page with enough text to fill all three lists
    // this printed the same figure forever — the identical shape as the UNIQUE
    // cell that used to read 20 on every page ever scanned. That one was caught
    // because a reader could compare it to WORDS beside it; this one had nothing
    // to compare against, so it was quieter and lasted longer.
    //
    // 🔴 The three limits are read off the ARRAYS, not retyped. The old text
    // spelled "20" and "12" as literals in this file while the slices live in
    // background.js — a second copy with nothing linking them, which is the
    // defect `checkSameAs`'s hardcoded 20 still carries. Reading
    // `keywords.unigrams.length` makes the sentence describe the payload in hand
    // and follow the slice automatically, including on the short pages where the
    // real counts fall below the cap and the word "top" would overstate it.
    el('span', 'caps', `Terms shown · ${rows.length}`),
    el(
      'p',
      'meta',
      `The ${keywords.unigrams.length} most frequent single word${keywords.unigrams.length === 1 ? '' : 's'}, ${keywords.bigrams.length} pair${keywords.bigrams.length === 1 ? '' : 's'} and ${keywords.trigrams.length} triple${keywords.trigrams.length === 1 ? '' : 's'} — the length of a top-of-list, not a count of the terms on this page.${keywords.clientOnly.uniqueWords ? ` This page uses ${keywords.clientOnly.uniqueWords} distinct words in all, counted over every token including the ones the list below stops short of.` : ''}`
    ),
    dataTable(
      rows,
      (r) =>
        el(
          'div',
          'tr wide',
          el('span', 'lvltag', `${r.n}·${r.count}`),
          el('span', 'term', `${r.term} — ${r.densityPct}%`)
        ),
      (r) => `${r.term}\t${r.count}\t${r.densityPct}%`
    )
  );
  return box;
}

// --- crawler access (batch 5) ----------------------------------------------
//
// 🔴 The disclosure that sits BEFORE the button, the five outcome groups, the
// ambiguity note that is never collapsed and never moved, and the coverage list
// that names each crawler we do not live-test and why: none of these strings
// have been touched by any batch. Do not "simplify" them.
//
// 🔴 The arm/disarm handshake this screen used to depend on is GONE. It existed
// because Chrome tears the POPUP down to show a permission prompt, so the test
// had to be queued in the service worker before asking. The panel survives the
// prompt, so the queue was a workaround for a container that no longer exists —
// and the sentence promising the test still ran went with it.

const byId = new Map(CRAWLERS.map((c) => [c.id, c]));

// WS-EXT-ENRICH A2 — 🔴 `note` IS COPY, NOT BUCKETING. Adding it changes which
// sentence a group carries and nothing about which group a row lands in;
// `bucketOf` is untouched. Only 'noresp' has one, because it is the only group
// whose TITLE is a claim about the site that the rows underneath may not
// support: "No response" reads as the site staying silent, and a request our
// own browser never completed lands here too.
const PROBE_GROUPS = [
  { key: 'ok', cls: 'ok', title: 'Got through' },
  { key: 'warn', cls: 'warn', title: 'We were blocked' },
  {
    key: 'robots',
    cls: 'bad',
    title: 'Blocked by robots.txt',
    // WS-EXT-UA-MATRIX M1 — 🔴 WHY THESE ROWS HAVE NO MEASUREMENT, SAID TO THE
    // READER. The refusal to send has been the shipped behaviour since the
    // probe existed, but the reason for it lived only in a comment in
    // background.js `probeCrawlers`; on screen these rows just stopped having a
    // reading, which looks indistinguishable from a test that failed.
    //
    // 🔴 And there is deliberately no "test anyway" affordance next to it. Who
    // triggers the request does not change what the request IS — sending it
    // would mean presenting ourselves as a crawler this site explicitly
    // refused. The declaration is the answer here, so there is nothing left to
    // measure.
    note: 'robots.txt disallows these crawlers on this page, so we did not send a request — we do not impersonate an identity a site has refused. Their Observed cell carries the not-measured mark for that reason, not because a test failed.',
  },
  {
    key: 'noresp',
    cls: 'off',
    title: 'No response',
    // 🔴 It does NOT say "our request failed", which is what the robots.txt
    // copy can say and this cannot. There, we know the fetch threw on our side;
    // here, a site dropping the connection for a crawler User-Agent produces
    // the same nothing. Naming both and saying we cannot separate them is the
    // honest version — claiming either one would be a finding we did not make.
    note: 'Nothing came back at all. That can be this site refusing the request before it answered, or our own request failing — these rows cannot tell the two apart. The reason in brackets is what the browser reported to us, not something the site said.',
  },
  { key: 'untested', cls: 'off', title: 'Not tested' },
];

function bucketOf(r) {
  if (r.why === 'no_ua') return 'untested';
  if (r.why === 'robots_disallow') return 'robots';
  if (r.status === null) return 'noresp';
  if (r.status >= 200 && r.status < 300) return 'ok';
  return 'warn';
}

/**
 * WS-EXT-UA-MATRIX — 🔴 DECLARED AND OBSERVED ARE TWO FACTS, AND NOW TWO CELLS.
 *
 * Neither was ever discarded. `declaredOf` computed the declaration and
 * `metaOf` joined it to the reading with a `·`, so a row read
 * `robots allows · HTTP 403`: one string carrying a promise and a measurement
 * that contradict each other, with nothing marking which half was which.
 * Splitting them is the entire change — no new request is sent, no probe is
 * added, and no row changes which group it lands in.
 *
 * 🔴 THE WORDING IS A TRANSCRIPTION, NOT A JUDGEMENT. "robots.txt allows this
 * UA" is what the file says. "This site welcomes this crawler" would be a claim
 * about intent that nothing here measured, and on the one screen whose whole
 * argument is that a declaration and a behaviour can differ, collapsing the two
 * into a verdict about the site would give away the distinction the screen
 * exists to show.
 */
function declaredPhrase(r) {
  if (r.robotsState === 'disallowed') return 'robots.txt disallows this UA';
  if (r.robotsState === 'allowed') return 'robots.txt allows this UA';
  // 🔴 NOT "robots.txt says nothing about this UA". An absent or non-200
  // robots.txt resolves to `allowed` upstream in `probeCrawlers`, per the
  // standard — so reaching this branch means the fetch itself never completed.
  // That is a limit of ours, not a statement by the site, and the stamp line at
  // the foot of this screen carries the status that caused it.
  return 'robots.txt could not be read';
}

/**
 * WS-EXT-ENRICH A2 — 🔴 THE REASON, NOT JUST THE BUCKET. `bucketOf` above is
 * untouched: a request that never answered still lands in 'noresp', and this
 * changes nothing about which group a row appears under. What it changes is
 * that the row can now say WHY, because `error` was being collected on every
 * probe and rendered nowhere.
 *
 * A timeout, a DNS failure and a connection refused were three different facts
 * printed as one string — `no response` — on the one screen whose whole
 * argument is that a block might be the site correctly rejecting an
 * unverifiable IP. "We could not complete this request" and "this site did not
 * answer" are the same distinction the robots.txt copy draws in words; this is
 * the same distinction, in the space a row has.
 */
function observedPhrase(r) {
  // 🔴 A row we CHOSE not to send is not a row the site turned away, and the
  // two must not look alike. It takes the panel's existing not-measured mark
  // (the same glyph `CHECK_STATUS.not_measured` puts on every other screen)
  // rather than a status-shaped string, and the group note above says why.
  if (r.why) return { text: 'Not tested', measured: false };
  if (r.status === null) {
    return {
      text: r.error ? `no response (${r.error})` : 'no response',
      measured: true,
    };
  }
  return { text: `HTTP ${r.status}`, measured: true };
}

function renderProbe(payload) {
  const box = el('div', 'probe');
  const buckets = new Map(PROBE_GROUPS.map((g) => [g.key, []]));
  for (const r of payload.results) {
    const c = byId.get(r.id);
    if (c) buckets.get(bucketOf(r)).push({ r, c });
  }

  for (const g of PROBE_GROUPS) {
    const rows = buckets.get(g.key);
    if (!rows.length) continue;
    const section = el('div', `grp ${g.cls}`);
    const h = el('h3');
    h.append(el('span', 'pip'), `${g.title} · ${rows.length}`);
    section.append(h);
    if (g.note) section.append(el('p', 'note', g.note));
    const ul = el('ul');
    for (const { r, c } of rows) {
      const li = el('li');
      // WS-EXT-HONEST-SURFACE A3 — 🔴 THE VENDOR, WHICH EVERY ONE OF THE NINE
      // ROSTER ROWS CARRIES AND WHICH NOTHING HAS EVER RENDERED. It is not
      // decoration on this screen in particular: the IP allow-list warning
      // below names OpenAI, Anthropic and Perplexity by name, and until now a
      // reader had to already know which of the nine labels belonged to which of
      // those three for that warning to attach to anything.
      //
      // 🔴 Transcribed, not derived from the label. `crawlers.js` states the
      // rule for its whole table — "Nothing here is inferred from a naming
      // pattern" — and `Google-Extended` is the row that would break a guess
      // from the label anyway.
      //
      // It rides beside the label rather than in the reading cells, because
      // those carry what was declared and what was measured and this is the
      // crawler's identity. Wrapped with the label so `.grp li` keeps exactly
      // two children — `.who` and `.read` — which is what its layout assumes.
      //
      // WS-EXT-UA-MATRIX — 🔴 `.read` IS TWO LABELLED CELLS, NOT ONE STRING.
      // Each cell names itself, so "allows" and "HTTP 403" can never be read as
      // one continuous claim; the group heading above still carries the
      // verdict, which is the thing a reader should meet first.
      const o = observedPhrase(r);
      li.append(
        el('span', 'who', el('b', null, c.label), el('span', 'v', c.vendor)),
        el(
          'span',
          'read',
          el(
            'span',
            'cell',
            el('span', 'k', 'Declared'),
            el('span', 'val', declaredPhrase(r))
          ),
          el(
            'span',
            `cell${o.measured ? '' : ' unmeasured'}`,
            el('span', 'k', 'Observed'),
            el(
              'span',
              'val',
              o.measured
                ? null
                : el('span', 'glyph', CHECK_STATUS.not_measured.glyph),
              o.text
            )
          )
        )
      );
      ul.append(li);
    }
    section.append(ul);
    box.append(section);
  }

  // 🔴 The whole honesty of this feature lives in this paragraph, and it is
  // never collapsed: the moment a reader sees a block, "this may be correct
  // configuration" has to already be on screen.
  if (buckets.get('warn').length) {
    box.append(
      el(
        'p',
        'note',
        "We sent these from your browser and your IP — not from the vendor's crawler IP ranges. OpenAI, Anthropic and Perplexity all publish IP allow-lists so sites can verify a crawler is genuine. So a block above can mean either that this site only admits the vendor's verified IPs — usually correct configuration, and the real crawler still gets in — or that it blocks that crawler outright. This test cannot tell the two apart; your server logs can."
      )
    );
  }

  const untestable = CRAWLERS.filter((c) => !c.ua);
  const cov = el('div', 'coverage');
  cov.append(
    el(
      'p',
      null,
      `Live-tested ${CRAWLERS.length - untestable.length} of ${CRAWLERS.length} crawlers. Not live-tested:`
    )
  );
  const ul = el('ul');
  for (const c of untestable) {
    ul.append(el('li', null, `${c.label} — ${c.skipReason}`));
  }
  cov.append(ul);
  box.append(cov);

  box.append(
    el(
      'p',
      'stamp',
      // WS-EXT-ENRICH B-A ⑤ — 🔴 `robotsStatus` IS THE PROVENANCE OF EVERY
      // "robots allows / disallows / unknown" ABOVE, and it was collected on
      // every probe and shown nowhere. Without it "robots unknown" on nine rows
      // is a state with no stated cause: a 404 robots.txt (which the standard
      // reads as "everything allowed") and a robots.txt we could not fetch at
      // all produce different rows for a reason the screen never named.
      //
      // It goes on the stamp line because that is what the stamp line is for —
      // what was read, from where, when. Not a tenth row, and not a verdict:
      // this is a status, and the rows above already carry the reading it
      // produced.
      `Tested ${payload.url} · ${new Date(payload.ranAt).toLocaleTimeString('en-US')}${payload.fromCache ? ' (cached — the same page is not re-tested within 10 minutes)' : ''} · robots.txt ${
        typeof payload.robotsStatus === 'number'
          ? `HTTP ${payload.robotsStatus}`
          : 'not reachable'
      }`
    )
  );
  return box;
}

async function runProbe(btn, note) {
  const url = state.url;
  if (!url) return;
  btn.disabled = true;
  btn.textContent = 'Testing…';
  try {
    const origin = `${new URL(url).origin}/*`;
    // Ask only for THIS origin, never the full http/https breadth the manifest
    // declares as optional — the narrowest grant that can do the job, requested
    // at the moment the user asks for the test.
    //
    // 🔴 The popup used to hand this URL to the service worker before asking,
    // because Chrome tore the popup down to show the prompt and the test would
    // otherwise never run. The panel survives the prompt (measured), so that
    // arming round-trip is gone and this await genuinely returns.
    state.probe.awaitingGrant = true;
    const granted = await chrome.permissions.request({ origins: [origin] });
    state.probe.awaitingGrant = false;
    if (!granted) {
      note.hidden = false;
      note.textContent =
        'Permission declined — without it Chrome will not let us read this site’s response code.';
      return;
    }
    const payload = await chrome.runtime.sendMessage({
      type: 'probeCrawlers',
      url,
    });
    state.probe.payload = payload?.error ? null : payload;
    state.probe.error = payload?.error ?? null;
    render();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run reachability test';
  }
}

function screenCrawler() {
  const box = document.createDocumentFragment();
  box.append(el('h1', 'title', 'Crawler access'));

  // 🔴 Position is load-bearing: the user learns the request comes from their
  // own IP BEFORE the button that sends it, never after.
  const disclosure = el(
    'p',
    'disclosure',
    'This sends one real request to this page for each crawler below, '
  );
  disclosure.append(
    el('strong', null, 'from your browser and your IP address'),
    ", using that crawler's published User-Agent. Your cookies are not sent."
  );

  const note = el('p', 'perm-note');
  note.hidden = true;
  const btn = el('button', 'scan', 'Run reachability test');
  btn.type = 'button';
  btn.addEventListener('click', () => runProbe(btn, note));

  box.append(disclosure, btn, note);

  if (state.probe.payload) {
    box.append(renderProbe(state.probe.payload));
  } else if (state.probe.awaitingGrant) {
    // 🔴 This line used to promise the test still ran if the panel was torn
    // down. That was only true because the service worker held an armed queue;
    // that queue is gone, so the promise is gone with it rather than being left
    // on screen as a claim nothing backs.
    box.append(el('p', 'prose', 'Waiting on Chrome’s permission prompt.'));
  } else if (state.probe.error) {
    box.append(el('p', 'prose', `Test failed: ${state.probe.error}`));
  }
  return box;
}

/**
 * WS-EXT-ENRICH B-B — the rest of the robots meta tag.
 *
 * 🔴 THIS IS A WIDENING OF A JUDGEMENT, NOT A NEW READING. `head.metaRobots` has
 * been collected and printed verbatim since the pairing shipped; what was narrow
 * was the VERDICT — `seo.indexable.noindex` tests the string for `noindex` and
 * nothing else, so `nosnippet` and `max-snippet:0` rode along inside a value the
 * panel displayed and never interpreted.
 *
 * 🔴 `noindex` IS DELIBERATELY NOT REPEATED HERE. It has a stored check, a
 * verdict and a row of its own; a second opinion on the same directive from a
 * second place is how a reader learns two screens disagree. This reports only
 * the directives nothing else in the panel looks at.
 *
 * 🔴 AND IT IS NOT A FAULT LIST. `nosnippet` on a paywalled article is the
 * publisher doing exactly what they meant to. The copy says what the directive
 * DOES and leaves whether that was intended to the person who wrote it —
 * red line 3 applies to inventing findings as much as to inventing data.
 *
 * `max-snippet:-1` and `max-image-preview:large` are the permissive values and
 * are not reported as restrictions; `max-snippet:0` and `max-image-preview:none`
 * are the ones that stop a snippet existing at all.
 */
function snippetDirectives(metaRobots) {
  const raw = (metaRobots || '').toLowerCase();
  if (!raw.trim()) return null;
  const found = [];
  if (/\bnosnippet\b/.test(raw)) {
    found.push({
      key: 'nosnippet',
      what: 'No text snippet may be shown for this page.',
    });
  }
  if (/\bnoarchive\b/.test(raw)) {
    found.push({
      key: 'noarchive',
      what: 'No cached copy may be offered.',
    });
  }
  const snippet = raw.match(/\bmax-snippet\s*:\s*(-?\d+)/);
  if (snippet && Number(snippet[1]) === 0) {
    found.push({
      key: `max-snippet:${snippet[1]}`,
      what: 'A snippet length of zero — the same effect as nosnippet.',
    });
  } else if (snippet && Number(snippet[1]) > 0) {
    found.push({
      key: `max-snippet:${snippet[1]}`,
      what: `Snippets are capped at ${snippet[1]} characters.`,
    });
  }
  const image = raw.match(/\bmax-image-preview\s*:\s*(none|standard|large)/);
  if (image && image[1] === 'none') {
    found.push({
      key: 'max-image-preview:none',
      what: 'No image preview may be shown alongside this page.',
    });
  }
  return { raw: metaRobots, found };
}

/**
 * WS-EXT-UNKNOWN-URL — how this origin answers a URL that cannot exist.
 *
 * 🔴 THE ONLY REQUEST THIS EXTENSION MAKES THAT THE READER'S SITE DID NOT ASK
 * FOR, and the screen says so in the reader's own words, with the exact path.
 * Everything else the panel reads is either our own API, a file the site
 * publishes for exactly this purpose (robots.txt, sitemap.xml, llms.txt), the
 * page already open in the tab, or — on the crawler screen — a request the user
 * pressed a button to send. This one runs on its own, so the disclosure is not
 * a courtesy: it is the thing that lets an owner match a line in their access
 * log to us instead of wondering who probed them.
 *
 * 🔴 A 3xx NEVER REACHES `status`. `fetch` follows redirects, so a redirect to
 * the home page arrives as a 200 with `redirected: true`, and the redirect arm
 * below has to be tested FIRST — after the 200 arm it would be unreachable, and
 * the panel would grade a redirect-to-home as an ordinary soft 404. Same
 * finding, wrong sentence, and the wrong sentence sends the owner to fix the
 * wrong thing.
 *
 * ⚠️ ONE REQUEST, ONE PATH, AND NOT A CRAWL. It says how this origin answered
 * this path once. A site that 404s at the root and soft-404s under /blog/ would
 * read as clean here; nothing on this screen may be phrased as if the whole
 * site had been checked.
 */
const UNKNOWN_URL_DISCLOSURE = (path) =>
  `We requested ${path} on this origin once to see how it answers a URL that cannot exist.`;

/**
 * 🔴 The status number is INTERPOLATED into the 404 arm rather than written into
 * it. The dispatch takes 404 and 410 together — both are "gone, stop asking" —
 * so a fixed sentence reading "return 404" would print a number the server did
 * not send on every 410 site. The second half of each sentence is the ruling's,
 * verbatim; only the figure is the server's.
 */
function unknownUrlVerdict(u) {
  const s = u.status;
  if (s === null) {
    return [
      'partial',
      `We could not complete that request${u.error ? ` (${u.error})` : ''}. That is our limit, not a finding about the site.`,
    ];
  }
  if (u.redirected && (u.finalPath === '/' || u.finalPath === '')) {
    return [
      'partial',
      'Unknown URLs redirect to the home page. Search engines treat this as a soft 404.',
    ];
  }
  if (s === 404 || s === 410) {
    return [
      'ok',
      `Unknown URLs return ${s}. Search engines drop them cleanly.`,
    ];
  }
  if (s >= 200 && s < 300 && u.contentTypeHtml) {
    return [
      'warn',
      'Unknown URLs return 200 (soft 404). Search engines may index empty pages and waste crawl budget.',
    ];
  }
  if (s >= 500) {
    return [
      'warn',
      `Unknown URLs return ${s}. Search engines treat this as a server fault and keep retrying; broken inbound links look like outages.`,
    ];
  }
  return ['partial', `Unknown URLs return ${s}.`];
}

function screenUnknownUrl() {
  const box = pageScreenHead(
    'Unknown URLs',
    'What this origin does with a path that was never published. A crawler that follows a stale or mistyped link gets exactly this, and the status code decides whether it forgets the URL or keeps coming back for it.'
  );
  if (state.scan.state !== 'ok') return box;
  const { unknownUrl, ranAt } = state.scan.data;
  if (!unknownUrl) {
    // 🔴 Not a verdict. The reading is absent because this scan did not send the
    // request — a fresh one was already held for an origin the tab then left.
    // Saying anything about the site here would be inventing the answer we
    // deliberately did not go and get.
    box.append(
      verdict(
        'partial',
        'No reading of this origin on this scan. Read the page again to send one.'
      ),
      scanFooter(ranAt)
    );
    return box;
  }
  const [status, sentence] = unknownUrlVerdict(unknownUrl);
  box.append(
    verdict(status, sentence),
    el('p', 'qual', UNKNOWN_URL_DISCLOSURE(unknownUrl.path))
  );
  if (unknownUrl.status !== null) {
    const rows = [
      ['Status', String(unknownUrl.status)],
      [
        'Redirected',
        unknownUrl.redirected ? `yes → ${unknownUrl.finalPath}` : 'no',
      ],
      [
        'Content-Type',
        unknownUrl.contentTypeHtml ? 'text/html' : 'not text/html',
      ],
      // 🔴 Named "Body" and not "Page size": it is the bytes of the response we
      // received for that path, which on a 404 is the error page the server
      // chose to send. It is here because a 200 carrying two hundred bytes and
      // a 200 carrying a full rendered layout are different soft-404s, and the
      // number is the only thing on this screen that separates them.
      ['Body', unknownUrl.bytes === null ? '—' : `${unknownUrl.bytes} bytes`],
    ];
    box.append(
      dataTable(
        rows,
        ([k, v]) =>
          el('div', 'tr wide', el('span', 'lvltag', k), el('span', 'term', v)),
        ([k, v]) => `${k}\t${v}`
      )
    );
  }
  // 🔴 The probe's OWN clock when the reading is a held one. `scanFooter` prints
  // when the PAGE was read, and on a cached row that is minutes newer than the
  // request this screen is reporting — a timestamp that says we asked more
  // recently than we did.
  box.append(
    unknownUrl.fromCache
      ? el(
          'p',
          'meta',
          `Source: this origin, asked once · read ${new Date(unknownUrl.ranAt).toLocaleTimeString('en-US')} · not re-sent on this scan`
        )
      : scanFooter(ranAt)
  );
  return box;
}

function screenRobots() {
  const box = pageScreenHead(
    'Robots & sitemap',
    'robots.txt and sitemap.xml fetched from this site while reading the page — same origin, so no extra permission is asked for. The rules below are the audit’s: a reachable robots.txt passes, a sitemap must both answer and look like a sitemap.'
  );
  if (state.scan.state !== 'ok') return box;
  const { delivered, head, robots, sitemap, ranAt } = state.scan.data;

  box.append(
    verdict(
      robots.ok ? 'ok' : 'warn',
      robots.ok
        ? 'robots.txt is reachable.'
        : robots.clientOnly.fetchError
          ? `We could not read robots.txt from here (${robots.clientOnly.fetchError}). That is our request failing, not proof the file is missing — open ${state.host ? `${state.host}/robots.txt` : '/robots.txt'} to see for yourself.`
          : `No reachable robots.txt found${robots.status ? ` (HTTP ${robots.status})` : ''}.`
    ),
    verdict(
      sitemap.ok ? 'ok' : 'warn',
      sitemap.ok
        ? 'A valid sitemap.xml was found at the default path.'
        : sitemap.clientOnly.looksLikeSitemap === false &&
            sitemap.status &&
            sitemap.status < 400
          ? 'Something answers at /sitemap.xml but it is not a sitemap — no <urlset> or <sitemapindex>. A soft 200 like this reads as "no sitemap" to every crawler.'
          : // WS-EXT-ENRICH A2 — 🔴 OUR REQUEST FAILING IS NOT THE FILE BEING
            // ABSENT, and until now this screen said the second when it only
            // knew the first. `fetchError` was recorded on every one of these
            // three root-file reads and rendered for exactly one of them; a
            // timeout, a DNS failure and a CORS refusal all arrived here as
            // "No valid sitemap.xml at the default path", with no status to
            // even hint that nothing answered. Same wording as the robots.txt
            // branch above, deliberately: it is the same claim about the same
            // kind of failure, and a reader who has seen one should recognise
            // the other.
            //
            // 🔴 ORDER IS LOAD-BEARING. This sits BELOW the soft-200 branch, so
            // a server that answers with the wrong content still gets the
            // sharper sentence. The two cannot both be true — a fetchError
            // means no response, so `status` is null and the soft-200 test
            // cannot pass — but the ordering is what makes that structural
            // rather than incidental.
            sitemap.clientOnly.fetchError
            ? `We could not read sitemap.xml from here (${sitemap.clientOnly.fetchError}). That is our request failing, not proof the file is missing — open ${state.host ? `${state.host}/sitemap.xml` : '/sitemap.xml'} to see for yourself.`
            : `No valid sitemap.xml at the default path${sitemap.status ? ` (HTTP ${sitemap.status})` : ''}.`
    )
  );

  // WS-EXT-ENRICH A1 — 🔴 THIS READS `pageAccess`, NOT `aiBotBlocked`, AND THE
  // TWO ARE STILL BOTH IN THE PAYLOAD ON PURPOSE.
  //
  // What this screen used to show was `aiBotBlocked`: four tokens, and only the
  // question "is it blanket-blocked from the whole site". The Crawler access
  // screen, reading the same robots.txt through extension/robots.js, asked
  // about nine tokens and about THIS page's path. So one file produced two
  // answers on two screens — a site with `Disallow: /pricing` for GPTBot read
  // as "not blocked" here while Crawler access, on /pricing, read the block
  // correctly. Nothing could go red; they were two implementations.
  //
  // Both screens now resolve through the one parser and the one table.
  // `aiBotBlocked` survives untouched in the payload because it is the SERVER'S
  // question and the pairing on the SEO/GEO check screens needs it to stay that
  // question — see resolveRobotsAccess in background.js.
  //
  // 🔴 No count of crawlers is written into this copy, and the threshold is not
  // a literal. The sentence this replaced said "AI crawlers (GPTBot, ClaudeBot,
  // PerplexityBot, Google-Extended) are not blocked" and the verdict tripped on
  // `blocked.length >= 4` — a roster spelled out in prose and a roster size
  // spelled out as a number, in a table that has already grown from four to
  // nine. Both are derived from the rows now.
  const access = robots.pageAccess;
  if (access) {
    const rows = CRAWLERS.map((c) => ({
      label: c.label,
      purpose: c.purpose,
      blocked: access.byToken[c.token] === 'disallowed',
    }));
    const blocked = rows.filter((r) => r.blocked);
    box.append(
      verdict(
        blocked.length === 0
          ? 'ok'
          : blocked.length >= rows.length
            ? 'warn'
            : 'partial',
        blocked.length
          ? `robots.txt blocks ${blocked.length} of ${rows.length} AI crawlers from ${access.path}: ${blocked
              .map((r) => r.label)
              .join(', ')}.`
          : `No AI crawler in our list is blocked from ${access.path} by robots.txt.`
      ),
      // 🔴 The scope of the answer, said once and not left to be inferred from
      // the path appearing in the sentence above. A reader who arrived from the
      // old wording is holding "this is about the site"; it is about one
      // address, and on a site that blocks a section rather than everything
      // those are different answers.
      el(
        'p',
        'qual',
        `Resolved for ${access.path} — this address, not the whole site. A crawler allowed here can still be blocked elsewhere, and the reverse. Longest-matching rule wins, Allow winning ties; a crawler with no group of its own falls to the * group. The Crawler access screen applies the same rule to the same file, so the two screens cannot disagree.`
      )
    );
    // WS-EXT-ENRICH B-B — 🔴 THE SAME NINE ROWS, SPLIT BY WHAT THE CRAWL IS FOR,
    // because "blocked" is two opposite decisions wearing one word. Blocking a
    // training crawler withholds your text from a model that will never credit
    // you; blocking a search crawler removes you from the index that decides
    // whether you get cited at all. A single count cannot tell a reader which
    // of those they have done.
    //
    // 🔴 NO SCORE PER GROUP. The competitor's screen gives each of its crawler
    // groups a number out of 100; this gives each a count of its own rows and
    // stops there — §182.3's ruling has not moved just because the grouping now
    // matches theirs.
    //
    // ⚠️ The caveat is printed, not left in the source: Google-Extended is
    // filed under training and also governs grounding, so one row genuinely
    // sits in two of these buckets and the reader is told so rather than being
    // handed three clean thirds.
    box.append(
      el(
        'div',
        'card',
        el('span', 'caps', 'By what the crawl is for'),
        ...Object.entries(PURPOSE_LABELS).map(([key, label]) => {
          const inGroup = rows.filter((r) => r.purpose === key);
          const off = inGroup.filter((r) => r.blocked);
          return el(
            'div',
            'row',
            el('span', 'label', label),
            el(
              'span',
              'term',
              off.length === 0
                ? `all ${inGroup.length} allowed`
                : `${off.length} of ${inGroup.length} blocked — ${off.map((r) => r.label).join(', ')}`
            )
          );
        }),
        el(
          'p',
          'meta',
          'Each vendor states its own crawler’s purpose; these three groups are those statements, not our reading of the names. Google-Extended is counted under model training and also controls grounding — supplying Search-index content to Gemini at prompt time — so that one row belongs to two of these rows at once.'
        )
      )
    );
  }

  // WS-EXT-ENRICH B-B — the page's own robots meta tag, on the screen a reader
  // opens to find out what this site tells crawlers. It is the PAGE-level half
  // of that question; everything above it is the SITE-level half.
  // WS-EXT-ENRICH C — 🔴 THE HEADER AND THE TAG ARE BOTH PRINTED AND NEITHER IS
  // RECONCILED WITH THE OTHER.
  //
  // X-Robots-Tag and <meta name="robots"> are two channels for the same kind of
  // instruction, and when both are present the effective rule is the UNION of
  // their restrictions — the most restrictive wins, per Google's own
  // documentation. Computing that union here and printing one answer would be
  // this panel telling a reader what their site does, from a rule we
  // transcribed, in a place where getting it wrong is invisible. Printing both
  // and letting a reader see they disagree is the same posture the paired
  // readings take everywhere else: show the two, do not grade the gap.
  //
  // 🔴 The header is only knowable because of the re-read in collectOutline. A
  // content script cannot see response headers at all — this row exists only
  // because the server-rendered measurement was already fetching this page, and
  // it costs no second request.
  const snippets = snippetDirectives(head?.metaRobots);
  const xRobots = delivered?.xRobotsTag ?? null;
  const xSnippets = snippetDirectives(xRobots);
  if (snippets || xSnippets) {
    box.append(
      el(
        'div',
        'card',
        el('span', 'caps', 'Robots directives on this page'),
        el(
          'p',
          'prose',
          snippets
            ? `<meta name="robots" content="${snippets.raw}">`
            : 'No robots meta tag on this page.'
        ),
        el(
          'p',
          'prose',
          xSnippets
            ? `X-Robots-Tag: ${xSnippets.raw}`
            : delivered?.ok
              ? 'No X-Robots-Tag response header.'
              : 'X-Robots-Tag not read — the re-read of this page did not complete, so the header is unknown rather than absent.'
        ),
        snippets && xSnippets
          ? el(
              'p',
              'qual',
              'Both channels are set. Where they differ, a crawler applies the most restrictive of the two — we print them as they are rather than resolving them for you, because the resolved answer would be our reading of your configuration presented as your configuration.'
            )
          : null,
        // Each row says which channel it came from. A directive that is only in
        // the header is a different fact from one that is only in the tag —
        // they are edited in different places by different people.
        (() => {
          const rows = [
            ...(snippets?.found ?? []).map((f) => ({ ...f, from: 'meta' })),
            ...(xSnippets?.found ?? []).map((f) => ({ ...f, from: 'header' })),
          ];
          return rows.length
            ? el(
                'div',
                'levels',
                ...rows.map((f) =>
                  el(
                    'div',
                    'lvl',
                    el('span', 'k', `${f.from} · ${f.key}`),
                    el('span', 'term', f.what)
                  )
                )
              )
            : el(
                'p',
                'qual',
                'Neither channel restricts snippets, previews or caching. Indexability itself is checked on the SEO checks screen and is not repeated here.'
              );
        })(),
        (snippets?.found.length ?? 0) + (xSnippets?.found.length ?? 0)
          ? el(
              'p',
              'qual',
              'These may be exactly what you meant — a paywalled article that must not be quoted sets them on purpose. What they do is stated above; whether it was intended is yours to say. An AI answer that cannot show a snippet of you has less reason to name you.'
            )
          : null
      )
    );
  }

  // 🔴 A sitemap the robots file declares on ANOTHER host cannot be read from
  // the page's origin — the request is refused by CORS, which says nothing at
  // all about whether the sitemap exists. It gets its own row and its own
  // wording so it can never be counted as "missing".
  const declared = robots.clientOnly.declaredSitemaps ?? [];
  // 🔴 THE HEADLINE NUMBER IS THE ROBOTS FILE'S, NOT OURS. This used to print
  // `declared.length`, which is how many rows we built — capped at the read
  // limit — under a caption saying how many the site declares. A site with
  // thirty-five sitemaps reported twenty. `declaredCount` is the uncapped
  // figure; the rows are what we describe. Never swap one for the other again.
  //
  // The fallback only covers a payload produced by an older scan than this
  // renderer, which needs a mid-session upgrade to happen at all — the two ship
  // together and every panel open re-scans.
  const declaredCount =
    typeof robots.clientOnly.declaredCount === 'number'
      ? robots.clientOnly.declaredCount
      : declared.length;
  const readCount = declared.filter((d) => !d.notRead).length;
  // WS-EXT-CLOSEOUT ④ — a robots.txt cut at the read cap makes every count
  // derived from it a floor. Said before the table, since the table's own
  // caption is one of the numbers affected.
  if (robots.clientOnly.truncated) {
    box.append(
      el(
        'p',
        'qual',
        'This robots.txt is longer than we read — we stopped at 300,000 characters. Everything counted from it below, the declared-sitemap total included, is a floor rather than a total.'
      )
    );
  }
  if (declared.length) {
    box.append(
      el('span', 'caps', `Declared in robots.txt · ${declaredCount}`),
      dataTable(
        declared,
        (d) =>
          el(
            'div',
            // Was `tr wide` (tag | value). The row now carries a third field, so
            // it takes the same shape the Links and Images tables use: the tag
            // keeps its own width, the URL takes the rest, and the reason drops
            // to its own full-width line rather than fighting the URL for room.
            'tr quad',
            el(
              'span',
              'lvltag',
              // 🔴 `notRead` FIRST. Those rows carry `sameOrigin: null`, so any
              // test below that asks `!d.sameOrigin` would claim them as
              // cross-origin — a sitemap we never requested would be labelled
              // as one we were not allowed to read. Two different reasons for
              // having no verdict, and only one of them is about the site.
              d.notRead
                ? 'NOT READ'
                : d.unparsable
                  ? 'BAD'
                  : !d.sameOrigin
                    ? 'OTHER'
                    : d.valid
                      ? 'OK'
                      : 'FAIL'
            ),
            el('span', 'term', d.url),
            // WS-EXT-ENRICH B-A ④ — 🔴 THE TAG SAYS THE VERDICT, THIS SAYS WHY.
            // `status` and `error` were recorded for every declared sitemap we
            // actually requested and read by nothing, so a row tagged FAIL gave
            // no way to tell a 404 from a 500 from a connection that never
            // answered — and a row that never answered is the same distinction
            // the robots.txt and sitemap.xml copy on this screen already draws
            // in words. Two rows could carry identical tags for opposite
            // reasons.
            //
            // 🔴 Only rows we asked about get one. NOT READ and OTHER carry
            // `status: null` with no error because no request was made; putting
            // "no response" on those would be reporting our own restraint as
            // the site's silence, which is the exact conflation the NOT READ
            // state exists to prevent.
            d.notRead || d.sameOrigin === false
              ? null
              : el(
                  'span',
                  'term href',
                  d.error
                    ? `our request failed (${d.error})`
                    : d.status !== null
                      ? `HTTP ${d.status}`
                      : 'no response'
                )
          ),
        (d) =>
          `${d.notRead ? 'not read' : d.sameOrigin ? (d.valid ? 'valid' : 'invalid') : 'other host'}\t${d.notRead || d.sameOrigin === false ? '' : (d.error ?? (d.status !== null ? `HTTP ${d.status}` : 'no response'))}\t${d.url}`
      ),
      el(
        'p',
        'qual',
        `We requested ${readCount} of ${declaredCount}. OTHER means the sitemap is declared on a different host — a CDN, usually. The page’s own origin is not allowed to read it, so we do not report on it either way. That is a limit of where this check runs, not a finding about the sitemap.${
          declaredCount > readCount
            ? ` NOT READ means we never asked for it: this panel stops after the first ${readCount === 0 ? 'few' : readCount}, so those rows say nothing about whether those sitemaps exist.`
            : ''
        }`
      )
    );
  } else if (robots.ok && !robots.hasSitemapDirective) {
    box.append(
      el(
        'div',
        'card',
        el('span', 'caps', 'No Sitemap: line'),
        el(
          'p',
          'prose',
          'robots.txt does not point to a sitemap. Crawlers can still find /sitemap.xml by convention, but nothing declares it.'
        )
      )
    );
  }

  box.append(scanFooter(ranAt));
  return box;
}

// --- cached externals (batch 7) --------------------------------------------
//
// 🔴 Neither dimension is part of the audit score: the audit marks backlinks
// `needs_connection` (it cannot verify them in-worker) and never looks at the
// registry at all. So there is no server rule to copy here, and rather than
// invent a grade these screens state facts and say plainly that they are not
// graded. The one place a verdict IS defensible is a fact with a consequence —
// a registration expiring soon, or a genuine zero.
//
// 🔴 A measured 0 and a missing measurement are different states and are
// rendered as such all the way down: the endpoint sends state:'measured' with
// the number (0 included) or state:'not_measured' with no numbers at all, and
// nothing below ever prints a 0 that the endpoint did not send.

function cacheBlockMissing(label, what) {
  return el(
    'div',
    'card dashed',
    el('div', 'label', '—'),
    el('p', 'prose', what),
    el('p', 'meta', 'No measurement stored')
  );
}

function cacheUnavailable() {
  return el(
    'div',
    'card dashed',
    el('div', 'label', 'Nothing read yet'),
    el(
      'p',
      'prose',
      state.cacheError === 'rate_limited'
        ? "You've hit today's lookup limit. It resets tomorrow — nothing about this site is implied by it."
        : "Couldn't reach TriRank just now. This says nothing about the site; it is our lookup that failed."
    )
  );
}

const DAY_MS = 86400000;

function daysBetween(iso, now = Date.now()) {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : Math.round((t - now) / DAY_MS);
}

function screenWhois() {
  const box = document.createDocumentFragment();
  box.append(el('h1', 'title', 'Whois'));

  if (state.cacheState === 'loading') {
    box.append(reading('the stored registry record'));
    return box;
  }
  if (!state.cache) {
    // WS-EXT-EMPTY-STATE — the cache lookup itself failed or hit its limit
    // (`site-cache`, 60/IP/day; the audit bills different keys, so the trio is
    // actionable here too). This is a DIFFERENT branch from the not-measured one
    // just below, and both needed the trio separately — see the note there.
    box.append(cacheUnavailable(), entryLinks());
    return box;
  }
  const w = state.cache.whois;
  if (w.state !== 'measured') {
    box.append(
      cacheBlockMissing(
        'Whois',
        'No registry record is stored for this domain. The free audit fetches one; this panel only ever reads what is already there.'
      ),
      el('p', 'meta', `Source: ${w.source}`),
      // 🔴 TWO BRANCHES ON THIS SCREEN, NOT ONE, AND THAT IS WHY THIS APPEARS
      // TWICE IN THE SOURCE AND NEVER TWICE ON SCREEN. Above is "our lookup
      // failed"; this is "the lookup worked and the registry record is not
      // stored". Every render returns from exactly one of them, so the CTA count
      // per path stays 1 — verified per path, not reasoned about.
      //
      // The sentence right above names the free audit, and the audit really does
      // fill this: the widget calls loadOverviewPart(domain, 'rdap') once the
      // audit resolves, which writes the `::rdap` row this screen reads. Passes
      // 4ca768d's test — the named action produces the missing thing.
      entryLinks()
    );
    return box;
  }

  const ageDays = w.createdAt ? -(daysBetween(w.createdAt) ?? 0) : null;
  const expiresIn = w.expiresAt ? daysBetween(w.expiresAt) : null;
  if (ageDays !== null) {
    const years = Math.floor(ageDays / 365);
    box.append(
      verdict(
        ageDays >= 365 ? 'ok' : 'partial',
        ageDays >= 365
          ? `Registered ${years} year${years === 1 ? '' : 's'} ago. Age is one of the few signals a new domain cannot buy.`
          : `Registered ${ageDays} days ago. A young domain is not a fault — it just means history is not yet on your side.`
      )
    );
  }
  if (expiresIn !== null) {
    box.append(
      verdict(
        expiresIn > 90 ? 'ok' : 'warn',
        expiresIn > 90
          ? `Registration runs another ${Math.round(expiresIn / 30)} month(s).`
          : expiresIn >= 0
            ? `Registration expires in ${expiresIn} day(s). Renew it — an expiring domain is the one outage no amount of SEO survives.`
            : `Registration expired ${Math.abs(expiresIn)} day(s) ago according to the stored record.`
      )
    );
  }

  const rows = [
    ['Registrar', w.registrar],
    ['Registered', w.createdAt ? shortDate(w.createdAt) : null],
    ['Updated', w.updatedAt ? shortDate(w.updatedAt) : null],
    ['Expires', w.expiresAt ? shortDate(w.expiresAt) : null],
  ].filter(([, v]) => v);
  box.append(
    el(
      'div',
      'card',
      el('span', 'caps', 'Registry record'),
      ...rows.map(([k, v]) =>
        el('div', 'row', el('span', 'label', k), el('span', 'term', v))
      ),
      el(
        'p',
        'meta',
        `Source: ${w.source} · measured ${shortDate(w.fetchedAt)}`
      )
    )
  );
  if (w.nameservers.length) {
    box.append(
      el('span', 'caps', `Nameservers · ${w.nameservers.length}`),
      dataTable(
        w.nameservers.map((n) => ({ n })),
        (r) =>
          el(
            'div',
            'tr wide',
            el('span', 'lvltag', 'NS'),
            el('span', 'term', r.n)
          ),
        (r) => r.n
      )
    );
  }
  return box;
}

// --- traffic (WS-EXT-PARITY batch 7) ----------------------------------------

function seconds(n) {
  const m = Math.floor(n / 60);
  return m ? `${m}m ${Math.round(n % 60)}s` : `${Math.round(n)}s`;
}

/** One estimate. A null field is "not in the stored row", never a zero. */
function trafficStat(label, value, format) {
  const has = typeof value === 'number' && Number.isFinite(value);
  // `format` may return a plain string (a percentage, a duration — always
  // short) or the {text, title} pair `figure()` produces for values that can
  // run past their card.
  const out = has ? format(value) : null;
  const shown = typeof out === 'string' ? { text: out, title: null } : out;
  const n = el('div', has ? 'num md' : 'num md dash', has ? shown.text : '—');
  if (shown?.title) n.title = shown.title;
  return el(
    'div',
    has ? 'ovcard' : 'ovcard dashed',
    n,
    el('div', 'label', label),
    has ? null : el('p', 'meta', 'Not in the stored estimate')
  );
}

/**
 * A share split.
 *
 * 🔴 A 0% channel is KEPT and printed as 0%. It is a real measured zero — the
 * split it sits in has positive shares elsewhere — and the four states are only
 * four if a measured zero renders as the number. The shape that must not appear
 * is a split where every share is zero, and that one never gets here: it is
 * Similarweb's "no source data" marker and readLatestTraffic strips it to [] at
 * the reader.
 *
 * (This filtered `share > 0` in its first draft, which dropped the measured
 * zeros and left a comment claiming it printed them. Both were wrong; the
 * comment was the louder wrong.)
 */
function shareList(caption, rows, labelOf) {
  if (!rows?.length) return null;
  const top = [...rows].sort((a, b) => b.share - a.share);
  const box = el('div', 'shares', el('span', 'caps', caption));
  for (const r of top) {
    const bar = el('span', 'bar');
    const fill = el('span', 'fill');
    fill.style.width = `${Math.min(100, r.share)}%`;
    bar.append(fill);
    box.append(
      el(
        'div',
        'sharerow',
        el('span', 'ovlabel', labelOf(r)),
        bar,
        el('span', 'sharepct', `${Math.round(r.share * 10) / 10}%`)
      )
    );
  }
  return box;
}

/**
 * 'YYYY-MM' is a CALENDAR MONTH, not an instant. Parsing it as UTC and
 * formatting as UTC is what keeps a reader west of Greenwich from seeing the
 * previous month on every bar — `new Date('2026-04-01T00:00:00Z')` in New York
 * is March 31st locally, and a formatter left on the host zone prints "Mar
 * 2026" for a figure Similarweb measured in April. Same reasoning, same fix as
 * /site's VisitsTrendChart.
 */
const MONTH_LABEL = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

function monthLabel(month) {
  const d = new Date(`${month}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? month : MONTH_LABEL.format(d);
}

/**
 * The monthly visits series (WS-EXT-TRAFFIC-CHART).
 *
 * 🔴 WS-EXT-PANEL-POLISH ① — COLUMNS, left to right. This drew horizontal rows
 * on shareList's `.bar`/`.fill` primitive, which was the letter of its dispatch
 * and the wrong shape twice over. The two blocks directly above it on this
 * screen — the channel split and the regions — are horizontal lists, so a third
 * one read as a third list rather than as a series; and a time axis that runs
 * top-to-bottom is not the axis anybody reads time on. Being able to read it as
 * a trend is the only reason this block exists, so the primitive is not shared
 * any more: `.vtrack`/`.vfill` grow upward and are the trend's own. /site's
 * VisitsTrendChart has always been vertical, so this also ends one dataset
 * being drawn two ways on two surfaces.
 *
 * 🔴 The figure sits ABOVE its column, in a row of its own. Pinning it to the
 * top of each bar would put the three numbers at three different heights, where
 * they read as parts of the bars instead of as three comparable values — and
 * comparing them is exactly what the bars cannot do here, since three months
 * within a few percent of each other draw three columns of the same height.
 * (Measured, all 19 production series: the widest figure any of them prints is
 * harvey.ai's 963,230 for 2026-04.)
 *
 * 🔴 BARS FROM ZERO, and the baseline is the honesty decision. A bar read
 * against a non-zero floor overstates every difference between months, and
 * three of these bars are usually within a few percent of each other — the
 * shape that most rewards cheating. /site pinned the same floor in code
 * (`<YAxis hide domain={[0, 'dataMax']} />`) with the same reasoning, so a
 * different floor here would have the two surfaces drawing opposite shapes from
 * one set of three numbers. The exact figure sits on every row instead, which
 * is what makes a near-flat series readable without moving the floor.
 *
 * 🔴 A month measured at zero is DRAWN AS ZERO — an empty track and a printed
 * "0" — not skipped. Six of the nineteen production series carrying history
 * hold one (typically a site that had no panel presence two months ago), the
 * mapper keeps them deliberately, and this file's header rule is that a real
 * zero is still the number. An all-zero series never arrives: readLatestTraffic
 * screens that whole row to not_measured upstream, so the `max > 0` test below
 * is a division guard, not a state this can be in.
 */
function visitsTrend(months) {
  const max = Math.max(...months.map((m) => m.visits), 0);
  const box = el('div', 'trend');
  for (const m of months) {
    const track = el('span', 'vtrack');
    const fill = el('span', 'vfill');
    fill.style.height = max > 0 ? `${(m.visits / max) * 100}%` : '0%';
    track.append(fill);
    box.append(
      el(
        'div',
        'trendcol',
        // numCell, so a figure too wide for its column keeps its exact value as
        // the title — the same hover the cards above already have.
        numCell('trendnum', m.visits),
        track,
        el('span', 'ovlabel', monthLabel(m.month))
      )
    );
  }
  return box;
}

/**
 * WS-EXT-HONEST-SURFACE A2 — Similarweb's own confidence label for the six
 * figures above it. `dataCoverage` and `isSmall` both shipped from
 * /api/site-cache and were rendered nowhere.
 *
 * 🔴 IT IS PROVENANCE, NEVER A FILTER. This function returns a sentence and
 * touches no value. The temptation is the other one — hide the numbers when the
 * vendor calls the estimate thin — and there is a measured reason not to:
 * lawyerai is `small_site` and carries a real 286.5s time-on-site, so filtering
 * on the flag would delete a figure the vendor actually measured. The flag says
 * how much confidence the vendor has in its own panel; it does not say the
 * numbers beside it are absent. Red line 3 runs in both directions, and this is
 * the direction that deletes data.
 *
 * 🔴 AN ABSENT KEY IS NOT `full`, AND THAT IS THE WHOLE REASON FOR THE `=== `
 * COMPARISONS RATHER THAN A TRUTHY TEST. Both fields are optional in
 * TrafficOverview (src/lib/domain-overview-types.ts) under the rule stated
 * there: optional means "this row predates the field", because nothing rewrites
 * a stored row. Reading a missing label as the confident one would invent a
 * vendor statement out of our own storage history.
 *
 * 🔴 THE FINER FIELD WINS, AND A DISAGREEMENT IS REPORTED RATHER THAN RESOLVED.
 * `dataCoverage` is three-valued and `isSmall` is two-valued, and the type's own
 * note records them co-varying EXACTLY over a 38-item sample read 2026-07-28
 * (`full` ↔ false; `small_site` and `no_data` ↔ true). So the boolean adds
 * nothing while they agree — and if they ever stop agreeing, that is a fact
 * about the vendor's payload that no other surface in this panel would show.
 * Printing it is cheaper than an assertion nobody would see fail.
 */
function trafficCoverage(t) {
  const cov =
    t.dataCoverage === 'full' ||
    t.dataCoverage === 'small_site' ||
    t.dataCoverage === 'no_data'
      ? t.dataCoverage
      : null;
  const small = t.isSmall === true ? true : t.isSmall === false ? false : null;
  if (cov === null && small === null) return null;

  const said =
    cov === 'full'
      ? 'Similarweb labels its own coverage of this domain complete, so these are its ordinary-confidence figures.'
      : cov === 'small_site'
        ? 'Similarweb labels this a small site, meaning it holds its own estimate for this domain thin. The figures above are still what it reported — a thin estimate is not a missing one, and we do not blank a number the vendor actually returned.'
        : cov === 'no_data'
          ? 'Similarweb labels its coverage of this domain as no data, yet some fields above still came through. Read them as the remainder of a panel that says it could not see this site, not as a measurement it stands behind.'
          : small === true
            ? 'This row predates Similarweb’s three-state coverage label, so all we have is its older small-site flag, and it is set: the vendor holds its estimate for this domain thin.'
            : 'This row predates Similarweb’s three-state coverage label. Its older small-site flag is not set, which is the vendor declining to call the estimate thin — not the same statement as calling it complete.';

  // Only reachable if the vendor's two labels stop co-varying. Named rather
  // than silently preferring `dataCoverage`.
  const disagrees =
    cov !== null &&
    small !== null &&
    ((cov === 'full' && small === true) || (cov !== 'full' && small === false));

  return el(
    'p',
    'disclosure',
    `${said}${disagrees ? ` Its two labels disagree here — coverage says “${cov}” while the older small-site flag says ${small}. Those have matched on every row we have compared, so this pair is the vendor contradicting itself and we are not picking a winner for it.` : ''}`
  );
}

function screenTraffic() {
  const box = document.createDocumentFragment();
  box.append(el('h1', 'title', 'Traffic estimate'));

  // 🔴 First thing on the screen, never collapsed, never moved below the
  // numbers. This is the one screen in the panel whose figures are somebody
  // else's model rather than a measurement, and the difference is the product's
  // whole position — the competitor's equivalent screen does not say it.
  box.append(el('p', 'disclosure', 'Everything on this screen is '));
  const d = box.lastChild;
  d.append(
    el('strong', null, "Similarweb's estimate"),
    ", not this site's analytics. It is modelled from a panel; nobody here measured a visit. The numbers this product sells as measured are on the AI visibility and Crawler access screens."
  );

  const t = state.cache?.traffic;
  if (state.cacheState === 'loading') {
    box.append(reading('the stored Similarweb estimate'));
    return box;
  }
  if (!state.cache) {
    // WS-EXT-EMPTY-STATE — our cache read failed or hit its limit. 🔴 NOT the
    // "Similarweb has nothing for this domain" state, which is the branch below
    // and already ends in the trio. Those two look similar and mean opposite
    // things: this one says nothing about Similarweb's coverage at all, so the
    // trio here is not the empty promise it would be if it were claiming a
    // fresh audit could make Similarweb cover a site it does not cover.
    box.append(cacheUnavailable(), entryLinks());
    return box;
  }
  if (t?.state !== 'measured') {
    // 🔴 Includes the all-zero rows the reader screens out. "Similarweb has
    // nothing for this domain" is a state, and the four production rows in it
    // — ours among them — must land here rather than rendering a wall of 0s.
    box.append(
      el(
        'div',
        'card dashed',
        el('div', 'label', 'No estimate we can show'),
        el(
          'p',
          'prose',
          'Similarweb has no usable figures for this domain in our cache. That is a gap in their panel, not a measurement of zero traffic — a site with genuinely no visitors and a site their panel never saw look identical from here, so we do not print a number for either.'
        ),
        sourceLine(t?.source, null)
      ),
      entryLinks()
    );
    return box;
  }

  const grid = el('div', 'ovgrid');
  grid.append(
    trafficStat('Monthly visits', t.monthlyVisits, (v) => figure(v)),
    trafficStat(
      'Bounce rate',
      t.bounceRate,
      (v) => `${Math.round(v * 10) / 10}%`
    ),
    trafficStat('Pages per visit', t.pagesPerVisit, (v) =>
      String(Math.round(v * 10) / 10)
    ),
    trafficStat('Time on site', t.visitDurationSec, seconds),
    trafficStat('Global rank', t.globalRank, (v) => figure(v, '#')),
    trafficStat('Country rank', t.countryRank, (v) => figure(v, '#'))
  );
  box.append(grid);
  const coverage = trafficCoverage(t);
  if (coverage) box.append(coverage);

  const sources = shareList(
    'Where the visits come from',
    t.trafficSources ?? [],
    (r) => r.key
  );
  const regions = shareList('Top regions', t.topRegions ?? [], (r) => r.code);
  if (sources) box.append(sources);
  else
    box.append(
      el(
        'p',
        'meta',
        'No channel split in the stored estimate — Similarweb did not report one for this domain. Not a site with no channels.'
      )
    );
  if (regions) box.append(regions);
  else
    box.append(
      el(
        'p',
        'meta',
        'No regional split in the stored estimate. Not a site with no regions.'
      )
    );

  // 🔴 WS-EXT-TRAFFIC-TRUTH — what stood here was false in three ways, and the
  // third is the one worth naming.
  //
  //   "Production holds exactly one Similarweb row per domain" — stripe.com has
  //   four. "all twenty carry the same snapshot month" — there are 23 domains,
  //   18 of them measured. Both were counts, and a count in a comment goes stale
  //   on its own, with nothing to announce it.
  //
  //   🔴 "...SO there is one point per domain" was the actual defect. One row is
  //   not one point: the actor returns three months in a single run and the blob
  //   has carried all three since 2c42ed7 — stripe.com's holds 2026-04, -05 and
  //   -06. The premise was stale AND the inference was wrong, so fixing the
  //   count alone would have left a working argument for a false conclusion.
  //
  // 🔴 "nothing collects them on a schedule" was TRUE, and that is exactly why it
  // was hard to see: it was offered as the REASON there is no trend, and that
  // causality does not hold. No schedule is needed — one run already returns
  // three months. The fact survives below as what it actually is, a freshness
  // statement sitting next to the date, where it explains how old this can get
  // rather than why a chart is missing.
  //
  // 🔴 EVERY SENTENCE BELOW IS ABOUT WHAT REACHED THIS PANEL, never about what
  // exists or what collects it. That property is what let the two empty-series
  // sentences survive the deploy which turned visitsHistory on — 8eb7aae, now
  // pushed and serving: production hands back three months for 19 of the 24
  // cached domains, and the other five are all-zero rows the reader screens out
  // before this screen ever sees them.
  //
  // 🔴 It is also why the chart REPLACES the first branch instead of being added
  // under it. That branch read "This screen draws 2026-06 — the series is not
  // charted here yet", and BOTH halves expire in this commit: deleting only the
  // trailing clause would have left "this screen draws <one month>" standing
  // beside a chart of three, which is a NEW false sentence written by the fix.
  const months = Array.isArray(t.visitsHistory) ? t.visitsHistory : [];
  const last = months[months.length - 1];
  const headline =
    typeof t.monthlyVisits === 'number' && Number.isFinite(t.monthlyVisits)
      ? t.monthlyVisits
      : null;
  const trend = el('div', months.length > 0 ? 'card' : 'card dashed');
  trend.append(el('div', 'label', 'Monthly trend'));
  if (months.length > 0) {
    trend.append(
      visitsTrend(months),
      el(
        'p',
        'qual',
        `These are the ${months.length} monthly figures the estimate carried when it reached this panel, ${monthLabel(months[0].month)} to ${monthLabel(last.month)}.`
      ),
      // 🔴 The last bar and the Monthly visits card hold the same number on all
      // 19 production series that carry history — but that is SIMILARWEB'S
      // behaviour, not anything this codebase enforces. `monthlyVisits` is
      // mapped from `totalVisits`, the series from `monthlyVisitsDateFormat`
      // and the month from `snapshotDate` (`mapItem` in
      // src/lib/apify-similarweb.ts reads all three): three
      // independent vendor fields, and nothing between there and here
      // reconciles them. So this is COMPUTED from the two numbers in hand
      // rather than asserted about the world — an equality claim written as a
      // constant would have no failing form, it would just start lying.
      headline === null
        ? null
        : el(
            'p',
            'meta',
            last.visits === headline
              ? 'The last bar is the same figure as Monthly visits above — this estimate reports its newest month as that headline number.'
              : 'The last bar and Monthly visits above are not the same figure. Similarweb sends that headline number separately from this series, and for this domain the two do not agree.'
          )
    );
  } else {
    trend.append(
      el(
        'p',
        'prose',
        // 🔴 [] and an ABSENT KEY share this branch BY RULING, not by oversight.
        // The data layer draws the distinction deliberately and the endpoint
        // preserves it (`parseVisitsHistory` in src/lib/site-report-data.ts — an absent key means the
        // row predates the field, [] would mean Similarweb returned a series
        // with no months in it). They are merged HERE because the consequence
        // for a reader is identical: there is no earlier series to show. Two
        // sentences for one outcome would imply a difference the screen cannot
        // act on. /site merges them for the same reason.
        t.snapshotMonth
          ? `Only one monthly figure reached this panel for this domain, for ${t.snapshotMonth}. No earlier series for it arrives here.`
          : 'Only one monthly figure reached this panel for this domain, and it carries no month label, so there is nothing to place on a timeline.'
      )
    );
  }
  box.append(trend);

  // 🔴 Top Keywords is NOT repeated here. It sits in the Backlinks screen
  // because that is where it comes from — a different vendor's index — and
  // moving or duplicating it under a Similarweb heading would attach one
  // vendor's data to another's name.
  box.append(
    el(
      'p',
      'qual',
      'Looking for top keywords? They are on the Backlinks screen, not this one: they come from the DataForSEO index, not from this Similarweb estimate, and putting them here would file one vendor’s data under another vendor’s name.'
    ),
    el(
      'p',
      'meta',
      `Source: ${t.source}${t.snapshotMonth ? ` · estimate for ${t.snapshotMonth}` : ''} · read ${shortDate(t.fetchedAt) ?? 'unknown date'}`
    ),
    // 🔴 The schedule fact, next to the date rather than inside the trend card.
    // Same sentence shape as the citation screen's (see the note above
    // screenAeo), and same job: it says how old this reading can get. It used to
    // sit in the trend card as the reason a chart was missing, which is the one
    // thing it is not — verified rather than assumed, because it is a claim about
    // the product: this repo declares no crons at all, the engine worker's
    // scheduled handler runs seven sweeps and touches neither Similarweb nor
    // domain_overview_cache, and both callers of fetchSimilarwebTraffic are
    // user-triggered (the read-through route and a manual script). The deploy
    // that turns visitsHistory on does not add a schedule, so this stays true.
    el(
      'p',
      'meta',
      'Nothing re-fetches Similarweb on a schedule. This estimate was written when a free audit ran, and a newer one appears only when one runs again.'
    ),
    entryLinks()
  );
  return box;
}

/**
 * WS-EXT-KEYWORDS-FIX — the two transforms /site already applies, COPIED and not
 * rewritten from src/lib/keyword-rows.ts (moved there by WS-KEYWORD-FOLD-LIB):
 * `mergeSameKeywordRows` and `foldKeywordRows`, BY NAME. This pointer used to
 * carry their line numbers; they were still correct on 2026-07-30 and one
 * inserted line away from being silently wrong, because nothing in this repo
 * fails when a line number in a comment goes stale. Two surfaces painting a
 * different number of rows out of one stored row is the thing this fixes, so a
 * better rule invented here would have been a new bug wearing a fix.
 *
 * 🔴 CHANGE THIS COPY AND YOU CHANGE THAT ONE, IN THE SAME COMMIT. That
 * sentence is the entire defence. The two files share no build pipeline — no
 * package.json, no bundler, MV3 direct load — so nothing holds them together
 * structurally, and there is no gate, no test and no type that fails when they
 * drift. When this was written the two were character-for-character identical
 * once the TS annotations are stripped: everything from `for (const row of
 * rows)` down is the same byte sequence in both files. If you are reading this
 * and that is no longer true, that is the drift, not a refactor.
 *
 * 🔴 AND THE DRIFT WOULD BE ALL BUT INVISIBLE. Its only symptom is this panel
 * and /site printing different row counts for one snapshot, and on 2026-07-30
 * exactly ONE of the 31 stored dataforseo rows in production (harvey.ai) had a
 * repeated keyword at all — the merge below changes what is painted on 1 domain
 * in 31. Nobody is going to catch this by looking.
 *
 * 🔴 DataForSEO emits one row PER RANKING URL, so the same keyword arrives more
 * than once with its traffic split across those URLs. Traffic sums; volume and
 * cpc keep the first row's estimate, because they describe the keyword and not
 * the URL. Presentation only — the payload is untouched and nothing is stored.
 */
function mergeSameKeywordRows(rows) {
  const byKeyword = new Map();
  const out = [];
  for (const row of rows) {
    const prev = byKeyword.get(row.keyword);
    if (!prev) {
      const copy = { ...row };
      byKeyword.set(row.keyword, copy);
      out.push(copy);
    } else if (row.traffic !== null) {
      prev.traffic = (prev.traffic ?? 0) + row.traffic;
    }
  }
  return out;
}

/**
 * Near-duplicate phrasings carrying the exact same estimate triple fold into the
 * first row, and the rest are counted as variants. Runs AFTER the merge above —
 * two distinct mechanisms, and merged rows carry no variant badge.
 *
 * 🔴 `cpc` IS part of the comparison even though this panel deliberately shows
 * no cpc column (PM ruling: 5/5 null on trirankai.com, 3/8 on insuraitools.com —
 * a column of dashes carries no decision). It is load-bearing anyway, and an
 * invisible field deciding a visible row count is worth stating: eonebill.ai has
 * six rows at traffic 231 / volume 110000 whose cpc splits them 6.54 · 6.54 then
 * 9.63 × 4. Drop cpc from the comparator and those six fold into one, painting 3
 * rows where /site paints 4.
 *
 * 🔴 harvey.ai is the second, independent instance: `footybite` and `moots` are
 * both traffic 104 / volume 49500 and differ ONLY in cpc (3.78 vs 0.87), so a
 * side that drops it paints 6 rows where the other paints 7. Deleting cpc from
 * the comparator reads like cleanup. On two domains it is a bug.
 *
 * Both figures are 2026-07-30 production snapshots, re-derivable with a
 * read-only SELECT over domain_overview_cache.
 */
function foldKeywordRows(rows) {
  const folded = [];
  for (const row of rows) {
    const prev = folded[folded.length - 1];
    if (
      prev &&
      prev.traffic === row.traffic &&
      prev.volume === row.volume &&
      prev.cpc === row.cpc
    ) {
      prev.variants += 1;
    } else {
      folded.push({ ...row, variants: 0 });
    }
  }
  return folded;
}

// --- measured page (WS-EXT-PAGESPEED-BLOCK) ---------------------------------

/**
 * The three WebMCP audit ids, copied from WEBMCP_AUDIT_IDS in
 * src/lib/domain-overview-types.ts.
 *
 * 🔴 A SECOND COPY, AND IT HAS SOMETHING THAT GOES RED. This extension ships
 * outside the TypeScript program with no bundler, so it cannot import the
 * original; every previous hand-copy in this file has had only a comment
 * holding it in place, and the SAME_ORIGIN_TIMEOUT_MS pair is the standing
 * example of one that nothing checks. This one is checked:
 * `scripts/check-webmcp-note.ts` compares these strings against the exported
 * constant and fails on any drift, the way check-server-rule-parity already
 * does for SERVER_RULE. A copy without an entrance is a copy that rots.
 *
 * 🔴 THE NOTE BELOW IS TRIGGERED BY MEMBERSHIP IN THIS LIST, NOT BY AN AUDIT'S
 * STATE (PM ruling). The obvious rule — "explain the blanks when something is
 * `not-measured`" — is the wrong one, and production says so: every webmcp
 * entry in every stored row comes back `not-applicable`, because Lighthouse
 * marks them `scoreDisplayMode: 'notApplicable'` rather than nulling a score.
 * What the reader needs explained is WHICH CHECKS are blank and why, and that
 * question is about the audits' identity, not about which flavour of blank the
 * vendor happened to send.
 *
 * ⚠️ THE WEB APP GOT BOTH HALVES OF THIS WRONG AND NO LONGER DOES — this
 * paragraph asserted otherwise, in the present tense, through both fixes. Its
 * note fired on `agentic` merely being non-null until WS-AGENTIC-POLISH, and
 * its closing sentence named `not-measured`, a state that never renders, until
 * WS-WEBMCP-COPY. The trigger is now held by scripts/check-webmcp-note.ts
 * (assertion C). The SENTENCE is held by nothing — which is why a reader, not
 * a gate, is what found it, and why this correction is written down rather
 * than the stale claim simply deleted.
 */
const WEBMCP_AUDITS = [
  'webmcp-form-coverage',
  'webmcp-registered-tools',
  'webmcp-schema-validity',
];

/**
 * Lighthouse's own score bands, and NOT a fourth state.
 *
 * 🔴 null RETURNS 'dash' AND NEVER FALLS INTO A BAND. A category that produced
 * no score is not a category that scored 0 — the whole point of this screen is
 * that those two look different — so a null is routed to the same faint tier
 * every other never-measured value in this panel uses.
 */
function scoreTier(score) {
  if (score === null || score === undefined) return 'dash';
  if (score >= 0.9) return 'good';
  if (score >= 0.5) return 'warn';
  return 'bad';
}

const CATEGORY_LABEL = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  'best-practices': 'Best practices',
  'agentic-browsing': 'Agentic browsing',
};

const VITAL_LABEL = {
  'largest-contentful-paint': 'Largest Contentful Paint',
  'first-contentful-paint': 'First Contentful Paint',
  interactive: 'Time to Interactive',
  'speed-index': 'Speed Index',
  'total-blocking-time': 'Total Blocking Time',
  'cumulative-layout-shift': 'Cumulative Layout Shift',
};

const AUDIT_STATE_WORD = {
  pass: 'Pass',
  fail: 'Fail',
  'not-applicable': 'N/A',
  'not-measured': 'Not measured',
};

/**
 * One Lighthouse category, as a card.
 *
 * ⚠️ NOT `scoreCard` — that name is taken, by the hero card near the top of this
 * file. The first draft of this function used it, and the cost of the collision
 * is worth recording because nothing in this repo would have caught it: the
 * extension has no bundler and no tsc, and `node --check` treats a duplicate
 * top-level declaration in a module the same way it treats every other error in
 * a `.js` it decides is ESM. Two `function` declarations of one name is a
 * load-time SyntaxError, which does not break this screen — it breaks the whole
 * panel, on every site, blank. It surfaced only because a harness imported the
 * real file.
 *
 * 🔴 A SCORE OF 0 RENDERS AS "0" ON A SOLID CARD. Production holds
 * aipeekaboo.com with an `largest-contentful-paint` score of 0 beside a
 * displayValue of 24 seconds — that is the worst measurement Lighthouse can
 * produce, not a missing one, and the dashed card is reserved for the second
 * thing. Same four-state device the traffic cards use, for the same reason.
 */
function categoryCard(label, score) {
  const has = typeof score === 'number' && Number.isFinite(score);
  return el(
    'div',
    has ? 'ovcard' : 'ovcard dashed',
    el(
      'div',
      has ? `num md ${scoreTier(score)}` : 'num md dash',
      has ? String(Math.round(score * 100)) : '—'
    ),
    el('div', 'label', label),
    has ? null : el('p', 'meta', 'This category produced no score')
  );
}

/**
 * A plain figure from the rendered read.
 *
 * 🔴 THE null BRANCH SAYS "not measured", NOT "0", AND THIS IS THE TARGET OF
 * THIS WHOLE SCREEN. `brokenLinks` and `brokenResources` are null on every
 * production row we hold, because the instant_pages endpoint does not carry
 * them. "0 broken links" is good news about a site; "we hold no broken-link
 * measurement" is a statement about us. Printing the first when the truth is
 * the second is red line 3 in the direction that flatters, which is the
 * direction nobody reports.
 */
function pageStat(label, value, note) {
  const has = typeof value === 'number' && Number.isFinite(value);
  const shown = has ? figure(value) : null;
  const n = el('div', has ? 'num md' : 'num md dash', has ? shown.text : '—');
  if (shown?.title) n.title = shown.title;
  return el(
    'div',
    has ? 'ovcard' : 'ovcard dashed',
    n,
    el('div', 'label', label),
    has ? null : el('p', 'meta', note ?? 'Not measured')
  );
}

function lighthouseBlock(lh) {
  const box = document.createDocumentFragment();

  box.append(el('span', 'caps', 'Lighthouse categories'));
  const grid = el('div', 'ovgrid');
  for (const c of lh.categories) {
    grid.append(categoryCard(CATEGORY_LABEL[c.id] ?? c.id, c.score));
  }
  box.append(grid);
  // 🔴 Says why four and not five, on the screen rather than only in the
  // source. Lighthouse also scores an "SEO" category and we hold it; it is a
  // set of mechanical document checks, while the SEO score four rows up this
  // rail is TriRank's own 21-item rubric. Two numbers under one word on one
  // panel disagree for reasons no caption can carry, so the endpoint does not
  // send it and this screen could not draw it if it wanted to.
  box.append(
    el(
      'p',
      'meta',
      'Lighthouse also scores an “SEO” category. It is not shown here and is not sent to this panel: it counts mechanical document checks, while the SEO checks screen in this rail is our own rubric. Two different rulers with one name on one screen is worse than one of them being absent.'
    )
  );

  box.append(el('span', 'caps', 'Lab timings'));
  // ⚠️ THIS HEADING DELIBERATELY DOES NOT SAY "CORE WEB VITALS", and neither
  // may anything else on this screen. Google's Core Web Vitals are LCP, INP and
  // CLS measured on real users. This is a lab run: it yields LCP and CLS, it
  // CANNOT yield INP — that one needs real interactions — and three of the six
  // below (Time to Interactive, Speed Index, Total Blocking Time) are not Core
  // Web Vitals at all. The set is neither a subset nor a superset of that
  // definition, so using the name would claim a third of it that we never
  // measure.
  box.append(
    el(
      'p',
      'meta',
      'A lab run, not field data, and not the Core Web Vitals set. It measures LCP and CLS but cannot measure INP — that one needs real user interactions — and three of the six below are not Core Web Vitals at all.'
    )
  );
  const vitals = el('div', 'table');
  for (const v of lh.vitals) {
    vitals.append(
      el(
        'div',
        'tr wide',
        // The vendor's own formatted string, verbatim — units included. It is
        // not re-derived from the score, which was not computed against any
        // unit or rounding rule we would pick.
        el(
          'span',
          `lvltag ${scoreTier(v.score)}`,
          v.displayValue === null ? '—' : v.displayValue
        ),
        el('span', 'term', VITAL_LABEL[v.id] ?? v.id)
      )
    );
  }
  box.append(vitals);

  if (lh.agentic) {
    box.append(el('span', 'caps', 'Agentic browsing'));
    // 🔴 A RATIO, NEVER A PERCENTAGE. Google scores this category as a pass
    // ratio over the audits that RAN; `applicable` counts pass and fail only, so
    // an audit that never ran is in neither half of the fraction. One "50%"
    // cannot say whether the other half failed or never ran, and today that is
    // the only interesting thing about this category.
    //
    // 🔴 applicable === 0 IS A REAL AND EXPECTED STATE (every audit skipped) and
    // it is handled before anything divides by it.
    box.append(
      el(
        'p',
        'prose',
        lh.agentic.applicable === 0
          ? 'None of these checks could run on this page, so there is no ratio to report. That is not a score of zero.'
          : `${lh.agentic.passed} of ${lh.agentic.applicable} applicable checks pass. Checks that did not apply or did not run are in neither half of that fraction.`
      )
    );
    const audits = el('div', 'table');
    for (const a of lh.agentic.audits) {
      // Four visually distinct outcomes. 'Not measured' and 'N/A' must never
      // look like 'Fail' — the three webmcp rows are blank for every site on
      // the internet today, and a red mark against all of them would be this
      // product reporting a defect nobody can currently observe.
      const tier =
        a.state === 'pass' ? 'good' : a.state === 'fail' ? 'bad' : 'dash';
      audits.append(
        el(
          'div',
          'tr wide',
          el('span', `lvltag ${tier}`, AUDIT_STATE_WORD[a.state] ?? a.state),
          el('span', 'term', a.id)
        )
      );
    }
    box.append(audits);
    if (lh.agentic.audits.some((a) => WEBMCP_AUDITS.includes(a.id))) {
      box.append(
        el(
          'p',
          'meta',
          'The three webmcp checks need Chrome 150 or newer plus a registered origin trial. The engine that produced this run is older, so nobody can measure them today — for this site or any other. A blank there is our reach ending, not a fault of this page.'
        )
      );
    }
  }

  // The field that makes the note above checkable instead of asserted: it names
  // which browser actually ran.
  if (lh.userAgent) {
    box.append(el('p', 'meta', `Engine: ${lh.userAgent}`));
  }
  box.append(
    el(
      'p',
      'meta',
      `Source: ${lh.source} · measured ${shortDate(lh.fetchedAt)}`
    )
  );
  return box;
}

function instantBlock(inst) {
  const box = document.createDocumentFragment();

  box.append(el('span', 'caps', 'Rendered read'));
  // ⚠️ WHAT THIS HALF IS AND IS NOT. The values below come from a read of the
  // home page with JavaScript enabled. The web report puts them beside our own
  // crawler's raw-HTML reading and shows where the two differ — that difference
  // IS client-side rendering. This panel cannot draw that comparison: the
  // stored audit reaches it as per-check statuses, not as the raw values, so
  // only one of the two columns is here. Showing what the rendered read said is
  // honest; calling any of it a JavaScript finding would not be, because there
  // is nothing here for it to have differed from.
  box.append(
    el(
      'p',
      'meta',
      'A read of the home page with JavaScript running. The full report on the web puts these beside our own reading of the raw HTML and shows where the two differ; this panel holds only this side, so nothing here is a before-and-after finding.'
    )
  );

  const grid = el('div', 'ovgrid');
  grid.append(
    pageStat('DOM size', inst.totalDomSize),
    pageStat('Scripts', inst.scriptsCount),
    pageStat('Blocking scripts', inst.renderBlockingScripts),
    pageStat('Blocking styles', inst.renderBlockingStylesheets),
    // 🔴 THE TWO THIS SCREEN EXISTS TO GET RIGHT. Both are null on every row we
    // hold: instant_pages does not carry them. The note names whose gap it is.
    pageStat(
      'Broken links',
      inst.brokenLinks,
      'Not measured — this endpoint does not report it'
    ),
    pageStat(
      'Broken resources',
      inst.brokenResources,
      'Not measured — this endpoint does not report it'
    )
  );
  box.append(grid);
  // 🔴 click depth is reported as a SENTENCE rather than as a card, because 0
  // is its ordinary correct answer here and a lone "0" in a grid of counts
  // reads as an absence no matter which tier it wears. The measured URL is
  // always the home page, so zero hops is what a home page scores.
  if (typeof inst.clickDepth === 'number') {
    box.append(
      el(
        'p',
        'meta',
        `Click depth ${inst.clickDepth} — hops from the entry point. The page measured is the home page, so 0 is what it should read.`
      )
    );
  }

  if (typeof inst.plainTextRate === 'number') {
    // ⚠️ SAME SUBJECT AS OUR OWN THIN-TEXT CHECK, DIFFERENT UNIT, AND THE TWO
    // ARE NOT RECONCILED. This is a ratio of body text to total document size;
    // ours is a threshold on an absolute character count. They can disagree in
    // both directions — a large text-poor page, a tiny text-only one — and
    // neither is wrong. Presenting one as a check on the other would invent a
    // relationship that does not exist.
    box.append(
      el(
        'p',
        'prose',
        `Body text is ${Math.round(inst.plainTextRate * 1000) / 10}% of the rendered document. Reported, not graded: there is no correct share, and this is a different unit from the thin-text check on the SEO checks screen, which counts characters rather than a ratio.`
      )
    );
  }
  if (typeof inst.onpageScore === 'number') {
    // 🔴 NAMED AFTER ITS VENDOR, EVERY TIME IT APPEARS. This is DataForSEO's own
    // 0–100 page score and it is NOT the SEO score this product renders. Same
    // trap as the withheld Lighthouse `seo` category, one screen apart.
    box.append(
      el(
        'p',
        'meta',
        `DataForSEO’s own page score for this URL: ${Math.round(inst.onpageScore * 10) / 10}/100. Their scale, not ours — it is not the SEO score on the SEO checks screen and the two are not comparable.`
      )
    );
  }

  box.append(
    el(
      'p',
      'meta',
      `Source: ${inst.source} · measured ${shortDate(inst.fetchedAt)}`
    )
  );
  return box;
}

/**
 * WS-EXT-PAGESPEED-BLOCK — what a browser does with this domain's home page.
 *
 * 🔴 TWO BLOCKS, TWO DATES, AND THEY ARE NEVER MERGED. Lighthouse and the
 * rendered read are two vendor calls; today they land seconds apart in one
 * audit run, but either can fail while the other succeeds and either can be a
 * day older. One date over both would assert a single measurement that never
 * happened — the same rule the Backlinks screen already follows for its counts
 * and its referring-domain list.
 *
 * 🔴 THIS SCREEN'S DEFAULT STATE IS EMPTY AND THAT IS EXPECTED, NOT A BUG. Of
 * the 37 domains in the overview cache when this was written, 2 held a
 * Lighthouse run and 1 held a rendered read — these rows are only ever written
 * by a free audit, and only since the layer shipped. So for almost every domain
 * a user browses, the honest answer is "nobody has run this yet" plus the way
 * to run it, and the screen is built around that rather than around the case
 * where data exists.
 */
function screenPagespeed() {
  const box = document.createDocumentFragment();
  box.append(el('h1', 'title', 'Measured page'));

  // 🔴 First thing on the screen, above any number. Everything here describes
  // the domain's HOME PAGE as a vendor measured it during a free audit — not
  // the page the user is standing on, and not anything this panel measured.
  // Without this the numbers read as a verdict on the current tab.
  box.append(el('p', 'disclosure', 'These readings are of this domain’s '));
  box.lastChild.append(
    el('strong', null, 'home page'),
    ', taken by DataForSEO during a free audit — not of the page you are on, and not measured by this panel. Nothing on this screen is read from your browser.'
  );

  if (state.cacheState === 'loading') {
    box.append(reading('the stored page measurements'));
    return box;
  }
  // Our lookup failed or hit its daily limit. A DIFFERENT branch from the one
  // below, and they mean opposite things: this one says nothing at all about
  // whether the measurements exist.
  if (!state.cache) {
    box.append(cacheUnavailable(), entryLinks());
    return box;
  }

  const lh = state.cache.lighthouse;
  const inst = state.cache.instant;
  const haveLh = lh?.state === 'measured';
  const haveInst = inst?.state === 'measured';

  // The ordinary case. Both halves absent → one honest card and the way to
  // fill it, in the house shape the Whois screen already uses.
  if (!haveLh && !haveInst) {
    box.append(
      cacheBlockMissing(
        'Measured page',
        'Nobody has run a page measurement for this domain yet. The free audit runs one and stores it; this panel only ever reads what is already there, and never starts a measurement itself.'
      ),
      el('p', 'meta', `Source: ${lh?.source ?? inst?.source ?? 'not stored'}`),
      entryLinks()
    );
    return box;
  }

  if (haveLh) box.append(lighthouseBlock(lh));
  else {
    box.append(
      el(
        'div',
        'card dashed',
        el('div', 'label', 'No Lighthouse run stored'),
        el(
          'p',
          'prose',
          'The rendered read below exists for this domain but the Lighthouse run does not. They are two separate vendor calls and either can be missing on its own.'
        )
      )
    );
  }

  if (haveInst) box.append(instantBlock(inst));
  else {
    box.append(
      el(
        'div',
        'card dashed',
        el('div', 'label', 'No rendered read stored'),
        el(
          'p',
          'prose',
          'The Lighthouse run above exists for this domain but the rendered read does not. They are two separate vendor calls and either can be missing on its own.'
        )
      )
    );
  }

  box.append(entryLinks());
  return box;
}

function screenBacklinks() {
  const box = document.createDocumentFragment();
  box.append(el('h1', 'title', 'Backlinks'));

  if (state.cacheState === 'loading') {
    box.append(reading('the stored backlink snapshot'));
    return box;
  }
  if (!state.cache) {
    // WS-EXT-EMPTY-STATE — the lookup failed, which is a third state alongside
    // the two 4ca768d gave doors to (counts missing → trio; referring list
    // missing → the Backlink Checker link). Those two are about what is stored;
    // this one is about our read failing, so the standard trio is right.
    box.append(cacheUnavailable(), entryLinks());
    return box;
  }
  const b = state.cache.backlinks;
  if (b.state !== 'measured') {
    box.append(
      cacheBlockMissing(
        'Backlinks',
        'No backlink snapshot is stored for this domain. This panel reads the cache and never buys a fresh one — running the free audit is what fills it.'
      ),
      el('p', 'meta', `Source: ${b.source}`),
      // The sentence above already names the action; until now it named it with
      // nothing to click. Five screens end in this same trio and this one was
      // simply never given it.
      //
      // 🔴 DO NOT REMOVE THIS BELIEVING THE AUDIT CANNOT FILL THIS BLOCK. That
      // was proposed once, on the reasoning that a not_measured block is a
      // whole-block guard and only connecting the domain to TriRank could
      // satisfy it. Both halves are wrong and both were checked:
      //
      //   · the free audit widget fires loadOverviewPart(domain, 'authority')
      //     and 'traffic' and 'rdap' at /api/domain-overview, whose PART_SOURCE
      //     maps those three to 'dataforseo', 'similarweb' and 'rdap' — and the
      //     route writes `<domain>::<source>`. Those are precisely the keys this
      //     screen, Traffic and Whois read. Running the audit IS what fills them.
      //   · production settles it independently: the `site` table holds five
      //     connected sites, while 26 domains carry a `::dataforseo` row and 22
      //     of those 26 are not connected sites at all (measured 2026-08-02).
      //     They cannot have got there by being connected.
      //
      // The referring-domain block further down is the one where the audit is
      // genuinely the wrong destination — see the link there and oneLink's note.
      // The two branches of this screen do not share an answer.
      entryLinks()
    );
    return box;
  }

  // 🔴 0 is a measurement and renders as one. The only reason this line can
  // say "0" at all is that the endpoint sent state:'measured' with a zero — a
  // missing snapshot took the branch above and printed a dash instead.
  const links = b.backlinks;
  const sites = b.linkingWebsites;
  if (links !== null || sites !== null) {
    const noneAtAll = (links ?? 0) === 0 && (sites ?? 0) === 0;
    box.append(
      verdict(
        noneAtAll ? 'warn' : 'ok',
        noneAtAll
          ? 'Zero backlinks and zero linking websites in the stored snapshot. That is a measured zero, not a missing measurement — nothing in this index points at the domain.'
          : `${links ?? '—'} backlink(s) from ${sites ?? '—'} linking website(s) in the stored snapshot.`
      )
    );
  }
  box.append(
    el(
      'div',
      'card',
      el('span', 'caps', 'Counts'),
      el(
        'div',
        'levels',
        el(
          'div',
          'lvl',
          el('span', 'k', 'BACKLINKS'),
          links === null
            ? el('span', 'num md dash', '—')
            : numCell('num md', links)
        ),
        el(
          'div',
          'lvl',
          el('span', 'k', 'WEBSITES'),
          sites === null
            ? el('span', 'num md dash', '—')
            : numCell('num md', sites)
        )
      ),
      el(
        'p',
        'meta',
        `Source: ${b.source} · measured ${shortDate(b.fetchedAt)}`
      )
    ),
    el(
      'p',
      'qual',
      'The audit does not score backlinks — it marks them needs-connection, because a Worker cannot verify a link index. These are stored numbers with a date on them, not part of any grade.'
    )
  );

  // WS-EXT-BACKLINK-LIST — which sites link here. Same /api/site-cache response
  // the card above comes from; no new request and no new permission, the block
  // was already arriving unread. Phase 0 settled these things about it:
  //
  // 🔴 A TOP SLICE, NEVER "the referring domains". The stored list is capped
  // (REFERRING_DOMAINS_LIMIT in src/lib/dataforseo.ts) and ordered by rank
  // descending. Rank therefore LEADS the row: it is the key the slice was taken
  // on, so the column descends down the screen and a reader can see what chose
  // these rows. Same device, and the same reason, as Top keywords below.
  //
  // 🔴 THE COPY NAMES THE CAP, AND IT USED TO REFUSE TO. Do not restore the
  // older wording. What stood here sent the reader to the WEBSITES figure on the
  // counts card to work out for themselves whether the cap had hidden anything —
  // DELETED, and paraphrased rather than quoted on purpose: a docblock that
  // quotes deleted copy verbatim is the thing a grep for that copy finds, so the
  // quote would have made its own removal unverifiable. The instruction produced a
  // FALSE inference on the one domain anybody working on this panel looks at:
  // trirankai.com renders 4 rows against 8 WEBSITES, so a reader who follows it
  // concludes the cap hid four domains. It did not. Measured against production D1 on 2026-08-08, that
  // list row was written 2026-07-13 and holds all 4 referring domains the vendor
  // had then, while the 8 comes from a `::dataforseo` row written 2026-08-03 —
  // twenty-one days apart, two endpoints, two writers. The cap was never
  // touched: 4 of the 5 stored rows in production sit at 10, and that one does
  // not. A sentence true for four domains and false for the fifth, with nothing
  // anywhere to go red.
  //
  // ⚠️ NAMING THE CAP BUYS THAT CLARITY WITH A SILENT COUPLING, KNOWINGLY. The
  // word "ten" in the copy below is a hand-copy of REFERRING_DOMAINS_LIMIT and
  // this bundle cannot import it — extension/ ships to Chrome and never sees
  // src/. Change that constant and this string is wrong with nothing to catch
  // it. The trade was made on purpose: a reader has no way to tell a capped list
  // from a complete one, so refusing to state the cap left them doing arithmetic
  // against a count that answers a different question, on a different date.
  //
  // 🔴 A SECOND MEASUREMENT, NOT A DETAIL VIEW OF THE CARD ABOVE. The counts and
  // this list come from different DataForSEO endpoints run on different days —
  // production has eonebill.ai's list taken 2026-07-17 (95 backlinks / 13 sites)
  // and its counts taken 2026-07-25 (96 / 13). Both dates are on screen for that
  // reason. Printing one date over both would assert a single reading of a single
  // moment that never happened.
  //
  // 🔴 MOST DOMAINS TAKE THE EMPTY BRANCH AND THAT IS NOT A BUG. Five of the 27
  // domains in the production cache carry this list, and it does not grow on its
  // own: the ONLY writer of the `<domain>::backlink-checker` cache key is the
  // public free tool at src/app/api/tools/backlink-checker/route.ts, which had
  // been run five times since launch, most recently 2026-07-19 — while this panel
  // read the cache 342 times in the preceding 16 days (all measured against
  // production D1 on 2026-08-02). Two orders of magnitude apart, so for a domain
  // a user happens to be browsing the empty branch is the ORDINARY outcome. It
  // says we have not measured, never that the domain has none (red line 3).
  //
  // 🔴 NO PLAN TIERS HERE, DELIBERATELY. The 20/200/500/1000 in the product are
  // `prospectRows` (src/config/website.tsx) and they ration the backlink PROSPECT
  // table — a different feature, on different data, behind a login. Quoting them
  // beside this list would send a reader to a page where nothing matches the
  // number they were shown, and that is a false statement with no failure mode:
  // it is not wrong for any particular reader, so nothing ever goes red.
  //
  const rd = state.cache.referringDomains;
  if (rd?.state === 'measured') {
    // The reader drops a row it cannot render and returns null for an empty
    // result, so 'measured' already guarantees at least one item — the heading
    // and the table read the one array either way.
    //
    // 🔴 THE FIRST THING APPENDED HERE IS THE SEPARATOR, AND IT HAS TO STAY
    // FIRST. It is the only place a reader is told the counts card and this list
    // are not one reading, and it goes before the rows rather than after them:
    // the false inference it defuses is formed while the rows are being read.
    //
    // 🔴 IT IS INSIDE THIS BRANCH ON PURPOSE, not by oversight. It was written
    // unconditional first, and on the empty branch its second clause is a plain
    // falsehood — "each carries its own date" when the missing block carries no
    // date at all, which is the ORDINARY branch (5 of 30 production domains have
    // this list). The empty branch already states the same independence in terms
    // that are true there: "the counts above came from one lookup, and the list
    // of sources comes from a second one that has not been run for this domain."
    // A second, weaker copy of that sentence buys nothing and lies.
    //
    // 🔴 The dates themselves stay beside their own numbers and must not be
    // hoisted into this line, collapsed into one, or demoted into a title
    // attribute. This sentence says the two readings are independent; only the
    // per-block `measured …` meta lines say when each one happened, and a reader
    // needs both halves.
    box.append(
      el(
        'p',
        'meta',
        'The counts above and this list are two separate lookups, each carrying its own date below. On a real domain those two dates — and the numbers under them — will not match.'
      ),
      el('span', 'caps', `Top referring domains · ${rd.items.length}`),
      // WS-EXT-PANEL-UX A — 🔴 THIS SENTENCE MOVED ABOVE THE TABLE AND MUST STAY
      // THERE. It was the fourth paragraph under the rows, which is where a
      // reader who scrolls to the numbers and stops never reaches it — and the
      // misreading it defends against is formed while the numbers are being
      // read, not after. Same placement argument as the separator above.
      //
      // 🔴 IT ABSORBED THE OLD "Bold is … faint is …" LEGEND, which is deleted
      // rather than kept alongside: the table now has a header row naming both
      // columns, so a second sentence identifying them by TYPEFACE would be a
      // second answer to a question the header already answers, and the two
      // could drift. What could not be delegated to a header is everything
      // below — the scale, what a 0 is, and the DR warning.
      //
      // 🔴 "a different index on a different scale" IS THE LOAD-BEARING CLAUSE
      // and predates this edit. It guards a defect this product actually
      // shipped: before c5eb6e9 (WS-AHREFS-DR) DataForSEO's own rank WAS
      // displayed under a DR label across the app, and blobs written before it
      // still carry that rank in a `dr` field that every reader drops on the
      // way out. src/lib/dataforseo.ts goes as far as forbidding any key named
      // `dr` in its history type so the mistake becomes a tsc error. This is
      // that same guard, on the last surface that shows the number raw.
      //
      // ⚠️ THE SCREEN NAME IS CORRECTED HERE, and it was never right: this said
      // "the DR on the Overview screen" from the day it was written (5196cce,
      // 2026-08-02), while screenDr and the rail's own 'Domain rating' row had
      // existed since 33ea9c2, five days earlier. The Overview screen carries
      // AI visibility / GEO structure / SEO basics and has never carried a DR.
      // A true warning that points at the wrong screen has no failure mode —
      // nothing reads this string but a person.
      el(
        'p',
        'meta',
        'Rank is DataForSEO’s own 0–100 score for the linking domain, and the key these rows were chosen by; a 0 means that domain passes no rank to this one — the bottom of that scale, not a gap in our data. Links is how many links it sends here. Rank is NOT an Ahrefs Domain Rating: a different index on a different scale, so it must not be read beside the DR on the Domain rating screen.'
      ),
      el(
        'div',
        'table',
        // WS-EXT-PANEL-UX A-1 — the header. These two columns have been two bare
        // numbers since 5196cce and never had one; `git log -S` over the whole
        // of extension/ finds no header for them that was ever removed, and no
        // `thead`/`th` anywhere in this file. The panel is not short of the
        // idiom either — the Overview comparison table has carried `.ovhead`
        // since it was written — this table simply never got it.
        el(
          'div',
          'tr rd thead',
          el('span', 'lvltag', 'Rank'),
          el('span', 'lvltag', 'Links'),
          el('span', 'term', 'Referring domain')
        ),
        ...rd.items.map((r) =>
          el(
            'div',
            'tr rd',
            rankCell(r.dataforseoRank),
            r.backlinks === null
              ? el('span', 'lvltag est', '—')
              : numCell('lvltag est', r.backlinks),
            el('span', 'term', r.domain)
          )
        )
      ),
      el(
        'p',
        'meta',
        `Source: ${rd.source} · measured ${shortDate(rd.fetchedAt)}`
      ),
      el(
        'p',
        'qual',
        'Ordered by rank and capped at the ten highest-ranked. Rows that tie — and most of them tie at 0 — keep the index’s own order among themselves, which nothing on screen can show. Fewer than ten rows means this is every referring domain that lookup found; ten rows means the cap may be holding more back. Either way these are the rows one stored lookup returned on the date above, not a live list, and per-link detail (page title, anchor text, target URL) is not in this index at all.'
      ),
      // WS-BACKLINK-PANEL — the refresh dependency, said out loud. This list has
      // no TTL on the way out: the panel's reader takes the newest row for the
      // key and applies no age limit at all, so "nothing has run" and "this is
      // current" look identical on screen apart from the date. trirankai.com sat
      // at a 2026-07-13 reading on 2026-08-08 for exactly that reason.
      //
      // 🔴 THE SAME LINK THE EMPTY BRANCH ALREADY SHOWS, and that is why it is
      // safe to put here. It is not a new door to a paid path: 5 of the 30
      // domains in the production cache carry this list, so the other 25 were
      // already being handed this link on the branch below. What is new is only
      // that a reader looking at a stale date can now act on it instead of
      // having no idea what would move it.
      //
      // 🔴 IT SAYS THE RUN COSTS US MONEY AND DOES NOT PRINT A PRICE. Two
      // reasons, both load-bearing. (1) The figure quoted at me for this was
      // "$0.024 + rows x $0.000036", which is ONE request — fetchDataforseoBacklinks
      // in src/lib/dataforseo.ts issues TWO billable ones (summary/live plus
      // referring_domains/live, Promise.all), and only summary's price has ever
      // been read back off the vendor's own `cost` field. Printing it would have
      // understated our cost by about half and sourced half of it to nothing.
      // (2) This bundle is public on the Chrome store; the visitor-facing fact
      // is the rate limit they will actually hit, not our unit economics. The
      // "three a day" is IP_DAILY_LIMIT in
      // src/app/api/tools/backlink-checker/route.ts (there is also a 100/day
      // site-wide cap, which no single visitor can observe and so is not named).
      el(
        'p',
        'qual',
        'Nothing refreshes this on its own. It moves only when someone runs the free Backlink Checker for this domain — that run spends a paid lookup on our side, so it is limited to three a day per visitor.'
      ),
      oneLink('Free Backlink Checker →', `${SITE}/tools/backlink-checker`)
    );
  } else {
    box.append(
      cacheBlockMissing(
        'Referring domains',
        'We have not looked up which sites link here. That is a gap in our cache and says nothing about the domain — the counts above came from one lookup, and the list of sources comes from a second one that has not been run for this domain. It is the free Backlink Checker on the website that fills it; this panel only ever reads what is already stored.'
      )
    );
    if (rd) box.append(el('p', 'meta', `Source: ${rd.source}`));
    // 🔴 The tool, NOT /free-audit — see oneLink. This block's own sentence
    // already says the free Backlink Checker is what fills this; the audit does
    // not, so the trio the counts branch uses would point somewhere that cannot
    // help. Names what the product has and never what the reader has bought:
    // the panel sends credentials:'omit' and does not know who is reading.
    box.append(
      oneLink('Free Backlink Checker →', `${SITE}/tools/backlink-checker`)
    );
  }

  // 🔴 Both transforms run BEFORE the count is taken, and the count and the table
  // read the SAME array. The heading used to take `b.topKeywords.length`, which
  // would print 8 over 7 visible rows the moment the fold collapsed anything —
  // the shape that keeps recurring here is a string asserting a relationship to
  // something else, left behind when the something else changed.
  const kw = foldKeywordRows(mergeSameKeywordRows(b.topKeywords));
  if (kw.length) {
    box.append(
      el('span', 'caps', `Top keywords · ${kw.length}`),
      dataTable(
        kw,
        (k) =>
          el(
            'div',
            'tr kw',
            // Volume leads because volume is the key the rows are ordered by, so
            // the column descends down the screen and a reader can see that it
            // does. Traffic sits beside it in the faint tier: it is the second
            // fact about the row, not the one that chose it.
            el('span', 'lvltag', k.volume === null ? '—' : String(k.volume)),
            el(
              'span',
              'lvltag est',
              k.traffic === null ? '—' : String(k.traffic)
            ),
            el(
              'div',
              'kwterm',
              el('span', 'term', k.keyword),
              k.variants > 0
                ? el('span', 'kwvar', `+${k.variants} variant(s)`)
                : null
            )
          ),
        // cpc stays in the copied line. It is not a column by ruling, which is
        // not a reason to drop it from the one place it was already leaving.
        (k) =>
          `${k.keyword}\t${k.traffic ?? ''}\t${k.volume ?? ''}\t${k.cpc ?? ''}`
      ),
      el(
        'p',
        'meta',
        'Bold is the keyword’s monthly search volume; faint is the traffic this domain is estimated to get from it. Both come from the one stored snapshot dated above.'
      ),
      el(
        'p',
        'qual',
        'These are the highest-volume keywords the domain ranks for — search volume is the key we ask the index for, which is why it is the number shown first and why it falls as you read down. It is not a ranking by traffic: the rows were chosen for how big the keyword is, not for how much it sends here, so the traffic column legitimately jumps around.'
      ),
      el(
        'p',
        'qual',
        'Rows whose traffic, volume and cost-per-click are all identical are near-duplicate phrasings of one keyword; they are folded into one row and counted as variants. Same fold the public /site report applies, so the two show the same number of rows for the same snapshot.'
      )
    );
  }
  return box;
}

const SCREENS = {
  overview: screenOverview,
  aeo: screenAeo,
  whois: screenWhois,
  backlinks: screenBacklinks,
  traffic: screenTraffic,
  pagespeed: screenPagespeed,
  crawler: screenCrawler,
  density: screenDensity,
  robots: screenRobots,
  unknownurl: screenUnknownUrl,
  geo: screenGeo,
  checks: screenChecks,
  issues: screenIssues,
  dr: screenDr,
  headings: screenHeadings,
  schema: screenSchema,
  social: screenSocial,
  images: screenImages,
  links: screenLinks,
  hreflang: screenHreflang,
};

// --- rail ------------------------------------------------------------------

/**
 * The dot says what is KNOWN for that dimension right now, not whether the site
 * is doing well: 'ok' = we have something stored to show, 'none' = nothing
 * stored yet, 'pending' = the lookup that would answer it is still out. It never
 * renders a verdict the screen itself would not support.
 */
function railStatus(id, needs) {
  const s = state.signals;
  // WS-EXT-UI ① — 🔴 An empty dot is a statement: "nothing is stored for this
  // row". While the lookup is still out we have not earned it, and a whole rail
  // of them at once is the loudest version of the claim the panel can make. The
  // fifth state says only that we do not know yet.
  if (needs === 'cache') {
    if (state.cacheState === 'loading') return 'pending';
    if (!state.cache) return 'none';
    const block = state.cache[id];
    return block?.state === 'measured' ? 'ok' : 'none';
  }
  // WS-EXT-PAGESPEED-BLOCK — the same lookup as 'cache', over two blocks
  // instead of one. 'ok' means "the screen has something to draw", which for
  // this row is true as soon as EITHER vendor call is stored: Lighthouse and
  // the rendered read are fired as independent parts with independent budget
  // checks, so a domain holding one and not the other is an ordinary state and
  // not a half-failure. Requiring both would print an empty dot over a screen
  // with a full Lighthouse report on it.
  if (needs === 'pagespeed') {
    if (state.cacheState === 'loading') return 'pending';
    if (!state.cache) return 'none';
    return state.cache.lighthouse?.state === 'measured' ||
      state.cache.instant?.state === 'measured'
      ? 'ok'
      : 'none';
  }
  // The overview is "we have something to summarise", never a verdict about the
  // site — it aggregates other rows and must not look like a row of its own.
  if (needs === 'summary') {
    if (state.signalsState === 'loading') return 'pending';
    return s ? 'ok' : 'none';
  }
  if (needs === 'signals') {
    // 🔴 Only the rows this lookup actually feeds. A page-read row's dot does
    // not depend on it and must not borrow its uncertainty.
    if (state.signalsState === 'loading') return 'pending';
    if (!s) return 'none';
    if (id === 'aeo') return s.citation?.state === 'scored' ? 'ok' : 'none';
    if (id === 'dr') return s.authority?.state === 'measured' ? 'ok' : 'none';
    return s.audit?.state === 'measured' ? 'ok' : 'none';
  }
  // WS-EXT-PANEL-UX B-1 — the nine rows that fell off the end of this function.
  //
  // 🔴 THESE TWO BRANCHES DID NOT EXIST AND THE ROWS FELL THROUGH TO `none`,
  // which is a printed claim ("nothing is stored for this row") and was true of
  // all eleven of them on the day this function was written: 33ea9c2 shipped the
  // rail with five screens reading the cache and "the other eleven say 'not
  // built yet' in their own wording". Every one of those screens has since been
  // built — Structured data draws five types and 222 fields — and nothing
  // brought the dot along, because a `return` at the bottom of a function has no
  // way to notice that its premise was dismantled. Eight page rows plus the
  // probe row are exactly the nine empty dots on screen today.
  //
  // 🔴 NO SIXTH VISUAL. `pending` already means "the lookup that would answer
  // this is still out" and is drawn as a pulsing filled dot; a page read in
  // flight is the same fact about a different reader, so it reuses it rather
  // than inventing a second in-progress form.
  //
  // 🔴 `stale` IS REACHED THROUGH THIS BRANCH RATHER THAN HANDLED IN IT. When
  // the bound tab navigates, state.scan still holds the OUTGOING page's reading
  // at 'ok', so these rows return 'ok' and renderRail turns it into 'stale' by
  // the rule it already had. Until now the ring that exists to say "this is the
  // previous page" could only ever land on backend rows, whose data is about a
  // domain and did not go anywhere — the eight rows it actually described were
  // the eight it could not reach.
  if (needs === 'page') {
    if (state.scan.state === 'running') return 'pending';
    return state.scan.state === 'ok' ? 'ok' : 'none';
  }
  // The probe is the one row in the rail that is genuinely waiting on the user:
  // it sends real requests from their own IP, so it is behind an explicit click
  // and a disclosure and must never start itself. `awaitingGrant` is the window
  // where Chrome is asking for host permission — from the reader's side that is
  // indistinguishable from running, and both are "something is happening".
  if (needs === 'probe') {
    if (state.probe.awaitingGrant) return 'pending';
    return state.probe.payload ? 'ok' : 'none';
  }
  return 'none';
}

/**
 * WS-EXT-PANEL-UX B-2 — what the dot MEANS, in words, per row.
 *
 * 🔴 THE DOT HAD NO TEXT OF ANY KIND. It is stated twice in this file to be the
 * only carrier of a row's state ("the label says what the row is, not how it is
 * doing"), and it was a bare `<span>` with a class — nothing to hover, nothing
 * for a screen reader, and five forms a reader is left to infer. The inference
 * that actually goes wrong is the empty one: `none` reads as "we have nothing
 * for you", and on the probe row it means the opposite of that — one click and
 * it is full. Nothing on screen said so.
 *
 * 🔴 THE WORDING FORKS ON WHAT WOULD FILL THE ROW, not on the status alone,
 * because that is the whole difference the empty dot was hiding: a page row is
 * empty when a read we ran ourselves came back with nothing, a backend row is
 * empty when nobody has ever run an audit for this domain, and the probe row is
 * empty because it is waiting to be asked. Three different next actions behind
 * one identical dot.
 *
 * The text rides in a visually-hidden span inside the button, so it joins the
 * button's accessible name ("Structured data, reading the page now") rather
 * than replacing it, and as `title` on the dot for a pointer. Neither costs a
 * pixel of the rail's height, which is the constraint every option here is
 * measured against.
 */
function dotLabel(status, needs) {
  if (status === 'pending') {
    return needs === 'page' ? 'reading the page now' : 'looking this up now';
  }
  if (status === 'stale') return 'from the page you were on before';
  if (status === 'ok') return 'we have this';
  if (needs === 'probe') return 'not run yet — open this row to run it';
  if (needs === 'page') return 'no reading of this page';
  // 'pagespeed' falls through here with the backend wording, which is the
  // correct one: like 'cache' and 'signals', an empty dot on that row means
  // nobody has run an audit for this domain — not that a read of ours failed.
  return 'nothing stored for this domain';
}

/**
 * WS-EXT-UI ⑤ — what each row IS.
 *
 * 🔴 Until now the only graphic in the rail was the status dot, which answers
 * "do we have data for this" — so the one visual position went to STATE, and
 * nothing at all said SUBJECT. A rail of identical dots means finding the row
 * you want is reading every label in it. Icon and dot now coexist and
 * answer different questions: the icon says what the row is, the dot says
 * whether we hold anything for it.
 *
 * 🔴 Every icon names the thing, none is decoration. Where a row had no obvious
 * symbol the choice went to what the SCREEN shows (Whois is a registry record,
 * so it is a card; Backlinks is other sites pointing here, so it is a network).
 *
 * 🔴 Source: node_modules/lucide-react (ISC) — the same icon family the web app
 * uses, so a reader who has seen the dashboard recognises them. The panel ships
 * as static files with no bundler and stays at zero dependencies, so the path
 * data is copied in; each entry names the lucide icon it came from, which is
 * what makes it checkable against the package instead of by eye. Transcribed
 * from the module rather than typed.
 */
const RAIL_ICONS = {
  // lucide "layout-dashboard"
  overview: [
    ['rect', { width: '7', height: '9', x: '3', y: '3', rx: '1' }],
    ['rect', { width: '7', height: '5', x: '14', y: '3', rx: '1' }],
    ['rect', { width: '7', height: '9', x: '14', y: '12', rx: '1' }],
    ['rect', { width: '7', height: '5', x: '3', y: '16', rx: '1' }],
  ],
  // lucide "quote"
  aeo: [
    [
      'path',
      {
        d: 'M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z',
      },
    ],
    [
      'path',
      {
        d: 'M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z',
      },
    ],
  ],
  // lucide "blocks"
  geo: [
    [
      'path',
      {
        d: 'M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2',
      },
    ],
    ['rect', { x: '14', y: '2', width: '8', height: '8', rx: '1' }],
  ],
  // lucide "bot"
  crawler: [
    ['path', { d: 'M12 8V4H8' }],
    ['rect', { width: '16', height: '12', x: '4', y: '8', rx: '2' }],
    ['path', { d: 'M2 14h2' }],
    ['path', { d: 'M20 14h2' }],
    ['path', { d: 'M15 13v2' }],
    ['path', { d: 'M9 13v2' }],
  ],
  // lucide "list-checks"
  checks: [
    ['path', { d: 'M13 5h8' }],
    ['path', { d: 'M13 12h8' }],
    ['path', { d: 'M13 19h8' }],
    ['path', { d: 'm3 17 2 2 4-4' }],
    ['path', { d: 'm3 7 2 2 4-4' }],
  ],
  // lucide "triangle-alert"
  issues: [
    [
      'path',
      {
        d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
      },
    ],
    ['path', { d: 'M12 9v4' }],
    ['path', { d: 'M12 17h.01' }],
  ],
  // lucide "heading"
  headings: [
    ['path', { d: 'M6 12h12' }],
    ['path', { d: 'M6 20V4' }],
    ['path', { d: 'M18 20V4' }],
  ],
  // lucide "type"
  density: [
    ['path', { d: 'M12 4v16' }],
    ['path', { d: 'M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2' }],
    ['path', { d: 'M9 20h6' }],
  ],
  // lucide "image"
  images: [
    ['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2', ry: '2' }],
    ['circle', { cx: '9', cy: '9', r: '2' }],
    ['path', { d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' }],
  ],
  // lucide "link"
  links: [
    [
      'path',
      { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' },
    ],
    [
      'path',
      { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
    ],
  ],
  // lucide "link" — 🔴 THE SAME GLYPH AS `links`, ON PURPOSE AND NOT BY
  // OVERSIGHT. The rail's own rule is that the icon names the thing and none is
  // decoration; of the nineteen already here, the link is the only one whose
  // subject is a URL, and this screen is about URLs. A second, more exact glyph
  // (lucide has "link-2-off") would have to be transcribed from the package,
  // and the ruling for this batch was to reuse rather than add. The two rows
  // are told apart by their labels, which is where the difference actually is:
  // one is about the links this page contains, the other about a URL it does
  // not.
  unknownurl: [
    [
      'path',
      { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' },
    ],
    [
      'path',
      { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
    ],
  ],
  // lucide "braces"
  schema: [
    [
      'path',
      {
        d: 'M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1',
      },
    ],
    [
      'path',
      {
        d: 'M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1',
      },
    ],
  ],
  // lucide "languages"
  hreflang: [
    ['path', { d: 'm5 8 6 6' }],
    ['path', { d: 'm4 14 6-6 2-3' }],
    ['path', { d: 'M2 5h12' }],
    ['path', { d: 'M7 2h1' }],
    ['path', { d: 'm22 22-5-10-5 10' }],
    ['path', { d: 'M14 18h6' }],
  ],
  // lucide "share-2"
  social: [
    ['circle', { cx: '18', cy: '5', r: '3' }],
    ['circle', { cx: '6', cy: '12', r: '3' }],
    ['circle', { cx: '18', cy: '19', r: '3' }],
    ['line', { x1: '8.59', x2: '15.42', y1: '13.51', y2: '17.49' }],
    ['line', { x1: '15.41', x2: '8.59', y1: '6.51', y2: '10.49' }],
  ],
  // lucide "map"
  robots: [
    [
      'path',
      {
        d: 'M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z',
      },
    ],
    ['path', { d: 'M15 5.764v15' }],
    ['path', { d: 'M9 3.236v15' }],
  ],
  // lucide "id-card"
  whois: [
    ['path', { d: 'M16 10h2' }],
    ['path', { d: 'M16 14h2' }],
    ['path', { d: 'M6.17 15a3 3 0 0 1 5.66 0' }],
    ['circle', { cx: '9', cy: '11', r: '2' }],
    ['rect', { x: '2', y: '5', width: '20', height: '14', rx: '2' }],
  ],
  // lucide "gauge"
  dr: [
    ['path', { d: 'm12 14 4-4' }],
    ['path', { d: 'M3.34 19a10 10 0 1 1 17.32 0' }],
  ],
  // lucide "network"
  backlinks: [
    ['rect', { x: '16', y: '16', width: '6', height: '6', rx: '1' }],
    ['rect', { x: '2', y: '16', width: '6', height: '6', rx: '1' }],
    ['rect', { x: '9', y: '2', width: '6', height: '6', rx: '1' }],
    ['path', { d: 'M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3' }],
    ['path', { d: 'M12 12V8' }],
  ],
  // lucide "chart-line"
  traffic: [
    ['path', { d: 'M3 3v16a2 2 0 0 0 2 2h16' }],
    ['path', { d: 'm19 9-5 5-4-4-3 3' }],
  ],
  // lucide "gauge" — a dial with a needle, which is what a Lighthouse score is
  // drawn as everywhere a reader has seen one. Transcribed from
  // node_modules/lucide-react/dist/esm/icons/gauge.js (v0.563.0), not redrawn.
  pagespeed: [
    ['path', { d: 'm12 14 4-4' }],
    ['path', { d: 'M3.34 19a10 10 0 1 1 17.32 0' }],
  ],
  // 🔴 The last two are NOT rail rows and never will be — 'sun' and 'moon' are
  // not screen ids, and `renderRail` walks GROUPS rather than this object, so
  // they are unreachable from the rail by construction. They live here because
  // `icon()` reads this one map and the alternative was a second map with the
  // same shape, the same provenance rule and the same transcription discipline.
  // They are the header's theme control (WS-EXT-1.3.0 B).
  //
  // 🔴 SAME PAIR THE APP USES, and that is the whole reason they are these two
  // and not a contrast glyph or a half-filled circle: src/components/layout/
  // mode-switcher.tsx imports SunIcon and MoonIcon from lucide-react, so a
  // reader who has seen the site's switcher is looking at the same two shapes
  // here. Transcribed from node_modules/lucide-react/dist/esm/icons/{sun,moon}.js
  // (v0.563.0), same as every entry above.
  sun: [
    ['circle', { cx: '12', cy: '12', r: '4' }],
    ['path', { d: 'M12 2v2' }],
    ['path', { d: 'M12 20v2' }],
    ['path', { d: 'm4.93 4.93 1.41 1.41' }],
    ['path', { d: 'm17.66 17.66 1.41 1.41' }],
    ['path', { d: 'M2 12h2' }],
    ['path', { d: 'M20 12h2' }],
    ['path', { d: 'm6.34 17.66-1.41 1.41' }],
    ['path', { d: 'm19.07 4.93-1.41 1.41' }],
  ],
  moon: [
    [
      'path',
      {
        d: 'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401',
      },
    ],
  ],
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Build one 24-grid lucide glyph. Decorative: the label beside it is the name. */
function icon(id) {
  const nodes = RAIL_ICONS[id];
  if (!nodes) return null;
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    class: 'ico',
  }))
    svg.setAttribute(k, v);
  for (const [tag, attrs] of nodes) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    svg.append(node);
  }
  return svg;
}

function renderRail() {
  const rail = $('rail');
  rail.replaceChildren();
  for (const [groupLabel, items] of GROUPS) {
    const group = el('div', 'group', el('span', 'glabel', groupLabel));
    for (const [id, label, needs] of items) {
      // 🔴 A green dot after the tab navigated is the exact lie this batch
      // exists to remove: it would read as "we have this for the page you are
      // looking at". Anything we HAD becomes its own third state; a row that was
      // empty stays empty, because nothing went out of date.
      const held = railStatus(id, needs);
      const status = state.stale && held === 'ok' ? 'stale' : held;
      // WS-EXT-PANEL-UX B-2 — the one empty that is an invitation rather than a
      // report. `.dot.run` is drawn filled, in the panel's interactive blue, and
      // by construction at most ONE row in the rail can ever wear it: `probe` is
      // a single row and this is its only status. It is not a sixth state in the
      // vocabulary — it is `none` on the row where `none` would be misread.
      const dotClass = needs === 'probe' && status === 'none' ? 'run' : status;
      const dot = el('span', `dot ${dotClass}`);
      dot.title = dotLabel(status, needs);
      // 🔴 Order is the reading order: what it is, its name, then how it is
      // doing. The dot moves to the far end rather than being dropped — it is
      // the only carrier of state in the rail and ⑤ adds to it, never replaces.
      const btn = el(
        'button',
        null,
        icon(id),
        el('span', 'rlabel', label),
        dot,
        el('span', 'sr', dotLabel(status, needs))
      );
      btn.type = 'button';
      if (id === state.screen) btn.setAttribute('aria-current', 'page');
      btn.addEventListener('click', () => {
        state.screen = id;
        render();
        $('content').focus();
      });
      group.append(btn);
    }
    rail.append(group);
  }
}

function render() {
  renderRail();
  const content = $('content');
  content.replaceChildren();
  if (!state.host) {
    // 🔴 We deliberately do NOT hold the "tabs" permission — it would put "Read
    // your browsing history" on the install dialog for something the panel does
    // not need. What we have instead is activeTab, which is granted when the
    // user clicks the toolbar icon and is revoked again as soon as they
    // navigate. So an unreadable URL is almost never "this isn't a site"; it is
    // "we are not allowed to look right now", and it says so.
    content.append(
      el('h1', 'title', 'Point it at a page'),
      el(
        'div',
        'card dashed',
        el('div', 'label', 'Waiting for a page'),
        el(
          'p',
          'prose',
          'Click the TriRank icon while you are on the site you want to read. The panel stays open as you browse, but it only gets to see the page you hand it — it has no permission to watch your browsing.'
        )
      )
    );
    return;
  }
  if (state.stale) content.append(staleBanner());
  const screen = SCREENS[state.screen];
  content.append(screen ? screen() : notBuiltScreen());
  // 🔴 Here for the same reason annotateClipped is here: every screen and every
  // one of its four states goes through this line, so no branch can be the one
  // that forgot. See toolLinks.
  const tools = toolLinks(state.screen);
  if (tools) content.append(tools);
  // 🔴 After append, not inside the renderers: whether a value was cut is a
  // fact about layout, and layout does not exist until the node is in the
  // document. Every screen goes through here, so no screen can forget it.
  annotateClipped(document.body);
}

// The same question has a different answer at every panel width, and the width
// is dragged live. One observer, re-asking it — not a listener per screen.
new ResizeObserver(() => annotateClipped(document.body)).observe(
  document.documentElement
);

/**
 * 🔴 PM's red line, literally: either the panel updates itself, or the reader
 * can see this is the previous page. We cannot update — activeTab is revoked by
 * the navigation and the new page's URL is not even visible to us — so this
 * says which page the numbers belong to, by name, above everything else on the
 * screen. It names the host rather than saying "a previous page": the reader
 * has to be able to check the claim.
 */
function staleBanner() {
  return el(
    'div',
    'stale-banner',
    el('span', 'dot stale'),
    el(
      'div',
      null,
      el('b', null, `Showing ${state.host} — you have since navigated.`),
      ' ',
      el(
        'span',
        null,
        'Chrome withdraws our access to a tab the moment it navigates, so we cannot read the new page and cannot even see its address. Click the TriRank icon to read the page you are on now.'
      )
    )
  );
}

function notBuiltScreen() {
  const box = document.createDocumentFragment();
  box.append(
    el('h1', 'title', TITLES[state.screen] ?? 'Dimension'),
    notBuilt('this dimension, read from the page you are on')
  );
  return box;
}

// --- boot ------------------------------------------------------------------

const asUrl = (raw) => {
  try {
    const u = new URL(raw ?? '');
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
};

/**
 * Two ways in, because activeTab is a moment, not a subscription:
 *   1. `tabs.query` — returns a url ONLY while activeTab is live for that tab
 *      (calling the API needs no permission; seeing the url does). This is the
 *      path right after the user clicks the icon.
 *   2. the handoff the popup wrote to session storage when it opened us — this
 *      is what survives the panel being closed and reopened, and what keeps the
 *      panel showing a real host after activeTab has lapsed.
 * If both come back empty we say so rather than guessing (see render()).
 */
const HANDOFF_KEY = 'panelTarget';

async function readTarget() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // 🔴 `windowId` rides on BOTH branches, and it is the one field here that
  // survives having no url. activeTab strips `url` and `title` from a Tab we
  // were not granted; it does not strip the window it is in. So the panel knows
  // which window it belongs to even on a chrome:// page it may not read — which
  // is the case where it has no target at all and still has to decide whether a
  // tab switch is one of ours.
  const live = asUrl(tab?.url);
  if (live) {
    return {
      url: live,
      tabId: tab?.id ?? null,
      windowId: tab?.windowId ?? null,
    };
  }
  // `null` is a real handoff: the icon was clicked on a page we may not read,
  // and it deliberately clears the target rather than leaving the last site's.
  const stored = (await chrome.storage.session.get(HANDOFF_KEY))[HANDOFF_KEY];
  return {
    url: asUrl(stored?.url),
    tabId: stored?.tabId ?? tab?.id ?? null,
    windowId: tab?.windowId ?? null,
  };
}

async function load(explicit, opts) {
  const { url, tabId, windowId } = explicit ?? (await readTarget());
  state.tabId = tabId;
  // The navigation path calls load({url, tabId}) with no windowId — a tab cannot
  // change window by navigating, so the one we already hold is still right.
  // Overwriting it with undefined there would disarm the close on every
  // in-tab navigation, which is the half of this that has no visible symptom.
  if (windowId !== undefined) state.windowId = windowId;
  state.stale = false;
  state.url = url ? url.href : null;
  // 'running' rather than 'idle' when a scan is queued behind a navigation: the
  // page screens then say they are reading, instead of offering a button for a
  // read that is already on its way.
  state.scan = {
    state: opts?.deferScan ? 'running' : 'idle',
    data: null,
    error: null,
    query: '',
  };
  state.probe = { payload: null, error: null, awaitingGrant: false };
  state.host = url ? url.hostname : null;
  $('host').textContent = state.host ?? '—';
  state.signals = null;
  state.signalsError = null;
  // 🔴 Set BEFORE the first render, not before the fetch: this render is the one
  // that used to put "there is no stored audit for this domain" on screen while
  // the request that answers it had not even been sent. With no host there is no
  // lookup to wait for, and 'idle' says that rather than waiting forever.
  state.signalsState = url ? 'loading' : 'idle';
  state.cacheState = url ? 'loading' : 'idle';
  render();
  if (!state.host) return;

  // 🔴 The page read starts NOW and is not awaited. It is what "open it and the
  // content is there" means, and it is also the one read with a deadline on it:
  // activeTab dies at the next navigation, while the cached lookups below are
  // just network calls that can finish whenever. Firing it first also means the
  // page screens fill while AI visibility is still loading, instead of after.
  //
  // The one caller that skips it is a navigation we followed: there the new
  // document does not exist yet, and injecting into it would read the outgoing
  // page. That read waits for 'complete' (see the onUpdated handler).
  if (state.tabId !== null && !opts?.deferScan) void runScan();

  const res = await chrome.runtime.sendMessage({
    type: 'getSignals',
    host: state.host,
  });
  state.signals = res?.data ?? null;
  state.signalsError = res?.error ?? null;
  state.signalsState = state.signals ? 'ok' : 'error';
  render();

  const cacheRes = await chrome.runtime.sendMessage({
    type: 'getSiteCache',
    host: state.host,
  });
  state.cache = cacheRes?.data ?? null;
  state.cacheError = cacheRes?.error ?? null;
  state.cacheState = state.cache ? 'ok' : 'error';
  render();

  // A probe that already ran for this URL is still on record in the worker for
  // ten minutes; showing it beats making the user re-run a test they just ran.
  if (state.url) {
    const prior = await chrome.runtime.sendMessage({
      type: 'peekProbe',
      url: state.url,
    });
    if (prior) {
      state.probe.payload = prior;
      render();
    }
  }
}

// A fresh icon click pushes a new handoff and the panel follows it.
chrome.storage.session.onChanged.addListener((changes) => {
  if (changes[HANDOFF_KEY]) load();
});

/**
 * WS-EXT-PARITY batch 1 — following the tab as it navigates, on the only signal
 * we are allowed to have.
 *
 * 🔴 Measured, Chrome 147, this extension's exact permission set:
 *   - `tabs.onUpdated` FIRES without the "tabs" permission. We deliberately do
 *     not hold it (it would put "Read your browsing history" on the install
 *     dialog), and we still get told that a tab changed.
 *   - what it hands us is filtered to `{status}`. No url, no title. So we learn
 *     THAT the page changed and never WHERE to — which is exactly as much as an
 *     extension without host access should know.
 *   - on an origin the user HAS granted (the crawler test asks for one), the
 *     same event arrives carrying `url` and `title`, and scripting keeps
 *     working across the navigation.
 *
 * Hence the fork below, and it is the honest one: with a grant we genuinely
 * re-read the new page; without one we cannot, and we say so rather than
 * leaving the last page's numbers looking current.
 */
// Set between "we followed a navigation" and "the new document is there". While
// it is true the panel is showing the new URL with no reading under it yet, and
// `runScan` is deliberately not running: injecting during 'loading' reads the
// OUTGOING document, which would put the last page's outline under this page's
// name — the precise dishonesty this batch exists to remove.
let awaitingLoad = false;

// pushState navigations emit a `url` change and never a 'complete', so the scan
// they queue would wait forever. This is the only reason for a timer here.
const SAME_DOCUMENT_GRACE_MS = 1500;

function scanWhenLoaded() {
  if (!awaitingLoad) return;
  awaitingLoad = false;
  void runScan();
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId !== state.tabId || !state.host) return;

  // A granted origin tells us where we went (measured: `url` rides along with
  // the first 'loading' event). Re-point everything now, read when the document
  // has actually arrived.
  const next = asUrl(changeInfo.url);
  if (next) {
    awaitingLoad = true;
    load({ url: next, tabId }, { deferScan: true });
    setTimeout(scanWhenLoaded, SAME_DOCUMENT_GRACE_MS);
    return;
  }

  if (changeInfo.status === 'complete') {
    scanWhenLoaded();
    return;
  }

  // Everything else: 'loading' with no url, i.e. the tab moved and we are not
  // allowed to know where. Nothing on screen describes the current page any
  // more, and there is no way for us to make it.
  if (changeInfo.status !== 'loading' || awaitingLoad || state.stale) return;
  state.stale = true;
  render();
});

/**
 * WS-EXT-BEHAVIOR — the panel closes when the user goes to a different tab.
 *
 * 🔴 THIS IS A TAB-SWITCH RULE, NOT A "THE HOST CHANGED" RULE, AND NOT BY
 * CHOICE. The obvious rule — close when the site changes, stay put for a page
 * turn inside one site — needs the new address, and on the majority path we do
 * not have it. Without a host grant `tabs.onUpdated` hands this extension
 * `{status}` and nothing else (the block above records that measurement), and
 * `tabs.onActivated` carries `{tabId, windowId}` by definition. Reading either
 * tab's url means holding the "tabs" permission, which puts "Read your browsing
 * history" on the install dialog — a product decision, not a code one.
 *
 * So the two cases are split by what we can actually observe:
 *   - ANOTHER TAB — observable, and the panel is now describing a tab the user
 *     is not looking at. It closes.
 *   - THE SAME TAB NAVIGATING — not observable as same-site or cross-site. The
 *     existing behaviour stands: re-point if a grant told us where we went,
 *     otherwise raise the stale banner. Closing here would take the page turn
 *     inside one site with it, and would also throw away a reading the user can
 *     still legitimately want.
 *
 * 🔴 `window.close()` is the whole mechanism. There is no `sidePanel.close()`
 * in the API — the standing request is w3c/webextensions issue 521 — and
 * `setOptions({enabled: false})` is not a substitute: it takes the entry out of
 * the side-panel list rather than closing a document.
 *
 * 🔴 NOTHING IS CLEARED. No storage write, no cache eviction, no handoff reset.
 * The next icon click re-opens onto the session storage that is still there,
 * which is what makes reopening cheap. Closing is a window operation and that
 * is all it is here.
 */
/**
 * WS-EXT-THEME — the panel's light/dark control.
 *
 * Three states, and the third is not an item in the menu:
 *   'light' / 'dark' — the user picked a side, and the OS is ignored from then
 *                      on. That is the app's policy rather than a new one: the
 *                      site runs next-themes with enableSystem={false} and its
 *                      switcher deliberately offers no "System" item.
 *   not set          — nobody has picked yet, so the two
 *                      `@media (prefers-color-scheme: dark)` blocks in
 *                      tokens.css serve the panel exactly as they did before
 *                      this control existed. It is a starting point, not a
 *                      third choice, and there is no way back to it from the
 *                      UI — same as the app.
 *
 * 🔴 WHY THE PALETTE IS READ OUT OF THE STYLESHEET INSTEAD OF DECLARED AGAIN.
 * The dark values exist in exactly one place: those two @media blocks. While
 * the OS is light the blocks are not in the cascade at all, so no selector, at
 * any specificity, can reach the values inside them — forcing dark against a
 * light OS needs those values to exist somewhere OUTSIDE the block. The two
 * ways to arrange that in CSS are to copy them or to rewrite the blocks, and
 * copying loses the drift check: extension/README.md cuts tokens.css at the
 * first `@media`, so a [data-theme='dark'] block after it is compared against
 * nothing and 28 app-owned colours would sit in this repo with no way left to
 * notice the app had moved them. So the blocks stay the single source of truth
 * and are READ, through CSSOM, which hands over the rules of a media query
 * whether or not it currently matches.
 *
 * 🔴 Nothing here writes to those blocks, and nothing here puts anything into
 * the cascade until the user has picked a side.
 */
const THEME_KEY = 'theme';

/**
 * Both palettes, straight out of the stylesheet.
 *
 * The light half is not redundant: "switch to light" while the OS is dark
 * cannot be the mere ABSENCE of an override, because the media block is still
 * in force there — the values it overrides have to be put back, and they are
 * put back from here, which is still tokens.css and still not a second copy.
 */
function themePalettes() {
  const dark = new Map();
  const light = new Map();
  const collect = (rule, into) => {
    if (!rule.style) return;
    for (const prop of rule.style) {
      if (prop.startsWith('--')) {
        into.set(prop, rule.style.getPropertyValue(prop).trim());
      }
    }
  };
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      // Only same-origin sheets are readable. Every sheet this document loads
      // is one of ours, so this is defensive rather than expected.
      continue;
    }
    for (const rule of rules) {
      if (rule.media) {
        if (!/prefers-color-scheme:\s*dark/.test(rule.media.mediaText))
          continue;
        for (const inner of rule.cssRules) collect(inner, dark);
        continue;
      }
      collect(rule, light);
    }
  }
  return { dark, light };
}

/** What the OS is asking for. Consulted only while no side has been picked. */
function osTheme() {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 🔴 Validated on the way OUT of storage, not trusted. The app shipped exactly
 * this bug: a stored 'system' left behind by a removed menu item kept being
 * applied as a literal class that matched no rule, and every load rendered a
 * white site with dark scrollbars until a migration script rewrote the value
 * (WS-THEME-SYSTEM-FIX). Anything that is not one of the two real modes is read
 * as "not set" here, which is the state that still works.
 */
function asTheme(value) {
  return value === 'light' || value === 'dark' ? value : null;
}

/**
 * 🔴 A scan that finds nothing is REPORTED, never swallowed. Falling back to
 * the OS silently is indistinguishable, on screen, from the control working for
 * a user whose OS already agrees with their choice — so the one person who
 * could act on it is the one person who would never be told. The message names
 * the measurement ("read 0 declarations") rather than the symptom, because
 * "theme switching failed" sends the next reader to the button.
 */
function applyTheme(theme) {
  const root = document.documentElement;
  for (const prop of Array.from(root.style)) {
    if (prop.startsWith('--')) root.style.removeProperty(prop);
  }

  const { dark, light } = theme
    ? themePalettes()
    : { dark: new Map(), light: new Map() };

  // 🔴 The fallback drops `data-theme` as well, and that is the whole point of
  // doing it here rather than after the attribute is set. `data-theme` alone
  // still switches `color-scheme` in tokens.css, so a scan that failed while
  // the attribute stayed on would leave the UA drawing dark scrollbars around a
  // light panel — which is precisely the state WS-THEME-SYSTEM-FIX had to clean
  // up on the app side. Falling back means falling back to unset, not to half.
  let effective = theme;
  if (theme && dark.size === 0) {
    console.error(
      'TriRank side panel: the theme override is NOT in effect. The CSSOM scan ' +
        'of tokens.css read 0 declarations from @media (prefers-color-scheme: ' +
        'dark), so there is no palette to apply — the panel has fallen back to ' +
        `following the OS instead of the stored '${theme}' preference.`
    );
    effective = null;
  }

  if (effective) root.dataset.theme = effective;
  else delete root.dataset.theme;

  // Only the properties the dark block overrides are ever set: for 'dark' the
  // override itself, for 'light' the light value put back over a media block
  // still in force. Anything the dark block does not touch is already right in
  // :root and is left alone — --sp-action-fg is the one that matters, a
  // deliberate light-only white that must not be flipped (see tokens.css).
  if (effective) {
    for (const prop of dark.keys()) {
      const value = effective === 'dark' ? dark.get(prop) : light.get(prop);
      if (value !== undefined) root.style.setProperty(prop, value);
    }
  }
  // What is actually on screen, which is not always what was asked for. Callers
  // paint the button from this so the label cannot claim a theme that failed.
  return effective;
}

let modeBtn = null;

/**
 * 🔴 THE GLYPH IS THE CURRENT STATE, NOT THE DESTINATION — and that is a
 * reversal of what the word did here before WS-EXT-1.3.0 B, so it is worth
 * saying why rather than just doing it.
 *
 * The word could be a destination and be read correctly: "DARK" in a button is
 * a thing to go to, and English carries that on its own. A bare glyph carries
 * nothing on its own — the sun/moon pair is used both ways in the wild, and the
 * conflict is documented rather than folklore (Improta, "Dark/Light Mode
 * Toggle: a Usability Issue", 2020-11-26, francescoimprota.com: the icons "do
 * not represent the interface current state", which he argues against on
 * Nielsen's visibility-of-system-status heuristic; Verou, "Dark mode toggles:
 * two states are enough", lea.verou.me, 2026, finds ONE product — Docusaurus —
 * still cycling a single icon, everyone else having moved to showing the states
 * side by side). Nobody wins that argument in the abstract, so the tie is
 * broken in the one place that is not abstract:
 *
 * 🔴 OUR OWN APP ALREADY ANSWERED IT. src/components/layout/mode-switcher.tsx
 * shows SunIcon while light and MoonIcon while dark (`dark:scale-0` on the sun,
 * `dark:scale-100` on the moon) — current state, not destination. Two products
 * of ours using one pair of glyphs to mean opposite things is worse than either
 * convention, and this panel is the one with the smaller audience and the
 * cheaper change. The panel follows the app here exactly as it does for the
 * palette and for having no "System" item.
 *
 * ⚠️ Nothing enforces that. If the app's switcher flips to destination glyphs,
 * this file will not notice and no gate will — the pair is hand-matched, and
 * the sentence above is the whole mechanism.
 *
 * 🔴 The aria-label is UNCHANGED and that is not an oversight. It already named
 * both halves — "Theme is light. Switch to dark." — which was more than the
 * word beside it carried and is exactly as true of the glyph: the first clause
 * is what the icon now shows, the second is what a press does. A label that
 * named only the destination would now contradict the icon; this one cannot.
 * `dataset.target` still drives the click, so what the button DOES is
 * untouched — only which of the two states is drawn.
 */
function paintModeButton(theme) {
  if (!modeBtn) return;
  const shown = theme ?? osTheme();
  const target = shown === 'dark' ? 'light' : 'dark';
  modeBtn.replaceChildren(icon(shown === 'dark' ? 'moon' : 'sun'));
  modeBtn.dataset.target = target;
  modeBtn.setAttribute('aria-label', `Theme is ${shown}. Switch to ${target}.`);
}

async function initTheme() {
  const stored = asTheme(
    (await chrome.storage.local.get(THEME_KEY))[THEME_KEY]
  );
  const effective = applyTheme(stored);

  modeBtn = el('button', 'mode');
  modeBtn.type = 'button';
  modeBtn.addEventListener('click', () => {
    const next = modeBtn.dataset.target === 'dark' ? 'dark' : 'light';
    paintModeButton(applyTheme(next));
    // Not awaited: the panel is already showing the new theme, and a storage
    // write that loses a race with the window closing costs the preference,
    // not the frame the user is looking at.
    void chrome.storage.local.set({ [THEME_KEY]: next });
  });
  paintModeButton(effective);
  document.querySelector('.head').append(modeBtn);

  // While nobody has picked, the OS is what is on screen, so the label has to
  // follow it if it changes under an open panel. Once a side is picked the OS
  // is not consulted again and this listener has nothing left to say.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!document.documentElement.dataset.theme) paintModeButton(null);
  });
}

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  // A second browser window has its own panel document running this same file.
  // onActivated is global, so without this the user working over there closes
  // the panel over here. A null windowId means the startup query never landed;
  // doing nothing is the safe side of that.
  if (state.windowId === null || windowId !== state.windowId) return;
  if (tabId === state.tabId) return;
  window.close();
});

// Both are async and both start here. The theme is a storage read the panel
// cannot do synchronously (chrome.storage has no sync form, and an extension
// page's CSP forbids the inline no-flash script the app uses), so a stored
// preference that DISAGREES with the OS shows the OS for the frames before it
// resolves. Agreeing preferences, and the unset state, never flash at all.
void initTheme();
load();
