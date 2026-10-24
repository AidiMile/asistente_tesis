import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  template: `
    <div class="flex h-screen bg-[#0b0f19] text-slate-100 overflow-hidden">
      <app-sidebar></app-sidebar>

      <main class="ml-64 flex-1 flex flex-col h-screen overflow-y-auto px-10 py-8 bg-[#0b0f19]">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-6 border-b border-[#1e293b]/60 mb-8">
          <div>
            <h1 class="text-2xl font-bold text-white tracking-tight">Panel Principal · PLN-EC</h1>
            <p class="text-xs text-slate-400 mt-1">Universidad Politécnica Estatal del Carchi · Sistema de Asistencia Virtual Dialectal</p>
          </div>
          <a routerLink="/chat" class="btn-primary py-2.5 px-5 text-xs font-bold">
            <i class="bi bi-chat-dots-fill"></i> Ir al Chat de IA
          </a>
        </div>

        <!-- System Architecture Highlights -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          <div class="p-6 rounded-2xl bg-[#131d31] border border-[#1e293b] space-y-3">
            <div class="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center text-xl">
              <i class="bi bi-layers-fill"></i>
            </div>
            <h3 class="text-sm font-bold text-white">Arquitectura Modular</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Frontend en Angular, Backend en Django REST, Base de Datos en PostgreSQL y contenedor de inferencia neuronal en Ollama.
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-[#131d31] border border-[#1e293b] space-y-3">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl">
              <i class="bi bi-cpu-fill"></i>
            </div>
            <h3 class="text-sm font-bold text-white">Redes Neuronales (Ollama)</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Modelos de lenguaje basados en arquitectura Transformer (Llama 3 / Mistral) ajustados mediante RAG neuro-simbólico.
            </p>
          </div>

          <div class="p-6 rounded-2xl bg-[#131d31] border border-[#1e293b] space-y-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl">
              <i class="bi bi-patch-check-fill"></i>
            </div>
            <h3 class="text-sm font-bold text-white">Dialecto Ecuatoriano</h3>
            <p class="text-xs text-slate-400 leading-relaxed">
              Comprensión precisa de expresiones locales de la Sierra y Costa como achachay, chuchaqui, ¿cachas?, de ley y de una.
            </p>
          </div>

        </div>

        <!-- Quick Access Shortcuts -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-6 rounded-2xl bg-[#131d31] border border-[#1e293b] space-y-4">
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">Módulos de Investigación</h3>
            <div class="space-y-2">
              <a routerLink="/modismos" class="p-3.5 rounded-xl bg-[#0b0f19]/80 border border-[#1e293b] flex items-center justify-between text-xs hover:border-sky-500/40 transition-colors">
                <span class="text-slate-200 font-medium">Catálogo de Modismos Ecuatorianos</span>
                <i class="bi bi-arrow-right text-sky-400"></i>
              </a>
              <a routerLink="/metrics" class="p-3.5 rounded-xl bg-[#0b0f19]/80 border border-[#1e293b] flex items-center justify-between text-xs hover:border-sky-500/40 transition-colors">
                <span class="text-slate-200 font-medium">Reporte de Métricas (BLEU, ROUGE, BERTScore)</span>
                <i class="bi bi-arrow-right text-sky-400"></i>
              </a>
              <a routerLink="/history" class="p-3.5 rounded-xl bg-[#0b0f19]/80 border border-[#1e293b] flex items-center justify-between text-xs hover:border-sky-500/40 transition-colors">
                <span class="text-slate-200 font-medium">Historial y Consultas de Prueba</span>
                <i class="bi bi-arrow-right text-sky-400"></i>
              </a>
            </div>
          </div>

          <div class="p-6 rounded-2xl bg-[#131d31] border border-[#1e293b] space-y-4">
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">Ficha de Proyecto TIC</h3>
            <div class="text-xs space-y-2 text-slate-300">
              <p><strong class="text-slate-400">Institución:</strong> Universidad Politécnica Estatal del Carchi</p>
              <p><strong class="text-slate-400">Carrera:</strong> Computación</p>
              <p><strong class="text-slate-400">Investigadoras:</strong> Katty Dalila Aguas & Aida Milena Solis</p>
              <p><strong class="text-slate-400">Tutora:</strong> MSc. Georgina Guadalupe Arcos Ponce</p>
              <p><strong class="text-slate-400">Año:</strong> 2026</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  `
})
export class DashboardComponent {
  constructor(public authService: AuthService) {}
}
