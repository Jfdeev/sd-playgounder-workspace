import { describe, expect, it } from 'vitest';
import { COMPONENT_CATALOG, getComponentSpec } from '../../src/catalog/components.js';

const EXPECTED_TYPES = [
  'load_balancer',
  'api_gateway',
  'app_server',
  'worker',
  'cache',
  'sql_primary',
  'sql_replica',
  'nosql_kv',
  'queue',
  'object_storage',
  'cdn',
] as const;

describe('COMPONENT_CATALOG (FR-014)', () => {
  it('contém exatamente os 11 tipos de componente esperados', () => {
    const keys = Object.keys(COMPONENT_CATALOG).sort();
    expect(keys).toEqual([...EXPECTED_TYPES].sort());
  });

  it.each(EXPECTED_TYPES)('%s tem specs verificáveis válidas', (type) => {
    const spec = COMPONENT_CATALOG[type];
    expect(spec.maxThroughputRps).toBeGreaterThan(0);
    expect(spec.baseLatencyMs.p50).toBeGreaterThan(0);
    expect(spec.baseLatencyMs.p99).toBeGreaterThanOrEqual(spec.baseLatencyMs.p50);
    expect(spec.monthlyCostUsd).toBeGreaterThan(0);
  });

  it('getComponentSpec retorna a mesma spec presente no catálogo', () => {
    expect(getComponentSpec('cache')).toBe(COMPONENT_CATALOG.cache);
  });
});
