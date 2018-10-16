import { animate, style, transition, trigger } from '@angular/animations';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Observable, Subscription, timer } from 'rxjs';
import { concatAll, finalize, map, reduce, take, tap } from 'rxjs/operators';
import { OrganizzeService } from './service';

const MONTHS_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// const CLOSING_DATE = 1;
const TIMER_RELOAD =  3 * 60;

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
export class AppComponent implements OnInit, OnDestroy {

  private startDate: Date;
  private endDate: Date;
  private countdownTimer: Subscription;

  public countdownPercent: number = 100;
  public loading = false;
  public total: ViewObject.Goal;
  public goals: ViewObject.Goal[] = [];

  constructor(
    private organizzeService: OrganizzeService
  ) { }

  ngOnInit() {
    this.setInitialDates();
    this.chainFactory().subscribe();
  }

  ngOnDestroy() {
    this.resetCountdown();
  }

  public get currentMonth() {
    return `${MONTHS_NAMES[this.startDate.getMonth()]}/${this.startDate.getFullYear()}`;
  }

  private setInitialDates() {
    this.startDate = new Date(this.getCurrentDate().getFullYear(), this.getCurrentDate().getMonth(), 1);
    this.endDate = this.getLastDayOfMonth(this.getCurrentDate());
  }

  private getCurrentDate() {
    const currentDate = new Date();
    /* if (currentDate.getDate() >= CLOSING_DATE) {
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    } */
    currentDate.setTime(currentDate.getTime() + currentDate.getTimezoneOffset() * 60 * 1000);
    return currentDate;
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

  private startCountdown() {
    this.resetCountdown();

    this.countdownTimer = timer(0, 1000)
      .pipe(
        take(TIMER_RELOAD + 1),
        map(value => TIMER_RELOAD - value),
        tap(value => this.countdownPercent = (value * 100) / TIMER_RELOAD),
        finalize(() => {
          if (this.countdownPercent === 0) {
            this.chainFactory().subscribe();
          }
        })
      )
      .subscribe();
  }

  private resetCountdown() {
    if (this.countdownTimer) {
      this.countdownTimer.unsubscribe();
    }
    this.countdownPercent = 100;
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

  private chainFactory(): Observable<ViewObject.Goal[]> {
    this.resetCountdown();
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
            const goal = (total.goal || 0) + goalItem.goal;
            const amount = (total.amount || 0) + goalItem.amount;
            const percent = (amount * 100) / goal;
            const balance = goal - amount;

            let color = 'green'; // TODO: Melhorar tonalidades
            if (percent >= 95) {
              color = 'red';
            } else if (percent > 75) {
              color = 'yellow';
            }

            return {
              percent,
              color,
              amount,
              goal,
              balance,
              id: null,
              name: 'Total',
              transactions: [],
            };
          }, {} as ViewObject.Goal);
          // console.log('chainFactory_final', goals);
        }),
        finalize(() => {
          this.startCountdown();
          setTimeout(() => this.loading = false, 300);
        })
      );
  }

}
