import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';
import { AssistantService, ChatMessage } from '../../core/services/assistant.service';
import { AudioService } from '../../core/services/audio.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarService } from '../../core/services/sidebar.service';

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
              title="Nueva conversación"
              aria-label="Nueva conversación"
              class="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all">
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
            <div *ngIf="msg.sender === 'user'" class="flex justify-end">
              <div class="max-w-[88%] sm:max-w-xl bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-700 dark:to-teal-800 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl rounded-tr-xs shadow-xs">
                <p class="text-[13.5px] sm:text-sm leading-relaxed whitespace-pre-wrap">{{ msg.text }}</p>
                <span class="block text-[10px] text-emerald-100/90 mt-1 text-right font-medium">{{ msg.timestamp | date:'shortTime' }}</span>
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
          <form (ngSubmit)="sendMessage()" class="max-w-4xl mx-auto relative flex items-center gap-2">
            
            <div class="relative flex-1">
              <input 
                type="text" 
                [(ngModel)]="inputText" 
                name="chatInput" 
                placeholder="Escribe tu consulta..." 
                [disabled]="isGenerating"
                class="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-slate-900 dark:text-white pl-4 pr-12 sm:pl-5 sm:pr-14 py-3 sm:py-3.5 rounded-2xl text-[13.5px] sm:text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all placeholder:text-slate-400"
              />

              <!-- Dictation Voice Button (RF03 / Tabla 12) -->
              <button 
                type="button" 
                (click)="toggleDictation()"
                [class.mic-recording]="isRecording"
                title="Dictar por voz (Español ecuatoriano)"
                aria-label="Dictar por voz"
                class="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                <i [class]="isRecording ? 'bi bi-mic-fill text-white animate-pulse' : 'bi bi-mic text-lg'"></i>
              </button>
            </div>

            <!-- Send Button (touch target >= 44x44px) -->
            <button 
              type="submit" 
              [disabled]="!inputText.trim() || isGenerating"
              aria-label="Enviar mensaje"
              class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-md shadow-emerald-600/20 shrink-0">
              <i class="bi bi-send-fill text-base sm:text-lg"></i>
            </button>
          </form>
        </div>

      </main>
    </div>
  `
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  inputText: string = '';
  isGenerating: boolean = false;
  isRecording: boolean = false;
  showSettings: boolean = false;
  copiedIndex: number | null = null;

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
    this.subs.add(
      this.route.paramMap.subscribe(params => {
        const id = Number(params.get('id'));
        if (id > 0) {
          this.loadConversation(id);
        } else {
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
    this.subs.unsubscribe();
  }

  loadConversation(id: number): void {
    this.assistantService.getConversacion(id).subscribe({
      next: conversation => {
        this.conversationId = conversation.id_conversacion;
        this.conversationTitle = conversation.titulo;
        this.messages = (conversation.mensajes || []).map((message: any) => ({
          ...message,
          timestamp: new Date(message.timestamp)
        }));
      },
      error: () => this.router.navigate(['/history'])
    });
  }

  newConversation(): void {
    if (this.isGenerating) return;
    this.conversationId = undefined;
    this.conversationTitle = 'Nueva conversación';
    this.messages = [];
    this.inputText = '';
    if (this.router.url !== '/chat') {
      this.router.navigate(['/chat']);
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
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
    this.inputText = s;
    this.sendMessage();
  }

  toggleDictation(): void {
    this.audioService.toggleRecording().subscribe({
      next: (transcript) => {
        this.inputText = transcript;
        this.isRecording = this.audioService.recordingState();
      }
    });
    this.isRecording = this.audioService.recordingState();
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

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.isGenerating) return;

    // Agregar mensaje del usuario
    this.messages.push({
      sender: 'user',
      text: text,
      timestamp: new Date()
    });

    this.inputText = '';
    this.isGenerating = true;

    this.assistantService.generarTexto(text, {
      temperatura: this.temperatura,
      top_p: this.topP,
      max_tokens: this.maxTokens
    }, this.conversationId).subscribe({
      next: (res) => {
        this.isGenerating = false;
        if (!this.conversationId) {
          this.conversationId = res.id_conversacion;
          this.conversationTitle = text.slice(0, 120);
          this.router.navigate(['/chat', this.conversationId], { replaceUrl: true });
          this.sidebarService.triggerRefresh();
        }
        this.messages.push({
          sender: 'assistant',
          text: res.texto_generado,
          timestamp: new Date(),
          modismos: res.modismos_detectados,
          es_error: res.es_error,
          metricas: res.metricas
        });
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
