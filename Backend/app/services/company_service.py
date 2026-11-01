from app.database import supabase
from app.validation import ValidationProblem, clean_company_name, clean_domains, clean_logo_url


def _name_taken(name: str, exclude_id=None) -> bool:
    rows = supabase.table("companies").select("id, name").execute().data or []
    return any(r["name"].strip().lower() == name.lower() and r["id"] != exclude_id for r in rows)


def _clean(company_data, exclude_id=None) -> dict:
    name = clean_company_name(company_data.name)
    if _name_taken(name, exclude_id):
        raise ValidationProblem("name", "company_name_taken", status=409)
    return {
        "name": name,
        "logo_url": clean_logo_url(company_data.logo_url),
        "email_domains": clean_domains(company_data.email_domains),
    }


class CompanyService:

    @staticmethod
    def create_company(company_data):
        response = supabase.table("companies").insert(_clean(company_data)).execute()
        return response.data

    @staticmethod
    def get_all_companies():
        response = supabase.table("companies").select("*").execute()
        return response.data

    @staticmethod
    def update_company(company_id: int, company_data):
        data = _clean(company_data, exclude_id=company_id)
        response = (
            supabase.table("companies").update(data).eq("id", company_id).execute()
        )
        return response.data

    @staticmethod
    def delete_company(company_id: int):
        response = supabase.table("companies").delete().eq("id", company_id).execute()
        return response.data
