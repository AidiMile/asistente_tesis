import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/auth.dart';
import '../../widgets/common.dart';

class MetricsScreen extends StatefulWidget {
  const MetricsScreen({super.key});
  @override
  State<MetricsScreen> createState() => _S();
}

class _S extends State<MetricsScreen> {
  Json? _sum, _stats;
  List _evals = [];
  Object? _err;
  final _id = TextEditingController(), _ref = TextEditingController();

  Api get _api => context.read<AuthState>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final s = Map<String, dynamic>.from(await _api.get('/admin/metrics/summary'));
      final st = Map<String, dynamic>.from(await _api.get('/admin/stats'));
      final e = await _api.get('/admin/metrics/evaluations');
      setState(() {
        _sum = s;
        _stats = st;
        _evals = e as List;
        _err = null;
      });
    } catch (e) {
      setState(() => _err = e);
    }
  }

  String _v(dynamic x) => x == null ? '—' : '${(x as num).toStringAsFixed(1)}%';

  @override
  Widget build(BuildContext context) {
    if (_err != null) return ErrorRetry(_err!, _load);
    if (_sum == null) return const Center(child: CircularProgressIndicator());
    final ok = _sum!['cumple_umbral'] == true;
    final days = (_stats!['consultas_por_dia'] as List);
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        Text('Métricas del modelo', style: Theme.of(context).textTheme.headlineSmall),
        Text('${_sum!['evaluaciones']} respuestas evaluadas · umbral de precisión: ${_sum!['umbral']}%'),
        const SizedBox(height: 12),
        Wrap(spacing: 12, runSpacing: 12, children: [
          StatCard('BLEU', _v(_sum!['bleu']), Icons.compare_arrows),
          StatCard('ROUGE-L', _v(_sum!['rouge']), Icons.text_snippet),
          StatCard('BERTScore', _v(_sum!['bertscore']), Icons.psychology),
          StatCard('Precisión global', _v(_sum!['precision_global']), ok ? Icons.check_circle : Icons.warning_amber,
              color: ok ? Colors.green : Colors.orange),
        ]),
        const SizedBox(height: 20),
        Text('Consultas por día (últimos 14 días)', style: Theme.of(context).textTheme.titleMedium),
        SizedBox(
          height: 200,
          child: days.isEmpty
              ? const Center(child: Text('Sin datos'))
              : Padding(
                  padding: const EdgeInsets.only(top: 12, right: 16),
                  child: LineChart(LineChartData(
                    minY: 0,
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
                          return Text(days[i]['fecha'].toString().substring(5), style: const TextStyle(fontSize: 10));
                        },
                      )),
                    ),
                    lineBarsData: [
                      LineChartBarData(
                        isCurved: true,
                        barWidth: 3,
                        spots: [for (var i = 0; i < days.length; i++) FlSpot(i.toDouble(), (days[i]['total'] as num).toDouble())],
                      ),
                    ],
                  )),
                ),
        ),
        const Divider(height: 32),
        Text('Evaluar una respuesta con texto de referencia', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        TextField(controller: _id, keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'ID de respuesta', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _ref, minLines: 2, maxLines: 5,
            decoration: const InputDecoration(labelText: 'Texto de referencia', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        FilledButton.icon(
          icon: const Icon(Icons.calculate),
          label: const Text('Calcular BLEU / ROUGE / BERTScore'),
          onPressed: () async {
            final r = await guarded(context, () => _api.post('/admin/metrics/evaluate',
                body: {'id_respuesta': int.parse(_id.text.trim()), 'texto_referencia': _ref.text.trim()}));
            if (r != null && context.mounted) {
              snack(context, 'Precisión global: ${_v(r['precision_global'])}');
              _load();
            }
          },
        ),
        const Divider(height: 32),
        Text('Evaluaciones recientes', style: Theme.of(context).textTheme.titleMedium),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(columns: const [
            DataColumn(label: Text('Resp.')), DataColumn(label: Text('BLEU')), DataColumn(label: Text('ROUGE')),
            DataColumn(label: Text('BERT')), DataColumn(label: Text('Global')), DataColumn(label: Text('Origen')),
          ], rows: [
            for (final e in _evals)
              DataRow(cells: [
                DataCell(Text('${e['id_respuesta']}')), DataCell(Text(_v(e['bleu']))), DataCell(Text(_v(e['rouge']))),
                DataCell(Text(_v(e['bertscore']))), DataCell(Text(_v(e['precision_global']))), DataCell(Text('${e['origen']}')),
              ])
          ]),
        ),
      ]),
    );
  }
}
