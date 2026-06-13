from abc import ABC, abstractmethod

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
    def __init__(self, dream_text: str, experience_block: str):
        self._dream_text = dream_text
        self._experience_block = experience_block

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


class PeriodTierTask(RunPodTask):
    """Task B-1: 기간별 티어 해석 (statistics_block 1개씩, 3번 호출)"""
    def __init__(self, statistics_block: str):
        self._statistics_block = statistics_block

    @property
    def endpoint(self) -> str:
        return _ENDPOINT_A

    def build_payload(self) -> dict:
        return {"input": {"task": "task_b1", "statistics_block": self._statistics_block}}


class PeriodSummaryTask(RunPodTask):
    """Task B-2: 종합 재해석 (B-1 결과 3개 + experience_block)"""
    def __init__(self, interp_p: str, interp_s: str, interp_t: str, experience_block: str):
        self._interp_p = interp_p
        self._interp_s = interp_s
        self._interp_t = interp_t
        self._experience_block = experience_block

    @property
    def endpoint(self) -> str:
        return _ENDPOINT_A

    def build_payload(self) -> dict:
        return {
            "input": {
                "task": "task_b2",
                "interp_p": self._interp_p,
                "interp_s": self._interp_s,
                "interp_t": self._interp_t,
                "experience_block": self._experience_block,
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


# ── Public API ────────────────────────────────────────────────────
async def analyze_dream(dream_text: str) -> dict:
    return await AnalyzeDreamTask(dream_text).execute()


async def summarize(experience_text: str) -> dict:
    return await SummarizeTask(experience_text).execute()


async def deep_analyze(dream_text: str, experience_block: str) -> dict:
    return await DeepAnalyzeTask(dream_text, experience_block).execute()


async def period_tier(statistics_block: str) -> dict:
    return await PeriodTierTask(statistics_block).execute()


async def period_summary(interp_p: str, interp_s: str, interp_t: str, experience_block: str) -> dict:
    return await PeriodSummaryTask(interp_p, interp_s, interp_t, experience_block).execute()


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
