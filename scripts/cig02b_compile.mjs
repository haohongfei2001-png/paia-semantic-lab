import fs from "node:fs";
import crypto from "node:crypto";

const manifestPath = "semantic_profiles/v0.1/manifest.json";
const catalogPath = "catalog/system_topic_catalog_v0.2.yaml";
const manifestBytes = fs.readFileSync(manifestPath);
const catalogBytes = fs.readFileSync(catalogPath);
const manifest = JSON.parse(manifestBytes);
const catalogIds = [...catalogBytes.toString("utf8").matchAll(/^  - topic_id: ([^\s]+)$/gm)].map(match => match[1]);
if (catalogIds.length !== 144 || new Set(catalogIds).size !== 144 || manifest.profile_count !== 144) {
  throw new Error("formal Catalog or profile manifest is not exactly 144 Topics");
}
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const compact = value => String(value).normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
const actions = {
  en: ["want to", "need to", "plan to", "help me", "how do i", "how can i", "improve", "resolve", "organize", "compare", "understand", "choose", "track", "prepare"],
  zh: ["想", "需要", "打算", "请帮", "怎么", "如何", "改善", "解决", "整理", "比较", "理解", "选择", "追踪", "准备"]
};
const profiles = [];
const sourceShas = {};
for (const shard of manifest.shards) {
  if (!/^semantic_profiles\/v0\.1\/system_topics_shard_0[1-6]\.json$/.test(shard.path)) throw new Error("unapproved profile path");
  const bytes = fs.readFileSync(shard.path);
  sourceShas[shard.path] = sha256(bytes);
  const data = JSON.parse(bytes);
  if (data.profiles.length !== 24 || data.profile_count !== 24) throw new Error("profile shard size");
  profiles.push(...data.profiles);
}
if (profiles.length !== 144 || new Set(profiles.map(p => p.topic_id)).size !== 144 ||
    catalogIds.some(id => !profiles.some(p => p.topic_id === id))) throw new Error("profile/Catalog ID mismatch");
function atoms(values, lang, source, family) {
  return [...new Set(values.map(compact).filter(value => value.length > 1 && value.length <= 80))]
    .map(value => ({ value, lang, source, family }));
}
function coreCues(profile, lang) {
  const raw = profile.semantic_core[lang === "zh" ? 0 : 1] ?? "";
  const body = raw.includes(":") || raw.includes("：") ? raw.split(/[:：]/u).slice(1).join(":") : raw;
  return body.split(/[、，,。;]/u).map(x => x.replace(/\b(?:and|or)\b/giu, "").trim())
    .filter(x => x.length >= 2 && x.length <= 42).slice(0, 9);
}
const topics = profiles.sort((a,b) => a.topic_id.localeCompare(b.topic_id)).map(profile => {
  if (profile.status !== "DRAFT" || profile.provenance.formal_fields_overridden ||
      profile.provenance.source_classes.join(",") !== "FORMAL_CATALOG,GENERAL_SEMANTIC_REASONING") {
    throw new Error("unapproved profile provenance");
  }
  const objects = [
    ...atoms([profile.canonical_names.zh, ...profile.lexical_anchors.zh], "zh", "PUBLIC_PROFILE", "name_or_anchor"),
    ...atoms([profile.canonical_names.en, ...profile.lexical_anchors.en], "en", "PUBLIC_PROFILE", "name_or_anchor")
  ];
  const outcomes = [
    ...atoms(coreCues(profile, "zh"), "zh", "PUBLIC_PROFILE_SEMANTIC_CORE", "described_goal_concept"),
    ...atoms(coreCues(profile, "en"), "en", "PUBLIC_PROFILE_SEMANTIC_CORE", "described_goal_concept")
  ];
  if (!objects.length || !outcomes.length) throw new Error("missing typed atoms: " + profile.topic_id);
  return {
    topic_id: profile.topic_id, domain_id: profile.domain.id,
    atoms: { ACTION: ["GLOBAL_GOAL_ACTION"], OBJECT: objects, OUTCOME: outcomes,
      EXCLUSION: ["NOT_CURRENT_GOAL", "COMPETING_TOPIC"] }
  };
});
const index = {
  format: "cig02b-typed-index-v1", topic_count: 144, catalog_version: manifest.formal_catalog_version,
  provenance: { catalog_sha256: sha256(catalogBytes), manifest_sha256: sha256(manifestBytes),
    profile_shards_sha256: sourceShas, build_rule: "CIG-02B_GENERIC_TYPED_RULES" },
  global_action_atoms: actions,
  exclusion_rules: ["NOT_CURRENT_GOAL", "COMPETING_TOPIC"],
  topics
};
const output = JSON.stringify(index) + "\n";
if (Buffer.byteLength(output) > 1048576) throw new Error("index exceeds 1 MiB");
const path = process.argv[2] ?? ".cig02b-index.json";
fs.writeFileSync(path, output);
console.log(JSON.stringify({format:index.format,topic_count:topics.length,index_bytes:Buffer.byteLength(output),
  index_sha256:sha256(output),atom_counts:{OBJECT:topics.reduce((n,t)=>n+t.atoms.OBJECT.length,0),
  OUTCOME:topics.reduce((n,t)=>n+t.atoms.OUTCOME.length,0),ACTION:actions.zh.length+actions.en.length,
  EXCLUSION:2},source_shards:Object.keys(sourceShas).length}));
