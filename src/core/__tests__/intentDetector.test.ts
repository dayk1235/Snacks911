import { detectIntent, extractAllergies } from '../intentDetector';

describe('intentDetector - extractAllergies', () => {
  it('extracts single allergy from "sin X"', () => {
    const result = extractAllergies('quiero papas sin salchicha');
    expect(result).toContain('salchicha');
  });

  it('extracts multiple allergies from "sin X, Y y Z"', () => {
    const result = extractAllergies('sin salchicha, papas y queso');
    expect(result).toContain('salchicha');
    expect(result).toContain('papas');
    expect(result).toContain('queso');
  });

  it('extracts allergy from "soy alérgico a X"', () => {
    const result = extractAllergies('soy alérgico a lácteos');
    expect(result).toContain('lácteos');
  });

  it('extracts allergy from "no puedo comer X"', () => {
    const result = extractAllergies('no puedo comer picante');
    expect(result).toContain('picante');
  });

  it('returns empty array when no allergies mentioned', () => {
    const result = extractAllergies('quiero papas');
    expect(result).toHaveLength(0);
  });

  it('includes allergies in detectIntent result', () => {
    const result = detectIntent('quiero papas sin salchicha');
    expect(result.allergies).toBeDefined();
    expect(result.allergies).toContain('salchicha');
  });

  it('handles "sin" with special characters', () => {
    const result = extractAllergies('sin salchicha');
    expect(result).toContain('salchicha');
  });

  it('filters out common words like "sin", "y", "la"', () => {
    const result = extractAllergies('sin la salchicha y el picante');
    expect(result).toContain('salchicha');
    expect(result).toContain('picante');
    expect(result).not.toContain('la');
    expect(result).not.toContain('y');
    expect(result).not.toContain('el');
  });
});
