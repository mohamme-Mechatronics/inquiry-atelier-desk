"""Build v46 from v45 while retaining the user's configured connections privately."""
import json
import pathlib
import re
import uuid

root = pathlib.Path(__file__).resolve().parents[3]
workflow = json.loads((root / 'releases/bot/Tamkeen_Bot_v45_WhatsApp_Telegram.json').read_text())
nodes = {n['name']: n for n in workflow['nodes']}
code = nodes['State Machine']['parameters']['jsCode']
module = (root / 'releases/bot/source/agricultural-pumps.js').read_text()

def replace(old, new):
    global code
    if old not in code:
        raise RuntimeError('Missing expected state-machine insertion point: ' + old[:70])
    code = code.replace(old, new)

replace("let extra_payloads = [];", "let extra_payloads = [];\nvar pump_event = '';\n" + module)
replace("3 - الصناعي'", "3 - الصناعي\\n4 - غطاسات وآبار زراعية'")
replace("else if (text === '3') { menu_choice = '3'; indInit(''); customer_name = ''; city = ''; step = 'ind_activity'; response = indActivityAsk(); }\n  else", "else if (text === '3') { menu_choice = '3'; indInit(''); customer_name = ''; city = ''; step = 'ind_activity'; response = indActivityAsk(); }\n  else if (text === '4' || text === 'pump_start') { pumpStart(); }\n  else")
replace("else if (text === '2') { menu_choice = '4'; step = 'agr_bill'; response = billAsk('4'); }", "else if (text === '2') { pumpStart(); }")
replace("} else if ((/^qm_/.test(String(text))", "} else if (String(step).indexOf('pump_') === 0 || (menu_choice === '4' && text === 'aq_mod')) {\n  pumpHandle();\n} else if ((/^qm_/.test(String(text))")
replace("function prevStepOf(st) {\n  st = String(st || '');", "function prevStepOf(st) {\n  st = String(st || '');\n  if (st.indexOf('pump_') === 0) { var i = PUMP_STEPS.indexOf(st); return i > 0 ? PUMP_STEPS[i - 1] : (st === 'pump_name' ? 'menu_sys3' : 'pump_result'); }")
replace("function askForStep(st) {\n  st = String(st || '');", "function askForStep(st) {\n  st = String(st || '');\n  if (st.indexOf('pump_') === 0) return pumpAsk(st);")
replace("function uiForStepBase(st) {", "function uiForStepBase(st) {\n  if (st.indexOf('pump_') === 0) return pumpUi(st);")
replace("return { kind: 'buttons', buttons: en ? SUB_SYS3_EN : SUB_SYS3_AR };", "return { kind: 'list', button: 'نوع المنظومة', sections: [{ title: 'منظومات تمكين', rows: [{id:'1',title:'السكني'},{id:'2',title:'التجاري'},{id:'3',title:'الصناعي'},{id:'4',title:'غطاسات وآبار زراعية'}] }] };")
replace("} else if (followup_kind === 'qnext') {\n  //", "} else if (followup_kind === 'pump') {\n  followup_payload = buildPayload(pumpAsk('pump_after'), 'pump_after');\n} else if (followup_kind === 'qnext') {\n  //")
# Pump modifications never enter generic hybrid inverter/battery editing or reports.
replace("quote_number = String(quote_context.quote_number);", "quote_number = String(quote_context.quote_number);")
# Persist the actual final canonical price after live catalog normalization.
replace("var canonical_quote = {", "if (send_quote_file && quote_number && canonical_items.length) {\n  __quote_total = canonical_total;\n  project_type = 'Q|' + quote_number + '|' + (quote_file_url || '') + '|' + canonical_total + '|QS=' + packQuoteContext(quote_number, canonical_items);\n}\nvar canonical_quote = {")
replace(" canonical_quote: canonical_quote,", " pump_event: pump_event,\n canonical_quote: canonical_quote,")
nodes['State Machine']['parameters']['jsCode'] = code

# Keep phase selection in the persisted session used by payment and quotation.
upsert = nodes['Upsert Session']['parameters']['jsCode']
upsert = upsert.replace('"cart"]', '"cart", "phase_type"]')
nodes['Upsert Session']['parameters']['jsCode'] = upsert

# Log engineering requests and all agricultural payment submissions to admin orders.
crm = nodes['Build CRM Log']['parameters']['jsCode']
start = crm.index('if (_isNotice) {')
end = crm.index('\nconst base =', start)
old = crm[start:end]
headers = re.search(r"headers: (\{[^\n]+\})", old).group(1)
crm = crm[:start] + '''if (B.menu_choice === '4' && (B.pump_event || (_st === 'done' && B.notify_employee && _pay))) {
  const rawQuote = String(B.project_type || '').split('|');
  const quote = B.quote_number || (rawQuote[0] === 'Q' ? rawQuote[1] : null);
  const amount = rawQuote[0] === 'Q' && Number(rawQuote[3]) > 0 ? rawQuote[3] + ' $' : null;
  const details = String(B.notification_text || 'طلب زراعي / غطاسات') + '\\nفرع زراعي / غطاسات' + (B.pump_event ? '\\nبانتظار مراجعة مهندس' : '\\nإشعار تسديد: بانتظار تحقق الحسابات');
  const result = await this.helpers.httpRequest({ method: 'POST',
    url: 'https://inquiry-atelier-desk.lovable.app/api/public/bot-order',
    headers: HEADERS,
    body: { phone, name: B.customer_name || null, city: B.city || null, invoice_no: quote,
      amount, method: B.pump_event === 'visit' ? 'زيارة ميدانية' : (B.pump_event ? 'مراجعة هندسية' : _pay), details: details.slice(0,3900) },
    json: true, timeout: 10000 });
  if (!result || result.ok !== true) throw new Error('AGRICULTURAL ORDER LOG FAILED');
} else '''.replace('HEADERS', headers) + old + crm[end:]
nodes['Build CRM Log']['parameters']['jsCode'] = crm

# Apply the existing credential-free regression fix to the actual delivered workflow.
fixture = json.loads((root / 'src/test/fixtures/bot-pdf-continuation.json').read_text())
for name, params in fixture['nodes'].items():
    if name in nodes:
        nodes[name]['parameters'] = params
    else:
        typ = 'n8n-nodes-base.if' if 'conditions' in params else 'n8n-nodes-base.code'
        node = {'id': str(uuid.uuid4()), 'name': name, 'type': typ,
                'typeVersion': 2.2 if typ.endswith('.if') else 2, 'parameters': params,
                'position': [2400, 1700 + len(workflow['nodes']) * 15]}
        workflow['nodes'].append(node); nodes[name] = node
for name in ['Validate WhatsApp Media ID','Quote Already Sent On Telegram?',
             'Study Upload PDF','Validate Study Media Response','Study Already Sent On Telegram?',
             'SLD Upload PDF','Validate SLD Media Response','SLD Already Sent On Telegram?']:
    if name in fixture['connections']:
        workflow['connections'][name] = fixture['connections'][name]

# Agricultural financial notifications live in admin; don't route customer media IDs
# into another channel. Existing non-agricultural routing is retained unchanged.
extra = nodes['Split Extra Msgs']['parameters']['jsCode']
nodes['Split Extra Msgs']['parameters']['jsCode'] = "const b = $('State Machine').first().json;\nif (b.menu_choice === '4') return (b.extra_payloads || []).filter(p => String(p.to || '') === String(b.phone)).map(p => ({json:p}));\n" + extra

workflow['name'] = 'Tamkeen Bot v46 - WhatsApp + Telegram + Agricultural Pumps'
workflow['active'] = False
target = root / 'releases/bot/Tamkeen_Bot_v46_WhatsApp_Telegram_Pumps.json'
target.write_text(json.dumps(workflow, ensure_ascii=False, indent=2))

# Credential-free fixtures execute the exact generated state machine and CRM logic.
def clean(text):
    text = re.sub(r"('x-bot-secret'\s*:\s*)'[^']+'", r"\1'TEST_BOT_SECRET'", text)
    return re.sub(r"(SUP_TICKET_SECRET\s*=\s*)'[^']+'", r"\1'TEST_BOT_SECRET'", text)
test_fixture = {'stateMachine': clean(code), 'crmLog': clean(crm)}
(root / 'src/test/fixtures/bot-agricultural-pumps.json').write_text(json.dumps(test_fixture, ensure_ascii=False, indent=2))
print('Generated v46 workflow, agricultural fixture, and PDF continuation fixes.')