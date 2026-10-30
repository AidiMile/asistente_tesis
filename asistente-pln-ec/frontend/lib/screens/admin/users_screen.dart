import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api.dart';
import '../../core/auth.dart';
import '../../widgets/common.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});
  @override
  State<UsersScreen> createState() => _S();
}

class _S extends State<UsersScreen> {
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
      final r = await _api.get('/admin/users', q: {'limit': 200, if (_q.text.isNotEmpty) 'q': _q.text});
      setState(() {
        _total = r['total'];
        _items = (r['items'] as List).map((e) => Map<String, dynamic>.from(e)).toList();
        _err = null;
      });
    } catch (e) {
      setState(() => _err = e);
    }
  }

  Future<void> _edit([Json? u]) async {
    final isNew = u == null;
    final name = TextEditingController(text: u?['nombre']);
    final user = TextEditingController(text: u?['nombre_usuario']);
    final mail = TextEditingController(text: u?['correo']);
    final pw = TextEditingController();
    var estado = u?['estado'] ?? 'Activo';
    final ok = await showDialog<bool>(
        context: context,
        builder: (_) => StatefulBuilder(
              builder: (ctx, set) => AlertDialog(
                title: Text(isNew ? 'Nuevo usuario' : 'Editar usuario'),
                content: SingleChildScrollView(
                  child: SizedBox(
                    width: 420,
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      TextField(controller: name, decoration: const InputDecoration(labelText: 'Nombre')),
                      TextField(controller: user, enabled: isNew, decoration: const InputDecoration(labelText: 'Nombre de usuario')),
                      TextField(controller: mail, decoration: const InputDecoration(labelText: 'Correo')),
                      TextField(controller: pw, obscureText: true,
                          decoration: InputDecoration(labelText: isNew ? 'Contraseña' : 'Nueva contraseña (opcional)')),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.badge_outlined),
                        title: Text(isNew ? 'Rol: Usuario' : 'Rol: ${u['rol']}'),
                        subtitle: const Text('Solo existe una cuenta administradora, definida en la configuración.'),
                      ),
                      if (!isNew)
                        DropdownButtonFormField<String>(
                            initialValue: estado,
                            decoration: const InputDecoration(labelText: 'Estado'),
                            items: const [
                              DropdownMenuItem(value: 'Activo', child: Text('Activo')),
                              DropdownMenuItem(value: 'Inactivo', child: Text('Inactivo')),
                              DropdownMenuItem(value: 'Pendiente', child: Text('Pendiente')),
                            ],
                            onChanged: (v) => set(() => estado = v!)),
                    ]),
                  ),
                ),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
                  FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Guardar')),
                ],
              ),
            ));
    if (ok != true || !mounted) return;
    final r = await guarded(context, () async {
      if (isNew) {
        return _api.post('/admin/users', body: {
          'nombre': name.text.trim(), 'nombre_usuario': user.text.trim(), 'correo': mail.text.trim(),
          'password': pw.text, 'rol': 'usuario',
        });
      }
      return _api.put('/admin/users/${u['id_usuario']}', body: {
        'nombre': name.text.trim(), 'correo': mail.text.trim(), 'estado': estado,
        if (pw.text.isNotEmpty) 'password': pw.text,
      });
    });
    if (r != null) _load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _edit(), icon: const Icon(Icons.person_add), label: const Text('Nuevo')),
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _q,
              onSubmitted: (_) => _load(),
              decoration: InputDecoration(
                  hintText: 'Buscar por nombre, usuario o correo ($_total)',
                  prefixIcon: const Icon(Icons.search),
                  border: const OutlineInputBorder()),
            ),
          ),
          Expanded(
            child: _err != null
                ? ErrorRetry(_err!, _load)
                : ListView.separated(
                    itemCount: _items.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final u = _items[i];
                      final active = u['estado'] == 'Activo';
                      return ListTile(
                        leading: CircleAvatar(child: Text((u['nombre'] as String).substring(0, 1).toUpperCase())),
                        title: Text('${u['nombre']}  (@${u['nombre_usuario']})'),
                        subtitle: Text('${u['correo']} · ${u['rol']} · ${u['estado']}'),
                        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                          Switch(
                            value: active,
                            onChanged: (v) async {
                              final r = await guarded(context, () => _api.put('/admin/users/${u['id_usuario']}',
                                  body: {'estado': v ? 'Activo' : 'Inactivo'}));
                              if (r != null) _load();
                            },
                          ),
                          IconButton(icon: const Icon(Icons.edit), onPressed: () => _edit(u)),
                          IconButton(
                            icon: const Icon(Icons.delete_outline),
                            onPressed: () async {
                              if (!await confirm(context,
                                  'Se eliminará a ${u['nombre']} y todo su historial. Para conservar la auditoría use el interruptor de estado. ¿Continuar?')) {
                                return;
                              }
                              if (!context.mounted) return;
                              final r = await guarded(context, () => _api.delete('/admin/users/${u['id_usuario']}'));
                              if (context.mounted && r == null) _load();
                            },
                          ),
                        ]),
                      );
                    }),
          ),
        ]),
      );
}
