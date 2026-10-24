#!/bin/sh
set -eu
ollama serve &
server_pid=$!
until ollama list >/dev/null 2>&1; do sleep 2; done
if ! ollama list | grep -q '^asistente-ecuatoriano'; then
  ollama pull llama3.2:1b
  ollama create asistente-ecuatoriano -f /Modelfile
fi
echo "Ollama y asistente-ecuatoriano listos."
wait "$server_pid"
