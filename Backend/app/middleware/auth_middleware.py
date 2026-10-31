from fastapi import Header, HTTPException
from jose import jwt, JWTError

from app.config import (
    JWT_SECRET,
    JWT_ALGORITHM
)


def verify_token(authorization: str = Header(None)):
    """Dependency for admin routes: requires 'Authorization: Bearer <token>'."""

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization token missing"
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header"
        )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        return payload

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
