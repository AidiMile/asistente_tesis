import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { AssistantService } from '../../core/services/assistant.service';
import { SidebarService } from '../../core/services/sidebar.service';

export interface ConversacionItem {
  id_conversacion: number;
  titulo: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fijada?: boolean;
  total_mensajes?: number;
}

export interface ConversationGroup {
  name: 'Hoy' | 'Ayer' | 'Últimos 7 días' | 'Anteriores';
  conversations: ConversacionItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <!-- Floating Mobile Trigger (visible only on mobile outside chat) -->
    <button
      *ngIf="!isChatPage"
      (click)="toggleMobile()"
      aria-label="Abrir menú de navegación"
      class="md:hidden fixed top-3 left-3 z-30 p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-slate-700 dark:text-slate-200 shadow-md flex items-center justify-center transition-colors">
      <i class="bi bi-list text-xl"></i>
    </button>

    <!-- Mobile Drawer Overlay / Backdrop -->
    <div
      *ngIf="isMobileOpen"
      (click)="closeMobile()"
      class="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity">
    </div>

    <!-- ============================================================== -->
    <!-- PANEL MÓVIL (Slide-out Drawer Navigation)                        -->
    <!-- ============================================================== -->
    <aside
      [class.translate-x-0]="isMobileOpen"
      [class.-translate-x-full]="!isMobileOpen"
      class="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col justify-between shadow-2xl md:hidden transition-transform duration-300 ease-in-out select-none overflow-x-hidden">
      
      <!-- 1. ZONA SUPERIOR: Identidad, Nueva conversación, Buscador -->
      <div class="p-3.5 pb-2.5 border-b border-[var(--border-color)] space-y-3 bg-[var(--bg-sidebar)] shrink-0">
        <!-- Identidad PLN-EC / UPEC & Botón Cerrar -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
              <i class="bi bi-cpu-fill text-lg"></i>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <h1 class="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">PLN-EC</h1>
                <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-300/40 dark:border-amber-400/20">UPEC</span>
              </div>
              <p class="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium tracking-wide truncate">Español Ecuatoriano</p>
            </div>
          </div>
          <button
            (click)="closeMobile()"
            aria-label="Cerrar panel"
            class="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors">
            <i class="bi bi-x-lg text-base"></i>
          </button>
        </div>

        <!-- Botón Nueva conversación -->
        <button
          (click)="newConversation()"
          class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all group">
          <div class="flex items-center gap-2">
            <i class="bi bi-plus-lg text-sm"></i>
            <span>Nueva conversación</span>
          </div>
          <i class="bi bi-chat-left-text text-xs opacity-80 group-hover:opacity-100"></i>
        </button>

        <!-- Buscador de conversaciones -->
        <div class="relative">
          <i class="bi bi-search absolute left-3 top-2.5 text-xs text-slate-400"></i>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar conversaciones..."
            class="w-full bg-slate-100 dark:bg-slate-900/60 border border-[var(--border-color)] text-slate-800 dark:text-slate-200 pl-8 pr-7 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400"
          />
          <button
            *ngIf="searchQuery"
            (click)="clearSearch()"
            aria-label="Limpiar búsqueda"
            class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs">
            <i class="bi bi-x-circle-fill"></i>
          </button>
        </div>
      </div>

      <!-- 2. ZONA CENTRAL: Conversaciones fijadas, Recientes, Menú de 3 puntos, Historial completo -->
      <div class="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <!-- Estado de carga -->
        <div *ngIf="isLoading" class="p-4 text-center text-xs text-slate-400">
          <i class="bi bi-arrow-repeat animate-spin mr-1"></i> Cargando historial...
        </div>

        <!-- Sin resultados de búsqueda -->
        <div *ngIf="!isLoading && searchQuery && filteredConversations.length === 0" class="px-3 py-6 text-center text-xs text-slate-400">
          <i class="bi bi-search text-base block mb-1 opacity-50"></i>
          No se encontraron conversaciones
        </div>

        <!-- Sin conversaciones -->
        <div *ngIf="!isLoading && !searchQuery && conversations.length === 0" class="px-3 py-6 text-center text-xs text-slate-400">
          <i class="bi bi-chat-dots text-base block mb-1 opacity-50"></i>
          Sin conversaciones previas
        </div>

        <!-- SECCIÓN 1: Conversaciones fijadas -->
        <div *ngIf="fijadasConversations.length > 0" class="space-y-1">
          <div class="px-2 pt-1 pb-1 text-[10px] font-bold tracking-wider text-amber-700 dark:text-amber-400 uppercase flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <i class="bi bi-pin-angle-fill text-amber-500 text-xs"></i>
              <span>Conversaciones fijadas</span>
            </div>
            <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300 font-bold">
              {{ fijadasConversations.length }}
            </span>
          </div>

          <div
            *ngFor="let conv of fijadasConversations"
            [class.active-conv]="activeConversationId === conv.id_conversacion"
            class="conversation-item group w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs transition-all text-left">
            <div (click)="selectConversation(conv.id_conversacion)" class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
              <i class="bi bi-pin-angle-fill text-amber-500 text-xs shrink-0" title="Conversación fijada"></i>
              <span class="truncate flex-1 font-medium text-slate-800 dark:text-slate-200" [title]="conv.titulo">
                {{ conv.titulo || 'Nueva conversación' }}
              </span>
            </div>
            <!-- Menú 3 puntos -->
            <div class="relative shrink-0 flex items-center" (click)="$event.stopPropagation()">
              <button
                type="button"
                (click)="toggleMenu($event, conv.id_conversacion)"
                aria-label="Opciones"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors">
                <i class="bi bi-three-dots-vertical text-xs"></i>
              </button>
              <div
                *ngIf="menuOpenId === conv.id_conversacion"
                class="absolute right-0 top-7 w-36 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl z-50 py-1 text-xs">
                <button
                  type="button"
                  (click)="toggleFijar(conv, $event)"
                  class="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-card-hover)] text-slate-700 dark:text-slate-200">
                  <i class="bi bi-pin-angle text-slate-400"></i>
                  <span>Desfijar</span>
                </button>
                <button
                  type="button"
                  (click)="confirmarEliminar(conv, $event)"
                  class="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <i class="bi bi-trash3"></i>
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 2: Conversaciones recientes -->
        <div *ngIf="recientesConversations.length > 0" class="space-y-2">
          <div class="px-2 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
            <i class="bi bi-chat-left-text text-emerald-600 dark:text-emerald-400 text-xs"></i>
            <span>Conversaciones recientes</span>
          </div>

          <div *ngFor="let group of groupedRecientes" class="space-y-0.5">
            <div class="px-2 py-0.5 text-[9px] font-bold tracking-wider text-slate-400/80 dark:text-slate-500/80 uppercase">
              {{ group.name }}
            </div>
            <div
              *ngFor="let conv of group.conversations"
              [class.active-conv]="activeConversationId === conv.id_conversacion"
              class="conversation-item group w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs transition-all text-left">
              <div (click)="selectConversation(conv.id_conversacion)" class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                <i [class]="activeConversationId === conv.id_conversacion ? 'bi bi-chat-square-fill text-emerald-600 dark:text-emerald-400' : 'bi bi-chat-square-text text-slate-400'" class="text-xs shrink-0"></i>
                <span class="truncate flex-1" [title]="conv.titulo">{{ conv.titulo || 'Nueva conversación' }}</span>
              </div>
              <!-- Menú 3 puntos -->
              <div class="relative shrink-0 flex items-center" (click)="$event.stopPropagation()">
                <button
                  type="button"
                  (click)="toggleMenu($event, conv.id_conversacion)"
                  aria-label="Opciones"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors">
                  <i class="bi bi-three-dots-vertical text-xs"></i>
                </button>
                <div
                  *ngIf="menuOpenId === conv.id_conversacion"
                  class="absolute right-0 top-7 w-36 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl z-50 py-1 text-xs">
                  <button
                    type="button"
                    (click)="toggleFijar(conv, $event)"
                    class="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-card-hover)] text-slate-700 dark:text-slate-200">
                    <i class="bi bi-pin-angle-fill text-amber-500"></i>
                    <span>Fijar</span>
                  </button>
                  <button
                    type="button"
                    (click)="confirmarEliminar(conv, $event)"
                    class="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                    <i class="bi bi-trash3"></i>
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Acceso directo al Historial Completo en Zona Central -->
        <div class="pt-3 pb-1 border-t border-[var(--border-color)]">
          <a
            routerLink="/history"
            (click)="closeMobile()"
            routerLinkActive="active-nav"
            class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] transition-all group">
            <div class="flex items-center gap-2.5">
              <div class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                <i class="bi bi-clock-history"></i>
              </div>
              <span>Historial completo</span>
            </div>
            <i class="bi bi-chevron-right text-xs text-slate-400 group-hover:translate-x-0.5 transition-transform"></i>
          </a>
        </div>
      </div>

      <!-- 3. ZONA INFERIOR: Perfil, Modo claro/oscuro, Información usuario y Cierre de sesión -->
      <div class="p-3 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] space-y-2 shrink-0">
        <!-- Acceso al perfil -->
        <a
          routerLink="/profile"
          (click)="closeMobile()"
          routerLinkActive="active-nav"
          class="nav-item flex items-center justify-between text-xs">
          <div class="flex items-center gap-2.5">
            <i class="bi bi-person-circle text-base text-slate-500 dark:text-slate-400"></i>
            <span>Mi perfil</span>
          </div>
          <span class="text-[10px] text-slate-400 dark:text-slate-500">Configuración</span>
        </a>

        <!-- Admin links si es administrador -->
        <ng-container *ngIf="isAdmin">
          <div class="pt-1.5 pb-1 border-t border-[var(--border-color)] space-y-1">
            <div class="px-2 flex items-center justify-between">
              <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Investigación & PLN</span>
              <span class="text-[9px] font-bold text-amber-600 dark:text-amber-400">Admin</span>
            </div>
            <div class="grid grid-cols-2 gap-1">
              <a routerLink="/dashboard" (click)="closeMobile()" routerLinkActive="active-nav" class="px-2 py-1.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-card-hover)] flex items-center gap-1.5 truncate">
                <i class="bi bi-grid text-xs text-emerald-600 dark:text-emerald-400"></i>
                <span class="truncate">Dashboard</span>
              </a>
              <a routerLink="/modismos" (click)="closeMobile()" routerLinkActive="active-nav" class="px-2 py-1.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-card-hover)] flex items-center gap-1.5 truncate">
                <i class="bi bi-translate text-xs text-amber-500"></i>
                <span class="truncate">Modismos</span>
              </a>
              <a routerLink="/metrics" (click)="closeMobile()" routerLinkActive="active-nav" class="px-2 py-1.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-card-hover)] flex items-center gap-1.5 truncate">
                <i class="bi bi-graph-up text-xs text-emerald-600 dark:text-emerald-400"></i>
                <span class="truncate">Métricas</span>
              </a>
              <a routerLink="/history-global" (click)="closeMobile()" routerLinkActive="active-nav" class="px-2 py-1.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-card-hover)] flex items-center gap-1.5 truncate">
                <i class="bi bi-collection text-xs text-teal-600 dark:text-teal-400"></i>
                <span class="truncate">Global</span>
              </a>
            </div>
          </div>
        </ng-container>

        <!-- Selector Modo Claro / Oscuro -->
        <button
          (click)="toggleTheme()"
          [attr.aria-label]="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-[var(--border-color)] transition-all">
          <div class="flex items-center gap-2">
            <i [class]="isDark ? 'bi bi-moon-stars-fill text-amber-400' : 'bi bi-sun-fill text-amber-500'" class="text-sm"></i>
            <span>{{ isDark ? 'Modo Oscuro' : 'Modo Claro' }}</span>
          </div>
          <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {{ isDark ? 'Oscuro' : 'Claro' }}
          </span>
        </button>

        <!-- Información de usuario y cierre de sesión -->
        <div class="pt-1.5 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs border border-emerald-400/40">
              {{ userInitial }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{{ userName }}</p>
              <p class="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium truncate">{{ userRole }}</p>
            </div>
          </div>
          <button
            (click)="logout()"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            class="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0">
            <i class="bi bi-box-arrow-right text-base"></i>
          </button>
        </div>
      </div>
    </aside>

    <!-- ============================================================== -->
    <!-- PANEL ESCRITORIO (Collapsible: w-64 expanded, w-16 collapsed)   -->
    <!-- ============================================================== -->
    <aside
      [ngClass]="isCollapsed ? 'w-16' : 'w-64'"
      class="hidden md:flex bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none shadow-sm transition-[width] duration-300 ease-in-out overflow-x-hidden">
      
      <!-- EXPANDED DESKTOP VIEW (w-64) -->
      <div *ngIf="!isCollapsed" class="flex-1 flex flex-col justify-between h-full overflow-hidden">
        
        <!-- 1. ZONA SUPERIOR: Identidad, Botón Nueva conversación, Buscador -->
        <div class="p-3.5 pb-2.5 border-b border-[var(--border-color)] space-y-3 bg-[var(--bg-sidebar)] shrink-0">
          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
                <i class="bi bi-cpu-fill text-lg"></i>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <h1 class="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">PLN-EC</h1>
                  <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-300/40 dark:border-amber-400/20">UPEC</span>
                </div>
                <p class="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium tracking-wide truncate">Español Ecuatoriano</p>
              </div>
            </div>
            <button
              (click)="toggleCollapse()"
              title="Contraer barra lateral"
              class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-colors">
              <i class="bi bi-layout-sidebar-inset text-base"></i>
            </button>
          </div>

          <!-- Botón Nueva conversación -->
          <button
            (click)="newConversation()"
            class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all group">
            <div class="flex items-center gap-2">
              <i class="bi bi-plus-lg text-sm"></i>
              <span>Nueva conversación</span>
            </div>
            <i class="bi bi-chat-left-text text-xs opacity-80 group-hover:opacity-100"></i>
          </button>

          <!-- Buscador -->
          <div class="relative">
            <i class="bi bi-search absolute left-3 top-2.5 text-xs text-slate-400"></i>
            <input
              #searchInput
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Buscar conversaciones..."
              class="w-full bg-slate-100 dark:bg-slate-900/60 border border-[var(--border-color)] text-slate-800 dark:text-slate-200 pl-8 pr-7 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400"
            />
            <button
              *ngIf="searchQuery"
              (click)="clearSearch()"
              aria-label="Limpiar búsqueda"
              class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs">
              <i class="bi bi-x-circle-fill"></i>
            </button>
          </div>
        </div>

        <!-- 2. ZONA CENTRAL: Conversaciones fijadas, Recientes, Menú 3 puntos, Historial completo -->
        <div class="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          <!-- Loading state -->
          <div *ngIf="isLoading" class="p-4 text-center text-xs text-slate-400">
            <i class="bi bi-arrow-repeat animate-spin mr-1"></i> Cargando historial...
          </div>

          <!-- Empty search results -->
          <div *ngIf="!isLoading && searchQuery && filteredConversations.length === 0" class="px-3 py-6 text-center text-xs text-slate-400">
            <i class="bi bi-search text-base block mb-1 opacity-50"></i>
            No se encontraron conversaciones
          </div>

          <!-- Empty conversations list -->
          <div *ngIf="!isLoading && !searchQuery && conversations.length === 0" class="px-3 py-6 text-center text-xs text-slate-400">
            <i class="bi bi-chat-dots text-base block mb-1 opacity-50"></i>
            Sin conversaciones previas
          </div>

          <!-- SECCIÓN 1: Conversaciones fijadas -->
          <div *ngIf="fijadasConversations.length > 0" class="space-y-1">
            <div class="px-2 pt-1 pb-1 text-[10px] font-bold tracking-wider text-amber-700 dark:text-amber-400 uppercase flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <i class="bi bi-pin-angle-fill text-amber-500 text-xs"></i>
                <span>Conversaciones fijadas</span>
              </div>
              <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300 font-bold">
                {{ fijadasConversations.length }}
              </span>
            </div>

            <div
              *ngFor="let conv of fijadasConversations"
              [class.active-conv]="activeConversationId === conv.id_conversacion"
              class="conversation-item group w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs transition-all text-left">
              <div (click)="selectConversation(conv.id_conversacion)" class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                <i class="bi bi-pin-angle-fill text-amber-500 text-xs shrink-0" title="Conversación fijada"></i>
                <span class="truncate flex-1 font-medium text-slate-800 dark:text-slate-200" [title]="conv.titulo">
                  {{ conv.titulo || 'Nueva conversación' }}
                </span>
              </div>
              <!-- Menú 3 puntos -->
              <div class="relative shrink-0 flex items-center" (click)="$event.stopPropagation()">
                <button
                  type="button"
                  (click)="toggleMenu($event, conv.id_conversacion)"
                  aria-label="Opciones"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors">
                  <i class="bi bi-three-dots-vertical text-xs"></i>
                </button>
                <div
                  *ngIf="menuOpenId === conv.id_conversacion"
                  class="absolute right-0 top-7 w-36 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl z-50 py-1 text-xs">
                  <button
                    type="button"
                    (click)="toggleFijar(conv, $event)"
                    class="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-card-hover)] text-slate-700 dark:text-slate-200">
                    <i class="bi bi-pin-angle text-slate-400"></i>
                    <span>Desfijar</span>
                  </button>
                  <button
                    type="button"
                    (click)="confirmarEliminar(conv, $event)"
                    class="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                    <i class="bi bi-trash3"></i>
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 2: Conversaciones recientes -->
          <div *ngIf="recientesConversations.length > 0" class="space-y-2">
            <div class="px-2 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
              <i class="bi bi-chat-left-text text-emerald-600 dark:text-emerald-400 text-xs"></i>
              <span>Conversaciones recientes</span>
            </div>

            <div *ngFor="let group of groupedRecientes" class="space-y-0.5">
              <div class="px-2 py-0.5 text-[9px] font-bold tracking-wider text-slate-400/80 dark:text-slate-500/80 uppercase">
                {{ group.name }}
              </div>
              <div
                *ngFor="let conv of group.conversations"
                [class.active-conv]="activeConversationId === conv.id_conversacion"
                class="conversation-item group w-full flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs transition-all text-left">
                <div (click)="selectConversation(conv.id_conversacion)" class="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                  <i [class]="activeConversationId === conv.id_conversacion ? 'bi bi-chat-square-fill text-emerald-600 dark:text-emerald-400' : 'bi bi-chat-square-text text-slate-400'" class="text-xs shrink-0"></i>
                  <span class="truncate flex-1" [title]="conv.titulo">{{ conv.titulo || 'Nueva conversación' }}</span>
                </div>
                <!-- Menú 3 puntos -->
                <div class="relative shrink-0 flex items-center" (click)="$event.stopPropagation()">
                  <button
                    type="button"
                    (click)="toggleMenu($event, conv.id_conversacion)"
                    aria-label="Opciones"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors">
                    <i class="bi bi-three-dots-vertical text-xs"></i>
                  </button>
                  <div
                    *ngIf="menuOpenId === conv.id_conversacion"
                    class="absolute right-0 top-7 w-36 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl z-50 py-1 text-xs">
                    <button
                      type="button"
                      (click)="toggleFijar(conv, $event)"
                      class="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[var(--bg-card-hover)] text-slate-700 dark:text-slate-200">
                      <i class="bi bi-pin-angle-fill text-amber-500"></i>
                      <span>Fijar</span>
                    </button>
                    <button
                      type="button"
                      (click)="confirmarEliminar(conv, $event)"
                      class="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                      <i class="bi bi-trash3"></i>
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Acceso directo al Historial Completo en Zona Central -->
          <div class="pt-3 pb-1 border-t border-[var(--border-color)]">
            <a
              routerLink="/history"
              routerLinkActive="active-nav"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] transition-all group">
              <div class="flex items-center gap-2.5">
                <div class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                  <i class="bi bi-clock-history"></i>
                </div>
                <span>Historial completo</span>
              </div>
              <i class="bi bi-chevron-right text-xs text-slate-400 group-hover:translate-x-0.5 transition-transform"></i>
            </a>
          </div>
        </div>

        <!-- 3. ZONA INFERIOR: Perfil, Modo claro/oscuro, Información usuario y Cierre de sesión -->
        <div class="p-3 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] space-y-2 shrink-0">
          <!-- Acceso al perfil -->
          <a
            routerLink="/profile"
            routerLinkActive="active-nav"
            class="nav-item flex items-center justify-between text-xs">
            <div class="flex items-center gap-2.5">
              <i class="bi bi-person-circle text-base text-slate-500 dark:text-slate-400"></i>
              <span>Mi perfil</span>
            </div>
            <span class="text-[10px] text-slate-400 dark:text-slate-500">Configuración</span>
          </a>

          <!-- Admin links si es administrador -->
          <ng-container *ngIf="isAdmin">
            <div class="pt-1.5 pb-1 border-t border-[var(--border-color)] space-y-1">
              <div class="px-2 flex items-center justify-between">
                <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Investigación & PLN</span>
                <span class="text-[9px] font-bold text-amber-600 dark:text-amber-400">Admin</span>
              </div>
              <div class="grid grid-cols-2 gap-1">
                <a routerLink="/dashboard" routerLinkActive="active-nav" class="px-2 py-1.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-card-hover)] flex items-center gap-1.5 truncate">
                  <i class="bi bi-grid text-xs text-emerald-600 dark:text-emerald-400"></i>
                  <span class="truncate">Dashboard</span>
                </a>
                <a routerLink="/modismos" routerLinkActive="active-nav" class="px-2 py-1.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-card-hover)] flex items-center gap-1.5 truncate">
                  <i class="bi bi-translate text-xs text-amber-500"></i>
                  <span class="truncate">Modismos</span>
                </a>
                <a routerLink="/metrics" routerLinkActive="active-nav" class="px-2 py-1.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-card-hover)] flex items-center gap-1.5 truncate">
                  <i class="bi bi-graph-up text-xs text-emerald-600 dark:text-emerald-400"></i>
                  <span class="truncate">Métricas</span>
                </a>
                <a routerLink="/history-global" routerLinkActive="active-nav" class="px-2 py-1.5 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 hover:bg-[var(--bg-card-hover)] flex items-center gap-1.5 truncate">
                  <i class="bi bi-collection text-xs text-teal-600 dark:text-teal-400"></i>
                  <span class="truncate">Global</span>
                </a>
              </div>
            </div>
          </ng-container>

          <!-- Control de Modo Claro/Oscuro -->
          <button
            (click)="toggleTheme()"
            [attr.aria-label]="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-[var(--border-color)] transition-all">
            <div class="flex items-center gap-2">
              <i [class]="isDark ? 'bi bi-moon-stars-fill text-amber-400' : 'bi bi-sun-fill text-amber-500'" class="text-sm"></i>
              <span>{{ isDark ? 'Modo Oscuro' : 'Modo Claro' }}</span>
            </div>
            <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {{ isDark ? 'Oscuro' : 'Claro' }}
            </span>
          </button>

          <!-- Información de usuario y cierre de sesión -->
          <div class="pt-1.5 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs border border-emerald-400/40">
                {{ userInitial }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{{ userName }}</p>
                <p class="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium truncate">{{ userRole }}</p>
              </div>
            </div>
            <button
              (click)="logout()"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              class="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0">
              <i class="bi bi-box-arrow-right text-base"></i>
            </button>
          </div>
        </div>

      </div>

      <!-- COLLAPSED DESKTOP VIEW (w-16) -->
      <div *ngIf="isCollapsed" class="flex-1 flex flex-col items-center py-4 space-y-4 overflow-y-auto">
        <!-- Logo & Expand Button -->
        <div class="flex flex-col items-center gap-2">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <i class="bi bi-cpu-fill text-lg"></i>
          </div>
          <button
            (click)="toggleCollapse()"
            title="Expandir barra lateral"
            class="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors">
            <i class="bi bi-layout-sidebar-inset-reverse text-base"></i>
          </button>
        </div>

        <div class="w-8 border-b border-[var(--border-color)]"></div>

        <!-- Quick Action: New Chat (icon only) -->
        <button
          (click)="newConversation()"
          title="Nueva conversación"
          class="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xs transition-all">
          <i class="bi bi-plus-lg text-lg"></i>
        </button>

        <!-- Quick Action: Search (expands & focuses) -->
        <button
          (click)="expandAndFocusSearch()"
          title="Buscar conversaciones"
          class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors">
          <i class="bi bi-search text-sm"></i>
        </button>

        <div class="w-8 border-b border-[var(--border-color)]"></div>

        <!-- Navigation Icons -->
        <div class="flex flex-col items-center space-y-1">
          <a routerLink="/chat" routerLinkActive="active-collapsed" title="Chat" class="icon-nav">
            <i class="bi bi-chat-square-text text-lg"></i>
          </a>

          <a routerLink="/history" routerLinkActive="active-collapsed" title="Historial" class="icon-nav">
            <i class="bi bi-clock-history text-lg"></i>
          </a>

          <a routerLink="/profile" routerLinkActive="active-collapsed" title="Perfil" class="icon-nav">
            <i class="bi bi-person text-lg"></i>
          </a>

          <ng-container *ngIf="isAdmin">
            <div class="w-6 border-b border-[var(--border-color)] my-1"></div>

            <a routerLink="/dashboard" routerLinkActive="active-collapsed" title="Dashboard" class="icon-nav">
              <i class="bi bi-grid text-lg"></i>
            </a>

            <a routerLink="/modismos" routerLinkActive="active-collapsed" title="Modismos" class="icon-nav">
              <i class="bi bi-translate text-lg"></i>
            </a>

            <a routerLink="/metrics" routerLinkActive="active-collapsed" title="Métricas" class="icon-nav">
              <i class="bi bi-graph-up text-lg"></i>
            </a>

            <a routerLink="/history-global" routerLinkActive="active-collapsed" title="Historial global" class="icon-nav">
              <i class="bi bi-collection text-lg"></i>
            </a>
          </ng-container>
        </div>
      </div>

      <!-- Collapsed Footer (icon rail) -->
      <div *ngIf="isCollapsed" class="p-2 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col items-center space-y-2 shrink-0">
        <button
          (click)="toggleTheme()"
          [title]="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          class="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
          <i [class]="isDark ? 'bi bi-moon-stars-fill text-amber-400' : 'bi bi-sun-fill text-amber-500'" class="text-sm"></i>
        </button>

        <div
          [title]="userName + ' (' + userRole + ')'"
          class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white font-bold flex items-center justify-center text-xs shrink-0 cursor-default shadow-xs border border-emerald-400/40">
          {{ userInitial }}
        </div>

        <button
          (click)="logout()"
          title="Cerrar sesión"
          class="w-10 h-10 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center justify-center transition-colors">
          <i class="bi bi-box-arrow-right text-base"></i>
        </button>
      </div>

    </aside>

    <!-- Modal de confirmación de eliminación -->
    <div
      *ngIf="convAEliminar"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      (click)="cancelarEliminar()">
      <div
        class="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-5 shadow-2xl space-y-4"
        (click)="$event.stopPropagation()">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg shrink-0">
            <i class="bi bi-exclamation-triangle-fill"></i>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">¿Eliminar conversación?</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Esta acción es permanente y no se puede deshacer.</p>
          </div>
        </div>
        <p class="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-[var(--border-color)] truncate font-mono">
          "{{ convAEliminar.titulo }}"
        </p>
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            (click)="cancelarEliminar()"
            [disabled]="isDeleting"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            (click)="ejecutarEliminar()"
            [disabled]="isDeleting"
            class="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50">
            <i *ngIf="isDeleting" class="bi bi-arrow-repeat animate-spin"></i>
            <span>{{ isDeleting ? 'Eliminando...' : 'Eliminar definitivamente' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      color: var(--text-muted);
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 500;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .nav-item:hover {
      background-color: var(--bg-card-hover);
      color: var(--text-main);
    }
    .active-nav {
      background-color: rgba(5, 150, 105, 0.12) !important;
      color: #059669 !important;
      font-weight: 600;
      border-left: 3px solid #059669;
    }
    :host-context(.dark) .active-nav,
    .dark .active-nav {
      background-color: rgba(16, 185, 129, 0.16) !important;
      color: #10b981 !important;
      border-left: 3px solid #10b981;
    }
    .icon-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      color: var(--text-muted);
      border-radius: 10px;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .icon-nav:hover {
      background-color: var(--bg-card-hover);
      color: var(--text-main);
    }
    .active-collapsed {
      background-color: rgba(5, 150, 105, 0.14) !important;
      color: #059669 !important;
    }
    :host-context(.dark) .active-collapsed,
    .dark .active-collapsed {
      background-color: rgba(16, 185, 129, 0.18) !important;
      color: #10b981 !important;
    }
    .conversation-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      color: var(--text-muted);
      border-radius: 9px;
      font-size: 0.82rem;
      transition: all 0.15s ease;
      border-left: 3px solid transparent;
      cursor: pointer;
      background: transparent;
      border-top: none;
      border-right: none;
      border-bottom: none;
    }
    .conversation-item:hover {
      background-color: var(--bg-card-hover);
      color: var(--text-main);
    }
    .active-conv {
      background-color: rgba(5, 150, 105, 0.12) !important;
      color: #059669 !important;
      font-weight: 600;
      border-left: 3px solid #059669 !important;
    }
    :host-context(.dark) .active-conv,
    .dark .active-conv {
      background-color: rgba(16, 185, 129, 0.16) !important;
      color: #10b981 !important;
      border-left: 3px solid #10b981 !important;
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  conversations: ConversacionItem[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;
  activeConversationId: number | null = null;
  isChatPage: boolean = false;

  menuOpenId: number | null = null;
  convAEliminar: ConversacionItem | null = null;
  isDeleting: boolean = false;

  private subs = new Subscription();

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private assistantService: AssistantService,
    public sidebarService: SidebarService,
    private router: Router
  ) {}

  @HostListener('document:click')
  onDocumentClick(): void {
    this.menuOpenId = null;
  }

  get isDark(): boolean {
    return this.themeService.isDark();
  }

  get isCollapsed(): boolean {
    return this.sidebarService.isCollapsed();
  }

  get isMobileOpen(): boolean {
    return this.sidebarService.isMobileOpen();
  }

  get userName(): string {
    return this.authService.currentUser()?.nombre || 'Usuario';
  }

  get userRole(): string {
    return this.authService.currentUser()?.rol || 'Estudiante';
  }

  get userInitial(): string {
    return (this.userName[0] || 'A').toUpperCase();
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.checkActiveUrl(this.router.url);

    this.subs.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        this.checkActiveUrl(url);
        this.sidebarService.closeMobile();
      })
    );

    this.subs.add(
      this.sidebarService.refreshConversations$.subscribe(() => {
        this.cargarConversaciones();
      })
    );

    this.cargarConversaciones();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private checkActiveUrl(url: string): void {
    this.isChatPage = url.startsWith('/chat');
    const match = url.match(/\/chat\/(\d+)/);
    this.activeConversationId = match ? Number(match[1]) : null;
  }

  cargarConversaciones(): void {
    this.isLoading = true;
    this.assistantService.getConversaciones().subscribe({
      next: (data) => {
        this.isLoading = false;
        this.conversations = (data || []).map((item: any) => ({
          id_conversacion: item.id_conversacion,
          titulo: item.titulo || 'Nueva conversación',
          fecha_creacion: item.fecha_creacion,
          fecha_actualizacion: item.fecha_actualizacion,
          fijada: Boolean(item.fijada),
          total_mensajes: item.total_mensajes
        })).sort((a: ConversacionItem, b: ConversacionItem) => {
          if (a.fijada && !b.fijada) return -1;
          if (!a.fijada && b.fijada) return 1;
          const timeA = new Date(a.fecha_actualizacion || a.fecha_creacion).getTime();
          const timeB = new Date(b.fecha_actualizacion || b.fecha_creacion).getTime();
          return timeB - timeA;
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.warn('Error al cargar conversaciones en la barra lateral:', err);
      }
    });
  }

  get filteredConversations(): ConversacionItem[] {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      return this.conversations;
    }
    const query = this.searchQuery.toLowerCase().trim();
    return this.conversations.filter(c =>
      (c.titulo || '').toLowerCase().includes(query)
    );
  }

  get fijadasConversations(): ConversacionItem[] {
    return this.filteredConversations.filter(c => Boolean(c.fijada));
  }

  get recientesConversations(): ConversacionItem[] {
    return this.filteredConversations.filter(c => !c.fijada);
  }

  get groupedRecientes(): ConversationGroup[] {
    return this.groupConversations(this.recientesConversations);
  }

  groupConversations(items: ConversacionItem[]): ConversationGroup[] {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOf7DaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

    const hoy: ConversacionItem[] = [];
    const ayer: ConversacionItem[] = [];
    const ultimos7: ConversacionItem[] = [];
    const anteriores: ConversacionItem[] = [];

    for (const item of items) {
      const dateVal = new Date(item.fecha_actualizacion || item.fecha_creacion).getTime();
      if (dateVal >= startOfToday) {
        hoy.push(item);
      } else if (dateVal >= startOfYesterday) {
        ayer.push(item);
      } else if (dateVal >= startOf7DaysAgo) {
        ultimos7.push(item);
      } else {
        anteriores.push(item);
      }
    }

    const groups: ConversationGroup[] = [];
    if (hoy.length > 0) groups.push({ name: 'Hoy', conversations: hoy });
    if (ayer.length > 0) groups.push({ name: 'Ayer', conversations: ayer });
    if (ultimos7.length > 0) groups.push({ name: 'Últimos 7 días', conversations: ultimos7 });
    if (anteriores.length > 0) groups.push({ name: 'Anteriores', conversations: anteriores });

    return groups;
  }

  selectConversation(id: number): void {
    this.sidebarService.closeMobile();
    this.router.navigate(['/chat', id]);
  }

  newConversation(): void {
    this.sidebarService.triggerNewConversation();
    this.sidebarService.closeMobile();
    this.router.navigate(['/chat']);
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  expandAndFocusSearch(): void {
    this.sidebarService.setCollapsed(false);
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 150);
  }

  toggleCollapse(): void {
    this.sidebarService.toggleCollapse();
  }

  toggleMobile(): void {
    this.sidebarService.toggleMobile();
  }

  closeMobile(): void {
    this.sidebarService.closeMobile();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.sidebarService.closeMobile();
    this.authService.logout();
  }

  toggleMenu(event: Event, id: number): void {
    event.stopPropagation();
    this.menuOpenId = this.menuOpenId === id ? null : id;
  }

  toggleFijar(conv: ConversacionItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.menuOpenId = null;
    const nuevoEstado = !conv.fijada;
    this.assistantService.toggleFijarConversacion(conv.id_conversacion, nuevoEstado).subscribe({
      next: (res) => {
        conv.fijada = res.fijada;
        this.cargarConversaciones();
      },
      error: (err) => {
        console.error('Error al cambiar fijado de conversación:', err);
      }
    });
  }

  confirmarEliminar(conv: ConversacionItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.menuOpenId = null;
    this.convAEliminar = conv;
  }

  cancelarEliminar(): void {
    this.convAEliminar = null;
    this.isDeleting = false;
  }

  ejecutarEliminar(): void {
    if (!this.convAEliminar) return;
    const id = this.convAEliminar.id_conversacion;
    this.isDeleting = true;
    this.assistantService.eliminarConversacion(id).subscribe({
      next: () => {
        this.isDeleting = false;
        const eraActiva = this.activeConversationId === id;
        this.convAEliminar = null;
        this.cargarConversaciones();
        if (eraActiva) {
          this.router.navigate(['/chat']);
        }
      },
      error: (err) => {
        this.isDeleting = false;
        console.error('Error al eliminar conversación:', err);
        alert('No se pudo eliminar la conversación. Intente nuevamente.');
      }
    });
  }
}
