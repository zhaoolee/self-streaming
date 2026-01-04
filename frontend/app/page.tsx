import { Suspense } from "react";
import LiveClient from "./LiveClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090b10] text-white">
          <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6">
            <p className="text-sm uppercase tracking-[0.35em] text-white/60">
              Loading live view
            </p>
          </div>
        </div>
      }
    >
      <LiveClient />
    </Suspense>
  );
}
