import React, { useState, useCallback, useEffect } from 'react';
import { FirmTemplate, UploadedFile, GenerationResult } from '../types';
import { getTemplates } from '../services/storageService';
import { generateExpertConclusion } from '../services/geminiService';
import { UploadIcon, DocumentTextIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, CopyIcon, PrinterIcon } from './Icons';

const EXPERTS = ['Гомба Ю.В.', 'Дан Т.О.', 'Білаш Л.П.', 'Палчей Я.В.'];

const MONTHS_UA = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

const LOGO_SVG = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
\t viewBox="0 0 30 30" style="enable-background:new 0 0 30 30;" xml:space="preserve" width="80px" height="80px">
<path d="M24.4,5.6c-0.8-1.3-2-2.4-3.4-3.2c-0.5-0.2-0.9,0.2-0.8,0.8c0.2,1.1-0.2,2.5-1.3,3.4C18,7.3,16.6,7.2,15.5,6.9
\tC15.4,6.9,15.2,7,15.2,7.1v1.3c0.9-0.2,1.9-0.3,2.8-0.1c2.3,0.4,3.8,2.5,3.5,4.8c-0.3,2.3-2.4,3.9-4.7,3.7c-0.5,0-1-0.2-1.5-0.4v1.8
\tc0.9,0.3,1.8,0.9,2.4,1.7c1.4,1.9,1,4.6-0.9,6c-0.5,0.3-1,0.6-1.6,0.7v2.7h-0.6v-2.7c-0.5-0.1-1-0.4-1.6-0.7
\tc-1.9-1.4-2.3-4.1-0.9-6c0.6-0.8,1.4-1.4,2.4-1.7v-1.8c-0.5,0.2-1,0.4-1.5,0.4c-2.3,0.2-4.4-1.4-4.7-3.7c-0.3-2.3,1.3-4.4,3.5-4.8
\tc0.9-0.2,1.9-0.1,2.8,0.1V7.1c-0.1-0.1-0.2-0.2-0.3-0.2C13.4,7.2,12,7.3,11.1,6.6c-1-0.9-1.5-2.3-1.3-3.4C9.9,2.6,9.4,2.2,9,2.4
\tC7.6,3.3,6.4,4.4,5.6,5.6C5.3,6.1,5.9,6.6,6.4,6.3c1-0.6,2.3-0.7,3.6-0.3c0.1,0,0.2,0,0.3-0.1c0-0.1,0-0.2-0.1-0.3
\tc-0.4-1-0.3-2.1,0.3-3c1.4,0,2.8,0.5,4,1.3c0.3,0.2,0.7,0.2,1,0c1.2-0.8,2.7-1.3,4-1.3c0.6,0.9,0.7,2,0.3,3c0,0.1-0.1,0.2-0.1,0.3
\tc0.1,0.1,0.2,0.1,0.3,0.1c1.3-0.4,2.5-0.3,3.6,0.3C24.1,6.6,24.7,6.1,24.4,5.6z M14.4,23.1c-0.7,0.5-1.7,0.3-2.2-0.4
\tc-0.5-0.7-0.3-1.7,0.4-2.2c0.4-0.3,0.9-0.4,1.4-0.2l0.4,0.2V23.1z M15.6,20.5l0.4-0.2c0.5-0.2,1-0.1,1.4,0.2
\tc0.7,0.5,0.9,1.5,0.4,2.2C17.3,23.4,16.3,23.6,15.6,23.1V20.5z M15,15.7c-1.5,0-2.8-1-3.1-2.5c-0.3-1.5,0.6-2.9,2-3.4
\tc0.4-0.1,0.7-0.2,1.1-0.2c0.4,0,0.7,0,1.1,0.2c1.4,0.5,2.3,1.9,2,3.4C17.8,14.6,16.5,15.7,15,15.7z"/>
</svg>`;

const STANDARD_HEADER_HTML = `
<table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: none; font-family: 'Times New Roman', serif;">
    <tr style="border: none;">
        <td style="width: 20%; vertical-align: top; text-align: center; border: none !important; padding: 0; padding-top: 10px;">
             [ЛОГОТИП]
        </td>
        <td style="vertical-align: top; text-align: center; border: none !important; padding: 0;">
            <div style="text-align: center; font-weight: bold; margin-bottom: 5px; font-size: 12pt;">
                ЗАКАРПАТСЬКА ТОРГОВО-ПРОМИСЛОВА ПАЛАТА
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px; padding: 0 40px; font-size: 12pt;">
                <span style="font-weight: bold;">ХУСТСЬКЕ ВІДДІЛЕННЯ</span>
                <span>телефон 5-51-75</span>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <h1 style="font-size: 18pt; font-weight: bold; margin: 0;">ЕКСПЕРТНИЙ ВИСНОВОК № [НОМЕР_ВИСНОВКУ]</h1>
                <p style="margin: 5px 0 0 0; font-size: 12pt;">від «[ДЕНЬ]» [МІСЯЦЬ] [РІК] р.</p>
            </div>
        </td>
    </tr>
</table>
`;

const ReportGenerator: React.FC = () => {
  const [templates, setTemplates] = useState<FirmTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedExpert, setSelectedExpert] = useState<string>('');
  const [conclusionNumber, setConclusionNumber] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  const [useStandardHeader, setUseStandardHeader] = useState<boolean>(true);
  const [includeLogo, setIncludeLogo] = useState<boolean>(true);

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
      setError(null); 
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
      let finalTemplateText = template.templateText;

      if (useStandardHeader) {
          const dateObj = new Date(startDate);
          const day = dateObj.getDate().toString().padStart(2, '0');
          const month = MONTHS_UA[dateObj.getMonth()];
          const year = dateObj.getFullYear();

          let header = STANDARD_HEADER_HTML
              .replace('[ЛОГОТИП]', includeLogo ? LOGO_SVG : '')
              .replace('[НОМЕР_ВИСНОВКУ]', conclusionNumber || '___')
              .replace('[ДЕНЬ]', day)
              .replace('[МІСЯЦЬ]', month)
              .replace('[РІК]', year.toString());

          finalTemplateText = header + finalTemplateText;
      }

      const genResult = await generateExpertConclusion(
          files,
          finalTemplateText,
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

        const styleSheets = Array.from(document.styleSheets);
        let proseStyles = '';
        try {
            styleSheets.forEach(sheet => {
                try {
                    Array.from(sheet.cssRules || []).forEach(rule => {
                        if (rule.cssText.includes('.prose-document')) {
                            proseStyles += rule.cssText + '\n';
                        }
                    });
                } catch (e) { }
            });
        } catch (e) {}

        printWindow.document.write('<!DOCTYPE html><html><head><title>Друк Висновку</title>');
        printWindow.document.write(`
            <style>
                body { margin: 0; padding: 0; background: #fff; }
                @page { size: A4; margin: 2cm; }
                ${proseStyles}
                .prose-document {
                    width: 100% !important;
                    max-width: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    background: transparent !important;
                }
            </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(`<div class="prose-document">${printContent.innerHTML}</div>`);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 1000);
    }, []);


  return (
    <div className="mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <div className="lg:col-span-4 space-y-6">
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
                </div>

                <div>
                    <div className="flex items-center">
                        <input
                            id="useStandardHeader"
                            type="checkbox"
                            checked={useStandardHeader}
                            onChange={(e) => setUseStandardHeader(e.target.checked)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                        />
                        <label htmlFor="useStandardHeader" className="ml-2 block text-sm text-slate-900 font-medium">
                            Додати стандартну шапку ТПП
                        </label>
                    </div>
                    {useStandardHeader && (
                        <div className="flex items-center ml-6 mt-2 animate-fade-in">
                            <input
                                id="includeLogo"
                                type="checkbox"
                                checked={includeLogo}
                                onChange={(e) => setIncludeLogo(e.target.checked)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                            />
                            <label htmlFor="includeLogo" className="ml-2 block text-sm text-slate-700">
                                Додати логотип
                            </label>
                        </div>
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

      <div className="lg:col-span-8 bg-slate-600 rounded-xl shadow-inner border border-slate-700 flex flex-col h-[80vh] lg:h-auto min-h-[600px]">
        <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-xl text-slate-200">
            <h3 className="font-semibold flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-primary-400" />
                Попередній перегляд документа
            </h3>
            {result?.fullText && (
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 text-slate-200 transition-colors"
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
                <div className="bg-white shadow-2xl w-[21cm] min-h-[29.7cm] p-[2cm] text-black transition-all origin-top flex-shrink-0">
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