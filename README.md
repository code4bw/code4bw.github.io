#project/ongoing 
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

# Tasks


# Setting up a Environment
파이썬 기반 SSG인 Pelican을 이용한다

설치 방법
```
pip install -r requirements.txt
```


콘텐츠 빌드
```bash
pelican contents
```

로컬에서 확인
```bash
pelican -l [-r]
```
* `-r` 옵션을 사용할 경우 소스 변경사항을 감지해서 자동으로 업데이트함

블로그 글 탬플릿
```
---
Status: draft
Title: 
Date:
Modified: 
Category:
Tags: 
Slug:
Authors:
Summary:
---

# What
* 이 개념이 정확히 무엇인가
* 정확한 정의는 무엇인가
* 적용되는 범위는?

# Why
* 이 개념은 왜 필요한가
* 개념이 등장하게 된 배경이 무엇인가
* 어떠한 문제를 개선하기 위해 등장했는가

# How
* 어떻게 문제를 개선하는가
* 동작 원리가 무엇인가
```


# Thanks to (References)
* SSG
    * https://github.com/getpelican/pelican/tree/main/pelican/themes/simple/templates
* book
    * 
* article
    * 
* paper
    * 