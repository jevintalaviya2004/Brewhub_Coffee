from app.database import supabase


class CompanyService:

    @staticmethod
    def create_company(company_data):
        data = {
            "name":     company_data.name,
            "logo_url": company_data.logo_url,
        }
        response = supabase.table("companies").insert(data).execute()
        return response.data

    @staticmethod
    def get_all_companies():
        response = supabase.table("companies").select("*").execute()
        return response.data

    @staticmethod
    def update_company(company_id: int, company_data):
        data = {
            "name":     company_data.name,
            "logo_url": company_data.logo_url,
        }
        response = (
            supabase.table("companies").update(data).eq("id", company_id).execute()
        )
        return response.data

    @staticmethod
    def delete_company(company_id: int):
        response = supabase.table("companies").delete().eq("id", company_id).execute()
        return response.data
