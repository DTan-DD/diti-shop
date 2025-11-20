# 🛒 Cart Sync Implementation Guide

## 📋 Overview

This guide documents the complete cart synchronization system that allows users to maintain their shopping cart across sessions and devices.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────────┐            │
│  │  Zustand     │◄────────┤  CartProvider    │            │
│  │  Store       │         │  (Auth Listener) │            │
│  └──────┬───────┘         └──────────────────┘            │
│         │                                                   │
│         │ persist                                           │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │ localStorage │                                          │
│  └──────────────┘                                          │
│         │                                                   │
│         │ sync (if logged in)                              │
│         ▼                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │
          │ Server Actions
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Next.js)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐                                  │
│  │  cart-db.actions.ts  │                                  │
│  │  - getUserCartFromDB │                                  │
│  │  - saveCartToDB      │                                  │
│  │  - mergeAndValidate  │                                  │
│  └──────────┬───────────┘                                  │
│             │                                               │
│             ▼                                               │
│  ┌──────────────────────┐                                  │
│  │     MongoDB          │                                  │
│  │  ┌────────────────┐  │                                  │
│  │  │  Cart Model    │  │                                  │
│  │  │  - userId      │  │                                  │
│  │  │  - items[]     │  │                                  │
│  │  │  - prices      │  │                                  │
│  │  └────────────────┘  │                                  │
│  └──────────────────────┘                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1️⃣ Guest User Flow

```
User visits site (not logged in)
        ↓
CartProvider detects: session = null
        ↓
initializeCart() → Load from localStorage
        ↓
User adds/removes items
        ↓
Changes saved to localStorage only
        ↓
User can continue shopping across page reloads
```

### 2️⃣ Login Flow

```
Guest user with cart clicks "Sign In"
        ↓
NextAuth sign-in successful
        ↓
CartProvider detects: session changed (null → userId)
        ↓
mergeGuestCartOnLogin(userId) triggered
        ↓
┌─────────────────────────────────────────┐
│ 1. Load cart from DB (if exists)       │
│ 2. Merge with localStorage cart        │
│ 3. Validate stock & prices             │
│ 4. Auto-adjust quantities               │
│ 5. Remove out-of-stock items            │
│ 6. Save merged cart to DB               │
└─────────────────────────────────────────┘
        ↓
Show warnings if any changes
        ↓
Cart ready (synced to DB)
```

### 3️⃣ Logged User Flow

```
User adds item to cart
        ↓
addItem() → Update localStorage (optimistic)
        ↓
syncWithDB() → Save to MongoDB (debounced 500ms)
        ↓
Both localStorage and DB updated
        ↓
User can access cart from any device
```

### 4️⃣ Logout Flow

```
User clicks "Sign Out"
        ↓
setAuthState(false, null)
        ↓
signOut() → Clear session
        ↓
CartProvider detects: session changed (userId → null)
        ↓
initializeCart() → Switch to guest mode
        ↓
localStorage cart remains (guest can continue)
DB cart preserved for next login
```

---

## 📁 File Structure

```
project/
├── lib/
│   ├── db/
│   │   └── models/
│   │       └── cart.model.ts           ✅ MongoDB schema
│   │
│   ├── actions/
│   │   ├── cart-db.actions.ts          ✅ DB CRUD operations
│   │   └── cart.actions.ts             ⚠️ Modified (helpers)
│   │
│   └── utils/
│       └── cart-error-handler.ts       ✅ Error handling
│
├── hooks/
│   └── use-cart-store.ts               ⚠️ Modified (sync logic)
│
├── components/
│   └── cart/
│       ├── cart-provider.tsx           ✅ Auth listener
│       ├── cart-sync-indicator.tsx     ✅ UI component (optional)
│       └── cart-merge-dialog.tsx       ✅ Warning dialog (optional)
│
├── app/
│   ├── layout.tsx                      ⚠️ Modified (wrap providers)
│   │
│   ├── (auth)/
│   │   ├── sign-in/page.tsx           ⚠️ Modified (merge logic)
│   │   └── [sign-out logic]           ⚠️ Modified (clear state)
│   │
│   └── (root)/
│       └── checkout/page.tsx           ⚠️ Modified (final sync)
│
└── types/
    └── index.ts                        ⚠️ Modified (new types)
```

---

## 🔑 Key Functions

### Server Actions (cart-db.actions.ts)

```typescript
// Load user's cart from DB
getUserCartFromDB(userId: string)
  → Returns: { success, data: Cart | null, message }

// Save/update cart to DB
saveCartToDB(userId: string, cartData: Cart)
  → Returns: { success, data, message }

// Merge guest + DB cart with validation
mergeAndValidateCart(userId, dbCart, localCart)
  → Returns: { success, data: Cart, warnings: string[], hasChanges }

// Validate cart items against product stock
validateCartStock(items: OrderItem[])
  → Returns: { success, validatedItems, warnings, hasIssues }
```

### Zustand Store Methods (use-cart-store.ts)

```typescript
// Initialize cart (called on app load)
initializeCart(userId?: string)
  → Load from DB (if userId) or localStorage (if guest)

// Sync current cart to DB (debounced)
syncWithDB()
  → Save cart to MongoDB if logged in

// Load cart from DB
loadCartFromDB(userId: string)
  → Fetch and replace cart from database

// Merge guest cart on login
mergeGuestCartOnLogin(userId: string)
  → Returns: { warnings, hasChanges }

// Set auth state
setAuthState(isLoggedIn: boolean, userId: string | null)
  → Update authentication status in store
```

---

## ⚙️ Configuration

### Debounce Settings

```typescript
// use-cart-store.ts
const SYNC_DEBOUNCE_MS = 500; // Adjust based on needs

// Faster sync (100ms) - More DB writes
// Slower sync (1000ms) - Less DB writes, but delayed
```

### Persist Config

```typescript
// use-cart-store.ts
{
  name: "cart-store",
  partialize: (state) => ({
    cart: state.cart
  }),
  // Only persist cart data, not sync state
}
```

### Error Retry Config

```typescript
// cart-error-handler.ts
const maxRetries = 3;
const retryDelay = 1000; // ms between retries

// Retriable errors: NETWORK_ERROR, SYNC_FAILED
```

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] **Guest Flow**
  - [ ] Add items as guest → Items in localStorage
  - [ ] Reload page → Cart persists
  - [ ] No DB requests made

- [ ] **Login Flow**
  - [ ] Guest cart + Login → Cart merges
  - [ ] Empty guest cart + Login → Load DB cart
  - [ ] Stock validation works
  - [ ] Warnings display correctly

- [ ] **Logged User Flow**
  - [ ] Add item → Syncs to DB
  - [ ] Update quantity → Debounced sync
  - [ ] Remove item → Syncs immediately
  - [ ] Reload page → Cart loads from DB

- [ ] **Logout Flow**
  - [ ] Logout → localStorage cleared
  - [ ] Login again → DB cart restored

- [ ] **Edge Cases**
  - [ ] Multiple tabs → Syncs correctly
  - [ ] Network offline → Graceful fallback
  - [ ] Stock runs out → Validation catches it
  - [ ] Price changes → Updates on merge

### Automated Testing (Optional)

```typescript
// Example test cases
describe('Cart Sync', () => {
  test('Guest cart persists in localStorage', ...)
  test('Login merges guest + DB cart', ...)
  test('Logged user syncs to DB', ...)
  test('Logout clears localStorage', ...)
  test('Stock validation removes unavailable items', ...)
});
```

---

## 🐛 Troubleshooting

### Issue: Cart not syncing to DB

**Check:**

1. Is user logged in? (`isLoggedIn = true`)
2. Is `syncWithDB()` being called?
3. Check console for sync errors
4. Check Network tab for POST requests
5. Verify MongoDB connection

**Fix:**

- Check `isSyncingInProgress` flag not stuck
- Clear localStorage and retry
- Check auth session validity

### Issue: Cart merge not working

**Check:**

1. Is `mergeGuestCartOnLogin()` being called on login?
2. Check console for merge errors
3. Verify CartProvider is mounted
4. Check session detection logic

**Fix:**

- Ensure CartProvider inside SessionProvider
- Check `prevUserId` state tracking
- Verify `useSession()` hook working

### Issue: Infinite loop / stack overflow

**Check:**

1. Are you using `replace: false` in set()?
2. Is `isSyncingInProgress` flag working?
3. Are there recursive sync calls?

**Fix:**

- Review Phase 2 fix implementation
- Check `partialize` config in persist
- Ensure debounce timeout is set

### Issue: Cart cleared on logout

**Check:**

1. Is `clearCart()` being called in logout?
2. Check localStorage after logout

**Fix:**

- Remove `clearCart()` from logout logic
- Only call `setAuthState(false, null)`
- localStorage should persist

---

## 📊 Performance Considerations

### Database Queries

```
Load cart: 1 query per page load (for logged users)
Sync cart: 1 upsert per cart change (debounced)
Merge cart: 2 queries (load DB + validate items)
```

### Optimization Tips

1. **Debounce aggressively** for quantity updates
2. **Batch operations** when possible
3. **Index userId** in MongoDB for fast lookups
4. **Cache product data** to reduce validation queries
5. **Use lean()** in Mongoose queries

---

## 🔐 Security Considerations

### Data Access

- Users can only access their own cart (enforced by userId)
- Server-side validation prevents tampering
- Stock checks prevent over-purchasing

### Best Practices

1. Never trust client-side cart data
2. Always validate stock server-side
3. Use latest prices from DB
4. Sanitize user inputs
5. Rate limit sync operations

---

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] MongoDB connection tested
- [ ] Auth callbacks configured
- [ ] Error logging setup
- [ ] Performance monitoring ready
- [ ] Backup strategy in place

---

## 📞 Support

For issues or questions:

1. Check console logs for errors
2. Review this documentation
3. Check MongoDB connection
4. Verify auth configuration
5. Test in incognito mode (fresh state)

---

## 📝 Change Log

**Phase 1:** Database schema + server actions
**Phase 2:** Zustand store sync logic
**Phase 3:** Auth integration + providers
**Phase 4:** Checkout + error handling + UI components

---

**Last Updated:** Phase 4 Complete
**Version:** 1.0.0
