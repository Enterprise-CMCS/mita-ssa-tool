#!/usr/bin/env python3
"""
Extract text content from a PPTX file, preserving slide structure and tables.

Usage: python3 scripts/extract-pptx.py "<path-to-pptx>" [output.md]

Outputs markdown with one section per slide. Tables are rendered as
pipe-delimited markdown tables; text frames as paragraphs/bullets.
"""

import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
}


def para_text(para):
    """Extract text from an <a:p> paragraph element."""
    parts = []
    for run in para.iter():
        tag = run.tag.split('}')[-1]
        if tag == 't' and run.text:
            parts.append(run.text)
        elif tag == 'br':
            parts.append('\n')
    return ''.join(parts)


def txbody_lines(txbody):
    """Extract lines from a text body, marking bullet levels."""
    lines = []
    for para in txbody.findall('a:p', NS):
        text = para_text(para).strip()
        if not text:
            continue
        ppr = para.find('a:pPr', NS)
        lvl = int(ppr.get('lvl', '0')) if ppr is not None else 0
        lines.append(('  ' * lvl) + text)
    return lines


def table_rows(tbl):
    """Extract rows from an <a:tbl> element as lists of cell strings."""
    rows = []
    for tr in tbl.findall('a:tr', NS):
        cells = []
        for tc in tr.findall('a:tc', NS):
            txbody = tc.find('a:txBody', NS)
            if txbody is not None:
                cell_lines = [para_text(p).strip() for p in txbody.findall('a:p', NS)]
                cells.append(' \\n '.join(l for l in cell_lines if l))
            else:
                cells.append('')
        rows.append(cells)
    return rows


def extract_slide(xml_bytes):
    """Extract ordered content blocks (text frames and tables) from slide XML."""
    root = ET.fromstring(xml_bytes)
    blocks = []
    sp_tree = root.find('.//p:cSld/p:spTree', NS)
    if sp_tree is None:
        return blocks

    def walk(el):
        tag = el.tag.split('}')[-1]
        if tag == 'sp':
            txbody = el.find('.//p:txBody', NS)
            if txbody is not None:
                lines = txbody_lines(txbody)
                if lines:
                    blocks.append(('text', lines))
            return
        if tag == 'graphicFrame':
            tbl = el.find('.//a:tbl', NS)
            if tbl is not None:
                blocks.append(('table', table_rows(tbl)))
            return
        for child in el:
            walk(child)

    for child in sp_tree:
        walk(child)
    return blocks


def main():
    pptx_path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else None

    z = zipfile.ZipFile(pptx_path)
    slide_names = sorted(
        (n for n in z.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')),
        key=lambda x: int(''.join(c for c in x.split('/')[-1] if c.isdigit())),
    )

    out = []
    for name in slide_names:
        num = ''.join(c for c in name.split('/')[-1] if c.isdigit())
        out.append(f'\n\n## Slide {num}\n')
        for kind, content in extract_slide(z.read(name)):
            if kind == 'text':
                out.extend(content)
                out.append('')
            else:
                for i, row in enumerate(content):
                    out.append('| ' + ' | '.join(row) + ' |')
                    if i == 0:
                        out.append('|' + '---|' * len(row))
                out.append('')

    result = '\n'.join(out)
    if out_path:
        with open(out_path, 'w') as f:
            f.write(result)
        print(f'Wrote {len(result)} chars to {out_path}')
    else:
        print(result)


if __name__ == '__main__':
    main()
