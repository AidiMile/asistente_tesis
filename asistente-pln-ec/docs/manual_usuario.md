# Manual de usuario

## Usuario
1. **Registro:** *Crear una cuenta* → nombre, usuario, correo y contraseña (mín. 8 caracteres con mayúscula, minúscula y número). Si la verificación está activa, abra el enlace enviado a su correo.
2. **Inicio de sesión / recuperación:** ingrese correo y contraseña. *¿Olvidó su contraseña?* envía un código válido por 1 hora; péguelo junto con su nueva contraseña.
3. **Chat:** escriba (hasta 500 caracteres) y pulse enviar.
   - 🗣 **Dictado:** pulse el icono de voz, hable y revise el texto antes de enviar.
   - 🎤 **Mensaje de voz:** pulse el micrófono, hable y púlselo de nuevo para enviar el audio.
   - Los modismos reconocidos aparecen como etiquetas; pase el cursor para ver su significado.
   - Ejemplos: «¿Qué significa achachay?», «Redacta un resumen sobre las regiones del Ecuador», «Explícame qué es una red neuronal».
4. **Historial:** lista de sus consultas, con búsqueda; despliegue una para ver la respuesta completa.
5. **Perfil:** cambie su nombre o contraseña.

## Administrador
- **Dashboard:** totales, estado del modelo, elección del modelo activo y sliders de temperatura / top-p / longitud máxima (*Aplicar*). *Actualizar conocimiento lingüístico* recarga los modismos.
- **Usuarios:** buscar, crear, editar rol/estado, activar-desactivar (recomendado) o eliminar (borra su historial).
- **Modismos:** alta/edición con significados y ejemplos (uno por línea), contextos y regiones (separados por coma). *Importar JSON* para cargas masivas (lista de objetos con los mismos campos). *Integrar al modelo* aplica los cambios.
- **Corpus:** crear corpus, cargar archivos `.txt .md .csv .json .jsonl` (se fragmentan en pasajes), asociar modismos, activar/desactivar.
- **Historial global:** todas las interacciones, con filtro.
- **Métricas:** BLEU, ROUGE-L, BERTScore y precisión global frente al umbral; consultas por día; evaluación manual con texto de referencia.

Formato de importación de modismos:
```json
[{"nombre_modismo":"chuta","significados":["Interjección de sorpresa"],"ejemplos":["¡Chuta, se me olvidó!"],"contextos":["Coloquial"],"regiones":["Nacional"]}]
```
