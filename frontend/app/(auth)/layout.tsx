import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* LEFT SIDE - DYNAMIC CONTENT */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* RIGHT SIDE - STATIC GREEN BANNER */}
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1db88e] to-[#0d7a5a] p-12 text-white lg:flex lg:w-1/2">
        <Image
          src="/healthcare_logo.svg"
          alt="Healthcare Illustration"
          width={320}
          height={320}
          className="mb-10 h-64 w-64 object-contain md:h-80 md:w-80"
          priority
        />
        <div className="z-10 max-w-md text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">
            A Partner In Your
            <br />
            Health Journey
          </h2>
          <p className="text-lg text-emerald-50">
            Your personal companion for a<br />
            healthier, happier life.
          </p>
        </div>
      </div>
    </div>
  );
}
