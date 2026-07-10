from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date, datetime


class MonthlyRecordBase(BaseModel):
    mes_ano: date

    # Elegíveis
    elegiveis_contrato: Optional[float] = None
    elegiveis: Optional[float] = None
    valor_elegivel: Optional[float] = None
    valor_final: Optional[float] = None

    # Gympass/Totalpass
    vidas_cobradas: Optional[float] = None
    valor_vidas: Optional[float] = None
    qtd_dependentes_gympass: Optional[float] = None
    custo_por_dependente: Optional[float] = None
    total_custo_dependentes: Optional[float] = None

    # Flex
    nr_cartao_contrato_flex: Optional[float] = None
    nr_cartao_carga_flex: Optional[float] = None
    rs_carregado: Optional[float] = None
    media_cartao_realizado: Optional[float] = None
    media_contratada: Optional[float] = None

    # Wiipo
    nr_vidas: Optional[float] = None
    valor_elegivel_wiipo: Optional[float] = None
    faturamento_wiipo: Optional[float] = None
    qtd_dependentes: Optional[float] = None
    valor_por_dependente: Optional[float] = None

    # Financeiro
    mensal_x_rentabilidade: Optional[str] = Field(None, max_length=100)
    custo_por_cliente: Optional[float] = None
    faturamento: Optional[float] = None
    faturamento_dependentes: Optional[float] = None


class MonthlyRecordCreate(MonthlyRecordBase):
    company_id: str


class MonthlyRecordUpdate(BaseModel):
    elegiveis_contrato: Optional[float] = None
    elegiveis: Optional[float] = None
    valor_elegivel: Optional[float] = None
    valor_final: Optional[float] = None
    vidas_cobradas: Optional[float] = None
    valor_vidas: Optional[float] = None
    qtd_dependentes_gympass: Optional[float] = None
    custo_por_dependente: Optional[float] = None
    total_custo_dependentes: Optional[float] = None
    nr_cartao_contrato_flex: Optional[float] = None
    nr_cartao_carga_flex: Optional[float] = None
    rs_carregado: Optional[float] = None
    media_cartao_realizado: Optional[float] = None
    media_contratada: Optional[float] = None
    nr_vidas: Optional[float] = None
    valor_elegivel_wiipo: Optional[float] = None
    faturamento_wiipo: Optional[float] = None
    qtd_dependentes: Optional[float] = None
    valor_por_dependente: Optional[float] = None
    mensal_x_rentabilidade: Optional[str] = Field(None, max_length=100)
    custo_por_cliente: Optional[float] = None
    faturamento: Optional[float] = None
    faturamento_dependentes: Optional[float] = None


class MonthlyRecord(MonthlyRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
