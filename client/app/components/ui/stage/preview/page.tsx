"use client";

import { useState } from "react";
import Stage, {
  type PriceFormatter,
  type StageType,
  type TheatreSection,
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

const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  EARLY_BIRD: "Early bird",
  GENERAL_ADMISSION: "General admission",
  VIP: "VIP",
  VIP_MEET_GREET: "VIP meet & greet",
};

function section(
  id: string,
  name: string,
  ticketCategory: TicketCategory,
  level?: string,
): TheatreSection {
  return { id, name, ticketCategory, level };
}

const PREVIEW_SECTIONS = {
  THEATER: [
    section(
      "theater-1",
      "Orchestra Left",
      TICKET_CATEGORIES.vip,
      "Lower level",
    ),
    section(
      "theater-2",
      "Orchestra Right",
      TICKET_CATEGORIES.vip,
      "Lower level",
    ),
    section(
      "theater-3",
      "Middle Left",
      TICKET_CATEGORIES.generalAdmission,
      "Lower level",
    ),
    section(
      "theater-4",
      "Middle Right",
      TICKET_CATEGORIES.generalAdmission,
      "Lower level",
    ),
    section(
      "theater-5",
      "Rear Balcony",
      TICKET_CATEGORIES.earlyBird,
      "Upper level",
    ),
  ],
  CONCERT_STAGE: [
    section(
      "concert-1",
      "Front Pit",
      TICKET_CATEGORIES.vipMeetGreet,
      "Floor level",
    ),
    section("concert-2", "Floor A", TICKET_CATEGORIES.vip, "Floor level"),
    section("concert-3", "Floor B", TICKET_CATEGORIES.vip, "Floor level"),
    section(
      "concert-4",
      "Rear Floor",
      TICKET_CATEGORIES.generalAdmission,
      "Floor level",
    ),
    section(
      "concert-5",
      "Lower Left",
      TICKET_CATEGORIES.generalAdmission,
      "Lower level",
    ),
    section(
      "concert-6",
      "Lower Right",
      TICKET_CATEGORIES.generalAdmission,
      "Lower level",
    ),
    section(
      "concert-7",
      "Upper Bowl",
      TICKET_CATEGORIES.earlyBird,
      "Upper level",
    ),
    section(
      "concert-8",
      "Upper Bowl",
      TICKET_CATEGORIES.earlyBird,
      "Upper level",
    ),
  ],
  STADIUM: [
    section("stadium-1", "North Stand", TICKET_CATEGORIES.vip, "Lower level"),
    section(
      "stadium-2",
      "North East Corner",
      TICKET_CATEGORIES.generalAdmission,
      "Lower level",
    ),
    section("stadium-3", "East Stand", TICKET_CATEGORIES.vip, "Lower level"),
    section(
      "stadium-4",
      "South East Corner",
      TICKET_CATEGORIES.generalAdmission,
      "Lower level",
    ),
    section(
      "stadium-5",
      "South Stand",
      TICKET_CATEGORIES.earlyBird,
      "Upper level",
    ),
    section(
      "stadium-6",
      "South West Corner",
      TICKET_CATEGORIES.generalAdmission,
      "Upper level",
    ),
    section(
      "stadium-7",
      "West Stand",
      TICKET_CATEGORIES.earlyBird,
      "Upper level",
    ),
    section(
      "stadium-8",
      "North West Corner",
      TICKET_CATEGORIES.generalAdmission,
      "Upper level",
    ),
  ],
} satisfies Record<StageType, readonly TheatreSection[]>;

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
  const sections = PREVIEW_SECTIONS[stageType];

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
        <span>{sections.length} sections</span>
      </div>

      {VENUE_OPTIONS.map((option) => (
        <div
          className="stage-preview__map"
          hidden={option.type !== stageType}
          key={option.type}
        >
          <Stage
            stageType={option.type}
            sections={PREVIEW_SECTIONS[option.type]}
            formatPrice={formatPrice}
            formatTicketType={formatTicketType}
          />
        </div>
      ))}
    </div>
  );
}
