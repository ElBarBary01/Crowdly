import Tooltip, {
  type TooltipPosition,
} from "../feedbackComponents/tooltip";
import {
  getSectionBounds,
  getSectionLabelPoint,
  getSectionPath,
  getSectionTransform,
} from "./geometry";
import type {
  PriceFormatter,
  ResolvedSection,
  StageLabels,
  TicketTypeFormatter,
} from "./types";

interface SeatingSectionProps {
  section: ResolvedSection;
}

export default function SeatingSection({
  section,
}: SeatingSectionProps) {
  const path = getSectionPath(section.layout);
  const labelPoint = getSectionLabelPoint(section.layout);

  return (
    <g
      className={`stage-map__section-wrapper stage-map__section--tone-${section.colorTone}`}
      aria-hidden="true"
    >
      <g
        className="stage-map__section"
        transform={getSectionTransform(section.layout)}
        aria-hidden="true"
      >
        <path className="stage-map__section-shadow" d={path} />
        <path className="stage-map__section-boundary" d={path} />
        <path className="stage-map__section-texture" d={path} />

        {section.layout.labelPlacement !== "hidden" && (
          <g
            className="stage-map__section-label"
            transform={`translate(${labelPoint.x} ${labelPoint.y})`}
          >
            <text className="stage-map__section-name" textAnchor="middle">
              {section.name}
            </text>
            {section.level && (
              <text
                className="stage-map__section-level"
                textAnchor="middle"
                y={15}
              >
                {section.level}
              </text>
            )}
          </g>
        )}
      </g>
    </g>
  );
}

interface SectionTooltipProps {
  section: ResolvedSection;
  labels: StageLabels;
  formatPrice: PriceFormatter;
  formatTicketType: TicketTypeFormatter;
  tooltipPosition: TooltipPosition;
}

export function SectionTooltip({
  section,
  labels,
  formatPrice,
  formatTicketType,
  tooltipPosition,
}: SectionTooltipProps) {
  const bounds = getSectionBounds(section.layout);
  const path = getSectionPath(section.layout);
  const availableSeatsLabel = labels.availableSeats(
    section.ticketCategory.quantity,
  );
  const ticketCategoryLabel = formatTicketType(section.ticketCategory.type);
  const priceLabel = labels.price(formatPrice(section.ticketCategory));
  const accessibilityLabel = [
    section.name,
    ticketCategoryLabel,
    priceLabel,
    availableSeatsLabel,
  ].join(". ");

  return (
    <g
      className={`stage-map__tooltip-item stage-map__section--tone-${section.colorTone}`}
    >
      <path
        className="stage-map__section-hover"
        d={path}
        transform={getSectionTransform(section.layout)}
        aria-hidden="true"
      />
      <foreignObject
        className="stage-map__tooltip-region"
        x={bounds.x}
        y={bounds.y}
        width={Math.max(bounds.width, 1)}
        height={Math.max(bounds.height, 1)}
        role="group"
        aria-label={accessibilityLabel}
      >
        <Tooltip
          content={
            <span className="stage-map__tooltip-content">
              <strong className="stage-map__tooltip-section-name">
                {section.name}
              </strong>
              <span className="stage-map__tooltip-category">
                {ticketCategoryLabel}
              </span>
              <strong className="stage-map__tooltip-price">{priceLabel}</strong>
              <span className="stage-map__tooltip-availability">
                {availableSeatsLabel}
              </span>
            </span>
          }
          position={tooltipPosition}
          className="stage-map__tooltip-anchor"
        >
          <span className="stage-map__tooltip-hit-area" />
        </Tooltip>
      </foreignObject>
    </g>
  );
}
