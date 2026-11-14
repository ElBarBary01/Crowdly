import { pathToFileURL } from "node:url";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { buildSeedCatalog, seedUsers } from "./seed-data";

dotenv.config({ quiet: true });

export const DEFAULT_SEED_PASSWORD = "CrowdlyDemo123!";

export async function seedDatabase(prisma: PrismaClient) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo data can only be seeded outside production.");
  }

  const password = await bcrypt.hash(
    process.env.SEED_PASSWORD || DEFAULT_SEED_PASSWORD,
    12,
  );
  const { venues, artists, events } = buildSeedCatalog();

  // Empty updates intentionally preserve passwords, roles, dates, and live stock.
  // Each upsert can be retried after a partial run without deleting any records.
  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password, emailVerified: true },
    });
  }
  for (const venue of venues) {
    await prisma.venue.upsert({
      where: { id: venue.id }, update: {}, create: venue,
    });
  }
  for (const artist of artists) {
    await prisma.artist.upsert({
      where: { id: artist.id }, update: {}, create: artist,
    });
  }
  for (const { data, artistIds } of events) {
    await prisma.event.upsert({
      where: { id: data.id }, update: {}, create: data,
    });
    for (const artistId of artistIds) {
      await prisma.eventArtist.upsert({
        where: { eventId_artistId: { eventId: data.id, artistId } },
        update: {},
        create: { eventId: data.id, artistId },
      });
    }
  }

  return { users: seedUsers.length, venues: venues.length, artists: artists.length, events: events.length };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const counts = await seedDatabase(prisma);
    console.log("Seed complete (existing records preserved):", counts);
    console.log("Demo accounts: demo@crowdly.test / admin@crowdly.test");
    console.log("Password: SEED_PASSWORD, or the default documented in docs/seed-data.md.");
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error("Seeding failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
