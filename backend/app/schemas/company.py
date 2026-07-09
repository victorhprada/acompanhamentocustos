from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Literal
from datetime import date, datetime

TipoEmpresa = Literal["matriz", "filial"]


class CompanyBase(BaseModel):
    company_id: str = Field(..., min_length=1, max_length=50)
    empresa: str = Field(..., min_length=1, max_length=255)
    cnpj: str = Field(..., max_length=18)
    razao_social: Optional[str] = Field(None, max_length=255)
    data_assinatura_contrato: Optional[date] = None
    email_envio: Optional[str] = Field(None, max_length=255)
    inicio_cobranca: Optional[date] = None
    vencimento: Optional[int] = Field(None, ge=1, le=31)
    nota_fiscal_descricao: Optional[str] = None
    subsidio: Optional[bool] = None
    tipo_empresa: TipoEmpresa


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    empresa: Optional[str] = Field(None, max_length=255)
    cnpj: Optional[str] = Field(None, max_length=18)
    razao_social: Optional[str] = Field(None, max_length=255)
    data_assinatura_contrato: Optional[date] = None
    email_envio: Optional[str] = Field(None, max_length=255)
    inicio_cobranca: Optional[date] = None
    vencimento: Optional[int] = Field(None, ge=1, le=31)
    nota_fiscal_descricao: Optional[str] = None
    subsidio: Optional[bool] = None
    tipo_empresa: Optional[TipoEmpresa] = None
    is_active: Optional[bool] = None

    @field_validator("tipo_empresa")
    @classmethod
    def validate_tipo_empresa(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("matriz", "filial"):
            raise ValueError("tipo_empresa deve ser 'matriz' ou 'filial'")
        return v



class Company(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_active: bool
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
