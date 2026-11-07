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
  es_error?: boolean;
  metricas?: {
    bleu?: number | null;
    rouge?: number | null;
    bertscore?: number | null;
    tiempo_respuesta: number;
    es_error?: boolean;
    estado?: string;
    motivo_error?: string;
  };
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

  getAdminStats(): Observable<any> {
    return this.http.get<any>('/api/admin/stats/', { headers: this.getHeaders() });
  }

  getAdminEvaluations(limit: number = 30, skip: number = 0): Observable<any[]> {
    return this.http.get<any[]>(`/api/admin/metrics/evaluations/?limit=${limit}&skip=${skip}`, { headers: this.getHeaders() });
  }

  evaluarRespuestaManual(idRespuesta: number, textoReferencia: string, guardar: boolean = false): Observable<any> {
    return this.http.post<any>('/api/admin/metrics/evaluate/', {
      id_respuesta: idRespuesta,
      texto_referencia: textoReferencia,
      guardar: guardar
    }, { headers: this.getHeaders() });
  }
}
