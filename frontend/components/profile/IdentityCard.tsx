import { Button } from "@/components/ui/button";

interface IdentityCardProps {
  username?: string;
  email?: string;
  role?: string;
  userInitial: string;
  hasProfile: boolean;
  onEdit: () => void;
}

export function IdentityCard({
  username,
  email,
  role,
  userInitial,
  hasProfile,
  onEdit,
}: IdentityCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-rule bg-paper p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-deep font-serif text-[20px] italic text-cream sm:h-16 sm:w-16 sm:text-[26px]">
          {userInitial}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-semibold leading-tight tracking-tight text-ink sm:text-[22px]">
            {username || "User"}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] tracking-[0.06em] text-ink-mute md:text-[11px]">
            <span className="truncate">{email}</span>
            {role && (
              <>
                <span className="h-1 w-1 shrink-0 rounded-full bg-rule" />
                <span className="shrink-0 uppercase tracking-[0.12em]">
                  {role}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      {hasProfile && (
        <Button
          onClick={onEdit}
          className="h-10 w-full shrink-0 rounded-[10px] bg-forest-deep px-5 text-[13px] font-medium text-cream hover:bg-forest sm:w-auto"
        >
          Edit Profile
        </Button>
      )}
    </section>
  );
}
