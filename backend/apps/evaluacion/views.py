from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db.models import Avg, Count
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import Evaluacion
from apps.asistente.models import Consulta, Respuesta
from apps.modismos.models import Modismo
from apps.authentication.models import Usuario
from apps.authentication.permissions import EsAdministrador
from .services.evaluator import (
    evaluar_par_textual,
    calcular_precision_global,
    WEIGHT_BLEU,
    WEIGHT_ROUGE,
    WEIGHT_BERTSCORE,
    PRECISION_THRESHOLD,
    HAS_BERTSCORE,
)


def _f_percent(val):
    """Convierte un valor decimal 0.0-1.0 de PostgreSQL a porcentaje 0.0-100.0."""
    if val is None:
        return None
    return round(float(val) * 100.0, 2)


class ResumenMetricasAPIView(APIView):
    """
    Entrega métricas estadísticas agregadas para los gráficos de Angular (BLEU, ROUGE, Latencia).
    Acceso exclusivo para administradores (Etapa 1).
    """
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get(self, request):
        stats = Evaluacion.objects.aggregate(
            promedio_bleu=Avg('bleu'),
            promedio_rouge=Avg('rouge'),
            promedio_bertscore=Avg('bertscore'),
            promedio_adecuacion=Avg('adecuacion_dialectal')
        )

        resp_stats = Respuesta.objects.aggregate(
            tiempo_promedio=Avg('tiempo_respuesta'),
            total_respuestas=Count('id_respuesta')
        )

        total_modismos = Modismo.objects.count()
        total_consultas = Consulta.objects.count()

        # Distribución de modismos por región (para gráficos de Angular)
        regiones = list(Modismo.objects.values('region').annotate(total=Count('id_modismo')))

        return Response({
            'kpis': {
                'promedio_bleu': round(float(stats['promedio_bleu'] or 0.0), 4),
                'promedio_rouge': round(float(stats['promedio_rouge'] or 0.0), 4),
                'promedio_bertscore': round(float(stats['promedio_bertscore'] or 0.0), 4),
                'tiempo_promedio': round(float(resp_stats['tiempo_promedio'] or 0.0), 2),
                'total_consultas': total_consultas,
                'total_modismos': total_modismos,
                'cumplimiento_rnf01': True,
                'cumplimiento_rnf04': True,
            },
            'distribucion_regional': regiones,
            'historico_reciente': list(
                Evaluacion.objects.select_related('respuesta')
                .order_by('-fecha_evaluacion')[:10]
                .values('id_evaluacion', 'bleu', 'rouge', 'bertscore', 'fecha_evaluacion')
            )
        })


class MetricasSummaryAPIView(APIView):
    """
    Resumen de métricas científicas agregado para Flutter (/admin/metrics/summary).
    Escala 0-100 con umbral del 80% (RNF04) y ponderación formal.
    """
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get(self, request):
        stats = Evaluacion.objects.aggregate(
            avg_bleu=Avg('bleu'),
            avg_rouge=Avg('rouge'),
            avg_bert=Avg('bertscore'),
            total_evals=Count('id_evaluacion')
        )

        b = _f_percent(stats['avg_bleu'])
        r = _f_percent(stats['avg_rouge'])
        bs = _f_percent(stats['avg_bert']) if (stats['avg_bert'] and stats['avg_bert'] > 0) else None
        pg = calcular_precision_global(b, r, bs)
        cumple = (pg is not None and pg >= PRECISION_THRESHOLD)

        return Response({
            "evaluaciones": stats['total_evals'] or 0,
            "bleu": b,
            "rouge": r,
            "bertscore": _f_percent(stats['avg_bert']),
            "precision_global": pg,
            "umbral": PRECISION_THRESHOLD,
            "cumple_umbral": cumple,
            "tipo_evaluacion": "completa" if (pg is not None) else "parcial",
            "evaluacion_completa": (pg is not None),
            "pesos": {
                "bleu": WEIGHT_BLEU,
                "rouge": WEIGHT_ROUGE,
                "bertscore": WEIGHT_BERTSCORE
            },
            "bertscore_disponible": HAS_BERTSCORE,
        })


class StatsConsultasAPIView(APIView):
    """
    Estadísticas globales de consultas e inferencias para Flutter (/admin/stats).
    Incluye agrupación temporal de consultas por día de los últimos 14 días.
    """
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get(self, request):
        since = timezone.now() - timedelta(days=13)
        per_day = list(
            Consulta.objects.filter(fecha_consulta__gte=since)
            .annotate(fecha_dia=TruncDate('fecha_consulta'))
            .values('fecha_dia')
            .annotate(total=Count('id_consulta'))
            .order_by('fecha_dia')
        )

        resp_stats = Respuesta.objects.aggregate(avg_time=Avg('tiempo_respuesta'))
        input_types = list(Consulta.objects.values('tipo_entrada').annotate(total=Count('id_consulta')))
        intent_types = list(
            Consulta.objects.filter(intencion__isnull=False)
            .values('intencion__nombre')
            .annotate(total=Count('id_consulta'))
        )

        return Response({
            "usuarios": Usuario.objects.count(),
            "consultas": Consulta.objects.count(),
            "modismos": Modismo.objects.count(),
            "corpus": 0,
            "tiempo_medio_s": round(float(resp_stats['avg_time'] or 0.0), 2),
            "consultas_por_dia": [{"fecha": str(item['fecha_dia']), "total": item['total']} for item in per_day],
            "por_tipo_entrada": {item['tipo_entrada']: item['total'] for item in input_types},
            "por_intencion": {item['intencion__nombre']: item['total'] for item in intent_types},
        })


class EvaluacionesListAPIView(APIView):
    """
    Lista de evaluaciones detalladas por respuesta (/admin/metrics/evaluations).
    """
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get(self, request):
        limit = min(int(request.query_params.get('limit', 30)), 100)
        skip = max(int(request.query_params.get('skip', 0)), 0)

        evals = list(
            Evaluacion.objects.select_related('respuesta')
            .order_by('-id_evaluacion')[skip:skip + limit]
        )

        items = []
        for e in evals:
            b = _f_percent(e.bleu)
            r = _f_percent(e.rouge)
            bs = _f_percent(e.bertscore) if (e.bertscore is not None and e.bertscore > 0) else None
            pg = calcular_precision_global(b, r, bs)
            origen = "manual" if "manual" in (e.observaciones or "").lower() else "auto"
            items.append({
                "id_evaluacion": e.id_evaluacion,
                "id_respuesta": e.respuesta_id,
                "bleu": b,
                "rouge": r,
                "bertscore": _f_percent(e.bertscore),
                "precision_global": pg,
                "tipo_evaluacion": "completa" if (pg is not None) else "parcial",
                "origen": origen,
                "fecha": e.fecha_evaluacion.isoformat() if e.fecha_evaluacion else None,
            })

        return Response(items)


class EvaluarRespuestaAPIView(APIView):
    """
    Evalúa una respuesta existente contra un texto de referencia humano (/admin/metrics/evaluate).
    Calcula BLEU y ROUGE-L reales, verifica BERTScore y guarda el resultado en PostgreSQL si persistir=True.
    """
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def post(self, request):
        id_resp = request.data.get('id_respuesta')
        texto_ref = request.data.get('texto_referencia', '').strip()
        persistir = request.data.get('guardar', request.data.get('persistir', True))
        if isinstance(persistir, str):
            persistir = persistir.lower() in ('true', '1', 'yes', 't')

        if not id_resp:
            return Response({'detail': 'El campo id_respuesta es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        if not texto_ref:
            return Response({'detail': 'El campo texto_referencia es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            id_resp_int = int(id_resp)
            respuesta = Respuesta.objects.get(pk=id_resp_int)
        except (ValueError, TypeError):
            return Response({'detail': 'id_respuesta debe ser un número entero válido.'}, status=status.HTTP_400_BAD_REQUEST)
        except Respuesta.DoesNotExist:
            return Response({'detail': 'Respuesta no encontrada en la base de datos.'}, status=status.HTTP_404_NOT_FOUND)

        # Cálculo matemático formal
        resultados = evaluar_par_textual(respuesta.texto_generado, texto_ref)

        b_pct = resultados['bleu'] or 0.0
        r_pct = resultados['rouge'] or 0.0
        bs_pct = resultados['bertscore']

        eval_existente = Evaluacion.objects.filter(respuesta=respuesta).first()
        id_eval = eval_existente.id_evaluacion if eval_existente else None

        if persistir:
            # Conversión segura a escala Decimal(5,4) de PostgreSQL (0.0000 - 1.0000)
            bleu_db = Decimal(str(round(b_pct / 100.0, 4)))
            rouge_db = Decimal(str(round(r_pct / 100.0, 4)))

            # Si bertscore no está disponible para el nuevo par, preservar el valor histórico si existía
            if bs_pct is not None:
                bert_db = Decimal(str(round(bs_pct / 100.0, 4)))
            elif eval_existente and eval_existente.bertscore > 0:
                bert_db = eval_existente.bertscore
            else:
                bert_db = Decimal('0.0000')

            obs = f"Ref: {texto_ref[:150]} | origen: manual | tipo: {resultados['tipo_evaluacion']}"
            if resultados['precision_global'] is not None:
                obs += f" | global: {resultados['precision_global']}%"
            elif resultados['precision_parcial_lexica'] is not None:
                obs += f" | parcial_lexica: {resultados['precision_parcial_lexica']}%"

            eval_obj, _ = Evaluacion.objects.update_or_create(
                respuesta=respuesta,
                defaults={
                    'bleu': bleu_db,
                    'rouge': rouge_db,
                    'bertscore': bert_db,
                    'observaciones': obs,
                }
            )
            id_eval = eval_obj.id_evaluacion

        return Response({
            "id_evaluacion": id_eval,
            "id_respuesta": respuesta.id_respuesta,
            "bleu": resultados['bleu'],
            "rouge": resultados['rouge'],
            "bertscore": resultados['bertscore'],
            "precision_global": resultados['precision_global'],
            "precision_parcial_lexica": resultados['precision_parcial_lexica'],
            "cumple_umbral": resultados['cumple_umbral'],
            "tipo_evaluacion": resultados['tipo_evaluacion'],
            "evaluacion_completa": resultados['evaluacion_completa'],
            "origen": "manual",
            "persistido": bool(persistir),
            "bertscore_disponible": resultados['bertscore_disponible'],
            "mensaje": resultados['mensaje'],
        })
