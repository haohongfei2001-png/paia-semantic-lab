/** TRAIN-v0.4 A1 bounded storage codec. Quantization is a development hypothesis, not parity evidence. */
import {routeA1} from './a1.mjs';
const must=(ok,message)=>{if(!ok)throw new Error(message);};
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const cache=new WeakMap();
function valid(x){
 must(x?.schema==='ZMR-A1-V04-INT16-DEV-1'&&x.evidence_class==='NON_INDEPENDENT_DEVELOPMENT_EVIDENCE'&&digest(x.catalog_sha256)&&digest(x.train_sha256),'invalid compact A1 identity');
 must(x.mode==='char'&&x.max_features===1500&&x.topic_ids?.length===144&&new Set(x.topic_ids).size===144&&x.topic_ids.every(id=>typeof id==='string'&&id),'invalid compact A1 universe');
 must(x.topic_lengths?.length===144&&x.topic_lengths.every(n=>Number.isSafeInteger(n)&&n>=0)&&Number.isFinite(x.average_length)&&x.average_length>0,'invalid compact A1 lengths');
 must(['tfidf_scale','bm25_scale'].every(k=>Number.isFinite(x[k])&&x[k]>0),'invalid compact A1 scales');
 must(Array.isArray(x.postings)&&x.postings.length>0&&x.postings.length<=1500,'invalid compact A1 postings');
 must(x.postings.every((r,i)=>Array.isArray(r)&&r.length===3&&typeof r[0]==='string'&&r[0]&&(i===0||x.postings[i-1][0]<r[0])&&Number.isFinite(r[1])&&r[1]>0&&Array.isArray(r[2])&&r[2].length>0&&r[2].length<=144&&r[2].every((h,j)=>Array.isArray(h)&&h.length===3&&Number.isInteger(h[0])&&h[0]>=0&&h[0]<144&&(j===0||r[2][j-1][0]<h[0])&&h.slice(1).every(n=>Number.isInteger(n)&&n>=0&&n<=32767))),'invalid compact A1 coefficients');
 return x;
}
export function packA1V04(x){
 must(x?.schema==='ZMR-A1-DEV-1'&&x.mode==='char'&&x.max_features===1500,'registered raw A1 recipe required');
 let tfidfPeak=0,bm25Peak=0;
 for(const [,idf,hits]of x.postings){must(Number.isFinite(idf)&&idf>0,'nonfinite raw idf');for(const [,tfidf,bm25]of hits){must(Number.isFinite(tfidf)&&tfidf>0&&Number.isFinite(bm25)&&bm25>0,'nonfinite raw weight');tfidfPeak=Math.max(tfidfPeak,tfidf);bm25Peak=Math.max(bm25Peak,bm25);}}
 const tfidf_scale=tfidfPeak/32767,bm25_scale=bm25Peak/32767;
 return valid({schema:'ZMR-A1-V04-INT16-DEV-1',evidence_class:x.evidence_class,topic_ids:x.topic_ids,catalog_sha256:x.catalog_sha256,train_sha256:x.train_sha256,mode:x.mode,max_features:x.max_features,
  topic_lengths:x.topic_lengths,average_length:x.average_length,tfidf_scale,bm25_scale,
  postings:x.postings.map(([term,idf,hits])=>[term,idf,hits.map(([i,t,b])=>[i,Math.round(t/tfidf_scale),Math.round(b/bm25_scale)])])});
}
export function unpackA1V04(x){
 valid(x);const topic_norms=Array(144).fill(0);
 const postings=x.postings.map(([term,idf,hits])=>[term,idf,hits.map(([i,t,b])=>{const tfidf=t*x.tfidf_scale;topic_norms[i]+=tfidf*tfidf;return[i,tfidf,b*x.bm25_scale];})]);
 return {...x,schema:'ZMR-A1-DEV-1',postings,topic_norms:topic_norms.map(Math.sqrt)};
}
export function routeA1V04(x,input,config){
 try{let decoded=cache.get(x);if(!decoded){decoded=unpackA1V04(x);cache.set(x,decoded);}return routeA1(decoded,input,config);}
 catch{return {state:'DEFER',topics:[],reason:'INVALID_INDEX'};}
}
