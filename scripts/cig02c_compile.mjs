import fs from "node:fs";
import crypto from "node:crypto";

const baseBytes = fs.readFileSync(process.argv[2] ?? ".cig02b-index.json");
const base = JSON.parse(baseBytes);
if (base.format !== "cig02b-typed-index-v1" || base.topic_count !== 144) throw new Error("invalid base index");
const manifest = JSON.parse(fs.readFileSync("semantic_profiles/v0.1/manifest.json", "utf8"));
const profiles = manifest.shards.flatMap(shard => JSON.parse(fs.readFileSync(shard.path, "utf8")).profiles);
const byId = new Map(profiles.map(profile => [profile.topic_id, profile.canonical_names]));
if (byId.size !== 144) throw new Error("profile ID mismatch");
const index = {
  ...base, format:"cig02c-typed-catalog-name-index-v1",
  provenance:{...base.provenance,base_index_sha256:crypto.createHash("sha256").update(baseBytes).digest("hex"),
    extension_rule:"GLOBAL_EXACT_FORMAL_NAME_GATE"},
  topics:base.topics.map(topic => {
    const names = byId.get(topic.topic_id);
    if (!names?.zh || !names?.en) throw new Error("missing formal name: "+topic.topic_id);
    return {...topic,canonical_names:names};
  })
};
const output=JSON.stringify(index)+"\n";
if (Buffer.byteLength(output)>1048576) throw new Error("index exceeds 1 MiB");
fs.writeFileSync(process.argv[3] ?? ".cig02c-index.json",output);
console.log(JSON.stringify({format:index.format,topic_count:index.topics.length,index_bytes:Buffer.byteLength(output),
  index_sha256:crypto.createHash("sha256").update(output).digest("hex")}));
