import type {
  ArcSectionLayout,
  Point,
  RectangularSectionLayout,
  ResolvedSection,
  SectionBounds,
  SectionLayout,
  SectionLayoutMap,
  StageSurfaceLayout,
  StageType,
  TheatreSection,
  VenueLayout,
} from "./types";

const FULL_CIRCLE = 360;
const DEG_TO_RAD = Math.PI / 180;
const SECTION_GAP = 26;
const COORDINATE_PRECISION = 1_000_000;

function normalizeCoordinate(value: number): number {
  return Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;
}

const DEFAULT_VENUE_LAYOUTS: Record<StageType, VenueLayout> = {
  THEATER: {
    width: 1000,
    height: 780,
    stage: {
      x: 230,
      y: 52,
      width: 540,
      height: 106,
      cornerRadius: 12,
    },
    focalPoint: { x: 500, y: 138 },
  },
  CONCERT_STAGE: {
    width: 1000,
    height: 820,
    stage: {
      x: 175,
      y: 38,
      width: 650,
      height: 142,
      cornerRadius: 8,
      extension: {
        x: 438,
        y: 174,
        width: 124,
        height: 112,
        cornerRadius: 7,
      },
    },
    focalPoint: { x: 500, y: 124 },
  },
  STADIUM: {
    width: 1100,
    height: 800,
    stage: {
      x: 310,
      y: 248,
      width: 480,
      height: 304,
      cornerRadius: 56,
    },
    focalPoint: { x: 550, y: 400 },
  },
};

export function resolveVenueLayout(
  stageType: StageType,
  venueLayout?: VenueLayout,
  stageOverride?: Partial<StageSurfaceLayout>,
): VenueLayout {
  const source = venueLayout ?? DEFAULT_VENUE_LAYOUTS[stageType];

  return {
    ...source,
    stage: {
      ...source.stage,
      ...stageOverride,
      extension: stageOverride?.extension ?? source.stage.extension,
    },
    focalPoint:
      venueLayout?.focalPoint ??
      DEFAULT_VENUE_LAYOUTS[stageType].focalPoint ?? {
        x: source.width / 2,
        y: source.height / 2,
      },
  };
}

function toneFromSection(section: TheatreSection): 0 | 1 | 2 | 3 | 4 | 5 {
  let hash = 0;
  for (const character of section.ticketCategory.type) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return (hash % 6) as 0 | 1 | 2 | 3 | 4 | 5;
}

function theaterAutoLayout(
  index: number,
  count: number,
  venue: VenueLayout,
): RectangularSectionLayout {
  const bandCount = Math.max(1, Math.ceil(Math.sqrt(count)));
  const bandIndex = Math.min(
    bandCount - 1,
    Math.floor((index * bandCount) / count),
  );
  const bandStart = Math.ceil((bandIndex * count) / bandCount);
  const bandEnd = Math.ceil(((bandIndex + 1) * count) / bandCount);
  const sectionsInBand = Math.max(1, bandEnd - bandStart);
  const sectionIndex = index - bandStart;
  const auditoriumTop = venue.stage.y + venue.stage.height + 82;
  const auditoriumBottom = venue.height - 52;
  const bandHeight =
    (auditoriumBottom - auditoriumTop - SECTION_GAP * (bandCount - 1)) /
    bandCount;
  const depth = bandCount === 1 ? 0 : bandIndex / (bandCount - 1);
  const sideInset = venue.width * (0.16 - depth * 0.07);
  const usableWidth = venue.width - sideInset * 2;
  const sectionWidth =
    (usableWidth - SECTION_GAP * (sectionsInBand - 1)) / sectionsInBand;

  return {
    shape: "trapezoid",
    x: sideInset + sectionIndex * (sectionWidth + SECTION_GAP),
    y: auditoriumTop + bandIndex * (bandHeight + SECTION_GAP),
    width: sectionWidth,
    height: bandHeight,
    topInset: sectionWidth * 0.045,
    bottomInset: 0,
    labelPlacement: "inside",
  };
}

function concertAutoLayout(
  index: number,
  count: number,
  venue: VenueLayout,
): RectangularSectionLayout {
  const floorCount = Math.max(1, Math.ceil(count * 0.5));
  const stageBottom = venue.stage.extension
    ? venue.stage.extension.y + venue.stage.extension.height
    : venue.stage.y + venue.stage.height;

  if (index < floorCount) {
    const floorTop = stageBottom + 42;
    const floorBottom = venue.height - 70;
    const bandHeight =
      (floorBottom - floorTop - SECTION_GAP * (floorCount - 1)) / floorCount;
    const depth = floorCount === 1 ? 0 : index / (floorCount - 1);
    const width = venue.width * (0.42 + depth * 0.1);

    return {
      shape: "trapezoid",
      x: (venue.width - width) / 2,
      y: floorTop + index * (bandHeight + SECTION_GAP),
      width,
      height: bandHeight,
      topInset: width * 0.05,
      bottomInset: 0,
      labelPlacement: "inside",
    };
  }

  const sideIndex = index - floorCount;
  const sideRows = Math.ceil((count - floorCount) / 2);
  const isLeft = sideIndex % 2 === 0;
  const rowIndex = Math.floor(sideIndex / 2);
  const sideTop = venue.stage.y + venue.stage.height + 44;
  const availableHeight = venue.height - sideTop - 64;
  const height =
    (availableHeight - SECTION_GAP * Math.max(0, sideRows - 1)) / sideRows;
  const width = venue.width * 0.19;

  return {
    shape: "trapezoid",
    x: isLeft ? venue.width * 0.055 : venue.width * 0.755,
    y: sideTop + rowIndex * (height + SECTION_GAP),
    width,
    height,
    rotation: isLeft ? -7 : 7,
    topInset: isLeft ? width * 0.08 : width * 0.02,
    bottomInset: isLeft ? width * 0.02 : width * 0.08,
    labelPlacement: "inside",
  };
}

function stadiumAutoLayout(
  index: number,
  count: number,
  venue: VenueLayout,
): ArcSectionLayout {
  const centerX = venue.focalPoint?.x ?? venue.width / 2;
  const centerY = venue.focalPoint?.y ?? venue.height / 2;
  const sectionsPerRing = Math.max(1, Math.min(12, count));
  const ringIndex = Math.floor(index / sectionsPerRing);
  const indexInRing = index % sectionsPerRing;
  const sectionsInRing = Math.min(
    sectionsPerRing,
    count - ringIndex * sectionsPerRing,
  );
  const angularGap = Math.min(3.5, 24 / sectionsInRing);
  const sweep = FULL_CIRCLE / sectionsInRing;
  const innerRadiusX = venue.stage.width / 2 + 56 + ringIndex * 86;
  const innerRadiusY = venue.stage.height / 2 + 48 + ringIndex * 62;

  return {
    shape: "arc",
    centerX,
    centerY,
    innerRadiusX,
    innerRadiusY,
    outerRadiusX: innerRadiusX + 72,
    outerRadiusY: innerRadiusY + 50,
    startAngle: -90 + indexInRing * sweep + angularGap / 2,
    endAngle: -90 + (indexInRing + 1) * sweep - angularGap / 2,
    labelPlacement: "inside",
  };
}

export function resolveSections(
  sections: readonly TheatreSection[],
  stageType: StageType,
  venue: VenueLayout,
  sectionLayouts?: SectionLayoutMap,
): readonly ResolvedSection[] {
  return sections.map((section, index) => ({
    ...section,
    layout:
      sectionLayouts?.[section.id] ??
      (stageType === "THEATER"
        ? theaterAutoLayout(index, sections.length, venue)
        : stageType === "CONCERT_STAGE"
          ? concertAutoLayout(index, sections.length, venue)
          : stadiumAutoLayout(index, sections.length, venue)),
    colorTone: toneFromSection(section),
  }));
}

function polarPoint(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  angle: number,
): Point {
  const radians = angle * DEG_TO_RAD;
  return {
    x: normalizeCoordinate(centerX + radiusX * Math.cos(radians)),
    y: normalizeCoordinate(centerY + radiusY * Math.sin(radians)),
  };
}

function arcCommand(
  radiusX: number,
  radiusY: number,
  end: Point,
  sweep: number,
  clockwise: boolean,
): string {
  return `A ${radiusX} ${radiusY} 0 ${Math.abs(sweep) > 180 ? 1 : 0} ${clockwise ? 1 : 0} ${end.x} ${end.y}`;
}

export function getSectionPath(layout: SectionLayout): string {
  if (layout.shape !== "arc") {
    const topInset = layout.shape === "rectangle" ? 0 : layout.topInset ?? 0;
    const bottomInset =
      layout.shape === "rectangle" ? 0 : layout.bottomInset ?? 0;
    return [
      `M ${layout.x + topInset} ${layout.y}`,
      `L ${layout.x + layout.width - topInset} ${layout.y}`,
      `L ${layout.x + layout.width - bottomInset} ${layout.y + layout.height}`,
      `L ${layout.x + bottomInset} ${layout.y + layout.height}`,
      "Z",
    ].join(" ");
  }

  const sweep = layout.endAngle - layout.startAngle;
  const clockwise = sweep >= 0;
  const outerStart = polarPoint(
    layout.centerX,
    layout.centerY,
    layout.outerRadiusX,
    layout.outerRadiusY,
    layout.startAngle,
  );
  const outerEnd = polarPoint(
    layout.centerX,
    layout.centerY,
    layout.outerRadiusX,
    layout.outerRadiusY,
    layout.endAngle,
  );
  const innerEnd = polarPoint(
    layout.centerX,
    layout.centerY,
    layout.innerRadiusX,
    layout.innerRadiusY,
    layout.endAngle,
  );
  const innerStart = polarPoint(
    layout.centerX,
    layout.centerY,
    layout.innerRadiusX,
    layout.innerRadiusY,
    layout.startAngle,
  );

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    arcCommand(
      layout.outerRadiusX,
      layout.outerRadiusY,
      outerEnd,
      sweep,
      clockwise,
    ),
    `L ${innerEnd.x} ${innerEnd.y}`,
    arcCommand(
      layout.innerRadiusX,
      layout.innerRadiusY,
      innerStart,
      sweep,
      !clockwise,
    ),
    "Z",
  ].join(" ");
}

export function getSectionLabelPoint(layout: SectionLayout): Point {
  if (layout.shape !== "arc") {
    return {
      x: layout.x + layout.width / 2,
      y:
        layout.labelPlacement === "outside"
          ? layout.y - 10
          : layout.y + layout.height / 2,
    };
  }

  return polarPoint(
    layout.centerX,
    layout.centerY,
    (layout.innerRadiusX + layout.outerRadiusX) / 2,
    (layout.innerRadiusY + layout.outerRadiusY) / 2,
    (layout.startAngle + layout.endAngle) / 2,
  );
}

export function getSectionTransform(layout: SectionLayout): string | undefined {
  if (layout.shape === "arc" || !layout.rotation) return undefined;
  return `rotate(${layout.rotation} ${layout.x + layout.width / 2} ${layout.y + layout.height / 2})`;
}

export function getSectionBounds(layout: SectionLayout): SectionBounds {
  if (layout.shape !== "arc") {
    return {
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
    };
  }

  const points = Array.from({ length: 25 }, (_, index) => {
    const angle =
      layout.startAngle +
      ((layout.endAngle - layout.startAngle) * index) / 24;
    return [
      polarPoint(
        layout.centerX,
        layout.centerY,
        layout.outerRadiusX,
        layout.outerRadiusY,
        angle,
      ),
      polarPoint(
        layout.centerX,
        layout.centerY,
        layout.innerRadiusX,
        layout.innerRadiusY,
        angle,
      ),
    ];
  }).flat();
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}
