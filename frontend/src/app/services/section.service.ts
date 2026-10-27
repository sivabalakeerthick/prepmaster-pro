import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SectionsApiResponse } from '../models/section.model';

@Injectable({
  providedIn: 'root'
})
export class SectionService {
  private http = inject(HttpClient);
  private cachedData: SectionsApiResponse | null = null;

  public getSectionsData(): Observable<SectionsApiResponse> {
    if (this.cachedData) {
      return of(this.cachedData);
    }
    return this.http.get<SectionsApiResponse>(`${environment.apiUrl}/sections`).pipe(
      tap(data => this.cachedData = data)
    );
  }
}
