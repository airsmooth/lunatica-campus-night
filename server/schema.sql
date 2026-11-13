CREATE TABLE IF NOT EXISTS participants (
 token_hash TEXT PRIMARY KEY,
 id TEXT NOT NULL UNIQUE,
 alias TEXT NOT NULL CHECK(length(alias) BETWEEN 3 AND 24),
 xp INTEGER NOT NULL CHECK(xp BETWEEN 0 AND 1000000),
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS participants_xp ON participants(xp DESC,id);
CREATE INDEX IF NOT EXISTS participants_updated ON participants(updated_at);
