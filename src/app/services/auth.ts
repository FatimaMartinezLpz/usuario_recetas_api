import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'https://68743fcedd06792b9c937143.mockapi.io/api/users';
  private readonly MOCK_USERS_KEY = 'mockUsers';
  private useMock = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  /**
   * Inicia sesión con email y password
   */
  login(email: string, password: string): Observable<any> {
    if (this.useMock) {
      return this.mockLogin(email, password);
    }

    return this.http.get<any[]>(`${this.API_URL}?email=${email}`).pipe(
      map(users => {
        if (!users || users.length === 0) {
          throw new Error('Usuario no encontrado');
        }

        const user = users[0];
        if (user.password !== password) {
          throw new Error('Contraseña incorrecta');
        }

        return user;
      }),
      tap(user => {
        localStorage.setItem('currentUser', JSON.stringify(user));
      }),
      catchError(error => {
        console.error('Error en API real:', error);
        // Solo usar mock si es un error de conexión, no si es error de credenciales
        if (error.status === 0 || error.status === 504) {
          this.useMock = true;
          return this.mockLogin(email, password);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Registra un nuevo usuario
   */
  register(userData: any): Observable<any> {
    if (this.useMock) {
      return this.mockRegister(userData);
    }

    const payload = {
      ...userData,
      createdAt: new Date().toISOString(),
      avatar: userData.avatar || 'https://i.imgur.com/HeIi0wU.png'
    };

    return this.http.post(this.API_URL, payload).pipe(
      tap(user => {
        localStorage.setItem('currentUser', JSON.stringify(user));
      }),
      catchError(error => {
        console.warn('Error con API, usando mock local', error);
        this.useMock = true;
        return this.mockRegister(userData);
      })
    );
  }

  // Implementación mock para login
  private mockLogin(email: string, password: string): Observable<any> {
    const users = this.getMockUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return throwError(() => new Error('Usuario no encontrado'));
    }

    if (user.password !== password) {
      return throwError(() => new Error('Contraseña incorrecta'));
    }

    localStorage.setItem('currentUser', JSON.stringify(user));
    return of(user);
  }

  // Implementación mock para registro
  private mockRegister(userData: any): Observable<any> {
    const users = this.getMockUsers();

    if (users.some(u => u.email === userData.email)) {
      return throwError(() => new Error('El email ya está registrado'));
    }

    const newUser = {
      ...userData,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      avatar: userData.avatar || 'https://i.imgur.com/HeIi0wU.png'
    };

    users.push(newUser);
    this.saveMockUsers(users);
    localStorage.setItem('currentUser', JSON.stringify(newUser));

    return of(newUser);
  }

  // Helpers para mock local
  private getMockUsers(): any[] {
    const usersJson = localStorage.getItem(this.MOCK_USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  }

  private saveMockUsers(users: any[]): void {
    localStorage.setItem(this.MOCK_USERS_KEY, JSON.stringify(users));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/auth']);
  }

  getCurrentUser(): any {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }

  // Inicializa usuarios de prueba
  initializeMockUsers(): void {
    if (this.getMockUsers().length === 0) {
      const initialUsers = [
        {
          id: '1',
          name: 'Usuario Demo',
          email: 'demo@example.com',
          password: '123456',
          avatar: 'https://i.imgur.com/HeIi0wU.png',
          createdAt: new Date().toISOString()
        }
      ];
      this.saveMockUsers(initialUsers);
    }
  }
}