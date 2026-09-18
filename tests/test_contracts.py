from __future__ import annotations

import unittest

from semantic_lab.catalog import load_catalog
from semantic_lab.contracts import validate_contract, validate_contract_bundle
from semantic_lab.manifest import build_run_manifest


class ContractTests(unittest.TestCase):
    def test_bundle_is_valid(self) -> None:
        validate_contract_bundle()

    def test_catalog_contract(self) -> None:
        validate_contract(load_catalog(), "TopicCatalog")

    def test_run_manifest_contract(self) -> None:
        manifest = build_run_manifest(
            lab_commit="0" * 40,
            catalog_version="0.2.0",
            started_at="2026-09-18T00:00:00+00:00",
            completed_at="2026-09-18T00:00:01+00:00",
        )
        validate_contract(manifest, "RunManifest")
        self.assertIsNone(manifest["input_snapshot_fingerprint"])
        self.assertEqual([], manifest["model_fingerprints"])


if __name__ == "__main__":
    unittest.main()
