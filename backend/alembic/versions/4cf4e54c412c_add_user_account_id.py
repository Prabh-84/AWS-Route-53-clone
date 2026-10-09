"""add user account_id

Revision ID: 4cf4e54c412c
Revises: 2e60b0d8ca2d
Create Date: 2026-10-09 11:35:38.552960
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4cf4e54c412c'
down_revision: Union[str, None] = '2e60b0d8ca2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('account_id', sa.String(length=12), nullable=False))
        batch_op.create_unique_constraint('uq_users_account_id', ['account_id'])



def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('uq_users_account_id', type_='unique')
        batch_op.drop_column('account_id')

