import { Avatar, Card, CardSubtext, CardTitle } from "./CardComponent";

export interface ArtistCardProps {
  initials: string;
  title: string;
  subtext: string;
  className?: string;
}

export default function ArtistCard({
  initials,
  title,
  subtext,
  className,
}: ArtistCardProps) {
  return (
    <Card type="artist" className={className}>
      <Avatar initials={initials} size="lg" gradient />
      <div>
        <CardTitle>{title}</CardTitle>
        <CardSubtext>{subtext}</CardSubtext>
      </div>
    </Card>
  );
}
