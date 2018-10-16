import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, Observable, of, empty } from 'rxjs';
import { concatAll, concatMap, filter, map, mergeMap, reduce, catchError } from 'rxjs/operators';

const BASE_URL = '/rest/v2';

@Injectable()
export class OrganizzeService {
  constructor(
    private http: HttpClient
  ) { }

  public getCategories() {
    return this.http
    .get<Responses.Category[]>(`${BASE_URL}/categories`)
    .pipe(
      concatAll(),
      filter(item => item.name.indexOf('|') !== -1),
      reduce((categories, item: Responses.Category) => {
        const nameAndGoal = item.name.split('|');
        categories[item.id] = {
          id:           item.id,
          name:         nameAndGoal[0],
          goal:         parseInt(nameAndGoal[1], 10),
          color:        `#${item.color}`,
          parent_id:    item.parent_id,
          amount:       0,
          percent:      0,
          balance:      0,
          transactions: [],
        };
        return categories;
      }, <ViewObject.CategoryHashMap>{}),
      // tap(items => console.log('categories', items)),
    );
  }

  public getAllTransactions(startDate: Date, endDate: Date) {
    return this.getTransactions(startDate, endDate)
    .pipe(
      concatAll(),
      filter(item => item.amount_cents < 0),
      map((item) => {
        const newItem: ViewObject.Transaction = {
          id:          item.id,
          description: item.description,
          date:        this.parseDate(item.date),
          paid:        item.paid,
          amount:      Math.abs(item.amount_cents) / 100,
          category_id: item.category_id,
          card_name:   item.card_name,
        };
        return newItem;
      }),
      reduce(this.groupTransactionsReduce, {} as ViewObject.CategoryHashMap),
      // tap(items => console.log('chainFactory_transactions', items)),
    );
  }

  private groupTransactionsReduce(all: ViewObject.CategoryHashMap, item: ViewObject.Transaction): ViewObject.CategoryHashMap {
    if (!all[item.category_id]) {
      all[item.category_id] = <ViewObject.Goal>{};
    }
    all[item.category_id].transactions = all[item.category_id].transactions || [];
    all[item.category_id].transactions.push(item);
    return all;
  }

  private getTransactionsWithPage(
    start: string,
    end: string,
    page: number,
    oldItems: Responses.Transaction[]
  ): Observable<Responses.Transaction[]> {
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
