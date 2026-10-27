import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProgressSummary } from '../models/section.model';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private http = inject(HttpClient);

  public getProgress(): Observable<Record<string, boolean>> {
    return this.http.get<{ progress: Record<string, boolean> }>(`${environment.apiUrl}/progress`).pipe(
      map(res => res.progress || {})
    );
  }

  public updateProgress(
    sectionId: number | string,
    topicIndex: number | string,
    fieldName: string,
    isCompleted: boolean
  ): Observable<{ message: string; key: string; isCompleted: boolean }> {
    return this.http.put<{ message: string; key: string; isCompleted: boolean }>(
      `${environment.apiUrl}/progress`,
      { sectionId, topicIndex, fieldName, isCompleted }
    );
  }

  public getSummary(): Observable<ProgressSummary[]> {
    return this.http.get<{ summary: ProgressSummary[] }>(`${environment.apiUrl}/progress/summary`).pipe(
      map(res => res.summary || [])
    );
  }
}
