from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "outputs" / "03_日报周报" / "0720" / "日报0720.docx",
    ROOT / "outputs" / "03_日报周报" / "0721" / "日报0721.docx",
    ROOT / "outputs" / "03_日报周报" / "0722" / "日报0722.docx",
]


for path in FILES:
    doc = Document(path)
    texts = [para.text for para in doc.paragraphs if para.text.strip()]
    section_titles = [
        text
        for text in texts
        if text.startswith(("1.", "2.", "3.", "4.", "5."))
    ]
    print(path)
    print("paragraphs:", len(texts))
    print("chars:", sum(len(text) for text in texts))
    print("first:", texts[0])
    print("sections:", " | ".join(section_titles))
    print("last:", texts[-1])
    print()
