import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

const TYPES = {
  'clear-day': {
    icon: 'wu-clear',
    label: 'Dia claro'
  },
  'clear-night': {
    icon: 'wu-night wu-clear',
    label: 'Noite clara'
  },
  rain: {
    icon: 'wu-rain',
    label: 'Chuva'
  },
  snow: {
    icon: 'wu-snow',
    label: 'Neve'
  },
  sleet: {
    icon: 'wu-sleet',
    label: 'Chuva com Neve'
  },
  wind: {
    icon: 'wu-unknown',
    label: 'Vento'
  },
  fog: {
    icon: 'wu-fog',
    label: 'Neblina'
  },
  cloudy: {
    icon: 'wu-cloudy',
    label: 'Nublado'
  },
  'partly-cloudy-night': {
    icon: 'wu-night wu-partlycloudy',
    label: 'Parcialmente Nublado'
  },
  'partly-cloudy-day': {
    icon: 'wu-partlycloudy',
    label: 'Parcialmente Nublado'
  },
  hail: {
    icon: 'wu-sleet',
    label: 'Granizo'
  },
  thunderstorm: {
    icon: 'wu-tstorms',
    label: 'Tempestade'
  },
  tornado: {
    icon: 'wu-tstorms',
    label: 'Tornado'
  }
};

@Component({
  selector: 'app-weather',
  templateUrl: './weather.component.html',
  styleUrls: ['./weather.component.scss'],
})
export class WeatherComponent implements OnInit {
  public today: any;
  public nextDays: any[];
  public types = TYPES;
  public greet: string;

  constructor(
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.loadWeather();
  }

  private async loadWeather() {
    const response = await this.http.get('/api/weather/novo-hamburgo').toPromise() as any;
    this.nextDays = response.daily.data.slice(0, 7);
    this.today = this.nextDays.shift();
    this.greet = this.getGreet();
  }

  private getGreet() {
    const hours = (new Date()).getHours();

    if (hours < 4) {
      return 'Hora de dormir!';
    }

    if (hours < 8) {
      return 'Madrugou, hein?!';
    }

    if (hours < 12) {
      return 'Bom dia!';
    }

    if (hours < 18) {
      return 'Boa tarde!';
    }

    if (hours < 24) {
      return 'Boa noite!';
    }

    return 'Olá!';
  }
}
