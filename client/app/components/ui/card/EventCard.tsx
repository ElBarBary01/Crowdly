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

export interface EventCardProps {
  imageSrc: string;
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
            <Button variant="ghost-accent" size="sm">
              {buttonLabel}
            </Button>
          )}
        </CardRow>
      </CardBody>
    </Card>
  );
}
