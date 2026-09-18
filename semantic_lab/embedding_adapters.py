from __future__ import annotations

import hashlib
import math
import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Sequence

from .isolation import SAFE_EVIDENCE_CLASSES


class ManifestValidationError(ValueError):
    pass


class InputTooLongError(ValueError):
    pass


class AdapterUnavailable(RuntimeError):
    pass


class UnsafeEgressError(RuntimeError):
    pass


@dataclass(frozen=True)
class CandidateSpec:
    candidate_id: str
    kind: str
    provider: str | None
    license: str | None
    context_tokens: int | None
    dimensions: tuple[int, ...]
    prompt_policy: str
    runtime_policy: str
    source_urls: tuple[str, ...]
    revision: str | None = None
    trust_remote_code: bool = False
    price_usd_per_million_input_tokens: float | None = None
    price_status: str = "N/A"

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "CandidateSpec":
        dims = raw.get("dimensions", [])
        if isinstance(dims, int):
            dims = [dims]
        return cls(
            candidate_id=str(raw["id"]),
            kind=str(raw["kind"]),
            provider=raw.get("provider"),
            license=raw.get("license"),
            context_tokens=int(raw["context_tokens"]) if raw.get("context_tokens") is not None else None,
            dimensions=tuple(int(value) for value in dims),
            prompt_policy=str(raw.get("prompt_policy", "none")),
            runtime_policy=str(raw.get("runtime_policy", "PINNED_RUNTIME_REQUIRED")),
            source_urls=tuple(str(value) for value in raw.get("source_urls", [])),
            revision=str(raw["revision"]) if raw.get("revision") else None,
            trust_remote_code=bool(raw.get("trust_remote_code", False)),
            price_usd_per_million_input_tokens=(
                float(raw["price_usd_per_million_input_tokens"])
                if raw.get("price_usd_per_million_input_tokens") is not None
                else None
            ),
            price_status=str(raw.get("price_status", "N/A")),
        )


def validate_candidate_spec(spec: CandidateSpec) -> None:
    if spec.kind not in {"local", "api"}:
        raise ManifestValidationError(f"Unsupported candidate kind: {spec.kind}")
    if not spec.candidate_id.strip():
        raise ManifestValidationError("Candidate id is required")
    if spec.kind == "local" and not spec.license:
        raise ManifestValidationError(f"Local candidate {spec.candidate_id} lacks license metadata")
    if spec.kind == "local" and "PINNED" in spec.runtime_policy and not spec.revision:
        raise ManifestValidationError(f"Local candidate {spec.candidate_id} lacks pinned revision")
    if spec.trust_remote_code and not spec.revision:
        raise ManifestValidationError(f"Remote-code candidate {spec.candidate_id} must pin a revision")
    if spec.kind == "api" and not spec.provider:
        raise ManifestValidationError(f"API candidate {spec.candidate_id} lacks provider")
    if not spec.context_tokens or spec.context_tokens <= 0:
        raise ManifestValidationError(f"Candidate {spec.candidate_id} lacks positive context_tokens")
    if not spec.dimensions or any(value <= 0 for value in spec.dimensions):
        raise ManifestValidationError(f"Candidate {spec.candidate_id} lacks dimensions")
    if not spec.source_urls:
        raise ManifestValidationError(f"Candidate {spec.candidate_id} lacks verification sources")


def apply_prompt(spec: CandidateSpec, role: str, text: str, task_instruction: str) -> str:
    if role not in {"query", "document"}:
        raise ValueError(f"Unsupported embedding role: {role}")
    policy = spec.prompt_policy
    if policy == "qwen_instruct_query":
        return f"Instruct: {task_instruction}\nQuery: {text}" if role == "query" else text
    if policy == "e5_instruct_query":
        return f"Instruct: {task_instruction}\nQuery: {text}" if role == "query" else text
    if policy == "nomic_search_prefix":
        return ("search_query: " if role == "query" else "search_document: ") + text
    if policy in {"provider_input_type", "none"}:
        return text
    raise ManifestValidationError(f"Unknown prompt policy {policy} for {spec.candidate_id}")


def _normalize(text: str) -> str:
    value = unicodedata.normalize("NFKC", text).casefold().strip()
    return re.sub(r"\s+", " ", value)


def _char_ngrams(text: str, n: int = 3) -> set[str]:
    value = _normalize(text)
    compact = re.sub(r"\s+", "", value)
    if not compact:
        return set()
    if len(compact) <= n:
        return {compact}
    return {compact[index : index + n] for index in range(len(compact) - n + 1)}


def cosine(left: Sequence[float], right: Sequence[float]) -> float:
    if len(left) != len(right):
        raise ValueError("Vector dimensions differ")
    dot = sum(a * b for a, b in zip(left, right))
    lnorm = math.sqrt(sum(value * value for value in left))
    rnorm = math.sqrt(sum(value * value for value in right))
    if lnorm == 0.0 or rnorm == 0.0:
        return 0.0
    return dot / (lnorm * rnorm)


class HashNgramEmbeddingAdapter:
    """Deterministic synthetic control; never presented as a candidate model result."""

    def __init__(self, dimensions: int = 128, max_codepoints: int = 65536):
        if dimensions <= 0:
            raise ValueError("dimensions must be positive")
        self.dimensions = dimensions
        self.max_codepoints = max_codepoints

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            if len(text) > self.max_codepoints:
                raise InputTooLongError("Control input exceeds explicit max_codepoints; truncation is forbidden")
            vector = [0.0] * self.dimensions
            grams = _char_ngrams(text)
            for gram in grams:
                digest = hashlib.sha256(gram.encode("utf-8")).digest()
                slot = int.from_bytes(digest[:4], "big") % self.dimensions
                sign = -1.0 if digest[4] & 1 else 1.0
                vector[slot] += sign
            norm = math.sqrt(sum(value * value for value in vector))
            if norm:
                vector = [value / norm for value in vector]
            vectors.append(vector)
        return vectors


class LexicalControl:
    def score(self, query: str, document: str) -> float:
        q = _char_ngrams(query)
        d = _char_ngrams(document)
        if not q or not d:
            return 0.0
        return len(q & d) / len(q | d)


class LocalEmbeddingAdapter:
    """Runtime-injected local adapter with explicit token preflight and no download path."""

    def __init__(
        self,
        spec: CandidateSpec,
        *,
        token_counter: Callable[[str], int] | None,
        encoder: Callable[[Sequence[str]], Sequence[Sequence[float]]] | None,
        task_instruction: str,
    ):
        validate_candidate_spec(spec)
        if spec.kind != "local":
            raise ValueError("LocalEmbeddingAdapter requires a local candidate")
        self.spec = spec
        self.token_counter = token_counter
        self.encoder = encoder
        self.task_instruction = task_instruction

    def embed(self, texts: Sequence[str], *, role: str) -> list[list[float]]:
        if self.token_counter is None or self.encoder is None:
            raise AdapterUnavailable("Pinned tokenizer/model runtime must be injected; automatic downloads are disabled")
        prepared = [apply_prompt(self.spec, role, text, self.task_instruction) for text in texts]
        for value in prepared:
            tokens = int(self.token_counter(value))
            if tokens > int(self.spec.context_tokens or 0):
                raise InputTooLongError(
                    f"{self.spec.candidate_id} input has {tokens} tokens > {self.spec.context_tokens}; truncation forbidden"
                )
        raw = self.encoder(prepared)
        vectors = [[float(value) for value in vector] for vector in raw]
        if len(vectors) != len(prepared):
            raise AdapterUnavailable("Encoder returned a different number of vectors")
        if vectors and any(len(vector) == 0 for vector in vectors):
            raise AdapterUnavailable("Encoder returned an empty vector")
        return vectors


class ApiEmbeddingAdapter:
    """Provider adapter boundary. Network access exists only in an injected transport."""

    def __init__(
        self,
        spec: CandidateSpec,
        *,
        transport: Callable[[dict[str, Any]], dict[str, Any]] | None,
        token_counter: Callable[[str], int] | None = None,
    ):
        validate_candidate_spec(spec)
        if spec.kind != "api":
            raise ValueError("ApiEmbeddingAdapter requires an api candidate")
        self.spec = spec
        self.transport = transport
        self.token_counter = token_counter

    def build_payload(self, texts: Sequence[str], *, role: str) -> dict[str, Any]:
        if role not in {"query", "document"}:
            raise ValueError(f"Unsupported embedding role: {role}")
        if self.token_counter is not None:
            for text in texts:
                tokens = int(self.token_counter(text))
                if tokens > int(self.spec.context_tokens or 0):
                    raise InputTooLongError(
                        f"{self.spec.candidate_id} input has {tokens} tokens > {self.spec.context_tokens}; truncation forbidden"
                    )
        provider = self.spec.provider
        if provider == "voyage":
            return {
                "model": self.spec.candidate_id,
                "texts": list(texts),
                "input_type": role,
                "truncation": False,
                "output_dimension": self.spec.dimensions[0],
            }
        if provider == "openai":
            return {"model": self.spec.candidate_id, "input": list(texts), "dimensions": self.spec.dimensions[0]}
        if provider == "cohere":
            return {
                "model": self.spec.candidate_id,
                "texts": list(texts),
                "input_type": "search_query" if role == "query" else "search_document",
                "truncate": "NONE",
                "output_dimension": self.spec.dimensions[0],
                "embedding_types": ["float"],
            }
        raise ManifestValidationError(f"Unsupported API provider: {provider}")

    def embed(
        self,
        texts: Sequence[str],
        *,
        role: str,
        evidence_class: str,
        contains_real_paia_input: bool,
    ) -> dict[str, Any]:
        if evidence_class not in SAFE_EVIDENCE_CLASSES or contains_real_paia_input:
            raise UnsafeEgressError("Only public/synthetic/catalog-boundary text may cross the SEM-01 API adapter")
        if self.transport is None:
            raise AdapterUnavailable("No authorized API transport is injected")
        return self.transport(self.build_payload(texts, role=role))


def deterministic_fake_encoder(texts: Sequence[str], dimensions: int = 16) -> list[list[float]]:
    return HashNgramEmbeddingAdapter(dimensions=dimensions).embed(texts)


def whitespace_token_counter(text: str) -> int:
    return max(1, len(text.split())) if text else 0


def vector_digest(vectors: Iterable[Sequence[float]]) -> str:
    hasher = hashlib.sha256()
    for vector in vectors:
        hasher.update((",".join(f"{float(value):.12g}" for value in vector) + "\n").encode("utf-8"))
    return hasher.hexdigest()
