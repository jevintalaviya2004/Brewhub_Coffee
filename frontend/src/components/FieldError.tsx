import { AlertCircle } from "lucide-react";

/** Red message under a form field. Shows nothing when `message` is empty. */
export function FieldError({ message, id }: { message?: string | null; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1 text-xs font-medium text-destructive">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** Red border for an input with an error. */
export const errorInputClass = (hasError: boolean) =>
  hasError ? "border-destructive focus-visible:ring-destructive/40" : "";
