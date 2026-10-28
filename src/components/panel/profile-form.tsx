"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { maskWhatsappInput } from "@/lib/phone";
import { profileSchema, type ProfileValues } from "@/validation/admin";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: initial });
  const { errors, isSubmitting } = form.formState;
  const slug = form.watch("slug");
  const accent = form.watch("accentColor");

  useEffect(() => setOrigin(window.location.origin), []);
  const publicUrl = `${origin}/agendar/${initial.slug}`;

  const submit = form.handleSubmit(async (v) => {
    try {
      await apiFetch("/api/admin/profile", { method: "PUT", body: v });
      toast.success("Perfil atualizado.");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado. Cole na bio do Instagram ou envie pelo WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const reg = form.register("whatsapp");

  return (
    <Card className="p-5">
      <h2 className="font-display text-2xl font-semibold">Página pública</h2>
      <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-blush/60 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="break-all font-medium">{publicUrl}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyLink}>
            <Copy className="size-4" /> Copiar link
          </Button>
          <a href={`/agendar/${initial.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm hover:bg-white">
            <ExternalLink className="size-4" /> Abrir
          </a>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Nome profissional" error={errors.name?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.name} {...form.register("name")} />}
        </Field>
        <Field label="Endereço da página" hint={`/agendar/${slug || "seu-nome"}`} error={errors.slug?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.slug} autoCapitalize="none" {...form.register("slug")} />}
        </Field>
        <Field label="Especialidade (subtítulo)" className="sm:col-span-2" error={errors.headline?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} placeholder="Ex.: Extensão de cílios e design de sobrancelhas" {...form.register("headline")} />}
        </Field>
        <Field label="Apresentação" className="sm:col-span-2" error={errors.description?.message}>
          {(id, d) => <Textarea id={id} aria-describedby={d} maxLength={1000} {...form.register("description")} />}
        </Field>
        <Field label="WhatsApp para contato" error={errors.whatsapp?.message}>
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              aria-invalid={!!errors.whatsapp}
              inputMode="tel"
              {...reg}
              onChange={(e) => {
                e.target.value = maskWhatsappInput(e.target.value);
                void reg.onChange(e);
              }}
            />
          )}
        </Field>
        <Field label="Instagram" error={errors.instagram?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} placeholder="@seuperfil" autoCapitalize="none" {...form.register("instagram")} />}
        </Field>
        <Field label="Endereço do atendimento" className="sm:col-span-2" hint="Deixe em branco se preferir informar apenas pelo WhatsApp." error={errors.address?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} {...form.register("address")} />}
        </Field>
        <Field label="Foto de perfil (URL https)" error={errors.photoUrl?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="url" placeholder="https://…" {...form.register("photoUrl")} />}
        </Field>
        <Field label="Imagem de capa (URL https)" error={errors.coverUrl?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="url" placeholder="https://…" {...form.register("coverUrl")} />}
        </Field>
        <Field label="Cor de destaque" hint="Cor dos botões da sua página. Vazio = marrom padrão." error={errors.accentColor?.message}>
          {(id, d) => (
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Escolher cor"
                value={accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#493832"}
                onChange={(e) => form.setValue("accentColor", e.target.value, { shouldDirty: true, shouldValidate: true })}
                className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-white p-1"
              />
              <Input id={id} aria-describedby={d} placeholder="#493832" {...form.register("accentColor")} />
            </div>
          )}
        </Field>
        <label className="flex items-center gap-3 self-end pb-3 text-sm">
          <Checkbox {...form.register("isActive")} /> Página pública ativa
        </label>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>
            Salvar perfil
          </Button>
        </div>
      </form>
    </Card>
  );
}
