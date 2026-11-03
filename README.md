# CODE4BW · Engineering Logs

`content/`를 원본으로 관리하고, 로컬에서 생성한 `docs/`의 정적 HTML을 GitHub Pages에 배포하는 블로그입니다. GitHub에서는 HTML을 생성하거나 Markdown을 해석하지 않습니다.

## 구조

```text
content/
  posts/               블로그 글과 초안: Markdown + YAML 메타 정보
  project/             프로젝트 글과 초안: Markdown + YAML 메타 정보
  pages/               홈·소개·목록·404 등의 HTML 원본
  assets/              CSS, JavaScript, 아이콘과 본문 이미지 원본
  topics.json          주제 ID, 표시 이름과 설명
  topics-plan.md       미발행 글을 포함한 학습 계획
templates/
  layout.html          모든 페이지의 공통 head·메뉴·푸터
  article.html         글 페이지 화면과 목차
  post.md              새 글 작성 양식
scripts/
  build.mjs            원본에서 HTML·목록·피드·사이트맵 생성
  check-site.mjs       배포 파일의 링크·메타 정보·개인정보 검사
  serve.mjs            로컬 미리보기
tests/build.test.mjs   원본 수정·공개 전환·오류 시 보존 동작 검사
docs/                  생성된 배포 결과; Git에 함께 커밋
Temp/                  임시 파일·캐시·로컬 복구 백업; Git에서 제외
```

**수정은 `content/`와 `templates/`에서 합니다.** `docs/`를 직접 수정하면 다음 생성 시 덮어씁니다. 글과 이미지의 원본은 `content/`에 있으며, 배포에 필요한 이미지만 `docs/`에 복사합니다. 초안은 사이트에 배포되지 않습니다. 공개 저장소에서는 초안 원본 자체를 열람할 수 있습니다.

작성자는 `CODE4BW`로 표기합니다. 실명이나 개인 연락처를 추가하지 않으며, 커밋에도 닉네임과 GitHub 비공개 이메일을 사용합니다.

## 설치와 실행

Node.js 20.19 이상과 pnpm이 필요합니다. HTML 생성에만 `markdown-it`, `yaml` 두 개발 의존성을 사용합니다. 방문자의 브라우저와 GitHub Pages 배포에는 이 패키지들이 필요하지 않습니다.

프로젝트 루트에서 실행합니다.

```powershell
$projectTemp = Join-Path (Get-Location).Path 'Temp'
New-Item -ItemType Directory -Force -Path $projectTemp | Out-Null
$env:TEMP = $projectTemp
$env:TMP = $projectTemp
$env:TMPDIR = $projectTemp

pnpm install --frozen-lockfile
node scripts/build.mjs
node scripts/serve.mjs
```

[로컬 미리보기](http://127.0.0.1:8000)를 엽니다. 원본을 수정한 뒤 생성 명령을 다시 실행하고 브라우저를 새로고침합니다. 서버는 `Ctrl+C`로 종료합니다. 다른 포트가 필요하면 `$env:PORT = '8001'`을 지정합니다.

`.npmrc`는 패키지 저장소와 설치 캐시를 프로젝트의 `Temp/` 아래에 둡니다. 해당 캐시를 비웠다면 의존성을 다시 설치합니다. 스크립트의 임시 파일 경로는 실행 위치와 관계없이 프로젝트 루트의 `Temp/`를 사용합니다.

## 글 수정과 추가

기존 글은 `content/posts/` 또는 `content/project/`의 Markdown을 수정합니다. 새 글은 `templates/post.md`를 복사해 작성합니다.

```yaml
Status: published
Title: 새 글 제목
Date: 2026-11-03
Modified: 2026-11-03
Category: BLOGPOST
tags: [컴퓨터구조]
Slug: new-post
Authors: CODE4BW
Summary: 글 상단과 검색 결과에 표시할 요약
Topics: [systems]
```

- `Status: draft`이면 배포하지 않습니다. 공개 글에는 제목·날짜·슬러그·요약·본문이 필요합니다.
- `Slug`는 영문 소문자·숫자·`-`·`_`로 지정하며 URL이 됩니다. 기존 슬러그를 유지하면 이전 주소도 유지됩니다.
- `Category`는 일반 글이면 `BLOGPOST`, 프로젝트이면 `PROJECT`입니다.
- `Topics`에는 `content/topics.json`의 ID를 사용합니다. 태그와 주제의 글 목록은 자동 생성합니다.
- 선택 항목 `Excerpt`는 목록용 짧은 요약입니다. 생략하면 `Summary`를 사용합니다.
- 선택 항목 `Image`는 대표 이미지이며 `/assets/imgs/example.png`처럼 지정합니다.

본문 이미지는 `content/assets/imgs/`에 두고 `![설명](../assets/imgs/example.png)`로 연결합니다. 공개 글 사이의 링크는 `[다른 글](<다른 글.md>)`처럼 Markdown 원본을 가리켜도 HTML 주소로 변환됩니다. 초안이나 존재하지 않는 글로 연결하면 생성에 실패합니다. 목차와 읽기 시간은 본문에서 자동 계산합니다.

홈과 소개 문구는 `content/pages/`, 공통 메뉴·푸터는 `templates/layout.html`, 글의 화면은 `templates/article.html`에서 수정합니다. 페이지의 `{{entries}}`, `{{projects}}`, `{{topics}}` 같은 표시는 자동 생성 영역입니다. `Noindex: true`인 페이지는 사이트맵에서 제외합니다.

## 검사와 배포

```powershell
node scripts/build.mjs          # content/ → docs/
node scripts/build.mjs --check  # 원본과 배포 결과가 일치하는지 검사; docs/를 수정하지 않음
node --test tests/build.test.mjs
```

생성 중 오류가 나면 기존 `docs/`를 보존합니다. 성공하면 전체 배포 결과를 교체하므로 삭제하거나 초안으로 바꾼 글의 HTML과 사용하지 않는 이미지가 남지 않습니다. 생성 결과의 내부 링크·목차·작성자·연락처 노출·RSS·사이트맵도 검사합니다.

`content/`, `templates/` 등 수정한 원본과 생성된 `docs/`를 함께 커밋하고 `main`에 push합니다. GitHub Actions는 **검사 후 `docs/`만 업로드**합니다. 배포 시 패키지 설치나 HTML 생성은 수행하지 않습니다. Pages의 Source는 **GitHub Actions**로 설정합니다.

상업용 테마와 Pelican 의존성은 사용하지 않습니다. 이전 테마와 개인 식별 정보는 Git 이력에서도 정리했으므로, 이전 이력을 가진 복제본은 새로 clone해 사용합니다.
