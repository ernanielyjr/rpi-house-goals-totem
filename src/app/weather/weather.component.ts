import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-weather',
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.scss'],
})
export class WeatherComponent implements OnInit {
  public weather: any;

  constructor(
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.loadWeather();
  }

  private async loadWeather() {
    const response = await this.http.get('/api/weather/novo-hamburgo').toPromise() as any;
    response.daily.data = response.daily.data.slice(0, 4);
    console.log('=== weather ===', response);
    this.weather = response;
  }
}
