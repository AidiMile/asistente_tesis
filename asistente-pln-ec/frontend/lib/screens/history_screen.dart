import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api.dart';
import '../core/auth.dart';
import '../widgets/common.dart';

class HistoryScreen extends StatefulWidget {
  final bool global;
  const HistoryScreen({super.key, this.global = false});
  @override
  State<HistoryScreen> createState() => _S();
}

class _S extends State<HistoryScreen> {
  final _q = TextEditingController();
  final _items = <Json>[];
  int _total = 0;
  bool _loading = false;
  Object? _err;

  @override
  void initState() {
    super.initState();
    _load(reset: true);
  }

  Future<void> _load({bool reset = false}) async {
    if (reset) _items.clear();
    setState(() {
      _loading = true;
      _err = null;
    });
    try {
      final api = context.read<AuthState>().api;
      final r = await api.get(widget.global ? '/admin/history' : '/history',
          q: {'skip': _items.length, 'limit': 20, if (_q.text.isNotEmpty) 'q': _q.text});
      _total = r['total'];
      _items.addAll((r['items'] as List).map((e) => Map<String, dynamic>.from(e)));
    } catch (e) {
      _err = e;
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) => Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            controller: _q,
            onSubmitted: (_) => _load(reset: true),
            decoration: InputDecoration(
                hintText: widget.global ? 'Buscar en el historial global' : 'Buscar en mis consultas',
                prefixIcon: const Icon(Icons.search),
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(icon: const Icon(Icons.refresh), onPressed: () => _load(reset: true))),
          ),
        ),
        if (_err != null) Expanded(child: ErrorRetry(_err!, () => _load(reset: true))),
        if (_err == null)
          Expanded(
            child: _items.isEmpty && !_loading
                ? const Center(child: Text('Aún no hay consultas'))
                : ListView.builder(
                    itemCount: _items.length + 1,
                    itemBuilder: (_, i) {
                      if (i == _items.length) {
                        return _loading
                            ? const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()))
                            : (_items.length < _total
                                ? TextButton(onPressed: _load, child: Text('Cargar más (${_items.length}/$_total)'))
                                : const SizedBox());
                      }
                      final h = _items[i];
                      final fecha = (h['fecha'] ?? '').toString().replaceFirst('T', ' ').split('.').first;
                      return ExpansionTile(
                        leading: Icon(switch (h['tipo_entrada']) {
                          'audio' => Icons.mic,
                          'dictado' => Icons.keyboard_voice,
                          _ => Icons.chat_bubble_outline,
                        }),
                        title: Text(h['consulta'], maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: Text([
                          fecha,
                          if (widget.global && h['usuario'] != null) '@${h['usuario']}',
                          if (h['intencion'] != null) h['intencion'],
                        ].join(' · ')),
                        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        expandedCrossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SelectableText(h['respuesta']),
                          if ((h['modismos'] as List).isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Wrap(spacing: 6, children: [
                                for (final m in h['modismos']) Chip(label: Text('$m'), visualDensity: VisualDensity.compact)
                              ]),
                            ),
                          Text('Tiempo de respuesta: ${h['tiempo_respuesta']} s',
                              style: Theme.of(context).textTheme.labelSmall),
                        ],
                      );
                    }),
          ),
      ]);
}
