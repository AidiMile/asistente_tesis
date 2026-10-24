import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';

export interface User { id: number; nombre: string; correo: string; rol: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api/auth';
  currentUser = signal<User | null>(this.getInitialUser());

  constructor(private http: HttpClient, private router: Router) {}

  private getInitialUser(): User | null {
    if (!this.hasUsableToken()) return null;
    const saved = localStorage.getItem('plnec_user');
    if (!saved) return null;
    try { return JSON.parse(saved); } catch { return null; }
  }

  private hasUsableToken(): boolean {
    const token = localStorage.getItem('plnec_token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp || payload.exp * 1000 <= Date.now()) {
        this.clearSession();
        return false;
      }
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  private clearSession(): void {
    localStorage.removeItem('plnec_token');
    localStorage.removeItem('plnec_user');
    this.currentUser?.set(null);
  }

  login(correo: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login/`, { correo, password }).pipe(
      tap(res => {
        if (res.access && res.user) {
          localStorage.setItem('plnec_token', res.access);
          localStorage.setItem('plnec_user', JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }
      })
    );
  }

  register(userData: { nombre: string; correo: string; password: string; rol?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/`, userData);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  validateSession(): Observable<boolean> {
    if (!this.hasUsableToken()) return of(false);
    return this.http.get<any>(`${this.apiUrl}/profile/`, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    }).pipe(
      tap(data => {
        const user: User = { ...data, id: data.id_usuario, rol: data.perfil?.rol || 'Estudiante' };
        this.currentUser.set(user);
        localStorage.setItem('plnec_user', JSON.stringify(user));
      }),
      map(() => true),
      catchError(() => { this.clearSession(); return of(false); })
    );
  }

  isLoggedIn(): boolean { return this.hasUsableToken() && this.currentUser() !== null; }
  isAdmin(): boolean { return this.currentUser()?.rol === 'Administrador'; }
  getToken(): string | null { return this.hasUsableToken() ? localStorage.getItem('plnec_token') : null; }
}
