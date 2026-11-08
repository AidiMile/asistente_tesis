import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <main class="relative min-h-screen overflow-hidden bg-[#032d2a] text-white flex flex-col justify-between">
      <!-- Decoraciones ambientales institucionales -->
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(45,212,191,.24),transparent_34%),radial-gradient(circle_at_10%_90%,rgba(250,204,21,.12),transparent_30%)]"></div>
      <div class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10"></div>
      <div class="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full border border-white/10"></div>

      <!-- Contenedor principal -->
      <div class="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-between px-5 py-6 sm:px-8 lg:px-14">
        
        <!-- Cabecera -->
        <header class="flex items-center justify-between py-2">
          <a routerLink="/" class="flex items-center gap-3 transition hover:opacity-90">
            <div class="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl text-emerald-800 shadow-xl">
              <i class="bi bi-chat-heart-fill"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xl font-extrabold tracking-tight">PLN-EC</span>
                <span class="rounded bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-300/30">UPEC</span>
              </div>
              <div class="text-xs text-emerald-100/75">Asistente virtual ecuatoriano</div>
            </div>
          </a>

          <a routerLink="/login" class="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold backdrop-blur hover:bg-white/20 transition text-emerald-50">
            <i class="bi bi-box-arrow-in-right"></i>
            <span>Iniciar sesión</span>
          </a>
        </header>

        <!-- Dos Columnas -->
        <div class="grid flex-1 items-center gap-8 py-8 lg:grid-cols-2 lg:gap-14 xl:gap-20">
          
          <!-- COLUMNA IZQUIERDA: Presentación Institucional -->
          <div class="hidden lg:flex flex-col justify-center space-y-6 text-left">
            <div class="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 w-fit">
              <span class="h-2 w-2 animate-pulse rounded-full bg-amber-300"></span>
              Restablecimiento Seguro de Contraseña
            </div>

            <h1 class="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl">
              Crea tu nueva<br>
              <span class="text-amber-300">clave institucional.</span>
            </h1>

            <p class="max-w-xl text-base leading-7 text-emerald-50/85">
              Define una contraseña segura para tu cuenta. Al confirmarla, tus credenciales anteriores quedarán invalidadas inmediatamente en el sistema.
            </p>

            <!-- Tarjeta robot informativa -->
            <div class="relative flex items-center gap-4 rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md max-w-lg">
              <div class="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-3xl text-emerald-700 shadow-xl">
                <i class="bi bi-shield-check"></i>
              </div>
              <div>
                <p class="text-base font-bold text-white flex items-center gap-2">
                  Recomendaciones de seguridad
                  <span class="text-[11px] font-normal text-amber-300 bg-amber-300/10 px-2 py-0.5 rounded-full border border-amber-300/25">UPEC</span>
                </p>
                <p class="mt-0.5 text-xs text-emerald-100/80 leading-relaxed">
                  Utiliza al menos 6 caracteres combinando letras, números y símbolos para una protección óptima.
                </p>
              </div>
            </div>

            <!-- Badges -->
            <div class="flex flex-wrap gap-2.5 pt-2">
              <span class="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white border border-white/10">
                <i class="bi bi-check2-circle mr-2 text-amber-300"></i>Cifrado seguro en PostgreSQL
              </span>
              <span class="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white border border-white/10">
                <i class="bi bi-slash-circle mr-2 text-amber-300"></i>Invalidación de token previo
              </span>
            </div>
          </div>

          <!-- COLUMNA DERECHA: Formulario de Nueva Contraseña -->
          <div class="flex justify-center items-center w-full">
            <div class="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 sm:p-8 md:p-9 shadow-2xl backdrop-blur-xl">
              
              <!-- Cabecera Móvil -->
              <div class="lg:hidden flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <div class="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl text-emerald-800 shadow-lg">
                  <i class="bi bi-chat-heart-fill"></i>
                </div>
                <div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-lg font-extrabold text-white">PLN-EC</span>
                    <span class="rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300 border border-amber-300/30">UPEC</span>
                  </div>
                  <div class="text-[11px] text-emerald-100/75">Asistente virtual ecuatoriano</div>
                </div>
              </div>

              <!-- Título -->
              <div class="mb-6">
                <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Nueva contraseña
                </h2>
                <p class="mt-1 text-xs sm:text-sm text-emerald-100/75">
                  Establece las nuevas credenciales de acceso
                </p>
              </div>

              <!-- Estado: Verificando enlace inicial -->
              <div *ngIf="validatingToken" class="py-10 text-center space-y-3">
                <div class="inline-block animate-spin text-3xl text-amber-300">
                  <i class="bi bi-arrow-repeat"></i>
                </div>
                <p class="text-sm text-emerald-100/90 font-medium">Verificando la validez del enlace seguro...</p>
              </div>

              <!-- Estado: Enlace Inválido o Expirado -->
              <div *ngIf="!validatingToken && invalidLink" class="space-y-5 animate-fade-in">
                <div class="flex items-start gap-3.5 rounded-2xl border border-amber-400/40 bg-amber-500/20 p-4 text-xs sm:text-sm text-amber-100 backdrop-blur-md">
                  <i class="bi bi-exclamation-triangle-fill text-amber-300 text-xl shrink-0 mt-0.5"></i>
                  <div class="space-y-1.5 leading-relaxed">
                    <p class="font-bold text-white text-sm">Enlace inválido o expirado</p>
                    <p>{{ invalidReason || 'Este enlace de recuperación ya fue utilizado o ha caducado por superar el tiempo límite de seguridad (1 hora).' }}</p>
                  </div>
                </div>

                <div class="pt-2 space-y-3">
                  <a routerLink="/forgot-password" class="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-300 py-3.5 px-6 text-sm font-extrabold text-emerald-950 shadow-2xl transition hover:-translate-y-0.5 hover:bg-amber-200">
                    <i class="bi bi-arrow-clockwise"></i> Solicitar un nuevo enlace
                  </a>
                  <a routerLink="/login" class="w-full flex items-center justify-center gap-2 text-center text-xs text-emerald-100/80 hover:text-white py-1">
                    Volver al inicio de sesión
                  </a>
                </div>
              </div>

              <!-- Estado: Éxito al Restablecer -->
              <div *ngIf="success" class="space-y-5 animate-fade-in">
                <div class="flex items-start gap-3.5 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 p-4 text-xs sm:text-sm text-emerald-100 backdrop-blur-md">
                  <i class="bi bi-check-circle-fill text-emerald-300 text-2xl shrink-0 mt-0.5"></i>
                  <div class="space-y-1.5 leading-relaxed">
                    <p class="font-bold text-white text-base">¡Contraseña restablecida!</p>
                    <p>Tu contraseña se ha restablecido correctamente. Ya puedes iniciar sesión con tu nueva contraseña.</p>
                    <p class="text-[11px] text-emerald-200/80 pt-1">
                      Serás redirigido a la pantalla de inicio de sesión automáticamente...
                    </p>
                  </div>
                </div>

                <div class="pt-2">
                  <a routerLink="/login" class="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-300 py-3.5 px-6 text-sm font-extrabold text-emerald-950 shadow-2xl transition hover:-translate-y-0.5 hover:bg-amber-200">
                    <i class="bi bi-box-arrow-in-right"></i> Iniciar sesión
                  </a>
                </div>
              </div>

              <!-- Mensaje de Error en el Formulario -->
              <div *ngIf="!validatingToken && !invalidLink && !success && errorMessage" class="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/20 p-3.5 text-xs sm:text-sm text-red-100 backdrop-blur-md">
                <i class="bi bi-exclamation-octagon-fill text-red-300 text-base shrink-0 mt-0.5"></i>
                <div class="flex-1 leading-snug">
                  <strong class="font-semibold">Error:</strong> {{ errorMessage }}
                </div>
              </div>

              <!-- Formulario de Restablecimiento -->
              <form *ngIf="!validatingToken && !invalidLink && !success" (ngSubmit)="onSubmit()" class="space-y-4 sm:space-y-5">
                <!-- Campo: Nueva Contraseña -->
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-emerald-100 mb-2">
                    Nueva contraseña
                  </label>
                  <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-100/60">
                      <i class="bi bi-lock text-base"></i>
                    </div>
                    <input
                      [type]="showPassword ? 'text' : 'password'"
                      name="new_password"
                      [(ngModel)]="new_password"
                      required
                      minlength="6"
                      autocomplete="new-password"
                      class="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-11 text-sm text-white placeholder-emerald-100/40 backdrop-blur outline-none transition focus:border-amber-300 focus:bg-white/15 focus:ring-2 focus:ring-amber-300/30"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      (click)="showPassword = !showPassword"
                      [title]="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
                      class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-emerald-100/60 hover:text-white transition">
                      <i [class]="showPassword ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'" class="text-base"></i>
                    </button>
                  </div>
                </div>

                <!-- Campo: Confirmar Contraseña -->
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-emerald-100 mb-2">
                    Confirmar nueva contraseña
                  </label>
                  <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-100/60">
                      <i class="bi bi-shield-lock text-base"></i>
                    </div>
                    <input
                      [type]="showConfirmPassword ? 'text' : 'password'"
                      name="new_password_confirm"
                      [(ngModel)]="new_password_confirm"
                      required
                      minlength="6"
                      autocomplete="new-password"
                      class="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-11 text-sm text-white placeholder-emerald-100/40 backdrop-blur outline-none transition focus:border-amber-300 focus:bg-white/15 focus:ring-2 focus:ring-amber-300/30"
                      placeholder="Repite la contraseña"
                    />
                    <button
                      type="button"
                      (click)="showConfirmPassword = !showConfirmPassword"
                      [title]="showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
                      class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-emerald-100/60 hover:text-white transition">
                      <i [class]="showConfirmPassword ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'" class="text-base"></i>
                    </button>
                  </div>
                </div>

                <!-- Botón de Envío -->
                <div class="pt-2">
                  <button
                    type="submit"
                    [disabled]="submitting"
                    class="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-amber-300 py-3.5 px-6 text-base font-extrabold text-emerald-950 shadow-2xl transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span *ngIf="!submitting" class="flex items-center gap-2">
                      Restablecer contraseña <i class="bi bi-check-lg"></i>
                    </span>
                    <span *ngIf="submitting" class="flex items-center gap-2">
                      <i class="bi bi-arrow-repeat animate-spin text-lg"></i>
                      Guardando cambios...
                    </span>
                  </button>
                </div>
              </form>

              <!-- Enlaces Auxiliares -->
              <div class="mt-6 pt-5 border-t border-white/10 text-center space-y-3">
                <p class="text-xs text-emerald-100/80">
                  ¿Recordaste tus credenciales?
                  <a routerLink="/login" class="text-amber-300 font-bold hover:underline hover:text-amber-200 ml-1">
                    Iniciar sesión
                  </a>
                </p>
                <div>
                  <a routerLink="/" class="text-xs text-emerald-100/60 hover:text-white transition inline-flex items-center gap-1.5">
                    <i class="bi bi-arrow-left"></i> Volver a la pantalla de bienvenida
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>

        <!-- Pie de página -->
        <footer class="py-4 text-center text-xs text-emerald-100/50">
          UPEC · Carrera de Computación · 2026
        </footer>
      </div>
    </main>
  `
})
export class ResetPasswordComponent implements OnInit {
  uid: string = '';
  token: string = '';

  new_password: string = '';
  new_password_confirm: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  validatingToken: boolean = true;
  invalidLink: boolean = false;
  invalidReason: string = '';

  submitting: boolean = false;
  success: boolean = false;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      let uid = params.get('uid') || '';
      let token = params.get('token') || '';

      // Fallback 1: Buscar en window.location.search (?uid=...&token=...)
      if ((!uid || !token) && typeof window !== 'undefined' && window.location.search) {
        const searchParams = new URLSearchParams(window.location.search);
        uid = uid || searchParams.get('uid') || '';
        token = token || searchParams.get('token') || '';
      }

      // Fallback 2: Buscar en window.location.hash (#/reset-password?uid=...&token=...)
      if ((!uid || !token) && typeof window !== 'undefined' && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        uid = uid || hashParams.get('uid') || '';
        token = token || hashParams.get('token') || '';
      }

      this.uid = uid;
      this.token = token;

      if (!this.uid || !this.token) {
        this.validatingToken = false;
        this.invalidLink = true;
        this.invalidReason = 'El enlace de recuperación es incompleto o no contiene los parámetros de seguridad requeridos.';
        return;
      }

      // Validar el token con el backend antes de mostrar el formulario
      this.authService.validatePasswordResetToken(this.uid, this.token).subscribe({
        next: () => {
          this.validatingToken = false;
          this.invalidLink = false;
        },
        error: (err) => {
          this.validatingToken = false;
          this.invalidLink = true;
          this.invalidReason = err?.error?.detail || 'Este enlace de recuperación ha expirado o ya fue utilizado.';
        }
      });
    });
  }

  onSubmit(): void {
    if (!this.new_password || !this.new_password_confirm) {
      this.errorMessage = 'Por favor complete ambos campos de contraseña';
      return;
    }

    if (this.new_password !== this.new_password_confirm) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    if (this.new_password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.authService.confirmPasswordReset({
      uid: this.uid,
      token: this.token,
      new_password: this.new_password,
      new_password_confirm: this.new_password_confirm
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.success = true;
        // Retirar el token y uid de la URL para evitar que queden en el historial
        this.router.navigate([], { queryParams: {}, replaceUrl: true });
        // Redirigir al login tras 3.5 segundos
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3500);
      },
      error: (err) => {
        this.submitting = false;
        const detail = err?.error?.detail || err?.error?.new_password?.[0] || err?.error?.token || 'Error al restablecer la contraseña. Verifique que el enlace no haya expirado.';
        this.errorMessage = Array.isArray(detail) ? detail.join(' ') : detail;
      }
    });
  }
}

