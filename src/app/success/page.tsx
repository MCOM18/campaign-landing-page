"use client";

import React, { useEffect, useState } from "react";
import { SuccessScreen } from "@/components/SuccessScreen";
import { redirectAfterPurchaseSuccess } from "@/utils/successRedirect";

export default function SuccessPage() {
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    try {
      const selectedPlanRaw = localStorage.getItem("selectedPlan");
      if (selectedPlanRaw) {
        const plan = JSON.parse(selectedPlanRaw);
        if (plan?.offerId) {
          setIsTrial(true);
        }
      }
    } catch (e) { }
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", backgroundColor: "#050505" }}>
      <SuccessScreen
        isTrial={isTrial}
        onReset={redirectAfterPurchaseSuccess}
      />
    </div>
  );
}
