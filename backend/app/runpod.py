import httpx
from app.config import settings

_ENDPOINT_C = "https://api.runpod.ai/v2/8r4mlzo7txxs5v/runsync?timeout=290"
_ENDPOINT_A = "https://api.runpod.ai/v2/ub5ilhilso4u84/runsync?timeout=290"
_TIMEOUT    = 300.0


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.runpod_api_key}"}


async def _post(endpoint: str, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        res = await client.post(endpoint, headers=_headers(), json=payload)
        res.raise_for_status()
        body = res.json()
        if "output" not in body:
            raise RuntimeError(f"RunPod 응답에 output 없음: status={body.get('status')}, body={body}")
        return body["output"]


async def analyze_dream(dream_text: str) -> dict:
    """Task A: 간단 해몽"""
    return await _post(_ENDPOINT_A, {
        "input": {
            "task": "task_a",
            "dream_text": dream_text,
        }
    })


async def summarize(experience_text: str) -> dict:
    """Task C: 한줄요약 생성"""
    return await _post(_ENDPOINT_C, {
        "input": {
            "task": "task_c",
            "experience_text": experience_text,
        }
    })


_MODE_TAG = {
    "original": "경험-원문",
    "summary":  "경험-요약",
    "compress": "경험-자동압축",
}


def _build_experience_block(experiences: list) -> str:
    """경험 목록을 Task D 규격 태그 블록으로 조립."""
    if not experiences:
        return ""
    blocks = []
    for exp in experiences:
        tag = _MODE_TAG.get(exp.get("mode", "original"), "경험-원문")
        blocks.append(f"[{tag}]\n제목: {exp['title']}\n{exp['text']}\n[/{tag}]")
    return "\n".join(blocks)


async def deep_analyze(dream_text: str, experiences: list) -> dict:
    """Task D: 심층 해석 (꿈 + 현실 경험 결합)
    experiences: [{"title": str, "text": str, "mode": str}]
    반환: {"interpretation": str, "char_count": int}
    """
    experience_block = _build_experience_block(experiences)
    return await _post(_ENDPOINT_A, {
        "input": {
            "task": "task_d",
            "dream_text": dream_text,
            "experience_block": experience_block,
        }
    })


async def broad_analyze(period: str, diaries: list, experiences: list) -> dict:
    """Task B: 종합 분석 (기간별 꿈 + 경험)"""
    return await _post(_ENDPOINT_A, {
        "input": {
            "task": "task_b",
            "period": period,
            "diaries": diaries,
            "experiences": experiences,
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

    output = await _post(_ENDPOINT_C, {
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
