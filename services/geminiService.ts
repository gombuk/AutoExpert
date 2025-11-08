import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UploadedFile, GenerationResult } from '../types';

// We use Flash for speed, it is generally good enough for this type of document extraction.
// If it struggles with very complex PDFs, 'gemini-2.5-pro' could be considered.
const MODEL_NAME = 'gemini-2.5-flash';

const getSystemInstruction = (): string => {
  return `Ви — досвідчений асистент митного брокера та експерт з аналізу документації.
Ваше завдання:
1. Проаналізувати надані користувачем зображення/PDF файли (інвойси, пакувальні листи, декларації тощо).
2. Знайти ключові дані: Номер ВМД (митната декларація), Опис товарів, Коди УКТЗЕД, Кількість, Номер додатку (угоди/контракту), Дата додатку.
3. Згенерувати текст "Експертного висновку" на основі наданого HTML-ЗРАЗКА.
4. Критично важливо: ВИ МАЄТЕ ПОВЕРНУТИ ВАЛІДНИЙ HTML.
5. Не змінюйте структуру HTML тегів зразка (таблиці <table>, списки <ul>/<ol>, параграфи <p>, жирний шрифт <strong>/<b>). Вставляйте знайдені дані всередину відповідних HTML тегів, замінюючи старі дані зі зразка.
6. Якщо даних немає в документах, залиште місце пустим або використайте [ДАНІ ВІДСУТНІ].

ВАЖЛИВО ЩОДО ФОРМАТУВАННЯ:
- Кінцевий результат у полі "fullText" має бути чистим HTML кодом, готовим для відображення в браузері.
- НЕ використовуйте Markdown розмітку (жирний шрифт зірочками **, заголовки решітками # тощо) всередині HTML. Використовуйте відповідні HTML теги (<strong>, <h1> і т.д.), якщо вони були в зразку.
`;
};

// Helper to format YYYY-MM-DD to DD.MM.YYYY
const formatDateUA = (isoDate: string): string => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

export const generateExpertConclusion = async (
  files: UploadedFile[],
  templateText: string,
  expertName: string,
  conclusionNumber: string,
  startDate: string,
  endDate: string
): Promise<GenerationResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found in environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare multimodal parts
  const fileParts = files.map(f => {
    if (!f.base64 || !f.mimeType) {
      throw new Error(`File ${f.file.name} is missing base64 data.`);
    }
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = f.base64.split(',')[1] || f.base64;
    return {
      inlineData: {
        data: base64Data,
        mimeType: f.mimeType
      }
    };
  });

  const formattedStartDate = formatDateUA(startDate);
  const formattedEndDate = formatDateUA(endDate);

  const textPrompt = `
ПРОАНАЛІЗУЙ НАДАНІ ВИЩЕ ДОКУМЕНТИ.

Знайди та випиши окремо наступні дані (якщо є):
- Номер ВМД
- Номер додатку (або специфікації/інвойсу, що згадується як основний)
- Дата додатку
- Основні товари та їх коди УКТЗЕД
- Загальна кількість

ДАЛІ, ВИКОРИСТОВУЮЧИ ЦІ ДАНІ, СТВОРИ НОВИЙ HTML ДОКУМЕНТ ЗА ЦИМ ЗРАЗКОМ:
--- ПОЧАТОК HTML ЗРАЗКА ---
${templateText}
--- КІНЕЦЬ HTML ЗРАЗКА ---

ВАЖЛИВО (ОБОВ'ЯЗКОВО ВИКОНАЙ ЦІ ПУНКТИ):
1. Експерт: Вкажи, що цей висновок виконав експерт: "${expertName}". Заміни ім'я експерта в зразку.
2. Номер висновку: Всюди, де в шаблоні згадується номер цього експертного висновку, використовуй значення: "${conclusionNumber}".
3. Дата висновку / реєстрації: Всюди, де вимагається дата висновку, дата початку дії або дата реєстрації, використовуй дату: "${formattedStartDate}".
4. Дата закінчення: Всюди, де вимагається дата закінчення дії висновку, використовуй дату: "${formattedEndDate}".
5. Структура: Збережи всі HTML теги зі зразка. Твоя відповідь має бути валідним HTML документом, який візуально виглядає як зразок, але з новими даними.

ВІДПОВІДЬ МАЄ БУТИ У ФОРМАТІ JSON з двома полями:
{
  "extractedData": {
     "vmd": "...",
     "appendixNumber": "...",
     "appendixDate": "...",
     "goods": ["товар 1", "товар 2"],
     "uktzied": ["код 1", "код 2"],
     "quantity": "..."
  },
  "fullText": "<div><h1>Валідний HTML код тут...</h1></div>"
}
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          ...fileParts,
          { text: textPrompt }
        ]
      },
      config: {
        systemInstruction: getSystemInstruction(),
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const responseText = response.text;
    if (!responseText) {
        throw new Error("Empty response from AI model.");
    }

    try {
        const parsed: GenerationResult = JSON.parse(responseText);
        return parsed;
    } catch (e) {
        console.error("Failed to parse JSON response:", responseText);
        return {
            fullText: responseText, // Fallback, might be raw text if JSON failed
            extractedData: {}
        };
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
