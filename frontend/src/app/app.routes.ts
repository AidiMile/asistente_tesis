import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { ChatComponent } from './pages/chat/chat.component';
import { HistoryComponent } from './pages/history/history.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ModismosComponent } from './pages/modismos/modismos.component';
import { MetricsComponent } from './pages/metrics/metrics.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { adminGuard, authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', component: WelcomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'chat', component: ChatComponent, canActivate: [authGuard] },
  { path: 'chat/:id', component: ChatComponent, canActivate: [authGuard] },
  { path: 'history', component: HistoryComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [adminGuard] },
  { path: 'modismos', component: ModismosComponent, canActivate: [adminGuard] },
  { path: 'gestion-corpus', loadComponent: () => import('./pages/gestion-corpus/gestion-corpus.component').then(m => m.GestionCorpusComponent), canActivate: [adminGuard] },
  { path: 'metrics', component: MetricsComponent, canActivate: [adminGuard] },
  { path: 'history-global', component: HistoryComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' }
];
