import type { TooltipPosition } from "../feedbackComponents/tooltip";

/** Mirrors the StageType enum stored on the Prisma Venue model. */
export type StageType = "THEATER" | "CONCERT_STAGE" | "STADIUM";

export interface Point {
  x: number;
  y: number;
}

interface BaseSectionLayout {
  rotation?: number;
  labelPlacement?: "inside" | "outside" | "hidden";
}

export interface RectangularSectionLayout extends BaseSectionLayout {
  shape: "rectangle" | "trapezoid" | "standing";
  x: number;
  y: number;
  width: number;
  height: number;
  topInset?: number;
  bottomInset?: number;
}

export interface ArcSectionLayout extends BaseSectionLayout {
  shape: "arc";
  centerX: number;
  centerY: number;
  innerRadiusX: number;
  innerRadiusY: number;
  outerRadiusX: number;
  outerRadiusY: number;
  startAngle: number;
  endAngle: number;
}

export type SectionLayout = RectangularSectionLayout | ArcSectionLayout;

export type SectionLayoutMap = Readonly<
  Record<string, SectionLayout | undefined>
>;

export type TicketType =
  | "EARLY_BIRD"
  | "GENERAL_ADMISSION"
  | "VIP"
  | "VIP_MEET_GREET";

/** Mirrors the embedded Ticket type returned on Event.tickets by Prisma. */
export interface TicketCategory {
  type: TicketType;
  price: number;
  quantity: number;
  description: string | null;
}

export interface TheatreSection {
  id: string;
  name: string;
  ticketCategory: TicketCategory;
  level?: string;
}

export interface StageExtensionLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
}

export interface StageSurfaceLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  cornerRadius?: number;
  label?: string;
  extension?: StageExtensionLayout;
}

export interface VenueLayout {
  width: number;
  height: number;
  stage: StageSurfaceLayout;
  focalPoint?: Point;
}

export interface StageLabels {
  map: string;
  stage: string;
  field: string;
  ticketCategories: string;
  availableSeats: (count: number) => string;
  price: (formattedPrice: string) => string;
}

export type PriceFormatter = (ticketCategory: TicketCategory) => string;
export type TicketTypeFormatter = (ticketType: TicketType) => string;

export interface StageProps {
  stageType: StageType;
  sections: readonly TheatreSection[];
  formatPrice: PriceFormatter;
  formatTicketType: TicketTypeFormatter;
  sectionLayouts?: SectionLayoutMap;
  venueLayout?: VenueLayout;
  stage?: Partial<StageSurfaceLayout>;
  labels?: Partial<StageLabels>;
  tooltipPosition?: TooltipPosition;
  ariaLabel?: string;
  className?: string;
}

export interface ResolvedSection extends TheatreSection {
  layout: SectionLayout;
  colorTone: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface SectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
