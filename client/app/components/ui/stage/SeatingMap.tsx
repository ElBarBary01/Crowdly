import { useId } from "react";
import type { TooltipPosition } from "../feedbackComponents/tooltip";
import SeatingSection, { SectionTooltip } from "./SeatingSection";
import type {
  PriceFormatter,
  ResolvedSection,
  StageLabels,
  StageType,
  TicketTypeFormatter,
  VenueLayout,
} from "./types";

interface SeatingMapProps {
  stageType: StageType;
  sections: readonly ResolvedSection[];
  venue: VenueLayout;
  labels: StageLabels;
  formatPrice: PriceFormatter;
  formatTicketType: TicketTypeFormatter;
  tooltipPosition: TooltipPosition;
  ariaLabel: string;
}

interface VenueArchitectureProps {
  stageType: StageType;
  venue: VenueLayout;
  labels: StageLabels;
  deckPatternId: string;
  fieldPatternId: string;
}

function TheaterArchitecture({
  venue,
  labels,
  deckPatternId,
}: Omit<VenueArchitectureProps, "stageType" | "fieldPatternId">) {
  const stage = venue.stage;
  const centerX = stage.x + stage.width / 2;
  const apronY = stage.y + stage.height;

  return (
    <g className="stage-map__architecture stage-map__architecture--theater">
      <path
        className="stage-map__theater-shell"
        d={`M ${stage.x - 74} ${stage.y + 24} L ${stage.x - 106} ${venue.height - 34} L ${stage.x + stage.width + 106} ${venue.height - 34} L ${stage.x + stage.width + 74} ${stage.y + 24}`}
      />
      <path
        className="stage-map__proscenium"
        d={`M ${stage.x - 18} ${apronY + 2} Q ${centerX} ${apronY + 48} ${stage.x + stage.width + 18} ${apronY + 2}`}
      />
      <rect
        className="stage-map__stage-shadow"
        x={stage.x - 8}
        y={stage.y + 8}
        width={stage.width + 16}
        height={stage.height + 18}
        rx={stage.cornerRadius ?? 0}
      />
      <rect
        className="stage-map__stage-surface"
        x={stage.x}
        y={stage.y}
        width={stage.width}
        height={stage.height}
        rx={stage.cornerRadius ?? 0}
        fill={`url(#${deckPatternId})`}
      />
      <path
        className="stage-map__curtain stage-map__curtain--left"
        d={`M ${stage.x} ${stage.y} Q ${stage.x + 42} ${stage.y + stage.height / 2} ${stage.x} ${apronY}`}
      />
      <path
        className="stage-map__curtain stage-map__curtain--right"
        d={`M ${stage.x + stage.width} ${stage.y} Q ${stage.x + stage.width - 42} ${stage.y + stage.height / 2} ${stage.x + stage.width} ${apronY}`}
      />
      <line
        className="stage-map__stage-centerline"
        x1={centerX}
        y1={stage.y + 14}
        x2={centerX}
        y2={apronY - 14}
      />
      <text
        className="stage-map__stage-label"
        x={centerX}
        y={stage.y + stage.height / 2 + 5}
        textAnchor="middle"
      >
        {stage.label ?? labels.stage}
      </text>
      <g className="stage-map__egress-lines" aria-hidden="true">
        <line x1={stage.x - 44} y1={apronY + 48} x2={stage.x - 76} y2={venue.height - 62} />
        <line
          x1={stage.x + stage.width + 44}
          y1={apronY + 48}
          x2={stage.x + stage.width + 76}
          y2={venue.height - 62}
        />
      </g>
    </g>
  );
}

function ConcertArchitecture({
  venue,
  labels,
  deckPatternId,
}: Omit<VenueArchitectureProps, "stageType" | "fieldPatternId">) {
  const stage = venue.stage;
  const centerX = stage.x + stage.width / 2;
  const extension = stage.extension;
  const trussY = stage.y + 18;

  return (
    <g className="stage-map__architecture stage-map__architecture--concert">
      <rect
        className="stage-map__stage-shadow"
        x={stage.x - 12}
        y={stage.y + 10}
        width={stage.width + 24}
        height={stage.height + 22}
        rx={stage.cornerRadius ?? 0}
      />
      <rect
        className="stage-map__stage-surface"
        x={stage.x}
        y={stage.y}
        width={stage.width}
        height={stage.height}
        rx={stage.cornerRadius ?? 0}
        fill={`url(#${deckPatternId})`}
      />
      <rect
        className="stage-map__stage-truss"
        x={stage.x + 20}
        y={trussY}
        width={stage.width - 40}
        height={12}
        rx={6}
      />
      {Array.from({ length: 8 }, (_, index) => (
        <circle
          className="stage-map__stage-light"
          key={index}
          cx={stage.x + 54 + (index * (stage.width - 108)) / 7}
          cy={trussY + 6}
          r={4}
        />
      ))}
      <g className="stage-map__speaker-array" aria-hidden="true">
        <rect x={stage.x - 24} y={stage.y + 32} width={17} height={70} rx={5} />
        <rect
          x={stage.x + stage.width + 7}
          y={stage.y + 32}
          width={17}
          height={70}
          rx={5}
        />
      </g>
      {extension && (
        <>
          <rect
            className="stage-map__stage-extension-shadow"
            x={extension.x - 7}
            y={extension.y}
            width={extension.width + 14}
            height={extension.height + 10}
            rx={extension.cornerRadius ?? 0}
          />
          <rect
            className="stage-map__stage-extension"
            x={extension.x}
            y={extension.y}
            width={extension.width}
            height={extension.height}
            rx={extension.cornerRadius ?? 0}
            fill={`url(#${deckPatternId})`}
          />
          <line
            className="stage-map__extension-centerline"
            x1={extension.x + extension.width / 2}
            y1={extension.y}
            x2={extension.x + extension.width / 2}
            y2={extension.y + extension.height}
          />
        </>
      )}
      <text
        className="stage-map__stage-label"
        x={centerX}
        y={stage.y + stage.height / 2 + 18}
        textAnchor="middle"
      >
        {stage.label ?? labels.stage}
      </text>
      <path
        className="stage-map__security-line"
        d={`M ${stage.x - 34} ${stage.y + stage.height + 34} Q ${centerX} ${stage.y + stage.height + 62} ${stage.x + stage.width + 34} ${stage.y + stage.height + 34}`}
      />
    </g>
  );
}

function StadiumArchitecture({
  venue,
  labels,
  fieldPatternId,
}: Omit<VenueArchitectureProps, "stageType" | "deckPatternId">) {
  const field = venue.stage;
  const centerX = field.x + field.width / 2;
  const centerY = field.y + field.height / 2;

  return (
    <g className="stage-map__architecture stage-map__architecture--stadium">
      <ellipse
        className="stage-map__stadium-concourse stage-map__stadium-concourse--outer"
        cx={centerX}
        cy={centerY}
        rx={field.width / 2 + 250}
        ry={field.height / 2 + 178}
      />
      <ellipse
        className="stage-map__stadium-concourse stage-map__stadium-concourse--inner"
        cx={centerX}
        cy={centerY}
        rx={field.width / 2 + 55}
        ry={field.height / 2 + 48}
      />
      <rect
        className="stage-map__field-shadow"
        x={field.x - 10}
        y={field.y + 10}
        width={field.width + 20}
        height={field.height + 12}
        rx={field.cornerRadius ?? 0}
      />
      <rect
        className="stage-map__field"
        x={field.x}
        y={field.y}
        width={field.width}
        height={field.height}
        rx={field.cornerRadius ?? 0}
        fill={`url(#${fieldPatternId})`}
      />
      <line
        className="stage-map__field-marking"
        x1={centerX}
        y1={field.y + 12}
        x2={centerX}
        y2={field.y + field.height - 12}
      />
      <circle
        className="stage-map__field-marking"
        cx={centerX}
        cy={centerY}
        r={45}
      />
      <rect
        className="stage-map__field-marking"
        x={field.x + 12}
        y={centerY - 76}
        width={72}
        height={152}
        rx={8}
      />
      <rect
        className="stage-map__field-marking"
        x={field.x + field.width - 84}
        y={centerY - 76}
        width={72}
        height={152}
        rx={8}
      />
      <text
        className="stage-map__field-label"
        x={centerX}
        y={centerY + 5}
        textAnchor="middle"
      >
        {field.label ?? labels.field}
      </text>
      <g className="stage-map__stadium-tunnels" aria-hidden="true">
        <path d={`M ${field.x - 54} ${centerY - 22} h 54 v 44 h -54 Z`} />
        <path d={`M ${field.x + field.width} ${centerY - 22} h 54 v 44 h -54 Z`} />
      </g>
    </g>
  );
}

function VenueArchitecture(props: VenueArchitectureProps) {
  if (props.stageType === "theater") {
    return <TheaterArchitecture {...props} />;
  }
  if (props.stageType === "concert stage") {
    return <ConcertArchitecture {...props} />;
  }
  return <StadiumArchitecture {...props} />;
}

export default function SeatingMap({
  stageType,
  sections,
  venue,
  labels,
  formatPrice,
  formatTicketType,
  tooltipPosition,
  ariaLabel,
}: SeatingMapProps) {
  const rawId = useId().replace(/:/g, "");
  const deckPatternId = `stage-deck-${rawId}`;
  const fieldPatternId = `stage-field-${rawId}`;
  const ambientGradientId = `stage-ambient-${rawId}`;

  return (
    <div className="stage-map__viewport">
      <svg
        className="stage-map__canvas"
        viewBox={`0 0 ${venue.width} ${venue.height}`}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient
            id={ambientGradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0" className="stage-map__ambient-stop stage-map__ambient-stop--start" />
            <stop offset="1" className="stage-map__ambient-stop stage-map__ambient-stop--end" />
          </linearGradient>
          <pattern
            id={deckPatternId}
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <rect className="stage-map__deck-pattern-base" width="16" height="16" />
            <path className="stage-map__deck-pattern-line" d="M 0 16 L 16 0" />
          </pattern>
          <pattern
            id={fieldPatternId}
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <rect className="stage-map__field-pattern-a" width="24" height="48" />
            <rect className="stage-map__field-pattern-b" x="24" width="24" height="48" />
          </pattern>
        </defs>
        <rect
          className="stage-map__floor"
          width={venue.width}
          height={venue.height}
          rx={28}
          fill={`url(#${ambientGradientId})`}
        />
        <VenueArchitecture
          stageType={stageType}
          venue={venue}
          labels={labels}
          deckPatternId={deckPatternId}
          fieldPatternId={fieldPatternId}
        />
        <g className="stage-map__sections">
          {sections.map((section) => (
            <SeatingSection
              key={section.id}
              section={section}
            />
          ))}
        </g>
        <g className="stage-map__tooltip-layer">
          {sections.map((section) => (
            <SectionTooltip
              key={`tooltip-${section.id}`}
              section={section}
              labels={labels}
              formatPrice={formatPrice}
              formatTicketType={formatTicketType}
              tooltipPosition={tooltipPosition}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
