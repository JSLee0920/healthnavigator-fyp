"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import HealthProfileDialog from "@/components/HealthProfileDialog";
import Sidebar from "@/components/Sidebar";
import { useUIStore } from "@/store/uiStore";
import { IdentityCard } from "@/components/profile/IdentityCard";
import { VitalsGrid, type VitalValues } from "@/components/profile/VitalsGrid";
import { BMICard } from "@/components/profile/BMICard";
import { RecordCard } from "@/components/profile/RecordCard";
import {
  calculateAge,
  calculateBMI,
  getBMICategory,
} from "@/lib/healthProfile";

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  const { data: healthProfile, isLoading } = useQuery({
    queryKey: ["health-profile", user?.email],
    queryFn: async () => {
      const response = await api.get("/users/user/health-profile");
      return response.data;
    },
    enabled: !!isAuthenticated && !!user?.email,
    retry: false,
  });

  if (!_hasHydrated || !isAuthenticated) {
    return null;
  }

  const age = healthProfile?.date_of_birth
    ? calculateAge(healthProfile.date_of_birth)
    : null;
  const bmi =
    healthProfile?.height_cm && healthProfile?.weight_kg
      ? calculateBMI(healthProfile.height_cm, healthProfile.weight_kg)
      : null;
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;

  const vitalValues: VitalValues = {
    gender: healthProfile?.gender ?? null,
    age: age !== null ? String(age) : null,
    height: healthProfile?.height_cm ? String(healthProfile.height_cm) : null,
    weight: healthProfile?.weight_kg ? String(healthProfile.weight_kg) : null,
    blood_type: healthProfile?.blood_type ?? null,
  };

  const userInitial = (
    user?.username?.[0] ||
    user?.email?.[0] ||
    "U"
  ).toUpperCase();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-cream text-ink">
      <Sidebar
        onSessionSelect={(id) => router.push(`/chat/${id}`)}
        onNewChatClick={() => router.push("/chat")}
      />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-cream">
        <header className="flex shrink-0 flex-col gap-1 border-b border-rule bg-cream px-4 py-5 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-9 w-9 shrink-0 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="min-w-0 truncate text-[20px] font-semibold leading-tight tracking-tight text-ink md:text-[24px]">
              Health <span className="text-forest-deep">Profile</span>
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center rounded-[14px] border border-rule bg-paper p-12 text-ink-mute">
                <Loader2 className="mb-4 h-8 w-8 animate-spin" />
                <p className="text-[13px]">Loading your profile…</p>
              </div>
            ) : (
              <>
                <IdentityCard
                  username={user?.username}
                  email={user?.email}
                  role={user?.role}
                  userInitial={userInitial}
                  hasProfile={!!healthProfile}
                  onEdit={() => setIsProfileDialogOpen(true)}
                />

                {healthProfile && <VitalsGrid values={vitalValues} />}

                {bmi && bmiCategory && (
                  <BMICard bmi={bmi} category={bmiCategory} />
                )}

                {healthProfile && (
                  <section className="grid gap-4 md:grid-cols-3">
                    <RecordCard
                      title="Chronic Conditions"
                      tone="warn"
                      items={healthProfile?.chronic_conditions ?? []}
                      emptyText="No conditions recorded"
                    />
                    <RecordCard
                      title="Allergies"
                      tone="alert"
                      items={healthProfile?.allergies ?? []}
                      emptyText="No allergies recorded"
                    />
                    <RecordCard
                      title="Medications"
                      tone="calm"
                      items={healthProfile?.current_medications ?? []}
                      emptyText="No medications recorded"
                    />
                  </section>
                )}

                {!healthProfile && (
                  <div className="flex flex-col items-center justify-center rounded-[14px] border border-rule bg-paper p-12 text-center">
                    <p className="mb-4 max-w-md text-[13px] text-ink-soft md:text-[14px]">
                      No health profile found. Complete your profile for
                      personalized health recommendations.
                    </p>
                    <Button
                      onClick={() => setIsProfileDialogOpen(true)}
                      className="h-10 gap-2 rounded-[10px] bg-forest-deep px-4 text-[13px] font-medium text-cream hover:bg-forest"
                    >
                      Create Health Profile
                      <span className="font-serif text-[15px] italic leading-none">
                        →
                      </span>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <HealthProfileDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </div>
  );
}
