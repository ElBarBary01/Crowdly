"use client";

import "./styles.css";
import { useState } from "react";
import ToggleSwitch from "../../components/ui/ToggleSwitch/ToggleSwitch";
import Checkbox from "../../components/ui/Checkbox/Checkbox";
import BrowseByGenre from "@/app/components/home/BrowseByGenre/BrowseByGenre";

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
    <main className="container">
      <BrowseByGenre>
      </BrowseByGenre>

    </main>
  );
}
