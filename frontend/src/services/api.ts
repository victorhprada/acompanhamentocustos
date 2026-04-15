import { Company, MonthlyRecord } from '../types';
import { supabase } from '../lib/supabase';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// ─── Token cache ──────────────────────────────────────────────────────────────
// Kept in sync via onAuthStateChange so fetchApi never needs to call getSession()
// at request time — which races with the Supabase lock bypass and can return null
// immediately after a page reload before the session is restored in memory.
let _token: string | null = null;

supabase.auth.onAuthStateChange((_event, session) => {
  _token = session?.access_token ?? null;
});

// One-time bootstrap: if the module loads before onAuthStateChange fires (e.g.
// during the very first render) try to read the session from storage directly.
supabase.auth.getSession().then(({ data }) => {
  if (data.session?.access_token && !_token) {
    _token = data.session.access_token;
  }
});

async function getToken(): Promise<string | null> {
  if (_token) return _token;
  // Last-resort fallback: session might still be loading
  try {
    const { data } = await supabase.auth.getSession();
    _token = data.session?.access_token ?? null;
  } catch {
    // proceed without token; backend will 401 and we redirect to login
  }
  return _token;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────
export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();

  const headers: Record<string, any> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, { headers, ...options });

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  if (response.status === 204) return null as T;
  return response.json();
}

// ─── Companies ────────────────────────────────────────────────────────────────
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

// ─── Monthly Records ──────────────────────────────────────────────────────────
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

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard = (mesAno: string) =>
  fetchApi<any>(`/dashboard?mes_ano=${mesAno}`);

// ─── Import ───────────────────────────────────────────────────────────────────
export const uploadImportFile = async (file: File) => {
  const token = await getToken();
  const form = new FormData();
  form.append('file', file);

  const response = await fetch(`${API_BASE}/import/upload`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (response.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized'); }
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

// ─── Export ───────────────────────────────────────────────────────────────────
async function downloadXlsx(url: string, filename: string) {
  const token = await getToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (response.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized'); }
  if (!response.ok) throw new Error(`Export failed: ${response.status}`);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export const exportMonthlyXlsx = async (mesAno: string, columns: string[]) => {
  const params = new URLSearchParams({ mes_ano: mesAno });
  if (columns.length) params.set('columns', columns.join(','));
  await downloadXlsx(
    `${API_BASE}/export/monthly?${params}`,
    `registros_mensais_${mesAno || 'todos'}.xlsx`,
  );
};

export const exportRentabilidadeXlsx = async (mesAno: string, columns: string[]) => {
  const params = new URLSearchParams({ mes_ano: mesAno });
  if (columns.length) params.set('columns', columns.join(','));
  await downloadXlsx(
    `${API_BASE}/export/rentabilidade?${params}`,
    `faturamento_mensal_${mesAno}.xlsx`,
  );
};
