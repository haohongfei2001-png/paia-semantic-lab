from __future__ import annotations

import unittest

from semantic_lab.catalog import audit_catalog, load_catalog, validate_catalog_contract


class CatalogTests(unittest.TestCase):
    def test_catalog_contract_and_counts(self) -> None:
        catalog = load_catalog()
        validate_catalog_contract(catalog)
        self.assertEqual(144, len(catalog["topics"]))
        self.assertEqual(18, len(catalog["domains"]))

    def test_duplicate_alias_neighbor_and_lineage_audit(self) -> None:
        audit = audit_catalog(load_catalog())
        self.assertEqual(0, audit["blocking_error_count"], audit["errors"])


if __name__ == "__main__":
    unittest.main()
