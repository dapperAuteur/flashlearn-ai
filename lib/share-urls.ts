type ShareSource = 'twitter' | 'facebook' | 'email' | 'copy' | 'native';
type ShareCampaign = 'versus' | 'results' | 'set' | 'challenge_preview';

const BASE_URL = 'https://flashlearnai.witus.online';

/**
 * Appends UTM parameters to any internal path or full URL.
 * Returns a full URL string suitable for share links.
 */
export function buildShareUrl(
  path: string,
  source: ShareSource,
  campaign: ShareCampaign
): string {
  const base = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const url = new URL(base);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', 'share');
  url.searchParams.set('utm_campaign', campaign);
  return url.toString();
}

/**
 * Builds a pre-filled Twitter/X share URL.
 */
export function buildTwitterShareUrl(
  shareUrl: string,
  text: string,
  hashtags: string[] = ['flashcards', 'studywithme']
): string {
  const params = new URLSearchParams({
    url: shareUrl,
    text,
    hashtags: hashtags.join(','),
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Builds a Facebook share URL.
 */
export function buildFacebookShareUrl(shareUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
}

/**
 * Builds a mailto share URL.
 */
export function buildEmailShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
