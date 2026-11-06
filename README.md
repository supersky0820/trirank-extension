# TriRank — AI visibility and page inspection

A Chrome side panel for inspecting the page you are viewing, checking dated
TriRank measurements, and opening the right next step for your own site.

[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/iiklpdoichgjgeonbacgknhaielfiple)

Or load this folder unpacked at `chrome://extensions` with Developer mode on.
Manifest V3, no build step, no dependencies; minimum Chrome version 116.
`manifest.json` identifies these source files. A packaged version is not
necessarily approved or publicly available: check [CHANGELOG.md](CHANGELOG.md)
and the store listing separately.

## Measurements stay separate

- **AI visibility:** a dated, saved four-engine brand-check score. An incomplete
  set has no score. It is not your current seven-engine monitoring coverage.
- **Your monitoring:** signed-in site owners can read their own saved Global
  questions, history, cited pages and source evidence within their plan limits.
  A subscription does not authorize reading another customer's questions.
  Dashboard and action links retain the selected site.
- **Page inspection:** headings, schema, images, links, hreflang, social markup,
  robots directives and text structure read in the browser. A current-page
  reading is not a server fetch of the homepage.
- **Crawler access:** an optional browser-origin request using a published
  crawler User-Agent, alongside robots declarations. It cannot establish what
  a real vendor crawler from its own IP sees, or prove indexing/recommendations.
- **External signals:** stored Ahrefs DR, backlinks, registry information,
  Similarweb estimates and available performance readings, each with its source
  and date. Estimates are not analytics from the site's own account.

Missing measurements stay unavailable, failed AI checks remain unknown, and a
measured zero remains zero. Opening the panel does not generate content or start
paid AI checks. A traffic-estimate refresh is a separate explicit action with
server-enforced limits. Navigation invalidates pending old-page responses.

The navigation groups are Overview, AI visibility, Crawler access, Structure
and SEO basics. Narrow panels move dimension navigation above the evidence
column. Light/dark themes, keyboard focus, zoom and reduced motion are supported.

## Requests and credentials

The service worker is the network boundary. There is no always-on content script.

- A scan reads current-page structure locally. It may request the viewed
  origin's robots.txt, llms.txt, declared sitemaps and one generated unknown URL.
  Unknown-URL checks are cached per origin for ten minutes. The site operator
  can see these requests. Page content is not sent to TriRank.
- Panel lookups send the **domain**, not the page path/query/content, to
  `https://trirankai.com/api/signals/<domain>` and `/api/site-cache/<domain>`.
  These read saved data and never trigger a vendor probe on a cache miss.
- These requests include your existing TriRank session if Chrome attaches it.
  An optional TriRank API key is sent as an authorization header. `/api/me` and,
  when available, `/api/me/avatar` supply the account corner. The extension does
  not read cookies or ask for your password.
- Signing out explicitly posts to `/api/auth/sign-out`. Explicitly refreshing
  an estimate posts to `/api/site-refresh/<domain>` with server-side quotas.
  No other action silently performs that refresh.
- Crawler tests require your click and permission for the current origin.
  They send requests directly from your browser, never a TriRank server. They
  omit your cookies for the viewed site and are serialized across panels so a
  User-Agent override cannot overlap another test. No automatic retries.

## Storage and permissions

Local storage holds theme, zoom, the optional API key, a capped successful-read
counter and dismissal of the rating invitation. Disconnect removes the key.
No browsing history is synchronized to other devices. Session storage holds
current-tab handoff and short-lived probe results. An explicit Print action also
holds a report snapshot, **without credentials or account profile**, until the
print view consumes it or Chrome closes. Copy/Print are local, user-requested
exports and can include your private monitoring results; review before sharing.

Permissions are `activeTab`, `scripting`, `sidePanel`, `storage`, and
`declarativeNetRequestWithHostAccess`, with TriRank host access and optional
HTTP/HTTPS origin access requested when you run crawler tests. Version 2.0 does
not add permissions, analytics SDKs, remote executable code or automatic AI spend.

[Privacy policy](https://trirankai.com/privacy) ·
[How measurements work](https://trirankai.com/methodology) ·
[Support](https://trirankai.com/contact)
