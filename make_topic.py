import os
import datetime

date = datetime.date.today()

topic_file = "../💭주제목록.md"
output_file = "content/Topics.md"

new_lines = []
with open(topic_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for line in lines:
        new_lines.append(line.strip())


header = f'''---
Status: published
Title: Topics
Date: 2025-06-19
Modified: {date}
Category: INDEX
Slug: topics
Authors: CODE4BW
Summary: 블로그 글을 주제별로 분류한 페이지 
---
'''

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(header)
    for line in new_lines:
        skip_line = False
        path = line.split("](")[-1]
        path = path.replace(')', '').replace('%20', ' ').replace("my.blog/", "")
        print(path)
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f2:
                lines = f2.readlines()
                for x in lines:
                    x = x.strip()
                    if x.startswith("Status"):
                        if ("skip" in x) or ("draft" in x):
                            skip_line = True
                            break
        if not skip_line:
            nl = line.replace("my.blog/content/", "{filename}")
            f.write(f"{nl}\n") 
