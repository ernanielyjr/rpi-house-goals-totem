namespace ViewObject {
  export interface Transaction {
    id: number;
    description: string;
    date: Date;
    paid: boolean;
    amount: number;
    category_id: number;
    card_name?: string;
  }

  export interface Goal extends Responses.Category {
    transactions: Transaction[];
    goal: number;
    amount: number;
    percent: number;
    balance: number;
  }

  export interface CategoryHashMap {
    [key: number]: Goal;
  }
}

namespace Responses {
  export interface Account {
    id: number;
    name: string;
    description?: string;
    archived: boolean;
    created_at: string;
    updated_at: string;
    default: boolean;
    type: string;
  }

  export interface Category {
    id: number;
    name: string;
    color: string;
    parent_id?: number;
  }

  export interface Card {
    id: number;
    name: string;
    description?: number;
    card_network: string;
    closing_day: number;
    due_day: number;
    limit_cents: number;
    archived: boolean;
    default: boolean;
    created_at: string;
    updated_at: string;
    type: string;
  }

  export interface Invoice {
    id: number;
    date: string;
    starting_date: string;
    closing_date: string;
    amount_cents: number;
    payment_amount_cents: number;
    balance_cents: number;
    previous_balance_cents: number;
    credit_card_id: number;
    transactions?: Transaction[];
    card_name?: string;
  }

  export interface Transaction {
    id: number;
    description: string;
    date: string;
    paid: boolean;
    amount_cents: number;
    total_installments: number;
    installment: number;
    recurring: boolean;
    account_id: number;
    account_type: string;
    category_id: number;
    cost_center_id?: number;
    contact_id?: number;
    notes?: string;
    attachments_count: number;
    credit_card_id: number;
    credit_card_invoice_id: number;
    paid_credit_card_id?: number;
    paid_credit_card_invoice_id?: number;
    oposite_transaction_id?: number;
    oposite_account_id?: number;
    created_at: string;
    updated_at: string;
    card_name?: string;
  }
}
