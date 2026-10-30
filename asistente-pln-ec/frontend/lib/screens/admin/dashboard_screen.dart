import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/auth.dart';
import '../../widgets/common.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _S();
}

class _S extends State<DashboardScreen> {
  Json? _stats, _model, _health;
  Object? _err;
  double _t = 0.7, _p = 0.9, _tok = 300;
  int? _modelId;

  Api get _api => context.read<AuthState>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final s = Map<String, dynamic>.from(await _api.get('/admin/stats'));
      final m = Map<String, dynamic>.from(await _api.get('/admin/model'));
      final h = Map<String, dynamic>.from(await _api.get('/admin/model/health'));
      final active = (m['modelos'] as List).firstWhere((x) => x['activo'] == true, orElse: () => null);
      setState(() {
        _stats = s;
        _model = m;
        _health = h;
        _err = null;
        if (active != null) {
          _modelId = active['id_modelo'];
          final p = active['parametros'];
          if (p != null) {
            _t = (p['temperatura'] as num).toDouble();
            _p = (p['top_p'] as num).toDouble();
            _tok = (p['max_tokens'] as num).toDouble();
          }
        }
      });
    } catch (e) {
      setState(() => _err = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_err != null) return ErrorRetry(_err!, _load);
    if (_stats == null) return const Center(child: CircularProgressIndicator());
    final lim = _model!['limites'];
    double lo(String k) => (lim[k][0] as num).toDouble();
    double hi(String k) => (lim[k][1] as num).toDouble();
    final ok = _health?['ok'] == true;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        Text('Panel administrativo', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        Wrap(spacing: 12, runSpacing: 12, children: [
          StatCard('Usuarios', '${_stats!['usuarios']}', Icons.group),
          StatCard('Consultas', '${_stats!['consultas']}', Icons.question_answer),
          StatCard('Modismos', '${_stats!['modismos']}', Icons.translate),
          StatCard('Corpus', '${_stats!['corpus']}', Icons.library_books),
          StatCard('Tiempo medio', '${_stats!['tiempo_medio_s'] ?? '—'} s', Icons.timer),
          StatCard('Modelo IA', ok ? 'En línea' : 'Sin conexión', Icons.memory,
              color: ok ? Colors.green : Colors.red),
        ]),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Parámetros del modelo generativo', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              DropdownButtonFormField<int>(
                initialValue: _modelId,
                decoration: const InputDecoration(labelText: 'Modelo activo', border: OutlineInputBorder()),
                items: [
                  for (final m in _model!['modelos'])
                    DropdownMenuItem(value: m['id_modelo'] as int, child: Text('${m['nombre_modelo']} ${m['version'] ?? ''}'))
                ],
                onChanged: (v) async {
                  if (v == null) return;
                  final r = await guarded(context, () => _api.put('/admin/model/models/$v/activate', body: {}));
                  if (r != null) _load();
                },
              ),
              Text('Temperatura: ${_t.toStringAsFixed(2)}'),
              Slider(value: _t.clamp(lo('temperatura'), hi('temperatura')), min: lo('temperatura'),
                  max: hi('temperatura'), divisions: 18, onChanged: (v) => setState(() => _t = v)),
              Text('Top-P: ${_p.toStringAsFixed(2)}'),
              Slider(value: _p.clamp(lo('top_p'), hi('top_p')), min: lo('top_p'), max: hi('top_p'),
                  divisions: 18, onChanged: (v) => setState(() => _p = v)),
              Text('Longitud máxima: ${_tok.round()} tokens'),
              Slider(value: _tok.clamp(lo('max_tokens'), hi('max_tokens')), min: lo('max_tokens'),
                  max: hi('max_tokens'), divisions: ((hi('max_tokens') - lo('max_tokens')) / 10).round(),
                  onChanged: (v) => setState(() => _tok = v)),
              Row(children: [
                FilledButton.icon(
                  icon: const Icon(Icons.save),
                  label: const Text('Aplicar'),
                  onPressed: () async {
                    final r = await guarded(context, () => _api.put('/admin/model/params', body: {
                          'temperatura': double.parse(_t.toStringAsFixed(2)),
                          'top_p': double.parse(_p.toStringAsFixed(2)),
                          'max_tokens': _tok.round(),
                          'id_modelo': _modelId,
                        }));
                    if (r != null && context.mounted) snack(context, 'Parámetros actualizados');
                  },
                ),
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  icon: const Icon(Icons.sync),
                  label: const Text('Actualizar conocimiento lingüístico'),
                  onPressed: () async {
                    final r = await guarded(context, () => _api.post('/admin/knowledge/integrate'));
                    if (r != null && context.mounted) snack(context, r['mensaje']);
                  },
                ),
              ]),
            ]),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(spacing: 12, children: [
          for (final e in (_stats!['por_tipo_entrada'] as Map).entries) Chip(label: Text('${e.key}: ${e.value}')),
          for (final e in (_stats!['por_intencion'] as Map).entries)
            Chip(label: Text('${e.key}: ${e.value}'), avatar: const Icon(Icons.flag, size: 16)),
        ]),
      ]),
    );
  }
}
