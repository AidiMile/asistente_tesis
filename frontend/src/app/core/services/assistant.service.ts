import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ChatMessage {
  id?: number;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  modismos?: Array<{ nombre: string; region: string; significado: string }>;
  metricas?: { bleu: number; rouge: number; bertscore: number; tiempo_respuesta: number };
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly apiUrl = '/api/asistente';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  generarTexto(texto: string, params?: { temperatura?: number; top_p?: number; max_tokens?: number }, idConversacion?: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generar/`, {
      texto,
      id_conversacion: idConversacion ?? null,
      tipo_entrada: 'Texto',
      temperatura: params?.temperatura ?? 0.7,
      top_p: params?.top_p ?? 0.9,
      max_tokens: params?.max_tokens ?? 200
    }, { headers: this.getHeaders() });
  }

  getHistorial(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/historial/`, { headers: this.getHeaders() });
  }

  getConversaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conversaciones/`, { headers: this.getHeaders() });
  }

  crearConversacion(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/conversaciones/`, {
      titulo: 'Nueva conversación'
    }, { headers: this.getHeaders() });
  }

  getConversacion(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/conversaciones/${id}/`, { headers: this.getHeaders() });
  }

  getMetricasResumen(): Observable<any> {
    return this.http.get<any>('/api/evaluacion/resumen/', { headers: this.getHeaders() });
  }
}
