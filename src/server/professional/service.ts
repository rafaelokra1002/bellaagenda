import { prisma } from "@/lib/prisma";
import { AppError, notFound } from "@/lib/errors";
import { normalizeWhatsapp } from "@/lib/phone";
import { emptyToNull } from "@/validation/common";
import type { PasswordChangeValues, ProfileValues } from "@/validation/admin";
import { hashPassword, verifyPassword } from "../auth/password";
import { hashToken } from "../auth/session";

/** Dados públicos — apenas o necessário para a página de agendamento. */
export async function getPublicProfile(slug: string) {
  const p = await prisma.professional.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      headline: true,
      description: true,
      photoUrl: true,
      coverUrl: true,
      accentColor: true,
      whatsapp: true,
      address: true,
      instagram: true,
      timezone: true,
      maxAdvanceDays: true,
      minNoticeMinutes: true,
      services: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, description: true, price: true, durationMinutes: true, imageUrl: true },
      },
      businessHours: { where: { isActive: true }, select: { dayOfWeek: true } },
    },
  });
  if (!p) return null;
  const { businessHours, services, id: _id, ...rest } = p;
  return {
    ...rest,
    services: services.map((s) => ({ ...s, price: s.price.toFixed(2) })),
    workingWeekdays: [...new Set(businessHours.map((h) => h.dayOfWeek))].sort(),
  };
}
export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;

export async function getProfile(professionalId: string) {
  const p = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!p) throw notFound("Profissional");
  return p;
}

export async function updateProfile(professionalId: string, v: ProfileValues) {
  const whatsapp = normalizeWhatsapp(v.whatsapp);
  if (!whatsapp) throw new AppError("VALIDATION", "WhatsApp inválido.");
  const taken = await prisma.professional.findFirst({ where: { slug: v.slug, id: { not: professionalId } }, select: { id: true } });
  if (taken) throw new AppError("CONFLICT", "Este endereço de página já está em uso. Escolha outro.");
  return prisma.professional.update({
    where: { id: professionalId },
    data: {
      name: v.name.trim(),
      slug: v.slug,
      headline: emptyToNull(v.headline),
      description: emptyToNull(v.description),
      photoUrl: emptyToNull(v.photoUrl),
      coverUrl: emptyToNull(v.coverUrl),
      accentColor: emptyToNull(v.accentColor),
      whatsapp,
      address: emptyToNull(v.address),
      instagram: emptyToNull(v.instagram)?.replace(/^@/, "") ?? null,
      isActive: v.isActive,
    },
  });
}

/** Troca a senha e encerra as demais sessões abertas. */
export async function changePassword(userId: string, currentToken: string | undefined, v: PasswordChangeValues) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(v.currentPassword, user.passwordHash))) throw new AppError("VALIDATION", "Senha atual incorreta.");
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(v.newPassword) } }),
    prisma.session.deleteMany({ where: { userId, ...(currentToken ? { tokenHash: { not: hashToken(currentToken) } } : {}) } }),
  ]);
}

/** Cria (ou recria a senha de) uma conta administrativa com profissional vinculada. */
export async function upsertAdminAccount(input: { name: string; email: string; password: string; slug: string; whatsapp: string; timezone: string }) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email }, include: { professional: true } });
    if (existing) {
      await tx.user.update({ where: { id: existing.id }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: existing.id } });
      return { user: existing, created: false };
    }
    const slugTaken = await tx.professional.findUnique({ where: { slug: input.slug } });
    if (slugTaken) throw new AppError("CONFLICT", `O endereço "${input.slug}" já está em uso.`);
    const user = await tx.user.create({
      data: {
        name: input.name,
        email,
        passwordHash,
        professional: { create: { name: input.name, slug: input.slug, whatsapp: input.whatsapp, timezone: input.timezone } },
      },
    });
    return { user, created: true };
  });
}
