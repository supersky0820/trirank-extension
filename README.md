# TriRank SEO & AEO — AI Visibility Checker

A Chrome side panel that shows what AI engines already know about the site
you are on, and tests whether AI crawlers can actually reach it.

## Install

From the Chrome Web Store:
<https://chromewebstore.google.com/detail/iiklpdoichgjgeonbacgknhaielfiple>

Or load this repository unpacked:

1. Open `chrome://extensions` and enable **Developer mode**
2. Click **Load unpacked** and select this folder
3. Open any website and click the TriRank icon — the side panel opens on that
   page and reads it straight away. There is no popup and nothing to press

Manifest V3, no build step and no dependencies: these are plain files that
Chrome loads as they are. Minimum Chrome version 116.

**Which version this is.** `manifest.json` carries the version of the code in
this repository, and [CHANGELOG.md](CHANGELOG.md) records every packaged build.
That version is not always the one the Chrome Web Store is serving: a build is
packaged here first and submitted afterwards, and review takes as long as it
takes, so this branch can be one release ahead of the store. Compare the
`version` in `manifest.json` against the version shown on the store listing to
see which case you are in.

## What it checks

The panel's rail has four groups.

**Summary**

- **Overview** — how the site is doing across everything below

**AI visibility**

- **AI visibility** — what TriRank has already recorded about this domain being
  cited by AI engines. This is the screen the panel opens on
- **Structure readiness** — whether the page is shaped the way AI answers tend
  to draw from
- **Crawler access** — what AI crawlers get when they ask for this page. Runs
  only when you press its button

**External (cached)**

These four are read from what TriRank has already stored from third-party
vendors. They are kept in their own group, rather than mixed in with the panel's
own readings, so it is always clear which is which.

- **Domain rating** — the cached vendor domain rating
- **Backlinks** — the cached backlink figures
- **Traffic estimate** — the cached traffic estimate
- **Measured page** — cached page-performance and rendered-page readings

**Site basics**

- **SEO checks** — the per-check list for this page
- **Issue list** — the checks that did not pass, gathered in one place
- **Heading levels** — the headings, their levels and their order
- **Word density** — the words the page's text actually leans on
- **Images** — the images and their `alt` and `title` text
- **Links** — the links on the page and where they point
- **Structured data** — the JSON-LD blocks, and where the page declares an FAQ,
  whether each question also appears in the visible text
- **hreflang** — the page's `hreflang` annotations
- **Page declarations** — what the page declares about itself to something that
  is not a reader: Open Graph and Twitter cards, the favicon, the analytics tag
- **Robots & sitemap** — the page's robots directives, its declared sitemaps
  and whether an `llms.txt` is published
- **Unknown URLs** — how the origin answers a request for an address that does
  not exist
- **Whois** — the cached registration record for the domain

A stored check from a TriRank audit may appear next to this panel's own live
reading of the same named thing. When it does, neither side is graded against
the other and the difference is left visible: the two were read at different
times and at different stages of rendering.

## What it sends

Nothing it reads from the page ever leaves your device. What goes out is
exactly this and nothing else.

**Automatic on every scan, to the site you are viewing — four requests, under
your own browser's name:**

1. `robots.txt`
2. `llms.txt`
3. the sitemaps
4. **one** `GET` to a path that is generated fresh each time and cannot exist —
   `/__trirank-unknown-url-probe-` followed by eight random characters. The
   site's operator will see this as a 404 in their access log, for a path nobody
   has ever linked to, and the path names us so they can tell who asked. The
   same site is not probed again for **ten minutes**

**Automatic when the panel opens, to TriRank — two requests, the domain name and
nothing else:**

5. `GET /api/signals/<domain>`
6. `GET /api/site-cache/<domain>`

No path, no query string, no page content and no identifier for you. Both
requests omit credentials, so **no cookies are sent** — including any TriRank
cookie you may hold from being signed in on the website. Both endpoints answer
only from what is already stored; they never start a new measurement.

**Only after you press the button — the crawler reachability test:**

7. For each AI crawler whose operator publishes a User-Agent string, one request
   for the current page **identifying itself as that crawler**. This is the one
   part of the extension that requests something under another party's name, and
   those requests appear in that site's logs as coming from an AI crawler. **If
   you run this on a site you do not operate, its operator will see them.** Your
   cookies never ride along; a crawler that `robots.txt` has already turned away
   is not impersonated; and no User-Agent is ever invented — a crawler whose
   operator publishes no string is reported from `robots.txt` only, stated
   plainly as not tested. The test is never triggered automatically, and the same
   page is not re-tested within ten minutes

It has no account and no sign-in. There is no analytics, telemetry, crash
reporting or usage tracking of any kind, and no remote code: everything it runs
ships inside the package.

## Privacy

The full policy, including exactly what the panel reads from a page and how long
anything is stored: <https://trirankai.com/privacy>

## Methodology

How the checks are defined and scored: <https://trirankai.com/methodology>

## License

Licensed under the PolyForm Noncommercial License 1.0.0 — see [LICENSE](LICENSE).
Any noncommercial purpose is a permitted purpose; commercial use is not granted
by this license.

SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

Copyright TriRank.

## Versions

See [CHANGELOG.md](CHANGELOG.md).
