import os

from fastapi import APIRouter, Header, HTTPException

from ..models.ai import (
    AIChatRequest,
    AIChatResponse,
    AISummarizeRequest,
    AISummarizeResponse,
    AISearchRequest,
    AISearchResult,
    AISpamRequest,
    AISpamResponse,
    AIToxicityRequest,
    AIToxicityResponse,
    AIModerationRequest,
    AIModerationResponse,
    AISmartReplyRequest,
    AISmartReplyResponse,
)


from ..services.ai_service import (
    generate_chat_response,
    summarize_messages,
    smart_search_messages,
    detect_spam,
    detect_toxicity,
    moderate_message,
    generate_smart_replies,
)

router = APIRouter(
    prefix="/internal",
    tags=["AI Chat"],
)


def verify_internal_token(
    x_ai_internal_token: str | None,
) -> None:
    expected_token = os.getenv("AI_INTERNAL_TOKEN")

    if not expected_token:
        raise HTTPException(
            status_code=500,
            detail="AI_INTERNAL_TOKEN is not configured",
        )

    if x_ai_internal_token != expected_token:
        raise HTTPException(
            status_code=401,
            detail="Invalid internal token",
        )


@router.post(
    "/chat",
    response_model=AIChatResponse,
)
def chat(
    request: AIChatRequest,
    x_ai_internal_token: str | None = Header(default=None),
):
    verify_internal_token(x_ai_internal_token)

    try:
        return generate_chat_response(request.message)

    except Exception as error:
        print("AI generation failed:", error)

        raise HTTPException(
            status_code=502,
            detail=str(error),
        ) from error


@router.post(
    "/summarize",
    response_model=AISummarizeResponse,
)
def summarize(
    request: AISummarizeRequest,
    x_ai_internal_token: str | None = Header(default=None),
):
    verify_internal_token(x_ai_internal_token)

    try:
        return summarize_messages(request.messages)

    except Exception as error:
        print("AI summarization failed:", error)

        raise HTTPException(
            status_code=502,
            detail=str(error),
        ) from error


@router.post(
    "/search",
    response_model=AISearchResult,
)
def search(
    request: AISearchRequest,
    x_ai_internal_token: str | None = Header(default=None),
):
    verify_internal_token(x_ai_internal_token)

    try:
        result = smart_search_messages(
            request.query,
            [
                {
                    "id": message.id,
                    "content": message.content,
                }
                for message in request.messages
            ],
        )

        return result

    except Exception as error:
        print(
            "AI smart search failed:",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail=str(error),
        ) from error


@router.post(
    "/spam-check",
    response_model=AISpamResponse,
)
def spam_check(
    request: AISpamRequest,
    x_ai_internal_token: str | None = Header(default=None),
):
    verify_internal_token(x_ai_internal_token)

    try:
        result = detect_spam(request.message)

        return result

    except Exception as error:
        print(
            "AI spam detection failed:",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail=str(error),
        ) from error


@router.post(
    "/toxicity-check",
    response_model=AIToxicityResponse,
)
def toxicity_check(
    request: AIToxicityRequest,
    x_ai_internal_token: str | None = Header(default=None),
):
    verify_internal_token(x_ai_internal_token)

    try:
        result = detect_toxicity(request.message)

        return result

    except Exception as error:
        print(
            "AI toxicity detection failed:",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail=str(error),
        ) from error


@router.post(
    "/moderate",
    response_model=AIModerationResponse,
)
def moderate(
    request: AIModerationRequest,
    x_ai_internal_token: str | None = Header(default=None),
):
    verify_internal_token(x_ai_internal_token)

    try:
        result = moderate_message(request.message)

        return result

    except Exception as error:
        print(
            "AI auto moderation failed:",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail=str(error),
        ) from error


@router.post(
    "/smart-replies",
    response_model=AISmartReplyResponse,
)
def smart_replies(
    request: AISmartReplyRequest,
    x_ai_internal_token: str | None = Header(default=None),
):
    verify_internal_token(x_ai_internal_token)

    try:
        result = generate_smart_replies(request.message)

        return result

    except Exception as error:
        print(
            "AI smart replies failed:",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail=str(error),
        ) from error
