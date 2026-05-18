export function calculateAge(dateOfBirth: string) {
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
}

export function calculateBMI(heightCm: number, weightKg: number) {
  if (!heightCm || !weightKg) return null;
  return (weightKg / Math.pow(heightCm / 100, 2)).toFixed(1);
}

export type BMICategory = {
  label: "Underweight" | "Normal" | "Overweight" | "Obese";
  position: number;
};

export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return { label: "Underweight", position: 11 };
  if (bmi < 25) return { label: "Normal", position: 36 };
  if (bmi < 30) return { label: "Overweight", position: 62 };
  return { label: "Obese", position: 87 };
}
