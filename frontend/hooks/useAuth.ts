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

  if (error instanceof Error) return error.message;

  return "An unexpected error occurred. Please try again.";
};

export function useLogin() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [serverError, setServerError] = useState("");

  const mutation = useMutation({
    mutationFn: async (credentials: Record<string, unknown>) => {
      await api.post(
        "/auth/login",
        { username: credentials.email, password: credentials.password },
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );

      const userResponse = await api.get("/users/user");

      return userResponse.data;
    },
    onSuccess: (user) => {
      setServerError("");
      setUser(user);
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

export function useAdminLogin() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const [serverError, setServerError] = useState("");

  const mutation = useMutation({
    mutationFn: async (credentials: Record<string, unknown>) => {
      await api.post(
        "/auth/login",
        { username: credentials.email, password: credentials.password },
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );

      const userResponse = await api.get("/users/user");
      const user = userResponse.data;

      if (user.role !== "admin") {
        logout();
        throw new Error("Admin privileges required");
      }

      return user;
    },
    onSuccess: (user) => {
      setServerError("");
      setUser(user);
      router.push("/admin");
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

export function useAdminUpload() {
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/admin/ingest", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response.data as { message?: string };
    },
    onSuccess: (data) => {
      setServerError("");
      setSuccessMessage(data.message ?? "Knowledge base upload started.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setServerError(getErrorMessage(error));
    },
  });

  return {
    upload: mutation.mutateAsync,
    isPending: mutation.isPending,
    serverError,
    successMessage,
    setServerError,
    setSuccessMessage,
  };
}
