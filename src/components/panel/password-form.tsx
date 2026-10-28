"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { passwordChangeSchema, type PasswordChangeValues } from "@/validation/admin";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";

export function PasswordForm({ email }: { email: string }) {
  const form = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (v) => {
    try {
      await apiFetch("/api/admin/account/password", { body: v });
      form.reset();
      toast.success("Senha alterada. Outras sessões abertas foram encerradas.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  return (
    <Card className="p-5">
      <h2 className="font-display text-2xl font-semibold">Acesso</h2>
      <p className="mt-1 text-sm text-cocoa-muted">E-mail de login: {email}</p>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-4 sm:grid-cols-3">
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <Field label="Senha atual" error={errors.currentPassword?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="current-password" {...form.register("currentPassword")} />}
        </Field>
        <Field label="Nova senha" hint="Mínimo de 10 caracteres." error={errors.newPassword?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" {...form.register("newPassword")} />}
        </Field>
        <Field label="Confirmar nova senha" error={errors.confirmPassword?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" {...form.register("confirmPassword")} />}
        </Field>
        <div className="flex justify-end sm:col-span-3">
          <Button type="submit" variant="outline" loading={isSubmitting}>
            Alterar senha
          </Button>
        </div>
      </form>
    </Card>
  );
}
