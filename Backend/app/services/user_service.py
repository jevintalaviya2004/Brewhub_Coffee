from app.database import supabase
from app.validation import (
    ValidationProblem,
    clean_email,
    clean_name,
    clean_pin,
    parse_domains,
)


def _like_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _company(company_id: int) -> dict:
    rows = supabase.table("companies").select("*").eq("id", company_id).execute().data
    if not rows:
        raise ValidationProblem("company_id", "company_not_found", status=404)
    return rows[0]


def _email_taken(email: str, exclude_id=None) -> bool:
    rows = supabase.table("users").select("id, email").ilike("email", _like_escape(email)).execute().data or []
    return any(r["id"] != exclude_id for r in rows)


def _pin_taken(company_id: int, pin: str, exclude_id=None) -> bool:
    rows = (
        supabase.table("users").select("id").eq("company_id", company_id).eq("pin", pin).execute().data or []
    )
    return any(r["id"] != exclude_id for r in rows)


class UserService:

    @staticmethod
    def create_user(user_data):
        company = _company(user_data.company_id)
        first_name = clean_name(user_data.first_name, "first_name")
        last_name = clean_name(user_data.last_name, "last_name")
        email = clean_email(user_data.email, parse_domains(company.get("email_domains")))
        pin = clean_pin(user_data.pin)

        if _email_taken(email):
            raise ValidationProblem("email", "email_taken", status=409)
        if _pin_taken(company["id"], pin):
            raise ValidationProblem("pin", "pin_taken", status=409)

        data = {
            "company_id": company["id"],
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "pin": pin,
        }
        response = supabase.table("users").insert(data).execute()
        return response.data

    @staticmethod
    def get_users_by_company(company_id):
        response = (
            supabase.table("users").select("*").eq("company_id", company_id).execute()
        )
        return response.data

    @staticmethod
    def update_user(user_id: int, user_data):
        rows = supabase.table("users").select("*").eq("id", user_id).execute().data
        if not rows:
            raise ValidationProblem("id", "user_not_found", status=404)
        current = rows[0]

        data = {}
        if user_data.first_name is not None:
            data["first_name"] = clean_name(user_data.first_name, "first_name")
        if user_data.last_name is not None:
            data["last_name"] = clean_name(user_data.last_name, "last_name")
        if user_data.email is not None and user_data.email.strip().lower() != (current.get("email") or "").lower():
            company = _company(current["company_id"])
            email = clean_email(user_data.email, parse_domains(company.get("email_domains")))
            if _email_taken(email, exclude_id=user_id):
                raise ValidationProblem("email", "email_taken", status=409)
            data["email"] = email
        if user_data.pin is not None and user_data.pin.strip() != (current.get("pin") or ""):
            pin = clean_pin(user_data.pin)
            if _pin_taken(current["company_id"], pin, exclude_id=user_id):
                raise ValidationProblem("pin", "pin_taken", status=409)
            data["pin"] = pin

        if not data:
            return None

        response = supabase.table("users").update(data).eq("id", user_id).execute()
        return response.data

    @staticmethod
    def delete_user(user_id):
        response = supabase.table("users").delete().eq("id", user_id).execute()
        return response.data
