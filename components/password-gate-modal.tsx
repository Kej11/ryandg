"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  type PasswordGateState,
  unlockSite
} from "../app/password-gate-actions";

const INITIAL_STATE: PasswordGateState = {
  error: ""
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
    >
      {pending ? "Unlocking..." : "Enter"}
    </button>
  );
}

export function PasswordGateModal() {
  const [state, formAction] = useActionState(unlockSite, INITIAL_STATE);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/12 px-4 py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-gate-title"
        className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-7"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="space-y-1">
            <h1 id="password-gate-title" className="text-2xl font-semibold text-foreground">
              Enter Password
            </h1>
            <p className="text-sm text-muted-foreground">
              This site is currently gated. Enter the password to continue.
            </p>
          </div>
        </div>

        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-2 text-left">
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              required
              className="h-11 w-full rounded-md border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              placeholder="Enter password"
            />
          </div>

          {state.error ? (
            <p className="text-sm text-red-600">{state.error}</p>
          ) : null}

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
