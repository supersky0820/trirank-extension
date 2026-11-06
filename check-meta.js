/**
 * WS-EXT-1.9-PANEL A1 + A3 — severity and remedy, one row per check.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Two things the panel now prints had nowhere to live. The first screen counts
 * verdicts as critical / warning / passed, and every failing check carries a
 * three-sentence remedy. Neither is in the audit's own payload: a check arrives
 * as `{key, label, status, detail, weight, dimension}` (see the projection in
 * src/app/api/signals/[domain]/route.ts) and none of those fields says how much
 * a failure matters or what to do about it.
 *
 * 🔴 SEVERITY IS NOT WEIGHT, AND THE TWO MUST NOT BE DERIVED FROM EACH OTHER.
 * `weight` is the audit's scoring weight and it is already used, by the audit,
 * to produce the scores this panel prints. Reusing it as a severity would mean
 * the counts on the first screen and the score below them were two renderings
 * of one number — and it would put `geo.llms` (weight 0, see the deweighting
 * note above its check in src/diagnose/core.ts) in a bucket by arithmetic
 * rather than by judgement. Severity here answers a different question: how
 * much does a reader lose while this stays as it is.
 *
 * 🔴 THREE LEVELS, AND `info` IS NOT "MINOR". It is the level for checks whose
 * failure is a legitimate configuration on some sites — a missing breadcrumb on
 * a flat site, no Twitter card on a site that is not shared there. Printing
 * those as warnings would inflate the count this screen exists to make
 * trustworthy.
 *
 * 🔴 EVERY KEY IN BOTH MAPS IS ASSERTED AGAINST THE REAL ROSTERS by
 * `scripts/check-ext-check-meta.ts`, which derives the server-side keys from
 * src/diagnose/core.ts and the client-side ones from extension/sidepanel.js.
 * A check added there with no row here reddens that gate; a row here naming a
 * check that no longer exists reddens it too. This file is therefore not a
 * hand-maintained list that can quietly fall behind — that is the whole reason
 * the gate was written alongside it.
 *
 * 🔴 NO REMEDY PROMISES AN OUTCOME OR A DATE. Not "you will rank", not "within
 * two weeks", not "usually". Each `how` is a description of the ordinary way
 * the thing being checked is done, which is a statement about web pages and not
 * a prediction about this site.
 */

/** @typedef {'critical'|'warning'|'info'} Severity */

/**
 * 🔴 The order of the three is the order the first screen counts them in, and
 * it is exported rather than repeated there — a second copy of an ordering is
 * how two screens end up disagreeing about which bucket comes first.
 */
export const SEVERITY_ORDER = ['critical', 'warning', 'info'];

export const SEVERITY_LABEL = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

/** @type {Record<string, Severity>} */
export const SEVERITY = {
  // --- server-side audit, SEO dimension ------------------------------------
  // Indexability first: a page that cannot be fetched or is told not to be
  // indexed loses everything downstream of it, which is what `critical` means
  // here and nowhere else.
  'seo.indexable.robots': 'critical',
  'seo.indexable.noindex': 'critical',
  'seo.indexable.sitemap': 'warning',
  'seo.indexable.canonical': 'warning',
  'seo.meta.title': 'critical',
  'seo.meta.description': 'warning',
  'seo.meta.og': 'info',
  // Not `warning`: a site that is never shared on X loses nothing by having no
  // card, and X itself falls back to the Open Graph tags when this is absent.
  'seo.meta.twitter': 'info',
  'seo.headings.h1': 'warning',
  'seo.images.alt': 'warning',
  'seo.schema.jsonld': 'warning',
  'seo.links.internal': 'warning',
  'seo.mobile.viewport': 'critical',
  // A flat site with no hierarchy has nothing to put in a breadcrumb, so its
  // absence is not a defect on every site that shows it.
  'seo.schema.breadcrumb': 'info',
  // 🔴 `info`, and it is the one row whose reason is about US. This check
  // reports `needs_connection` for every domain that has not connected Search
  // Console; that status is excluded from the score at the source and is
  // rendered in the neutral vocabulary everywhere in this panel. Giving it a
  // higher severity would put our own missing data source into a count of the
  // site's problems.
  'seo.gsc': 'info',

  // --- server-side audit, GEO dimension ------------------------------------
  // Weight 0 in the audit since the deweighting recorded in src/diagnose/core.ts.
  // Severity is a separate judgement and this one is `info` on its own merits:
  // llms.txt is a proposal no answer engine has committed to reading.
  'geo.llms': 'info',
  'geo.aibots': 'critical',
  'geo.faq': 'warning',
  'geo.methodology': 'info',
  'geo.citation': 'warning',
  // WS-SHOPIFY-FIRST-INSTALL 件二 — the entity rule (WS-GEO-SCORE-DEPTH) and the
  // four answer-engine rules (WS-TIDY-5 件一) that shipped while extension/ was
  // frozen for the 1.10.6 upload. Until now the panel rendered all five with no
  // fix sentence and a defaulted severity, which is what their debt entries in
  // scripts/check-ext-check-meta.ts booked and what deleting those entries pays.
  //
  // `warning` where the absence is a defect on any site that has prose, `info`
  // where a perfectly good page can lack it: a reference table has no question
  // headings and a definition page has no figures, and grading either as a
  // problem would report our rule rather than the page.
  'geo.entity': 'warning',
  'geo.answerFirst': 'warning',
  'geo.qaStructure': 'info',
  'geo.authorEntity': 'warning',
  'geo.citableFacts': 'info',

  // WS-EXT-MIRROR-SETTLE — the five calibrated rules from WS-GEO-CHECKS-CALIBRATE
  // (src/diagnose/geo-checklist.ts), which shipped on the server while
  // extension/ was frozen for the 1.10.7 upload. Their debt entries in
  // scripts/check-ext-check-meta.ts are deleted in the same commit these rows
  // land; until now the panel rendered all five with no fix sentence and a
  // severity defaulting to `warning`.
  //
  // 🔴 FOUR `info` AND ONE `warning`, AND THE SPLIT IS NOT ABOUT IMPORTANCE. The
  // four are AMOUNTS whose cut points were calibrated at percentiles of a
  // 101-brand corpus — 70% / 51% / 51% / 32% of it pass — so failing one says
  // this page sits low on a distribution, which a perfectly good short page
  // legitimately does. Counting half the web as a warning is what `info` exists
  // to prevent. `geo.definitionalPhrase` is the odd one out because it asks a
  // PRESENCE question: the threshold only sets how early the sentence may
  // appear, and a page with prose that never says what it is has a defect rather
  // than a position on a curve.
  'geo.sectionDepth': 'info',
  'geo.listOrTable': 'info',
  'geo.substantiveBody': 'info',
  'geo.outboundCitations': 'info',
  'geo.definitionalPhrase': 'warning',

  // --- read from the page, in this browser ---------------------------------
  // These have no server-side counterpart and are not in any score; they are
  // counted on the first screen because a reader asked "what is wrong with this
  // page" does not care which side of our own architecture measured it.
  'client.render.ssr': 'critical',
  'client.entity.brand': 'warning',
  'client.entity.sameas': 'warning',
  'client.entity.authordate': 'info',
  'client.entity.freshness': 'info',
  'client.page.https': 'critical',
  'client.page.urlshape': 'info',
  'client.page.standing': 'warning',
  'client.page.questionheadings': 'info',
  'client.page.structures': 'info',
};

/**
 * A3 — what / why / how, one sentence each, keyed the same way.
 *
 * `what` restates the finding in the reader's terms; `why` says what is lost
 * while it stands; `how` describes the ordinary way it is done. The panel
 * prints all three only on a check that did not pass.
 */
/** @type {Record<string, {what: string, why: string, how: string}>} */
export const FIX = {
  'seo.indexable.robots': {
    what: 'This site has no readable robots.txt at its root.',
    why: 'Crawlers ask for that file first, and one that answers with an error leaves every crawler guessing at rules nobody wrote.',
    how: 'Serve a plain-text file at /robots.txt that returns HTTP 200, even if all it contains is a User-agent line and an empty Disallow.',
  },
  'seo.indexable.sitemap': {
    what: 'No XML sitemap was found at the usual address.',
    why: 'Without one, a crawler finds pages only by following links, so anything not linked from a crawled page is not reached.',
    how: 'Publish /sitemap.xml listing the pages you want indexed and name it in robots.txt with a Sitemap: line.',
  },
  'seo.indexable.noindex': {
    what: 'This page tells search engines not to index it.',
    why: 'A noindex directive is obeyed, so the page is removed from results no matter what else is on it.',
    how: 'Remove the noindex value from the robots meta tag and from the X-Robots-Tag response header, then request a re-crawl.',
  },
  'seo.indexable.canonical': {
    what: 'This page declares no canonical URL.',
    why: 'The same content reachable at several addresses is treated as several pages, and the evidence for each of them is split between them.',
    how: 'Add one <link rel="canonical"> in the head pointing at the absolute address this page should be known by.',
  },
  'seo.meta.title': {
    what: 'The title tag is missing or outside the length this check looks for.',
    why: 'The title is the line a result is listed under and the strongest single statement of what the page is about.',
    how: 'Write one <title> under 60 characters that names the page, not the site.',
  },
  'seo.meta.description': {
    what: 'The meta description is missing or outside the length this check looks for.',
    why: 'When it is absent the snippet is assembled from the page body, so the sentence under your result is written by a machine reading your markup.',
    how: 'Add a meta description under 160 characters that says what the page answers.',
  },
  'seo.meta.og': {
    what: 'The Open Graph tags are incomplete.',
    why: 'Chat apps and social platforms build a link preview from these, and a link with no preview is a bare URL.',
    how: 'Add og:title, og:description, og:image and og:url to the head.',
  },
  'seo.meta.twitter': {
    what: 'No Twitter card tags are declared.',
    why: 'Nothing else on the page controls how a link to it is drawn on X.',
    how: 'Add twitter:card and twitter:title, or rely on the Open Graph tags, which X reads when these are absent.',
  },
  'seo.headings.h1': {
    what: 'This page has no single H1, or has more than one.',
    why: 'The H1 is read as the page-level subject; several of them describe several subjects on one page.',
    how: 'Mark the page title as one H1 and demote the rest to H2 and below.',
  },
  'seo.images.alt': {
    what: 'Images on this page carry no alt text.',
    why: 'Alt text is the only description of an image a screen reader or a text-only crawler receives.',
    how: 'Give every content image an alt attribute describing it, and an empty alt="" for images that carry no meaning.',
  },
  'seo.schema.jsonld': {
    what: 'This page publishes no JSON-LD structured data.',
    why: 'Structured data is the machine-readable statement of what the page is; without it everything has to be inferred from prose.',
    how: 'Add one <script type="application/ld+json"> block declaring the type this page actually is.',
  },
  'seo.links.internal': {
    what: 'This page carries few internal links.',
    why: 'Internal links are how a crawler reaches the rest of the site and how a reader is told which pages relate to this one.',
    how: 'Link from this page to the pages it refers to, using anchor text that names the destination.',
  },
  'seo.mobile.viewport': {
    what: 'No viewport meta tag is declared.',
    why: 'A mobile browser renders the page at desktop width and scales it down, so the layout is read zoomed out.',
    how: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the head.',
  },
  'seo.schema.breadcrumb': {
    what: 'No BreadcrumbList structured data is declared.',
    why: 'Without it, the trail shown under a result is derived from the URL rather than from the hierarchy you defined.',
    how: 'Add a BreadcrumbList JSON-LD block naming each ancestor of this page, if the site has a hierarchy to describe.',
  },
  'seo.gsc': {
    what: 'Search Console indexing data is not available to this audit.',
    why: 'Nothing is wrong with the site here — this is a source the audit could not read, and it is excluded from the score for that reason.',
    how: 'Connect Search Console on TriRank if you want this row measured; leaving it unconnected changes no other reading in this panel.',
  },
  'geo.llms': {
    what: 'No llms.txt is published at the site root.',
    why: 'It is a proposed convention for telling answer engines which pages to read; no engine has committed to reading it, which is why the audit gives it no weight.',
    how: 'Publish /llms.txt listing your key pages, if you want to declare them in that format.',
  },
  'geo.aibots': {
    what: 'AI crawlers are disallowed in robots.txt.',
    why: 'An engine that is refused the page cannot cite the page — this blocks the outcome the rest of this panel measures.',
    how: 'Decide per crawler: the Crawler access screen separates the ones that index you from the ones that train on you, and a robots.txt rule can allow one and refuse the other.',
  },
  'geo.faq': {
    what: 'No FAQPage structured data is declared.',
    why: 'A declared question and answer is a unit an engine can quote whole, rather than a passage it has to cut out of prose.',
    how: 'Add an FAQPage JSON-LD block whose questions are also visible on the page — a declared question that is not on the page is a declaration nobody can check.',
  },
  'geo.methodology': {
    what: 'No editorial or methodology page was found.',
    why: 'A page saying who wrote this and how it was checked is the evidence an engine weighs when deciding whether to attribute an answer to you.',
    how: 'Publish a page describing who produces the content and how it is reviewed, and link it from the site navigation.',
  },
  'geo.citation': {
    what: 'No AI citation tracking is set up for this domain.',
    why: 'Whether an engine cites you is measured by asking it, and nothing on the site can be read to find that out.',
    how: 'Run the free AI-visibility check, which asks each engine and records which of them cited this domain.',
  },
  // WS-SHOPIFY-FIRST-INSTALL 件二 — the five rows the freeze deferred. Each
  // `how` is the same instruction the server already gives for that check in
  // src/diagnose/geo-checklist.ts, restated in this file's three-sentence shape
  // rather than reworded into a second piece of advice.
  'geo.entity': {
    what: 'This site declares no Organization or WebSite schema.',
    why: 'Without it an engine has no machine-readable statement of who publishes the site, so it has to infer the publisher from prose or not name one at all.',
    how: 'Add Organization and WebSite JSON-LD carrying the site name and URL to the homepage.',
  },
  'geo.answerFirst': {
    what: 'The opening of this page contains no complete sentence that answers what it is about.',
    why: 'An engine quoting the page has to assemble an answer itself, which it will do from somewhere else if another page hands it one ready-made.',
    how: 'Open with a full sentence stating the answer, before any preamble or scene-setting.',
  },
  'geo.qaStructure': {
    what: 'No heading on this page is phrased as a question.',
    why: 'Nothing on the page matches the shape of what a reader types, so an engine matching a query to a section has nothing to match against.',
    how: 'Phrase at least one heading as the question a reader would actually ask.',
  },
  'geo.authorEntity': {
    what: 'Nobody is named as the author or publisher in machine-readable form.',
    why: 'Answer engines weigh who is speaking, and a page with no declared author or organization is an anonymous source to them.',
    how: 'Add Person or Organization JSON-LD carrying a name, or link the author with rel="author".',
  },
  'geo.citableFacts': {
    what: 'Few paragraphs on this page carry a concrete figure.',
    why: 'Specifics are what gets quoted; a page of general statements gives an engine nothing it can lift and attribute.',
    how: 'Put concrete numbers into the prose — a figure inside a sentence, not only inside a table or a chart.',
  },
  // WS-EXT-MIRROR-SETTLE — the five calibrated rules. Each `how` is the same
  // instruction the server already gives for that check in
  // src/diagnose/geo-checklist.ts, restated in this file's three-sentence shape
  // rather than reworded into a second piece of advice.
  //
  // ⚠️ NO `why` HERE SAYS THE PAGE HAS NONE OF SOMETHING. Every one of these
  // five fails by sitting BELOW a calibrated amount, and a page failing
  // `geo.outboundCitations` with 15 outbound links is not a page that links to
  // nothing. An absolute sentence under a threshold verdict is a remedy that
  // contradicts the count printed above it in the same card.
  'geo.sectionDepth': {
    what: 'This page carries few h2/h3 section headings.',
    why: 'An engine lifting one passage needs a boundary to lift it at, and an undivided page has to be quoted whole or not at all.',
    how: 'Break the page into labelled sections with h2/h3 headings.',
  },
  'geo.listOrTable': {
    what: 'Most of this page is prose rather than lists or tables.',
    why: 'A list or a table is already segmented, so an engine can reproduce one without deciding where the passage ends.',
    how: 'Put comparisons, steps and specs in lists or tables instead of prose.',
  },
  'geo.substantiveBody': {
    what: 'This page carries little served body text.',
    why: 'An engine draws an answer out of what it can read, and the less there is, the less of an answer it can assemble.',
    how: 'Give the page enough written substance to answer a question from.',
  },
  'geo.outboundCitations': {
    what: 'This page links out to fewer external sources than the check looks for.',
    why: 'Pages that get cited tend to cite; the fewer sources a page names, the less an engine has to follow out of it.',
    how: 'Link out to the sources and standards the page relies on.',
  },
  'geo.definitionalPhrase': {
    what: 'Nothing early in the body says plainly what this is.',
    why: 'An engine answering "what is it" has to infer a definition rather than quote one the page already wrote.',
    how: 'State plainly what the thing is, early in the body, in one sentence.',
  },
  'client.render.ssr': {
    what: 'The HTML the server sends is missing part of what this page shows.',
    why: 'An engine that does not run JavaScript is served the delivered HTML and nothing else, so anything added in the browser is not there to be read.',
    how: 'Render the title, the H1, the meta description and the page body on the server, and let the browser add to it rather than build it.',
  },
  'client.entity.brand': {
    what: 'This page declares two different names for the site, or fewer than two names in total.',
    why: 'Two names split one site into two entities in the systems an engine grounds on, and half the evidence for citing you attaches to the other one.',
    how: 'Use one spelling in og:site_name and in the name field of the Organization or WebSite JSON-LD node.',
  },
  'client.entity.sameas': {
    // WS-EXT-1.10.3 D — 🔴 TWO SENTENCES BECAUSE THE CHECK HAS TWO FAILING
    // STATES AND THEY ARE NOT THE SAME FINDING. `checkSameAs` grades 0 links a
    // fail and exactly 1 a partial, and the row's own detail already says which
    // ("1 sameAs link: https://x.com/…"). This block did not: keyed by check
    // alone, the partial row printed the ZERO sentence — the one directly below
    // — so a card whose own detail read "1 sameAs link: <the link>" carried a
    // remedy underneath saying the page links to none: the panel contradicting
    // itself inside one card, about a fact it had just quoted.
    //
    // ⚠️ THAT ZERO SENTENCE IS NOT RESTATED IN THIS COMMENT, and that is not
    // fussiness. The acceptance check for this change counts the sentence's
    // literal text in this file and expects to find it once, in the branch that
    // prints it; quoting it here would make the check count this paragraph and
    // report two — a judge failing on its own documentation.
    //
    // ⚠️ THE SHAPE IS PER-STATUS ONLY WHERE THE STATES DIFFER. Every other row
    // in this map keeps a plain string, and `fixBlock` accepts both — a status
    // map on a check whose partial and fail mean the same thing would be two
    // copies of one sentence to keep in step by hand.
    what: {
      fail: 'The entity declared on this page links to no external profiles.',
      partial:
        'The entity declared on this page links to one external profile; a second, on a different network, is what lets a knowledge graph triangulate it.',
    },
    why: 'sameAs links are how a declared name is tied to an entity that already exists elsewhere, rather than asserted on its own.',
    how: 'Add a sameAs array to the Organization node listing your profiles on services that already describe you.',
  },
  'client.entity.authordate': {
    what: 'This page declares no author or no publication date.',
    why: 'Both are inputs an engine weighs when deciding whether an answer can be attributed to a source.',
    how: 'Declare author and datePublished on the Article node, and show the same two on the page.',
  },
  'client.entity.freshness': {
    what: 'The declared dates on this page are old.',
    why: 'A date is the only thing on the page that says whether what it claims still holds.',
    how: 'Update dateModified when the content is revised, and leave it alone when it is not — a date moved without a change says nothing.',
  },
  'client.page.https': {
    what: 'This page was not served over HTTPS.',
    why: 'Browsers mark it as not secure and anything sent to or from it can be read in transit.',
    how: 'Serve the site over HTTPS and redirect the plain-HTTP addresses to it.',
  },
  'client.page.urlshape': {
    what: 'This URL is long or deeply nested.',
    why: 'Depth is one of the inputs to how often a page is re-crawled, and a long address is harder to quote and to share.',
    how: 'Keep the path shallow and the slug short enough to read.',
  },
  'client.page.standing': {
    what: 'No contact, privacy or terms page was linked from this page.',
    why: 'These are the pages a reader — and an engine assessing a source — looks for to find out who is behind the site.',
    how: 'Link contact, privacy and terms from the site footer.',
  },
  'client.page.questionheadings': {
    what: 'Few headings on this page are shaped like questions.',
    why: 'A heading that is the question gives an engine a unit whose answer is the text underneath it.',
    how: 'Where a section answers a question readers ask, make the heading that question.',
  },
  'client.page.structures': {
    what: 'This page carries few lists or tables.',
    why: 'A list or a table is already segmented, so an engine can quote one row without deciding where the passage ends.',
    how: 'Put comparisons in tables and enumerations in lists rather than in prose.',
  },
};
