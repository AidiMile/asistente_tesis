import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { AssistantService, ChatMessage } from '../../core/services/assistant.service';
import { AudioService } from '../../core/services/audio.service';
import { AuthService } from '../../core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex h-screen bg-[#0b0f19] text-slate-100 overflow-hidden pb-16 md:pb-0">
      <!-- Sidebar Modular -->
      <app-sidebar></app-sidebar>

      <!-- Main Chat Container -->
      <main class="flex-1 flex flex-col h-full md:h-screen relative bg-[#0b0f19] min-w-0 md:ml-64">
        
        <!-- Top Bar with Model & Parameters Status -->
        <header class="min-h-16 px-4 sm:px-8 py-3 border-b border-[#1e293b]/60 flex items-center justify-between bg-[#0f172a]/40 backdrop-blur-md z-10 gap-3">
          <div class="flex items-center gap-3">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <div>
              <h2 class="text-sm font-semibold text-white">Asistente Virtual PLN-EC</h2>
              <p class="hidden sm:block text-[11px] text-slate-400 font-mono">Motor local · Español ecuatoriano</p>
            </div>
          </div>

          <!-- Parameter Toggle Button (RF07) -->
          <div class="flex items-center gap-2">
            <button
              (click)="newConversation()"
              class="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors">
              <i class="bi bi-plus-lg"></i>
              <span class="hidden sm:inline">Nueva conversación</span>
            </button>
            <button
              *ngIf="isAdmin"
              (click)="showSettings = !showSettings" 
              class="px-3 py-1.5 rounded-lg bg-[#1e293b]/60 hover:bg-[#1e293b] text-xs text-sky-400 border border-[#334155] flex items-center gap-1.5 transition-colors">
              <i class="bi bi-sliders2"></i>
              <span class="hidden sm:inline">Parámetros</span>
            </button>
          </div>
        </header>

        <!-- Floating Parameters Settings Drawer (RF07) -->
        <div *ngIf="isAdmin && showSettings" class="absolute top-18 right-8 w-80 p-5 rounded-2xl bg-[#131d31] border border-[#1e293b] shadow-2xl z-20 animate-in fade-in slide-in-from-top-4">
          <div class="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <h3 class="text-xs font-bold uppercase tracking-wider text-white">Control de Parámetros (RF07)</h3>
            <button (click)="showSettings = false" class="text-slate-400 hover:text-white"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="space-y-4 pt-4 text-xs">
            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-300">Temperatura (Creatividad):</span>
                <span class="font-mono text-sky-400">{{ temperatura }}</span>
              </div>
              <input type="range" [(ngModel)]="temperatura" min="0.1" max="1.2" step="0.05" class="w-full accent-sky-400 cursor-pointer">
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-300">Top-P (Muestreo Núcleo):</span>
                <span class="font-mono text-sky-400">{{ topP }}</span>
              </div>
              <input type="range" [(ngModel)]="topP" min="0.1" max="1.0" step="0.05" class="w-full accent-sky-400 cursor-pointer">
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <span class="text-slate-300">Longitud Máxima (Tokens):</span>
                <span class="font-mono text-sky-400">{{ maxTokens }}</span>
              </div>
              <input type="range" [(ngModel)]="maxTokens" min="50" max="500" step="10" class="w-full accent-sky-400 cursor-pointer">
            </div>
          </div>
        </div>

        <!-- Chat Scroll Area -->
        <div #scrollContainer class="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          
          <!-- Empty State Greeting (Exact Screenshot 2) -->
          <div *ngIf="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto my-auto">
            <div class="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center text-3xl mb-6 shadow-xl shadow-sky-500/5">
              <i class="bi bi-chat-quote-fill"></i>
            </div>
            
            <h3 class="text-xl font-bold text-white mb-2">
              ¡Hola {{ userName }}! Escríbeme, dicta o envía un audio.
            </h3>
            <p class="text-sm text-slate-400 max-w-md leading-relaxed mb-8">
              Prueba: <span class="text-sky-300">"¿Qué significa achachay?"</span> o <span class="text-sky-300">"Redacta un resumen sobre las regiones del Ecuador"</span>.
            </p>

            <!-- Quick Suggestion Badges -->
            <div class="flex flex-wrap gap-2.5 justify-center">
              <button 
                *ngFor="let suggestion of suggestions" 
                (click)="applySuggestion(suggestion)"
                class="px-3.5 py-2 rounded-xl bg-[#131d31] hover:bg-[#1a2742] text-xs text-slate-300 border border-[#1e293b] transition-all hover:border-sky-500/40">
                {{ suggestion }}
              </button>
            </div>
          </div>

          <!-- Chat Messages Thread -->
          <div *ngFor="let msg of messages" class="flex flex-col space-y-2">
            <!-- User Message -->
            <div *ngIf="msg.sender === 'user'" class="flex justify-end">
              <div class="max-w-xl bg-sky-600 text-white px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md">
                <p class="text-sm leading-relaxed">{{ msg.text }}</p>
                <span class="block text-[10px] text-sky-200 mt-1 text-right">{{ msg.timestamp | date:'shortTime' }}</span>
              </div>
            </div>

            <!-- Assistant Message -->
            <div *ngIf="msg.sender === 'assistant'" class="flex justify-start items-start gap-3">
              <div class="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center text-sm shrink-0 mt-1">
                <i class="bi bi-robot"></i>
              </div>
              <div class="max-w-2xl bg-[#131d31] border border-[#1e293b] p-5 rounded-2xl rounded-tl-sm shadow-lg space-y-3">
                <p class="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">{{ msg.text }}</p>
                
                <!-- Ecuadorian Modisms Detected Tag (RF04 / RF05) -->
                <div *ngIf="msg.modismos && msg.modismos.length > 0" class="pt-2 border-t border-[#1e293b] flex flex-wrap gap-1.5 items-center">
                  <span class="text-[11px] text-slate-400 font-medium">Modismos detectados:</span>
                  <span *ngFor="let m of msg.modismos" class="badge-modismo" [title]="m.significado">
                    <i class="bi bi-check2-circle"></i>
                    {{ m.nombre }} ({{ m.region }})
                  </span>
                </div>

                <!-- NLP Metrics Evaluation Chips (RF08) -->
                <div *ngIf="msg.metricas" class="flex flex-wrap gap-3 pt-2 text-[11px] font-mono text-slate-400">
                  <span class="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    BLEU: {{ msg.metricas.bleu }}
                  </span>
                  <span class="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    ROUGE: {{ msg.metricas.rouge }}
                  </span>
                  <span class="flex items-center gap-1 text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    BERTScore: {{ msg.metricas.bertscore }}
                  </span>
                  <span class="flex items-center gap-1 text-slate-400">
                    <i class="bi bi-stopwatch"></i> {{ msg.metricas.tiempo_respuesta }}s
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading State Bubble -->
          <div *ngIf="isGenerating" class="flex items-center gap-3 text-slate-400 text-xs">
            <div class="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center animate-spin">
              <i class="bi bi-arrow-repeat"></i>
            </div>
            <span>Generando respuesta en español ecuatoriano con red neuronal...</span>
          </div>

        </div>

        <!-- Chat Input Bar (Screenshot 2 exact bottom input) -->
        <div class="p-3 sm:p-6 bg-[#0b0f19] border-t border-[#1e293b]/60">
          <form (ngSubmit)="sendMessage()" class="max-w-4xl mx-auto relative flex items-center gap-2">
            
            <div class="relative flex-1">
              <input 
                type="text" 
                [(ngModel)]="inputText" 
                name="chatInput" 
                placeholder="Escribe tu consulta..." 
                [disabled]="isGenerating"
                class="w-full bg-[#131d31] border border-[#1e293b] text-white pl-5 pr-14 py-4 rounded-2xl text-sm focus:outline-none focus:border-sky-500 shadow-inner"
              />

              <!-- Dictation Voice Button (RF03 / Tabla 12) -->
              <button 
                type="button" 
                (click)="toggleDictation()"
                [class.mic-recording]="isRecording"
                title="Dictar por voz (Español ecuatoriano)"
                class="absolute right-3.5 top-3.5 p-2 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-[#1a2742] transition-colors">
                <i [class]="isRecording ? 'bi bi-mic-fill text-red-500 animate-pulse' : 'bi bi-mic text-lg'"></i>
              </button>
            </div>

            <!-- Send Button -->
            <button 
              type="submit" 
              [disabled]="!inputText.trim() || isGenerating"
              class="w-12 h-12 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-slate-950 flex items-center justify-center transition-all shadow-lg shadow-sky-500/20 shrink-0">
              <i class="bi bi-send-fill text-lg"></i>
            </button>
          </form>
        </div>

      </main>
    </div>
  `
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  inputText: string = '';
  isGenerating: boolean = false;
  isRecording: boolean = false;
  showSettings: boolean = false;

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

  constructor(
    private assistantService: AssistantService,
    private audioService: AudioService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id > 0) {
        this.loadConversation(id);
      } else {
        this.conversationId = undefined;
        this.conversationTitle = 'Nueva conversación';
        this.messages = [];
      }
    });
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
    this.router.navigate(['/chat']);
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
        }
        this.messages.push({
          sender: 'assistant',
          text: res.texto_generado,
          timestamp: new Date(),
          modismos: res.modismos_detectados,
          metricas: res.metricas
        });
      },
      error: (err) => {
        this.isGenerating = false;
        this.messages.push({
          sender: 'assistant',
          text: err?.error?.detail || (err?.status === 401
            ? 'Tu sesión terminó. Inicia sesión nuevamente para continuar.'
            : 'No pude completar la consulta. Verifica el motor local e inténtalo nuevamente.'),
          timestamp: new Date()
        });
      }
    });
  }
}
