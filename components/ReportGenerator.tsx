
import React, { useState, useCallback, useEffect } from 'react';
import { FirmTemplate, UploadedFile, GenerationResult } from '../types';
import { getTemplates } from '../services/storageService';
import { generateExpertConclusion } from '../services/geminiService';
import { UploadIcon, DocumentTextIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, CopyIcon, PrinterIcon } from './Icons';

const EXPERTS = ['Гомба Ю.В.', 'Дан Т.О.', 'Білаш Л.П.', 'Палчей Я.В.'];

const ReportGenerator: React.FC = () => {
  const [templates, setTemplates] = useState<FirmTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedExpert, setSelectedExpert] = useState<string>('');
  const [conclusionNumber, setConclusionNumber] = useState<string>('');
  // Default start date to today, formatted as YYYY-MM-DD for the input[type="date"]
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadedTemplates = getTemplates();
    setTemplates(loadedTemplates);
    if (loadedTemplates.length > 0) {
       // Optional: select first by default
       // setSelectedTemplateId(loadedTemplates[0].id);
    }
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles: UploadedFile[] = [];
      for (let i = 0; i < event.target.files.length; i++) {
        const file = event.target.files[i];
        const id = Date.now() + i + '';
        
        // Basic preview for images
        let previewUrl: string | undefined = undefined;
        let base64: string | undefined = undefined;

        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
             previewUrl = URL.createObjectURL(file);
             try {
                base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
             } catch (e) {
                 console.error("Error reading file to base64", e);
             }
        }

        newFiles.push({ file, id, previewUrl, base64, mimeType: file.type });
      }
      setFiles(prev => [...prev, ...newFiles]);
      setError(null); // clear prev errors on new upload
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
        const fileToRemove = prev.find(f => f.id === id);
        if (fileToRemove?.previewUrl) {
            URL.revokeObjectURL(fileToRemove.previewUrl);
        }
        return prev.filter(f => f.id !== id)
    });
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      setError("Будь ласка, оберіть шаблон фірми.");
      return;
    }
    if (!selectedExpert) {
      setError("Будь ласка, оберіть експерта.");
      return;
    }
    if (files.length === 0) {
      setError("Будь ласка, завантажте хоча б один документ.");
      return;
    }

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) {
        setError("Обраний шаблон не знайдено.");
        return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const genResult = await generateExpertConclusion(
          files,
          template.templateText,
          selectedExpert,
          conclusionNumber,
          startDate,
          endDate
      );
      setResult(genResult);
    } catch (err: any) {
      setError(err.message || "Виникла помилка під час генерації. Спробуйте ще раз.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

    const copyToClipboard = () => {
        const element = document.getElementById('generated-result-content');
        if (element && navigator.clipboard) {
             const selection = window.getSelection();
             const range = document.createRange();
             range.selectNodeContents(element);
             selection?.removeAllRanges();
             selection?.addRange(range);
             
             try {
                 document.execCommand('copy'); 
                 setCopied(true);
                 setTimeout(() => setCopied(false), 2000);
             } catch (err) {
                 navigator.clipboard.writeText(element.innerText).then(() => {
                     setCopied(true);
                     setTimeout(() => setCopied(false), 2000);
                 });
             }
             selection?.removeAllRanges();
        }
    };

    const handlePrint = useCallback(() => {
        const printContent = document.getElementById('generated-result-content');
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Будь ласка, дозвольте спливаючі вікна для друку.");
            return;
        }

        printWindow.document.write('<html><head><title>Друк Висновку</title>');
        printWindow.document.write(`
            <style>
                body { 
                    font-family: 'Times New Roman', serif; 
                    font-size: 12pt; 
                    line-height: 1.5; 
                    color: #000;
                    background: #fff;
                }
                @page { 
                    size: A4; 
                    margin: 2cm; 
                }
                /* Re-apply basic prose styles for the print window specifically */
                .prose-document p { margin-bottom: 1em; }
                .prose-document strong, .prose-document b { font-weight: bold; }
                .prose-document em, .prose-document i { font-style: italic; }
                .prose-document ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
                .prose-document ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
                .prose-document li { margin-bottom: 0.5em; }
                .prose-document table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
                .prose-document th, .prose-document td { border: 1px solid black; padding: 5px; text-align: left; }
                .prose-document h1 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; }
                .prose-document h2 { font-size: 1.25em; font-weight: bold; margin-bottom: 0.5em; }
            </style>
        `);
        printWindow.document.write('</head><body>');
        // Wrap in the same class to apply the styles above
        printWindow.document.write(`<div class="prose-document">${printContent.innerHTML}</div>`);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        // Wait a moment for styles to apply then print
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 500);
    }, []);


  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
      
      {/* Left Sidebar / Input Area */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
                <span className="bg-primary-100 text-primary-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Налаштування
            </h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Шаблон фірми *</label>
                    <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                        <option value="">-- Оберіть фірму --</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    {templates.length === 0 && (
                        <p className="text-sm text-amber-600 mt-2">
                            Немає доступних шаблонів. Додайте їх у вкладці "Шаблони".
                        </p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Експерт *</label>
                    <select
                        value={selectedExpert}
                        onChange={(e) => setSelectedExpert(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                        <option value="">-- Оберіть експерта --</option>
                        {EXPERTS.map(expert => (
                            <option key={expert} value={expert}>{expert}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">№ Висновку</label>
                    <input
                        type="text"
                        value={conclusionNumber}
                        onChange={(e) => setConclusionNumber(e.target.value)}
                        placeholder="напр. 123/24"
                        className="w-full p-2.5 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1" title="Дата початку, реєстрації та самого висновку">Дата початку</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Дата закінчення</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
                <span className="bg-primary-100 text-primary-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Завантажте Документи
            </h2>
            
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadIcon className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 font-medium">
                    Натисніть або перетягніть файли сюди
                </p>
                <p className="text-xs text-slate-400 mt-1">
                    JPG, PNG, PDF (бажано зображення для кращої точності)
                </p>
            </div>

            {files.length > 0 && (
                <ul className="mt-4 space-y-2">
                    {files.map(file => (
                        <li key={file.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md border border-slate-100 text-sm">
                            <div className="flex items-center gap-2 truncate">
                                {file.mimeType?.startsWith('image/') ? (
                                     <img src={file.previewUrl} alt="preview" className="w-8 h-8 object-cover rounded" />
                                ) : (
                                    <DocumentTextIcon className="w-8 h-8 text-slate-400 p-1" />
                                )}
                                <span className="truncate max-w-[180px]" title={file.file.name}>{file.file.name}</span>
                            </div>
                            <button onClick={() => removeFile(file.id)} className="text-slate-400 hover:text-red-500 p-1">
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>

        <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedTemplateId || !selectedExpert || files.length === 0}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 shadow-md transition-all
                ${isGenerating || !selectedTemplateId || !selectedExpert || files.length === 0
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 hover:shadow-lg active:scale-[0.98]'
                }`}
        >
            {isGenerating ? (
                <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Аналізуємо та Генеруємо...
                </>
            ) : (
                <>
                    <SparklesIcon className="w-5 h-5" />
                    Згенерувати Висновок
                </>
            )}
        </button>

        {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-md">
                {error}
            </div>
        )}

        {/* Extracted Data Summary (Visible if available) */}
        {result?.extractedData && Object.keys(result.extractedData).length > 0 && (
             <div className="bg-green-50 p-4 rounded-xl border border-green-100 animate-fade-in">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    Знайдені Дані
                </h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-green-700 font-medium">ВМД:</dt>
                    <dd className="text-slate-700 truncate" title={result.extractedData.vmd}>{result.extractedData.vmd || '-'}</dd>
                    
                    <dt className="text-green-700 font-medium">Додаток №:</dt>
                    <dd className="text-slate-700 truncate">{result.extractedData.appendixNumber || '-'}</dd>
                    
                    <dt className="text-green-700 font-medium">Дата дод.:</dt>
                    <dd className="text-slate-700 truncate">{result.extractedData.appendixDate || '-'}</dd>
                    
                    <dt className="text-green-700 font-medium">Кількість:</dt>
                    <dd className="text-slate-700 truncate">{result.extractedData.quantity || '-'}</dd>
                </dl>
                 {result.extractedData.uktzied && result.extractedData.uktzied.length > 0 && (
                     <div className="mt-2">
                         <span className="text-green-700 font-medium text-sm">Коди УКТЗЕД:</span>
                         <div className="flex flex-wrap gap-1 mt-1">
                             {result.extractedData.uktzied.map((code, idx) => (
                                 <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">{code}</span>
                             ))}
                         </div>
                     </div>
                 )}
            </div>
        )}
      </div>

      {/* Right Side / Output Area - A4 Styled with HTML rendering */}
      <div className="lg:col-span-3 bg-slate-600 rounded-xl shadow-inner border border-slate-700 flex flex-col h-[80vh] lg:h-auto min-h-[600px]">
        <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-xl text-slate-200">
            <h3 className="font-semibold flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-primary-400" />
                Попередній перегляд документа
            </h3>
            {result?.fullText && (
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary-600 border border-primary-500 rounded hover:bg-primary-700 text-white transition-colors"
                        title="Роздрукувати висновок"
                    >
                        <PrinterIcon className="w-4 h-4" />
                        Друк
                    </button>
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 text-slate-200 transition-colors"
                        title="Копіювати текст"
                    >
                        {copied ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                        {copied ? "Скопійовано!" : "Копіювати"}
                    </button>
                </div>
            )}
        </div>
        <div className="flex-grow p-4 md:p-8 overflow-auto flex justify-center bg-slate-600/50 backdrop-blur-sm">
            {result ? (
                /* A4 Paper Simulation with HTML rendering.
                   Using 'prose-document' class for custom styles from index.html to restore lists, tables, bold etc. 
                */
                <div className="bg-white shadow-2xl w-full max-w-[21cm] min-h-[29.7cm] p-[2.5cm] text-black font-serif text-[12pt] leading-normal transition-all">
                    <div 
                        id="generated-result-content"
                        className="prose-document" 
                        dangerouslySetInnerHTML={{ __html: result.fullText }} 
                    />
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <SparklesIcon className="w-16 h-16 mb-4 text-slate-500 opacity-50" />
                    <p className="text-lg font-medium text-slate-300">Результат з'явиться тут</p>
                    <p className="text-sm mt-2 max-w-xs text-center text-slate-400">
                        Аркуш буде відформатовано згідно з вашим HTML шаблоном
                    </p>
                </div>
            )}
        </div>
      </div>

    </div>
  );
};

export default ReportGenerator;
