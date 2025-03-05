import DashboardLayout from "@/components/dashboard-layout"
import ExpenseForm from "@/components/expenses/expense-form"

export default function AddExpensePage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Add Expense</h1>
        </div>
        <ExpenseForm />
      </div>
    </DashboardLayout>
  )
}

