import { useState } from 'react';
import { toast } from 'sonner';
import { exportRentabilidadeXlsx } from '../services/api';

const COLUMN_GROUPS = [
  {
    group: 'Empresa',
    columns: [
      { key: 'company_id', label: 'Company ID' },
      { key: 'empresa', label: 'Empresa' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'razao_social', label: 'Razão Social' },
      { key: 'data_assinatura_contrato', label: 'Data Assinatura Contrato' },
      { key: 'email_envio', label: 'E-mail para Envio' },
      { key: 'inicio_cobranca', label: 'Início Cobrança' },
      { key: 'vencimento', label: 'Dia de Vencimento' },
    ],
  },
  {
    group: 'Mensal',
    columns: [
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
      { key: 'valor_vidas', label: 'Valor Vidas' },
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
    ],
  },
  {
    group: 'Financeiro',
    columns: [
      { key: 'mensal_x_rentabilidade', label: 'Mensal x Rentabilidade' },
      { key: 'custo_por_cliente', label: 'Custo por Cliente' },
      { key: 'faturamento', label: 'Faturamento' },
    ],
  },
];

const ALL_KEYS = COLUMN_GROUPS.flatMap(g => g.columns.map(c => c.key));

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function monthLabel(mesAno: string) {
  const parts = mesAno.split('-');
  return `${MONTHS_PT[parseInt(parts[1]) - 1]}/${parts[0]}`;
}

export default function ExportRentabilidadeModal({
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
      await exportRentabilidadeXlsx(mesAno, [...selected]);
      toast.success('Arquivo exportado com sucesso');
      onClose();
    } catch {
      toast.error('Erro ao exportar. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Exportar Faturamento Mensal</h2>
            <p className="text-sm text-gray-500">
              Empresas com <strong>Mensal x Rentabilidade = Faturamento mensal</strong> em{' '}
              <strong>{monthLabel(mesAno)}</strong>
            </p>
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
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? 'Exportando...' : `Exportar ${selected.size} coluna(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
