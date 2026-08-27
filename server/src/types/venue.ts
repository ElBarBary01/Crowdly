export const STAGE_TYPES = ["THEATER", "CONCERT_STAGE", "STADIUM"] as const;
export const TICKET_TYPES = [
  "EARLY_BIRD",
  "GENERAL_ADMISSION",
  "VIP",
  "VIP_MEET_GREET",
] as const;

export type StageType = (typeof STAGE_TYPES)[number];
export type TicketType = (typeof TICKET_TYPES)[number];

export type StageSection = {
  id: string;
  name: string;
  ticketType: TicketType;
  level: string | null;
};

export type StageSectionInput = Omit<StageSection, "level"> & {
  level?: string | null;
};

export function isStageType(value: unknown): value is StageType {
  return STAGE_TYPES.some((stageType) => stageType === value);
}

export function isTicketType(value: unknown): value is TicketType {
  return TICKET_TYPES.some((ticketType) => ticketType === value);
}

export function areStageSections(value: unknown): value is StageSectionInput[] {
  if (!Array.isArray(value) || value.length === 0) return false;

  const ids = new Set<string>();
  return value.every((section) => {
    if (
      typeof section !== "object" ||
      section === null ||
      typeof section.id !== "string" ||
      section.id.trim() === "" ||
      ids.has(section.id) ||
      typeof section.name !== "string" ||
      section.name.trim() === "" ||
      !isTicketType(section.ticketType) ||
      !(
        section.level === null ||
        section.level === undefined ||
        typeof section.level === "string"
      )
    ) {
      return false;
    }

    ids.add(section.id);
    return true;
  });
}

export type Venue = {
  id: string;
  name: string;
  stageType: StageType;
  stageSections: StageSection[];
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
  stageSections: StageSectionInput[];
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
  stageSections?: StageSectionInput[];
  description?: string;
  capacity?: number;
  location?: string;
  images?: string[];
  amenities?: string[];
  policies?: string[];
  seatingChartImage?: string;
};
