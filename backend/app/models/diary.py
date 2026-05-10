from sqlalchemy import Column, BigInteger, Text, Date, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base


class Diary(Base):
    __tablename__ = "diaries"

    id            = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id       = Column(BigInteger, nullable=False)
    date          = Column(Date, nullable=False)
    content       = Column(Text, nullable=False)
    task_a_result = Column(JSON, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
