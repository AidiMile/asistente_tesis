import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AssistantService } from '../../core/services/assistant.service';
import { SidebarService } from '../../core/services/sidebar.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden transition-colors duration-200">
      <app-sidebar></app-sidebar>
      <main
        [ngClass]="sidebarService.isCollapsed() ? 'md:ml-16' : 'md:ml-64'"
        class="flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-10 pt-16 sm:pt-8 pb-8 bg-[var(--bg-main)] transition-all duration-300 ease-in-out">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)] mb-6">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Mis conversaciones</h1>
              <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-800/50">UPEC</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Abre cualquier conversación para revisarla y continuar el chat</p>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="nuevaConversacion()" class="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
              <i class="bi bi-plus-lg"></i> Nueva conversación
            </button>
            <button (click)="cargarHistorial()" title="Actualizar" class="p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-slate-600 dark:text-slate-300 border border-[var(--border-color)] text-sm transition-colors">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        <div class="relative mb-6">
          <input type="text" [(ngModel)]="searchQuery" placeholder="Buscar en mis conversaciones..." class="input-field pl-11 py-3 text-sm" />
          <i class="bi bi-search absolute left-4 top-3.5 text-slate-400"></i>
        </div>

        <div class="space-y-3">
          <button *ngFor="let item of filteredHistory" (click)="abrirConversacion(item.id_conversacion)"
            class="w-full text-left rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden transition-all hover:border-emerald-500/50 dark:hover:border-sky-500/50 hover:bg-[var(--bg-card-hover)] group shadow-sm">
            <div class="p-4 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-sky-500/10 text-emerald-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-emerald-500/20 dark:border-sky-500/20">
                  <i class="bi bi-chat-left-text"></i>
                </div>
                <div class="min-w-0">
                  <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{{ item.titulo }}</h4>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {{ item.fecha_actualizacion | date:'medium' }} · <span class="text-emerald-600 dark:text-sky-400 font-medium">{{ item.total_mensajes }} mensajes</span>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-sky-400 shrink-0">
                <span class="hidden sm:inline font-medium">Abrir y continuar</span><i class="bi bi-chevron-right"></i>
              </div>
            </div>
          </button>

          <div *ngIf="filteredHistory.length === 0" class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
            No se encontraron conversaciones. Inicia una nueva para comenzar.
          </div>
        </div>
      </main>
    </div>
  `
})
export class HistoryComponent implements OnInit {
  searchQuery = '';
  historyList: any[] = [];

  constructor(
    private assistantService: AssistantService,
    public sidebarService: SidebarService,
    private router: Router
  ) {}

  ngOnInit(): void { this.cargarHistorial(); }

  cargarHistorial(): void {
    this.assistantService.getConversaciones().subscribe({
      next: data => this.historyList = data
    });
  }

  abrirConversacion(id: number): void { this.router.navigate(['/chat', id]); }
  nuevaConversacion(): void { this.router.navigate(['/chat']); }

  get filteredHistory(): any[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.historyList;
    return this.historyList.filter(item => item.titulo?.toLowerCase().includes(query));
  }
}
