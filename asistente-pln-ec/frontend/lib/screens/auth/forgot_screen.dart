import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth.dart';
import '../../widgets/common.dart';

class ForgotScreen extends StatefulWidget {
  final String? token;
  const ForgotScreen({super.key, this.token});
  @override
  State<ForgotScreen> createState() => _S();
}

class _S extends State<ForgotScreen> {
  final _mail = TextEditingController(), _tok = TextEditingController(), _pw = TextEditingController();
  late bool _reset = widget.token != null;

  @override
  void initState() {
    super.initState();
    _tok.text = widget.token ?? '';
  }

  Future<void> _send() async {
    final api = context.read<AuthState>().api;
    final r = await guarded(context, () => api.post('/auth/forgot-password',
        body: {'correo': _mail.text.trim()}, auth: false));
    if (r != null && mounted) {
      snack(context, r['mensaje']);
      setState(() => _reset = true);
    }
  }

  Future<void> _apply() async {
    final api = context.read<AuthState>().api;
    final r = await guarded(context, () => api.post('/auth/reset-password',
        body: {'token': _tok.text.trim(), 'nueva_password': _pw.text}, auth: false));
    if (r != null && mounted) {
      snack(context, r['mensaje']);
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Recuperar contraseña'), leading: BackButton(onPressed: () => context.go('/login'))),
        body: Centered(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            if (!_reset) ...[
              const Text('Ingrese su correo y le enviaremos un enlace para restablecer su contraseña.'),
              const SizedBox(height: 12),
              TextField(controller: _mail, keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Correo electrónico', border: OutlineInputBorder())),
              const SizedBox(height: 12),
              FilledButton(onPressed: _send, child: const Text('Enviar instrucciones')),
              TextButton(onPressed: () => setState(() => _reset = true), child: const Text('Ya tengo un código')),
            ] else ...[
              TextField(controller: _tok,
                  decoration: const InputDecoration(labelText: 'Código recibido', border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(controller: _pw, obscureText: true,
                  decoration: const InputDecoration(labelText: 'Nueva contraseña', border: OutlineInputBorder())),
              const SizedBox(height: 12),
              FilledButton(onPressed: _apply, child: const Text('Restablecer')),
            ],
          ]),
        ),
      );
}

class VerifyScreen extends StatefulWidget {
  final String token;
  const VerifyScreen({super.key, required this.token});
  @override
  State<VerifyScreen> createState() => _V();
}

class _V extends State<VerifyScreen> {
  String _msg = 'Verificando cuenta...';
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        final r = await context.read<AuthState>().api
            .post('/auth/verify-email', q: {'token': widget.token}, auth: false);
        setState(() => _msg = r['mensaje']);
      } catch (e) {
        setState(() => _msg = '$e');
      }
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Centered(child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(_msg, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          FilledButton(onPressed: () => context.go('/login'), child: const Text('Ir a iniciar sesión')),
        ])),
      );
}
