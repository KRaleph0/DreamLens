from sqlalchemy import Column, BigInteger, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Experience(Base):
    __tablename__ = "experiences"

    id         = Column('experience_id', BigInteger, primary_key=True, autoincrement=True)
    user_id    = Column(BigInteger, nullable=False)
    title      = Column(String(200), nullable=False)
    time_value = Column(String(50))
    time_text  = Column(String(100))
    content    = Column(Text, nullable=False)
    status              = Column(String(20), default='pending')
    summary             = Column(Text)
    summary_token_count = Column(Integer, nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
