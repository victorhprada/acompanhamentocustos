from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date, datetime


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
    is_active: Optional[bool] = None


class Company(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_active: bool
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
