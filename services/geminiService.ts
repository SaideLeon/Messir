
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, RawQuestion } from "../types";

// Initialize Gemini Client
// Note: process.env.API_KEY is injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for Phase 1: Scanning
const rawScanSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      index: { type: Type.INTEGER, description: "Número sequencial da questão no arquivo." },
      content: { 
        type: Type.STRING, 
        description: "O conteúdo COMPLETO da questão. Se houver imagens, gráficos ou diagramas, VOCÊ DEVE DESCREVÊ-LOS DETALHADAMENTE em texto aqui, pois a próxima etapa não verá a imagem original." 
      }
    },
    required: ["index", "content"]
  }
};

// Schema for Phase 2: Solving
const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: {
      type: Type.STRING,
      description: "O enunciado formatado em Markdown. Matemática entre cifrões ($).",
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Opções de resposta. Matemática entre cifrões ($).",
    },
    correctAnswerIndex: {
      type: Type.INTEGER,
      description: "O índice (0-based) da opção correta. -1 se for discursiva.",
    },
    correctAnswerText: {
      type: Type.STRING,
      description: "A resposta final correta.",
    },
    explanation: {
      type: Type.STRING,
      description: "Explicação DIDÁTICA, DETALHADA e PASSO A PASSO. Use Markdown e LaTeX ($...$). Divida em: Identificação de Dados, Lógica e Cálculo.",
    },
  },
  required: ["text", "options", "correctAnswerText", "explanation"],
};

const examSchema: Schema = {
  type: Type.ARRAY,
  items: questionSchema,
};

/**
 * Phase 1: Reads the PDF once and identifies ALL questions.
 * Does not solve them yet, just extracts context and image descriptions.
 */
export const scanExamForRawQuestions = async (base64Data: string): Promise<RawQuestion[]> => {
  try {
    const modelId = "gemini-2.5-flash";

    const prompt = `
      Analise este arquivo PDF de exame.
      Sua tarefa é APENAS IDENTIFICAR e EXTRAIR todas as questões presentes.
      
      PARA CADA QUESTÃO:
      1. Extraia o texto do enunciado.
      2. **MUITO IMPORTANTE**: Se a questão tiver IMAGEM, GRÁFICO ou TABELA, você DEVE escrever uma descrição textual detalhada dessa imagem junto com o texto. O solucionador no próximo passo NÃO terá acesso à imagem, apenas ao seu texto. Descreva a geometria, os valores nos eixos, ou os dados da tabela.
      
      Retorne uma lista JSON simples com o índice e o conteúdo bruto (texto + descrição da imagem) de cada questão encontrada.
      Não tente resolver a questão agora. Apenas extraia.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "application/pdf", data: base64Data } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: rawScanSchema,
        temperature: 0.1, // High precision for extraction
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Não foi possível ler o PDF.");

    const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    const rawData = JSON.parse(cleanJson);

    return rawData.map((item: any, idx: number) => ({
      id: idx,
      originalIndex: item.index,
      content: item.content
    }));

  } catch (error: any) {
    console.error("Erro no scan:", error);
    throw new Error("Falha ao mapear o arquivo PDF. Verifique se é um arquivo válido.");
  }
};

/**
 * Phase 2: Takes a batch of raw text questions and creates the Quiz object.
 * Does NOT need the PDF file.
 */
export const generateQuizFromRawQuestions = async (rawQuestions: RawQuestion[], batchStartIndex: number): Promise<Question[]> => {
  try {
    const modelId = "gemini-2.5-flash"; 
    
    // We pass the raw content extracted in Phase 1
    const questionsContext = rawQuestions.map((q, i) => 
      `Questão ${batchStartIndex + i + 1} (Contexto): ${q.content}`
    ).join("\n\n----------------\n\n");

    const prompt = `
      Você é um Tutor Professor de Matemática Especialista.
      Abaixo estão ${rawQuestions.length} questões extraídas de um exame (texto e descrição de imagens).
      
      Sua tarefa é RESOLVER estas questões e formatá-las para um App de Quiz.

      ### REGRAS DE EXPLICAÇÃO:
      - **Comece listando os dados** da questão.
      - **Explique a teoria/fórmula** necessária.
      - **Mostre o cálculo passo a passo** com LaTeX.
      - **Conclua** mostrando como chegar à alternativa correta.
      
      ### REGRAS DE LATEX:
      1. **TODA** expressão matemática, variável ou número complexo DEVE estar entre cifrões ($). Ex: $x^2 + 2x$.
      2. Use $$...$$ para equações principais em destaque.
      3. Escape barras invertidas corretamente para JSON (use \\frac, não \frac).

      INPUT:
      ${questionsContext}

      Retorne um JSON Array com os objetos de questão resolvidos.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { text: prompt }, // Text only! Fast and cheap.
      config: {
        responseMimeType: "application/json",
        responseSchema: examSchema,
        temperature: 0.2,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Erro ao gerar respostas.");

    const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    // Map to internal type, ensuring IDs align with the global batch index
    const questions: Question[] = parsedData.map((q: any, index: number) => ({
      id: batchStartIndex + index, 
      text: q.text,
      options: q.options || [],
      correctAnswerIndex: q.correctAnswerIndex === -1 ? null : q.correctAnswerIndex,
      correctAnswerText: q.correctAnswerText,
      explanation: q.explanation,
    }));

    return questions;

  } catch (error: any) {
    console.error("Erro na geração do quiz:", error);
    throw new Error("Erro ao resolver as questões. Tente novamente.");
  }
};

export const explainQuestionDoubt = async (question: Question, userDoubt: string): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  const questionNumber = question.id + 1;
  
  const prompt = `
    CONTEXTO ESTRITO: Você é um Tutor de Matemática focado EXCLUSIVAMENTE na Questão ${questionNumber} deste exame.
    
    INSTRUÇÕES:
    1. Você DEVE reconhecer que está falando da Questão ${questionNumber}.
    2. Responda apenas dúvidas sobre esta questão/matemática.
    3. Use LaTeX ($...$) para matemática.
    4. Seja paciente e didático.
    
    --- DADOS DA QUESTÃO ${questionNumber} ---
    Enunciado: ${question.text}
    Explicação Original: ${question.explanation}
    ------------------------
    
    Dúvida do Aluno: "${userDoubt}"
    
    Resposta:
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
  });

  return response.text || "Desculpe, não consegui processar sua dúvida no momento.";
};

export const generateAppLogo = async (): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: 'A modern, minimalist, geometric logo for a math study application named "Messir". The logo should feature a stylized "M" or mathematical symbols like integrals or pi, in a vector art style. Use shades of indigo, blue and white. High quality, icon style, white background.',
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Failed to generate logo:", error);
    throw error;
  }
};
