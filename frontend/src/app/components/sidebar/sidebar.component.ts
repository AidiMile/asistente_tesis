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
    <!-- Botón flotante móvil (visible solo en pantallas pequeñas) -->
    <button
      *ngIf="!isChatPage"
      (click)="toggleMobile()"
      aria-label="Abrir menú de navegación"
      class="md:hidden fixed top-3 left-3 z-30 p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-slate-700 dark:text-slate-200 shadow-md flex items-center justify-center transition-colors">
      <i class="bi bi-list text-xl"></i>
    </button>

    <!-- Overlay móvil -->
    <div
      *ngIf="isMobileOpen"
      (click)="closeMobile()"
      class="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity">
    </div>

    <!-- ======================================================== -->
    <!-- DRAWER MÓVIL (Slide-out)                                -->
    <!-- ======================================================== -->
    <aside
      [class.translate-x-0]="isMobileOpen"
      [class.-translate-x-full]="!isMobileOpen"
      class="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col justify-between shadow-2xl md:hidden transition-transform duration-300 ease-in-out select-none">
      
      <!-- CUERPO PRINCIPAL DEL DRAWER MÓVIL -->
      <div class="flex-1 flex flex-col overflow-hidden">
        
        <!-- 1. Cabecera fija: Logo PLN-EC -->
        <div class="px-4 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-sky-500 dark:from-sky-500 dark:to-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <i class="bi bi-cpu-fill text-base"></i>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">PLN-EC</span>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 dark:bg-sky-400/10 dark:text-sky-300 border border-emerald-300/40 dark:border-sky-400/20">UPEC</span>
              </div>
              <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">Asistente Inteligente</p>
            </div>
          </div>
          <button
            (click)="closeMobile()"
            aria-label="Cerrar menú"
            class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-colors">
            <i class="bi bi-x-lg text-base"></i>
          </button>
        </div>

        <!-- 2. Botón Nueva Conversación y Buscador -->
        <div class="p-3 pb-2 space-y-2">
          <button
            (click)="newConversation()"
            class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xs font-semibold shadow-sm transition-all group">
            <div class="flex items-center gap-2">
              <i class="bi bi-plus-lg text-sm"></i>
              <span>Nueva conversación</span>
            </div>
            <i class="bi bi-chat-left-text text-xs opacity-75 group-hover:opacity-100"></i>
          </button>

          <div class="relative">
            <i class="bi bi-search absolute left-3 top-2.5 text-xs text-slate-400"></i>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Buscar conversaciones..."
              class="w-full bg-slate-100 dark:bg-slate-900/60 border border-[var(--border-color)] text-slate-800 dark:text-slate-200 pl-8 pr-7 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-sky-400 transition-all placeholder:text-slate-400"
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

        <!-- 3. Lista de Chats Recientes (Scrollable) -->
        <div class="flex-1 overflow-y-auto px-3 py-1 space-y-3 custom-scrollbar">
          <div *ngIf="isLoading" class="p-4 text-center text-xs text-slate-400">
            <i class="bi bi-arrow-repeat animate-spin mr-1"></i> Cargando historial...
          </div>

          <div *ngIf="!isLoading && searchQuery && filteredConversations.length === 0" class="px-3 py-6 text-center text-xs text-slate-400">
            <i class="bi bi-search text-base block mb-1 opacity-50"></i>
            No se encontraron conversaciones
          </div>

          <div *ngIf="!isLoading && !searchQuery && conversations.length === 0" class="px-3 py-6 text-center text-xs text-slate-400">
            <i class="bi bi-chat-dots text-base block mb-1 opacity-50"></i>
            Sin conversaciones previas
          </div>

          <div *ngFor="let group of groupedConversations" class="space-y-0.5">
            <div class="px-2 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              {{ group.name }}
            </div>
            <button
              *ngFor="let conv of group.conversations"
              (click)="selectConversation(conv.id_conversacion)"
              [class.active-conv]="activeConversationId === conv.id_conversacion"
              [title]="conv.titulo"
              class="conversation-item w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all text-left">
              <i [class]="activeConversationId === conv.id_conversacion ? 'bi bi-chat-square-fill text-emerald-600 dark:text-sky-400' : 'bi bi-chat-square-text text-slate-400'" class="text-xs shrink-0"></i>
              <span class="truncate flex-1">{{ conv.titulo || 'Nueva conversación' }}</span>
            </button>
          </div>
        </div>

        <!-- 4. Sección de Gestión (SOLO visible si es Administrador) -->
        <div *ngIf="isAdmin" class="p-3 pt-2 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]">
          <div class="px-2 pb-1.5 flex items-center justify-between">
            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Investigación & PLN</span>
            <span class="text-[9px] font-semibold text-emerald-600 dark:text-sky-400 bg-emerald-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-sky-800">Admin</span>
          </div>
          <div class="space-y-1">
            <a routerLink="/dashboard" (click)="closeMobile()" routerLinkActive="active-nav" class="nav-item">
              <i class="bi bi-grid text-sm"></i>
              <span>Dashboard</span>
            </a>
            <a routerLink="/modismos" (click)="closeMobile()" routerLinkActive="active-nav" class="nav-item">
              <i class="bi bi-translate text-sm"></i>
              <span>Modismos</span>
            </a>
            <a routerLink="/metrics" (click)="closeMobile()" routerLinkActive="active-nav" class="nav-item">
              <i class="bi bi-graph-up-arrow text-sm"></i>
              <span>Métricas</span>
            </a>
          </div>
        </div>
      </div>

      <!-- FOOTER MÓVIL FIJO (Perfil con Popover hacia arriba) -->
      <div class="relative p-2.5 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]">
        <!-- POPOVER FLOTANTE (Hacia arriba) -->
        <div
          *ngIf="isProfileMenuOpen"
          class="popover-menu absolute bottom-[calc(100%+8px)] left-2 right-2 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 space-y-1 backdrop-blur-md">
          
          <!-- Info del Usuario en el Popover -->
          <div class="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
              {{ userInitial }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{{ userName }}</p>
              <p class="text-[10px] text-slate-400 truncate">{{ userEmail }}</p>
            </div>
          </div>

          <!-- Opciones del Menú -->
          <div class="py-1 space-y-0.5">
            <a routerLink="/profile" (click)="closeAll()" routerLinkActive="active-popover" class="popover-item">
              <i class="bi bi-person text-sm text-slate-500 dark:text-slate-400"></i>
              <span class="flex-1">Perfil</span>
            </a>

            <a routerLink="/history" (click)="closeAll()" routerLinkActive="active-popover" class="popover-item">
              <i class="bi bi-clock-history text-sm text-slate-500 dark:text-slate-400"></i>
              <span class="flex-1">Historial completo</span>
            </a>

            <a *ngIf="isAdmin" routerLink="/history-global" (click)="closeAll()" routerLinkActive="active-popover" class="popover-item">
              <i class="bi bi-collection text-sm text-slate-500 dark:text-slate-400"></i>
              <span class="flex-1">Historial global</span>
            </a>
          </div>

          <!-- Toggle Modo Oscuro -->
          <div class="pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div
              (click)="toggleTheme()"
              class="popover-item justify-between cursor-pointer">
              <div class="flex items-center gap-2.5">
                <i [class]="isDark ? 'bi bi-moon-stars-fill text-amber-400' : 'bi bi-sun-fill text-amber-500'" class="text-sm"></i>
                <span class="text-xs font-medium text-slate-700 dark:text-slate-200">Modo Oscuro</span>
              </div>
              
              <!-- Switch interactivo tipo iOS/DeepSeek -->
              <div
                class="w-9 h-5 rounded-full transition-colors duration-200 ease-in-out relative flex items-center px-0.5"
                [ngClass]="isDark ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'">
                <div
                  class="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out"
                  [ngClass]="isDark ? 'translate-x-4' : 'translate-x-0'">
                </div>
              </div>
            </div>
          </div>

          <!-- Cerrar Sesión -->
          <div class="pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <button
              (click)="logout()"
              class="w-full popover-item text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">
              <i class="bi bi-box-arrow-right text-sm"></i>
              <span class="font-medium">Cerrar sesión</span>
            </button>
          </div>
        </div>

        <!-- Barra de Perfil Trigger en Footer -->
        <div
          (click)="toggleProfileMenu($event)"
          class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors border border-transparent hover:border-[var(--border-color)]">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
              {{ userInitial }}
            </div>
            <div class="truncate">
              <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{{ userName }}</p>
              <p class="text-[10px] text-slate-400 truncate leading-tight">{{ userRole }}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Opciones de usuario"
            class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg shrink-0">
            <i class="bi bi-three-dots text-lg"></i>
          </button>
        </div>
      </div>
    </aside>

    <!-- ======================================================== -->
    <!-- SIDEBAR DE ESCRITORIO (Estilo DeepSeek)                  -->
    <!-- ======================================================== -->
    <aside
      [ngClass]="isCollapsed ? 'w-16' : 'w-64'"
      class="hidden md:flex bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none shadow-sm transition-[width] duration-300 ease-in-out">
      
      <!-- ==================== VISTA EXPANDIDA (w-64) ==================== -->
      <div *ngIf="!isCollapsed" class="flex-1 flex flex-col overflow-hidden">
        
        <!-- 1. Cabecera Fija: Logo PLN-EC y botón contraer -->
        <div class="px-4 py-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-sky-500 dark:from-sky-500 dark:to-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <i class="bi bi-cpu-fill text-base"></i>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">PLN-EC</span>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 dark:bg-sky-400/10 dark:text-sky-300 border border-emerald-300/40 dark:border-sky-400/20">UPEC</span>
              </div>
              <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">Asistente Inteligente</p>
            </div>
          </div>
          <button
            (click)="toggleCollapse()"
            title="Contraer barra lateral"
            class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-colors">
            <i class="bi bi-layout-sidebar-inset text-base"></i>
          </button>
        </div>

        <!-- 2. Botón Nueva Conversación y Buscador -->
        <div class="p-3 pb-2 space-y-2">
          <button
            (click)="newConversation()"
            class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xs font-semibold shadow-sm transition-all group">
            <div class="flex items-center gap-2">
              <i class="bi bi-plus-lg text-sm"></i>
              <span>Nueva conversación</span>
            </div>
            <i class="bi bi-chat-left-text text-xs opacity-75 group-hover:opacity-100"></i>
          </button>

          <div class="relative">
            <i class="bi bi-search absolute left-3 top-2.5 text-xs text-slate-400"></i>
            <input
              #searchInput
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Buscar conversaciones..."
              class="w-full bg-slate-100 dark:bg-slate-900/60 border border-[var(--border-color)] text-slate-800 dark:text-slate-200 pl-8 pr-7 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-sky-400 transition-all placeholder:text-slate-400"
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

        <!-- 3. Cuerpo: Lista de Chats Recientes (Scrollable) -->
        <div class="flex-1 overflow-y-auto px-3 py-1 space-y-3 custom-scrollbar">
          <div *ngIf="isLoading" class="p-4 text-center text-xs text-slate-400">
            <i class="bi bi-arrow-repeat animate-spin mr-1"></i> Cargando historial...
          </div>

          <div *ngIf="!isLoading && searchQuery && filteredConversations.length === 0" class="px-3 py-6 text-center text-xs text-slate-400">
            <i class="bi bi-search text-base block mb-1 opacity-50"></i>
            No se encontraron conversaciones
          </div>

          <div *ngIf="!isLoading && !searchQuery && conversations.length === 0" class="px-3 py-6 text-center text-xs text-slate-400">
            <i class="bi bi-chat-dots text-base block mb-1 opacity-50"></i>
            Sin conversaciones previas
          </div>

          <div *ngFor="let group of groupedConversations" class="space-y-0.5">
            <div class="px-2 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              {{ group.name }}
            </div>
            <button
              *ngFor="let conv of group.conversations"
              (click)="selectConversation(conv.id_conversacion)"
              [class.active-conv]="activeConversationId === conv.id_conversacion"
              [title]="conv.titulo"
              class="conversation-item w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all text-left">
              <i [class]="activeConversationId === conv.id_conversacion ? 'bi bi-chat-square-fill text-emerald-600 dark:text-sky-400' : 'bi bi-chat-square-text text-slate-400'" class="text-xs shrink-0"></i>
              <span class="truncate flex-1">{{ conv.titulo || 'Nueva conversación' }}</span>
            </button>
          </div>
        </div>

        <!-- 4. Sección Condicional por Rol: INVESTIGACIÓN & PLN (Solo Administrador) -->
        <div *ngIf="isAdmin" class="p-3 pt-2 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]">
          <div class="px-2 pb-1.5 flex items-center justify-between">
            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Investigación & PLN</span>
            <span class="text-[9px] font-semibold text-emerald-600 dark:text-sky-400 bg-emerald-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-sky-800">Admin</span>
          </div>
          <div class="space-y-1">
            <a routerLink="/dashboard" routerLinkActive="active-nav" class="nav-item">
              <i class="bi bi-grid text-sm"></i>
              <span>Dashboard</span>
            </a>
            <a routerLink="/modismos" routerLinkActive="active-nav" class="nav-item">
              <i class="bi bi-translate text-sm"></i>
              <span>Modismos</span>
            </a>
            <a routerLink="/metrics" routerLinkActive="active-nav" class="nav-item">
              <i class="bi bi-graph-up-arrow text-sm"></i>
              <span>Métricas</span>
            </a>
          </div>
        </div>
      </div>

      <!-- ==================== VISTA COLAPSADA (w-16) ==================== -->
      <div *ngIf="isCollapsed" class="flex-1 flex flex-col items-center py-3.5 space-y-3 overflow-y-auto custom-scrollbar">
        <!-- Logo y botón expandir -->
        <div class="flex flex-col items-center gap-2">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-sky-500 dark:from-sky-500 dark:to-blue-600 flex items-center justify-center text-white shadow-sm">
            <i class="bi bi-cpu-fill text-base"></i>
          </div>
          <button
            (click)="toggleCollapse()"
            title="Expandir barra lateral"
            class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-colors">
            <i class="bi bi-layout-sidebar-inset-reverse text-base"></i>
          </button>
        </div>

        <div class="w-8 border-b border-[var(--border-color)]"></div>

        <!-- Nueva Conversación (Icono) -->
        <button
          (click)="newConversation()"
          title="Nueva conversación"
          class="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 flex items-center justify-center shadow-sm transition-all">
          <i class="bi bi-plus-lg text-lg"></i>
        </button>

        <!-- Buscador (Icono) -->
        <button
          (click)="expandAndFocusSearch()"
          title="Buscar conversaciones"
          class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors">
          <i class="bi bi-search text-sm"></i>
        </button>

        <!-- Accesos de Administrador Colapsados -->
        <ng-container *ngIf="isAdmin">
          <div class="w-8 border-b border-[var(--border-color)] my-1"></div>
          <a routerLink="/dashboard" routerLinkActive="active-collapsed" title="Dashboard" class="icon-nav">
            <i class="bi bi-grid text-base"></i>
          </a>
          <a routerLink="/modismos" routerLinkActive="active-collapsed" title="Modismos" class="icon-nav">
            <i class="bi bi-translate text-base"></i>
          </a>
          <a routerLink="/metrics" routerLinkActive="active-collapsed" title="Métricas" class="icon-nav">
            <i class="bi bi-graph-up-arrow text-base"></i>
          </a>
        </ng-container>
      </div>

      <!-- ======================================================== -->
      <!-- FOOTER DE ESCRITORIO (Perfil fijo con Popover hacia arriba) -->
      <!-- ======================================================== -->
      
      <!-- Footer Expandido -->
      <div *ngIf="!isCollapsed" class="relative p-2.5 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]">
        
        <!-- POPOVER FLOTANTE HACIA ARRIBA (Estilo DeepSeek) -->
        <div
          *ngIf="isProfileMenuOpen"
          class="popover-menu absolute bottom-[calc(100%+8px)] left-2 right-2 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 space-y-1 backdrop-blur-md">
          
          <!-- Encabezado del Popover con datos del usuario -->
          <div class="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
              {{ userInitial }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{{ userName }}</p>
              <p class="text-[10px] text-slate-400 truncate">{{ userEmail }}</p>
            </div>
          </div>

          <!-- Opciones Reubicadas: Perfil, Historial Completo, Historial Global -->
          <div class="py-1 space-y-0.5">
            <a routerLink="/profile" (click)="closeProfileMenu()" routerLinkActive="active-popover" class="popover-item">
              <i class="bi bi-person text-sm text-slate-500 dark:text-slate-400"></i>
              <span class="flex-1">Perfil</span>
            </a>

            <a routerLink="/history" (click)="closeProfileMenu()" routerLinkActive="active-popover" class="popover-item">
              <i class="bi bi-clock-history text-sm text-slate-500 dark:text-slate-400"></i>
              <span class="flex-1">Historial completo</span>
            </a>

            <a *ngIf="isAdmin" routerLink="/history-global" (click)="closeProfileMenu()" routerLinkActive="active-popover" class="popover-item">
              <i class="bi bi-collection text-sm text-slate-500 dark:text-slate-400"></i>
              <span class="flex-1">Historial global</span>
            </a>
          </div>

          <!-- Modo Oscuro con Switch/Toggle interactivo -->
          <div class="pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div
              (click)="toggleTheme()"
              class="popover-item justify-between cursor-pointer">
              <div class="flex items-center gap-2.5">
                <i [class]="isDark ? 'bi bi-moon-stars-fill text-amber-400' : 'bi bi-sun-fill text-amber-500'" class="text-sm"></i>
                <span class="text-xs font-medium text-slate-700 dark:text-slate-200">Modo Oscuro</span>
              </div>
              
              <!-- Switch interactivo tipo iOS/DeepSeek -->
              <div
                class="w-9 h-5 rounded-full transition-colors duration-200 ease-in-out relative flex items-center px-0.5"
                [ngClass]="isDark ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'">
                <div
                  class="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out"
                  [ngClass]="isDark ? 'translate-x-4' : 'translate-x-0'">
                </div>
              </div>
            </div>
          </div>

          <!-- Cerrar Sesión (Logout) -->
          <div class="pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <button
              (click)="logout()"
              class="w-full popover-item text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">
              <i class="bi bi-box-arrow-right text-sm"></i>
              <span class="font-medium">Cerrar sesión</span>
            </button>
          </div>
        </div>

        <!-- Botón Trigger Fijo: Perfil + Tres Puntitos (...) -->
        <div
          (click)="toggleProfileMenu($event)"
          class="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors border border-transparent hover:border-[var(--border-color)]">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
              {{ userInitial }}
            </div>
            <div class="truncate">
              <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{{ userName }}</p>
              <p class="text-[10px] text-slate-400 truncate leading-tight">{{ userRole }}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Opciones de usuario"
            class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg shrink-0">
            <i class="bi bi-three-dots text-lg"></i>
          </button>
        </div>
      </div>

      <!-- Footer Colapsado (Rail de Iconos) -->
      <div *ngIf="isCollapsed" class="relative p-2 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex flex-col items-center">
        <!-- Popover en modo colapsado -->
        <div
          *ngIf="isProfileMenuOpen"
          class="popover-menu absolute bottom-[calc(100%+8px)] left-2 w-56 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 space-y-1 backdrop-blur-md">
          
          <div class="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
            <p class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{{ userName }}</p>
            <p class="text-[10px] text-slate-400 truncate">{{ userRole }}</p>
          </div>

          <div class="py-1 space-y-0.5">
            <a routerLink="/profile" (click)="closeProfileMenu()" class="popover-item">
              <i class="bi bi-person text-sm"></i>
              <span>Perfil</span>
            </a>
            <a routerLink="/history" (click)="closeProfileMenu()" class="popover-item">
              <i class="bi bi-clock-history text-sm"></i>
              <span>Historial completo</span>
            </a>
            <a *ngIf="isAdmin" routerLink="/history-global" (click)="closeProfileMenu()" class="popover-item">
              <i class="bi bi-collection text-sm"></i>
              <span>Historial global</span>
            </a>
          </div>

          <div class="pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div (click)="toggleTheme()" class="popover-item justify-between cursor-pointer">
              <span class="text-xs text-slate-700 dark:text-slate-200">Modo Oscuro</span>
              <div
                class="w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5"
                [ngClass]="isDark ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'">
                <div class="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform"
                     [ngClass]="isDark ? 'translate-x-4' : 'translate-x-0'"></div>
              </div>
            </div>
          </div>

          <div class="pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <button (click)="logout()" class="w-full popover-item text-red-600 dark:text-red-400">
              <i class="bi bi-box-arrow-right text-sm"></i>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>

        <button
          (click)="toggleProfileMenu($event)"
          [title]="userName + ' (' + userRole + ')'"
          class="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-center transition-colors">
          <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {{ userInitial }}
          </div>
        </button>
      </div>

    </aside>
  `,
  styles: [`
    /* Scrollbar minimalista */
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.3);
      border-radius: 9999px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(148, 163, 184, 0.5);
    }

    /* Elementos de Navegación */
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 10px;
      color: var(--text-muted);
      border-radius: 9px;
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
      background-color: var(--upec-green-light) !important;
      color: var(--upec-green) !important;
      font-weight: 600;
      border-left: 3px solid var(--upec-green);
    }
    :host-context(.dark) .active-nav,
    .dark .active-nav {
      background-color: rgba(56, 189, 248, 0.12) !important;
      color: #38bdf8 !important;
      border-left: 3px solid #38bdf8;
    }

    .icon-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
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
      background-color: var(--upec-green-light) !important;
      color: var(--upec-green) !important;
    }
    :host-context(.dark) .active-collapsed,
    .dark .active-collapsed {
      background-color: rgba(56, 189, 248, 0.14) !important;
      color: #38bdf8 !important;
    }

    /* Lista de Conversaciones */
    .conversation-item {
      display: flex;
      align-items: center;
      gap: 10px;
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
      background-color: var(--upec-green-light) !important;
      color: var(--upec-green) !important;
      font-weight: 600;
      border-left: 3px solid var(--upec-green) !important;
    }
    :host-context(.dark) .active-conv,
    .dark .active-conv {
      background-color: rgba(56, 189, 248, 0.12) !important;
      color: #38bdf8 !important;
      border-left: 3px solid #38bdf8 !important;
    }

    /* Popover Flotante (Estilo DeepSeek) */
    .popover-menu {
      transform-origin: bottom center;
      animation: popoverFadeIn 0.15s ease-out;
    }
    @keyframes popoverFadeIn {
      from {
        opacity: 0;
        transform: translateY(6px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .popover-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 10px;
      border-radius: 10px;
      font-size: 0.8rem;
      color: var(--text-muted);
      transition: all 0.12s ease;
      text-decoration: none;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
    }
    .popover-item:hover {
      background-color: rgba(148, 163, 184, 0.12);
      color: var(--text-main);
    }
    :host-context(.dark) .popover-item:hover,
    .dark .popover-item:hover {
      background-color: rgba(51, 65, 85, 0.5);
      color: #f1f5f9;
    }
    .active-popover {
      color: var(--upec-green) !important;
      font-weight: 600;
      background-color: var(--upec-green-light) !important;
    }
    :host-context(.dark) .active-popover,
    .dark .active-popover {
      color: #38bdf8 !important;
      background-color: rgba(56, 189, 248, 0.12) !important;
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
  isProfileMenuOpen: boolean = false;

  private subs = new Subscription();

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private assistantService: AssistantService,
    public sidebarService: SidebarService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isProfileMenuOpen = false;
    }
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

  get userEmail(): string {
    return this.authService.currentUser()?.correo || '';
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
        this.isProfileMenuOpen = false;
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

  toggleProfileMenu(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  closeAll(): void {
    this.isProfileMenuOpen = false;
    this.sidebarService.closeMobile();
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
          total_mensajes: item.total_mensajes
        })).sort((a: ConversacionItem, b: ConversacionItem) => {
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

  get groupedConversations(): ConversationGroup[] {
    return this.groupConversations(this.filteredConversations);
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
    this.closeAll();
    this.router.navigate(['/chat', id]);
  }

  newConversation(): void {
    this.closeAll();
    this.sidebarService.triggerNewConversation();
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
    this.isProfileMenuOpen = false;
    this.sidebarService.toggleCollapse();
  }

  toggleMobile(): void {
    this.isProfileMenuOpen = false;
    this.sidebarService.toggleMobile();
  }

  closeMobile(): void {
    this.isProfileMenuOpen = false;
    this.sidebarService.closeMobile();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.closeAll();
    this.authService.logout();
  }
}
