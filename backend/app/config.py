from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    db_host: str
    db_port: int = 5432
    db_name: str
    db_user: str
    db_password: str

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    allowed_origins: str = "https://www.dreamlens.cc"

    class Config:
        env_file = "/home/aleph/projects/dreamlens/.env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()