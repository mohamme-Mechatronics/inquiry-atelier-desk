// Injected into the n8n State Machine. No credentials or invented equipment prices.
// PUMP_PACKAGE_* catalog rows contain a PUMP_CONFIG=<JSON> specification line.
// Packages require explicit engineering approval and a complete priced bill of materials.
function pumpRead() {
  try { return JSON.parse(String(main_loads || '').replace(/^PUMP:/, '')); }
  catch (e) { return {}; }
}
function pumpWrite(p) { main_loads = 'PUMP:' + JSON.stringify(p); }
function pumpStart() {
  menu_choice = '4'; system_type = 'a_pump'; project_type = ''; city = '';
  service_needed = ''; quote_context = null; quote_number = ''; pumpWrite({});
  step = 'pump_name'; response = pumpAsk(step);
}
function pumpNumber(t) {
  var v = normalizeInputDigits(String(t || '')).trim().replace(',', '.');
  return /^\d+(?:\.\d+)?$/.test(v) ? Number(v) : NaN;
}
var PUMP_STEPS = ['pump_name', 'pump_location', 'pump_power_unit', 'pump_power',
  'pump_voltage', 'pump_current', 'pump_depth', 'pump_head', 'pump_flow',
  'pump_hours', 'pump_source', 'pump_cable', 'pump_result'];
function pumpAsk(st) {
  var q = {
    pump_name: 'اكتب اسم صاحب المزرعة.',
    pump_location: 'اكتب المحافظة والمنطقة واسم المزرعة أو موقع البئر.',
    pump_power_unit: 'ما وحدة قدرة الغطاس المكتوبة على لوحة المحرك؟\n1 - حصان HP\n2 - كيلووات kW\n3 - لا أعرف / مراجعة لوحة المحرك',
    pump_power: 'اكتب قدرة الغطاس بالأرقام حسب الوحدة المختارة (مثال: 7.5).',
    pump_voltage: 'اختر جهد الغطاس وعدد الفازات:\n1 - ثلاثي 380V\n2 - ثلاثي 400V\n3 - أحادي 220V',
    pump_current: 'اكتب التيار المقنن من لوحة المحرك بالأمبير، أو «لا أعرف».',
    pump_depth: 'اكتب عمق تركيب الغطاس بالمتر، أو «لا أعرف».',
    pump_head: 'اكتب الارتفاع الديناميكي الكلي TDH بالمتر (منسوب الضخ + الارتفاع + خسائر الأنابيب)، أو «لا أعرف». عمق البئر وحده لا يكفي لتحديد التدفق.',
    pump_flow: 'اكتب كمية المياه المطلوبة بالمتر المكعب في الساعة، أو «لا أعرف».',
    pump_hours: 'كم ساعة تشغيل تحتاج يومياً؟ اكتب رقماً من 1 إلى 24.',
    pump_source: 'اختر مصدر التشغيل:\n1 - شمسي نهاري بدون بطاريات\n2 - شمسي مع شبكة / مولد احتياطي\n3 - أحتاج تشغيل ليلي',
    pump_cable: 'اكتب طول الكابل من الإنفرتر إلى الغطاس بالمتر (شاملاً النزول في البئر)، أو «لا أعرف».',
    pump_review: 'بيانات المزرعة وصلت للإدارة للمراجعة الهندسية والتسعير. لا يوجد عرض معتمد ومتوافق بعد، ولن نطلب تحويل أي مبلغ قبل اعتماده.\n1 - إعادة فحص العروض المعتمدة\n2 - تعديل البيانات\n3 - طلب معاينة مهندس',
    pump_result: '1 - إصدار عرض السعر الرسمي\n2 - تعديل بيانات الغطاس\n3 - طلب معاينة مهندس',
    pump_after: 'اختر الإجراء التالي: متابعة الشراء، تعديل المنظومة، أو طلب مهندس.',
    pump_edit: 'اختر ما تريد تعديله:\n1 - قدرة الغطاس\n2 - بيانات الموقع والتشغيل\n3 - اختيار منظومة معتمدة أخرى',
    pump_packages: 'اختر من المنظومات المعتمدة المتوافقة مع بيانات الغطاس.'
  };
  return W('منظومات الغطاسات والآبار الزراعية\n' + SEP + '\n' + (q[st] || q.pump_result));
}
function pumpUi(st) {
  if (st === 'pump_power_unit') return { kind: 'buttons', buttons: [
    { id: '1', title: 'حصان HP' }, { id: '2', title: 'كيلووات kW' }, { id: '3', title: 'لا أعرف' }] };
  if (st === 'pump_voltage') return { kind: 'buttons', buttons: [
    { id: '1', title: '380V ثلاثي' }, { id: '2', title: '400V ثلاثي' }, { id: '3', title: '220V أحادي' }] };
  if (st === 'pump_source') return { kind: 'buttons', buttons: [
    { id: '1', title: 'شمسي نهاري' }, { id: '2', title: 'شبكة / مولد' }, { id: '3', title: 'تشغيل ليلي' }] };
  if (st === 'pump_result') return { kind: 'buttons', buttons: [
    { id: 'pump_issue', title: 'عرض سعر رسمي' }, { id: 'pump_edit', title: 'تعديل البيانات' }, { id: 'pump_visit', title: 'معاينة مهندس' }] };
  if (st === 'pump_review') return { kind: 'buttons', buttons: [
    { id: 'pump_retry', title: 'فحص الاعتماد' }, { id: 'pump_edit', title: 'تعديل البيانات' }, { id: 'pump_visit', title: 'معاينة مهندس' }] };
  if (st === 'pump_after') return { kind: 'buttons', buttons: [
    { id: 'aq_buy', title: 'متابعة الشراء' }, { id: 'aq_mod', title: 'تعديل المنظومة' }, { id: 'pump_visit', title: 'طلب مهندس' }] };
  if (st === 'pump_edit') return { kind: 'buttons', buttons: [
    { id: '1', title: 'قدرة الغطاس' }, { id: '2', title: 'الموقع والتشغيل' }, { id: '3', title: 'منظومة أخرى' }] };
  if (st === 'pump_packages') {
    var opts = pumpPackages(pumpRead()).slice(0, 9);
    return { kind: 'list', button: 'المنظومات المعتمدة', sections: [{ title: 'غطاسات / بدون بطاريات', rows:
      opts.map(function (o, i) { return { id: 'pump_pkg_' + i, title: truncate(o.name, 24), description: money(o.total) + ' $' }; })
        .concat([{ id: 'back_step', title: 'العودة خطوة' }]) }] };
  }
  return null;
}
function pumpSummary(p) {
  return 'العميل: ' + customer_name + '\nالمزرعة: ' + city + '\nقدرة الغطاس: ' +
    (p.power || 'غير معروفة') + ' ' + (p.unit || '') +
    '\nالجهد: ' + (p.voltage || '-') + 'V / ' + (p.phase || '-') + ' فاز' +
    '\nالتيار المقنن: ' + (p.current || 'غير معروف') + ' A' +
    '\nعمق التركيب: ' + (p.depth || 'غير معروف') + ' م' +
    '\nTDH: ' + (p.head || 'غير معروف') + ' م / التدفق المطلوب: ' + (p.flow || 'غير معروف') + ' م³/ساعة' +
    '\nالتشغيل: ' + (p.hours || '-') + ' ساعة / المصدر: ' + ({'1':'شمسي نهاري','2':'شبكة / مولد','3':'تشغيل ليلي'}[p.source] || '-') +
    '\nطول الكابل: ' + (p.cable || 'غير معروف') + ' م';
}
function pumpPackages(p) {
  // Match only complete engineer-approved packages; do not size a VFD from HP alone.
  if (!(p.power > 0 && p.current > 0 && p.depth > 0 && p.head > 0 && p.flow > 0 && p.cable > 0 && p.hours > 0) || p.source === '3') return [];
  var I = (_cat && _cat.ITEMS) || {}, out = [];
  for (var key in I) {
    if (!/^PUMP_PACKAGE_/.test(key)) continue;
    var row = I[key], c = null;
    try {
      var line = (row.specs || []).find(function (s) { return String(s).indexOf('PUMP_CONFIG=') === 0; });
      c = JSON.parse(String(line || '').slice(12));
    } catch (e) { continue; }
    if (!c || c.approved !== true || !c.approvalRef || !c.validUntil || Date.parse(c.validUntil + 'T23:59:59Z') < Date.parse(now) || !Number.isFinite(Date.parse(c.validUntil + 'T23:59:59Z'))) continue;
    var ranges = ['minMotorKw','maxMotorKw','minCurrent','maxCurrent','minHead','maxHead','minFlow','maxFlow','maxDepth','maxCable','maxHours'];
    if (ranges.some(function (n) { return typeof c[n] !== 'number' || !Number.isFinite(c[n]) || c[n] <= 0; })) continue;
    var kw = p.unit === 'HP' ? p.power * 0.746 : p.power;
    if (c.voltage !== p.voltage || c.phase !== p.phase || !Array.isArray(c.sources) || c.sources.indexOf(p.source) < 0 ||
      kw < c.minMotorKw || kw > c.maxMotorKw || p.current < c.minCurrent || p.current > c.maxCurrent ||
      p.head < c.minHead || p.head > c.maxHead || p.flow < c.minFlow || p.flow > c.maxFlow ||
      p.depth > c.maxDepth || p.cable > c.maxCable || p.hours > c.maxHours) continue;
    if (!Array.isArray(c.bom) || !c.bom.length) continue;
    var items = [], roles = {}, valid = true, total = 0;
    c.bom.forEach(function (b) {
      var r = I[b.code];
      if (!r || !r.name || typeof r.price !== 'number' || !Number.isFinite(r.price) || r.price <= 0 ||
        !Number.isFinite(b.qty) || b.qty <= 0 || /بطاري|battery|ess|bms/i.test(b.code + ' ' + r.name)) { valid = false; return; }
      roles[b.role] = true;
      var t = Math.round(b.qty * r.price * 100) / 100; total += t;
      items.push({ key: b.code, name: r.name, details: (r.specs || []).filter(function (s) { return !/^PUMP_CONFIG=/.test(s); }), unit: r.unit || 'حبة', qty: b.qty, price: r.price, total: t });
    });
    if (['panel','vfd','dc_protection','motor_protection','cable','earthing','installation'].some(function (r) { return !roles[r]; })) valid = false;
    if (!valid) continue;
    out.push({ key: key, name: row.name, config: c, items: items, total: Math.round(total * 100) / 100 });
  }
  return out.sort(function (a,b) { return a.total - b.total || a.key.localeCompare(b.key); });
}
function pumpInvalidate(p) {
  delete p.package; project_type = ''; quote_context = null; quote_number = '';
  pumpWrite(p);
}
function pumpResult() {
  var p = pumpRead(), opts = pumpPackages(p), found = opts.find(function (o) { return o.key === p.package; }) || opts[0];
  if (!found) {
    step = 'pump_review'; response = W(pumpSummary(p)) + '\n\n' + pumpAsk(step);
    notify_employee = true; notification_text = 'طلب زراعي / غطاسات للمراجعة الهندسية\n' + pumpSummary(p);
    pump_event = 'review'; return;
  }
  p.package = found.key; pumpWrite(p); step = 'pump_result';
  response = W(pumpSummary(p) + '\n' + SEP + '\nالمنظومة المعتمدة: ' + found.name + '\nمرجع الاعتماد: ' + found.config.approvalRef +
    '\nالإجمالي: ' + money(found.total) + ' $\nبدون بطاريات. الإنتاج والتدفق الفعلي يعتمدان على الموقع ومنحنى المضخة؛ لا نضمن ساعات تشغيل ثابتة من قدرة الألواح وحدها.') + '\n' + pumpAsk(step);
}
function pumpIssue() {
  var p = pumpRead(), found = pumpPackages(p).find(function (o) { return o.key === p.package; });
  if (!found) { pumpResult(); return; }
  var old = p.quote || '', base = old.replace(/-V\d+$/, '');
  quote_number = old ? base + '-V' + ((Number((old.match(/-V(\d+)$/) || [])[1]) || 1) + 1) :
    'TMK-AGR-' + now.replace(/\D/g, '').slice(0, 17) + '-' + String(message_id || phone).replace(/\W/g, '').slice(-8);
  p.quote = quote_number; pumpWrite(p);
  quote_items = found.items; __quote_total = found.total; item_quote = true; send_quote_file = true;
  quote_file_name = 'عرض سعر ' + quote_number + '.pdf'; quote_file_url = '';
  quote_caption = 'عرض سعر ' + quote_number + ' — زراعي / غطاسات';
  quote_items[0].details = quote_items[0].details.concat(pumpSummary(p).split('\n'), ['اعتماد هندسي: ' + found.config.approvalRef, 'منظومة غطاسات بدون بطاريات']);
  step = 'pump_after'; followup_kind = 'pump';
  response = W('تم تجهيز عرض السعر الزراعي ' + quote_number + '\nالإجمالي: ' + money(found.total) + ' $\nجاري إرسال ملف PDF.');
  notify_employee = true; notification_text = 'عرض سعر زراعي / غطاسات ' + quote_number + '\n' + pumpSummary(p) + '\nالإجمالي: ' + money(found.total) + ' $';
}
function pumpHandle() {
  var p = pumpRead(), n = pumpNumber(text), unknown = /^(لا أعرف|لا اعرف|غير معروف|unknown|skip)$/i.test(text);
  if (text === 'pump_visit' || ((step === 'pump_result' || step === 'pump_review') && text === '3')) {
    pump_event = 'visit'; notify_employee = true;
    notification_text = 'طلب معاينة مهندس — زراعي / غطاسات\n' + pumpSummary(p);
    step = 'pump_review'; response = W('تم تسجيل طلب معاينة البئر في الإدارة، وسيتواصل معك الموظف لترتيب الموعد.') + '\n' + pumpAsk(step); return;
  }
  if (text === 'pump_edit' || text === 'aq_mod' || ((step === 'pump_result' || step === 'pump_review') && text === '2')) {
    step = 'pump_edit'; response = pumpAsk(step); return;
  }
  if (text === 'aq_buy' || text === 'buy_invoice') {
    var ready = pumpPackages(p).some(function (o) { return o.key === p.package; });
    if (!ready || !quote_context || quote_context.quote_number !== p.quote) { pumpResult(); return; }
    response = goBuy(); return;
  }
  if (step === 'pump_after') {
    if (text === 'pump_issue') pumpIssue(); else response = noOpt(pumpAsk(step)); return;
  }
  if (step === 'pump_review') { if (text === 'pump_retry' || text === '1') pumpResult(); else response = noOpt(pumpAsk(step)); return; }
  if (step === 'pump_result') { if (text === 'pump_issue' || text === '1') pumpIssue(); else response = noOpt(pumpAsk(step)); return; }
  if (step === 'pump_edit') {
    if (text === '1') { pumpInvalidate(p); step = 'pump_power_unit'; }
    else if (text === '2') { pumpInvalidate(p); step = 'pump_location'; }
    else if (text === '3') { step = 'pump_packages'; }
    response = pumpAsk(step); return;
  }
  if (step === 'pump_packages') {
    var ix = /^pump_pkg_\d+$/.test(text) ? Number(text.slice(9)) : n - 1;
    var opt = pumpPackages(p).slice(0, 9)[ix];
    if (opt) { pumpInvalidate(p); p.package = opt.key; pumpWrite(p); pumpResult(); }
    else response = noOpt(pumpAsk(step)); return;
  }
  if (step === 'pump_name' || step === 'pump_location') {
    if (text === '__media__' || text.length < 2 || !/[A-Za-z\u0600-\u06FF]/.test(text)) { response = noOpt(pumpAsk(step)); return; }
    if (step === 'pump_name') customer_name = text.slice(0,120); else city = text.slice(0,120);
  } else if (step === 'pump_power_unit') {
    if (text === '3') { p.unit = ''; p.power = null; pumpWrite(p); pumpResult(); return; }
    if (text !== '1' && text !== '2') { response = noOpt(pumpAsk(step)); return; }
    p.unit = text === '1' ? 'HP' : 'kW';
  } else if (step === 'pump_voltage') {
    if (!/^[123]$/.test(text)) { response = noOpt(pumpAsk(step)); return; }
    p.voltage = {'1':380,'2':400,'3':220}[text]; p.phase = text === '3' ? 1 : 3; phase_type = p.phase === 3 ? 'three' : 'single';
  } else if (step === 'pump_source') {
    if (!/^[123]$/.test(text)) { response = noOpt(pumpAsk(step)); return; } p.source = text;
  } else {
    var field = step.slice(5), optional = ['current','depth','head','flow','cable'].indexOf(field) >= 0;
    var max = {power:1000,current:2000,depth:2000,head:3000,flow:10000,hours:24,cable:10000}[field];
    if (unknown && optional) p[field] = null;
    else if (!(n > 0 && n <= max) || (field === 'hours' && n < 1)) { response = noOpt(pumpAsk(step)); return; }
    else p[field] = n;
    if (field === 'power') pump_capacity = String(n);
    if (field === 'hours') daily_hours = String(n);
  }
  pumpWrite(p); var next = PUMP_STEPS[PUMP_STEPS.indexOf(step) + 1];
  if (next === 'pump_result') pumpResult(); else { step = next; response = pumpAsk(step); }
}