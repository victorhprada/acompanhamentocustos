export interface Company {
  id: string;
  company_id: string;
  empresa: string;
  cnpj: string;
  razao_social?: string;
  data_assinatura_contrato?: string;
  email_envio?: string;
  inicio_cobranca?: string;
  vencimento?: number;
  nota_fiscal_descricao?: string;
  subsidio?: boolean;
  tipo_empresa: 'matriz' | 'filial';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyRecord {
  id: string;
  company_id: string;
  mes_ano: string;
  elegiveis_contrato?: number;
  elegiveis?: number;
  valor_elegivel?: number;
  valor_final?: number;
  vidas_cobradas?: number;
  valor_vidas?: number;
  qtd_dependentes_gympass?: number;
  custo_por_dependente?: number;
  total_custo_dependentes?: number;
  nr_cartao_contrato_flex?: number;
  nr_cartao_carga_flex?: number;
  rs_carregado?: number;
  media_cartao_realizado?: number;
  media_contratada?: number;
  nr_vidas?: number;
  valor_elegivel_wiipo?: number;
  faturamento_wiipo?: number;
  qtd_dependentes?: number;
  valor_por_dependente?: number;
  mensal_x_rentabilidade?: string;
  custo_por_cliente?: number;
  faturamento?: number;
  faturamento_dependentes?: number;
  observacao?: string;
  created_at: string;
  updated_at: string;
}
