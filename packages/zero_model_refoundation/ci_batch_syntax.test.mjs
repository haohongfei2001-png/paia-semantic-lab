import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const checker = new URL('./ci_batch_syntax.mjs', import.meta.url).pathname;
const relative = n => 'packages/zero_model_refoundation/' + n + '.mjs';
async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'zmr-batch-syntax-'));
  await mkdir(join(root, 'packages/zero_model_refoundation'), {recursive: true});
  try { return await run(root); } finally { await rm(root, {recursive: true, force: true}); }
}
function child(root, files, flags = ['--experimental-vm-modules']) {
  const env = {...process.env}; delete env.NODE_TEST_CONTEXT; delete env.NODE_COMPILE_CACHE;
  return spawnSync(process.execPath, [...flags, checker, ...files], {cwd: root, env, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024});
}
const receipt = r => JSON.parse(r.stdout.match(/ZMR_BATCH_SYNTAX (.+)/)[1]);

test('all explicit files are parsed without linking imports or executing top-level side effects', () => fixture(async root => {
  const marker = join(root, 'must_not_be_written');
  const sources = {
    'test_module.test': "export const parser_only_test_module = 1;",
    imports: "import unused from './missing_dependency.mjs'; export const value = 1;",
    effects: "import {writeFileSync} from 'node:fs'; writeFileSync(" + JSON.stringify(marker) + ", 'bad'); throw Error('must not execute');",
    await_source: "await Promise.reject(Error('must not execute')); export default import.meta.url;"
  };
  for (const [name, source] of Object.entries(sources)) await writeFile(join(root, relative(name)), source);
  const files = Object.keys(sources).map(relative), result = child(root, files);
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
  const r = receipt(result); assert.deepEqual(r.parsed_paths, files); assert.deepEqual(r.errors, []);
  assert.equal(r.files, 4); assert.equal(r.imports_linked, 0); assert.equal(r.sources_evaluated, 0); assert.equal(r.child_processes, 0); assert.equal(r.test_result_cache, false);
  await assert.rejects(access(marker), /ENOENT/);
}));

test('same ESM syntax failures as individual node checks; every invalid file propagates and no PASS cache exists', () => fixture(async root => {
  const cases = {
    good: 'export const x = 1;', shebang: '#!/usr/bin/env node\nexport default 1;',
    attributes: "import data from './missing.json' with {type: 'json'}; export default data;",
    bad_binding: 'const x = ;', duplicate: 'export const x = 1; export const x = 2;',
    missing_name: 'export const = 2;', top_return: 'return 1;', broken_import: 'import { from "missing";'
  };
  for (const [name, source] of Object.entries(cases)) await writeFile(join(root, relative(name)), source);
  const files = Object.keys(cases).map(relative), result = child(root, files), r = receipt(result);
  assert.equal(result.error, undefined); assert.equal(result.status, 1); assert.equal(r.exit_code, 1);
  assert.equal(r.parsed_paths.length + r.errors.length, files.length); assert.equal(r.errors.length, 5);
  for (const file of files) {
    const individual = spawnSync(process.execPath, ['--check', file], {cwd: root, encoding: 'utf8', timeout: 10000});
    assert.equal(individual.error, undefined); assert.equal(individual.status === 0, r.parsed_paths.includes(file), file);
  }
  await writeFile(join(root, relative('good')), 'const x = ;');
  assert.equal(child(root, [relative('good')]).status, 1);
  assert.equal(child(root, [relative('good')]).status, 1); // Same wrong bytes never acquire a PASS.
  await writeFile(join(root, relative('good')), 'export const x = 1;');
  assert.equal(child(root, [relative('good')]).status, 0);
}));

test('missing files, duplicate/empty/nonengineering arguments and missing VM flag fail closed; workflow keeps full unit list and job limits', () => fixture(async root => {
  const file = relative('good'); await writeFile(join(root, file), 'export default 1;');
  for (const files of [[], [file, file], ['data/forbidden.mjs'], ['packages/zero_model_refoundation/../escape.mjs']]) assert.equal(child(root, files).status, 1);
  const missing = child(root, [relative('missing')]); assert.equal(missing.status, 1); assert.equal(receipt(missing).errors[0].name, 'Error');
  const unavailable = child(root, [file], []); assert.equal(unavailable.status, 1); assert.match(unavailable.stderr, /experimental-vm-modules required/);
  const workflow = await readFile(new URL('../../.github/workflows/zmr-v1.yml', import.meta.url), 'utf8');
  assert(workflow.includes('timeout-minutes: 5')); assert(workflow.includes('max-parallel: 1')); assert(workflow.includes("shard: ['1/3', '2/3', '3/3']"));
  assert(workflow.includes('node --experimental-vm-modules packages/zero_model_refoundation/ci_batch_syntax.mjs packages/zero_model_refoundation/*.mjs'));
  const line = workflow.split('\n').find(l => l.startsWith('          node packages/zero_model_refoundation/ci_test_scheduler.mjs '));
  const units = line.trim().split(/\s+/).filter(p => p.endsWith('.test.mjs'));
  assert(units.length >= 136); assert.equal(new Set(units).size, units.length);
  assert(units.includes('packages/zero_model_refoundation/train_review_compiler_adapter.test.mjs'));
  assert.equal(units[135], 'packages/zero_model_refoundation/ci_batch_syntax.test.mjs');
}));
