import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import { AssistantService, ChatMessage } from '../../core/services/assistant.service';
import { AudioService, DictationStatus } from '../../core/services/audio.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarService } from '../../core/services/sidebar.service';

export interface TruncationConfirmState {
  msg: ChatMessage;
  texto: string;
  consultasPosteriores: number;
  mensajesPosteriores: number;
  detail: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, MarkdownPipe],
  template: `
    <div class="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden transition-colors duration-200">
      <!-- Sidebar Modular -->
      <app-sidebar></app-sidebar>

      <!-- Main Chat Container -->
      <main
        [ngClass]="sidebarService.isCollapsed() ? 'md:ml-16' : 'md:ml-64'"
        class="flex-1 flex flex-col h-full md:h-screen relative bg-[var(--bg-main)] min-w-0 transition-all duration-300 ease-in-out">
        
        <!-- Top Bar with Model & Parameters Status -->
        <header class="min-h-14 sm:min-h-16 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)]/80 backdrop-blur-md z-10 gap-2 sm:gap-3 transition-colors duration-200">
          <div class="flex items-center gap-2 sm:gap-3 min-w-0">
            <!-- Mobile Menu Toggle Button (Drawer) -->
            <button
              type="button"
              (click)="sidebarService.toggleMobile()"
              aria-label="Abrir menú de conversaciones"
              title="Abrir menú"
              class="md:hidden w-10 h-10 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-center transition-colors shrink-0">
              <i class="bi bi-list text-2xl leading-none"></i>
            </button>

            <!-- Desktop Sidebar Collapse/Expand Toggle Button -->
            <button
              type="button"
              (click)="sidebarService.toggleCollapse()"
              [title]="sidebarService.isCollapsed() ? 'Expandir barra lateral' : 'Contraer barra lateral'"
              class="hidden md:flex w-9 h-9 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-slate-600 dark:text-slate-300 border border-[var(--border-color)] items-center justify-center transition-colors">
              <i [class]="sidebarService.isCollapsed() ? 'bi bi-layout-sidebar' : 'bi bi-layout-sidebar-inset'" class="text-sm"></i>
            </button>

            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 sm:gap-2">
                <h2 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">Asistente Virtual PLN-EC</h2>
                <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-300/40 dark:border-amber-400/20 shrink-0">UPEC</span>
              </div>
              <p class="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">Motor local · Español ecuatoriano</p>
            </div>
          </div>

          <!-- Parameter Toggle & Action Buttons -->
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <!-- Theme Toggle Button -->
            <button
              (click)="toggleTheme()"
              [title]="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
              aria-label="Cambiar tema visual"
              class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-slate-600 dark:text-slate-300 border border-[var(--border-color)] flex items-center justify-center transition-colors">
              <i [class]="isDark ? 'bi bi-moon-stars-fill text-amber-400' : 'bi bi-sun-fill text-amber-500'" class="text-sm sm:text-base"></i>
            </button>

            <!-- New Conversation Button -->
            <button
              (click)="newConversation()"
              [disabled]="isGenerating || isSavingEdit"
              title="Nueva conversación"
              aria-label="Nueva conversación"
              class="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all">
              <i class="bi bi-plus-lg text-sm"></i>
              <span class="hidden sm:inline">Nueva conversación</span>
            </button>

            <!-- Parameter Toggle Button (RF07) -->
            <button
              *ngIf="isAdmin"
              (click)="showSettings = !showSettings" 
              title="Ajustar parámetros (Solo Administrador)"
              aria-label="Ajustar parámetros"
              class="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-xs text-emerald-700 dark:text-emerald-400 border border-[var(--border-color)] flex items-center gap-1.5 transition-colors">
              <i class="bi bi-sliders2"></i>
              <span class="hidden sm:inline">Parámetros</span>
            </button>
          </div>
        </header>

        <!-- Floating Parameters Settings Drawer (RF07) -->
        <div *ngIf="isAdmin && showSettings" class="absolute top-18 right-4 sm:right-8 w-80 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl z-20 transition-all">
          <div class="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Control de Parámetros (RF07)</h3>
            <button (click)="showSettings = false" aria-label="Cerrar panel de parámetros" class="text-slate-400 hover:text-slate-700 dark:hover:text-white"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="space-y-4 pt-4 text-xs">
            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-600 dark:text-slate-300">Temperatura (Creatividad):</span>
                <span class="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{{ temperatura }}</span>
              </div>
              <input type="range" [(ngModel)]="temperatura" min="0.1" max="1.2" step="0.05" class="w-full accent-emerald-600 dark:accent-emerald-400 cursor-pointer">
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-600 dark:text-slate-300">Top-P (Muestreo Núcleo):</span>
                <span class="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{{ topP }}</span>
              </div>
              <input type="range" [(ngModel)]="topP" min="0.1" max="1.0" step="0.05" class="w-full accent-emerald-600 dark:accent-emerald-400 cursor-pointer">
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-600 dark:text-slate-300">Longitud Máxima (Tokens):</span>
                <span class="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{{ maxTokens }}</span>
              </div>
              <input type="range" [(ngModel)]="maxTokens" min="50" max="500" step="10" class="w-full accent-emerald-600 dark:accent-emerald-400 cursor-pointer">
            </div>
          </div>
        </div>

        <!-- Chat Scroll Area -->
        <div #scrollContainer class="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          
          <!-- Empty State Greeting -->
          <div *ngIf="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto my-auto py-6">
            <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl sm:text-3xl mb-4 shadow-xs">
              <i class="bi bi-chat-quote-fill"></i>
            </div>
            
            <h3 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
              ¡Hola {{ userName }}! Escríbeme, dicta o envía un audio.
            </h3>
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed mb-6">
              Prueba: <span class="text-emerald-700 dark:text-emerald-300 font-medium">"¿Qué significa achachay?"</span> o <span class="text-emerald-700 dark:text-emerald-300 font-medium">"Redacta un resumen sobre las regiones del Ecuador"</span>.
            </p>

            <!-- Quick Suggestion Badges -->
            <div class="flex flex-wrap gap-2 justify-center">
              <button 
                *ngFor="let suggestion of suggestions" 
                (click)="applySuggestion(suggestion)"
                class="px-3.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-xs text-slate-700 dark:text-slate-300 border border-[var(--border-color)] hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-xs transition-all flex items-center gap-2">
                <i class="bi bi-chat-dots text-emerald-600 dark:text-emerald-400"></i>
                <span>{{ suggestion }}</span>
              </button>
            </div>
          </div>

          <!-- Chat Messages Thread -->
          <div *ngFor="let msg of messages; let i = index" class="flex flex-col space-y-2">
            <!-- User Message -->
            <div *ngIf="msg.sender === 'user'" class="flex flex-col items-end space-y-1.5">
              <div class="group flex items-end justify-end gap-1.5 sm:gap-2 w-full">
                <!-- Discreet Edit Button (User messages with persisted ID) -->
                <button
                  *ngIf="msg.id && editingMessageId !== msg.id"
                  type="button"
                  (click)="startEdit(msg)"
                  [disabled]="isGenerating || isSavingEdit"
                  title="Editar consulta"
                  aria-label="Editar mensaje"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300 hover:bg-emerald-500/10 dark:hover:bg-emerald-400/10 border border-transparent hover:border-emerald-500/20 opacity-85 md:opacity-65 md:group-hover:opacity-100 focus-visible:opacity-100 transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                  <i class="bi bi-pencil text-xs sm:text-sm"></i>
                </button>

                <!-- User Bubble (Read mode OR Inline Edit mode) -->
                <div
                  [ngClass]="editingMessageId === msg.id ? 'w-full sm:max-w-xl ring-2 ring-amber-400/70' : 'max-w-[calc(100%-2.75rem)] sm:max-w-xl'"
                  class="bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-700 dark:to-teal-800 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl rounded-tr-xs shadow-xs transition-all">
                  
                  <!-- Read Mode -->
                  <ng-container *ngIf="editingMessageId !== msg.id">
                    <p class="text-[13.5px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{{ msg.text }}</p>
                    <span class="block text-[10px] text-emerald-100/90 mt-1 text-right font-medium">{{ msg.timestamp | date:'shortTime' }}</span>
                  </ng-container>

                  <!-- Inline Edit Mode -->
                  <ng-container *ngIf="editingMessageId === msg.id">
                    <div class="space-y-2.5">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-[11px] font-semibold text-amber-200 flex items-center gap-1.5">
                          <i class="bi bi-pencil-square"></i>
                          <span>Editando consulta</span>
                        </span>
                        <span class="text-[10px] font-mono text-emerald-100/85">
                          {{ editingText.trim().length }}/1000
                        </span>
                      </div>

                      <textarea
                        [(ngModel)]="editingText"
                        [name]="'editMessage_' + msg.id"
                        rows="3"
                        maxlength="1000"
                        [disabled]="isSavingEdit"
                        (keydown.escape)="!isSavingEdit && cancelEdit()"
                        (keydown.control.enter)="saveEdit(msg)"
                        placeholder="Escribe el texto corregido de tu consulta..."
                        aria-label="Editar texto de consulta"
                        class="w-full rounded-xl bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 border border-emerald-200/80 dark:border-emerald-500/40 px-3 py-2 text-[13.5px] sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner placeholder:text-slate-400 resize-y min-h-[76px] disabled:opacity-70"></textarea>

                      <!-- Inline Error Banner (preserves messages and draft) -->
                      <div
                        *ngIf="editErrorMessage"
                        role="alert"
                        class="rounded-xl bg-rose-950/70 border border-rose-300/40 text-rose-100 px-3 py-2 text-xs flex items-start gap-2">
                        <i class="bi bi-exclamation-circle-fill text-amber-300 shrink-0 mt-0.5"></i>
                        <span class="leading-snug">{{ editErrorMessage }}</span>
                      </div>

                      <!-- Processing Indicator while regenerating -->
                      <div
                        *ngIf="isSavingEdit"
                        class="rounded-xl bg-black/20 border border-white/15 px-3 py-2 flex items-center gap-2.5 text-xs text-emerald-50">
                        <div class="flex items-center gap-1" aria-hidden="true">
                          <span class="typing-dot"></span>
                          <span class="typing-dot"></span>
                          <span class="typing-dot"></span>
                        </div>
                        <span class="font-medium">Regenerando respuesta...</span>
                      </div>

                      <!-- Inline Actions: Cancelar / Guardar -->
                      <div class="flex items-center justify-end gap-2 pt-0.5">
                        <button
                          type="button"
                          (click)="cancelEdit()"
                          [disabled]="isSavingEdit"
                          class="px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-medium bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-colors disabled:opacity-45 disabled:cursor-not-allowed">
                          Cancelar
                        </button>
                        <button
                          type="button"
                          (click)="saveEdit(msg)"
                          [disabled]="isSavingEdit || !editingText.trim() || editingText.trim().length > 1000"
                          class="px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                          <i [class]="isSavingEdit ? 'bi bi-arrow-repeat animate-spin' : 'bi bi-check2-circle'"></i>
                          <span>{{ isSavingEdit ? 'Guardando...' : 'Guardar' }}</span>
                        </button>
                      </div>
                    </div>
                  </ng-container>
                </div>
              </div>
            </div>

            <!-- Assistant Message -->
            <div *ngIf="msg.sender === 'assistant'" class="flex justify-start items-start gap-2.5 sm:gap-3">
              <div 
                [class]="isFailedMessage(msg) ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/30' : 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-800/40'"
                class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center text-xs sm:text-sm shrink-0 mt-0.5 shadow-xs transition-colors">
                <i [class]="isFailedMessage(msg) ? 'bi bi-exclamation-triangle-fill' : 'bi bi-robot'"></i>
              </div>
              <div 
                [class]="isFailedMessage(msg) ? 'border-rose-300/80 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10' : 'border-[var(--border-color)] bg-[var(--bg-card)]'"
                class="max-w-2xl w-full border p-3.5 sm:p-5 rounded-2xl rounded-tl-xs shadow-xs space-y-2.5 sm:space-y-3 transition-colors">
                
                <!-- Markdown Content Rendered -->
                <div class="markdown-content text-[13.5px] sm:text-sm text-slate-800 dark:text-slate-100" [innerHTML]="msg.text | markdown"></div>

                <!-- Ecuadorian Modisms Detected Tag (RF04 / RF05) -->
                <div *ngIf="msg.modismos && msg.modismos.length > 0 && !isFailedMessage(msg)" class="pt-2 border-t border-[var(--border-color)] flex flex-wrap gap-1.5 items-center">
                  <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <i class="bi bi-tag-fill text-emerald-600 dark:text-emerald-400 text-[10px]"></i>
                    Modismos detectados:
                  </span>
                  <span *ngFor="let m of msg.modismos" class="badge-modismo" [title]="m.significado">
                    <i class="bi bi-check2-circle text-[11px]"></i>
                    {{ m.nombre }} <span class="text-[10px] opacity-75">({{ m.region }})</span>
                  </span>
                </div>

                <!-- Footer: Latency, NLP Metrics & Copy Action -->
                <div class="pt-2 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2">
                  <!-- Case 1: Failed Request / Timeout -->
                  <div *ngIf="isFailedMessage(msg)" class="flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                      <i class="bi bi-exclamation-triangle-fill text-rose-500"></i>
                      <span>Solicitud fallida: {{ msg.metricas.motivo_error || 'Tiempo de espera agotado' }}</span>
                    </span>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700" title="Tiempo de espera registrado antes del fallo">
                      <i class="bi bi-stopwatch"></i>
                      <span>{{ msg.metricas.tiempo_respuesta }}s</span>
                    </span>
                  </div>

                  <!-- Case 2: Valid Generated Response with NLP Quality Metrics -->
                  <div *ngIf="!isFailedMessage(msg) && msg.metricas" class="flex flex-wrap gap-1.5 text-[11px] font-mono items-center">
                    <span *ngIf="msg.metricas.bleu !== null && msg.metricas.bleu !== undefined" class="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                      BLEU: {{ msg.metricas.bleu }}
                    </span>
                    <span *ngIf="msg.metricas.rouge !== null && msg.metricas.rouge !== undefined" class="flex items-center gap-1 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                      ROUGE: {{ msg.metricas.rouge }}
                    </span>
                    <span *ngIf="msg.metricas.bertscore !== null && msg.metricas.bertscore !== undefined" class="flex items-center gap-1 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-500/20">
                      BERTScore: {{ msg.metricas.bertscore }}
                    </span>
                    <span class="flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-medium">
                      <i class="bi bi-stopwatch text-slate-400"></i> {{ msg.metricas.tiempo_respuesta }}s
                    </span>
                  </div>

                  <!-- Discrete Copy Button with visual feedback (touch target >= 36px) -->
                  <button
                    type="button"
                    (click)="copyMessage(msg.text, i)"
                    [title]="copiedIndex === i ? '¡Copiado al portapapeles!' : 'Copiar respuesta'"
                    [attr.aria-label]="copiedIndex === i ? 'Respuesta copiada' : 'Copiar respuesta del asistente'"
                    class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-[var(--border-color)] transition-all ml-auto shrink-0 select-none">
                    <i [class]="copiedIndex === i ? 'bi bi-check2 text-emerald-600 dark:text-emerald-400 font-bold' : 'bi bi-clipboard'"></i>
                    <span class="text-[11px] font-medium" [class.text-emerald-600]="copiedIndex === i" [class.dark:text-emerald-400]="copiedIndex === i">
                      {{ copiedIndex === i ? '¡Copiado!' : 'Copiar' }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading State Bubble with 3 animated dots (Typing Indicator) -->
          <div *ngIf="isGenerating" class="flex justify-start items-start gap-2.5 sm:gap-3 py-1">
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-800/40 flex items-center justify-center text-xs sm:text-sm shrink-0 mt-0.5 shadow-xs">
              <i class="bi bi-robot"></i>
            </div>
            <div class="border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs flex items-center gap-3">
              <div class="flex items-center gap-1.5" aria-hidden="true">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
              </div>
              <span class="text-xs text-slate-600 dark:text-slate-300 font-medium">Formulando respuesta...</span>
            </div>
          </div>

        </div>

        <!-- Chat Input Bar -->
        <div class="p-3 sm:p-4 bg-[var(--bg-main)] border-t border-[var(--border-color)] transition-colors">
          <div class="max-w-4xl mx-auto space-y-2">

            <!-- Indicador discreto de escucha activa y botón Detener -->
            <div
              *ngIf="isRecording"
              role="status"
              aria-live="polite"
              class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-700/50 text-xs">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" aria-hidden="true"></span>
                <div class="min-w-0">
                  <span class="font-semibold text-emerald-800 dark:text-emerald-300">
                    Escuchando ({{ dictationLang }})...
                  </span>
                  <span class="hidden sm:inline text-slate-600 dark:text-slate-300 ml-1.5">
                    Revisa o edita el texto antes de enviarlo.
                  </span>
                </div>
              </div>
              <button
                type="button"
                (click)="stopDictation()"
                [disabled]="isGenerating || isSavingEdit || editingMessageId !== null || truncationConfirmState !== null"
                aria-label="Detener escucha"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors flex items-center gap-1 shrink-0 disabled:opacity-45">
                <i class="bi bi-stop-fill"></i>
                <span>Detener</span>
              </button>
            </div>

            <!-- Mensaje breve ante error o permiso denegado / navegador incompatible -->
            <div
              *ngIf="!isRecording && dictationErrorMessage"
              role="alert"
              class="flex items-start justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-300/70 dark:border-amber-600/40 text-xs text-amber-900 dark:text-amber-200">
              <div class="flex items-start gap-2 min-w-0">
                <i class="bi bi-exclamation-triangle-fill text-amber-500 shrink-0 mt-0.5"></i>
                <span class="leading-snug break-words">{{ dictationErrorMessage }}</span>
              </div>
              <button
                type="button"
                (click)="dismissDictationError()"
                aria-label="Cerrar aviso de dictado"
                class="text-amber-700 dark:text-amber-300 hover:opacity-75 p-0.5 shrink-0">
                <i class="bi bi-x-lg text-[11px]"></i>
              </button>
            </div>

            <!-- Aviso discreto para revisar antes de enviar -->
            <div
              *ngIf="!isRecording && !dictationErrorMessage && hasDictatedDraft && inputText.trim()"
              role="status"
              class="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300">
              <div class="flex items-center gap-1.5 min-w-0">
                <i class="bi bi-check2-circle shrink-0"></i>
                <span class="truncate sm:whitespace-normal">Texto dictado listo: puedes revisarlo o corregirlo antes de enviarlo.</span>
              </div>
              <button
                type="button"
                (click)="hasDictatedDraft = false"
                aria-label="Ocultar aviso de revisión"
                class="opacity-70 hover:opacity-100 p-0.5 shrink-0">
                <i class="bi bi-x text-sm leading-none"></i>
              </button>
            </div>

            <form (ngSubmit)="sendMessage()" class="relative flex items-center gap-2">
              <div class="relative flex-1 min-w-0">
                <input
                  #chatInputEl
                  type="text"
                  [(ngModel)]="inputText"
                  (input)="onChatInputManualEdit()"
                  name="chatInput"
                  [placeholder]="isRecording ? 'Escuchando... las palabras aparecerán aquí' : 'Escribe tu consulta...'"
                  [disabled]="isGenerating || isSavingEdit"
                  class="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-slate-900 dark:text-white pl-4 pr-12 sm:pl-5 sm:pr-14 py-3 sm:py-3.5 rounded-2xl text-[13.5px] sm:text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all placeholder:text-slate-400"
                />

                <!-- Dictation Voice Button (RF03 / Etapa 7C) -->
                <div class="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2">
                  <button
                    type="button"
                    (click)="toggleDictation()"
                    [disabled]="isGenerating || isSavingEdit || editingMessageId !== null || truncationConfirmState !== null"
                    [class.mic-recording]="isRecording"
                    [class.opacity-50]="!isSpeechSupported && !isRecording"
                    [attr.aria-pressed]="isRecording"
                    [title]="getMicButtonTitle()"
                    [attr.aria-label]="getMicButtonAriaLabel()"
                    class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <i [class]="isRecording ? 'bi bi-stop-fill text-white text-base' : (isSpeechSupported ? 'bi bi-mic text-lg' : 'bi bi-mic-mute text-lg')"></i>
                  </button>
                </div>
              </div>

              <!-- Send Button (touch target >= 44x44px) -->
              <button
                type="submit"
                [disabled]="!inputText.trim() || isGenerating || isSavingEdit"
                aria-label="Enviar mensaje"
                class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-md shadow-emerald-600/20 shrink-0">
                <i class="bi bi-send-fill text-base sm:text-lg"></i>
              </button>
            </form>

            <!-- Estado discreto de micrófono e información de compatibilidad -->
            <div class="flex items-center justify-between gap-2 px-1 text-[11px] text-slate-400 dark:text-slate-500">
              <span *ngIf="!isRecording && isSpeechSupported" class="flex items-center gap-1.5 truncate">
                <i class="bi bi-mic text-[10px] shrink-0"></i>
                <span class="truncate">Micrófono inactivo · El dictado puede requerir conexión según el navegador</span>
              </span>
              <span *ngIf="!isRecording && !isSpeechSupported" class="flex items-center gap-1.5 truncate text-amber-600/90 dark:text-amber-400/80">
                <i class="bi bi-mic-mute text-[10px] shrink-0"></i>
                <span class="truncate">Reconocimiento de voz no compatible en este navegador</span>
              </span>
              <span *ngIf="isRecording" class="flex items-center gap-1.5 truncate text-emerald-700 dark:text-emerald-400 font-medium">
                <i class="bi bi-soundwave text-xs shrink-0"></i>
                <span class="truncate">Transcripción en vivo activa · Detén la escucha cuando termines</span>
              </span>
            </div>

          </div>
        </div>

      </main>

      <!-- Modal institucional de confirmación de truncado al editar mensaje intermedio -->
      <div
        *ngIf="truncationConfirmState"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editTruncationModalTitle"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        (click)="cancelTruncationConfirm()">
        <div
          class="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-5 shadow-2xl space-y-4"
          (click)="$event.stopPropagation()">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/30 flex items-center justify-center text-lg shrink-0">
              <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 id="editTruncationModalTitle" class="text-sm font-bold text-slate-900 dark:text-white">
                  ¿Confirmar edición y truncado?
                </h3>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300 border border-amber-300/40 dark:border-amber-400/20">
                  UPEC
                </span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                Al guardar cambios en esta consulta intermedia, se eliminarán
                <strong class="text-amber-700 dark:text-amber-300">
                  {{ truncationConfirmState.mensajesPosteriores }}
                  {{ truncationConfirmState.mensajesPosteriores === 1 ? 'mensaje posterior' : 'mensajes posteriores' }}
                </strong>
                ({{ truncationConfirmState.consultasPosteriores }}
                {{ truncationConfirmState.consultasPosteriores === 1 ? 'consulta y su respuesta' : 'consultas y sus respuestas' }})
                para regenerar la respuesta con el historial coherente.
              </p>
            </div>
          </div>

          <div class="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3 text-xs text-slate-700 dark:text-slate-300">
            <span class="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
              Consulta editada
            </span>
            <p class="whitespace-pre-wrap break-words max-h-24 overflow-y-auto">{{ truncationConfirmState.texto }}</p>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              (click)="cancelTruncationConfirm()"
              [disabled]="isSavingEdit"
              class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button
              type="button"
              (click)="confirmTruncationAndSave()"
              [disabled]="isSavingEdit"
              class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50">
              <i *ngIf="isSavingEdit" class="bi bi-arrow-repeat animate-spin"></i>
              <span>{{ isSavingEdit ? 'Procesando...' : 'Confirmar y regenerar' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('chatInputEl') private chatInputEl?: ElementRef<HTMLInputElement>;

  inputText: string = '';
  isGenerating: boolean = false;
  isRecording: boolean = false;
  isSpeechSupported: boolean = true;
  dictationStatus: DictationStatus = 'idle';
  dictationLang: string = 'es-EC';
  dictationErrorMessage: string | null = null;
  hasDictatedDraft: boolean = false;
  showSettings: boolean = false;
  copiedIndex: number | null = null;

  editingMessageId: number | null = null;
  editingText: string = '';
  isSavingEdit: boolean = false;
  editErrorMessage: string | null = null;
  truncationConfirmState: TruncationConfirmState | null = null;

  temperatura: number = 0.7;
  topP: number = 0.9;
  maxTokens: number = 200;

  suggestions: string[] = [
    "¿Qué significa achachay?",
    "Tengo chuchaqui, ¿qué me recomiendas?",
    "Redacta un resumen sobre las regiones del Ecuador",
    "¿Cuándo se dice 'no seas malito'?",
    "Explícame qué significa 'dar papaya'"
  ];

  messages: ChatMessage[] = [];
  conversationId?: number;
  conversationTitle: string = 'Nueva conversación';

  private subs = new Subscription();
  private editSub?: Subscription;
  private shouldScrollToBottom: boolean = false;
  private dictationBaseText: string = '';
  private dictationSessionOpen: boolean = false;
  private manualEditedAfterStop: boolean = false;

  constructor(
    private assistantService: AssistantService,
    private audioService: AudioService,
    private authService: AuthService,
    private themeService: ThemeService,
    public sidebarService: SidebarService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  get isDark(): boolean {
    return this.themeService.isDark();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  ngOnInit(): void {
    this.isSpeechSupported = this.audioService.isSupported();

    this.subs.add(
      this.audioService.state$.subscribe(state => {
        const wasListening = this.isRecording;
        this.isSpeechSupported = state.supported;
        this.dictationStatus = state.status;
        this.isRecording = state.isListening;
        this.dictationLang = state.lang;
        this.dictationErrorMessage = state.errorMessage || null;

        if (!state.supported || state.status === 'error') {
          this.dictationSessionOpen = false;
        }

        if (this.dictationSessionOpen && !this.manualEditedAfterStop && state.transcript) {
          this.inputText = this.audioService.composeWithBaseText(this.dictationBaseText, state.transcript);
          this.hasDictatedDraft = true;
          this.scrollInputToEnd();
        }

        if (!state.isListening && wasListening && state.hasResult) {
          this.hasDictatedDraft = true;
        }

        if (state.status === 'idle' && !state.isListening && this.manualEditedAfterStop) {
          this.dictationSessionOpen = false;
        }
      })
    );

    this.subs.add(
      this.route.paramMap.subscribe(params => {
        const id = Number(params.get('id'));
        if (id > 0) {
          this.loadConversation(id);
        } else {
          this.stopDictationForContextChange(true);
          this.resetEditState();
          this.conversationId = undefined;
          this.conversationTitle = 'Nueva conversación';
          this.messages = [];
        }
      })
    );

    this.subs.add(
      this.sidebarService.newConversation$.subscribe(() => {
        this.newConversation();
      })
    );
  }

  ngOnDestroy(): void {
    this.audioService.cleanup();
    this.editSub?.unsubscribe();
    this.subs.unsubscribe();
  }

  private mapApiMessages(rawMessages: any[]): ChatMessage[] {
    return (rawMessages || []).map((message: any) => ({
      ...message,
      id: message.id,
      timestamp: new Date(message.timestamp)
    }));
  }

  private resetEditState(): void {
    this.editSub?.unsubscribe();
    this.editingMessageId = null;
    this.editingText = '';
    this.isSavingEdit = false;
    this.editErrorMessage = null;
    this.truncationConfirmState = null;
  }

  loadConversation(id: number): void {
    this.stopDictationForContextChange(true);
    this.resetEditState();
    this.assistantService.getConversacion(id).subscribe({
      next: conversation => {
        this.conversationId = conversation.id_conversacion;
        this.conversationTitle = conversation.titulo;
        this.messages = this.mapApiMessages(conversation.mensajes || []);
        this.shouldScrollToBottom = true;
      },
      error: () => this.router.navigate(['/history'])
    });
  }

  newConversation(): void {
    if (this.isGenerating || this.isSavingEdit) return;
    this.stopDictationForContextChange(true);
    this.resetEditState();
    this.conversationId = undefined;
    this.conversationTitle = 'Nueva conversación';
    this.messages = [];
    this.inputText = '';
    if (this.router.url !== '/chat') {
      this.router.navigate(['/chat']);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom && !this.editingMessageId && !this.truncationConfirmState) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  get userName(): string {
    return this.authService.currentUser()?.nombre || 'Usuario';
  }

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  applySuggestion(s: string): void {
    this.stopDictationForContextChange(true);
    this.inputText = s;
    this.sendMessage();
  }

  toggleDictation(): void {
    if (this.isRecording) {
      this.stopDictation();
      return;
    }

    if (
      this.isGenerating ||
      this.isSavingEdit ||
      this.editingMessageId !== null ||
      this.truncationConfirmState !== null
    ) {
      return;
    }

    this.dictationBaseText = this.inputText;
    this.manualEditedAfterStop = false;
    this.dictationSessionOpen = true;
    this.audioService.clearError();
    this.audioService.startListening();
  }

  stopDictation(): void {
    this.audioService.stopListening();
  }

  dismissDictationError(): void {
    this.dictationErrorMessage = null;
    this.audioService.clearError();
  }

  onChatInputManualEdit(): void {
    this.manualEditedAfterStop = true;
    this.dictationSessionOpen = false;
    if (this.isRecording) {
      this.audioService.stopListening();
    }
    if (!this.inputText.trim()) {
      this.hasDictatedDraft = false;
    }
  }

  getMicButtonTitle(): string {
    if (!this.isSpeechSupported) {
      return 'Dictado por voz no compatible en este navegador';
    }
    if (this.editingMessageId !== null) {
      return 'Finaliza la edición del mensaje antes de usar el dictado';
    }
    if (this.isRecording) {
      return 'Detener escucha';
    }
    return `Dictar por voz (Español ${this.dictationLang})`;
  }

  getMicButtonAriaLabel(): string {
    if (!this.isSpeechSupported) {
      return 'Dictado por voz no disponible';
    }
    return this.isRecording ? 'Detener escucha' : 'Dictar por voz';
  }

  private stopDictationForContextChange(clearDraftBanner: boolean): void {
    this.dictationSessionOpen = false;
    if (this.isRecording) {
      this.audioService.stopListening();
    }
    this.audioService.clearError();
    if (clearDraftBanner) {
      this.hasDictatedDraft = false;
      this.dictationBaseText = '';
      this.manualEditedAfterStop = false;
    }
  }

  private scrollInputToEnd(): void {
    setTimeout(() => {
      const el = this.chatInputEl?.nativeElement;
      if (el) {
        el.scrollLeft = el.scrollWidth;
      }
    }, 0);
  }

  copyMessage(text: string, index: number): void {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.setCopiedFeedback(index);
      }).catch(() => {
        this.fallbackCopy(text, index);
      });
    } else {
      this.fallbackCopy(text, index);
    }
  }

  private setCopiedFeedback(index: number): void {
    this.copiedIndex = index;
    setTimeout(() => {
      if (this.copiedIndex === index) {
        this.copiedIndex = null;
      }
    }, 2000);
  }

  private fallbackCopy(text: string, index: number): void {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.setCopiedFeedback(index);
    } catch (err) {
      console.error('Error al copiar texto:', err);
    }
  }

  startEdit(msg: ChatMessage): void {
    if (this.isGenerating || this.isSavingEdit || !msg.id) return;
    this.stopDictationForContextChange(false);
    this.editingMessageId = msg.id;
    this.editingText = msg.text;
    this.editErrorMessage = null;
    this.truncationConfirmState = null;
  }

  cancelEdit(): void {
    if (this.isSavingEdit) return;
    this.editingMessageId = null;
    this.editingText = '';
    this.editErrorMessage = null;
    this.truncationConfirmState = null;
  }

  saveEdit(msg: ChatMessage): void {
    if (this.isGenerating || this.isSavingEdit || !msg.id) return;
    const textoEditado = this.editingText.trim();
    if (!textoEditado) {
      this.editErrorMessage = 'El texto de la consulta no puede estar vacío.';
      return;
    }
    if (textoEditado.length > 1000) {
      this.editErrorMessage = 'La consulta no puede superar los 1000 caracteres.';
      return;
    }
    this.executeEditRequest(msg, textoEditado, false);
  }

  cancelTruncationConfirm(): void {
    if (this.isSavingEdit) return;
    this.truncationConfirmState = null;
    this.cancelEdit();
  }

  confirmTruncationAndSave(): void {
    if (!this.truncationConfirmState || this.isSavingEdit || this.isGenerating) return;
    const { msg, texto } = this.truncationConfirmState;
    this.truncationConfirmState = null;
    this.executeEditRequest(msg, texto, true);
  }

  private executeEditRequest(msg: ChatMessage, textoEditado: string, confirmarTruncado: boolean): void {
    if (!msg.id || this.isSavingEdit || this.isGenerating) return;

    this.isSavingEdit = true;
    this.editErrorMessage = null;

    this.editSub?.unsubscribe();
    this.editSub = this.assistantService.editarConsulta(
      msg.id,
      textoEditado,
      confirmarTruncado,
      {
        temperatura: this.temperatura,
        top_p: this.topP,
        max_tokens: this.maxTokens
      }
    ).subscribe({
      next: (res) => {
        this.isSavingEdit = false;
        this.truncationConfirmState = null;
        this.editingMessageId = null;
        this.editingText = '';
        this.editErrorMessage = null;

        const tituloAnterior = this.conversationTitle;
        if (res?.titulo_conversacion) {
          this.conversationTitle = res.titulo_conversacion;
        }
        if (Array.isArray(res?.mensajes)) {
          this.messages = this.mapApiMessages(res.mensajes);
        }
        this.shouldScrollToBottom = true;

        if (
          (res?.titulo_conversacion && res.titulo_conversacion !== tituloAnterior) ||
          Number(res?.consultas_eliminadas || 0) > 0
        ) {
          this.sidebarService.triggerRefresh();
        }
      },
      error: (err) => {
        this.isSavingEdit = false;
        const body = err?.error || {};
        if (err?.status === 409 && body?.requiere_confirmacion) {
          this.truncationConfirmState = {
            msg,
            texto: textoEditado,
            consultasPosteriores: Number(body.consultas_posteriores ?? 0),
            mensajesPosteriores: Number(body.mensajes_posteriores ?? 0),
            detail: body.detail || 'Se eliminarán los mensajes posteriores para regenerar la respuesta.'
          };
          return;
        }
        this.editErrorMessage = this.formatEditError(err);
      }
    });
  }

  private formatEditError(err: any): string {
    const status = err?.status;
    const detail = err?.error?.detail;
    if (status === 409 && err?.error?.en_curso) {
      return detail || 'Ya existe una edición en curso para esta conversación. Espera a que finalice.';
    }
    if (status === 401) {
      return 'Tu sesión expiró. Inicia sesión nuevamente para editar mensajes.';
    }
    if (status === 404) {
      return 'No se encontró la consulta solicitada o no tienes permiso para editarla.';
    }
    if (status === 429) {
      return 'Has realizado demasiadas solicitudes seguidas. Espera unos segundos e intenta nuevamente.';
    }
    if (status === 504) {
      return 'El motor local tardó demasiado en responder (tiempo de espera agotado). Tus mensajes originales se conservan intactos.';
    }
    if (status === 503) {
      return 'El motor de procesamiento local no está disponible en este momento. Tus mensajes originales se conservan intactos.';
    }
    if (!status || status === 0) {
      return 'Error de conexión con el servidor. Tus mensajes originales se conservan intactos.';
    }
    return detail || 'No se pudo guardar la edición. Tus mensajes originales se conservan intactos.';
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.isGenerating || this.isSavingEdit) return;
    this.stopDictationForContextChange(true);

    // Agregar mensaje del usuario conservando referencia para asignar su ID real
    const userMsg: ChatMessage = {
      sender: 'user',
      text: text,
      timestamp: new Date()
    };
    this.messages.push(userMsg);

    this.inputText = '';
    this.isGenerating = true;
    this.shouldScrollToBottom = true;

    this.assistantService.generarTexto(text, {
      temperatura: this.temperatura,
      top_p: this.topP,
      max_tokens: this.maxTokens
    }, this.conversationId).subscribe({
      next: (res) => {
        this.isGenerating = false;
        if (res?.id_consulta) {
          userMsg.id = res.id_consulta;
        }
        if (!this.conversationId) {
          this.conversationId = res.id_conversacion;
          this.conversationTitle = text.slice(0, 120);
          this.router.navigate(['/chat', this.conversationId], { replaceUrl: true });
          this.sidebarService.triggerRefresh();
        }
        this.messages.push({
          id: res?.id_respuesta,
          sender: 'assistant',
          text: res.texto_generado,
          timestamp: new Date(),
          modismos: res.modismos_detectados,
          es_error: res.es_error,
          metricas: res.metricas
        });
        this.shouldScrollToBottom = true;
      },
      error: (err) => {
        this.isGenerating = false;
        this.messages.push({
          sender: 'assistant',
          text: err?.error?.detail || (err?.status === 401
            ? 'Tu sesión terminó. Inicia sesión nuevamente para continuar.'
            : 'No pude completar la consulta. El motor local no respondió a tiempo (tiempo de espera agotado).'),
          timestamp: new Date(),
          es_error: true,
          metricas: {
            bleu: null,
            rouge: null,
            bertscore: null,
            tiempo_respuesta: 90,
            es_error: true,
            estado: 'fallida',
            motivo_error: err?.status === 401 ? 'Sesión expirada' : 'Tiempo de espera agotado'
          }
        });
        this.shouldScrollToBottom = true;
      }
    });
  }

  isFailedMessage(msg: ChatMessage): boolean {
    if (msg.es_error === true || msg.metricas?.es_error === true) return true;
    if (msg.es_error === false && msg.metricas?.es_error === false) return false;
    const lower = (msg.text || '').toLowerCase();
    return lower.includes('no pudo responder a tiempo') ||
           lower.includes('tiempo de espera agotado') ||
           lower.includes('motor local no disponible') ||
           lower.includes('servicio en carga');
  }
}
