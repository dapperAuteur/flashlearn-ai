/**
 * Schema for the admin App Configuration page (/admin/settings).
 *
 * Each known AppConfig key is described as a set of typed fields with help text,
 * sample values, and constraints. The settings UI renders one labeled input per
 * field (instead of asking the admin to hand-write JSON), and both the client and
 * the /api/admin/configs PUT route validate values against these schemas before
 * saving — so a typo can't write a malformed config.
 *
 * Unknown keys (anything without a schema here) fall back to the raw editor.
 */

export type FieldType = 'number' | 'string' | 'text' | 'boolean' | 'select' | 'url' | 'datetime';

export interface ConfigField {
  /** Object key this field maps to. Use '__value' for scalar (non-object) configs. */
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  /** Example value shown as placeholder. */
  sample?: string;
  /** Required fields reject empty values. Defaults: true for number/boolean/select, false for optional strings. */
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  maxLength?: number;
  options?: Array<{ value: string; label: string }>;
}

export interface ConfigSchema {
  key: string;
  label: string;
  description: string;
  /** 'object' → value is a JSON object of fields. 'scalar' → value is a single number/string/boolean. */
  kind: 'object' | 'scalar';
  fields: ConfigField[];
}

const TIER_FIELD = (name: string, label: string): ConfigField => ({
  name,
  label,
  type: 'number',
  integer: true,
  min: 0,
  max: 9_999_999,
  required: true,
  help: `AI generations allowed per 30-day window for ${label} users. Use a large number (e.g. 999999) for effectively unlimited.`,
  sample: '10',
});

export const CONFIG_SCHEMAS: ConfigSchema[] = [
  {
    key: 'RATE_LIMITS',
    label: 'AI Generation Rate Limits',
    description: 'Maximum AI flashcard generations per subscription tier, per rolling 30-day window.',
    kind: 'object',
    fields: [
      TIER_FIELD('Free', 'Free'),
      TIER_FIELD('Monthly Pro', 'Monthly Pro'),
      TIER_FIELD('Annual Pro', 'Annual Pro'),
      TIER_FIELD('Lifetime Learner', 'Lifetime Learner'),
      TIER_FIELD('Admin', 'Admin'),
    ],
  },
  {
    key: 'FLASHCARD_MAX',
    label: 'Max Flashcards Per Set',
    description: 'Upper limit on how many cards a single set can contain.',
    kind: 'scalar',
    fields: [
      {
        name: '__value',
        label: 'Maximum cards',
        type: 'number',
        integer: true,
        min: 1,
        max: 1000,
        required: true,
        help: 'A whole number between 1 and 1000.',
        sample: '100',
      },
    ],
  },
  {
    key: 'PROMO_LIFETIME_ACTIVE',
    label: 'Lifetime Promo Active',
    description: 'Whether the lifetime-pricing promotion is currently running.',
    kind: 'scalar',
    fields: [
      {
        name: '__value',
        label: 'Promotion active',
        type: 'boolean',
        required: true,
        help: 'On = the promotional lifetime price is offered to users.',
      },
    ],
  },
  {
    key: 'PROMO_LIFETIME_PRICE_CENTS',
    label: 'Lifetime Promo Price (cents)',
    description: 'Promotional lifetime price, in cents.',
    kind: 'scalar',
    fields: [
      {
        name: '__value',
        label: 'Price in cents',
        type: 'number',
        integer: true,
        min: 0,
        max: 100_000_000,
        required: true,
        help: 'Whole cents. 10000 = $100.00.',
        sample: '10000',
      },
    ],
  },
  {
    key: 'ANNOUNCEMENT_BANNER',
    label: 'Announcement Banner',
    description: 'Site-wide banner shown at the top of public pages.',
    kind: 'object',
    fields: [
      {
        name: 'active',
        label: 'Show banner',
        type: 'boolean',
        required: true,
        help: 'On = display the banner to users (requires a non-empty message).',
      },
      {
        name: 'message',
        label: 'Message',
        type: 'text',
        required: false,
        maxLength: 280,
        help: 'The banner text. Required for the banner to actually show.',
        sample: 'Finals season: unlimited AI generations through June 1.',
      },
      {
        name: 'type',
        label: 'Style',
        type: 'select',
        required: true,
        options: [
          { value: 'info', label: 'Info (blue)' },
          { value: 'warning', label: 'Warning (yellow)' },
          { value: 'promo', label: 'Promo (purple gradient)' },
          { value: 'ai', label: 'AI (emerald gradient)' },
        ],
        help: 'Color theme of the banner.',
      },
      {
        name: 'bannerId',
        label: 'Banner ID',
        type: 'string',
        required: true,
        maxLength: 40,
        help: 'Bump this (e.g. v1 → v2) to re-show the banner to users who dismissed the previous version.',
        sample: 'v1',
      },
      {
        name: 'linkText',
        label: 'Link text',
        type: 'string',
        required: false,
        maxLength: 60,
        help: 'Optional. Label for the call-to-action link.',
        sample: 'Learn more',
      },
      {
        name: 'linkUrl',
        label: 'Link URL',
        type: 'url',
        required: false,
        help: 'Optional. Must start with http:// or https:// (or be a relative /path).',
        sample: 'https://flashlearnai.witus.online/pricing',
      },
      {
        name: 'expiresAt',
        label: 'Expires at',
        type: 'datetime',
        required: false,
        help: 'Optional. ISO 8601 timestamp; the banner auto-hides after this. Leave blank for no expiry.',
        sample: '2026-06-01T06:59:00Z',
      },
    ],
  },
  {
    key: 'MAX_FEATURED_SETS',
    label: 'Max Featured Sets',
    description: 'How many featured sets appear on the Explore page.',
    kind: 'scalar',
    fields: [
      {
        name: '__value',
        label: 'Featured set count',
        type: 'number',
        integer: true,
        min: 0,
        max: 100,
        required: true,
        help: 'A whole number between 0 and 100.',
        sample: '10',
      },
    ],
  },
  {
    key: 'MAX_DAILY_INVITATIONS',
    label: 'Max Daily Invitations',
    description: 'How many invitations an admin can send per day.',
    kind: 'scalar',
    fields: [
      {
        name: '__value',
        label: 'Invitations per day',
        type: 'number',
        integer: true,
        min: 0,
        max: 10_000,
        required: true,
        help: 'A whole number between 0 and 10000.',
        sample: '20',
      },
    ],
  },
  {
    key: 'AUTO_FLAG_THRESHOLD',
    label: 'Auto-Flag Threshold',
    description: 'Auto-hide a public set once it receives this many content flags.',
    kind: 'scalar',
    fields: [
      {
        name: '__value',
        label: 'Flag threshold',
        type: 'number',
        integer: true,
        min: 1,
        max: 1000,
        required: true,
        help: 'A whole number between 1 and 1000.',
        sample: '5',
      },
    ],
  },
];

export const SCALAR_VALUE_KEY = '__value';

export function getConfigSchema(key: string): ConfigSchema | undefined {
  return CONFIG_SCHEMAS.find((s) => s.key === key);
}

/** Keys managed elsewhere (not via the generic guided/raw editors). */
export const MANAGED_ELSEWHERE_KEYS = new Set(['FEATURE_FLAGS']);

/** A short human hint about what a field accepts, e.g. "Number (integer, 0–1000)". */
export function fieldTypeHint(field: ConfigField): string {
  switch (field.type) {
    case 'number': {
      const kind = field.integer ? 'integer' : 'number';
      const hasMin = typeof field.min === 'number';
      const hasMax = typeof field.max === 'number';
      const range = hasMin || hasMax ? `, ${hasMin ? field.min!.toLocaleString() : '−∞'}–${hasMax ? field.max!.toLocaleString() : '∞'}` : '';
      return `Number (${kind}${range})`;
    }
    case 'boolean':
      return 'Yes / No';
    case 'select':
      return `One of: ${(field.options || []).map((o) => o.value).join(', ')}`;
    case 'url':
      return 'URL';
    case 'datetime':
      return 'Date/time (ISO 8601)';
    case 'text':
    case 'string':
    default:
      return field.maxLength ? `Text (max ${field.maxLength} chars)` : 'Text';
  }
}

/**
 * Validate an already-typed field value. Used by the client (after parsing inputs)
 * and the server (on the incoming value). Returns an error string, or null if valid.
 */
export function validateFieldValue(field: ConfigField, value: unknown): string | null {
  const isEmpty = value === undefined || value === null || value === '';
  const required = field.required ?? (field.type === 'number' || field.type === 'boolean' || field.type === 'select');

  if (isEmpty) {
    return required ? `${field.label} is required.` : null;
  }

  switch (field.type) {
    case 'number': {
      if (typeof value !== 'number' || Number.isNaN(value)) return `${field.label} must be a number.`;
      if (field.integer && !Number.isInteger(value)) return `${field.label} must be a whole number.`;
      if (typeof field.min === 'number' && value < field.min) return `${field.label} must be ≥ ${field.min}.`;
      if (typeof field.max === 'number' && value > field.max) return `${field.label} must be ≤ ${field.max}.`;
      return null;
    }
    case 'boolean':
      return typeof value === 'boolean' ? null : `${field.label} must be true or false.`;
    case 'select':
      return (field.options || []).some((o) => o.value === value) ? null : `${field.label} must be one of: ${(field.options || []).map((o) => o.value).join(', ')}.`;
    case 'url': {
      if (typeof value !== 'string') return `${field.label} must be text.`;
      if (value.startsWith('/')) return null; // relative path allowed
      if (/^https?:\/\/.+/i.test(value)) return null;
      return `${field.label} must start with http://, https://, or /.`;
    }
    case 'datetime': {
      if (typeof value !== 'string') return `${field.label} must be text.`;
      const ms = new Date(value).getTime();
      return Number.isNaN(ms) ? `${field.label} must be a valid date/time (ISO 8601).` : null;
    }
    case 'text':
    case 'string':
    default:
      if (typeof value !== 'string') return `${field.label} must be text.`;
      if (field.maxLength && value.length > field.maxLength) return `${field.label} must be ${field.maxLength} characters or fewer.`;
      return null;
  }
}

export interface ValidationResult {
  ok: boolean;
  /** field.name → error message */
  errors: Record<string, string>;
}

/** Validate a fully-typed config value (object or scalar) against its schema. */
export function validateConfigValue(schema: ConfigSchema, value: unknown): ValidationResult {
  const errors: Record<string, string> = {};

  if (schema.kind === 'scalar') {
    const field = schema.fields[0];
    const err = validateFieldValue(field, value);
    if (err) errors[field.name] = err;
    return { ok: Object.keys(errors).length === 0, errors };
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, errors: { __form: 'Value must be an object.' } };
  }

  const obj = value as Record<string, unknown>;
  for (const field of schema.fields) {
    const err = validateFieldValue(field, obj[field.name]);
    if (err) errors[field.name] = err;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
