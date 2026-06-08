from sqlalchemy import Column, BigInteger, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base


class AnalysisReport(Base):
    __tablename__ = "analysis_reports"

    id            = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id       = Column(BigInteger, nullable=False)
    type          = Column(String(20), nullable=False)   # 'deep' | 'broad'
    diary_id      = Column(BigInteger, nullable=True)
    dream_title   = Column(Text, nullable=True)
    dream_content = Column(Text, nullable=True)
    keywords      = Column(JSON, nullable=True)
    ai_report     = Column(Text, nullable=True)
    experiences   = Column(JSON, nullable=True)  # [{title, category, date}]
    period        = Column(String(20), nullable=True)    # broad only: '1w'|'1m'|'3m'
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
