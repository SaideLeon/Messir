
import React, { useEffect } from 'react';

interface ResultsViewProps {
  score: number;
  total: number;
  onRetry: () => void;
  onNewFile: () => void;
  onLoadMore: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ score, total, onRetry, onNewFile, onLoadMore }) => {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  
  let message = '';
  let subMessage = '';
  let colorClass = '';
  let bgClass = '';
  
  if (percentage >= 80) {
    message = 'Excelente!';
    subMessage = 'Você dominou esta parte. Vamos para a próxima?';
    colorClass = 'text-green-600 dark:text-green-400';
    bgClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  } else if (percentage >= 50) {
    message = 'Bom Trabalho!';
    subMessage = 'Você está no caminho certo. Revise os detalhes antes de prosseguir.';
    colorClass = 'text-indigo-600 dark:text-indigo-400';
    bgClass = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
  } else {
    message = 'Continue Estudando';
    subMessage = 'Use as explicações detalhadas da IA para fortalecer a base.';
    colorClass = 'text-orange-600 dark:text-orange-400';
    bgClass = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  }

  // Simple pure CSS/JS confetti effect
  useEffect(() => {
    if (percentage >= 70) {
      const colors = ['#4f46e5', '#22c55e', '#eab308', '#ec4899'];
      for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.width = Math.random() * 10 + 5 + 'px';
        confetti.style.height = Math.random() * 20 + 10 + 'px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animation = `drop ${Math.random() * 2 + 1}s linear forwards`;
        document.body.appendChild(confetti);
        
        // Remove after animation
        setTimeout(() => confetti.remove(), 4000);
      }
      
      // Inject CSS for animation
      const style = document.createElement('style');
      style.innerHTML = `
        @keyframes drop {
          to { top: 100vh; transform: rotate(720deg); }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        style.remove();
      };
    }
  }, [percentage]);

  return (
    <div className="max-w-5xl w-full mx-auto p-8 md:p-12 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl slide-up mt-4 md:mt-12 relative overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
      
      {/* Background glow */}
      <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${percentage >= 50 ? 'from-indigo-400 to-green-400' : 'from-orange-400 to-red-400'}`}></div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-12">
        
        {/* Left Col: Chart */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-100 dark:text-slate-800"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path
              className={`${percentage >= 80 ? 'text-green-500' : percentage >= 50 ? 'text-indigo-500' : 'text-orange-500'} transition-all duration-1000 ease-out`}
              strokeDasharray={`${percentage}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2.5"
            />
          </svg>
          <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
            <span className="text-6xl md:text-7xl font-bold text-slate-800 dark:text-white tracking-tight">{percentage}%</span>
            <span className="text-sm md:text-base text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-2">Aproveitamento</span>
          </div>
        </div>

        {/* Right Col: Content */}
        <div className="flex-1 text-center md:text-left w-full">
            <div className="mb-8">
                <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase mb-4 ${bgClass}`}>
                Resultado da Parte
                </span>
                <h2 className={`text-4xl md:text-5xl font-extrabold ${colorClass} mb-4 tracking-tight`}>{message}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl leading-relaxed">{subMessage}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10 max-w-sm mx-auto md:mx-0">
                <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">{score}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mt-1">Corretas</div>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="text-3xl font-bold text-slate-400 dark:text-slate-500">{total - score}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mt-1">Incorretas</div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <button
                onClick={onLoadMore}
                className="px-8 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 text-white font-bold rounded-2xl shadow-lg shadow-slate-300 dark:shadow-slate-900 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 text-lg"
                >
                <span>Próxima Parte</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                </button>

                <button
                    onClick={onRetry}
                    className="px-6 py-4 bg-white dark:bg-transparent border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95"
                >
                    Refazer
                </button>
                 <button
                    onClick={onNewFile}
                    className="px-6 py-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold transition-colors"
                >
                    Sair
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
