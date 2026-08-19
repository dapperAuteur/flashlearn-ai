import { mergeSeedCards, SEED_ID_PREFIX, type SeedCard } from '@/lib/data/mergeSeedCards';

const stored = (externalId: string | undefined, front: string, back: string, id = `oid-${front}`) => ({
  _id: id,
  externalId,
  front,
  back,
});

const seed = (externalId: string, front: string, back: string): SeedCard => ({ externalId, front, back });

describe('mergeSeedCards', () => {
  it('creates every card when the set is new', () => {
    const result = mergeSeedCards([], [seed('math:add:1+1', '1 + 1 = ?', '2')]);

    expect(result).toMatchObject({ added: 1, changed: 0, removed: 0 });
    expect(result.cards).toHaveLength(1);
  });

  it('keeps the existing card _id so review history survives a re-seed', () => {
    const existing = [stored('math:add:1+1', '1 + 1 = ?', '2', 'keep-me')];
    const result = mergeSeedCards(existing, [seed('math:add:1+1', '1 + 1 = ?', '2')]);

    expect(result.cards[0]._id).toBe('keep-me');
    expect(result).toMatchObject({ added: 0, changed: 0, removed: 0 });
  });

  it('counts a card as changed only when its content actually differs', () => {
    const existing = [stored('math:add:1+1', '1 + 1 = ?', '2')];

    expect(mergeSeedCards(existing, [seed('math:add:1+1', '1 + 1 = ?', '2')]).changed).toBe(0);
    expect(mergeSeedCards(existing, [seed('math:add:1+1', '1 + 1 = ?', '3')]).changed).toBe(1);
  });

  it('notices a change in the authored options alone', () => {
    const existing = [
      {
        ...stored('math:add:1+1', '1 + 1 = ?', '2'),
        options: [{ id: 'a', text: '2' }, { id: 'b', text: '3' }],
        correctOptionId: 'a',
      },
    ];
    const unchanged = mergeSeedCards(existing, [
      { ...seed('math:add:1+1', '1 + 1 = ?', '2'), options: [{ id: 'a', text: '2' }, { id: 'b', text: '3' }], correctOptionId: 'a' },
    ]);
    const changed = mergeSeedCards(existing, [
      { ...seed('math:add:1+1', '1 + 1 = ?', '2'), options: [{ id: 'a', text: '2' }, { id: 'b', text: '4' }], correctOptionId: 'a' },
    ]);

    expect(unchanged.changed).toBe(0);
    expect(changed.changed).toBe(1);
  });

  it('overwrites authored content while carrying other stored fields through', () => {
    const existing = [{ ...stored('math:add:1+1', 'old front', 'old back', 'oid'), stage: 3 }];
    const result = mergeSeedCards(existing, [seed('math:add:1+1', '1 + 1 = ?', '2')]);

    expect(result.cards[0]).toMatchObject({ _id: 'oid', stage: 3, front: '1 + 1 = ?', back: '2' });
  });

  it('prunes a seeded card that is no longer in the deck', () => {
    const existing = [
      stored('math:add:1+1', '1 + 1 = ?', '2'),
      stored('math:add:1+2', '1 + 2 = ?', '3'),
    ];
    const result = mergeSeedCards(existing, [seed('math:add:1+1', '1 + 1 = ?', '2')]);

    expect(result.removed).toBe(1);
    expect(result.cards.map((c) => c.externalId)).toEqual(['math:add:1+1']);
  });

  it('never prunes a card a human added by hand', () => {
    const existing = [
      stored('math:add:1+1', '1 + 1 = ?', '2'),
      stored(undefined, 'Hand-written card', 'Kept'),
      stored('someone-elses:card', 'Partner card', 'Also kept'),
    ];
    const result = mergeSeedCards(existing, [seed('math:add:1+1', '1 + 1 = ?', '2')]);

    expect(result.removed).toBe(0);
    expect(result.cards.map((c) => c.front)).toEqual(['1 + 1 = ?', 'Hand-written card', 'Partner card']);
  });

  it('honours a custom prefix when deciding what it owns', () => {
    const existing = [stored('other:1', 'Other', 'Card')];
    const result = mergeSeedCards(existing, [seed('other:2', 'New', 'Card')], 'other:');

    expect(result).toMatchObject({ added: 1, removed: 1 });
  });

  it('defaults to the math seed prefix', () => {
    expect(SEED_ID_PREFIX).toBe('math:');
  });
});
