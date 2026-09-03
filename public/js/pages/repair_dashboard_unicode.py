from pathlib import Path

path = Path(r".\backend\public\js\pages\dashboard.js")

text = path.read_text(encoding="utf-8")

# Repair mojibake one layer at a time.
# Only process lines that contain known mojibake indicators.
lines = text.splitlines(keepends=True)

output = []

for line in lines:
    repaired = line

    if any(x in repaired for x in ("Ãƒ", "Ã‚", "Ã¢", "Ã°Å¸")):
        for _ in range(3):
            try:
                candidate = repaired.encode("cp1252").decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                break

            if candidate == repaired:
                break

            repaired = candidate

    output.append(repaired)

path.write_text("".join(output), encoding="utf-8", newline="")

print("Unicode cleanup completed.")
