import httpx
from app.config import settings

_ENDPOINT = "https://api.runpod.ai/v2/8r4mlzo7txxs5v/runsync"
_TIMEOUT  = 120.0


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.runpod_api_key}"}


async def _post(payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        res = await client.post(_ENDPOINT, headers=_headers(), json=payload)
        res.raise_for_status()
        return res.json()["output"]


async def summarize(experience_text: str) -> dict:
    """Task C: 한줄요약 생성"""
    return await _post({
        "input": {
            "task": "task_c",
            "experience_text": experience_text,
        }
    })


async def compress(experience_text: str, target_tokens: int) -> dict:
    """Task C-Ext: 목표 토큰 수로 자동압축.
    짧은 원문(<150 추정 토큰)은 API 호출 없이 원문 반환.
    결과가 target × 2배 이상이면 task_c로 fallback.
    """
    estimated = int(len(experience_text) * 1.5)
    if estimated < 150:
        return {
            "summary": experience_text,
            "token_count": estimated,
            "char_count": len(experience_text),
        }

    # target_tokens 범위 클램핑 (50~400)
    target_tokens = max(50, min(400, target_tokens))

    output = await _post({
        "input": {
            "task": "task_cext",
            "experience_text": experience_text,
            "target_tokens": target_tokens,
        }
    })

    # 편차가 너무 크면 task_c로 fallback
    if output.get("token_count", 0) >= target_tokens * 2:
        return await summarize(experience_text)

    return output
