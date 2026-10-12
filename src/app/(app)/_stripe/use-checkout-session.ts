"use client";

import { useEffect, useMemo } from "react";
import { checkoutOnce } from "@/lib/checkout-once";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * The Checkout Session a payment form runs on, created once per key (BUG-105). The server action is called from an
 * effect, never during render: calling it inside useMemo updated the router while the form rendered, which React
 * reported as "Cannot update a component (Router) while rendering a different component" on the card step.
 * Stripe's provider gets the promise at once and waits for it.
 */
export function useCheckoutSession<T>(key: string, create: () => Promise<T>): Promise<T> {
  // A new key (another plan or pack) gets a new pending session.
  const session = useMemo(() => ({ key, ...deferred<T>() }), [key]);
  useEffect(() => {
    checkoutOnce(session.key, create).then(session.resolve, session.reject);
  }, [create, session]);
  return session.promise;
}
