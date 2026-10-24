import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/auth.dart';
import '../widgets/common.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _S();
}

class _S extends State<ProfileScreen> {
  late final _name = TextEditingController(text: context.read<AuthState>().user?['nombre']);
  final _cur = TextEditingController(), _new = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final u = auth.user!;
    return Centered(
      width: 560,
      child: Column(children: [
        CircleAvatar(radius: 36, child: Text((u['nombre'] as String).substring(0, 1).toUpperCase(),
            style: const TextStyle(fontSize: 28))),
        const SizedBox(height: 8),
        Text('@${u['nombre_usuario']} · ${u['correo']}'),
        Chip(label: Text(u['rol'] == 'administrador' ? 'Administrador' : 'Usuario')),
        const Divider(height: 32),
        TextField(controller: _name, decoration: const InputDecoration(labelText: 'Nombre', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton(
            onPressed: () async {
              final r = await guarded(context, () => auth.api.put('/users/me', body: {'nombre': _name.text.trim()}));
              if (r != null && context.mounted) {
                await auth.refreshUser();
                if (context.mounted) snack(context, 'Perfil actualizado');
              }
            },
            child: const Text('Guardar perfil'),
          ),
        ),
        const Divider(height: 32),
        TextField(controller: _cur, obscureText: true,
            decoration: const InputDecoration(labelText: 'Contraseña actual', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _new, obscureText: true,
            decoration: const InputDecoration(labelText: 'Nueva contraseña', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: OutlinedButton(
            onPressed: () async {
              final r = await guarded(context,
                  () => auth.api.put('/users/me/password', body: {'actual': _cur.text, 'nueva': _new.text}));
              if (r != null && context.mounted) {
                _cur.clear();
                _new.clear();
                snack(context, 'Contraseña actualizada');
              }
            },
            child: const Text('Cambiar contraseña'),
          ),
        ),
      ]),
    );
  }
}
