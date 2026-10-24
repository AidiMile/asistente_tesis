import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/auth.dart';
import '../../widgets/common.dart';

class IdiomsScreen extends StatefulWidget {
  const IdiomsScreen({super.key});
  @override
  State<IdiomsScreen> createState() => _S();
}

class _S extends State<IdiomsScreen> {
  final _q = TextEditingController();
  List<Json> _items = [];
  int _total = 0;
  Object? _err;

  Api get _api => context.read<AuthState>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await _api.get('/admin/idioms', q: {'limit': 200, if (_q.text.isNotEmpty) 'q': _q.text});
      setState(() {
        _total = r['total'];
        _items = (r['items'] as List).map((e) => Map<String, dynamic>.from(e)).toList();
        _err = null;
      });
    } catch (e) {
      setState(() => _err = e);
    }
  }

  Future<void> _edit([Json? m]) async {
    final isNew = m == null;
    final name = TextEditingController(text: m?['nombre_modismo']);
    final desc = TextEditingController(text: m?['descripcion']);
    final sig = TextEditingController(text: (m?['significados'] as List?)?.join('\n'));
    final ex = TextEditingController(text: (m?['ejemplos'] as List?)?.join('\n'));
    final ctx = TextEditingController(text: (m?['contextos'] as List?)?.join(', '));
    final reg = TextEditingController(text: (m?['regiones'] as List?)?.join(', '));
    var active = (m?['estado'] ?? 'Activo') == 'Activo';
    List<String> known = [];
    try {
      known = ((await _api.get('/admin/regions')) as List).map((e) => '${e['nombre']}').toList();
    } catch (_) {}
    if (!mounted) return;
    final ok = await showDialog<bool>(
        context: context,
        builder: (_) => StatefulBuilder(
              builder: (dctx, set) => AlertDialog(
                title: Text(isNew ? 'Nuevo modismo' : 'Editar modismo'),
                content: SingleChildScrollView(
                  child: SizedBox(
                    width: 480,
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      TextField(controller: name, decoration: const InputDecoration(labelText: 'Modismo')),
                      TextField(controller: desc, decoration: const InputDecoration(labelText: 'Descripción (opcional)')),
                      TextField(controller: sig, minLines: 2, maxLines: 5,
                          decoration: const InputDecoration(labelText: 'Significados (uno por línea)')),
                      TextField(controller: ex, minLines: 2, maxLines: 5,
                          decoration: const InputDecoration(labelText: 'Ejemplos de uso (uno por línea)')),
                      TextField(controller: ctx, decoration: const InputDecoration(labelText: 'Contextos (separados por coma)')),
                      TextField(controller: reg,
                          decoration: InputDecoration(
                              labelText: 'Regiones (separadas por coma)',
                              helperMaxLines: 3,
                              helperText: known.isEmpty ? null : 'Ej.: ${known.take(8).join(', ')}…')),
                      SwitchListTile(title: const Text('Activo'), value: active, onChanged: (v) => set(() => active = v)),
                    ]),
                  ),
                ),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(dctx, false), child: const Text('Cancelar')),
                  FilledButton(onPressed: () => Navigator.pop(dctx, true), child: const Text('Guardar')),
                ],
              ),
            ));
    if (ok != true || !mounted) return;
    final body = {
      'nombre_modismo': name.text.trim(),
      'descripcion': desc.text.trim().isEmpty ? null : desc.text.trim(),
      'estado': active ? 'Activo' : 'Inactivo',
      'significados': splitLines(sig.text),
      'ejemplos': splitLines(ex.text),
      'contextos': splitCsv(ctx.text),
      'regiones': splitCsv(reg.text),
    };
    final r = await guarded(context, () => isNew
        ? _api.post('/admin/idioms', body: body)
        : _api.put('/admin/idioms/${m['id_modismo']}', body: body));
    if (r != null) _load();
  }

  Future<void> _import() async {
    final f = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['json'], withData: true);
    if (f == null || f.files.single.bytes == null || !mounted) return;
    final r = await guarded(context, () => _api.post('/admin/idioms/import',
        body: jsonDecode(utf8.decode(f.files.single.bytes!))));
    if (r != null && mounted) {
      snack(context, 'Creados: ${r['creados']} · Actualizados: ${r['actualizados']}');
      _load();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _edit(), icon: const Icon(Icons.add), label: const Text('Nuevo modismo')),
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _q,
                  onSubmitted: (_) => _load(),
                  decoration: InputDecoration(
                      hintText: 'Buscar modismo ($_total)',
                      prefixIcon: const Icon(Icons.search),
                      border: const OutlineInputBorder()),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(onPressed: _import, icon: const Icon(Icons.upload_file), label: const Text('Importar JSON')),
              const SizedBox(width: 8),
              FilledButton.tonalIcon(
                onPressed: () async {
                  final r = await guarded(context, () => _api.post('/admin/knowledge/integrate'));
                  if (r != null && context.mounted) snack(context, r['mensaje']);
                },
                icon: const Icon(Icons.sync),
                label: const Text('Integrar al modelo'),
              ),
            ]),
          ),
          Expanded(
            child: _err != null
                ? ErrorRetry(_err!, _load)
                : ListView.builder(
                    itemCount: _items.length,
                    itemBuilder: (_, i) {
                      final m = _items[i];
                      return ExpansionTile(
                        title: Text(m['nombre_modismo']),
                        subtitle: Text('${(m['significados'] as List).join(' / ')}'
                            '${m['estado'] == 'Activo' ? '' : '  (inactivo)'}'),
                        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                        expandedCrossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          for (final e in m['ejemplos']) Text('• $e'),
                          const SizedBox(height: 6),
                          Wrap(spacing: 6, children: [
                            for (final r in m['regiones']) Chip(label: Text('$r'), avatar: const Icon(Icons.place, size: 16)),
                            for (final c in m['contextos']) Chip(label: Text('$c')),
                          ]),
                          Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                            TextButton.icon(onPressed: () => _edit(m), icon: const Icon(Icons.edit), label: const Text('Editar')),
                            TextButton.icon(
                              onPressed: () async {
                                if (!await confirm(context, '¿Eliminar "${m['nombre_modismo']}"?') || !context.mounted) return;
                                await guarded(context, () => _api.delete('/admin/idioms/${m['id_modismo']}'));
                                if (mounted) _load();
                              },
                              icon: const Icon(Icons.delete_outline),
                              label: const Text('Eliminar'),
                            ),
                          ]),
                        ],
                      );
                    }),
          ),
        ]),
      );
}
