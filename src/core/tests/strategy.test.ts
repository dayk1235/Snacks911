import { getBestStrategySync, getNextStrategy } from '../antojo';

describe('antojo strategy engine', () => {
  test('getNextStrategy rotates through the sequence', () => {
    expect(getNextStrategy(0)).toBe('antojo');
    expect(getNextStrategy(1)).toBe('fomo');
    expect(getNextStrategy(2)).toBe('social');
    expect(getNextStrategy(3)).toBe('anchor');
    expect(getNextStrategy(4)).toBe('antojo');
  });

  test('getBestStrategySync returns a valid strategy', () => {
    const strategy = getBestStrategySync();
    expect(['antojo', 'fomo', 'social', 'anchor']).toContain(strategy);
  });

  test('getBestStrategySync returns same strategy on repeated calls (cached/fallback)', () => {
    const first = getBestStrategySync();
    const second = getBestStrategySync();
    expect(first).toBe(second);
  });
});
