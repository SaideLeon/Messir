
import React, { useEffect, useState } from 'react';
import { HistoryRecord } from '../types';
import { getHistory, clearHistory } from '../services/db';

interface HistoryViewProps {
  onReview: (record: HistoryRecord) => void;
  onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onReview, onBack }) => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const data = await getHistory();
    setRecords(data);
    setLoading(false);
  };

  const handleClear = async () => {
    if (confirm('Tem certeza que deseja apagar todo o histórico?')) {
        await clearHistory();
        setRecords([]);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 w-full h-full flex flex-col">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <span className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          Histórico de Estudos
        </h2>
        <div className="flex gap-3 w-full md:w-auto">
            {records.length > 0 && (
                <button 
                    onClick={handleClear}
                    className="flex-1 md:flex-none px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-sm font-medium border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                >
                    Limpar Tudo
                </button>
            )}
            <button 
            onClick={onBack}
            className="flex-1 md:flex-none px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm font-medium"
            >
            Voltar
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400"></div>
        </div>
      ) : records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl border-2 border-slate-200 dark:border-slate-700 border-dashed">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhum estudo registrado</h3>
          <p className="text-slate-500 dark:text-slate-500 mt-2 max-w-sm mx-auto">Seus resultados aparecerão aqui automaticamente após você completar os exercícios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-4 pr-2">
          {records.map((record) => {
            const percentage = Math.round((record.score / record.total) * 100);
            return (
              <div 
                key={record.id} 
                onClick={() => onReview(record)}
                className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-48"
              >
                <div className="flex items-start justify-between">
                  <div>
                     <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Exame Realizado
                     </div>
                     <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                         </svg>
                         {formatDate(record.date)}
                     </div>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${percentage >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : percentage >= 50 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                    {percentage}%
                  </div>
                </div>
                
                <div>
                   <div className="flex items-end justify-between">
                      <div>
                        <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                           {record.score}<span className="text-lg text-slate-400 dark:text-slate-500 font-medium">/{record.total}</span>
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">Questões Corretas</div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
