AUTHOR = 'CODE4BW'
SITENAME = "CODE4BW's Logs"
REAL_NAME = "CODE4BW"
SITEURL = ""

PATH = "content"

TIMEZONE = 'Asia/Seoul'

DEFAULT_LANG = 'ko'

# Feed generation is usually not desired when developing
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

# Blogroll
LINKS = (
    ("Pelican", "https://getpelican.com/"),
    ("Python.org", "https://www.python.org/"),
    ("Jinja2", "https://palletsprojects.com/p/jinja/"),
)

# Social widget
SOCIAL = (
    ("github-alt", "https://github.com/code4bw"),
    ("google", "https://g.dev/code4bw_dev"),
    ("x-twitter", "#"),
)

# DEFAULT_PAGINATION = 10
PAGINATED_TEMPLATES = {'index': False, 'tag': 7, 'category': 7, 'author': 7}
# Uncomment following line if you want document-relative URLs when developing
# RELATIVE_URLS = True

# path-specific metadata
EXTRA_PATH_METADATA = {
    "extra/robots.txt": {"path": "robots.txt"},
}

# static paths will be copied without parsing their contents
STATIC_PATHS = [
    "images",
    "extra/robots.txt",
]

THEME = "themes/custom"
THEME_STATIC_DIR = "theme"

TEMPLATE_PAGES = {
    "index.html": "index.html",
    "contact.html": "contact.html",
    "portfolio.html": "portfolio.html",
}

DEV_SKILLS = {
    # ("index" "logo in fontawesome", "TITLE", "Description"),
    (1,"fa-brands fa-python", "Python", "파이썬에 익숙하며 개인적으로도 자동화 스크립트를 작성해서 파일 및 정보를 관리하는데 활용하고 있습니다"),
    (2,"fa-solid fa-fire-flame-curved", "Pytorch", "딥러닝 모델링에 활용하고 torchserve 및 torchscript 등을 이용하여 모델 서빙을 할 수 있습니다"),
    (3,"fa-solid fa-bolt", "FastAPI", "FastAPI를 이용하여 API 제작 및 웹서버 제작 등이 가능합니다"),
    (4,"fa-brands fa-rust", "Rust", "취미로 학습 중입니다. 간단한 코드를 작성할 수 있습니다"),
    (5,"fa-brands fa-unity", "Unity", "3D 및 2D 개발과 관련된 유니티의 기능들을 활용할 수 있습니다"),
    (6,"fa-brands fa-google", "Mediapipe", "Mediapipe를 다른 서비스와 연동하여 활용할 수 있습니다"),
    (7,"fa-solid fa-microchip", "Google Cloud Platform", "GCP에서 제공하는 여러 API및 VM 설정을 통한 서비스 시스템 구축이 가능합니다"),
    (8,"fa-solid fa-database", "SQLite", "SQL Query를 작성하고 Sqlalchemy와 같은 ORM 도구를 이용할 수 있습니다"),
    (9,"fa-brands fa-docker", "Docker", "도커 환경을 구축하고 dockerfile을 작성할 수 있습니다. 개발 환경 구축에 주로 활용합니다"),
    (10, "fa-brands fa-linux", "Linux", "리눅스 환경에서 익숙하게 작업이 가능합니다. bash 쉘 스크립트를 작성할 수 있습니다"),
    (11, "fa-solid fa-terminal", "Prompt Engineering", "LLM 및 생성 모델을 위한 프롬프트를 작성 할 수 있습니다")
}