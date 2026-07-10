import { Company, MonthlyRecord } from '../types';
import { supabase } from '../lib/supabase';
import { isTokenExpiringSoon } from '../lib/session';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// ─── Token cache ──────────────────────────────────────────────────────────────
// Kept in sync via onAuthStateChange so fetchApi never needs to call getSession()
// at request time — which races with the Supabase lock bypass and can return null
// immediately after a page reload before the session is restored in memory.
let _token: string | null = null;
let _refreshPromise: Promise<string | null> | null = null;

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

async function refreshAccessToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const result = await Promise.race([
        supabase.auth.refreshSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('refresh timeout')), 10_000)
        ),
      ]);
      const { data, error } = result;
      if (error || !data.session?.access_token) {
        _token = null;
        return null;
      }
      _token = data.session.access_token;
      return _token;
    } catch {
      _token = null;
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

async function getToken(): Promise<string | null> {
  if (_token && !isTokenExpiringSoon(_token)) return _token;

  // Token missing or about to expire — refresh proactively
  const refreshed = await refreshAccessToken();
  if (refreshed) return refreshed;

  // Fallback: read whatever is still in storage
  try {
    const { data } = await supabase.auth.getSession();
    _token = data.session?.access_token ?? null;
    if (_token && isTokenExpiringSoon(_token)) {
      return refreshAccessToken();
    }
  } catch {
    // proceed without token; backend will 401
  }
  return _token;
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

async function fetchWithAuth(path: string, options?: RequestInit, retried = false): Promise<Response> {
  const token = await getToken();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    // Network failure — surface quickly instead of leaving UI on "Carregando..."
    throw err instanceof Error ? err : new Error('Network error');
  }

  if (response.status === 401 && !retried) {
    const newToken = await refreshAccessToken();
    if (newToken && newToken !== token) {
      return fetchWithAuth(path, options, true);
    }
    redirectToLogin();
    throw new Error('Unauthorized');
  }

  if (response.status === 401) {
    redirectToLogin();
    throw new Error('Unauthorized');
  }

  return response;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────
export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(path, options);

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

export const getDashboardHistory = (year: number) =>
  fetchApi<{
    year: number;
    series: Array<{
      mes_ano: string;
      total_vidas_cobradas: number;
      total_valor_vidas: number;
      total_custo_por_cliente: number;
      total_faturamento: number;
    }>;
  }>(`/dashboard/history?year=${year}`);

// ─── Import ───────────────────────────────────────────────────────────────────
export const uploadImportFile = async (file: File) => {
  const form = new FormData();
  form.append('file', file);

  const response = await fetchWithAuth('/import/upload', {
    method: 'POST',
    body: form,
  });

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
async function downloadXlsx(path: string, filename: string, retried = false) {
  const token = await getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (response.status === 401 && !retried) {
    const newToken = await refreshAccessToken();
    if (newToken) return downloadXlsx(path, filename, true);
    redirectToLogin();
    throw new Error('Unauthorized');
  }
  if (response.status === 401) {
    redirectToLogin();
    throw new Error('Unauthorized');
  }
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
    `/export/monthly?${params}`,
    `registros_mensais_${mesAno || 'todos'}.xlsx`,
  );
};

export const exportRentabilidadeXlsx = async (mesAno: string, columns: string[]) => {
  const params = new URLSearchParams({ mes_ano: mesAno });
  if (columns.length) params.set('columns', columns.join(','));
  await downloadXlsx(
    `/export/rentabilidade?${params}`,
    `faturamento_mensal_${mesAno}.xlsx`,
  );
};
