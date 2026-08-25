"use client";

import { useState } from "react";
import Stage, {
  type PriceFormatter,
  type StageEvent,
  type StageSection,
  type StageType,
  type StageVenue,
  type TicketCategory,
  type TicketType,
  type TicketTypeFormatter,
} from "../index";
import "./preview.css";

const VENUE_OPTIONS: ReadonlyArray<{ type: StageType; label: string }> = [
  { type: "THEATER", label: "Modern theater" },
  { type: "CONCERT_STAGE", label: "Concert stage" },
  { type: "STADIUM", label: "Stadium" },
];

const TICKET_CATEGORIES = {
  earlyBird: {
    type: "EARLY_BIRD",
    price: 950,
    quantity: 48,
    description: null,
  },
  generalAdmission: {
    type: "GENERAL_ADMISSION",
    price: 1750,
    quantity: 96,
    description: null,
  },
  vip: { type: "VIP", price: 2800, quantity: 84, description: null },
  vipMeetGreet: {
    type: "VIP_MEET_GREET",
    price: 3600,
    quantity: 42,
    description: null,
  },
} satisfies Record<string, TicketCategory>;

const EVENT_TICKETS = Object.values(TICKET_CATEGORIES);
const TICKETS_LEFT = EVENT_TICKETS.reduce(
  (total, ticket) => total + ticket.quantity,
  0,
);

const VENUE_CAPACITY: Record<StageType, number> = {
  THEATER: 420,
  CONCERT_STAGE: 850,
  STADIUM: 1200,
};

const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  EARLY_BIRD: "Early bird",
  GENERAL_ADMISSION: "General admission",
  VIP: "VIP",
  VIP_MEET_GREET: "VIP meet & greet",
};

function stageSection(
  id: string,
  name: string,
  ticketType: TicketType,
  level: string,
): StageSection {
  return { id, name, ticketType, level };
}

const PREVIEW_STAGE_SECTIONS = {
  THEATER: [
    stageSection(
      "theater-1",
      "Orchestra Left",
      TICKET_CATEGORIES.vip.type,
      "Lower level",
    ),
    stageSection(
      "theater-2",
      "Orchestra Right",
      TICKET_CATEGORIES.vip.type,
      "Lower level",
    ),
    stageSection(
      "theater-3",
      "Middle Left",
      TICKET_CATEGORIES.generalAdmission.type,
      "Lower level",
    ),
    stageSection(
      "theater-4",
      "Middle Right",
      TICKET_CATEGORIES.generalAdmission.type,
      "Lower level",
    ),
    stageSection(
      "theater-5",
      "Rear Balcony",
      TICKET_CATEGORIES.earlyBird.type,
      "Upper level",
    ),
  ],
  CONCERT_STAGE: [
    stageSection(
      "concert-1",
      "Front Pit",
      TICKET_CATEGORIES.vipMeetGreet.type,
      "Floor level",
    ),
    stageSection(
      "concert-2",
      "Floor A",
      TICKET_CATEGORIES.vip.type,
      "Floor level",
    ),
    stageSection(
      "concert-3",
      "Floor B",
      TICKET_CATEGORIES.vip.type,
      "Floor level",
    ),
    stageSection(
      "concert-4",
      "Rear Floor",
      TICKET_CATEGORIES.generalAdmission.type,
      "Floor level",
    ),
    stageSection(
      "concert-5",
      "Lower Left",
      TICKET_CATEGORIES.generalAdmission.type,
      "Lower level",
    ),
    stageSection(
      "concert-6",
      "Lower Right",
      TICKET_CATEGORIES.generalAdmission.type,
      "Lower level",
    ),
    stageSection(
      "concert-7",
      "Upper Bowl",
      TICKET_CATEGORIES.earlyBird.type,
      "Upper level",
    ),
    stageSection(
      "concert-8",
      "Upper Bowl",
      TICKET_CATEGORIES.earlyBird.type,
      "Upper level",
    ),
  ],
  STADIUM: [
    stageSection(
      "stadium-1",
      "North Stand",
      TICKET_CATEGORIES.vip.type,
      "Lower level",
    ),
    stageSection(
      "stadium-2",
      "North East Corner",
      TICKET_CATEGORIES.generalAdmission.type,
      "Lower level",
    ),
    stageSection(
      "stadium-3",
      "East Stand",
      TICKET_CATEGORIES.vip.type,
      "Lower level",
    ),
    stageSection(
      "stadium-4",
      "South East Corner",
      TICKET_CATEGORIES.generalAdmission.type,
      "Lower level",
    ),
    stageSection(
      "stadium-5",
      "South Stand",
      TICKET_CATEGORIES.earlyBird.type,
      "Upper level",
    ),
    stageSection(
      "stadium-6",
      "South West Corner",
      TICKET_CATEGORIES.generalAdmission.type,
      "Upper level",
    ),
    stageSection(
      "stadium-7",
      "West Stand",
      TICKET_CATEGORIES.earlyBird.type,
      "Upper level",
    ),
    stageSection(
      "stadium-8",
      "North West Corner",
      TICKET_CATEGORIES.generalAdmission.type,
      "Upper level",
    ),
  ],
} satisfies Record<StageType, readonly StageSection[]>;

function previewVenue(stageType: StageType): StageVenue {
  return {
    stageType,
    stageSections: PREVIEW_STAGE_SECTIONS[stageType],
    capacity: VENUE_CAPACITY[stageType],
    ticketsLeft: TICKETS_LEFT,
  };
}

function previewEvent(stageType: StageType): StageEvent {
  return {
    venue: previewVenue(stageType),
    tickets: EVENT_TICKETS,
  };
}

const PREVIEW_EVENTS: Record<StageType, StageEvent> = {
  THEATER: previewEvent("THEATER"),
  CONCERT_STAGE: previewEvent("CONCERT_STAGE"),
  STADIUM: previewEvent("STADIUM"),
};

const PRICE_FORMATTER = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const formatPrice: PriceFormatter = (ticketCategory) =>
  PRICE_FORMATTER.format(ticketCategory.price);

const formatTicketType: TicketTypeFormatter = (ticketType) =>
  TICKET_TYPE_LABELS[ticketType];

export default function StagePreviewPage() {
  const [stageType, setStageType] = useState<StageType>("THEATER");
  const venue = PREVIEW_EVENTS[stageType].venue;

  return (
    <div className="stage-preview">
      <header className="stage-preview__header">
        <span className="stage-preview__eyebrow">
          Interactive component preview
        </span>
        <h1>Venue section simulation</h1>
        <p>
          Switch venue types and hover any section to see its current seat
          category, price, and seat availability.
        </p>
      </header>

      <nav className="stage-preview__switcher" aria-label="Venue type">
        {VENUE_OPTIONS.map((option) => {
          const isActive = option.type === stageType;
          return (
            <button
              className={`stage-preview__switch ${isActive ? "stage-preview__switch--active" : ""}`}
              type="button"
              aria-pressed={isActive}
              key={option.type}
              onClick={() => setStageType(option.type)}
            >
              {option.label}
            </button>
          );
        })}
      </nav>

      <div className="stage-preview__status">
        <span>
          {VENUE_OPTIONS.find((option) => option.type === stageType)?.label}
        </span>
        <span>{venue.stageSections.length} sections</span>
      </div>

      {VENUE_OPTIONS.map((option) => (
        <div
          className="stage-preview__map"
          hidden={option.type !== stageType}
          key={option.type}
        >
          <Stage
            event={PREVIEW_EVENTS[option.type]}
            formatPrice={formatPrice}
            formatTicketType={formatTicketType}
          />
        </div>
      ))}
    </div>
  );
}
