import { describe, expect, it, vi } from 'vitest';
import { saveBotOrder } from '../lib/bot-orders.server';

function database(existing: {id:string;details:string} | null) {
  const insert = vi.fn().mockResolvedValue({error:null});
  const updateEq = vi.fn().mockResolvedValue({error:null});
  const update = vi.fn((_row: Record<string,unknown>) => ({eq:updateEq}));
  const query = {eq:vi.fn(), maybeSingle:vi.fn().mockResolvedValue({data:existing,error:null})};
  query.eq.mockReturnValue(query);
  const db = {from:vi.fn(() => ({select:() => query,insert,update}))};
  return {db:db as unknown as Parameters<typeof saveBotOrder>[0],insert,update,updateEq};
}
describe('Bot orders persist agricultural payment on the existing quotation', () => {
  it('updates one quote with payment receipt without confirming payment or dropping branch', async () => {
    const d = database({id:'order-1',details:'عرض سعر TMK-AGR-TEST — فرع زراعي / غطاسات'});
    await saveBotOrder(d.db,{phone:'967700000000',invoice_no:'TMK-AGR-TEST',amount:'2200 $',method:'حوالة شبكة محلية',details:'بانتظار تحقق الحسابات'});
    expect(d.insert).not.toHaveBeenCalled();
    expect(d.update).toHaveBeenCalledWith(expect.objectContaining({amount:'2200 $',method:'حوالة شبكة محلية'}));
    const row = d.update.mock.calls[0]?.[0] as unknown as Record<string,unknown>;
    expect(row['details']).toBe('عرض سعر TMK-AGR-TEST — فرع زراعي / غطاسات\nبانتظار تحقق الحسابات');
    expect(row).not.toHaveProperty('status');
    expect(d.updateEq).toHaveBeenCalledWith('id','order-1');
  });
  it('saves unpriced engineering/visit requests without a fake amount', async () => {
    const d = database(null);
    await saveBotOrder(d.db,{phone:'test-chat',method:'زيارة ميدانية',details:'زراعي / غطاسات'});
    expect(d.insert).toHaveBeenCalledWith(expect.objectContaining({phone:'test-chat',invoice_no:null,amount:null,method:'زيارة ميدانية'}));
    expect(d.update).not.toHaveBeenCalled();
  });
});