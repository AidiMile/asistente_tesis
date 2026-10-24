import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AssistantService } from '../../core/services/assistant.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex h-screen bg-[#0b0f19] text-slate-100 overflow-hidden pb-16 md:pb-0">
      <app-sidebar></app-sidebar>
      <main class="md:ml-64 flex-1 flex flex-col h-full overflow-y-auto px-4 sm:px-10 py-6 sm:py-8 bg-[#0b0f19]">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1e293b]/60 mb-6">
          <div>
            <h1 class="text-xl font-bold text-white tracking-tight">Mis conversaciones</h1>
            <p class="text-xs text-slate-400 mt-1">Abre cualquier conversación para revisarla y continuar el chat</p>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="nuevaConversacion()" class="px-3.5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-2">
              <i class="bi bi-plus-lg"></i> Nueva conversación
            </button>
            <button (click)="cargarHistorial()" title="Actualizar" class="p-2.5 rounded-xl bg-[#131d31] hover:bg-[#1a2742] text-slate-300 border border-[#1e293b] text-sm">
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
            class="w-full text-left rounded-xl bg-[#131d31] border border-[#1e293b] overflow-hidden transition-all hover:border-sky-500/50 hover:bg-[#172238] group">
            <div class="p-4 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0"><i class="bi bi-chat-left-text"></i></div>
                <div class="min-w-0">
                  <h4 class="text-sm font-semibold text-slate-200 truncate">{{ item.titulo }}</h4>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    {{ item.fecha_actualizacion | date:'medium' }} · <span class="text-sky-400">{{ item.total_mensajes }} mensajes</span>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 text-xs text-slate-400 group-hover:text-sky-400 shrink-0">
                <span class="hidden sm:inline">Abrir y continuar</span><i class="bi bi-chevron-right"></i>
              </div>
            </div>
          </button>

          <div *ngIf="filteredHistory.length === 0" class="text-center py-12 text-slate-500 text-xs">
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

  constructor(private assistantService: AssistantService, private router: Router) {}

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
