import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth.dart';
import '../../widgets/common.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _S();
}

class _S extends State<LoginScreen> {
  final _f = GlobalKey<FormState>();
  final _mail = TextEditingController(), _pw = TextEditingController();
  bool _busy = false, _hide = true;

  Future<void> _go() async {
    if (!_f.currentState!.validate()) return;
    setState(() => _busy = true);
    await guarded(context, () => context.read<AuthState>().login(_mail.text.trim(), _pw.text));
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: LayoutBuilder(builder: (context, constraints) {
          final wide = constraints.maxWidth >= 900;
          final form = Form(
            key: _f,
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text('Bienvenido de vuelta', style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800, color: const Color(0xFF173D38))),
              const SizedBox(height: 6),
              const Text('Ingresa para conversar con tu asistente ecuatoriano.',
                  style: TextStyle(color: Color(0xFF60736F), fontSize: 16)),
              const SizedBox(height: 28),
              TextFormField(
                controller: _mail,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Correo electrónico', border: OutlineInputBorder()),
                validator: (v) => (v == null || !v.contains('@')) ? 'Correo inválido' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _pw,
                obscureText: _hide,
                onFieldSubmitted: (_) => _go(),
                decoration: InputDecoration(
                  labelText: 'Contraseña',
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                      icon: Icon(_hide ? Icons.visibility : Icons.visibility_off),
                      onPressed: () => setState(() => _hide = !_hide)),
                ),
                validator: (v) => (v == null || v.isEmpty) ? 'Ingrese su contraseña' : null,
              ),
              const SizedBox(height: 16),
              SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                      onPressed: _busy ? null : _go,
                      child: _busy
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Iniciar sesión'))),
              Align(alignment: Alignment.centerRight,
                  child: TextButton(onPressed: () => context.go('/forgot'), child: const Text('¿Olvidaste tu contraseña?'))),
              const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider()),
              const Text('¿Todavía no tienes una cuenta?', textAlign: TextAlign.center),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => context.go('/register'),
                icon: const Icon(Icons.person_add_alt_1),
                label: const Text('Crear una cuenta'),
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              ),
              const SizedBox(height: 8),
              TextButton.icon(onPressed: () => context.go('/'),
                  icon: const Icon(Icons.arrow_back), label: const Text('Volver a la bienvenida')),
            ]),
          );
          return Row(children: [
            if (wide)
              Expanded(
                child: Container(
                  height: double.infinity,
                  padding: const EdgeInsets.all(64),
                  decoration: const BoxDecoration(gradient: LinearGradient(
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                    colors: [Color(0xFF043F39), Color(0xFF0B8F7F)],
                  )),
                  child: const Column(crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.psychology_alt_rounded, color: Color(0xFFF4B400), size: 72),
                      SizedBox(height: 24),
                      Text('Asistente Virtual\nPLN-EC', style: TextStyle(
                          color: Colors.white, fontSize: 44, height: 1.05, fontWeight: FontWeight.w800)),
                      SizedBox(height: 18),
                      Text('Entendemos expresiones como “achachay”, “ñaño”, “pana” y muchas más.',
                          style: TextStyle(color: Color(0xFFD6F1EC), fontSize: 18, height: 1.5)),
                    ]),
                ),
              ),
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 470),
                    child: Card(
                      elevation: 0,
                      color: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24),
                          side: const BorderSide(color: Color(0xFFDDE9E6))),
                      child: Padding(padding: EdgeInsets.all(wide ? 38 : 24), child: form),
                    ),
                  ),
                ),
              ),
            ),
          ]);
        }),
      );
}
