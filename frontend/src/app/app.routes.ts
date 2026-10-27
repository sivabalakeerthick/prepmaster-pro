import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'dashboard/:track', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'dashboard/:track/:sectionId', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'interview/:sectionId', redirectTo: 'dashboard/interview/:sectionId' },
  { path: 'dsa/:sectionId', redirectTo: 'dashboard/dsa/:sectionId' },
  { path: '', redirectTo: 'dashboard/interview/1', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard/interview/1' }
];
