"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const STREAM_BASE = "/live";

type StreamStatus = "idle" | "connecting" | "playing" | "buffering" | "error";

const STATUS_LABELS: Record<StreamStatus, string> = {
  idle: "Locked",
  connecting: "Connecting",
  playing: "Live",
  buffering: "Buffering",
  error: "Error",
};

const STATUS_TONE: Record<StreamStatus, string> = {
  idle: "bg-slate-400",
  connecting: "bg-amber-400",
  playing: "bg-emerald-400",
  buffering: "bg-sky-400",
  error: "bg-rose-400",
};

export default function LiveClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const searchParams = useSearchParams();
  const seededRef = useRef(false);

  const [password, setPassword] = useState("");
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [message, setMessage] = useState("");
  const [showPrompt, setShowPrompt] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const maskedPassword = password.trim()
    ? "*".repeat(Math.min(password.trim().length, 12))
    : "******";
  const previewUrl = `${STREAM_BASE}/${maskedPassword}.m3u8`;

  const stopPlayback = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = password.trim();

    if (!trimmed) {
      setMessage("Please enter the stream password.");
      setStatus("idle");
      return;
    }

    setMessage("");
    setShowPrompt(false);
    setStatus("connecting");
    setStreamUrl(`${STREAM_BASE}/${encodeURIComponent(trimmed)}.m3u8`);
  };

  useEffect(() => {
    if (seededRef.current) {
      return;
    }

    const preset = searchParams.get("pw");
    if (preset) {
      setPassword(preset);
    }

    seededRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!streamUrl) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    let cancelled = false;
    setStatus("connecting");

    const onPlaying = () => setStatus("playing");
    const onWaiting = () => setStatus("buffering");
    const onError = () => setStatus("error");

    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("error", onError);

    const attachNative = () => {
      video.src = streamUrl;
      video.play().catch(() => undefined);
    };

    const setupHls = async () => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        attachNative();
        return;
      }

      try {
        const { default: Hls } = await import("hls.js");
        if (cancelled) {
          return;
        }

        if (!Hls.isSupported()) {
          setStatus("error");
          setMessage("This browser does not support HLS playback.");
          return;
        }

        const hls = new Hls({
          lowLatencyMode: true,
          backBufferLength: 90,
        });

        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => undefined);
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) {
            return;
          }

          setStatus("error");
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setMessage("Unable to load the stream. Check the password.");
          } else {
            setMessage("Stream error. Try again or reload.");
          }
        });
      } catch (error) {
        setStatus("error");
        setMessage("Unable to load the HLS player library.");
      }
    };

    stopPlayback();
    setupHls();

    return () => {
      cancelled = true;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("error", onError);
      stopPlayback();
    };
  }, [stopPlayback, streamUrl]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090b10] text-white">
      <div className="absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(90,202,255,0.6),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[320px] w-[360px] bg-[radial-gradient(circle_at_center,rgba(251,146,60,0.45),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(10,13,20,0.96),rgba(13,16,24,0.75),rgba(8,10,16,0.96))]" />
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-start px-6 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur">
            <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                  Live
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs text-white/70">
                <span
                  className={`h-2 w-2 rounded-full ${STATUS_TONE[status]}`}
                />
                <span>{STATUS_LABELS[status]}</span>
              </div>
            </header>

            <div className="relative">
              <video
                ref={videoRef}
                className="aspect-video w-full bg-black/70"
                controls
                muted
                playsInline
                autoPlay
              />
              {showPrompt ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
                  <div className="max-w-sm rounded-2xl border border-white/10 bg-black/60 p-6 text-center shadow-xl">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                      Passcode required
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="flex h-fit flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.35)] backdrop-blur">


            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Stream password
              </label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    autoFocus
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {message ? (
                  <p className="text-sm text-rose-200">{message}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Unlock stream
                </button>
              </div>
            </form>

          </aside>
        </div>
      </main>
    </div>
  );
}
