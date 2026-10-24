# Usamos una imagen oficial de Python 3.10 ligera
FROM python:3.10-slim

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Instalamos dependencias del sistema necesarias para compilar algunas librerías de NLP
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copiamos e instalamos los requerimientos de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del código del proyecto al contenedor
COPY . .

# Exponemos el puerto donde correrá Flask
EXPOSE 5000

# Comando para ejecutar la aplicación
CMD ["python", "app.py"]