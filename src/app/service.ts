import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { concatAll, concatMap, map, reduce, filter } from 'rxjs/operators';
import { Responses, ViewObject } from './models';

const BASE_URL = '/rest/v2';

@Injectable()
export class OrganizzeService {
  constructor(
    private http: HttpClient
  ) { }

  public getBudgets(year?: number, month?: number) {
    const add = ['', year, month].filter(el => el != null).join('/');
    return this.http
      .get<Responses.Budget[]>(`${BASE_URL}/budgets${add}`)
      .pipe(
        map(budgets => budgets.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))),
      );
  }

  public getCategories() {
    return this.http
      .get<Responses.Category[]>(`${BASE_URL}/categories`)
      .pipe(
        // tap(items => console.log('categories', items)),
      );
  }

  public getAllTransactions(year: number, month: number) {
    return this.getTransactions(year, month)
      .pipe(
        map(transactions => transactions.filter(item => item.amount_cents < 0)),
        map((transactions) => {
          const newTransactions: ViewObject.Transaction[] = transactions.map(item => ({
            id: item.id,
            description: item.description,
            date: this.parseDate(item.date),
            paid: item.paid,
            amount: Math.abs(item.amount_cents) / 100,
            category_id: item.category_id,
            card_name: item.card_name,
          }));
          return newTransactions;
        }),
        // tap(items => console.log('chainFactory_transactions', items)),
      );
  }

  private getTransactionsWithPage(start: string, end: string, page: number, oldItems: Responses.Transaction[])
    : Observable<Responses.Transaction[]> {
    return this.http
      .get<Responses.Transaction[]>(`${BASE_URL}/transactions?start_date=${start}&end_date=${end}&page=${page}`)
      .pipe(
        concatMap((items) => {
          const newItems = oldItems.concat(items);
          if (items.length >= 100) {
            return this.getTransactionsWithPage(start, end, page + 1, newItems);
          }
          return of(newItems);
        }),
      );
  }

  private getTransactions(year: number, month: number) {
    const start = this.formatDate(new Date(year, month - 1, 1));
    const end = this.formatDate(new Date(year, month , 0));

    return this.getTransactionsWithPage(start, end, 1, [])
      .pipe(
        concatAll(),
        map((item) => {
          if (item.total_installments > 1) {
            item.description = `${item.description} ${item.installment}/${item.total_installments}`;
          }

          return item;
        }),
        reduce((all, item: Responses.Transaction) => all.concat(item), [] as Responses.Transaction[]),
        // tap(item => console.log('getTransactions', item)),
      );
  }

  private formatDate(dateObj: Date) {
    const mm = dateObj.getMonth() + 1;
    const dd = dateObj.getDate();

    return [
      dateObj.getFullYear(),
      (mm > 9 ? '' : '0') + mm,
      (dd > 9 ? '' : '0') + dd
    ].join('-');
  }

  private parseDate(dateStr: string) {
    const arrDate = dateStr.split('-');
    return new Date(parseInt(arrDate[0], 10), parseInt(arrDate[1], 10) - 1, parseInt(arrDate[2], 10));
  }

}
