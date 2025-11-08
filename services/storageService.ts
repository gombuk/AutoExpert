import { FirmTemplate } from '../types';

const STORAGE_KEY = 'autoexpert_templates_v1';

export const getTemplates = (): FirmTemplate[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load templates", e);
    return [];
  }
};

export const saveTemplate = (template: FirmTemplate): void => {
  const templates = getTemplates();
  const existingIndex = templates.findIndex(t => t.id === template.id);
  
  if (existingIndex >= 0) {
    templates[existingIndex] = template;
  } else {
    templates.push(template);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

export const deleteTemplate = (id: string): void => {
  const templates = getTemplates().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};
