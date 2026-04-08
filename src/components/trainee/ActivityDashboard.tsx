"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { WaterLogSheet } from "@/components/trainee/WaterLogSheet";

// 270° arc ring constants (r=34, viewBox 88×88)
const ARC_R = 34;
const ARC_CIRC = 2 * Math.PI * ARC_R;   // ~213.63
const ARC_270 = ARC_CIRC * 0.75;        // ~160.22
const ARC_GAP = ARC_CIRC - ARC_270;     // ~53.41

function MeasurementCard({
  icon,
  label,
  value,
  unit,
  max,
  onClick,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
  max: number;
  onClick?: () => void;
}) {
  const progress = Math.min(value / max, 1);
  const filled = ARC_270 * progress;

  return (
    <div
      className="card-clay"
      onClick={onClick}
      style={{ padding: "14px 14px 16px", display: "flex", flexDirection: "column", gap: 12, cursor: onClick ? "pointer" : undefined }}
    >
      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          {icon}
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
          {label}
        </p>
      </div>

      {/* Arc ring */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 88, height: 88 }}>
          <svg viewBox="0 0 88 88" width="88" height="88">
            {/* Track */}
            <circle
              cx="44" cy="44" r={ARC_R}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${ARC_270} ${ARC_GAP}`}
              transform="rotate(135 44 44)"
            />
            {/* Fill */}
            <circle
              cx="44" cy="44" r={ARC_R}
              fill="none"
              stroke="var(--color-lime)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${ARC_CIRC - filled}`}
              transform="rotate(135 44 44)"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--color-text)", lineHeight: 1 }}>
              {value}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 500,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {unit}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type WeekDay = {
  label: string;
  sets: number;
  dateKey: string;
};

type RecentLog = {
  id: string;
  createdAt: string;
  completedAt: string | null;
  planName: string;
  setCount: number;
};

type Props = {
  traineeId: string;
  todaySets: number;
  todayCalories: number;
  todayActiveMin: number;
  todayWaterMl: number;
  thisWeekTotal: number;
  weekChange: number | null;
  weekDays: WeekDay[];
  recentLogs: RecentLog[];
  todayKey: string;
};

export function ActivityDashboard({
  traineeId,
  todaySets,
  todayCalories,
  todayActiveMin,
  todayWaterMl,
  thisWeekTotal,
  weekChange,
  weekDays,
  recentLogs,
  todayKey,
}: Props) {
  const t = useTranslations("trainee.activity");
  const [waterMl, setWaterMl] = useState(todayWaterMl);
  const [showWaterSheet, setShowWaterSheet] = useState(false);

  const maxSets = Math.max(...weekDays.map((d) => d.sets), 1);

  const SETS_GOAL = 20;
  const WATER_GOAL = 2000;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--color-bg)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 90px)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "calc(env(safe-area-inset-top) + 24px) 16px 0" }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--color-text)",
            margin: "0 0 4px",
          }}
        >
          {t("title")}
        </h1>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* WEEKLY OVERVIEW */}
        <section>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "var(--color-text-muted)",
              margin: "0 0 10px 2px",
              textTransform: "uppercase",
            }}
          >
            {t("weeklyOverview")}
          </p>
          <div className="card-clay" style={{ padding: "16px 14px 14px" }}>
            {/* Total + change */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 800,
                  color: "var(--color-text)",
                  lineHeight: 1,
                }}
              >
                {thisWeekTotal}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--color-text-muted)",
                }}
              >
                {t("setsThisWeek")}
              </p>
              {weekChange !== null && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    fontWeight: 700,
                    color: weekChange >= 0 ? "var(--color-lime)" : "#EF4444",
                    background:
                      weekChange >= 0
                        ? "rgba(204,255,0,0.1)"
                        : "rgba(239,68,68,0.1)",
                    borderRadius: 8,
                    padding: "2px 8px",
                  }}
                >
                  {weekChange >= 0 ? "+" : ""}
                  {weekChange}%
                </span>
              )}
            </div>

            {/* Bar chart */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 6,
                height: 72,
              }}
            >
              {weekDays.map((d) => {
                const isToday = d.dateKey === todayKey;
                const heightPct = maxSets === 0 ? 0 : (d.sets / maxSets) * 100;
                return (
                  <div
                    key={d.dateKey}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      height: "100%",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: `${Math.max(heightPct, 6)}%`,
                        borderRadius: 6,
                        background: isToday
                          ? "var(--color-lime)"
                          : d.sets > 0
                          ? "rgba(204,255,0,0.3)"
                          : "rgba(255,255,255,0.06)",
                        transition: "height 0.3s ease",
                      }}
                    />
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10,
                        fontWeight: isToday ? 700 : 400,
                        color: isToday
                          ? "var(--color-lime)"
                          : "var(--color-text-muted)",
                      }}
                    >
                      {d.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* MEASUREMENT */}
        <section>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "var(--color-text-muted)",
              margin: "0 0 10px 2px",
              textTransform: "uppercase",
            }}
          >
            {t("measurement")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MeasurementCard icon="💧" label={t("waterMl")} value={Math.round(waterMl)} unit="ml" max={WATER_GOAL} onClick={() => setShowWaterSheet(true)} />
            <MeasurementCard icon="⚡" label={t("activeMin")} value={todayActiveMin} unit="min" max={60} />
            <MeasurementCard icon="💪" label={t("setsLogged")} value={todaySets} unit="sets" max={SETS_GOAL} />
            <MeasurementCard icon="🔥" label={t("estCalories")} value={todayCalories} unit="kcal" max={500} />
          </div>
        </section>

        {/* DAILY GOALS */}
        <section>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "var(--color-text-muted)",
              margin: "0 0 10px 2px",
              textTransform: "uppercase",
            }}
          >
            {t("dailyGoals")}
          </p>
          <div className="card-clay" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Sets goal */}
            <GoalBar
              emoji="💪"
              label={t("setsGoal")}
              value={todaySets}
              goal={SETS_GOAL}
              unit="sets"
              completeLabel={t("complete")}
            />
            {/* Water goal */}
            <GoalBar
              emoji="💧"
              label={t("waterGoal")}
              value={waterMl}
              goal={WATER_GOAL}
              unit="ml"
              completeLabel={t("complete")}
            />
          </div>
        </section>

        {/* RECENT WORKOUTS */}
        <section>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "var(--color-text-muted)",
              margin: "0 0 10px 2px",
              textTransform: "uppercase",
            }}
          >
            {t("recentWorkouts")}
          </p>

          {recentLogs.length === 0 ? (
            <div className="card-clay" style={{ padding: "36px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 36, margin: "0 0 10px" }}>📊</p>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--color-text)",
                  margin: "0 0 6px",
                }}
              >
                {t("noActivity")}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-text-muted)",
                  margin: 0,
                }}
              >
                {t("noActivityHint")}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentLogs.map((log) => {
                const date = new Date(log.createdAt);
                return (
                  <div
                    key={log.id}
                    className="card-clay"
                    style={{
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: log.completedAt
                          ? "rgba(204,255,0,0.1)"
                          : "rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      🏋️
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: "0 0 2px",
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--color-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.planName}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {date.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {log.setCount > 0 && ` · ${log.setCount} sets`}
                      </p>
                    </div>
                    {log.completedAt && (
                      <div
                        style={{
                          background: "rgba(204,255,0,0.1)",
                          borderRadius: 8,
                          padding: "3px 8px",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--color-lime)",
                          }}
                        >
                          ✓
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showWaterSheet && (
        <WaterLogSheet
          traineeId={traineeId}
          currentMl={waterMl}
          goalMl={WATER_GOAL}
          onSuccess={(delta) => setWaterMl((prev) => Math.max(0, prev + delta))}
          onClose={() => setShowWaterSheet(false)}
        />
      )}
    </div>
  );
}

function GoalBar({
  emoji,
  label,
  value,
  goal,
  unit,
  completeLabel,
}: {
  emoji: string;
  label: string;
  value: number;
  goal: number;
  unit: string;
  completeLabel: string;
}) {
  const pct = Math.min((value / goal) * 100, 100);
  const done = value >= goal;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>{emoji}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            {label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          {done ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-lime)",
                background: "rgba(204,255,0,0.1)",
                borderRadius: 6,
                padding: "2px 7px",
              }}
            >
              {completeLabel}
            </span>
          ) : (
            <span
              style={{
                fontSize: 12,
                color: "var(--color-text-muted)",
              }}
            >
              {Math.round(value)}/{goal} {unit}
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 100,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 100,
            background: done ? "var(--color-lime)" : "rgba(204,255,0,0.5)",
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}
