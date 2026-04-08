"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ExerciseDetailModal, ModalExercise } from "@/components/ui/ExerciseDetailModal";

type Exercise = {
  exerciseId: string;
  name: string;
  gifUrl: string | null;
  muscleGroup: string | null;
  sets: number;
  reps: number;
  restSeconds: number;
};

type Day = {
  id: string;
  dayNumber: number;
  dayName: string;
  exercises: Exercise[];
};

type HistoryEntry = {
  id: string;
  createdAt: string;
  completedAt: string | null;
  setCount: number;
};

type Props = {
  traineeId: string;
  planId: string;
  planName: string;
  days: Day[];
  history: HistoryEntry[];
};

type Tab = "overview" | "exercises" | "history";

export function PlanDetail({ planName, days, history }: Props) {
  const t = useTranslations("trainee.plans");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [expandedDay, setExpandedDay] = useState<string | null>(
    days[0]?.id ?? null
  );
  const [detailExercise, setDetailExercise] = useState<ModalExercise | null>(null);

  function openExercise(ex: Exercise) {
    setDetailExercise({
      name: ex.name,
      gifUrl: ex.gifUrl,
      targetMuscles: ex.muscleGroup ? [ex.muscleGroup] : [],
    });
  }

  const totalExercises = days.reduce((s, d) => s + d.exercises.length, 0);
  const totalDays = days.length;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: t("overview") },
    { key: "exercises", label: t("exercisesTab") },
    { key: "history", label: t("historyTab") },
  ];

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--color-bg)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 90px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--color-bg)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "env(safe-area-inset-top) 20px 0",
          paddingTop: "calc(env(safe-area-inset-top) + 16px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Link
            href="/trainee/plans"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--color-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
              flex: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {planName}
          </h1>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            <span style={{ color: "var(--color-lime)", fontWeight: 700 }}>
              {totalDays}
            </span>{" "}
            {t("daysWord")}
          </span>
          <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            <span style={{ color: "var(--color-lime)", fontWeight: 700 }}>
              {totalExercises}
            </span>{" "}
            {t("exercisesWord")}
          </span>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 0,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px 4px 12px",
                fontSize: 14,
                fontWeight: activeTab === tab.key ? 700 : 500,
                color:
                  activeTab === tab.key
                    ? "var(--color-lime)"
                    : "var(--color-text-muted)",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid var(--color-lime)"
                    : "2px solid transparent",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px" }}>
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Tips */}
            <div
              className="card-clay"
              style={{ padding: 16, marginBottom: 4 }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "var(--color-lime)",
                  margin: "0 0 10px",
                }}
              >
                {t("tipsTitle")}
              </p>
              {[t("tip1"), t("tip2"), t("tip3")].map((tip, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginBottom: i < 2 ? 8 : 0,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "rgba(204,255,0,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--color-lime)",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "var(--color-text-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {tip}
                  </p>
                </div>
              ))}
            </div>

            {/* Day summaries */}
            {days.map((day) => (
              <div key={day.id} className="card-clay" style={{ padding: 0, overflow: "hidden" }}>
                <button
                  onClick={() =>
                    setExpandedDay(expandedDay === day.id ? null : day.id)
                  }
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: "rgba(204,255,0,0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--color-lime)",
                      }}
                    >
                      D{day.dayNumber}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--color-text)",
                        }}
                      >
                        {day.dayName || `Day ${day.dayNumber}`}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {day.exercises.length} {t("exercisesWord")}
                      </p>
                    </div>
                  </div>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform:
                        expandedDay === day.id
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {expandedDay === day.id && (
                  <div
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      padding: "8px 0",
                    }}
                  >
                    {day.exercises.map((ex, idx) => (
                      <div
                        key={ex.exerciseId}
                        onClick={() => openExercise(ex)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 16px",
                          borderBottom:
                            idx < day.exercises.length - 1
                              ? "1px solid rgba(255,255,255,0.04)"
                              : "none",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.3)",
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--color-text)",
                              textTransform: "capitalize",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ex.name}
                          </p>
                          {ex.muscleGroup && (
                            <p
                              style={{
                                margin: 0,
                                fontSize: 11,
                                color: "var(--color-text-muted)",
                                textTransform: "capitalize",
                              }}
                            >
                              {ex.muscleGroup}
                            </p>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12,
                              fontWeight: 700,
                              color: "var(--color-lime)",
                            }}
                          >
                            {ex.sets}×{ex.reps}
                          </p>
                          {ex.restSeconds > 0 && (
                            <p
                              style={{
                                margin: 0,
                                fontSize: 11,
                                color: "var(--color-text-muted)",
                              }}
                            >
                              {ex.restSeconds}s
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* EXERCISES TAB */}
        {activeTab === "exercises" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {days.map((day) => (
              <div key={day.id}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    color: "var(--color-lime)",
                    margin: "0 0 10px 4px",
                    textTransform: "uppercase",
                  }}
                >
                  {day.dayName || `Day ${day.dayNumber}`}
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {day.exercises.map((ex, idx) => (
                    <div
                      key={ex.exerciseId}
                      className="card-clay"
                      onClick={() => openExercise(ex)}
                      style={{
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                      }}
                    >
                      {ex.gifUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ex.gifUrl}
                          alt={ex.name}
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 10,
                            objectFit: "cover",
                            background: "rgba(255,255,255,0.05)",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.05)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 20,
                            flexShrink: 0,
                          }}
                        >
                          💪
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: "0 0 2px",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--color-text)",
                            textTransform: "capitalize",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ex.name}
                        </p>
                        {ex.muscleGroup && (
                          <p
                            style={{
                              margin: "0 0 6px",
                              fontSize: 11,
                              color: "var(--color-text-muted)",
                              textTransform: "capitalize",
                            }}
                          >
                            {ex.muscleGroup}
                          </p>
                        )}
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          {t("setsRepsRest", { sets: ex.sets, reps: ex.reps, rest: ex.restSeconds })}
                        </p>
                      </div>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: "rgba(204,255,0,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "var(--color-lime)",
                          }}
                        >
                          {idx + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div>
            {history.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 24px",
                }}
              >
                <p style={{ fontSize: 48, margin: "0 0 16px" }}>📊</p>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--color-text)",
                    margin: "0 0 8px",
                  }}
                >
                  {t("noHistory")}
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {history.map((entry) => {
                  const date = new Date(entry.createdAt);
                  const dateStr = date.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                  return (
                    <div
                      key={entry.id}
                      className="card-clay"
                      style={{
                        padding: "14px 16px",
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
                          background: "rgba(204,255,0,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: 18,
                        }}
                      >
                        🏋️
                      </div>
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            margin: "0 0 2px",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--color-text)",
                          }}
                        >
                          {dateStr}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {entry.setCount} sets logged
                        </p>
                      </div>
                      {entry.completedAt && (
                        <div
                          style={{
                            background: "rgba(204,255,0,0.1)",
                            borderRadius: 8,
                            padding: "3px 8px",
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
          </div>
        )}
      </div>

      <ExerciseDetailModal
        exercise={detailExercise}
        open={detailExercise !== null}
        onClose={() => setDetailExercise(null)}
      />

      {/* Sticky Start Workout Button */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 16px calc(env(safe-area-inset-bottom) + 80px)",
          background:
            "linear-gradient(to top, var(--color-bg) 60%, transparent)",
          zIndex: 20,
        }}
      >
        <Link
          href="/trainee/workout"
          style={{
            display: "block",
            width: "100%",
            padding: "15px",
            borderRadius: "var(--radius-clay)",
            background: "var(--color-lime)",
            color: "#000",
            fontWeight: 800,
            fontSize: 16,
            textAlign: "center",
            textDecoration: "none",
            boxShadow: "var(--shadow-clay-lime)",
          }}
        >
          {t("startWorkout")}
        </Link>
      </div>
    </div>
  );
}
