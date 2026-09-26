import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Single source of truth: reuse the frontend dummy dataset so seeded
// Postgres rows match what dummy mode shows in the UI.
import { dummyPlayers, dummyTeams } from "../../src/data/dummyData.js";

const prisma = new PrismaClient();

async function main() {
  // Clean first so re-seeding is idempotent.
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  // Fresh league (e.g. 5 -> 10 teams) invalidates old sales, so clear the
  // event log and park the auction desk back at IDLE.
  await prisma.auctionLog.deleteMany();

  for (const t of dummyTeams) {
    await prisma.team.create({
      data: {
        id: t.id,
        teamName: t.team_name,
        purse: t.purse,
        teamLogo: t.team_logo ?? null,
        textColor: t.text_color ?? null,
        color1: t.color1 ?? null,
        color2: t.color2 ?? null,
      },
    });
  }

  for (const p of dummyPlayers) {
    await prisma.player.create({
      data: {
        id: p.id,
        playerName: p.player_name,
        playerImage: p.player_image ?? null,
        basePrice: p.base_price ?? 0,
        finalPrice: p.final_price ?? 0,
        soldToTeamId: p.sold_to_team_id ?? 0,
        soldToTeam: p.sold_to_team ?? null,
        timeOfSelling: p.time_of_selling ? new Date(p.time_of_selling) : null,
        category: p.category ?? null,
        isOverseas: p.is_overseas ?? false,
        matches: p.matches ?? 0,
        runs: p.runs ?? 0,
        batAvg: p.bat_avg ?? null,
        sr: p.sr ?? null,
        catches: p.catches ?? 0,
        stumpings: p.stumpings ?? 0,
        wickets: p.wickets ?? 0,
        bowlAvg: p.bowl_avg ?? null,
        eco: p.eco ?? null,
      },
    });
  }

  // Keep SERIAL sequences in sync since we inserted explicit ids.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Teams"', 'id'), COALESCE((SELECT MAX(id) FROM "Teams"), 1))`
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"CricketPlayers"', 'id'), COALESCE((SELECT MAX(id) FROM "CricketPlayers"), 1))`
  );

  // Park a fresh singleton auction desk at IDLE (upsert: the running
  // backend's poller may recreate the row at any moment).
  await prisma.auctionState.upsert({
    where: { id: 1 },
    update: {
      status: "IDLE",
      currentPlayerId: null,
    },
    create: { id: 1, status: "IDLE" },
  });

  const [teamCount, playerCount] = await Promise.all([
    prisma.team.count(),
    prisma.player.count(),
  ]);
  console.log(`Seeded ${teamCount} teams and ${playerCount} players.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
