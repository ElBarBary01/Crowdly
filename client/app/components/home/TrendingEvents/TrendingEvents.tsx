"use client";

import EventCard from "../../ui/card/EventCard";
import { useTrendingEvents } from "../../../hooks/events/use-trending-events";
import "./TrendingEvents.css";
import { useRouter } from "next/navigation";
import Button from "../../ui/Button";

export default function TrendingEvents() {
  const { data: events, isLoading, isError } = useTrendingEvents();
  const router = useRouter();

  if (isLoading) {
    return <div>Loading trending events...</div>;
  }

  if (isError) {
    return <div>Failed to load trending events.</div>;
  }

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <section className="trending-events">
      <div className="trending-events-header">
        <h2>Trending Events</h2>
        <Button
          variant="ghost-accent"
          size="sm"
          onClick={() => router.push("/events")}
        >
          View all <span className="trending-view-all-arrow"> › </span>
        </Button>
      </div>

      <div className="trending-events-grid">
        {events.map((event) => (
          <EventCard
            key={event.id}
            eventId={event.id}
            imageSrc={event.images?.[0]}
            title={event.title}
            date={new Date(event.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
            Venue={event.venue.name}
            price={`$${event.tickets[0]?.price ?? 0}`}
            size="compact"
          />
        ))}
      </div>
    </section>
  );
}
