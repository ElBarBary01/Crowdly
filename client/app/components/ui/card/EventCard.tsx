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
}: EventCardProps) {
  const router = useRouter();
  return (
    <Card type="event" className={className}>
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
