import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from .config import settings
from .database import SessionLocal
from .models import (Contexto, Corpus, CorpusDocumento, EjemploUso, Modismo, Perfil, Region, Significado, Usuario)
from .routers import admin_users, auth, corpus, idioms, metrics, model_admin, queries, users
from .security import hash_password
from .services.idioms import idiom_index

log = logging.getLogger("app")


def _ensure_region(db, nombre: str, tipo: str = "region"):
    row = db.scalars(select(Region).where(Region.nombre == nombre)).first()
    if row is None:
        row = Region(nombre=nombre, tipo=tipo)
        db.add(row)
        db.flush()
    return row


def _ensure_context(db, descripcion: str):
    row = db.scalars(select(Contexto).where(Contexto.descripcion == descripcion)).first()
    if row is None:
        row = Contexto(descripcion=descripcion)
        db.add(row)
        db.flush()
    return row


def _seed_ecuadorian_knowledge(db):
    glossary = [
        {
            "nombre": "chuchaqui",
            "descripcion": "Resaca o malestar posterior al consumo excesivo de alcohol.",
            "significados": ["Resaca: malestar que puede aparecer después de beber demasiado alcohol."],
            "ejemplos": ["Amanecí con chuchaqui después de la fiesta."],
            "regiones": ["Nacional"],
            "contextos": ["Coloquial"],
        },
        {
            "nombre": "guambra",
            "descripcion": "Niño, niña o joven; uso común en varias regiones del Ecuador.",
            "significados": ["Niño, niña o joven."],
            "ejemplos": ["Los guambras juegan fútbol en la cancha."],
            "regiones": ["Sierra", "Costa"],
            "contextos": ["Coloquial", "Familiar"],
        },
        {
            "nombre": "pana",
            "descripcion": "Amigo o compañero cercano.",
            "significados": ["Amigo, compañero de confianza."],
            "ejemplos": ["Ese pana siempre me ayuda con las tareas."],
            "regiones": ["Nacional"],
            "contextos": ["Coloquial", "Informal entre amigos"],
        },
        {
            "nombre": "bacán",
            "descripcion": "Algo muy bueno o excelente.",
            "significados": ["Excelente, genial, muy bueno."],
            "ejemplos": ["Qué bacán la fiesta de ayer."],
            "regiones": ["Nacional"],
            "contextos": ["Coloquial", "Juvenil"],
        },
        {
            "nombre": "chévere",
            "descripcion": "Agradable, bueno o excelente.",
            "significados": ["Que está muy bien, agradable o de buena calidad."],
            "ejemplos": ["Está chévere tu idea para el proyecto."],
            "regiones": ["Nacional"],
            "contextos": ["Coloquial"],
        },
        {
            "nombre": "achachay",
            "descripcion": "Interjección para expresar frío intenso.",
            "significados": ["Expresa que hace mucho frío."],
            "ejemplos": ["¡Achachay, qué frío hace en la mañana!"],
            "regiones": ["Sierra"],
            "contextos": ["Coloquial", "Expresión de emoción"],
        },
        {
            "nombre": "ñaño",
            "descripcion": "Hermano o amigo muy cercano.",
            "significados": ["Hermano o hermana; también amigo cercano."],
            "ejemplos": ["Mi ñaño me prestó su bicicleta."],
            "regiones": ["Sierra"],
            "contextos": ["Familiar"],
        },
        {
            "nombre": "yapa",
            "descripcion": "Un regalo extra o un poco más que se agrega en la compra.",
            "significados": ["Añadidura que se entrega de regalo en una compra."],
            "ejemplos": ["Pídele la yapa al vendedor cuando compres."],
            "regiones": ["Nacional"],
            "contextos": ["Comercial"],
        },
        {
            "nombre": "colita",
            "descripcion": "Aventón o favor de llevar a alguien en el carro.",
            "significados": ["Favor de llevar a alguien en el vehículo que ya va en esa dirección."],
            "ejemplos": ["¿Me das una colita hasta el terminal?"],
            "regiones": ["Nacional"],
            "contextos": ["Coloquial"],
        },
        {
            "nombre": "cachar",
            "descripcion": "Entender o darse cuenta de algo.",
            "significados": ["Entender, darse cuenta de algo."],
            "ejemplos": ["¿Cachaste lo que explicó el profe?"],
            "regiones": ["Nacional"],
            "contextos": ["Coloquial"],
        },
    ]

    for item in glossary:
        existing = db.scalars(select(Modismo).where(Modismo.nombre_modismo == item["nombre"])).first()
        if existing is None:
            row = Modismo(nombre_modismo=item["nombre"], descripcion=item["descripcion"], estado="Activo")
            db.add(row)
            db.flush()
        else:
            row = existing
            if not row.descripcion:
                row.descripcion = item["descripcion"]
            row.estado = "Activo"
        for significado in item["significados"]:
            if not any(s.significado == significado for s in row.significados):
                row.significados.append(Significado(significado=significado))
        for ejemplo in item["ejemplos"]:
            if not any(e.ejemplo == ejemplo for e in row.ejemplos):
                row.ejemplos.append(EjemploUso(ejemplo=ejemplo))
        for region in item["regiones"]:
            region_row = _ensure_region(db, region)
            if region_row not in row.regiones:
                row.regiones.append(region_row)
        for contexto in item["contextos"]:
            context_row = _ensure_context(db, contexto)
            if context_row not in row.contextos:
                row.contextos.append(context_row)

    corpus_name = "Glosario ecuatoriano: términos, modismos y jergas"
    corpus = db.scalars(select(Corpus).where(Corpus.nombre == corpus_name)).first()
    if corpus is None:
        corpus = Corpus(nombre=corpus_name, fuente="Base local PLN-EC", tipo_dato="glosario",
                        descripcion="Glosario de términos, modismos y jergas del Ecuador con significado y ejemplos.",
                        activo=True)
        db.add(corpus)
        db.flush()

    contenido = "\n\n".join(
        f"{item['nombre']}: {item['descripcion']} Significado: {'; '.join(item['significados'])}. Ejemplo: {item['ejemplos'][0]}"
        for item in glossary
    )
    documento = db.scalars(select(CorpusDocumento).where(CorpusDocumento.id_corpus == corpus.id_corpus)).first()
    if documento is None:
        db.add(CorpusDocumento(id_corpus=corpus.id_corpus, titulo="Glosario ecuatoriano",
                              contenido=contenido[:4000]))
    corpus.total_registros = db.scalar(
        select(func.count()).select_from(CorpusDocumento).where(CorpusDocumento.id_corpus == corpus.id_corpus)
    )

    db.commit()
    return True


def bootstrap():
    db = SessionLocal()
    try:
        admin = db.scalars(select(Usuario).where(Usuario.correo == settings.admin_email.lower())).first()
        if not admin:
            u = Usuario(nombre=settings.admin_name, nombre_usuario="admin", correo=settings.admin_email.lower(),
                        password_hash=hash_password(settings.admin_password), estado="Activo", correo_verificado=True)
            u.perfil = Perfil(rol="administrador")
            db.add(u)
            db.flush()
            admin = u
        elif not admin.perfil:
            admin.perfil = Perfil(rol="administrador")
        else:
            admin.perfil.rol = "administrador"
        # La cuenta configurada es la única administradora; todos los registros públicos son usuarios.
        for profile in db.scalars(select(Perfil).where(Perfil.id_usuario != admin.id_usuario,
                                                       Perfil.rol == "administrador")):
            profile.rol = "usuario"
        _seed_ecuadorian_knowledge(db)
        db.commit()
        log.info("Administrador inicial creado: %s", settings.admin_email)
        log.info("Modismos indexados: %s", idiom_index.rebuild(db))
    except Exception as exc:
        log.error("Bootstrap omitido (¿migraciones pendientes?): %s", exc)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    bootstrap()
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan,
              description="API REST del Asistente Virtual PLN-EC: PLN + redes neuronales para español ecuatoriano.")
origins = ["*"] if settings.cors_origins == "*" else [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

for r in (auth.router, users.router, queries.router, admin_users.router, idioms.router, corpus.router,
          model_admin.router, metrics.router):
    app.include_router(r)


@app.get("/health", tags=["Sistema"])
def health():
    return {"status": "ok"}
