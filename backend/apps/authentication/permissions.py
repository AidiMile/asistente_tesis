from rest_framework import permissions


def es_administrador(user):
    """
    Valida el rol en el servidor comprobando el perfil institucional o atributos de staff.
    Nunca confía en lo que envíe el cliente o el frontend.
    """
    if not user or not user.is_authenticated:
        return False
    rol = getattr(getattr(user, 'perfil', None), 'rol', None)
    return rol == 'Administrador' or getattr(user, 'is_staff', False)


class EsAdministrador(permissions.BasePermission):
    """
    Permiso estricto que autoriza exclusivamente a usuarios con rol Administrador.
    Devuelve HTTP 403 Forbidden cuando un usuario autenticado (p. ej. Estudiante o Docente)
    intenta acceder a un recurso administrativo protegido.
    """
    message = 'Acceso denegado: este recurso es exclusivo del Administrador.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and es_administrador(request.user))


class EsAdministradorOEsLectura(permissions.BasePermission):
    """
    Permiso por método HTTP:
    - Métodos seguros (GET, HEAD, OPTIONS): lectura permitida.
    - Métodos de modificación (POST, PUT, PATCH, DELETE): exclusivo del Administrador.
    """
    message = 'Acceso denegado: solo el administrador puede crear, modificar o eliminar modismos.'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and es_administrador(request.user))

