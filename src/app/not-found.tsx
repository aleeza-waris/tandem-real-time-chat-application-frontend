"use client";

import Link from "next/link";
import { LottieAnimation } from "@/components/LottieAnimation";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-canvas px-6 py-10 text-center text-ink">
      <div className="flex flex-col items-center">
        <LottieAnimation src="/animation/404-page-not-found.json" className="h-[250px] w-[420px] max-w-full" />
        <p className="mb-1 mt-3 text-sm font-semibold tracking-[0.14em] text-brand">404</p>
        <h1 className="mb-2 mt-0 text-3xl font-semibold tracking-[-0.05em]">Page not found</h1>
        <p className="mb-6 mt-0 max-w-[360px] text-sm leading-6 text-muted-ui">
          This page may have moved, or the address may be incorrect.
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_6px_14px_rgb(79_70_229_/_18%)] transition-colors hover:bg-brand-dark"
        >
          Back to Tandem
        </Link>
      </div>
    </main>
  );
}
