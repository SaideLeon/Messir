
import React, { useState, useEffect } from 'react';
import { AppStatus, Question, HistoryRecord, RawQuestion } from './types';
import FileUpload from './components/FileUpload';
import LoadingScreen from './components/LoadingScreen';
import QuizInterface from './components/QuizInterface';
import ResultsView from './components/ResultsView';
import HistoryView from './components/HistoryView';
import Logo from './components/Logo';
import { scanExamForRawQuestions, generateQuizFromRawQuestions } from './services/geminiService';
import { saveHistory } from './services/db';

const QUESTIONS_PER_BATCH = 3;
const SESSION_STORAGE_KEY = 'messir_active_session';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number | string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Custom Logo State
  const [appLogo, setAppLogo] = useState<string | null>(null);
  
  // State to manage chunks/batches
  const [rawQuestionsMap, setRawQuestionsMap] = useState<RawQuestion[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [hasSavedSession, setHasSavedSession] = useState(false);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Load recoverable session
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
        try {
            const data = JSON.parse(savedSession);
            // Verify if session is valid (e.g. has raw questions)
            if (data.rawQuestionsMap && data.rawQuestionsMap.length > 0) {
                setHasSavedSession(true);
            }
        } catch (e) {
            console.error("Error loading session", e);
        }
    }
  }, []);

  // Persist session logic
  useEffect(() => {
    if (rawQuestionsMap.length > 0) {
        const sessionData = {
            rawQuestionsMap,
            currentBatchIndex,
            timestamp: Date.now()
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        setHasSavedSession(true);
    }
  }, [rawQuestionsMap, currentBatchIndex]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Step 1: File is selected. We SCAN the PDF to map all questions.
  const handleFileSelect = async (base64: string) => {
    setStatus(AppStatus.SCANNING);
    setErrorMsg(null);
    
    try {
      const allRawQuestions = await scanExamForRawQuestions(base64);
      
      if (allRawQuestions.length === 0) {
        throw new Error("Nenhuma questão foi identificada no PDF. Tente um arquivo com imagens mais nítidas.");
      }

      setRawQuestionsMap(allRawQuestions);
      setCurrentBatchIndex(0);
      
      // Step 2: Automatically process the first batch
      await processBatch(allRawQuestions, 0);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Falha ao ler o PDF.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleResumeSession = () => {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
          const data = JSON.parse(savedSession);
          setRawQuestionsMap(data.rawQuestionsMap);
          setCurrentBatchIndex(data.currentBatchIndex);
          
          // Resume logic: if we have more questions, process next batch
          if (data.currentBatchIndex < data.rawQuestionsMap.length) {
              processBatch(data.rawQuestionsMap, data.currentBatchIndex);
          } else {
              alert("Você já finalizou todas as questões deste exame salvo.");
          }
      }
  };

  // Step 2 Helper: Take a slice of raw questions and solve them
  const processBatch = async (allQuestions: RawQuestion[], startIndex: number) => {
    setStatus(AppStatus.ANALYZING);
    
    // Get next N questions
    const batchRaw = allQuestions.slice(startIndex, startIndex + QUESTIONS_PER_BATCH);
    
    if (batchRaw.length === 0) {
       setErrorMsg("Não há mais questões para processar.");
       setStatus(AppStatus.RESULTS); 
       return;
    }

    try {
      const solvedQuestions = await generateQuizFromRawQuestions(batchRaw, startIndex);
      setQuestions(solvedQuestions);
      setStatus(AppStatus.QUIZ);
    } catch (error: any) {
      console.error(error);
      setErrorMsg("Erro ao resolver as questões deste lote. Tente novamente.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleQuizFinish = (finalScore: number, answers: Record<number, number | string>) => {
    setScore(finalScore);
    setUserAnswers(answers);
    
    // Save to IndexedDB automatically
    saveHistory({
      date: new Date().toISOString(),
      score: finalScore,
      total: questions.length,
      questions: questions,
      userAnswers: answers
    });

    // Update index for next batch
    setCurrentBatchIndex(prev => prev + questions.length);
    setStatus(AppStatus.RESULTS);
  };

  const handleLoadMore = () => {
    // Check if we have more questions in the Raw Map
    if (currentBatchIndex < rawQuestionsMap.length) {
      processBatch(rawQuestionsMap, currentBatchIndex);
    } else {
      // Finished all
      alert("Você completou todas as questões identificadas neste exame!");
      // Optionally clear session
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setHasSavedSession(false);
    }
  };

  const handleRetry = () => {
    setScore(0);
    setUserAnswers({});
    setStatus(AppStatus.QUIZ);
  };

  const handleReset = () => {
    setQuestions([]);
    setRawQuestionsMap([]);
    setScore(0);
    setUserAnswers({});
    setErrorMsg(null);
    setCurrentBatchIndex(0);
    setStatus(AppStatus.IDLE);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setHasSavedSession(false);
  };

  const handleReviewHistory = (record: HistoryRecord) => {
    setQuestions(record.questions);
    setScore(record.score);
    setStatus(AppStatus.RESULTS);
  };

  const hasMoreQuestions = currentBatchIndex < rawQuestionsMap.length;

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden font-sans text-slate-900 dark:text-slate-100">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-[100px] opacity-60 dark:opacity-40"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-[100px] opacity-60 dark:opacity-40"></div>
      </div>

      <header className={`fixed top-0 w-full z-20 transition-all duration-300 ${status !== AppStatus.IDLE ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => status !== AppStatus.QUIZ && setStatus(AppStatus.IDLE)}>
             <Logo customUrl={appLogo} className="w-9 h-9" />
             <span className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight hidden sm:inline">Messir</span>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Dark Mode Toggle */}
             <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors focus:outline-none"
              title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <button 
              onClick={() => setStatus(AppStatus.HISTORY)}
              className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
               <span className="hidden sm:inline">Histórico</span>
            </button>
            
            {status !== AppStatus.IDLE && status !== AppStatus.QUIZ && status !== AppStatus.HISTORY && (
                <button 
                onClick={handleReset}
                className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                Início
                </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 flex flex-col h-full overflow-hidden pt-16">
        {status === AppStatus.IDLE && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
             <FileUpload 
              onFileSelect={handleFileSelect} 
              onLogoGenerated={setAppLogo}
              currentLogo={appLogo}
             />
             {hasSavedSession && (
                <div className="mt-8 slide-up">
                    <button 
                        onClick={handleResumeSession}
                        className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3 text-slate-700 dark:text-slate-200"
                    >
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                        </span>
                        <span className="font-medium">Continuar exame anterior</span>
                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs text-slate-500 dark:text-slate-400">
                             Detectado
                        </span>
                    </button>
                </div>
             )}
          </div>
        )}

        {status === AppStatus.SCANNING && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <LoadingScreen 
              message="Mapeando Exame"
              subMessage="Identificando todas as questões e imagens do arquivo... Isso ocorre apenas uma vez."
            />
          </div>
        )}

        {status === AppStatus.ANALYZING && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <LoadingScreen 
              message="Resolvendo Questões"
              subMessage={`Lote Atual: Questões ${currentBatchIndex + 1} a ${Math.min(currentBatchIndex + QUESTIONS_PER_BATCH, rawQuestionsMap.length)} (de ${rawQuestionsMap.length} encontradas).`}
            />
          </div>
        )}

        {status === AppStatus.QUIZ && questions.length > 0 && (
          <QuizInterface 
            questions={questions} 
            onFinish={handleQuizFinish} 
            onExit={handleReset}
          />
        )}

        {status === AppStatus.RESULTS && (
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
             <ResultsView 
              score={score} 
              total={questions.length} 
              onRetry={handleRetry} 
              onNewFile={handleReset}
              onLoadMore={hasMoreQuestions ? handleLoadMore : () => alert('Fim do exame!')}
            />
            {!hasMoreQuestions && (
              <div className="text-center p-4 text-slate-500 dark:text-slate-400">
                Você completou todas as questões identificadas neste arquivo.
              </div>
            )}
           </div>
        )}

        {status === AppStatus.HISTORY && (
            <HistoryView onReview={handleReviewHistory} onBack={handleReset} />
        )}

        {status === AppStatus.ERROR && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-xl max-w-md text-center border border-slate-100 dark:border-slate-700 slide-up">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Ops! Algo deu errado.</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8">{errorMsg}</p>
              <button 
                onClick={handleReset}
                className="w-full py-3.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-lg active:scale-95 font-semibold"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
