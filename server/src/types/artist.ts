export type Artist = {
  id: string;
  name: string;
  genres: string[];
  images: string[];
};

export type CreateArtistDto = {
  name: string;
  genres?: string[];
  images?: string[];
};

export type UpdateArtistDto = {
  name?: string;
  genres?: string[];
  images?: string[];
};