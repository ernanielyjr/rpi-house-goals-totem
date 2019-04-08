import { registerLocaleData } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import pt from '@angular/common/locales/pt';
import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgbCarouselModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { BudgetsComponent } from './budgets/budgets.component';
import { RootComponent } from './root/root.component';
import { OrganizzeService } from './service';

registerLocaleData(pt, 'pt-BR');

@NgModule({
  declarations: [
    RootComponent,
    BudgetsComponent,
  ],
  imports: [
    BrowserModule,
    NgbModule,
    NgbCarouselModule,
    BrowserAnimationsModule,
    HttpClientModule,
  ],
  providers: [
    {
      provide: LOCALE_ID,
      useValue: 'pt-BR'
    },
    OrganizzeService,
  ],
  bootstrap: [RootComponent]
})
export class AppModule { }
