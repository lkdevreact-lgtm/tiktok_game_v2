-- Bảng gifts: lưu danh sách gift TikTok
CREATE TABLE IF NOT EXISTS gifts (
  gift_id          BIGINT      PRIMARY KEY,
  gift_name        TEXT        NOT NULL,
  image            TEXT,
  diamonds         INTEGER,
  max_repeat_count INTEGER,
  active           BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gifts_active ON gifts (active);

-- Trigger giữ updated_at luôn mới mỗi lần UPDATE
CREATE OR REPLACE FUNCTION set_gifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gifts_updated_at ON gifts;
CREATE TRIGGER trg_gifts_updated_at
BEFORE UPDATE ON gifts
FOR EACH ROW EXECUTE FUNCTION set_gifts_updated_at();
