-- Bảng triggers: cấu hình điều kiện triệu hồi NPC từ event TikTok
-- Ví dụ:
--   - comment "111" => spawn 1 NPC monster
--   - like 100      => spawn 1 NPC
--   - share 1       => spawn 3 NPC
--   - gift X (id)   => spawn N NPC

CREATE TABLE IF NOT EXISTS triggers (
  id            BIGSERIAL   PRIMARY KEY,
  name          TEXT        NOT NULL,
  event_type    TEXT        NOT NULL CHECK (event_type IN ('comment', 'like', 'share', 'gift', 'follow')),
  match_value   TEXT,
  threshold     INTEGER     NOT NULL DEFAULT 1 CHECK (threshold >= 1),
  gift_id       BIGINT      REFERENCES gifts(gift_id) ON DELETE SET NULL,
  npc_type      TEXT        NOT NULL,
  npc_count     INTEGER     NOT NULL DEFAULT 1 CHECK (npc_count >= 1),
  active        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_triggers_active     ON triggers (active);
CREATE INDEX IF NOT EXISTS idx_triggers_event_type ON triggers (event_type);
CREATE INDEX IF NOT EXISTS idx_triggers_gift_id    ON triggers (gift_id);

-- Trigger giữ updated_at luôn mới mỗi lần UPDATE
CREATE OR REPLACE FUNCTION set_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_triggers_updated_at ON triggers;
CREATE TRIGGER trg_triggers_updated_at
BEFORE UPDATE ON triggers
FOR EACH ROW EXECUTE FUNCTION set_triggers_updated_at();
