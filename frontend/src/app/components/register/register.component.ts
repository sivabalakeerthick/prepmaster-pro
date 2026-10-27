import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = false;
  errorMessage = '';

  // OAuth State
  oauthConfig = {
    google: { enabled: false },
    github: { enabled: false }
  };
  oauthSetupModal: 'google' | 'github' | null = null;

  ngOnInit(): void {
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

    const setupParam = this.route.snapshot.queryParamMap.get('oauth_setup');
    if (setupParam === 'google' || setupParam === 'github') {
      this.oauthSetupModal = setupParam;
    }

    const errorParam = this.route.snapshot.queryParamMap.get('oauth_error');
    if (errorParam) {
      this.errorMessage = `Sign up was cancelled or failed (${errorParam}). Please try again.`;
    }

    this.authService.getOAuthConfig().subscribe({
      next: (config) => {
        this.oauthConfig = config;
      },
      error: () => {}
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
