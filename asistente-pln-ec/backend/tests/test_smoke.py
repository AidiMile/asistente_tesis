import os, tempfile
from sqlalchemy import select
os.environ.update(DATABASE_URL=f"sqlite:///{tempfile.mkdtemp()}/t.db", LLM_BACKEND="mock", AUTO_EVAL="false",
                  ADMIN_EMAIL="admin@t.ec", ADMIN_PASSWORD="Admin12345")
from fastapi.testclient import TestClient
from app.database import Base, engine, SessionLocal
from app import models
from app.models import (ConocimientoAprendido, Intencion, ModeloIA, ParametrosModelo, Modismo, Corpus,
                        CorpusDocumento, Perfil)
from app.main import app, bootstrap
from app.services import pipeline


def setup_module(_):
    Base.metadata.create_all(engine)
    db = SessionLocal()
    for n in ["Saludo", "Pregunta", "Solicitud", "Comando", "Consulta_Modismo"]:
        db.add(Intencion(nombre=n))
    m = ModeloIA(nombre_modelo="llama3", activo=True)
    m.parametros = ParametrosModelo()
    db.add(m)
    db.commit(); db.close()
    bootstrap()


def hdr(c, correo, pw):
    r = c.post("/auth/login", json={"correo": correo, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["access_token"]}


def test_seeded_ecuadorian_knowledge_is_persisted():
    db = SessionLocal()
    try:
        assert db.scalars(select(Modismo).where(Modismo.nombre_modismo == "guambra")).first() is not None
        assert db.scalars(select(Modismo).where(Modismo.nombre_modismo == "pana")).first() is not None
        corpus = db.scalars(select(Corpus).where(Corpus.nombre == "Glosario ecuatoriano: términos, modismos y jergas")).first()
        assert corpus is not None
        assert db.scalars(select(CorpusDocumento).where(CorpusDocumento.id_corpus == corpus.id_corpus)).first() is not None
    finally:
        db.close()


def test_flow(monkeypatch):
    c = TestClient(app)
    assert c.post("/auth/register", json={"nombre": "Ana", "nombre_usuario": "ana", "correo": "ana@t.ec",
                                          "password": "debil"}).status_code == 422
    assert c.post("/auth/register", json={"nombre": "Ana", "nombre_usuario": "ana", "correo": "ana@t.ec",
                                          "password": "Clave1234"}).status_code == 201
    assert c.post("/auth/register", json={"nombre": "Ana", "nombre_usuario": "ana2", "correo": "ana@t.ec",
                                          "password": "Clave1234"}).status_code == 409
    u, a = hdr(c, "ana@t.ec", "Clave1234"), hdr(c, "admin@t.ec", "Admin12345")
    assert c.get("/admin/users", headers=u).status_code == 403
    r = c.post("/admin/idioms", headers=a, json={
        "nombre_modismo": "quimbolito", "significados": ["Panecillo de masa dulce"], "ejemplos": ["Me compré un quimbolito"],
        "regiones": ["Sierra"], "contextos": ["Familiar"]})
    assert r.status_code == 201, r.text
    r = c.post("/queries", headers=u, json={"texto": "¿Qué significa quimbolito? Hola, soy Pedro Pérez"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["modismos"] and j["modismos"][0]["modismo"] == "quimbolito"
    assert j["intencion"] == "Consulta_Modismo"
    assert "id_historial" in j and j["id_historial"] is not None
    chat_id = j["id_historial"]
    assert c.post("/queries", headers=u, json={"texto": "x" * 501}).status_code == 422
    h = c.get("/history", headers=u).json()
    assert h["total"] == 1 and h["items"][0]["modismos"] == ["quimbolito"]
    assert len(h["items"][0]["mensajes"]) >= 2
    assert c.get("/admin/history", headers=a).json()["total"] == 1

    # Continuar conversación con id_historial_origen: debe hacer UPDATE sin duplicar
    cont = c.post("/queries", headers=u, json={"texto": "¿Y de qué está hecho?", "id_historial_origen": chat_id})
    assert cont.status_code == 200
    assert cont.json()["id_historial"] == chat_id
    h_cont = c.get("/history", headers=u).json()
    assert h_cont["total"] == 1, "No debe duplicar registros en historial al continuar un chat"
    assert len(h_cont["items"][0]["mensajes"]) >= 4, "Debe acumular los mensajes del chat"

    # Eliminar conversación
    del_r = c.delete(f"/history/{chat_id}", headers=u)
    assert del_r.status_code == 204
    assert c.get("/history", headers=u).json()["total"] == 0
    cached = c.post("/queries", headers=u, json={"texto": "¿Qué significa quimbolito? Hola, soy Pedro Pérez"})
    assert cached.status_code == 200
    assert cached.json()["origen_respuesta"] == "base_local"
    db = SessionLocal()
    assert db.scalars(select(ConocimientoAprendido)).first().veces_utilizado == 1
    assert len(db.scalars(select(Perfil).where(Perfil.rol == "administrador")).all()) == 1
    db.close()
    assert c.put("/admin/model/params", headers=a, json={"temperatura": 2, "top_p": .9, "max_tokens": 100}).status_code == 422
    assert c.put("/admin/model/params", headers=a, json={"temperatura": .5, "top_p": .9, "max_tokens": 100}).status_code == 200
    cr = c.post("/admin/corpus", headers=a, json={"nombre": "Prueba"}).json()
    f = c.post(f"/admin/corpus/{cr['id_corpus']}/documents", headers=a,
               files={"file": ("a.txt", "Quito es la capital del Ecuador.\n\nGuayaquil es el puerto principal.".encode())})
    assert f.json()["pasajes_cargados"] >= 1
    assert c.get("/admin/stats", headers=a).json()["consultas"] == 2
    assert c.get("/admin/metrics/summary", headers=a).status_code == 200

    idiom = c.post("/admin/idioms", headers=a, json={
        "nombre_modismo": "culi",
        "descripcion": "Dicho coloquial para referirse a una persona poco sensata o de mala intención.",
        "significados": ["Persona de mala intención o poco prudente."],
        "ejemplos": ["Ese culi no me dejó pasar."],
        "regiones": ["Nacional"], "contextos": ["Coloquial"]})
    assert idiom.status_code == 201, idiom.text

    corpus_response = c.post("/admin/corpus", headers=a, json={
        "nombre": "Guía de salud", "fuente": "NIAAA; NHS", "tipo_dato": "guia_salud"})
    assert corpus_response.status_code == 201, corpus_response.text
    corpus = corpus_response.json()
    health_text = (
        "En Ecuador, chuchaqui es el nombre coloquial de la resaca, que puede causar sed, cansancio, "
        "dolor de cabeza, náusea y malestar estomacal. La atención y coordinación pueden seguir afectadas; "
        "no conduzcas. Fuentes: NIAAA, https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/hangovers.\n\n"
        "Para el chuchaqui no hay una cura inmediata comprobada; el cuerpo necesita tiempo. Si está despierta "
        "y puede tragar, la persona puede beber agua a sorbos y descansar. Más alcohol, café o una ducha no "
        "curan la resaca. No indiques dosis: el alcohol con paracetamol puede dañar el hígado; aspirina e "
        "ibuprofeno pueden irritar el estómago. Consulta a un profesional de salud o farmacéutico.\n\n"
        "El chuchaqui no debe confundirse con intoxicación alcohólica. Confusión intensa, dificultad para "
        "despertar, convulsiones, respiración lenta o irregular y piel azulada o muy pálida requieren urgencia: "
        "en Ecuador llama al ECU 911 y no dejes sola a la persona. Si está inconsciente, no le des comida ni "
        "bebida. Fuente: NHS, https://www.nhs.uk/conditions/alcohol-poisoning/.")
    uploaded = c.post(f"/admin/corpus/{corpus['id_corpus']}/documents", headers=a,
                      files={"file": ("chuchaqui.txt", health_text.encode("utf-8"))})
    assert uploaded.status_code == 200, uploaded.text

    captured = {}

    def capture_prompt(messages, model, temperature, top_p, max_tokens):
        captured["messages"] = messages
        return "Orientación generada con el corpus sanitario."

    monkeypatch.setattr(pipeline.llm, "chat", capture_prompt)
    health_query = c.post("/queries", headers=u, json={
        "texto": "Tengo chuchaqui, ¿qué me recomiendas?"})
    assert health_query.status_code == 200, health_query.text
    assert health_query.json()["modismos"][0]["modismo"] == "chuchaqui"
    system_prompt = captured["messages"][0]["content"]
    assert "ECU 911" in system_prompt
    assert "Fuente: chuchaqui.txt" in system_prompt

    continued = c.post("/queries", headers=u, json={
        "texto": "¿Y qué más recomendaciones hay?",
        "historial_contexto": [
            {"role": "user", "content": "Tengo chuchaqui, ¿qué me recomiendas?"},
            {"role": "assistant", "content": "Descansa y toma agua."}
        ]
    })
    assert continued.status_code == 200
    assert captured["messages"][-2]["content"] == "Descansa y toma agua."

    assert c.delete(f"/admin/users/{c.get('/users/me', headers=u).json()['id_usuario']}", headers=a).status_code == 204
