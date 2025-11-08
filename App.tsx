import React, { useState } from 'react';
import TemplateManager from './components/TemplateManager';
import ReportGenerator from './components/ReportGenerator';
import { DocumentTextIcon, TemplateIcon } from './components/Icons';

type Tab = 'generator' | 'templates';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('generator');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center shadow-sm rotate-3 hover:rotate-0 transition-transform">
               <DocumentTextIcon className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Auto<span className="text-primary-600">Expert</span>
            </h1>
          </div>
          
          <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('generator')}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === 'generator'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <DocumentTextIcon className={`w-4 h-4 mr-2 ${activeTab === 'generator' ? 'text-primary-500' : 'text-slate-400'}`} />
              Генератор
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === 'templates'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <TemplateIcon className={`w-4 h-4 mr-2 ${activeTab === 'templates' ? 'text-primary-500' : 'text-slate-400'}`} />
              Шаблони
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {activeTab === 'generator' ? <ReportGenerator /> : <TemplateManager />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} AutoExpert. Powered by Google Gemini.
        </div>
      </footer>
    </div>
  );
};

export default App;
