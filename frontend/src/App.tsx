import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import CompaniesList from './pages/Companies/CompaniesList';
import CompanyDetail from './pages/Companies/CompanyDetail';
import Login from './pages/Login';

const queryClient = new QueryClient();

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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Empresas Ativas" value="..." />
        <StatCard title="Registros Mensais" value="..." />
        <StatCard title="Mês Atual" value={new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} />
      </div>
      <p className="text-gray-500 mt-8">Em desenvolvimento - Phase 4</p>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
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
