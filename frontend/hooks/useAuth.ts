import { useAuthStore } from "@/store/authStore";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

const getErrorMessage = (error: unknown) => {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((d: { msg: string }) => d.msg).join(", ");
    }
    if (typeof detail === "string") return detail;
  }

  return "An unexpected error occurred. Please try again.";
};

export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState("");

  const mutation = useMutation({
    mutationFn: async (credentials: Record<string, unknown>) => {
      const tokenResponse = await api.post(
        "/auth/login",
        { username: credentials.email, password: credentials.password },
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const { access_token } = tokenResponse.data;

      const userResponse = await api.get("/users/user", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      return { token: access_token, user: userResponse.data };
    },
    onSuccess: (data) => {
      setServerError("");
      setAuth(data.token, data.user);
      router.push("/chat");
    },
    onError: (error) => setServerError(getErrorMessage(error)),
  });

  return {
    login: mutation.mutateAsync,
    isPending: mutation.isPending,
    serverError,
    setServerError,
  };
}

export function useRegister() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await api.post("/users/", {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      return response.data;
    },
    onSuccess: () => {
      setServerError("");
      router.push("/login?registered=true");
    },
    onError: (error) => setServerError(getErrorMessage(error)),
  });

  return {
    register: mutation.mutateAsync,
    isPending: mutation.isPending,
    serverError,
    setServerError,
  };
}
