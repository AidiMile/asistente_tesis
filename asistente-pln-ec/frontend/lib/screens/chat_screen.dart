import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:record/record.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../core/api.dart';
import '../core/auth.dart';
import '../core/chat_session.dart';
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
  final Map<String, dynamic>? initialItem;
  const ChatScreen({super.key, this.initialItem});
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

  int? _loadedChatId;
  int _loadToken = 0;
  ChatSession? _session;

  Api get _api => context.read<AuthState>().api;

  @override
  void initState() {
    super.initState();
    if (widget.initialItem != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          context.read<ChatSession>().selectChat(widget.initialItem!);
        }
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final session = context.read<ChatSession>();
    if (_session != session) {
      _session?.removeListener(_onSessionChanged);
      _session = session;
      _session?.addListener(_onSessionChanged);
      _syncWithSession();
    }
  }

  @override
  void didUpdateWidget(ChatScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialItem != oldWidget.initialItem && widget.initialItem != null) {
      context.read<ChatSession>().selectChat(widget.initialItem!);
    }
  }

  void _onSessionChanged() {
    if (!mounted) return;
    _syncWithSession();
  }

  void _syncWithSession() {
    final session = _session;
    if (session == null) return;

    final targetId = session.currentChatId;
    if (targetId == null) {
      // Estado de Nuevo Chat: invalidar cargas asíncronas y limpiar pantalla
      if (_loadedChatId != null || _msgs.isNotEmpty) {
        _loadToken++;
        setState(() {
          _loadedChatId = null;
          _msgs.clear();
          _ctl.clear();
          _busy = false;
        });
      }
    } else if (targetId != _loadedChatId) {
      // Se seleccionó una conversación diferente: cargar su detalle
      _loadConversation(targetId, session.activeItem);
    }
  }

  Future<void> _loadConversation(int id, [Map<String, dynamic>? fallbackItem]) async {
    final int thisToken = ++_loadToken;

    setState(() {
      _busy = true;
      _msgs.clear();
    });

    try {
      final det = await _api.get('/asistente/conversaciones/$id/');
      // Evitar que respuestas asíncronas restauren la conversación si el usuario canceló o cambió
      if (!mounted || thisToken != _loadToken || _session?.currentChatId != id) {
        return;
      }

      if (det is Map && det['mensajes'] is List) {
        final List msgs = det['mensajes'] as List;
        final loadedMsgs = <_Msg>[];
        for (final m in msgs) {
          final isMine = (m['role'] ?? m['sender']) == 'user';
          final content = (m['content'] ?? m['text'] ?? '').toString();
          if (content.isNotEmpty) {
            loadedMsgs.add(_Msg(isMine, content, meta: isMine ? null : Map<String, dynamic>.from(m as Map)));
          }
        }
        setState(() {
          _msgs.clear();
          _msgs.addAll(loadedMsgs);
          _loadedChatId = id;
        });
        _toBottom();
      }
    } catch (_) {
      if (!mounted || thisToken != _loadToken || _session?.currentChatId != id) {
        return;
      }
      // Fallback con datos locales si la conexión falla
      if (fallbackItem != null) {
        final loadedMsgs = <_Msg>[];
        if (fallbackItem['consulta'] != null) {
          loadedMsgs.add(_Msg(true, fallbackItem['consulta'].toString(), input: fallbackItem['tipo_entrada']?.toString()));
        }
        if (fallbackItem['respuesta'] != null || fallbackItem['texto_generado'] != null) {
          loadedMsgs.add(_Msg(false, (fallbackItem['texto_generado'] ?? fallbackItem['respuesta']).toString(), meta: fallbackItem));
        }
        setState(() {
          _msgs.clear();
          _msgs.addAll(loadedMsgs);
          _loadedChatId = id;
        });
        _toBottom();
      }
    } finally {
      if (mounted && thisToken == _loadToken) {
        setState(() => _busy = false);
      }
    }
  }

  void _startNewChat() {
    _loadToken++;
    _ctl.clear();
    setState(() {
      _loadedChatId = null;
      _msgs.clear();
      _busy = false;
      _listening = false;
      _recording = false;
    });
    context.read<ChatSession>().newChat();
  }

  void _toBottom() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) {
          _scroll.animateTo(_scroll.position.maxScrollExtent + 200,
              duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
        }
      });

  void _addReply(Json r) {
    final replyText = (r['texto_generado'] ?? r['respuesta'] ?? '').toString();
    _msgs.add(_Msg(false, replyText, meta: r));
  }

  Future<void> _send([String? customText]) async {
    final text = (customText ?? _ctl.text).trim();
    if (text.isEmpty || _busy) return;
    final tipo = _dictated ? 'Dictado por voz' : 'Texto';
    final chatSession = context.read<ChatSession>();
    final int? currentChatId = chatSession.currentChatId;

    setState(() {
      _msgs.add(_Msg(true, text, input: _dictated ? 'dictado' : 'texto'));
      _busy = true;
      _ctl.clear();
      _dictated = false;
    });
    _toBottom();

    try {
      final body = {
        'texto': text,
        'tipo_entrada': tipo,
        if (currentChatId != null) 'id_conversacion': currentChatId,
      };
      final r = await _api.post('/asistente/generar/', body: body);
      final map = Map<String, dynamic>.from(r);
      if (mounted) {
        _addReply(map);
        final replyText = (map['texto_generado'] ?? map['respuesta'] ?? '').toString();
        final int? newId = map['id_conversacion'] ?? map['id_historial'] ?? currentChatId;
        _loadedChatId = newId;
        chatSession.notifyMessageSent(map, text, replyText);
      }
    } catch (e) {
      if (mounted) {
        _msgs.add(_Msg(false, '⚠ $e'));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
      _toBottom();
    }
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
    });
    if (!ok) {
      if (mounted) snack(context, 'Dictado no disponible en este dispositivo', error: true);
      return;
    }
    setState(() => _listening = true);
    await _speech.listen(
        localeId: 'es_EC',
        onResult: (r) {
          setState(() {
            _ctl.text = r.recognizedWords;
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
        _msgs.add(_Msg(true, '🎤 Grabación de voz enviada', input: 'audio'));
      });
      try {
        if (!mounted) return;
        final chatSession = context.read<ChatSession>();
        final int? currentChatId = chatSession.currentChatId;
        final bytes = kIsWeb ? (await http.get(Uri.parse(path!))).bodyBytes : await File(path!).readAsBytes();
        final r = await _api.upload(
          '/asistente/transcribir-audio/',
          bytes,
          'audio.wav',
          fields: {
            if (currentChatId != null) 'id_conversacion': currentChatId.toString(),
          },
        );
        final m = Map<String, dynamic>.from(r);
        final userQuery = (m['texto_transcrito'] ?? m['texto_consulta'] ?? 'Consulta de voz').toString();
        setState(() {
          _msgs.removeLast();
          _busy = false;
        });
        await _send(userQuery);
      } catch (e) {
        _msgs.add(_Msg(false, '⚠ $e'));
        if (mounted) setState(() => _busy = false);
      }
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
    _session?.removeListener(_onSessionChanged);
    _rec.dispose();
    _speech.cancel();
    _ctl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Widget _bubble(_Msg m) {
    final cs = Theme.of(context).colorScheme;
    final idioms = (m.meta?['modismos_detectados'] as List?) ??
        (m.meta?['modismos'] as List?) ??
        [];
    return Align(
      alignment: m.mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(14),
        constraints: const BoxConstraints(maxWidth: 750),
        decoration: BoxDecoration(
          color: m.mine ? const Color(0xFFE6F4F1) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: m.mine ? const Color(0xFFBCE3DC) : const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (m.mine && m.input != null && m.input != 'texto')
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                m.input == 'audio' ? '🎤 audio' : '🗣 dictado',
                style: const TextStyle(fontSize: 11, color: Color(0xFF075E54), fontWeight: FontWeight.bold),
              ),
            ),
          SelectableText(
            m.text,
            style: const TextStyle(fontSize: 14.5, height: 1.5, color: Color(0xFF2D3748)),
          ),
          if (idioms.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(spacing: 6, children: [
              for (final i in idioms)
                Tooltip(
                  message: (i is Map && i['significado'] != null)
                      ? '${i['significado']}${(i['ejemplo_uso'] != null && i['ejemplo_uso'].toString().isNotEmpty) ? '\nEjemplo: ${i['ejemplo_uso']}' : ''}'
                      : (i is Map && i['significados'] is List)
                          ? (i['significados'] as List).join(' / ')
                          : (i is Map ? (i['palabra'] ?? i['modismo'] ?? '') : '$i'),
                  child: Chip(
                    backgroundColor: const Color(0xFFF0FDF4),
                    side: const BorderSide(color: Color(0xFFBBF7D0)),
                    avatar: const Icon(Icons.translate, size: 14, color: Color(0xFF075E54)),
                    label: Text(
                      i is Map ? (i['palabra'] ?? i['modismo'] ?? '') : '$i',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF075E54), fontWeight: FontWeight.w600),
                    ),
                    visualDensity: VisualDensity.compact,
                  ),
                ),
            ]),
          ],
          if (m.meta != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                children: [
                  Icon(Icons.check_circle_outline, size: 12, color: cs.primary),
                  const SizedBox(width: 4),
                  Text(
                    '${m.meta!['fuente'] ?? (m.meta!['intencion'] != null ? '${m.meta!['intencion']} · ' : '')}'
                    '${m.meta!['tiempo_respuesta'] != null ? ' · ${m.meta!['tiempo_respuesta']} s' : ''}',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF718096)),
                  ),
                ],
              ),
            ),
        ]),
      ),
    );
  }

  Widget _buildEmptyState(String userName) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 680),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: const Color(0xFFE6F4F1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.forum, color: Color(0xFF075E54), size: 36),
              ),
              const SizedBox(height: 20),
              Text(
                '¡Hola${userName.isNotEmpty ? ', $userName' : ''}!\n¿En qué puedo ayudarte hoy?',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1A202C),
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Asistente virtual especializado en español ecuatoriano, modismos y generación académica.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Color(0xFF718096)),
              ),
              const SizedBox(height: 32),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                alignment: WrapAlignment.center,
                children: [
                  _suggestionCard('¿Qué significa chuchaqui?', 'Consulta de modismo y salud general'),
                  _suggestionCard('Ley de Seguridad Social en Ecuador', 'Informe académico estructurado'),
                  _suggestionCard('¿Qué es un quimbolito?', 'Términos culinarios y culturales'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _suggestionCard(String title, String subtitle) {
    return InkWell(
      onTap: () => _send(title),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 310,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.015),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5, color: Color(0xFF2D3748))),
            const SizedBox(height: 4),
            Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF718096))),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final chatSession = context.watch<ChatSession>();
    final userName = auth.user?['nombre'] ?? '';

    final currentId = chatSession.currentChatId;
    final activeSummary = chatSession.activeItem?['consulta'] ?? chatSession.activeItem?['titulo'];
    final bool isContinuing = currentId != null;

    return Container(
      color: const Color(0xFFF7FAF9),
      child: Column(
        children: [
          // Banner indicador si se está continuando una conversación previa
          if (isContinuing)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: const Color(0xFFE6F4F1),
              child: Row(
                children: [
                  const Icon(Icons.history_toggle_off, size: 18, color: Color(0xFF075E54)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Continuando conversación: ${activeSummary ?? '#$currentId'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF075E54)),
                    ),
                  ),
                  TextButton.icon(
                    icon: const Icon(Icons.add, size: 16, color: Color(0xFF075E54)),
                    label: const Text('Nuevo chat', style: TextStyle(color: Color(0xFF075E54), fontWeight: FontWeight.bold, fontSize: 12)),
                    onPressed: _startNewChat,
                  ),
                ],
              ),
            ),

          Expanded(
            child: _msgs.isEmpty
                ? _buildEmptyState(userName)
                : ListView(
                    controller: _scroll,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                    children: [
                      for (final m in _msgs) _bubble(m),
                      if (_busy) const Padding(padding: EdgeInsets.all(12), child: LinearProgressIndicator(color: Color(0xFF075E54))),
                    ],
                  ),
          ),

          // Barra inferior de entrada
          SafeArea(
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 850),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFD7E4E0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      IconButton(
                        tooltip: 'Dictado por voz',
                        color: _listening ? Colors.red : const Color(0xFF718096),
                        icon: Icon(_listening ? Icons.hearing : Icons.keyboard_voice_outlined),
                        onPressed: _busy || _recording ? null : _toggleDictation,
                      ),
                      IconButton(
                        tooltip: _recording ? 'Detener y enviar audio' : 'Grabar mensaje de voz',
                        color: _recording ? Colors.red : const Color(0xFF718096),
                        icon: Icon(_recording ? Icons.stop_circle : Icons.mic_none),
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
                          decoration: InputDecoration(
                            hintText: isContinuing ? 'Continuar la conversación...' : 'Escribe tu consulta...',
                            hintStyle: const TextStyle(color: Color(0xFFA0AEC0)),
                            filled: false,
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            counterText: '',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4, right: 4),
                        child: IconButton.filled(
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFF075E54),
                            foregroundColor: Colors.white,
                          ),
                          onPressed: _busy ? null : () => _send(),
                          icon: const Icon(Icons.arrow_upward, size: 20),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
