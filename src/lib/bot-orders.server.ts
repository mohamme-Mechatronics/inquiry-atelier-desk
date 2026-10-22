import { s } from './bot.server';
import type { botGuard } from './bot.server';

type DB = NonNullable<Awaited<ReturnType<typeof botGuard>>['db']>;
export type BotOrder = { phone: string; name?: unknown; city?: unknown; invoice_no?: unknown; amount?: unknown; method?: unknown; details?: unknown };

// Quote/payment callbacks share one order; receiving a receipt never marks a sale won.
export async function saveBotOrder(db: DB, m: BotOrder) {
  const row = {
    phone: m.phone, name: s(m.name, 120), city: s(m.city, 120),
    invoice_no: s(m.invoice_no, 100), amount: s(m.amount, 100),
    method: s(m.method, 100), details: s(m.details),
  };
  if (row.invoice_no) {
    const found = await db.from('orders').select('id,details').eq('phone', m.phone).eq('invoice_no', row.invoice_no).maybeSingle();
    if (found.error) return { error: found.error };
    if (found.data) {
      const details = [found.data.details, row.details].filter(Boolean);
      return db.from('orders').update({ ...row, details: [...new Set(details)].join('\n').slice(0, 4000) }).eq('id', found.data.id);
    }
  }
  return db.from('orders').insert(row);
}