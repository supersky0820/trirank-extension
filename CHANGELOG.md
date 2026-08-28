# Changelog

Every packaged build of the extension, in order.

⚠️ **What each entry can and cannot tell you.** These entries are derived from
the build record, which stores the pack date and the package size for every
version but a description of what changed for only the most recent one. Rather
than reconstruct the older descriptions from memory, the entries below carry
what was actually recorded. An entry with no description is not a build with no
changes — it is a build whose changes were never written down.

## 1.8.2 — packed 2026-08-28 · 203,309 bytes

Two screens stopped printing the word `null`. On **Structured data**, a page
carrying no JSON-LD showed it directly under "Nothing to list."; on **AI
visibility** — the screen the panel opens on — it appeared under "No AI-citation
check is stored for this domain yet.", which is the ordinary state for any
domain nothing has citation-probed yet. Both came from the same mistake in two
places: handing `append` a value that is sometimes null, which the DOM converts
to the string "null" and draws as text.

The store listing's name and description were rewritten. Nothing the extension
reads, sends, stores or asks permission for changed in this build.

Packed 2026-08-28, not yet submitted to the Chrome Web Store. Neither 1.8.1 nor
this build has been submitted, so the store listing serves 1.8.0 until one of
them is.

## 1.8.1 — packed 2026-08-27 · 202,626 bytes

The panel's FAQ ceilings now travel with the scan payload instead of the panel
keeping a second, hand-copied set of the same numbers — so the figure it quotes
when a reading stops is always the figure that actually applied. The manifest
now names this repository as the extension's public source.

Packed 2026-08-27, not yet submitted to the Chrome Web Store. The store listing
serves 1.8.0 until this build is submitted and reviewed.

## 1.8.0 — packed 2026-08-26 · 202,294 bytes

Adds the **Unknown URLs** screen, which reports how a site's origin answers a
request for an address that does not exist. Adds an FAQ carrier check to the
**Structured data** screen: where a page declares an FAQ, each question is
checked against the page's visible text. Fixes the wording on the **Measured
page** screen. Removes a dead export. Adds per-section guards, so one failing
read can no longer take a whole scan down.

Submitted to the Chrome Web Store on 2026-08-26 and published 2026-08-27.

## 1.7.0 — packed 2026-08-20 · 186,646 bytes

Published to the Chrome Web Store; the store listing showed 1.7.0 as of
2026-08-26. No description of the changes was recorded.

## 1.6.0 — packed 2026-08-19 · 177,871 bytes

Published to the Chrome Web Store, listing last updated 2026-08-19. No
description of the changes was recorded.

## 1.5.0 — packed 2026-08-16 · 168,497 bytes

Submitted to the Chrome Web Store on 2026-08-16. No description of the changes
was recorded.

## 1.4.0 — packed 2026-08-13 · 134,969 bytes

Published to the Chrome Web Store; confirmed published by 2026-08-16. No
description of the changes was recorded.

## 1.3.0 — packed 2026-08-11 · 127,984 bytes

Published to the Chrome Web Store, listing last updated 2026-08-11. No
description of the changes was recorded.

## 1.2.0 — packed 2026-08-05 · 108,344 bytes

Approved by the Chrome Web Store on 2026-08-06. No description of the changes
was recorded.

## 1.1.0 — packed 2026-08-02 · 104,414 bytes

Never uploaded; the package no longer exists. No description of the changes was
recorded.

## 1.0.0 — packed 2026-07-28 · 85,255 bytes

First build, published to the Chrome Web Store on 2026-07-30.
