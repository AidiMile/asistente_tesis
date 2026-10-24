import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="relative min-h-screen overflow-hidden bg-[#032d2a] text-white">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(45,212,191,.24),transparent_34%),radial-gradient(circle_at_10%_90%,rgba(250,204,21,.12),transparent_30%)]"></div>
      <div class="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10"></div>
      <section class="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-14">
        <header class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl text-emerald-800 shadow-xl"><i class="bi bi-chat-heart-fill"></i></div>
            <div><div class="text-xl font-extrabold">PLN-EC</div><div class="text-xs text-emerald-100/75">Asistente virtual ecuatoriano</div></div>
          </div>
          <button (click)="speak()" class="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/20">
            <i [class]="speaking ? 'bi bi-soundwave' : 'bi bi-volume-up-fill'"></i><span class="hidden sm:inline">{{ speaking ? 'Hablando…' : 'Escuchar bienvenida' }}</span>
          </button>
        </header>
        <div class="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.15fr_.85fr] lg:py-16">
          <div class="text-center lg:text-left">
            <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
              <span class="h-2 w-2 animate-pulse rounded-full bg-amber-300"></span> Inteligencia artificial con identidad ecuatoriana
            </div>
            <h1 class="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl">Tu voz, tus palabras,<br><span class="text-amber-300">nuestro Ecuador.</span></h1>
            <p class="mx-auto mt-6 max-w-2xl text-base leading-7 text-emerald-50/80 sm:text-lg lg:mx-0">Conversa, pregunta y aprende con un asistente que comprende nuestra forma de hablar, nuestros modismos y expresiones cotidianas.</p>
            <div class="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <span class="rounded-full bg-white/10 px-4 py-2 text-sm"><i class="bi bi-translate mr-2 text-amber-300"></i>Modismos ecuatorianos</span>
              <span class="rounded-full bg-white/10 px-4 py-2 text-sm"><i class="bi bi-mic-fill mr-2 text-amber-300"></i>Texto y voz</span>
              <span class="rounded-full bg-white/10 px-4 py-2 text-sm"><i class="bi bi-database-check mr-2 text-amber-300"></i>Aprendizaje local</span>
            </div>
            <button (click)="start()" class="mt-10 inline-flex min-w-48 items-center justify-center gap-3 rounded-2xl bg-amber-300 px-7 py-4 text-lg font-extrabold text-emerald-950 shadow-2xl transition hover:-translate-y-1 hover:bg-amber-200">
              {{ loggedIn ? 'Ir al asistente' : 'Iniciar' }} <i class="bi bi-arrow-right"></i>
            </button>
          </div>
          <div class="relative mx-auto flex h-[300px] w-[300px] items-center justify-center sm:h-[390px] sm:w-[390px]">
            <div class="absolute inset-0 animate-pulse rounded-full bg-teal-300/10"></div><div class="absolute inset-8 rounded-full border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md"></div>
            <div class="relative text-center"><div class="mx-auto grid h-28 w-28 place-items-center rounded-[2rem] bg-white text-6xl text-emerald-700 shadow-2xl sm:h-36 sm:w-36 sm:text-7xl"><i class="bi bi-robot"></i></div><p class="mt-5 text-xl font-bold">¡Hola, ñaño!</p><p class="mt-1 text-sm text-emerald-100/70">Estoy listo para conversar</p></div>
          </div>
        </div>
        <footer class="text-center text-xs text-emerald-100/50">UPEC · Carrera de Computación · 2026</footer>
      </section>
    </main>
  `
})
export class WelcomeComponent implements AfterViewInit, OnDestroy {
  speaking = false;
  readonly greeting = 'Bienvenido a su asistente virtual de PLN con modismos ecuatorianos.';
  constructor(private router: Router, private auth: AuthService) {}
  get loggedIn(): boolean { return this.auth.isLoggedIn(); }
  ngAfterViewInit(): void { setTimeout(() => this.speak(), 450); }
  speak(): void {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(this.greeting);
    speech.lang = 'es-EC'; speech.rate = .92;
    speech.onstart = () => this.speaking = true;
    speech.onend = speech.onerror = () => this.speaking = false;
    window.speechSynthesis.speak(speech);
  }
  start(): void { this.router.navigate([this.loggedIn ? '/chat' : '/login']); }
  ngOnDestroy(): void { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
}
