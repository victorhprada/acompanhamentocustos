import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../services/api';

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  changed_by: string | null;
  changed_at: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filterTable, setFilterTable] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const limit = 50;

  useEffect(() => {
    fetchLogs();
  }, [offset, filterTable, filterAction]);

  // Reset expandedId when logs change (pagination/filters)
  useEffect(() => {
    setExpandedId(null);
  }, [offset, filterTable, filterAction]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (filterTable) params.set('table_name', filterTable);
      if (filterAction) params.set('action', filterAction);

      const data = await fetchApi<{ items: AuditLog[]; total: number; limit: number; offset: number }>(`/audit-logs?${params}`);
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    } finally {
      setLoading(false);
    }
  }

  const actionColors: Record<string, string> = {
    INSERT: 'bg-green-100 text-green-800',
    UPDATE: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
  };

  const formatJson = (data: Record<string, any> | null) => {
    if (!data) return '—';
    return JSON.stringify(data, null, 2);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📋 Audit Log</h2>
        <Link to="/" className="text-sm text-blue-600 hover:underline">← Voltar</Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex gap-4 flex-wrap">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Tabela:</label>
          <select
            value={filterTable}
            onChange={(e) => { setFilterTable(e.target.value); setOffset(0); }}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            <option value="companies">Empresas</option>
            <option value="monthly_records">Registros Mensais</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Ação:</label>
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setOffset(0); }}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            <option value="INSERT">Criação</option>
            <option value="UPDATE">Alteração</option>
            <option value="DELETE">Exclusão</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-500 self-end">
          {total} registros · Página {Math.floor(offset / limit) + 1} de {totalPages || 1}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
          Nenhum registro encontrado
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Data/Hora</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Tabela</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Ação</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-600 w-40">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{formatDateTime(log.changed_at)}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{log.table_name}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${actionColors[log.action] || 'bg-gray-100'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        {expandedId === log.id ? 'Fechar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded detail */}
          {expandedId && logs.find(l => l.id === expandedId) && (() => {
            const log = logs.find(l => l.id === expandedId)!;
            return (
              <div className="bg-white rounded-lg shadow p-4 mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Detalhe: {log.table_name} · {log.action} · {formatDateTime(log.changed_at)}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs text-gray-500 mb-1">Valores Anteriores</h4>
                    <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto max-h-48">{formatJson(log.old_values)}</pre>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500 mb-1">Novos Valores</h4>
                    <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto max-h-48">{formatJson(log.new_values)}</pre>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Alterado por: {log.changed_by || 'Sistema'} · ID do registro: {log.record_id}
                </p>
              </div>
            );
          })()}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 rounded text-sm bg-white border disabled:opacity-50"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setOffset(Math.min((totalPages - 1) * limit, offset + limit))}
                disabled={offset + limit >= total}
                className="px-4 py-2 rounded text-sm bg-white border disabled:opacity-50"
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
