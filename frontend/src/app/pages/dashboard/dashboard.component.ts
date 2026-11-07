import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { SidebarService } from '../../core/services/sidebar.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  template: `
    <div class="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden transition-colors duration-200">
      <app-sidebar></app-sidebar>

      <main
        [ngClass]="sidebarService.isCollapsed() ? 'md:ml-16' : 'md:ml-64'"
        class="flex-1 flex flex-col h-screen overflow-y-auto px-6 sm:px-10 pt-16 sm:pt-8 pb-8 bg-[var(--bg-main)] transition-all duration-300 ease-in-out">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)] mb-8">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Panel Principal · PLN-EC</h1>
              <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-300/40 dark:border-amber-400/20">UPEC</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Universidad Politécnica Estatal del Carchi · Sistema de Asistencia Virtual Dialectal</p>
          </div>
          <a routerLink="/chat" class="btn-primary py-2.5 px-5 text-xs font-bold shadow-sm">
            <i class="bi bi-chat-dots-fill"></i> Ir al Chat de IA
          </a>
        </div>

        <!-- System Architecture Highlights -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 shadow-sm transition-colors">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-sky-500/10 dark:text-sky-400 flex items-center justify-center text-xl">
              <i class="bi bi-layers-fill"></i>
            </div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Arquitectura Modular</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Frontend en Angular, Backend en Django REST, Base de Datos en PostgreSQL y contenedor de inferencia neuronal en Ollama.
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 shadow-sm transition-colors">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl">
              <i class="bi bi-cpu-fill"></i>
            </div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Redes Neuronales (Ollama)</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Modelos de lenguaje basados en arquitectura Transformer ajustados mediante RAG neuro-simbólico.
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3 shadow-sm transition-colors">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
              <i class="bi bi-patch-check-fill"></i>
            </div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Dialecto Ecuatoriano</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Comprensión precisa de expresiones locales de la Sierra y Costa como achachay, chuchaqui, ¿cachas?, de ley y de una.
            </p>
          </div>

        </div>

        <!-- Quick Access Shortcuts -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-4 shadow-sm transition-colors">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Módulos de Investigación</h3>
            <div class="space-y-2">
              <a routerLink="/modismos" class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)] flex items-center justify-between text-xs hover:border-emerald-500/40 dark:hover:border-sky-500/40 transition-colors">
                <span class="text-slate-700 dark:text-slate-200 font-medium">Catálogo de Modismos Ecuatorianos</span>
                <i class="bi bi-arrow-right text-emerald-600 dark:text-sky-400"></i>
              </a>
              <a routerLink="/metrics" class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)] flex items-center justify-between text-xs hover:border-emerald-500/40 dark:hover:border-sky-500/40 transition-colors">
                <span class="text-slate-700 dark:text-slate-200 font-medium">Reporte de Métricas (BLEU, ROUGE, BERTScore)</span>
                <i class="bi bi-arrow-right text-emerald-600 dark:text-sky-400"></i>
              </a>
              <a routerLink="/history" class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)] flex items-center justify-between text-xs hover:border-emerald-500/40 dark:hover:border-sky-500/40 transition-colors">
                <span class="text-slate-700 dark:text-slate-200 font-medium">Historial y Consultas de Prueba</span>
                <i class="bi bi-arrow-right text-emerald-600 dark:text-sky-400"></i>
              </a>
            </div>
          </div>

          <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-4 shadow-sm transition-colors">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Ficha de Proyecto TIC</h3>
            <div class="text-xs space-y-2 text-slate-600 dark:text-slate-300">
              <p><strong class="text-slate-900 dark:text-slate-100 font-semibold">Institución:</strong> Universidad Politécnica Estatal del Carchi</p>
              <p><strong class="text-slate-900 dark:text-slate-100 font-semibold">Carrera:</strong> Computación</p>
              <p><strong class="text-slate-900 dark:text-slate-100 font-semibold">Investigadoras:</strong> Katty Dalila Aguas & Aida Milena Solis</p>
              <p><strong class="text-slate-900 dark:text-slate-100 font-semibold">Tutora:</strong> MSc. Georgina Guadalupe Arcos Ponce</p>
              <p><strong class="text-slate-900 dark:text-slate-100 font-semibold">Año:</strong> 2026</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  `
})
export class DashboardComponent {
  constructor(
    public authService: AuthService,
    public sidebarService: SidebarService
  ) {}
}
