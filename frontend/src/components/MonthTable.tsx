import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMonthlyRecord, updateMonthlyRecord, deleteMonthlyRecord } from '../services/api';
import { MonthlyRecord } from '../types';

const PRODUCTS = ['Gympass', 'Totalpass', 'Wiipo', 'Flex'];

const MONTHS = [
  '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01',
  '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01',
  '2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01',
];

const COLUMN_GROUPS = {
  'Elegíveis': [
    { key: 'elegiveis_contrato', label: 'Elegíveis Contrato', type: 'number' },
    { key: 'elegiveis', label: 'Elegíveis', type: 'number' },
    { key: 'valor_elegivel', label: 'Valor Elegível', type: 'money' },
    { key: 'valor_final', label: 'Valor Final', type: 'money' },
    { key: 'elegiveis_totalpass_gympass', label: 'Elegíveis Total/Gympass', type: 'number' },
  ],
  'Gympass/Totalpass': [
    { key: 'vidas_cobradas', label: 'Vidas Cobradas', type: 'number' },
    { key: 'nr_vidas', label: 'Nº Vidas', type: 'number' },
    { key: 'valor_vidas', label: 'Valor Vidas', type: 'money' },
  ],
  'Flex': [
    { key: 'nr_cartao_contrato_flex', label: 'Nº Cartão Contrato Flex', type: 'number' },
    { key: 'nr_cartao_carga_flex', label: 'Nº Cartão Carga Flex', type: 'number' },
    { key: 'rs_carregado', label: 'R$ Carregado', type: 'money' },
    { key: 'media_cartao_realizado', label: 'Média Cartão Realizado', type: 'money' },
    { key: 'media_contratada', label: 'Média Contratada', type: 'money' },
  ],
  'Wiipo': [
    { key: 'valor_elegivel_wiipo', label: 'Valor Elegível Wiipo', type: 'money' },
    { key: 'faturamento_wiipo', label: 'Faturamento Wiipo', type: 'money' },
  ],
  'Financeiro': [
    { key: 'mensal_x_rentabilidade', label: 'Mensal x Rentabilidade', type: 'text' },
    { key: 'custo_por_cliente', label: 'Custo por Cliente', type: 'money' },
    { key: 'valor_faturado', label: 'Valor Faturado', type: 'money' },
    { key: 'faturamento', label: 'Faturamento', type: 'money' },
  ],
};

const ALL_COLUMNS = Object.values(COLUMN_GROUPS).flat();
const MAIN_COLUMNS = ['elegiveis', 'valor_final'];
const DATA_FIELDS = ALL_COLUMNS.map(c => c.key);

/** Calculate valor_final from elegíveis, elegíveis_contrato, and valor_elegível */
function calculateValorFinal(form: Record<string, any>): number | null {
  const elegiveis = parseFloat(form.elegiveis) || null;
  const elegiveisContrato = parseFloat(form.elegiveis_contrato) || null;
  const valorElegivel = parseFloat(form.valor_elegivel) || null;
  
  if (elegiveisContrato !== null && elegiveis !== null && valorElegivel !== null) {
    const base = Math.min(elegiveis, elegiveisContrato);
    return base * valorElegivel;
  }
  return null;
}

function formatMonth(dateStr: string) {
  const [year, month] = dateStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year}`
}

function formatMonthFull(dateStr: string) {
  const [year, month] = dateStr.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function formatValue(value: number | undefined, type: string) {
  if (value === undefined || value === null) return '-';
  if (type === 'money') return `R$ ${value.toFixed(2)}`;
  if (type === 'text') return value;
  return value.toString();
}

/** Check if a record was inherited (same values as previous month) */
function isInherited(record: MonthlyRecord, allRecords: MonthlyRecord[]): string | null {
  const recordMonth = record.mes_ano;
  const idx = MONTHS.indexOf(recordMonth);
  if (idx <= 0) return null;
  
  const prevMonth = MONTHS[idx - 1];
  const prevRecord = allRecords.find(r => r.produto === record.produto && r.mes_ano === prevMonth);
  if (!prevRecord) return null;
  
  // Check if all data fields are identical
  const isSame = DATA_FIELDS.every(field => {
    const a = (record as any)[field];
    const b = (prevRecord as any)[field];
    return a === b || (a == null && b == null);
  });
  
  return isSame ? formatMonth(prevMonth) : null;
}

export default function MonthTable({
  companyId,
  selectedMonth: parentMonth,
  records,
}: {
  companyId: string;
  selectedMonth: string;
  records: MonthlyRecord[];
  onRefetch: () => void;
}) {
  const queryClient = useQueryClient();
  const [internalMonth, setInternalMonth] = useState(MONTHS[new Date().getMonth()]);
  const selectedMonth = parentMonth || internalMonth;
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [showAllFields, setShowAllFields] = useState(false);
  const [propagateConfirm, setPropagateConfirm] = useState(false);
  const [propagating, setPropagating] = useState(false);

  const monthRecords = records?.filter((r) => r.mes_ano.startsWith(selectedMonth.slice(0, 7))) || [];

  const createMutation = useMutation({
    mutationFn: (payload: { data: any; propagate: boolean }) =>
      createMonthlyRecord(payload.data, payload.propagate),
    onMutate: () => {
      // If propagate is true, show loading
    },
    onSuccess: () => {
      setEditingProduct(null);
      setPropagating(false);
      queryClient.invalidateQueries({ queryKey: ['monthly', companyId] });
    },
    onError: () => setPropagating(false),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: Partial<MonthlyRecord>; propagate: boolean }) =>
      updateMonthlyRecord(payload.id, payload.data, payload.propagate),
    onMutate: () => {
      // If propagate is true, show loading
    },
    onSuccess: () => {
      setEditingProduct(null);
      setPropagating(false);
      queryClient.invalidateQueries({ queryKey: ['monthly', companyId] });
    },
    onError: () => setPropagating(false),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMonthlyRecord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monthly', companyId] }),
  });

  const handleEditFormChange = (key: string, value: string) => {
    const newForm = { ...editForm, [key]: value };

    // Auto-calculate valor_final when source fields change
    if (['elegiveis', 'elegiveis_contrato', 'valor_elegivel'].includes(key)) {
      const calculated = calculateValorFinal(newForm);
      if (calculated !== null) {
        newForm.valor_final = calculated.toString();
      }
    }

    setEditForm(newForm);
  };

  const startEdit = (record?: MonthlyRecord, productName?: string) => {
    if (record) {
      setEditingProduct(record.produto);
      setEditForm({ ...record });
    } else if (productName) {
      setEditingProduct(productName);
      setEditForm({ company_id: companyId, mes_ano: selectedMonth, produto: productName });
    }
  };

  const doSave = (propagate: boolean) => {
    const data: Record<string, any> = {};
    ALL_COLUMNS.forEach((f) => {
      const val = editForm[f.key];
      if (val !== undefined && val !== null && val !== '') {
        data[f.key] = f.type === 'number' || f.type === 'money' ? parseFloat(val) : val;
      }
    });

    const existing = monthRecords.find((r) => r.produto === editingProduct);

    // Show propagating modal if propagating to future months
    if (propagate) {
      setPropagating(true);
    }

    if (existing?.id) {
      updateMutation.mutate({ id: existing.id, data, propagate });
    } else {
      data.company_id = companyId;
      data.mes_ano = selectedMonth;
      data.produto = editingProduct;
      createMutation.mutate({ data, propagate });
    }
    setPropagateConfirm(false);
  };

  const handleSave = () => {
    // If editing an existing record, show propagation confirmation
    const existing = monthRecords.find((r) => r.produto === editingProduct);
    if (existing) {
      setPropagateConfirm(true);
      return;
    }
    // New record - propagate by default with loading
    setPropagating(true);
    doSave(true);
  };

  const handleDelete = (record: MonthlyRecord) => {
    if (confirm(`Excluir registro de ${record.produto}?`)) {
      deleteMutation.mutate(record.id);
    }
  };

  const visibleColumns = showAllFields ? ALL_COLUMNS : ALL_COLUMNS.filter((c) => MAIN_COLUMNS.includes(c.key));

  return (
    <div>
      {/* Month selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Selecione o Mês:</h3>
        <div className="flex gap-2 flex-wrap">
          {MONTHS.map((m) => {
            const hasRecords = records?.some(r => r.mes_ano === m);
            return (
              <button
                key={m}
                onClick={() => setInternalMonth(m)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition relative ${
                  m === selectedMonth
                    ? 'bg-blue-600 text-white shadow-sm'
                    : hasRecords
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {formatMonth(m)}
                {hasRecords && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggle all fields */}
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-gray-500">
          Mostrando: {formatMonthFull(selectedMonth)}
        </p>
        <button
          onClick={() => setShowAllFields(!showAllFields)}
          className="text-sm text-blue-600 hover:underline"
        >
          {showAllFields ? '▲ Principais' : '▼ Todos os campos'}
        </button>
      </div>

      {/* Main table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 border-r w-36 sticky left-0 bg-gray-100 z-10">Produto</th>
                {visibleColumns.map((col) => (
                  <th key={col.key} className="px-3 py-2 text-right font-medium text-gray-600 border-r min-w-[110px] text-xs">
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium text-gray-600 w-40">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {PRODUCTS.map((product) => {
                const record = monthRecords.find((r) => r.produto === product);
                const editing = editingProduct === product;
                const inheritedFrom = record ? isInherited(record, records || []) : null;

                if (editing) {
                  const autoValorFinal = calculateValorFinal(editForm);

                  return (
                    <tr key={product} className="bg-blue-50">
                      <td className="px-3 py-2 font-medium border-r sticky left-0 bg-blue-50 z-10">{product}</td>
                      {visibleColumns.map((col) => {
                        const isValorFinal = col.key === 'valor_final';

                        return (
                          <td key={col.key} className="px-3 py-2 border-r relative">
                            {isValorFinal ? (
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editForm[col.key] ?? ''}
                                  onChange={(e) => setEditForm({ ...editForm, [col.key]: e.target.value })}
                                  className={`w-full border rounded px-2 py-1 text-right focus:ring-2 focus:outline-none text-xs ${autoValorFinal !== null && !editForm[col.key] ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200' : 'focus:ring-blue-500 focus:outline-none'}`}
                                  placeholder={autoValorFinal !== null && !editForm[col.key] ? `R$ ${autoValorFinal.toFixed(2)}` : col.label}
                                />
                                {autoValorFinal !== null && !editForm[col.key] && (
                                  <div className="absolute -top-4 left-0 right-0 text-[9px] text-center text-emerald-600 bg-blue-50 leading-none font-medium">
                                    ↻ calculado automaticamente
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input
                                type={col.type === 'money' ? 'number' : col.type === 'number' ? 'number' : 'text'}
                                step={col.type === 'money' ? '0.01' : undefined}
                                value={editForm[col.key] ?? ''}
                                onChange={(e) => handleEditFormChange(col.key, e.target.value)}
                                className={`w-full border rounded px-2 py-1 text-right focus:ring-2 focus:outline-none text-xs ${['elegiveis', 'elegiveis_contrato', 'valor_elegivel'].includes(col.key) && autoValorFinal !== null ? 'border-emerald-200' : 'focus:ring-blue-500'}`}
                                placeholder={col.label}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={handleSave} className="text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-green-100 rounded">
                            ✓ Salvar
                          </button>
                          <button onClick={() => { setEditingProduct(null); setPropagateConfirm(false); }} className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1 bg-gray-100 rounded">✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={product} className={`hover:bg-gray-50 ${inheritedFrom ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-3 py-2 font-medium border-r sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-1">
                        {product}
                        {inheritedFrom && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full" title={`Herdado de ${inheritedFrom}`}>
                            ↻ {inheritedFrom}
                          </span>
                        )}
                      </div>
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-3 py-2 text-right border-r font-mono text-xs">
                        {record ? formatValue(record[col.key as keyof MonthlyRecord] as number, col.type) : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => startEdit(record, product)} className="text-blue-600 hover:text-blue-800 text-xs">
                          {record ? 'Editar' : '+ Adicionar'}
                        </button>
                        {record && (
                          <button onClick={() => handleDelete(record)} className="text-red-600 hover:text-red-800 text-xs">
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field groups detail - shows all groups with values */}
      {showAllFields && records && records.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Detalhamento por Grupo</h4>
          {Object.entries(COLUMN_GROUPS).map(([groupName, columns]) => (
            <div key={groupName} className="mb-6 last:mb-0">
              <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2 pb-1 border-b">{groupName}</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {columns.map((col) => {
                  const record = monthRecords.find(r => r.produto === PRODUCTS[0]);
                  const val = record ? (record as any)[col.key] : null;
                  return (
                    <div key={col.key} className="bg-gray-50 rounded p-3">
                      <label className="block text-xs text-gray-400 mb-1">{col.label}</label>
                      <div className="text-sm font-mono font-medium">
                        {val ? formatValue(val, col.type) : <span className="text-gray-400">-</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Propagation confirmation modal */}
      {propagateConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Propagar alterações?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Deseja aplicar essas alterações nos <strong>meses seguintes</strong> até Dezembro/2026?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => doSave(true)}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                ✓ Sim, propagar
              </button>
              <button
                onClick={() => doSave(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 text-sm"
              >
                Não, só este mês
              </button>
              <button
                onClick={() => { setPropagateConfirm(false); setEditingProduct(null); }}
                className="px-4 bg-gray-100 text-gray-500 py-2 rounded-lg hover:bg-gray-200 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Propagating loading modal */}
      {propagating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm mx-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Propagando alterações...</h3>
            <p className="text-sm text-gray-500">
              Aplicando os novos valores nos meses seguintes até Dezembro/2026.
            </p>
            <p className="text-xs text-gray-400 mt-3">Aguarde, isso pode levar alguns segundos.</p>
          </div>
        </div>
      )}

      {monthRecords.length === 0 && !editingProduct && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-400 text-sm mb-3">Nenhum registro para este mês</p>
          <button
            onClick={() => startEdit(undefined, PRODUCTS[0])}
            className="text-blue-600 hover:underline text-sm"
          >
            + Adicionar primeiro registro
          </button>
        </div>
      )}
    </div>
  );
}
