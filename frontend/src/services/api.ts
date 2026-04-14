import { Company, MonthlyRecord } from '../types';
import { supabase } from '../lib/supabase';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  // Get current session token with a 5s timeout to prevent hanging on refresh races
  const sessionResult = await Promise.race([
    supabase.auth.getSession(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Auth session timeout')), 5000)
    ),
  ]);
  const token = sessionResult.data.session?.access_token;

  const headers: Record<string, any> = { 
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options?.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  
  if (response.status === 401) {
    // Session expired - redirect to login
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  if (response.status === 204) return null as T;
  return response.json();
}

// Companies
export const getCompanies = (activeOnly = true) =>
  fetchApi<Company[]>(`/companies?active_only=${activeOnly}`);

export const getCompany = (id: string) =>
  fetchApi<Company>(`/companies/${id}`);

export const createCompany = (data: Partial<Company>) =>
  fetchApi<Company>('/companies', { method: 'POST', body: JSON.stringify(data) });

export const updateCompany = (id: string, data: Partial<Company>) =>
  fetchApi<Company>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deactivateCompany = (id: string) =>
  fetchApi<Company>(`/companies/${id}/deactivate`, { method: 'POST' });

export const activateCompany = (id: string) =>
  fetchApi<Company>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify({ is_active: true }) });

export const deleteCompany = (id: string) =>
  fetchApi<void>(`/companies/${id}`, { method: 'DELETE' });

// Monthly Records
export const getMonthlyRecords = (companyId: string, mesAno?: string) => {
  const params = mesAno ? `?mes_ano=${mesAno}` : '';
  return fetchApi<MonthlyRecord[]>(`/companies/${companyId}/monthly${params}`);
};

export const getMonthlyRecord = (id: string) =>
  fetchApi<MonthlyRecord>(`/monthly/${id}`);

export const createMonthlyRecord = (data: Partial<MonthlyRecord>, propagate = true) =>
  fetchApi<MonthlyRecord>(`/monthly?propagate=${propagate}`, { method: 'POST', body: JSON.stringify(data) });

export const updateMonthlyRecord = (id: string, data: Partial<MonthlyRecord>, propagate = true) =>
  fetchApi<MonthlyRecord>(`/monthly/${id}?propagate=${propagate}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteMonthlyRecord = (id: string, propagate = true) =>
  fetchApi<void>(`/monthly/${id}?propagate=${propagate}`, { method: 'DELETE' });

// Import
export const uploadImportFile = async (file: File) => {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${API_BASE}/import/upload`, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json() as Promise<{
    file_path: string;
    sheets: Array<{
      name: string;
      mes_ano: string | null;
      columns: Array<{ index: number; label: string }>;
      preview: string[][];
    }>;
  }>;
};

export const processImport = (body: {
  file_path: string;
  mapping: Record<string, string>;
  sheets: Array<{ name: string; mes_ano: string; include: boolean }>;
  propagate?: boolean;
  propagate_mes_ano?: string;
}, signal?: AbortSignal) =>
  fetchApi<{ companies_created: number; companies_updated: number; records_created: number; records_updated: number; errors: string[] }>(
    '/import/process',
    { method: 'POST', body: JSON.stringify(body), signal },
  );
