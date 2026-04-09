import { Company, MonthlyRecord } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
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

export const deleteMonthlyRecord = (id: string) =>
  fetchApi<void>(`/monthly/${id}`, { method: 'DELETE' });
