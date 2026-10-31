import pandas as pd
from io import BytesIO
from datetime import timedelta
from app.database import supabase


class ExportService:

    @staticmethod
    def export_company_orders(from_date=None, to_date=None):
        products_response = supabase.table("products").select("*").execute()
        products      = products_response.data
        product_map   = {p["id"]: p["name"] for p in products}
        product_names = [p["name"] for p in products]

        companies_response = supabase.table("companies").select("*").execute()
        companies = companies_response.data

        output = BytesIO()
        writer = pd.ExcelWriter(output, engine="openpyxl")

        for company in companies:
            users_response = (
                supabase.table("users")
                .select("*")
                .eq("company_id", company["id"])
                .execute()
            )
            users = users_response.data
            rows  = []

            for user in users:
                order_query = (
                    supabase.table("orders").select("*").eq("user_id", user["id"])
                )
                if from_date:
                    order_query = order_query.gte("created_at", from_date.isoformat())
                if to_date:
                    next_day    = to_date + timedelta(days=1)
                    order_query = order_query.lt("created_at", next_day.isoformat())

                orders = order_query.execute().data

                product_quantities = {name: 0 for name in product_names}
                total = 0.0

                for order in orders:
                    total += float(order["total"])
                    items_response = (
                        supabase.table("order_items")
                        .select("*")
                        .eq("order_id", order["id"])
                        .execute()
                    )
                    for item in items_response.data:
                        pname = product_map.get(item["product_id"])
                        if pname:
                            product_quantities[pname] += item["quantity"]

                rows.append({
                    "Name":    f'{user["first_name"]} {user["last_name"]}',
                    "Company": company["name"],
                    "Email":   user["email"],
                    **product_quantities,
                    "Total":   round(total, 2),
                })

            cols = ["Name", "Company", "Email"] + product_names + ["Total"]
            df   = pd.DataFrame(rows, columns=cols) if rows else pd.DataFrame(columns=cols)

            sheet_name = company["name"][:31]
            df.to_excel(writer, sheet_name=sheet_name, index=False)

        writer.close()
        output.seek(0)
        return output
