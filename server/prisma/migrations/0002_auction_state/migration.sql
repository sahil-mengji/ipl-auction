-- Live auction state (singleton row, id = 1)
CREATE TABLE IF NOT EXISTS "AuctionState" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "current_player_id" INTEGER,
    "current_bid" INTEGER NOT NULL DEFAULT 0,
    "current_bidder_team_id" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionState_pkey" PRIMARY KEY ("id")
);

-- Append-only event log for the dashboard Logs view
CREATE TABLE IF NOT EXISTS "AuctionLog" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "player_id" INTEGER,
    "team_id" INTEGER,
    "amount" INTEGER,
    "message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuctionLog_created_at_idx" ON "AuctionLog"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "AuctionLog_type_idx" ON "AuctionLog"("type");
