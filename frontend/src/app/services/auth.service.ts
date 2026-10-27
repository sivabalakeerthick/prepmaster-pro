import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenKey = 'interview_prep_token';
  private userKey = 'interview_prep_user';

  private getStoredUser(): User | null {
    try {
      const stored = localStorage.getItem(this.userKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  public getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  public getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  public register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  public login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  public logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  public resetPassword(email: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, { email, newPassword });
  }

  public getOAuthConfig(): Observable<{ google: { enabled: boolean }; github: { enabled: boolean } }> {
    return this.http.get<{ google: { enabled: boolean }; github: { enabled: boolean } }>(`${environment.apiUrl}/auth/oauth/config`);
  }

  public loginWithOAuth(provider: 'google' | 'github'): void {
    window.location.href = `${environment.apiUrl}/auth/${provider}`;
  }

  public loginWithMockOAuth(provider: 'google' | 'github'): void {
    window.location.href = `${environment.apiUrl}/auth/oauth/mock/${provider}`;
  }

  public handleOAuthSuccess(token: string, user: User): void {
    this.handleAuthSuccess({ token, user });
  }

  private handleAuthSuccess(response: AuthResponse): void {
    if (response && response.token) {
      localStorage.setItem(this.tokenKey, response.token);
      localStorage.setItem(this.userKey, JSON.stringify(response.user));
      this.currentUserSubject.next(response.user);
    }
  }
}
