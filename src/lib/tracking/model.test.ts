import { it, expect, describe } from 'vitest';
import { caseEventSchema, caseStatus, estimateFor, type CaseRecord } from './model';
import { parseISODate } from '@/lib/legal/date-utils';
describe('server date estimates', () => {
  // Independently enumerated dates; see docs/DATE_FIXTURES.md.
  for (const [receipt, pathway, due] of [
    ['2026-07-16', 'informacion', '2026-07-31'],
    ['2026-07-16', 'estado', '2026-08-10'],
    ['2025-12-23', 'informacion', '2026-01-08'],
    ['2026-03-27', 'informacion', '2026-04-14'],
  ] as const) {
    it(receipt + ' ' + pathway, () =>
      expect(estimateFor('sena', pathway, receipt)?.date).toBe(due),
    );
  }
  it('rejects impossible and future receipts', () => {
    expect(() => parseISODate('2026-02-30')).toThrow();
    expect(
      caseEventSchema.safeParse({ type: 'filed', date: '2099-01-01', radicado: 'demo' }).success,
    ).toBe(false);
    expect(
      caseEventSchema.safeParse({ type: 'filed', date: '2026-07-16', radicado: '' }).success,
    ).toBe(false);
  });
  it('does not interpret an unrecorded response as a legal violation', () => {
    const c = {
      estimate_state: 'estimated',
      current_filing_id: 'filing',
      filings: [{ id: 'filing', due_date: '2026-07-31' }],
    } as CaseRecord;
    expect(caseStatus(c, parseISODate('2026-08-10')).label).toBe('No has registrado una respuesta');
    expect(caseStatus({ ...c, estimate_state: 'uncertain' }).description).not.toContain('31');
  });
});
