"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamically import PromptRedaction component with no SSR
const PromptRedaction = dynamic(() => import("../Components/PromptRedaction"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading AI Redaction...</p>
      </div>
    </div>
  ),
});

export default function PromptRedactionPage() {
  return <PromptRedaction />;
}
