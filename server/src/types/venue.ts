export const STAGE_TYPES = ["THEATER", "CONCERT_STAGE", "STADIUM"] as const;

export type StageType = (typeof STAGE_TYPES)[number];

export function isStageType(value: unknown): value is StageType {
  return STAGE_TYPES.some((stageType) => stageType === value);
}

export type Venue = {
  id: string;
  name: string;
  stageType: StageType;
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
  stageType: StageType;
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
  stageType?: StageType;
  description?: string;
  capacity?: number;
  location?: string;
  images?: string[];
  amenities?: string[];
  policies?: string[];
  seatingChartImage?: string;
};
