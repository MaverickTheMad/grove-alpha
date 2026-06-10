// Ledger record types. Each legacy budget.* table maps to one record type
// (see scripts/migrate-ledger.js). The record's id IS the row id (preserved on
// migration) so cross-references (transaction.category_id, debt_payments.debt_id,
// goal_contributions.goal_id, person.primary_paycheck_id, …) keep working.

export const APP = 'ledger'

export const TYPES = {
  paycheck: 'paycheck',
  account: 'account',
  category: 'category',
  bill: 'bill',
  billPayment: 'bill_payment',
  monthlyBudget: 'monthly_budget',
  transaction: 'transaction',
  goal: 'goal',
  goalContribution: 'goal_contribution',
  debt: 'debt',
  debtPayment: 'debt_payment',
  rule: 'rule',
  statementImport: 'statement_import',
  appSetting: 'app_setting',
  personSettings: 'person_settings', // per-member { primary_paycheck_id } (was on core.people)
}

// Map a legacy table name -> record type, for the migration + any generic loads.
export const TABLE_TYPE = {
  paychecks: TYPES.paycheck,
  accounts: TYPES.account,
  categories: TYPES.category,
  bills: TYPES.bill,
  bill_payments: TYPES.billPayment,
  monthly_budgets: TYPES.monthlyBudget,
  transactions: TYPES.transaction,
  goals: TYPES.goal,
  goal_contributions: TYPES.goalContribution,
  debts: TYPES.debt,
  debt_payments: TYPES.debtPayment,
  rules: TYPES.rule,
  statement_imports: TYPES.statementImport,
  app_settings: TYPES.appSetting,
}
