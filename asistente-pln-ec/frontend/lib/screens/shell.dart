import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../core/auth.dart';
import '../core/chat_session.dart';
import '../widgets/common.dart';

class _Dest {
  final String path, label;
  final IconData icon;
  const _Dest(this.path, this.label, this.icon);
}

const _adminDests = [
  _Dest('/chat', 'Chat', Icons.chat_bubble_outline),
  _Dest('/history', 'Historial', Icons.history),
  _Dest('/profile', 'Perfil', Icons.person_outline),
  _Dest('/admin', 'Dashboard', Icons.dashboard_outlined),
  _Dest('/admin/users', 'Usuarios', Icons.group_outlined),
  _Dest('/admin/idioms', 'Modismos', Icons.translate),
  _Dest('/admin/corpus', 'Corpus', Icons.library_books_outlined),
  _Dest('/admin/history', 'Historial global', Icons.manage_search),
  _Dest('/admin/metrics', 'Métricas', Icons.query_stats),
];

class AppShell extends StatefulWidget {
  final Widget child;
  final String location;
  const AppShell({super.key, required this.child, required this.location});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final GlobalKey _profileKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthState>();
      if (!auth.isAdmin && auth.loggedIn) {
        context.read<ChatSession>().fetchHistory(auth.api);
      }
    });
  }

  Future<void> _showProfileMenuUpwards(AuthState auth) async {
    final renderBox = _profileKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;
    final offset = renderBox.localToGlobal(Offset.zero);
    final size = renderBox.size;

    final value = await showMenu<String>(
      context: context,
      position: RelativeRect.fromLTRB(
        offset.dx,
        offset.dy - 170, // Despliega hacia arriba
        offset.dx + size.width,
        offset.dy,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      color: Colors.white,
      elevation: 8,
      items: [
        const PopupMenuItem(
          value: 'profile',
          child: Row(
            children: [
              Icon(Icons.person_outline, size: 20, color: Color(0xFF4A5568)),
              SizedBox(width: 12),
              Text('Mi Perfil', style: TextStyle(color: Color(0xFF2D3748), fontWeight: FontWeight.w500)),
            ],
          ),
        ),
        const PopupMenuItem(
          value: 'settings',
          child: Row(
            children: [
              Icon(Icons.settings_outlined, size: 20, color: Color(0xFF4A5568)),
              SizedBox(width: 12),
              Text('Configuración', style: TextStyle(color: Color(0xFF2D3748), fontWeight: FontWeight.w500)),
            ],
          ),
        ),
        const PopupMenuDivider(height: 1),
        const PopupMenuItem(
          value: 'logout',
          child: Row(
            children: [
              Icon(Icons.logout, size: 20, color: Colors.red),
              SizedBox(width: 12),
              Text('Cerrar Sesión', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    );

    if (!mounted || value == null) return;
    if (value == 'profile') {
      context.go('/profile');
    } else if (value == 'settings') {
      _showSettingsDialog(auth);
    } else if (value == 'logout') {
      auth.logout();
    }
  }

  Future<void> _confirmDeleteChat(AuthState auth, ChatSession chatSession, int idHistorial) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.delete_outline, color: Color(0xFFE53E3E), size: 22),
            SizedBox(width: 8),
            Text('Eliminar conversación'),
          ],
        ),
        content: const Text('¿Estás seguro de que deseas eliminar esta conversación? Esta acción no se puede deshacer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFE53E3E)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (ok == true && mounted) {
      final success = await chatSession.deleteChat(auth.api, idHistorial, isAdmin: auth.isAdmin);
      if (mounted) {
        if (success) {
          snack(context, 'Conversación eliminada');
        } else {
          snack(context, 'No se pudo eliminar la conversación', error: true);
        }
      }
    }
  }

  void _showSettingsDialog(AuthState auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.settings_outlined, color: Color(0xFF075E54)),
            SizedBox(width: 10),
            Text('Configuración'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const CircleAvatar(
                backgroundColor: Color(0xFF075E54),
                child: Icon(Icons.person, color: Colors.white),
              ),
              title: Text(auth.user?['nombre'] ?? 'Usuario', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(auth.user?['correo'] ?? ''),
              trailing: Chip(
                label: Text(auth.isAdmin ? 'Admin' : 'Usuario'),
                backgroundColor: const Color(0xFFE6F4F1),
                labelStyle: const TextStyle(color: Color(0xFF075E54), fontWeight: FontWeight.w600, fontSize: 12),
              ),
            ),
            const Divider(height: 24),
            const Text('Motor de Inteligencia Artificial', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF718096))),
            const SizedBox(height: 6),
            const Row(
              children: [
                Icon(Icons.memory, size: 18, color: Color(0xFF075E54)),
                SizedBox(width: 8),
                Text('Llama 3 (Ollama Local) - PLN Español Ecuador'),
              ],
            ),
            const SizedBox(height: 12),
            const Text('Reconocimiento de Voz', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Color(0xFF718096))),
            const SizedBox(height: 6),
            const Row(
              children: [
                Icon(Icons.mic, size: 18, color: Color(0xFF075E54)),
                SizedBox(width: 8),
                Text('faster-whisper + Web Speech API'),
              ],
            ),
          ],
        ),
        actions: [
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF075E54)),
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Entendido'),
          ),
        ],
      ),
    );
  }

  String _getGroupLabel(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final sevenDaysAgo = today.subtract(const Duration(days: 7));
    final itemDate = DateTime(date.year, date.month, date.day);

    if (itemDate.isAtSameMomentAs(today) || itemDate.isAfter(today)) {
      return 'Hoy';
    } else if (itemDate.isAtSameMomentAs(yesterday)) {
      return 'Ayer';
    } else if (itemDate.isAfter(sevenDaysAgo)) {
      return '7 días';
    } else {
      return 'Anteriores';
    }
  }

  Map<String, List<Map<String, dynamic>>> _groupHistory(List<Map<String, dynamic>> items) {
    final grouped = <String, List<Map<String, dynamic>>>{
      'Hoy': [],
      'Ayer': [],
      '7 días': [],
      'Anteriores': [],
    };
    for (final item in items) {
      DateTime dt;
      try {
        dt = DateTime.parse(item['fecha']);
      } catch (_) {
        dt = DateTime.now();
      }
      final grp = _getGroupLabel(dt);
      grouped[grp]?.add(item);
    }
    grouped.removeWhere((_, list) => list.isEmpty);
    return grouped;
  }

  Widget _buildProfileCard(AuthState auth) {
    final name = auth.user?['nombre'] ?? (auth.isAdmin ? 'Administrador' : 'Usuario');
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';
    return InkWell(
      key: _profileKey,
      onTap: () => _showProfileMenuUpwards(auth),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: const Color(0xFFF7FAF9),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 17,
              backgroundColor: const Color(0xFF075E54),
              child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF2D3748)),
                  ),
                  Text(
                    auth.isAdmin ? 'Admin' : (auth.user?['correo'] ?? ''),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF718096)),
                  ),
                ],
              ),
            ),
            const Icon(Icons.more_horiz, size: 20, color: Color(0xFF718096)),
          ],
        ),
      ),
    );
  }

  // ---- BARRA LATERAL PARA USUARIO NORMAL (Estilo DeepSeek, colores PLN-EC) ----
  Widget _buildUserSidebar(AuthState auth, ChatSession chatSession) {
    final grouped = _groupHistory(chatSession.historyItems);
    return Container(
      width: 260,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(right: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Logo PLN-EC arriba
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE6F4F1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.forum, color: Color(0xFF075E54), size: 22),
                ),
                const SizedBox(width: 10),
                const Text(
                  'PLN-EC',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF075E54), letterSpacing: 0.5),
                ),
              ],
            ),
          ),

          // Botón grande "+ Nuevo Chat" (verde oscuro)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SizedBox(
              width: double.infinity,
              height: 44,
              child: FilledButton.icon(
                icon: const Icon(Icons.add, size: 20, color: Colors.white),
                label: const Text('Nuevo Chat', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: Colors.white)),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF075E54),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
                  elevation: 0,
                ),
                onPressed: () {
                  chatSession.newChat();
                  if (widget.location != '/chat') context.go('/chat');
                },
              ),
            ),
          ),

          const SizedBox(height: 8),

          // Lista de historial de conversaciones agrupadas por fecha (Hoy, Ayer, 7 días)
          Expanded(
            child: chatSession.loadingHistory && chatSession.historyItems.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : chatSession.historyItems.isEmpty
                    ? const Center(
                        child: Text(
                          'No hay chats recientes',
                          style: TextStyle(color: Color(0xFF718096), fontSize: 13),
                        ),
                      )
                    : ListView(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        children: [
                          for (final entry in grouped.entries) ...[
                            Padding(
                              padding: const EdgeInsets.fromLTRB(8, 14, 8, 6),
                              child: Text(
                                entry.key,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF718096),
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ),
                            for (final item in entry.value) ...[
                              Builder(builder: (ctx) {
                                final isSelected = item['id_historial'] == chatSession.currentChatId;
                                return Container(
                                  margin: const EdgeInsets.symmetric(vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFFE6F4F1) : Colors.transparent,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(10),
                                    onTap: () {
                                      chatSession.selectChat(item);
                                      if (widget.location != '/chat') {
                                        context.go('/chat', extra: item);
                                      }
                                    },
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      child: Row(
                                        children: [
                                          Icon(
                                            Icons.chat_bubble_outline,
                                            size: 14,
                                            color: isSelected ? const Color(0xFF075E54) : const Color(0xFF718096),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              item['consulta'] ?? 'Conversación',
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                fontSize: 13,
                                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                                color: isSelected ? const Color(0xFF075E54) : const Color(0xFF4A5568),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          PopupMenuButton<String>(
                                            icon: const Icon(Icons.more_horiz, size: 16, color: Color(0xFF718096)),
                                            tooltip: 'Opciones del chat',
                                            padding: EdgeInsets.zero,
                                            constraints: const BoxConstraints(),
                                            splashRadius: 14,
                                            onSelected: (val) {
                                              if (val == 'delete') {
                                                _confirmDeleteChat(auth, chatSession, item['id_historial']);
                                              }
                                            },
                                            itemBuilder: (ctx) => [
                                              const PopupMenuItem<String>(
                                                value: 'delete',
                                                height: 36,
                                                child: Row(
                                                  children: [
                                                    Icon(Icons.delete_outline, size: 18, color: Color(0xFFE53E3E)),
                                                    SizedBox(width: 8),
                                                    Text('Eliminar', style: TextStyle(color: Color(0xFFE53E3E), fontSize: 13, fontWeight: FontWeight.w500)),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              }),
                            ],
                          ],
                        ],
                      ),
          ),

          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Pie del sidebar: Foto de perfil y nombre del usuario con menú hacia arriba
          Padding(
            padding: const EdgeInsets.all(12),
            child: _buildProfileCard(auth),
          ),
        ],
      ),
    );
  }

  // ---- BARRA LATERAL PARA ADMINISTRADOR (Menú original intacto, sin flecha de salir) ----
  Widget _buildAdminSidebar(AuthState auth) {
    return Container(
      width: 240,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(right: BorderSide(color: Color(0xFFE2E8F0))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Logo PLN-EC arriba
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE6F4F1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.forum, color: Color(0xFF075E54), size: 22),
                ),
                const SizedBox(width: 10),
                const Text(
                  'PLN-EC',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF075E54), letterSpacing: 0.5),
                ),
              ],
            ),
          ),

          // Menú completo del administrador con sus 9 módulos exactos
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              children: [
                for (final d in _adminDests) ...[
                  Builder(builder: (ctx) {
                    final selected = widget.location == d.path;
                    return Container(
                      margin: const EdgeInsets.symmetric(vertical: 2),
                      decoration: BoxDecoration(
                        color: selected ? const Color(0xFFE6F4F1) : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: ListTile(
                        dense: true,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        leading: Icon(d.icon, color: selected ? const Color(0xFF075E54) : const Color(0xFF4A5568), size: 20),
                        title: Text(
                          d.label,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                            color: selected ? const Color(0xFF075E54) : const Color(0xFF2D3748),
                          ),
                        ),
                        onTap: () => context.go(d.path),
                      ),
                    );
                  }),
                ],
              ],
            ),
          ),

          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Pie del sidebar: Foto y nombre del Administrador (reemplazó el botón de salida)
          Padding(
            padding: const EdgeInsets.all(12),
            child: _buildProfileCard(auth),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final chatSession = context.watch<ChatSession>();
    final wide = MediaQuery.of(context).size.width >= 800;

    if (wide) {
      return Scaffold(
        body: Row(
          children: [
            if (auth.isAdmin)
              _buildAdminSidebar(auth)
            else
              _buildUserSidebar(auth, chatSession),
            Expanded(child: widget.child),
          ],
        ),
      );
    }

    // Vista móvil / estrecha con Drawer
    return Scaffold(
      appBar: AppBar(
        title: Text(
          auth.isAdmin
              ? (_adminDests.firstWhere((d) => d.path == widget.location, orElse: () => _adminDests.first).label)
              : 'PLN-EC',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      drawer: Drawer(
        child: SafeArea(
          child: auth.isAdmin
              ? _buildAdminSidebar(auth)
              : _buildUserSidebar(auth, chatSession),
        ),
      ),
      body: widget.child,
    );
  }
}
