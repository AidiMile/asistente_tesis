import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/auth.dart';
import '../../widgets/common.dart';

class MetricsScreen extends StatefulWidget {
  const MetricsScreen({super.key});

  @override
  State<MetricsScreen> createState() => _MetricsScreenState();
}

class _MetricsScreenState extends State<MetricsScreen> {
  Json? _sum, _stats;
  List _evals = [];
  Object? _err;
  bool _loading = true;
  bool _evaluating = false;
  bool _guardarEnBd = false; // Por defecto en false para evitar escrituras no deseadas en pruebas

  final _idController = TextEditingController();
  final _refController = TextEditingController();

  Api get _api => context.read<AuthState>().api;

  @override
  void initState() {
    super.initState();
    // Protección por rol: si no es administrador, redirigir inmediatamente al chat
    final auth = context.read<AuthState>();
    if (!auth.isAdmin) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/chat');
      });
      return;
    }
    _load();
  }

  @override
  void dispose() {
    _idController.dispose();
    _refController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _err = null;
    });
    try {
      final s = Map<String, dynamic>.from(await _api.get('/admin/metrics/summary/'));
      final st = Map<String, dynamic>.from(await _api.get('/admin/stats/'));
      final e = await _api.get('/admin/metrics/evaluations/');
      if (!mounted) return;
      setState(() {
        _sum = s;
        _stats = st;
        _evals = e is List ? e : [];
        _loading = false;
        _err = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _err = e;
        _loading = false;
      });
    }
  }

  String _v(dynamic x) => x == null ? '—' : '${(x as num).toStringAsFixed(1)}%';

  Future<void> _ejecutarEvaluacionManual() async {
    final rawId = _idController.text.trim();
    final ref = _refController.text.trim();

    if (rawId.isEmpty || ref.isEmpty) {
      snack(context, 'Ingrese el ID de respuesta y el texto de referencia.', error: true);
      return;
    }

    final idResp = int.tryParse(rawId);
    if (idResp == null || idResp <= 0) {
      snack(context, 'El ID de respuesta debe ser un número entero positivo.', error: true);
      return;
    }

    setState(() => _evaluating = true);

    try {
      final res = await _api.post(
        '/admin/metrics/evaluate/',
        body: {
          'id_respuesta': idResp,
          'texto_referencia': ref,
          'guardar': _guardarEnBd,
        },
      );

      if (!mounted) return;

      if (res is Map<String, dynamic>) {
        final esParcial = res['tipo_evaluacion'] == 'parcial';
        final persistido = res['persistido'] == true;

        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                Icon(
                  esParcial ? Icons.info_outline : Icons.check_circle_outline,
                  color: esParcial ? const Color(0xFFDD6B20) : const Color(0xFF075E54),
                  size: 24,
                ),
                const SizedBox(width: 8),
                Text(
                  esParcial ? 'Evaluación Parcial' : 'Evaluación Completa',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Respuesta ID #$idResp', style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  _buildMetricRow('BLEU', _v(res['bleu'])),
                  _buildMetricRow('ROUGE-L', _v(res['rouge'])),
                  _buildMetricRow('BERTScore', _v(res['bertscore'])),
                  _buildMetricRow(
                    'Precisión global',
                    esParcial ? 'No disponible (requiere BERTScore)' : _v(res['precision_global']),
                    highlight: !esParcial,
                  ),
                  if (res['precision_parcial_lexica'] != null)
                    _buildMetricRow('Precisión léxica aux.', _v(res['precision_parcial_lexica'])),
                  const Divider(height: 16),
                  Row(
                    children: [
                      Icon(
                        persistido ? Icons.save : Icons.memory,
                        size: 16,
                        color: persistido ? Colors.green : Colors.blueGrey,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          persistido ? 'Guardado en base de datos PostgreSQL' : 'Cálculo en memoria (no persistido en BD)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: persistido ? Colors.green[800] : Colors.blueGrey[700],
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (esParcial) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEFCBF),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Nota: Sin BERTScore no se puede certificar el umbral RNF04 (>= 80%).',
                        style: TextStyle(fontSize: 11, color: Color(0xFF744210)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cerrar'),
              ),
            ],
          ),
        );

        if (persistido) {
          _load();
        }
      }
    } catch (e) {
      if (mounted) snack(context, '$e', error: true);
    } finally {
      if (mounted) setState(() => _evaluating = false);
    }
  }

  Widget _buildMetricRow(String label, String value, {bool highlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF4A5568))),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: highlight ? FontWeight.bold : FontWeight.w600,
              color: highlight ? const Color(0xFF075E54) : const Color(0xFF2D3748),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();

    // Protección secundaria de rol
    if (!auth.isAdmin) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock_outline, size: 48, color: Color(0xFFDD6B20)),
              const SizedBox(height: 12),
              const Text('Acceso denegado', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text('Se requieren permisos de Administrador para ver las métricas.'),
              const SizedBox(height: 16),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF075E54)),
                onPressed: () => context.go('/chat'),
                child: const Text('Volver al Chat'),
              ),
            ],
          ),
        ),
      );
    }

    if (_err != null) {
      if (_err is ApiException && (_err as ApiException).status == 403) {
        return Scaffold(
          body: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.shield_outlined, size: 48, color: Colors.red),
                const SizedBox(height: 12),
                const Text('Permiso denegado por el servidor (HTTP 403)', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                OutlinedButton(onPressed: () => context.go('/chat'), child: const Text('Volver al Chat')),
              ],
            ),
          ),
        );
      }
      return Scaffold(body: ErrorRetry(_err!, _load));
    }

    if (_loading || _sum == null) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF075E54)),
        ),
      );
    }

    final ok = _sum!['cumple_umbral'] == true;
    final bertDisponible = _sum!['bertscore_disponible'] == true;
    final days = (_stats?['consultas_por_dia'] as List?) ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFF7FAF9),
      body: RefreshIndicator(
        color: const Color(0xFF075E54),
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          children: [
            // Header institucional PLN-EC
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE6F4F1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.analytics_outlined, color: Color(0xFF075E54), size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Métricas del Modelo (PLN)',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF2D3748),
                                ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE6F4F1),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0x4D075E54)),
                            ),
                            child: const Text(
                              'UPEC',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF075E54),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${_sum!['evaluaciones']} respuestas evaluadas · Umbral RNF04: ${_sum!['umbral']}%',
                        style: const TextStyle(fontSize: 12, color: Color(0xFF718096)),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh, color: Color(0xFF075E54)),
                  tooltip: 'Actualizar métricas',
                  onPressed: _load,
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Banner informativo si BERTScore en tiempo real no está instalado en el servidor
            if (!bertDisponible)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEFCBF),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFECC94B)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline, color: Color(0xFFD69E2E), size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Aviso científico: El servidor no tiene instalada la librería bert-score para inferencia en tiempo real. Los valores históricos se conservan desde PostgreSQL, pero las evaluaciones nuevas contra referencias humanas serán parciales (BLEU + ROUGE-L).',
                        style: TextStyle(fontSize: 12, color: Color(0xFF744210), height: 1.3),
                      ),
                    ),
                  ],
                ),
              ),

            // KPI Cards Grid
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                StatCard('BLEU (20%)', _v(_sum!['bleu']), Icons.compare_arrows, color: const Color(0xFF075E54)),
                StatCard('ROUGE-L (30%)', _v(_sum!['rouge']), Icons.text_snippet, color: const Color(0xFF128C7E)),
                StatCard('BERTScore (50%)', _v(_sum!['bertscore']), Icons.psychology, color: const Color(0xFF7B1FA2)),
                StatCard(
                  'Precisión global',
                  _v(_sum!['precision_global']),
                  ok ? Icons.check_circle : Icons.warning_amber,
                  color: ok ? const Color(0xFF38A169) : const Color(0xFFDD6B20),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Gráfico temporal: Consultas por día
            Text(
              'Consultas por día (últimos 14 días)',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF2D3748),
                  ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: SizedBox(
                height: 200,
                child: days.isEmpty
                    ? const Center(child: Text('Sin datos de consultas en el período', style: TextStyle(color: Color(0xFF718096))))
                    : Padding(
                        padding: const EdgeInsets.only(top: 12, right: 16),
                        child: LineChart(
                          LineChartData(
                            minY: 0,
                            gridData: const FlGridData(show: true, drawVerticalLine: false),
                            titlesData: FlTitlesData(
                              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              bottomTitles: AxisTitles(
                                sideTitles: SideTitles(
                                  showTitles: true,
                                  interval: 1,
                                  getTitlesWidget: (v, _) {
                                    final i = v.toInt();
                                    if (i < 0 || i >= days.length || v != i.toDouble()) return const SizedBox();
                                    final fechaStr = days[i]['fecha'].toString();
                                    final label = fechaStr.length >= 10 ? fechaStr.substring(5) : fechaStr;
                                    return Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF718096))),
                                    );
                                  },
                                ),
                              ),
                            ),
                            lineBarsData: [
                              LineChartBarData(
                                isCurved: true,
                                color: const Color(0xFF075E54),
                                barWidth: 3,
                                dotData: const FlDotData(show: true),
                                belowBarData: BarAreaData(
                                  show: true,
                                  color: const Color(0x1A075E54),
                                ),
                                spots: [
                                  for (var i = 0; i < days.length; i++)
                                    FlSpot(i.toDouble(), (days[i]['total'] as num).toDouble()),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 24),

            // Formulario de Evaluación Manual con Texto de Referencia
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.rate_review_outlined, color: Color(0xFF075E54), size: 22),
                      const SizedBox(width: 8),
                      Text(
                        'Evaluar Respuesta con Texto de Referencia',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF2D3748),
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Calcula el desempeño de una inferencia generada contra el estándar lingüístico humano.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF718096)),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _idController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'ID de Respuesta en Base de Datos',
                      hintText: 'Ej. 1, 2, 3...',
                      prefixIcon: Icon(Icons.tag, size: 20, color: Color(0xFF718096)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _refController,
                    minLines: 2,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Texto de Referencia (Humano / Experto dialectal)',
                      hintText: 'Ingrese la respuesta ideal esperada...',
                      alignLabelWithHint: true,
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Control explícito de persistencia en PostgreSQL
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7FAF9),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: SwitchListTile(
                      dense: true,
                      activeTrackColor: const Color(0xFF075E54),
                      title: const Text(
                        'Guardar resultado en PostgreSQL',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF2D3748)),
                      ),
                      subtitle: Text(
                        _guardarEnBd
                            ? 'Los resultados se persistirán o actualizarán en la base de datos.'
                            : 'Modo seguro: cálculo en memoria sin modificar registros en la base de datos.',
                        style: TextStyle(fontSize: 11, color: _guardarEnBd ? const Color(0xFF075E54) : const Color(0xFF718096)),
                      ),
                      value: _guardarEnBd,
                      onChanged: (val) => setState(() => _guardarEnBd = val),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF075E54),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      icon: _evaluating
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.calculate, size: 20),
                      label: Text(_evaluating ? 'Calculando métricas...' : 'Calcular BLEU / ROUGE / BERTScore'),
                      onPressed: _evaluating ? null : _ejecutarEvaluacionManual,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Tabla de Evaluaciones Recientes
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.history_edu, color: Color(0xFF075E54), size: 22),
                      const SizedBox(width: 8),
                      Text(
                        'Historial de Evaluaciones Registradas',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF2D3748),
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _evals.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: Text('No hay evaluaciones registradas en PostgreSQL', style: TextStyle(color: Color(0xFF718096)))),
                        )
                      : SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: DataTable(
                            headingRowColor: WidgetStateProperty.all(const Color(0xFFF7FAF9)),
                            headingTextStyle: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2D3748), fontSize: 13),
                            columns: const [
                              DataColumn(label: Text('Resp.')),
                              DataColumn(label: Text('BLEU')),
                              DataColumn(label: Text('ROUGE-L')),
                              DataColumn(label: Text('BERTScore')),
                              DataColumn(label: Text('Global')),
                              DataColumn(label: Text('Tipo')),
                              DataColumn(label: Text('Origen')),
                            ],
                            rows: [
                              for (final e in _evals)
                                DataRow(cells: [
                                  DataCell(Text('#${e['id_respuesta']}')),
                                  DataCell(Text(_v(e['bleu']))),
                                  DataCell(Text(_v(e['rouge']))),
                                  DataCell(Text(_v(e['bertscore']))),
                                  DataCell(
                                    Text(
                                      _v(e['precision_global']),
                                      style: TextStyle(
                                        fontWeight: FontWeight.w600,
                                        color: (e['precision_global'] != null && (e['precision_global'] as num) >= 80)
                                            ? Colors.green
                                            : const Color(0xFF2D3748),
                                      ),
                                    ),
                                  ),
                                  DataCell(
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: (e['tipo_evaluacion'] == 'parcial') ? const Color(0xFFFEFCBF) : const Color(0xFFE6F4F1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        (e['tipo_evaluacion'] ?? 'completa').toString(),
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: (e['tipo_evaluacion'] == 'parcial') ? const Color(0xFF744210) : const Color(0xFF075E54),
                                        ),
                                      ),
                                    ),
                                  ),
                                  DataCell(Text('${e['origen'] ?? 'auto'}')),
                                ]),
                            ],
                          ),
                        ),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
