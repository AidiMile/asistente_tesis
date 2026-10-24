"""Datos semilla (database/seed.sql)
Revision ID: 0002
Revises: 0001
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from alembic import op
from sqlfile import read_sql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.get_bind().exec_driver_sql(read_sql("seed.sql"))


def downgrade():
    pass
