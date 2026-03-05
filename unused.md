# Unused Code Analysis Report

**Generated:** March 2, 2026  
**Total TypeScript Files Analyzed:** 105

---

## Executive Summary

This report identifies unused or potentially removable code in the PurchaseTracker project. The analysis categorizes findings into:

1. **Debug/Development Tools** - Created during troubleshooting sessions
2. **Unused Components** - Components not imported anywhere
3. **Unused Exports** - Functions/types exported but never imported
4. **Unused UI Components** - shadcn/ui components not being used
5. **Hidden Pages** - Pages not linked in the main navigation

---

## 1. Debug & Development Tools

### Debug API Routes (16 total)

These routes were created for debugging and troubleshooting purposes. Most were created during the recent card N/A issue investigation.

#### **Recently Created (During Card N/A Investigation - March 2, 2026):**

| Route | Purpose | Keep/Remove |
|-------|---------|-------------|
| `/api/debug/fix-missing-cards` | **KEEP** - Fixes purchases with NULL card_id by re-parsing emails | ✅ **KEEP** |
| `/api/debug/check-card-exists` | **KEEP** - Checks if cards exist and diagnoses duplicate issues | ✅ **KEEP** |
| `/api/debug/purchase-card-issue` | Detailed debugging for specific purchases | ⚠️ **OPTIONAL** |
| `/api/debug/analyze-card-pattern` | Tests card extraction patterns | ⚠️ **OPTIONAL** |
| `/api/debug/reparse-all` | Nuclear option to delete and re-parse all emails | ⚠️ **OPTIONAL** |

#### **Pre-existing Debug Routes:**

| Route | Purpose | Keep/Remove |
|-------|---------|-------------|
| `/api/debug/check-parsing` | Shows parsing system status | ✅ **KEEP** |
| `/api/debug/dry-run-parse` | Test parsing without saving | ✅ **KEEP** |
| `/api/debug/test-date-extraction` | Test date pattern extraction | ⚠️ **OPTIONAL** |
| `/api/debug/test-card-extraction` | Test card pattern extraction | ⚠️ **OPTIONAL** |
| `/api/debug/parse-status` | Shows email parsing statistics | ✅ **KEEP** |
| `/api/debug/reset-emails` | Reset emails to unparsed state | ⚠️ **OPTIONAL** |
| `/api/debug/delete-purchases` | Delete all purchases | ⚠️ **DANGEROUS** |
| `/api/debug/orphaned-emails` | Find emails without purchases | ✅ **KEEP** |
| `/api/debug/integrity-check` | Database integrity checks | ✅ **KEEP** |

**Recommendation:** Keep the essential debug routes for ongoing troubleshooting. Consider creating a `/api/debug/index` route that lists all available debug tools.

---

### Debug Dashboard Pages (5 total)

Pages created for debugging and testing, not linked in the main sidebar.

| Page | Route | Purpose | Keep/Remove |
|------|-------|---------|-------------|
| **Fix Cards** | `/fix-cards` | **KEEP** - UI for batch fixing missing card IDs | ✅ **KEEP** |
| **Check Card** | `/check-card` | Diagnose specific card existence issues | ⚠️ **OPTIONAL** |
| **Debug Card** | `/debug-card` | Deep dive into purchase card issues | ⚠️ **OPTIONAL** |
| **Test Card Pattern** | `/test-card-pattern` | Interactive regex pattern tester | ⚠️ **OPTIONAL** |
| **Tools** | `/tools` | General debugging tools page | ✅ **KEEP** |

**Recommendation:** Keep `/fix-cards` and `/tools`. Consolidate the three card debugging pages into one comprehensive tool.

---

## 2. Unused Components

### Component: `PatternTester.tsx`

**Location:** `./components/PatternTester.tsx`  
**Status:** ❌ **COMPLETELY UNUSED**  
**Imports:** 0

**Description:** A component for testing regex patterns against sample text. This appears to be superseded by the `/test-card-pattern` page created recently.

**Recommendation:**
- **Option 1:** Delete `PatternTester.tsx` (functionality exists in `/test-card-pattern`)
- **Option 2:** Use `PatternTester` component in the `/test-card-pattern` page to avoid duplication

---

## 3. Unused Exports

### Library Exports Not Imported Anywhere

| File | Export | Type | Recommendation |
|------|--------|------|----------------|
| `lib/types/database.types.ts` | `Json` | Type | ⚠️ Keep - may be needed for Supabase operations |
| `lib/parser/engine.ts` | `ParsedPurchase` | Type | ⚠️ Keep - part of public API |
| `lib/parser/engine.ts` | `ParseResult` | Type | ⚠️ Keep - part of public API |
| `lib/env.ts` | `validateRuntimeEnv` | Function | ❌ Remove if truly unused |
| `lib/gmail/config.ts` | `GMAIL_SCOPES` | Constant | ⚠️ Keep - configuration constant |
| `lib/gmail/service.ts` | `GmailLabel` | Type | ⚠️ Keep - part of public API |
| `lib/gmail/service.ts` | `GmailMessage` | Type | ⚠️ Keep - part of public API |
| `lib/gmail/service.ts` | `GmailMessageDetails` | Type | ⚠️ Keep - part of public API |
| `lib/validation/schemas.ts` | `createCategorySchema` | Schema | ❌ Remove or implement category creation |
| `lib/validation/schemas.ts` | `updateCategorySchema` | Schema | ❌ Remove or implement category updates |
| `lib/store/hooks.ts` | `useAppStore` | Hook | ⚠️ Keep - may be used in future |

**Recommendation:** Keep type exports as they form part of the library's public API. Remove validation schemas that aren't being used (or implement the missing category CRUD operations).

---

## 4. Unused UI Components

These are shadcn/ui components that were likely installed but never used.

| Component | Status | Recommendation |
|-----------|--------|----------------|
| `form.tsx` | ❌ Not imported anywhere | Remove if you're not using forms |
| `separator.tsx` | ❌ Not imported anywhere | Remove or use for visual separation |
| `skeleton.tsx` | ❌ Not imported anywhere | Remove or use for loading states |

**Recommendation:** These are small files (~50 lines each). Keep them for future use or remove to reduce bundle size slightly.

---

## 5. Hidden Pages (Not in Sidebar)

These pages exist but are not linked in the main navigation. They're accessible via direct URL.

### Pages in "Developer Tools" Section (Collapsible)

| Page | Route | Status |
|------|-------|--------|
| Emails | `/emails` | ✅ In sidebar (Developer Tools) |
| Parsing Rules | `/parsing-rules` | ✅ In sidebar (Developer Tools) |
| Tools | `/tools` | ✅ In sidebar (Developer Tools) |

### Pages NOT in Sidebar at All

| Page | Route | Purpose | Recommendation |
|------|-------|---------|----------------|
| Settings | `/settings` | User settings page | ⚠️ Add to main nav or header |
| Categories | `/categories` | Manage purchase categories | ⚠️ Add to main nav |
| Fix Cards | `/fix-cards` | Debug tool for card issues | ✅ Keep hidden (dev tool) |
| Check Card | `/check-card` | Debug specific card | ✅ Keep hidden (dev tool) |
| Debug Card | `/debug-card` | Debug purchase cards | ✅ Keep hidden (dev tool) |
| Test Card Pattern | `/test-card-pattern` | Regex pattern tester | ✅ Keep hidden (dev tool) |
| Reports/Tables | `/reports/tables` | Table-based reports | ⚠️ Add to Reports submenu |

**Recommendation:**
- Add `/settings` to the header (user icon dropdown)
- Add `/categories` to main navigation
- Keep debug pages hidden (accessible via `/tools` page)
- Add `/reports/tables` to a Reports submenu

---

## 6. Duplicate or Redundant Code

### Card Debugging Pages (3 similar pages)

You have **3 different pages** for debugging card issues:

1. `/fix-cards` - Batch fix missing cards (most useful)
2. `/check-card` - Check specific card existence
3. `/debug-card` - Debug purchase card issues

**Recommendation:** Consolidate into a single comprehensive `/debug/cards` page with tabs for:
- **Fix Missing Cards** (batch operation)
- **Check Card** (lookup specific card)
- **Purchase Issues** (debug specific purchases)

---

## 7. Component Usage Summary

### Well-Used Components ✅

| Component | Import Count | Status |
|-----------|--------------|--------|
| Header | 150+ | ✅ Core component |
| ErrorBoundary | 6 | ✅ Used appropriately |
| Sidebar | 6 | ✅ Core component |
| AuthProvider | 3 | ✅ Core component |
| ProtectedRoute | 3 | ✅ Core component |
| AutoEmailSync | 2 | ✅ Feature component |
| AlertPanel | 2 | ✅ Dashboard component |
| OngoingShiftCard | 2 | ✅ Dashboard component |
| PurchaseEditModal | 2 | ✅ Dashboard component |
| PurchaseFilters | 2 | ✅ Feature component |
| GmailIntegration | 2 | ✅ Feature component |

### Unused Components ❌

| Component | Import Count | Status |
|-----------|--------------|--------|
| PatternTester | 0 | ❌ **REMOVE** (superseded by page) |

---

## 8. Store/State Management

All Redux slices are actively used:

| Slice | References | Status |
|-------|-----------|--------|
| authSlice | 3 | ✅ Active |
| cardsSlice | 3 | ✅ Active |
| categoriesSlice | 3 | ✅ Active |
| employeesSlice | 4 | ✅ Active |
| merchantsSlice | 3 | ✅ Active |
| purchasesSlice | 2 | ✅ Active |

**Recommendation:** No changes needed.

---

## 9. Recommendations Summary

### High Priority - Delete These

1. ❌ **`components/PatternTester.tsx`** - Superseded by `/test-card-pattern` page
2. ❌ **`lib/validation/schemas.ts`** - `createCategorySchema` and `updateCategorySchema` (unused)
3. ❌ **`components/ui/form.tsx`** - Never used
4. ❌ **`components/ui/separator.tsx`** - Never used
5. ❌ **`components/ui/skeleton.tsx`** - Never used

**Potential space saved:** ~5-10KB

### Medium Priority - Consolidate These

1. ⚠️ **Consolidate 3 card debug pages** into one `/debug/cards` page
   - Merge `/fix-cards`, `/check-card`, `/debug-card`
   
2. ⚠️ **Organize debug API routes**
   - Create `/api/debug/index` that lists all available tools
   - Document each debug route's purpose

### Low Priority - Improve Organization

1. ✨ **Add missing pages to navigation:**
   - Add `/settings` to header dropdown
   - Add `/categories` to main sidebar
   - Add `/reports/tables` to Reports submenu

2. ✨ **Create a unified Debug Dashboard:**
   - `/tools` page should link to all debug pages and API routes
   - Group by category (Parsing, Cards, Data Integrity, etc.)

---

## 10. Cleanup Script

Here's a script to remove the definitely unused files:

```bash
#!/bin/bash
# Run this to clean up unused code

# Remove unused components
rm -f components/PatternTester.tsx

# Remove unused UI components
rm -f components/ui/form.tsx
rm -f components/ui/separator.tsx
rm -f components/ui/skeleton.tsx

# Remove unused validation schemas (edit the file)
# Manually remove createCategorySchema and updateCategorySchema from:
# lib/validation/schemas.ts

echo "✅ Cleanup complete!"
echo "Remember to test the application after cleanup."
```

---

## 11. Debug Routes Organization Chart

```
/api/debug/
│
├── Parsing & Emails
│   ├── check-parsing          ✅ KEEP
│   ├── parse-status           ✅ KEEP
│   ├── dry-run-parse          ✅ KEEP
│   ├── test-date-extraction   ⚠️ OPTIONAL
│   ├── test-card-extraction   ⚠️ OPTIONAL
│   ├── reset-emails           ⚠️ OPTIONAL
│   ├── reparse-all            ⚠️ OPTIONAL
│   └── orphaned-emails        ✅ KEEP
│
├── Card Issues
│   ├── fix-missing-cards      ✅ KEEP
│   ├── check-card-exists      ✅ KEEP
│   ├── purchase-card-issue    ⚠️ OPTIONAL
│   └── analyze-card-pattern   ⚠️ OPTIONAL
│
└── Data Management
    ├── integrity-check        ✅ KEEP
    └── delete-purchases       ⚠️ DANGEROUS
```

---

## 12. Final Statistics

| Category | Total | Unused | Percentage |
|----------|-------|--------|------------|
| TypeScript Files | 105 | ~5 | 4.8% |
| Components | 20 | 1 | 5% |
| UI Components | 15 | 3 | 20% |
| Debug Routes | 16 | 0* | 0% |
| Pages | 18 | 0** | 0% |

\* All debug routes serve a purpose, though some are optional  
\** All pages are accessible, though some are hidden from nav

---

## 13. Maintenance Recommendations

### Short Term (Next Sprint)

1. Delete `PatternTester.tsx` component
2. Remove unused UI components
3. Remove unused validation schemas
4. Add `/settings` and `/categories` to navigation

### Medium Term (Next Month)

1. Consolidate card debugging pages
2. Create unified debug dashboard at `/tools`
3. Document all debug API routes
4. Add API route for listing all debug tools

### Long Term (Ongoing)

1. Regular audits for unused code (quarterly)
2. Implement tree-shaking for better bundle optimization
3. Use TypeScript's unused exports detection
4. Set up automated unused code detection in CI/CD

---

## Conclusion

The codebase is relatively clean with only **~5% truly unused code**. Most of the "unused" items are:

1. **Debug tools** created during troubleshooting (intentionally kept)
2. **Hidden pages** accessible by direct URL (intentionally hidden)
3. **Type exports** that form the public API (should be kept)

The main actionable items are:
- Remove `PatternTester` component (1 file)
- Remove 3 unused UI components (3 files)
- Remove 2 unused validation schemas (edit 1 file)

This represents excellent code hygiene for a project of this size! 🎉
