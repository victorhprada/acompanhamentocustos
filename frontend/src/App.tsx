import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import CompaniesList from './pages/Companies/CompaniesList';
import CompanyDetail from './pages/Companies/CompanyDetail';
import Login from './pages/Login';
import AuditLog from './pages/AuditLog';
import ExportModal from './components/ExportModal';
import { supabase } from './lib/supabase';

const queryClient = new QueryClient();

// Auth types
interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'analyst' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const profileLoadingRef = useRef(false);

  async function loadUserProfile(userId: string) {
    if (profileLoadingRef.current) return;
    profileLoadingRef.current = true;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(profile as User);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
      profileLoadingRef.current = false;
    }
  }

  useEffect(() => {
    // Only use onAuthStateChange to avoid lock conflicts
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange will handle profile loading
    if (!data.user) {
      setLoading(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth Guard component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  const linkClass = (path: string) =>
    `block px-4 py-2 text-sm rounded-lg transition ${
      location.pathname === path
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`;

  const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    analyst: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-800',
  };

  const roleLabels = {
    admin: 'Administrador',
    analyst: 'Analista',
    viewer: 'Visualizador',
  };

  return (
    <div className="w-64 bg-white shadow-md min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-lg font-bold text-gray-800">Acompanhamento de Custos</h1>
        <p className="text-xs text-gray-500">Controladoria</p>
      </div>
      
      <nav className="space-y-1 flex-1">
        <Link to="/" className={linkClass('/')}>📊 Dashboard</Link>
        <Link to="/companies" className={linkClass('/companies')}>🏢 Empresas</Link>
        <Link to="/audit" className={linkClass('/audit')}>📋 Audit Log</Link>
      </nav>
      
      {/* User info and logout */}
      {user && (
        <div className="mt-auto pt-4 border-t border-gray-200">
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-700 truncate">{user.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${roleColors[user.role]}`}>
              {roleLabels[user.role]}
            </span>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            🚪 Sair
          </button>
        </div>
      )}
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-right" closeButton />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <AuthGuard>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/companies"
              element={
                <AuthGuard>
                  <Layout>
                    <CompaniesList />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/companies/:id"
              element={
                <AuthGuard>
                  <Layout>
                    <CompanyDetail />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route
              path="/audit"
              element={
                <AuthGuard>
                  <Layout>
                    <AuditLog />
                  </Layout>
                </AuthGuard>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Dashboard() {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const MESES_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  function gerarMeses(ano: number) {
    return MESES_PT.map((nome, i) => ({
      value: `${ano}-${String(i + 1).padStart(2, '0')}-01`,
      label: `${nome}/${ano}`,
    }));
  }

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const meses = gerarMeses(selectedYear);
  const [selectedMonth, setSelectedMonth] = useState(
    selectedYear === now.getFullYear()
      ? meses[now.getMonth()]?.value
      : meses[0]?.value
  );

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${API_BASE}/dashboard?mes_ano=${selectedMonth}`);
        if (res.ok) {
          const data = await res.json();
          setKpis(data);
        }
      } catch (e) {
        console.error('Failed to fetch dashboard:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedMonth]);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val || 0);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-sm text-gray-500 block mb-1">Ano:</label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => {
                const y = parseInt(e.target.value);
                if (y >= 2020 && y <= 2099) {
                  setSelectedYear(y);
                  setSelectedMonth(gerarMeses(y)[0].value);
                }
              }}
              className="border rounded px-3 py-1.5 text-sm w-24 bg-white"
              min={2020}
              max={2099}
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">Mês:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm bg-white min-w-[160px]"
            >
              {meses.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : kpis ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <StatCard title="Empresas Ativas" value={formatNumber(kpis.total_empresas_ativas)} />
            <StatCard title="Registros no Mês" value={formatNumber(kpis.total_registros)} />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard
              title="Total Elegíveis Totalpass/Gympass"
              value={formatNumber(kpis.kpis?.total_elegiveis_totalpass_gympass)}
              icon="👥"
            />
            <KPICard
              title="Total Nº Vidas"
              value={formatNumber(kpis.kpis?.total_nr_vidas)}
              icon="❤️"
            />
            <KPICard
              title="Total Valor Vidas"
              value={formatMoney(kpis.kpis?.total_valor_vidas)}
              icon="💰"
            />
            <KPICard
              title="Total Custo por Cliente"
              value={formatMoney(kpis.kpis?.total_custo_por_cliente)}
              icon="📊"
            />
            <KPICard
              title="Total Valor Faturado"
              value={formatMoney(kpis.kpis?.total_valor_faturado)}
              icon="💵"
            />
          </div>

          {/* Export button */}
          <div className="mt-6">
            <button
              onClick={() => setShowExport(true)}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
            >
              📥 Exportar Excel
            </button>
          </div>

          {showExport && (
            <ExportModal mesAno={selectedMonth} onClose={() => setShowExport(false)} />
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-400">Erro ao carregar dados</div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
}

function KPICard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <p className="text-xs font-medium text-gray-500 uppercase">{title}</p>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="text-center py-20">
      <p className="text-6xl font-bold text-gray-300">404</p>
      <p className="text-gray-500 mt-4">Página não encontrada</p>
    </div>
  );
}

export default App;
