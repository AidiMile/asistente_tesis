"""Esquema inicial (database/schema.sql)
Revision ID: 0001
Revises:
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from alembic import op
from sqlfile import read_sql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

TABLES = ["corpus_modismo", "corpus_documentos", "corpus_entrenamiento", "modismo_region", "regiones",
          "modismo_contexto", "contextos", "ejemplos_uso", "significados", "modismos", "historial_interacciones",
          "evaluaciones", "respuestas", "parametros_modelo", "modelos_ia", "consulta_entidad", "entidades",
          "consultas", "intenciones", "tokens_usuario", "perfiles", "usuarios"]


def upgrade():
    op.get_bind().exec_driver_sql(read_sql("schema.sql"))


def downgrade():
    for t in TABLES:
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
