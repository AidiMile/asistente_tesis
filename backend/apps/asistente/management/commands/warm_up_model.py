import time
import requests
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Precarga segura de solo lectura del modelo Ollama en memoria RAM sin generar texto.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Fuerza la precarga incluso si el modelo ya figura en memoria RAM.'
        )
        parser.add_argument(
            '--wait-ollama',
            type=int,
            default=20,
            help='Segundos máximos de espera a que el servicio Ollama esté disponible.'
        )

    def handle(self, *args, **options):
        base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://ollama:11434').rstrip('/')
        model = getattr(settings, 'OLLAMA_MODEL', 'qwen2.5:1.5b')
        keep_alive = getattr(settings, 'OLLAMA_KEEP_ALIVE', '30m')
        force = options.get('force', False)
        max_wait = options.get('wait_ollama', 20)

        self.stdout.write(self.style.NOTICE(f"[WARM-UP] Verificando estado de '{model}' en {base_url}..."))

        # 1. Esperar disponibilidad de Ollama si los contenedores están iniciando
        disponible = False
        t_inicio_espera = time.time()
        while time.time() - t_inicio_espera < max_wait:
            try:
                r_ping = requests.get(f"{base_url}/api/version", timeout=2)
                if r_ping.status_code == 200:
                    disponible = True
                    break
            except Exception:
                time.sleep(1)

        if not disponible:
            self.stdout.write(self.style.WARNING(
                f"[WARM-UP] Ollama no respondió tras {max_wait}s. Se omite el calentamiento sin bloquear el sistema."
            ))
            return

        # 2. Consultar /api/ps para comprobar si ya reside en RAM
        if not force:
            try:
                r_ps = requests.get(f"{base_url}/api/ps", timeout=3)
                if r_ps.status_code == 200:
                    modelos_en_ram = r_ps.json().get('models', [])
                    for m in modelos_en_ram:
                        nombre = m.get('name') or m.get('model') or ''
                        if model in nombre:
                            self.stdout.write(self.style.SUCCESS(
                                f"[WARM-UP] El modelo '{model}' ya reside en memoria RAM. No se requiere precarga."
                            ))
                            return
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"[WARM-UP] No se pudo consultar /api/ps: {e}"))

        # 3. Precarga segura mediante /api/generate sin generar texto (done_reason: load)
        self.stdout.write(self.style.NOTICE(
            f"[WARM-UP] Cargando modelo '{model}' en RAM con keep_alive={keep_alive} (generación de 0 tokens)..."
        ))
        t0 = time.time()
        try:
            r_load = requests.post(
                f"{base_url}/api/generate",
                json={
                    "model": model,
                    "keep_alive": keep_alive
                },
                timeout=(5, 120)
            )
            t_load = round(time.time() - t0, 2)
            if r_load.status_code == 200:
                data = r_load.json()
                done_reason = data.get('done_reason', 'completado')
                self.stdout.write(self.style.SUCCESS(
                    f"[WARM-UP] Éxito: modelo '{model}' precargado en RAM en {t_load} s (motivo: {done_reason})."
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f"[WARM-UP] Ollama devolvió HTTP {r_load.status_code} durante la precarga."
                ))
        except Exception as e:
            t_load = round(time.time() - t0, 2)
            self.stdout.write(self.style.WARNING(
                f"[WARM-UP] Precarga no completada ({t_load}s): {e}. El sistema continúa operando con normalidad."
            ))

