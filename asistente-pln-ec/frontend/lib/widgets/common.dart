import 'package:flutter/material.dart';

void snack(BuildContext c, String m, {bool error = false}) {
  ScaffoldMessenger.of(c).showSnackBar(SnackBar(
    content: Text(m),
    backgroundColor: error ? Theme.of(c).colorScheme.error : null,
  ));
}

Future<bool> confirm(BuildContext c, String msg) async =>
    (await showDialog<bool>(
        context: c,
        builder: (_) => AlertDialog(
              title: const Text('Confirmar'),
              content: Text(msg),
              actions: [
                TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancelar')),
                FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Aceptar')),
              ],
            ))) ??
    false;

/// Ejecuta una acción mostrando el error como SnackBar.
Future<T?> guarded<T>(BuildContext c, Future<T> Function() f) async {
  try {
    return await f();
  } catch (e) {
    if (c.mounted) snack(c, '$e', error: true);
    return null;
  }
}

class Centered extends StatelessWidget {
  final Widget child;
  final double width;
  const Centered({super.key, required this.child, this.width = 460});
  @override
  Widget build(BuildContext context) => Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(constraints: BoxConstraints(maxWidth: width), child: child),
        ),
      );
}

class StatCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color? color;
  const StatCard(this.label, this.value, this.icon, {super.key, this.color});
  @override
  Widget build(BuildContext context) => SizedBox(
        width: 180,
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(icon, color: color ?? Theme.of(context).colorScheme.primary),
              const SizedBox(height: 8),
              Text(value, style: Theme.of(context).textTheme.headlineSmall),
              Text(label, style: Theme.of(context).textTheme.bodySmall),
            ]),
          ),
        ),
      );
}

class ErrorRetry extends StatelessWidget {
  final Object error;
  final VoidCallback onRetry;
  const ErrorRetry(this.error, this.onRetry, {super.key});
  @override
  Widget build(BuildContext context) => Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('$error', textAlign: TextAlign.center),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')),
        ]),
      );
}

/// Convierte "a, b ,c" en lista.
List<String> splitCsv(String s) =>
    s.split(RegExp(r'[,;]')).map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
List<String> splitLines(String s) =>
    s.split('\n').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
