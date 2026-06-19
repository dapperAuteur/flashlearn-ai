import { validateFlashcardOptions, buildFlashcardDoc } from '@/lib/api/flashcardOptions';

describe('validateFlashcardOptions', () => {
  it('accepts a card with neither field (returns ok, no value)', () => {
    const r = validateFlashcardOptions(undefined, undefined);
    expect(r).toEqual({ ok: true });
  });

  it('accepts valid options with a matching correctOptionId', () => {
    const r = validateFlashcardOptions(
      [{ id: 'a', text: 'Abduction' }, { id: 'b', text: 'Adduction' }],
      'b',
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ options: [{ id: 'a', text: 'Abduction' }, { id: 'b', text: 'Adduction' }], correctOptionId: 'b' });
  });

  it('rejects correctOptionId that matches no option', () => {
    const r = validateFlashcardOptions([{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], 'z');
    expect(r).toEqual({ ok: false, error: 'correctOptionId must match one of the option ids.' });
  });

  it('rejects fewer than two options', () => {
    const r = validateFlashcardOptions([{ id: 'a', text: 'A' }], 'a');
    expect(r.ok).toBe(false);
  });

  it('rejects duplicate option ids', () => {
    const r = validateFlashcardOptions([{ id: 'a', text: 'A' }, { id: 'a', text: 'B' }], 'a');
    expect(r.ok).toBe(false);
  });

  it('rejects correctOptionId without options', () => {
    const r = validateFlashcardOptions(undefined, 'a');
    expect(r).toEqual({ ok: false, error: 'correctOptionId was given without options.' });
  });

  it('rejects options missing text', () => {
    const r = validateFlashcardOptions([{ id: 'a' }, { id: 'b', text: 'B' }], 'b');
    expect(r.ok).toBe(false);
  });
});

describe('buildFlashcardDoc', () => {
  it('requires front and back', () => {
    expect(buildFlashcardDoc({ front: '', back: 'x' }).ok).toBe(false);
    expect(buildFlashcardDoc({ front: 'x', back: 'y' }).ok).toBe(true);
  });

  it('attaches options + correctOptionId + externalId when valid', () => {
    const r = buildFlashcardDoc({
      front: 'Identify the muscle',
      back: 'Biceps brachii',
      externalId: 'ces:m1:q1',
      options: [{ id: 'a', text: 'Biceps brachii' }, { id: 'b', text: 'Triceps brachii' }],
      correctOptionId: 'a',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc.externalId).toBe('ces:m1:q1');
      expect(r.doc.correctOptionId).toBe('a');
      expect(r.doc.options).toEqual([{ id: 'a', text: 'Biceps brachii' }, { id: 'b', text: 'Triceps brachii' }]);
    }
  });

  it('propagates an options validation error', () => {
    const r = buildFlashcardDoc({ front: 'q', back: 'a', options: [{ id: 'a', text: 'A' }], correctOptionId: 'a' });
    expect(r.ok).toBe(false);
  });
});
