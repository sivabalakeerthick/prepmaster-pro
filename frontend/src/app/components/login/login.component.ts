import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  // OAuth State
  oauthConfig = {
    google: { enabled: false },
    github: { enabled: false }
  };
  oauthSetupModal: 'google' | 'github' | null = null;

  ngOnInit(): void {
    // 1. Handle OAuth Callback Redirection with Token
    const token = this.route.snapshot.queryParamMap.get('token');
    const userParam = this.route.snapshot.queryParamMap.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        this.authService.handleOAuthSuccess(token, user);
        this.router.navigate(['/dashboard', 'interview', '1']);
        return;
      } catch (err) {
        console.error('Failed to parse OAuth user profile:', err);
      }
    }

    // 2. Handle OAuth Setup Guidance / Errors
    const setupParam = this.route.snapshot.queryParamMap.get('oauth_setup');
    if (setupParam === 'google' || setupParam === 'github') {
      this.oauthSetupModal = setupParam;
    }

    const errorParam = this.route.snapshot.queryParamMap.get('oauth_error');
    if (errorParam) {
      this.errorMessage = `Authentication was cancelled or failed (${errorParam}). Please try again.`;
    }

    // 3. Fetch OAuth Configuration
    this.authService.getOAuthConfig().subscribe({
      next: (config) => {
        this.oauthConfig = config;
      },
      error: () => {}
    });
  }

  onSubmit(): void {
    if (!this.email || !this.password) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard', 'interview', '1']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.error || 'Invalid email or password.';
      }
    });
  }

  continueWithGoogle(): void {
    if (this.oauthConfig.google.enabled) {
      this.authService.loginWithOAuth('google');
    } else {
      this.oauthSetupModal = 'google';
    }
  }

  continueWithGitHub(): void {
    if (this.oauthConfig.github.enabled) {
      this.authService.loginWithOAuth('github');
    } else {
      this.oauthSetupModal = 'github';
    }
  }

  continueWithMock(provider: 'google' | 'github'): void {
    this.closeModal();
    this.authService.loginWithMockOAuth(provider);
  }

  closeModal(): void {
    this.oauthSetupModal = null;
  }
}
