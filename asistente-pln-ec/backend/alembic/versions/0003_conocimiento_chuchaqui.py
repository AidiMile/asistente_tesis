"""Agrega el modismo chuchaqui y conocimiento de salud al corpus.
Revision ID: 0003
Revises: 0002
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from alembic import op
from sqlfile import read_sql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.get_bind().exec_driver_sql(read_sql("seed.sql"))


def downgrade():
    pass