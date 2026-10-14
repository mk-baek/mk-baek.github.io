# The Current — by Minkyung Baek

> An editorial journal on the planet, sustainability, and strategy — always moving, never finished.

탄소·에너지·지속가능성과 기업전략에 대한 질문을 기록하는 개인 저널입니다. 공개 주소는 https://mk-baek.github.io 입니다.

- 만든 도구: [Astro](https://astro.build) (정적 사이트). 서버, 데이터베이스, API 키를 쓰지 않습니다.
- 글은 Markdown(`.md`) 파일 하나가 한 편입니다.
- `main` 브랜치에 push하면 GitHub Actions가 사이트를 다시 만들어 GitHub Pages에 올립니다. 미래 날짜로 예약한 글이 그날 나타나도록 매일 00:05(서울)에도 한 번 다시 만듭니다.

> **Windows PowerShell에서는** `npm` 대신 `npm.cmd`를 입력하세요 (예: `npm.cmd run dev`). 이 컴퓨터의 PowerShell 보안 설정 때문에 `npm`이 막혀 있습니다. Git Bash에서는 `npm` 그대로 됩니다.

---

## 사이트 구성

| 메뉴 | 내용 |
|---|---|
| **Home** | 첫 화면 문구, 3D 바다, **글의 키워드 흐름**, About The Current, About·Journal·Library 바로가기, The Current Flow (Journal 2개 + Library 2개) |
| **About** | Why The Current — 이 저널이 왜 있는지, 세 가지 의미 |
| **Journal** | 내가 쓴 글. **Project · Note · Insight** 세 종류 필터 + 검색 |
| **Library** | 추천 도서·보고서·아티클·영상. **링크 + 미리보기 카드** (파일 업로드 없음) |
| **Connect** | 소개(Minkyung Baek), Areas of focus, LinkedIn |

### Journal 글 종류

| type | 무엇을 쓰나 | 첫 화면 |
|---|---|---|
| `project` | 프로젝트 소개·회고, 깊이 있게 정리한 글 | 일러스트 펼침면으로 시작 |
| `note` | 기사·누군가의 글·강연에 대한 짧은 생각 | 기본 화면 (원하면 펼침면) |
| `insight` | 마음에 남은 한 문장(명언·인사이트) + 내 생각 | 그 문장이 깊은 물 위에 크게 |

**수업·세미나·포럼에서 배운 것**은 따로 메뉴를 두지 않습니다. 깊이에 따라 Note·Project·Insight로 쓰고, 출처를 남기고 싶으면 `context: course`(수업) / `seminar` / `forum`을 적습니다. 글 상단에 "From classes & talks"로 표시됩니다.

**고객사가 있는 프로젝트**는 이름·수치·내부 자료 없이 "무엇을 배웠는가" 중심으로 씁니다. 조직은 일반적으로 표현하세요 (예: "a mid-size Korean manufacturer"). 비밀유지 계약이 있다면 쓰지 않습니다.

---

## 처음 한 번

```bash
npm install
```

## 미리보기

```bash
npm run dev
```

브라우저에서 http://localhost:4321 을 엽니다. 미리보기에서는 **초안(Draft)과 예약 글(Scheduled)도 라벨을 달고 보입니다.** 공개 사이트에는 발행된 것만 나갑니다.

공개 사이트와 똑같은 화면을 보려면:

```bash
npm run build
npm run preview
```

---

## 폴더 구조

| 위치 | 내용 | GitHub에 올라가나요? |
|---|---|---|
| `content/entries/` | 발행한 Journal 글 (Project · Note · Insight) | 예 |
| `content/library/` | 발행한 Library 항목 | 예 |
| `content/library-previews.json` | Library 링크 미리보기 저장본 | 예 |
| `content/questions/` | 발행한 탐구 질문 | 예 |
| `content/links.json` | 글과 글(또는 Library)을 직접 잇는 연결과 그 이유 | 예 |
| `src/site.ts` | 정체성 문장, Why The Current? 문구, 한 줄 소개, LinkedIn | 예 |
| `drafts/` | **초안. 이 컴퓨터에만 있습니다.** | **아니요** |
| `templates/` | 새 글의 틀 | 예 |
| `public/images/` | 공개해도 되는 이미지 | 예 |
| `fixtures/` | 화면 점검용 가짜 샘플 | 아니요 |

`drafts/`는 GitHub에 올라가지 않으므로 **이 컴퓨터에만 있습니다.** 컴퓨터를 바꾸거나 고장 나면 사라지니, 중요한 초안은 따로 백업하세요 (예: OneDrive에 폴더째 복사).

---

## 새 글 쓰기

```bash
npm run new -- project "What a carbon audit taught me"
npm run new -- note "On the latest EU taxonomy update"
npm run new -- insight "Water always wins"
npm run new -- library "IEA World Energy Outlook"
npm run new -- question "How do environmental risks change corporate choices?"
```

`drafts/` 아래에 틀이 채워진 파일이 생깁니다. `✍️` 표시가 있는 곳을 내 글로 바꾸세요.

- 파일 이름이 글 주소가 됩니다: `drafts/entries/carbon-audit.md` → `/journal/carbon-audit/`. 영어 소문자와 `-`만 쓰세요. 한국어 글도 파일 이름은 영어로 짓습니다.
- 한국어 글은 맨 위 설정에 `lang: ko`를 넣습니다.

### 글 맨 위 설정 (frontmatter)

반드시 필요한 것은 `title`, `type`, `summary`, 본문뿐입니다. Insight는 `quote`도 필요합니다.

```yaml
---
title: "글 제목"
type: note              # project | note | insight
summary: "목록과 공유 미리보기에 나오는 한 문장"
status: draft           # draft | published (발행은 아래 명령으로)
publishedAt: 2026-10-20 # 발행일 (서울 기준)
updatedAt: 2026-11-02   # 내용을 실제로 고친 날만 적습니다
context: seminar        # course | seminar | forum | reading | practice | reflection (선택)
quote: "..."            # insight: 그 문장 (짧게)
quoteBy: "..."          # insight: 누가 말했거나 썼는지
questions: [environmental-risk-and-corporate-choices]  # 탐구 질문 0~2개 (선택)
topics: [Carbon, Energy Transition]                    # 4개 이하 — 홈의 키워드 흐름이 됩니다
sources:                # 이 글이 다루는 원문 (선택)
  - title: "원문 제목"
    authorOrPublisher: "저자, 매체 또는 연사"
    url: https://...    # 실제로 열어 본 링크만
lang: en                # en | ko
---
```

본문에는 HTML 태그나 스크립트를 쓸 수 없습니다. 쓰면 빌드가 멈추고 어느 파일인지 알려 줍니다.

### 홈의 키워드 흐름 (topics)

홈 첫 화면 아래쪽에 흐르는 **10개 키워드**는 **발행된 Journal 글의 `topics`를 빌드할 때마다 세어서** 만들고, 10개가 안 되면 Library 항목의 `topics`로 채웁니다 (Library에만 있는 키워드는 Library 페이지로 연결). 자주 쓴 주제일수록 크게 보이고, 누르면 그 주제의 글만 Journal에 모여 나옵니다. 글을 발행하면 자동으로 바뀝니다.

- 같은 주제는 같은 철자로 쓰세요 (`Carbon`과 `carbon`은 같은 것으로 셉니다. `Carbon`과 `CO2`는 다른 것으로 셉니다).
- 너무 넓은 말(`Sustainability`)보다 구체적인 말(`Scope 3`, `Energy Transition`, `Climate Risk`)이 흐름을 더 잘 보여 줍니다.

---

## 발행하기

```bash
npm run publish-entry -- design-as-water
```

- 파일이 `drafts/`에서 `content/`로 옮겨지고, `status: published`와 오늘 날짜가 들어갑니다 (Library는 `addedAt`).
- `✍️` 표시가 남아 있으면 발행을 거절합니다.
- 날짜를 지정해 예약할 수 있습니다: `npm run publish-entry -- design-as-water 2026-10-20`

그다음 `npm run dev`로 확인하고, 아래처럼 올립니다.

```bash
git add content
git commit -m "Publish: Design as Water"
git push
```

1~2분 뒤 사이트에 반영됩니다.

---

## Library (링크 + 미리보기 카드)

**순서:** Library 페이지는 **발행 연도(`year`)가 최신인 것부터 오래된 순**으로 보여 줍니다. 같은 해라면 나중에 추가한 것이 앞에 옵니다. 연도를 적지 않은 항목은 맨 뒤에 놓이니, 새 항목에는 `year`를 꼭 적으세요.

추천 자료는 **파일을 올리지 않고 링크로** 남깁니다. 보고서·기사 PDF를 내 사이트에 올리면 재배포가 되어 저작권 문제가 생길 수 있고, 공개 저장소에 영구히 남기 때문입니다.

1. `npm run new -- library "자료 이름"` → `drafts/library/`에 파일이 생깁니다.
2. `url`, `kind`, `why`(추천 이유 한 줄)를 채웁니다.
3. 미리보기 카드를 가져옵니다:

   ```bash
   npm run library:previews
   ```

   각 링크의 공개 미리보기 정보(제목·설명·대표 이미지·사이트 이름)를 **한 번 가져와서** `content/library-previews.json`에 저장합니다. 사이트는 이 저장본만 쓰므로, 방문자가 볼 때나 빌드할 때 다른 사이트를 부르지 않습니다. API 키가 필요 없습니다.
   - 이미 가져온 링크는 건너뜁니다. 전부 새로 가져오려면 `npm run library:previews -- --all`.
   - 미리보기를 못 가져오는 사이트도 있습니다. 그때는 파일에 적은 `title`·`publisher`와 자동 생성 그림으로 카드가 만들어집니다.
   - 파일에 직접 적은 `title`, `publisher`, `image`가 미리보기보다 우선합니다.
4. 미리보기 설명이 한국어이거나 마음에 들지 않으면 `description: "..."`로 직접 쓰고, 빈 값(`""`)이면 숨깁니다. 미리보기 이미지가 없으면 `image:`에 주소를 적습니다.
5. 링크가 사라질 때를 대비해 `archiveUrl`에 [web.archive.org](https://web.archive.org) 저장 주소를 적어 둘 수 있습니다.
6. `npm run publish-entry -- <파일이름>`으로 발행합니다.

내가 만든 자료나 공개 라이선스(CC) 자료만 파일로 올리세요: `public/files/`에 넣고 링크를 `/files/파일이름.pdf`로 적습니다.

---

## 홈 바꾸기

### The current flow

홈의 **The Current Flow**는 **Journal 글 2개, 그다음 Library 항목 2개**를 보여 줍니다. 첫 번째(Journal)가 크게 나옵니다.

- 올리고 싶은 글이나 항목에 `featured: 1`, `featured: 2`를 적으면 그 순서로 고정됩니다.
- 고정하지 않은 자리는 Journal은 최근 발행·수정 순, Library는 최신 발행 연도 순으로 채워집니다.

### `src/site.ts`

홈 첫 화면 문구(`hero`), 홈의 About The Current(`homeAbout`), About 페이지의 Why The Current와 세 가지 의미(`why`), 소개와 Areas of focus(`bio`), LinkedIn 주소가 여기 있습니다. 문장만 고치면 홈과 About에 함께 반영됩니다.

탐구 질문(`content/questions/`)은 홈 첫 화면에는 나오지 않고, 글 상단의 질문 링크와 질문 페이지로 이어집니다.

## 글과 글 잇기 — `content/links.json`

글 하단의 "Continue this question"은 이 순서로 채워집니다 (최대 3개).

1. 여기에 직접 등록한 연결 (내가 쓴 이유와 함께)
2. 같은 탐구 질문에 연결된 다른 공개 글 — "Another entry on the same question"
3. 둘 다 없으면 관련 있다고 표시하지 않고 "Recent entries"로 최신 글

```json
[
  {
    "from": { "kind": "entry", "id": "design-as-water" },
    "to": { "kind": "library", "id": "ipcc-ar6-synthesis" },
    "label": "The report behind this note",
    "order": 1
  }
]
```

`kind`는 `entry` 또는 `library`입니다. 연결된 항목이 아직 초안이면 링크는 자동으로 숨겨집니다.

---

## 일러스트 펼침면 (spread)

글을 감성적인 한 장면으로 보여 주는 기능입니다. 그림은 **코드로 직접 생성**되며, 같은 글에는 항상 같은 그림이, 글마다 다른 그림이 나옵니다. 글자는 이미지가 아니라 실제 텍스트라서 검색되고, 화면 낭독기로도 읽힙니다.

| scene | 모습 |
|---|---|
| `drift` | 가는 흐름 선 다발 속 강조색 한 줄 ("my current") |
| `contour` | 지도의 등고선 |
| `ripple` | 한 점에서 퍼지는 동심원 |
| `shimmer` | 아래에서 올려다본 수면의 빛 |

- **Project와 탐구 질문은 자동으로 펼침면으로 시작합니다.** Insight는 `quote`가 깊은 물 위에 크게 나옵니다. Note는 `spread: true`로 켭니다.

```yaml
spread: false           # 끄기
spread:                 # 자세히 정하기
  scene: contour        # drift | contour | ripple | shimmer
  tone: deep            # light | deep (깊은 물, 흰 글씨)
  place: left           # left | center | right
  quote: "제목 대신 크게 보여 줄 한 문장"
  attribution: "Minkyung Baek"
```

본문 중간에 넣으려면 인용(`>`)의 첫 줄을 `[!spread]`로 시작합니다.

```markdown
> [!spread ripple deep]
> What would change if carbon had a voice in the boardroom?
> — Minkyung Baek
```

모든 펼침면의 **Save as image** 버튼은 1600×1000 PNG로 저장합니다 (LinkedIn 공유용).

## 이미지 넣기

1. 공개해도 되는 이미지를 `public/images/`에 넣습니다 (예: `public/images/emissions-chart.png`).
2. 본문에서: `![이미지 설명](/images/emissions-chart.png)`
3. 대표 이미지로 쓰려면 설정에 `cover: { src: /images/..., alt: "설명" }`을 넣습니다.

---

## 빌드가 자동으로 확인하는 것

`npm run build`(그리고 GitHub의 자동 배포)는 다음이 있으면 멈추고 어느 파일인지 알려 줍니다.

- 같은 파일 이름(slug)이 두 군데 있음
- 없는 질문·글·Library 항목을 가리키는 연결 (`questions`, `recommended`, `links.json`, `home.json`)
- 달력에 없는 날짜, 날짜 없이 `published`인 글, quote 없는 Insight, why 없는 Library 항목
- 본문의 HTML 태그나 `javascript:` 링크

초안(`drafts/`)은 GitHub에 없으므로, 배포 서버에서는 초안을 가리키는 연결이 오류 대신 경고로 처리되고 해당 항목은 보이지 않습니다.

## 화면 점검용 샘플

```bash
npm run fixtures -- 30     # "[Preview sample]" 글 30개 + Library 5개를 만들고
npm run dev:fixtures       # 샘플이 포함된 미리보기
npm run fixtures -- 0      # 샘플 모두 지우기
```

샘플은 공개 빌드에 절대 들어가지 않습니다.

---

## 3D 홈 화면

홈의 바다는 [three.js](https://threejs.org)로 그린 실시간 3D입니다. 홈에서만 글자가 먼저 뜬 뒤 불러오고, 화면 밖으로 스크롤하거나 탭을 바꾸거나 "Pause motion"을 누르면 멈춥니다. 기기에서 '동작 줄이기'를 켠 방문자에게는 멈춘 한 장면만 보입니다. 3D를 지원하지 않는 브라우저에서는 그라데이션 배경이 대신 보입니다. 색은 `src/styles/global.css`의 `--hero-*` 값으로 바꿉니다.

## 지금 없는 기능

이 사이트에는 웹 편집기(CMS)가 없습니다. 글은 파일로 쓰고 push해서 발행합니다. 댓글, 뉴스레터, 구독, RSS, 언어 전환 버튼도 아직 없습니다. 필요해지면 그때 추가합니다.
