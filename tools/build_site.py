from __future__ import annotations

import html
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote

import markdown


ROOT = Path(__file__).resolve().parents[1]
SITE_DIR = ROOT / "_site"
ASSETS_DIR = SITE_DIR / "assets"
DATE_DIR_RE = re.compile(r"^\d{4}$")


@dataclass(frozen=True)
class Document:
    title: str
    source_path: Path
    output_path: Path
    view_href: str
    download_href: str
    kind: str
    size_label: str


@dataclass(frozen=True)
class DateSection:
    date_key: str
    documents: list[Document]


def main() -> None:
    if SITE_DIR.exists():
        shutil.rmtree(SITE_DIR)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    write_styles()
    sections = build_sections()
    write_index(sections)


def build_sections() -> list[DateSection]:
    sections: list[DateSection] = []
    for date_dir in sorted(find_date_dirs(), key=lambda path: path.name, reverse=True):
        out_dir = SITE_DIR / date_dir.name
        out_dir.mkdir(parents=True, exist_ok=True)

        documents: list[Document] = []
        used_slugs: set[str] = set()
        for source_path in sorted(date_dir.iterdir(), key=lambda path: path.name):
            if not source_path.is_file():
                continue
            suffix = source_path.suffix.lower()
            if suffix == ".md":
                documents.append(build_markdown_page(source_path, out_dir, used_slugs))
            elif suffix == ".pdf":
                documents.append(build_pdf_page(source_path, out_dir, used_slugs))

        if documents:
            sections.append(DateSection(date_key=date_dir.name, documents=documents))
    return sections


def find_date_dirs() -> list[Path]:
    return [
        child
        for child in ROOT.iterdir()
        if child.is_dir() and DATE_DIR_RE.fullmatch(child.name)
    ]


def build_markdown_page(source_path: Path, out_dir: Path, used_slugs: set[str]) -> Document:
    title = source_path.stem
    slug = unique_slug(title, used_slugs)
    output_path = out_dir / f"{slug}.html"
    source_output_path = out_dir / source_path.name
    shutil.copy2(source_path, source_output_path)
    markdown_text = source_path.read_text(encoding="utf-8")
    body_html = markdown.markdown(
        markdown_text,
        extensions=["extra", "fenced_code", "tables", "toc"],
        output_format="html5",
    )

    rel_back = "../index.html"
    output_path.write_text(
        page_shell(
            title=title,
            body=f"""
<main class="reader-shell">
  <nav class="top-link"><a href="{rel_back}">資料一覧へ戻る</a></nav>
  <article class="markdown-body">
    <h1>{escape(title)}</h1>
    {body_html}
  </article>
</main>
""",
            css_href="../assets/style.css",
        ),
        encoding="utf-8",
    )

    return Document(
        title=title,
        source_path=source_path,
        output_path=output_path,
        view_href=href_for(output_path.relative_to(SITE_DIR)),
        download_href=href_for(source_output_path.relative_to(SITE_DIR)),
        kind="Markdown",
        size_label=format_size(source_path.stat().st_size),
    )


def build_pdf_page(source_path: Path, out_dir: Path, used_slugs: set[str]) -> Document:
    title = source_path.stem
    pdf_name = source_path.name
    pdf_output_path = out_dir / pdf_name
    shutil.copy2(source_path, pdf_output_path)

    slug = unique_slug(f"{title}-pdf", used_slugs)
    viewer_path = out_dir / f"{slug}.html"
    pdf_href = href_for(Path(pdf_name))
    viewer_path.write_text(
        page_shell(
            title=title,
            body=f"""
<main class="pdf-shell">
  <nav class="top-link"><a href="../index.html">資料一覧へ戻る</a></nav>
  <section class="pdf-header">
    <div>
      <p class="eyebrow">PDF</p>
      <h1>{escape(title)}</h1>
    </div>
    <a class="button button-strong" href="{pdf_href}" download>ダウンロード</a>
  </section>
  <object class="pdf-viewer" data="{pdf_href}" type="application/pdf">
    <p>PDFを表示できませんでした。<a href="{pdf_href}">PDFを直接開く</a></p>
  </object>
</main>
""",
            css_href="../assets/style.css",
        ),
        encoding="utf-8",
    )

    return Document(
        title=title,
        source_path=source_path,
        output_path=viewer_path,
        view_href=href_for(viewer_path.relative_to(SITE_DIR)),
        download_href=href_for(pdf_output_path.relative_to(SITE_DIR)),
        kind="PDF",
        size_label=format_size(source_path.stat().st_size),
    )


def write_index(sections: list[DateSection]) -> None:
    title, intro = read_readme_summary()
    section_html = "\n".join(render_section(section) for section in sections)
    if not section_html:
        section_html = '<p class="empty-state">日付フォルダに資料を追加すると、ここに一覧が表示されます。</p>'

    index_html = page_shell(
        title=title,
        body=f"""
<main class="site-shell">
  <section class="hero">
    <p class="eyebrow">Kobe Katsu Projects</p>
    <h1>{escape(title)}</h1>
    <p>{escape(intro)}</p>
  </section>
  <section class="library" aria-label="資料一覧">
    {section_html}
  </section>
</main>
""",
        css_href="assets/style.css",
    )
    (SITE_DIR / "index.html").write_text(index_html, encoding="utf-8")


def render_section(section: DateSection) -> str:
    cards = "\n".join(render_card(document) for document in section.documents)
    return f"""
<section class="date-section">
  <div class="date-heading">
    <h2>{escape(format_date_label(section.date_key))}</h2>
    <span>{len(section.documents)}件</span>
  </div>
  <div class="document-grid">
    {cards}
  </div>
</section>
"""


def render_card(document: Document) -> str:
    return f"""
<article class="document-card">
  <div>
    <p class="doc-kind">{escape(document.kind)} / {escape(document.size_label)}</p>
    <h3>{escape(document.title)}</h3>
  </div>
  <div class="card-actions">
    <a class="button button-strong" href="{document.view_href}">閲覧</a>
    <a class="button" href="{document.download_href}" download>ダウンロード</a>
  </div>
</article>
"""


def read_readme_summary() -> tuple[str, str]:
    readme_path = ROOT / "README.md"
    default_title = "神戸活 授業資料"
    default_intro = "日付ごとの授業資料をまとめて閲覧できます。"
    if not readme_path.exists():
        return default_title, default_intro

    lines = readme_path.read_text(encoding="utf-8").splitlines()
    title = default_title
    intro_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            if intro_lines:
                break
            title = stripped.lstrip("#").strip() or default_title
            continue
        if stripped.startswith("1. "):
            break
        intro_lines.append(clean_markdown_text(stripped))

    intro = " ".join(intro_lines).strip() or default_intro
    return title, intro


def write_styles() -> None:
    (ASSETS_DIR / "style.css").write_text(
        """
:root {
  color-scheme: light;
  --bg: #f6f7f4;
  --surface: #ffffff;
  --ink: #1d2522;
  --muted: #64726c;
  --line: #d9dfd7;
  --accent: #246b5a;
  --accent-dark: #17493f;
  --soft: #e8f1ed;
  --shadow: 0 12px 34px rgba(29, 37, 34, 0.10);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: "Segoe UI", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif;
  line-height: 1.7;
}

a {
  color: var(--accent);
}

.site-shell,
.reader-shell,
.pdf-shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
}

.hero {
  padding: 56px 0 30px;
  border-bottom: 1px solid var(--line);
}

.hero h1,
.markdown-body h1,
.pdf-header h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.5rem);
  line-height: 1.18;
  letter-spacing: 0;
}

.hero p {
  max-width: 760px;
  margin: 18px 0 0;
  color: var(--muted);
  font-size: 1.05rem;
}

.eyebrow,
.doc-kind {
  margin: 0 0 8px;
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.library {
  padding: 28px 0 64px;
}

.date-section + .date-section {
  margin-top: 34px;
}

.date-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.date-heading h2 {
  margin: 0;
  font-size: 1.45rem;
}

.date-heading span {
  color: var(--muted);
}

.document-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.document-card {
  min-height: 196px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.document-card h3 {
  margin: 0;
  font-size: 1.14rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 8px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--ink);
  background: var(--surface);
  font-weight: 700;
  text-decoration: none;
}

.button-strong {
  border-color: var(--accent);
  background: var(--accent);
  color: #ffffff;
}

.button:hover {
  border-color: var(--accent);
}

.top-link {
  padding: 28px 0 18px;
}

.top-link a {
  font-weight: 700;
  text-decoration: none;
}

.markdown-body {
  margin-bottom: 64px;
  padding: 34px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.markdown-body h1 {
  margin-bottom: 22px;
}

.markdown-body h2 {
  margin-top: 34px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.markdown-body pre {
  overflow-x: auto;
  padding: 16px;
  border-radius: 8px;
  background: #17211e;
  color: #eef8f4;
}

.markdown-body code {
  font-family: Consolas, "Courier New", monospace;
}

.markdown-body :not(pre) > code {
  padding: 0.12em 0.35em;
  border-radius: 6px;
  background: var(--soft);
}

.pdf-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.pdf-viewer {
  width: 100%;
  height: min(78vh, 900px);
  min-height: 560px;
  margin-bottom: 48px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}

.empty-state {
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
}

@media (max-width: 680px) {
  .site-shell,
  .reader-shell,
  .pdf-shell {
    width: min(100% - 20px, 1120px);
  }

  .hero {
    padding-top: 36px;
  }

  .markdown-body {
    padding: 20px;
  }

  .pdf-header {
    align-items: stretch;
    flex-direction: column;
  }

  .pdf-viewer {
    min-height: 480px;
  }
}
""".strip()
        + "\n",
        encoding="utf-8",
    )


def page_shell(title: str, body: str, css_href: str) -> str:
    return f"""<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <link rel="stylesheet" href="{css_href}">
</head>
<body>
{body.strip()}
</body>
</html>
"""


def unique_slug(text: str, used_slugs: set[str]) -> str:
    base = re.sub(r"[^0-9A-Za-z_-]+", "-", text).strip("-").lower()
    base = re.sub(r"-{2,}", "-", base)
    if not base:
        base = quote(text, safe="").replace("%", "").lower() or "document"
    slug = base
    counter = 2
    while slug in used_slugs:
        slug = f"{base}-{counter}"
        counter += 1
    used_slugs.add(slug)
    return slug


def href_for(path: Path) -> str:
    return "/".join(quote(part) for part in path.parts)


def format_date_label(date_key: str) -> str:
    return f"{date_key[:2]}月{date_key[2:]}日"


def format_size(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    return f"{size / (1024 * 1024):.1f} MB"


def escape(value: str) -> str:
    return html.escape(value, quote=True)


def clean_markdown_text(value: str) -> str:
    value = re.sub(r"[*_`]+", "", value)
    return value.strip()


if __name__ == "__main__":
    main()
