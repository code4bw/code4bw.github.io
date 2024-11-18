# Goal
포트폴리오와 개인 공부 내용들을 정리하는 블로그를 운영한다
- 단순한 사실의 나열보다는  경험을 위주로 작성한다

# Key Features
- 진행한 포트폴리오를 설계 - 과정 - 결과 형태로 정리한다
	- 공부 내용을 원리 중심으로 설명한다
	- github pages를 통해서 운영한다
		- SEO와 댓글 기능(Disqus)을 넣는다
		- 페이지 소스코드를 비공개로 한다 (유료)
- 기본적으로 draft에서 글을 작성하고 완성되면 publish를 한다
- 썸네일은 글의 slug와 동일한 이름의 `png` 파일로 content 폴더의 `images/thumbs` 폴더에 넣으면 자동으로 적용된다

# Architecture


# Setting up a Environment
파이썬 기반 SSG인 Pelican을 이용한다

콘텐츠 빌드
```bash
pelican contents
```

로컬에서 확인
```
pelican -l [-r]
```
* `-r` 옵션을 사용할 경우 소스 변경사항을 감지해서 자동으로 업데이트함
# Thanks to (References)
https://github.com/getpelican/pelican/tree/main/pelican/themes/simple/templates