import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCompany, getMonthlyRecords, updateCompany, deactivateCompany, activateCompany } from '../../services/api';
import MonthTable from '../../components/MonthTable';
import { ParceirosBadges, ParceirosSelect } from '../../components/ParceirosSelect';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<'activate' | 'deactivate' | null>(null);

  const { data: company } = useQuery({
    queryKey: ['company', id],
    queryFn: () => getCompany(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: records } = useQuery({
    queryKey: ['monthly', id],
    queryFn: () => getMonthlyRecords(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateCompany(id!, data),
    onSuccess: () => {
      setEditing(false);
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['company', id] });
      toast.success('Empresa atualizada com sucesso');
    },
    onError: (err: any) => {
      const data = err?.data ?? err?.response?.data;
      const details = data?.detail;
      if (Array.isArray(details)) {
        const errs: Record<string, string> = {};
        details.forEach((d: any) => {
          const field = d.loc?.[d.loc.length - 1];
          errs[field] = d.msg || d.type;
        });
        setErrors(errs);
      } else if (typeof details === 'string') {
        if (/cnpj/i.test(details)) {
          setErrors({ cnpj: details });
        } else {
          setErrors({ _global: details });
        }
        toast.error(details);
        return;
      }
      toast.error('Erro ao atualizar empresa');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateCompany,
    onSuccess: () => {
      setConfirmAction(null);
      toast.success('Empresa desativada');
      navigate('/companies');
    },
    onError: () => {
      toast.error('Erro ao desativar empresa');
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateCompany,
    onSuccess: () => {
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ['company', id] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa ativada');
    },
    onError: () => {
      toast.error('Erro ao ativar empresa');
    },
  });

  const confirmStatusChange = () => {
    if (!company || !confirmAction) return;
    if (confirmAction === 'deactivate') {
      deactivateMutation.mutate(company.id);
    } else {
      activateMutation.mutate(company.id);
    }
  };

  const startEdit = () => {
    if (!company) return;
    setEditing(true);
    setErrors({});
    setEditForm({
      empresa: company.empresa,
      cnpj: company.cnpj,
      razao_social: company.razao_social,
      data_assinatura_contrato: company.data_assinatura_contrato ? company.data_assinatura_contrato.slice(0, 10) : '',
      email_envio: company.email_envio,
      inicio_cobranca: company.inicio_cobranca ? company.inicio_cobranca.slice(0, 10) : '',
      vencimento: company.vencimento?.toString() || '',
      nota_fiscal_descricao: company.nota_fiscal_descricao,
      subsidio: company.subsidio ?? false,
      tipo_empresa: company.tipo_empresa === 'filial' ? 'filial' : 'matriz',
      parceiros: Array.isArray(company.parceiros) ? [...company.parceiros] : [],
    });
  };

  const handleSave = () => {
    if (!editForm.tipo_empresa) {
      setErrors({ tipo_empresa: 'Selecione Matriz ou Filial' });
      return;
    }
    const data: Record<string, any> = {};
    if (editForm.empresa) data.empresa = editForm.empresa;
    if (editForm.cnpj) data.cnpj = editForm.cnpj;
    if (editForm.razao_social) data.razao_social = editForm.razao_social;
    if (editForm.data_assinatura_contrato) data.data_assinatura_contrato = editForm.data_assinatura_contrato;
    if (editForm.email_envio) data.email_envio = editForm.email_envio;
    if (editForm.inicio_cobranca) data.inicio_cobranca = editForm.inicio_cobranca;
    if (editForm.vencimento) data.vencimento = parseInt(editForm.vencimento);
    if (editForm.nota_fiscal_descricao) data.nota_fiscal_descricao = editForm.nota_fiscal_descricao;
    data.subsidio = editForm.subsidio ?? false;
    data.tipo_empresa = editForm.tipo_empresa;
    data.parceiros = Array.isArray(editForm.parceiros) ? editForm.parceiros : [];
    updateMutation.mutate(data);
  };

  if (!company) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <div className="mb-6">
        <Link to="/companies" className="text-blue-600 hover:underline text-sm">← Voltar para Empresas</Link>
        <div className="mt-2 flex justify-between items-start">
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800">Editando Empresa</h3>
                {errors._global && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{errors._global}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <InputEdit label="Empresa" value={editForm.empresa || ''} onChange={(v) => setEditForm({...editForm, empresa: v})} error={errors.empresa} />
                  <InputEdit label="CNPJ" value={editForm.cnpj || ''} onChange={(v) => setEditForm({...editForm, cnpj: v})} error={errors.cnpj} />
                  <InputEdit label="Razão Social" value={editForm.razao_social || ''} onChange={(v) => setEditForm({...editForm, razao_social: v})} />
                  <InputEdit label="Data Assinatura Contrato" type="date" value={editForm.data_assinatura_contrato || ''} onChange={(v) => setEditForm({...editForm, data_assinatura_contrato: v})} />
                  <InputEditMultiEmail label="E-mails" value={editForm.email_envio || ''} onChange={(v) => setEditForm({...editForm, email_envio: v})} error={errors.email_envio} />
                  <InputEdit label="Início Cobrança" type="date" value={editForm.inicio_cobranca || ''} onChange={(v) => setEditForm({...editForm, inicio_cobranca: v})} />
                  <InputEdit label="Dia Vencimento" type="number" value={editForm.vencimento || ''} onChange={(v) => setEditForm({...editForm, vencimento: v})} />
                  <ParceirosSelect
                    value={Array.isArray(editForm.parceiros) ? editForm.parceiros : []}
                    onChange={(parceiros) => setEditForm({ ...editForm, parceiros })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Descrição NF</label>
                  <textarea value={editForm.nota_fiscal_descricao || ''} onChange={(e) => setEditForm({...editForm, nota_fiscal_descricao: e.target.value})} rows={2} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm.tipo_empresa === 'matriz'}
                        onChange={() => setEditForm({...editForm, tipo_empresa: 'matriz'})}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Matriz</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm.tipo_empresa === 'filial'}
                        onChange={() => setEditForm({...editForm, tipo_empresa: 'filial'})}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Filial</span>
                    </label>
                  </div>
                  {errors.tipo_empresa && <p className="text-red-600 text-xs mt-1">{errors.tipo_empresa}</p>}
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editForm.subsidio ?? false}
                    onChange={(e) => setEditForm({...editForm, subsidio: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Subsídio</span>
                </label>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={updateMutation.isPending} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                    {updateMutation.isPending ? 'Salvando...' : '✓ Salvar'}
                  </button>
                  <button onClick={() => { setEditing(false); setErrors({}); }} className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-300">✕ Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">{company.empresa}</h2>
                  <button onClick={startEdit} className="text-sm text-blue-600 hover:underline">Editar</button>
                  {company.is_active ? (
                    <button
                      onClick={() => setConfirmAction('deactivate')}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Desativar
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmAction('activate')}
                      className="text-sm text-green-600 hover:underline"
                    >
                      Ativar
                    </button>
                  )}
                </div>

                {/* Dados cadastrais completos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Field label="Company ID" value={company.company_id} />
                  <Field label="CNPJ" value={company.cnpj} />
                  <Field label="Razão Social" value={company.razao_social} />
                  <Field label="Data Assinatura Contrato" value={company.data_assinatura_contrato ? company.data_assinatura_contrato.slice(0, 10).split('-').reverse().join('/') : null} />
                  <Field label="E-mails para envio" value={company.email_envio} multiEmail />
                  <Field label="Início Cobrança" value={company.inicio_cobranca ? company.inicio_cobranca.slice(0, 10).split('-').reverse().join('/') : null} />
                  <Field label="Dia de Vencimento" value={company.vencimento ? `Dia ${company.vencimento}` : null} />
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-0.5">Parceiros</label>
                    <ParceirosBadges value={company.parceiros} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-0.5">Tipo</label>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      company.tipo_empresa === 'filial'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {company.tipo_empresa === 'filial' ? 'Filial' : 'Matriz'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-0.5">Subsídio</label>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${company.subsidio ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {company.subsidio ? 'Sim' : 'Não'}
                    </span>
                  </div>
                </div>

                {/* Descrição NF - campo largo */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Descrição na Nota Fiscal</label>
                  <p className="text-sm text-gray-800">{company.nota_fiscal_descricao || <span className="text-gray-400">Não informado</span>}</p>
                </div>

                {/* Metadata */}
                <div className="mt-3 text-xs text-gray-400">
                  ID interno: {company.id} · Criado em: {new Date(company.created_at).toLocaleDateString('pt-BR')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Monthly records table */}
      <MonthTable
        companyId={id!}
        selectedMonth=""
        records={records || []}
        onRefetch={() => {}}
      />

      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                confirmAction === 'deactivate'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-green-100 text-green-600'
              }`}>
                {confirmAction === 'deactivate' ? '⚠' : '✓'}
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                {confirmAction === 'deactivate' ? 'Desativar empresa?' : 'Ativar empresa?'}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              <strong>{company.empresa}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {confirmAction === 'deactivate'
                ? 'A empresa será marcada como inativa. Os registros mensais serão preservados.'
                : 'A empresa será reativada e voltará a aparecer na lista principal.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmStatusChange}
                disabled={deactivateMutation.isPending || activateMutation.isPending}
                className={`flex-1 py-2 rounded-lg text-sm text-white disabled:opacity-50 ${
                  confirmAction === 'deactivate'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {deactivateMutation.isPending || activateMutation.isPending
                  ? 'Processando...'
                  : confirmAction === 'deactivate' ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputEdit({ label, value, onChange, type = 'text', error }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; error?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${error ? 'border-red-300 bg-red-50' : ''}`}
      />
      {error && <p className="text-red-600 text-xs mt-0.5">{error}</p>}
    </div>
  );
}

function Field({ label, value, multiEmail }: { label: string; value: string | null | undefined; multiEmail?: boolean }) {
  if (multiEmail && value) {
    const emails = value.split(/[,;]/).map(e => e.trim()).filter(Boolean);
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">{label}</label>
        <div className="flex flex-wrap gap-1">
          {emails.map((email, i) => (
            <span key={i} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
              {email}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase mb-0.5">{label}</label>
      <p className="text-sm text-gray-800">{value || <span className="text-gray-400">—</span>}</p>
    </div>
  );
}

function InputEditMultiEmail({ label, value, onChange, error }: {
  label: string; value: string; onChange: (v: string) => void; error?: string;
}) {
  const emails = value ? value.split(/[,;]/).map(e => e.trim()).filter(Boolean) : [];
  const [input, setInput] = useState('');

  const addEmail = () => {
    const trimmed = input.trim();
    if (trimmed && emails.length < 10) {
      onChange(value ? `${value}, ${trimmed}` : trimmed);
      setInput('');
    }
  };

  const removeEmail = (index: number) => {
    const newEmails = emails.filter((_, i) => i !== index);
    onChange(newEmails.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(); }
    if (e.key === 'Backspace' && !input && emails.length > 0) { removeEmail(emails.length - 1); }
  };

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
      <div className={`flex flex-wrap gap-1 p-1.5 border rounded text-sm focus-within:ring-2 focus-within:ring-blue-500 min-h-[34px] ${error ? 'border-red-300 bg-red-50' : ''}`}>
        {emails.map((email, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
            {email}
            <button type="button" onClick={() => removeEmail(i)} className="text-blue-400 hover:text-blue-600">×</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addEmail}
          placeholder={emails.length === 0 ? 'Adicionar e-mail' : ''}
          className="flex-1 min-w-[80px] outline-none bg-transparent text-xs"
        />
      </div>
      {error && <p className="text-red-600 text-xs mt-0.5">{error}</p>}
    </div>
  );
}
