import React, { useId } from 'react';

interface LogoProps {
  customUrl?: string | null;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ customUrl, className = "w-10 h-10" }) => {
  // Generate a safe, unique ID for the gradients to avoid collisions
  const rawId = useId();
  const uniqueId = rawId.replace(/:/g, ''); 
  const grad1Id = `logoGrad1-${uniqueId}`;
  const grad2Id = `logoGrad2-${uniqueId}`;

  if (customUrl) {
    return (
      <img 
        src={customUrl} 
        alt="Messir Logo" 
        className={`${className} rounded-xl object-cover shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800`} 
      />
    );
  }

  return (
    <div className={`${className} bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-700 relative overflow-hidden p-1 transition-colors`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
           <linearGradient id={grad1Id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--logo-grad-1)" />
            <stop offset="50%" stopColor="var(--logo-grad-2)" />
            <stop offset="100%" stopColor="var(--logo-grad-3)" />
          </linearGradient>
          <linearGradient id={grad2Id} x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="var(--logo-pi-1)" />
             <stop offset="100%" stopColor="var(--logo-pi-2)" />
          </linearGradient>
        </defs>
        
        {/* Stylized M */}
        <path 
          d="M20 75 V 25 L 50 55 L 80 25 V 75" 
          fill="none" 
          stroke={`url(#${grad1Id})`} 
          strokeWidth="12" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Stylized Pi symbol interacting with M */}
        <path
          d="M60 20 H 90 M 70 20 V 40 M 83 20 V 35"
          fill="none" 
          stroke={`url(#${grad2Id})`}
          strokeWidth="7"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.1))' }}
        />
      </svg>
    </div>
  );
};

export default Logo;