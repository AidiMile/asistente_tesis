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
        <header class="min-h-16 px-4 sm:px-8 py-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)]/80 backdrop-blur-md z-10 gap-3 transition-colors duration-200">
          <div class="flex items-center gap-2.5 sm:gap-3">
            <!-- Mobile Menu Toggle Button (Drawer) -->
            <button
              type="button"
              (click)="sidebarService.toggleMobile()"
              aria-label="Abrir menú de conversaciones"
              title="Abrir menú"
              class="md:hidden p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
              <i class="bi bi-list text-2xl leading-none"></i>
            </button>

            <!-- Desktop Sidebar Collapse/Expand Toggle Button -->
            <button
              type="button"
              (click)="sidebarService.toggleCollapse()"
              [title]="sidebarService.isCollapsed() ? 'Expandir barra lateral' : 'Contraer barra lateral'"
              class="hidden md:flex p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-slate-600 dark:text-slate-300 border border-[var(--border-color)] items-center justify-center transition-colors">
              <i [class]="sidebarService.isCollapsed() ? 'bi bi-layout-sidebar' : 'bi bi-layout-sidebar-inset'" class="text-sm"></i>
            </button>

            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-bold text-slate-900 dark:text-white">Asistente Virtual PLN-EC</h2>
                <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-800/50">UPEC</span>
              </div>
              <p class="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 font-mono">Motor local · Español ecuatoriano</p>
            </div>
          </div>

          <!-- Parameter Toggle & Action Buttons -->
          <div class="flex items-center gap-2">
            <!-- Theme Toggle Button -->
            <button
              (click)="toggleTheme()"
              [title]="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
              class="p-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-slate-600 dark:text-slate-300 border border-[var(--border-color)] flex items-center justify-center transition-colors">
              <i [class]="isDark ? 'bi bi-moon-stars-fill text-amber-400' : 'bi bi-sun-fill text-amber-500'" class="text-sm"></i>
            </button>

            <!-- New Conversation Button -->
            <button
              (click)="newConversation()"
              class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all">
              <i class="bi bi-plus-lg"></i>
              <span class="hidden sm:inline">Nueva conversación</span>
            </button>

            <!-- Parameter Toggle Button (RF07) -->
            <button
              *ngIf="isAdmin"
              (click)="showSettings = !showSettings" 
              class="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-xs text-emerald-700 dark:text-sky-400 border border-[var(--border-color)] flex items-center gap-1.5 transition-colors">
              <i class="bi bi-sliders2"></i>
              <span class="hidden sm:inline">Parámetros</span>
            </button>
          </div>
        </header>

        <!-- Floating Parameters Settings Drawer (RF07) -->
        <div *ngIf="isAdmin && showSettings" class="absolute top-18 right-8 w-80 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl z-20 transition-all">
          <div class="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Control de Parámetros (RF07)</h3>
            <button (click)="showSettings = false" class="text-slate-400 hover:text-slate-700 dark:hover:text-white"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="space-y-4 pt-4 text-xs">
            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-600 dark:text-slate-300">Temperatura (Creatividad):</span>
                <span class="font-mono text-emerald-600 dark:text-sky-400 font-semibold">{{ temperatura }}</span>
              </div>
              <input type="range" [(ngModel)]="temperatura" min="0.1" max="1.2" step="0.05" class="w-full accent-emerald-600 dark:accent-sky-400 cursor-pointer">
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-600 dark:text-slate-300">Top-P (Muestreo Núcleo):</span>
                <span class="font-mono text-emerald-600 dark:text-sky-400 font-semibold">{{ topP }}</span>
              </div>
              <input type="range" [(ngModel)]="topP" min="0.1" max="1.0" step="0.05" class="w-full accent-emerald-600 dark:accent-sky-400 cursor-pointer">
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-600 dark:text-slate-300">Longitud Máxima (Tokens):</span>
                <span class="font-mono text-emerald-600 dark:text-sky-400 font-semibold">{{ maxTokens }}</span>
              </div>
              <input type="range" [(ngModel)]="maxTokens" min="50" max="500" step="10" class="w-full accent-emerald-600 dark:accent-sky-400 cursor-pointer">
            </div>
          </div>
        </div>

        <!-- Chat Scroll Area -->
        <div #scrollContainer class="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          
          <!-- Empty State Greeting -->
          <div *ngIf="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto my-auto">
            <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-sky-500/10 border border-emerald-500/20 dark:border-sky-500/20 text-emerald-600 dark:text-sky-400 flex items-center justify-center text-3xl mb-5 shadow-lg shadow-emerald-500/5 dark:shadow-sky-500/5">
              <i class="bi bi-chat-quote-fill"></i>
            </div>
            
            <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              ¡Hola {{ userName }}! Escríbeme, dicta o envía un audio.
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed mb-8">
              Prueba: <span class="text-emerald-700 dark:text-sky-300 font-medium">"¿Qué significa achachay?"</span> o <span class="text-emerald-700 dark:text-sky-300 font-medium">"Redacta un resumen sobre las regiones del Ecuador"</span>.
            </p>

            <!-- Quick Suggestion Badges -->
            <div class="flex flex-wrap gap-2.5 justify-center">
              <button 
                *ngFor="let suggestion of suggestions" 
                (click)="applySuggestion(suggestion)"
                class="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-xs text-slate-700 dark:text-slate-300 border border-[var(--border-color)] hover:border-emerald-500/50 dark:hover:border-sky-500/50 shadow-sm transition-all flex items-center gap-2">
                <i class="bi bi-chat-dots text-emerald-600 dark:text-sky-400"></i>
                <span>{{ suggestion }}</span>
              </button>
            </div>
          </div>

          <!-- Chat Messages Thread -->
          <div *ngFor="let msg of messages; let i = index" class="flex flex-col space-y-2">
            <!-- User Message -->
            <div *ngIf="msg.sender === 'user'" class="flex justify-end">
              <div class="max-w-xl bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-sky-600 dark:to-blue-700 text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-sm">
                <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ msg.text }}</p>
                <span class="block text-[10px] text-emerald-100 dark:text-sky-200 mt-1 text-right">{{ msg.timestamp | date:'shortTime' }}</span>
              </div>
            </div>

            <!-- Assistant Message -->
            <div *ngIf="msg.sender === 'assistant'" class="flex justify-start items-start gap-3">
              <div 
                [class]="isFailedMessage(msg) ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/30' : 'bg-emerald-500/10 dark:bg-sky-500/20 text-emerald-600 dark:text-sky-400 border-emerald-500/20 dark:border-sky-500/30'"
                class="w-8 h-8 rounded-xl border flex items-center justify-center text-sm shrink-0 mt-1 shadow-sm transition-colors">
                <i [class]="isFailedMessage(msg) ? 'bi bi-exclamation-triangle-fill' : 'bi bi-robot'"></i>
              </div>
              <div 
                [class]="isFailedMessage(msg) ? 'border-rose-300/80 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10' : 'border-[var(--border-color)] bg-[var(--bg-card)]'"
                class="max-w-2xl w-full border p-5 rounded-2xl rounded-tl-sm shadow-sm space-y-3 transition-colors">
                
                <!-- Markdown Content Rendered -->
                <div class="markdown-content text-sm text-slate-800 dark:text-slate-100" [innerHTML]="msg.text | markdown"></div>

                <!-- Ecuadorian Modisms Detected Tag (RF04 / RF05) -->
                <div *ngIf="msg.modismos && msg.modismos.length > 0 && !isFailedMessage(msg)" class="pt-2 border-t border-[var(--border-color)] flex flex-wrap gap-1.5 items-center">
                  <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Modismos detectados:</span>
                  <span *ngFor="let m of msg.modismos" class="badge-modismo" [title]="m.significado">
                    <i class="bi bi-check2-circle"></i>
                    {{ m.nombre }} ({{ m.region }})
                  </span>
                </div>

                <!-- Footer: Latency, NLP Metrics & Copy Action -->
                <div class="pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                  <!-- Case 1: Failed Request / Timeout -->
                  <div *ngIf="isFailedMessage(msg)" class="flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                      <i class="bi bi-exclamation-triangle-fill text-rose-500"></i>
                      <span>Solicitud fallida: {{ msg.metricas.motivo_error || 'Tiempo de espera agotado' }}</span>
                    </span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700" title="Tiempo de espera registrado antes del fallo">
                      <i class="bi bi-stopwatch"></i>
                      <span>{{ msg.metricas.tiempo_respuesta }}s (latencia)</span>
                    </span>
                  </div>

                  <!-- Case 2: Valid Generated Response with NLP Quality Metrics -->
                  <div *ngIf="!isFailedMessage(msg) && msg.metricas" class="flex flex-wrap gap-2 text-[11px] font-mono items-center">
                    <span *ngIf="msg.metricas.bleu !== null && msg.metricas.bleu !== undefined" class="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                      BLEU: {{ msg.metricas.bleu }}
                    </span>
                    <span *ngIf="msg.metricas.rouge !== null && msg.metricas.rouge !== undefined" class="flex items-center gap-1 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                      ROUGE: {{ msg.metricas.rouge }}
                    </span>
                    <span *ngIf="msg.metricas.bertscore !== null && msg.metricas.bertscore !== undefined" class="flex items-center gap-1 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-500/20">
                      BERTScore: {{ msg.metricas.bertscore }}
                    </span>
                    <span class="flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      <i class="bi bi-stopwatch"></i> {{ msg.metricas.tiempo_respuesta }}s
                    </span>
                  </div>

                  <!-- Discrete Copy Button with visual feedback -->
                  <button
                    type="button"
                    (click)="copyMessage(msg.text, i)"
                    [title]="copiedIndex === i ? '¡Copiado al portapapeles!' : 'Copiar respuesta'"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-[var(--border-color)] transition-all ml-auto shrink-0">
                    <i [class]="copiedIndex === i ? 'bi bi-check2 text-emerald-600 dark:text-sky-400 font-bold' : 'bi bi-clipboard'"></i>
                    <span class="text-[11px] font-medium" [class.text-emerald-600]="copiedIndex === i" [class.dark:text-sky-400]="copiedIndex === i">
                      {{ copiedIndex === i ? '¡Copiado!' : 'Copiar' }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading State Bubble -->
          <div *ngIf="isGenerating" class="flex items-center gap-3 text-slate-600 dark:text-slate-400 text-xs py-2">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-sky-500/20 text-emerald-600 dark:text-sky-400 flex items-center justify-center animate-spin">
              <i class="bi bi-arrow-repeat"></i>
            </div>
            <span>Generando respuesta en español ecuatoriano con red neuronal...</span>
          </div>

        </div>

        <!-- Chat Input Bar -->
        <div class="p-3 sm:p-5 bg-[var(--bg-main)] border-t border-[var(--border-color)] transition-colors">
          <form (ngSubmit)="sendMessage()" class="max-w-4xl mx-auto relative flex items-center gap-2">
            
            <div class="relative flex-1">
              <input 
                type="text" 
                [(ngModel)]="inputText" 
                name="chatInput" 
                placeholder="Escribe tu consulta..." 
                [disabled]="isGenerating"
                class="w-full bg-[var(--bg-card)] border border-[var(--border-color)] text-slate-900 dark:text-white pl-5 pr-14 py-3.5 sm:py-4 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 dark:focus:border-sky-400 shadow-sm transition-all placeholder:text-slate-400"
              />

              <!-- Dictation Voice Button (RF03 / Tabla 12) -->
              <button 
                type="button" 
                (click)="toggleDictation()"
                [class.mic-recording]="isRecording"
                title="Dictar por voz (Español ecuatoriano)"
                class="absolute right-3.5 top-3 p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                <i [class]="isRecording ? 'bi bi-mic-fill text-red-500 animate-pulse' : 'bi bi-mic text-lg'"></i>
              </button>
            </div>

            <!-- Send Button -->
            <button 
              type="submit" 
              [disabled]="!inputText.trim() || isGenerating"
              class="w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 dark:bg-sky-500 dark:hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-emerald-600 dark:disabled:hover:bg-sky-500 text-white dark:text-slate-950 flex items-center justify-center transition-all shadow-md shadow-emerald-600/20 dark:shadow-sky-500/20 shrink-0">
              <i class="bi bi-send-fill text-lg"></i>
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
