BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "TaxRate" (
	"tax_code"	INTEGER NOT NULL UNIQUE,
	"tax_rate"	REAL NOT NULL,
	"tax_description"	TEXT UNIQUE,
	PRIMARY KEY("tax_code")
);
CREATE TABLE IF NOT EXISTS "Source" (
	"source_id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"productgroup_id"	INTEGER NOT NULL,
	"source"	TEXT NOT NULL,
	"name"	TEXT,
	"url"	TEXT,
	"is_active"	INTEGER,
	"comment"	TEXT DEFAULT (''),
	"currency"	TEXT,
	"address"	TEXT,
	"tax_code"	INTEGER,
	"note1"	TEXT,
	"note2"	TEXT,
	"note3"	TEXT,
	"note4"	TEXT,
	"note5"	TEXT,
	FOREIGN KEY("productgroup_id") REFERENCES "ProductGroup"("productgroup_id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "Observation" (
	"observation_id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"source_id"	INTEGER NOT NULL,
	"observation_date"	DATETIME,
	"value"	REAL,
	"quantity"	REAL,
	"comment"	TEXT DEFAULT (''),
	"context"	TEXT,
	"user_id"	TEXT,
	FOREIGN KEY("source_id") REFERENCES "Source"("source_id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "SourcePath" (
	"sourcepath_id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"source_id"	INTEGER NOT NULL,
	"path"	TEXT,
	"parameter"	TEXT,
	"step_no"	INTEGER NOT NULL,
	"step_type"	TEXT NOT NULL,
	FOREIGN KEY("source_id") REFERENCES "Source"("source_id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "SourceAdmin" (
	"source_id"	INTEGER NOT NULL,
	"last_observation_date"	DATETIME,
	"is_exported"	INTEGER DEFAULT (0),
	"last_observation"	REAL,
	FOREIGN KEY("source_id") REFERENCES "Source"("source_id") ON DELETE CASCADE,
	PRIMARY KEY("source_id")
);
CREATE TABLE IF NOT EXISTS "ProductGroup" (
	"productgroup_id"	INTEGER PRIMARY KEY AUTOINCREMENT,
	"productgroup"	TEXT NOT NULL,
	"description"	TEXT,
	"comment"	TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ProductGroup_Source" ON "Source" (
	"productgroup_id",
	"source"
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_SourcePath" ON "SourcePath" (
	"source_id",
	"step_no"
);
COMMIT;
