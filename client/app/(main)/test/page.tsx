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
    // <main className="container">
    //   {/* <TrendingCarousel /> */}
    
    //   {/* <BrowseByGenre/> */}

    // </main>
    <><EventCard
          imageSrc="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600"
          imageAlt="Concert crowd at an event"
          badgeText="R&B"
          title="The Weeknd - After Hours"
          date="Sep 12"
          Venue="SoFi Stadium"
          price="$89"
          buttonLabel="Get Tickets"
        />

        <OrderCard
          orderCode="ORD-88421"
          status="Confirmed"
          title="The Weeknd - After Hours"
          meta={["Sep 12, 2026", "2 tickets", "$268.50"]}
        />

        <ArtistCard
          initials="TW"
          title="The Weeknd"
          subtext="R&B"
        />
    </>
  );
}
