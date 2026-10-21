"use client";

import { useState } from "react";
import { Button, Input, message, Tabs } from "antd";
import Image from "next/image";
import { MessageCircle, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { setSessionToken } from "@/lib/session";
import type { AuthValues } from "@/schemas/auth";
import { signInSchema, signUpSchema } from "@/schemas/auth";
import type { ChatUser } from "@/types/chat";

export function AuthForm({ onAuthenticated }: { onAuthenticated: (user: ChatUser) => void }) {
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const isSignUp = tab === "signup";
  const authMutation = useMutation({
    mutationFn: ({ endpoint, body }: { endpoint: string; body: unknown }) =>
      api<{ user: ChatUser; token: string }>(endpoint, { method: "POST", body })
  });
  const schema = isSignUp ? signUpSchema : signInSchema;
  const form = useForm<AuthValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" }
  });

  async function submit(values: AuthValues) {
    setError("");
    try {
      const endpoint = isSignUp ? "/auth/register" : "/auth/login";
      const body = isSignUp
        ? values
        : { email: values.email, password: values.password };
      const result = await authMutation.mutateAsync({ endpoint, body });
      setSessionToken(result.token);
      onAuthenticated(result.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in");
    }
  }

  async function googleSignIn(credential: string) {
    setError("");
    try {
      const result = await authMutation.mutateAsync({ endpoint: "/auth/google", body: { credential } });
      setSessionToken(result.token);
      onAuthenticated(result.user);
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : "Google sign-in failed");
    }
  }

  return (
    <main className="auth-page grid min-h-svh grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 p-4 max-[900px]:grid-cols-[minmax(0,0.82fr)_minmax(380px,1fr)] max-[760px]:grid-cols-1 max-[760px]:gap-0 max-[760px]:p-0">
      <section className="auth-welcome relative hidden min-h-[calc(100svh-32px)] flex-col justify-between overflow-hidden rounded-[25px] px-[clamp(30px,5vw,68px)] py-[clamp(28px,4vw,52px)] text-auth-ink min-[761px]:flex max-[900px]:px-8">
        <div className="pointer-events-none absolute -right-16 top-[31%] size-[390px] rounded-full bg-white/45 blur-3xl" aria-hidden="true" />
        <div className="relative z-10 flex items-center gap-2.5">
          <Image src="/tandem-favicon.png" alt="" width={46} height={46} priority />
          <span className="text-[18px] font-bold tracking-[-0.04em]">Tandem</span>
        </div>

        <div className="relative z-10 my-8 max-w-[720px]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-auth-primary">A little closer, every day</p>
          <h1 className="mb-4 mt-0 max-w-[440px] text-[clamp(40px,4.4vw,62px)] font-semibold leading-[1.04] tracking-[-0.065em]">Better conversations. Together.</h1>
          <p className="m-0 max-w-[390px] text-[15px] leading-[1.75] text-auth-muted">Stay close to the people who matter. Tandem makes it easy to chat, share, and be present — in real time.</p>
          <div className="mt-8 flex items-center gap-5 max-[1100px]:flex-col max-[1100px]:items-start max-[1100px]:gap-2">
          <ul className="m-0 flex flex-1 flex-col gap-4 p-0 text-[13px] text-auth-muted">
            <li className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-xl bg-white/75 text-auth-primary"><MessageCircle size={16} aria-hidden="true" /></span>Real-time messaging</li>
            <li className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-xl bg-white/75 text-auth-primary"><UsersRound size={16} aria-hidden="true" /></span>Online presence</li>
            <li className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-xl bg-white/75 text-auth-primary"><ShieldCheck size={16} aria-hidden="true" /></span>Secure and private</li>
          </ul>

        <div className="auth-chat-art pointer-events-none relative z-0 h-[142px] w-[228px] flex-none max-[1100px]:mt-3 max-[1100px]:self-end" aria-hidden="true">
          <div className="absolute right-5 top-0 size-[128px] rounded-full border border-white/70 bg-[#d8d4ff]/45" />
          <span className="absolute right-2 top-5 size-3 rounded-full bg-auth-primary/75" />
          <span className="absolute bottom-2 left-4 size-2.5 rounded-full bg-[#9a91f2]" />
          <div className="absolute left-0 top-2 z-10 flex w-[184px] items-center gap-2 rounded-[17px_17px_17px_6px] border border-white/90 bg-white/95 p-2.5 shadow-[0_14px_34px_rgb(63_56_130_/_13%)]">
            <span className="grid size-8 flex-none place-items-center rounded-full border-2 border-white bg-[#d5d0ff] text-auth-primary shadow-sm"><UserRound size={16} strokeWidth={2.2} aria-hidden="true" /></span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-auth-ink">Maya</span>
              <span className="text-[9px] leading-[1.45] text-auth-muted">Hey, how have you been?</span>
            </span>
          </div>
          <div className="absolute bottom-0 right-0 z-20 flex w-[184px] items-center gap-2 rounded-[17px_17px_6px_17px] border border-white/80 bg-auth-primary p-2.5 text-white shadow-[0_14px_34px_rgb(79_70_229_/_24%)]">
            <span className="grid size-8 flex-none place-items-center rounded-full border-2 border-white/70 bg-white/20 text-white shadow-sm"><UserRound size={16} strokeWidth={2.2} aria-hidden="true" /></span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-[10px] font-semibold">Alex</span>
              <span className="text-[9px] leading-[1.45] text-white/85">It’s great to catch up!</span>
            </span>
          </div>
        </div>
          </div>
        </div>
      </section>

      <section className="auth-panel grid min-h-[calc(100svh-32px)] place-items-center rounded-[25px] bg-white px-8 py-10 max-[900px]:px-6 max-[760px]:min-h-svh max-[760px]:rounded-none max-[760px]:px-6 max-[760px]:py-8">
        <div className="w-full max-w-[390px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-3 flex items-center gap-2.5">
              <Image src="/tandem-favicon.png" alt="" width={40} height={40} priority />
              <span className="text-[20px] font-bold tracking-[-0.045em] text-auth-ink">Tandem</span>
            </div>
            <h2 className="mb-1 mt-0 text-[25px] font-semibold tracking-[-0.045em] text-auth-ink">{isSignUp ? "Create your account" : "Welcome back"}</h2>
            <p className="m-0 text-[13px] leading-6 text-auth-muted">{isSignUp ? "Start your journey with Tandem." : "Sign in to catch up with your people."}</p>
          </div>

          <Tabs
            className="auth-tabs"
            activeKey={tab}
            onChange={(key) => {
              if (key === "signin" || key === "signup") {
                setTab(key);
              }
              setError("");
              form.clearErrors();
            }}
            items={[
              { key: "signin", label: "Log in" },
              { key: "signup", label: "Create account" }
            ]}
          />
          <form className="auth-form" onSubmit={form.handleSubmit(submit)}>
            {isSignUp && (
              <div className="auth-field mb-4">
                <label className="mb-2 block text-xs font-medium text-auth-ink" htmlFor="auth-name">Your name</label>
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field }) => <Input id="auth-name" placeholder="How should we call you?" autoComplete="name" aria-invalid={Boolean(form.formState.errors.name)} aria-describedby={form.formState.errors.name ? "auth-name-error" : undefined} {...field} />}
                />
                {form.formState.errors.name?.message && <p id="auth-name-error" className="auth-error mt-1.5 text-xs">{form.formState.errors.name.message}</p>}
              </div>
            )}
            <div className="auth-field mb-4">
              <label className="mb-2 block text-xs font-medium text-auth-ink" htmlFor="auth-email">Email address</label>
              <Controller
                control={form.control}
                name="email"
                render={({ field }) => <Input id="auth-email" type="email" placeholder="you@example.com" autoComplete="email" aria-invalid={Boolean(form.formState.errors.email)} aria-describedby={form.formState.errors.email ? "auth-email-error" : undefined} {...field} />}
              />
              {form.formState.errors.email?.message && <p id="auth-email-error" className="auth-error mt-1.5 text-xs">{form.formState.errors.email.message}</p>}
            </div>
            <div className="auth-field mb-5">
              <label className="mb-2 block text-xs font-medium text-auth-ink" htmlFor="auth-password">Password</label>
              <Controller
                control={form.control}
                name="password"
                render={({ field }) => <Input.Password id="auth-password" placeholder={isSignUp ? "At least 8 characters" : "Enter your password"} autoComplete={isSignUp ? "new-password" : "current-password"} aria-invalid={Boolean(form.formState.errors.password)} aria-describedby={form.formState.errors.password ? "auth-password-error" : undefined} {...field} />}
              />
              {form.formState.errors.password?.message && <p id="auth-password-error" className="auth-error mt-1.5 text-xs">{form.formState.errors.password.message}</p>}
            </div>
            {error && <p role="alert" className="auth-error mb-4 text-xs">{error}</p>}
            <Button className="auth-submit" type="primary" htmlType="submit" block loading={authMutation.isPending}>
              {isSignUp ? "Create your account" : "Log in"}
            </Button>
          </form>

          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <>
              <div className="auth-divider my-5 flex items-center gap-3 text-xs text-auth-muted">or continue with</div>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(response) => {
                    if (response.credential) {
                      void googleSignIn(response.credential);
                    }
                  }}
                  onError={() => {
                    setError("Google sign-in could not be completed");
                    message.error("Google sign-in could not be completed");
                  }}
                />
              </div>
            </>
          )}
          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] leading-[1.6] text-auth-muted"><ShieldCheck size={14} aria-hidden="true" />Your conversations stay private.</p>
        </div>
      </section>
    </main>
  );
}
