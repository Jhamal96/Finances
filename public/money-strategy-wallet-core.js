/* Money Strategy wallet planning — pure calculations; no money movement. */
export function toCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new RangeError('Amount must be nonnegative and finite');
  return Math.round((n + Number.EPSILON) * 100);
}
export const fromCents = value => Math.round(value) / 100;
function nonnegativeInt(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(label + ' must be a nonnegative integer in cents');
  return value;
}
export function availableToContribute({ confirmedCents, obligationsCents = 0, reserveCents = 0, allocatedCents = 0 }) {
  const available = nonnegativeInt(confirmedCents, 'Confirmed funds') -
    nonnegativeInt(obligationsCents, 'Obligations') -
    nonnegativeInt(reserveCents, 'Reserve') -
    nonnegativeInt(allocatedCents, 'Existing allocations');
  return Math.max(0, available);
}
/* Integer cents only. A suggestion never changes a saved commitment. */
export function suggestSplit({ targetCents, persons, mode = 'capacity' }) {
  const target = nonnegativeInt(targetCents, 'Target');
  if (!Array.isArray(persons) || persons.length !== 2) throw new Error('Exactly two household members required');
  if (persons[0].userId === persons[1].userId || persons.some(p => !p.userId)) throw new Error('Distinct signed-in members required');
  const capacity = persons.map(p => availableToContribute(p));
  const affordable = Math.min(target, capacity[0] + capacity[1]);
  let weights;
  if (mode === 'equal') weights = [1, 1];
  else if (mode === 'income') weights = persons.map(p => nonnegativeInt(p.incomeCents ?? 0, 'Income'));
  else if (mode === 'capacity') weights = capacity;
  else throw new Error('Unknown split mode');
  if (weights[0] + weights[1] === 0) weights = [1, 1];
  let first = Math.min(capacity[0], Math.floor(affordable * weights[0] / (weights[0] + weights[1])));
  let second = Math.min(capacity[1], affordable - first);
  let remainder = affordable - first - second;
  const extraFirst = Math.min(remainder, capacity[0] - first);
  first += extraFirst;
  remainder -= extraFirst;
  second += Math.min(remainder, capacity[1] - second);
  return {
    targetCents: target,
    suggestedCents: [first, second],
    shortfallCents: target - first - second,
    requiresSeparateApproval: true,
    status: target === first + second ? 'pending_approvals' : 'shortfall',
    userIds: persons.map(p => p.userId)
  };
}
export function reviseContribution(plan, { userId, amountCents, action }) {
  if (!plan.userIds?.includes(userId)) throw new Error('Not a plan member');
  if (!['adjust', 'decline'].includes(action)) throw new Error('Unsupported revision');
  const idx = plan.userIds.indexOf(userId);
  const amounts = [...plan.suggestedCents];
  amounts[idx] = action === 'decline' ? 0 : nonnegativeInt(amountCents, 'Contribution');
  return { ...plan, suggestedCents: amounts, shortfallCents: Math.max(0, plan.targetCents - amounts[0] - amounts[1]),
    approvals: Object.fromEntries(plan.userIds.map(id => [id, 'pending'])),
    status: 'revision_required', revision: (plan.revision || 0) + 1 };
}
export function approveContribution(plan, userId, approvedRevision = plan.revision || 0) {
  if (!plan.userIds?.includes(userId)) throw new Error('Not a plan member');
  if (approvedRevision !== (plan.revision || 0)) throw new Error('Plan changed; new approval required');
  if (plan.shortfallCents > 0) throw new Error('Resolve shortfall before approving');
  const approvals = { ...plan.approvals, [userId]: 'approved' };
  const active = plan.userIds.every(id => approvals[id] === 'approved');
  return { ...plan, approvals, status: active ? 'approved' : 'pending_approvals' };
}
