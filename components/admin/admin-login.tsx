"use client";

import { ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  type AdminLoginState,
  loginAdmin
} from "@/app/admin-auth-actions";
import { Button } from "@/components/ui/button";

const INITIAL_STATE: AdminLoginState = {
  error: ""
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Opening admin..." : "Enter admin"}
    </Button>
  );
}

export function AdminLogin() {
  const [state, formAction] = useActionState(loginAdmin, INITIAL_STATE);

  return (
    <main className="min-h-svh bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-5xl items-center justify-center">
        <section className="w-full max-w-md rounded-[28px] border bg-card p-6 shadow-sm sm:p-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.9} />
          </div>

          <div className="mt-5 space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary/80">
              Admin Access
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
              Log in
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter the admin credentials to open the document dashboard.
            </p>
          </div>

          <form action={formAction} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="admin-username"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Username
              </label>
              <input
                id="admin-username"
                name="username"
                autoComplete="username"
                required
                className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="admin-password"
                className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Password
              </label>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                placeholder="Enter password"
              />
            </div>

            {state.error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            ) : null}

            <SubmitButton />
          </form>
        </section>
      </div>
    </main>
  );
}
