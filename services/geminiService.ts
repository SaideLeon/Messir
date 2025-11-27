
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question } from "../types";

// Initialize Gemini Client
// Note: process.env.API_KEY is injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: {
      type: Type.STRING,
      description: "O enunciado da pergunta em Markdown. IMPORTANTE: Toda matemática deve estar entre cifrões, ex: $x^2$.",
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Opções de resposta. Matemática deve estar entre cifrões, ex: $10\\pi$.",
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

export const analyzeExamPDF = async (base64Data: string, skipCount: number = 0): Promise<Question[]> => {
  try {
    const modelId = "gemini-2.5-flash"; 

    // Lógica de Paginação:
    // Pedimos APENAS 3 questões por vez para permitir explicações longas sem estourar o limite de tokens (cortar JSON).
    // O parametro skipCount diz à IA quantas questões do início do PDF ela deve ignorar.
    
    const prompt = `
      Você é um Tutor Professor de Matemática Especialista.
      Sua tarefa é processar o exame em PDF por partes para criar um plano de estudo detalhado.

      ### INSTRUÇÃO DE PAGINAÇÃO (CRÍTICO):
      1. Analise o documento PDF sequencialmente.
      2. **IGNORE** (pule) as primeiras **${skipCount}** questões que encontrar.
      3. Após pular essas, extraia EXATAMENTE as **3 (TRÊS)** questões seguintes.
      4. Se não houver mais questões após pular ${skipCount}, retorne uma lista vazia [].

      ### REGRAS DE EXPLICAÇÃO (DETALHADA):
      O aluno pediu explicações CLARAS e PASSO A PASSO. Não seja direto demais.
      Para cada explicação:
      - **Comece listando os dados** da questão.
      - **Explique a teoria/fórmula** necessária.
      - **Mostre o cálculo passo a passo** com LaTeX.
      - **Conclua** mostrando como chegar à alternativa correta.
      
      ### REGRAS DE LATEX:
      1. **TODA** expressão matemática, variável ou número complexo DEVE estar entre cifrões ($). Ex: $x^2 + 2x$.
      2. Use $$...$$ para equações principais em destaque.
      3. Escape barras invertidas corretamente para JSON (use \\frac, não \frac).

      Retorne JSON válido.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: examSchema,
        temperature: 0.2,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Não foi possível gerar dados a partir do PDF.");

    // Clean potential markdown blocks if present
    const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const rawData = JSON.parse(cleanJson);

      // Map to our internal type
      const questions: Question[] = rawData.map((q: any, index: number) => ({
        id: skipCount + index, // Keep ID consistent with global count
        text: q.text,
        options: q.options || [],
        correctAnswerIndex: q.correctAnswerIndex === -1 ? null : q.correctAnswerIndex,
        correctAnswerText: q.correctAnswerText,
        explanation: q.explanation,
      }));

      return questions;
    } catch (jsonError) {
      console.error("Erro de Parse JSON:", jsonError, "Texto recebido:", cleanJson.substring(0, 200));
      throw new Error("Erro ao ler a resposta da IA. Tente novamente.");
    }

  } catch (error: any) {
    console.error("Erro ao analisar exame:", error);
    if (error.message.includes("Erro ao ler a resposta")) {
        throw error;
    }
    throw new Error("Falha ao processar o arquivo PDF. Verifique se o arquivo está legível.");
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
