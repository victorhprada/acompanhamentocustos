import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createMonthlyRecord, updateMonthlyRecord, deleteMonthlyRecord } from '../services/api';
import { MonthlyRecord } from '../types';

const MONTHS = [
  '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01',
  '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01',
  '2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01',
];

type ColumnDef = {
  key: string;
  label: string;
  type: 'number' | 'money' | 'text';
  computed?: boolean;
};

/** Detalhamento por Grupo — ordem e labels inalterados */
const DETAIL_GROUPS: Record<string, ColumnDef[]> = {
  'Elegíveis': [
    { key: 'elegiveis_contrato', label: 'Elegíveis Contrato', type: 'number' },
    { key: 'elegiveis', label: 'Elegíveis', type: 'number' },
    { key: 'valor_elegivel', label: 'Valor Elegível', type: 'money' },
    { key: 'valor_final', label: 'Valor Final', type: 'money', computed: true },
  ],
  'Gympass/Totalpass': [
    { key: 'vidas_cobradas', label: 'Vidas Cobradas', type: 'number' },
    { key: 'valor_vidas', label: 'PRO RATA', type: 'number' },
    { key: 'qtd_dependentes_gympass', label: 'Qtd de Dependentes', type: 'number' },
    { key: 'custo_por_dependente', label: 'Custo por Dependente', type: 'money' },
    { key: 'total_custo_dependentes', label: 'Total de Custo por Dependente', type: 'money', computed: true },
  ],
  'Flex': [
    { key: 'nr_cartao_contrato_flex', label: 'Nº Cartão Contrato Flex', type: 'number' },
    { key: 'nr_cartao_carga_flex', label: 'Nº Cartão Carga Flex', type: 'number' },
    { key: 'rs_carregado', label: 'R$ Carregado', type: 'money' },
    { key: 'media_cartao_realizado', label: 'Média Cartão Realizado', type: 'money' },
    { key: 'media_contratada', label: 'Média Contratada', type: 'money' },
  ],
  'Wiipo': [
    { key: 'nr_vidas', label: 'Nº Vidas', type: 'number' },
    { key: 'valor_elegivel_wiipo', label: 'Valor Elegível Wiipo', type: 'money' },
    { key: 'faturamento_wiipo', label: 'Faturamento Wiipo', type: 'money' },
    { key: 'qtd_dependentes', label: 'Qtd Dependentes', type: 'number' },
    { key: 'valor_por_dependente', label: 'Valor por dependente', type: 'money' },
  ],
  'Financeiro': [
    { key: 'faturamento_dependentes', label: 'Faturamento de Dependentes', type: 'money', computed: true },
    { key: 'custo_por_cliente', label: 'Custo por Cliente', type: 'money', computed: true },
    { key: 'faturamento', label: 'Faturamento', type: 'money' },
  ],
};

const DIAS_MES = 30;

/**
 * Ordem dos inputs (tabela de edição).
 * valor_vidas (PRO RATA) e qtd_dependentes permanecem no lugar relativo original.
 */
const EDITABLE_COLUMNS: ColumnDef[] = [
  // Custo parceiro
  { key: 'elegiveis_contrato', label: 'Elegíveis Contrato', type: 'number' },
  { key: 'elegiveis', label: 'Elegíveis', type: 'number' },
  { key: 'vidas_cobradas', label: 'Vidas Cobradas', type: 'number' },
  { key: 'valor_vidas', label: 'PRO RATA', type: 'number' },
  { key: 'valor_elegivel', label: 'Custo por Vida', type: 'money' },
  { key: 'valor_final', label: 'Valor Final (custo)', type: 'money', computed: true },
  { key: 'qtd_dependentes_gympass', label: 'Qtd de Dependentes', type: 'number' },
  { key: 'custo_por_dependente', label: 'Custo por Dependente', type: 'money' },
  { key: 'total_custo_dependentes', label: 'Total de Custo por Dependente', type: 'money', computed: true },
  // Carga Flex
  { key: 'nr_cartao_contrato_flex', label: 'Nº Cartão Contrato Flex', type: 'number' },
  { key: 'nr_cartao_carga_flex', label: 'Nº Cartão Carga Flex', type: 'number' },
  { key: 'rs_carregado', label: 'R$ Carregado', type: 'money' },
  { key: 'media_cartao_realizado', label: 'Média Cartão Realizado', type: 'money' },
  { key: 'media_contratada', label: 'Média Contratada', type: 'money' },
  // Fat Wiipo
  { key: 'nr_vidas', label: 'Nº Vidas', type: 'number' },
  { key: 'valor_elegivel_wiipo', label: 'Valor vida Wiipo', type: 'money' },
  { key: 'faturamento_wiipo', label: 'Faturamento Wiipo', type: 'money' },
  { key: 'qtd_dependentes', label: 'Qtd Dependentes', type: 'number' },
  { key: 'valor_por_dependente', label: 'Valor por dependente', type: 'money' },
  { key: 'faturamento_dependentes', label: 'Faturamento de Dependentes', type: 'money', computed: true },
  { key: 'mensal_x_rentabilidade', label: 'Mensal x Rentabilidade', type: 'text' },
];

const ALL_COLUMNS = [
  ...EDITABLE_COLUMNS,
  ...Object.values(DETAIL_GROUPS).flat().filter(
    d => !EDITABLE_COLUMNS.some(e => e.key === d.key)
  ),
];
const MAIN_COLUMNS = ['elegiveis', 'valor_final', 'vidas_cobradas', 'faturamento_wiipo'];

function formatMonth(dateStr: string) {
  const [year, month] = dateStr.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[parseInt(month) - 1]}/${year}`;
}

function formatMonthFull(dateStr: string) {
  const [year, month] = dateStr.split('-');
  const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${names[parseInt(month) - 1]} ${year}`;
}

function formatValue(value: number | string | undefined, type: string) {
  if (value === undefined || value === null) return '-';
  if (type === 'money') return `R$ ${Number(value).toFixed(2)}`;
  if (type === 'text') return String(value);
  return String(value);
}

export default function MonthTable({
  companyId,
  selectedMonth: parentMonth,
  records,
}: {
  companyId: string;
  records: MonthlyRecord[];
  selectedMonth?: string;
  onRefetch?: () => void;
}) {
  const queryClient = useQueryClient();
  const [internalMonth, setInternalMonth] = useState(MONTHS[new Date().getMonth()]);
  const selectedMonth = parentMonth || internalMonth;

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [showAllFields, setShowAllFields] = useState(false);
  const [propagateConfirm, setPropagateConfirm] = useState(false);
  const [propagating, setPropagating] = useState(false);
  const [propagatingAll, setPropagatingAll] = useState(false);

  const record = records.find(r => r.mes_ano.startsWith(selectedMonth.slice(0, 7)));

  const createMutation = useMutation({
    mutationFn: (payload: { data: any; propagate: boolean }) =>
      createMonthlyRecord(payload.data, payload.propagate),
    onSuccess: () => {
      setEditing(false);
      setPropagating(false);
      setPropagatingAll(false);
      queryClient.invalidateQueries({ queryKey: ['monthly', companyId] });
      toast.success('Registro criado com sucesso');
    },
    onError: () => { setPropagating(false); setPropagatingAll(false); toast.error('Erro ao criar registro'); },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: any; propagate: boolean }) =>
      updateMonthlyRecord(payload.id, payload.data, payload.propagate),
    onSuccess: () => {
      setEditing(false);
      setPropagating(false);
      setPropagatingAll(false);
      queryClient.invalidateQueries({ queryKey: ['monthly', companyId] });
      toast.success('Registro atualizado com sucesso');
    },
    onError: () => { setPropagating(false); setPropagatingAll(false); toast.error('Erro ao atualizar registro'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMonthlyRecord(id, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly', companyId] });
      toast.success('Registro excluído');
    },
    onError: () => toast.error('Erro ao excluir registro'),
  });

  const startEdit = () => {
    setEditForm(record ? { ...record } : {});
    setEditing(true);
  };

  const handleMonthChange = (month: string) => {
    setInternalMonth(month);
    setEditing(false);
    setEditForm({});
    setPropagateConfirm(false);
  };

  const calcFaturamentoDependentes = (form: Record<string, any>) => {
    const qtd = form.qtd_dependentes;
    const valor = form.valor_por_dependente;
    if (qtd === undefined || qtd === null || qtd === '' || valor === undefined || valor === null || valor === '') {
      return '';
    }
    const product = parseFloat(qtd) * parseFloat(valor);
    return Number.isFinite(product) ? String(product) : '';
  };

  const calcValorFinal = (form: Record<string, any>) => {
    const custo = form.valor_elegivel;
    const vidas = form.vidas_cobradas;
    const proRata = form.valor_vidas;
    if (
      custo === undefined || custo === null || custo === '' ||
      vidas === undefined || vidas === null || vidas === '' ||
      proRata === undefined || proRata === null || proRata === ''
    ) {
      return '';
    }
    const result = (parseFloat(custo) * parseFloat(vidas) / DIAS_MES) * parseFloat(proRata);
    return Number.isFinite(result) ? String(result) : '';
  };

  const calcTotalCustoDependentes = (form: Record<string, any>) => {
    const qtd = form.qtd_dependentes_gympass;
    const custo = form.custo_por_dependente;
    const proRata = form.valor_vidas;
    if (
      qtd === undefined || qtd === null || qtd === '' ||
      custo === undefined || custo === null || custo === '' ||
      proRata === undefined || proRata === null || proRata === ''
    ) {
      return '';
    }
    const result = (parseFloat(custo) * parseFloat(qtd) / DIAS_MES) * parseFloat(proRata);
    return Number.isFinite(result) ? String(result) : '';
  };

  const calcCustoPorCliente = (form: Record<string, any>) => {
    const valorFinal = calcValorFinal(form) || form.valor_final;
    const totalDeps = calcTotalCustoDependentes(form) || form.total_custo_dependentes;
    if (
      (valorFinal === undefined || valorFinal === null || valorFinal === '') &&
      (totalDeps === undefined || totalDeps === null || totalDeps === '')
    ) {
      return '';
    }
    const sum = (parseFloat(valorFinal) || 0) + (parseFloat(totalDeps) || 0);
    return Number.isFinite(sum) ? String(sum) : '';
  };

  const WELLHUB_INPUT_KEYS = new Set([
    'valor_elegivel',
    'vidas_cobradas',
    'valor_vidas',
    'qtd_dependentes_gympass',
    'custo_por_dependente',
  ]);

  const updateEditField = (key: string, value: string) => {
    setEditForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'qtd_dependentes' || key === 'valor_por_dependente') {
        next.faturamento_dependentes = calcFaturamentoDependentes(next);
      }
      if (WELLHUB_INPUT_KEYS.has(key)) {
        next.valor_final = calcValorFinal(next);
        next.total_custo_dependentes = calcTotalCustoDependentes(next);
        next.custo_por_cliente = calcCustoPorCliente(next);
      }
      if (key === 'faturamento_wiipo') {
        next.faturamento = value;
      }
      return next;
    });
  };

  const doSave = (propagate: boolean) => {
    const data: Record<string, any> = {};
    const formWithCalc: Record<string, any> = {
      ...editForm,
      faturamento_dependentes: calcFaturamentoDependentes(editForm) || editForm.faturamento_dependentes,
      valor_final: calcValorFinal(editForm) || editForm.valor_final,
      total_custo_dependentes: calcTotalCustoDependentes(editForm) || editForm.total_custo_dependentes,
      custo_por_cliente: calcCustoPorCliente(editForm) || editForm.custo_por_cliente,
      faturamento: editForm.faturamento_wiipo ?? editForm.faturamento,
    };
    // Persist editable columns + computed detail-only fields + observacao
    const keysToSave = new Set([
      ...EDITABLE_COLUMNS.map(f => f.key),
      'custo_por_cliente',
      'faturamento',
      'observacao',
    ]);
    keysToSave.forEach(key => {
      const col = ALL_COLUMNS.find(c => c.key === key);
      const val = formWithCalc[key];
      if (val !== undefined && val !== null && val !== '') {
        if (key === 'observacao' || (col && col.type === 'text')) {
          data[key] = val;
        } else {
          data[key] = parseFloat(val);
        }
      } else if (key === 'observacao' && val === '') {
        data[key] = null;
      }
    });

    setPropagating(true);
    if (propagate) setPropagatingAll(true);

    if (record) {
      updateMutation.mutate({ id: record.id, data, propagate });
    } else {
      data.company_id = companyId;
      data.mes_ano = selectedMonth;
      createMutation.mutate({ data, propagate });
    }
    setPropagateConfirm(false);
  };

  const handleSave = () => {
    if (record) {
      setPropagateConfirm(true);
    } else {
      setPropagating(true);
      doSave(true);
    }
  };

  const handleDelete = () => {
    if (record && confirm(`Excluir registro de ${formatMonthFull(selectedMonth)}?`)) {
      deleteMutation.mutate(record.id);
    }
  };

  const visibleColumns = showAllFields
    ? EDITABLE_COLUMNS
    : EDITABLE_COLUMNS.filter(c => MAIN_COLUMNS.includes(c.key));
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      {/* Month selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Selecione o Mês:</h3>
        <div className="flex gap-2 flex-wrap">
          {MONTHS.map(m => {
            const hasRecords = records.some(r => r.mes_ano.startsWith(m.slice(0, 7)));
            return (
              <button
                key={m}
                onClick={() => handleMonthChange(m)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition relative ${
                  m.slice(0, 7) === selectedMonth.slice(0, 7)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : hasRecords
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {formatMonth(m)}
                {hasRecords && m.slice(0, 7) !== selectedMonth.slice(0, 7) && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggle + month label */}
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-gray-500">
          Mostrando: <strong>{formatMonthFull(selectedMonth)}</strong>
        </p>
        <button
          onClick={() => setShowAllFields(v => !v)}
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
                {visibleColumns.map(col => (
                  <th key={col.key} className="px-3 py-2 text-right font-medium text-gray-600 border-r min-w-[110px] text-xs">
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium text-gray-600 w-40">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {editing ? (
                <tr className="bg-blue-50">
                  {visibleColumns.map(col => (
                    <td key={col.key} className="px-3 py-2 border-r">
                      {'computed' in col && col.computed ? (
                        <input
                          type="number"
                          step="any"
                          value={
                            col.key === 'valor_final'
                              ? (calcValorFinal(editForm) || editForm[col.key] || '')
                              : col.key === 'total_custo_dependentes'
                              ? (calcTotalCustoDependentes(editForm) || editForm[col.key] || '')
                              : (calcFaturamentoDependentes(editForm) || editForm[col.key] || '')
                          }
                          readOnly
                          className="w-full border rounded px-2 py-1 text-right bg-gray-100 text-gray-600 focus:outline-none text-xs"
                          placeholder={col.label}
                          title={
                            col.key === 'valor_final'
                              ? 'Calculado: (Custo por Vida × Vidas Cobradas / 30) × PRO RATA'
                              : col.key === 'total_custo_dependentes'
                              ? 'Calculado: (Custo por Dependente × Qtd de Dependentes / 30) × PRO RATA'
                              : 'Calculado automaticamente: Qtd Dependentes × Valor por dependente'
                          }
                        />
                      ) : (
                        <input
                          type={col.type === 'text' ? 'text' : 'number'}
                          step={col.key === 'valor_vidas' ? '1' : 'any'}
                          value={editForm[col.key] ?? ''}
                          onChange={e => updateEditField(col.key, e.target.value)}
                          className="w-full border rounded px-2 py-1 text-right focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                          placeholder={col.label}
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-green-100 rounded disabled:opacity-50"
                      >
                        {isPending ? '...' : '✓ Salvar'}
                      </button>
                      <button
                        onClick={() => { setEditing(false); setPropagateConfirm(false); }}
                        className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1 bg-gray-100 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr className={record ? 'hover:bg-gray-50' : 'text-gray-400'}>
                  {visibleColumns.map(col => (
                    <td key={col.key} className="px-3 py-2 text-right border-r font-mono text-xs">
                      {record ? formatValue(record[col.key as keyof MonthlyRecord] as number, col.type) : '-'}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={startEdit} className="text-blue-600 hover:text-blue-800 text-xs">
                        {record ? 'Editar' : '+ Adicionar'}
                      </button>
                      {record && (
                        <button onClick={handleDelete} className="text-red-600 hover:text-red-800 text-xs">
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field groups detail - shown when showAllFields; edit mode also shows Observações */}
      {showAllFields && (record || editing) && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Detalhamento por Grupo</h4>
          {Object.entries(DETAIL_GROUPS).map(([groupName, columns]) => (
            columns.length === 0 ? null : (
            <div key={groupName} className="mb-6 last:mb-0">
              <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2 pb-1 border-b">{groupName}</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {columns.map(col => {
                  const source = editing ? editForm : record;
                  if (!source) return null;
                  let val = source[col.key as keyof typeof source];
                  if (editing) {
                    if (col.key === 'valor_final') val = calcValorFinal(editForm) || editForm.valor_final;
                    if (col.key === 'total_custo_dependentes') val = calcTotalCustoDependentes(editForm) || editForm.total_custo_dependentes;
                    if (col.key === 'custo_por_cliente') val = calcCustoPorCliente(editForm) || editForm.custo_por_cliente;
                    if (col.key === 'faturamento_dependentes') val = calcFaturamentoDependentes(editForm) || editForm.faturamento_dependentes;
                  } else if (record) {
                    // Fallbacks for legacy rows before auto-copy / new formulas
                    if (col.key === 'custo_por_cliente' && (val == null || val === '')) {
                      const vf = Number(record.valor_final) || 0;
                      const td = Number(record.total_custo_dependentes) || 0;
                      val = (record.valor_final != null || record.total_custo_dependentes != null)
                        ? vf + td
                        : undefined;
                    }
                    if (col.key === 'faturamento' && (val == null || val === '')) {
                      val = record.faturamento_wiipo;
                    }
                  }
                  return (
                    <div key={col.key} className="bg-gray-50 rounded p-3">
                      <label className="block text-xs text-gray-400 mb-1">{col.label}</label>
                      <div className="text-sm font-mono font-medium">
                        {val != null && val !== '' ? formatValue(val as number, col.type) : <span className="text-gray-400">-</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )
          ))}

          {/* Observações — só no detalhamento; não propaga entre meses */}
          <div className="mb-0">
            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2 pb-1 border-b">Observações</h5>
            {editing ? (
              <textarea
                value={editForm.observacao ?? ''}
                onChange={e => setEditForm(prev => ({ ...prev, observacao: e.target.value }))}
                rows={4}
                className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Observações deste mês (não são replicadas para outros meses)"
              />
            ) : (
              <div className="bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap">
                {record?.observacao ? record.observacao : <span className="text-gray-400">Nenhuma observação</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!record && !editing && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-400 text-sm mb-3">Nenhum registro para este mês</p>
          <button onClick={startEdit} className="text-blue-600 hover:underline text-sm">
            + Adicionar primeiro registro
          </button>
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
                onClick={() => { setPropagateConfirm(false); setEditing(false); }}
                className="px-4 bg-gray-100 text-gray-500 py-2 rounded-lg hover:bg-gray-200 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saving / propagating loading modal */}
      {propagating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm mx-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600" />
            </div>
            {propagatingAll ? (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Propagando alterações...</h3>
                <p className="text-sm text-gray-500">
                  Aplicando os novos valores nos meses seguintes até Dezembro/2026.
                </p>
                <p className="text-xs text-gray-400 mt-3">Aguarde, isso pode levar alguns segundos.</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Salvando...</h3>
                <p className="text-sm text-gray-500">
                  Salvando alterações apenas para <strong>{formatMonthFull(selectedMonth)}</strong>.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
