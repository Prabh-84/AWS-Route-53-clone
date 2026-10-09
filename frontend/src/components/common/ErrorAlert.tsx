"use client";

import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import { ApiError } from "@/lib/api-client";

interface ErrorAlertProps {
  /** The error thrown by a failed fetch. */
  error: unknown;
  header: string;
  /** Refetch handler; a Retry button is shown when given (and the error is worth retrying). */
  onRetry?: () => void;
  retrying?: boolean;
}

/** Inline replacement for a section/page whose GET failed. Offers Retry unless retrying can't help (404). */
export function ErrorAlert({ error, header, onRetry, retrying }: ErrorAlertProps) {
  const notFound = error instanceof ApiError && error.status === 404;
  const message =
    error instanceof ApiError ? error.message : "Something went wrong while loading this page. Please try again.";
  return (
    <Alert
      type="error"
      header={header}
      action={
        onRetry && !notFound ? (
          <Button onClick={onRetry} loading={retrying}>
            Retry
          </Button>
        ) : undefined
      }
    >
      {message}
    </Alert>
  );
}
