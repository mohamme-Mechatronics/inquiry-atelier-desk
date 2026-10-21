import { describe, expect, it } from 'vitest';
import fixture from './fixtures/bot-pdf-continuation.json';

const validators = ['Validate WhatsApp Media ID', 'Validate Study Media Response', 'Validate SLD Media Response'] as const;
function run(name: typeof validators[number] | 'Validate Quote Send Response', channel: string, json: Record<string, unknown>) {
  const item = { json };
  return new Function('$input', '$', 'items', fixture.nodes[name].jsCode)(
    { first: () => item }, () => ({ first: () => ({ json: { phone_number_id: channel } }) }), [item],
  );
}

describe('Combined bot document continuation', () => {
  for (const name of validators) {
    it(`${name} accepts a confirmed Telegram PDF`, () => {
      const result = run(name, 'tg', { ok: true, result: { message_id: 18, document: { file_id: 'test-file' } } });
      expect(result[0].json.id).toBe('test-file');
      expect(result[0].json.messages).toEqual([{ id: 'tg:18' }]);
    });
    it(`${name} retains WhatsApp upload behavior`, () => {
      expect(run(name, 'wa', { id: 'meta-media' })[0].json.id).toBe('meta-media');
      expect(() => run(name, 'wa', { ok: true })).toThrow('WHATSAPP MEDIA UPLOAD FAILED');
    });
    it(`${name} rejects Telegram errors and getMe responses`, () => {
      expect(() => run(name, 'tg', { ok: false })).toThrow('TELEGRAM DOCUMENT SEND FAILED');
      expect(() => run(name, 'tg', { ok: true, result: { id: 123 } })).toThrow('TELEGRAM DOCUMENT SEND FAILED');
    });
  }
  it('validates the quote receipt after normalization', () => {
    const [item] = run(validators[0], 'tg', { ok: true, result: { message_id: 18, document: { file_id: 'test-file' } } });
    expect(run('Validate Quote Send Response', 'tg', item.json)[0].json.messages[0].id).toBe('tg:18');
    expect(run('Validate Quote Send Response', 'wa', { messages: [{ id: 'meta-message' }] })[0].json.messages[0].id).toBe('meta-message');
  });
  for (const [label, next, send] of [['Quote', 'Validate Quote Send Response', 'Send Quote PDF'], ['Study', 'Customer Make SLD?', 'Study Send PDF'], ['SLD', 'Has Reply?', 'SLD Send PDF']]) {
    it(`${label} skips a second send on Telegram and keeps WhatsApp sending`, () => {
      const connections = fixture.connections as Record<string, { main: { node: string }[][] }>;
      const gate = connections[`${label} Already Sent On Telegram?`];
      expect(gate.main[0].map(edge => edge.node)).toContain(next);
      expect(gate.main[0].map(edge => edge.node)).not.toContain(send);
      expect(gate.main[1].map(edge => edge.node)).toEqual([send]);
    });
  }
});