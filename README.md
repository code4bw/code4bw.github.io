# CODE4BW · Engineering Logs

AI Engineer CODE4BW의 개발 기록과 포트폴리오입니다. `docs/` 안의 HTML, CSS, JavaScript를 그대로 GitHub Pages에 배포합니다. 콘텐츠를 생성하는 SSG, 패키지 설치, 빌드 과정이 없습니다.

## 구조

```text
docs/                          GitHub Pages에 올라가는 파일 전체
  index.html                   홈, 검색과 기록 목록
  portfolio.html               프로젝트 목록
  topics.html / tags.html      주제와 태그별 목록
  about.html                   소개
  cpu_structure_and_function.html
  project01.html ~ project04.html
  assets/                      공통 CSS, JS, 아이콘과 본문 이미지
  feeds/all.atom.xml           Atom 피드
  sitemap.xml / robots.txt     검색엔진용 목록
  404.html / .nojekyll
templates/post.html            새 글을 작성할 때 복사할 HTML 양식
content/                       이전 Markdown 원본과 미발행 초안; 배포 대상에서 제외
scripts/serve.mjs              로컬 미리보기 서버
scripts/check-site.mjs         배포 전 검사; 파일을 생성하거나 변경하지 않음
Temp/                          임시 작업물; Git에서 제외
```

`docs/`의 HTML이 공개 콘텐츠의 원본입니다. `content/`를 수정해도 웹사이트에는 반영되지 않습니다. 기존 Markdown은 이전 자료와 초안을 보관하는 용도로 남겨 두었습니다. 저장소 자체를 공개하면 `content/`도 소스 파일로 열람할 수 있으므로, 사이트 배포 제외와 저장소 비공개는 구분해야 합니다.

## 미리보기와 검사

Node.js 20 이상에서 별도 패키지 설치 없이 실행합니다. GitHub Actions 러너에 포함된 Node.js도 사용할 수 있습니다.

```powershell
# 프로젝트 루트에서 실행
$projectTemp = Join-Path (Get-Location).Path 'Temp'
New-Item -ItemType Directory -Force -Path $projectTemp | Out-Null
$env:TEMP = $projectTemp
$env:TMP = $projectTemp
$env:TMPDIR = $projectTemp

node scripts/serve.mjs
```

[로컬 미리보기](http://127.0.0.1:8000)를 열고, 파일을 수정한 다음 브라우저를 새로고침합니다. `Ctrl+C`로 서버를 종료합니다. 다른 포트가 필요하면 실행 전에 `$env:PORT = '8001'`을 지정합니다. 서버는 `docs/`만 제공합니다.

```powershell
node scripts/check-site.mjs
```

검사는 로컬 링크, 이미지, 목차 링크, 제목과 메타 정보, 사이트맵과 피드, 홈 목록 누락을 확인합니다. 배포 폴더에 Markdown, Python, ZIP, 초안 폴더가 섞이면 실패합니다. 외부 링크의 접속 상태는 검사하지 않습니다.

## 기존 글 수정

1. `docs/`에서 해당 글의 HTML을 엽니다.
2. `<div class="article-body">` 안의 본문을 수정합니다. 문단은 `<p>`, 소제목은 `<h2>`와 `<h3>`, 목록은 `<ul><li>`를 사용합니다.
3. 제목이나 요약을 바꾸면 `<title>`, description, Open Graph 정보, JSON-LD, 홈 목록도 함께 수정합니다. 수정일은 글의 표시 날짜, JSON-LD, `sitemap.xml`, 피드에 반영합니다.
4. 미리보기와 검사를 실행한 뒤 커밋하고 push합니다.

이미지는 `docs/assets/imgs/`에 넣고 `src="assets/imgs/파일명.png"`로 연결합니다. 이미지에 설명을 담은 `alt`를 작성합니다. 코드의 `<`, `>`, `&`는 각각 `&lt;`, `&gt;`, `&amp;`로 작성합니다.

## 새 글 추가

1. `templates/post.html`을 `docs/my-new-post.html`처럼 복사합니다. 초안은 `docs/` 밖에서 작성하고 완성한 후 옮깁니다.
2. 제목, 본문, 요약, 표시 날짜를 수정합니다. `<head>`의 canonical과 `og:url`도 실제 파일명으로 바꿉니다. 양식의 `application/ld+json`에 있는 제목, 요약, URL, 발행일, 수정일과 `article:published_time`, `article:modified_time`도 함께 갱신합니다.
3. 소제목에 `id="section-1"`처럼 고유한 ID를 주고 오른쪽 목차의 `href="#section-1"`를 연결합니다. 목차를 사용하지 않으면 `<aside class="article-aside">`를 제거해도 됩니다.
4. 홈의 `<div class="entry-list">` 안에 기존 `<a class="entry-row">`를 복사해 추가합니다. `href`, 제목, 요약, 기술명, 날짜를 바꾸고 `data-entry`와 `data-category="post"`를 유지합니다. 프로젝트라면 `data-category="project"`로 지정하고 `portfolio.html`에도 추가합니다. 검색은 이 HTML에 있는 글의 제목, 요약, 기술명을 읽습니다.
5. 주제와 태그 목록에 링크를 추가합니다. 홈의 `NOTES & PROJECTS / 05`와 사이드바의 글 수 등 표시 숫자도 갱신합니다. 홈의 강조 글은 `<a class="featured">`를 수정해 선택할 수 있습니다.
6. `sitemap.xml`에 URL을, `feeds/all.atom.xml`에 `<entry>`를 추가합니다. 피드의 최상위 `<updated>`도 갱신합니다. 모든 URL은 `https://code4bw.github.io/`를 기준으로 작성합니다.
7. 검사와 미리보기를 확인한 뒤 커밋하고 push합니다.

헤더와 푸터도 각 HTML 안에 있습니다. 메뉴를 바꿀 때는 모든 HTML과 `templates/post.html`을 함께 수정합니다. JavaScript가 꺼져 있어도 메뉴, 글 목록, 본문과 목차는 동작합니다. 검색과 테마 전환은 JavaScript로 보완합니다.

## GitHub Pages 배포

현재 workflow는 `main`에 사이트 변경을 push하면 검사 후 **`docs/`만 업로드**합니다. HTML 생성이나 의존성 설치는 수행하지 않습니다. 기존 Pelican 배포 workflow를 이 흐름으로 교체했습니다.

저장소의 **Settings → Pages → Build and deployment → Source**는 **GitHub Actions**로 설정합니다. 이미 GitHub Actions로 배포하고 있다면 그대로 사용할 수 있습니다. 배포 성공 여부와 실제 URL은 Actions의 `Deploy static HTML to GitHub Pages` 실행에서 확인합니다. Actions 탭에서 `Run workflow`로 수동 배포할 수도 있습니다.

서버 실행과 검사는 로컬에서만 이루어집니다. 배포는 `main`에 push한 뒤 Actions에서 확인합니다.

워크플로 없이 직접 제공하려면 Pages의 Source를 `Deploy from a branch`, Branch를 `main`, 폴더를 `/docs`로 설정하고 현재 배포 workflow를 제거합니다. `.nojekyll`은 유지합니다. 두 배포 방식을 동시에 사용하지 않습니다.

공식 문서: [GitHub Pages 배포 소스 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [정적 파일 배포 workflow](https://github.com/actions/starter-workflows/blob/main/pages/static.yml).

## 이전 자료와 테마

본문이 있는 공개 기록 5편(개발 글 1편, 프로젝트 4편)을 옮겼고 기존 파일명과 본문, 이미지, 날짜를 유지했습니다. 초안 40편은 웹사이트 배포에서 제외했습니다. 본문이 비어 있던 「CPU의 성능 높이기」는 기존 기본 슬러그 주소의 안내 페이지로 남기고 검색 결과와 피드에서는 제외했습니다. 주제 목록은 공개된 글만 연결하도록 다시 작성했습니다.

상업용 테마와 원본 ZIP, Pelican 설정·플러그인·실행 도구는 현재 버전에서 제거했습니다. 새 UI는 직접 작성한 HTML/CSS/JS를 사용하며 외부 테마나 UI 라이브러리를 불러오지 않습니다. 설정되지 않았던 댓글·분석·광고 서비스는 연결하지 않았습니다.

이전 상업용 테마와 ZIP이 있던 `themes/` 경로는 전체 Git 이력에서도 제거했습니다. 이력 재작성으로 커밋 ID가 바뀌었으므로 기존 복제본은 새로 clone해 사용합니다. 이전 이력을 그대로 push하면 제거한 파일이 다시 포함될 수 있습니다. GitHub의 과거 커밋 캐시나 다른 사람이 보관한 복제본은 브랜치 이력 정리와 별개입니다.
