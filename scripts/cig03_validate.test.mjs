import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePacket} from './cig03_validate.mjs';
function stub(){
 const ids=['stub.group.alpha','stub.group.beta'],ref='stub-ref';
 const row=(n,t)=>({id:'z'+String(n).padStart(6,'0'),current:'opaque stub input '+n,language:'en',rationale:'semantic-free validation rationale',gold:{state:'ASSIGN',topics:[t]},provenance:{source_kind:'NEW_AUTHORED_SYNTHETIC',source_ref:ref,catalog_path:'catalog/system_topic_catalog_v0.2.yaml',formal_topic_ids:[t],profile_paths:[],evidence:'stub'}});
 const p={schema_version:'cig03-independent-test-v1',metadata:{test_started:false,candidate_source_ref:ref,authorship:'single isolated agent'},topic_ids:ids,single_label:[row(1,ids[0]),row(2,ids[0]),row(3,ids[1]),row(4,ids[1])],context:[{...row(5,ids[0]),context:{recent_inputs:['opaque prior'],activity_topic_ids:[ids[1]]}}],controls:[{...row(6,ids[0]),control_type:'insufficient',gold:{state:'DEFER',topics:[]},provenance:{...row(6,ids[0]).provenance,formal_topic_ids:[]}}]};
 return {p,options:{topicIds:ids,expectedRef:ref,production:false,minimum:{single_label:4,context:1,controls:1}}};
}
test('valid semantic-free schema stub',()=>{const {p,options}=stub();assert.equal(validatePacket(p,options).passed,true);});
test('no private or unpinned provenance admitted',()=>{const {p,options}=stub();p.single_label[0].provenance.source_ref='other';assert.equal(validatePacket(p,options).passed,false);});
test('per-topic coverage cannot be replaced by total count',()=>{const {p,options}=stub();p.single_label[3].gold.topics=[options.topicIds[0]];p.single_label[3].provenance.formal_topic_ids=[options.topicIds[0]];assert.equal(validatePacket(p,options).passed,false);});
test('duplicate opaque IDs rejected',()=>{const {p,options}=stub();p.controls[0].id=p.single_label[0].id;assert.equal(validatePacket(p,options).passed,false);});
