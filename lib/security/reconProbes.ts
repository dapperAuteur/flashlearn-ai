// Common reconnaissance probe paths. None correspond to a real route on this app,
// so the middleware short-circuits with a 404 before any auth / DB / logging work
// runs, eliminating the ~500ms cold-start cost that scanner traffic otherwise incurs.
export const RECON_PROBE_PREFIXES = [
  '/.git',
  '/.env',
  '/.svn',
  '/.aws',
  '/.ssh',
  '/.DS_Store',
  '/.htaccess',
  '/.htpasswd',
  '/wp-admin',
  '/wp-login',
  '/wp-content',
  '/wp-includes',
  '/xmlrpc.php',
  '/phpmyadmin',
] as const;

export function isReconProbe(pathname: string): boolean {
  return RECON_PROBE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
