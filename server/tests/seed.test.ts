import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcrypt";
import { PrismaClient } from "../generated/prisma/client";
import { Genre, StageType, TicketType } from "../generated/prisma/enums";
import { buildSeedCatalog, seedUsers } from "../prisma/seed-data";
import { DEFAULT_SEED_PASSWORD, seedDatabase } from "../prisma/seed";
import { startTestMongo } from "./helpers/mongo";

test("seed catalog covers filters and valid seating/ticket configurations", () => {
  const now = new Date("2026-11-14T23:59:59Z");
  const { venues, artists, events } = buildSeedCatalog(now);
  assert.deepEqual(new Set(venues.map((venue) => venue.stageType)), new Set(Object.values(StageType)));
  assert.deepEqual(new Set(events.flatMap(({ data }) => data.genres)), new Set(Object.values(Genre)));
  for (const { data, artistIds } of events) {
    assert(data.date > now);
    const venue = venues.find((venue) => venue.id === data.venueId)!;
    assert(venue);
    assert(data.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0) <= venue.capacity);
    assert.deepEqual(new Set(data.tickets.map((ticket) => ticket.type)), new Set(Object.values(TicketType)));
    for (const section of venue.stageSections) {
      assert(data.tickets.some((ticket) => ticket.type === section.ticketType));
    }
    assert(artistIds.length > 0);
    for (const id of artistIds) assert(artists.some((artist) => artist.id === id));
  }
  const stock = events.map(({ data }) => data.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0));
  assert(stock.includes(0));
  assert(stock.some((quantity) => quantity > 0 && quantity <= 50));
  assert(stock.some((quantity) => quantity > 50));
});

test("seed persists usable accounts and relations, and preserves changes on rerun", { timeout: 90_000 }, async () => {
  const mongo = await startTestMongo();
  const prisma = new PrismaClient({ datasourceUrl: mongo.url });
  const originalPassword = process.env.SEED_PASSWORD;
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "test";
    delete process.env.SEED_PASSWORD;
    assert.deepEqual(await seedDatabase(prisma), { users: 2, venues: 3, artists: 8, events: 12 });

    const users = await prisma.user.findMany();
    for (const account of seedUsers) {
      const user = users.find((user) => user.email === account.email)!;
      assert(user.emailVerified);
      assert.equal(user.role, account.role);
      assert(await bcrypt.compare(DEFAULT_SEED_PASSWORD, user.password));
    }
    const events = await prisma.event.findMany({
      include: { venue: true, artists: { include: { artist: true } } },
    });
    assert.equal(events.length, 12);
    for (const event of events) {
      assert(event.venue);
      assert(event.artists.length > 0);
      for (const link of event.artists) assert(link.artist);
    }
    const linkCount = await prisma.eventArtist.count();
    const event = events.find((event) => event.tickets.every((ticket) => ticket.quantity > 0))!;
    const editedTickets = event.tickets.map((ticket, index) => ({
      ...ticket, quantity: index === 0 ? ticket.quantity - 1 : ticket.quantity,
    }));
    await prisma.event.update({
      where: { id: event.id }, data: { tickets: editedTickets, title: "Edited after seeding" },
    });
    await prisma.user.update({
      where: { email: "admin@crowdly.test" }, data: { password: "changed-hash", role: "USER" },
    });
    const unrelated = await prisma.artist.create({
      data: { name: "Existing artist", genres: ["ROCK"], images: [] },
    });
    // A partial previous run is repaired without duplicating the other links.
    await prisma.eventArtist.delete({ where: { id: event.artists[0]!.id } });
    process.env.SEED_PASSWORD = "DifferentPassword123!";
    await seedDatabase(prisma);

    assert.equal(await prisma.user.count(), 2);
    assert.equal(await prisma.venue.count(), 3);
    assert.equal(await prisma.artist.count(), 9);
    assert.equal(await prisma.event.count(), 12);
    assert.equal(await prisma.eventArtist.count(), linkCount);
    assert(await prisma.artist.findUnique({ where: { id: unrelated.id } }));
    const preserved = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    assert.equal(preserved.title, "Edited after seeding");
    assert.deepEqual(preserved.tickets, editedTickets);
    assert.deepEqual(preserved.date, event.date);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@crowdly.test" } });
    assert.equal(admin.password, "changed-hash");
    assert.equal(admin.role, "USER");

    process.env.NODE_ENV = "production";
    await assert.rejects(seedDatabase(prisma), /outside production/);
  } finally {
    if (originalPassword === undefined) delete process.env.SEED_PASSWORD;
    else process.env.SEED_PASSWORD = originalPassword;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    await prisma.$disconnect();
    await mongo.stop();
  }
});
