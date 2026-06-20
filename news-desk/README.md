# News Desk · 브리핑 · Yangiliklar

A single-file, trilingual (KO/EN/UZ) world-news desk for the last 7 days.
Organised as **country (US / UK / Uzbekistan) → field (Medicine / Politics / Economy / Education / Society / Other)**, with a token-free keyword classifier, Claude-powered summaries, and Supabase sync.

지난 7일 뉴스를 **국가(🇺🇸미국·🇬🇧영국·🇺🇿우즈베키스탄) → 분야(의학·정치·경제·교육·사회·그 외)** 구조로. 분야 분류는 **AI 토큰 없이** 다국어 키워드(영어+우즈벡어)로 자동 처리, 요약만 Claude 사용.

---

## Structure

```
news-desk/
├─ index.html                              # the app (static frontend)
├─ README.md
└─ supabase/
   ├─ schema.sql                           # run once in Supabase SQL Editor
   └─ functions/
      └─ uz-news/
         └─ index.ts                       # Edge Function: Uzbek RSS proxy
```

The two halves run in **different places**:
- `index.html` → static hosting (GitHub Pages, or just open the file locally).
- `supabase/functions/uz-news/index.ts` → deployed to Supabase (GitHub does **not** run it).

---

## Setup

### 1. Supabase
```bash
# create the table
#  → Supabase Dashboard → SQL Editor → paste supabase/schema.sql → Run

# deploy the Uzbek-RSS Edge Function
supabase functions deploy uz-news --no-verify-jwt
```
`--no-verify-jwt` lets the browser call it without auth (recommended for personal use).
The app calls it at `{SUPABASE_URL}/functions/v1/uz-news` automatically.

### 2. Host the app
- **GitHub Pages:** Settings → Pages → Deploy from branch → root. Open the Pages URL.
- **Or local:** just double-click `index.html`.

### 3. Configure in the app
Open `⚙ 설정` and enter:
| Field | Required | Notes |
|---|---|---|
| GNews API Key | ✅ | gnews.io · free 100 req/day |
| Anthropic API Key | optional | for the 3-language summaries |
| Supabase URL + anon key | optional | caching, bookmarks, Uzbek RSS |
| 우즈벡 현지 RSS | toggle | needs the Edge Function deployed |
| 자동 요약 (상위 N) | `0` = off | summarizes top N on refresh (spends Claude credits) |

Then: **연결 테스트 → ↻ 새로고침**.

---

## Notes
- **Keys are never stored in these files** — only in the browser's `localStorage` at runtime, so a public repo is safe.
- **GNews quota:** one refresh uses ~11 requests (~9 refreshes/day on the free tier).
- **Auto-summarize** is off by default; set N in Settings to enable. It prioritizes the Medicine and Uzbekistan desks, then most-recent.
- **Uzbek RSS** pulls Uzbek-language sources (Kun.uz, Gazeta.uz, Daryo, UzA, Qalampir.uz, Xabar.uz); each feed is independent, so one failing feed won't break the rest. Uzbekistan is its own country macro, fed entirely by native Uzbek-language RSS.
- **Field classification uses no AI tokens.** A keyword classifier (English + Uzbek, apostrophe-normalised, word-boundary matched) buckets every article, using GNews's own category as a prior (`health`→Medicine, `business`→Economy) and falling back to **Other** when nothing matches. Medicine is weighted slightly to honour the emphasis. Claude is used only for the optional 3-language summaries.
- **Bookmarks persist** beyond the 7-day window; everything else rolls off after 7 days.

---

## 한국어 빠른 시작
1. Supabase SQL Editor에 `supabase/schema.sql` 실행.
2. `supabase functions deploy uz-news --no-verify-jwt` 로 Edge Function 배포.
3. `index.html`을 GitHub Pages로 올리거나 그냥 더블클릭.
4. 앱 설정창에 GNews·(선택)Anthropic·(선택)Supabase 키 입력 → 새로고침.

## Oʻzbekcha qisqa qoʻllanma
1. `supabase/schema.sql` ni Supabase SQL Editor'da ishga tushiring.
2. Edge Function: `supabase functions deploy uz-news --no-verify-jwt`.
3. `index.html` ni GitHub Pages'ga joylang yoki shunchaki oching.
4. Sozlamalarga GNews va (ixtiyoriy) Anthropic/Supabase kalitlarini kiriting → yangilang.
