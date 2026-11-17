import { availableToContribute, suggestSplit, reviseContribution, approveContribution } from './money-strategy-wallet-core.js';
import assert from 'node:assert/strict';
const people = [
 { userId: 'a', confirmedCents: 50000, obligationsCents: 15000, reserveCents: 5000 },
 { userId: 'b', confirmedCents: 30000, obligationsCents: 10000, reserveCents: 5000 }
];
assert.equal(availableToContribute(people[0]), 30000);
const initial = suggestSplit({ targetCents: 50000, persons: people });
assert.deepEqual(initial.suggestedCents, [30000, 15000]);
assert.equal(initial.shortfallCents, 5000);
const affordable = suggestSplit({ targetCents: 40000, persons: people, mode: 'equal' });
assert.equal(affordable.shortfallCents, 0);
assert.equal(affordable.suggestedCents.reduce((a,b)=>a+b,0),40000);
const aApproved = approveContribution({ ...affordable, approvals: {} }, 'a');
assert.equal(aApproved.status,'pending_approvals');
assert.equal(approveContribution(aApproved,'b').status,'approved');
const changed = reviseContribution(aApproved,{ userId:'b',action:'adjust',amountCents:10000 });
assert.equal(changed.approvals.a,'pending');
assert.equal(changed.status,'revision_required');
assert.throws(()=>approveContribution(changed,'a',0),/changed/);
assert.throws(()=>suggestSplit({targetCents:100,persons:[people[0],people[0]]}),/Distinct/);
console.log('Money Strategy wallet tests passed');
