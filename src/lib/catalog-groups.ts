export function catalogGroup(code: string, name: string) {
  const text = `${code} ${name}`.toLowerCase();
  if (/pump_package|غطاس|مضخ/.test(text)) return "الغطاسات والمضخات";
  if (/^pv_|panel_|ألواح|الواح|لوح /.test(text)) return "الألواح";
  if (/^inv_|إنفرتر|انفرتر/.test(text)) return "الإنفرترات";
  if (/^bat_|battery|بطاري/.test(text)) return "البطاريات";
  if (/كبا|كبائ|cabinet/.test(text)) return "الكبائن";
  if (/راك|rack/.test(text)) return "الراكات";
  if (/حماية.*dc|dc.*حماية|^dc_/.test(text)) return "صناديق حماية DC";
  if (/حماية.*ac|ac.*حماية|^ac_/.test(text)) return "لوحات حماية AC";
  if (/كابل|كابل|كيبل|كبل|كشن|cable/.test(text)) return "الكابلات والتوصيلات";
  if (/استند|ستاند|حامل|mount/.test(text)) return "استندات المنظومات";
  return "أصناف أخرى";
}

export function catalogBrand(name: string) {
  if (/pylontech|بايلونتك|بيلونتك/i.test(name)) return "Pylontech";
  if (/hithium|هيثيوم/i.test(name)) return "Hithium";
  if (/deye|داي|دايا/i.test(name)) return "Deye";
  if (/solis|سوليس/i.test(name)) return "Solis";
  if (/lipower|ليو ?باور|ليوباور/i.test(name)) return "LiPower";
  return "أخرى";
}