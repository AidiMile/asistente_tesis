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
              <h1 class="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Evaluación y Métricas de Rendimiento (PLN)</h1>
              <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-300/40 dark:border-amber-400/20">UPEC</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Monitoreo de precisión lingüística y tiempos de respuesta (Capítulo IV de Tesis)</p>
          </div>
          <button (click)="recargarTodo()" class="btn-primary py-2 px-4 text-xs font-semibold shadow-sm flex items-center gap-2">
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

        <!-- KPI Cards Grid (Original conservado) -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          
          <div class="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm transition-colors">
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
              <span class="font-medium">BLEU Score Promedio</span>
              <i class="bi bi-bullseye text-emerald-600 dark:text-emerald-400"></i>
            </div>
            <div class="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{{ formatScore(kpis.promedio_bleu) }}</div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Similitud con estándares humanos (&gt; 0.80 cumple)</p>
          </div>

          <div class="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm transition-colors">
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
              <span class="font-medium">ROUGE-L Promedio</span>
              <i class="bi bi-intersect text-sky-600 dark:text-sky-400"></i>
            </div>
            <div class="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">{{ formatScore(kpis.promedio_rouge) }}</div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Coherencia y cobertura semántica</p>
          </div>

          <div class="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm transition-colors">
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
              <span class="font-medium">BERTScore Estimado</span>
              <i class="bi bi-cpu text-purple-600 dark:text-purple-400"></i>
            </div>
            <div class="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">{{ formatScore(kpis.promedio_bertscore) }}</div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Alineación contextual dialectal</p>
          </div>

          <div class="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm transition-colors">
            <div class="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
              <span class="font-medium">Latencia Inferencia</span>
              <i class="bi bi-speedometer2 text-amber-600 dark:text-amber-400"></i>
            </div>
            <div class="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{{ kpis.tiempo_promedio }}s</div>
            <p class="text-[11px] mt-2 font-medium" [ngClass]="rnf01Estado.cumple ? 'text-emerald-600 dark:text-emerald-400' : (rnf01Estado.noVerificado ? 'text-slate-400' : 'text-rose-600 dark:text-rose-400')">
              RNF01: {{ rnf01Estado.cumple ? 'Meta < 5s lograda' : (rnf01Estado.noVerificado ? 'No verificado' : 'Meta < 5s no alcanzada') }}
            </p>
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

        <!-- MÓDULO 1: Gráfico Temporal de Consultas por Día (Últimos 14 días) -->
        <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4 transition-colors mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <i class="bi bi-graph-up text-sky-600 dark:text-sky-400 text-lg"></i>
                <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Actividad de Consultas (Últimos 14 días)</h3>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Inferencia y procesamiento de dialecto ecuatoriano registrado en el backend</p>
            </div>
            <span class="px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-xs font-semibold self-start sm:self-auto border border-sky-500/20">
              {{ totalConsultasPeriodo }} consultas procesadas
            </span>
          </div>

          <!-- SVG Responsive Chart -->
          <div class="pt-2">
            <div *ngIf="loadingStats" class="h-44 flex items-center justify-center text-xs text-slate-400">
              <i class="bi bi-arrow-repeat animate-spin mr-2"></i> Cargando estadísticas temporales...
            </div>

            <div *ngIf="!loadingStats && consultasPorDia.length === 0" class="h-44 flex items-center justify-center text-xs text-slate-400">
              Sin actividad registrada en los últimos 14 días.
            </div>

            <div *ngIf="!loadingStats && consultasPorDia.length > 0" class="w-full overflow-x-auto">
              <div class="min-w-[600px] h-48 relative">
                <svg viewBox="0 0 800 160" class="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
                      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.0" />
                    </linearGradient>
                  </defs>

                  <!-- Horizontal Grid Lines -->
                  <line x1="40" y1="20" x2="760" y2="20" stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-dasharray="3 3" />
                  <line x1="40" y1="80" x2="760" y2="80" stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-dasharray="3 3" />
                  <line x1="40" y1="140" x2="760" y2="140" stroke="currentColor" class="text-slate-200 dark:text-slate-800" />

                  <!-- Area Fill -->
                  <polygon [attr.points]="chartAreaPoints" fill="url(#chartGradient)" />

                  <!-- Line Chart -->
                  <polyline [attr.points]="chartPoints" fill="none" class="stroke-sky-600 dark:stroke-sky-400" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

                  <!-- Dots and Values -->
                  <g *ngFor="let p of consultasPorDia">
                    <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4.5" class="fill-white dark:fill-slate-900 stroke-sky-600 dark:stroke-sky-400" stroke-width="2.5" />
                    <text [attr.x]="p.x" [attr.y]="p.y - 8" text-anchor="middle" class="fill-slate-700 dark:fill-slate-300 font-mono text-[10px] font-bold">
                      {{ p.total }}
                    </text>
                    <text [attr.x]="p.x" y="156" text-anchor="middle" class="fill-slate-400 font-mono text-[9px]">
                      {{ p.fecha | slice:5 }}
                    </text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- MÓDULO 2: Formulario de Evaluación Manual contra Referencia Humana -->
        <div class="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4 transition-colors mb-8">
          <div class="flex items-center gap-2">
            <i class="bi bi-pencil-square text-emerald-600 dark:text-sky-400 text-lg"></i>
            <div>
              <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Evaluación Lingüística Manual contra Texto de Referencia</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Calcula BLEU, ROUGE-L y BERTScore comparando una inferencia generada con el estándar dialectal</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <!-- ID de respuesta -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ID de Respuesta en Base de Datos:
              </label>
              <input
                type="number"
                min="1"
                [(ngModel)]="evalForm.id_respuesta"
                placeholder="Ej. 1, 2, 3..."
                class="w-full bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)] text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-sky-400 transition-colors"
              />
            </div>

            <!-- Interruptor de Guardado en BD -->
            <div class="md:col-span-2 flex flex-col justify-end">
              <label class="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border-color)]">
                <input
                  type="checkbox"
                  [(ngModel)]="evalForm.guardar"
                  class="rounded text-emerald-600 dark:text-sky-500 focus:ring-0 w-4 h-4"
                />
                <div class="text-xs">
                  <span class="font-semibold text-slate-800 dark:text-slate-200">Guardar resultado en PostgreSQL</span>
                  <span class="block text-[11px] text-slate-500 dark:text-slate-400">
                    {{ evalForm.guardar ? 'Activado: el resultado actualizará la base de datos de producción.' : 'Desactivado (Recomendado): cálculo seguro en memoria sin modificar registros.' }}
                  </span>
                </div>
              </label>
            </div>

            <!-- Texto de Referencia -->
            <div class="md:col-span-3">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Texto de Referencia Humana (Estándar dialectal experto):
              </label>
              <textarea
                rows="3"
                [(ngModel)]="evalForm.texto_referencia"
                placeholder="Ingrese la respuesta ideal esperada con el vocabulario dialectal correcto..."
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
                *ngIf="evalResult"
                (click)="limpiarEvaluacionManual()"
                class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                Limpiar
              </button>
              <button
                (click)="ejecutarEvaluacionManual()"
                [disabled]="evaluandoManual"
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
                {{ evalResult.persistido ? 'Guardado en PostgreSQL' : 'Cálculo en memoria (Sin cambios en BD)' }}
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
                  {{ evalResult.precision_global !== null ? evalResult.precision_global + '%' : 'No calculable' }}
                </span>
              </div>
            </div>

            <!-- Mensaje y Advertencia Parcial -->
            <div *ngIf="evalResult.tipo_evaluacion === 'parcial'" class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
              <p class="font-semibold"><i class="bi bi-info-circle mr-1"></i> Restricción Científica RNF04:</p>
              <p class="mt-0.5">
                Al carecer de BERTScore semántico, no se puede calcular la precisión global ni certificar el cumplimiento del umbral del 80%.
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
    tiempo_promedio: 1.34,
    total_consultas: 48,
    total_modismos: 23,
    bertscore_disponible: false
  };

  regiones: any[] = [
    { region: 'Sierra / Carchi', total: 11 },
    { region: 'Sierra General / Pichincha', total: 6 },
    { region: 'Costa / Guayas', total: 4 },
    { region: 'Nacional', total: 2 }
  ];

  // Gráfico temporal de actividad (14 días)
  consultasPorDia: Array<{ fecha: string; total: number; x: number; y: number }> = [];
  chartPoints: string = '';
  chartAreaPoints: string = '';
  maxConsultasDia: number = 1;
  totalConsultasPeriodo: number = 0;
  loadingStats: boolean = false;

  // Evaluaciones históricas
  evaluacionesList: any[] = [];
  loadingEvaluaciones: boolean = false;

  // Formulario de evaluación manual
  evalForm: EvalManualForm = {
    id_respuesta: null,
    texto_referencia: '',
    guardar: false // Por defecto desactivado (modo prueba seguro en memoria)
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
        const rawDays: Array<{ fecha: string; total: number }> = data.consultas_por_dia || [];
        this.calcularCoordenadasGrafico(rawDays);
      },
      error: () => {
        this.loadingStats = false;
      }
    });
  }

  calcularCoordenadasGrafico(days: Array<{ fecha: string; total: number }>): void {
    this.totalConsultasPeriodo = days.reduce((acc, d) => acc + (d.total || 0), 0);
    this.maxConsultasDia = Math.max(...days.map(d => d.total || 0), 4);

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
      return { fecha: d.fecha, total: d.total || 0, x, y };
    });

    if (this.consultasPorDia.length > 0) {
      this.chartPoints = this.consultasPorDia.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const firstX = this.consultasPorDia[0].x.toFixed(1);
      const lastX = this.consultasPorDia[this.consultasPorDia.length - 1].x.toFixed(1);
      const bottomY = (paddingY + chartH).toFixed(1);
      this.chartAreaPoints = `${firstX},${bottomY} ${this.chartPoints} ${lastX},${bottomY}`;
    } else {
      this.chartPoints = '';
      this.chartAreaPoints = '';
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
      this.evalError = 'Por favor ingrese un ID de respuesta numérico válido.';
      return;
    }
    if (!this.evalForm.texto_referencia || !this.evalForm.texto_referencia.trim()) {
      this.evalError = 'El texto de referencia dialectal es obligatorio.';
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
        if (this.evalForm.guardar) {
          this.cargarEvaluaciones();
          this.cargarMetricas();
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
    this.evalForm = {
      id_respuesta: null,
      texto_referencia: '',
      guardar: false
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
    const pg = this.precisionGlobalCalculada;
    if (pg === null) {
      return { texto: 'NO VERIFICADO', cumple: false, noVerificado: true };
    }
    if (pg >= 80.0) {
      return { texto: `CUMPLIDO (${pg.toFixed(1)}% >= 80%)`, cumple: true, noVerificado: false };
    }
    return { texto: `EN SEGUIMIENTO (${pg.toFixed(1)}% < 80%)`, cumple: false, noVerificado: false };
  }

  formatScore(val: any): string {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    // Si viene normalizado en escala 0.0-1.0
    if (num <= 1.0 && num > 0.0) {
      return (num * 100).toFixed(1) + '%';
    }
    return num.toFixed(1) + '%';
  }
}
