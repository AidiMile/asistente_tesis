"""Cache local de respuestas aprendidas.
Revision ID: 0004
Revises: 0003
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "conocimiento_aprendido",
        sa.Column("id_conocimiento", sa.Integer(), primary_key=True),
        sa.Column("consulta_normalizada", sa.Text(), nullable=False, unique=True),
        sa.Column("consulta_original", sa.Text(), nullable=False),
        sa.Column("respuesta", sa.Text(), nullable=False),
        sa.Column("modelo", sa.String(length=100)),
        sa.Column("veces_utilizado", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fecha_creacion", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("fecha_actualizacion", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("conocimiento_aprendido")
