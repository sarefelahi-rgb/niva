#!/bin/bash
# usage: vlm.sh <image> <prompt>
cd /home/z/my-project
z-ai vision -p "$2" -i "$1" -o agent-ctx/tmp/vlm-out.json >/dev/null 2>&1
python3 -c "
import json
d = json.load(open('agent-ctx/tmp/vlm-out.json'))
print(d['choices'][0]['message']['content'])
"
