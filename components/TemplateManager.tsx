import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FirmTemplate } from '../types';
import { getTemplates, saveTemplate, deleteTemplate } from '../services/storageService';
import { PlusIcon, TrashIcon, TemplateIcon, UploadIcon, DocumentTextIcon, SparklesIcon } from './Icons';
import * as mammoth from 'mammoth';

// Exact HTML structure based on the user's TPP screenshot
const TPP_TEMPLATE_HTML = `
<div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.15;">
    <!-- Header with Logo placeholder and Chamber details -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: none;">
        <tr style="border: none;">
            <td style="width: 25%; vertical-align: top; border: none !important; padding: 0;">
                <!-- Placeholder for Logo - user can replace with <img> tag if needed -->
                <div style="width: 120px; height: 120px; display: flex; justify-content: center; align-items: center; border: 2px dashed #ccc; color: #999; font-size: 10pt;">
                    (Місце для Лого)
                </div>
            </td>
            <td style="vertical-align: top; text-align: center; border: none !important; padding: 0;">
                <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">
                    ЗАКАРПАТСЬКА ТОРГОВО-ПРОМИСЛОВА ПАЛАТА
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px; padding: 0 20px;">
                    <span style="font-weight: bold;">ХУСТСЬКЕ ВІДДІЛЕННЯ</span>
                    <span>телефон 5-51-75</span>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <h1 style="font-size: 18pt; font-weight: bold; margin: 0;">ЕКСПЕРТНИЙ ВИСНОВОК № [НОМЕР_ВИСНОВКУ]</h1>
                    <p style="margin: 5px 0 0 0;">від «[ДЕНЬ]» [МІСЯЦЬ] [РІК] р.</p>
                </div>
            </td>
        </tr>
    </table>

    <!-- Main Content Bodies -->
    <div style="margin-top: 30px;">
        <p style="margin-bottom: 10px;">
            <strong>1. ЗАМОВНИК ЕКСПЕРТИЗИ :</strong> [НАЗВА ЗАМОВНИКА], [АДРЕСА ЗАМОВНИКА].
        </p>
        <p style="margin-bottom: 10px;">
            <strong>2. ЕКСПЕРТ :</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [ІМ'Я ЕКСПЕРТА]
        </p>
        <p style="margin-bottom: 10px;">
            <strong>3. ПІДСТАВА ДЛЯ ПРОВЕДЕННЯ ЕКСПЕРТИЗИ :</strong> Письмова заява замовника експертизи від [ДАТА_ЗАЯВИ] р.
        </p>
        <div style="margin-bottom: 15px; display: flex;">
            <strong style="min-width: 20px;">4.</strong>
            <div>
                <strong>ЗАДАЧА ЕКСПЕРТИЗИ :</strong> ПРОВЕДЕННЯ АНАЛІЗУ НОРМ ВИТРАТ СИРОВИНИ, ОТРИМАНОЇ ДЛЯ ПЕРЕРОБКИ НА МИТНІЙ ТЕРИТОРІЇ УКРАЇНИ ТА ДОПОМІЖНИХ МАТЕРІАЛІВ НА ОДИНИЦЮ ВИРОБУ, ВИЗНАЧЕННЯ ВИТРАТ СИРОВИНИ ТА КОДУ ПО УКТ ЗЕД НА ГОТОВІ ВИРОБИ – [ОПИС_ГОТОВИХ_ВИРОБІВ].
            </div>
        </div>

        <p style="margin-bottom: 5px;"><strong>5. ПРЕД'ЯВЛЕНІ ДОКУМЕНТИ :</strong></p>
        <ol style="margin-top: 5px; margin-bottom: 15px; padding-left: 30px;">
            <li>Контракт № [НОМЕР_КОНТРАКТУ] від [ДАТА_КОНТРАКТУ] р.;</li>
            <li>Додаток № [НОМЕР_ДОДАТКУ] від [ДАТА_ДОДАТКУ] р.;</li>
            <li>[ІНШІ_ДОКУМЕНТИ];</li>
        </ol>

        <div style="margin-left: 30px; margin-bottom: 20px;">
            <p style="margin: 0;">ВМД № [ВМД_1] проформа – рахунку № [РАХУНОК_1] від [ДАТА_1]</p>
            <!-- AI should repeat this pattern for other VMDs -->
            <p>[МІСЦЕ_ДЛЯ_СПИСКУ_ВМД]</p>
        </div>

        <ol start="4" style="margin-top: 5px; margin-bottom: 20px; padding-left: 30px;">
             <li>НОРМИ ВИТРАТ СИРОВИНИ НА ОДИНИЦЮ ГОТОВОЇ ПРОДУКЦІЇ, ВИТРАТИ СИРОВИНИ, ОДЕРЖАНОЇ ДЛЯ ПЕРЕРОБКИ НА МИТНІЙ ТЕРИТОРІЇ УКРАЇНИ;</li>
             <li>ОПИС ТЕХНОЛОГІЧНОГО ПРОЦЕСУ;</li>
             <li>ТЕХНОЛОГІЧНА СХЕМА ПЕРЕРОБКИ СИРОВИНИ;</li>
             <li>КАЛЬКУЛЯЦІЯ ПЕРЕРОБКИ СИРОВИНИ, ЩО ОТРИМАНА ДЛЯ ВИГОТОВЛЕННЯ ГОТОВИХ ВИРОБІВ.</li>
        </ol>

        <div style="margin-bottom: 20px; display: flex;">
             <strong style="min-width: 20px;">6.</strong>
             <div>
                 <strong>РЕЗУЛЬТАТИ ДОСЛІДЖЕННЯ :</strong> ЗГІДНО ІЗ ПИСЬМОВОЮ ЗАЯВКОЮ ЗАМОВНИКА ЕКСПЕРТИЗИ ПРОВЕДЕНО АНАЛІЗ ВИТРАТ СИРОВИНИ ТА ДОПОМІЖНИХ МАТЕРІАЛІВ НА ОДИНИЦЮ ВИРОБУ, ВИТРАТИ СИРОВИНИ ОДЕРЖАНОЇ ВІД ФІРМИ „[ФІРМА_ПОСТАЧАЛЬНИК]”, [КРАЇНА_ПОСТАЧАЛЬНИКА] ДЛЯ ПЕРЕРОБКИ НА МИТНІЙ ТЕРИТОРІЇ УКРАЇНИ, ЗГІДНО ІЗ КОНТРАКТОМ № [НОМЕР_КОНТРАКТУ] ВІД [ДАТА_КОНТРАКТУ] Р., ПО ВМД ВКАЗАНИХ ВИЩЕ, А ТАКОЖ ВИЗНАЧЕННЯ КОДУ ПО УКТ ЗЕД НА ГОТОВІ ВИРОБИ.
                 <br><br>
                 В ПРОЦЕСІ ПРОВЕДЕННЯ ЕКСПЕРТИЗИ ВИВЧЕНА НОРМАТИВНА ДОКУМЕНТАЦІЯ, НОРМИ ВИТРАТ СИРОВИНИ НА ОДИНИЦЮ ВИРОБУ, ЗАТВЕРДЖЕНІ [НАЗВА_ЗАМОВНИКА] ТА ІНОФІРМОЮ, А ТАКОЖ ТЕХНОЛОГІЧНИЙ ОПИС, РОЗРОБЛЕНИЙ ІНОФІРМОЮ „[ФІРМА_ПОСТАЧАЛЬНИК]”, [КРАЇНА_ПОСТАЧАЛЬНИКА] І [НАЗВА_ЗАМОВНИКА].
             </div>
        </div>
         <p>[...ПРОДОВЖЕННЯ ВИСНОВКУ...]</p>
    </div>
</div>
`;

const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<FirmTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<FirmTemplate>>({});
  // 'code' for raw HTML editing, 'preview' for visual check
  const [editTab, setEditTab] = useState<'code' | 'preview'>('code');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = useCallback(() => {
    setTemplates(getTemplates());
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSave = () => {
    if (!currentTemplate.name || !currentTemplate.templateText) {
      alert("Будь ласка, введіть назву та текст шаблону.");
      return;
    }

    const templateToSave: FirmTemplate = {
      id: currentTemplate.id || Date.now().toString(),
      name: currentTemplate.name,
      templateText: currentTemplate.templateText,
      description: currentTemplate.description || '',
      createdAt: currentTemplate.createdAt || Date.now(),
    };

    saveTemplate(templateToSave);
    loadTemplates();
    setIsEditing(false);
    setCurrentTemplate({});
    setEditTab('code');
  };

  const handleEdit = (template: FirmTemplate) => {
    setCurrentTemplate(template);
    setIsEditing(true);
    setEditTab('preview'); // Default to preview when editing existing to see it first
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Ви впевнені, що хочете видалити цей шаблон?")) {
      deleteTemplate(id);
      loadTemplates();
    }
  };

  const handleNew = () => {
    setCurrentTemplate({});
    setIsEditing(true);
    setEditTab('code');
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let htmlContent = '';
      if (file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          // convertToHtml preserves basic formatting (bold, lists, tables)
          const result = await mammoth.convertToHtml({ arrayBuffer });
          htmlContent = result.value;
      } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          // Read HTML files directly as text
          htmlContent = await file.text();
      } else {
          alert("Непідтримуваний формат файлу. Будь ласка, оберіть .docx або .html/.htm");
          return;
      }

      setCurrentTemplate(prev => ({
        ...prev,
        templateText: htmlContent
      }));
      setEditTab('preview'); // Switch to preview to show the result immediately
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Помилка при читанні файлу.");
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleLoadTPPTemplate = () => {
      if (currentTemplate.templateText && !window.confirm("Це замінить поточний текст шаблону. Продовжити?")) {
          return;
      }
      setCurrentTemplate(prev => ({
          ...prev,
          templateText: TPP_TEMPLATE_HTML,
          name: prev.name || 'ТПП Хуст (Зразок)'
      }));
      setEditTab('preview');
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <TemplateIcon className="w-8 h-8 text-primary-600" />
          Керування Шаблонами
        </h2>
        {!isEditing && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            Додати Шаблон
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 animate-fade-in">
          <h3 className="text-xl font-semibold mb-4 text-slate-700">
            {currentTemplate.id ? 'Редагувати Шаблон' : 'Новий Шаблон'}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Назва Фірми / Шаблону *</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="напр., ТПП Хуст"
                    value={currentTemplate.name || ''}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Опис</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Короткий опис"
                    value={currentTemplate.description || ''}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
                  />
                </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-2">
              <div className="flex flex-wrap justify-between items-end mb-2 gap-2">
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-md">
                    <button
                        onClick={() => setEditTab('code')}
                        className={`px-3 py-1.5 text-xs font-medium rounded ${editTab === 'code' ? 'bg-white shadow text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        HTML Код
                    </button>
                    <button
                        onClick={() => setEditTab('preview')}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded ${editTab === 'preview' ? 'bg-white shadow text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <DocumentTextIcon className="w-3 h-3" />
                        Попередній перегляд
                    </button>
                </div>
                <div className="flex gap-2">
                   <button
                        onClick={handleLoadTPPTemplate}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
                        title="Завантажити стандартний шаблон ТПП (як на фото)"
                    >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        Завантажити шаблон ТПП
                    </button>
                  <div className="relative">
                    <input
                        type="file"
                        accept=".docx, .html, .htm"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-100 rounded hover:bg-primary-100 transition-colors"
                        title="Завантажити з файлу (Word або HTML)"
                    >
                        <UploadIcon className="w-3.5 h-3.5" />
                        Завантажити файл
                    </button>
                  </div>
                </div>
              </div>

              {editTab === 'code' ? (
                  <div className="relative">
                      <span className="block text-xs text-slate-500 mb-1">
                        Редагуйте HTML код прямо тут або завантажте готовий файл.
                      </span>
                      <textarea
                        className="w-full h-[500px] p-3 border border-slate-300 rounded-md font-mono text-xs leading-relaxed focus:ring-2 focus:ring-primary-500 outline-none resize-y bg-slate-50"
                        placeholder="<div>Вставте HTML код вашого шаблону тут...</div>"
                        value={currentTemplate.templateText || ''}
                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, templateText: e.target.value })}
                      />
                  </div>
              ) : (
                  <div className="border border-slate-300 rounded-md bg-slate-200/50 p-4 h-[500px] overflow-auto flex justify-center">
                      {currentTemplate.templateText ? (
                          <div className="bg-white shadow-lg w-[21cm] min-h-[29.7cm] p-[2cm] origin-top transition-all flex-shrink-0">
                              {/* Apply the same 'prose-document' class for consistent preview */}
                              <div 
                                  className="prose-document"
                                  dangerouslySetInnerHTML={{ __html: currentTemplate.templateText }} 
                              />
                          </div>
                      ) : (
                          <div className="flex items-center justify-center h-full text-slate-400">
                              <p>Шаблон порожній. Перейдіть до вкладки "Код" або завантажте файл.</p>
                          </div>
                      )}
                  </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => { setIsEditing(false); setCurrentTemplate({}); setEditTab('code'); }}
                className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors shadow-sm"
              >
                Зберегти Шаблон
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-300 text-slate-500">
              <TemplateIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-600">Шаблонів ще немає</p>
              <p className="text-sm text-slate-400 mt-1 mb-4">Додайте свій перший шаблон, щоб почати роботу</p>
              <button
                  onClick={handleNew}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition-colors"
              >
                  <PlusIcon className="w-5 h-5" />
                  Створити шаблон
              </button>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3">
                    <div className="bg-primary-100 p-2 rounded-lg text-primary-600">
                        <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                         <button
                            onClick={() => handleEdit(template)}
                            className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"
                            title="Редагувати"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                            title="Видалити"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                    </div>
                </div>
                <h3 className="font-semibold text-lg text-slate-800 truncate mb-1" title={template.name}>{template.name}</h3>
                {template.description ? (
                    <p className="text-slate-500 text-sm line-clamp-2 h-10">{template.description}</p>
                ) : (
                    <p className="text-slate-400 italic text-sm h-10">Немає опису</p>
                )}
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center">
                  <span>{new Date(template.createdAt).toLocaleDateString('uk-UA')}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                      {(template.templateText.length / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TemplateManager;