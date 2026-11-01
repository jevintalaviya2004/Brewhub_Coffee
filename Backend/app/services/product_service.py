from app.database import supabase
from app.validation import ValidationProblem, clean_price, clean_product_name


def _name_taken(name: str, exclude_id=None) -> bool:
    rows = supabase.table("products").select("id, name").execute().data or []
    return any(r["name"].strip().lower() == name.lower() and r["id"] != exclude_id for r in rows)


def _clean(product_data, exclude_id=None) -> dict:
    name = clean_product_name(product_data.name)
    if _name_taken(name, exclude_id):
        raise ValidationProblem("name", "product_name_taken", status=409)
    return {"name": name, "price": clean_price(product_data.price)}


class ProductService:

    @staticmethod
    def create_product(product_data):
        response = supabase.table("products").insert(_clean(product_data)).execute()
        return response.data

    @staticmethod
    def get_products():
        response = supabase.table("products").select("*").execute()
        return response.data

    @staticmethod
    def update_product(product_id, product_data):
        data = _clean(product_data, exclude_id=product_id)
        response = supabase.table("products").update(data).eq("id", product_id).execute()
        return response.data

    @staticmethod
    def delete_product(product_id):
        response = supabase.table("products").delete().eq("id", product_id).execute()
        return response.data
