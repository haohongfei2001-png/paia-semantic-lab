import test from 'node:test';
import assert from 'node:assert/strict';
import {routeA5Composition} from './a5_composition.mjs';
import {routeA5CompositionR1} from './a5_composition_r1.mjs';

const catalog_sha256='a'.repeat(64);
const topic_ids=Array.from({length:144},(_,i)=>`topic-${String(i).padStart(3,'0')}`);
const index={schema:'ZMR-A3-DEV-1',
  evidence_class:'NON_INDEPENDENT_DEVELOPMENT_EVIDENCE',
  catalog_sha256,train_sha256:'b'.repeat(64),mode:'char',topic_ids,
  quant_scale:.01,postings:[['c2:整理',[[1,100]]],['c2:旧甲',[[0,100]]]]
    .sort((a,b)=>a[0]<b[0]?-1:1)};
const options={catalog_sha256};
const input=current=>({current,title:'organize other work',recent:['unrelated request']});

test('explicit no-request guard vetoes a supported lexical Topic',()=>{
  const text='No action is needed to organize 旧甲.';
  assert.equal(routeA5Composition(index,input(text),options).state,'ASSIGNED');
  assert.deepEqual(routeA5CompositionR1(index,input(text),options),
    {state:'DEFER',topics:[],reason:'A5_R1_EXPLICIT_NO_REQUEST'});
  assert.equal(routeA5CompositionR1(index,input('整理旧甲已归档。'),options).state,'DEFER');
});

test('later explicit task, correction and two-action composition remain available',()=>{
  const later='No action is needed here. Please organize 旧甲.';
  assert.deepEqual(routeA5CompositionR1(index,input(later),options),
    routeA5Composition(index,input(later),options));
  const correction='不是旧甲而是整理乙';
  assert.deepEqual(routeA5CompositionR1(index,input(correction),options),
    routeA5Composition(index,input(correction),options));
  const multi='安排旧甲；整理乙';
  assert.deepEqual(routeA5CompositionR1(index,input(multi),options),
    routeA5Composition(index,input(multi),options));
});

test('bad input and Catalog closure still fail closed',()=>{
  assert.equal(routeA5CompositionR1(index,{current:3,title:'',recent:[]},options).state,'DEFER');
  assert.equal(routeA5CompositionR1(index,input('安排旧甲'),
    {catalog_sha256:'c'.repeat(64)}).state,'DEFER');
});
