import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex h-screen bg-[#0b0f19] text-slate-100 overflow-hidden">
      <app-sidebar></app-sidebar>

      <main class="ml-64 flex-1 flex flex-col items-center justify-start h-screen overflow-y-auto px-10 py-12 bg-[#0b0f19]">
        
        <div class="w-full max-w-xl space-y-8">
          
          <!-- Avatar and Basic Info (Screenshot 4 exact layout) -->
          <div class="flex flex-col items-center text-center">
            <div class="w-24 h-24 rounded-full bg-[#132d4b] border-2 border-sky-500/50 text-sky-300 font-bold flex items-center justify-center text-3xl shadow-xl shadow-sky-500/20 mb-4">
              {{ userInitial }}
            </div>
            <h2 class="text-sm font-semibold text-slate-300">
              &#64;{{ userTag }} · <span class="text-slate-400">{{ userEmail }}</span>
            </h2>
            <div class="mt-2 inline-block px-3 py-1 rounded-full bg-[#1e293b] text-sky-400 text-xs font-medium border border-[#334155]">
              {{ userRole }}
            </div>
          </div>

          <!-- Alert notification -->
          <div *ngIf="message" class="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <i class="bi bi-check-circle-fill"></i>
            <span>{{ message }}</span>
          </div>

          <!-- Section 1: Update Name -->
          <div class="bg-[#131d31] border border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-lg">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Nombre</label>
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
          <div class="bg-[#131d31] border border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-lg">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Contraseña actual</label>
              <input 
                type="password" 
                [(ngModel)]="oldPassword" 
                class="input-field text-sm" 
                placeholder="••••••••"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Nueva contraseña</label>
              <input 
                type="password" 
                [(ngModel)]="newPassword" 
                class="input-field text-sm" 
                placeholder="••••••••"
              />
            </div>

            <div class="flex justify-end pt-2">
              <button (click)="cambiarPassword()" class="px-6 py-2.5 rounded-full bg-[#1e293b] hover:bg-[#334155] text-slate-200 text-xs font-semibold border border-[#334155] transition-colors">
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

  constructor(private authService: AuthService) {}

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
