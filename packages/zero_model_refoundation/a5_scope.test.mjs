import test from 'node:test';
import assert from 'node:assert/strict';
import {parseA5Scope} from './a5_scope.mjs';

const input=current=>({current,title:'Misleading title',recent:['Unrelated prior request']});

test('A5 keeps original current and exposes candidate action/object/goal spans',()=>{
  const current='整理预算为了明天搬家';
  const result=parseA5Scope(input(current));
  assert.equal(result.status,'DIAGNOSTIC_ONLY');
  assert.equal(result.fallback_current,current);
  assert.equal(result.fallback_required,true);
  assert.equal(result.topic_decision,null);
  const span=role=>result.role_candidates.find(x=>x.role===role);
  assert.equal(current.slice(span('ACTION_CANDIDATE').start,span('ACTION_CANDIDATE').end),'整理');
  assert.equal(current.slice(span('OBJECT_OR_BACKGROUND_CANDIDATE').start,
    span('OBJECT_OR_BACKGROUND_CANDIDATE').end),'预算');
  assert.equal(current.slice(span('GOAL_CANDIDATE').start,span('GOAL_CANDIDATE').end),'明天搬家');
});

test('correction and quotation remain visible without hard deletion or Topic choice',()=>{
  const current='不是旧计划而是整理新计划；“不要安排旅行”只是引用';
  const result=parseA5Scope(input(current));
  assert.equal(result.fallback_current,current);
  assert.equal(result.topic_decision,null);
  assert(result.role_candidates.some(x=>x.role==='REPLACED_CANDIDATE'));
  assert(result.role_candidates.some(x=>x.role==='CURRENT_CANDIDATE'));
  assert(result.cues.some(x=>x.in_quote&&x.type==='NEGATION_MARKER'));
  assert(!result.role_candidates.some(x=>x.role==='ACTION_CANDIDATE'&&
    current.slice(x.start,x.end)==='安排'));
});

test('bad, unbalanced, and over-profile input fail diagnostics without truncating text',()=>{
  assert.equal(parseA5Scope({current:'x',title:'',recent:[3]}).status,'UNPARSED_BAD_INPUT');
  const unbalanced=parseA5Scope(input('他说“整理预算'));
  assert.equal(unbalanced.status,'UNBALANCED_QUOTE');
  assert.equal(unbalanced.fallback_current,'他说“整理预算');
  const long='😀'.repeat(8193);
  const overflow=parseA5Scope(input(long));
  assert.equal(overflow.status,'UNPARSED_PROFILE_OVERFLOW');
  assert.equal(overflow.fallback_current,long);
  assert.equal(overflow.topic_decision,null);
});
