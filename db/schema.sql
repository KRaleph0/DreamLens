
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SET timezone = 'Asia/Seoul';

-- ── updated_at 자동 갱신 함수 ────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 1. users ─────────────────────────────────────────────────
CREATE TABLE users (
  user_id       BIGSERIAL     PRIMARY KEY,
  email         VARCHAR(320)  NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  nickname      VARCHAR(50),
  gender        VARCHAR(10)   CHECK (gender IN ('M', 'F', 'OTHER')),
  age_group     VARCHAR(10)   CHECK (age_group IN ('10s','20s','30s','40s','50s+')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. refresh_tokens (JWT) ───────────────────────────────────
CREATE TABLE refresh_tokens (
  id            BIGSERIAL     PRIMARY KEY,
  user_id       BIGINT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash    TEXT          NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ   NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- ── 3. dreams ────────────────────────────────────────────────
CREATE TABLE dreams (
  dream_id       BIGSERIAL     PRIMARY KEY,
  user_id        BIGINT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  dream_date     DATE          NOT NULL,
  content        TEXT          CHECK (char_length(content) BETWEEN 20 AND 2000),
  autosave_draft TEXT,
  status         VARCHAR(10)   NOT NULL DEFAULT 'DRAFT'
                               CHECK (status IN ('DRAFT', 'SAVED')),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_dreams_user_date   ON dreams (user_id, dream_date DESC);
CREATE INDEX idx_dreams_user_status ON dreams (user_id, status);

CREATE TRIGGER trg_dreams_updated_at
  BEFORE UPDATE ON dreams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. experiences ───────────────────────────────────────────
CREATE TABLE experiences (
  experience_id        BIGSERIAL    PRIMARY KEY,
  user_id              BIGINT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  content              TEXT         NOT NULL,
  time_tag             VARCHAR(20)  NOT NULL
                                    CHECK (time_tag IN ('YESTERDAY','PAST_WEEK','PAST_MONTH','LONG_AGO')),
  summary_c            TEXT,
  token_count          INT,
  summary_token_count  INT,
  summary_status       VARCHAR(10)  NOT NULL DEFAULT 'PENDING'
                                    CHECK (summary_status IN ('PENDING','DONE','FAILED')),
  autosave_draft       TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_exp_user_created   ON experiences (user_id, created_at DESC);
CREATE INDEX idx_exp_user_timetag   ON experiences (user_id, time_tag);
CREATE INDEX idx_exp_summary_status ON experiences (summary_status) WHERE summary_status = 'PENDING';

CREATE TRIGGER trg_experiences_updated_at
  BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. analysis_a (간단 해몽 — Task A) ───────────────────────
CREATE TABLE analysis_a (
  analysis_a_id  BIGSERIAL    PRIMARY KEY,
  dream_id       BIGINT       NOT NULL REFERENCES dreams(dream_id) ON DELETE CASCADE,
  keywords       JSONB        NOT NULL,
  interpretation TEXT         NOT NULL,
  stale          BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uidx_analysis_a_dream ON analysis_a (dream_id);
CREATE INDEX idx_analysis_a_stale         ON analysis_a (dream_id, stale);
CREATE INDEX idx_analysis_a_keywords      ON analysis_a USING GIN (keywords);

CREATE TRIGGER trg_analysis_a_updated_at
  BEFORE UPDATE ON analysis_a
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. analysis_d (심층 해석 — Task D) ───────────────────────
CREATE TABLE analysis_d (
  analysis_d_id  BIGSERIAL    PRIMARY KEY,
  dream_id       BIGINT       NOT NULL REFERENCES dreams(dream_id) ON DELETE CASCADE,
  interpretation TEXT         NOT NULL,
  stale          BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uidx_analysis_d_dream ON analysis_d (dream_id);
CREATE INDEX idx_analysis_d_stale         ON analysis_d (dream_id, stale);

CREATE TRIGGER trg_analysis_d_updated_at
  BEFORE UPDATE ON analysis_d
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 7. analysis_b (기간별 종합 분석 — Task B) ─────────────────
CREATE TABLE analysis_b (
  analysis_b_id      BIGSERIAL    PRIMARY KEY,
  user_id            BIGINT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  period_type        VARCHAR(5)   NOT NULL CHECK (period_type IN ('1W','1M','3M')),
  stats              JSONB        NOT NULL,
  b1_interpretations JSONB        NOT NULL,
  b2_interpretation  TEXT,
  exp_block          TEXT,
  stale              BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_analysis_b_user_period ON analysis_b (user_id, period_type, created_at DESC);

CREATE TRIGGER trg_analysis_b_updated_at
  BEFORE UPDATE ON analysis_b
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 8. experience_analysis_d (연결 테이블) ────────────────────
CREATE TABLE experience_analysis_d (
  id             BIGSERIAL    PRIMARY KEY,
  analysis_d_id  BIGINT       NOT NULL REFERENCES analysis_d(analysis_d_id) ON DELETE CASCADE,
  experience_id  BIGINT       NOT NULL REFERENCES experiences(experience_id) ON DELETE RESTRICT,
  content_type   VARCHAR(15)  NOT NULL CHECK (content_type IN ('ORIGINAL','SUMMARY','COMPRESSED')),
  UNIQUE (analysis_d_id, experience_id)
);

CREATE INDEX idx_exp_analysis_d_exp ON experience_analysis_d (experience_id);

-- ── 9. experience_analysis_b (연결 테이블) ────────────────────
CREATE TABLE experience_analysis_b (
  id             BIGSERIAL    PRIMARY KEY,
  analysis_b_id  BIGINT       NOT NULL REFERENCES analysis_b(analysis_b_id) ON DELETE CASCADE,
  experience_id  BIGINT       NOT NULL REFERENCES experiences(experience_id) ON DELETE RESTRICT,
  content_type   VARCHAR(15)  NOT NULL CHECK (content_type IN ('ORIGINAL','SUMMARY','COMPRESSED')),
  UNIQUE (analysis_b_id, experience_id)
);

CREATE INDEX idx_exp_analysis_b_exp ON experience_analysis_b (experience_id);
