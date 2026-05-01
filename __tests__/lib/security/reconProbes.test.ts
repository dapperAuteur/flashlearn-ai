import { isReconProbe } from '@/lib/security/reconProbes';

describe('isReconProbe', () => {
  it.each([
    '/.git',
    '/.git/HEAD',
    '/.git/config',
    '/.gitignore',
    '/.env',
    '/.env.local',
    '/.env.production',
    '/.svn/entries',
    '/.aws/credentials',
    '/.ssh/id_rsa',
    '/.DS_Store',
    '/.htaccess',
    '/.htpasswd',
    '/wp-admin',
    '/wp-admin/admin-ajax.php',
    '/wp-login.php',
    '/wp-content/uploads/',
    '/wp-includes/wlwmanifest.xml',
    '/xmlrpc.php',
    '/phpmyadmin',
    '/phpmyadmin/index.php',
  ])('returns true for known recon path %s', (path) => {
    expect(isReconProbe(path)).toBe(true);
  });

  it.each([
    '/',
    '/auth/signin',
    '/api/teams',
    '/dashboard',
    '/team/123',
    '/.well-known/security.txt',
    '/.well-known/acme-challenge/abc',
    '/pricing',
    '/explore',
    '/api/cron/study-reminders',
    '/u/some-username',
    '/study/some-set-id',
  ])('returns false for legitimate path %s', (path) => {
    expect(isReconProbe(path)).toBe(false);
  });
});
