import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CompaniesList from './pages/Companies/CompaniesList';
import CompanyDetail from './pages/Companies/CompanyDetail';

const queryClient = new QueryClient();

function Sidebar() {
  const location = useLocation();
  const linkClass = (path: string) =>
    `block px-4 py-2 text-sm rounded-lg transition ${
      location.pathname === path
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="w-64 bg-white shadow-md min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-lg font-bold text-gray-800">Acompanhamento de Custos</h1>
        <p className="text-xs text-gray-500">Controladoria</p>
      </div>
      <nav className="space-y-1">
        <Link to="/" className={linkClass('/')}>📊 Dashboard</Link>
        <Link to="/companies" className={linkClass('/companies')}>🏢 Empresas</Link>
      </nav>
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
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/companies" element={<CompaniesList />} />
            <Route path="/companies/:id" element={<CompanyDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
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
