import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, empty } from 'rxjs';
import { concatAll, concatMap, map, reduce, filter, catchError, mergeMap, tap } from 'rxjs/operators';
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
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return forkJoin([
      this.getTransactions(startDate, endDate),
      this.getCardsTransactions(startDate, endDate),
    ])
      .pipe(
        map(([transactions, cardsTransactions]) => transactions.concat(cardsTransactions)),
        map(transactions => transactions.filter(
          (item) => {
            const itemDate = this.parseDate(item.date);
            const isBetween = item.total_installments === 1 || (startDate <= itemDate && itemDate <= endDate);

            // REVIEW: if (item.description.indexOf('Roupas') !== -1) {
            // REVIEW:   console.log('---', item.date, item.installment, item.total_installments, isBetween, item.description);
            // REVIEW: } else if (!isBetween) {
            // REVIEW:   console.log(item.date, item.installment, item.total_installments, isBetween, item.description);
            // REVIEW: }

            return item.amount_cents < 0 && (item.paid || item.credit_card_id) && isBetween;
          }
        )),
        map((transactions) => {
          const newTransactions: ViewObject.Transaction[] = transactions
            .map(item => ({
              id: item.id,
              description: item.description,
              date: this.parseDate(item.date),
              paid: item.paid,
              amount: Math.abs(item.amount_cents) / 100,
              category_id: item.category_id,
              credit_card_id: item.credit_card_id,
              installment: item.installment,
              total_installments: item.total_installments
            }))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
          return newTransactions;
        }),
        // tap(items => console.log('chainFactory_transactions', items)),
      );
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
        filter(item => !item.paid_credit_card_id),
        map((item) => {
          // REVIEW: if (item.total_installments > 1) {
          // REVIEW:   item.description = `${item.description} ${item.installment}/${item.total_installments}`;
          // REVIEW: }

          return item;
        }),
        reduce((all, item: Responses.Transaction) => all.concat(item), [] as Responses.Transaction[]),
        // tap(item => console.log('getTransactions', item)),
      );
  }

  public getCards() {
    return this.http
      .get<Responses.Card[]>(`${BASE_URL}/credit_cards`)
      .pipe(
        filter(cards => !!cards.length)
        // tap(item => console.log('getCards', item)),
      );
  }

  private getCardInvoices(card: Responses.Card, startDate: Date, endDate: Date) {
    return this.http
      .get<Responses.Invoice[]>(`${BASE_URL}/credit_cards/${card.id}/invoices`)
      .pipe(
        filter(invoices => !!invoices.length),
        concatAll(),
        filter((item) => {
          const itemDate = this.parseDate(item.date);
          const isBetween = startDate <= itemDate && itemDate <= endDate;
          return isBetween;
        }),
        // tap(item => console.log('getCardInvoices', item)),
      );
  }

  private getInvoiceTransactions(invoice: Responses.Invoice) {
    return this.http
      .get<Responses.Invoice>(`${BASE_URL}/credit_cards/${invoice.credit_card_id}/invoices/${invoice.id}`)
      .pipe(
        map(invoice => invoice.transactions),
        filter(transactions => !!transactions.length),
        map((transactions) => {
          return transactions.map((item) => {
            // REVIEW: if (item.total_installments > 1) {
            // REVIEW:   item.description = `${item.description} ${item.installment}/${item.total_installments}`;
            // REVIEW: }
            return item;
          });
        }),
        catchError((err) => {
          console.log(err);
          return empty();
        }),
        // tap(item => console.log('getInvoiceTransactions', item)),
      );
  }

  private getCardsTransactions(startDate: Date, endDate: Date) {
    return this.getCards()
      .pipe(
        concatAll(),
        mergeMap(card => this.getCardInvoices(card, startDate, endDate)),
        mergeMap(invoice => this.getInvoiceTransactions(invoice)),
        reduce((all, item) => all.concat(item), [] as Responses.Transaction[]),
        // tap(item => console.log('getCardsTransactions', item)),
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
