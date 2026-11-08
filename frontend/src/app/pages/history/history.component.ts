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
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Abre cualquier conversación para revisarla, fijarla o continuar el chat</p>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="nuevaConversacion()" class="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all">
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

        <!-- Feedback message if any -->
        <div *ngIf="feedbackMessage" class="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between">
          <span>{{ feedbackMessage }}</span>
          <button (click)="feedbackMessage = ''" class="text-slate-400 hover:text-slate-600"><i class="bi bi-x-lg"></i></button>
        </div>

        <!-- Conversations List -->
        <div class="space-y-3">
          <div *ngFor="let item of filteredHistory" (click)="abrirConversacion(item.id_conversacion)"
            class="w-full text-left rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden transition-all hover:border-emerald-500/50 hover:bg-[var(--bg-card-hover)] group shadow-xs cursor-pointer">
            <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 dark:border-emerald-800/40">
                  <i [class]="item.fijada ? 'bi bi-pin-angle-fill text-amber-500 text-base' : 'bi bi-chat-left-text text-base'"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{{ item.titulo || 'Nueva conversación' }}</h4>
                    <span *ngIf="item.fijada" class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-300/40 shrink-0">
                      <i class="bi bi-pin-angle-fill text-amber-500 text-[10px]"></i> Fijada
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {{ item.fecha_actualizacion | date:'medium' }} · <span class="text-emerald-700 dark:text-emerald-400 font-medium">{{ item.total_mensajes || 0 }} mensajes</span>
                  </p>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center gap-2 self-end sm:self-center shrink-0" (click)="$event.stopPropagation()">
                <!-- Toggle Pin button -->
                <button
                  type="button"
                  (click)="toggleFijar(item)"
                  [title]="item.fijada ? 'Desfijar conversación' : 'Fijar conversación al inicio'"
                  [attr.aria-label]="item.fijada ? 'Desfijar conversación' : 'Fijar conversación'"
                  class="w-9 h-9 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-xs transition-colors">
                  <i [class]="item.fijada ? 'bi bi-pin-angle-fill text-amber-500' : 'bi bi-pin-angle text-slate-400 hover:text-amber-500'"></i>
                </button>

                <!-- Delete button -->
                <button
                  type="button"
                  (click)="confirmarEliminar(item)"
                  title="Eliminar conversación"
                  aria-label="Eliminar conversación"
                  class="w-9 h-9 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center text-xs transition-colors">
                  <i class="bi bi-trash3"></i>
                </button>

                <!-- Open indicator -->
                <button
                  type="button"
                  (click)="abrirConversacion(item.id_conversacion)"
                  class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors">
                  <span>Continuar</span>
                  <i class="bi bi-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          </div>

          <div *ngIf="filteredHistory.length === 0" class="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
            No se encontraron conversaciones. Inicia una nueva para comenzar.
          </div>
        </div>

        <!-- Confirmation Modal for Deletion -->
        <div *ngIf="convAEliminar" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div class="w-full max-w-sm rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-5 shadow-2xl space-y-4">
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
                class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Cancelar
              </button>
              <button
                type="button"
                (click)="ejecutarEliminar()"
                class="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-xs transition-colors">
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  `
})
export class HistoryComponent implements OnInit {
  searchQuery = '';
  historyList: any[] = [];
  feedbackMessage = '';
  convAEliminar: any = null;

  constructor(
    private assistantService: AssistantService,
    public sidebarService: SidebarService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.assistantService.getConversaciones().subscribe({
      next: (data) => {
        this.historyList = (data || []).sort((a: any, b: any) => {
          if (a.fijada && !b.fijada) return -1;
          if (!a.fijada && b.fijada) return 1;
          const timeA = new Date(a.fecha_actualizacion || a.fecha_creacion).getTime();
          const timeB = new Date(b.fecha_actualizacion || b.fecha_creacion).getTime();
          return timeB - timeA;
        });
      }
    });
  }

  abrirConversacion(id: number): void {
    this.router.navigate(['/chat', id]);
  }

  nuevaConversacion(): void {
    this.router.navigate(['/chat']);
  }

  toggleFijar(item: any): void {
    const nuevoEstado = !item.fijada;
    this.assistantService.toggleFijarConversacion(item.id_conversacion, nuevoEstado).subscribe({
      next: (res) => {
        item.fijada = res.fijada;
        this.feedbackMessage = res.mensaje || (item.fijada ? 'Conversación fijada al inicio' : 'Conversación desfijada');
        this.sidebarService.triggerRefresh();
        // Reordenar localmente
        this.historyList.sort((a: any, b: any) => {
          if (a.fijada && !b.fijada) return -1;
          if (!a.fijada && b.fijada) return 1;
          const timeA = new Date(a.fecha_actualizacion || a.fecha_creacion).getTime();
          const timeB = new Date(b.fecha_actualizacion || b.fecha_creacion).getTime();
          return timeB - timeA;
        });
        setTimeout(() => this.feedbackMessage = '', 3000);
      },
      error: () => {
        this.feedbackMessage = 'No se pudo actualizar el estado de fijación';
        setTimeout(() => this.feedbackMessage = '', 3000);
      }
    });
  }

  confirmarEliminar(item: any): void {
    this.convAEliminar = item;
  }

  cancelarEliminar(): void {
    this.convAEliminar = null;
  }

  ejecutarEliminar(): void {
    if (!this.convAEliminar) return;
    const id = this.convAEliminar.id_conversacion;
    this.assistantService.eliminarConversacion(id).subscribe({
      next: () => {
        this.historyList = this.historyList.filter(item => item.id_conversacion !== id);
        this.convAEliminar = null;
        this.feedbackMessage = 'Conversación eliminada permanentemente';
        this.sidebarService.triggerRefresh();
        setTimeout(() => this.feedbackMessage = '', 3000);
      },
      error: () => {
        this.feedbackMessage = 'No se pudo eliminar la conversación';
        this.convAEliminar = null;
        setTimeout(() => this.feedbackMessage = '', 3000);
      }
    });
  }

  get filteredHistory(): any[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.historyList;
    return this.historyList.filter(item => item.titulo?.toLowerCase().includes(query));
  }
}
