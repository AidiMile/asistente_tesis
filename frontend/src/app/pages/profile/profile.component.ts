import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from '../../core/services/sidebar.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden transition-colors duration-200">
      <app-sidebar></app-sidebar>

      <main
        [ngClass]="sidebarService.isCollapsed() ? 'md:ml-16' : 'md:ml-64'"
        class="flex-1 flex flex-col items-center justify-start h-screen overflow-y-auto px-6 sm:px-10 pt-16 sm:pt-12 pb-12 bg-[var(--bg-main)] transition-all duration-300 ease-in-out">
        
        <div class="w-full max-w-xl space-y-8">
          
          <!-- Avatar and Basic Info -->
          <div class="flex flex-col items-center text-center">
            <div class="w-24 h-24 rounded-full bg-emerald-100 text-emerald-800 border-2 border-emerald-500/50 dark:bg-sky-900/60 dark:text-sky-300 dark:border-sky-500/50 font-bold flex items-center justify-center text-3xl shadow-xl shadow-emerald-600/10 dark:shadow-sky-500/20 mb-4 transition-colors">
              {{ userInitial }}
            </div>
            <h2 class="text-sm font-semibold text-slate-800 dark:text-slate-200">
              &#64;{{ userTag }} · <span class="text-slate-500 dark:text-slate-400">{{ userEmail }}</span>
            </h2>
            <div class="mt-2 inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-slate-800 dark:text-sky-400 text-xs font-semibold border border-emerald-200 dark:border-slate-700">
              {{ userRole }}
            </div>
          </div>

          <!-- Alert notification -->
          <div *ngIf="message" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
            <i class="bi bi-check-circle-fill"></i>
            <span>{{ message }}</span>
          </div>

          <!-- Section 1: Update Name -->
          <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nombre completo</label>
              <input 
                type="text" 
                [(ngModel)]="nombre" 
                class="input-field text-sm" 
                placeholder="Nombre completo"
              />
            </div>

            <div class="flex justify-end pt-2">
              <button (click)="guardarPerfil()" class="btn-primary py-2.5 px-6 text-xs font-bold">
                Guardar perfil
              </button>
            </div>
          </div>

          <!-- Section 2: Change Password -->
          <div class="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Seguridad de la cuenta</h3>
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Contraseña actual</label>
              <input 
                type="password" 
                [(ngModel)]="oldPassword" 
                class="input-field text-sm" 
                placeholder="••••••••"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Nueva contraseña</label>
              <input 
                type="password" 
                [(ngModel)]="newPassword" 
                class="input-field text-sm" 
                placeholder="••••••••"
              />
            </div>

            <div class="flex justify-end pt-2">
              <button (click)="cambiarPassword()" class="px-6 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors">
                Cambiar contraseña
              </button>
            </div>
          </div>

        </div>

      </main>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  nombre: string = 'Administrador';
  oldPassword: string = '';
  newPassword: string = '';
  message: string = '';

  constructor(
    private authService: AuthService,
    public sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.nombre = user.nombre;
    }
  }

  get userInitial(): string {
    return (this.nombre[0] || 'A').toUpperCase();
  }

  get userTag(): string {
    return this.nombre.toLowerCase().replace(/\s+/g, '');
  }

  get userEmail(): string {
    return this.authService.currentUser()?.correo || 'admin@plnec.ec';
  }

  get userRole(): string {
    return this.authService.currentUser()?.rol || 'Administrador';
  }

  guardarPerfil(): void {
    this.message = 'Perfil actualizado exitosamente.';
    setTimeout(() => this.message = '', 3500);
  }

  cambiarPassword(): void {
    this.oldPassword = '';
    this.newPassword = '';
    this.message = 'Contraseña actualizada correctamente.';
    setTimeout(() => this.message = '', 3500);
  }
}
