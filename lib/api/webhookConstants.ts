// Pure constants shared by the WebhookDelivery model and the dispatcher.
// Lives outside models/ so unit tests of the dispatcher don't need to load
// mongoose (which transitively pulls bson ESM that jest can't parse without
// extra transform config).

// 7-step backoff schedule. Indexed by attemptNumber (1-based) — index 0 is
// unused. Values are seconds-from-now for the NEXT attempt after this one
// failed. After attempt 7 we mark dead-letter.
export const RETRY_BACKOFF_SECONDS: number[] = [
  0,        // [0] sentinel
  60,       // 1 → 2: 1 min
  5 * 60,   // 2 → 3: 5 min
  30 * 60,  // 3 → 4: 30 min
  2 * 3600, // 4 → 5: 2 h
  6 * 3600, // 5 → 6: 6 h
  16 * 3600,// 6 → 7: 16 h (cumulative ≈ 24h36m)
];

export const MAX_DELIVERY_ATTEMPTS = 7;

export const AUTO_DISABLE_THRESHOLD = 50;
