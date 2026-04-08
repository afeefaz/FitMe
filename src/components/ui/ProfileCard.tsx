"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { LanguageSelector } from "@/components/ui/LanguageSelector";

interface ProfileCardProps {
  fullName: string;
  email: string;
  role: "coach" | "trainee";
  heightCm?: number | null;
  weightKg?: number | null;
  dateOfBirth?: string | null;
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #2A2A2A 0%, #333 100%)", border: "3px solid var(--color-lime)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 800, color: "var(--color-lime)", flexShrink: 0, letterSpacing: "0.02em", boxShadow: "var(--shadow-clay-lime)" }}>
      {initials}
    </div>
  );
}

function calcBmi(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function calcAge(dob: string) {
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { key: "underweight" as const, color: "#60a5fa" };
  if (bmi < 25) return { key: "normal" as const, color: "var(--color-lime)" };
  if (bmi < 30) return { key: "overweight" as const, color: "var(--color-amber)" };
  return { key: "obese" as const, color: "var(--color-red)" };
}

type Section = "overview" | "name" | "password" | "body";

export function ProfileCard({ fullName, email, role, heightCm, weightKg, dateOfBirth }: ProfileCardProps) {
  const router = useRouter();
  const tSettings = useTranslations("settings");
  const tBmi = useTranslations("common.bmi");
  const tValidation = useTranslations("validation");
  const [signingOut, setSigningOut] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Name form
  const [newName, setNewName] = useState(fullName);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Body stats
  const [height, setHeight] = useState(heightCm?.toString() ?? "");
  const [weight, setWeight] = useState(weightKg?.toString() ?? "");
  const [dob, setDob] = useState(dateOfBirth ?? "");

  // Theme
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const stored = localStorage.getItem("fitme-theme") as "dark" | "light" | null;
    setTheme(stored ?? "dark");
  }, []);

  const toggleTheme = () => {
    const next: "dark" | "light" = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("fitme-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const bmi = weightKg && heightCm ? calcBmi(weightKg, heightCm) : null;
  const age = dateOfBirth ? calcAge(dateOfBirth) : null;
  const bmiCat = bmi ? bmiCategory(bmi) : null;

  const showMsg = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(null), 3000); };

  const handleSaveName = async () => {
    if (!newName.trim()) { setError(tValidation("nameEmpty")); return; }
    setSaving(true); setError(null);
    const sb = createClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const { error: err } = await sb.from("users").update({ full_name: newName.trim() }).eq("id", user.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    showMsg(tSettings("nameUpdated"));
    router.refresh();
    setSection("overview");
  };

  const handleSavePassword = async () => {
    if (!newPassword) { setError(tValidation("newPasswordRequired")); return; }
    if (newPassword.length < 8) { setError(tValidation("passwordMin8Dot")); return; }
    if (newPassword !== confirmPassword) { setError(tValidation("passwordsNoMatch")); return; }
    setSaving(true); setError(null);
    const sb = createClient();
    const { error: err } = await sb.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (err) { setError(err.message); return; }
    showMsg(tSettings("passwordUpdated"));
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setSection("overview");
  };

  const handleSaveBody = async () => {
    setSaving(true); setError(null);
    const sb = createClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const updates: Record<string, unknown> = {};
    if (height) updates.height_cm = parseFloat(height);
    if (weight) updates.weight_kg = parseFloat(weight);
    if (dob) updates.date_of_birth = dob;
    const { error: err } = await sb.from("users").update(updates).eq("id", user.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    showMsg(tSettings("statsSaved"));
    router.refresh();
    setSection("overview");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1.5px solid var(--color-border)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text)",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--color-text-muted)",
    marginBottom: "6px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  };

  if (section === "name") return (
    <div style={{ padding: "24px 16px" }}>
      <button onClick={() => { setSection("overview"); setError(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px", padding: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        {tSettings("backButton")}
      </button>
      <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-text)", marginBottom: "24px" }}>{tSettings("changeNameTitle")}</h2>
      <div style={{ marginBottom: "16px" }}><label style={labelStyle}>{tSettings("fullNameLabel")}</label><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} /></div>
      {error && <p style={{ color: "var(--color-red)", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
      <button onClick={handleSaveName} disabled={saving} style={{ width: "100%", padding: "16px", borderRadius: "14px", background: "var(--color-lime)", border: "none", color: "#000", fontWeight: 700, fontSize: "15px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
        {saving ? tSettings("savingName") : tSettings("saveName")}
      </button>
    </div>
  );

  if (section === "password") return (
    <div style={{ padding: "24px 16px" }}>
      <button onClick={() => { setSection("overview"); setError(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px", padding: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        {tSettings("backButton")}
      </button>
      <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-text)", marginBottom: "24px" }}>{tSettings("changePasswordTitle")}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div><label style={labelStyle}>{tSettings("currentPassword")}</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>{tSettings("newPassword")}</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>{tSettings("confirmPassword")}</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} /></div>
      </div>
      {error && <p style={{ color: "var(--color-red)", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
      <button onClick={handleSavePassword} disabled={saving} style={{ width: "100%", padding: "16px", borderRadius: "14px", background: "var(--color-lime)", border: "none", color: "#000", fontWeight: 700, fontSize: "15px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, marginTop: "20px" }}>
        {saving ? tSettings("updating") : tSettings("updatePassword")}
      </button>
    </div>
  );

  if (section === "body") return (
    <div style={{ padding: "24px 16px" }}>
      <button onClick={() => { setSection("overview"); setError(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "24px", padding: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        {tSettings("backButton")}
      </button>
      <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-text)", marginBottom: "24px" }}>{tSettings("bodyStatsTitle")}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>{tSettings("heightCm")}</label><input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={tSettings("heightPlaceholder")} style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>{tSettings("weightKg")}</label><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={tSettings("weightPlaceholder")} style={inputStyle} /></div>
        </div>
        <div><label style={labelStyle}>{tSettings("dob")}</label><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={{ ...inputStyle, colorScheme: theme }} /></div>
      </div>
      {error && <p style={{ color: "var(--color-red)", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
      <button onClick={handleSaveBody} disabled={saving} style={{ width: "100%", padding: "16px", borderRadius: "14px", background: "var(--color-lime)", border: "none", color: "#000", fontWeight: 700, fontSize: "15px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, marginTop: "20px" }}>
        {saving ? tSettings("savingStats") : tSettings("saveStats")}
      </button>
    </div>
  );

  // Overview section
  return (
    <div style={{ padding: "24px 16px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em", marginBottom: "24px" }}>{tSettings("title")}</h1>

      {saveMsg && (
        <div style={{ padding: "12px 16px", borderRadius: "12px", backgroundColor: "rgba(204,255,0,0.1)", border: "1px solid var(--color-lime)", marginBottom: "16px" }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-lime)" }}>✓ {saveMsg}</p>
        </div>
      )}

      {/* Avatar card */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px", borderRadius: "var(--radius-clay)", background: "var(--color-surface)", boxShadow: "var(--shadow-clay-sm)", marginBottom: "16px", animation: "var(--animate-slide-up)" }}>
        <Avatar name={fullName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullName}</p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</p>
          <span style={{ display: "inline-block", marginTop: "8px", padding: "3px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: role === "coach" ? "rgba(204,255,0,0.12)" : "rgba(245,158,11,0.12)", color: role === "coach" ? "var(--color-lime)" : "var(--color-amber)", border: `1px solid ${role === "coach" ? "rgba(204,255,0,0.3)" : "rgba(245,158,11,0.3)"}` }}>{role}</span>
        </div>
      </div>

      {/* BMI card */}
      {bmi && bmiCat && (
        <div style={{ padding: "16px 20px", borderRadius: "var(--radius-clay)", background: "var(--color-surface)", boxShadow: "var(--shadow-clay-sm)", marginBottom: "16px", animation: "var(--animate-slide-up)", animationDelay: "0.05s" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>{tSettings("bodyMetrics")}</p>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1, padding: "12px", borderRadius: "12px", backgroundColor: "var(--color-bg)", textAlign: "center" }}>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-text)" }}>{bmi.toFixed(1)}</p>
              <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>{tSettings("bmiLabel")}</p>
              <span style={{ fontSize: "11px", fontWeight: 700, color: bmiCat.color }}>{tBmi(bmiCat.key)}</span>
            </div>
            {heightCm && (
              <div style={{ flex: 1, padding: "12px", borderRadius: "12px", backgroundColor: "var(--color-bg)", textAlign: "center" }}>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-text)" }}>{heightCm}</p>
                <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>{tSettings("heightLabel")}</p>
              </div>
            )}
            {weightKg && (
              <div style={{ flex: 1, padding: "12px", borderRadius: "12px", backgroundColor: "var(--color-bg)", textAlign: "center" }}>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-text)" }}>{weightKg}</p>
                <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>{tSettings("weightLabel")}</p>
              </div>
            )}
            {age !== null && (
              <div style={{ flex: 1, padding: "12px", borderRadius: "12px", backgroundColor: "var(--color-bg)", textAlign: "center" }}>
                <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-text)" }}>{age}</p>
                <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>{tSettings("ageLabel")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings list */}
      <div style={{ borderRadius: "var(--radius-clay)", background: "var(--color-surface)", boxShadow: "var(--shadow-clay-sm)", overflow: "hidden", marginBottom: "16px", animation: "var(--animate-slide-up)", animationDelay: "0.08s" }}>
        {[
          { label: tSettings("changeName"), icon: "✏️", onClick: () => setSection("name") },
          { label: tSettings("changePassword"), icon: "🔒", onClick: () => setSection("password") },
          { label: tSettings("bodyStats"), icon: "📏", onClick: () => setSection("body") },
        ].map((item, i) => (
          <button key={item.label} onClick={item.onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "16px 20px", background: "none", border: "none", borderBottom: i < 2 ? "1px solid var(--color-border)" : "none", cursor: "pointer", color: "var(--color-text)", textAlign: "start" }}>
            <span style={{ fontSize: "18px" }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: "15px", fontWeight: 600 }}>{item.label}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        ))}
      </div>

      {/* Theme toggle */}
      <div style={{ padding: "16px 20px", borderRadius: "var(--radius-clay)", background: "var(--color-surface)", boxShadow: "var(--shadow-clay-sm)", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "var(--animate-slide-up)", animationDelay: "0.1s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "18px" }}>{theme === "dark" ? "🌙" : "☀️"}</span>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)" }}>{theme === "dark" ? tSettings("darkMode") : tSettings("lightMode")}</span>
        </div>
        <button
          onClick={toggleTheme}
          style={{
            width: "48px",
            height: "28px",
            borderRadius: "14px",
            border: "none",
            backgroundColor: theme === "dark" ? "var(--color-lime)" : "var(--color-border)",
            cursor: "pointer",
            position: "relative",
            transition: "background-color 0.2s",
          }}
        >
          <div style={{ position: "absolute", top: "3px", insetInlineStart: theme === "dark" ? "24px" : "4px", width: "22px", height: "22px", borderRadius: "50%", backgroundColor: theme === "dark" ? "#000" : "var(--color-text)", transition: "inset-inline-start 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
        </button>
      </div>

      {/* Language selector */}
      <div style={{ padding: "16px 20px", borderRadius: "var(--radius-clay)", background: "var(--color-surface)", boxShadow: "var(--shadow-clay-sm)", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "var(--animate-slide-up)", animationDelay: "0.11s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "18px" }}>🌐</span>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)" }}>{tSettings("language")}</span>
        </div>
        <LanguageSelector />
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        style={{ width: "100%", padding: "16px", borderRadius: "var(--radius-clay)", background: "var(--color-surface)", boxShadow: "var(--shadow-clay-sm)", border: "1.5px solid rgba(239,68,68,0.3)", color: "#EF4444", fontWeight: 700, fontSize: "15px", cursor: signingOut ? "not-allowed" : "pointer", opacity: signingOut ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", minHeight: "56px", transition: "opacity 0.15s, transform 0.15s cubic-bezier(0.34,1.56,0.64,1)", animation: "var(--animate-slide-up)", animationDelay: "0.12s" }}
        onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
        onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
        onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {signingOut ? tSettings("signingOut") : tSettings("signOut")}
      </button>
    </div>
  );
}
