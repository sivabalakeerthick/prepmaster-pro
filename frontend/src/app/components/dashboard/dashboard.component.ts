import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription, of, catchError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SectionService } from '../../services/section.service';
import { ProgressService } from '../../services/progress.service';
import { TargetService } from '../../services/target.service';
import { Section, DsaSection, DsaExercise, DsaTocItem, DsaPlatform, LeetCodeCategory, StudyStage, ProgressSummary } from '../../models/section.model';
import { TargetData, User } from '../../models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private sectionService = inject(SectionService);
  private progressService = inject(ProgressService);
  private targetService = inject(TargetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private routeSub?: Subscription;

  currentUser: User | null = null;
  activeTrack: 'interview' | 'dsa' = 'interview';

  // Track 1: Full-Stack Interview Prep
  interviewSections: Section[] = [];

  // Track 2: Master DSA Practice Workbook
  dsaSections: DsaSection[] = [];
  leetcodeCategories: LeetCodeCategory[] = [];
  studyStages: StudyStage[] = [];
  dsaToc: DsaTocItem[] = [];
  dsaPlatforms: DsaPlatform[] = [];
  solvingRoutine: string[] = [];

  // Progress map: key -> boolean
  progressMap: Record<string, boolean> = {};

  // Summary map for counts
  summaryMap: Record<string, { total: number; completed: number }> = {};

  targetData: TargetData = {
    targetRole: '',
    salaryTarget: '',
    targetDate: '',
    currentFocus: '',
    personalNotes: ''
  };

  targetSavedMessage = '';
  isLoading = true;
  searchQuery = '';
  filterStatus = 'all';
  allExpanded = true;
  collapsedSections: Record<string, boolean> = {};

  // Recommended Hybrid UX: Focus Mode, Hide Completed & Smart Navigation
  viewMode: 'focus' | 'all' = 'focus';
  activeInterviewSectionId: string | number = 1;
  activeDsaSectionId: string = '0';
  hideCompleted: boolean = false;
  highlightedTopicKey: string | null = null;

  // UX & Professional Layout State
  isSidebarOpen = true;
  sidebarSearch = '';
  showBackToTop = false;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.showBackToTop = window.scrollY > 350;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebarMobile(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      this.isSidebarOpen = false;
    }
  }

  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  selectRole(role: string): void {
    this.targetData.targetRole = role;
    this.saveTarget();
  }

  get filteredInterviewSidebarSections(): Section[] {
    if (!this.sidebarSearch) return this.interviewSections;
    const q = this.sidebarSearch.toLowerCase();
    return this.interviewSections.filter(s => s.title.toLowerCase().includes(q));
  }

  get filteredDsaSidebarSections(): DsaSection[] {
    if (!this.sidebarSearch) return this.dsaSections;
    const q = this.sidebarSearch.toLowerCase();
    return this.dsaSections.filter(s => s.title.toLowerCase().includes(q));
  }

  isInterviewSectionActive(id: string | number): boolean {
    return String(this.activeInterviewSectionId) === String(id);
  }

  isDsaSectionActive(id: string | number): boolean {
    return String(this.activeDsaSectionId) === String(id);
  }

  ngOnInit(): void {
    // Process OAuth tokens in URL if landing directly on dashboard
    const token = this.route.snapshot.queryParamMap.get('token');
    const userParam = this.route.snapshot.queryParamMap.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        this.authService.handleOAuthSuccess(token, user);
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (err) {
        console.error('Error parsing OAuth params in dashboard:', err);
      }
    }

    this.currentUser = this.authService.getCurrentUser();
    if (this.authService.isLoggedIn()) {
      this.authService.getProfile().subscribe({
        next: (res) => {
          if (res?.user) {
            this.currentUser = res.user;
            this.cdr.markForCheck();
          }
        },
        error: () => {}
      });
    }
    this.loadInitialData();

    this.routeSub = this.route.paramMap.subscribe(params => {
      const track = params.get('track');
      const sectionId = params.get('sectionId');

      if (track === 'interview' || track === 'dsa') {
        this.activeTrack = track;
      }

      if (sectionId) {
        if (this.activeTrack === 'interview') {
          const num = Number(sectionId);
          this.activeInterviewSectionId = isNaN(num) ? sectionId : num;
        } else {
          this.activeDsaSectionId = sectionId;
        }
        this.scrollToActiveSectionCard();
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    forkJoin({
      sectionsData: this.sectionService.getSectionsData().pipe(
        catchError(err => {
          console.error('Failed to load sectionsData:', err);
          return of({ sections: [], interview: [], dsa: { sections: [], leetcodeCategories: [], studyStages: [], toc: [], platforms: [], solvingRoutine: [] } });
        })
      ),
      progress: this.progressService.getProgress().pipe(
        catchError(err => {
          console.error('Failed to load progress:', err);
          return of({});
        })
      ),
      summary: this.progressService.getSummary().pipe(
        catchError(err => {
          console.error('Failed to load summary:', err);
          return of([]);
        })
      ),
      target: this.targetService.getTarget().pipe(
        catchError(err => {
          console.error('Failed to load target:', err);
          return of({ targetRole: '', salaryTarget: '', targetDate: '', currentFocus: '', personalNotes: '' });
        })
      )
    }).subscribe({
      next: (res) => {
        // Track 1
        this.interviewSections = res.sectionsData.interview || res.sectionsData.sections || [];

        // Track 2
        if (res.sectionsData.dsa) {
          this.dsaSections = res.sectionsData.dsa.sections || [];
          this.leetcodeCategories = res.sectionsData.dsa.leetcodeCategories || [];
          this.studyStages = res.sectionsData.dsa.studyStages || [];
          this.dsaToc = res.sectionsData.dsa.toc || [];
          this.dsaPlatforms = res.sectionsData.dsa.platforms || [];
          this.solvingRoutine = res.sectionsData.dsa.solvingRoutine || [];
        }

        this.progressMap = res.progress || {};

        // Build summary map
        for (const item of (res.summary || [])) {
          this.summaryMap[String(item.sectionId)] = {
            total: item.total,
            completed: item.completed
          };
        }

        if (res.target) {
          this.targetData = {
            targetRole: res.target.targetRole || '',
            salaryTarget: res.target.salaryTarget || '',
            targetDate: res.target.targetDate || '',
            currentFocus: res.target.currentFocus || '',
            personalNotes: res.target.personalNotes || ''
          };
        }

        this.isLoading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  setTrack(track: 'interview' | 'dsa'): void {
    this.activeTrack = track;
    this.searchQuery = '';
    this.filterStatus = 'all';
    if (track === 'interview') {
      this.router.navigate(['/dashboard', 'interview', this.activeInterviewSectionId || 1]);
    } else {
      this.router.navigate(['/dashboard', 'dsa', this.activeDsaSectionId || '0']);
    }
  }

  getUserInitial(): string {
    if (!this.currentUser || !this.currentUser.name) return 'U';
    return this.currentUser.name.charAt(0).toUpperCase();
  }

  get isOAuthUser(): boolean {
    const provider = (this.currentUser?.provider || '').toLowerCase();
    return provider === 'google' || provider === 'github';
  }

  showDeleteAccountModal = false;
  isDeletingAccount = false;
  deleteAccountError = '';

  openDeleteAccountModal(): void {
    this.deleteAccountError = '';
    this.showDeleteAccountModal = true;
    this.cdr.markForCheck();
  }

  closeDeleteAccountModal(): void {
    if (!this.isDeletingAccount) {
      this.showDeleteAccountModal = false;
      this.deleteAccountError = '';
      this.cdr.markForCheck();
    }
  }

  confirmDeleteAccount(): void {
    if (this.isDeletingAccount) return;
    this.isDeletingAccount = true;
    this.deleteAccountError = '';
    this.cdr.markForCheck();

    this.authService.deleteAccount().subscribe({
      next: () => {
        this.isDeletingAccount = false;
        this.showDeleteAccountModal = false;
        this.router.navigate(['/login'], {
          queryParams: { account_deleted: 'true' }
        });
      },
      error: (err) => {
        this.isDeletingAccount = false;
        this.deleteAccountError = err?.error?.error || 'Failed to delete account. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  onLogout(): void {
    this.authService.logout();
  }

  saveTarget(): void {
    this.targetService.updateTarget(this.targetData).subscribe({
      next: () => {
        this.targetSavedMessage = 'Saved ✓';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.targetSavedMessage = '';
          this.cdr.markForCheck();
        }, 2000);
      },
      error: (err) => console.error('Error saving target:', err)
    });
  }

  // Generic Progress Helpers
  getProgressKey(sectionId: number | string, topicIndex: number | string, fieldName: string): string {
    return `${sectionId}-${topicIndex}-${fieldName}`;
  }

  isFieldCompleted(sectionId: number | string, topicIndex: number | string, fieldName: string): boolean {
    const key = this.getProgressKey(sectionId, topicIndex, fieldName);
    return !!this.progressMap[key];
  }

  toggleField(sectionId: number | string, topicIndex: number | string, fieldName: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const key = this.getProgressKey(sectionId, topicIndex, fieldName);
    this.progressMap[key] = isChecked;

    this.progressService.updateProgress(sectionId, topicIndex, fieldName, isChecked).subscribe({
      next: () => {
        if (fieldName === 'done') {
          this.updateLocalSummary(String(sectionId), isChecked);
        }
      },
      error: (err) => {
        console.error('Error updating progress:', err);
        this.progressMap[key] = !isChecked;
      }
    });
  }

  quickToggleTopic(sectionId: number | string, topicIndex: number | string): void {
    const currentVal = this.isFieldCompleted(sectionId, topicIndex, 'done');
    const newVal = !currentVal;
    const key = this.getProgressKey(sectionId, topicIndex, 'done');
    this.progressMap[key] = newVal;

    this.progressService.updateProgress(sectionId, topicIndex, 'done', newVal).subscribe({
      next: () => {
        this.updateLocalSummary(String(sectionId), newVal);
      },
      error: (err) => {
        console.error('Error updating progress:', err);
        this.progressMap[key] = currentVal;
      }
    });
  }

  private updateLocalSummary(sectionKey: string, isDone: boolean): void {
    if (!this.summaryMap[sectionKey]) {
      this.summaryMap[sectionKey] = { total: 0, completed: 0 };
    }

    if (isDone) {
      this.summaryMap[sectionKey].completed += 1;
    } else {
      this.summaryMap[sectionKey].completed = Math.max(0, this.summaryMap[sectionKey].completed - 1);
    }
  }

  getSectionCompleted(sectionId: number | string): number {
    return this.summaryMap[String(sectionId)]?.completed || 0;
  }

  getSectionPercent(section: Section): number {
    const completed = this.getSectionCompleted(section.id);
    if (!section.topics.length) return 0;
    return Math.round((completed / section.topics.length) * 100);
  }

  getDsaSectionPercent(sec: DsaSection): number {
    const completed = this.getSectionCompleted(`dsa_${sec.id}`);
    if (!sec.exercises.length) return 0;
    return Math.round((completed / sec.exercises.length) * 100);
  }

  // Interview Track Stats
  get totalInterviewTopics(): number {
    return this.interviewSections.reduce((acc, s) => acc + s.topics.length, 0);
  }

  get completedInterviewTopics(): number {
    let count = 0;
    for (const s of this.interviewSections) {
      count += this.getSectionCompleted(s.id);
    }
    return count;
  }

  get overallInterviewPercent(): number {
    if (!this.totalInterviewTopics) return 0;
    return Math.round((this.completedInterviewTopics / this.totalInterviewTopics) * 100);
  }

  // DSA Track Stats
  get totalDsaExercises(): number {
    return this.dsaSections.reduce((acc, s) => acc + s.exercises.length, 0);
  }

  get completedDsaExercises(): number {
    let count = 0;
    for (const s of this.dsaSections) {
      count += this.getSectionCompleted(`dsa_${s.id}`);
    }
    return count;
  }

  get totalLeetCodeProblems(): number {
    return this.leetcodeCategories.reduce((acc, c) => acc + c.problems.length, 0);
  }

  get completedLeetCodeProblems(): number {
    let count = 0;
    for (const cat of this.leetcodeCategories) {
      for (const p of cat.problems) {
        if (this.isFieldCompleted('leetcode', p.id, 'done')) {
          count++;
        }
      }
    }
    return count;
  }

  get totalDsaItems(): number {
    return this.totalDsaExercises + this.totalLeetCodeProblems;
  }

  get completedDsaItems(): number {
    return this.completedDsaExercises + this.completedLeetCodeProblems;
  }

  get overallDsaPercent(): number {
    if (!this.totalDsaItems) return 0;
    return Math.round((this.completedDsaItems / this.totalDsaItems) * 100);
  }

  // Global Multi-Track Stats
  get totalAllItems(): number {
    return this.totalInterviewTopics + this.totalDsaItems;
  }

  get completedAllItems(): number {
    return this.completedInterviewTopics + this.completedDsaItems;
  }

  get overallAllPercent(): number {
    if (!this.totalAllItems) return 0;
    return Math.round((this.completedAllItems / this.totalAllItems) * 100);
  }

  // Filtering for Interview Prep
  getFilteredTopics(sec: Section): Array<{ name: string; isNew: boolean; resources?: Array<{ url: string; text: string }> }> {
    return sec.topics.filter((topic, originalIdx) => {
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchesName = topic.name.toLowerCase().includes(q);
        const matchesResource = (topic.resources || []).some(r => r.text.toLowerCase().includes(q));
        if (!matchesName && !matchesResource) return false;
      }

      const isDone = this.isFieldCompleted(sec.id, originalIdx, 'done');
      if (this.hideCompleted && isDone) return false;
      if (this.filterStatus === 'completed') return isDone;
      if (this.filterStatus === 'pending') return !isDone;

      return true;
    });
  }

  // Filtering for DSA Exercises
  getFilteredExercises(sec: DsaSection): any[] {
    return sec.exercises.filter((ex, originalIdx) => {
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchesName = ex.name.toLowerCase().includes(q);
        const matchesDesc = ex.description.toLowerCase().includes(q);
        const matchesNum = ex.num.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesNum) return false;
      }

      const isDone = this.isFieldCompleted(`dsa_${sec.id}`, originalIdx, 'done');
      if (this.hideCompleted && isDone) return false;
      if (this.filterStatus === 'completed') return isDone;
      if (this.filterStatus === 'pending') return !isDone;

      return true;
    });
  }

  // Filtering for LeetCode
  getFilteredLeetCode(problems: any[]): any[] {
    return problems.filter((p) => {
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesId = p.id.toLowerCase().includes(q);
        if (!matchesTitle && !matchesId) return false;
      }

      const isDone = this.isFieldCompleted('leetcode', p.id, 'done');
      if (this.hideCompleted && isDone) return false;
      if (this.filterStatus === 'completed') return isDone;
      if (this.filterStatus === 'pending') return !isDone;

      return true;
    });
  }

  getOriginalTopicIndex(sec: Section, topic: any): number {
    return sec.topics.indexOf(topic);
  }

  getOriginalExerciseIndex(sec: DsaSection, ex: any): number {
    return sec.exercises.indexOf(ex);
  }

  // Focus Mode Navigation Getters & Steppers: Track 1 (Interview Prep)
  get currentInterviewSection(): Section | undefined {
    return this.interviewSections.find(s => String(s.id) === String(this.activeInterviewSectionId)) || this.interviewSections[0];
  }

  get currentInterviewIndex(): number {
    return this.interviewSections.findIndex(s => String(s.id) === String(this.activeInterviewSectionId));
  }

  get hasPrevInterviewSection(): boolean {
    return this.currentInterviewIndex > 0;
  }

  get hasNextInterviewSection(): boolean {
    return this.currentInterviewIndex >= 0 && this.currentInterviewIndex < this.interviewSections.length - 1;
  }

  prevInterviewSection(): void {
    if (this.hasPrevInterviewSection) {
      const prevSec = this.interviewSections[this.currentInterviewIndex - 1];
      this.navToSection(prevSec.id);
    }
  }

  nextInterviewSection(): void {
    if (this.hasNextInterviewSection) {
      const nextSec = this.interviewSections[this.currentInterviewIndex + 1];
      this.navToSection(nextSec.id);
    }
  }

  isCurrentInterviewSectionComplete(): boolean {
    const sec = this.currentInterviewSection;
    if (!sec || !sec.topics.length) return false;
    return this.getSectionCompleted(sec.id) === sec.topics.length;
  }

  // Focus Mode Navigation Getters & Steppers: Track 2 (DSA Workbook)
  get dsaNavItems(): Array<{ id: string; title: string; emoji: string }> {
    const items: Array<{ id: string; title: string; emoji: string }> = this.dsaSections.map(s => ({
      id: String(s.id),
      title: `${s.id}. ${s.title}`,
      emoji: s.emoji || '📝'
    }));
    items.push({ id: 'roadmap', title: 'LeetCode Roadmap (130+ Problems)', emoji: '🎯' });
    items.push({ id: 'routine', title: 'Solving Routine & Practice Links', emoji: '💡' });
    return items;
  }

  get currentDsaSection(): DsaSection | undefined {
    return this.dsaSections.find(s => String(s.id) === String(this.activeDsaSectionId)) || this.dsaSections[0];
  }

  get currentDsaNavIndex(): number {
    const currentId = String(this.activeDsaSectionId);
    return this.dsaNavItems.findIndex(item => item.id === currentId);
  }

  get hasPrevDsaSection(): boolean {
    return this.currentDsaNavIndex > 0;
  }

  get hasNextDsaSection(): boolean {
    return this.currentDsaNavIndex >= 0 && this.currentDsaNavIndex < this.dsaNavItems.length - 1;
  }

  prevDsaSection(): void {
    if (this.hasPrevDsaSection) {
      const prev = this.dsaNavItems[this.currentDsaNavIndex - 1];
      this.navToDsaSection(prev.id);
    }
  }

  nextDsaSection(): void {
    if (this.hasNextDsaSection) {
      const next = this.dsaNavItems[this.currentDsaNavIndex + 1];
      this.navToDsaSection(next.id);
    }
  }

  isCurrentDsaSectionComplete(): boolean {
    if (this.activeDsaSectionId === 'roadmap') {
      return this.completedLeetCodeProblems === this.totalLeetCodeProblems && this.totalLeetCodeProblems > 0;
    }
    const sec = this.currentDsaSection;
    if (!sec || !sec.exercises.length) return false;
    return this.getSectionCompleted(`dsa_${sec.id}`) === sec.exercises.length;
  }

  scrollToActiveSectionCard(): void {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const el = document.getElementById('active-section-anchor') || document.getElementById('active-dsa-anchor');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 380, behavior: 'smooth' });
        }
      }, 50);
    }
  }

  // Smart Resume Learning: Jump to next incomplete topic
  jumpToNextIncomplete(): void {
    if (this.activeTrack === 'interview') {
      for (const sec of this.interviewSections) {
        for (let i = 0; i < sec.topics.length; i++) {
          const isDone = this.isFieldCompleted(sec.id, i, 'done');
          if (!isDone) {
            this.navToSection(sec.id);
            this.highlightedTopicKey = `${sec.id}-${i}`;
            this.cdr.markForCheck();
            setTimeout(() => {
              const el = document.getElementById(`topic-row-${sec.id}-${i}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 80);
            setTimeout(() => {
              this.highlightedTopicKey = null;
              this.cdr.markForCheck();
            }, 3000);
            return;
          }
        }
      }
    } else {
      // DSA exercises
      for (const sec of this.dsaSections) {
        for (let i = 0; i < sec.exercises.length; i++) {
          const isDone = this.isFieldCompleted(`dsa_${sec.id}`, i, 'done');
          if (!isDone) {
            this.navToDsaSection(sec.id);
            this.highlightedTopicKey = `dsa_${sec.id}-${i}`;
            this.cdr.markForCheck();
            setTimeout(() => {
              const el = document.getElementById(`dsa-row-${sec.id}-${i}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 80);
            setTimeout(() => {
              this.highlightedTopicKey = null;
              this.cdr.markForCheck();
            }, 3000);
            return;
          }
        }
      }
      // Check LeetCode problems
      for (const cat of this.leetcodeCategories) {
        for (const p of cat.problems) {
          const isDone = this.isFieldCompleted('leetcode', p.id, 'done');
          if (!isDone) {
            this.navToDsaSection('roadmap');
            this.highlightedTopicKey = `leetcode-${p.id}`;
            this.cdr.markForCheck();
            setTimeout(() => {
              const el = document.getElementById(`leetcode-row-${p.id}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 80);
            setTimeout(() => {
              this.highlightedTopicKey = null;
              this.cdr.markForCheck();
            }, 3000);
            return;
          }
        }
      }
    }
  }

  // Collapse / Expand
  toggleSectionCollapse(sectionKey: string | number): void {
    const k = String(sectionKey);
    this.collapsedSections[k] = !this.collapsedSections[k];
  }

  isCollapsed(sectionKey: string | number): boolean {
    return !!this.collapsedSections[String(sectionKey)];
  }

  toggleAllSections(): void {
    this.allExpanded = !this.allExpanded;
    if (this.activeTrack === 'interview') {
      for (const sec of this.interviewSections) {
        this.collapsedSections[String(sec.id)] = !this.allExpanded;
      }
    } else {
      for (const sec of this.dsaSections) {
        this.collapsedSections[`dsa_${sec.id}`] = !this.allExpanded;
      }
    }
  }

  jumpToDsaSection(num: string | number): void {
    const numStr = String(num).trim();
    if (numStr === '—' || numStr === '-' || numStr.toLowerCase().includes('roadmap')) {
      this.activeDsaSectionId = 'roadmap';
      if (this.viewMode === 'all') {
        const el = document.getElementById('leetcode-roadmap');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        this.scrollToActiveSectionCard();
      }
      return;
    }
    if (numStr.toLowerCase().includes('routine') || numStr.toLowerCase().includes('link')) {
      this.activeDsaSectionId = 'routine';
      if (this.viewMode === 'all') {
        const el = document.getElementById('solving-routine-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        this.scrollToActiveSectionCard();
      }
      return;
    }
    this.activeDsaSectionId = numStr;
    if (this.viewMode === 'all') {
      const el = document.getElementById(`section-dsa-${numStr}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      this.scrollToActiveSectionCard();
    }
  }

  isNewSubsection(ex: DsaExercise, idx: number, list: DsaExercise[]): boolean {
    if (!ex.subsection) return false;
    if (idx === 0) return true;
    return list[idx - 1]?.subsection !== ex.subsection;
  }

  scrollToSection(sectionId: string | number): void {
    this.navToSection(sectionId);
  }

  navToSection(sectionId: string | number): void {
    const num = Number(sectionId);
    this.activeInterviewSectionId = isNaN(num) ? sectionId : num;
    this.router.navigate(['/dashboard', 'interview', sectionId]);
    this.closeSidebarMobile();
    this.scrollToActiveSectionCard();
  }

  navToDsaSection(num: string | number): void {
    const numStr = String(num).trim();
    if (numStr === '—' || numStr === '-' || numStr.toLowerCase().includes('roadmap')) {
      this.activeDsaSectionId = 'roadmap';
    } else if (numStr.toLowerCase().includes('routine') || numStr.toLowerCase().includes('link')) {
      this.activeDsaSectionId = 'routine';
    } else {
      this.activeDsaSectionId = numStr;
    }
    this.router.navigate(['/dashboard', 'dsa', this.activeDsaSectionId]);
    this.closeSidebarMobile();
    this.scrollToActiveSectionCard();
  }
}
