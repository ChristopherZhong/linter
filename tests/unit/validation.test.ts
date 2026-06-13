import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateContent, clearCaches } from '../../src/utils/validation';

describe('validation logic', () => {
  beforeEach(() => {
    clearCaches();
    vi.restoreAllMocks();
  });

  it('identifies valid JSON', async () => {
    const json = '{"name": "test"}';
    const result = await validateContent(json, 'json');
    expect(result).toEqual([]);
  });

  it('identifies invalid JSON syntax', async () => {
    const json = '{"name": "test"';
    const result = await validateContent(json, 'json');
    expect(result.length).toBe(1);
    // Error message varies by environment, so we check for common parts or existence
    expect(result[0].message).toBeDefined();
  });

  it('identifies valid YAML', async () => {
    const yaml = 'name: test\nversion: 1.0.0';
    const result = await validateContent(yaml, 'yaml');
    expect(result).toEqual([]);
  });

  it('identifies invalid YAML syntax', async () => {
    const yaml = 'name: test\n  version: 1.0.0\ninvalid: : :';
    const result = await validateContent(yaml, 'yaml');
    expect(result.length).toBe(1);
  });

  it('handles empty input', async () => {
    const result = await validateContent('', 'json');
    expect(result).toEqual([]);
  });

  it('validates against schema if $schema is present', async () => {
    const json = '{"$schema": "http://example.com/schema.json", "age": "not-a-number"}';

    // Mock fetch for schema
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'object',
        properties: {
          age: { type: 'number' }
        }
      })
    });

    const result = await validateContent(json, 'json');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].message).toContain('Schema: /age must be number');
  });
});
