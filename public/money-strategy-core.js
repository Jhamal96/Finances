/* Money Strategy: pure, read-only calculations. No bank credentials or writes. */
export const money = value => Math.round((Number(value) || 0) * 100) / 100;
export const dateKey = value => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};
export function normalizeObligations({ bills = [], installments = [], subscriptions = [] } = {}) {
  const output = [];
  const seen = new Set();
  for (const [kind, items] of [['bill', bills], ['installment', installments], ['subscription', subscriptions]]) {
    for (const item of items) {
      const amount = money(item.amount ?? item.paymentAmount ?? item.dueAmount);
      const dueDate = dateKey(item.dueDate ?? item.date ?? item.nextDue);
      const sourceId = String(item.id ?? item.paymentId ?? '');
      const key = sourceId ? kind + ':' + sourceId : [kind, item.name ?? item.title ?? '', dueDate, amount].join(':');
      if (!dueDate || amount < 0 || seen.has(key)) continue;
      seen.add(key);
      output.push({ key, kind, name: String(item.name ?? item.title ?? kind), amount, dueDate, status: String(item.status ?? 'scheduled').toLowerCase(), sourceId });
    }
  }
  return output.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
export function remainingObligations(items, throughDate) {
  const end = dateKey(throughDate);
  return money(items.filter(item => item.dueDate <= end && !['paid', 'cleared', 'cancelled', 'canceled'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0));
}
export function safeToSpend({ clearedBalance = 0, obligations = [], throughDate, minimumReserve = 0, allocatedWallets = 0 } = {}) {
  return money(money(clearedBalance) - remainingObligations(obligations, throughDate) - money(minimumReserve) - money(allocatedWallets));
}
export function suggestMatches(obligations, transactions, { amountTolerance = 0.01, maxDaysApart = 5 } = {}) {
  const day = date => Math.floor(new Date(date + 'T12:00:00Z').getTime() / 86400000);
  const candidates = [];
  for (const obligation of obligations) for (const transaction of transactions) {
    const amount = money(Math.abs(Number(transaction.amount)));
    const postedDate = dateKey(transaction.postedDate ?? transaction.date);
    if (!postedDate || Math.abs(amount - obligation.amount) > amountTolerance) continue;
    const gap = Math.abs(day(postedDate) - day(obligation.dueDate));
    if (gap > maxDaysApart) continue;
    const label = String(transaction.description ?? '').toLowerCase();
    const name = obligation.name.toLowerCase();
    const nameMatch = name.length >= 4 && label.includes(name);
    const confidence = nameMatch && gap <= 2 ? 'high' : 'review';
    candidates.push({ obligationKey: obligation.key, transactionId: String(transaction.id ?? ''), confidence, dayGap: gap });
  }
  // Avoid ambiguous automatic matches: high-confidence candidates must be one-to-one.
  const countsO = new Map(), countsT = new Map();
  for (const c of candidates) {
    countsO.set(c.obligationKey, (countsO.get(c.obligationKey) ?? 0) + 1);
    countsT.set(c.transactionId, (countsT.get(c.transactionId) ?? 0) + 1);
  }
  return candidates.map(c => ({ ...c, confidence: c.confidence === 'high' && c.transactionId && countsO.get(c.obligationKey) === 1 && countsT.get(c.transactionId) === 1 ? 'high' : 'review', action: 'suggest-only' }));
}
