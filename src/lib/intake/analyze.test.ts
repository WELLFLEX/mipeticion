import { it, expect } from 'vitest';
import fixture from '../../../tests/fixtures/routing-100.json';
import { analizarRelato } from './analyze';
it('evaluates 100 labeled synthetic cases without forcing explicit exclusions', () => {
  expect(fixture.cases).toHaveLength(100);
  const failures = fixture.cases.flatMap((c, i) => {
    const result = analizarRelato(c);
    const ok =
      result.status === c.status &&
      (c.status !== 'supported' ||
        (result.candidates[0]?.entitySlug === c.entity && result.pathway === c.pathway));
    return ok
      ? []
      : [
          {
            id: i + 1,
            expected: c.status + ' / ' + c.entity + ' / ' + c.pathway,
            actual: result,
            story: c.quePaso,
          },
        ];
  });
  expect(failures).toEqual([]);
});
