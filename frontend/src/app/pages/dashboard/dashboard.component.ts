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
        class="flex-1 flex flex-col h-screen overflow-y-auto px-6 sm:px-12 pt-16 sm:pt-10 pb-12 bg-[var(--bg-main)] transition-all duration-300 ease-in-out">
        
        <!-- 1. Cabecera (Header) del Contenido -->
        <header class="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-slate-200/80 dark:border-slate-800/80 mb-8">
          <div>
            <div class="flex flex-wrap items-center gap-2.5">
              <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Panel Principal · PLN-EC
              </h1>
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase bg-emerald-100 text-emerald-800 dark:bg-sky-400/15 dark:text-sky-300 border border-emerald-300/40 dark:border-sky-400/30 shadow-xs">
                UPEC
              </span>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-1.5 leading-relaxed">
              Universidad Politécnica Estatal del Carchi · Sistema de Asistencia Virtual Dialectal
            </p>
          </div>

          <!-- Botón 'Ir al Chat de IA' -->
          <div class="shrink-0">
            <a
              routerLink="/chat"
              class="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 dark:from-sky-500 dark:to-blue-600 dark:hover:from-sky-400 dark:hover:to-blue-500 text-white dark:text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 dark:shadow-sky-500/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group">
              <i class="bi bi-lightning-charge-fill text-amber-300 dark:text-amber-300 text-base group-hover:scale-110 transition-transform"></i>
              <span>Ir al Chat de IA</span>
              <i class="bi bi-arrow-right text-xs opacity-75 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"></i>
            </a>
          </div>
        </header>

        <!-- 2. Tarjetas Superiores (Arquitectura, Redes, Dialecto) -->
        <section class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          <!-- Tarjeta 1: Arquitectura Modular -->
          <div class="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xl mb-4 shadow-xs">
                <i class="bi bi-layers-fill"></i>
              </div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                Arquitectura Modular
              </h3>
              <p class="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Frontend en Angular, Backend en Django REST, Base de Datos en PostgreSQL y contenedor de inferencia neuronal en Ollama.
              </p>
            </div>
          </div>

          <!-- Tarjeta 2: Redes Neuronales (Ollama) -->
          <div class="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center text-xl mb-4 shadow-xs">
                <i class="bi bi-cpu-fill"></i>
              </div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                Redes Neuronales (Ollama)
              </h3>
              <p class="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Modelos de lenguaje basados en arquitectura Transformer ajustados mediante RAG neuro-simbólico y modismos locales.
              </p>
            </div>
          </div>

          <!-- Tarjeta 3: Dialecto Ecuatoriano -->
          <div class="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center text-xl mb-4 shadow-xs">
                <i class="bi bi-patch-check-fill"></i>
              </div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                Dialecto Ecuatoriano
              </h3>
              <p class="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Comprensión precisa de expresiones locales de la Sierra y Costa como achachay, chuchaqui, ¿cachas?, de ley y de una.
              </p>
            </div>
          </div>

        </section>

        <!-- 3 & 4. Secciones Inferiores: Módulos de Investigación y Ficha de Proyecto -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          <!-- 3. Módulos de Investigación (Botones de fila completa con hover dinámico) -->
          <div class="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-5">
                <h2 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <i class="bi bi-journal-bookmark text-emerald-600 dark:text-sky-400"></i>
                  <span>Módulos de Investigación</span>
                </h2>
                <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Acceso directo</span>
              </div>

              <div class="space-y-3">
                
                <a
                  routerLink="/modismos"
                  class="group w-full p-4 rounded-xl bg-slate-50/80 hover:bg-emerald-50/60 dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-slate-200/80 hover:border-emerald-500/40 dark:border-slate-700/60 dark:hover:border-sky-500/40 flex items-center justify-between transition-all duration-200 shadow-2xs">
                  <div class="flex items-center gap-3.5">
                    <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-sky-500/15 dark:text-sky-400 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                      <i class="bi bi-translate"></i>
                    </div>
                    <div>
                      <p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-sky-300 transition-colors">
                        Catálogo de Modismos Ecuatorianos
                      </p>
                      <p class="text-[11px] text-slate-500 dark:text-slate-400">
                        Vocabulario dialectal y expresiones culturales
                      </p>
                    </div>
                  </div>
                  <i class="bi bi-arrow-right text-sm text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-sky-400 group-hover:translate-x-1.5 transition-all duration-200"></i>
                </a>

                <a
                  routerLink="/metrics"
                  class="group w-full p-4 rounded-xl bg-slate-50/80 hover:bg-emerald-50/60 dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-slate-200/80 hover:border-emerald-500/40 dark:border-slate-700/60 dark:hover:border-sky-500/40 flex items-center justify-between transition-all duration-200 shadow-2xs">
                  <div class="flex items-center gap-3.5">
                    <div class="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                      <i class="bi bi-graph-up-arrow"></i>
                    </div>
                    <div>
                      <p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-sky-300 transition-colors">
                        Reporte de Métricas (BLEU, ROUGE, BERTScore)
                      </p>
                      <p class="text-[11px] text-slate-500 dark:text-slate-400">
                        Evaluación científica de generación de texto
                      </p>
                    </div>
                  </div>
                  <i class="bi bi-arrow-right text-sm text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-sky-400 group-hover:translate-x-1.5 transition-all duration-200"></i>
                </a>

                <a
                  routerLink="/history"
                  class="group w-full p-4 rounded-xl bg-slate-50/80 hover:bg-emerald-50/60 dark:bg-slate-800/40 dark:hover:bg-slate-800 border border-slate-200/80 hover:border-emerald-500/40 dark:border-slate-700/60 dark:hover:border-sky-500/40 flex items-center justify-between transition-all duration-200 shadow-2xs">
                  <div class="flex items-center gap-3.5">
                    <div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                      <i class="bi bi-clock-history"></i>
                    </div>
                    <div>
                      <p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-sky-300 transition-colors">
                        Historial y Consultas de Prueba
                      </p>
                      <p class="text-[11px] text-slate-500 dark:text-slate-400">
                        Registro de interacciones y calibración de respuestas
                      </p>
                    </div>
                  </div>
                  <i class="bi bi-arrow-right text-sm text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-sky-400 group-hover:translate-x-1.5 transition-all duration-200"></i>
                </a>

              </div>
            </div>
          </div>

          <!-- 4. Ficha de Proyecto TIC (Estructura en Cuadrícula de 2 Columnas) -->
          <div class="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-5">
                <h2 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <i class="bi bi-mortarboard text-emerald-600 dark:text-sky-400"></i>
                  <span>Ficha de Proyecto TIC</span>
                </h2>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-800">
                  Activo 2026
                </span>
              </div>

              <!-- Grid moderna de bloques -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                <!-- Institución (2 columnas) -->
                <div class="sm:col-span-2 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Institución
                  </span>
                  <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <i class="bi bi-building text-emerald-600 dark:text-sky-400"></i>
                    <span>Universidad Politécnica Estatal del Carchi</span>
                  </p>
                </div>

                <!-- Carrera -->
                <div class="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Carrera
                  </span>
                  <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <i class="bi bi-laptop text-emerald-600 dark:text-sky-400"></i>
                    <span>Computación</span>
                  </p>
                </div>

                <!-- Año -->
                <div class="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Año Lectivo
                  </span>
                  <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <i class="bi bi-calendar3 text-emerald-600 dark:text-sky-400"></i>
                    <span>2026</span>
                  </p>
                </div>

                <!-- Investigadoras (2 columnas) -->
                <div class="sm:col-span-2 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Investigadoras
                  </span>
                  <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <i class="bi bi-people-fill text-emerald-600 dark:text-sky-400"></i>
                    <span>Katty Dalila Aguas & Aida Milena Solis</span>
                  </p>
                </div>

                <!-- Tutora (2 columnas) -->
                <div class="sm:col-span-2 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Tutora de Proyecto
                  </span>
                  <p class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <i class="bi bi-award-fill text-amber-500"></i>
                    <span>MSc. Georgina Guadalupe Arcos Ponce</span>
                  </p>
                </div>

              </div>
            </div>
          </div>

        </section>

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
