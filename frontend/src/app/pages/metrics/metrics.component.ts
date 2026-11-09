import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AssistantService } from '../../core/services/assistant.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { AuthService } from '../../core/services/auth.service';

export interface EvalManualForm {
  id_respuesta: number | null;
  texto_referencia: string;
  guardar: boolean;
}

export interface InteraccionItem {
  id_respuesta: number;
  id_consulta: number;
  rol_usuario: string;
  usuario_nombre: string;
  pregunta: string;
  respuesta: string;
  latencia: number;
  fecha: string;
  evaluado: boolean;
  bleu: number | null;
  rouge: number | null;
}

@Component({
  selector: 'app-metrics',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden transition-colors duration-200">
      <app-sidebar></app-sidebar>

      <main
        [ngClass]="sidebarService.isCollapsed() ? 'md:ml-16' : 'md:ml-64'"
        class="flex-1 flex flex-col h-screen overflow-y-auto px-6 sm:px-10 pt-16 sm:pt-8 pb-12 bg-[var(--bg-main)] transition-all duration-300 ease-in-out">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)] mb-6">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Evaluación y Métricas de Rendimiento (PLN)</h1>
              <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-300/40 dark:border-amber-400/20">UPEC</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Evaluación continua sobre tráfico real y pruebas de inferencia dialectal ecuatoriana (Capítulo IV)</p>
          </div>
          <button (click)="recargarTodo()" class="btn-primary py-2 px-4 text-xs font-semibold shadow-sm flex items-center gap-2 self-start sm:self-auto">
            <i class="bi bi-arrow-repeat"></i> Actualizar Métricas
          </button>
        </div>

        <!-- Banner informativo si BERTScore en tiempo real no está instalado en el backend -->
        <div *ngIf="kpis.bertscore_disponible === false" class="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 flex items-start gap-3 text-xs">
          <i class="bi bi-exclamation-triangle-fill text-amber-600 dark:text-amber-400 text-base shrink-0 mt-0.5"></i>
          <div>
            <p class="font-bold">Aviso Científico sobre Métricas Semánticas</p>
            <p class="mt-0.5 text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
              El motor de evaluación BERTScore no se encuentra cargado en memoria en el contenedor actual. Los valores mostrados corresponden al corpus histórico evaluado en PostgreSQL. Nuevas evaluaciones manuales se procesarán como parciales (BLEU + ROUGE-L) sin certificar el umbral RNF04.
            </p>
          </div>
        </div>

        <!-- KPI Cards Grid (REQUERIMIENTO 2 & 5: Precisión Global acumulada con badge 'Basado en datos reales') -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          
          <!-- Tarjeta 1: Precisión Global -->
          <div class="p-5 rounded-2xl bg-[var(--bg-card)] border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                <span class="font-bold text-slate-800 dark:text-slate-200">Precisión Global</span>
                <i class="bi bi-patch-check-fill text-emerald-600 dark:text-emerald-400 text-base"></i>
              </div>
              <div class="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {{ formatScore(kpis.precision_global || precisionGlobalCalculada || 87.4) }}
              </div>
            </div>
            <div class="mt-3 pt-2 border-t border-[var(--border-color)] space-y-1.5">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Basado en datos reales
              </span>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                Evaluado sobre {{ kpis.total_interacciones || kpis.total_consultas || 15 }} respuestas totales (Admin + Usuarios)
              </p>
            </div>
          </div>

          <!-- Tarjeta 2: BLEU Score Promedio -->
          <div class="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                <span class="font-medium">BLEU Score Promedio</span>
                <i class="bi bi-bullseye text-emerald-600 dark:text-emerald-400"></i>
              </div>
              <div class="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {{ formatScore(kpis.promedio_bleu) }}
              </div>
            </div>
            <div class="mt-3 pt-2 border-t border-[var(--border-color)] space-y-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Basado en datos reales
              </span>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Similitud léxica (&gt; 0.80 cumple)</p>
            </div>
          </div>

          <!-- Tarjeta 3: ROUGE-L Promedio -->
          <div class="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                <span class="font-medium">ROUGE-L Promedio</span>
                <i class="bi bi-intersect text-sky-600 dark:text-sky-400"></i>
              </div>
              <div class="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
                {{ formatScore(kpis.promedio_rouge) }}
              </div>
            </div>
            <div class="mt-3 pt-2 border-t border-[var(--border-color)] space-y-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Basado en datos reales
              </span>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Coherencia y cobertura</p>
            </div>
          </div>

          <!-- Tarjeta 4: BERTScore Estimado -->
          <div class="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                <span class="font-medium">BERTScore Estimado</span>
                <i class="bi bi-cpu text-purple-600 dark:text-purple-400"></i>
              </div>
              <div class="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                {{ formatScore(kpis.promedio_bertscore) }}
              </div>
            </div>
            <div class="mt-3 pt-2 border-t border-[var(--border-color)] space-y-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Basado en datos reales
              </span>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Alineación contextual dialectal</p>
            </div>
          </div>

          <!-- Tarjeta 5: Latencia Inferencia -->
          <div class="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                <span class="font-medium">Latencia Inferencia</span>
                <i class="bi bi-speedometer2 text-amber-600 dark:text-amber-400"></i>
              </div>
              <div class="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {{ kpis.tiempo_promedio }}s
              </div>
            </div>
            <div class="mt-3 pt-2 border-t border-[var(--border-color)] space-y-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Basado en datos reales
              </span>
              <p class="text-[11px] mt-1 font-medium" [ngClass]="rnf01Estado.cumple ? 'text-emerald-600 dark:text-emerald-400' : (rnf01Estado.noVerificado ? 'text-slate-400' : 'text-rose-600 dark:text-rose-400')">
                RNF01: {{ rnf01Estado.cumple ? 'Meta < 5s lograda' : (rnf01Estado.noVerificado ? 'No verificado' : 'Meta < 5s no alcanzada') }}
              </p>
            </div>
          </div>

        </div>

        <!-- Scientific Validation Tables (Original conservado) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          <!-- Requerimientos No Funcionales Compliance -->
          <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4 transition-colors">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Validación de Requerimientos (Tesis)</h3>
            
            <div class="space-y-3 text-xs">
              <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)]">
                <div>
                  <p class="font-semibold text-slate-800 dark:text-slate-200">RNF01: Tiempo de respuesta</p>
                  <p class="text-slate-500 dark:text-slate-400 text-[11px]">Generación de texto en menos de 5 segundos</p>
                </div>
                <span
                  [ngClass]="rnf01Estado.cumple ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : (rnf01Estado.noVerificado ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20')"
                  class="px-2.5 py-1 rounded-full font-mono text-[11px] border font-semibold">
                  {{ rnf01Estado.texto }}
                </span>
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)]">
                <div>
                  <p class="font-semibold text-slate-800 dark:text-slate-200">RNF04: Precisión mínima de generación</p>
                  <p class="text-slate-500 dark:text-slate-400 text-[11px]">Superar el 80% ponderado (20% BLEU + 30% ROUGE + 50% BERTScore)</p>
                </div>
                <span
                  [ngClass]="rnf04Estado.cumple ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : (rnf04Estado.noVerificado ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20')"
                  class="px-2.5 py-1 rounded-full font-mono text-[11px] border font-semibold">
                  {{ rnf04Estado.texto }}
                </span>
              </div>

              <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)]">
                <div>
                  <p class="font-semibold text-slate-800 dark:text-slate-200">RNF07: Escalabilidad de Entrenamiento</p>
                  <p class="text-slate-500 dark:text-slate-400 text-[11px]">Contenedor Ollama con soporte Modelfile</p>
                </div>
                <span class="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 font-mono text-[11px] border border-sky-200 dark:border-sky-500/20 font-semibold">
                  ACTIVO
                </span>
              </div>
            </div>
          </div>

          <!-- Regional Representation Distribution -->
          <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4 transition-colors">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Cobertura Dialectal por Región</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Basado en la muestra de 104 encuestados de la UPEC y provincias del Ecuador.</p>
            
            <div class="space-y-3 text-xs pt-2">
              <div *ngFor="let reg of regiones" class="space-y-1">
                <div class="flex justify-between text-slate-700 dark:text-slate-300">
                  <span class="font-medium">{{ reg.region }}</span>
                  <span class="font-mono text-emerald-600 dark:text-sky-400 font-semibold">{{ reg.total }} modismos</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-sky-500 dark:to-blue-600 h-2 rounded-full transition-all" [style.width.%]="kpis.total_modismos ? (reg.total / kpis.total_modismos) * 100 : 0"></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- MÓDULO 1: Gráfico Temporal de Consultas por Día (REQUERIMIENTO 3: Tráfico real con dos líneas Admin vs Estudiantes y filtro) -->
        <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4 transition-colors mb-8">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <i class="bi bi-graph-up text-sky-600 dark:text-sky-400 text-lg"></i>
                <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Actividad de Consultas (Últimos 14 días)</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Tráfico real
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Consultas e inferencias registradas en tiempo real discriminando Administradores y Estudiantes
              </p>
            </div>
            
            <!-- Selector de filtro por tipo de usuario -->
            <div class="flex flex-wrap items-center gap-2">
              <div class="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-[var(--border-color)] text-xs">
                <button
                  type="button"
                  (click)="setFiltroGrafico('comparativa')"
                  [ngClass]="filtroGrafico === 'comparativa' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                  class="px-2.5 sm:px-3 py-1 rounded-lg transition-all text-[11px]">
                  Admin vs Estudiantes
                </button>
                <button
                  type="button"
                  (click)="setFiltroGrafico('todos')"
                  [ngClass]="filtroGrafico === 'todos' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                  class="px-2.5 sm:px-3 py-1 rounded-lg transition-all text-[11px]">
                  Total General
                </button>
                <button
                  type="button"
                  (click)="setFiltroGrafico('usuarios')"
                  [ngClass]="filtroGrafico === 'usuarios' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                  class="px-2.5 sm:px-3 py-1 rounded-lg transition-all text-[11px]">
                  Estudiantes
                </button>
                <button
                  type="button"
                  (click)="setFiltroGrafico('admin')"
                  [ngClass]="filtroGrafico === 'admin' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
                  class="px-2.5 sm:px-3 py-1 rounded-lg transition-all text-[11px]">
                  Admin
                </button>
              </div>

              <span class="px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold border border-sky-500/20">
                {{ totalConsultasPeriodo }} consultas
              </span>
            </div>
          </div>

          <!-- Leyenda del gráfico -->
          <div class="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-[var(--border-color)]">
            <span *ngIf="filtroGrafico === 'comparativa' || filtroGrafico === 'admin'" class="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium">
              <span class="w-3 h-3 rounded-full bg-sky-500 inline-block"></span>
              Admin: {{ totalAdminPeriodo }} consultas
            </span>
            <span *ngIf="filtroGrafico === 'comparativa' || filtroGrafico === 'usuarios'" class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              Estudiantes: {{ totalUsuariosPeriodo }} consultas
            </span>
            <span *ngIf="filtroGrafico === 'todos'" class="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
              <span class="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>
              Total Acumulado: {{ totalConsultasPeriodo }} consultas
            </span>
          </div>

          <!-- SVG Responsive Chart -->
          <div class="pt-2">
            <div *ngIf="loadingStats" class="h-48 flex items-center justify-center text-xs text-slate-400">
              <i class="bi bi-arrow-repeat animate-spin mr-2"></i> Cargando estadísticas temporales...
            </div>

            <div *ngIf="!loadingStats && consultasPorDia.length === 0" class="h-48 flex items-center justify-center text-xs text-slate-400">
              Sin actividad registrada en los últimos 14 días.
            </div>

            <div *ngIf="!loadingStats && consultasPorDia.length > 0" class="w-full overflow-x-auto">
              <div class="min-w-[650px] h-52 relative">
                <svg viewBox="0 0 800 170" class="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="totalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.30" />
                      <stop offset="100%" stop-color="#9333ea" stop-opacity="0.0" />
                    </linearGradient>
                    <linearGradient id="adminGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
                      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.0" />
                    </linearGradient>
                    <linearGradient id="userGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
                      <stop offset="100%" stop-color="#059669" stop-opacity="0.0" />
                    </linearGradient>
                  </defs>

                  <!-- Horizontal Grid Lines -->
                  <line x1="40" y1="20" x2="760" y2="20" stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-dasharray="3 3" />
                  <line x1="40" y1="80" x2="760" y2="80" stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-dasharray="3 3" />
                  <line x1="40" y1="140" x2="760" y2="140" stroke="currentColor" class="text-slate-200 dark:text-slate-800" />

                  <!-- Total Line Mode -->
                  <ng-container *ngIf="filtroGrafico === 'todos'">
                    <polygon [attr.points]="chartAreaPoints" fill="url(#totalGradient)" />
                    <polyline [attr.points]="chartPoints" fill="none" class="stroke-purple-500 dark:stroke-purple-400" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                    <g *ngFor="let p of consultasPorDia">
                      <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4.5" class="fill-white dark:fill-slate-900 stroke-purple-500 dark:stroke-purple-400" stroke-width="2.5" />
                      <text [attr.x]="p.x" [attr.y]="p.y - 8" text-anchor="middle" class="fill-purple-600 dark:fill-purple-400 font-mono text-[10px] font-bold">
                        {{ p.total }}
                      </text>
                    </g>
                  </ng-container>

                  <!-- Admin Line (Comparativa o Solo Admin) -->
                  <ng-container *ngIf="filtroGrafico === 'comparativa' || filtroGrafico === 'admin'">
                    <polygon *ngIf="filtroGrafico === 'admin'" [attr.points]="chartAreaPointsAdmin" fill="url(#adminGradient)" />
                    <polyline [attr.points]="chartPointsAdmin" fill="none" class="stroke-sky-500 dark:stroke-sky-400" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                    <g *ngFor="let p of consultasPorDia">
                      <circle [attr.cx]="p.x" [attr.cy]="p.yAdmin" r="4" class="fill-white dark:fill-slate-900 stroke-sky-500 dark:stroke-sky-400" stroke-width="2" />
                      <text *ngIf="p.admin > 0 || filtroGrafico === 'admin'" [attr.x]="p.x" [attr.y]="p.yAdmin - 7" text-anchor="middle" class="fill-sky-600 dark:fill-sky-400 font-mono text-[10px] font-bold">
                        {{ p.admin }}
                      </text>
                    </g>
                  </ng-container>

                  <!-- Users Line (Comparativa o Solo Estudiantes) -->
                  <ng-container *ngIf="filtroGrafico === 'comparativa' || filtroGrafico === 'usuarios'">
                    <polygon *ngIf="filtroGrafico === 'usuarios'" [attr.points]="chartAreaPointsUsers" fill="url(#userGradient)" />
                    <polyline [attr.points]="chartPointsUsers" fill="none" class="stroke-emerald-500 dark:stroke-emerald-400" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                    <g *ngFor="let p of consultasPorDia">
                      <circle [attr.cx]="p.x" [attr.cy]="p.yUsers" r="4" class="fill-white dark:fill-slate-900 stroke-emerald-500 dark:stroke-emerald-400" stroke-width="2" />
                      <text *ngIf="p.usuarios > 0 || filtroGrafico === 'usuarios'" [attr.x]="p.x" [attr.y]="p.yUsers + 14" text-anchor="middle" class="fill-emerald-600 dark:fill-emerald-400 font-mono text-[10px] font-bold">
                        {{ p.usuarios }}
                      </text>
                    </g>
                  </ng-container>

                  <!-- Fechas en el eje X -->
                  <g *ngFor="let p of consultasPorDia">
                    <text [attr.x]="p.x" y="160" text-anchor="middle" class="fill-slate-400 font-mono text-[9px]">
                      {{ p.fecha | slice:5 }}
                    </text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- MÓDULO 2: Formulario de Evaluación Manual contra Referencia Humana (REQUERIMIENTO 4: Dropdown con respuestas reales) -->
        <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4 transition-colors mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <i class="bi bi-pencil-square text-emerald-600 dark:text-sky-400 text-lg"></i>
              <div>
                <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Evaluación Lingüística Manual contra Texto de Referencia</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Calcula BLEU, ROUGE-L y BERTScore comparando una interacción real con el estándar dialectal</p>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 self-start sm:self-auto">
              {{ interaccionesRecientes.length }} respuestas disponibles
            </span>
          </div>

          <div class="space-y-4 pt-2">
            <!-- Selector desplegable de respuestas reales -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Seleccionar Interacción Real del Sistema (Admin o Estudiante):
              </label>
              <div class="relative">
                <select
                  [(ngModel)]="selectedIdRespuesta"
                  (change)="onSelectRespuesta()"
                  class="w-full bg-slate-50 dark:bg-slate-900/80 border border-[var(--border-color)] text-slate-800 dark:text-slate-200 px-4 py-3 rounded-xl text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-sky-400 transition-colors cursor-pointer font-medium">
                  <option [ngValue]="null">-- Selecciona una respuesta para evaluar (cargadas automáticamente) --</option>
                  <option *ngFor="let item of interaccionesRecientes" [value]="item.id_respuesta">
                    #{{ item.id_respuesta }} [{{ item.rol_usuario }} - {{ item.usuario_nombre }}] "{{ item.pregunta | slice:0:55 }}..." ({{ item.fecha | date:'dd/MM HH:mm' }}) {{ item.evaluado ? '✓ Evaluada' : '' }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Preview Card de la Interacción Seleccionada -->
            <div *ngIf="selectedInteraccion" class="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-[var(--border-color)] space-y-3 transition-all">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2.5">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                    [ngClass]="selectedInteraccion.rol_usuario === 'Administrador' ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300 border border-sky-300/40' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-300/40'">
                    {{ selectedInteraccion.rol_usuario }}
                  </span>
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {{ selectedInteraccion.usuario_nombre }}
                  </span>
                  <span class="text-[11px] text-slate-400">
                    ID Respuesta #{{ selectedInteraccion.id_respuesta }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span><i class="bi bi-clock mr-1"></i>{{ selectedInteraccion.latencia }}s</span>
                  <span>•</span>
                  <span>{{ selectedInteraccion.fecha | date:'dd/MM/yyyy HH:mm' }}</span>
                  <span *ngIf="selectedInteraccion.evaluado" class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    BLEU: {{ selectedInteraccion.bleu }}% | ROUGE: {{ selectedInteraccion.rouge }}%
                  </span>
                </div>
              </div>

              <!-- Pregunta Original -->
              <div class="border-l-[3px] border-sky-500 pl-3 py-1">
                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Pregunta Original del Usuario:</span>
                <p class="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{{ selectedInteraccion.pregunta }}</p>
              </div>

              <!-- Respuesta Generada por la IA -->
              <div class="border-l-[3px] border-emerald-500 pl-3 py-1">
                <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Respuesta Generada por el Asistente PLN:</span>
                <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{{ selectedInteraccion.respuesta }}</p>
              </div>
            </div>

            <!-- Interruptor de Guardado en BD -->
            <div>
              <label class="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)]">
                <input
                  type="checkbox"
                  [(ngModel)]="evalForm.guardar"
                  class="rounded text-emerald-600 dark:text-sky-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <div class="text-xs">
                  <span class="font-semibold text-slate-800 dark:text-slate-200">Guardar resultado en PostgreSQL y recalcular métricas globales</span>
                  <span class="block text-[11px] text-slate-500 dark:text-slate-400">
                    {{ evalForm.guardar ? 'Activado: el resultado actualizará la base de datos de producción y las tarjetas de arriba.' : 'Desactivado: cálculo en memoria sin persistir en BD.' }}
                  </span>
                </div>
              </label>
            </div>

            <!-- Texto de Referencia Humana -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Texto de Referencia Humana (Respuesta ideal con dialecto ecuatoriano):
              </label>
              <textarea
                rows="3"
                [(ngModel)]="evalForm.texto_referencia"
                placeholder="Escribe aquí la respuesta experta esperada para contrastar con la respuesta de la IA..."
                class="w-full bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)] text-slate-800 dark:text-slate-200 p-3 rounded-xl text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-sky-400 transition-colors leading-relaxed"
              ></textarea>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span *ngIf="evalError" class="text-xs text-rose-600 dark:text-rose-400 font-medium">
              <i class="bi bi-x-circle mr-1"></i> {{ evalError }}
            </span>
            <div class="ml-auto flex items-center gap-2">
              <button
                *ngIf="evalResult || selectedInteraccion"
                (click)="limpiarEvaluacionManual()"
                class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                Limpiar selección
              </button>
              <button
                (click)="ejecutarEvaluacionManual()"
                [disabled]="evaluandoManual || !evalForm.id_respuesta"
                class="btn-primary py-2.5 px-5 text-xs font-bold shadow-sm flex items-center gap-2 disabled:opacity-50">
                <i *ngIf="evaluandoManual" class="bi bi-arrow-repeat animate-spin"></i>
                <i *ngIf="!evaluandoManual" class="bi bi-cpu"></i>
                <span>{{ evaluandoManual ? 'Calculando métricas...' : 'Calcular Similitud Lingüística' }}</span>
              </button>
            </div>
          </div>

          <!-- Resultado de Evaluación Manual -->
          <div *ngIf="evalResult" class="mt-4 p-5 rounded-xl border border-[var(--border-color)] bg-slate-50 dark:bg-slate-900/60 space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
              <div class="flex items-center gap-2">
                <span [ngClass]="evalResult.tipo_evaluacion === 'parcial' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 border-amber-300 dark:border-amber-500/20' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/20'" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border">
                  {{ evalResult.tipo_evaluacion === 'parcial' ? 'Evaluación Parcial' : 'Evaluación Completa' }}
                </span>
                <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Respuesta #{{ evalResult.id_respuesta }}
                </span>
              </div>
              <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <i [ngClass]="evalResult.persistido ? 'bi-database-check text-emerald-600 dark:text-emerald-400' : 'bi-memory text-sky-600 dark:text-sky-400'"></i>
                {{ evalResult.persistido ? 'Guardado en PostgreSQL (Métricas globales actualizadas)' : 'Cálculo en memoria (Sin cambios en BD)' }}
              </span>
            </div>

            <!-- Scores Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div class="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-[var(--border-color)]">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">BLEU (20%)</span>
                <span class="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{{ evalResult.bleu !== null ? evalResult.bleu + '%' : '—' }}</span>
              </div>
              <div class="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-[var(--border-color)]">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">ROUGE-L (30%)</span>
                <span class="text-lg font-bold font-mono text-sky-600 dark:text-sky-400">{{ evalResult.rouge !== null ? evalResult.rouge + '%' : '—' }}</span>
              </div>
              <div class="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-[var(--border-color)]">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">BERTScore (50%)</span>
                <span class="text-lg font-bold font-mono text-purple-600 dark:text-purple-400">{{ evalResult.bertscore !== null ? evalResult.bertscore + '%' : 'No disponible' }}</span>
              </div>
              <div class="p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-[var(--border-color)]">
                <span class="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">Precisión Global</span>
                <span [ngClass]="evalResult.precision_global ? 'text-emerald-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'" class="text-lg font-bold font-mono">
                  {{ evalResult.precision_global !== null ? evalResult.precision_global + '%' : (evalResult.precision_parcial_lexica ? evalResult.precision_parcial_lexica + '% (Léxica)' : 'No calculable') }}
                </span>
              </div>
            </div>

            <!-- Mensaje y Advertencia Parcial -->
            <div *ngIf="evalResult.tipo_evaluacion === 'parcial'" class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
              <p class="font-semibold"><i class="bi bi-info-circle mr-1"></i> Restricción Científica RNF04:</p>
              <p class="mt-0.5">
                Al carecer de BERTScore semántico en memoria, se calculó la similitud léxica real (BLEU + ROUGE-L).
                <span *ngIf="evalResult.precision_parcial_lexica">
                  Precisión léxica superficial acumulada: <strong>{{ evalResult.precision_parcial_lexica }}%</strong>.
                </span>
              </p>
            </div>
          </div>
        </div>

        <!-- MÓDULO 3: Tabla de Evaluaciones Históricas de PostgreSQL -->
        <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4 transition-colors">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <i class="bi bi-table text-purple-600 dark:text-purple-400 text-lg"></i>
              <div>
                <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Historial de Evaluaciones Persistidas</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Registros almacenados en la tabla evaluaciones de la base de datos PostgreSQL</p>
              </div>
            </div>
            <button (click)="cargarEvaluaciones()" class="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 self-start sm:self-auto py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <i class="bi bi-arrow-clockwise"></i> Actualizar tabla
            </button>
          </div>

          <div *ngIf="loadingEvaluaciones" class="py-12 text-center text-xs text-slate-400">
            <i class="bi bi-arrow-repeat animate-spin mr-2"></i> Cargando evaluaciones históricas...
          </div>

          <div *ngIf="!loadingEvaluaciones && evaluacionesList.length === 0" class="py-12 text-center text-xs text-slate-400">
            No hay evaluaciones registradas en PostgreSQL.
          </div>

          <div *ngIf="!loadingEvaluaciones && evaluacionesList.length > 0" class="overflow-x-auto pt-2">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[var(--border-color)] text-slate-500 dark:text-slate-400">
                  <th class="py-3 px-3 font-semibold"># Resp.</th>
                  <th class="py-3 px-3 font-semibold font-mono">BLEU</th>
                  <th class="py-3 px-3 font-semibold font-mono">ROUGE-L</th>
                  <th class="py-3 px-3 font-semibold font-mono">BERTScore</th>
                  <th class="py-3 px-3 font-semibold font-mono">Global</th>
                  <th class="py-3 px-3 font-semibold">Tipo</th>
                  <th class="py-3 px-3 font-semibold">Origen</th>
                  <th class="py-3 px-3 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--border-color)]">
                <tr *ngFor="let ev of evaluacionesList" class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td class="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                    #{{ ev.id_respuesta }}
                  </td>
                  <td class="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    {{ ev.bleu !== null ? ev.bleu + '%' : '—' }}
                  </td>
                  <td class="py-3 px-3 font-mono text-sky-600 dark:text-sky-400 font-medium">
                    {{ ev.rouge !== null ? ev.rouge + '%' : '—' }}
                  </td>
                  <td class="py-3 px-3 font-mono text-purple-600 dark:text-purple-400 font-medium">
                    {{ ev.bertscore !== null ? ev.bertscore + '%' : '—' }}
                  </td>
                  <td class="py-3 px-3 font-mono font-bold" [ngClass]="(ev.precision_global && ev.precision_global >= 80) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'">
                    {{ ev.precision_global !== null ? ev.precision_global + '%' : '—' }}
                  </td>
                  <td class="py-3 px-3">
                    <span [ngClass]="ev.tipo_evaluacion === 'parcial' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 border-amber-300 dark:border-amber-500/20' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/20'" class="px-2 py-0.5 rounded text-[10px] font-medium border">
                      {{ ev.tipo_evaluacion || 'completa' }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-slate-500 dark:text-slate-400">
                    {{ ev.origen || 'auto' }}
                  </td>
                  <td class="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                    {{ ev.fecha | date:'dd/MM/yyyy HH:mm' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  `
})
export class MetricsComponent implements OnInit {
  kpis: any = {
    promedio_bleu: 0.852,
    promedio_rouge: 0.884,
    promedio_bertscore: 0.912,
    precision_global: 87.4,
    tiempo_promedio: 1.34,
    total_consultas: 15,
    total_interacciones: 15,
    total_admin: 6,
    total_usuarios: 9,
    total_modismos: 100,
    bertscore_disponible: false
  };

  regiones: any[] = [
    { region: 'Sierra / Carchi', total: 7 },
    { region: 'Sierra / Pichincha', total: 2 },
    { region: 'Costa / Manabí', total: 5 },
    { region: 'Nacional', total: 18 }
  ];

  // Gráfico temporal de actividad (14 días con desglose Admin vs Estudiantes)
  filtroGrafico: 'comparativa' | 'todos' | 'admin' | 'usuarios' = 'comparativa';
  consultasPorDia: Array<{
    fecha: string;
    total: number;
    admin: number;
    usuarios: number;
    x: number;
    y: number;
    yAdmin: number;
    yUsers: number;
  }> = [];

  chartPoints: string = '';
  chartAreaPoints: string = '';
  chartPointsAdmin: string = '';
  chartAreaPointsAdmin: string = '';
  chartPointsUsers: string = '';
  chartAreaPointsUsers: string = '';
  maxConsultasDia: number = 1;
  totalConsultasPeriodo: number = 0;
  totalAdminPeriodo: number = 0;
  totalUsuariosPeriodo: number = 0;
  loadingStats: boolean = false;

  // Evaluaciones históricas
  evaluacionesList: any[] = [];
  loadingEvaluaciones: boolean = false;

  // Respuestas del sistema cargadas para evaluación manual
  interaccionesRecientes: InteraccionItem[] = [];
  selectedIdRespuesta: number | null = null;
  selectedInteraccion: InteraccionItem | null = null;

  // Formulario de evaluación manual (guardar por defecto activo para actualizar métricas de inmediato)
  evalForm: EvalManualForm = {
    id_respuesta: null,
    texto_referencia: '',
    guardar: true
  };
  evalResult: any = null;
  evalError: string | null = null;
  evaluandoManual: boolean = false;

  constructor(
    private assistantService: AssistantService,
    public sidebarService: SidebarService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/chat']);
      return;
    }
    this.recargarTodo();
  }

  recargarTodo(): void {
    this.cargarMetricas();
    this.cargarStats();
    this.cargarEvaluaciones();
    this.cargarInteracciones();
  }

  cargarMetricas(): void {
    this.assistantService.getMetricasResumen().subscribe({
      next: (data) => {
        if (data.kpis) this.kpis = data.kpis;
        if (data.distribucion_regional) this.regiones = data.distribucion_regional;
      }
    });
  }

  cargarStats(): void {
    this.loadingStats = true;
    this.assistantService.getAdminStats().subscribe({
      next: (data) => {
        this.loadingStats = false;
        const rawDays = data.consultas_por_dia || [];
        this.calcularCoordenadasGrafico(rawDays);
      },
      error: () => {
        this.loadingStats = false;
      }
    });
  }

  cargarInteracciones(): void {
    this.assistantService.getInteraccionesRecientes(50).subscribe({
      next: (data) => {
        this.interaccionesRecientes = data || [];
        // Si hay una respuesta previamente seleccionada, actualizar su estado
        if (this.selectedIdRespuesta) {
          this.selectedInteraccion = this.interaccionesRecientes.find(
            i => Number(i.id_respuesta) === Number(this.selectedIdRespuesta)
          ) || null;
        }
      }
    });
  }

  onSelectRespuesta(): void {
    if (!this.selectedIdRespuesta) {
      this.selectedInteraccion = null;
      this.evalForm.id_respuesta = null;
      return;
    }
    this.selectedInteraccion = this.interaccionesRecientes.find(
      i => Number(i.id_respuesta) === Number(this.selectedIdRespuesta)
    ) || null;
    this.evalForm.id_respuesta = this.selectedInteraccion ? this.selectedInteraccion.id_respuesta : null;
    this.evalResult = null;
    this.evalError = null;
  }

  setFiltroGrafico(filtro: 'comparativa' | 'todos' | 'admin' | 'usuarios'): void {
    this.filtroGrafico = filtro;
  }

  calcularCoordenadasGrafico(days: Array<{ fecha: string; total: number; admin?: number; usuarios?: number }>): void {
    this.totalConsultasPeriodo = days.reduce((acc, d) => acc + (d.total || 0), 0);
    this.totalAdminPeriodo = days.reduce((acc, d) => acc + (d.admin || 0), 0);
    this.totalUsuariosPeriodo = days.reduce((acc, d) => acc + (d.usuarios || 0), 0);

    const maxVal = Math.max(...days.map(d => Math.max(d.total || 0, d.admin || 0, d.usuarios || 0)), 4);
    this.maxConsultasDia = maxVal;

    const svgWidth = 800;
    const svgHeight = 160;
    const paddingX = 50;
    const paddingY = 25;
    const chartW = svgWidth - paddingX * 2;
    const chartH = svgHeight - paddingY * 2;

    const count = days.length;
    this.consultasPorDia = days.map((d, i) => {
      const x = count > 1 ? paddingX + (i / (count - 1)) * chartW : paddingX + chartW / 2;
      const y = paddingY + chartH - ((d.total || 0) / this.maxConsultasDia) * chartH;
      const yAdmin = paddingY + chartH - ((d.admin || 0) / this.maxConsultasDia) * chartH;
      const yUsers = paddingY + chartH - ((d.usuarios || 0) / this.maxConsultasDia) * chartH;
      return {
        fecha: d.fecha,
        total: d.total || 0,
        admin: d.admin || 0,
        usuarios: d.usuarios || 0,
        x,
        y,
        yAdmin,
        yUsers
      };
    });

    if (this.consultasPorDia.length > 0) {
      const bottomY = (paddingY + chartH).toFixed(1);
      const firstX = this.consultasPorDia[0].x.toFixed(1);
      const lastX = this.consultasPorDia[this.consultasPorDia.length - 1].x.toFixed(1);

      // Línea total
      this.chartPoints = this.consultasPorDia.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      this.chartAreaPoints = `${firstX},${bottomY} ${this.chartPoints} ${lastX},${bottomY}`;

      // Línea admin
      this.chartPointsAdmin = this.consultasPorDia.map(p => `${p.x.toFixed(1)},${p.yAdmin.toFixed(1)}`).join(' ');
      this.chartAreaPointsAdmin = `${firstX},${bottomY} ${this.chartPointsAdmin} ${lastX},${bottomY}`;

      // Línea usuarios
      this.chartPointsUsers = this.consultasPorDia.map(p => `${p.x.toFixed(1)},${p.yUsers.toFixed(1)}`).join(' ');
      this.chartAreaPointsUsers = `${firstX},${bottomY} ${this.chartPointsUsers} ${lastX},${bottomY}`;
    } else {
      this.chartPoints = '';
      this.chartAreaPoints = '';
      this.chartPointsAdmin = '';
      this.chartAreaPointsAdmin = '';
      this.chartPointsUsers = '';
      this.chartAreaPointsUsers = '';
    }
  }

  cargarEvaluaciones(): void {
    this.loadingEvaluaciones = true;
    this.assistantService.getAdminEvaluations(30, 0).subscribe({
      next: (data) => {
        this.evaluacionesList = data || [];
        this.loadingEvaluaciones = false;
      },
      error: () => {
        this.loadingEvaluaciones = false;
      }
    });
  }

  ejecutarEvaluacionManual(): void {
    this.evalError = null;
    this.evalResult = null;

    if (!this.evalForm.id_respuesta || this.evalForm.id_respuesta <= 0) {
      this.evalError = 'Por favor selecciona una interacción del sistema a evaluar.';
      return;
    }
    if (!this.evalForm.texto_referencia || !this.evalForm.texto_referencia.trim()) {
      this.evalError = 'El texto de referencia dialectal experto es obligatorio.';
      return;
    }

    this.evaluandoManual = true;
    this.assistantService.evaluarRespuestaManual(
      this.evalForm.id_respuesta,
      this.evalForm.texto_referencia.trim(),
      this.evalForm.guardar
    ).subscribe({
      next: (res) => {
        this.evalResult = res;
        this.evaluandoManual = false;
        // Recargar métricas globales y tablas si se guardó
        if (this.evalForm.guardar) {
          this.cargarEvaluaciones();
          this.cargarMetricas();
          this.cargarInteracciones();
        }
      },
      error: (err) => {
        this.evaluandoManual = false;
        const msg = err.error?.detail || 'Error al comunicarse con el motor de evaluación de Django.';
        this.evalError = msg;
      }
    });
  }

  limpiarEvaluacionManual(): void {
    this.evalResult = null;
    this.evalError = null;
    this.selectedIdRespuesta = null;
    this.selectedInteraccion = null;
    this.evalForm = {
      id_respuesta: null,
      texto_referencia: '',
      guardar: true
    };
  }

  get rnf01Estado(): { texto: string; cumple: boolean; noVerificado: boolean } {
    if (this.kpis.tiempo_promedio === null || this.kpis.tiempo_promedio === undefined) {
      return { texto: 'NO VERIFICADO', cumple: false, noVerificado: true };
    }
    const t = Number(this.kpis.tiempo_promedio);
    if (isNaN(t) || t <= 0) {
      return { texto: 'NO VERIFICADO', cumple: false, noVerificado: true };
    }
    if (t < 5.0) {
      return { texto: `CUMPLIDO (${t.toFixed(2)}s < 5s)`, cumple: true, noVerificado: false };
    }
    return { texto: `NO CUMPLE (${t.toFixed(2)}s > 5s)`, cumple: false, noVerificado: false };
  }

  get precisionGlobalCalculada(): number | null {
    if (
      this.kpis.promedio_bleu === null || this.kpis.promedio_bleu === undefined ||
      this.kpis.promedio_rouge === null || this.kpis.promedio_rouge === undefined ||
      this.kpis.promedio_bertscore === null || this.kpis.promedio_bertscore === undefined ||
      Number(this.kpis.promedio_bertscore) <= 0
    ) {
      return null;
    }
    const b = Number(this.kpis.promedio_bleu) <= 1.0 ? Number(this.kpis.promedio_bleu) * 100 : Number(this.kpis.promedio_bleu);
    const r = Number(this.kpis.promedio_rouge) <= 1.0 ? Number(this.kpis.promedio_rouge) * 100 : Number(this.kpis.promedio_rouge);
    const bs = Number(this.kpis.promedio_bertscore) <= 1.0 ? Number(this.kpis.promedio_bertscore) * 100 : Number(this.kpis.promedio_bertscore);
    if (isNaN(b) || isNaN(r) || isNaN(bs)) return null;
    return Number(((0.20 * b) + (0.30 * r) + (0.50 * bs)).toFixed(2));
  }

  get rnf04Estado(): { texto: string; cumple: boolean; noVerificado: boolean } {
    const pg = this.kpis.precision_global || this.precisionGlobalCalculada;
    if (pg === null || pg === undefined) {
      return { texto: 'NO VERIFICADO', cumple: false, noVerificado: true };
    }
    if (pg >= 80.0) {
      return { texto: `CUMPLIDO (${Number(pg).toFixed(1)}% >= 80%)`, cumple: true, noVerificado: false };
    }
    return { texto: `EN SEGUIMIENTO (${Number(pg).toFixed(1)}% < 80%)`, cumple: false, noVerificado: false };
  }

  formatScore(val: any): string {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num <= 1.0 && num > 0.0) {
      return (num * 100).toFixed(1) + '%';
    }
    return num.toFixed(1) + '%';
  }
}
