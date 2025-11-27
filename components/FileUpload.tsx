
import React, { useCallback, useState } from 'react';
import Logo from './Logo';
import { generateAppLogo } from '../services/geminiService';

interface FileUploadProps {
  onFileSelect: (base64: string) => void;
  onLogoGenerated: (url: string) => void;
  currentLogo: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onLogoGenerated, currentLogo }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);

  const processFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Por favor, envie apenas arquivos PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1];
      onFileSelect(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleGenerateLogo = async () => {
    if (isGeneratingLogo) return;
    setIsGeneratingLogo(true);
    try {
      const url = await generateAppLogo();
      onLogoGenerated(url);
    } catch (error) {
      alert("Não foi possível gerar o logo. Tente novamente.");
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  return (
    <div className="max-w-xl w-full mx-auto p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 slide-up relative overflow-hidden transition-colors duration-300">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

      <div className="text-center mb-10 relative z-10 flex flex-col items-center">
        <div className="group relative">
            <Logo customUrl={currentLogo} className="w-24 h-24 mb-6" />
            
            <button
                onClick={handleGenerateLogo}
                disabled={isGeneratingLogo}
                className="absolute -bottom-2 -right-2 bg-slate-900 dark:bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Gerar novo Logo com IA"
            >
                {isGeneratingLogo ? (
                   <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                )}
            </button>
        </div>

        <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white mb-3 tracking-tight">
          Messir
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
          Transforme seus PDFs e fotos antigas em quizzes interativos com correções detalhadas.
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative group border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/30 scale-[1.02]'
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleInputChange}
          className="hidden"
          id="fileInput"
        />
        <label htmlFor="fileInput" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
          <div className={`transition-transform duration-300 ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-14 w-14 mb-4 ${isDragging ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">
            {isDragging ? 'Solte para começar' : 'Arraste seu PDF aqui'}
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500">ou clique para buscar no dispositivo</p>
        </label>
      </div>
      
      <div className="mt-8 grid grid-cols-2 gap-4 text-center">
         <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
           <span className="block text-indigo-600 dark:text-indigo-400 font-bold text-lg">Latex</span>
           <span className="text-xs text-slate-500 dark:text-slate-400">Formatação Matemática</span>
         </div>
         <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
           <span className="block text-indigo-600 dark:text-indigo-400 font-bold text-lg">AI Tutor</span>
           <span className="text-xs text-slate-500 dark:text-slate-400">Tira-Dúvidas 24h</span>
         </div>
      </div>
    </div>
  );
};

export default FileUpload;
