import { animate, style, transition, trigger } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { forkJoin, Observable, from, of } from 'rxjs';
import { concatAll, reduce, tap, filter, map, finalize } from 'rxjs/operators';
import { OrganizzeService } from './service';

const MONTHS_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const currentDate = new Date();

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

  private startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  private endDate = this.getLastDayOfMonth(currentDate);

  public loading = false;
  public total: ViewObject.Goal;
  public goals: ViewObject.Goal[] = [];

  constructor (
    private organizzeService: OrganizzeService
  ) { }

  ngOnInit() {
    this.chainFactory().subscribe();
  }

  public get currentMonth() {
    return `${MONTHS_NAMES[this.startDate.getMonth()]}/${this.startDate.getFullYear()}`;
  }

  private changeMonth(month: number) {
    const baseDate = this.startDate;
    this.startDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + month, 1);
    this.endDate = this.getLastDayOfMonth(this.startDate);
  }

  public prevMonth() {
    this.changeMonth(-1);
    this.chainFactory().subscribe();
  }

  public nextMonth() {
    this.changeMonth(+1);
    this.chainFactory().subscribe();
  }

  private getLastDayOfMonth(baseDate: Date): Date {
    return new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  }

  private mergeGroups(final: ViewObject.CategoryHashMap, item: ViewObject.CategoryHashMap): ViewObject.CategoryHashMap {
    if (!final) {
      return item;
    }

    return Object.keys(item).reduce((full: ViewObject.CategoryHashMap, key: string) => {
      if (full[key] && full[key].goal) {
        full[key].transactions = item[key].transactions;
        full[key].amount = full[key].transactions.reduce((sum: number, item: ViewObject.Transaction) => {
          return sum + item.amount;
        }, 0);
        full[key].amount = Math.round(full[key].amount * 100) / 100;
        full[key].balance = full[key].goal - full[key].amount;
        full[key].percent = (full[key].amount * 100) / full[key].goal;
      }

      return full;
    }, final);
  }

  private chainFactory(): Observable<any> {
    this.loading = true;

    return forkJoin([
      this.organizzeService.getCategories(),
      this.organizzeService.getAllTransactions(this.startDate, this.endDate),
    ])
    .pipe(
      concatAll(),
      reduce(this.mergeGroups, null as ViewObject.CategoryHashMap),
      reduce((all: ViewObject.Goal[], categoryHashMap: ViewObject.CategoryHashMap) => {
        const categoryTransaction = Object.keys(categoryHashMap).map((key) => {
          return categoryHashMap[key] as ViewObject.Goal;
        });
        return all.concat(categoryTransaction);
      }, [] as ViewObject.Goal[]),
      tap((goals: ViewObject.Goal[]) => {
        this.goals = goals;
        this.total = goals.reduce((total, goalItem) => {
          const goalSum  = (total.goal || 0) + goalItem.goal;
          const amountSum = (total.amount || 0) + goalItem.amount;

          return {
            id: null,
            name: 'Total',
            color: 'rgba(0, 0, 0, 0.7)',
            goal: goalSum,
            amount: amountSum,
            balance: goalSum - amountSum,
            transactions: [],
            percent: (amountSum * 100) / goalSum,
          };
        }, {} as ViewObject.Goal);
        // console.log('chainFactory_final', goals);
      }),
      finalize(() => setTimeout(() => this.loading = false, 300)),
    );
  }

}
