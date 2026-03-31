from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        return self.db.execute(stmt).scalar_one_or_none()

    def create_bootstrap_admin(self, email: str, hashed_password: str) -> User:
        user = User(
            email=email,
            hashed_password=hashed_password,
            is_active=True,
            is_superuser=True,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
