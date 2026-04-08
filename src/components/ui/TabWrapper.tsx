"use client";

import { useState } from "react";

interface TabWrapperProps {
  tabs: { id: string; label: string }[];
  children: React.ReactNode[];
}

export function TabWrapper({ tabs, children }: TabWrapperProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div>
      <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", marginBottom: "24px" }}>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveIdx(i)}
            style={{
              flex: 1,
              padding: "12px 0",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
              color: activeIdx === i ? "var(--color-lime)" : "var(--color-text-muted)",
              borderBottom: `2px solid ${activeIdx === i ? "var(--color-lime)" : "transparent"}`,
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children[activeIdx]}
    </div>
  );
}
