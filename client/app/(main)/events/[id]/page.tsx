"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "./event.module.css";
import { Badge } from "../../../components/ui/Badge";
import ProgressBar from "../../../components/ui/feedbackComponents/progressBar";
import Tabs from "../../../components/ui/navigationComponent/tabs";

type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  genres: string[];
  images: string[];
  venue: {
    id: string;
    name: string;
    description: string | null;
    capacity: number;
    location: string;
    images: string[];
    amenities: string[];
    policies: string[];
    seatingChartImage: string | null;
    ticketsLeft: number;
  };
  tickets: {
    type: string;
    price: number;
    quantity: number;
    description: string | null;
  }[];
  artists: {
    artist: {
      id: string;
      name: string;
    };
  }[];
};

export default function EventPage() {
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "seating-chart" | "venue-info" | "reviews"
  >("overview");

  const getImageUrl = (image?: string) => {
    if (!image) return "";

    const markdownMatch = image.match(/\]\((.*?)\)/);

    if (markdownMatch) {
      return markdownMatch[1];
    }

    return image;
  };

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    if (!time) return "";

    const [hours, minutes] = time.split(":");
    const date = new Date();

    date.setHours(Number(hours), Number(minutes));

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/event/${id}`,
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Event not found");
          }

          throw new Error("Failed to fetch event");
        }

        const result = await response.json();

        setEvent(result.data);
      } catch (error) {
        console.error("Error fetching event:", error);

        setError(
          error instanceof Error ? error.message : "Failed to load event",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  if (loading) {
    return <div className={styles.loading}>Loading event...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!event) {
    return <div className={styles.error}>Event not found</div>;
  }

  const imageUrl = getImageUrl(event.images?.[0]);

  const lowestPrice =
    event.tickets?.length > 0
      ? Math.min(...event.tickets.map((ticket) => ticket.price))
      : null;

  const artistName = event.artists?.[0]?.artist?.name;
  const ticketsLeft = event.venue?.ticketsLeft ?? 0;
  const capacity = event.venue?.capacity ?? 0;

  const availabilityPercentage =
    capacity > 0 ? (ticketsLeft / capacity) * 100 : 0;

  const availabilityLabel =
    ticketsLeft === 0
      ? "Sold Out"
      : availabilityPercentage <= 10
        ? "Few Left"
        : "Available";

  const availabilityTone =
    availabilityPercentage <= 10
      ? "error"
      : availabilityPercentage <= 60
        ? "warning"
        : "success";
  return (
    <main className={styles.page}>
      {/* Event Image */}
      <section className={styles.imageSection}>
        {imageUrl ? (
          <img src={imageUrl} alt={event.title} className={styles.eventImage} />
        ) : (
          <div className={styles.imagePlaceholder}>No image available</div>
        )}
      </section>
      {/* Badges */}
      <section className={styles.badges}>
        <Badge variant="purple">{event.genres?.[0] || "Event"}</Badge>

        <Badge
          variant={
            availabilityLabel === "Sold Out"
              ? "error"
              : availabilityLabel === "Few Left"
                ? "warning"
                : "success"
          }
        >
          {availabilityLabel}
        </Badge>
      </section>
      {/* Event Title */}
      <section className={styles.eventHeader}>
        <h1 className={styles.eventTitle}>{event.title}</h1>

        {artistName && <p className={styles.artistName}>{artistName}</p>}
      </section>
      {/* Event Details */}
      <section className={styles.eventDetails}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>DATE & TIME</span>

          <span className={styles.detailValue}>{formatDate(event.date)}</span>

          <span className={styles.detailSecondary}>
            {formatTime(event.time)}
          </span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>VENUE</span>

          <span className={styles.detailValue}>
            {event.venue?.name || "Venue unavailable"}
          </span>

          {event.venue?.location && (
            <span className={styles.detailSecondary}>
              {event.venue.location}
            </span>
          )}
        </div>

        <div className={styles.availability}>
          <ProgressBar
            value={availabilityPercentage}
            label="AVAILABILITY"
            percentageLabel={`${ticketsLeft} of ${capacity} remaining`}
            showPercentage={false}
            tone={availabilityTone}
            ariaLabel="Ticket availability"
          />

          <span className={styles.availabilityText}>
            {ticketsLeft} of {capacity} remaining
          </span>
        </div>
      </section>

      <section className={styles.eventTabs}>
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      </section>
      <div>
        {activeTab === "overview" && <p>Overview content</p>}
        {activeTab === "seating-chart" && <p>Seating Chart content</p>}
        {activeTab === "venue-info" && <p>Venue Info content</p>}
        {activeTab === "reviews" && <p>Reviews content</p>}
      </div>
    </main>
  );
}
