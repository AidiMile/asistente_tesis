import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <main class="relative min-h-screen overflow-hidden bg-[#032d2a] text-white flex flex-col justify-between">
      <!-- Ambient background decorations matching welcome screen -->
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(45,212,191,.24),transparent_34%),radial-gradient(circle_at_10%_90%,rgba(250,204,21,.12),transparent_30%)]"></div>
      <div class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10"></div>
      <div class="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full border border-white/10"></div>

      <!-- Main Container -->
      <div class="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-between px-5 py-6 sm:px-8 lg:px-14">
        
        <!-- Header -->
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

          <a routerLink="/" class="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs sm:text-sm font-semibold backdrop-blur hover:bg-white/20 transition text-emerald-50">
            <i class="bi bi-arrow-left"></i>
            <span class="hidden sm:inline">Volver a bienvenida</span>
            <span class="sm:hidden">Inicio</span>
          </a>
        </header>

        <!-- Two-column Section -->
        <div class="grid flex-1 items-center gap-8 py-8 lg:grid-cols-2 lg:gap-14 xl:gap-20">
          
          <!-- LEFT COLUMN: Institutional Presentation -->
          <div class="hidden lg:flex flex-col justify-center space-y-6 text-left">
            <div class="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 w-fit">
              <span class="h-2 w-2 animate-pulse rounded-full bg-amber-300"></span>
              Inteligencia artificial con identidad ecuatoriana
            </div>

            <h1 class="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl">
              Tu voz, tus palabras,<br>
              <span class="text-amber-300">nuestro Ecuador.</span>
            </h1>

            <p class="max-w-xl text-base leading-7 text-emerald-50/85">
              Inicia sesión para interactuar con el asistente adaptado al léxico ecuatoriano, entrenado para comprender modismos de la Sierra, Costa y Amazonía.
            </p>

            <!-- Robot card greeting -->
            <div class="relative flex items-center gap-4 rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md max-w-lg">
              <div class="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-3xl text-emerald-700 shadow-xl">
                <i class="bi bi-robot"></i>
              </div>
              <div>
                <p class="text-base font-bold text-white flex items-center gap-2">
                  ¡Hola, ñaño!
                  <span class="text-[11px] font-normal text-amber-300 bg-amber-300/10 px-2 py-0.5 rounded-full border border-amber-300/25">En línea</span>
                </p>
                <p class="mt-0.5 text-xs text-emerald-100/80 leading-relaxed">
                  Ingresa tus credenciales para continuar tu conversación y acceder a tu historial de consultas.
                </p>
              </div>
            </div>

            <!-- Feature Badges -->
            <div class="flex flex-wrap gap-2.5 pt-2">
              <span class="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white border border-white/10">
                <i class="bi bi-translate mr-2 text-amber-300"></i>Modismos ecuatorianos
              </span>
              <span class="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white border border-white/10">
                <i class="bi bi-mic-fill mr-2 text-amber-300"></i>Texto y voz
              </span>
              <span class="inline-flex items-center rounded-full bg-white/10 px-3.5 py-1.5 text-xs text-white border border-white/10">
                <i class="bi bi-database-check mr-2 text-amber-300"></i>Aprendizaje local
              </span>
            </div>
          </div>

          <!-- RIGHT COLUMN: Authentication Form -->
          <div class="flex justify-center items-center w-full">
            <div class="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 sm:p-8 md:p-9 shadow-2xl backdrop-blur-xl">
              
              <!-- Mobile-only Brand Header -->
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

              <!-- Form Title -->
              <div class="mb-6">
                <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Iniciar sesión
                </h2>
                <p class="mt-1 text-xs sm:text-sm text-emerald-100/75">
                  Ingresa con tus credenciales institucionales
                </p>
              </div>

              <!-- Error Alert -->
              <div *ngIf="errorMessage" class="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/20 p-3.5 text-xs sm:text-sm text-red-100 backdrop-blur-md">
                <i class="bi bi-exclamation-octagon-fill text-red-300 text-base shrink-0 mt-0.5"></i>
                <div class="flex-1 leading-snug">
                  <strong class="font-semibold">Error:</strong> {{ errorMessage }}
                </div>
              </div>

              <!-- Login Form -->
              <form (ngSubmit)="onLogin()" class="space-y-4 sm:space-y-5">
                <!-- Email field -->
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-emerald-100 mb-2">
                    Correo electrónico
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

                <!-- Password field -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <label class="block text-xs font-semibold uppercase tracking-wider text-emerald-100">
                      Contraseña
                    </label>
                    <a
                      routerLink="/forgot-password"
                      class="text-xs text-amber-300 hover:text-amber-200 transition underline underline-offset-2">
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                  <div class="relative">
                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-emerald-100/60">
                      <i class="bi bi-lock text-base"></i>
                    </div>
                    <input
                      [type]="showPassword ? 'text' : 'password'"
                      name="password"
                      [(ngModel)]="password"
                      required
                      autocomplete="current-password"
                      class="w-full rounded-xl border border-white/20 bg-white/10 py-3 pl-10 pr-11 text-sm text-white placeholder-emerald-100/40 backdrop-blur outline-none transition focus:border-amber-300 focus:bg-white/15 focus:ring-2 focus:ring-amber-300/30"
                      placeholder="••••••••"
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

                <!-- Submit Button -->
                <div class="pt-2">
                  <button
                    type="submit"
                    [disabled]="loading"
                    class="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-amber-300 py-3.5 px-6 text-base font-extrabold text-emerald-950 shadow-2xl transition hover:-translate-y-0.5 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span *ngIf="!loading" class="flex items-center gap-2">
                      Iniciar sesión <i class="bi bi-arrow-right"></i>
                    </span>
                    <span *ngIf="loading" class="flex items-center gap-2">
                      <i class="bi bi-arrow-repeat animate-spin text-lg"></i>
                      Autenticando...
                    </span>
                  </button>
                </div>
              </form>

              <!-- Auxiliary Links -->
              <div class="mt-6 pt-5 border-t border-white/10 text-center space-y-3">
                <p class="text-xs text-emerald-100/80">
                  ¿No tienes cuenta?
                  <a routerLink="/register" class="text-amber-300 font-bold hover:underline hover:text-amber-200 ml-1">
                    Regístrate aquí
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

        <!-- Footer -->
        <footer class="py-4 text-center text-xs text-emerald-100/50">
          UPEC · Carrera de Computación · 2026
        </footer>
      </div>
    </main>
  `
})
export class LoginComponent implements OnInit {
  correo: string = '';
  password: string = '';
  showPassword: boolean = false;
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const target = this.authService.isAdmin() ? '/dashboard' : '/chat';
      this.router.navigate([target]);
    }
  }

  onLogin(): void {
    if (!this.correo || !this.password) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.correo.trim(), this.password).subscribe({
      next: () => {
        this.loading = false;
        // Redirección por rol: Administrador -> /dashboard, Estudiante -> /chat
        const target = this.authService.isAdmin() ? '/dashboard' : '/chat';
        this.router.navigate([target]);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.detail || err?.error?.error || 'Credenciales incorrectas. Verifique su correo y contraseña.';
      }
    });
  }
}
