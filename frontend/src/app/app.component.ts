import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'PrepMaster Pro';

  ngOnInit(): void {
    console.log(
      '%c🚀 Architected & Developed by Siva Bala Keerthick',
      'color: #2563eb; font-size: 14px; font-weight: 800; padding: 4px 0;'
    );
  }
}
