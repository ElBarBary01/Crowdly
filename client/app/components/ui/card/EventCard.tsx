import {
  Badge,
  Button,
  Card,
  CardBody,
  CardImage,
  CardPrice,
  CardRow,
  CardSubtext,
  CardTitle,
} from "./CardComponent";
import { useRouter } from "next/navigation";

export type EventCardSize = "default" | "compact" | "large";

export interface EventCardProps {
  eventId?: string;
  imageSrc?: string;
  imageAlt?: string;
  badgeText?: string;
  title: string;
  date: string;
  Venue: string;
  price: string;
  buttonLabel?: string;
  className?: string;
  size?: EventCardSize;
}

export default function EventCard({
  eventId,
  imageSrc,
  imageAlt = "Event",
  badgeText = "R&B",
  title,
  date,
  Venue,
  price,
  buttonLabel = "Get Tickets",
  className,
  size = "default",
}: EventCardProps) {
  const router = useRouter();
  const sizeClass = `card-event-size-${size}`;

  return (
    <Card type="event" className={[sizeClass, className].filter(Boolean).join(" ")}>
      <CardImage src={imageSrc} alt={imageAlt}>
        {badgeText && <Badge variant="purple">{badgeText}</Badge>}
      </CardImage>
      <CardBody>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardSubtext>{date}</CardSubtext>
          <CardSubtext>{Venue}</CardSubtext>
        </div>
        <CardSubtext>FROM</CardSubtext>
        <CardRow>
          <CardPrice>{price}</CardPrice>
          {buttonLabel && (
            <Button
              variant="ghost-accent"
              size="sm"
              onClick={() => router.push(`/events/${eventId}`)}
            >
              {buttonLabel}
            </Button>
          )}
        </CardRow>
      </CardBody>
    </Card>
  );
}
