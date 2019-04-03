import { animate, style, transition, trigger } from '@angular/animations';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subscription, timer } from 'rxjs';
import { finalize, map, take, tap } from 'rxjs/operators';
import { ViewObject } from './models';
import { OrganizzeService } from './service';

const MONTHS_NAMES = [
  '',
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// const CLOSING_DATE = 1;
const TIMER_RELOAD = 3 * 60;

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

  private month: number;
  private year: number;
  private countdownTimer: Subscription;

  public dayProgress: number;
  public countdownPercent: number = 100;
  public loading = false;
  public budgets: ViewObject.Budget[] = [];
  public selectedBudget: ViewObject.Budget;

  constructor(
    private organizzeService: OrganizzeService
  ) { }

  ngOnInit() {
    this.changeMonth(0); // TODO: considerar data de corte da fatura
    this.chainFactory();
  }

  ngOnDestroy() {
    this.resetCountdown();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    switch (event.code) {
      case 'ArrowUp':
        this.prevBudget();
        break;
      case 'ArrowDown':
        this.nextBudget();
        break;
      case 'ArrowLeft':
        this.prevMonth();
        break;
      case 'ArrowRight':
        this.nextMonth();
        break;
      default:
        break;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(event.code) > -1) {
      event.preventDefault();
      return false;
    }
  }

  public get currentMonth() {
    return `${MONTHS_NAMES[this.month]}/${this.year}`;
  }

  private changeMonth(month: number = 0) {
    const today = new Date();
    const currentMonthYear = new Date(today.getFullYear(), today.getMonth());
    currentMonthYear.setTime(currentMonthYear.getTime() + currentMonthYear.getTimezoneOffset() * 60 * 1000);

    const baseMonth = this.month || currentMonthYear.getMonth() + 1;
    const baseYear = this.year || currentMonthYear.getFullYear();

    const baseMonthYear = new Date(baseYear, (baseMonth - 1) + month);
    baseMonthYear.setTime(baseMonthYear.getTime() + baseMonthYear.getTimezoneOffset() * 60 * 1000);

    if (currentMonthYear.getTime() === baseMonthYear.getTime()) {
      const totalDays: number = (new Date(currentMonthYear.getFullYear(), currentMonthYear.getMonth() + 1, 0)).getDate();
      const todayDay: number = (new Date()).getDate();
      this.dayProgress = (todayDay * 100) / totalDays; // TODO: considerar datas-ciclo de faturas

    } else {
      this.dayProgress = null;
    }

    this.month = baseMonthYear.getMonth() + 1;
    this.year = baseMonthYear.getFullYear();
  }

  private changeBudget(direction: number) {
    const currentId = this.selectedBudget ? this.selectedBudget.id : 0;
    const currentIndex = this.budgets.map(budget => budget.id).indexOf(currentId) || 0;

    let nextIndex = currentIndex + direction;
    if (nextIndex >= this.budgets.length) {
      nextIndex = 0;
    } else if (nextIndex < 0) {
      nextIndex = this.budgets.length - 1;
    }

    this.selectedBudget = this.budgets[nextIndex];
  }

  private prevBudget() {
    this.changeBudget(-1);
  }

  private nextBudget() {
    this.changeBudget(+1);
  }

  public prevMonth() {
    this.changeMonth(-1);
    this.chainFactory();
  }

  public nextMonth() {
    this.changeMonth(+1);
    this.chainFactory();
  }

  public showTransactions(budget: ViewObject.Budget) {
    this.selectedBudget = budget;
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
            this.chainFactory();
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

  private chainFactory(): Subscription {
    this.resetCountdown();
    this.loading = true;

    return forkJoin([
      this.organizzeService.getCategories(),
      this.organizzeService.getCards(),
      this.organizzeService.getBudgets(this.year, this.month),
      this.organizzeService.getAllTransactions(this.year, this.month),
    ])
      .pipe(
        map(([categories, cards, budgets, transactions]) => {
          const uniqueTransactions: ViewObject.Transaction[] = [];
          for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];
            const alreadyExists = !!uniqueTransactions.find(item => item.id === transaction.id);
            if (!alreadyExists) {
              uniqueTransactions.push(transaction);
            }
          }

          const newBudgets: ViewObject.Budget[] = budgets.map((budget) => {
            const category = categories.find(item => item.id === budget.category_id);

            const budgetTransactions = uniqueTransactions
              .filter(transaction => transaction.category_id === budget.category_id)
              .map((transaction) => {
                const card = cards.find(card => card.id === transaction.credit_card_id);
                if (card) {
                  transaction.credit_card_name = card.name;
                }
                return transaction;
              });

            const amount = budget.amount_in_cents / 100;
            const totalUsed = budgetTransactions.reduce((sum, item) => sum + item.amount, 0);
            const percentage = (totalUsed * 100) / amount;

            let newBudget: ViewObject.Budget;
            newBudget = {
              amount,
              totalUsed,
              percentage,
              id: budget.id,
              category_color: category.color,
              category_name: category.name,
              transactions: budgetTransactions,
            };
            return newBudget;
          });
          return newBudgets;
        }),
        map((budgets) => {
          const amount = budgets.reduce((sum, item) => sum + item.amount, 0);
          const totalUsed = budgets.reduce((sum, item) => sum + item.totalUsed, 0);
          const percentage = (totalUsed * 100) / amount;

          budgets.unshift({
            amount,
            totalUsed,
            percentage,
            id: 0,
            category_name: 'Total',
            category_color: '555',
            transactions: [],
          });
          return budgets;
        }),
        tap((budgets: ViewObject.Budget[]) => {
          this.budgets = budgets;
          // console.log('chainFactory_final', budgets);
        }),
        finalize(() => {
          this.selectedBudget = this.budgets.find(b => b.id === 0);
          this.startCountdown();
          setTimeout(() => this.loading = false, 300);
        })
      )
      .subscribe();
  }

  public formatRemaining(budget: ViewObject.Budget) {
    const result = budget.amount - budget.totalUsed;
    return result < 0 ? 0 : result;
  }
}
