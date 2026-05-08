# Graph Report - .  (2026-05-07)

## Corpus Check
- Large corpus: 270 files · ~299,152 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1093 nodes · 1987 edges · 87 communities (70 shown, 17 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 81|Community 81]]

## God Nodes (most connected - your core abstractions)
1. `getSupabaseAdmin()` - 43 edges
2. `handleMessageModular()` - 28 edges
3. `getBotResponse()` - 25 edges
4. `processMessage()` - 23 edges
5. `verifySessionToken()` - 22 edges
6. `Product` - 20 edges
7. `getProductImage()` - 17 edges
8. `requireApiRole()` - 16 edges
9. `Button` - 15 edges
10. `detectIntent()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `evaluateBot()` --calls--> `require`  [INFERRED]
  src/core/evaluator.ts → scripts/convert-images.mjs
- `middleware()` --calls--> `verifySessionToken()`  [EXTRACTED]
  middleware.ts → src/lib/server/adminSession.ts
- `diagnose()` --calls--> `getSupabaseAdmin()`  [INFERRED]
  diagnose_ids.ts → src/lib/server/supabaseServer.ts
- `testRpc()` --calls--> `getSupabaseAdmin()`  [EXTRACTED]
  test_rpc.ts → src/lib/server/supabaseServer.ts
- `fixConstraint()` --calls--> `getSupabaseAdmin()`  [INFERRED]
  fix_db.ts → src/lib/server/supabaseServer.ts

## Communities (87 total, 17 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (33): AdminDashboard(), fmt(), pct(), PromoBanner, PromoBannerComponent(), AbandonedCart, Alert, checkAlerts() (+25 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (41): POST(), buildPersonalizedResponse(), classifyError(), dbGetProductsSafe(), extractQty(), getBotResponse(), memory, normalizePhone() (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (37): addCartStateItem(), addToCart(), clearCart(), clearCartContext(), createEmptyCart(), deserializeCart(), getCartContext(), recalculate() (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (44): db(), fetchActivePromos(), fetchAnnouncements(), fetchCategoryProducts(), fetchFaq(), fetchMenuContext(), fetchProductPrice(), mapButtonReply() (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (33): db(), GET(), parseCookie(), POST(), requireStaff(), cookieBase, POST(), GET() (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (23): AgentResponse, ConversationContext, generateClosingMessage(), runAgents(), filterProducts(), isProductSafe(), testAllergyFilter(), shouldHandoff() (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (26): ActionType, CategoryType, detectIntent(), Entities, extractAction(), extractAllergies(), extractCategory(), extractEntities() (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (16): POST(), POST(), GET(), POST(), markConverted(), dbInsertWaMessage(), dbSaveOrderServer(), dbUpsertCustomerServer() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (15): createUuid(), dbGetCustomer(), dbGetSettings(), dbSaveOrder(), dbSaveProduct(), dbSaveSettings(), DEFAULT_SETTINGS, isUuid() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (23): POST(), getDb(), POST(), createEmployee(), deactivateEmployee(), Employee, getDb(), getEmployeeByLoginId() (+15 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (20): FailureEntry, generateRules(), LearnedRule, loadExistingRules(), loadFailures(), loadReportHistory(), mergeRules(), normalizeText() (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (16): GET(), MENU, POST(), DELETE(), GET(), getDb(), POST(), PUT() (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (21): activarOrquestador(), AiResponse, combinarRespuestas(), ejecutarClaude(), ejecutarGpt(), ejecutarQwen(), elegirMejor(), multiAi() (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (18): Cart, CombosSection, ContactSection, CustomCursor, Hero, Navbar, OrderBot, PromoBanner (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (14): AudioState, createBeepWav(), ensureCtx(), initAudio(), playButtonPop(), playOrderNotification(), startAmbient(), startOrderLoop() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (9): CartProps, categories, Product, logLocal(), track(), Window, CustomCursor, OrderBot (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.13
Nodes (13): EMOTION_LABELS, ProductCard, ProductCardComponent(), ProductCardProps, getProductImage(), PRODUCT_IMAGE_MAP, products, ComboSelectorModalProps (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (18): AdminProduct, CustomCategory, DayHours, DEFAULT_CATEGORIES, DeliveryApp, Employee, getAllCategoryLabels(), HeroStat (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (14): updateCustomerFromOrder(), BotInput, CustomerProfile, dbDeleteAllProducts(), dbDeleteProduct(), dbGetCustomer(), dbGetProducts(), dbInsertProducts() (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (8): UpsellModalProps, inputStyle, labelStyle, Step, CombosSection, CombosSectionProps, Button, ButtonProps

### Community 20 - "Community 20"
Cohesion: 0.16
Nodes (13): loadApprovedExamples(), dbGetProductsServer(), testGemini(), testLearning(), reviewConversations(), supabase, AIContext, AIResponse (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.23
Nodes (12): buildDeliveryPrompt(), finalizeOrder(), getDeliveryPrompt(), getPromptByStage(), handleMessage(), hasAny(), inferActionFromText(), inferComboAction() (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (7): EMOJIS, inputStyle, labelStyle, railButtonStyle, REACTIONS, Review, SEED_REVIEWS

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (11): Page(), CartUpsell, CartUpsellComponent(), CartUpsellProps, ChatBot(), Msg, ProductCard(), EngineType (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (9): ATTRIBUTE_KEYWORDS, CATEGORY_KEYWORDS, DIETARY_KEYWORDS, extractFoodIntent(), FoodIntent, KEYWORD_SYNONYMS, Product, rankProductsByIntent() (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.2
Nodes (13): ANCHOR_TEMPLATES, AntiLoopStrategy, ANTOJO_BY_CATEGORY, applyLoopStrategy(), FOMO_PHRASES, getAntojoPhrase(), getFOMOPhrase(), getNextStrategy() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.2
Nodes (7): AgentContext, RouteDecision, ChatState, FlowResponse, genAI, IntentResponse, SYSTEM_PROMPT

### Community 27 - "Community 27"
Cohesion: 0.2
Nodes (10): Order, isPromoActive(), Promo, promos, analyzeSales(), ComboOpportunity, OptimizationResult, ProductScore (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.23
Nodes (9): CATEGORY_LABELS, PosCartItem, PosOrder, PosState, usePosStore, ProductState, useProductStore, AdminMenuPage() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (7): INITIAL_STATE, mockProductRefs, mockProducts, testCase(), getResponse(), mockProductRefs, mockProducts

### Community 30 - "Community 30"
Cohesion: 0.3
Nodes (9): anonymizePhone(), ConversationTurn, ensureDir(), getPaths(), getTodayLogs(), logTurn(), promoteToDataset(), LOG_FILE (+1 more)

### Community 31 - "Community 31"
Cohesion: 0.27
Nodes (6): callGemini(), extractAndSaveInsights(), logConversation(), deduplicateMessage(), POST(), sendWhatsAppMessage()

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (6): AdminStore, _cache, CacheEntry, TTL, Customer, OrderChannel

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (11): CATEGORY_ALIASES, detectIntent(), DetectionResult, extractCategory(), extractProduct(), extractQty(), extractSauce(), Intent (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.24
Nodes (9): agentOrchestrator(), productRefs, stateByPhone, hasBrokenFormatting(), sanitizeActions(), validateResponseOutput(), ConversationState, QuickAction (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.24
Nodes (8): CartItem, clearContext(), getContext(), sessionStore, updateContext(), FlowContext, OrderState, resolveNextState()

### Community 37 - "Community 37"
Cohesion: 0.42
Nodes (7): validateOrderItems(), GET(), getDb(), parseCookie(), PATCH(), POST(), requireStaff()

### Community 38 - "Community 38"
Cohesion: 0.27
Nodes (10): applyFallback(), applySafetyFilter(), buildRecommendations(), extractCategoryEntities(), extractProductEntities(), generateUpsell(), handleMessageModular(), matchProducts() (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (8): detectCategories(), GeneratedMenuItem, generateItems(), generateMenuFromDescription(), GenerationResult, KEYWORD_MAP, PRODUCT_DB, POST()

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (4): NAV, BUTTON(), CARD, ReportsPage()

### Community 41 - "Community 41"
Cohesion: 0.24
Nodes (6): OrderStatus, assessLoad(), computeMetrics(), KitchenDisplay(), LoadLevel, STATUS

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (7): auditSql, { execSync }, fs, migrationDir, migrations, path, rlsSql

### Community 43 - "Community 43"
Cohesion: 0.25
Nodes (7): cmds, COMMANDS_DIR, content, file, { join, basename }, { readdirSync }, { readFileSync, existsSync }

### Community 44 - "Community 44"
Cohesion: 0.32
Nodes (6): ScrollCTA(), ChatPhase, ChatState, ChatStore, INITIAL_STATE, useChatStore

### Community 45 - "Community 45"
Cohesion: 0.36
Nodes (6): CashPage(), fmt(), CashMovement, CashSession, CashState, useCashStore

### Community 46 - "Community 46"
Cohesion: 0.25
Nodes (5): CustomerProfile, customerStore, DEFAULT_PROFILE, listeners, saved

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (6): { createClient }, executeMigration(), fs, path, runMigrations(), supabase

### Community 48 - "Community 48"
Cohesion: 0.43
Nodes (4): getSalesServer(), SaleRecord, dbGetSales(), SalesPage()

### Community 49 - "Community 49"
Cohesion: 0.4
Nodes (5): executeSQL(), fs, https, path, run()

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (3): fs, https, path

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (4): Ember, EMBER_COLORS, GlowOrb, TrailSpark

### Community 53 - "Community 53"
Cohesion: 0.47
Nodes (3): RankEntities, fuzzyMatch(), normalizeText()

### Community 54 - "Community 54"
Cohesion: 0.4
Nodes (3): content, files, fs

### Community 56 - "Community 56"
Cohesion: 0.4
Nodes (3): bebas, inter, metadata

### Community 57 - "Community 57"
Cohesion: 0.4
Nodes (3): inputStyle, ResetCode, StaffMember

### Community 58 - "Community 58"
Cohesion: 0.5
Nodes (4): ALLOWED_TRANSITIONS, isUuid(), PATCH(), VALID_STATUSES

### Community 59 - "Community 59"
Cohesion: 0.4
Nodes (3): ContactSection, hours, socialLinks

### Community 61 - "Community 61"
Cohesion: 0.5
Nodes (3): fs, migrationPath, path

### Community 67 - "Community 67"
Cohesion: 0.5
Nodes (3): PromptContext, PROMPTS, PromptTemplate

## Knowledge Gaps
- **303 isolated node(s):** `config`, `fs`, `path`, `{ execSync }`, `migrationDir` (+298 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AdminProduct` connect `Community 17` to `Community 33`, `Community 7`, `Community 8`, `Community 11`, `Community 13`, `Community 15`, `Community 16`, `Community 21`, `Community 27`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `handleMessageModular()` connect `Community 38` to `Community 1`, `Community 35`, `Community 36`, `Community 7`, `Community 10`, `Community 18`, `Community 21`, `Community 24`, `Community 29`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `getBotResponse()` connect `Community 1` to `Community 2`, `Community 36`, `Community 5`, `Community 38`, `Community 7`, `Community 18`, `Community 31`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 37 inferred relationships involving `getSupabaseAdmin()` (e.g. with `diagnose()` and `fixConstraint()`) actually correct?**
  _`getSupabaseAdmin()` has 37 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `handleMessageModular()` (e.g. with `getCustomerProfileFromDB()` and `runEvaluation()`) actually correct?**
  _`handleMessageModular()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `fs`, `path` to the rest of the system?**
  _303 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._