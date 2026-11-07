import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly STORAGE_KEY = 'pln_sidebar_collapsed';

  readonly isCollapsed = signal<boolean>(false);
  readonly isMobileOpen = signal<boolean>(false);

  private readonly newConversationSource = new Subject<void>();
  readonly newConversation$ = this.newConversationSource.asObservable();

  private readonly refreshConversationsSource = new Subject<void>();
  readonly refreshConversations$ = this.refreshConversationsSource.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved !== null) {
          this.isCollapsed.set(saved === 'true');
        }
      } catch {
        // Ignorar errores de almacenamiento local
      }
    }
  }

  toggleCollapse(): void {
    const next = !this.isCollapsed();
    this.setCollapsed(next);
  }

  setCollapsed(collapsed: boolean): void {
    this.isCollapsed.set(collapsed);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.STORAGE_KEY, String(collapsed));
      } catch {
        // Ignorar
      }
    }
  }

  toggleMobile(): void {
    this.isMobileOpen.set(!this.isMobileOpen());
  }

  setMobileOpen(open: boolean): void {
    this.isMobileOpen.set(open);
  }

  closeMobile(): void {
    this.isMobileOpen.set(false);
  }

  triggerNewConversation(): void {
    this.closeMobile();
    this.newConversationSource.next();
  }

  triggerRefresh(): void {
    this.refreshConversationsSource.next();
  }
}

