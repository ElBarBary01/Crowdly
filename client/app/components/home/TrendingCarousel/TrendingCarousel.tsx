"use client";

import { useEffect, useState } from "react";
import HeroBanner from "../../ui/Hero/HeroBanner";
import "./TrendingCarousel.css";

type TrendingEvent = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  venue: string;
  price: string;
  backgroundImage: string;
};

type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  genres: string[];
  images: string[];
  venue: { name: string; location: string };
  tickets: { price: number }[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const fallbackBackgroundImage = "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=85";

function mapEvent(event: Event): TrendingEvent {
  const eventDate = new Date(event.date);

  return {
    id: event.id,
    title: event.title,
    subtitle: event.genres.join(" · "),
    date: `${eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })} · ${event.time}`,
    venue: `${event.venue.name} · ${event.venue.location}`,
    price: `$${Math.min(...event.tickets.map((ticket) => ticket.price))}`,
    backgroundImage: event.images[0] || fallbackBackgroundImage,
  };
}

function eventDetailsPath(id: string) {
  return `/events/${id}`;
}

function CalendarIcon() {
  return <span aria-hidden="true">▣</span>;
}

function LocationIcon() {
  return <span aria-hidden="true">⌖</span>;
}

export default function TrendingCarousel() {
  const [trendingEvents, setTrendingEvents] = useState<TrendingEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeEvent = trendingEvents[activeIndex];

  useEffect(() => {
    async function fetchUpcomingEvents() {
      try {
        const response = await fetch(`${API_URL}/event/latest`, {
          credentials: "include",
        });

        if (!response.ok) {
          console.warn(`Unable to load upcoming events: ${response.status}`);
          setErrorMessage("Something went wrong while fetching events.");
          return;
        }

        const result: { data: Event[] } = await response.json();
        setTrendingEvents(result.data.map(mapEvent));
      } catch (error) {
        console.warn("Unable to load upcoming events:", error);
        setErrorMessage("Something went wrong while fetching events.");
      }
    }

    fetchUpcomingEvents();
  }, []);

  useEffect(() => {
    if (isPaused || trendingEvents.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) =>
        currentIndex === trendingEvents.length - 1
          ? 0
          : currentIndex + 1,
      );
    }, 5000);

    return () => window.clearInterval(timer);
  }, [isPaused, trendingEvents.length]);

  const showEvent = (index: number) => {
    setActiveIndex((index + trendingEvents.length) % trendingEvents.length);
  };

  if (!activeEvent) {
    return errorMessage ? (
      <section className="trending-carousel trending-carousel__error" aria-live="polite">
        <p>{errorMessage}</p>
      </section>
    ) : null;
  }

  return (
    <section
        className="trending-carousel"
        aria-label="Trending events"
        aria-roledescription="carousel"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsPaused(false);
            }
        }}
    >
        <HeroBanner
            key={activeEvent.id}
            title={activeEvent.title}
            subtitle={activeEvent.subtitle}
            backgroundImage={activeEvent.backgroundImage}
        >
        <div className="trending-carousel__details">
            <div className="trending-carousel__meta">
                <span>{activeEvent.date}</span>
                <span>{activeEvent.venue}</span>
            </div>
            <div className="trending-carousel__actions">
                <a
                    className="trending-carousel__ticket-button"
                    href={eventDetailsPath(activeEvent.id)}
                >
                Get Tickets - From {activeEvent.price}
                </a>
                <a className="trending-carousel__shows-button" href="/events">
                View All Shows
                </a>
            </div>
        </div>
        </HeroBanner>

        <button
            className="trending-carousel__arrow trending-carousel__arrow--previous"
            type="button"
            aria-label="Previous trending event"
            onClick={() => showEvent(activeIndex - 1)}
        >
            <span aria-hidden="true">&#8592;</span>
        </button>
        <button
            className="trending-carousel__arrow trending-carousel__arrow--next"
            type="button"
            aria-label="Next trending event"
            onClick={() => showEvent(activeIndex + 1)}
        >
            <span aria-hidden="true">&#8594;</span>
        </button>

        <div
            className="trending-carousel__dots"
            aria-label="Choose trending event"
        >
            {trendingEvents.map((event, index) => (
            <button
                key={event.id}
                className={`trending-carousel__dot${index === activeIndex ? " trending-carousel__dot--active" : ""}`}
                type="button"
                aria-label={`Show ${event.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => showEvent(index)}
            />
            ))}
        </div>
    </section>
    );
}
