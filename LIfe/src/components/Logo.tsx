import logoUrl from "@/assets/logo-duo.png";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 40 }: LogoProps) {
  return (
    <div 
      className={`relative overflow-hidden rounded-xl shadow-sm ${className}`} 
      style={{ width: size, height: size }}
    >
      <img 
        src={logoUrl} 
        alt="Duo Logo" 
        className="h-full w-full object-cover"
      />
    </div>
  );
}
