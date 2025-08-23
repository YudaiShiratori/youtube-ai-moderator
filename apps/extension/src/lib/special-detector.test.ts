// @ts-expect-error - Bun test types
import { describe, test, expect } from 'bun:test';
import { SpecialCategoryDetector } from './special-detector';

describe('SpecialCategoryDetector', () => {
  const detector = new SpecialCategoryDetector();

  test('should allow normal comments', () => {
    const result = detector.detect('面白い配信ですね', 'testUser');
    expect(result.blocked).toBe(false);
  });

  test('should detect moral attack patterns', () => {
    const result = detector.detect('不倫してたよね', 'testUser');
    expect(result.blocked).toBe(true);
    expect(result.category).toBe('backseat');
    expect(result.reason).toBe('道徳的攻撃');
  });

  test('should detect relationship shaming', () => {
    const result = detector.detect('奥さんが可哀想', 'testUser');
    expect(result.blocked).toBe(true);
    expect(result.category).toBe('backseat');
    expect(result.reason).toBe('関係性批判');
  });

  test('should detect social punishment requests', () => {
    const result = detector.detect('仕事を辞めろ', 'testUser');
    expect(result.blocked).toBe(true);
    expect(result.category).toBe('backseat');
    expect(result.reason).toBe('社会的制裁');
  });
});