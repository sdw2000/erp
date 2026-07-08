import sys, os

path = r'E:\vue\ERP\src\router\index.js'
print(f"File exists: {os.path.exists(path)}", flush=True)

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the problematic section and fix it
old = "meta: { title: '胶带安全库存', icon: 'chart', roles: ['warehouse', 'admin', 'production'] }\n      },\n      {\n      }\n      },\n      {"

new = "meta: { title: '胶带安全库存', icon: 'chart', roles: ['warehouse', 'admin', 'production'] }\n      },\n      {"

if old in content:
    print("Found match!", flush=True)
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed!", flush=True)
else:
    print("Pattern not found. Checking lines around stocktake...", flush=True)
    # find stocktake
    idx = content.find("path: 'stocktake'")
    if idx >= 0:
        print(f"Found stocktake at index {idx}, context:")
        print(repr(content[idx-200:idx+100]))
    else:
        print("stocktake not found!")
