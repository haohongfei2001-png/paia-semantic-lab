// Offline source-ingestion helper. No router dependency, network call, or corpus acquisition.
export const NI_METADATA_FIELDS = Object.freeze([
  'Contributors','Source','URL','Categories','Domains','Definition',
  'Instruction_language','Input_language','Output_language','Instance License'
]);

export async function extractTaskMetadata(chunks, options = {}) {
  const maxInputChars = options.maxInputChars ?? 50331648;
  const maxKeptChars = options.maxKeptChars ?? 65536;
  const maxDefinitionChars = options.maxDefinitionChars ?? 20000;
  const maxDepth = options.maxDepth ?? 64;
  const maxRetainedNodes = options.maxRetainedNodes ?? 4096;
  for (const limit of [maxInputChars,maxKeptChars,maxDefinitionChars,maxDepth,maxRetainedNodes])
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('SELECTIVE_JSON_REJECT: invalid limit');
  let retainedNodes = 0;
  const iterator = chunks[Symbol.asyncIterator]();
  let chunk = '', offset = 0, inputChars = 0, keptChars = 0, eof = false;
  const stats = { excludedValueStringsDecoded: 0, keptValueStringsDecoded: 0, skippedTopLevelFields: [] };
  const allowed = new Set(NI_METADATA_FIELDS);
  const fail = reason => { throw new Error('SELECTIVE_JSON_REJECT: ' + reason); };
  async function peek() {
    while (offset === chunk.length && !eof) {
      const next = await iterator.next();
      if (next.done) { eof = true; break; }
      if (typeof next.value !== 'string') fail('chunks must be decoded text');
      chunk = next.value; offset = 0;
      inputChars += chunk.length;
      if (inputChars > maxInputChars) fail('input limit');
    }
    return eof ? '' : chunk[offset];
  }
  async function take() { const c = await peek(); if (!c) fail('truncated'); offset++; return c; }
  async function whitespace() { while (' \t\n\r'.includes(await peek()) && await peek() !== '') await take(); }
  async function expect(c) { if (await take() !== c) fail('unexpected token'); }
  async function string(retain, valueString = false) {
    await expect('"');
    let raw = retain ? '"' : '';
    while (true) {
      const c = await take();
      if (c.charCodeAt(0) < 32) fail('control in string');
      if (retain) { raw += c; if (raw.length > maxKeptChars) fail('string limit'); }
      if (c === '"') break;
      if (c === '\\') {
        const escape = await take();
        if (retain) raw += escape;
        if (escape === 'u') {
          for (let i = 0; i < 4; i++) {
            const hex = await take();
            if (!/[0-9a-fA-F]/.test(hex)) fail('unicode escape');
            if (retain) raw += hex;
          }
        } else if (!'"\\/bfnrt'.includes(escape)) fail('escape');
      }
    }
    if (!retain) return undefined;
    if (raw.length > maxKeptChars) fail('string limit');
    const decoded = JSON.parse(raw); // Only retained metadata strings or structural object keys.
    keptChars += decoded.length;
    if (keptChars > maxKeptChars) fail('retained metadata limit');
    if (valueString) stats.keptValueStringsDecoded++;
    return decoded;
  }
  async function value(retain, depth) {
    if (depth > maxDepth) fail('depth limit');
    if (retain && ++retainedNodes > maxRetainedNodes) fail('retained node limit');
    await whitespace();
    const c = await peek();
    if (c === '"') return string(retain, true);
    if (c === '[') {
      await take(); await whitespace();
      const result = retain ? [] : undefined;
      if (await peek() === ']') { await take(); return result; }
      while (true) {
        const item = await value(retain, depth + 1);
        if (retain) result.push(item);
        await whitespace();
        const separator = await take();
        if (separator === ']') return result;
        if (separator !== ',') fail('array separator');
      }
    }
    if (c === '{') {
      await take(); await whitespace();
      const result = retain ? Object.create(null) : undefined;
      // Retained objects reject duplicate semantic keys. Excluded object keys are scanned, never decoded.
      const seen = retain ? new Set() : undefined;
      if (await peek() === '}') { await take(); return result; }
      while (true) {
        await whitespace();
        const key = await string(retain);
        if (retain && seen.has(key)) fail('duplicate key');
        if (retain) seen.add(key);
        await whitespace(); await expect(':');
        const item = await value(retain, depth + 1);
        if (retain) result[key] = item;
        await whitespace();
        const separator = await take();
        if (separator === '}') return result;
        if (separator !== ',') fail('object separator');
      }
    }
    for (const [literal, decoded] of [['true',true],['false',false],['null',null]]) {
      if (c === literal[0]) {
        for (const letter of literal) await expect(letter);
        return retain ? decoded : undefined;
      }
    }
    let number = '';
    while (/[0-9eE+.-]/.test(await peek()) && await peek() !== '') {
      number += await take(); if (number.length > 128) fail('number limit');
    }
    if (!/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(number)) fail('value syntax');
    const decoded = Number(number);
    if (!Number.isFinite(decoded)) fail('nonfinite number');
    return retain ? decoded : undefined;
  }
  try {
    await whitespace(); await expect('{'); await whitespace();
    const metadata = Object.create(null), seen = new Set();
    if (await peek() !== '}') {
      while (true) {
        await whitespace();
        const key = await string(true);
        if (seen.has(key)) fail('duplicate top-level key');
        seen.add(key);
        await whitespace(); await expect(':');
        const retain = allowed.has(key);
        const item = await value(retain, 1);
        if (retain) metadata[key] = item;
        else stats.skippedTopLevelFields.push(key);
        await whitespace();
        const separator = await take();
        if (separator === '}') break;
        if (separator !== ',') fail('top-level separator');
      }
    } else await take();
    await whitespace();
    if (await peek() !== '') fail('trailing input');
    if (!Array.isArray(metadata.Definition) || metadata.Definition.length === 0 ||
        metadata.Definition.some(s => typeof s !== 'string' || s.length === 0)) fail('Definition shape');
    if (metadata.Definition.reduce((n,s)=>n+s.length,0) > maxDefinitionChars) fail('Definition limit');
    return {metadata, stats, inputChars, fullInstructionCertified:false, acceptedGold:false};
  } finally {
    if (typeof iterator.return === 'function') await iterator.return();
  }
}
