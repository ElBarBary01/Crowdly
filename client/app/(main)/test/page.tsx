"use client";

import "./styles.css";
import { useState } from "react";
import ToggleSwitch from "../../components/ui/ToggleSwitch/ToggleSwitch";
import Checkbox from "../../components/ui/Checkbox/Checkbox";
import BrowseByGenre from "@/app/components/home/BrowseByGenre/BrowseByGenre";
import TrendingCarousel from "@/app/components/home/TrendingCarousel/TrendingCarousel";
import ArtistCard from "@/app/components/ui/card/ArtistCard";
import OrderCard from "@/app/components/ui/card/OrderCard";
import EventCard from "@/app/components/ui/card/EventCard";
import Skeleton from "@/app/components/ui/skeleton/Skeleton";
import {
  EventCardSkeleton,
  ArtistCardSkeleton,
  OrderCardSkeleton,
} from "@/app/components/ui/skeleton/CardSkeleton";

export default function TestPage() {
  const [isToggleOn, setIsToggleOn] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const handleToggleChange = (isOn: boolean) => {
    setIsToggleOn(isOn);
    console.log("Toggle:", isOn);
  };

  const handleCheckboxChange = (checked: boolean) => {
    setIsChecked(checked);
    console.log("Checkbox:", checked);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Skeleton Loading Components - Demo</h1>

      <section style={{ marginBottom: "40px" }}>
        <h2>Event Card Skeleton (Loading State)</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          <EventCardSkeleton count={3} />
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2>Event Card (Loaded State)</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "20px",
          }}
        >
          <EventCard
            imageSrc="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600"
            imageAlt="Concert crowd at an event"
            badgeText="R&B"
            title="The Weeknd - After Hours"
            date="Sep 12"
            Venue="SoFi Stadium"
            price="$89"
            buttonLabel="Get Tickets"
          />
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2>Artist Card Skeleton (Loading State)</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "20px",
          }}
        >
          <ArtistCardSkeleton count={3} />
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2>Order Card Skeleton (Loading State)</h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "400px",
          }}
        >
          <OrderCardSkeleton count={2} />
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2>Order Card (Loaded State)</h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "400px",
          }}
        >
          <OrderCard
            orderCode="ORD-88421"
            status="Confirmed"
            title="The Weeknd - After Hours"
            meta={["Sep 12, 2026", "2 tickets", "$268.50"]}
          />
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <h2>Generic Skeleton Variants</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <p>Text Skeleton:</p>
            <Skeleton
              width="300px"
              height="24px"
              variant="text"
              animation="pulse"
            />
          </div>
          <div>
            <p>Rectangular Skeleton (Wave Animation):</p>
            <Skeleton
              width="300px"
              height="150px"
              variant="rectangular"
              animation="wave"
            />
          </div>
          <div>
            <p>Circular Skeleton:</p>
            <Skeleton
              width="60px"
              height="60px"
              variant="circular"
              animation="pulse"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
