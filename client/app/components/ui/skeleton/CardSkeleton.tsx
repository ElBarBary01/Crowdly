import Skeleton from "./Skeleton";
import { Card, CardBody, CardImage } from "../card/CardComponent";
import "./CardSkeleton.css";

interface CardSkeletonProps {
  type?: "event" | "artist" | "order";
  count?: number;
}

export function EventCardSkeleton({ count = 1 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} type="event" className="event-card-skeleton">
          <CardImage>
            <Skeleton variant="rectangular" width="100%" height="200px" />
          </CardImage>
          <CardBody>
            <div>
              <Skeleton width="80%" height="24px" className="mb-2" />
              <Skeleton width="60%" height="16px" className="mb-2" />
              <Skeleton width="70%" height="16px" />
            </div>
            <Skeleton width="40%" height="16px" className="mt-3" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
              <Skeleton width="60px" height="20px" />
              <Skeleton width="100px" height="32px" variant="rectangular" />
            </div>
          </CardBody>
        </Card>
      ))}
    </>
  );
}

export function ArtistCardSkeleton({ count = 1 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} type="artist" className="artist-card-skeleton">
          <CardImage>
            <Skeleton variant="rectangular" width="100%" height="250px" />
          </CardImage>
          <CardBody>
            <Skeleton width="80%" height="20px" className="mb-2" />
            <Skeleton width="60%" height="16px" className="mb-2" />
            <Skeleton width="100%" height="32px" variant="rectangular" />
          </CardBody>
        </Card>
      ))}
    </>
  );
}

export function OrderCardSkeleton({ count = 1 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} type="order" className="order-card-skeleton">
          <CardBody>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <Skeleton width="100px" height="16px" className="mb-2" />
                <Skeleton width="80px" height="14px" />
              </div>
              <Skeleton width="80px" height="24px" variant="rectangular" />
            </div>
            <Skeleton width="90%" height="18px" className="mt-3 mb-2" />
            <div style={{ display: "flex", gap: "16px" }}>
              <Skeleton width="30%" height="14px" />
              <Skeleton width="30%" height="14px" />
              <Skeleton width="30%" height="14px" />
            </div>
          </CardBody>
        </Card>
      ))}
    </>
  );
}
