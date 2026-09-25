-- Auction queue position for manual reordering (defaults mirror id order)
ALTER TABLE "CricketPlayers" ADD COLUMN IF NOT EXISTS "auction_order" INTEGER NOT NULL DEFAULT 0;
UPDATE "CricketPlayers" SET "auction_order" = "id" WHERE "auction_order" = 0;
