from __future__ import annotations

from html import escape
from typing import Any


def render_evidence_browser(
    records: list[dict[str, Any]],
    *,
    challenge_queue: list[dict[str, Any]] | None = None,
    disagreement_queue: list[dict[str, Any]] | None = None,
) -> str:
    """Render a deterministic, read-only Lab Evidence Browser snapshot."""
    challenge_ids = {str(item["query_id"]) for item in (challenge_queue or [])}
    disagreement_ids = {str(item["query_id"]) for item in (disagreement_queue or [])}
    parts = [
        "<!doctype html>",
        '<html lang="en"><head><meta charset="utf-8">',
        "<title>PAIA Semantic Lab Evidence Browser</title>",
        "<style>body{font-family:system-ui,sans-serif;max-width:1100px;margin:32px auto;padding:0 20px}"
        "article{border:1px solid #ddd;border-radius:10px;padding:16px;margin:16px 0}"
        "ol{padding-left:24px}.meta{color:#555}.flag{font-weight:600;margin-right:10px}"
        "code{white-space:pre-wrap;word-break:break-word}</style></head><body>",
        "<h1>PAIA Semantic Lab Evidence Browser</h1>",
        "<p>Read-only synthetic/public evidence surface. No owner semantic labeling controls are present.</p>",
    ]
    for record in records:
        query_id = str(record["query_id"])
        flags: list[str] = []
        if query_id in challenge_ids:
            flags.append("CHALLENGE")
        if query_id in disagreement_ids:
            flags.append("DISAGREEMENT")
        if record.get("no_answer"):
            flags.append("NO_ANSWER")
        parts.append(f'<article data-query-id="{escape(query_id)}">')
        parts.append(f"<h2>{escape(query_id)} — {escape(str(record['query_text']))}</h2>")
        if flags:
            parts.append(
                '<p class="meta">'
                + " ".join(f'<span class="flag">{escape(flag)}</span>' for flag in flags)
                + "</p>"
            )
        parts.append(
            '<p class="meta">'
            f"mode={escape(str(record['scoring']))}/{escape(str(record['aggregation']))}; "
            f"top_score={float(record['top_score']):.6f}; threshold={float(record['threshold']):.6f}"
            "</p>"
        )
        hits = list(record.get("hits", []))
        if not hits:
            parts.append("<p>No ranked evidence.</p>")
        else:
            parts.append("<ol>")
            for hit in hits:
                span = hit["evidence_span"]
                components = hit["score_components"]
                parts.append(
                    "<li>"
                    f"<strong>{escape(str(hit['doc_id']))}</strong> "
                    f"score={float(hit['score']):.6f}; "
                    f"lexical={float(components['lexical']):.6f}; "
                    f"dense={float(components['dense']):.6f}; "
                    f"exact_bonus={float(components['exact_term_bonus']):.6f}; "
                    f"span=[{int(span['start'])},{int(span['end'])}) "
                    f"<code>{escape(str(span['text']))}</code>"
                    "</li>"
                )
            parts.append("</ol>")
        parts.append("</article>")
    parts.append("</body></html>")
    return "\n".join(parts) + "\n"
