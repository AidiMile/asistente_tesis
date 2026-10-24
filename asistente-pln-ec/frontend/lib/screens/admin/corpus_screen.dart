import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/auth.dart';
import '../../widgets/common.dart';

class CorpusScreen extends StatefulWidget {
  const CorpusScreen({super.key});
  @override
  State<CorpusScreen> createState() => _S();
}

class _S extends State<CorpusScreen> {
  List<Json> _items = [];
  Object? _err;

  Api get _api => context.read<AuthState>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await _api.get('/admin/corpus');
      setState(() {
        _items = (r as List).map((e) => Map<String, dynamic>.from(e)).toList();
        _err = null;
      });
    } catch (e) {
      setState(() => _err = e);
    }
  }

  Future<void> _edit([Json? c]) async {
    final name = TextEditingController(text: c?['nombre']);
    final src = TextEditingController(text: c?['fuente']);
    final type = TextEditingController(text: c?['tipo_dato']);
    final desc = TextEditingController(text: c?['descripcion']);
    final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
              title: Text(c == null ? 'Nuevo corpus' : 'Editar corpus'),
              content: SizedBox(
                width: 420,
                child: SingleChildScrollView(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    TextField(controller: name, decoration: const InputDecoration(labelText: 'Nombre')),
                    TextField(controller: src, decoration: const InputDecoration(labelText: 'Fuente')),
                    TextField(controller: type, decoration: const InputDecoration(labelText: 'Tipo de dato (texto, diálogos...)')),
                    TextField(controller: desc, minLines: 2, maxLines: 4, decoration: const InputDecoration(labelText: 'Descripción')),
                  ]),
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
                FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Guardar')),
              ],
            ));
    if (ok != true || !mounted) return;
    final body = {
      'nombre': name.text.trim(), 'fuente': src.text.trim(), 'tipo_dato': type.text.trim(),
      'descripcion': desc.text.trim(), 'activo': c?['activo'] ?? true,
    };
    final r = await guarded(context, () => c == null
        ? _api.post('/admin/corpus', body: body)
        : _api.put('/admin/corpus/${c['id_corpus']}', body: body));
    if (r != null) _load();
  }

  Future<void> _upload(Json c) async {
    final f = await FilePicker.platform.pickFiles(
        type: FileType.custom, allowedExtensions: ['txt', 'md', 'csv', 'json', 'jsonl'], withData: true);
    if (f == null || f.files.single.bytes == null || !mounted) return;
    final r = await guarded(context,
        () => _api.upload('/admin/corpus/${c['id_corpus']}/documents', f.files.single.bytes!, f.files.single.name));
    if (r != null && mounted) {
      snack(context, 'Pasajes cargados: ${r['pasajes_cargados']}');
      _load();
    }
  }

  Future<void> _link(Json c) async {
    final all = await guarded(context, () => _api.get('/admin/idioms', q: {'limit': 200}));
    final cur = await guarded(context, () => _api.get('/admin/corpus/${c['id_corpus']}/idioms'));
    if (all == null || cur == null || !mounted) return;
    final sel = <int>{for (final m in cur as List) m['id_modismo'] as int};
    final ok = await showDialog<bool>(
        context: context,
        builder: (_) => StatefulBuilder(
            builder: (ctx, set) => AlertDialog(
                  title: const Text('Asociar modismos'),
                  content: SizedBox(
                    width: 400,
                    height: 400,
                    child: ListView(children: [
                      for (final m in all['items'])
                        CheckboxListTile(
                          dense: true,
                          title: Text(m['nombre_modismo']),
                          value: sel.contains(m['id_modismo']),
                          onChanged: (v) => set(() => v! ? sel.add(m['id_modismo']) : sel.remove(m['id_modismo'])),
                        )
                    ]),
                  ),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
                    FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Guardar')),
                  ],
                )));
    if (ok == true && mounted) {
      await guarded(context, () => _api.put('/admin/corpus/${c['id_corpus']}/idioms', body: {'ids': sel.toList()}));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _edit(), icon: const Icon(Icons.add), label: const Text('Nuevo corpus')),
        body: _err != null
            ? ErrorRetry(_err!, _load)
            : _items.isEmpty
                ? const Center(child: Text('No hay corpus registrados'))
                : ListView(padding: const EdgeInsets.all(12), children: [
                    for (final c in _items)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Expanded(child: Text(c['nombre'], style: Theme.of(context).textTheme.titleMedium)),
                              Switch(
                                value: c['activo'] == true,
                                onChanged: (v) async {
                                  final r = await guarded(context, () => _api.put('/admin/corpus/${c['id_corpus']}', body: {
                                        'nombre': c['nombre'], 'fuente': c['fuente'], 'tipo_dato': c['tipo_dato'],
                                        'descripcion': c['descripcion'], 'activo': v,
                                      }));
                                  if (r != null) _load();
                                },
                              ),
                            ]),
                            Text('${c['total_registros']} pasajes · ${c['fuente'] ?? 'sin fuente'} · ${c['tipo_dato'] ?? ''}'),
                            if ((c['descripcion'] ?? '').toString().isNotEmpty) Text(c['descripcion']),
                            const SizedBox(height: 8),
                            Wrap(spacing: 8, children: [
                              OutlinedButton.icon(onPressed: () => _upload(c), icon: const Icon(Icons.upload_file), label: const Text('Cargar archivo')),
                              OutlinedButton.icon(onPressed: () => _link(c), icon: const Icon(Icons.link), label: const Text('Modismos')),
                              OutlinedButton.icon(onPressed: () => _edit(c), icon: const Icon(Icons.edit), label: const Text('Editar')),
                              OutlinedButton.icon(
                                onPressed: () async {
                                  if (!await confirm(context, '¿Eliminar el corpus y todos sus pasajes?') || !context.mounted) return;
                                  await guarded(context, () => _api.delete('/admin/corpus/${c['id_corpus']}'));
                                  if (mounted) _load();
                                },
                                icon: const Icon(Icons.delete_outline),
                                label: const Text('Eliminar'),
                              ),
                            ]),
                          ]),
                        ),
                      ),
                  ]),
      );
}
