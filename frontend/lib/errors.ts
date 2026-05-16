import { isAxiosError } from "axios";

export const getErrorMessage = (
  error: unknown,
  fallback = "An unexpected error occurred. Please try again.",
): string => {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((d: { msg: string }) => d.msg).join(", ");
    }
    if (typeof detail === "string") return detail;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};
