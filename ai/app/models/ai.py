from pydantic import BaseModel, Field


class AIChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=4000,
    )


class AIChatResponse(BaseModel):
    response: str
    model: str


class AISummarizeRequest(BaseModel):
    messages: list[str] = Field(
        min_length=1,
        max_length=50,
    )


class AISummarizeResponse(BaseModel):
    summary: str
    model: str


class AISearchMessage(BaseModel):
    id: str
    content: str


class AISearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    messages: list[AISearchMessage] = Field(
        min_length=1,
        max_length=100,
    )


class AISearchResult(BaseModel):
    message_ids: list[str]
    model: str


class AISpamRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=4000,
    )


class AISpamResponse(BaseModel):
    is_spam: bool
    confidence: float
    reason: str
    model: str


class AIToxicityRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=4000,
    )


class AIToxicityResponse(BaseModel):
    is_toxic: bool
    confidence: float
    reason: str
    model: str


class AIModerationRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=4000,
    )


class AIModerationResponse(BaseModel):
    allowed: bool
    is_spam: bool
    is_toxic: bool
    confidence: float
    reason: str
    model: str


class AISmartReplyRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=4000,
    )

class AISmartReplyResponse(BaseModel):
    replies: list[str]
    model: str
