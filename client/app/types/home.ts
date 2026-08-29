export type Genre =
  | "ROCK"
  | "POP"
  | "EDM"
  | "HIPHOP"
  | "RNB"
  | "JAZZ"
  | "COUNTRY"
  | "CLASSICAL";

export interface EventCard {
  id: string;
  title: string;
  date: string;
  time: string;
  image: string | null;
  venue: {
    name: string;
    location: string;
  };
  genreLabel: string | null;
  availabilityLabel: "Few Left" | "Sold Out" | null;
  fromPrice: number | null;
}

export interface GenreCount {
  genre: Genre;
  label: string;
  emoji: string;
  slug: string;
  count: number;
}

export interface FeaturedArtist {
  id: string;
  name: string;
  genreLabel: string | null;
  image: string | null;
}

export interface HomeData {
  trending: EventCard[];
  nearby: EventCard[];
  genres: GenreCount[];
  artists: FeaturedArtist[];
}
