from app.database import supabase

class ProductService:

    @staticmethod
    def create_product(product_data):

        data = {
            "name": product_data.name,
            "price": product_data.price
        }

        response = (
            supabase
            .table("products")
            .insert(data)
            .execute()
        )

        return response.data

    @staticmethod
    def get_products():

        response = (
            supabase
            .table("products")
            .select("*")
            .execute()
        )

        return response.data

    @staticmethod
    def update_product(product_id, product_data):

        data = {
            "name": product_data.name,
            "price": product_data.price
        }

        response = (
            supabase
            .table("products")
            .update(data)
            .eq("id", product_id)
            .execute()
        )

        return response.data

    @staticmethod
    def delete_product(product_id):

        response = (
            supabase
            .table("products")
            .delete()
            .eq("id", product_id)
            .execute()
        )

        return response.data