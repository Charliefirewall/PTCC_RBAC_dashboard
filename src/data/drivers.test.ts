import { describe, expect, it } from 'vitest';
import { driverOf, maskName } from './drivers';

describe('driver placeholders (E17)', () => {
  it('masks all but the first five letters of the name, keeping the initial', () => {
    expect(maskName('B. Bat-Erdene')).toBe('B. Bat-E*****');
    expect(maskName('G. Бат-Эрдэнэ')).toBe('G. Бат-Э*****');
    expect(maskName('C. Sanjaa')).toBe('C. Sanja*');
    expect(maskName('D. Bat')).toBe('D. Bat');
  });

  it('is deterministic per driver id', () => {
    expect(driverOf('D-1042', 'A')).toEqual(driverOf('D-1042', 'A'));
  });
});
