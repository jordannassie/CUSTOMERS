"use client"

import { useSyncExternalStore } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// On a phone, messages show at the top: at the bottom they cover the buttons that sit at the end of a page (the
// Billing page's Cancel plan), and a message under the pointer pauses and never closes. Bigger screens keep the corner.
const PHONE = "(max-width: 639px)"
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(PHONE)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}
const isPhone = () => window.matchMedia(PHONE).matches

const Toaster = ({ ...props }: ToasterProps) => {
  const phone = useSyncExternalStore(subscribe, isPhone, () => false)
  return (
    <Sonner
      theme="light"
      position={phone ? "top-center" : "bottom-right"}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-low" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          // Sonner colours the title from this variable, so an error reads as an error at a glance.
          error: "[--normal-text:var(--cd-low-text)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
