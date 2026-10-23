import { describe, expect, it } from 'vitest';
import rows from './fixtures/bot-catalog.json';
import workflow from './fixtures/bot-agricultural-pumps.json';
import { catalogGroup } from '../lib/catalog-groups';

function literal(name: string): unknown {
  const match = new RegExp(`\\bvar\\s+${name}\\s*=`).exec(workflow.stateMachine);
  if (!match) throw new Error(`Missing ${name} in delivered bot`);
  const source = workflow.stateMachine.slice(match.index + match[0].length).trimStart();
  let depth = 0, quoted = false, escaped = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) return JSON.parse(source.slice(0, i + 1));
    }
  }
  throw new Error(`Incomplete ${name}`);
}

describe('Imported bot catalog', () => {
  it('contains every unique selectable bot product at its effective bot price', () => {
    const categories = literal('ITEM_CATS') as Record<string, { items: [string, string, string, number, ...unknown[]][] }>;
    const mapping = literal('ACTES_KEYMAP') as Record<string, string>;
    const prices = literal('ITEM_PRICES') as Record<string, number>;
    const expected = new Map<string, {code: string; name: string; unit: string; price: number; specs: string[]}>();
    for (const category of Object.values(categories)) {
      for (const [key, name, unit, price] of category.items) {
        const code = mapping[key] ?? key;
        if (!expected.has(code)) expected.set(code, { code, name, unit, price: prices[key] ?? price, specs: [] });
      }
    }
    expect(rows).toHaveLength(41);
    expect(rows).toEqual([...expected.values()]);
  });
  it('keeps storage cabinets, racks and protection out of battery groups', () => {
    expect(catalogGroup('ess:cab:112', 'كبينة بطارية هيثيوم')).toBe('الكبائن');
    expect(catalogGroup('ess:rack:104', 'راك بطارية بايلونتك')).toBe('الراكات');
    expect(catalogGroup('bat_protect_dc1500_250a', 'صندوق حماية بطاريات')).toBe('صناديق حماية DC');
  });
});