import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <main class="relative min-h-screen overflow-hidden bg-[#032d2a] text-white flex flex-col justify-between">
      <!-- Decoraciones ambientales idénticas a la pantalla de bienvenida -->
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
            <i class="bi bi-arrow-left"></i>
            <span>Iniciar sesión</span>
          </a>
        </header>

        <!-- Sección de dos columnas -->
        <div class="grid flex-1 items-center gap-8 py-8 lg:grid-cols-2 lg:gap-14 xl:gap-20">
          
          <!-- COLUMNA IZQUIERDA: Presentación Institucional -->
          <div class="hidden lg:flex flex-col justify-center space-y-6 text-left">
            <div class="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 w-fit">
              <span class="h-2 w-2 animate-pulse rounded-full bg-amber-300"></span>
              Recuperación de Acceso Seguro
            </div>

            <h1 class="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl">
              Recupera tu acceso,<br>
              <span class="text-amber-300">sigue aprendiendo.</span>
            </h1>

            <p class="max-w-xl text-base leading-7 text-emerald-50/85">
              Si olvidaste tu contraseña o tienes dificultades para acceder, enviaremos un enlace de un solo uso a tu correo para restablecer tus credenciales de forma segura.
            </p>

            <!-- Tarjeta robot asistente -->
            <div class="relative flex items-center gap-4 rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md max-w-lg">
              <div class="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-3xl text-emerald-700 shadow-xl">
                <i class="bi bi-shield-lock-fill"></i>
              </div>
              <div>
                <p class="text-base font-bold text-white flex items-center gap-2">
                  Protección de cuentas
                  <span class="text-[11px] font-normal text-amber-300 bg-amber-300/10 px-2 py-0.5 rounded-full border border-amber-300/25">Seguridad UPEC</span>
                </p>
                <p class="mt-0.5 text-xs text-emerald-100/80 leading-relaxed">
                  Los enlaces generados caducan en 1 hora y se invalidan automáticamente tras su uso para proteger tu información.
                </p>
              </div>
            </div>

            <!-- Badges -->
            <div class="flex flex-wrap gap-2.5 pt-2">
              <span class="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white border border-white/10">
                <i class="bi bi-envelope-check-fill mr-2 text-amber-300"></i>Verificación por correo
              </span>
              <span class="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white border border-white/10">
                <i class="bi bi-clock-history mr-2 text-amber-300"></i>Caducidad de 1 hora
              </span>
              <span class="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white border border-white/10">
                <i class="bi bi-key-fill mr-2 text-amber-300"></i>Token de un solo uso
              </span>
            </div>
          </div>

          <!-- COLUMNA DERECHA: Formulario de Recuperación -->
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

              <!-- Título del Formulario -->
              <div class="mb-6">
                <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Recuperar contraseña
                </h2>
                <p class="mt-1 text-xs sm:text-sm text-emerald-100/75">
                  Ingresa el correo institucional asociado a tu cuenta
                </p>
              </div>

              <!-- Mensaje de Error -->
              <div *ngIf="errorMessage" class="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/20 p-3.5 text-xs sm:text-sm text-red-100 backdrop-blur-md">
                <i class="bi bi-exclamation-octagon-fill text-red-300 text-base shrink-0 mt-0.5"></i>
                <div class="flex-1 leading-snug">
                  <strong class="font-semibold">Atención:</strong> {{ errorMessage }}
                </div>
              </div>

              <!-- Estado: Enviado con Éxito -->
              <div *ngIf="submitted" class="space-y-5 animate-fade-in">
                <div class="flex items-start gap-3.5 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 p-4 text-xs sm:text-sm text-emerald-100 backdrop-blur-md">
                  <i class="bi bi-check-circle-fill text-emerald-300 text-xl shrink-0 mt-0.5"></i>
                  <div class="space-y-1.5 leading-relaxed">
                    <p class="font-bold text-white text-sm">¡Solicitud procesada!</p>
                    <p>
                      Si la dirección <strong>{{ correo }}</strong> se encuentra registrada en el sistema, recibirás en breve un correo con el enlace de restablecimiento.
                    </p>
                    <p class="text-[11px] text-emerald-200/80 pt-1">
                      * Por favor revisa también tu carpeta de spam o correo no deseado.
                    </p>
                  </div>
                </div>

                <div class="pt-2 space-y-3">
                  <a routerLink="/login" class="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-300 py-3.5 px-6 text-sm font-extrabold text-emerald-950 shadow-2xl transition hover:-translate-y-0.5 hover:bg-amber-200">
                    <i class="bi bi-box-arrow-in-right"></i> Volver a iniciar sesión
                  </a>
                  <button type="button" (click)="resetForm()" class="w-full text-center text-xs text-emerald-100/80 hover:text-white underline py-1">
                    Enviar a otro correo
                  </button>
                </div>
              </div>

              <!-- Formulario de Envío (cuando no está submitted) -->
              <form *ngIf="!submitted" (ngSubmit)="onSubmit()" class="space-y-4 sm:space-y-5">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-emerald-100 mb-2">
                    Correo electrónico registrado
                  </label>
                  <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-100/60">
                      <i class="bi bi-envelope text-base"></i>
                    </div>
                    <input
                      type="email"
                      name="correo"
                      [(ngModel)]="correo"
                      required
                      autocomplete="email"
                      class="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-emerald-100/40 backdrop-blur outline-none transition focus:border-amber-300 focus:bg-white/15 focus:ring-2 focus:ring-amber-300/30"
                      placeholder="usuario@upec.edu.ec"
                    />
                  </div>
                </div>

                <div class="pt-2">
                  <button
                    type="submit"
                    [disabled]="loading"
                    class="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-amber-300 py-3.5 px-6 text-base font-extrabold text-emerald-950 shadow-2xl transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span *ngIf="!loading" class="flex items-center gap-2">
                      Enviar enlace de recuperación <i class="bi bi-send-fill text-sm"></i>
                    </span>
                    <span *ngIf="loading" class="flex items-center gap-2">
                      <i class="bi bi-arrow-repeat animate-spin text-lg"></i>
                      Procesando...
                    </span>
                  </button>
                </div>
              </form>

              <!-- Enlaces Auxiliares -->
              <div class="mt-6 pt-5 border-t border-white/10 text-center space-y-3">
                <p class="text-xs text-emerald-100/80">
                  ¿Recordaste tu contraseña?
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
export class ForgotPasswordComponent {
  correo: string = '';
  loading: boolean = false;
  submitted: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    if (!this.correo || !this.correo.trim()) {
      this.errorMessage = 'Por favor ingresa tu correo electrónico';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.requestPasswordReset(this.correo.trim()).subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
      },
      error: (err) => {
        this.loading = false;
        // Si hay error de limitación (throttling) u otro, mostrar detalle
        if (err.status === 429) {
          this.errorMessage = 'Has realizado demasiadas solicitudes en poco tiempo. Por favor espera unos minutos antes de volver a intentar.';
        } else {
          // Prevenir enumeración mostrando confirmación o mensaje genérico seguro
          this.submitted = true;
        }
      }
    });
  }

  resetForm(): void {
    this.submitted = false;
    this.correo = '';
    this.errorMessage = '';
  }
}

