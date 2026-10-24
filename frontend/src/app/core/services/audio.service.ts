import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

declare var webkitSpeechRecognition: any;
declare var SpeechRecognition: any;

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private recognition: any;
  private isRecording = false;
  private transcriptSubject = new Subject<string>();

  constructor(private zone: NgZone) {
    this.initRecognition();
  }

  private initRecognition(): void {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.lang = 'es-EC'; // Configurado para acento ecuatoriano
      this.recognition.interimResults = true;

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        this.zone.run(() => {
          this.transcriptSubject.next(transcript);
        });
      };

      this.recognition.onerror = (event: any) => {
        console.error('Error en reconocimiento de voz:', event.error);
        this.isRecording = false;
      };

      this.recognition.onend = () => {
        this.zone.run(() => {
          this.isRecording = false;
        });
      };
    }
  }

  toggleRecording(): Observable<string> {
    if (!this.recognition) {
      alert('Tu navegador no soporta la API de reconocimiento de voz. Te recomendamos usar Google Chrome o Edge.');
      return this.transcriptSubject.asObservable();
    }

    if (this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    } else {
      this.recognition.start();
      this.isRecording = true;
    }

    return this.transcriptSubject.asObservable();
  }

  recordingState(): boolean {
    return this.isRecording;
  }
}
