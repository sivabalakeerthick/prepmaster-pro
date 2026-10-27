import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TargetData } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class TargetService {
  private http = inject(HttpClient);

  public getTarget(): Observable<TargetData> {
    return this.http.get<TargetData>(`${environment.apiUrl}/target`);
  }

  public updateTarget(data: Partial<TargetData>): Observable<TargetData> {
    return this.http.put<TargetData>(`${environment.apiUrl}/target`, data);
  }
}
