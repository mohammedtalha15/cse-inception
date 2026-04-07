"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  PhoneCall,
  MessageSquareHeart,
  Video,
  Send,
  AlertTriangle,
  UserRound,
  RefreshCw,
} from "lucide-react";
import { fetchNearbyDoctors, shareWithNearestDoctor } from "@/lib/api";
import type { DoctorNearbyResult, DoctorShareResult } from "@/lib/types";

type Channel = "call" | "chat" | "video";

const btn =
  "flex items-center justify-center gap-2 border-2 border-foreground bg-background px-3 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-colors hover:bg-foreground hover:text-background disabled:opacity-40";

export function DoctorSharePanel({ patientId }: { patientId: string }) {
  const [consent, setConsent] = useState(false);
  const [locationHint, setLocationHint] = useState("");
  const [note, setNote] = useState("");
  const [channel, setChannel] = useState<Channel>("call");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<DoctorShareResult | null>(null);
  const [nearby, setNearby] = useState<DoctorNearbyResult | null>(null);

  async function loadNearby() {
    setLoadingDoctors(true);
    setErr(null);
    try {
      const out = await fetchNearbyDoctors(patientId, locationHint);
      setNearby(out);
      if (!doctorId && out.doctors.length > 0) {
        setDoctorId(out.doctors[0].doctor_id);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load nearby doctors.");
    } finally {
      setLoadingDoctors(false);
    }
  }

  useEffect(() => {
    void loadNearby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function onShare() {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const out = await shareWithNearestDoctor({
        patient_id: patientId,
        consent_to_share: consent,
        location_hint: locationHint.trim() || undefined,
        contact_preference: channel,
        patient_note: note.trim() || undefined,
        doctor_id: doctorId ?? undefined,
      });
      setResult(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not share with doctor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 border-2 border-foreground bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Share with nearest doctor
        </p>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Patient {patientId}
        </span>
      </div>

      <label className="block space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Location (optional)
        </span>
        <div className="flex items-center gap-2 border border-border bg-muted/20 px-2 py-1.5">
          <MapPin size={14} className="text-muted-foreground" />
          <input
            value={locationHint}
            onChange={(e) => setLocationHint(e.target.value)}
            placeholder="City / area"
            className="w-full bg-transparent font-mono text-xs outline-none"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => void loadNearby()}
            disabled={loadingDoctors || busy}
            className="inline-flex items-center gap-1.5 border border-foreground/30 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-40"
          >
            <RefreshCw size={11} />
            {loadingDoctors ? "Finding..." : "Find doctors"}
          </button>
        </div>
      </label>

      {nearby?.urgent && (
        <div className="border-2 border-red-500/60 bg-red-500/10 p-3 font-mono text-xs">
          <p className="inline-flex items-center gap-1.5 text-red-500">
            <AlertTriangle size={13} />
            High danger level detected ({nearby.risk_score}/100)
          </p>
          <p className="mt-1 text-foreground">
            Contact a doctor immediately. Your selected doctor will receive the full latest summary.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Nearby available doctors
        </p>
        {nearby?.doctors?.length ? (
          <div className="space-y-2">
            {nearby.doctors.map((d) => {
              const selected = doctorId === d.doctor_id;
              return (
                <button
                  key={d.doctor_id}
                  type="button"
                  onClick={() => setDoctorId(d.doctor_id)}
                  className={`w-full border p-3 text-left font-mono text-xs transition ${
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:border-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1.5">
                      <UserRound size={13} />
                      {d.doctor_name}
                    </p>
                    <span className="text-[10px] uppercase tracking-widest">
                      {d.distance_km.toFixed(1)} km
                    </span>
                  </div>
                  <p className={`mt-1 text-[11px] ${selected ? "text-background/80" : "text-muted-foreground"}`}>
                    {d.specialty} · {d.clinic} · ETA {d.eta_minutes} min
                  </p>
                  <p className={`mt-1 text-[10px] ${selected ? "text-background/75" : "text-muted-foreground"}`}>
                    {d.phone} · {d.language} · {d.available_channels.join(" / ")}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-border p-3 font-mono text-[10px] text-muted-foreground">
            {loadingDoctors ? "Searching nearby doctors..." : "No doctors loaded yet."}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className={`${btn} ${channel === "call" ? "bg-foreground text-background" : ""}`}
          onClick={() => setChannel("call")}
          disabled={busy}
        >
          <PhoneCall size={13} />
          Call
        </button>
        <button
          type="button"
          className={`${btn} ${channel === "chat" ? "bg-foreground text-background" : ""}`}
          onClick={() => setChannel("chat")}
          disabled={busy}
        >
          <MessageSquareHeart size={13} />
          Chat
        </button>
        <button
          type="button"
          className={`${btn} ${channel === "video" ? "bg-foreground text-background" : ""}`}
          onClick={() => setChannel("video")}
          disabled={busy}
        >
          <Video size={13} />
          Video
        </button>
      </div>

      <label className="block space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Note for doctor (optional)
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Symptoms, concern, or what help you need..."
          className="w-full border border-border bg-muted/20 p-2 font-mono text-xs outline-none focus:border-accent"
        />
      </label>

      <label className="flex items-start gap-2 font-mono text-[10px] text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={busy}
          className="mt-0.5 accent-accent"
        />
        I consent to share my latest vitals/profile summary with a nearby doctor for help and
        suggestions.
      </label>

      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        className={`${btn} w-full`}
        disabled={busy || !consent || !doctorId}
        onClick={() => void onShare()}
      >
        <Send size={13} />
        {busy ? "Sharing..." : nearby?.urgent ? "Share & contact urgently" : "Share now"}
      </motion.button>

      {err && <p className="font-mono text-[10px] text-red-500">{err}</p>}

      {result && (
        <div className="space-y-2 border border-accent/35 bg-accent/5 p-3 font-mono text-xs">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Nearest available doctor
          </p>
          <p className="text-foreground">
            {result.doctor_name} · {result.specialty}
          </p>
          <p className="text-muted-foreground">
            {result.clinic} · {result.distance_km.toFixed(1)} km · ETA {result.eta_minutes} min ·{" "}
            {result.contact_channel}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <a
              href={`tel:${nearby?.doctors.find((d) => d.doctor_id === result.doctor_id)?.phone ?? ""}`}
              className="inline-flex items-center justify-center gap-1 border border-foreground/30 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
            >
              <PhoneCall size={12} />
              Call
            </a>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 border border-foreground/30 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
              onClick={() => setChannel("chat")}
            >
              <MessageSquareHeart size={12} />
              Chat
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1 border border-foreground/30 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:border-foreground hover:text-foreground"
              onClick={() => setChannel("video")}
            >
              <Video size={12} />
              Video
            </button>
          </div>
          <div className="border-t border-border pt-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Data sent to doctor
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground">
              {result.summary_shared}
            </p>
          </div>
          <div className="border-t border-border pt-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Doctor suggestion
            </p>
            <p className="mt-1 leading-relaxed text-foreground">{result.doctor_suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

