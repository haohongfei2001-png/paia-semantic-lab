import fs from "node:fs";
import { createCatalogNameGrounder } from "../runtime/compositional_intent_graph_v1/catalog_name_grounder.mjs";

const index = JSON.parse(fs.readFileSync(process.argv[2] ?? ".cig02c-index.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("semantic_profiles/v0.1/manifest.json", "utf8"));
const profiles = manifest.shards.flatMap(shard => JSON.parse(fs.readFileSync(shard.path, "utf8")).profiles);
const router = createCatalogNameGrounder(index, "balanced");
const misses = [];
for (let i=0;i<profiles.length;i++) {
  const profile=profiles[i], decoy=profiles[(i+1)%profiles.length];
  const probes = [
    ["en", "Help me with " + profile.canonical_names.en + "."],
    ["zh", "我想处理" + profile.canonical_names.zh + "。"],
    ["en_role", "I want to understand " + profile.canonical_names.en + " by using " + decoy.canonical_names.en + "."],
    ["zh_role", "为了理解" + profile.canonical_names.zh + "，我用" + decoy.canonical_names.zh + "做记录。"]
  ];
  for (const [language, current] of probes) {
    const predicted = router.classify({current}).topics;
    if (predicted.length !== 1 || predicted[0] !== profile.topic_id) {
      misses.push({topic_id:profile.topic_id,language,predicted});
    }
  }
}
const summary={format:"cig02-source-derived-catalog-eligibility-smoke-v1",
  topic_count:profiles.length,probe_count:profiles.length*4,miss_count:misses.length,misses,
  interpretation_scope:"SOURCE_DERIVED_ELIGIBILITY_ONLY_NOT_PUBLIC_DEV_OR_CAPABILITY"};
console.log("CIG02_CATALOG_ELIGIBILITY_JSON="+JSON.stringify(summary));
if (profiles.length!==144 || misses.length) process.exitCode=1;
