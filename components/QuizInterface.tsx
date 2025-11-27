
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Question, ChatMessage } from '../types';
import { explainQuestionDoubt } from '../services/geminiService';

interface QuizInterfaceProps {
  questions: Question[];
  onFinish: (score: number, userAnswers: Record<number, number | string>) => void;
  onExit: () => void;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ questions, onFinish, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  // Refs for scrolling
  const explanationRef = useRef<HTMLDivElement>(null);
  const bottomSpacerRef = useRef<HTMLDivElement>(null);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentQuestion = questions[currentIndex];
  const isMultipleChoice = currentQuestion.options.length > 0;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  useEffect(() => {
    const questionNumber = currentQuestion.id + 1;
    setChatMessages([
      {
        role: 'model',
        text: `Olá! Já analisei o enunciado e a resolução da **Questão ${questionNumber}**. \n\nEstou pronto. Qual é a sua dúvida específica sobre este problema?`
      }
    ]);
  }, [currentIndex, currentQuestion.id]);

  // Scroll to explanation when shown
  useEffect(() => {
    if (showExplanation && explanationRef.current) {
      setTimeout(() => {
        explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [showExplanation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatOpen]);

  const handleAnswerSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
  };

  const handleConfirmAnswer = () => {
    if (selectedOption !== null || !isMultipleChoice) {
      setShowExplanation(true);
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: selectedOption !== null ? selectedOption : "Answered"
      }));
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowExplanation(false);
      setSelectedOption(null);
      // Scroll back to top
      const scrollContainer = document.getElementById('quiz-scroll-container');
      if (scrollContainer) scrollContainer.scrollTop = 0;
    } else {
      let score = 0;
      questions.forEach(q => {
        if (q.correctAnswerIndex !== null && answers[q.id] === q.correctAnswerIndex) {
          score++;
        }
      });
      onFinish(score, answers);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await explainQuestionDoubt(currentQuestion, userMsg.text);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Desculpe, tive um problema ao conectar com o professor IA. Tente novamente." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const MarkdownRenderer = ({ content, className }: { content: string, className?: string }) => (
    <div className={`markdown-content ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        className="prose prose-slate dark:prose-invert prose-lg md:prose-xl prose-p:my-3 prose-headings:my-4 prose-li:my-2 max-w-none text-slate-800 dark:text-slate-200 break-words"
        components={{
          p: ({node, ...props}) => <p className="leading-relaxed mb-4" {...props} />,
          strong: ({node, ...props}) => <span className="font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-900/30 px-1 rounded" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="flex h-full w-full relative overflow-hidden bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300">
      <div className={`flex-1 flex flex-col h-full transition-all duration-300 ease-in-out relative ${isChatOpen ? 'lg:mr-[450px]' : ''}`}>
        
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 px-6 md:px-10 py-4 flex items-center justify-between shadow-sm flex-shrink-0 transition-colors">
          <div className="flex items-center gap-6 flex-1">
            <button onClick={onExit} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors group" title="Sair">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:text-red-500 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
            </button>
            <div className="flex-1 max-w-lg">
              <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wide">
                <span>Progresso do Lote</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="text-base font-semibold text-slate-700 dark:text-slate-200 ml-4 whitespace-nowrap hidden md:block bg-white dark:bg-slate-800 px-4 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
              Questão <span className="text-indigo-600 dark:text-indigo-400">{currentIndex + 1}</span> de {questions.length}
            </div>
          </div>
          
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`ml-6 px-5 py-2.5 rounded-xl flex items-center gap-2.5 font-semibold transition-all shadow-sm active:scale-95 ${isChatOpen ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 ring-2 ring-indigo-200 dark:ring-indigo-700' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-md'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
            <span className="hidden md:inline">Tira-Dúvidas IA</span>
            <span className="md:hidden">Chat</span>
          </button>
        </div>

        {/* Scrollable Main Content */}
        <div id="quiz-scroll-container" className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-12 w-full flex justify-center pb-32">
          <div className="w-full max-w-5xl">
            
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-slate-200/60 dark:border-slate-700/60 p-6 md:p-12 slide-up relative overflow-hidden mb-8 transition-colors">
               {/* Question Number Badge */}
               <div className="absolute top-0 left-0 p-6 md:p-10 pointer-events-none opacity-10 dark:opacity-5">
                  <span className="text-9xl font-black text-slate-900 dark:text-white leading-none">{questions[currentIndex].id + 1}</span>
               </div>

              <div className="mb-10 relative z-0">
                <span className="inline-block px-4 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-full mb-6 uppercase tracking-wider border border-slate-200 dark:border-slate-600">
                  Enunciado
                </span>
                <div className="text-xl md:text-3xl text-slate-800 dark:text-slate-100 font-medium leading-relaxed tracking-tight">
                  <MarkdownRenderer content={currentQuestion.text} />
                </div>
              </div>

              {/* Options Grid */}
              {isMultipleChoice ? (
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {currentQuestion.options.map((option, idx) => {
                    let containerClass = "border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-750";
                    let circleClass = "border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800";
                    
                    if (showExplanation) {
                      if (idx === currentQuestion.correctAnswerIndex) {
                        containerClass = "border-green-500 bg-green-50/50 dark:bg-green-900/20 ring-2 ring-green-500 shadow-md";
                        circleClass = "border-green-500 bg-green-500 text-white";
                      } else if (idx === selectedOption) {
                        containerClass = "border-red-400 bg-red-50/50 dark:bg-red-900/20 opacity-80";
                        circleClass = "border-red-400 text-red-500 dark:text-red-400 bg-white dark:bg-slate-800";
                      } else {
                        containerClass = "border-slate-100 dark:border-slate-800 opacity-50 grayscale";
                      }
                    } else if (selectedOption === idx) {
                      containerClass = "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 ring-2 ring-indigo-600 dark:ring-indigo-500 shadow-lg transform scale-[1.01] z-10";
                      circleClass = "border-indigo-600 dark:border-indigo-500 bg-indigo-600 dark:bg-indigo-500 text-white";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(idx)}
                        disabled={showExplanation}
                        className={`relative w-full text-left p-5 md:p-6 rounded-2xl border-2 transition-all duration-200 flex items-start gap-5 group ${containerClass}`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm md:text-base transition-colors mt-1 ${circleClass}`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <div className="flex-1 text-slate-700 dark:text-slate-200 text-base md:text-lg">
                          <MarkdownRenderer content={option} className="prose-p:m-0" />
                        </div>
                        {showExplanation && idx === currentQuestion.correctAnswerIndex && (
                           <div className="absolute top-5 right-5 text-green-600 dark:text-green-400">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                             </svg>
                           </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                 <div className="p-16 bg-slate-50 dark:bg-slate-700/30 rounded-3xl border-3 border-dashed border-slate-300 dark:border-slate-600 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-400 rounded-full flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">Questão Discursiva</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-lg">
                    Resolva o problema detalhadamente em seu caderno. Quando terminar, clique em "Conferir Resposta" para ver a solução do professor.
                  </p>
                </div>
              )}
            </div>

            {/* Explanation Section - Rendered immediately after options in the flow */}
            {showExplanation && (
              <div ref={explanationRef} className="slide-up animate-in fade-in zoom-in-95 duration-500">
                <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-850 border border-indigo-100 dark:border-slate-700 rounded-[2rem] p-8 md:p-12 shadow-xl relative overflow-hidden mb-6 transition-colors">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 dark:bg-indigo-900/30 rounded-full blur-[80px] opacity-40 pointer-events-none"></div>

                  <h3 className="text-indigo-900 dark:text-indigo-300 font-bold text-2xl mb-8 flex items-center gap-4 relative z-10">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </span>
                    Resolução Detalhada
                  </h3>
                  
                  <div className="math-explanation text-slate-700 dark:text-slate-300 space-y-6 text-lg leading-8 relative z-10">
                     <MarkdownRenderer content={currentQuestion.explanation} />
                  </div>
                  
                  <div className="mt-10 p-6 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                    <div className="uppercase text-xs font-bold tracking-wider text-indigo-500 dark:text-indigo-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-slate-700 self-start md:self-center shadow-sm">
                      Gabarito Oficial
                    </div>
                    <div className="text-indigo-900 dark:text-indigo-200 font-bold text-xl md:text-2xl">
                      <MarkdownRenderer content={currentQuestion.correctAnswerText} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Spacer to prevent content being hidden by fixed footer */}
            <div ref={bottomSpacerRef} className="h-32 w-full"></div>
          </div>
        </div>

        {/* Fixed Footer Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-20 flex justify-center items-center transition-colors">
            <div className="w-full max-w-5xl flex justify-end">
                <div className="flex gap-4">
                    {!showExplanation ? (
                    <button
                        onClick={handleConfirmAnswer}
                        disabled={isMultipleChoice && selectedOption === null}
                        className="px-8 md:px-12 py-4 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white dark:text-slate-900 font-bold rounded-2xl transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center gap-3 text-lg shadow-lg shadow-slate-300 dark:shadow-slate-900"
                    >
                        <span>Conferir Resposta</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                    ) : (
                    <button
                        onClick={handleNext}
                        className="px-8 md:px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all transform hover:-translate-y-1 active:translate-y-0 shadow-lg shadow-indigo-300 dark:shadow-indigo-900 flex items-center gap-3 text-lg"
                    >
                        <span>{currentIndex === questions.length - 1 ? 'Concluir Parte' : 'Próxima Questão'}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div 
        className={`fixed inset-y-0 right-0 w-full lg:w-[450px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-30 flex flex-col ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10 transition-colors">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2.5 text-lg">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Professor IA
            </h3>
          </div>
          <button 
            onClick={() => setIsChatOpen(false)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Context Bar */}
        <div className="bg-indigo-50/80 dark:bg-indigo-900/30 backdrop-blur border-b border-indigo-100 dark:border-indigo-900/50 px-4 py-3 text-center sticky top-0 z-10 transition-colors">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-600 dark:text-indigo-300 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Contexto: Questão {questions[currentIndex].id + 1}
            </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-100 dark:border-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="font-medium text-slate-600 dark:text-slate-400">Olá! Estou aqui para ajudar.</p>
              <p className="text-sm mt-1">Envie "Explique novamente" ou pergunte sobre um passo específico.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl p-4 text-sm md:text-base shadow-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                    }`}
                  >
                     {msg.role === 'model' ? (
                       <MarkdownRenderer content={msg.text} />
                     ) : (
                       msg.text
                     )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                   <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                     <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
          <div className="relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Escreva sua dúvida aqui...`}
              disabled={isChatLoading}
              className="w-full pl-5 pr-14 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-base dark:text-white"
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim() || isChatLoading}
              className="absolute right-2.5 top-2.5 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuizInterface;
