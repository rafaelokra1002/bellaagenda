import { requireAuth } from "@/server/auth/guard";
import { getProfile } from "@/server/professional/service";
import { formatWhatsapp } from "@/lib/phone";
import { PasswordForm } from "@/components/panel/password-form";
import { ProfileForm } from "@/components/panel/profile-form";
import { PageHeader } from "@/components/ui/misc";

export default async function SettingsPage() {
  const auth = await requireAuth();
  const p = await getProfile(auth.professionalId);
  return (
    <>
      <PageHeader title="Configurações" description="Seu perfil, identidade visual e acesso ao painel." />
      <div className="space-y-6">
        <ProfileForm
          initial={{
            name: p.name,
            slug: p.slug,
            headline: p.headline ?? "",
            description: p.description ?? "",
            photoUrl: p.photoUrl ?? "",
            coverUrl: p.coverUrl ?? "",
            accentColor: p.accentColor ?? "",
            whatsapp: formatWhatsapp(p.whatsapp),
            address: p.address ?? "",
            instagram: p.instagram ?? "",
            isActive: p.isActive,
          }}
        />
        <PasswordForm email={auth.email} />
      </div>
    </>
  );
}
