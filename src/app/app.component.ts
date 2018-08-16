import { animate, style, transition, trigger } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { finalize, mergeMap, tap } from 'rxjs/operators';

const BASE_URL = 'https://api.organizze.com.br/rest/v2';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    trigger('enterAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate(150, style({ opacity: 1 }))
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate(300, style({ opacity: 0 }))
      ])
    ])
  ]
})
export class AppComponent implements OnInit {

  public loading = false;
  public categories = [];
  public transactions = [];

  constructor (
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.refreshData();
  }

  public refreshData() {
    this.loading = true;
    this.getCategories()
    .subscribe(() => {
      this.getTransactions('2018-08-01', '2018-08-31', [], 1)
      .pipe(finalize(() => {
        this.loading = false;
      }))
      .subscribe((response) => {
        this.transactions = response;
      });
    });
  }

  private getCategories() {
    return this.http
    .get(`${BASE_URL}/categories`)
    .pipe(tap((response: any[]) => { this.categories = response; }));
  }

  private getTransactions(starDate: string, endDate: string, lastResult: any[], page: number = 1) {
    const result = { continue: true };

    return this.http
    .get(`${BASE_URL}/transactions?start_date=${starDate}&end_date=${endDate}&page=${page}`)
    .pipe(
      mergeMap((response: any[]) => {
        const newResult = lastResult.concat(this.handleTransaction(response));

        if (response && response.length >= 100) {
          return this.getTransactions(starDate, endDate, newResult, page + 1);
        }

        return of(newResult);
      })
    );
  }

  /*
  private getTransactions(starDate: string, endDate: string, page: number = 1) {
    return this.http
    .get(`${BASE_URL}/transactions?start_date=${starDate}&end_date=${endDate}&page=${page}`)
    .pipe(tap((response: any[]) => {

      if (response && response.length >= 100) {
        return this.getTransactions(starDate, endDate, page + 1);
      }

      this.loading = false;
    }))
    .subscribe();
  }
  */

  private handleTransaction(transactions: any[]) {
    return transactions
    .filter(item =>
      item.amount_cents < 0                // Somente receitas
      && item.category_id                  // Tem que ter uma categoria
      && !item.paid_credit_card_id         // Nao conta pagamentos de fatura
      && !item.paid_credit_card_invoice_id // Nao conta pagamentos de fatura
    )
    .map(item => {
      const newItem = {
        id: item.id,
        description: item.description,
        date: item.date,
        paid: item.paid,
        amount_cents: item.amount_cents,
        account_id: item.account_id,
        category_id: item.category_id,
        credit_card: null,
      };
      if (item.credit_card_id && item.credit_card_invoice_id) {
        newItem.credit_card = {
          id: item.credit_card_id,
          invoice_id: item.credit_card_invoice_id,
        };
      }

      return newItem;
    });
  }
}
