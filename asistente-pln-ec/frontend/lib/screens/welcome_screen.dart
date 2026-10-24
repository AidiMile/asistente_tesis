import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/auth.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> with SingleTickerProviderStateMixin {
  final FlutterTts _tts = FlutterTts();
  late final AnimationController _pulse;
  bool _speaking = false;
  static const _greeting =
      'Bienvenido a su asistente virtual de PLN con modismos ecuatorianos.';

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..repeat(reverse: true);
    _tts.setCompletionHandler(() {
      if (mounted) setState(() => _speaking = false);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _speak());
  }

  Future<void> _speak() async {
    await _tts.stop();
    await _tts.setLanguage('es-EC');
    await _tts.setSpeechRate(0.46);
    await _tts.setPitch(1.0);
    if (mounted) setState(() => _speaking = true);
    final result = await _tts.speak(_greeting);
    if (result != 1 && mounted) setState(() => _speaking = false);
  }

  @override
  void dispose() {
    _tts.stop();
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final loggedIn = context.watch<AuthState>().loggedIn;
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF032D2A), Color(0xFF075E54), Color(0xFF0B8F7F)],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(builder: (context, constraints) {
            final wide = constraints.maxWidth >= 820;
            final intro = Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: wide ? CrossAxisAlignment.start : CrossAxisAlignment.center,
                  children: [
                    const _Brand(),
                    const SizedBox(height: 34),
                    Text(
                      'Tu voz, tus palabras,\nnuestro Ecuador.',
                      textAlign: wide ? TextAlign.left : TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: wide ? 56 : 38,
                        height: 1.05,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 20),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 620),
                      child: Text(
                        'Conversa, pregunta y aprende con un asistente que comprende la riqueza de los modismos ecuatorianos.',
                        textAlign: wide ? TextAlign.left : TextAlign.center,
                        style: const TextStyle(color: Color(0xFFD6F1EC), fontSize: 18, height: 1.5),
                      ),
                    ),
                    const SizedBox(height: 32),
                    Wrap(
                      alignment: wide ? WrapAlignment.start : WrapAlignment.center,
                      spacing: 12,
                      runSpacing: 12,
                      children: const [
                        _Feature(icon: Icons.translate, text: 'Modismos ecuatorianos'),
                        _Feature(icon: Icons.mic_none, text: 'Texto y voz'),
                        _Feature(icon: Icons.lock_outline, text: 'Conocimiento local'),
                      ],
                    ),
                    const SizedBox(height: 38),
                    FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFF4B400),
                        foregroundColor: const Color(0xFF1C2B29),
                        textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                      onPressed: () => context.go(loggedIn ? '/chat' : '/login'),
                      icon: const Icon(Icons.arrow_forward_rounded),
                      label: Text(loggedIn ? 'Ir al asistente' : 'Iniciar'),
                    ),
                  ],
                );
            final visual = Center(
                  child: AnimatedBuilder(
                    animation: _pulse,
                    builder: (_, child) => Transform.scale(
                      scale: _speaking ? 1 + (_pulse.value * .045) : 1,
                      child: child,
                    ),
                    child: Container(
                      width: wide ? 330 : 250,
                      height: wide ? 330 : 250,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: .11),
                        border: Border.all(color: Colors.white.withValues(alpha: .25), width: 2),
                        boxShadow: const [BoxShadow(color: Color(0x44000000), blurRadius: 50, offset: Offset(0, 20))],
                      ),
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        const Icon(Icons.record_voice_over_rounded, color: Colors.white, size: 92),
                        const SizedBox(height: 12),
                        Text(_speaking ? 'Hablando…' : 'PLN-EC',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 22)),
                        IconButton.filledTonal(
                          tooltip: 'Escuchar bienvenida',
                          onPressed: _speak,
                          icon: const Icon(Icons.volume_up_rounded),
                        ),
                      ]),
                    ),
                  ),
                );
            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: wide ? 72 : 24, vertical: wide ? 48 : 30),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight - (wide ? 96 : 60)),
                child: wide
                    ? Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
                        Expanded(flex: 6, child: intro),
                        const SizedBox(width: 64),
                        Expanded(flex: 4, child: visual),
                      ])
                    : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        intro,
                        const SizedBox(height: 44),
                        visual,
                      ]),
              ),
            );
          }),
        ),
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand();
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
          child: const Icon(Icons.psychology_alt_rounded, color: Color(0xFF075E54), size: 32),
        ),
        const SizedBox(width: 12),
        const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('PLN-EC', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 23)),
          Text('Asistente virtual ecuatoriano', style: TextStyle(color: Color(0xFFD6F1EC))),
        ]),
      ]);
}

class _Feature extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Feature({required this.icon, required this.text});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: .1), borderRadius: BorderRadius.circular(30)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: const Color(0xFFF4B400), size: 19),
          const SizedBox(width: 7),
          Text(text, style: const TextStyle(color: Colors.white)),
        ]),
      );
}
