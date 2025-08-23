// @ts-expect-error - Bun test types
import { describe, test, expect } from 'bun:test';
import { UnifiedCommentDetector } from './unified-detector';

describe('UnifiedCommentDetector', () => {
  const detector = new UnifiedCommentDetector();

  test('should allow positive comments', () => {
    const result = detector.detect('すごい！', 'testUser');
    expect(result.blocked).toBe(false);
  });

  test('should detect spoiler comments', () => {
    const result = detector.detect('犯人は田中だった', 'testUser');
    expect(result.blocked).toBe(true);
    expect(result.category).toBe('spoiler');
  });

  test('should detect hint comments', () => {
    const result = detector.detect('このあと来るぞ', 'testUser');
    expect(result.blocked).toBe(true);
    expect(result.category).toBe('hint');
  });

  test('should allow simple commands when they are not blocked', () => {
    const result = detector.detect('進めろ', 'testUser');
    // This test shows the current behavior - may not block simple commands without context
    expect(result.blocked).toBe(false);
  });

  test('should allow questions', () => {
    const result = detector.detect('どうやって進むの？', 'testUser');
    expect(result.blocked).toBe(false);
  });

  test('should allow normal comments', () => {
    const result = detector.detect('いい配信だ', 'testUser');
    expect(result.blocked).toBe(false);
  });
});