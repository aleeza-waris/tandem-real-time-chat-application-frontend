"use client";

import { CircleAlert } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-svh place-items-center bg-canvas px-6 py-10 text-center text-ink">
      <div className="flex max-w-[380px] flex-col items-center">
        <span className="mb-5 grid size-14 place-items-center rounded-2xl border border-line-soft bg-brand-soft text-brand">
          <CircleAlert size={25} aria-hidden="true" />
        </span>
        <h1 className="mb-2 mt-0 text-2xl font-semibold tracking-[-0.04em]">Something went wrong</h1>
        <p className="mb-6 mt-0 text-sm leading-6 text-muted-ui">
          Tandem hit an unexpected problem. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_14px_rgb(79_70_229_/_18%)] transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
