import type { Genre, Prisma, StageType } from "../generated/prisma/client";

// Dedicated, stable UUIDs make reruns additive without matching real catalog data.
function seedId(group: number, index: number) {
  return `c0d00000-0000-4000-8000-${String(group).padStart(4, "0")}${String(index).padStart(8, "0")}`;
}

function photo(id: string, width = 1200) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
}

const concertImage = photo("photo-1501386761578-eac5c94b800a");
const crowdImage = photo("photo-1470229722913-7c0e2dbbafd3");
const stageImage = photo("photo-1492684223066-81342ee5ff30");

export const seedUsers = [
  { id: seedId(1, 1), name: "Demo Customer", email: "demo@crowdly.test", role: "USER" },
  { id: seedId(1, 2), name: "Demo Admin", email: "admin@crowdly.test", role: "ADMIN" },
] as const;

export function buildSeedCatalog(now = new Date()) {
  const venueSpecs: {
    name: string;
    stageType: StageType;
    capacity: number;
    location: string;
    description: string;
    image: string;
  }[] = [
    {
      name: "Nile Arts Theater",
      stageType: "THEATER",
      capacity: 1200,
      location: "Cairo, Egypt",
      description: "An intimate riverside theater with clear sightlines, balcony seating, and warm acoustics.",
      image: stageImage,
    },
    {
      name: "Harbor Live Arena",
      stageType: "CONCERT_STAGE",
      capacity: 5000,
      location: "Alexandria, Egypt",
      description: "An open-air concert venue by the waterfront with a standing floor and dedicated VIP areas.",
      image: concertImage,
    },
    {
      name: "Desert Sky Stadium",
      stageType: "STADIUM",
      capacity: 18000,
      location: "Giza, Egypt",
      description: "A large outdoor stadium for festival nights, headline acts, and panoramic stage views.",
      image: crowdImage,
    },
  ];

  const venues = venueSpecs.map(({ image, ...venue }, index) => ({
    id: seedId(2, index + 1),
    ...venue,
    images: [image],
    amenities: ["Accessible entry", "Food and drinks", "Parking", "First aid"],
    policies: ["Valid ticket required for entry", "No outside food or drinks", "No professional cameras"],
    stageSections: [
      { id: "early-bird", name: "Early Bird Floor", ticketType: "EARLY_BIRD", level: "floor" },
      { id: "general", name: "General Admission", ticketType: "GENERAL_ADMISSION", level: "floor" },
      { id: "vip", name: "VIP Section", ticketType: "VIP", level: "lower" },
      { id: "meet-greet", name: "VIP Meet & Greet", ticketType: "VIP_MEET_GREET", level: "lower" },
    ],
  } satisfies Prisma.VenueCreateInput));

  const artistSpecs: { name: string; genres: Genre[]; image: string }[] = [
    { name: "Neon Atlas", genres: ["ROCK", "POP"], image: concertImage },
    { name: "Layla Moon", genres: ["POP", "RNB"], image: stageImage },
    { name: "Pulse Theory", genres: ["EDM"], image: crowdImage },
    { name: "Cairo Collective", genres: ["HIP_HOP", "RNB"], image: stageImage },
    { name: "Blue Nile Quartet", genres: ["JAZZ"], image: concertImage },
    { name: "Desert Strings", genres: ["COUNTRY", "ROCK"], image: stageImage },
    { name: "Aurora Chamber Orchestra", genres: ["CLASSICAL"], image: concertImage },
    { name: "Velvet Echo", genres: ["RNB", "JAZZ"], image: crowdImage },
  ];
  const artists = artistSpecs.map(({ image, ...artist }, index) => ({
    id: seedId(3, index + 1),
    ...artist,
    images: [image],
  } satisfies Prisma.ArtistCreateInput));

  const eventSpecs: {
    title: string;
    days: number;
    venue: number;
    artists: number[];
    genres: Genre[];
    price: number;
    availability?: "few" | "sold-out";
  }[] = [
    { title: "Neon Atlas: City Lights Tour", days: 7, venue: 1, artists: [0], genres: ["ROCK", "POP"], price: 45 },
    { title: "Layla Moon: Under the Stars", days: 10, venue: 0, artists: [1, 7], genres: ["POP", "RNB"], price: 40, availability: "few" },
    { title: "Pulse Theory: After Dark", days: 14, venue: 2, artists: [2, 3], genres: ["EDM", "HIP_HOP"], price: 55 },
    { title: "Cairo Collective Live", days: 18, venue: 1, artists: [3], genres: ["HIP_HOP", "RNB"], price: 35 },
    { title: "Jazz by the Nile", days: 21, venue: 0, artists: [4, 7], genres: ["JAZZ", "RNB"], price: 30 },
    { title: "Desert Strings: Golden Hour", days: 25, venue: 1, artists: [5], genres: ["COUNTRY", "ROCK"], price: 35 },
    { title: "Aurora: A Night at the Symphony", days: 28, venue: 0, artists: [6], genres: ["CLASSICAL"], price: 50 },
    { title: "Velvet Echo: Soul Sessions", days: 32, venue: 0, artists: [7], genres: ["RNB", "JAZZ"], price: 40, availability: "sold-out" },
    { title: "Desert Sky Rock Festival", days: 35, venue: 2, artists: [0, 5], genres: ["ROCK", "COUNTRY"], price: 65 },
    { title: "Harbor Pop Nights", days: 40, venue: 1, artists: [1, 0], genres: ["POP"], price: 45 },
    { title: "Electric Horizon", days: 45, venue: 2, artists: [2], genres: ["EDM"], price: 60 },
    { title: "Strings & Blue Notes", days: 50, venue: 0, artists: [6, 4], genres: ["CLASSICAL", "JAZZ"], price: 45 },
  ];

  const events = eventSpecs.map((spec, index) => {
    const venue = venues[spec.venue]!;
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + spec.days);
    // Midnight UTC is the event's calendar date; local show time is stored separately.
    date.setUTCHours(0, 0, 0, 0);
    const quantities = spec.availability === "sold-out"
      ? [0, 0, 0, 0]
      : spec.availability === "few"
        ? [5, 20, 10, 5]
        : [100, 700, 150, 50];
    const tickets = [
      { type: "EARLY_BIRD", price: spec.price, quantity: quantities[0]!, description: "Limited advance tickets with general floor access." },
      { type: "GENERAL_ADMISSION", price: spec.price + 15, quantity: quantities[1]!, description: "Standard entry and general admission access." },
      { type: "VIP", price: spec.price + 70, quantity: quantities[2]!, description: "Priority entry and access to the VIP section." },
      { type: "VIP_MEET_GREET", price: spec.price + 140, quantity: quantities[3]!, description: "VIP access plus a scheduled artist meet and greet." },
    ] satisfies Prisma.TicketCreateInput[];

    return {
      artistIds: spec.artists.map((artist) => artists[artist]!.id),
      data: {
        id: seedId(4, index + 1),
        title: spec.title,
        date,
        time: index % 2 === 0 ? "20:00" : "19:30",
        genres: spec.genres,
        venueId: venue.id,
        tickets,
        images: [index % 2 === 0 ? concertImage : crowdImage, stageImage],
        description: `Join ${spec.artists.map((artist) => artists[artist]!.name).join(" and ")} at ${venue.name} for an evening of live music. Doors open one hour before showtime. Choose from early bird, general admission, VIP, and meet and greet tickets.`,
      } satisfies Prisma.EventUncheckedCreateInput,
    };
  });

  return { venues, artists, events };
}
