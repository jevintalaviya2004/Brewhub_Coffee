from jose import jwt
from datetime import datetime, timedelta

from app.config import (
    JWT_SECRET,
    JWT_ALGORITHM
)


def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(hours=2)

    to_encode.update({"exp": expire})

    token = jwt.encode(
        to_encode,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

    return token