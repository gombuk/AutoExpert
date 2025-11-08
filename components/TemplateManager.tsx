import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FirmTemplate } from '../types';
import { getTemplates, saveTemplate, deleteTemplate } from '../services/storageService';
import { PlusIcon, TrashIcon, TemplateIcon, UploadIcon } from './Icons';
import * as mammoth from 'mammoth';

const TemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<FirmTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<FirmTemplate>>({});
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
  };

  const handleEdit = (template: FirmTemplate) => {
    setCurrentTemplate(template);
    setIsEditing(true);
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
  }

  const handleDocxUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Changed from extractRawText to convertToHtml to preserve formatting
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setCurrentTemplate(prev => ({
        ...prev,
        templateText: result.value
      }));
    } catch (error) {
      console.error("Error reading .docx file:", error);
      alert("Помилка при читанні файлу Word. Переконайтеся, що це коректний .docx файл.");
    } finally {
      // Reset input value so the same file can be selected again if needed
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Назва Фірми / Шаблону *</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="напр., ТОВ 'Рога та Копита'"
                value={currentTemplate.name || ''}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Опис (необов'язково)</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Короткий опис для зручності"
                value={currentTemplate.description || ''}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, description: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">
                  HTML Код Зразка (Шаблону) *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".docx"
                    ref={fileInputRef}
                    onChange={handleDocxUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 text-primary-700 rounded hover:bg-slate-200 transition-colors"
                    title="Завантажити текст з файлу Word (.docx) із збереженням форматування"
                  >
                    <UploadIcon className="w-3.5 h-3.5" />
                    Завантажити з Word (.docx)
                  </button>
                </div>
              </div>
              <span className="block text-xs text-slate-500 font-normal mb-2">
                Вставте HTML-код шаблону або завантажте .docx файл (він автоматично конвертується в HTML для збереження форматування).
              </span>
              <textarea
                className="w-full h-96 p-3 border border-slate-300 rounded-md font-mono text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-y"
                placeholder="<div>Текст зразка...</div>"
                value={currentTemplate.templateText || ''}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, templateText: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setIsEditing(false); setCurrentTemplate({}); }}
                className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors shadow-sm"
              >
                Зберегти Шаблон
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
              <TemplateIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Шаблонів ще немає. Додайте перший!</p>
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-slate-800 truncate" title={template.name}>{template.name}</h3>
                  {template.description && <p className="text-slate-500 text-sm mt-1 line-clamp-2">{template.description}</p>}
                  <p className="text-xs text-slate-400 mt-2">
                    Створено: {new Date(template.createdAt).toLocaleDateString('uk-UA')}
                  </p>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleEdit(template)}
                    className="px-3 py-1.5 text-sm text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
                  >
                    Редагувати
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    title="Видалити"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
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