import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen w-full flex items-center justify-center bg-[#0b0f19] px-4">
      <div class="w-full max-w-md p-8 bg-[#131d31]/80 backdrop-blur-xl rounded-2xl border border-[#1e293b] shadow-2xl shadow-black/60">
        
        <!-- Header Logo and Titles (Screenshot 1) -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-4 shadow-lg shadow-sky-500/10">
            <i class="bi bi-person-fill-gear text-3xl"></i>
          </div>
          <h2 class="text-2xl font-bold text-white tracking-tight">Asistente Virtual PLN-EC</h2>
          <p class="text-sm text-sky-400 mt-1 font-medium">Comprende el español ecuatoriano</p>
        </div>

        <!-- Alert messages -->
        <div *ngIf="errorMessage" class="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <i class="bi bi-exclamation-circle-fill"></i>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="onLogin()" class="space-y-5">
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Correo electrónico</label>
            <div class="relative">
              <input 
                type="email" 
                name="correo" 
                [(ngModel)]="correo" 
                required 
                class="input-field pl-10" 
                placeholder="admin@plnec.ec"
              />
              <i class="bi bi-envelope text-slate-500 absolute left-3.5 top-3.5 text-base"></i>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Contraseña</label>
            <div class="relative">
              <input 
                [type]="showPassword ? 'text' : 'password'" 
                name="password" 
                [(ngModel)]="password" 
                required 
                class="input-field pl-10 pr-10" 
                placeholder="••••••••"
              />
              <i class="bi bi-lock text-slate-500 absolute left-3.5 top-3.5 text-base"></i>
              <button 
                type="button" 
                (click)="showPassword = !showPassword" 
                class="absolute right-3 top-3 text-slate-400 hover:text-slate-200">
                <i [class]="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
          </div>

          <div class="pt-2">
            <button 
              type="submit" 
              [disabled]="loading" 
              class="btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-sky-500/20">
              <span *ngIf="!loading">Iniciar sesión</span>
              <span *ngIf="loading" class="flex items-center gap-2">
                <i class="bi bi-arrow-repeat animate-spin"></i>
                Autenticando...
              </span>
            </button>
          </div>
        </form>

        <!-- Auxiliary Links -->
        <div class="mt-6 text-center space-y-2 text-xs text-slate-400">
          <div>
            <a href="javascript:void(0)" class="hover:text-sky-400 transition-colors">¿Olvidó su contraseña?</a>
          </div>
          <div>
            <a routerLink="/register" class="text-sky-400 hover:underline font-medium">Crear una cuenta</a>
          </div>
        </div>

        <div class="mt-8 pt-4 border-t border-[#1e293b]/60 text-center">
          <p class="text-[11px] text-slate-500 font-mono">UPEC · Carrera de Computación · 2026</p>
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

  constructor(private authService: AuthService, private router: Router) {}

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
