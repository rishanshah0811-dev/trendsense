import os
import json
import yfinance as yf
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from pipeline import run_pipeline


app = FastAPI(title="TrendSense API")

frontend_url = os.environ.get("FRONTEND_URL", "")
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


class AnalyseRequest(BaseModel):
    ticker: str
    start_date: str
    end_date: str
    bullish_threshold: float = 0.55
    bearish_threshold: float = 0.55


@app.post("/analyse/stream")
async def analyse_stream(req: AnalyseRequest):
    async def event_generator():
        async for event in run_pipeline(
            ticker=req.ticker.upper().strip(),
            start_date=req.start_date,
            end_date=req.end_date,
            bullish_threshold=req.bullish_threshold,
            bearish_threshold=req.bearish_threshold,
        ):
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


class ProbaItem(BaseModel):
    date: str
    price: float
    bullish_prob: float
    bearish_prob: float
    index: int


class FilterRequest(BaseModel):
    raw_probas: List[ProbaItem]
    bullish_threshold: float
    bearish_threshold: float
    look_ahead: int = 4


@app.post("/signals/filter")
async def filter_signals(req: FilterRequest):
    signals = []
    for rp in req.raw_probas:
        signal_type = "NEUTRAL"
        confidence = 0.0

        if rp.bullish_prob > req.bullish_threshold and rp.bullish_prob > rp.bearish_prob:
            signal_type = "BUY"
            confidence = rp.bullish_prob
        elif rp.bearish_prob > req.bearish_threshold and rp.bearish_prob > rp.bullish_prob:
            signal_type = "SELL"
            confidence = rp.bearish_prob

        if signal_type == "NEUTRAL":
            continue

        signals.append({
            "date": rp.date,
            "signal_type": signal_type,
            "confidence": round(confidence, 4),
            "price": rp.price,
            "outcome": "pending",
        })

    buy_signals = [s for s in signals if s["signal_type"] == "BUY"]
    sell_signals = [s for s in signals if s["signal_type"] == "SELL"]
    avg_conf = round(sum(s["confidence"] for s in signals) / len(signals), 4) if signals else 0

    return {
        "signals": signals,
        "signal_summary": {
            "total_signals": len(signals),
            "buy_signals": len(buy_signals),
            "sell_signals": len(sell_signals),
            "correct_signals": 0,
            "win_rate": 0,
            "avg_confidence": avg_conf,
        },
    }


@app.get("/tickers/validate/{ticker}")
async def validate_ticker(ticker: str):
    try:
        t = yf.Ticker(ticker.upper().strip())
        hist = t.history(period="5d")
        if hist is None or len(hist) == 0:
            return {"valid": False, "name": "", "exchange": ""}
        try:
            fast_info = t.fast_info
            name = getattr(fast_info, "shortName", "") or ticker.upper().strip()
            exchange = getattr(fast_info, "exchange", "") or ""
        except Exception:
            name = ticker.upper().strip()
            exchange = ""
        return {"valid": True, "name": name, "exchange": exchange}
    except Exception:
        return {"valid": False, "name": "", "exchange": ""}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
