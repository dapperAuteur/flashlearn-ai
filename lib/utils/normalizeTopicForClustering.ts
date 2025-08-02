/**
 * Normalizes a topic string for clustering and analytics.
 * This process involves converting the string to lowercase, removing special characters,
 * and standardizing whitespace to ensure that variations of the same topic
 * (e.g., "US History", "u.s. history!!") are treated as identical.
 *
 * @param topic - The raw topic string to be normalized.
 * @returns A normalized string suitable for grouping and analysis.
 */
export function normalizeTopicForClustering(topic: string): string {
  if (!topic || typeof topic !== 'string') {
    return '';
  }

  return topic
    .toLowerCase() // 1. Convert to lowercase
    .replace(/[^\w\s]/g, '') // 2. Remove all non-word characters (except whitespace)
    .replace(/\s+/g, ' ') // 3. Collapse multiple whitespace characters into a single space
    .trim(); // 4. Remove leading and trailing whitespace
}
