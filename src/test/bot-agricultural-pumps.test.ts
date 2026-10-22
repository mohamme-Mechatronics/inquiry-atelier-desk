import { describe, expect, it } from 'vitest';
import fixture from './fixtures/bot-agricultural-pumps.json';

// Dynamic n8n payloads are intentionally executed as-is, outside app DTO types.
type Row = any;
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const execute = new AsyncFunction('$', '$input', '$getWorkflowStaticData', 'Buffer', fixture.stateMachine);
const executeCrm = new AsyncFunction('$', fixture.crmLog);
const BOM = ['panel', 'vfd', 'dc_protection', 'motor_protection', 'cable', 'earthing', 'installation'];
function catalog(): Row {
  const ITEMS: Row = {};
  for (const role of BOM) ITEMS[`PUMP_TEST_${role}`] = {
    name: role === 'vfd' ? 'إنفرتر غطاسات 7.5 كيلو VFD' : `Test ${role}`,
    price: role === 'vfd' ? 500 : 100, unit: 'حبة', specs: [],
  };
  ITEMS.PUMP_PACKAGE_TEST = { name: 'Test approved pump package', price: null, specs: [
    'PUMP_CONFIG=' + JSON.stringify({ approved: true, approvalRef: 'TEST-ONLY-NOT-A-REAL-PRICE', validUntil: '2099-12-31',
      voltage: 380, phase: 3, minMotorKw: 3, maxMotorKw: 7.5, minCurrent: 1, maxCurrent: 20,
      minHead: 20, maxHead: 150, minFlow: 1, maxFlow: 20, maxDepth: 200,
      maxCable: 250, maxHours: 8, sources: ['1','2'],
      bom: BOM.map(role => ({ code: `PUMP_TEST_${role}`, qty: role === 'panel' ? 12 : 1, role })) }),
  ] };
  return { ITEMS };
}
async function run(session: Row, text: string, channel = 'tg', cat = catalog()): Promise<Row> {
  const parsed = { text, phone: channel === 'tg' ? 'test-telegram-chat' : '967700000000',
    phone_number_id: channel, message_id: 'test-message-100' };
  const state: Row = {};
  const selector = (name: string) => ({ first: () => ({ json: name === 'Get Session' ? session : parsed }) });
  const [item] = await execute.call({ helpers: { httpRequest: async (r: Row) => r.method === 'GET' ? cat : { ok: true } } },
    selector, { first: () => ({json: parsed}) }, () => state, Buffer);
  return item.json;
}
const inputs = ['محمد المزارع', 'ذمار - مزرعة الاختبار', '1', '7.5', '1', '12', '80', '100', '10', '6', '1', '120'];
async function journey(channel = 'tg', cat = catalog()) {
  let s = await run({ step: 'menu_sys3' }, '4', channel, cat);
  expect(s.step).toBe('pump_name');
  for (const value of inputs) s = await run(s, value, channel, cat);
  return s;
}
describe('Agricultural pump quotation and payment', { timeout: 30000 }, () => {
  for (const channel of ['tg','wa']) {
    it(`${channel}: farm data to formal quote, editing, and cash on delivery`, async () => {
      let s = await journey(channel);
      expect(s.step).toBe('pump_result');
      expect(s.system_type).toBe('a_pump');
      s = await run(s, 'pump_issue', channel);
      expect(s.send_quote_file).toBe(true);
      expect(s.step).toBe('pump_after');
      expect(s.canonical_quote.items).toHaveLength(7);
      expect(s.grand_total).toBe(2200);
      expect(s.project_type.split('|')[3]).toBe('2200');
      const first = s.quote_number;
      s = await run(s, 'aq_mod', channel);
      expect(s.step).toBe('pump_edit');
      s = await run(s, '3', channel);
      s = await run(s, 'pump_pkg_0', channel);
      s = await run(s, 'pump_issue', channel);
      expect(s.quote_number).toBe(`${first}-V2`);
      s = await run(s, 'aq_buy', channel);
      expect(s.step).toBe('buy_name');
      s = await run(s, 'محمد المزارع', channel);
      expect(s.step).toBe('pay_method');
      s = await run(s, 'pay_cod', channel);
      expect(s.step).toBe('done');
      expect(s.service_needed).toBe('الدفع عند الاستلام');
      expect(s.notify_employee).toBe(true);
    });
    for (const [method,label] of [['pay_network','حوالة شبكة محلية'], ['pay_wallet','محفظة إلكترونية']] as const) {
      it(`${channel}: ${method} receives a receipt, never auto-confirms payment`, async () => {
        let s = await journey(channel);
        s = await run(s, 'pump_issue', channel);
        s = await run(s, 'aq_buy', channel);
        s = await run(s, 'محمد المزارع', channel);
        s = await run(s, method, channel);
        expect(s.step).toBe('pay_notice');
        expect(s.service_needed).toBe(label);
        s = await run(s, 'تحويل تجريبي رقم TEST-123', channel);
        expect(s.step).toBe('done');
        const calls: Row[] = [];
        await executeCrm.call({ helpers: { httpRequest: async (r: Row) => { calls.push(r); return {ok:true}; } } },
          (name: string) => ({ first: () => ({json: name === 'State Machine' ? s : name === 'Parse Message' ? {text:'TEST receipt'} : {}}) }));
        const saved = calls[0];
        if (!saved) throw new Error('Missing order callback');
        expect(saved.body.invoice_no).toBe(s.quote_number);
        expect(saved.body.amount).toBe('2200 $');
        expect(saved.body.method).toBe(label);
        expect(saved.body.details).toContain('بانتظار تحقق الحسابات');
      });
    }
  }
  it('does not invent a VFD price or allow payment without an approved package', async () => {
    let s = await journey('tg', {ITEMS:{}});
    expect(s.step).toBe('pump_review');
    expect(s.pump_event).toBe('review');
    s = await run(s, 'aq_buy', 'tg', {ITEMS:{}});
    expect(s.step).toBe('pump_review');
    expect(s.send_quote_file).toBe(false);
  });
  it('unknown nameplate data and night operation require engineering review', async () => {
    let s = await run({step:'menu_sys3'}, '4');
    for (const value of inputs.map((v,i) => i === 5 ? 'لا أعرف' : v)) s = await run(s, value);
    expect(s.step).toBe('pump_review');
    s = await journey();
    s.step = 'pump_source';
    s = await run(s, '3');
    s = await run(s, '120');
    expect(s.step).toBe('pump_review');
  });
  it('rejects hybrid/battery BOMs and expired approvals', async () => {
    const cat = catalog();
    cat.ITEMS.PUMP_TEST_vfd.name = 'بطارية هايبرد';
    expect((await journey('tg',cat)).step).toBe('pump_review');
    const expired = catalog();
    expired.ITEMS.PUMP_PACKAGE_TEST.specs[0] = expired.ITEMS.PUMP_PACKAGE_TEST.specs[0].replace('2099-12-31','2020-01-01');
    expect((await journey('tg',expired)).step).toBe('pump_review');
  });
  it('keeps Arabic decimal input and back-one-step functional', async () => {
    let s = await run({step:'pump_power', main_loads:'PUMP:{"unit":"HP"}',menu_choice:'4'}, '٧٫٥');
    expect(s.pump_capacity).toBe('7.5');
    expect(s.step).toBe('pump_voltage');
    s = await run(s, '00');
    expect(s.step).toBe('pump_power');
    s = await run(s, '-3');
    expect(s.step).toBe('pump_power');
  });
  it('records the engineering request in the agricultural orders category', async () => {
    const s = await journey('tg',{ITEMS:{}}), calls: Row[] = [];
    await executeCrm.call({helpers:{httpRequest:async (r:Row) => {calls.push(r);return {ok:true};}}},
      (name:string) => ({first:() => ({json:name==='State Machine'?s:{}})}));
    expect(calls[0].body.method).toBe('مراجعة هندسية');
    expect(calls[0].body.amount).toBeNull();
    expect(calls[0].body.details).toContain('زراعي / غطاسات');
  });
  it('rejects malformed BOMs rather than crashing', async () => {
    const cat = catalog();
    cat.ITEMS.PUMP_PACKAGE_TEST.specs[0] = cat.ITEMS.PUMP_PACKAGE_TEST.specs[0].replace('"bom":[', '"bom":[null,');
    expect((await journey('tg',cat)).step).toBe('pump_review');
  });
  it('requires a new quotation after equipment prices change even on the payment screen', async () => {
    let s = await journey();
    s = await run(s, 'pump_issue');
    s = await run(s, 'aq_buy');
    s = await run(s, 'محمد المزارع');
    const changed = catalog(); changed.ITEMS.PUMP_TEST_vfd.price = 600;
    s = await run(s, 'pay_network', 'tg', changed);
    expect(s.step).toBe('pump_result');
    expect(s.send_quote_file).toBe(false);
    s = await run(s, 'pump_issue', 'tg', changed);
    expect(s.grand_total).toBe(2300);
  });
});