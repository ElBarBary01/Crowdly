// components/home/EventSection/EventSection.tsx
"use client";

import EventCard from "../../ui/card/EventCard";
import { EventCardSkeleton } from "../../ui/skeleton/CardSkeleton";
import { EventCard as EventCardType } from "../../../types/home";
import styles from "./UpcomingEvents.module.css";

interface EventSectionProps {
  title: string;
  subtitle?: string;
  locationLabel?: string; // e.g. "📍 Los Angeles, CA" — only used by the "Near You" section
  viewAllHref?: string;
  events: EventCardType[];
  loading?: boolean;
  skeletonCount?: number;
}

export function getImageUrl(image?: string | null) {
  if (!image) return undefined;
  const markdownMatch = image.match(/\]\((.*?)\)/);
  return markdownMatch ? markdownMatch[1] : image;
}

export function formatEventDate(date: string, time: string) {
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return "Date unavailable";
  const formatted = parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${formatted} · ${time}`;
}

export default function UpcomingEventSection({
  title,
  subtitle,
  locationLabel,
  viewAllHref,
  events,
  loading,
  skeletonCount = 3,
}: EventSectionProps) {
  return (
    <section className={styles.container}>
      <div className={styles.heading}>
        <div>
          <h2>
            {title}
            {locationLabel && (
              <span className={styles.locationPill}>{locationLabel}</span>
            )}
          </h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {viewAllHref && <a href={viewAllHref}>View all &gt;</a>}
      </div>

      <div className={styles.eventGrid}>
        {loading ? (
          <EventCardSkeleton count={skeletonCount} />
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              eventId={event.id}
              imageSrc={getImageUrl(event.image)}
              imageAlt={event.title}
              badgeText={event.genreLabel || "Event"}
              title={event.title}
              date={formatEventDate(event.date, event.time)}
              Venue={event.venue?.name || "Venue unavailable"}
              price={
                event.fromPrice != null
                  ? `$${event.fromPrice.toFixed(2)}`
                  : "Unavailable"
              }
              buttonLabel={
                event.availabilityLabel === "Sold Out"
                  ? "Sold Out"
                  : "Get Tickets"
              }
            />
          ))
        )}
      </div>
    </section>
  );
}
