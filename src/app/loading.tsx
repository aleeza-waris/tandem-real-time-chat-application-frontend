"use client";

export function LoadingScreen() {
  return (
    <main className="grid min-h-svh place-items-center bg-canvas px-6 py-10 text-ink">
      <div className="flex flex-col items-center" role="status" aria-live="polite">
        <span className="sr-only">Loading Tandem. Please wait.</span>
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="typing-indicator__dot size-3 rounded-full bg-brand" />
          <span className="typing-indicator__dot size-3 rounded-full bg-brand" />
          <span className="typing-indicator__dot size-3 rounded-full bg-brand" />
        </div>
      </div>
    </main>
  );
}

export default function Loading() {
  return <LoadingScreen />;
}
