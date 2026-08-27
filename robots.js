/**
 * WS-CHROME-EXT — robots.txt reader for the reachability test.
 *
 * The grouping logic (comment stripping, `user-agent:` runs opening a group,
 * `disallow:` closing the agent run) is a faithful port of parseRobots in
 * src/diagnose/fetch.ts. It is duplicated rather than imported because the
 * extension ships as plain files with no bundler and cannot reach into the Next
 * app; keep the two in sync if either changes.
 *
 * ONE deliberate difference: the server version only answers "is this bot
 * blanket-blocked by `Disallow: /`", which is all the GEO checklist needs. The
 * extension tests a SPECIFIC page the user is on, so it resolves that path with
 * the standard longest-match rule (most specific Allow/Disallow wins, Allow
 * wins ties). Reporting a page as "allowed" because the block was `Disallow:
 * /admin/` rather than `/` would be a false statement about that page — red
 * line 3 — so the extra precision is required here, not a scope extension.
 */

/**
 * @typedef {Object} RobotsGroup
 * @property {string[]} agents
 * @property {{allow: boolean, path: string}[]} rules
 */

/**
 * Parse robots.txt into user-agent groups with their ordered Allow/Disallow rules.
 * @param {string} text
 * @returns {RobotsGroup[]}
 */
export function parseRobots(text) {
  /** @type {RobotsGroup[]} */
  const groups = [];
  /** @type {RobotsGroup|null} */
  let current = null;
  let lastWasAgent = false;

  for (const line of text.split(/\r?\n/)) {
    const clean = line.replace(/#.*$/, '').trim();
    if (!clean) continue;
    const idx = clean.indexOf(':');
    if (idx === -1) continue;
    const field = clean.slice(0, idx).trim().toLowerCase();
    const value = clean.slice(idx + 1).trim();
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === 'disallow' || field === 'allow') {
      if (current)
        current.rules.push({ allow: field === 'allow', path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

/**
 * Does a robots path pattern match this URL path? Supports the two wildcards
 * Google and the other majors honour: `*` (any run) and `$` (end anchor).
 * @param {string} pattern
 * @param {string} path
 */
function matches(pattern, path) {
  if (pattern === '') return false; // `Disallow:` with an empty value means "nothing"
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const rx = body
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${rx}${anchored ? '$' : ''}`).test(path);
}

/**
 * Resolve whether `token` may fetch `path`, per this robots.txt.
 *
 * Precedence follows the spec: the bot's OWN group wins outright if present;
 * only if it has no group at all does the `*` group apply. Within a group the
 * longest matching pattern wins, Allow winning an exact-length tie. No matching
 * rule = allowed (robots.txt is deny-by-exception).
 *
 * @param {RobotsGroup[]} groups
 * @param {string} token lowercased robots user-agent token
 * @param {string} path  URL pathname (+ search)
 * @returns {'allowed'|'disallowed'}
 */
export function resolve(groups, token, path) {
  const own = groups.filter((g) => g.agents.includes(token));
  const applicable = own.length
    ? own
    : groups.filter((g) => g.agents.includes('*'));
  if (!applicable.length) return 'allowed';

  let best = null;
  for (const group of applicable) {
    for (const rule of group.rules) {
      if (!matches(rule.path, path)) continue;
      if (
        !best ||
        rule.path.length > best.path.length ||
        (rule.path.length === best.path.length && rule.allow)
      ) {
        best = rule;
      }
    }
  }
  if (!best) return 'allowed';
  return best.allow ? 'allowed' : 'disallowed';
}

/**
 * WS-EXT-ENRICH A1 — the SERVER'S question, asked of this same parse.
 *
 * 🔴 This is not a worse `resolve`. It answers a different question, and the
 * difference is the whole point: `resolve` says "may this token fetch THIS
 * path", which is what the panel's own screen needs; this says "is this token
 * blanket-blocked from the whole site", which is the only thing
 * src/diagnose/fetch.ts `parseRobots` computes. That stored answer is PAIRED
 * against a live one, so the live one has to ask the stored one's question. Ask
 * a better question on one side of a pairing and every difference it finds is
 * the pairing's own doing.
 *
 * 🔴 Transcribed from the server's `blocksAll`, including what it ignores: only
 * Disallow lines count (an `Allow: /` next to a `Disallow: /` does NOT rescue
 * the bot there, and must not here), the value must be exactly `/` after
 * trimming, and the bot's own group OR the `*` group blocking is enough — the
 * server does not apply own-group-wins precedence for this signal, so neither
 * does this. `resolve` above DOES apply it, correctly, for its own question.
 *
 * @param {RobotsGroup[]} groups
 * @param {string} token lowercased robots user-agent token
 * @returns {boolean}
 */
export function blanketBlocked(groups, token) {
  const blocksAll = (agent) =>
    groups.some(
      (g) =>
        g.agents.includes(agent) &&
        g.rules.some((r) => !r.allow && r.path.trim() === '/')
    );
  return blocksAll(token) || blocksAll('*');
}
