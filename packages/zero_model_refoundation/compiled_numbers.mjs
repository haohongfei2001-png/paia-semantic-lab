/** Offline artifact float encoding; not a runtime tolerance or capability gate relaxation. */
export const COMPILED_NUMBER_ENCODING='FINITE_12_SIGNIFICANT_DIGITS_V1';
export function canonicalCompiledNumbers(value){
 if(typeof value==='number'){
  if(!Number.isFinite(value))throw new Error('nonfinite compiled number');
  if(Object.is(value,-0))return 0;
  return Number.isInteger(value)?value:Number(value.toPrecision(12));
 }
 if(Array.isArray(value))return value.map(canonicalCompiledNumbers);
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,canonicalCompiledNumbers(v)]));
 if(value===null||['string','boolean'].includes(typeof value))return value;
 throw new Error('unsupported compiled JSON value');
}
