import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { concatAll, concatMap, map, reduce } from 'rxjs/operators';
import { Responses } from './models';

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
        map((budgets) => {
          const sumAmountInCents = budgets.reduce((sum, budget) => sum + budget.amount_in_cents, 0);
          const sumTotal = budgets.reduce((sum, budget) => sum + budget.total, 0);
          const percentageTotal = ((sumTotal * 100) / sumAmountInCents).toFixed(2);

          budgets.unshift({
            id: 0,
            category_id: 0,
            amount_in_cents: sumAmountInCents,
            total: sumTotal,
            percentage: percentageTotal,
            date: null,
            activity_type: null,
            predicted_total: null,
          });

          return budgets;
        }),
      );
  }

  public getCategories() {
    return this.http
      .get<Responses.Category[]>(`${BASE_URL}/categories`)
      .pipe(
        map((categories) => {
          categories.push({
            id: 0,
            name: 'Total',
            color: '000',
          });
          return categories;
        })
        // concatAll(),
        // tap(items => console.log('categories', items)),
      );
  }

  // TODO: ainda usa?
  /* public getAllTransactions(startDate: Date, endDate: Date) {
    return this.getTransactions(startDate, endDate)
    .pipe(
      concatAll(),
      filter(item => item.amount_cents < 0),
      map((item) => {
        const newItem: ViewObject.Transaction = {
          id: item.id,
          description: item.description,
          date: this.parseDate(item.date),
          paid: item.paid,
          amount: Math.abs(item.amount_cents) / 100,
          category_id: item.category_id,
          card_name: item.card_name,
        };
        return newItem;
      }),
      // tap(items => console.log('chainFactory_transactions', items)),
      );
    } */

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

  private getTransactions(startDate: Date, endDate: Date) {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);

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

  // TODO: get METAS from API

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
