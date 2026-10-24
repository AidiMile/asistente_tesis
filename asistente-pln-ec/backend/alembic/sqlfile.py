import os
from pathlib import Path


def read_sql(name: str) -> str:
    here = Path(__file__).resolve()
    candidates = [Path(os.environ["SQL_DIR"]) if "SQL_DIR" in os.environ else None,
                  here.parents[2] / "database", here.parents[1] / "database"]
    for c in candidates:
        if c and (c / name).exists():
            return (c / name).read_text(encoding="utf-8")
    raise FileNotFoundError(f"No se encontró {name}; defina SQL_DIR")
