import { useRef, useState, useEffect } from 'react';
import { uploadImportFile, processImport } from '../services/api';

// ─── System field catalogue ───────────────────────────────────────────────────
const COMPANY_FIELD_OPTIONS = [
  { value: 'company_id', label: 'Company ID' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'razao_social', label: 'Razão Social' },
  { value: 'data_assinatura_contrato', label: 'Data Assinatura Contrato' },
  { value: 'email_envio', label: 'E-mail para Envio' },
  { value: 'inicio_cobranca', label: 'Início Cobrança' },
  { value: 'vencimento', label: 'Vencimento' },
  { value: 'nota_fiscal_descricao', label: 'Descrição Nota Fiscal' },
  { value: 'subsidio', label: 'Subsídio' },
  { value: 'tipo_empresa', label: 'Tipo (Matriz/Filial)' },
];

const MONTHLY_FIELD_OPTIONS = [
  { value: 'elegiveis_contrato', label: 'Elegíveis Contrato' },
  { value: 'elegiveis', label: 'Elegíveis' },
  { value: 'valor_elegivel', label: 'Valor Elegível' },
  { value: 'valor_final', label: 'Valor Final' },
  { value: 'vidas_cobradas', label: 'Vidas Cobradas' },
  { value: 'valor_vidas', label: 'Valor Vidas' },
  { value: 'nr_cartao_contrato_flex', label: 'Nº Cartão Contrato Flex' },
  { value: 'nr_cartao_carga_flex', label: 'Nº Cartão Carga Flex' },
  { value: 'rs_carregado', label: 'R$ Carregado' },
  { value: 'media_cartao_realizado', label: 'Média Cartão Realizado' },
  { value: 'media_contratada', label: 'Média Contratada' },
  { value: 'nr_vidas', label: 'Nº Vidas' },
  { value: 'valor_elegivel_wiipo', label: 'Valor Elegível Wiipo' },
  { value: 'faturamento_wiipo', label: 'Faturamento Wiipo' },
  { value: 'mensal_x_rentabilidade', label: 'Mensal x Rentabilidade' },
  { value: 'custo_por_cliente', label: 'Custo por Cliente' },
  { value: 'faturamento', label: 'Faturamento' },
];

// ─── Auto-mapper ─────────────────────────────────────────────────────────────
const KNOWN_MAPPINGS: Record<string, string> = {
  'company_id': 'company_id',
  'empresa': 'empresa',
  'cnpj': 'cnpj',
  'início cobrança': 'inicio_cobranca',
  'inicio cobrança': 'inicio_cobranca',
  'inicio cobranca': 'inicio_cobranca',

  'elegíveis contrato': 'elegiveis_contrato',
  'elegiveis contrato': 'elegiveis_contrato',
  'elegíveis': 'elegiveis',
  'elegiveis': 'elegiveis',
  'valor elegível': 'valor_elegivel',
  'valor elegivel': 'valor_elegivel',
  'valor final': 'valor_final',
  'vidas cobradas gympass/ totalpass': 'vidas_cobradas',
  'vidas cobradas gympass/totalpass': 'vidas_cobradas',
  'vidas cobradas': 'vidas_cobradas',
  'nº cartão contrato c/ flex': 'nr_cartao_contrato_flex',
  'nº cartão com carga flex': 'nr_cartao_carga_flex',
  'r$ carregado': 'rs_carregado',
  'média por cartão realizado base contrato premium': 'media_cartao_realizado',
  'média cartão realizado': 'media_cartao_realizado',
  'média contratada': 'media_contratada',
  'media contratada': 'media_contratada',
  'valor por elegível wiipo': 'valor_elegivel_wiipo',
  'n de vidas': 'nr_vidas',
  'nº vidas': 'nr_vidas',
  'numero de vidas': 'nr_vidas',
  'número de vidas': 'nr_vidas',
  'faturamento wiipo': 'faturamento_wiipo',
  'mensal x rentabilidade': 'mensal_x_rentabilidade',
  'data assinatura contrato': 'data_assinatura_contrato',
  'valor vidas': 'valor_vidas',
  'custo por cliente': 'custo_por_cliente',
  'razão social': 'razao_social',
  'razao social': 'razao_social',
  'vencimento': 'vencimento',
  'faturamento': 'faturamento',
  'incluir esta descrição na nota fiscal': 'nota_fiscal_descricao',
  'e-mail para envio': 'email_envio',
  'email para envio': 'email_envio',
  'subsidio': 'subsidio',
  'subsídio': 'subsidio',
  'tipo empresa': 'tipo_empresa',
  'tipo_empresa': 'tipo_empresa',
  'matriz/filial': 'tipo_empresa',
};

function autoMap(label: string): string {
  return KNOWN_MAPPINGS[label.toLowerCase().trim()] ?? '_skip';
}

// ─── Types ────────────────────────────────────────────────────────────────────
type SheetInfo = {
  name: string;
  mes_ano: string | null;
  columns: Array<{ index: number; label: string }>;
  preview: string[][];
};

type Step = 'upload' | 'mapping' | 'result';

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Propagation
  const [propagate, setPropagate] = useState(false);
  const [propagateMesAno, setPropagateMesAno] = useState('');

  // Scroll content to top so the loading overlay is always visible
  useEffect(() => {
    if (processing) contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [processing]);

  // Simulated progress bar: accelerates early, decelerates near 90%, jumps to 100 on completion
  useEffect(() => {
    if (!processing) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return prev; }
        const step = Math.max(0.3, (90 - prev) * 0.04);
        return Math.min(90, prev + step);
      });
    }, 120);
    return () => clearInterval(interval);
  }, [processing]);

  // Upload result
  const [filePath, setFilePath] = useState('');
  const [sheets, setSheets] = useState<SheetInfo[]>([]);

  // Mapping state
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [sheetConfig, setSheetConfig] = useState<Array<{ name: string; mes_ano: string; include: boolean }>>([]);

  // Result state
  const [result, setResult] = useState<{
    companies_created: number; companies_updated: number;
    records_created: number; records_updated: number; errors: string[];
  } | null>(null);

  // ── Step 1: upload ──────────────────────────────────────────────────────────
  const handleFile = (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setError('Apenas arquivos .xlsx ou .xls são aceitos');
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const data = await uploadImportFile(selectedFile);
      setFilePath(data.file_path);
      setSheets(data.sheets);

      // Pre-populate mapping from first sheet columns (all sheets share the same structure)
      const allColumns = data.sheets.flatMap(s => s.columns.map(c => c.label));
      const uniqueColumns = [...new Set(allColumns)];
      const initialMapping: Record<string, string> = {};
      uniqueColumns.forEach(col => { initialMapping[col] = autoMap(col); });
      setMapping(initialMapping);

      setSheetConfig(data.sheets.map(s => ({
        name: s.name,
        mes_ano: s.mes_ano ?? '',
        include: !!s.mes_ano,
      })));

      setStep('mapping');
    } catch (e: any) {
      setError(e.message ?? 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  // ── Step 2: process ─────────────────────────────────────────────────────────
  const handleProcess = async () => {
    const included = sheetConfig.filter(s => s.include && s.mes_ano);
    if (!included.length) {
      setError('Selecione ao menos uma aba com o mês definido');
      return;
    }
    const hasRequiredMapping = Object.values(mapping).some(v => v === 'cnpj');
    if (!hasRequiredMapping) {
      setError('Mapeie ao menos a coluna CNPJ para identificar as empresas');
      return;
    }

    if (propagate && !propagateMesAno) {
      setError('Selecione o mês de referência para a propagação');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      // Timeout after 5 minutes for large imports
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

      const res = await processImport({
        file_path: filePath,
        mapping,
        sheets: sheetConfig,
        propagate,
        propagate_mes_ano: propagate ? propagateMesAno : undefined,
      }, controller.signal);

      clearTimeout(timeout);
      setProgress(100);
      // brief pause so the user sees 100% before moving on
      await new Promise(r => setTimeout(r, 400));
      setResult(res);
      setStep('result');
      onSuccess();
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('A importação demorou muito. Tente com um arquivo menor ou verifique sua conexão.');
      } else {
        setError(e.message ?? 'Erro ao processar importação');
      }
    } finally {
      setProcessing(false);
    }
  };

  // ── Unique columns across all sheets ────────────────────────────────────────
  const allColumns = [...new Set(sheets.flatMap(s => s.columns.map(c => c.label)))];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Importação em Massa</h2>
            <p className="text-sm text-gray-500">Importe empresas e registros mensais via planilha Excel</p>
          </div>
          <button onClick={onClose} disabled={processing} className="text-gray-400 hover:text-gray-600 text-2xl leading-none disabled:opacity-30 disabled:cursor-not-allowed">×</button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b">
          {(['upload', 'mapping', 'result'] as Step[]).map((s, i) => (
            <div key={s} className={`flex-1 py-2 text-center text-sm font-medium border-b-2 ${step === s ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>
              {i + 1}. {s === 'upload' ? 'Upload' : s === 'mapping' ? 'Mapeamento' : 'Resultado'}
            </div>
          ))}
        </div>

        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* ── STEP 1: UPLOAD ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
              >
                <div className="text-4xl mb-3">📂</div>
                {selectedFile ? (
                  <p className="font-medium text-gray-800">{selectedFile.name}</p>
                ) : (
                  <>
                    <p className="font-medium text-gray-700">Arraste o arquivo aqui ou clique para selecionar</p>
                    <p className="text-sm text-gray-400 mt-1">Suporta .xlsx e .xls</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Enviando...' : 'Enviar e Analisar'}
              </button>
            </div>
          )}

          {/* ── STEP 2: MAPPING ── */}
          {step === 'mapping' && (
            <div className="space-y-6 relative">
              {/* Processing overlay */}
              {processing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg z-10 flex flex-col items-center justify-center gap-4 px-12">
                  <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-gray-700">Importando dados...</p>
                  <div className="w-full max-w-sm">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Processando registros</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 bg-green-500 rounded-full transition-all duration-150 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Aguarde, não feche esta janela</p>
                </div>
              )}

              {/* Sheet configuration */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Abas detectadas</h3>
                <div className="space-y-2">
                  {sheetConfig.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={s.include}
                        disabled={processing}
                        onChange={e => setSheetConfig(prev => prev.map((x, j) => j === i ? { ...x, include: e.target.checked } : x))}
                        className="rounded disabled:opacity-50"
                      />
                      <span className="text-sm font-medium text-gray-800 w-32 truncate" title={s.name}>{s.name}</span>
                      <span className="text-gray-400 text-sm">→</span>
                      <input
                        type="month"
                        value={s.mes_ano ? s.mes_ano.slice(0, 7) : ''}
                        disabled={processing}
                        onChange={e => setSheetConfig(prev => prev.map((x, j) => j === i ? { ...x, mes_ano: e.target.value ? `${e.target.value}-01` : '' } : x))}
                        className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:bg-gray-100"
                      />
                      {!s.mes_ano && <span className="text-xs text-amber-600">Defina o mês</span>}
                    </div>
                  ))}
                </div>

                {/* Propagation option */}
                {(() => {
                  const includedSheets = sheetConfig.filter(s => s.include && s.mes_ano);
                  return includedSheets.length > 0 ? (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={propagate}
                          disabled={processing}
                          onChange={e => {
                            setPropagate(e.target.checked);
                            if (e.target.checked && includedSheets.length === 1) {
                              setPropagateMesAno(includedSheets[0].mes_ano);
                            }
                          }}
                          className="rounded disabled:opacity-50"
                        />
                        <span className="text-sm text-gray-700">Propagar valores para os meses restantes do ano</span>
                      </label>
                      {propagate && (
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-xs text-gray-500">Usar os dados de:</span>
                          <select
                            value={propagateMesAno}
                            disabled={processing}
                            onChange={e => setPropagateMesAno(e.target.value)}
                            className="border rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:bg-gray-100"
                          >
                            <option value="">— Selecione —</option>
                            {includedSheets.map(s => (
                              <option key={s.name} value={s.mes_ano}>
                                {s.name} ({s.mes_ano.slice(0, 7)})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Column mapping */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Mapeamento de colunas</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 w-1/2">Coluna no Excel</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 w-1/2">Campo no sistema</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allColumns.map(col => (
                        <tr key={col} className={mapping[col] && mapping[col] !== '_skip' ? 'bg-green-50' : ''}>
                          <td className="px-3 py-2 text-gray-700 text-xs font-mono">{col}</td>
                          <td className="px-3 py-2">
                            <select
                              value={mapping[col] ?? '_skip'}
                              disabled={processing}
                              onChange={e => setMapping(prev => ({ ...prev, [col]: e.target.value }))}
                              className="w-full border rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="_skip">— Ignorar —</option>
                              <optgroup label="Empresa">
                                {COMPANY_FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </optgroup>
                              <optgroup label="Registro Mensal">
                                {MONTHLY_FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </optgroup>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: RESULT ── */}
          {step === 'result' && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">{result.companies_created}</div>
                  <div className="text-sm text-green-600 mt-1">Empresas criadas</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{result.companies_updated}</div>
                  <div className="text-sm text-blue-600 mt-1">Empresas atualizadas</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">{result.records_created}</div>
                  <div className="text-sm text-green-600 mt-1">Registros mensais criados</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{result.records_updated}</div>
                  <div className="text-sm text-blue-600 mt-1">Registros mensais atualizados</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-2">{result.errors.length} erro(s)</h4>
                  <div className="max-h-40 overflow-y-auto bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-600">{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} disabled={processing} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed">
            {step === 'result' ? 'Fechar' : 'Cancelar'}
          </button>
          {step === 'mapping' && (
            <button
              onClick={handleProcess}
              disabled={processing}
              className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {processing ? 'Processando...' : 'Importar dados'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
