# Changelog

## 2.0.0 — 2026-11-06

- Private monitored questions/history are restricted to the signed-in owner; a paid tier is not ownership. Public audit and third-party cached readings remain separate.
- Dashboard and next-action links retain the inspected site.
- Slow responses from a previous page cannot overwrite the current page. Read-only API lookups time out, without automatic retries.
- Crawler tests serialize User-Agent overrides across panels. Print snapshots exclude credentials and are consumed once.
- Inspection context explains browser reads, stored checks and Global monitoring cadence. Narrow panels give evidence full width; keyboard focus, both themes and reduced motion remain supported.

This is a packaged release description, not a claim of Chrome Web Store approval. Backend changes must be live before submission.


Every packaged build of the extension, in order.

⚠️ **What each entry can and cannot tell you.** These entries are derived from
the build record, which stores the pack date and the package size for every
version but a description of what changed for only the most recent one. Rather
than reconstruct the older descriptions from memory, the entries below carry
what was actually recorded. An entry with no description is not a build with no
changes — it is a build whose changes were never written down.

## 1.10.2 — packed 2026-09-03 · 315,307 bytes

**Word density** now counts phrases of four and five words as well as one, two
and three, and puts each length behind its own tab instead of stacking all of
them into one list marked with `1·` / `2·` / `3·` prefixes. Each row shows three
numbers — how many times the term occurs, the total the panel divided by, and
the density — so the percentage can be checked rather than taken. The stop-word
rule at the new lengths is the one already written down for the old ones: a
phrase is dropped only when every word in it is a stop word.

⚠️ Four- and five-word phrases are measured in the panel only. The stored audit
counts up to three, so those two tabs have no second reading to be compared
against, and the screen says so where it shows them.

**Citation rate over time** stopped drawing all fourteen `cited/total` labels at
once. At the width this panel actually opens at, fourteen of them overlapped
into an unreadable row. The pair now appears for one bar at a time, on hover,
keyboard focus or a click, and is also carried in each bar's tooltip; the first
and last dates stay visible so the axis still reads at a glance. The pair was
kept as a pair rather than replaced by a percentage, because "1 of 2" and
"50 of 100" are the same percentage and not the same finding.

**Top keywords** shows ten rows with a "Show all" control beneath, rather than
the whole list. Typing in the filter box searches the whole list, not the ten.

🔴 The longer list needs a server-side change that is not in this archive.
The keyword rows come from a stored snapshot, so this build shows more of them
only for domains fetched after that change ships; a domain still inside its
cache window keeps the shorter list it was stored with.

Packed 2026-09-03, not submitted. 1.10.1 is with the Chrome Web Store and this
build stays local until that review resolves.

⚠️ **1.9.0, 1.10.0 and 1.10.1 have no entries here.** This file's opening line
says it lists every packaged build in order, and for those three it does not —
they were packed and recorded in `extension/README.md` under "Release builds"
without a changelog entry being written. Rather than reconstruct three
descriptions from memory, which is the thing the note at the top of this file
warns against, the gap is named. That table is the complete list; this file is
the complete list of builds whose changes were written down.

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
