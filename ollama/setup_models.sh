#!/bin/sh
set -eu
rm -f /tmp/model-ready
ollama serve &
server_pid=$!
until ollama list >/dev/null 2>&1; do sleep 2; done
if ! ollama list | grep -q '^llama3.2:3b'; then
  ollama pull llama3.2:3b
fi
# Reconstruir aplica siempre la versión actual de las instrucciones y reutiliza
# las capas descargadas del modelo base, por lo que no vuelve a descargarlo.
ollama create asistente-ecuatoriano -f /Modelfile
# Precalienta el modelo para que el primer usuario no pague el costo de carga.
ollama run asistente-ecuatoriano "Responde únicamente: listo." >/dev/null
touch /tmp/model-ready
echo "Ollama y asistente-ecuatoriano listos."
wait "$server_pid"
