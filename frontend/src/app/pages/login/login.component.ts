import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-login',
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
        
        <!-- Header Logo and Titles -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-sky-500/10 text-emerald-600 dark:text-sky-400 border border-emerald-500/20 dark:border-sky-500/20 mb-4 shadow-lg shadow-emerald-500/10 dark:shadow-sky-500/10">
            <i class="bi bi-cpu-fill text-3xl"></i>
          </div>
          <div class="flex items-center justify-center gap-2">
            <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">PLN-EC</h2>
            <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-300/40 dark:border-amber-400/20">UPEC</span>
          </div>
          <p class="text-sm text-emerald-700 dark:text-sky-400 mt-1 font-medium">Asistente Virtual con Español Ecuatoriano</p>
        </div>

        <!-- Alert messages -->
        <div *ngIf="errorMessage" class="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <i class="bi bi-exclamation-circle-fill"></i>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="onLogin()" class="space-y-5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Correo electrónico</label>
            <div class="relative">
              <input 
                type="email" 
                name="correo" 
                [(ngModel)]="correo" 
                required 
                class="input-field pl-10" 
                placeholder="admin@plnec.ec"
              />
              <i class="bi bi-envelope text-slate-400 absolute left-3.5 top-3.5 text-base"></i>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Contraseña</label>
            <div class="relative">
              <input 
                [type]="showPassword ? 'text' : 'password'" 
                name="password" 
                [(ngModel)]="password" 
                required 
                class="input-field pl-10 pr-10" 
                placeholder="••••••••"
              />
              <i class="bi bi-lock text-slate-400 absolute left-3.5 top-3.5 text-base"></i>
              <button 
                type="button" 
                (click)="showPassword = !showPassword" 
                class="absolute right-3 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <i [class]="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
          </div>

          <div class="pt-2">
            <button 
              type="submit" 
              [disabled]="loading" 
              class="btn-primary w-full py-3 text-sm font-bold shadow-md">
              <span *ngIf="!loading">Iniciar sesión</span>
              <span *ngIf="loading" class="flex items-center gap-2">
                <i class="bi bi-arrow-repeat animate-spin"></i>
                Autenticando...
              </span>
            </button>
          </div>
        </form>

        <!-- Auxiliary Links -->
        <div class="mt-6 text-center space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <a routerLink="/register" class="text-emerald-600 dark:text-sky-400 hover:underline font-semibold">¿No tienes cuenta? Regístrate aquí</a>
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-[var(--border-color)] text-center">
          <p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono">UPEC · Carrera de Computación · 2026</p>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent {
  correo: string = '';
  password: string = '';
  showPassword: boolean = false;
  loading: boolean = false;
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

  onLogin(): void {
    if (!this.correo || !this.password) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.correo, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.detail || 'Credenciales incorrectas';
      }
    });
  }
}
