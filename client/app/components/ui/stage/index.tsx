import { resolveSections, resolveVenueLayout } from "./geometry";
import SeatingMap from "./SeatingMap";
import type { StageLabels, StageProps } from "./types";
import "./stage.css";

export type {
  ArcSectionLayout,
  EventTicket,
  Point,
  PriceFormatter,
  RectangularSectionLayout,
  ResolvedSection,
  SectionLayout,
  SectionLayoutMap,
  StageExtensionLayout,
  StageLabels,
  StageEvent,
  StageProps,
  StageSection,
  StageSurfaceLayout,
  StageType,
  StageVenue,
  TicketCategory,
  TicketType,
  TicketTypeFormatter,
  TheatreSection,
  VenueLayout,
} from "./types";

const DEFAULT_LABELS: StageLabels = {
  map: "Venue section map",
  stage: "Stage",
  field: "Field",
  ticketCategories: "Ticket categories",
  capacity: (count) => `Capacity: ${count}`,
  ticketsLeft: (count) => `Tickets left: ${count}`,
  availableSeats: (count) => `Available seats: ${count}`,
  price: (formattedPrice) => `Price: ${formattedPrice}`,
};

function classNames(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

export default function Stage({
  event,
  formatPrice,
  formatTicketType,
  sectionLayouts,
  venueLayout,
  stage,
  labels: labelOverrides,
  tooltipPosition = "top",
  ariaLabel,
  className,
}: StageProps) {
  const { tickets, venue: venueData } = event;
  const { capacity, stageSections, stageType, ticketsLeft } = venueData;
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const venue = resolveVenueLayout(stageType, venueLayout, stage);
  const resolvedSections = resolveSections(
    stageSections,
    tickets,
    stageType,
    venue,
    sectionLayouts,
  );
  const displayedTicketCategories = Array.from(
    new Map(
      resolvedSections.map((section) => [
        section.ticketCategory.type,
        {
          ticketCategory: section.ticketCategory,
          colorTone: section.colorTone,
        },
      ]),
    ).values(),
  );

  return (
    <section
      className={classNames(
        "stage-map",
        `stage-map--${stageType.toLowerCase().replace(/_/g, "-")}`,
        className,
      )}
      aria-label={ariaLabel ?? labels.map}
    >
      <div className="stage-map__availability" aria-live="polite">
        <span>{labels.capacity(capacity)}</span>
        <span>{labels.ticketsLeft(ticketsLeft)}</span>
      </div>

      <SeatingMap
        stageType={stageType}
        sections={resolvedSections}
        venue={venue}
        labels={labels}
        formatPrice={formatPrice}
        formatTicketType={formatTicketType}
        tooltipPosition={tooltipPosition}
        ariaLabel={ariaLabel ?? labels.map}
      />

      {displayedTicketCategories.length > 0 && (
        <div
          className="stage-map__category-legend"
          aria-label={labels.ticketCategories}
        >
          {displayedTicketCategories.map(({ ticketCategory, colorTone }) => (
            <span
              className="stage-map__legend-item"
              key={ticketCategory.type}
            >
              <span
                className={`stage-map__legend-swatch stage-map__section--tone-${colorTone}`}
                aria-hidden="true"
              />
              <span>{formatTicketType(ticketCategory.type)}</span>
              <span className="stage-map__legend-price">
                {formatPrice(ticketCategory)}
              </span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
