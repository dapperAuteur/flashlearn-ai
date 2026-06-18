/**
 * Decides whether a set of granted permission strings satisfies a required one.
 *
 * Matching rules (kept in one place so routes and tests agree):
 *   - `*`            matches everything
 *   - `prefix:*`     matches any required permission that starts with `prefix`
 *                    (e.g. `kids:*` grants `kids:read`, `kids:write`, `kids:delete`;
 *                    `study:*` grants `study:read`, `study:write`)
 *   - exact string   matches itself (e.g. `sets:write`)
 *
 * Note the `prefix:*` rule matches on the bare prefix, so `kids:*` does NOT grant
 * `sessions:write`. That mismatch is exactly why the ecosystem child-flow routes
 * now require `kids:write`/`kids:read`/`kids:delete` instead of a `sessions:`/
 * `mastery:`/`children:` namespace no key was ever granted.
 */
export function hasPermission(granted: string[], required: string): boolean {
  return granted.some((p) => {
    if (p === '*') return true;
    if (p.endsWith(':*')) {
      const prefix = p.slice(0, -2);
      return required.startsWith(prefix);
    }
    return p === required;
  });
}
