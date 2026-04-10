import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCompanies, createCompany, updateCompany, deactivateCompany, activateCompany } from '../../services/api';
import ImportModal from '../../components/ImportModal';

const ERROR_MESSAGES: Record<string, string> = {
  'cnpj': 'CNPJ',
  'company_id': 'Company ID',
  'empresa': 'Empresa',
  'email_envio': 'E-mail',
  'string_too_short': 'deve ter no mínimo {min_length} caracteres',
  'string_too_long': 'deve ter no máximo {max_length} caracteres',
  'value_error': 'valor inválido',
  'missing': 'é obrigatório',
  'string_type': 'deve ser um texto',
  'value_error.email': 'deve ser um e-mail válido',
  'value_error.date': 'deve ser uma data válida',
  'int_parsing': 'deve ser um número inteiro',
};

function parseApiErrors(err: any): Record<string, string> {
  const errors: Record<string, string> = {};
  try {
    const data = err?.response?.data;
    const details = data?.detail;
    if (Array.isArray(details)) {
      details.forEach((d: any) => {
        const field = d.loc?.[d.loc.length - 1];
        const type = d.type || '';
        const ctx = d.ctx || {};

        // Custom messages by type
        let msg = '';
        if (type === 'string_too_short') {
          msg = `deve ter no mínimo ${ctx.min_length} caracteres`;
        } else if (type === 'string_too_long') {
          msg = `deve ter no máximo ${ctx.max_length} caracteres`;
        } else if (type === 'missing') {
          msg = 'é obrigatório';
        } else if (type === 'value_error.email') {
          msg = 'deve ser um e-mail válido';
        } else if (type === 'value_error.date') {
          msg = 'deve ser uma data válida';
        } else if (type === 'int_parsing') {
          msg = 'deve ser um número inteiro';
        } else if (type.startsWith('value_error')) {
          msg = 'valor inválido';
        } else if (d.msg) {
          msg = d.msg;
        }

        if (field && msg) {
          const fieldName = ERROR_MESSAGES[field] || field;
          errors[field] = `${fieldName}: ${msg}`;
        }
      });
    } else if (typeof details === 'string') {
      errors._global = details;
    } else {
      errors._global = 'Erro ao salvar. Tente novamente.';
    }
  } catch {
    errors._global = 'Erro de conexão. Verifique sua internet.';
  }
  return errors;
}

export default function CompaniesList() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showInactive, setShowInactive] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ company: any; action: 'activate' | 'deactivate' } | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies', showInactive],
    queryFn: () => getCompanies(!showInactive),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [formData, setFormData] = useState({
    company_id: '',
    empresa: '',
    cnpj: '',
    razao_social: '',
    cliente: '',
    email_envio: '',
    inicio_cobranca: '',
    vencimento: '',
    nota_fiscal_descricao: '',
  });

  const createMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', showInactive] });
      closeForm();
    },
    onError: (err: any) => setErrors(parseApiErrors(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', showInactive] });
      closeForm();
    },
    onError: (err: any) => setErrors(parseApiErrors(err)),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setErrors({});
    setFormData({ company_id: '', empresa: '', cnpj: '', razao_social: '', cliente: '', email_envio: '', inicio_cobranca: '', vencimento: '', nota_fiscal_descricao: '' });
  };

  const startEdit = (company: any) => {
    setEditingId(company.id);
    setShowForm(true);
    setErrors({});
    setFormData({
      company_id: company.company_id || '',
      empresa: company.empresa || '',
      cnpj: company.cnpj || '',
      razao_social: company.razao_social || '',
      cliente: company.cliente || '',
      email_envio: company.email_envio || '',
      inicio_cobranca: company.inicio_cobranca ? company.inicio_cobranca.slice(0, 10) : '',
      vencimento: company.vencimento?.toString() || '',
      nota_fiscal_descricao: company.nota_fiscal_descricao || '',
    });
  };

  const deactivateMutation = useMutation({
    mutationFn: deactivateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', showInactive] });
      setConfirmAction(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', showInactive] });
      setConfirmAction(null);
    },
  });

  const handleStatusToggle = (company: any) => {
    if (company.is_active) {
      setConfirmAction({ company, action: 'deactivate' });
    } else {
      setConfirmAction({ company, action: 'activate' });
    }
  };

  const confirmStatusChange = () => {
    if (!confirmAction) return;
    if (confirmAction.action === 'deactivate') {
      deactivateMutation.mutate(confirmAction.company.id);
    } else {
      activateMutation.mutate(confirmAction.company.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    // Filter out empty fields and convert vencimento to number
    const data: Record<string, any> = {};
    if (formData.company_id) data.company_id = formData.company_id;
    if (formData.empresa) data.empresa = formData.empresa;
    if (formData.cnpj) data.cnpj = formData.cnpj;
    if (formData.razao_social) data.razao_social = formData.razao_social;
    if (formData.cliente) data.cliente = formData.cliente;
    if (formData.email_envio) data.email_envio = formData.email_envio;
    if (formData.inicio_cobranca) data.inicio_cobranca = formData.inicio_cobranca;
    if (formData.vencimento) data.vencimento = parseInt(formData.vencimento);
    if (formData.nota_fiscal_descricao) data.nota_fiscal_descricao = formData.nota_fiscal_descricao;

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Empresas</h2>
          <div className="flex items-center gap-3 mt-1">
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={() => setShowInactive(!showInactive)}
                className="rounded border-gray-300"
              />
              Mostrar inativas
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Importar planilha
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {showForm ? 'Cancelar' : '+ Nova Empresa'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Editando Empresa' : 'Nova Empresa'}</h3>

          {/* Global errors */}
          {errors._global && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errors._global}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Company ID" value={formData.company_id} onChange={(v) => setFormData({ ...formData, company_id: v })} required error={errors.company_id} />
            <Input label="Empresa" value={formData.empresa} onChange={(v) => setFormData({ ...formData, empresa: v })} required error={errors.empresa} />
            <Input label="CNPJ" value={formData.cnpj} onChange={(v) => setFormData({ ...formData, cnpj: v })} required error={errors.cnpj} placeholder="00.000.000/0001-00" />
            <Input label="Razão Social" value={formData.razao_social} onChange={(v) => setFormData({ ...formData, razao_social: v })} error={errors.razao_social} />
            <Input label="Cliente" value={formData.cliente} onChange={(v) => setFormData({ ...formData, cliente: v })} error={errors.cliente} />
            <MultiEmailInput value={formData.email_envio} onChange={(v) => setFormData({ ...formData, email_envio: v })} error={errors.email_envio} />
            <Input label="Início Cobrança" type="date" value={formData.inicio_cobranca} onChange={(v) => setFormData({ ...formData, inicio_cobranca: v })} error={errors.inicio_cobranca} />
            <Input label="Dia Vencimento" type="number" value={formData.vencimento} onChange={(v) => setFormData({ ...formData, vencimento: v })} placeholder="1-31" error={errors.vencimento} />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição na Nota Fiscal</label>
            <textarea
              value={formData.nota_fiscal_descricao}
              onChange={(e) => setFormData({ ...formData, nota_fiscal_descricao: e.target.value })}
              rows={3}
              className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.nota_fiscal_descricao ? 'border-red-300 bg-red-50' : ''}`}
            />
            {errors.nota_fiscal_descricao && <p className="text-red-600 text-xs mt-1">{errors.nota_fiscal_descricao}</p>}
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNPJ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Início</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {companies?.map((company) => (
              <tr key={company.id} className={`hover:bg-gray-50 ${!company.is_active ? 'bg-gray-50' : ''}`}>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    company.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${company.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {company.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{company.company_id}</td>
                <td className="px-4 py-3 text-sm font-medium">
                  <Link to={`/companies/${company.id}`} className={`${company.is_active ? 'text-blue-600 hover:underline' : 'text-gray-500'}`}>
                    {company.empresa}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{company.cnpj}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{company.cliente || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{company.inicio_cobranca ? company.inicio_cobranca.slice(0, 10).split('-').reverse().join('/') : '-'}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(company)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleStatusToggle(company)}
                      className={`${company.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {company.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {companies?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {showInactive ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa ativa. Marque "Mostrar inativas" para ver todas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation modal for activate/deactivate */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                confirmAction.action === 'deactivate'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-green-100 text-green-600'
              }`}>
                {confirmAction.action === 'deactivate' ? '⚠' : '✓'}
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                {confirmAction.action === 'deactivate' ? 'Desativar empresa?' : 'Ativar empresa?'}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              <strong>{confirmAction.company.empresa}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {confirmAction.action === 'deactivate'
                ? 'A empresa será marcada como inativa. Os registros mensais serão preservados.'
                : 'A empresa será reativada e voltará a aparecer na lista principal.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmStatusChange}
                disabled={deactivateMutation.isPending || activateMutation.isPending}
                className={`flex-1 py-2 rounded-lg text-sm text-white disabled:opacity-50 ${
                  confirmAction.action === 'deactivate'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {deactivateMutation.isPending || activateMutation.isPending
                  ? 'Processando...'
                  : confirmAction.action === 'deactivate' ? 'Desativar' : 'Ativar'}
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

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['companies'] })}
        />
      )}
    </div>
  );
}

function MultiEmailInput({ value, onChange, error }: {
  value: string; onChange: (v: string) => void; error?: string;
}) {
  const emails = value ? value.split(/[,;]/).map(e => e.trim()).filter(Boolean) : [];
  const [input, setInput] = useState('');

  const addEmail = () => {
    const trimmed = input.trim();
    if (trimmed && emails.length < 10) {
      onChange(value ? `${value},${trimmed}` : trimmed);
      setInput('');
    }
  };

  const removeEmail = (index: number) => {
    const newEmails = emails.filter((_, i) => i !== index);
    onChange(newEmails.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
    if (e.key === 'Backspace' && !input && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">E-mails para envio</label>
      <div className={`flex flex-wrap gap-1.5 p-2 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 min-h-[42px] ${error ? 'border-red-300 bg-red-50' : ''}`}>
        {emails.map((email, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
            {email}
            <button type="button" onClick={() => removeEmail(i)} className="text-blue-400 hover:text-blue-600 ml-0.5">×</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addEmail}
          placeholder={emails.length === 0 ? 'Digite e-mails e pressione Enter' : ''}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
        />
      </div>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      {emails.length > 0 && <p className="text-xs text-gray-400 mt-1">{emails.length} e-mail(s)</p>}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, placeholder, error }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string; error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${error ? 'border-red-300 bg-red-50' : ''}`}
      />
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
