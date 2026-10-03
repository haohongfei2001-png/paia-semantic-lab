/** Parse explicit engineering ESM sources once; never link, evaluate or cache results. */
import * as vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export async function checkEngineeringModuleSyntax(files) {
  if (!Array.isArray(files) || !files.length || new Set(files).size !== files.length || files.some(p => typeof p !== 'string' || !/^packages\/zero_model_refoundation\/[a-z0-9_]+(?:\.test)?\.mjs$/.test(p))) throw Error('explicit unique engineering module paths required');
  if (typeof vm.SourceTextModule !== 'function') throw Error('--experimental-vm-modules required; no syntax check bypass');
  const parsed = [], errors = [];
  for (const file of files) {
    try {
      const source = await readFile(file, 'utf8');
      // Construction only: no linking, dependency loading or source evaluation.
      const module = new vm.SourceTextModule(source, {identifier: file});
      if (module.status !== 'unlinked') throw Error('unexpected parser state');
      parsed.push(file);
    } catch (error) {
      errors.push({path: file, name: error.name, message: error.message});
    }
  }
  return {classification: 'ENGINEERING_ESM_SYNTAX_ONLY_NOT_CAPABILITY', files: files.length,
    parsed_paths: parsed, errors, exit_code: errors.length ? 1 : 0,
    imports_linked: 0, sources_evaluated: 0, child_processes: 0, test_result_cache: false};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await checkEngineeringModuleSyntax(process.argv.slice(2));
    console.log('ZMR_BATCH_SYNTAX ' + JSON.stringify(result));
    process.exitCode = result.exit_code;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
