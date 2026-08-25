import { resolveSections, resolveVenueLayout } from "./geometry";
import SeatingMap from "./SeatingMap";
import type { StageLabels, StageProps } from "./types";
import "./stage.css";

export type {
  ArcSectionLayout,
  Point,
  PriceFormatter,
  RectangularSectionLayout,
  ResolvedSection,
  SectionLayout,
  SectionLayoutMap,
  StageExtensionLayout,
  StageLabels,
  StageProps,
  StageSurfaceLayout,
  StageType,
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
  availableSeats: (count) => `Available seats: ${count}`,
  price: (formattedPrice) => `Price: ${formattedPrice}`,
};

function classNames(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

export default function Stage({
  stageType,
  sections,
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
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const venue = resolveVenueLayout(stageType, venueLayout, stage);
  const resolvedSections = resolveSections(
    sections,
    stageType,
    venue,
    sectionLayouts,
  );
  const ticketCategories = Array.from(
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

      {ticketCategories.length > 0 && (
        <div
          className="stage-map__category-legend"
          aria-label={labels.ticketCategories}
        >
          {ticketCategories.map(({ ticketCategory, colorTone }) => (
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
