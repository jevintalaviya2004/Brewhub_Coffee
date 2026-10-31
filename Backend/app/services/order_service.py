from datetime import datetime, timedelta
from app.database import supabase


class OrderService:

    @staticmethod
    def create_order(order_data):
        total = 0
        order_items = []

        for item in order_data.items:
            product_response = (
                supabase.table("products").select("*").eq("id", item.product_id).execute()
            )
            product = product_response.data[0]
            item_total = product["price"] * item.quantity
            total += item_total
            order_items.append({
                "product_id": item.product_id,
                "quantity":   item.quantity,
                "price":      product["price"],
            })

        order_response = (
            supabase.table("orders")
            .insert({"user_id": order_data.user_id, "total": total})
            .execute()
        )
        created_order = order_response.data[0]

        for item in order_items:
            supabase.table("order_items").insert({
                "order_id":   created_order["id"],
                "product_id": item["product_id"],
                "quantity":   item["quantity"],
                "price":      item["price"],
            }).execute()

        return {
            "message":  "Order created successfully",
            "order_id": created_order["id"],
            "total":    total,
        }

    # ------------------------------------------------------------------ #
    #  READ                                                                #
    # ------------------------------------------------------------------ #

    @staticmethod
    def get_all_orders(from_date=None, to_date=None):
        query = supabase.table("orders").select("*").order("created_at", desc=True)
        if from_date:
            query = query.gte("created_at", from_date.isoformat())
        if to_date:
            next_day = to_date + timedelta(days=1)
            query = query.lt("created_at", next_day.isoformat())

        orders = query.execute().data
        if not orders:
            return []

        order_ids = [o["id"] for o in orders]
        user_ids  = list({o["user_id"] for o in orders})

        users_data = supabase.table("users").select("*").in_("id", user_ids).execute().data
        users      = {u["id"]: u for u in users_data}

        company_ids   = list({u["company_id"] for u in users_data if u.get("company_id")})
        companies_raw = (
            supabase.table("companies").select("*").in_("id", company_ids).execute().data
            if company_ids else []
        )
        companies = {c["id"]: c for c in companies_raw}

        items_data  = supabase.table("order_items").select("*").in_("order_id", order_ids).execute().data
        product_ids = list({i["product_id"] for i in items_data})
        products_raw = (
            supabase.table("products").select("*").in_("id", product_ids).execute().data
            if product_ids else []
        )
        products = {p["id"]: p for p in products_raw}

        items_by_order: dict = {}
        for item in items_data:
            oid = item["order_id"]
            if oid not in items_by_order:
                items_by_order[oid] = []
            product = products.get(item["product_id"], {})
            items_by_order[oid].append({
                "item_id":      item["id"],
                "product_id":   item["product_id"],
                "product_name": product.get("name", "Unknown"),
                "quantity":     item["quantity"],
                "price":        float(item["price"]),
            })

        result = []
        for order in orders:
            user    = users.get(order["user_id"], {})
            company = companies.get(user.get("company_id"), {})
            result.append({
                "order_id":         order["id"],
                "reference_number": str(order.get("reference_number", "")),
                "user_id":          order["user_id"],
                "user_name":        f'{user.get("first_name", "")} {user.get("last_name", "")}'.strip(),
                "company_name":     company.get("name", "Unknown"),
                "created_at":       str(order.get("created_at", "")),
                "total":            float(order["total"]),
                "items":            items_by_order.get(order["id"], []),
            })

        return result

    # ------------------------------------------------------------------ #
    #  UPDATE ITEM                                                         #
    # ------------------------------------------------------------------ #

    @staticmethod
    def update_order_item(item_id: int, quantity: int):
        updated = (
            supabase.table("order_items")
            .update({"quantity": quantity})
            .eq("id", item_id)
            .execute()
            .data
        )
        if not updated:
            return None

        order_id  = updated[0]["order_id"]
        all_items = supabase.table("order_items").select("*").eq("order_id", order_id).execute().data
        new_total = round(sum(float(i["price"]) * i["quantity"] for i in all_items), 2)
        supabase.table("orders").update({"total": new_total}).eq("id", order_id).execute()

        return {"item_id": item_id, "quantity": quantity, "order_id": order_id, "order_total": new_total}

    # ------------------------------------------------------------------ #
    #  DELETE                                                              #
    # ------------------------------------------------------------------ #

    @staticmethod
    def delete_order(order_id: int):
        supabase.table("order_items").delete().eq("order_id", order_id).execute()
        supabase.table("orders").delete().eq("id", order_id).execute()
        return {"deleted_order_id": order_id}

    @staticmethod
    def delete_order_item(item_id: int):
        item_data = supabase.table("order_items").select("*").eq("id", item_id).execute().data
        if not item_data:
            return None

        order_id = item_data[0]["order_id"]
        supabase.table("order_items").delete().eq("id", item_id).execute()

        remaining = supabase.table("order_items").select("*").eq("order_id", order_id).execute().data
        new_total = round(sum(float(i["price"]) * i["quantity"] for i in remaining), 2)
        supabase.table("orders").update({"total": new_total}).eq("id", order_id).execute()

        return {"deleted_item_id": item_id, "order_id": order_id, "new_order_total": new_total}

    # ------------------------------------------------------------------ #
    #  CLEANUP                                                             #
    # ------------------------------------------------------------------ #

    @staticmethod
    def cleanup_old_orders():
        cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()

        old_orders = (
            supabase.table("orders").select("id").lt("created_at", cutoff).execute().data
        )
        if not old_orders:
            return {"deleted_orders": 0}

        order_ids = [o["id"] for o in old_orders]
        supabase.table("order_items").delete().in_("order_id", order_ids).execute()
        supabase.table("orders").delete().lt("created_at", cutoff).execute()

        return {"deleted_orders": len(order_ids)}
