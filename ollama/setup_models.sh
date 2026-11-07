#!/bin/sh
set -eu
rm -f /tmp/model-ready
ollama serve &
server_pid=$!
until ollama list >/dev/null 2>&1; do sleep 2; done
if ! ollama list | grep -q '^llama3.2:3b'; then
  ollama pull llama3.2:3b
fi
if ! ollama list | grep -q '^qwen2.5:1.5b'; then
  ollama pull qwen2.5:1.5b
fi
# Reconstruir asistente-ecuatoriano para mantenerlo disponible en disco sin cargarlo en RAM
ollama create asistente-ecuatoriano -f /Modelfile
# Precalentar el modelo activo de consultas generales (qwen2.5:1.5b)
# para evitar que el usuario asuma el costo de la carga en frío inicial
ollama run qwen2.5:1.5b "Responde únicamente: listo." >/dev/null
touch /tmp/model-ready
echo "Ollama y qwen2.5:1.5b listos."
wait "$server_pid"
