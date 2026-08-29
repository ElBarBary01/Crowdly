import {
  Badge,
  Card,
  CardCode,
  CardMetaInline,
  CardRow,
  CardTitle,
} from "./CardComponent";

export interface OrderCardProps {
  orderCode: string;
  status: string;
  title: string;
  meta: string[];
  className?: string;
}

export default function OrderCard({
  orderCode,
  status,
  title,
  meta,
  className,
}: OrderCardProps) {
  return (
    <Card type="order" className={className}>
      <CardRow>
        <CardCode>{orderCode}</CardCode>
        <Badge variant="success">{status}</Badge>
      </CardRow>
      <CardTitle>{title}</CardTitle>
      <CardMetaInline>
        {meta.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </CardMetaInline>
    </Card>
  );
}
