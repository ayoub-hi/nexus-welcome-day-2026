"use client"
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ClubWelcomePage() {
  const router = useRouter();
  
  const handleStart = () => {
    router.push("/signup");
  }
  
  return (
    <div className="min-h-screen flex justify-center items-center bg-[#0a0a0a] relative overflow-hidden p-4">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url(/background-pattern.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        id="background-route"
        className="absolute inset-0 z-0 pointer-events-none"
      ></div>
      
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#0d1117] px-6 sm:px-12 py-10 sm:py-14 rounded-3xl text-center shadow-2xl flex flex-col items-center border border-[#1a1a1a] red-glow">
          {/* Hero Graphic */}
          <div className="w-full mb-6 rounded-xl overflow-hidden">
            <Image
              src="/hero-graphic.webp"
              alt="Mr. Robot Hacker"
              width={400}
              height={300}
              className="w-full h-auto object-cover rounded-xl"
              priority
            />
          </div>

          {/* Logo */}
          <div className="bg-[#111111] p-4 sm:p-5 rounded-full mb-6 shadow-lg border border-[#1a1a1a]">
            <Image
              src="/Nexus.png"
              alt="Club Logo"
              width={80}
              height={80}
              className="w-16 h-16 sm:w-20 sm:h-20"
            />
          </div>
          
          {/* Welcome Text */}
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700 text-3xl sm:text-4xl md:text-5xl font-bold mb-3 tracking-tight leading-tight glitch-text">
            Are you a 1 or a 0?
          </h1>
          
          <p className="text-gray-500 text-sm sm:text-base mb-8 sm:mb-10 max-w-sm">
            Control is an illusion
          </p>
          
          {/* Start Button */}
          <button 
            className="bg-gradient-to-r from-red-700 to-red-900 text-white font-semibold px-10 sm:px-12 py-3.5 sm:py-4 text-base sm:text-lg rounded-xl hover:from-red-800 hover:to-red-950 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 shadow-lg w-full sm:w-auto border border-red-800/50" 
            onClick={handleStart}
          >
            Initiate Sequence →
          </button>
        </div>
      </div>
    </div>
  );
}