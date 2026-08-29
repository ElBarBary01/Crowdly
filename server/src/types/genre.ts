import { Genre } from "../../generated/prisma/enums";

export { Genre };

export const GENRE_METADATA: Record<
  Genre,
  { label: string; emoji: string; slug: string }
> = {
  ROCK: { label: "Rock", emoji: "🎸", slug: "rock" },
  POP: { label: "Pop", emoji: "🎤", slug: "pop" },
  EDM: { label: "EDM", emoji: "🎛️", slug: "edm" },
  HIP_HOP: { label: "Hip-Hop", emoji: "🎵", slug: "hip-hop" },
  RNB: { label: "R&B", emoji: "🎶", slug: "r&b" },
  JAZZ: { label: "Jazz", emoji: "🎷", slug: "jazz" },
  COUNTRY: { label: "Country", emoji: "🤠", slug: "country" },
  CLASSICAL: { label: "Classical", emoji: "🎻", slug: "classical" },
};
