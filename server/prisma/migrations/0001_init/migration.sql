-- Create Teams table (mirrors Supabase `Teams`)
CREATE TABLE IF NOT EXISTS "Teams" (
    "id" SERIAL NOT NULL,
    "team_name" TEXT NOT NULL,
    "purse" INTEGER NOT NULL DEFAULT 0,
    "team_logo" TEXT,
    "text_color" TEXT,
    "color1" TEXT,
    "color2" TEXT,

    CONSTRAINT "Teams_pkey" PRIMARY KEY ("id")
);

-- Create CricketPlayers table (mirrors Supabase `CricketPlayers`)
-- sold_to_team_id has NO foreign key on purpose:
--   0  = unsold / in auction pool
--  -1  = explicitly marked unsold
--  >0  = sold to Team with that id
CREATE TABLE IF NOT EXISTS "CricketPlayers" (
    "id" SERIAL NOT NULL,
    "player_name" TEXT NOT NULL,
    "player_image" TEXT,
    "base_price" INTEGER NOT NULL DEFAULT 0,
    "final_price" INTEGER NOT NULL DEFAULT 0,
    "sold_to_team_id" INTEGER NOT NULL DEFAULT 0,
    "sold_to_team" TEXT,
    "time_of_selling" TIMESTAMPTZ,
    "category" TEXT,
    "is_overseas" BOOLEAN NOT NULL DEFAULT false,
    "matches" INTEGER NOT NULL DEFAULT 0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "bat_avg" DOUBLE PRECISION,
    "sr" DOUBLE PRECISION,
    "catches" INTEGER NOT NULL DEFAULT 0,
    "stumpings" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "bowl_avg" DOUBLE PRECISION,
    "eco" DOUBLE PRECISION,

    CONSTRAINT "CricketPlayers_pkey" PRIMARY KEY ("id")
);

-- Helpful indexes for the auction queries
CREATE INDEX IF NOT EXISTS "CricketPlayers_sold_to_team_id_idx" ON "CricketPlayers"("sold_to_team_id");
CREATE INDEX IF NOT EXISTS "CricketPlayers_final_price_idx" ON "CricketPlayers"("final_price" DESC);
CREATE INDEX IF NOT EXISTS "CricketPlayers_time_of_selling_idx" ON "CricketPlayers"("time_of_selling" DESC);
