# Headless end-to-end check: python3 test/browser.py <dist/index.html> <libs dir> <out dir>
import sys, os, zipfile, json, re
from xml.dom import minidom
from playwright.sync_api import sync_playwright

page_path, libs, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
FIX = os.path.join(os.path.dirname(os.path.abspath(libs)), 'fixtures')
LIB = {'xlsx.full.min.js': os.path.join(libs, 'node_modules/xlsx/dist/xlsx.full.min.js'), 'jspdf.umd.min.js': os.path.join(libs, 'node_modules/jspdf/dist/jspdf.umd.min.js'),
       'jszip.min.js': os.path.join(libs, 'node_modules/jszip/dist/jszip.min.js')}
results = []; errors = []
def check(cond, name):
    results.append((bool(cond), name))
    if not cond: print('FAIL', name)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    def handle(route):
        u = route.request.url
        for k, v in LIB.items():
            if u.endswith(k): return route.fulfill(path=v, content_type='application/javascript')
        if 'fonts.g' in u: return route.fulfill(body='', content_type='text/css')
        return route.continue_()
    ctx.route('**/*', handle)
    pg = ctx.new_page()
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    url = 'file://' + os.path.abspath(page_path)
    pg.goto(url + '#lab'); pg.wait_for_timeout(500)
    check(pg.locator('.diagram svg').count() == 1, 'diagram drawn')
    check('1NF' in pg.locator('.rung.top').inner_text(), 'VIT example highest is 1NF')
    pg.screenshot(path=f'{out}/lab-light.png', full_page=False)
    # tabs
    for t in ['closure', 'keys', 'cover', 'decompose', 'test', 'nf']:
        pg.click(f'[data-tab="{t}"]'); pg.wait_for_timeout(120)
        check(pg.locator(f'#tp-{t}').count() == 1, f'tab {t} renders')
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(100)
    check(pg.evaluate('document.activeElement.dataset.tab') == 'closure', 'arrow key moves tab')
    # closure picker
    pg.click('#lab-out .picker button[data-bit="3"]'); pg.wait_for_timeout(120)
    check('regno, course' in pg.locator('.result-line').inner_text(), 'closure picks two attrs')
    # input error keeps stale results
    pg.fill('#in-deps', 'regno -> nam'); pg.wait_for_timeout(400)
    check(pg.locator('#rail-msg .err').count() > 0, 'error shown for unknown attr')
    check('stale' in (pg.get_attribute('#lab-out', 'class') or ''), 'results dimmed when stale')
    # load example via select: 3NF not BCNF
    pg.select_option('#in-example', '3nf'); pg.wait_for_timeout(400)
    check('3NF' in pg.locator('.rung.top').inner_text(), '3NF example')
    pg.select_option('#in-example', 'g21'); pg.wait_for_timeout(400)
    pg.click('[data-tab="test"]'); pg.wait_for_timeout(200)
    check('Lossless' in pg.locator('#tp-test').inner_text(), 'GATE21 D1 lossless in lab')
    pg.click('#ch-prev'); pg.wait_for_timeout(100); check('Step' in pg.locator('#tp-test').inner_text(), 'chase stepping')
    pg.select_option('#in-example', 'mvd'); pg.wait_for_timeout(400)
    check('BCNF' in pg.locator('.rung.top').inner_text(), 'MVD example BCNF not 4NF')
    pg.select_option('#in-example', 'irctc'); pg.wait_for_timeout(400)
    pg.click('[data-tab="decompose"]'); pg.wait_for_timeout(200)
    pg.click('[data-test]'); pg.wait_for_timeout(300)
    check(pg.locator('.tableau').count() == 1, 'test this split opens chase')
    pg.screenshot(path=f'{out}/lab-irctc.png', full_page=True)
    # theme
    pg.click('#theme-btn'); pg.wait_for_timeout(100)
    check(pg.evaluate("document.documentElement.dataset.theme") == 'dark', 'night mode on')
    pg.screenshot(path=f'{out}/lab-dark.png')
    pg.reload(); pg.wait_for_timeout(400)
    check(pg.evaluate("document.documentElement.dataset.theme") == 'dark', 'theme persisted')
    pg.click('#theme-btn')
    # quiz practice
    pg.goto(url + '#quiz'); pg.wait_for_timeout(300)
    pg.click('#q-setup button[type=submit]'); pg.wait_for_timeout(300)
    check(pg.locator('#q-card').count() == 1, 'quiz started')
    for i in range(10):
        if pg.locator('#q-card .opt').count(): pg.locator('#q-card .opt').first.click()
        else: pg.fill('#q-card input.nat', '3')
        pg.wait_for_timeout(60)
        if pg.locator('#q-check').count(): pg.click('#q-check'); pg.wait_for_timeout(60)
        check(pg.locator('#q-card .solution').count() == 1, f'practice q{i+1} shows solution')
        pg.click('#q-next'); pg.wait_for_timeout(80)
    check(pg.locator('.score-big').count() == 1, 'practice results page')
    pg.screenshot(path=f'{out}/quiz-results.png')
    # generator robustness: many quizzes
    n = pg.evaluate("""() => { let bad=0, total=0; for (const level of ['easy','medium','hard']) for (let s=1;s<40;s++){ const qs=generateQuiz({topics:TOPICS,level,count:10,seed:s*97}); total+=qs.length; qs.forEach(q=>{ if(q.type==='mcq' && (q.answer<0||q.answer>3||new Set(q.options).size!==q.options.length)) bad++; if(q.type==='msq'&&!q.answer.length) bad++; }); } return {bad,total}; }""")
    check(n['bad'] == 0 and n['total'] >= 1100, f'generator: {n}')
    # exam mode
    pg.click('#q-again'); pg.wait_for_timeout(200)
    pg.click('#q-setup label:has-text("Timed test")'); pg.click('#q-setup button[type=submit]'); pg.wait_for_timeout(300)
    check(re.match(r'\d\d:\d\d', pg.locator('#q-timer').inner_text()) is not None, 'exam timer')
    pg.click('[data-go="3"]'); pg.wait_for_timeout(100); pg.click('#q-mark'); pg.wait_for_timeout(100)
    check(pg.locator('.palette button.mark').count() == 1, 'mark for review')
    pg.screenshot(path=f'{out}/quiz-exam.png')
    pg.click('#q-quit'); pg.wait_for_timeout(200)
    check(pg.locator('.score-big').count() == 1, 'exam submitted')
    # PYQ
    pg.goto(url + '#pyq'); pg.wait_for_timeout(400)
    check(pg.locator('#pyq-list .q-card').count() == 39, 'all 39 PYQs listed')
    pg.screenshot(path=f'{out}/pyq.png')
    first = pg.locator('#pyq-list .q-card').first
    cid = first.get_attribute('id')
    first.locator('.opt').nth(3).click(); pg.wait_for_timeout(80)
    pg.locator(f'#{cid} [data-check]').click(); pg.wait_for_timeout(120)
    check('Correct' in pg.locator(f'#{cid} .solution').inner_text(), '2026 union rule D is correct')
    pg.fill('#f-q', 'team'); pg.wait_for_timeout(400)
    check(pg.locator('#pyq-list .q-card').count() == 1, 'search filters')
    pg.locator('#pyq-list [data-openlab]').first.click(); pg.wait_for_timeout(400)
    check(pg.evaluate('location.hash') == '#lab' and 'team' in pg.input_value('#in-schema'), 'PYQ opens in lab')
    pg.goto(url + '#pyq'); pg.wait_for_timeout(300); pg.fill('#f-q', ''); pg.wait_for_timeout(300)
    pg.click('[data-topic="Keys"]'); pg.wait_for_timeout(200)
    k = pg.locator('#pyq-list .q-card').count(); check(0 < k < 36, f'topic filter ({k})')
    pg.click('#pyq-timed'); pg.wait_for_timeout(300)
    check(pg.locator('#q-timer').count() == 1, 'PYQ timed paper')
    pg.click('#q-quit'); pg.wait_for_timeout(200)
    # ---------------- Tables page ----------------
    pg.goto(url + '#tables'); pg.wait_for_timeout(500)
    check(pg.locator('#tb-stepper button').count() == 6, 'tables stepper')
    check(pg.locator('#tb-body table.dgrid.edit input[data-r]').count() == 80, 'reg grid editable cells')
    pg.screenshot(path=f'{out}/t1-table.png')
    def step(i): pg.click(f'#tb-stepper [data-step="{i}"]'); pg.wait_for_timeout(350)
    step(1); check('already in 1NF' in pg.inner_text('#tb-body') or 'Already in first normal form' in pg.inner_text('#tb-body'), 'reg already 1NF')
    step(2); check(pg.locator('#tb-body [data-fd]').count() > 3, 'deps mined')
    pg.fill('#tb-check', 'hostel -> warden'); pg.wait_for_timeout(400); check('holds' in pg.inner_text('#tb-check-out'), 'rule holds')
    pg.fill('#tb-check', 'course -> grade'); pg.wait_for_timeout(400); check('does not hold' in pg.inner_text('#tb-check-out') and pg.locator('#tb-check-out .hl-diff').count() > 0, 'rule violated shows rows')
    pg.screenshot(path=f'{out}/t3-deps.png', full_page=True)
    step(3); check('1NF' in pg.locator('#tb-body .rung.top').inner_text(), 'reg diagnose 1NF'); check(pg.locator('#tb-body td.rd-partial').count() > 0 and pg.locator('#tb-body td.rd-transitive').count() > 0, 'redundant cells highlighted')
    check('Update anomaly' in pg.inner_text('#tb-body') and 'Deletion anomaly' in pg.inner_text('#tb-body'), 'anomalies listed')
    pg.screenshot(path=f'{out}/t4-diagnose.png', full_page=True)
    step(4); check(pg.locator('#tb-body [data-stage]').count() == 4, 'reg 4 stages')
    check(pg.locator('#tb-body .tcard').count() == 4, 'reg BCNF 4 tables'); txt = pg.inner_text('#tb-body')
    check('rejoin gives back all 10 rows' in txt and 'lossless' in txt, 'reg rejoin + lossless')
    check(pg.locator('#tb-body .schema svg path').count() >= 3, 'schema FK arrows')
    names = [x.input_value() for x in pg.locator('#tb-body input.tname').all()]
    check(sorted(names) == ['Course', 'Hostel', 'Registration', 'Student'], f'table names {names}')
    pg.screenshot(path=f'{out}/t5-normalize.png', full_page=True)
    pg.click('#tb-body [data-stage="2NF"]'); pg.wait_for_timeout(300); check(pg.locator('#tb-body .tcard').count() == 3, 'reg 2NF 3 tables')
    pg.fill('#tb-body input.tname >> nth=0', 'Learner'); pg.keyboard.press('Tab'); pg.wait_for_timeout(300)
    check('Learner' in [x.input_value() for x in pg.locator('#tb-body input.tname').all()], 'rename table')
    step(5); check('CREATE TABLE' in pg.inner_text('#tb-sql') and 'FOREIGN KEY' in pg.inner_text('#tb-sql'), 'sql generated')
    pg.click('#tb-body label:has-text("Oracle")'); pg.wait_for_timeout(300); check('VARCHAR2' in pg.inner_text('#tb-sql'), 'oracle dialect')
    pg.screenshot(path=f'{out}/t6-sql.png')
    with pg.expect_download() as d: pg.click('#tb-dl-sql')
    d.value.save_as(f'{out}/t.sql'); check(b'CREATE TABLE' in open(f'{out}/t.sql', 'rb').read(), 'sql download')
    with pg.expect_download(timeout=20000) as d: pg.click('#tb-dl-xlsx')
    d.value.save_as(f'{out}/t.xlsx'); z = zipfile.ZipFile(f'{out}/t.xlsx'); check(len([n for n in z.namelist() if n.startswith('xl/worksheets/sheet')]) == 4, 'xlsx sheets (1NF + 3 at 2NF)')
    with pg.expect_download(timeout=20000) as d: pg.click('#tb-dl-csv')
    d.value.save_as(f'{out}/t.zip'); check(len(zipfile.ZipFile(f'{out}/t.zip').namelist()) == 4, 'csv zip')
    # lists in cells → 4NF
    step(0); pg.select_option('#tb-ex', 'clubs'); pg.wait_for_timeout(400)
    step(1); check(pg.locator('#tb-body [data-multi]').count() == 2, 'two list columns detected'); pg.screenshot(path=f'{out}/t2-1nf.png')
    step(4); check(pg.locator('#tb-body [data-stage="4NF"]').count() == 1 and pg.locator('#tb-body .tcard').count() == 3, 'clubs 4NF 3 tables')
    step(0); pg.select_option('#tb-ex', 'groups'); pg.wait_for_timeout(400); step(1)
    check(pg.locator('#tb-body [data-group]').count() == 1 and 'Duplicate rows removed' in pg.inner_text('#tb-body'), 'repeating group + dupes')
    step(0); pg.select_option('#tb-ex', 'teach'); pg.wait_for_timeout(400); step(4)
    check('loses' in pg.inner_text('#tb-body'), 'teach BCNF loses dependency')
    # grid editing creates a contradiction visible downstream
    step(0); pg.select_option('#tb-ex', 'reg'); pg.wait_for_timeout(400)
    pg.fill('#tb-body input[data-r="1"][data-c="2"]', 'B Block'); pg.wait_for_timeout(500)
    step(2); check(pg.locator('#tb-body [data-fd]').count() > 0, 'still mines after edit')
    pg.click('#tb-body button:has-text("Add row")') if pg.locator('#tb-body button:has-text("Add row")').count() else None
    # uploads
    step(0); pg.set_input_files('#tb-file', os.path.join(FIX, 'books.csv')); pg.wait_for_timeout(600)
    check(pg.input_value('#tb-name') == 'books', 'csv upload name'); step(1); check(pg.locator('#tb-body [data-multi="author_ids"]').count() == 1, 'csv list column')
    step(0); pg.set_input_files('#tb-file', os.path.join(FIX, 'staff.xlsx')); pg.wait_for_timeout(1200)
    check(pg.input_value('#tb-name') == 'staff', 'xlsx upload'); step(3); check('2NF' in pg.locator('#tb-body .rung.top').inner_text(), f'staff 2NF (transitive)')
    step(4); check(pg.locator('#tb-body .tcard').count() == 2, 'staff BCNF 2 tables')
    # text mode parse error
    step(0); pg.click('#tb-body label:has-text("Text")'); pg.wait_for_timeout(300); pg.fill('#tb-text', 'onlyone'); pg.wait_for_timeout(600)
    check(len(pg.inner_text('#tb-text-err')) > 0, 'text parse error shown')
    pg.fill('#tb-text', 'a,b,c\n1,x,p\n2,x,q\n3,y,p'); pg.wait_for_timeout(700); step(4); check(pg.locator('#tb-body .tcard').count() >= 1, 'text mode table normalizes')
    step(0); pg.click('#tb-body label:has-text("Grid")'); pg.select_option('#tb-ex', 'orders'); pg.wait_for_timeout(500); step(4)
    check(pg.locator('#tb-body .tcard').count() == 5, 'orders 5 tables')
    # download page: table report
    pg.goto(url + '#download'); pg.wait_for_timeout(300); pg.click('label:has-text("Table in Tables")'); pg.wait_for_timeout(500)
    check('Table normalization report' in pg.inner_text('.report-preview'), 'table report preview')
    for fmt in ['txt', 'pdf', 'docx']:
        with pg.expect_download(timeout=25000) as d: pg.click(f'[data-fmt="{fmt}"]')
        fp = f'{out}/table-report.{fmt}'; d.value.save_as(fp); data = open(fp, 'rb').read()
        if fmt == 'pdf': check(data[:5] == b'%PDF-' and len(data) > 20000, f'table pdf ({len(data)})')
        if fmt == 'txt': check(b'CREATE TABLE' in data and b'rejoin' in data.lower() or b'joining the tables' in data, 'table txt')
        if fmt == 'docx': minidom.parseString(zipfile.ZipFile(fp).read('word/document.xml')); check(True, 'table docx')
    pg.click('label:has-text("Relation in the Lab")'); pg.wait_for_timeout(300)
    # quiz on table instances only
    pg.goto(url + '#lab'); pg.wait_for_timeout(200); pg.evaluate("QUIZ.phase = 'setup'"); pg.goto(url + '#quiz'); pg.wait_for_timeout(300)
    for tpc in pg.locator('#q-setup input[name="topic"]').all():
        if tpc.get_attribute('value') != 'Table instances' and tpc.is_checked(): tpc.uncheck()
        if tpc.get_attribute('value') == 'Table instances' and not tpc.is_checked(): tpc.check()
    pg.click('#q-setup label:has-text("Practice")'); pg.click('#q-setup button[type=submit]'); pg.wait_for_timeout(400)
    check(pg.locator('#q-card .q-table table').count() == 1, 'instance quiz shows table')
    pg.screenshot(path=f'{out}/quiz-table.png')
    gen = pg.evaluate("""() => { let bad=0,total=0; for (const level of ['easy','medium','hard']) for (let s=1;s<30;s++){ const qs=generateQuiz({topics:['Table instances'],level,count:10,seed:s*31}); total+=qs.length; qs.forEach(q=>{ if(!q.table) bad++; if(q.type==='msq'&&!q.answer.length) bad++; if(q.type==='msq'&&new Set(q.options).size!==q.options.length) bad++; }); } return {bad,total}; }""")
    check(gen['bad'] == 0 and gen['total'] >= 800, f'instance generator {gen}')
    pg.click('#q-quit'); pg.wait_for_timeout(200)
    # PYQ table questions
    pg.goto(url + '#pyq'); pg.wait_for_timeout(300)
    for btn in pg.locator('[data-topic][aria-pressed="true"]').all(): btn.click(); pg.wait_for_timeout(150)
    pg.fill('#f-q', ''); pg.click('[data-topic="Table instances"]'); pg.wait_for_timeout(300)
    check(pg.locator('#pyq-list .q-card').count() == 3 and pg.locator('#pyq-list .q-table').count() == 3, 'table PYQs')
    pg.locator('#pyq-list [data-opentable]').first.click(); pg.wait_for_timeout(600)
    check(pg.evaluate('location.hash') == '#tables' and pg.locator('#tb-stepper [aria-current="step"]').get_attribute('data-step') == '2', 'PYQ table opens in Tables')
    pg.goto(url + '#pyq'); pg.wait_for_timeout(300); pg.click('[data-topic="Table instances"]'); pg.wait_for_timeout(200)
    # learn, help, team
    pg.goto(url + '#learn'); pg.wait_for_timeout(400)
    check(pg.locator('#film-stage svg').count() == 1, 'film first frame')
    pg.click('#film-play'); pg.wait_for_timeout(1500); pg.click('#film-play')
    check(pg.locator('#film-seek').input_value() != '0', 'film plays')
    pg.screenshot(path=f'{out}/learn.png')
    pg.goto(url + '#help'); pg.wait_for_timeout(200); check(pg.locator('#view-help h2').count() >= 5, 'help sections')
    pg.goto(url + '#team'); pg.wait_for_timeout(200)
    check('Swaminathan' in pg.inner_text('#view-team') and '25BCE5307' in pg.inner_text('#view-team'), 'team + guide')
    pg.screenshot(path=f'{out}/team.png')
    # downloads (website path: anchor download)
    pg.goto(url + '#lab'); pg.wait_for_timeout(200); pg.select_option('#in-example', 'g21'); pg.wait_for_timeout(300)
    pg.goto(url + '#download'); pg.wait_for_timeout(400)
    pg.screenshot(path=f'{out}/download.png')
    for fmt in ['txt', 'pdf', 'docx']:
        with pg.expect_download(timeout=20000) as d: pg.click(f'[data-fmt="{fmt}"]')
        fp = f'{out}/report.{fmt}'; d.value.save_as(fp)
        data = open(fp, 'rb').read()
        if fmt == 'pdf': check(data[:5] == b'%PDF-' and len(data) > 20000, f'pdf ok ({len(data)} bytes)')
        if fmt == 'txt': check(b'Normalization report' in data and b'Lossless' in data, 'txt ok')
        if fmt == 'docx':
            z = zipfile.ZipFile(fp); names = z.namelist()
            minidom.parseString(z.read('word/document.xml'))
            check('word/media/diagram.png' in names, f'docx ok {names}')
    # mobile overflow + screenshots
    m = b.new_context(viewport={'width': 390, 'height': 844}); m.route('**/*', handle); mp = m.new_page()
    mp.on('pageerror', lambda e: errors.append(str(e)))
    for v in ['lab', 'tables', 'quiz', 'pyq', 'learn', 'help', 'team', 'download']:
        mp.goto(url + '#' + v); mp.wait_for_timeout(350)
        ov = mp.evaluate('document.documentElement.scrollWidth - window.innerWidth')
        check(ov <= 1, f'no overflow at 390 on {v} ({ov})')
        if v in ('lab', 'pyq', 'tables'): mp.screenshot(path=f'{out}/m-{v}.png', full_page=False)
        if v == 'tables':
            for i in range(6):
                mp.click(f'#tb-stepper [data-step="{i}"]'); mp.wait_for_timeout(350)
                ov = mp.evaluate('document.documentElement.scrollWidth - window.innerWidth'); check(ov <= 1, f'no overflow at 390 on tables step {i} ({ov})')
            mp.screenshot(path=f'{out}/m-tables-sql.png')
    for w in [1024, 768]:
        c2 = b.new_context(viewport={'width': w, 'height': 900}); c2.route('**/*', handle); p2 = c2.new_page()
        for v in ['lab', 'tables', 'pyq', 'learn']:
            p2.goto(url + '#' + v); p2.wait_for_timeout(300)
            check(p2.evaluate('document.documentElement.scrollWidth - window.innerWidth') <= 1, f'no overflow at {w} {v}')
    b.close()

errs = [e for e in errors if 'fonts' not in e and 'ERR_' not in e]
check(not errs, 'no console errors ' + json.dumps(errs[:5]))
print(sum(1 for r in results if r[0]), 'passed,', sum(1 for r in results if not r[0]), 'failed')
