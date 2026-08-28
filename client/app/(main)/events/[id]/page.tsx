"use client";

import { useEffect, useState } from "react";
import styles from "./event.module.css";
import { Badge } from "../../../components/ui/Badge";
import ProgressBar from "../../../components/ui/feedbackComponents/progressBar";
import Tabs from "../../../components/ui/navigationComponent/tabs";
import Button from "../../../components/ui/Button";
import EventCard from "../../../components/ui/card/EventCard";
import Stage, {
  type StageType,
  type TicketType,
  type StageSection,
} from "../../../components/ui/stage";
import { useParams, useRouter } from "next/navigation";
type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  genres: string[];
  description: string | null;
  images: string[];
  venue: {
    id: string;
    name: string;
    stageType: StageType;
    description: string | null;
    capacity: number;
    location: string;
    images: string[];
    amenities: string[];
    policies: string[];
    seatingChartImage: string | null;
    ticketsLeft: number;
    stageSections: StageSection[];
  };
  tickets: {
    type: TicketType;
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
  const [selectedTicket, setSelectedTicket] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const router = useRouter();

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
  useEffect(() => {
    const fetchRelatedEvents = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/event/${id}/related`,
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch related events");
        }

        const result = await response.json();

        setRelatedEvents(result.data || []);
      } catch (error) {
        console.error("Error fetching related events:", error);
      }
    };

    if (id) {
      fetchRelatedEvents();
    }
  }, [id]);
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

  const selectedTicketData = event.tickets[selectedTicket];

  const ticketTotal = selectedTicketData.price * quantity;
  const serviceFee = ticketTotal * 0.15;
  const total = ticketTotal + serviceFee;

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
        {activeTab === "overview" && (
          <section className={styles.overview}>
            {event.description && (
              <p className={styles.eventDescription}>{event.description}</p>
            )}
          </section>
        )}
        {activeTab === "venue-info" && (
          <section className={styles.venueInfo}>
            <div className={styles.venueHeader}>
              <span className={styles.venueLabel}>VENUE</span>

              <h2>{event.venue.name}</h2>

              {event.venue.location && (
                <p className={styles.venueLocation}>
                  <span>📍</span>
                  {event.venue.location}
                </p>
              )}
            </div>

            {event.venue.description && (
              <div className={styles.venueDescription}>
                <h3>About the Venue</h3>
                <p>{event.venue.description}</p>
              </div>
            )}

            <div className={styles.venueDetails}>
              <h3>Venue Details</h3>

              <div className={styles.venueStats}>
                <div className={styles.venueStat}>
                  <div className={styles.statIcon}>👥</div>

                  <div>
                    <span className={styles.statLabel}>CAPACITY</span>
                    <strong className={styles.statValue}>
                      {event.venue.capacity.toLocaleString()}
                    </strong>
                    <span className={styles.statUnit}>people</span>
                  </div>
                </div>

                <div className={styles.venueStat}>
                  <div className={styles.statIcon}>◉</div>

                  <div>
                    <span className={styles.statLabel}>STAGE TYPE</span>
                    <strong className={styles.statValue}>
                      {event.venue.stageType?.replaceAll("_", " ") || "N/A"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {event.venue.amenities?.length > 0 && (
              <div className={styles.venueSection}>
                <h3>Amenities</h3>

                <div className={styles.venueTags}>
                  {event.venue.amenities.map((amenity) => (
                    <span key={amenity} className={styles.venueTag}>
                      ✓ {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {event.venue.policies?.length > 0 && (
              <div className={styles.venueSection}>
                <h3>Policies</h3>

                <div className={styles.venueTags}>
                  {event.venue.policies.map((policy) => (
                    <span key={policy} className={styles.venueTag}>
                      ✓ {policy}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "seating-chart" && (
          <Stage
            event={{
              venue: event.venue,
              tickets: event.tickets,
            }}
            formatPrice={(ticket) => `$${ticket.price.toFixed(2)}`}
            formatTicketType={(type) => type.replaceAll("_", " ")}
          />
        )}
      </div>
      <section className={styles.ticketOptions}>
        {event.tickets.map((ticket, index) => (
          <div
            key={`${ticket.type}-${index}`}
            className={`${styles.ticketCard} ${
              selectedTicket === index ? styles.selectedTicket : ""
            }`}
            onClick={() => {
              setSelectedTicket(index);
              setQuantity(1);
            }}
          >
            <div>
              <h3>{ticket.type.replaceAll("_", " ")}</h3>

              {ticket.description && <p>{ticket.description}</p>}
            </div>

            <strong>${ticket.price.toFixed(2)}</strong>
          </div>
        ))}
      </section>

      <section className={styles.orderSummary}>
        <div className={styles.quantityHeader}>
          <span>Quantity</span>

          <div className={styles.quantityControls}>
            <div className={styles.quantityControls}>
              <Button
                type="button"
                size="sm"
                variant="secondary-neutral"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity === 1}
              >
                −
              </Button>

              <span>{quantity}</span>

              <Button
                type="button"
                size="sm"
                variant="secondary-neutral"
                onClick={() => setQuantity((q) => q + 1)}
                disabled={quantity >= selectedTicketData.quantity}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        <div className={styles.summaryRow}>
          <span>
            {quantity}x {selectedTicketData.type.replaceAll("_", " ")}
          </span>

          <strong>${ticketTotal.toFixed(2)}</strong>
        </div>

        <div className={styles.summaryRow}>
          <span>Service fee</span>
          <span>${serviceFee.toFixed(2)}</span>
        </div>

        <div className={styles.summaryDivider} />

        <div className={styles.totalRow}>
          <span>Total</span>
          <strong>${total.toFixed(2)}</strong>
        </div>

        <Button
          type="button"
          size="lg"
          className={styles.buyButton}
          disabled={selectedTicketData.quantity === 0}
          onClick={() => {
            router.push(
              `/ticket-buying?eventId=${event.id}&ticketType=${selectedTicketData.type}&quantity=${quantity}`,
            );
          }}
        >
          Buy Tickets
        </Button>
      </section>
      {relatedEvents.length > 0 && (
        <section className={styles.relatedEvents}>
          <h2>You May Also Like</h2>

          <div className={styles.relatedEventsGrid}>
            {relatedEvents.map((relatedEvent) => {
              const relatedImage = getImageUrl(relatedEvent.images?.[0]);

              const relatedLowestPrice =
                relatedEvent.tickets?.length > 0
                  ? Math.min(
                      ...relatedEvent.tickets.map((ticket) => ticket.price),
                    )
                  : null;

              return (
                <EventCard
                  key={relatedEvent.id}
                  eventId={relatedEvent.id}
                  imageSrc={relatedImage}
                  imageAlt={relatedEvent.title}
                  badgeText={relatedEvent.genres?.[0] || "Event"}
                  title={relatedEvent.title}
                  date={`${formatDate(relatedEvent.date)} · ${formatTime(
                    relatedEvent.time,
                  )}`}
                  Venue={`${relatedEvent.venue?.name || "Venue"} · ${
                    relatedEvent.venue?.location || ""
                  }`}
                  price={
                    relatedLowestPrice !== null
                      ? `$${relatedLowestPrice.toFixed(2)}`
                      : "N/A"
                  }
                />
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
