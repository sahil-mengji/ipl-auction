-- Remote display prefs (survive restarts): key -> JSON value
CREATE TABLE IF NOT EXISTS "DisplayPref" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "DisplayPref_pkey" PRIMARY KEY ("key")
);
