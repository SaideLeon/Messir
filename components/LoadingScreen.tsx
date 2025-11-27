import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Processando", 
  subMessage = "A IA está trabalhando no seu material." 
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length < 3 ? prev + '.' : '');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center fade-in">
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-10 md:p-14 rounded-3xl shadow-xl border border-white/50 dark:border-slate-700/50 max-w-lg w-full slide-up">
        <div className="flex justify-center mb-8">
            <div className="relative">
                <div className="w-20 h-20 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500 dark:text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                   </svg>
                </div>
            </div>
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">{message}{dots}</h2>
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            {subMessage}
        </p>
        
        <div className="mt-8 flex justify-center gap-3 opacity-50">
            <div className="h-1.5 w-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce"></div>
            <div className="h-1.5 w-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce delay-75"></div>
            <div className="h-1.5 w-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce delay-150"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;