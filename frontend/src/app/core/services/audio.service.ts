import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type DictationStatus = 'idle' | 'starting' | 'listening' | 'error' | 'unsupported';

export interface DictationState {
  status: DictationStatus;
  isListening: boolean;
  supported: boolean;
  interimText: string;
  finalText: string;
  transcript: string;
  lang: string;
  errorCode?: string;
  errorMessage?: string;
  hasResult: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService implements OnDestroy {
  private readonly languageCandidates = ['es-EC', 'es-419', 'es-ES'];

  private recognition: any = null;
  private activeSessionId = 0;
  private languageIndex = 0;
  private manualStop = false;
  private retryingLanguageFallback = false;
  private stopSafetyTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly initialState = (): DictationState => ({
    status: this.isSupported() ? 'idle' : 'unsupported',
    isListening: false,
    supported: this.isSupported(),
    interimText: '',
    finalText: '',
    transcript: '',
    lang: this.languageCandidates[0],
    hasResult: false
  });

  private stateSubject = new BehaviorSubject<DictationState>(this.initialState());
  readonly state$: Observable<DictationState> = this.stateSubject.asObservable();

  constructor(private zone: NgZone) {}

  ngOnDestroy(): void {
    this.cleanup();
  }

  private getSpeechRecognitionConstructor(): any {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as Record<string, any>;
    return win['SpeechRecognition'] || win['webkitSpeechRecognition'] || null;
  }

  isSupported(): boolean {
    return Boolean(this.getSpeechRecognitionConstructor());
  }

  recordingState(): boolean {
    return this.stateSubject.value.isListening;
  }

  getState(): DictationState {
    return this.stateSubject.value;
  }

  toggleListening(): boolean {
    if (this.stateSubject.value.isListening) {
      this.stopListening();
      return false;
    }
    return this.startListening();
  }

  startListening(): boolean {
    if (this.stateSubject.value.isListening) {
      return true;
    }

    if (!this.isSupported()) {
      this.emitState({
        status: 'unsupported',
        isListening: false,
        supported: false,
        interimText: '',
        finalText: '',
        transcript: '',
        lang: this.languageCandidates[0],
        errorCode: 'unsupported',
        errorMessage: 'Tu navegador no admite reconocimiento de voz en tiempo real. Puedes escribir tu consulta manualmente o usar Chrome / Edge.',
        hasResult: false
      });
      return false;
    }

    this.clearStopTimer();
    this.detachCurrentRecognition(true);

    this.activeSessionId += 1;
    const sessionId = this.activeSessionId;
    this.languageIndex = 0;
    this.manualStop = false;
    this.retryingLanguageFallback = false;

    this.emitState({
      status: 'starting',
      isListening: true,
      supported: true,
      interimText: '',
      finalText: '',
      transcript: '',
      lang: this.languageCandidates[this.languageIndex],
      errorCode: undefined,
      errorMessage: undefined,
      hasResult: false
    });

    this.createAndStartRecognition(sessionId);
    return this.stateSubject.value.isListening;
  }

  stopListening(): void {
    if (!this.stateSubject.value.isListening && !this.recognition) {
      return;
    }

    this.manualStop = true;
    this.retryingLanguageFallback = false;
    const current = this.stateSubject.value;
    const preservedTranscript = current.transcript || current.finalText;

    this.emitState({
      ...current,
      status: 'idle',
      isListening: false,
      interimText: '',
      finalText: preservedTranscript,
      transcript: preservedTranscript,
      errorCode: undefined,
      errorMessage: undefined,
      hasResult: Boolean(preservedTranscript.trim())
    });

    try {
      this.recognition?.stop();
    } catch {
      this.detachCurrentRecognition(false);
    }

    this.clearStopTimer();
    const expectedSession = this.activeSessionId;
    this.stopSafetyTimer = setTimeout(() => {
      if (this.activeSessionId === expectedSession) {
        this.detachCurrentRecognition(false);
      }
    }, 700);
  }

  clearError(): void {
    const current = this.stateSubject.value;
    if (current.status === 'error' || current.errorMessage) {
      this.emitState({
        ...current,
        status: current.supported ? 'idle' : 'unsupported',
        errorCode: undefined,
        errorMessage: undefined
      });
    }
  }

  cleanup(): void {
    this.clearStopTimer();
    this.activeSessionId += 1;
    this.manualStop = true;
    this.retryingLanguageFallback = false;
    this.detachCurrentRecognition(true);
    this.emitState(this.initialState());
  }

  composeWithBaseText(baseText: string, dictatedText: string): string {
    const cleanSpoken = (dictatedText || '').replace(/\s+/g, ' ').trim();
    if (!cleanSpoken) return baseText;
    if (!baseText) return cleanSpoken;

    if (/\s$/.test(baseText) || /^[.,;:!?)]/.test(cleanSpoken)) {
      return `${baseText}${cleanSpoken}`;
    }
    return `${baseText} ${cleanSpoken}`;
  }

  private createAndStartRecognition(sessionId: number): void {
    const SpeechRec = this.getSpeechRecognitionConstructor();
    if (!SpeechRec) return;

    const lang = this.languageCandidates[this.languageIndex] || 'es-EC';
    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = lang;

    rec.onstart = () => {
      this.zone.run(() => {
        if (sessionId !== this.activeSessionId || this.manualStop) return;
        this.retryingLanguageFallback = false;
        const current = this.stateSubject.value;
        this.emitState({
          ...current,
          status: 'listening',
          isListening: true,
          lang,
          errorCode: undefined,
          errorMessage: undefined
        });
      });
    };

    rec.onresult = (event: any) => {
      this.zone.run(() => {
        if (sessionId !== this.activeSessionId) return;

        const { finalText, interimText, transcript } = this.extractTranscripts(event?.results);
        const current = this.stateSubject.value;
        const effectiveTranscript = (this.manualStop && !transcript)
          ? (current.transcript || current.finalText)
          : transcript;

        this.emitState({
          ...current,
          status: this.manualStop ? 'idle' : 'listening',
          isListening: !this.manualStop,
          finalText: finalText || (this.manualStop ? current.finalText : ''),
          interimText: this.manualStop ? '' : interimText,
          transcript: effectiveTranscript,
          lang,
          hasResult: Boolean(effectiveTranscript.trim())
        });
      });
    };

    rec.onerror = (event: any) => {
      this.zone.run(() => {
        if (sessionId !== this.activeSessionId) return;

        const errorCode = String(event?.error || 'unknown');

        // Cierre normal cuando el usuario detuvo manualmente
        if (errorCode === 'aborted' && this.manualStop) {
          this.detachCurrentRecognition(false);
          return;
        }

        // Alternativa controlada si el navegador no soporta es-EC (sin bucles infinitos)
        if (
          errorCode === 'language-not-supported' &&
          !this.manualStop &&
          this.languageIndex < this.languageCandidates.length - 1
        ) {
          this.languageIndex += 1;
          this.retryingLanguageFallback = true;
          this.detachCurrentRecognition(true);
          this.createAndStartRecognition(sessionId);
          return;
        }

        this.clearStopTimer();
        this.retryingLanguageFallback = false;
        this.detachCurrentRecognition(false);

        const current = this.stateSubject.value;
        const preservedTranscript = current.transcript || current.finalText;
        this.emitState({
          ...current,
          status: 'error',
          isListening: false,
          interimText: '',
          finalText: preservedTranscript,
          transcript: preservedTranscript,
          errorCode,
          errorMessage: this.mapSpeechError(errorCode),
          hasResult: Boolean(preservedTranscript.trim())
        });
      });
    };

    rec.onend = () => {
      this.zone.run(() => {
        if (sessionId !== this.activeSessionId) return;

        if (this.retryingLanguageFallback) {
          this.retryingLanguageFallback = false;
          return;
        }

        this.clearStopTimer();
        this.detachCurrentRecognition(false);

        const current = this.stateSubject.value;
        const preservedTranscript = current.transcript || current.finalText;
        const nextStatus: DictationStatus = current.status === 'error' ? 'error' : 'idle';

        this.emitState({
          ...current,
          status: nextStatus,
          isListening: false,
          interimText: '',
          finalText: preservedTranscript,
          transcript: preservedTranscript,
          hasResult: Boolean(preservedTranscript.trim())
        });
      });
    };

    this.recognition = rec;

    try {
      rec.start();
    } catch {
      this.zone.run(() => {
        if (sessionId !== this.activeSessionId) return;
        this.detachCurrentRecognition(false);
        this.emitState({
          ...this.stateSubject.value,
          status: 'error',
          isListening: false,
          interimText: '',
          errorCode: 'start-failed',
          errorMessage: 'No se pudo iniciar el micrófono. Verifica permisos o intenta nuevamente.'
        });
      });
    }
  }

  private extractTranscripts(results: any): { finalText: string; interimText: string; transcript: string } {
    if (!results || typeof results.length !== 'number') {
      return { finalText: '', interimText: '', transcript: '' };
    }

    let finalAccum = '';
    let lastFinalRaw = '';
    let interimAccum = '';

    for (let i = 0; i < results.length; i += 1) {
      const resultItem = results[i];
      if (!resultItem || !resultItem[0]) continue;

      const raw = String(resultItem[0].transcript || '').replace(/\s+/g, ' ').trim();
      if (!raw) continue;

      const confidence = typeof resultItem[0].confidence === 'number' ? resultItem[0].confidence : 1;

      if (resultItem.isFinal) {
        const lowerRaw = raw.toLowerCase();
        const lowerFinal = finalAccum.toLowerCase();

        // Evitar duplicación por bugs de acumulación en Android/Chrome
        if (finalAccum && lowerFinal.includes(' ') && lowerRaw.startsWith(`${lowerFinal} `)) {
          finalAccum = raw;
        } else if (finalAccum && ((lowerRaw === lowerFinal && raw.includes(' ')) || (confidence === 0 && lowerRaw === lastFinalRaw.toLowerCase()))) {
          continue;
        } else {
          finalAccum = this.joinSegments(finalAccum, raw);
        }
        lastFinalRaw = raw;
      } else {
        let interimSegment = raw;
        if (finalAccum) {
          const lowerRaw = interimSegment.toLowerCase();
          const lowerFinal = finalAccum.toLowerCase();
          if (lowerRaw === lowerFinal) {
            continue;
          }
          if (lowerRaw.startsWith(`${lowerFinal} `)) {
            interimSegment = interimSegment.slice(finalAccum.length).trim();
          }
        }
        if (!interimSegment) continue;

        if (interimAccum && interimSegment.toLowerCase().startsWith(`${interimAccum.toLowerCase()} `)) {
          interimAccum = interimSegment;
        } else {
          interimAccum = this.joinSegments(interimAccum, interimSegment);
        }
      }
    }

    const transcript = this.joinSegments(finalAccum, interimAccum);
    return { finalText: finalAccum, interimText: interimAccum, transcript };
  }

  private joinSegments(left: string, right: string): string {
    const cleanLeft = (left || '').trim();
    const cleanRight = (right || '').trim();
    if (!cleanLeft) return cleanRight;
    if (!cleanRight) return cleanLeft;
    if (/^[.,;:!?)]/.test(cleanRight)) {
      return `${cleanLeft}${cleanRight}`;
    }
    return `${cleanLeft} ${cleanRight}`;
  }

  private mapSpeechError(code: string): string {
    const insecureNote = typeof window !== 'undefined' && window.isSecureContext === false
      ? ' El navegador requiere HTTPS o localhost para acceder al micrófono.'
      : '';

    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return `Permiso de micrófono denegado. Habilita el acceso en tu navegador para dictar.${insecureNote}`;
      case 'audio-capture':
        return 'No se detectó un micrófono disponible o está en uso por otra aplicación.';
      case 'no-speech':
        return 'No se detectó voz. Pulsa el micrófono e intenta hablar nuevamente.';
      case 'network':
        return 'Error de conexión con el servicio de reconocimiento de voz del navegador. Puedes escribir tu consulta manualmente.';
      case 'language-not-supported':
        return 'El navegador no admite el idioma español requerido para el dictado por voz.';
      case 'aborted':
        return 'Dictado interrumpido.';
      default:
        return 'Ocurrió un problema con el reconocimiento de voz. Puedes continuar escribiendo normalmente.';
    }
  }

  private detachCurrentRecognition(abortActive: boolean): void {
    const rec = this.recognition;
    if (!rec) return;

    rec.onstart = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;

    if (abortActive) {
      try {
        rec.abort();
      } catch {
        try {
          rec.stop();
        } catch {}
      }
    }

    this.recognition = null;
  }

  private clearStopTimer(): void {
    if (this.stopSafetyTimer !== null) {
      clearTimeout(this.stopSafetyTimer);
      this.stopSafetyTimer = null;
    }
  }

  private emitState(nextState: DictationState): void {
    this.stateSubject.next(nextState);
  }
}
