"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { loginSchema, type LoginValues } from "@/validation/admin";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await apiFetch("/api/auth/login", { body: values });
      router.replace("/painel");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="E-mail" error={errors.email?.message}>
        {(id, d) => <Input id={id} type="email" autoComplete="email" inputMode="email" aria-describedby={d} aria-invalid={!!errors.email} {...form.register("email")} />}
      </Field>
      <Field label="Senha" error={errors.password?.message}>
        {(id, d) => <Input id={id} type="password" autoComplete="current-password" aria-describedby={d} aria-invalid={!!errors.password} {...form.register("password")} />}
      </Field>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        Entrar
      </Button>
    </form>
  );
}
