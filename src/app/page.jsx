"use client"
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ClubWelcomePage() {
  const router = useRouter();
  
  const handleStart = () => {
    router.push("/signup");
  }
  
  return (
    <div className="min-h-screen flex justify-center items-center bg-zinc-900 relative overflow-hidden p-4">
      <Image
        src="/vector.svg"
        alt="bg"
        fill
        className="object-cover z-0"
        priority
      />
      <div
        id="background-route"
        className="absolute inset-0 z-0 pointer-events-none"
      ></div>
      
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1a1c1d] px-6 sm:px-12 py-10 sm:py-14 rounded-3xl text-center shadow-2xl flex flex-col items-center cyber-card brackets">
          {/* Logo Container */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-700 p-6 sm:p-5 rounded-full mb-6 shadow-lg">
            <Image
              src="/Nexus.png"
              alt="Club Logo"
              width={80}
              height={80}
              className="w-20 h-20 sm:w-28 sm:h-28"
            />
          </div>
          
          {/* Welcome Text */}
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 text-3xl sm:text-4xl md:text-5xl font-bold mb-3 tracking-tight leading-tight title-glow">
            Welcome To Our Club!
          </h1>
          
          <p className="text-gray-400 text-sm sm:text-base mb-8 sm:mb-10 max-w-sm">
            Join us on an exciting journey
          </p>
          
          {/* Start Button */}
          <button
            className="btn btn-solid px-10 sm:px-12 py-3.5 sm:py-4 text-base sm:text-lg w-full sm:w-auto title-glow"
            onClick={handleStart}
          >
            Start From Here
          </button>
        </div>
      </div>
    </div>
  );
}