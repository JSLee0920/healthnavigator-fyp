"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  User,
  Calendar,
  Ruler,
  Scale,
  Droplet,
  AlertTriangle,
  Pill,
  Heart,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import HealthProfileDialog from "@/components/HealthProfileDialog";
import Sidebar from "@/components/Sidebar";

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
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

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      return age - 1;
    }
    return age;
  };

  const calculateBMI = (heightCm: number, weightKg: number) => {
    if (!heightCm || !weightKg) return null;
    return (weightKg / Math.pow(heightCm / 100, 2)).toFixed(1);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "Underweight", color: "text-blue-500" };
    if (bmi < 25) return { label: "Normal", color: "text-green-500" };
    if (bmi < 30) return { label: "Overweight", color: "text-yellow-500" };
    return { label: "Obese", color: "text-red-500" };
  };

  const age = healthProfile?.date_of_birth
    ? calculateAge(healthProfile.date_of_birth)
    : null;
  const bmi =
    healthProfile?.height_cm && healthProfile?.weight_kg
      ? calculateBMI(healthProfile.height_cm, healthProfile.weight_kg)
      : null;
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        onSessionSelect={(id) => router.push(`/chat/${id}`)}
        onNewChatClick={() => router.push("/chat")}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border px-6 py-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/chat")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Health Profile</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xl sm:text-2xl shrink-0">
                        {user?.username?.[0]?.toUpperCase() ||
                          user?.email?.[0]?.toUpperCase() ||
                          "U"}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold truncate">
                          {user?.username || "User"}
                        </h2>
                        <p className="text-muted-foreground text-sm truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    {healthProfile && (
                      <Button
                        onClick={() => setIsProfileDialogOpen(true)}
                        className="self-start sm:self-auto"
                      >
                        Edit Profile
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {healthProfile?.gender && (
                      <div className="bg-background rounded-lg p-4 border border-border">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <User className="h-4 w-4" />
                          Gender
                        </div>
                        <p className="font-medium capitalize">
                          {healthProfile.gender}
                        </p>
                      </div>
                    )}

                    {age !== null && (
                      <div className="bg-background rounded-lg p-4 border border-border">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <Calendar className="h-4 w-4" />
                          Age
                        </div>
                        <p className="font-medium">{age} years</p>
                      </div>
                    )}

                    {healthProfile?.height_cm && (
                      <div className="bg-background rounded-lg p-4 border border-border">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <Ruler className="h-4 w-4" />
                          Height
                        </div>
                        <p className="font-medium">
                          {healthProfile.height_cm} cm
                        </p>
                      </div>
                    )}

                    {healthProfile?.weight_kg && (
                      <div className="bg-background rounded-lg p-4 border border-border">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <Scale className="h-4 w-4" />
                          Weight
                        </div>
                        <p className="font-medium">
                          {healthProfile.weight_kg} kg
                        </p>
                      </div>
                    )}

                    {healthProfile?.blood_type && (
                      <div className="bg-background rounded-lg p-4 border border-border">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <Droplet className="h-4 w-4" />
                          Blood Type
                        </div>
                        <p className="font-medium">
                          {healthProfile.blood_type}
                        </p>
                      </div>
                    )}

                    {bmi && bmiCategory && (
                      <div className="bg-background rounded-lg p-4 border border-border">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <Heart className="h-4 w-4" />
                          BMI
                        </div>
                        <p className="font-medium">
                          {bmi}{" "}
                          <span className={`text-sm ${bmiCategory.color}`}>
                            ({bmiCategory.label})
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <h3 className="font-semibold">Chronic Conditions</h3>
                    </div>
                    {healthProfile?.chronic_conditions?.length > 0 ? (
                      <ul className="space-y-2">
                        {healthProfile.chronic_conditions.map(
                          (condition: string, index: number) => (
                            <li
                              key={index}
                              className="bg-orange-500/10 text-orange-700 dark:text-orange-400 rounded-md px-3 py-1.5 text-sm"
                            >
                              {condition}
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No conditions recorded
                      </p>
                    )}
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <h3 className="font-semibold">Allergies</h3>
                    </div>
                    {healthProfile?.allergies?.length > 0 ? (
                      <ul className="space-y-2">
                        {healthProfile.allergies.map(
                          (allergy: string, index: number) => (
                            <li
                              key={index}
                              className="bg-red-500/10 text-red-700 dark:text-red-400 rounded-md px-3 py-1.5 text-sm"
                            >
                              {allergy}
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No allergies recorded
                      </p>
                    )}
                  </div>

                  <div className="bg-card border border-border rounded-xl p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                      <Pill className="h-5 w-5 text-blue-500" />
                      <h3 className="font-semibold">Current Medications</h3>
                    </div>
                    {healthProfile?.current_medications?.length > 0 ? (
                      <ul className="space-y-2">
                        {healthProfile.current_medications.map(
                          (medication: string, index: number) => (
                            <li
                              key={index}
                              className="bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-md px-3 py-1.5 text-sm"
                            >
                              {medication}
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No medications recorded
                      </p>
                    )}
                  </div>
                </div>

                {!healthProfile && (
                  <div className="bg-muted/50 border border-border rounded-xl p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      No health profile found. Complete your profile for
                      personalized health recommendations.
                    </p>
                    <Button onClick={() => setIsProfileDialogOpen(true)}>
                      Create Health Profile
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
