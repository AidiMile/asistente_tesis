import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen w-full flex items-center justify-center bg-[var(--bg-main)] px-4 relative transition-colors duration-200">
      <!-- Theme toggle in top right corner -->
      <div class="absolute top-4 right-4">
        <button
          (click)="toggleTheme()"
          [title]="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          class="p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-slate-600 dark:text-slate-300 border border-[var(--border-color)] flex items-center justify-center shadow-sm transition-colors">
          <i [class]="isDark ? 'bi bi-moon-stars-fill text-amber-400' : 'bi bi-sun-fill text-amber-500'" class="text-sm"></i>
        </button>
      </div>

      <div class="w-full max-w-md p-8 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-xl transition-colors">
        
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-sky-500/10 text-emerald-600 dark:text-sky-400 border border-emerald-500/20 dark:border-sky-500/20 mb-3 shadow-lg shadow-emerald-500/10 dark:shadow-sky-500/10">
            <i class="bi bi-person-plus-fill text-2xl"></i>
          </div>
          <div class="flex items-center justify-center gap-2">
            <h2 class="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Registro de Usuario</h2>
            <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-300/40 dark:border-amber-400/20">UPEC</span>
          </div>
          <p class="text-xs text-emerald-700 dark:text-sky-400 mt-1 font-medium">Asistente Virtual PLN-EC</p>
        </div>

        <div *ngIf="message" class="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs">
          {{ message }}
        </div>

        <div *ngIf="errorMessage" class="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
          {{ errorMessage }}
        </div>

        <form (ngSubmit)="onRegister()" class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Nombre Completo</label>
            <input type="text" [(ngModel)]="nombre" name="nombre" required class="input-field text-sm" placeholder="Ej: Aida Solis">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Correo Electrónico</label>
            <input type="email" [(ngModel)]="correo" name="correo" required class="input-field text-sm" placeholder="ejemplo@upec.edu.ec">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Contraseña</label>
            <input type="password" [(ngModel)]="password" name="password" required class="input-field text-sm" placeholder="Mínimo 6 caracteres">
          </div>

          <div class="pt-2">
            <button type="submit" [disabled]="loading" class="btn-primary w-full py-3 text-xs font-bold shadow-md">
              Registrar cuenta
            </button>
          </div>
        </form>

        <div class="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          ¿Ya tienes cuenta? 
          <a routerLink="/login" class="text-emerald-600 dark:text-sky-400 font-semibold hover:underline">Iniciar sesión</a>
        </div>

      </div>
    </div>
  `
})
export class RegisterComponent {
  nombre: string = '';
  correo: string = '';
  password: string = '';
  loading: boolean = false;
  message: string = '';
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  get isDark(): boolean {
    return this.themeService.isDark();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  onRegister(): void {
    if (!this.nombre || !this.correo || !this.password) {
      this.errorMessage = 'Todos los campos son requeridos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.message = '';

    this.authService.register({
      nombre: this.nombre,
      correo: this.correo,
      password: this.password,
      rol: 'Estudiante'
    }).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Registro completado con éxito. Redirigiendo al login...';
        setTimeout(() => this.router.navigate(['/login']), 1800);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.correo?.[0] || err?.error?.detail || 'Error al crear la cuenta. Intente de nuevo.';
      }
    });
  }
}
