AUTHOR = 'CODE4BW'
SITENAME = "CODE4BW's Logs"
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
    ("You can modify those links in your config file", "#"),
)

# Social widget
SOCIAL = (
    ("Github", "https://github.com/code4bw"),
    ("Google DEV", "https://g.dev/code4bw_dev"),
)

DEFAULT_PAGINATION = 10

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