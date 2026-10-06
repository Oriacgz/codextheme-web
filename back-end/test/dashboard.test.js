import test from 'node:test';
import assert from 'node:assert/strict';
import { readableAudit, reportDashboard } from '../src/auth/dashboard.js';
test('audit displays names and preserves references for deleted accounts',async()=>{
 const result=await readableAudit({adminAudit:{findMany:async()=>[{actorId:'a',targetId:'gone',action:'admin-deleted'}]},user:{findMany:async()=>[{id:'a',name:'Morgan'}]}});
 assert.equal(result[0].actorName,'Morgan');assert.equal(result[0].targetName,'Former account');assert.equal(result[0].targetId,'gone');
});
test('reports use global workload counts independently of selected queue',async()=>{
 const result=await reportDashboard({themeReport:{findMany:async query=>query.select?[{createdAt:new Date('2026-10-06T10:00:00Z')}]:[{userId:'u',themeId:'t',resolved:false}],count:async query=>query.where.resolved?7:3},user:{findMany:async()=>[{id:'u',name:'River'}]},theme:{findMany:async()=>[{id:'t',name:'Forest'}]}},false);
 assert.deepEqual(result.stats,{open:3,closed:7});assert.equal(result.reports[0].reporter,'River');assert.equal(result.reports[0].themeName,'Forest');assert.deepEqual(result.daily,['2026-10-06']);
});
