import 'dart:io' show File;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:record/record.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../core/api.dart';
import '../core/auth.dart';
import '../core/config.dart';
import '../widgets/common.dart';

class _Msg {
  final bool mine;
  final String text;
  final String? input;
  final Json? meta;
  _Msg(this.mine, this.text, {this.input, this.meta});
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});
  @override
  State<ChatScreen> createState() => _S();
}

class _S extends State<ChatScreen> {
  final _ctl = TextEditingController();
  final _scroll = ScrollController();
  final _msgs = <_Msg>[];
  final _speech = stt.SpeechToText();
  final _rec = AudioRecorder();
  bool _busy = false, _listening = false, _recording = false, _dictated = false;

  Api get _api => context.read<AuthState>().api;

  void _toBottom() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) {
          _scroll.animateTo(_scroll.position.maxScrollExtent + 200,
              duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
        }
      });

  void _addReply(Json r) {
    _msgs.add(_Msg(false, r['respuesta'], meta: r));
  }

  Future<void> _send() async {
    final text = _ctl.text.trim();
    if (text.isEmpty || _busy) return;
    final tipo = _dictated ? 'dictado' : 'texto';
    setState(() {
      _msgs.add(_Msg(true, text, input: tipo));
      _busy = true;
      _ctl.clear();
      _dictated = false;
    });
    _toBottom();
    try {
      final r = await _api.post('/queries', body: {'texto': text, 'tipo_entrada': tipo});
      _addReply(Map<String, dynamic>.from(r));
    } catch (e) {
      _msgs.add(_Msg(false, '⚠ $e'));
    }
    if (mounted) setState(() => _busy = false);
    _toBottom();
  }

  Future<void> _toggleDictation() async {
    if (_listening) {
      await _speech.stop();
      setState(() => _listening = false);
      return;
    }
    final ok = await _speech.initialize(onStatus: (s) {
      if (s == 'done' || s == 'notListening') {
        if (mounted) setState(() => _listening = false);
      }
    }, onError: (_) {
      if (mounted) setState(() => _listening = false);
    });
    if (!ok) {
      if (mounted) snack(context, 'El dictado por voz no está disponible en este dispositivo/navegador', error: true);
      return;
    }
    final locales = await _speech.locales();
    final es = locales.where((l) => l.localeId.toLowerCase().startsWith('es')).toList();
    final loc = es.firstWhere((l) => l.localeId.toLowerCase().replaceAll('-', '_') == 'es_ec',
        orElse: () => es.isNotEmpty ? es.first : locales.first);
    setState(() => _listening = true);
    await _speech.listen(
        localeId: loc.localeId,
        onResult: (r) {
          setState(() {
            _ctl.text = r.recognizedWords;
            _ctl.selection = TextSelection.collapsed(offset: _ctl.text.length);
            _dictated = true;
          });
        });
  }

  Future<void> _toggleRecording() async {
    if (_recording) {
      final path = await _rec.stop();
      setState(() {
        _recording = false;
        _busy = true;
        _msgs.add(_Msg(true, '🎤 Mensaje de voz', input: 'audio'));
      });
      try {
        final bytes = kIsWeb ? (await http.get(Uri.parse(path!))).bodyBytes : await File(path!).readAsBytes();
        final r = await _api.upload('/queries/audio', bytes, 'audio.wav');
        final m = Map<String, dynamic>.from(r);
        setState(() {
          _msgs.removeLast();
          _msgs.add(_Msg(true, m['texto_consulta'], input: 'audio'));
        });
        _addReply(m);
      } catch (e) {
        _msgs.add(_Msg(false, '⚠ $e'));
      }
      if (mounted) setState(() => _busy = false);
      _toBottom();
      return;
    }
    if (!await _rec.hasPermission()) {
      if (mounted) snack(context, 'Permiso de micrófono denegado', error: true);
      return;
    }
    final path = kIsWeb ? '' : '${(await getTemporaryDirectory()).path}/q_${DateTime.now().millisecondsSinceEpoch}.wav';
    await _rec.start(const RecordConfig(encoder: AudioEncoder.wav), path: path);
    setState(() => _recording = true);
  }

  @override
  void dispose() {
    _rec.dispose();
    _speech.cancel();
    super.dispose();
  }

  Widget _bubble(_Msg m) {
    final cs = Theme.of(context).colorScheme;
    final idioms = (m.meta?['modismos'] as List?) ?? [];
    return Align(
      alignment: m.mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(12),
        constraints: const BoxConstraints(maxWidth: 720),
        decoration: BoxDecoration(
          color: m.mine ? cs.primaryContainer : cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (m.mine && m.input != null && m.input != 'texto')
            Text(m.input == 'audio' ? '🎤 audio' : '🗣 dictado', style: Theme.of(context).textTheme.labelSmall),
          SelectableText(m.text),
          if (idioms.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(spacing: 6, children: [
              for (final i in idioms)
                Tooltip(
                  message: (i['significados'] as List).join(' / '),
                  child: Chip(
                      avatar: const Icon(Icons.translate, size: 16),
                      label: Text(i['modismo']),
                      visualDensity: VisualDensity.compact),
                ),
            ]),
          ],
          if (m.meta != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text('${m.meta!['intencion']} · ${m.meta!['tiempo_respuesta']} s · '
                  '${m.meta!['origen_respuesta'] == 'base_local' ? 'base local' : (m.meta!['modelo'] ?? 'modelo')}',
                  style: Theme.of(context).textTheme.labelSmall),
            ),
        ]),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Column(children: [
        Expanded(
          child: _msgs.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                        '¡Hola ${context.read<AuthState>().user?['nombre'] ?? ''}! Escríbeme, dicta o envía un audio.\n'
                        'Prueba: "¿Qué significa achachay?" o "Redacta un resumen sobre las regiones del Ecuador".',
                        textAlign: TextAlign.center),
                  ),
                )
              : ListView(controller: _scroll, padding: const EdgeInsets.all(16), children: [
                  for (final m in _msgs) _bubble(m),
                  if (_busy) const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator()),
                ]),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
            child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              IconButton(
                tooltip: 'Dictado por voz',
                color: _listening ? Colors.red : null,
                icon: Icon(_listening ? Icons.hearing : Icons.keyboard_voice_outlined),
                onPressed: _busy || _recording ? null : _toggleDictation,
              ),
              IconButton(
                tooltip: _recording ? 'Detener y enviar audio' : 'Grabar mensaje de voz',
                color: _recording ? Colors.red : null,
                icon: Icon(_recording ? Icons.stop_circle : Icons.mic),
                onPressed: _busy || _listening ? null : _toggleRecording,
              ),
              Expanded(
                child: TextField(
                  controller: _ctl,
                  minLines: 1,
                  maxLines: 5,
                  maxLength: AppConfig.maxQueryChars,
                  textInputAction: TextInputAction.send,
                  onChanged: (_) => _dictated = _dictated && _listening,
                  onSubmitted: (_) => _send(),
                  decoration: const InputDecoration(hintText: 'Escribe tu consulta...', border: OutlineInputBorder()),
                ),
              ),
              const SizedBox(width: 8),
              Padding(
                padding: const EdgeInsets.only(bottom: 22),
                child: FilledButton(onPressed: _busy ? null : _send, child: const Icon(Icons.send)),
              ),
            ]),
          ),
        ),
      ]);
}
