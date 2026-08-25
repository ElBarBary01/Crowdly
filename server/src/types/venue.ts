export type Venue = {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  location: string;
  images: string[];
  amenities: string[];
  policies: string[];
  seatingChartImage?: string;
};

export type CreateVenueDto = {
  name: string;
  description?: string;
  capacity: number;
  location: string;
  images?: string[];
  amenities?: string[];
  policies?: string[];
  seatingChartImage?: string;
};

export type UpdateVenueDto = {
  name?: string;
  description?: string;
  capacity?: number;
  location?: string;
  images?: string[];
  amenities?: string[];
  policies?: string[];
  seatingChartImage?: string;
};