import { requireAuth } from "@/server/auth/guard";
import { getSchedule } from "@/server/schedule/service";
import { BlocksManager } from "@/components/panel/blocks-manager";
import { HoursEditor } from "@/components/panel/hours-editor";
import { ScheduleSettingsForm } from "@/components/panel/schedule-settings-form";
import { PageHeader } from "@/components/ui/misc";

export default async function HoursPage() {
  const auth = await requireAuth();
  const { professional: p, hours, blocks } = await getSchedule(auth.professionalId);
  return (
    <>
      <PageHeader title="Horários" description="Defina quando você atende. Os horários da página pública são calculados a partir daqui." />
      <div className="space-y-6">
        <HoursEditor initial={hours.filter((h) => h.isActive).map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }))} />
        <ScheduleSettingsForm
          initial={{
            slotStepMinutes: p.slotStepMinutes,
            defaultBufferMinutes: p.defaultBufferMinutes,
            minNoticeMinutes: p.minNoticeMinutes,
            maxAdvanceDays: p.maxAdvanceDays,
            timezone: p.timezone,
          }}
        />
        <BlocksManager timezone={p.timezone} blocks={blocks.map((b) => ({ id: b.id, startAt: b.startAt.toISOString(), endAt: b.endAt.toISOString(), reason: b.reason }))} />
      </div>
    </>
  );
}
