import test from 'node:test';
import assert from 'node:assert/strict';
import {extractTaskMetadata, NI_METADATA_FIELDS} from '../scripts/cig02e_selective_task_metadata.mjs';

async function* textChunks(text, width=1) {
  for (let i=0;i<text.length;i+=width) yield text.slice(i,i+width);
}
const parse=(text,options,width)=>extractTaskMetadata(textChunks(text,width),options);
test('retains only permitted metadata across every character boundary', async()=>{
  const input={Definition:['Translate a sentence.','比較兩個選項。'],Contributors:['synthetic author'],
    Input_language:['French'],Output_language:['Chinese'],
    Instances:[{input:'NEVER_DECODE_INSTANCE',output:['NEVER_DECODE_OUTPUT']}],
    'Positive Examples':[{input:'EXAMPLE_MARKER',output:'OUTPUT_MARKER'}],
    'Negative Examples':[{explanation:'NEGATIVE_MARKER'}],UnknownField:{secret:'UNKNOWN_MARKER'}};
  const expected=Object.fromEntries(Object.entries(input).filter(([key])=>NI_METADATA_FIELDS.includes(key)));
  const source=JSON.stringify(input);
  for (const width of [1,2,7,64,source.length]) {
    const decodedInputs=[], original=JSON.parse;
    JSON.parse=text=>{decodedInputs.push(text);return original(text);};
    let result;
    try { result=await parse(source,undefined,width); } finally { JSON.parse=original; }
    assert.deepEqual({...result.metadata},expected);
    assert.ok(decodedInputs.every(text=>!/(NEVER_DECODE|EXAMPLE_MARKER|OUTPUT_MARKER|NEGATIVE_MARKER|UNKNOWN_MARKER)/.test(text)));
    assert.equal(result.stats.excludedValueStringsDecoded,0);
    assert.equal(result.acceptedGold,false);
    assert.equal(result.fullInstructionCertified,false);
    assert.equal(result.inputChars,source.length);
  }
});
test('skips nested escaped strings and validates JSON syntax without decoding values',async()=>{
  const input='{"Instances":[{"input":"brace } bracket ] quote \\" slash \\\\ unicode \\u4e2d","output":[true,false,null,-12.3e+4,{"nested":[]}]}],"Definition":["Valid \\u4e2d definition"]}';
  const result=await parse(input);
  assert.deepEqual(result.metadata.Definition,['Valid 中 definition']);
  assert.equal(result.stats.keptValueStringsDecoded,1);
});
test('rejects malformed, truncated, duplicated, missing and wrong-shape metadata',async()=>{
  for (const input of [
    '{"Definition":["x"],"Instances":["bad\\q"]}',
    '{"Definition":["x"],"Instances":["bad\\u12xz"]}',
    '{"Definition":["x"],"Instances":[01]}',
    '{"Definition":["x"],"Instances":[1e]}',
    '{"Definition":["x"],"Instances":[true false]}',
    '{"Definition":["x"],"Instances":{"input":"unfinished',
    '{"Definition":["x"],"Definition":["y"]}',
    '{"Definition":["x"],"\\u0044efinition":["y"]}',
    '{"Definition":["x"],"Source":{"same":1,"same":2}}',
    '{"Definition":["x"],}',
    '{"Definition":["x"]} trailing',
    '{"Definition":"x"}','{"Definition":[]}','{"Definition":[null]}','{}','[]',
    '{"Definition":["x"],"Instances":["line\nnewline"]}'
  ]) await assert.rejects(parse(input),/SELECTIVE_JSON_REJECT/);
});
test('bounds input, decoded metadata, definition, nesting and retained allocations',async()=>{
  await assert.rejects(parse('{"Definition":["x"]}',{maxInputChars:5}),/input limit/);
  await assert.rejects(parse('{"Definition":["123456"]}',{maxDefinitionChars:5}),/Definition limit/);
  await assert.rejects(parse('{"Definition":["123456"]}',{maxKeptChars:10}),/limit/);
  await assert.rejects(parse('{"Definition":["x"],"Instances":[[[[0]]]]}',{maxDepth:3}),/depth limit/);
  await assert.rejects(parse('{"Definition":["x"],"Domains":[[],[],[]]}',{maxRetainedNodes:4}),/retained node limit/);
  for (const value of [0,-1,NaN,Infinity,1.5]) await assert.rejects(parse('{"Definition":["x"]}',{maxInputChars:value}),/invalid limit/);
});
test('large excluded strings are scanned without being retained and input is closed on early failure',async()=>{
  const source=JSON.stringify({Definition:['x'],Instances:[{output:['S'.repeat(100000)]}]});
  const result=await parse(source,{maxKeptChars:256},127);
  assert.deepEqual(result.metadata.Definition,['x']);
  assert.equal(result.stats.keptValueStringsDecoded,1);
  let closed=false;
  async function* input(){try{yield '{"Definition":["x"],"Instances":[';yield ' '.repeat(100);}finally{closed=true;}}
  await assert.rejects(extractTaskMetadata(input(),{maxInputChars:40}),/input limit/);
  assert.equal(closed,true);
});

test('valid scalar and pretty nested structure survives varied stream boundaries',async()=>{
  const values=[null,true,false,0,-1,1.2,1e10,'',{},[],{k:'x'},{k:null},[[],{},null,true,false,0,''],'long'.repeat(1000)];
  for(const item of values) for(const width of [1,2,7,127,65536]){
    const source=JSON.stringify({Definition:['x'],Instances:[item]});
    const result=await parse(source,undefined,width);
    assert.deepEqual(result.metadata.Definition,['x']);
    assert.equal(result.stats.excludedValueStringsDecoded,0);
  }
  const object={Definition:['x'],Instances:[{input:'quote " slash '+String.fromCharCode(92)+' newline\n unicode ü',output:[null,true,0,[],{}]}]};
  for(const pad of [undefined,2,4,'\t']) for(const width of [1,2,3,7,127,1024,65536]){
    const result=await parse(JSON.stringify(object,null,pad),undefined,width);
    assert.deepEqual(result.metadata.Definition,['x']);
    assert.equal(result.stats.excludedValueStringsDecoded,0);
  }
});

test('malformed stream reports location and counters without leaking discarded text',async()=>{
  const source='{"Definition":["x"],"Instances":["SECRET_EXCLUDED_VALUE",?]}';
  for(const width of [1,7,127]){
    let error;
    try {await parse(source,undefined,width);} catch(e){error=e;}
    assert.match(error.message,/value syntax/);
    assert.equal(error.selectiveDiagnostic.consumedTextChars,source.indexOf('?'));
    assert.ok(error.selectiveDiagnostic.chunksRead>0);
    assert.equal(error.selectiveDiagnostic.excludedValueStringsDecoded,0);
    assert.ok(!JSON.stringify(error).includes('SECRET_EXCLUDED_VALUE'));
  }
});
