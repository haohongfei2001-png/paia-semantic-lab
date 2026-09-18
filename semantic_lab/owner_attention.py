from __future__ import annotations


class OwnerAttentionViolation(RuntimeError):
    pass


SEMANTIC_OWNER_TASKS = frozenset(
    {
        "input_to_topic_label",
        "retrieval_relevance_label",
        "per_model_trial",
        "repeated_semantic_judgment",
    }
)


def _round_number(round_id: str) -> int:
    try:
        prefix, number = round_id.split("-", 1)
        if prefix != "SEM":
            raise ValueError
        return int(number)
    except (ValueError, AttributeError) as exc:
        raise OwnerAttentionViolation(f"Invalid round id: {round_id}") from exc


def open_owner_task(round_id: str, task_type: str) -> dict[str, str]:
    if task_type == "create_formal_topic":
        raise OwnerAttentionViolation("Formal Topic creation is not an AI action")
    if _round_number(round_id) <= 5 and task_type in SEMANTIC_OWNER_TASKS:
        raise OwnerAttentionViolation(
            f"{task_type} is blocked by the Owner Attention Budget through SEM-05"
        )
    return {"round": round_id, "task_type": task_type, "status": "OPEN"}
