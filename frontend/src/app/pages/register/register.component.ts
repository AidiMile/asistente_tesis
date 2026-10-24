import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen w-full flex items-center justify-center bg-[#0b0f19] px-4">
      <div class="w-full max-w-md p-8 bg-[#131d31]/80 backdrop-blur-xl rounded-2xl border border-[#1e293b] shadow-2xl">
        
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-3">
            <i class="bi bi-person-plus-fill text-2xl"></i>
          </div>
          <h2 class="text-xl font-bold text-white tracking-tight">Registro de Investigador / Usuario</h2>
          <p class="text-xs text-sky-400 mt-1">Asistente Virtual PLN-EC (UPEC)</p>
        </div>

        <div *ngIf="message" class="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          {{ message }}
        </div>

        <div *ngIf="errorMessage" class="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {{ errorMessage }}
        </div>

        <form (ngSubmit)="onRegister()" class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-slate-300 uppercase tracking-wider mb-1">Nombre Completo</label>
            <input type="text" [(ngModel)]="nombre" name="nombre" required class="input-field text-sm" placeholder="Ej: Aida Solis">
          </div>

          <div>
            <label class="block font-semibold text-slate-300 uppercase tracking-wider mb-1">Correo Electrónico</label>
            <input type="email" [(ngModel)]="correo" name="correo" required class="input-field text-sm" placeholder="ejemplo@upec.edu.ec">
          </div>

          <div>
            <label class="block font-semibold text-slate-300 uppercase tracking-wider mb-1">Contraseña</label>
            <input type="password" [(ngModel)]="password" name="password" required class="input-field text-sm" placeholder="Mínimo 6 caracteres">
          </div>

          <div class="pt-2">
            <button type="submit" [disabled]="loading" class="btn-primary w-full py-3 text-xs font-bold shadow-lg shadow-sky-500/20">
              Registrar cuenta
            </button>
          </div>
        </form>

        <div class="mt-6 text-center text-xs text-slate-400">
          ¿Ya tienes cuenta? 
          <a routerLink="/login" class="text-sky-400 font-medium hover:underline">Iniciar sesión</a>
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

  constructor(private authService: AuthService, private router: Router) {}

  onRegister(): void {
    if (!this.nombre || !this.correo || !this.password) {
      this.errorMessage = 'Por favor complete todos los campos';
      return;
    }

    this.loading = true;
    this.authService.register({
      nombre: this.nombre,
      correo: this.correo,
      password: this.password,
      rol: 'Estudiante'
    }).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Registro completado. Redirigiendo a inicio de sesión...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.correo?.[0] || 'Error en el registro';
      }
    });
  }
}
