import { describe, expect, it } from 'vitest';

(globalThis as unknown as { location: { search: string; hash: string } }).location ??= { search: '', hash: '' };
const { t } = await import('./t');
const { localizeValue } = await import('./codes');

const latin = (s: string) => s.replace(/\b(R\d+|PTCC|AFC|CCTV|T-Box|AI|\d[\d.,:-]*)\b/g, '').match(/[A-Za-z]{2,}/g) ?? [];

describe('technical codes inside Mongolian sentences', () => {
  it('translates the rule line an operator reads on every alert', () => {
    const s = t('alerts.threshold', 'mn', { rule: 'service_gap', value: '42', threshold: '20', unit: ' min' });
    expect(latin(s)).toEqual([]);
    expect(s).toContain('үйлчилгээний завсар');
    expect(s).toContain('мин');
  });

  it('handles alert ids, stage moves, source tables and segment names', () => {
    expect(localizeValue('service_gap:R18', 'mn')).toBe('үйлчилгээний завсар · R18');
    expect(localizeValue('delay_network:net', 'mn')).toBe('сүлжээний хоцролт · сүлжээ');
    expect(localizeValue('advance:response_monitoring', 'mn')).toBe('шат ахиулсан: хариу арга хэмжээний хяналт');
    expect(localizeValue('Table 11', 'mn')).toBe('Хүснэгт 11');
    expect(localizeValue('3rd & 4th Khoroolol – Bayangol', 'mn')).toBe('3, 4-р хороолол – Баянгол');
    expect(localizeValue('Bayangol 5', 'mn')).toBe('Баянгол 5');
  });

  it('splits " · " composites, reads equipment ids and citation words', () => {
    expect(localizeValue('equipment_afc:2-150', 'mn')).toBe('төлбөрийн систем тасарсан · 2-150');
    expect(localizeValue('L1053-L1055 · Table 11', 'mn')).toBe('L1053-L1055 · Хүснэгт 11');
    expect(localizeValue('Design document · Tables 9-14 (L1003-L1163)', 'mn')).toBe('Зураг төсөл · Хүснэгт 9-14 (L1003-L1163)');
    expect(localizeValue('Slide 5 · client decision', 'mn')).toBe('Слайд 5 · захиалагчийн шийдвэр');
    expect(localizeValue('agent framing · rules L1175 · Table 9', 'mn')).toBe('агентын загвар — бидний санал · дүрэм L1175 · Хүснэгт 9');
    expect(localizeValue('B. Otgonbayar', 'mn')).toBe('Б. Отгонбаяр');
    expect(localizeValue('L1053-L1055 · Table 11', 'en')).toBe('L1053-L1055 · Table 11');
  });

  it('leaves English, data ids and unknown text untouched', () => {
    expect(localizeValue('service_gap', 'en')).toBe('service_gap');
    expect(localizeValue('R7', 'mn')).toBe('R7');
    expect(localizeValue('3-015', 'mn')).toBe('3-015');
    expect(t('alerts.threshold', 'en', { rule: 'service_gap', value: '42', threshold: '20', unit: ' min' })).toContain('service_gap');
  });
});
