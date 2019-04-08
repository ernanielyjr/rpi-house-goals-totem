import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

const LISTS_TO_SHOW = ['Esta semana', 'Fazendo'];

@Component({
  selector: 'app-trello',
  templateUrl: './trello.component.html',
  styleUrls: ['./trello.component.scss'],
})
export class TrelloComponent implements OnInit {
  public lists: any[] = [];
  public loading = false;

  constructor(
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.getBoard();
  }

  private async getBoard() {
    this.loading = true;
    const response = await this.http.get('/api/trello').toPromise() as any;
    const filteredLists = response.lists.filter(list => LISTS_TO_SHOW.indexOf(list.name) !== -1) as any[];
    const filledLists = filteredLists.map((list) => {
      list.cards = response.cards.filter(card => card.idList === list.id);
      return list;
    });

    this.lists = filledLists;

    this.loading = false;
  }

}
