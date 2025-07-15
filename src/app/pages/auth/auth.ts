import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css']
})
export class Auth {
  loginForm: FormGroup;
  registerForm: FormGroup;
  isRegisterActive = false;
  loginError: string | null = null;
  registerError: string | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      avatar: ['https://i.imgur.com/HeIi0wU.png']
    });
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.markFormAsTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.loginError = null;

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: () => {
        this.router.navigate(['/home']);
        this.isLoading = false;
      },
      error: (err) => {
        this.loginError = err.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        this.isLoading = false;
      }
    });
  }

  onRegister() {
    if (this.registerForm.invalid) {
      this.markFormAsTouched(this.registerForm);
      return;
    }

    this.isLoading = true;
    this.registerError = null;

    const formData = {
      ...this.registerForm.value,
      createdAt: new Date().toISOString() // Añade campo requerido
    };

    this.authService.register(formData).subscribe({
      next: (registeredUser) => {
        this.setRegister(false);
        this.loginForm.patchValue({
          email: registeredUser.email,
          password: this.registerForm.value.password
        });
        this.registerForm.reset();
        this.loginError = '¡Registro exitoso! Ya puedes iniciar sesión.';
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error detallado:', err);
        this.registerError = err.message || 'Error al registrarse. Intenta nuevamente.';
        this.isLoading = false;
      }
    });
  }

  getRegisterErrorMessage(controlName: string): string {
    const control = this.registerForm.get(controlName);

    if (!control) return 'Campo inválido';
    if (control.hasError('required')) return 'Este campo es requerido';
    if (control.hasError('email')) return 'Email no válido';
    if (control.hasError('minlength')) {
      return `Mínimo ${control.errors?.['minlength']?.requiredLength} caracteres`;
    }

    return '';
  }
  private markFormAsTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  setRegister(active: boolean) {
    this.isRegisterActive = active;
    this.loginError = null;
    this.registerError = null;
  }
}