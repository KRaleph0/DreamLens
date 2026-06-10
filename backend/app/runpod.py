from abc import ABC, abstractmethod

import httpx
from app.config import settings

_ENDPOINT_C = "https://api.runpod.ai/v2/8r4mlzo7txxs5v/runsync?timeout=290"
_ENDPOINT_A = "https://api.runpod.ai/v2/ub5ilhilso4u84/runsync?timeout=290"
_TIMEOUT    = 300.0

_MODE_TAG = {
    "original": "경험-원문",
    "summary":  "경험-요약",
    "compress": "경험-자동압축",
}


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


def _build_experience_block(experiences: list) -> str:
    if not experiences:
        return ""
    blocks = []
    for exp in experiences:
        tag = _MODE_TAG.get(exp.get("mode", "original"), "경험-원문")
        blocks.append(f"[{tag}]\n제목: {exp['title']}\n{exp['text']}\n[/{tag}]")
    return "\n".join(blocks)


# ── Strategy 인터페이스 ────────────────────────────────────────────
class RunPodTask(ABC):
    @property
    @abstractmethod
    def endpoint(self) -> str: ...

    @abstractmethod
    def build_payload(self) -> dict: ...

    async def execute(self) -> dict:
        return await _post(self.endpoint, self.build_payload())


# ── 구체 전략 ─────────────────────────────────────────────────────
class AnalyzeDreamTask(RunPodTask):
    """Task A: 간단 해몽"""
    def __init__(self, dream_text: str):
        self._dream_text = dream_text

    @property
    def endpoint(self) -> str:
        return _ENDPOINT_A

    def build_payload(self) -> dict:
        return {"input": {"task": "task_a", "dream_text": self._dream_text}}


class SummarizeTask(RunPodTask):
    """Task C: 한줄요약 생성"""
    def __init__(self, experience_text: str):
        self._text = experience_text

    @property
    def endpoint(self) -> str:
        return _ENDPOINT_C

    def build_payload(self) -> dict:
        return {"input": {"task": "task_c", "experience_text": self._text}}


class DeepAnalyzeTask(RunPodTask):
    """Task D: 심층 해석 (꿈 + 현실 경험 결합)"""
    def __init__(self, dream_text: str, experiences: list):
        self._dream_text = dream_text
        self._experience_block = _build_experience_block(experiences)

    @property
    def endpoint(self) -> str:
        return _ENDPOINT_A

    def build_payload(self) -> dict:
        return {
            "input": {
                "task": "task_d",
                "dream_text": self._dream_text,
                "experience_block": self._experience_block,
            }
        }


class BroadAnalyzeTask(RunPodTask):
    """Task B: 종합 분석 (기간별 꿈 + 경험)"""
    def __init__(self, period: str, diaries: list, experiences: list):
        self._period = period
        self._diaries = diaries
        self._experiences = experiences

    @property
    def endpoint(self) -> str:
        return _ENDPOINT_A

    def build_payload(self) -> dict:
        return {
            "input": {
                "task": "task_b",
                "period": self._period,
                "diaries": self._diaries,
                "experiences": self._experiences,
            }
        }


class CompressTask(RunPodTask):
    """Task C-Ext: 목표 토큰 수로 자동압축"""
    def __init__(self, experience_text: str, target_tokens: int):
        self._text = experience_text
        self._target = max(50, min(400, target_tokens))

    @property
    def endpoint(self) -> str:
        return _ENDPOINT_C

    def build_payload(self) -> dict:
        return {
            "input": {
                "task": "task_cext",
                "experience_text": self._text,
                "target_tokens": self._target,
            }
        }


# ── Public API (기존 호출부 변경 없음) ────────────────────────────
async def analyze_dream(dream_text: str) -> dict:
    return await AnalyzeDreamTask(dream_text).execute()


async def summarize(experience_text: str) -> dict:
    return await SummarizeTask(experience_text).execute()


async def deep_analyze(dream_text: str, experiences: list) -> dict:
    return await DeepAnalyzeTask(dream_text, experiences).execute()


async def broad_analyze(period: str, diaries: list, experiences: list) -> dict:
    return await BroadAnalyzeTask(period, diaries, experiences).execute()


async def compress(experience_text: str, target_tokens: int) -> dict:
    estimated = int(len(experience_text) * 1.5)
    if estimated < 150:
        return {
            "summary": experience_text,
            "token_count": estimated,
            "char_count": len(experience_text),
        }

    output = await CompressTask(experience_text, target_tokens).execute()

    if output.get("token_count", 0) >= target_tokens * 2:
        return await summarize(experience_text)

    return output
