import { Genre } from "../../generated/prisma/enums";

export { Genre };

export const GENRE_METADATA: Record<
  Genre,
  { label: string; emoji: string; slug: string }
> = {
  ROCK: { label: "Rock", emoji: "🎸", slug: "rock" },
  POP: { label: "Pop", emoji: "🎤", slug: "pop" },
  EDM: { label: "EDM", emoji: "🎛️", slug: "edm" },
  HIPHOP: { label: "Hip-Hop", emoji: "🎵", slug: "hiphop" },
  RNB: { label: "R&B", emoji: "🎶", slug: "rnb" },
  JAZZ: { label: "Jazz", emoji: "🎷", slug: "jazz" },
  COUNTRY: { label: "Country", emoji: "🤠", slug: "country" },
  CLASSICAL: { label: "Classical", emoji: "🎻", slug: "classical" },
};
