/**
 * WS-CHROME-EXT — service worker: the only place that talks to the network.
 *
 * Two jobs, deliberately kept apart:
 *   getSignals   → reads TriRank's cache-only /api/signals/<domain> (zero spend,
 *                  never triggers a probe on our side).
 *   probeCrawlers→ sends ONE request per doc-verified crawler User-Agent to the
 *                  page the user is on, straight from the user's browser. It
 *                  never touches our servers and costs nothing.
 *
 * 🔴 The UA override only works from here. `fetch(url, {headers:{'user-agent':…}})`
 * is silently dropped by the browser — User-Agent is a forbidden header name.
 * The supported path is declarativeNetRequest's modifyHeaders, which Chrome
 * documents as applying to "calls to fetch() made in a service worker".
 *
 * 🔴 The rule is scoped with tabIds:[TAB_ID_NONE] (session rules only), i.e. it
 * matches requests that do NOT come from a tab — our own fetches. Without that,
 * a rule keyed on the domain would rewrite the User-Agent of the user's real
 * browsing while a probe is in flight.
 */

import { CRAWLERS, SERVER_AUDIT_TOKENS } from './crawlers.js';
import { blanketBlocked, parseRobots, resolve } from './robots.js';

// Where the cache-only signals API lives. Hardcoded to production: a shipped
// extension has no other backend, and an overridable base is a dev-only branch
// that has no business in a Web Store build.
const API_BASE = 'https://trirankai.com';

// One session rule id, reused: probes run strictly sequentially so only one
// User-Agent override is ever installed at a time.
const RULE_ID = 1;
const TAB_ID_NONE = chrome.tabs?.TAB_ID_NONE ?? -1;

// Politeness + PM's frequency self-limit.
const PROBE_GAP_MS = 300; // between crawlers, so we never burst a site
const PROBE_TTL_MS = 10 * 60 * 1000; // same URL is not re-probed within 10 min
const PROBE_TIMEOUT_MS = 10000;

/**
 * WS-EXT-UNKNOWN-URL — the impossible path, and its 10-minute skip.
 *
 * 🔴 THE TTL IS `PROBE_TTL_MS` ITSELF, NOT A SECOND 600000. Both numbers answer
 * the same question — how often may we send a request the reader's site did not
 * ask for — and a copy of the value would be free to drift from the one the
 * crawler probe honours, with nothing comparing them. One name, one narrowing
 * path. If the politeness budget ever needs to differ per probe, that is a
 * decision to make out loud with a second named constant, not by editing a
 * literal that used to agree.
 *
 * 🔴 THE PATH IS RANDOM PER PROBE AND THAT IS LOAD-BEARING. A fixed path would
 * be cached — by the site's own edge, by a CDN, by anything in front of it —
 * and the second reader on that origin would be told how the cache answers,
 * not how the server does. Four random bytes is eight hex digits, appended to a
 * prefix that names us so the owner can find the request in their access log
 * and see who made it.
 */
const UNKNOWN_URL_PREFIX = '/__trirank-unknown-url-probe-';

function unknownUrlPath() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return (
    UNKNOWN_URL_PREFIX +
    Array.from(bytes, (n) => n.toString(16).padStart(2, '0')).join('')
  );
}

/** Session-scoped, one entry per origin. Same store and lifetime as `probe::`. */
const unknownUrlKey = (origin) => `unknownurl::${origin}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- signals (our cache-only API) -----------------------------------------

/**
 * WS-EXT-CACHE-BYPASS — why both of our own API readers pass `cache: 'no-store'`.
 *
 * 🔴 THE PANEL WAS SHOWING A NUMBER THE SERVER HAD ALREADY REPLACED. Measured
 * 2026-08-10: a free audit wrote eonebill.ai's July estimate at 16:44:14Z, and
 * `curl` against BOTH /api/site-cache/www.eonebill.ai and .../eonebill.ai
 * returned snapshotMonth 2026-07 / monthlyVisits 8069 immediately afterwards —
 * while the panel kept printing 6,822 and an Apr-Jun trend, and kept printing it
 * after the panel was closed and reopened. Nothing on the server was stale: the
 * reader behind that endpoint (readLatestOverviewRow, src/lib/site-report-data.ts)
 * applies no cutoff at all and there is no `www.`-prefixed key in D1 to read the
 * wrong row from. The stale copy was in the HTTP cache on this side.
 *
 * Both endpoints answer `cache-control: public, max-age=3600,
 * stale-while-revalidate=86400` AND carry no ETag or Last-Modified, which is the
 * combination that makes it stick: without a validator a cached copy is not
 * re-checked before max-age lapses, and for 86400s after that the stale body is
 * served IMMEDIATELY while a refresh happens behind it — so the first reopen
 * past the hour still shows the old figure and only the next one does not.
 * Reopening the panel never helped because the HTTP cache does not live in the
 * panel.
 *
 * 🔴 FIXED HERE RATHER THAN ON THE ENDPOINT (PM ruling), and the asymmetry is
 * the reason: the panel asks a handful of times per session, so bypassing a
 * cache costs a few round trips, while lowering `max-age` on the routes would
 * change edge-cache behaviour for /api/signals and every other consumer of them
 * at once. The small cost sits with the party that needs the freshness.
 *
 * 🔴 This is NOT a new convention in this file — it restores the one already
 * here. Of the five fetch call sites, the three that measure something live
 * (readSameOrigin, probeOne, fetchRobots) have always passed `cache: 'no-store'`.
 * These two were the outliers.
 *
 * ⚠️ It changes nothing about SPEND. Both endpoints are cache-only readers by
 * construction — a miss is a state, never a probe — so skipping the HTTP cache
 * makes them run their D1 SELECTs again and cannot make them fetch a vendor.
 */
async function getSignals(host) {
  const url = `${API_BASE}/api/signals/${encodeURIComponent(host)}`;
  const res = await fetch(url, {
    credentials: 'omit',
    cache: 'no-store',
  });
  if (res.status === 429) return { error: 'rate_limited' };
  if (!res.ok) return { error: `http_${res.status}` };
  return { data: await res.json() };
}

/**
 * WS-EXT-PANEL batch 7 — the other cache-only reader, for the two dimensions
 * that have no page-side source: Whois (RDAP) and Backlinks (DataForSEO).
 * Same contract as getSignals: a pure read, a miss is a state and never a
 * probe, and this worker never learns how to fill the cache.
 *
 * `cache: 'no-store'` for the reason written above getSignals — this is the
 * endpoint whose stale copy was actually observed, and the two share one cache
 * posture, so they get one answer.
 */
async function getSiteCache(host) {
  const url = `${API_BASE}/api/site-cache/${encodeURIComponent(host)}`;
  const res = await fetch(url, { credentials: 'omit', cache: 'no-store' });
  if (res.status === 429) return { error: 'rate_limited' };
  if (!res.ok) return { error: `http_${res.status}` };
  return { data: await res.json() };
}

// --- page scan (WS-EXT-PANEL batch 2) --------------------------------------

/**
 * Runs in the PAGE, not here. Everything it needs must be inside it — this
 * function is serialised and injected, it closes over nothing.
 *
 * 🔴 The shape it returns is the server's `analysis.headings` shape
 * (src/diagnose/schema.ts: counts / order / skips), computed by the same rule
 * (a jump DOWN more than one level is a skip), so the same metric cannot look
 * like two different things depending on which path measured it. `items` is
 * the one client-only addition and is named as such: the server never had the
 * heading TEXT, only the levels.
 *
 * The single deliberate difference from the server is the whole point of doing
 * this here: the server parses the HTML as delivered, this reads the DOM after
 * the page's JavaScript has run. On a client-rendered site the server sees an
 * empty shell and this sees the real outline.
 */
/**
 * WS-EXT-UNKNOWN-URL — `unknownPath` is the one argument this function takes,
 * and it is a path, not a switch: the service worker mints it (so the randomness
 * and the 10-minute skip live next to each other) and passes `null` when a fresh
 * reading for this origin is already held. A request that must not be sent is
 * expressed by having nothing to send it to.
 */
async function collectOutline(unknownPath) {
  // ---- shared caps, same numbers the server truncates at -------------------
  const MAX_IMG_ITEMS = 100;
  const MAX_LINK_ITEMS = 150;
  const ANCHOR_MAX_CHARS = 120;

  // 🔴 SAME NUMBER AS THE SERVER, AND THE REASON IS NOT TIDINESS. This is the
  // deadline on the root-file reads, and its twin is FETCH_TIMEOUT_MS in
  // src/diagnose/fetch.ts — the audit's deadline on the very same files. The
  // two are a matched pair because a mismatch INVENTS a difference: the stored
  // check gives up at five seconds, so if this side waited ten, a site that
  // answers in seven would read `fail` stored and `present` live, and the panel
  // would show that as the page having changed. Nothing about the site would
  // have. A paired check must not manufacture its own disagreement.
  //
  // ⚠️ NOTHING ENFORCES THE PAIR. The two constants sit in different halves of
  // the repo, no gate compares them, and changing one is silent — this comment
  // is the whole mechanism, and a comment does not fail. If you change either,
  // change both in the same commit.
  //
  // 🔴 IF YOU CHANGE WHAT THIS DOES, GREP THIS CONSTANT'S NAME FIRST. Prose
  // elsewhere describes the timeout behaviour, and prose does not move when the
  // behaviour does: the commit that introduced this constant left a comment
  // three hundred lines below still saying these reads "carry no timeout" and
  // were "unbounded", and pointing at the ticket that had just closed. Same
  // author, same file, one ticket apart. Any sentence claiming there is no
  // deadline here is stale by construction — this name is how you find them.
  const SAME_ORIGIN_TIMEOUT_MS = 5000;

  // ---- structured data ----------------------------------------------------
  // Mirrors collectJsonLdTypes: @type (string or array), recursing ONLY through
  // @graph. Deeper nesting is deliberately not followed — matching the server
  // matters more here than being more thorough than it.
  const pushTypes = (node, out) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) pushTypes(item, out);
      return;
    }
    const t = node['@type'];
    if (typeof t === 'string') out.push(t);
    else if (Array.isArray(t))
      for (const v of t) if (typeof v === 'string') out.push(v);
    if ('@graph' in node) pushTypes(node['@graph'], out);
  };
  // WS-EXT-PARITY batch 4 — the SAME parse, kept instead of thrown away.
  //
  // 🔴 A second walk over the already-parsed blocks, deliberately NOT a second
  // parse and deliberately NOT a change to `schema` above: that block mirrors
  // the server's collectJsonLdTypes literally and must keep doing so. Four
  // client-side checks (brand name, sameAs, author/date, freshness) all need
  // fields from these nodes, so they are collected once, here, rather than four
  // times in four places.
  //
  // 🔴 REVISED, WS-EXT-CONTENT ③. Both halves of the original note, kept:
  //
  //   THEN — "only the fields those checks read are kept. Shipping whole
  //   JSON-LD blocks back would put arbitrary page content — including whatever
  //   a site chooses to embed — into our message channel for no reason." The
  //   reason it gave was that nothing on our side READ the rest.
  //
  //   NOW — the panel has a screen for the blocks themselves, so there is a
  //   reason. What has not changed is the concern: a page's JSON-LD is written
  //   by the page, can be arbitrarily large and deep, and none of it is ours.
  //   So the block is not shipped whole either. `shapeLd` below copies it under
  //   four hard limits and COUNTS what each limit dropped, because the panel has
  //   to be able to say so — a tree that quietly stops looks like a small
  //   complete tree, which is "we could not read this" wearing "this is all
  //   there is".
  //
  // The six-field walk below is unchanged and still feeds the four client
  // checks; the shaped copy is a second, separate thing built in the same pass.
  const MAX_LD_NODES = 60;
  // WS-EXT-HONEST-SURFACE B2 — 🔴 NAMED AND SHIPPED, NOT LEFT AS AN INLINE 5.
  // The panel has to print this number in the sentence that discloses the cap,
  // and the two ways to get it there are a second literal in sidepanel.js or
  // this. `checkSameAs` already shows what the first one costs: it prints
  // "past the 20 we keep per node" from a hardcoded 20 in the other file, with
  // nothing linking the two — change the slice here and that sentence starts
  // lying, silently, in a file the change never touched. `ldNodeCap` directly
  // below is the precedent that got it right; this follows that one.
  const MAX_AUTHORS = 5;
  // WS-EXT-170 ① — 🔴 THE CASE THAT COMMENT NAMES, NOW CLOSED. B2 above cited
  // `checkSameAs` printing "past the 20 we keep per node" from its own literal
  // as the standing example of the mistake it was avoiding, and then left the
  // example in place. It stayed wrong for the exact reason it was quotable: a
  // hardcoded number wearing a template literal's clothes reads as though it
  // came from the data, so nobody looks at it twice.
  const MAX_SAMEAS = 20;
  const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
  const ldNodes = [];
  // WS-EXT-CLOSEOUT ③ — 🔴 HOW MANY NODES THE CAP REFUSED, COUNTED, because the
  // four checks that read `ldNodes` all make ABSENCE claims and one of them
  // issues a `fail`.
  //
  // `checkSameAs` says "This page carries no Organization, Person or WebSite
  // node" and grades it fail; `checkBrand` says the page declares no name. Both
  // sentences are about the page, and both can be produced by this walk having
  // stopped at sixty — a node at position 61 is invisible to them and to
  // everything downstream, with nothing anywhere recording that we stopped.
  //
  // 🔴 THE MODEL IS `ldCut` TWENTY LINES BELOW, WHICH ALREADY DOES THIS. The
  // shaped-tree copy counts every value its four limits dropped and the panel
  // prints each one. The same file knew to count what a cap discarded; this
  // one array was the exception.
  //
  // ⚠️ NOT REACHED IN PRODUCTION TODAY — measured over four sites
  // (en.wikipedia.org/wiki/SEO 1, stripe.com 3, bbc.com 1, theverge.com 2) —
  // which is where MAX_SITEMAPS_READ's note sits too: that is where the
  // distribution happens to be, not a property of JSON-LD.
  let ldNodesDropped = 0;
  const walkNodes = (node) => {
    if (!node || typeof node !== 'object') return;
    if (ldNodes.length >= MAX_LD_NODES) {
      // Count the refusal rather than returning silently. Arrays recurse below,
      // so counting here counts nodes we would have kept, not container hops.
      if (!Array.isArray(node)) ldNodesDropped += 1;
      return;
    }
    if (Array.isArray(node)) {
      for (const n of node) walkNodes(n);
      return;
    }
    // author is "Name" or {name:"Name"} in the wild; both are the same claim.
    const nameOf = (v) =>
      typeof v === 'string'
        ? v
        : v && typeof v === 'object' && typeof v.name === 'string'
          ? v.name
          : null;
    ldNodes.push({
      types: arr(node['@type'])
        .filter((t) => typeof t === 'string')
        .map((t) => t.toLowerCase()),
      name: typeof node.name === 'string' ? node.name.slice(0, 200) : null,
      // ④ — the cap stays at 20; whether it bit is recorded beside it, because
      // `checkSameAs` prints "N sameAs links" and N was silently the smaller of
      // the real count and 20.
      sameAs: arr(node.sameAs)
        .filter((s) => typeof s === 'string')
        .slice(0, MAX_SAMEAS),
      sameAsDropped: Math.max(
        0,
        arr(node.sameAs).filter((s) => typeof s === 'string').length -
          MAX_SAMEAS
      ),
      // WS-EXT-HONEST-SURFACE B2 — 🔴 THE ONE CAP IN THIS WALK WITH NO COUNTER
      // BESIDE IT. `sameAs` six lines above records what its limit dropped and
      // `ldNodes` records what ITS limit dropped; this slice was the exception,
      // and `checkAuthorDate` then slices again to three for display. Two caps,
      // neither said, on a row that names people.
      //
      // ⚠️ It is the milder of the two failure shapes and that is exactly why it
      // survived: this row prints NAMES, not a count, so no number on screen was
      // ever wrong. What was wrong is quieter — a page declaring six authors and
      // a page declaring three both render as three names with nothing to
      // distinguish them, and "who this page is by" is a question a reader
      // resolves off this row alone.
      authors: arr(node.author)
        .map(nameOf)
        .filter(Boolean)
        .map((a) => a.slice(0, 120))
        .slice(0, MAX_AUTHORS),
      // Same shape as `sameAsDropped`: recomputed from the source rather than
      // derived from the sliced array, because a length taken after the slice
      // answers a question about the slice.
      authorsDropped: Math.max(
        0,
        arr(node.author).map(nameOf).filter(Boolean).length - MAX_AUTHORS
      ),
      datePublished:
        typeof node.datePublished === 'string' ? node.datePublished : null,
      dateModified:
        typeof node.dateModified === 'string' ? node.dateModified : null,
    });
    if ('@graph' in node) walkNodes(node['@graph']);
  };

  // WS-EXT-CONTENT ③ — the shaped copy and its budget. Every limit here is a
  // number the panel prints, so none of them may be applied silently.
  const LD_MAX_DEPTH = 6;
  const LD_MAX_FIELDS = 300;
  const LD_MAX_VALUE = 160;
  const LD_MAX_ARRAY = 20;
  const ldCut = { depth: 0, fields: 0, items: 0, values: 0 };
  let ldFields = 0;
  // Returns undefined for a branch the depth limit refuses; the caller drops
  // the key entirely rather than emitting an empty object, which would read as
  // "this node has nothing in it".
  const shapeLd = (value, depth) => {
    if (value === null) return null;
    const t = typeof value;
    if (t === 'string') {
      if (value.length <= LD_MAX_VALUE) return value;
      ldCut.values += 1;
      return `${value.slice(0, LD_MAX_VALUE)}…`;
    }
    if (t === 'number' || t === 'boolean') return value;
    if (t !== 'object') return undefined;
    if (depth >= LD_MAX_DEPTH) {
      ldCut.depth += 1;
      return undefined;
    }
    if (Array.isArray(value)) {
      if (value.length > LD_MAX_ARRAY)
        ldCut.items += value.length - LD_MAX_ARRAY;
      const out = [];
      for (const v of value.slice(0, LD_MAX_ARRAY)) {
        const s = shapeLd(v, depth + 1);
        if (s !== undefined) out.push(s);
      }
      return out;
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (ldFields >= LD_MAX_FIELDS) {
        ldCut.fields += 1;
        continue;
      }
      ldFields += 1;
      const s = shapeLd(v, depth + 1);
      if (s !== undefined) out[k] = s;
    }
    return out;
  };

  // WS-EXT-FAQ-CARRIERS — the FAQ read AROUND `shapeLd`, not out of its output.
  //
  // 🔴 WHY A SECOND READ OF THE SAME PARSED BLOCKS. `schema.trees` is not usable
  // for this question and the reasons are measured, not guessed:
  //   - LD_MAX_VALUE cuts every string to 160 characters and appends an
  //     ellipsis, so an answer — and a long question — arrives already
  //     truncated. Substring-matching a truncated question is fine; reporting
  //     the truncated text back as "the question you declared" is not.
  //   - LD_MAX_FIELDS is a PAGE-WIDE budget: `ldFields` and `ldCut` are declared
  //     once, above, and are never reset between blocks. A page whose first
  //     JSON-LD block spends the 300 fields loses the FAQ's `mainEntity` key
  //     ENTIRELY, and the same page with the two blocks in the other order keeps
  //     all of it. Measured both ways before this was written.
  //   - `treeLimits` cannot rescue that, because its four counters are totals
  //     over every array and every string on the page. "20 array items were not
  //     shown" is true whether they were FAQ answers or someone's breadcrumb.
  //     A number with no basis attached cannot answer a question about one tree.
  // So the questions are taken from `parsed` BEFORE `shapeLd` sees it. This walk
  // has its own budget, below, and its own counters — none of it is shared.
  //
  // 🔴 EVERY LIMIT HERE IS A NUMBER THE PANEL PRINTS. Same rule the shaped-copy
  // budget states about itself twenty lines above; this walk is held to it, and
  // `dropped` is what carries it. Both counts are recomputed FROM THE SOURCE,
  // never from the kept array — a length taken after a slice answers a question
  // about the slice (the `sameAsDropped` note above says this at length).
  const FAQ_MAX_ITEMS = 50;
  const FAQ_MAX_Q_CHARS = 240;
  const faqQuestions = [];
  const faqSeen = new Set();
  let faqPresent = false;
  let faqDeclared = 0;
  let faqDistinctSeen = 0;
  let faqQCharsCut = 0;

  // 🔴 NORMALISATION IS ONE FUNCTION, USED ON BOTH SIDES OF THE COMPARISON.
  // Two normalisers that agree today are two things to keep in step, and a
  // comparison whose halves normalise differently reports the difference
  // between the two normalisers as a difference about the page.
  const faqNorm = (value) =>
    (typeof value === 'string' ? value : '')
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
      .replace(/[\u2010-\u2015\u2212]/g, '-')
      .replace(/\uFF1F/g, '?')
      .toLowerCase()
      .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, '')
      .trim();

  // Descends `@graph` and arrays, exactly as `pushTypes` does — see the note on
  // `faq.present` beside the payload below for why this is a separate walk from
  // the one that produces `hasFaqPage` rather than a widening of it.
  const walkFaq = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const n of node) walkFaq(n);
      return;
    }
    const types = arr(node['@type'])
      .filter((t) => typeof t === 'string')
      .map((t) => t.toLowerCase());
    if (types.includes('faqpage')) {
      faqPresent = true;
      for (const q of arr(node.mainEntity)) {
        if (!q || typeof q !== 'object') continue;
        const name = typeof q.name === 'string' ? q.name.trim() : '';
        if (!name) continue;
        // Counted here, at the source, before dedupe and before either cap.
        faqDeclared += 1;
        const key = faqNorm(name);
        if (!key || faqSeen.has(key)) continue;
        faqSeen.add(key);
        faqDistinctSeen += 1;
        if (faqQuestions.length >= FAQ_MAX_ITEMS) continue;
        // ⚠️ Truncation does NOT make a question unmatchable and so does not
        // reach the panel's "couldn't compare" state: the comparison is a
        // substring test, and a prefix of a question that is on the page is
        // still a substring of that page. It is reported because the TEXT shown
        // back to the reader is short, not because the verdict is unsafe.
        if (name.length > FAQ_MAX_Q_CHARS) faqQCharsCut += 1;
        faqQuestions.push(name.slice(0, FAQ_MAX_Q_CHARS));
      }
    }
    if ('@graph' in node) walkFaq(node['@graph']);
  };

  // 🔴 THESE FOUR DECLARATIONS WERE DELETED BY `45ad6f7` AND THEIR USES WERE
  // NOT. That commit replaced the six-line block that declared `rawTypes`,
  // `blocks`, `malformed` and `ldTrees` with the FAQ walk above and re-declared
  // none of them, while `for (const b of blocks)`, `blocks.length`,
  // `malformed += 1`, `rawTypes` and `ldTrees` all stayed. This file is a
  // `"type": "module"` service worker, so it is strict mode, so reading an
  // undeclared binding is a ReferenceError — thrown here, before any reading in
  // this function completes, on EVERY page. That is the 1.8.0 defect: no
  // `needs:'page'` screen could ever have data, on any site.
  //
  // 🔴 NOTHING IN THIS REPOSITORY COULD HAVE CAUGHT IT, and that is the part
  // worth keeping. It is a RUNTIME error: `node --check` passes (it checks
  // syntax), the packer's four assertions pass (they check the archive), every
  // `check-*.ts` passes (none of them executes this file), and `biome check`
  // passes — `extension/` is linted, but `noUndeclaredVariables` is not on in
  // `biome.json`, so an undeclared read is not an error here. It was found by
  // extracting this function and running it against a stand-in DOM, which is
  // the only entrance that exists today and is not automated.
  const rawTypes = [];
  const blocks = document.querySelectorAll(
    'script[type="application/ld+json"]'
  );
  let malformed = 0;
  const ldTrees = [];

  for (const b of blocks) {
    try {
      const parsed = JSON.parse(b.textContent || '');
      pushTypes(parsed, rawTypes);
      walkNodes(parsed);
      walkFaq(parsed);
      const shaped = shapeLd(parsed, 0);
      if (shaped !== undefined) ldTrees.push(shaped);
    } catch {
      malformed += 1;
    }
  }
  const jsonLdTypes = rawTypes.map((t) => t.toLowerCase());
  const schema = {
    jsonLdTypes,
    hasFaqPage: jsonLdTypes.includes('faqpage'),
    hasBreadcrumb: jsonLdTypes.includes('breadcrumblist'),
    blockCount: blocks.length,
    malformedBlocks: malformed,
    // 🔴 Client-only, and named so it cannot be mistaken for a second reading of
    // the server's `jsonLdTypes` above: that mirrors collectJsonLdTypes, which
    // records @type and nothing else, by design. There is no server-side
    // counterpart to this at all.
    trees: ldTrees,
    treeLimits: {
      ...ldCut,
      maxDepth: LD_MAX_DEPTH,
      maxFields: LD_MAX_FIELDS,
      maxValue: LD_MAX_VALUE,
      maxArray: LD_MAX_ARRAY,
    },
  };

  // WS-EXT-FAQ-CARRIERS — is each declared question actually ON the page?
  //
  // 🔴 THE HAYSTACK IS BUILT AGAIN HERE, AND ITS RULE IS THE OPPOSITE OF THE
  // ONE THE DENSITY BLOCK USES. That block strips script/style/noscript/
  // textarea/svg and then takes `textContent` — deliberately keeping
  // CSS-HIDDEN text, because it mirrors a server-side read of the delivered
  // HTML and dropping hidden text would be a second difference nobody asked
  // for. This measurement asks the one question that difference IS: can a
  // reader see these words. So hidden text must be excluded here, and reusing
  // `text` would answer the density screen's question under this screen's
  // heading. Two readings, two rules, said out loud so neither gets "unified".
  //
  // 🔴 AND THE ONE THAT WOULD HAVE MADE THIS ALWAYS PASS: a JSON-LD block is a
  // `<script>` inside the document, so its own text is part of `textContent`.
  // Matching a declared question against unfiltered page text finds the
  // question INSIDE THE BLOCK IT CAME FROM — every page green, forever, with no
  // failing entrance anywhere. SCRIPT/STYLE/NOSCRIPT/TEMPLATE/SVG subtrees are
  // rejected by the walker below for that reason before any other.
  const faqItems = [];
  let faqVisibleCount = 0;
  let faqScanTruncated = false;
  let faqScanError = null;
  let faqTextNodesSeen = 0;
  // 🔴 THE ONLY UNBOUNDED WORK THIS FUNCTION EVER DID. Everything below
  // accumulates page text onto up to eight ancestors PER TEXT NODE, normalises
  // every accumulator through `faqNorm` (an NFKC pass plus seven regexes, two
  // of them Unicode-property), and then matches every declared question against
  // every accumulator. On a large document that is minutes of SYNCHRONOUS work
  // in the page's own main thread — and synchronous work is not something a
  // try/catch can rescue: there is no exception, the scan simply does not come
  // back, and the panel has no state for "still going". The cap is what makes
  // that impossible; the try/catch below is for the other failure.
  const FAQ_MAX_TEXT_NODES = 20000;
  try {
    if (faqQuestions.length > 0 && document.body) {
      // Text is accumulated onto each text node's ancestors, up to a bounded
      // number of levels: a question may be split across inline tags
      // (`What is <b>X</b>?`), so the unit that has to carry it is an element,
      // not a text node. The bound keeps this from building one accumulator
      // holding the whole page — which would also be the accumulator most likely
      // to report a hidden question as visible.
      const FAQ_MATCH_ANCESTORS = 8;
      const owned = new Map();
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (n) => {
            for (let el = n.parentElement; el; el = el.parentElement) {
              const tag = el.tagName;
              if (
                tag === 'SCRIPT' ||
                tag === 'STYLE' ||
                tag === 'NOSCRIPT' ||
                tag === 'TEMPLATE' ||
                tag === 'SVG' ||
                tag === 'svg'
              ) {
                return NodeFilter.FILTER_REJECT;
              }
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (faqTextNodesSeen >= FAQ_MAX_TEXT_NODES) {
          // Stop, and SAY so. A truncated haystack turns "not visible" into a
          // statement about how far we got, and every question after this point
          // would be graded against a page we only half read.
          faqScanTruncated = true;
          break;
        }
        faqTextNodesSeen += 1;
        const chunk = n.nodeValue || '';
        if (!chunk.trim()) continue;
        let up = 0;
        for (
          let el = n.parentElement;
          el && up < FAQ_MATCH_ANCESTORS;
          el = el.parentElement
        ) {
          owned.set(el, (owned.get(el) || '') + ' ' + chunk);
          up += 1;
        }
      }
      const normed = new Map();
      for (const [el, raw] of owned) normed.set(el, faqNorm(raw));

      // ⚠️ NOT `offsetParent`. A `position: fixed` element has a null
      // offsetParent while being perfectly visible, so that test fails in one
      // direction on exactly the kind of drawer FAQs get built in.
      const seeable = (el) => {
        if (typeof el.checkVisibility === 'function') {
          if (
            el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
          ) {
            return true;
          }
        }
        return el.getClientRects().length > 0;
      };

      // 🔴 COLLAPSED IS NOT HIDDEN. A closed `<details>`, or a panel a button
      // owns through aria-controls, is content the reader reaches by clicking —
      // grading it "not on the page" would report our snapshot of one moment as
      // a fact about the document. So a match that is not itself rendered still
      // counts when the control that opens it is.
      const opener = (el) => {
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          if (n.tagName === 'DETAILS') return n;
          if (n.id) {
            const ctrl = document.querySelector(
              `[aria-controls="${CSS.escape(n.id)}"]`
            );
            if (ctrl) return ctrl;
          }
        }
        return null;
      };

      for (const q of faqQuestions) {
        const needle = faqNorm(q);
        let visible = false;
        if (needle) {
          for (const [el, text] of normed) {
            if (!text.includes(needle)) continue;
            // The INNERMOST match only. An ancestor whose text contains the
            // question is visible whenever any of its other content is, so
            // asking it would answer about the wrong element.
            let innermost = true;
            for (const child of el.children) {
              if (normed.get(child)?.includes(needle)) {
                innermost = false;
                break;
              }
            }
            if (!innermost) continue;
            const host = seeable(el) ? el : opener(el);
            if (host && seeable(host)) {
              visible = true;
              break;
            }
          }
        }
        if (visible) faqVisibleCount += 1;
        faqItems.push({ q, visible });
      }
    } else {
      for (const q of faqQuestions) faqItems.push({ q, visible: false });
    }
  } catch (e) {
    // WS-EXT-SCAN-RESILIENCE — this section fails ALONE. Before this, anything
    // thrown between the JSON-LD walk and the payload below took the whole
    // outline with it: headings, links, images, robots, the delivered-HTML read
    // — every one of them already collected, all of them discarded, and the
    // panel left saying it had no reading of the page.
    faqScanError = String(e?.message ?? e).slice(0, 200);
    faqItems.length = 0;
    faqVisibleCount = 0;
    for (const q of faqQuestions) faqItems.push({ q, visible: false });
  }

  // 🔴 TWO BOOLEANS ON PURPOSE, AND `hasFaqPage` DOES NOT MOVE. That one is the
  // client half of a PAIR: `collectJsonLdTypes` on the server produces the same
  // reading, and the panel puts them side by side. Redefining it here to mean
  // something slightly better would silently change what that comparison is
  // comparing — the failure this file already documents at `SERVER_RULE`. So
  // the new question gets a new field. Today the two walks descend the same way
  // (arrays and `@graph`) and therefore agree; `faq.present` exists so that the
  // day this walk needs to go further — a FAQPage sitting under a WebPage's
  // `mainEntity` is invisible to BOTH of them right now — it can, without
  // touching a value that is mirrored somewhere else.
  schema.faq = {
    present: faqPresent,
    // Conservatively false as soon as ANY block on the page failed to parse:
    // a FAQ we cannot rule out having been in the broken one is a reading that
    // stopped, and the panel is required to say so rather than grade the page.
    parsedOk: malformed === 0,
    declaredCount: faqDeclared,
    distinctCount: faqItems.length,
    visibleCount: faqVisibleCount,
    items: faqItems,
    // ⚠️ NEITHER OF THESE HAS A RENDERER YET, which this file's own rules
    // normally forbid. They are here because the alternative is worse in the
    // one direction that matters: without them a half-read page and a fully
    // read one produce the same `visible: false`, and a section that failed
    // produces the same thing again. The panel line that says so belongs to
    // WS-EXT-PANEL-FIXES; until it lands, this is collected and not shown, and
    // it is named here so that is a known debt rather than a discovery.
    scanTruncated: faqScanTruncated,
    scanError: faqScanError,
    // 🔴 THE CEILINGS TRAVEL WITH THE PAYLOAD, which is the whole point of this
    // object. The panel has to name these numbers when it explains that a
    // reading stopped — "we stop at N text nodes" — and it used to do that from
    // a literal hand-copied into extension/sidepanel.js that nothing compared
    // against the constants here. Changing a cap in this file left the panel
    // quoting the old one, and no gate anywhere could notice.
    // ⚠️ `maxItems` and `maxQChars` MOVED HERE OUT OF `dropped`, they were not
    // duplicated into it. `dropped` answers "how much did we lose"; this answers
    // "where is the edge". A second copy of a ceiling sitting one field over
    // would rebuild exactly the duplication this change exists to remove.
    limits: {
      maxTextNodes: FAQ_MAX_TEXT_NODES,
      maxItems: FAQ_MAX_ITEMS,
      maxQChars: FAQ_MAX_Q_CHARS,
    },
    dropped: {
      items: Math.max(0, faqDistinctSeen - FAQ_MAX_ITEMS),
      qChars: faqQCharsCut,
    },
  };

  // ---- head tags (WS-EXT-PARITY batch 3) ----------------------------------
  // 🔴 These five exist server-side too (ParsedHomepage: title / metaDescription
  // / metaRobots / canonical / viewport) and are read here the same way, so the
  // two readings are comparable as VALUES. What they are not is the same
  // measurement: the server parsed the homepage as delivered, this reads
  // whatever page the user is on after its JavaScript. The panel decides
  // whether a comparison is even meaningful; this only has to make sure the
  // extraction rule is not a second difference on top of that one.
  //
  // 🔴 canonical takes getAttribute('href'), NOT .href. The server stores the
  // attribute verbatim; `.href` would resolve it against the document and a
  // relative canonical would then differ from the stored one for a reason that
  // is purely ours.
  const metaContent = (selector) => {
    const m = document.querySelector(selector);
    const v = m?.getAttribute('content');
    return v ? v : null;
  };
  const head = {
    title: document.querySelector('title')?.textContent?.trim() || null,
    metaDescription: metaContent('meta[name="description" i]'),
    metaRobots: metaContent('meta[name="robots" i]'),
    canonical:
      document.querySelector('link[rel="canonical" i]')?.getAttribute('href') ??
      null,
    viewport: metaContent('meta[name="viewport" i]'),
    // 🔴 Client-only, named as such: the server's parser has no lang field at
    // all, so there is nothing on the other side to compare this to and it must
    // never be rendered as if there were.
    clientOnly: {
      htmlLang: document.documentElement.getAttribute('lang') || null,
      // WS-EXT-ENRICH B-B — two more with no server-side counterpart, kept in
      // the same container and for the same reason: the audit's parser has
      // neither field, so nothing here may be paired or compared.
      //
      // 🔴 `metaKeywords` is reported, never graded. The tag has been ignored by
      // Google since 2009 and by everything since; a verdict on it would be this
      // panel inventing a requirement. What it IS good for is sitting next to
      // the measured term frequencies on the density screen, where a reader can
      // see what the page CLAIMS its subject is against what its text says.
      metaKeywords: metaContent('meta[name="keywords" i]'),
      // 🔴 The DECLARATION, not a fetch. `href` is recorded as written and no
      // request is made to see whether it resolves — that would be a new
      // request to a URL the page chose, and this scan does not make those.
      // A missing declaration is still a fact: browsers and the crawlers that
      // build citation cards fall back to /favicon.ico, which may or may not
      // exist, and neither we nor the reader can tell from here.
      favicon: (() => {
        for (const l of document.querySelectorAll('link')) {
          const rel = (l.getAttribute('rel') || '').toLowerCase();
          if (!/(^|\s)(icon|shortcut icon|apple-touch-icon)(\s|$)/.test(rel)) {
            continue;
          }
          return {
            rel,
            href: l.getAttribute('href') || null,
            sizes: l.getAttribute('sizes') || null,
          };
        }
        return null;
      })(),
    },
  };

  // ---- entity signals (WS-EXT-PARITY batch 4) ------------------------------
  // 🔴 Client-only, all of it. The server's parser has NO equivalent for any of
  // these — no sameAs, no author, no dates, no site name — so nothing here can
  // be compared to a stored check and nothing here feeds geoScore. The panel
  // says so where it renders them.
  const entity = {
    ldNodes,
    // Zero means the walk finished; any other number is how many nodes the four
    // entity checks below never saw. The panel prints it — an absence claim
    // made over a truncated set has to say the set was truncated.
    ldNodesDropped,
    ldNodeCap: MAX_LD_NODES,
    // WS-EXT-HONEST-SURFACE B2 — the per-node author cap, shipped for the same
    // reason `ldNodeCap` is: the panel prints it inside the sentence that
    // discloses it, and a cap printed from the other file's own copy of the
    // number is a sentence that goes false without either file being touched.
    authorCap: MAX_AUTHORS,
    // WS-EXT-170 ① — same job as `authorCap` and `ldNodeCap` beside it: the
    // panel prints this number inside the sentence that discloses the cap, so
    // the number has to travel with the reading rather than be retyped there.
    sameAsCap: MAX_SAMEAS,
    ogSiteName:
      metaContent('meta[property="og:site_name" i]') ??
      metaContent('meta[name="og:site_name" i]'),
    metaAuthor: metaContent('meta[name="author" i]'),
    articlePublished: metaContent('meta[property="article:published_time" i]'),
    articleModified: metaContent('meta[property="article:modified_time" i]'),
  };

  // ---- social tags --------------------------------------------------------
  // Server counts every og:* property and every twitter:* name, nothing else.
  const social = { ogCount: 0, twitterCount: 0, items: [] };
  for (const m of document.querySelectorAll('meta')) {
    const name = (m.getAttribute('name') || '').toLowerCase();
    const property = (m.getAttribute('property') || '').toLowerCase();
    if (property.startsWith('og:')) social.ogCount += 1;
    if (name.startsWith('twitter:')) social.twitterCount += 1;
    if (property.startsWith('og:') || name.startsWith('twitter:')) {
      social.items.push({
        key: property || name,
        value: (m.getAttribute('content') || '').slice(0, 200),
      });
    }
  }

  // ---- images -------------------------------------------------------------
  // total / withAlt / withTitle / items are the server's fields and rules
  // (alt EXISTENCE is the bar — alt="" counts as a deliberate choice).
  // 🔴 lazyPlaceholders is deliberately NOT reported: the server measures the
  // src that was DELIVERED, and by the time this runs the swap has already
  // happened, so the same field name would carry a different meaning. What the
  // DOM can honestly say is recorded under its own names instead.
  const imgs = document.querySelectorAll('img');
  // 🔴 WS-EXT-ENRICH B-B — counted HERE, in the pass that already visits every
  // <img>, and NOT by de-duplicating `items` afterwards. That array stops at
  // MAX_IMG_ITEMS, so a unique count taken from it is a unique count OF THE
  // FIRST HUNDRED wearing the label "unique images on this page". Same shape as
  // the declaredCount bug and the Outline count before it.
  //
  // The key is the RESOLVED source where we have one, falling back to the
  // attribute — two <img> pointing at the same file through different relative
  // paths are one image to a crawler, and `currentSrc` is what makes them
  // comparable. An image with no source at all is not counted as a repeat of
  // every other sourceless image, so it keys on a per-node placeholder.
  const imageSrcSeen = new Set();
  const images = {
    total: imgs.length,
    unique: 0,
    withAlt: 0,
    withTitle: 0,
    itemsTruncated: imgs.length > MAX_IMG_ITEMS,
    items: [],
    clientOnly: { lazyAttr: 0, swappedAfterLoad: 0, notLoaded: 0 },
  };
  for (const img of imgs) {
    const hasAlt = img.hasAttribute('alt');
    const title = img.getAttribute('title');
    const srcAttr = img.getAttribute('src');
    const dataSrc =
      img.getAttribute('data-src') ??
      img.getAttribute('data-original') ??
      img.getAttribute('data-lazy-src');
    const swapped =
      !!img.currentSrc && !!srcAttr && !img.currentSrc.endsWith(srcAttr);
    // 🔴 RESOLVED, AND NOT WHICHEVER FIELD HAPPENED TO BE POPULATED. Keying on
    // `currentSrc || srcAttr` raw counts one image twice, and the count moves
    // with LOAD STATE rather than with the page: `currentSrc` is absolute and
    // only set once the browser has actually fetched, while `srcAttr` is
    // whatever the author wrote. Two <img> pointing at the same file therefore
    // produce different keys when one is loading="lazy" and has not started and
    // the other has finished.
    //
    // ⚠️ MEASURED, NOT REASONED: the same fixture with two identical
    // `src="/x.png"` returned 2, 2, 2, 3, 2 across five consecutive runs before
    // this. A single run of that set looks like a correct answer.
    const uniqueKey = img.currentSrc || dataSrc || srcAttr;
    if (uniqueKey) {
      let normalized = uniqueKey;
      try {
        normalized = new URL(uniqueKey, location.href).href;
      } catch {
        // an unparseable src is counted as itself
      }
      imageSrcSeen.add(normalized);
    } else {
      // No source at all. Each such <img> is its own entry rather than every
      // sourceless image collapsing into one.
      imageSrcSeen.add(`no-src-${imageSrcSeen.size}`);
    }
    if (hasAlt) images.withAlt += 1;
    if (title !== null) images.withTitle += 1;
    if (img.loading === 'lazy') images.clientOnly.lazyAttr += 1;
    if (swapped) images.clientOnly.swappedAfterLoad += 1;
    if (!img.complete || img.naturalWidth === 0)
      images.clientOnly.notLoaded += 1;
    if (images.items.length < MAX_IMG_ITEMS) {
      images.items.push({
        src: srcAttr,
        realSrc: img.currentSrc || dataSrc || srcAttr,
        alt: hasAlt ? (img.getAttribute('alt') ?? '') : null,
        title,
        loading: img.loading || null,
        swappedAfterLoad: swapped,
      });
    }
  }

  images.unique = imageSrcSeen.size;

  // ---- links --------------------------------------------------------------
  // classifyLink mirrored: #, mailto:, tel: and non-http(s) are skipped, and
  // internal means same hostname once www. is dropped from both sides.
  const domain = location.hostname.replace(/^www\./, '');
  // 🔴 Same ruling as `images.unique` directly above, and the派单 named this one
  // explicitly: `total` and `unique` CANNOT be derived from `links.items`,
  // which stops at MAX_LINK_ITEMS. On a page with 400 links, de-duplicating
  // that array answers a question about the first 150 and prints the answer
  // under the word "unique".
  //
  // `unique` keys on the RESOLVED absolute URL, not the raw href: `/pricing`,
  // `https://host/pricing` and `//host/pricing` are one destination, and a page
  // that writes all three has one link as far as anything following them is
  // concerned. The raw href is what the table shows; this is what it means.
  const linkHrefSeen = new Set();
  const links = {
    internal: 0,
    external: 0,
    total: 0,
    unique: 0,
    dofollow: 0,
    nofollow: 0,
    itemsTruncated: false,
    items: [],
  };
  // WS-EXT-PARITY batch 5 — which standing pages this page links to.
  //
  // 🔴 Counted HERE, inside the loop that already visits every anchor, and NOT
  // by filtering `links.items` afterwards. That array stops at MAX_LINK_ITEMS,
  // so it can answer "this site links to a privacy page" but it can NEVER
  // answer "it does not" — on a page with more than 150 links the footer is
  // exactly what falls off the end. A truncated array cannot support an
  // absence claim, and every one of these checks is an absence claim.
  //
  // 🔴 `editorial` is the SERVER'S regex, copied literally from
  // src/diagnose/fetch.ts METHODOLOGY_RE, because it is paired against the
  // stored geo.methodology check and a second rule would make the two
  // incomparable. Note what it does and does not match: `about-us` yes, a bare
  // `/about` no. That is the server's behaviour and this mirrors it rather than
  // improving on it.
  const NAV_PATTERNS = {
    editorial: /methodology|editorial|how-we|about-?us/i,
    contact: /contact/i,
    privacy: /privacy/i,
    terms: /terms|conditions/i,
  };
  const nav = {
    editorial: false,
    contact: false,
    privacy: false,
    terms: false,
  };

  const anchors = document.querySelectorAll('a');
  for (const a of anchors) {
    const href = (a.getAttribute('href') || '').trim();
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:')
    )
      continue;

    // The link's own words count as evidence too, for everything except
    // `editorial` — that one has to stay href-only to match the server. Capped
    // at 40 characters so a paragraph that happens to contain "contact" inside
    // a long inline link is not read as a footer link to a contact page.
    const label = (a.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40);
    for (const [key, re] of Object.entries(NAV_PATTERNS)) {
      if (nav[key]) continue;
      if (re.test(href) || (key !== 'editorial' && re.test(label))) {
        nav[key] = true;
      }
    }
    let scope = null;
    if (href.startsWith('/')) scope = 'internal';
    else {
      try {
        const u = new URL(href, `https://${location.hostname}/`);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
        scope =
          u.hostname.toLowerCase().replace(/^www\./, '') === domain
            ? 'internal'
            : 'external';
      } catch {
        continue;
      }
    }
    const rel = (a.getAttribute('rel') || '').toLowerCase();
    const isNofollow = /\bnofollow\b/.test(rel);
    // 🔴 Resolved SEPARATELY from `scope` above, deliberately, and not folded
    // into it: that block decides internal-vs-external and its two branches are
    // paired against the server's classifyLink. Threading a second use through
    // it would put this count's correctness and those counts' comparability in
    // the same edit. A raw href that will not resolve keeps its own spelling and
    // is simply counted as itself.
    let resolved = href;
    try {
      resolved = new URL(href, location.href).href;
    } catch {
      // keep the raw href as the key
    }
    linkHrefSeen.add(resolved);
    if (scope === 'internal') links.internal += 1;
    else links.external += 1;
    if (isNofollow) links.nofollow += 1;
    else links.dofollow += 1;
    if (links.items.length < MAX_LINK_ITEMS) {
      links.items.push({
        href,
        rel: isNofollow ? 'nofollow' : 'dofollow',
        scope,
        anchor: (a.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, ANCHOR_MAX_CHARS),
        // ④ — a 130-character anchor became a 120-character anchor with nothing
        // to say so, and the table and the CSV both showed the short one as if
        // it were the whole text.
        anchorTruncated:
          (a.textContent || '').replace(/\s+/g, ' ').trim().length >
          ANCHOR_MAX_CHARS,
      });
    }
  }
  links.total = links.internal + links.external;
  links.unique = linkHrefSeen.size;
  links.itemsTruncated = links.total > MAX_LINK_ITEMS;

  // ---- hreflang -----------------------------------------------------------
  const hreflang = { total: 0, hasXDefault: false, entries: [] };
  for (const l of document.querySelectorAll('link')) {
    const rel = (l.getAttribute('rel') || '').toLowerCase();
    const hl = l.getAttribute('hreflang');
    if (rel.includes('alternate') && hl) {
      hreflang.entries.push({
        lang: hl.toLowerCase(),
        href: l.getAttribute('href') || '',
      });
    }
  }
  hreflang.total = hreflang.entries.length;
  hreflang.hasXDefault = hreflang.entries.some((e) => e.lang === 'x-default');

  // ---- keyword density ----------------------------------------------------
  // 🔴 Every rule here is the server's, copied literally, because word counts
  // are where two implementations drift without anyone noticing: same
  // tokenizer (/[\p{L}\p{N}]+/u after lowercasing), same 79-word stop list,
  // same n-gram admission rules (a unigram must be 2+ chars and not a stop
  // word; an n-gram is dropped only when EVERY token in it is one), same
  // rounding (2 decimals), same tie-break (count desc, then term asc), same
  // caps (20 unigrams, 12 each for bi/tri).
  const STOPWORDS = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'of',
    'to',
    'in',
    'on',
    'at',
    'for',
    'with',
    'by',
    'from',
    'as',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'it',
    'its',
    'this',
    'that',
    'these',
    'those',
    'you',
    'your',
    'we',
    'our',
    'us',
    'i',
    'he',
    'she',
    'they',
    'them',
    'his',
    'her',
    'their',
    'not',
    'no',
    'do',
    'does',
    'did',
    'has',
    'have',
    'had',
    'can',
    'will',
    'would',
    'should',
    'could',
    'may',
    'if',
    'so',
    'than',
    'then',
    'there',
    'here',
    'all',
    'any',
    'more',
    'most',
    'up',
    'out',
    'about',
    'into',
    'over',
    'how',
    'what',
    'when',
    'which',
    'who',
    'why',
    'get',
    'got',
  ]);
  const TOP_UNIGRAMS = 20;
  const TOP_NGRAMS = 12;

  // The server strips script/style/noscript/textarea/title/svg and comments,
  // then takes what is left. The DOM equivalent is a clone with those elements
  // removed — textContent, not innerText, because innerText would additionally
  // drop CSS-hidden text and that is a second difference nobody asked for.
  const body = document.body ? document.body.cloneNode(true) : null;
  if (body) {
    for (const n of body.querySelectorAll(
      'script, style, noscript, textarea, svg'
    )) {
      n.remove();
    }
  }
  const text = (body ? body.textContent || '' : '').replace(/\s+/g, ' ').trim();
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const totalWords = words.length;
  const pct = (n) =>
    totalWords > 0 ? Math.round((n / totalWords) * 10000) / 100 : 0;
  // 🔴 The comparator is pinned to 'en'. The server sorts ties with a bare
  // localeCompare, i.e. whatever collation its runtime defaults to — measured,
  // Node and this browser already disagree about whether Han sorts before
  // Latin. Pinning here at least makes the panel's order the same for every
  // user; the counts and densities are identical either way, only the order of
  // equal-count terms can still differ from the stored audit's list.
  const topOf = (map, n) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'))
      .slice(0, n)
      .map(([term, count]) => ({ term, count, densityPct: pct(count) }));
  const uni = new Map();
  const bi = new Map();
  const tri = new Map();
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.length >= 2 && !STOPWORDS.has(w)) uni.set(w, (uni.get(w) ?? 0) + 1);
    if (
      i + 1 < words.length &&
      !(STOPWORDS.has(w) && STOPWORDS.has(words[i + 1]))
    ) {
      const g = `${w} ${words[i + 1]}`;
      bi.set(g, (bi.get(g) ?? 0) + 1);
    }
    if (
      i + 2 < words.length &&
      !(
        STOPWORDS.has(w) &&
        STOPWORDS.has(words[i + 1]) &&
        STOPWORDS.has(words[i + 2])
      )
    ) {
      const g = `${w} ${words[i + 1]} ${words[i + 2]}`;
      tri.set(g, (tri.get(g) ?? 0) + 1);
    }
  }

  // 🔴 The tokenizer matches RUNS of letters, so a whole Chinese/Japanese/Korean
  // phrase comes back as one "word". That is not a bug to fix here — changing it
  // would put the two paths permanently out of step — but it does mean the
  // density figures are an artefact of the tokenizer rather than a fact about
  // the page. So the share of CJK characters is measured and handed to the UI,
  // which refuses to print densities when the page is largely CJK instead of
  // printing a distorted number under a "Source" line.
  const cjkChars = (text.match(/[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/gu) || []).length;
  const letterChars = (text.match(/[\p{L}\p{N}]/gu) || []).length;
  const keywords = {
    totalWords,
    unigrams: topOf(uni, TOP_UNIGRAMS),
    bigrams: topOf(bi, TOP_NGRAMS),
    trigrams: topOf(tri, TOP_NGRAMS),
    clientOnly: {
      cjkShare:
        letterChars > 0 ? Math.round((cjkChars / letterChars) * 1000) / 10 : 0,
      textChars: text.length,
      // WS-EXT-CANT-VS-ISNT 笔一 — 🔴 COUNTED FROM `words`, THE SAME ARRAY
      // `totalWords` COUNTS, AND NOT FROM `unigrams`.
      //
      // The panel printed `unigrams.length` under the label UNIQUE, and that
      // number was wrong on two axes at once:
      //   · capped — `topOf(uni, TOP_UNIGRAMS)` slices to 20, so the cell read
      //     20 on every page that has ever been scanned. Measured: trirankai
      //     499 real / 20 shown, en.wikipedia.org/wiki/SEO 1647 / 20,
      //     stripe 492 / 20.
      //   · a different population — `uni` drops stop words and one-character
      //     tokens, while `totalWords` beside it counts every token. Two cells
      //     side by side, two denominators, one of them unstated.
      //
      // 🔴 THE CAP WAS THE LESS DANGEROUS HALF. declaredCount, the Outline
      // count and images-unique were all capped too, but each of them MOVED
      // with the page, so a reader had some chance of catching one. This was a
      // constant: no page could ever make 20 look wrong.
      //
      // A Set over an array we already built — no second walk, no second
      // tokenizer, and deliberately not a de-duplication of a truncated list,
      // which is the bug itself.
      uniqueWords: new Set(words).size,
    },
  };

  // ---- robots.txt + sitemap ------------------------------------------------
  // 🔴 Fetched from HERE, inside the page, on purpose. Since Chrome 85 a
  // content-script fetch carries the PAGE's origin and obeys the same-origin
  // policy (chromium.org/Home/chromium-security/extension-content-script-fetches),
  // so /robots.txt and /sitemap.xml on this host need no host permission and no
  // second prompt. The same rule is why a sitemap declared on another host —
  // a CDN, say — cannot be read from here: that is a CORS refusal, not a
  // missing sitemap, and the UI must never conflate the two.
  // WS-EXT-ENRICH A1 — 🔴 THERE IS NO robots.txt AGENT PARSER HERE ANY MORE.
  //
  // There used to be one, inlined right at this spot, and it was a SECOND
  // implementation with a SECOND token table: nine crawlers and longest-match
  // path resolution in extension/robots.js for the Crawler access screen, four
  // tokens and blanket-`Disallow: /` only for the Robots & sitemap screen. One
  // robots.txt, two screens, two answers, and nothing anywhere that could go
  // red when they disagreed.
  //
  // 🔴 WHY IT COULD NOT SIMPLY IMPORT THE OTHER ONE, which is the reason the
  // duplicate existed at all: this function is handed to
  // chrome.scripting.executeScript as `func`, so it is serialised and re-parsed
  // inside the page. It closes over NOTHING — not this module's imports, not
  // its constants. Any helper it calls has to be defined in its own body.
  //
  // So the parse moved OUT instead of the parser moving IN. This function now
  // ships the robots.txt text it already fetched, and `scanPage` — which runs
  // in the service worker, where `import` works — resolves it through the one
  // parser in extension/robots.js against the one token table in
  // extension/crawlers.js. Nothing about the fetch changed; only who reads it.
  //
  // ⚠️ WHAT STAYED, AND WHY IT IS NOT THE SAME DUPLICATE COMING BACK: the
  // `Sitemap:` scan below. Those lines have to be read HERE because the URLs
  // they name are fetched here — same-origin, from inside the page, which is
  // the whole reason this code lives in the page (see readSameOrigin). It reads
  // one global directive and knows nothing about user-agents, groups, rules,
  // precedence or tokens; the thing that was duplicated was the agent/rule
  // machinery and the bot list, and neither survives here.
  const readSitemapDirectives = (text) => {
    let hasSitemapDirective = false;
    const sitemaps = [];
    for (const line of text.split(/\r?\n/)) {
      const clean = line.replace(/#.*$/, '').trim();
      if (!clean) continue;
      const idx = clean.indexOf(':');
      if (idx === -1) continue;
      if (clean.slice(0, idx).trim().toLowerCase() !== 'sitemap') continue;
      hasSitemapDirective = true;
      const value = clean.slice(idx + 1).trim();
      if (value) sitemaps.push(value);
    }
    return { hasSitemapDirective, sitemaps };
  };
  const looksLikeSitemap = (text) => /<(urlset|sitemapindex)[\s>]/i.test(text);

  // 🔴 The deadline is what stops a hung connection from ending the scan
  // silently. Without it these reads were unbounded — measured, not assumed: a
  // socket that accepts and never answers left `fetch` pending past six seconds
  // with nothing on screen to say so. The panel showed "Reading the page…" on a
  // DISABLED button, forever, and never reached the sentence it already has for
  // exactly this ("The scan did not complete. That is our failure, not a
  // finding about the site.") — that sentence only runs once the promise
  // settles, so a hang was the one failure the panel could not describe.
  //
  // A timeout needs NO new state here. AbortSignal.timeout rejects, the catch
  // below already turns any rejection into `{ok:false, status:null}`, and that
  // is the honest bucket: a deadline we imposed is our limit, not the site's
  // absence — the same thing a connection error means. The only new information
  // is the NAME, which rides along in `error` as 'TimeoutError'.
  //
  // ⚠️ HOW TO CHECK IT IS REALLY FIRING, because this was verified in a page's
  // main world and executeScript runs `func` in the ISOLATED world, where the
  // API was not directly measured: the Crawler access screen prints this exact
  // string inline — "We could not read robots.txt from here (TimeoutError)".
  // If AbortSignal.timeout were unavailable there, constructing the signal
  // would throw and the catch would report a DIFFERENT name in that same
  // sentence. So the screen tells you which happened; nothing here has to
  // assume it.
  // WS-EXT-ENRICH C — `wantHeaders` is opt-in, and that is the whole design of
  // this parameter. Returning the header unconditionally would put an
  // `xRobotsTag` field on the robots.txt, sitemap.xml and llms.txt reads too,
  // where nothing reads it — three new collected-but-never-rendered fields, in
  // the batch whose entire subject was removing those. One caller needs it, so
  // one caller asks.
  //
  // 🔴 Readable because the request is SAME-ORIGIN. A cross-origin response
  // would expose only the CORS-safelisted headers and `x-robots-tag` is not one
  // of them; this works for exactly the reason the root-file reads work, and
  // for no other page.
  const readSameOrigin = async (
    url,
    wantHeaders = false,
    wantShape = false
  ) => {
    try {
      const res = await fetch(url, {
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.timeout(SAME_ORIGIN_TIMEOUT_MS),
      });
      // WS-EXT-CLOSEOUT ④ — 🔴 THE CAP IS UNCHANGED; WHETHER IT BIT IS NOW
      // RECORDED. A robots.txt cut at 300,000 characters yields a declaredCount
      // that is a count of the part we kept, and a delivered-HTML read cut
      // there yields a word count of the part we kept — both printed as
      // measurements of the whole thing. `raw.length` is the length BEFORE the
      // slice, so the comparison is against what the server actually sent.
      const raw = res.ok ? await res.text() : '';
      const text = raw.slice(0, 300000);
      const out = {
        ok: res.ok,
        status: res.status,
        text,
        error: null,
        truncated: raw.length > 300000,
      };
      if (wantHeaders) out.xRobotsTag = res.headers.get('x-robots-tag');
      // WS-EXT-UNKNOWN-URL — a SECOND opt-in rather than more fields on the
      // first, for the reason `wantHeaders`' own note gives: one caller needs
      // the shape of the response, so one caller asks. Folding these onto
      // `wantHeaders` would hang four never-rendered fields on the delivered-
      // HTML read, which is the defect that note exists to prevent.
      if (wantShape) {
        // 🔴 `raw` is '' for every non-2xx, because the read above is gated on
        // `res.ok` — so a 404's body has NOT been consumed and is read here.
        // Without this line `bytes` would be 0 on exactly the status this
        // screen exists to report, and 0 reads as "empty page", not as "we
        // never looked".
        const body = res.ok ? raw : await res.text();
        // Named `bytes` and made true to the name: `.length` counts UTF-16 code
        // units, so a page with any non-ASCII in it would be under-reported
        // under that word. This is the decoded body re-encoded as UTF-8, which
        // equals the wire length for a UTF-8 response and is an estimate for
        // anything else.
        out.bytes = new TextEncoder().encode(body).length;
        // 🔴 `status` can never be 3xx here. `fetch` follows redirects by
        // default, so a redirected request reports the FINAL status and this
        // flag is the only record that a hop happened at all. Any caller
        // grading "does this redirect" off `status` would grade every redirect
        // as whatever it landed on.
        out.redirected = res.redirected;
        out.finalPath = new URL(res.url).pathname;
        out.contentTypeHtml = /^\s*text\/html\b/i.test(
          res.headers.get('content-type') ?? ''
        );
      }
      return out;
    } catch (e) {
      // A blocked, timed-out or failed request is OUR limit, not the site's
      // absence.
      const out = {
        ok: false,
        status: null,
        text: '',
        error: e?.name ?? 'fetch failed',
        truncated: false,
      };
      if (wantHeaders) out.xRobotsTag = null;
      // Every shape field absent rather than defaulted to something a verdict
      // could be read out of: a request we could not complete is OUR limit, and
      // `status: null` above is what the screen keys "not measured" off.
      if (wantShape) {
        out.bytes = null;
        out.redirected = false;
        out.finalPath = null;
        out.contentTypeHtml = false;
      }
      return out;
    }
  };

  // The three root files, in parallel. They do not depend on one another, and
  // read serially their deadlines ADDED UP: three unresponsive files cost three
  // full timeout windows. Measured on a socket that accepts and never answers —
  // 17618ms serial against 5998ms parallel, i.e. three windows collapsing into
  // one. It also matches the server, whose fetchSurface has always requested
  // these same files with Promise.all.
  //
  // 🔴 THIS IS NOT THE SAME AVAILABILITY QUESTION AS THE TIMEOUT ABOVE, and the
  // difference is worth keeping straight. `AbortSignal.timeout` is a WEB
  // PLATFORM API: whether it exists depends on which globals the JS context is
  // given, which is why the timeout comment says how to confirm it in the
  // isolated world rather than assuming. `Promise.all` is an ECMAScript
  // INTRINSIC, present in every realm by the language spec. The isolated-world
  // caveat does not transfer.
  //
  // ⚠️ AND THIS DOES NOT MAKE US A LOAD TESTER, but the guarantee is the
  // BROWSER'S, not ours: fire twenty parallel same-origin requests and Chrome
  // opens six connections (measured — twenty requests, six ESTABLISHED sockets),
  // because the per-origin pool caps it. Over HTTP/2 they multiplex onto one
  // connection instead. Nothing here throttles anything; if that pool ever
  // stopped bounding us, this code would have no answer of its own.
  const [robotsRes, sitemapRes, llmsRes, deliveredRes, unknownRes] =
    await Promise.all([
      readSameOrigin(`${location.origin}/robots.txt`),
      readSameOrigin(`${location.origin}/sitemap.xml`),
      // WS-EXT-LLMS-LIVE — the third root file, and the only one of the three the
      // scan did not read until then. `geo.llms` was the one PAIRED root-file
      // check with no live half, on a panel that tells other people to publish an
      // llms.txt.
      readSameOrigin(`${location.origin}/llms.txt`),
      // WS-EXT-ENRICH C — 🔴 ONE REQUEST, TWO ANSWERS. This is the page itself,
      // fetched again from the browser that is already showing it, and it is the
      // only way this extension can see two things it otherwise cannot:
      //
      //   1. the HTML AS DELIVERED, before any JavaScript — a content script only
      //      ever sees the DOM after the page has built itself, so "is this page
      //      server-rendered" is unanswerable from the DOM alone;
      //   2. the X-Robots-Tag RESPONSE HEADER — headers are not exposed to a
      //      content script at all, at any price, without asking for the response
      //      again.
      //
      // They ride one fetch because they are one response. Two reads would double
      // the load we put on the page for nothing.
      //
      // 🔴 `credentials: 'omit'` (readSameOrigin's default, and load-bearing
      // here): a logged-in reader must not measure the logged-in HTML and call it
      // what a crawler gets. The cookie-free response is the closer analogue.
      //
      // ⚠️ WHAT IT STILL IS NOT: a crawler's view. It carries the reader's own
      // User-Agent and IP, so a site that server-renders only for known bots — or
      // that blocks them — answers us as a browser either way. It isolates ONE
      // variable, whether JavaScript ran, and the UI may not claim more.
      readSameOrigin(location.href, true),
      // WS-EXT-UNKNOWN-URL — 🔴 ONE GET TO A PATH THAT CANNOT EXIST, and it is
      // the only request this extension makes that the site's own content did not
      // ask for. It rides this Promise.all rather than running after it for the
      // reason the note above gives: read serially it would add a whole timeout
      // window to the worst case, for an answer that depends on nothing here.
      //
      // 🔴 It is a REAL request to the reader's own site and it will appear in
      // their logs as a 404. That is stated on the screen, verbatim, with the
      // path — see UNKNOWN_URL_DISCLOSURE in sidepanel.js. A measurement the
      // owner cannot find in their own access log afterwards is one they cannot
      // check us on.
      unknownPath
        ? readSameOrigin(`${location.origin}${unknownPath}`, false, true)
        : Promise.resolve(null),
    ]);
  const directives =
    robotsRes.ok && robotsRes.status < 400
      ? readSitemapDirectives(robotsRes.text)
      : null;

  // Every sitemap the robots file declares, each resolved as far as we are
  // allowed to go. `sameOrigin: false` is a real state with its own wording —
  // "declared but on another host" is not "absent".
  //
  // 🔴 THE COUNT AND THE READS ARE TWO DIFFERENT NUMBERS AND USED TO BE ONE.
  // This loop read the first twenty and pushed only those, and the panel then
  // captioned the array's length "Declared in robots.txt · N" — printing HOW
  // MANY WE LOOKED AT under the words "how many it declares". A site declaring
  // thirty-five read as declaring twenty, with nothing on screen marking the
  // other fifteen as unexamined. readSitemapDirectives hands back the complete
  // list, so the true figure was available right here and was being discarded.
  //
  // ⚠️ NOT REACHED TODAY, WHICH IS NOT THE SAME AS NOT BROKEN: measured across
  // twenty audited domains (nineteen readable), seventeen declare exactly one
  // sitemap, one declares two, and notion.so declares eleven. Nothing hits
  // twenty. That is where the distribution happens to sit, not a property of
  // robots.txt, and eleven is already past half.
  //
  // 🔴 WHY TWENTY: no reason is recorded. It arrived as a bare literal in
  // dcc0cf2 and neither that commit's message nor the next one that touched it
  // explains the choice. It is named here so the next person edits a decision
  // instead of a number, and it is left at twenty because the measured maximum
  // is eleven — enough today, for a reason nobody wrote down.
  const MAX_SITEMAPS_READ = 20;
  // Rows we describe at all, read or not. A robots.txt is capped at 300,000
  // characters by readSameOrigin, so the declared list is bounded but not
  // small; this bounds what crosses back out of the page. Anything past it is
  // still counted in declaredCount, which is never capped.
  const MAX_SITEMAPS_LISTED = 100;

  const allDeclared = directives?.sitemaps ?? [];
  const declaredCount = allDeclared.length;
  const declaredSitemaps = [];
  for (const raw of allDeclared.slice(0, MAX_SITEMAPS_READ)) {
    let sameOrigin = false;
    let url = raw;
    try {
      const u = new URL(raw, location.origin);
      url = u.href;
      sameOrigin = u.origin === location.origin;
    } catch {
      declaredSitemaps.push({
        url: raw,
        sameOrigin: false,
        unparsable: true,
        status: null,
        valid: null,
        error: 'not a URL',
      });
      continue;
    }
    if (!sameOrigin) {
      declaredSitemaps.push({
        url,
        sameOrigin: false,
        status: null,
        valid: null,
        error: 'cross-origin',
      });
      continue;
    }
    const r = await readSameOrigin(url);
    declaredSitemaps.push({
      url,
      sameOrigin: true,
      status: r.status,
      valid: r.ok && r.status < 400 ? looksLikeSitemap(r.text) : false,
      error: r.error,
    });
  }
  // Declared past the read cap: never requested, so we hold no opinion on them.
  // A state of its own, listed after the ones we did read, because "we did not
  // look" and "we looked and found nothing" are different facts about the site
  // and only one of them is about the site at all.
  for (const raw of allDeclared.slice(MAX_SITEMAPS_READ, MAX_SITEMAPS_LISTED)) {
    declaredSitemaps.push({
      url: raw,
      sameOrigin: null,
      notRead: true,
      status: null,
      valid: null,
      error: null,
    });
  }

  const robots = {
    ok: robotsRes.ok && robotsRes.status !== null && robotsRes.status < 400,
    status: robotsRes.status,
    hasSitemapDirective: directives ? directives.hasSitemapDirective : false,
    // 🔴 FILLED IN BY scanPage, NOT HERE, and null is the honest placeholder
    // until it is: resolving these needs the parser and the crawler table, and
    // neither exists inside an injected function (see readSitemapDirectives
    // above). `aiBotBlocked` keeps the SERVER'S question — four tokens, blanket
    // block — because it is paired against a stored check that asks exactly
    // that; `pageAccess` is the panel's own reading, all nine tokens resolved
    // against this page's path.
    aiBotBlocked: null,
    pageAccess: null,
    // 🔴 declaredCount is the robots file's own figure and is NEVER capped.
    // declaredSitemaps is what we describe: the first MAX_SITEMAPS_READ with a
    // verdict, then the rest flagged notRead up to MAX_SITEMAPS_LISTED. Read
    // the count from declaredCount, never from declaredSitemaps.length — that
    // substitution is the bug this field exists to end.
    clientOnly: {
      fetchError: robotsRes.error,
      // ④ — declaredCount is counted from the text we kept, so if the read was
      // cut the count is a floor, not a total. The panel says so.
      truncated: robotsRes.truncated === true,
      declaredCount,
      declaredSitemaps,
      // The bytes scanPage parses. It is DELETED there once the two readings
      // above are resolved, so it never reaches the panel or its state — a
      // robots.txt is capped at 300,000 characters by readSameOrigin and there
      // is no screen that shows it.
      text: robotsRes.ok && robotsRes.status < 400 ? robotsRes.text : null,
    },
  };
  const sitemap = {
    ok:
      sitemapRes.ok &&
      sitemapRes.status !== null &&
      sitemapRes.status < 400 &&
      looksLikeSitemap(sitemapRes.text),
    status: sitemapRes.status,
    clientOnly: {
      fetchError: sitemapRes.error,
      looksLikeSitemap: sitemapRes.ok
        ? looksLikeSitemap(sitemapRes.text)
        : null,
    },
  };
  // 🔴 `ok` IS THE STORED CHECK'S RULE, transcribed rather than improved:
  // buildGeoChecks in src/diagnose/core.ts computes
  // `llms.ok && llms.status < 400 && llms.text.trim().length > 0`, so a served
  // but blank llms.txt is a FAIL there. Reading it as "present" here would make
  // the two halves of the pair disagree on every empty file — the same shape of
  // defect as the editorial check, where an identical regex over a different
  // input set produced a phantom difference.
  //
  // 🔴 Four states, and `status` alone separates the two that matter: with this
  // rule `ok === false` at a 2xx status can only mean the body was blank, so
  // "present but empty" needs no extra field to be sayable. No line count or
  // size is reported: this is a PAIRED reading and the stored side publishes
  // neither, so a number here could not be compared with anything.
  const llms = {
    ok:
      llmsRes.ok &&
      llmsRes.status !== null &&
      llmsRes.status < 400 &&
      llmsRes.text.trim().length > 0,
    status: llmsRes.status,
    clientOnly: { fetchError: llmsRes.error },
  };

  // WS-EXT-ENRICH C — what the server actually delivered, measured.
  //
  // 🔴 DOMParser BUILDS AN INERT DOCUMENT: no script runs, no image loads, no
  // stylesheet applies. That is precisely the point — it is the closest thing a
  // browser can produce to what a crawler that does not execute JavaScript
  // sees, and it is produced without granting anything or fetching anything
  // twice.
  //
  // 🔴 ONLY MEASUREMENTS CROSS BACK, never the HTML. The body can be 300,000
  // characters and no screen shows it; shipping it would put a third of a
  // megabyte into the panel's state for nothing, which is the mistake the
  // robots.txt text read had to be walked back from in A1.
  //
  // 🔴 The word count uses THE SAME tokenizer and the same element stripping as
  // the density measurement above. Two counts that are going to be compared to
  // each other have to be counted the same way, or the comparison measures the
  // two counters.
  let delivered = null;
  if (deliveredRes.ok && deliveredRes.text) {
    try {
      const doc = new DOMParser().parseFromString(
        deliveredRes.text,
        'text/html'
      );
      const dBody = doc.body;
      if (dBody) {
        for (const n of dBody.querySelectorAll(
          'script, style, noscript, textarea, svg'
        )) {
          n.remove();
        }
      }
      const dText = (dBody ? dBody.textContent || '' : '')
        .replace(/\s+/g, ' ')
        .trim();
      delivered = {
        ok: true,
        status: deliveredRes.status,
        error: null,
        title: doc.querySelector('title')?.textContent?.trim() || null,
        h1: doc.querySelectorAll('h1').length,
        metaDescription:
          doc
            .querySelector('meta[name="description" i]')
            ?.getAttribute('content') || null,
        words: (dText.match(/[\p{L}\p{N}]+/gu) || []).length,
        // ④ — a delivered body cut at the read cap makes `words` a floor, which
        // makes the server-rendered share a floor too.
        truncated: deliveredRes.truncated === true,
        xRobotsTag: deliveredRes.xRobotsTag ?? null,
      };
    } catch (e) {
      // A body we could not parse is our failure to read it, not a fact about
      // the page. Same posture as every other read on this screen.
      delivered = {
        ok: false,
        status: deliveredRes.status,
        error: e?.name ?? 'parse failed',
        xRobotsTag: deliveredRes.xRobotsTag ?? null,
      };
    }
  } else {
    delivered = {
      ok: false,
      status: deliveredRes.status,
      error: deliveredRes.error,
      xRobotsTag: deliveredRes.xRobotsTag ?? null,
    };
  }

  const nodes = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const order = [];
  const counts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  for (const n of nodes) {
    const lvl = Number(n.tagName[1]);
    order.push(lvl);
    counts[`h${lvl}`] += 1;
  }
  const skips = [];
  for (let i = 1; i < order.length; i++) {
    if (order[i] - order[i - 1] > 1) {
      skips.push({ from: order[i - 1], to: order[i] });
    }
  }
  const MAX_ITEMS = 200;
  const items = [];
  for (const n of nodes) {
    if (items.length >= MAX_ITEMS) break;
    items.push({
      level: Number(n.tagName[1]),
      text: (n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
    });
  }

  // ---- page shape (WS-EXT-PARITY batch 5) ----------------------------------

  // 🔴 Same rule as `nav` above and for the same reason: this is a PROPORTION
  // over every H2/H3 on the page, and `items` stops at 200. Computing a ratio
  // from a truncated list would quietly answer a different question on exactly
  // the long pages where the answer matters.
  const QUESTION_WORDS =
    /^(who|what|why|how|when|where|which|can|could|does|do|did|is|are|was|were|should|will|would)\b/i;
  let subheads = 0;
  let questionHeads = 0;
  let headText = '';
  for (const n of nodes) {
    const lvl = Number(n.tagName[1]);
    if (lvl !== 2 && lvl !== 3) continue;
    const t = (n.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t) continue;
    subheads += 1;
    headText += `${t} `;
    if (/[?？]\s*$/.test(t) || QUESTION_WORDS.test(t)) questionHeads += 1;
  }
  // 🔴 Measured on the HEADINGS, not on the page. The word-density screen
  // refuses on the whole page's CJK share; a page can easily have English
  // headings over Chinese prose, and refusing that would throw away a reading
  // we can honestly make. Same threshold, its own measurement, its own name.
  const headCjk = (headText.match(/[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/gu) || []).length;
  const headLetters = (headText.match(/[\p{L}\p{N}]/gu) || []).length;

  // WS-EXT-FAQ-CARRIERS — the OTHER direction: question-and-answer content the
  // page shows while declaring no FAQPage JSON-LD.
  //
  // 🔴 IT LIVES HERE, HUNDREDS OF LINES BELOW THE REST OF THE FAQ WORK, FOR ONE
  // REASON: `questionHeads` is computed six lines above and this reuses that
  // count rather than counting question-shaped headings a second time. A second
  // tally would be a second definition of "question", the two would agree on the
  // day it was written, and nothing would ever go red when they stopped.
  // `QUESTION_WORDS` is likewise the one above, not a copy.
  //
  // ⚠️ THESE ARE SIGNALS, NOT A VERDICT, AND THE PANEL MAY NOT GRADE THEM ALONE.
  // A heading reading "How to install it" is question-shaped and is not an FAQ;
  // any tutorial trips it. `microdata` is the only one of the four that carries
  // its own semantics, which is why the panel's wording changes when it fires.
  const faqQuestionish = (el) => {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return !!t && (/[?？]\s*$/.test(t) || QUESTION_WORDS.test(t));
  };
  let faqDetails = 0;
  for (const d of document.querySelectorAll('details')) {
    const sum = d.querySelector(':scope > summary');
    if (sum && faqQuestionish(sum)) faqDetails += 1;
  }
  let faqAria = 0;
  for (const b of document.querySelectorAll(
    'button[aria-expanded], [role="button"][aria-expanded]'
  )) {
    if (faqQuestionish(b)) faqAria += 1;
  }
  schema.faqSignals = {
    details: faqDetails,
    microdata: document.querySelectorAll('[itemtype$="schema.org/Question"]')
      .length,
    aria: faqAria,
    questionHeads,
  };

  // Structural blocks an engine can lift whole. Navigation is markup-up as
  // lists everywhere on the web, so a site with nothing but a menu must not
  // read as a well-structured document.
  const inChrome = (node) => !!node.closest('nav, header, footer, aside');
  let lists = 0;
  let listItems = 0;
  for (const l of document.querySelectorAll('ul, ol')) {
    if (inChrome(l)) continue;
    const li = l.querySelectorAll(':scope > li').length;
    if (li < 2) continue; // a one-item list is a layout device, not a list
    lists += 1;
    listItems += li;
  }
  let tables = 0;
  let tableRows = 0;
  for (const t of document.querySelectorAll('table')) {
    if (inChrome(t)) continue;
    const rows = t.querySelectorAll('tr').length;
    if (rows < 2) continue;
    tables += 1;
    tableRows += rows;
  }

  // 🔴 A COUNT, deliberately not a verdict. Counting numerals cannot tell you
  // whether a page is evidenced — "5 tips" and "grew 40% in 2025" are the same
  // to a regex — so this ships as a measurement and the UI is not allowed to
  // grade it. `text` is the same body text the density block already built.
  const numerals = (text.match(/(?<![\p{L}])[$€£¥]?\d[\d,.]*\s?%?/gu) || [])
    .length;

  // WS-EXT-ENRICH B-B — how much text sits under each heading.
  //
  // 🔴 A MEASUREMENT WITH NO VERDICT, and the reason is the one numeralDensity
  // already carries: a "right" section length does not exist. A reference table
  // under an H2 is complete at twenty words; a tutorial step is thin at two
  // hundred. Grading this would be inventing a threshold and then reporting the
  // threshold as a finding about the page. What CAN be said without inventing
  // anything is the spread, which is what an author looks at.
  //
  // 🔴 Runs on the ALREADY-STRIPPED clone and AFTER `text` was taken from it —
  // order is load-bearing. This mutates the clone (headings become markers), so
  // doing it earlier would corrupt the body text every other measurement on
  // this screen is computed from.
  //
  // The marker is U+E000, a private-use codepoint: it cannot occur in real page
  // text, and unlike a NUL it does not turn any file that records it into
  // something grep treats as binary.
  let sections = null;
  if (body) {
    for (const h of body.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
      h.textContent = `\uE000${h.tagName[1]}\uE000`;
    }
    const marked = (body.textContent || '').replace(/\s+/g, ' ');
    // split with a capture group yields [before, level, body, level, body, …];
    // element 0 is whatever preceded the first heading and has no heading of
    // its own, so it is dropped rather than counted as a section.
    const parts = marked.split(/\uE000(\d)\uE000/);
    const counts = [];
    for (let i = 1; i < parts.length; i += 2) {
      counts.push((parts[i + 1] || '').match(/[\p{L}\p{N}]+/gu)?.length ?? 0);
    }
    if (counts.length) {
      const sorted = [...counts].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      sections = {
        count: sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        median:
          sorted.length % 2
            ? sorted[mid]
            : Math.round((sorted[mid - 1] + sorted[mid]) / 2),
        // Sections with nothing under them at all. Not a fault on its own — a
        // heading immediately followed by another heading is ordinary nesting —
        // but it is the one value here a reader can act on without a threshold.
        empty: sorted.filter((n) => n === 0).length,
      };
    }
  }

  // 🔴 WS-EXT-ENRICH B-B — presence, by declaration, and NOT a request.
  // Reported because "is anything measuring this page" is a question the panel
  // is asked and could already answer from the DOM it holds; NOT graded,
  // because neither tag makes an engine cite you and pretending otherwise would
  // be padding the check count with something we cannot justify.
  //
  // ⚠️ Detection is by script URL and inline-script substring, so it can be
  // fooled in both directions: a tag manager loading GA at runtime after this
  // scan reads as absent, and a page that merely MENTIONS the string reads as
  // present. It says "declared on this page", which is what it can see.
  const thirdParty = {
    googleAnalytics: false,
    googleTagManager: false,
    adSense: false,
  };
  for (const sc of document.querySelectorAll('script')) {
    const src = (sc.getAttribute('src') || '').toLowerCase();
    const inline = src
      ? ''
      : (sc.textContent || '').slice(0, 4000).toLowerCase();
    const hay = src || inline;
    if (!hay) continue;
    if (hay.includes('googletagmanager.com/gtm.js') || hay.includes('gtm-')) {
      thirdParty.googleTagManager = true;
    }
    if (
      hay.includes('google-analytics.com') ||
      hay.includes('googletagmanager.com/gtag/js') ||
      hay.includes('gtag(')
    ) {
      thirdParty.googleAnalytics = true;
    }
    if (
      hay.includes('pagead2.googlesyndication.com') ||
      hay.includes('adsbygoogle')
    ) {
      thirdParty.adSense = true;
    }
  }

  const pageShape = {
    nav,
    sections,
    thirdParty,
    subheads,
    questionHeads,
    headingCjkShare:
      headLetters > 0 ? Math.round((headCjk / headLetters) * 1000) / 10 : 0,
    lists,
    listItems,
    tables,
    tableRows,
    numerals,
    protocol: location.protocol,
    pathname: location.pathname,
    search: location.search,
  };

  // WS-EXT-SCAN-RESILIENCE — the probe's payload is built behind its own guard,
  // for the same reason the FAQ section has one: a throw here would discard an
  // outline that is otherwise complete.
  //
  // ⚠️ `readSameOrigin` already cannot reject — it has an internal catch, and
  // its deadline is `AbortSignal.timeout(SAME_ORIGIN_TIMEOUT_MS)`, MEASURED in
  // this harness at 5020ms against a socket that never answers. So this catch
  // is not covering a known throw; it is covering the shape (a field read off
  // an object a future edit could change) rather than an instance.
  let unknownUrlPayload = null;
  try {
    unknownUrlPayload = unknownRes
      ? {
          path: unknownPath,
          status: unknownRes.status,
          error: unknownRes.error,
          redirected: unknownRes.redirected,
          finalPath: unknownRes.finalPath,
          bytes: unknownRes.bytes,
          contentTypeHtml: unknownRes.contentTypeHtml,
        }
      : null;
  } catch (e) {
    unknownUrlPayload = {
      path: unknownPath ?? null,
      status: null,
      error: String(e?.message ?? e).slice(0, 200),
      redirected: false,
      finalPath: null,
      bytes: null,
      contentTypeHtml: false,
    };
  }

  return {
    headings: { counts, order, skips },
    items,
    itemsTruncated: nodes.length > MAX_ITEMS,
    head,
    entity,
    pageShape,
    schema,
    social,
    images,
    links,
    hreflang,
    keywords,
    robots,
    sitemap,
    llms,
    delivered,
    // WS-EXT-UNKNOWN-URL — null when the worker held a fresh reading and told us
    // not to ask. `null` here is "not read on this scan", never "the site has no
    // answer"; the panel keys its not-measured wording off it and off `status`.
    //
    // 🔴 `path` is carried even though the worker minted it. The screen has to
    // print the exact path it asked for — an owner who cannot match our claim
    // against a line in their own access log has to take it on trust, and this
    // is the one measurement here that puts a request in that log.
    //
    // 🔴 `error` is carried for the same reason `status: null` exists on every
    // other read in this function: a request we could not complete is our limit,
    // and a screen that graded it would be reporting our failure as the site's.
    unknownUrl: unknownUrlPayload,
    url: location.href,
    ranAt: Date.now(),
  };
}

/**
 * WS-EXT-ENRICH A1 — resolve the scan's robots.txt through the ONE parser.
 *
 * 🔴 TWO READINGS, ASKED DELIBERATELY DIFFERENTLY, AND THE DIFFERENCE IS THE
 * WHOLE REASON THIS FUNCTION EXISTS RATHER THAN ONE LOOP:
 *
 *   aiBotBlocked — the server's question, over SERVER_AUDIT_TOKENS, blanket
 *     only. It is PAIRED against the stored `geo.aibots` check, so it has to
 *     ask what that check asked. Asking a better question on one side of a
 *     pairing turns every answer into a disagreement the site did not cause.
 *   pageAccess — the panel's own question, over every crawler in the table,
 *     resolved against this page's path with the same longest-match rule the
 *     Crawler access screen uses. This is what the Robots & sitemap screen now
 *     shows, and it is why that screen and Crawler access can no longer differ:
 *     one parser, one table, one rule.
 *
 * 🔴 The path comes from the payload's own `url`, not from the tab. The tab can
 * have navigated between the read and this call; `url` is `location.href` as it
 * was at the moment the DOM was read, which is the address these rules are
 * being resolved FOR.
 *
 * An unreachable or unparseable robots.txt leaves BOTH null, exactly as the
 * inlined version left `aiBotBlocked` null — no rules is not the same fact as
 * no answer, and the panel renders the two differently.
 */
function resolveRobotsAccess(payload) {
  const text = payload?.robots?.clientOnly?.text ?? null;
  if (text === null) {
    if (payload?.robots?.clientOnly) delete payload.robots.clientOnly.text;
    return payload;
  }
  const groups = parseRobots(text);

  const aiBotBlocked = {};
  for (const token of SERVER_AUDIT_TOKENS) {
    aiBotBlocked[token] = blanketBlocked(groups, token);
  }

  let path = '/';
  try {
    const u = new URL(payload.url);
    path = u.pathname + u.search;
  } catch {
    // A payload without a readable url still gets an answer, just a site-wide
    // one. Refusing to answer would be worse than answering about `/`, and the
    // screen says which path it resolved.
  }
  const pageAccess = { path, byToken: {} };
  for (const crawler of CRAWLERS) {
    pageAccess.byToken[crawler.token] = resolve(groups, crawler.token, path);
  }

  payload.robots.aiBotBlocked = aiBotBlocked;
  payload.robots.pageAccess = pageAccess;
  delete payload.robots.clientOnly.text;
  return payload;
}

/**
 * 🔴 activeTab is a moment, not a subscription: it is granted when the user
 * clicks the toolbar icon and revoked the instant they navigate. So this can
 * fail for a reason that is about US, not about the page, and the caller has to
 * be able to tell those apart — hence the tagged errors rather than a boolean.
 */
async function scanPage(tabId, pageUrl) {
  if (typeof tabId !== 'number') return { error: 'no_tab' };
  // WS-EXT-UNKNOWN-URL — the skip decision has to be made BEFORE the injection,
  // because the request is sent from inside `collectOutline` and there is no
  // taking it back afterwards. `pageUrl` is the panel's bound address; it is a
  // guess about where the tab will be a moment from now, which is why the
  // WRITE below keys off the address the read actually happened at.
  let boundOrigin = null;
  try {
    boundOrigin = new URL(pageUrl).origin;
  } catch {
    // No usable address: no cache to consult, so the probe simply runs. A miss
    // costs one request; guessing an origin could attach one site's reading to
    // another.
  }
  // WS-EXT-SCAN-RESILIENCE — 🔴 THIS AWAIT USED TO SIT OUTSIDE THE try BELOW,
  // which made a storage read the one step that could take the whole scan down
  // before the page was ever touched. A rejection here does not become a scan
  // finding of any kind: a stale-cache miss costs one extra probe, and that is
  // the correct price for not being able to read the cache.
  let fresh = null;
  if (boundOrigin) {
    try {
      const key = unknownUrlKey(boundOrigin);
      const held = (await chrome.storage.session.get(key))[key];
      if (held && Date.now() - held.ranAt < PROBE_TTL_MS) fresh = held;
    } catch {
      // fresh stays null; the probe runs.
    }
  }
  try {
    const [hit] = await chrome.scripting.executeScript({
      target: { tabId },
      func: collectOutline,
      args: [fresh ? null : unknownUrlPath()],
    });
    // 🔴 A FUNCTION THAT THREW IN THE PAGE AND A PAGE THAT RETURNED NOTHING ARE
    // NOT THE SAME FACT, and until now they arrived here as one. Chrome reports
    // an injected function's own exception on the frame result rather than by
    // rejecting, so an outline that died on its first line reached the panel as
    // `no_result` — "The page returned nothing to read" — which reads as a
    // property of the site. `45ad6f7` shipped exactly that state on every page
    // for four days and this branch is why nobody could tell from the panel.
    if (hit?.error) {
      const detail =
        typeof hit.error === 'string'
          ? hit.error
          : (hit.error.message ?? JSON.stringify(hit.error));
      return { error: 'failed', detail: String(detail).slice(0, 400) };
    }
    if (!hit || !hit.result) return { error: 'no_result' };
    if (hit.result.scanError) {
      return { error: 'failed', detail: String(hit.result.scanError) };
    }
    const data = resolveRobotsAccess(hit.result);
    // 🔴 The origin the page ACTUALLY had, not the one we planned against. The
    // tab can navigate between the decision above and the read, and the two
    // failure shapes are opposite: writing under the wrong key just wastes a
    // later request, while attaching `fresh` to a DIFFERENT origin would print
    // one site's answer under another site's name. So the cache is only spent
    // when the two agree.
    let readOrigin = null;
    try {
      readOrigin = new URL(data.url).origin;
    } catch {
      // Handled by the guards below; `data.url` is location.href and a page
      // without a parseable one has nothing to key on either way.
    }
    if (fresh && readOrigin && readOrigin === boundOrigin) {
      data.unknownUrl = { ...fresh, fromCache: true };
    } else if (data.unknownUrl && readOrigin) {
      const record = { ...data.unknownUrl, ranAt: Date.now() };
      await chrome.storage.session.set({ [unknownUrlKey(readOrigin)]: record });
      data.unknownUrl = { ...record, fromCache: false };
    }
    // Anything else leaves `data.unknownUrl` as it came back — null when we
    // skipped the probe for an origin we then did not land on, which the screen
    // reports as not read rather than as a finding.
    return { data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Chrome's wording differs per case; both mean "not allowed right now".
    if (/permission|host permission|activeTab|Cannot access/i.test(msg)) {
      return { error: 'no_access', detail: msg };
    }
    if (
      /chrome:\/\/|extension gallery|Web Store|cannot be scripted/i.test(msg)
    ) {
      return { error: 'restricted', detail: msg };
    }
    return { error: 'failed', detail: msg };
  }
}

// --- crawler reachability probe -------------------------------------------

async function setUaRule(hostname, ua) {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [RULE_ID],
    addRules: [
      {
        id: RULE_ID,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'user-agent', operation: 'set', value: ua },
          ],
        },
        condition: {
          requestDomains: [hostname],
          resourceTypes: ['xmlhttprequest', 'other'],
          tabIds: [TAB_ID_NONE],
        },
      },
    ],
  });
}

async function clearUaRule() {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [RULE_ID],
  });
}

/**
 * One request as one crawler. `credentials:'omit'` matters: without it the
 * user's cookies for that site would ride along on a request claiming to be a
 * bot — the user's own session, sent under someone else's name.
 */
async function probeOne(url, hostname, crawler) {
  await setUaRule(hostname, crawler.ua);
  try {
    const res = await fetch(url, {
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return { id: crawler.id, status: res.status, error: null };
  } catch (e) {
    // A network-level failure is NOT an HTTP status and must not be reported as
    // one — the UI renders it as "no response", never as a block.
    return {
      id: crawler.id,
      status: null,
      error: e instanceof Error ? e.name : 'fetch failed',
    };
  } finally {
    await clearUaRule();
  }
}

async function fetchRobots(origin) {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return { status: res.status, text: null };
    return { status: res.status, text: await res.text() };
  } catch {
    return { status: null, text: null };
  }
}

async function probeCrawlers(url) {
  const cacheKey = `probe::${url}`;
  const cached = (await chrome.storage.session.get(cacheKey))[cacheKey];
  if (cached && Date.now() - cached.ranAt < PROBE_TTL_MS) {
    return { ...cached, fromCache: true };
  }

  const parsed = new URL(url);
  const path = parsed.pathname + parsed.search;
  const robots = await fetchRobots(parsed.origin);

  // No robots.txt at all is not "unknown" — the standard reads an absent or
  // non-200 robots.txt as no rules, i.e. everything allowed. Only a fetch we
  // could not complete leaves the declaration genuinely unknown.
  const groups = robots.text === null ? null : parseRobots(robots.text);
  const robotsKnown = groups !== null || robots.status !== null;

  const results = [];
  for (const crawler of CRAWLERS) {
    const robotsState = !robotsKnown
      ? 'unknown'
      : groups
        ? resolve(groups, crawler.token, path)
        : 'allowed';

    // No published User-Agent → we never invent one; the robots declaration is
    // still a fact worth reporting, so the row stays with a stated reason.
    if (!crawler.ua) {
      results.push({
        id: crawler.id,
        robotsState,
        tested: false,
        why: 'no_ua',
      });
      continue;
    }
    // robots.txt already told this crawler to stay away. The answer is settled,
    // and sending the request anyway would mean impersonating a crawler that
    // was explicitly asked not to come. Skip it.
    if (robotsState === 'disallowed') {
      results.push({
        id: crawler.id,
        robotsState,
        tested: false,
        why: 'robots_disallow',
      });
      continue;
    }
    const r = await probeOne(url, parsed.hostname, crawler);
    results.push({
      id: crawler.id,
      robotsState,
      tested: true,
      status: r.status,
      error: r.error,
    });
    await sleep(PROBE_GAP_MS);
  }

  const payload = {
    url,
    path,
    robotsStatus: robots.status,
    results,
    ranAt: Date.now(),
  };
  await chrome.storage.session.set({ [cacheKey]: payload });
  return { ...payload, fromCache: false };
}

// --- opening the panel (WS-EXT-PARITY batch 1) -----------------------------

/**
 * 🔴 This listener replaced the popup, and it is the single moment the whole
 * panel depends on. One toolbar click is THREE things at once:
 *   1. the gesture `sidePanel.open()` demands — measured, Chrome 147 rejects it
 *      otherwise with "may only be called in response to a user gesture";
 *   2. the moment Chrome grants activeTab, which is the only reason `tab.url`
 *      below is populated at all (without the grant every Tab this extension
 *      sees has its url stripped — measured);
 *   3. the handoff the panel reads.
 *
 * 🔴 `sidePanel.open()` is called FIRST, before any await. The gesture is
 * transient: a single await ahead of it is enough to lose it and the panel then
 * refuses to open. Everything that can wait, waits.
 *
 * 🔴 onClicked only fires because the action no longer declares a popup. If a
 * `default_popup` is ever added back to the manifest, this listener goes silent
 * and the extension has no way in.
 */
const HANDOFF_KEY = 'panelTarget';

function asUrl(raw) {
  try {
    const u = new URL(raw ?? '');
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

chrome.action.onClicked.addListener((tab) => {
  if (typeof tab?.windowId === 'number') {
    chrome.sidePanel
      .open({ windowId: tab.windowId })
      .catch((e) => console.error('sidePanel.open failed', e));
  }
  // A page we are not allowed to read (chrome://, the Web Store) clears the
  // handoff rather than leaving the previous site's target in place. Opening the
  // panel on a page it cannot see must not show the last page's data as if it
  // were this one.
  const url = asUrl(tab?.url);
  chrome.storage.session.set({
    [HANDOFF_KEY]: url
      ? { url: url.href, host: url.hostname, tabId: tab.id ?? null }
      : null,
  });
});

// --- message plumbing ------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const run = async () => {
    if (msg.type === 'getSignals') return getSignals(msg.host);
    if (msg.type === 'getSiteCache') return getSiteCache(msg.host);
    if (msg.type === 'scanPage') return scanPage(msg.tabId, msg.url);
    if (msg.type === 'probeCrawlers') return probeCrawlers(msg.url);
    if (msg.type === 'peekProbe') {
      const key = `probe::${msg.url}`;
      const hit = (await chrome.storage.session.get(key))[key];
      return hit && Date.now() - hit.ranAt < PROBE_TTL_MS
        ? { ...hit, fromCache: true }
        : null;
    }
    return { error: 'unknown_message' };
  };
  run().then(sendResponse, (e) =>
    sendResponse({ error: e instanceof Error ? e.message : 'failed' })
  );
  return true; // keep the channel open for the async reply
});
