'use server'

import { getSession } from '@/lib/session'
import { getTenantDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Ensures system has an UNCATEGORIZED expense category to fall back on.
 */
async function ensureDefaultCategory(db: any) {
  let cat = await db.expenseCategory.findFirst({ where: { name: 'UNCATEGORIZED' } })
  if (!cat) {
    cat = await db.expenseCategory.create({
      data: { name: 'UNCATEGORIZED', description: 'System default category' }
    })
  }
  return cat.id
}

async function serializeExpense(db: any, exp: any) {
  const vendorWhere = exp.vendorEntityId
    ? Number.isNaN(Number(exp.vendorEntityId))
      ? { OR: [{ publicId: exp.vendorEntityId }] }
      : { OR: [{ publicId: exp.vendorEntityId }, { id: BigInt(exp.vendorEntityId) }] }
    : null

  const [category, vendors] = await Promise.all([
    exp.categoryId ? db.expenseCategory.findFirst({ where: { id: BigInt(exp.categoryId) } }).catch(() => null) : null,
    vendorWhere ? db.businessEntity.findMany({ where: vendorWhere, take: 1 }).catch(() => []) : [],
  ])
  const vendor = Array.isArray(vendors) ? vendors[0] : null

  return {
    ...exp,
    id: exp.id.toString(),
    vendorEntityId: exp.vendorEntityId?.toString() || null,
    categoryId: exp.categoryId?.toString() || null,
    vendorName: vendor?.name || 'Unknown Vendor',
    vendorPublicId: vendor?.publicId || null,
    categoryName: category?.name || 'UNCATEGORIZED',
    dateOfExpense: exp.dateOfExpense.toISOString(),
    createdAt: exp.createdAt.toISOString(),
  }
}

/**
 * Fetch all Expenses with relations.
 */
export async function getExpensesAction() {
  const session = await getSession()
  if (!session?.tenantId) return { expenses: [], error: 'Not authenticated' }

  try {
    const db = await getTenantDb(session.databaseName)
    const expenses = await db.expense.findMany({
      orderBy: { dateOfExpense: 'desc' },
    })

    // To construct the full view, we need to manually resolve vendorNames & categories
    const categories = await db.expenseCategory.findMany()
    const vendors = await db.businessEntity.findMany({
      where: { type: 'VENDOR' },
      select: { id: true, name: true, publicId: true }
    })

    const enriched = expenses.map((exp: any) => {
      const vendor = vendors.find((v: any) =>
        v.id.toString() === exp.vendorEntityId?.toString() || v.publicId === exp.vendorEntityId
      )
      const category = categories.find((c: any) => c.id.toString() === exp.categoryId?.toString())
      return {
        ...exp,
        id: exp.id.toString(),
        vendorEntityId: exp.vendorEntityId?.toString() || null,
        categoryId: exp.categoryId?.toString() || null,
        vendorName: vendor ? vendor.name : 'Unknown Vendor',
        vendorPublicId: vendor ? vendor.publicId : null,
        categoryName: category ? category.name : 'UNCATEGORIZED',
        dateOfExpense: exp.dateOfExpense.toISOString(),
        createdAt: exp.createdAt.toISOString()
      }
    })

    return { expenses: enriched }
  } catch (e: any) {
    console.error('[getExpensesAction]', e)
    return { expenses: [], error: 'Failed to fetch expenses' }
  }
}

/**
 * Create a new Expense
 */
export async function createExpenseAction(data: {
  amount: number
  description: string
  dateOfExpense: string
  vendorId?: string
  categoryId?: string
  receiptUrl?: string
}) {
  const session = await getSession()
  if (!session?.tenantId) return { success: false, error: 'Not authenticated' }

  try {
    const db = await getTenantDb(session.databaseName)

    let catId = data.categoryId
    if (!catId) {
      const defaultCat = await ensureDefaultCategory(db)
      catId = defaultCat.toString()
    }

    // Auto-approve if created by admin
    const isAutoApprove = session.role === 'SUPER_ADMIN' || session.role === 'TENANT_ADMIN'

    const expense = await db.expense.create({
      data: {
        amount: data.amount,
        description: data.description,
        dateOfExpense: new Date(data.dateOfExpense),
        vendorEntityId: data.vendorId || null,
        categoryId: catId,
        receiptUrl: data.receiptUrl,
        status: isAutoApprove ? 'APPROVED' : 'PENDING_APPROVAL',
        approvedBy: isAutoApprove ? session.userId : null
      }
    })

    revalidatePath('/dashboard/expenses')
    const expenseRecord = await db.expense.findUnique({
      where: { publicId: expense.publicId },
    })

    return {
      success: true,
      expenseId: expense.publicId,
      expense: expenseRecord ? await serializeExpense(db, expenseRecord) : null,
    }
  } catch (e: any) {
    console.error('[createExpenseAction]', e)
    return { success: false, error: 'Failed to create expense' }
  }
}

/**
 * Approve or Reject Expense
 */
export async function updateExpenseStatusAction(expensePublicId: string, status: 'APPROVED' | 'REJECTED' | 'PAID') {
  const session = await getSession()
  if (!session?.tenantId) return { success: false, error: 'Not authenticated' }

  if (session.role !== 'SUPER_ADMIN' && session.role !== 'TENANT_ADMIN') {
    return { success: false, error: 'Unauthorized. Only Admins can approve expenses.' }
  }

  try {
    const db = await getTenantDb(session.databaseName)
    const updated = await db.expense.update({
      where: { publicId: expensePublicId },
      data: { 
        status, 
        approvedBy: (status === 'APPROVED' || status === 'PAID') ? session.userId : null 
      }
    })
    
    revalidatePath('/dashboard/expenses')
    return {
      success: true,
      expense: await serializeExpense(db, updated),
    }
  } catch (e: any) {
    console.error('[updateExpenseStatusAction]', e)
    return { success: false, error: 'Failed to update expense status.' }
  }
}

/**
 * Fetch available expense categories
 */
export async function getExpenseCategoriesAction() {
  const session = await getSession()
  if (!session?.tenantId) return []

  try {
    const db = await getTenantDb(session.databaseName)
    const categories = await db.expenseCategory.findMany({
      orderBy: { name: 'asc' }
    })
    return categories.map((c: any) => ({ ...c, id: c.id.toString() }))
  } catch (e) {
    return []
  }
}
