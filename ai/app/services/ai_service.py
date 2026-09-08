import re
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from ..config import OLLAMA_URL, OLLAMA_MODEL
from ..models.ai import AIChatResponse, AISummarizeResponse
from ..models.ai import (
    AISearchResult,
    AISpamResponse,
    AIToxicityResponse,
    AIModerationResponse,
    AISmartReplyResponse,
)


def _ollama_chat(
    system_prompt: str,
    user_prompt: str,
    json_mode: bool = False,
) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        "stream": False,
    }

    if json_mode:
        payload["format"] = "json"

    request = Request(
        f"{OLLAMA_URL.rstrip('/')}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=120) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise RuntimeError(f"Ollama returned HTTP {error.code}") from error
    except URLError as error:
        raise RuntimeError("Ollama is not running") from error

    content = data.get("message", {}).get("content", "").strip()

    if not content:
        raise RuntimeError("Ollama returned an empty response")

    return content


def generate_chat_response(message: str) -> AIChatResponse:
    response = _ollama_chat(
        system_prompt=(
            "You are the AI assistant inside a real-time chat application. "
            "Be helpful, clear, concise, and friendly. "
            "Do not claim to have performed actions you did not perform."
        ),
        user_prompt=message,
    )

    return AIChatResponse(
        response=response,
        model=OLLAMA_MODEL,
    )


def summarize_messages(messages: list[str]) -> AISummarizeResponse:
    conversation = "\n".join(f"- {message}" for message in messages)

    summary = _ollama_chat(
        system_prompt=(
            "Summarize the conversation clearly and briefly. "
            "Identify the main topics, important decisions, "
            "questions, and useful next steps. "
            "Do not invent information."
        ),
        user_prompt=f"Summarize this conversation:\n\n{conversation}",
    )

    return AISummarizeResponse(
        summary=summary,
        model=OLLAMA_MODEL,
    )


def smart_search_messages(
    query: str,
    messages: list[dict[str, str]],
) -> AISearchResult:
    formatted_messages = "\n".join(
        f"[{message['id']}] {message['content']}" for message in messages
    )

    prompt = f"""
Find the messages that best match the user's search request.

User search:
{query}

Messages:
{formatted_messages}

Return ONLY the matching message IDs.
Return one ID per line.
Do not explain anything.
If nothing matches, return NONE.
"""

    response = _ollama_chat(
        system_prompt=(
            "You are a smart message-search engine. "
            "Match messages by meaning, not only exact words. "
            "Return only IDs from the provided messages."
        ),
        user_prompt=prompt,
    )

    if response.strip().upper() == "NONE":
        return AISearchResult(
            message_ids=[],
            model=OLLAMA_MODEL,
        )

    valid_ids = {message["id"] for message in messages}

    found_ids = []

    for value in re.findall(
        r"[0-9a-fA-F-]{20,}",
        response,
    ):
        if value in valid_ids and value not in found_ids:
            found_ids.append(value)

    return AISearchResult(
        message_ids=found_ids,
        model=OLLAMA_MODEL,
    )


def detect_spam(message: str) -> AISpamResponse:
    prompt = f"""
Classify the following chat message as spam or not spam.

Message:
{message}

Spam usually includes:
- repeated unwanted advertising
- suspicious promotional messages
- scam-like messages
- fake prizes or urgent money requests
- excessive repeated links or promotional content

Normal conversation is not spam.

Return ONLY a valid JSON object.

The JSON must use exactly these fields:

{{
  "is_spam": true,
  "confidence": 0.95,
  "reason": "Short explanation"
}}

or:

{{
  "is_spam": false,
  "confidence": 0.95,
  "reason": "Short explanation"
}}

Do not use Markdown.
Do not use code fences.
Do not add any text before or after the JSON.
"""

    response = _ollama_chat(
        system_prompt=(
            "You are a spam detection system for a chat application. "
            "Classify messages carefully. "
            "Do not treat normal conversation as spam. "
            "Return exactly one valid JSON object and nothing else."
        ),
        user_prompt=prompt,
    )

    response = response.strip()

    # Remove Markdown code fences if the model adds them.
    if response.startswith("```"):
        response = re.sub(
            r"^```(?:json)?\s*",
            "",
            response,
            flags=re.IGNORECASE,
        )

        response = re.sub(
            r"\s*```$",
            "",
            response,
        )

        response = response.strip()

    # If the model added text around the JSON,
    # extract the JSON object.
    if not response.startswith("{"):
        start = response.find("{")
        end = response.rfind("}")

        if start != -1 and end != -1 and end > start:
            response = response[start : end + 1]

    try:
        data = json.loads(response)

    except json.JSONDecodeError as error:
        raise RuntimeError("Ollama returned invalid spam detection JSON") from error

    if not isinstance(data, dict):
        raise RuntimeError("Ollama returned invalid spam detection JSON")

    is_spam = bool(
        data.get(
            "is_spam",
            False,
        )
    )

    try:
        confidence = float(
            data.get(
                "confidence",
                0.0,
            )
        )
    except (TypeError, ValueError):
        confidence = 0.0

    confidence = max(
        0.0,
        min(
            confidence,
            1.0,
        ),
    )

    reason = str(
        data.get(
            "reason",
            "No reason provided",
        )
    ).strip()

    if not reason:
        reason = "No reason provided"

    return AISpamResponse(
        is_spam=is_spam,
        confidence=confidence,
        reason=reason,
        model=OLLAMA_MODEL,
    )


def detect_toxicity(
    message: str,
) -> AIToxicityResponse:
    prompt = f"""
Classify the following chat message for toxicity.

Message:
{message}

Toxicity can include:
- abusive or insulting language
- harassment
- hateful or degrading language
- threatening language
- targeted personal attacks

Normal disagreement, criticism, jokes, or casual conversation
should not automatically be considered toxic.

Return ONLY a valid JSON object.

The JSON must use exactly these fields:

{{
  "is_toxic": true,
  "confidence": 0.95,
  "reason": "Short explanation"
}}

or:

{{
  "is_toxic": false,
  "confidence": 0.95,
  "reason": "Short explanation"
}}

Do not use Markdown.
Do not use code fences.
Do not add any text before or after the JSON.
"""

    response = _ollama_chat(
        system_prompt=(
            "You are a toxicity detection system "
            "for a chat application. "
            "Be careful not to classify normal conversation "
            "as toxic. "
            "Return exactly one valid JSON object and nothing else."
        ),
        user_prompt=prompt,
    )

    response = response.strip()

    # Remove Markdown code fences if the model adds them.
    if response.startswith("```"):
        response = re.sub(
            r"^```(?:json)?\s*",
            "",
            response,
            flags=re.IGNORECASE,
        )

        response = re.sub(
            r"\s*```$",
            "",
            response,
        )

        response = response.strip()

    # If the model adds text around the JSON,
    # extract the JSON object.
    if not response.startswith("{"):
        start = response.find("{")
        end = response.rfind("}")

        if start != -1 and end != -1 and end > start:
            response = response[start : end + 1]

    try:
        data = json.loads(response)

    except json.JSONDecodeError as error:
        raise RuntimeError("Ollama returned invalid toxicity detection JSON") from error

    if not isinstance(data, dict):
        raise RuntimeError("Ollama returned invalid toxicity detection JSON")

    is_toxic = bool(
        data.get(
            "is_toxic",
            False,
        )
    )

    try:
        confidence = float(
            data.get(
                "confidence",
                0.0,
            )
        )
    except (TypeError, ValueError):
        confidence = 0.0

    confidence = max(
        0.0,
        min(
            confidence,
            1.0,
        ),
    )

    reason = str(
        data.get(
            "reason",
            "No reason provided",
        )
    ).strip()

    if not reason:
        reason = "No reason provided"

    return AIToxicityResponse(
        is_toxic=is_toxic,
        confidence=confidence,
        reason=reason,
        model=OLLAMA_MODEL,
    )


def moderate_message(
    message: str,
) -> AIModerationResponse:
    spam_result = detect_spam(message)

    toxicity_result = detect_toxicity(message)

    spam_confident = spam_result.is_spam and spam_result.confidence >= 0.80

    toxicity_confident = toxicity_result.is_toxic and toxicity_result.confidence >= 0.80

    if spam_confident:
        return AIModerationResponse(
            allowed=False,
            is_spam=True,
            is_toxic=toxicity_result.is_toxic,
            confidence=spam_result.confidence,
            reason=spam_result.reason,
            model=OLLAMA_MODEL,
        )

    if toxicity_confident:
        return AIModerationResponse(
            allowed=False,
            is_spam=spam_result.is_spam,
            is_toxic=True,
            confidence=toxicity_result.confidence,
            reason=toxicity_result.reason,
            model=OLLAMA_MODEL,
        )

    return AIModerationResponse(
        allowed=True,
        is_spam=spam_result.is_spam,
        is_toxic=toxicity_result.is_toxic,
        confidence=max(
            spam_result.confidence,
            toxicity_result.confidence,
        ),
        reason="Message passed moderation",
        model=OLLAMA_MODEL,
    )


def generate_smart_replies(
    message: str,
) -> AISmartReplyResponse:
    prompt = f"""
Generate exactly 3 short, natural reply suggestions
for the following chat message.

Message:
{message}

Return ONLY this JSON object:

{{
  "replies": [
    "First reply",
    "Second reply",
    "Third reply"
  ]
}}
"""

    response = _ollama_chat(
        system_prompt=(
            "You generate short smart replies "
            "for a chat application. "
            "Return only valid JSON."
        ),
        user_prompt=prompt,
        json_mode=True,
    )

    raw_response = response.strip()

    # Remove markdown code fences if the model adds them.
    if raw_response.startswith("```"):
        lines = raw_response.splitlines()

        if lines:
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        raw_response = "\n".join(lines).strip()

    # Find the JSON object if the model adds extra text.
    start = raw_response.find("{")
    end = raw_response.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise RuntimeError("Ollama returned invalid smart reply JSON")

    json_text = raw_response[start : end + 1]

    try:
        data = json.loads(json_text)
    except json.JSONDecodeError as error:
        print(
            "Invalid smart reply response:",
            raw_response,
        )

        raise RuntimeError("Ollama returned invalid smart reply JSON") from error

    replies = data.get("replies", [])

    if not isinstance(replies, list):
        raise RuntimeError("Ollama returned invalid smart replies")

    cleaned_replies = []

    for reply in replies:
        if not isinstance(reply, str):
            continue

        cleaned = reply.strip()

        if not cleaned:
            continue

        cleaned_replies.append(cleaned)

        if len(cleaned_replies) == 3:
            break

    if not cleaned_replies:
        raise RuntimeError("Ollama returned no smart replies")

    return AISmartReplyResponse(
        replies=cleaned_replies,
        model=OLLAMA_MODEL,
    )
