import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth.dart';
import '../../widgets/common.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _S();
}

class _S extends State<RegisterScreen> {
  final _f = GlobalKey<FormState>();
  final _name = TextEditingController(), _user = TextEditingController();
  final _mail = TextEditingController(), _pw = TextEditingController(), _pw2 = TextEditingController();
  bool _busy = false;

  Future<void> _go() async {
    if (!_f.currentState!.validate()) return;
    setState(() => _busy = true);
    final r = await guarded(context, () => context.read<AuthState>().api.post('/auth/register', body: {
          'nombre': _name.text.trim(),
          'nombre_usuario': _user.text.trim(),
          'correo': _mail.text.trim(),
          'password': _pw.text,
        }, auth: false));
    if (!mounted) return;
    setState(() => _busy = false);
    if (r != null) {
      snack(context, r['mensaje']);
      context.go('/login');
    }
  }

  InputDecoration _d(String l) => InputDecoration(labelText: l, border: const OutlineInputBorder());

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Registro'), leading: BackButton(onPressed: () => context.go('/login'))),
        body: Centered(
          child: Form(
            key: _f,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              TextFormField(controller: _name, decoration: _d('Nombre completo'),
                  validator: (v) => (v == null || v.trim().length < 2) ? 'Ingrese su nombre' : null),
              const SizedBox(height: 12),
              TextFormField(controller: _user, decoration: _d('Nombre de usuario'),
                  validator: (v) => RegExp(r'^[A-Za-z0-9_.-]{3,50}$').hasMatch(v ?? '')
                      ? null : 'Mínimo 3 caracteres: letras, números, . _ -'),
              const SizedBox(height: 12),
              TextFormField(controller: _mail, decoration: _d('Correo electrónico'),
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) => (v == null || !v.contains('@')) ? 'Correo inválido' : null),
              const SizedBox(height: 12),
              TextFormField(controller: _pw, obscureText: true,
                  decoration: _d('Contraseña').copyWith(helperText: 'Mín. 8, con mayúscula, minúscula y número'),
                  validator: (v) => (v != null && v.length >= 8 && RegExp(r'[a-z]').hasMatch(v) &&
                          RegExp(r'[A-Z]').hasMatch(v) && RegExp(r'\d').hasMatch(v))
                      ? null : 'Contraseña débil'),
              const SizedBox(height: 12),
              TextFormField(controller: _pw2, obscureText: true, decoration: _d('Confirmar contraseña'),
                  validator: (v) => v == _pw.text ? null : 'Las contraseñas no coinciden'),
              const SizedBox(height: 16),
              SizedBox(width: double.infinity,
                  child: FilledButton(onPressed: _busy ? null : _go, child: const Text('Registrarme'))),
            ]),
          ),
        ),
      );
}
