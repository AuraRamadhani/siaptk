txt = open('/tmp/opencode_user_msg_4.txt', encoding='utf-8').read()
with open('/tmp/opencode/user_msg_4_clean.txt', 'w', encoding='utf-8') as f:
    f.write(txt)
lines = txt.split('\n')
with open('/tmp/opencode/user_msg_4_clean.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print("LINES:", len(lines))
print("FIRST 60 LINES:")
for i, l in enumerate(lines[:60]):
    print(f"{i}: {l}")
print("LAST 40 LINES:")
for i, l in enumerate(lines[-40:], start=len(lines)-40):
    print(f"{i}: {l}")
