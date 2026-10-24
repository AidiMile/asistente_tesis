import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="hidden md:flex w-64 bg-[#0f172a] border-r border-[#1e293b] flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none">
      <div>
        <!-- Brand Header -->
        <div class="px-6 py-6 border-b border-[#1e293b]/60 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <i class="bi bi-cpu-fill text-lg"></i>
            </div>
            <div>
              <h1 class="text-lg font-bold tracking-tight text-white leading-tight">PLN-EC</h1>
              <span class="text-[11px] text-sky-400 font-medium tracking-wide">UPEC · 2026</span>
            </div>
          </div>
        </div>

        <!-- Navigation Menu -->
        <nav class="p-3 space-y-1">
          <a routerLink="/chat" routerLinkActive="active-nav" class="nav-item">
            <i class="bi bi-chat-square-text text-base"></i>
            <span>Chat</span>
          </a>

          <a routerLink="/history" routerLinkActive="active-nav" class="nav-item">
            <i class="bi bi-clock-history text-base"></i>
            <span>Historial</span>
          </a>

          <a routerLink="/profile" routerLinkActive="active-nav" class="nav-item">
            <i class="bi bi-person text-base"></i>
            <span>Perfil</span>
          </a>

          <a *ngIf="isAdmin" routerLink="/dashboard" routerLinkActive="active-nav" class="nav-item">
            <i class="bi bi-grid text-base"></i>
            <span>Dashboard</span>
          </a>

          <div *ngIf="isAdmin" class="pt-4 pb-2 px-3">
            <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Investigación & PLN</span>
          </div>

          <a *ngIf="isAdmin" routerLink="/modismos" routerLinkActive="active-nav" class="nav-item">
            <i class="bi bi-translate text-base"></i>
            <span>Modismos</span>
          </a>

          <a *ngIf="isAdmin" routerLink="/metrics" routerLinkActive="active-nav" class="nav-item">
            <i class="bi bi-graph-up-arrow text-base"></i>
            <span>Métricas</span>
          </a>

          <a *ngIf="isAdmin" routerLink="/history-global" routerLinkActive="active-nav" class="nav-item">
            <i class="bi bi-collection text-base"></i>
            <span>Historial global</span>
          </a>
        </nav>
      </div>

      <!-- Footer User & Logout -->
      <div class="p-4 border-t border-[#1e293b]/60 flex items-center justify-between">
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-8 h-8 rounded-full bg-sky-900/60 border border-sky-500/40 text-sky-300 font-bold flex items-center justify-center text-xs">
            {{ userInitial }}
          </div>
          <div class="truncate">
            <p class="text-xs font-semibold text-slate-200 truncate">{{ userName }}</p>
            <p class="text-[11px] text-slate-400 truncate">{{ userRole }}</p>
          </div>
        </div>
        <button (click)="logout()" title="Cerrar sesión" class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
          <i class="bi bi-box-arrow-right text-base"></i>
        </button>
      </div>
    </aside>
    <nav class="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-[#1e293b] bg-[#0f172a]/95 px-2 backdrop-blur md:hidden">
      <a routerLink="/chat" routerLinkActive="text-sky-400" class="mobile-nav"><i class="bi bi-chat-square-text"></i><span>Chat</span></a>
      <a routerLink="/history" routerLinkActive="text-sky-400" class="mobile-nav"><i class="bi bi-clock-history"></i><span>Historial</span></a>
      <a routerLink="/profile" routerLinkActive="text-sky-400" class="mobile-nav"><i class="bi bi-person"></i><span>Perfil</span></a>
      <button (click)="logout()" class="mobile-nav text-red-300"><i class="bi bi-box-arrow-right"></i><span>Salir</span></button>
    </nav>
  `,
  styles: [`
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      color: #94a3b8;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    .nav-item:hover {
      background-color: rgba(255, 255, 255, 0.04);
      color: #f1f5f9;
    }
    .active-nav {
      background-color: rgba(56, 189, 248, 0.12) !important;
      color: #38bdf8 !important;
      font-weight: 600;
    }
    .mobile-nav {
      display: flex;
      min-width: 64px;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      color: #94a3b8;
      font-size: .68rem;
      text-decoration: none;
    }
    .mobile-nav i { font-size: 1.15rem; }
  `]
})
export class SidebarComponent {
  constructor(private authService: AuthService) {}

  get userName(): string {
    return this.authService.currentUser()?.nombre || 'Usuario';
  }

  get userRole(): string {
    return this.authService.currentUser()?.rol || 'Estudiante';
  }

  get userInitial(): string {
    return (this.userName[0] || 'A').toUpperCase();
  }

  get isAdmin(): boolean { return this.authService.isAdmin(); }

  logout(): void {
    this.authService.logout();
  }
}
