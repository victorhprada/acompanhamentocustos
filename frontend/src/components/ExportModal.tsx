import { useState } from 'react';
import { toast } from 'sonner';
import { exportMonthlyXlsx } from '../services/api';

const COLUMN_GROUPS = [
  {
    group: 'Básico',
    columns: [
      { key: 'empresa', label: 'Empresa' },
      { key: 'mes_ano', label: 'Mês/Ano' },
    ],
  },
  {
    group: 'Elegíveis',
    columns: [
      { key: 'elegiveis_contrato', label: 'Elegíveis Contrato' },
      { key: 'elegiveis', label: 'Elegíveis' },
      { key: 'valor_elegivel', label: 'Valor Elegível' },
      { key: 'valor_final', label: 'Valor Final' },
    ],
  },
  {
    group: 'Gympass/Totalpass',
    columns: [
      { key: 'vidas_cobradas', label: 'Vidas Cobradas' },
      { key: 'valor_vidas', label: 'PRO RATA' },
      { key: 'pro_rata_dependente', label: 'PRO RATA Dependente' },
      { key: 'qtd_dependentes_gympass', label: 'Qtd de Dependentes' },
      { key: 'custo_por_dependente', label: 'Custo por Dependente' },
      { key: 'total_custo_dependentes', label: 'Total de Custo por Dependente' },
    ],
  },
  {
    group: 'Flex',
    columns: [
      { key: 'nr_cartao_contrato_flex', label: 'Nº Cartão Contrato Flex' },
      { key: 'nr_cartao_carga_flex', label: 'Nº Cartão Carga Flex' },
      { key: 'rs_carregado', label: 'R$ Carregado' },
      { key: 'media_cartao_realizado', label: 'Média Cartão Realizado' },
      { key: 'media_contratada', label: 'Média Contratada' },
    ],
  },
  {
    group: 'Wiipo',
    columns: [
      { key: 'nr_vidas', label: 'Nº Vidas' },
      { key: 'valor_elegivel_wiipo', label: 'Valor Elegível Wiipo' },
      { key: 'faturamento_wiipo', label: 'Faturamento Wiipo' },
      { key: 'qtd_dependentes', label: 'Qtd Dependentes' },
      { key: 'valor_por_dependente', label: 'Valor por Dependente' },
    ],
  },
  {
    group: 'Financeiro',
    columns: [
      { key: 'mensal_x_rentabilidade', label: 'Mensal x Rentabilidade' },
      { key: 'custo_por_cliente', label: 'Custo por Cliente' },
      { key: 'faturamento', label: 'Faturamento' },
      { key: 'faturamento_dependentes', label: 'Faturamento de Dependentes' },
    ],
  },
  {
    group: 'Observações',
    columns: [
      { key: 'observacao', label: 'Observação' },
    ],
  },
];

const ALL_KEYS = COLUMN_GROUPS.flatMap(g => g.columns.map(c => c.key));

export default function ExportModal({
  mesAno,
  onClose,
}: {
  mesAno: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_KEYS));
  const [exporting, setExporting] = useState(false);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleGroup = (keys: string[]) => {
    const allSelected = keys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      keys.forEach(k => allSelected ? next.delete(k) : next.add(k));
      return next;
    });
  };

  const handleExport = async () => {
    if (selected.size === 0) {
      toast.error('Selecione ao menos uma coluna');
      return;
    }
    setExporting(true);
    try {
      await exportMonthlyXlsx(mesAno, [...selected]);
      toast.success('Arquivo exportado com sucesso');
      onClose();
    } catch {
      toast.error('Erro ao exportar. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const monthLabel = (() => {
    const parts = mesAno.split('-');
    const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${names[parseInt(parts[1]) - 1]}/${parts[0]}`;
  })();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Exportar para Excel</h2>
            <p className="text-sm text-gray-500">Mês de referência: <strong>{monthLabel}</strong></p>
          </div>
          <button onClick={onClose} disabled={exporting} className="text-gray-400 hover:text-gray-600 text-2xl leading-none disabled:opacity-30">×</button>
        </div>

        {/* Column selection */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Global controls */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">{selected.size} de {ALL_KEYS.length} colunas selecionadas</span>
            <div className="flex gap-3">
              <button onClick={() => setSelected(new Set(ALL_KEYS))} className="text-blue-600 hover:underline">Selecionar todas</button>
              <button onClick={() => setSelected(new Set())} className="text-gray-500 hover:underline">Limpar</button>
            </div>
          </div>

          {COLUMN_GROUPS.map(({ group, columns }) => {
            const groupKeys = columns.map(c => c.key);
            const allChecked = groupKeys.every(k => selected.has(k));
            const someChecked = groupKeys.some(k => selected.has(k));

            return (
              <div key={group} className="border rounded-lg overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                    onChange={() => toggleGroup(groupKeys)}
                    className="rounded"
                  />
                  <span className="text-xs font-semibold text-gray-600 uppercase">{group}</span>
                </div>
                {/* Columns */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-3">
                  {columns.map(col => (
                    <label key={col.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={selected.has(col.key)}
                        onChange={() => toggle(col.key)}
                        className="rounded border-gray-300"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} disabled={exporting} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30">
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selected.size === 0}
            className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {exporting ? 'Exportando...' : `Exportar ${selected.size} coluna(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
