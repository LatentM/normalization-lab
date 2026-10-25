# Exports with the internet libraries blocked: python3 test/exports_offline.py dist/index.html <out dir>
# Every Tables export (.sql, Excel, CSV zip) and the Word reports must still work.
import sys, os, zipfile, openpyxl, docx
from playwright.sync_api import sync_playwright
page = sys.argv[1]; out = sys.argv[2]; os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(accept_downloads=True)
    ctx.route('**/*', lambda r: r.abort() if ('cdnjs' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath(page) + '#tables'); pg.wait_for_timeout(800)
    for ex in ['reg', 'clubs', 'groups', 'teach', 'orders']:
        pg.click('#tb-stepper [data-step="0"]'); pg.wait_for_timeout(200); pg.select_option('#tb-ex', ex); pg.wait_for_timeout(400)
        pg.click('#tb-stepper [data-step="5"]'); pg.wait_for_timeout(400)
        for btn, ext in [('#tb-dl-sql', 'sql'), ('#tb-dl-xlsx', 'xlsx'), ('#tb-dl-csv', 'zip')]:
            with pg.expect_download(timeout=8000) as d: pg.click(btn)
            f = f'{out}/{ex}.{ext}'; d.value.save_as(f); name = d.value.suggested_filename
            if ext == 'xlsx':
                wb = openpyxl.load_workbook(f); info = [(ws.title, ws.max_row, ws.max_column) for ws in wb]
            elif ext == 'zip':
                z = zipfile.ZipFile(f); assert z.testzip() is None; info = z.namelist()
            else: info = open(f).read().count('CREATE TABLE')
            print(ex, name, info)
    pg.click('#tb-stepper [data-step="0"]'); pg.select_option('#tb-ex', 'reg'); pg.wait_for_timeout(300)
    pg.goto('file://' + os.path.abspath(page) + '#download'); pg.wait_for_timeout(600)
    pg.click('label:has-text("Table in Tables")'); pg.wait_for_timeout(400)
    with pg.expect_download(timeout=10000) as d: pg.click('[data-fmt="docx"]')
    d.value.save_as(f'{out}/r.docx'); dd = docx.Document(f'{out}/r.docx'); print('docx table report paragraphs', len(dd.paragraphs), 'tables', len(dd.tables))
    pg.goto('file://' + os.path.abspath(page) + '#download'); pg.wait_for_timeout(400)
    pg.click('label:has-text("Relation in the Lab")'); pg.wait_for_timeout(400)
    with pg.expect_download(timeout=10000) as d: pg.click('[data-fmt="docx"]')
    d.value.save_as(f'{out}/l.docx'); dd = docx.Document(f'{out}/l.docx'); print('docx lab report paragraphs', len(dd.paragraphs), 'images', len(dd.inline_shapes))
    print('page errors:', errs)
