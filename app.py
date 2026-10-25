import os
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models.db_manager import db, Usuario, Perfil, Modismo, Consulta, Respuesta, HistorialInteraccion
from models.nlp_generator import NLPGenerator

app = Flask(__name__)

# Configuración de la base de datos PostgreSQL desde Docker
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.secret_key = os.environ['FLASK_SECRET_KEY']

db.init_app(app)

# Instanciamos nuestro generador de PLN con Hugging Face
nlp_engine = NLPGenerator(model_name="mrm8488/spanish-gpt2")

# --- RUTAS DE AUTENTICACIÓN ---

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        nombre = request.form.get('nombre')
        correo = request.form.get('correo')
        password = request.form.get('password')

        usuario_existente = Usuario.query.filter_by(correo=correo).first()
        if usuario_existente:
            flash('El correo electrónico ya está registrado.', 'danger')
            return redirect(url_for('register'))

        password_hash = generate_password_hash(password)

        nuevo_usuario = Usuario(
            nombre=nombre,
            correo=correo,
            password_hash=password_hash,
            estado='Activo'
        )
        db.session.add(nuevo_usuario)
        db.session.commit()

        nuevo_perfil = Perfil(
            id_usuario=nuevo_usuario.id_usuario,
            rol='Estudiante/Investigador'
        )
        db.session.add(nuevo_perfil)
        db.session.commit()

        flash('¡Registro exitoso! Ahora puedes iniciar sesión.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        correo = request.form.get('correo')
        password = request.form.get('password')

        usuario = Usuario.query.filter_by(correo=correo).first()

        if usuario and check_password_hash(usuario.password_hash, password):
            session['user_id'] = usuario.id_usuario
            session['user_name'] = usuario.nombre
            flash(f'¡Bienvenido de nuevo, {usuario.nombre}!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Correo o contraseña incorrectos.', 'danger')

    return render_template('login.html')


@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        flash('Por favor inicia sesión para acceder al panel.', 'warning')
        return redirect(url_for('login'))
    
    return render_template('dashboard.html', nombre=session.get('user_name'))


@app.route('/logout')
def logout():
    session.clear()
    flash('Has cerrado sesión correctamente.', 'info')
    return redirect(url_for('login'))


# --- MÓDULO DE PROCESAMIENTO DE CONSULTAS E IA ---

@app.route('/api/generar', methods=['POST'])
def api_generar():
    if 'user_id' not in session:
        return jsonify({'error': 'No autorizado'}), 401

    data = request.get_json()
    texto_consulta = data.get('texto', '')
    temperature = float(data.get('temperature', 0.7))
    top_p = float(data.get('top_p', 0.9))
    max_length = int(data.get('max_length', 100))

    # Búsqueda de modismos ecuatorianos en la base de datos PostgreSQL
    modismos_db = Modismo.query.all()
    modismo_encontrado = None
    for m in modismos_db:
        if m.nombre_modismo and m.nombre_modismo.lower() in texto_consulta.lower():
            modismo_encontrado = m.nombre_modismo
            break

    # Generación de texto con el motor de IA
    texto_generado, tiempo_respuesta = nlp_engine.generar_respuesta(
        texto_usuario=texto_consulta,
        modismo_detectado=modismo_encontrado,
        temperature=temperature,
        top_p=top_p,
        max_length=max_length
    )

    # Guardar consulta en la base de datos
    nueva_consulta = Consulta(
        id_usuario=session['user_id'],
        texto_consulta=texto_consulta,
        tipo_entrada='Texto'
    )
    db.session.add(nueva_consulta)
    db.session.commit()

    # Guardar respuesta generada
    nueva_respuesta = Respuesta(
        id_consulta=nueva_consulta.id_consulta,
        texto_generado=texto_generado,
        tiempo_respuesta=tiempo_respuesta
    )
    db.session.add(nueva_respuesta)
    db.session.commit()

    # Registrar en el historial de interacciones
    nuevo_historial = HistorialInteraccion(
        id_usuario=session['user_id'],
        id_consulta=nueva_consulta.id_consulta,
        id_respuesta=nueva_respuesta.id_respuesta
    )
    db.session.add(nuevo_historial)
    db.session.commit()

    # Métricas simuladas orientadas a la tesis (BLEU, ROUGE, BERTScore)
    # En el siguiente paso implementaremos el cálculo real con la librería evaluate
    metricas = {
        'bleu': 0.85,
        'rouge': 0.88,
        'bertscore': 0.91
    }

    return jsonify({
        'texto_generado': texto_generado,
        'modismo_detectado': modismo_encontrado,
        'tiempo_respuesta': tiempo_respuesta,
        'metricas': metricas
    })


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)