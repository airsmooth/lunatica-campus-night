-- Additive, isolated from the public XP tables.
CREATE TABLE IF NOT EXISTS grades_state(id INTEGER PRIMARY KEY CHECK(id=1),generation INTEGER NOT NULL,nonce TEXT NOT NULL);
INSERT OR IGNORE INTO grades_state VALUES(1,0,'');
CREATE TABLE IF NOT EXISTS grades_members(token TEXT PRIMARY KEY,revision INTEGER NOT NULL,period TEXT NOT NULL,digest TEXT NOT NULL,mutation TEXT NOT NULL,last_seen INTEGER NOT NULL,last_changed INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS grades_seen ON grades_members(last_seen);
CREATE TABLE IF NOT EXISTS grades_metrics(token TEXT NOT NULL,scope TEXT NOT NULL,metric_key TEXT NOT NULL,fingerprint TEXT NOT NULL,value REAL NOT NULL,exact TEXT NOT NULL,PRIMARY KEY(token,scope));
CREATE INDEX IF NOT EXISTS grades_scope ON grades_metrics(scope);
CREATE TABLE IF NOT EXISTS grades_changes(scope TEXT NOT NULL,token TEXT NOT NULL,PRIMARY KEY(scope,token));
CREATE TABLE IF NOT EXISTS grades_snapshots(scope TEXT PRIMARY KEY,published INTEGER NOT NULL,valid INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS grades_results(scope TEXT NOT NULL,token TEXT NOT NULL,fingerprint TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(scope,token));
CREATE TABLE IF NOT EXISTS grades_retired(token TEXT PRIMARY KEY,retired INTEGER NOT NULL);
