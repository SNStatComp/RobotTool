CREATE TABLE ProductGroup (
	productgroup_id INTEGER PRIMARY KEY AUTOINCREMENT,
	productgroup TEXT NOT NULL,
	description TEXT,
	comment TEXT);

CREATE TABLE Source (
	source_id INTEGER PRIMARY KEY AUTOINCREMENT,
	productgroup_id INTEGER NOT NULL
	REFERENCES ProductGroup(productgroup_id)
		ON DELETE CASCADE,
	source TEXT NOT NULL,
	name TEXT,
	address TEXT,
	url TEXT,
	is_active INTEGER,
	comment TEXT DEFAULT (''),
    currency TEXT);

CREATE TABLE SourceAdmin (
	source_id INTEGER PRIMARY KEY NOT NULL
		REFERENCES Source(source_id)
		ON DELETE CASCADE,
	last_observation_date DATETIME,
	is_exported INTEGER DEFAULT (0),
	last_observation REAL);

CREATE TABLE SourcePath (
	sourcepath_id INTEGER PRIMARY KEY AUTOINCREMENT,
	source_id INTEGER NOT NULL
		REFERENCES Source(source_id)
		ON DELETE CASCADE,
	path TEXT,
	parameter TEXT,
	step_no INTEGER NOT NULL,
	step_type TEXT NOT NULL);

CREATE TABLE Observation (
	observation_id INTEGER PRIMARY KEY AUTOINCREMENT,
	source_id INTEGER NOT NULL
		REFERENCES Source(source_id)
		ON DELETE CASCADE,
	observation_date DATETIME,
	value REAL,
	quantity REAL,
	comment TEXT DEFAULT ('') ,
	context TEXT, user_id TEXT);

CREATE UNIQUE INDEX idx_ProductGroup_Source
ON Source (productgroup_id, source);

CREATE UNIQUE INDEX idx_SourcePath
ON SourcePath (source_id, step_no);
