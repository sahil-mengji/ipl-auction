-- The running bid is no longer persisted anywhere: it now lives only in the
-- browser (BroadcastChannel + localStorage between /control and the live
-- screen). Only the final sale stays in the database, on CricketPlayers.
ALTER TABLE "AuctionState" DROP COLUMN IF EXISTS "current_bid";
ALTER TABLE "AuctionState" DROP COLUMN IF EXISTS "current_bidder_team_id";
