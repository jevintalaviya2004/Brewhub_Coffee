from app.database import supabase
from app.auth.password_handler import verify_password

class AdminService:

    @staticmethod
    def login_admin(admin_data):

        response = (
            supabase
            .table("admins")
            .select("*")
            .eq("email", admin_data.email)
            .execute()
        )

        admins = response.data

        if len(admins) == 0:
            return None

        admin = admins[0]

        try:
            valid_password = verify_password(
                admin_data.password,
                admin["password"]
            )
        except (ValueError, TypeError):
            # stored value is not a valid bcrypt hash
            valid_password = False

        if not valid_password:
            return None

        # never send the password hash back to the client
        admin.pop("password", None)

        return admin