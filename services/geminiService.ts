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
3. Згенерувати "Експертний висновок", заповнивши наданий користувачем HTML-ЗРАЗОК.

КРИТИЧНІ ВИМОГИ ДО HTML:
- Ви ПОВИННІ повернути ПОВНИЙ та ВАЛІДНИЙ HTML документ.
- НЕ ЗМІНЮЙТЕ, НЕ ВИДАЛЯЙТЕ та НЕ ПЕРЕСТАВЛЯЙТЕ існуючі HTML теги, класи, стилі або структуру зразка. Зразок може бути складним (збереженим з MS Word), ваше завдання лише вставити текст у відповідні місця.
- Вставляйте знайдені дані всередину існуючих тегів (наприклад, у відповідні клітинки таблиці <td> або абзаци <p>), замінюючи старий текст-приклад (плейсхолдери).
- Якщо даних немає, залиште поле пустим або напишіть [ДАНІ ВІДСУТНІ], але не видаляйте сам HTML елемент.

ВАЖЛИВО ЩОДО ФОРМАТУВАННЯ ДАНИХ:
- Дати завжди у форматі ДД.ММ.РРРР.
- НЕ використовуйте Markdown. Тільки чистий текст всередині HTML тегів.
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

ДАЛІ, ВИКОРИСТОВУЮЧИ ЦІ ДАНІ, ЗАПОВНИ НАСТУПНИЙ HTML ШАБЛОН:
--- ПОЧАТОК HTML ШАБЛОНУ ---
${templateText}
--- КІНЕЦЬ HTML ШАБЛОНУ ---

ІНСТРУКЦІЇ ПО ЗАПОВНЕННЮ:
1. Експерт: Знайди в шаблоні поле для імені експерта та встав туди: "${expertName}".
2. Номер висновку: Заміни номер висновку в шапці та по тексту на: "${conclusionNumber}".
3. Дата початку/реєстрації: Заміни дату висновку (реєстрації) на: "${formattedStartDate}".
4. Дата закінчення: Заміни дату закінчення дії на: "${formattedEndDate}".
5. Товари та коди: Знайди відповідну таблицю або список у шаблоні та акуратно впиши туди знайдені товари, коди УКТЗЕД та кількість, не ламаючи верстку таблиці.

ВІДПОВІДЬ МАЄ БУТИ JSON:
{
  "extractedData": { ... },
  "fullText": "<!DOCTYPE html><html>...ПОВНИЙ ЗАПОВНЕНИЙ HTML КОД...</html>"
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
        // Try to salvage if it returned just HTML string instead of JSON (sometimes models do this despite instructions)
        if (responseText.trim().startsWith('<')) {
             return {
                 fullText: responseText,
                 extractedData: {}
             };
        }
        return {
            fullText: "<div>Помилка обробки відповіді. Спробуйте ще раз.</div>",
            extractedData: {}
        };
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};